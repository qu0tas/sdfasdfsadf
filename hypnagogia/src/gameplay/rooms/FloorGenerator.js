// Builds one stage of the run: a small grid of rooms joined by rifts.
// Pure data in, pure data out, so a seed always gives the same floor (useful for bug reports and tests).
import { DIRS, DIR_KEYS } from '../../app/Config.js';
import { COMBAT_TEMPLATES } from '../../data/rooms.js';
import { STAGES, VARIANTS } from '../../data/stages.js';
import { SYMBOLS } from '../../data/symbols.js';
import { Rng } from '../../utils/rng.js';

const GRID_W = 9;
const GRID_H = 7;
const key = (x, y) => `${x},${y}`;

/** Rooms where fights happen; the corridors of the floor are made of these. */
const isBody = (room) => room.type === 'combat' || room.type === 'start';

function tryBuild(rng, stageIndex, variantId) {
  const stage = STAGES[stageIndex];
  const variant = VARIANTS[variantId];
  const rooms = [];
  const grid = new Map();

  const add = (gx, gy, type) => {
    const room = {
      id: rooms.length, gx, gy, type, doors: {}, template: 'open', seed: rng.seed(),
      visited: false, seen: false, cleared: false,
    };
    rooms.push(room);
    grid.set(key(gx, gy), room);
    return room;
  };
  const neighbours = (gx, gy) =>
    DIR_KEYS.map((dir) => ({ dir, room: grid.get(key(gx + DIRS[dir].dx, gy + DIRS[dir].dy)) })).filter((n) => n.room);
  const connect = (a, dir, b, kind) => {
    a.doors[dir] = { to: b.id, kind, unstable: false };
    b.doors[DIRS[dir].opp] = { to: a.id, kind, unstable: false };
  };
  const emptyCells = () => {
    const cells = [];
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) if (!grid.has(key(gx, gy))) cells.push({ gx, gy, near: neighbours(gx, gy) });
    }
    return cells.filter((cell) => cell.near.length > 0);
  };

  // 1. The body: fight rooms grown outward from the start.
  const start = add(4, 3, 'start');
  const bodyCount = stage.rooms + (variant.extraRooms ?? 0);
  for (let guard = 0; rooms.length < bodyCount + 1 && guard < 800; guard++) {
    const base = rng.pick(rooms);
    const dir = rng.pick(DIR_KEYS);
    const gx = base.gx + DIRS[dir].dx;
    const gy = base.gy + DIRS[dir].dy;
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H || grid.has(key(gx, gy))) continue;
    const near = neighbours(gx, gy);
    // Keep the floor stringy instead of a solid block of rooms.
    if (near.length > 2 || (near.length === 2 && rng.chance(0.6))) continue;
    const room = add(gx, gy, 'combat');
    for (const n of near) connect(room, n.dir, n.room, 'open');
  }
  if (rooms.length < bodyCount + 1) return null;

  // Distance from the start, used to push the boss far away.
  const depth = new Map([[start.id, 0]]);
  const queue = [start];
  while (queue.length) {
    const room = queue.shift();
    for (const door of Object.values(room.doors)) {
      if (depth.has(door.to)) continue;
      depth.set(door.to, depth.get(room.id) + 1);
      queue.push(rooms[door.to]);
    }
  }

  // 2. Special rooms: each hangs off exactly one body room, so it is always a dead end.
  let bossId = -1;
  for (const type of ['boss', ...stage.special, ...(variant.extra ?? [])]) {
    let spots = emptyCells().filter((cell) => cell.near.length === 1 && isBody(cell.near[0].room));
    if (type === 'boss') {
      spots = spots.filter((cell) => cell.near[0].room.type !== 'start');
      const far = Math.max(...spots.map((cell) => depth.get(cell.near[0].room.id)));
      spots = spots.filter((cell) => depth.get(cell.near[0].room.id) === far);
    }
    if (!spots.length) return null;
    const spot = rng.pick(spots);
    const room = add(spot.gx, spot.gy, type);
    const locked = type === 'treasure' && stage.lockTreasure;
    connect(room, spot.near[0].dir, spot.near[0].room, locked ? 'locked' : 'open');
    if (type === 'boss') bossId = room.id;
    // An unstable rift hides what is behind it.
    else if (rng.chance(0.3)) spot.near[0].room.doors[DIRS[spot.near[0].dir].opp].unstable = true;
  }

  // 3. One hidden room, tucked between as many rooms as possible.
  const hidden = emptyCells()
    .map((cell) => ({ ...cell, near: cell.near.filter((n) => n.room.type !== 'boss') }))
    .filter((cell) => cell.near.length > 0);
  if (!hidden.length) return null;
  const most = Math.max(...hidden.map((cell) => cell.near.length));
  const secretSpot = rng.pick(hidden.filter((cell) => cell.near.length === most));
  const secret = add(secretSpot.gx, secretSpot.gy, 'secret');
  for (const n of secretSpot.near) connect(secret, n.dir, n.room, 'secret');

  // 4. Layouts and the symbol puzzle with its scattered clues.
  for (const room of rooms) {
    if (room.type === 'combat' || room.type === 'elite') room.template = rng.pick(COMBAT_TEMPLATES);
    else if (room.type === 'miniboss') room.template = 'corners';
  }
  start.cleared = true;

  let code = null;
  if (rooms.some((room) => room.type === 'puzzle')) {
    code = rng.shuffle(SYMBOLS).slice(0, 3);
    const clueRooms = rng.shuffle(rooms.filter((room) => room.type === 'combat')).slice(0, 3);
    if (clueRooms.length < 3) return null;
    clueRooms.forEach((room, i) => {
      room.clue = { symbol: code[i], order: i + 1 };
    });
  }

  return { stage: stageIndex, variant: variantId, rooms, startId: start.id, bossId, code };
}

/**
 * @param {number} seed
 * @param {number} stageIndex index into STAGES
 * @param {string} variantId key of VARIANTS
 */
export function generateFloor(seed, stageIndex, variantId = 'plain') {
  if (!STAGES[stageIndex]) throw new Error(`Unknown stage ${stageIndex}`);
  if (!VARIANTS[variantId]) throw new Error(`Unknown variant "${variantId}"`);
  for (let attempt = 0; attempt < 200; attempt++) {
    const floor = tryBuild(new Rng(seed + attempt * 7919), stageIndex, variantId);
    if (floor) return floor;
  }
  throw new Error(`Could not generate a floor for seed ${seed}, stage ${stageIndex}, variant ${variantId}`);
}

/** Returns a list of problems with a floor; empty when it is sound. Used by the tests. */
export function validateFloor(floor) {
  const problems = [];
  const { rooms } = floor;
  const seen = new Set([floor.startId]);
  const queue = [rooms[floor.startId]];
  while (queue.length) {
    const room = queue.shift();
    for (const [dir, door] of Object.entries(room.doors)) {
      const other = rooms[door.to];
      if (!other) {
        problems.push(`room ${room.id} has a rift to a missing room`);
        continue;
      }
      const back = other.doors[DIRS[dir].opp];
      if (!back || back.to !== room.id) problems.push(`rift ${room.id}->${other.id} has no way back`);
      if (other.gx !== room.gx + DIRS[dir].dx || other.gy !== room.gy + DIRS[dir].dy) {
        problems.push(`rift ${room.id}->${other.id} does not match the grid`);
      }
      if (!seen.has(other.id)) {
        seen.add(other.id);
        queue.push(other);
      }
    }
  }
  if (seen.size !== rooms.length) problems.push('some rooms cannot be reached');
  const bosses = rooms.filter((room) => room.type === 'boss');
  if (bosses.length !== 1) problems.push(`expected one boss room, found ${bosses.length}`);
  else if (Object.keys(bosses[0].doors).length !== 1) problems.push('the boss room must be a dead end');
  if (rooms.filter((room) => room.type === 'secret').length !== 1) problems.push('expected one secret room');
  if (floor.code && rooms.filter((room) => room.clue).length !== 3) problems.push('the puzzle needs three clue rooms');
  return problems;
}
