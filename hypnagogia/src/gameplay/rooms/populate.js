// Decides what is inside a room: its tiles, who is waiting there and what lies on the floor.
// Pure functions over the plain room object, so the result survives saving and is testable.
import { COLS, ROOM_CX, ROOM_CY, ROOM_Y, ROWS, TILE, tileCenter } from '../../app/Config.js';
import { PRICES } from '../../data/balance.js';
import { ENEMIES } from '../../data/enemies.js';
import { TEMPLATE_BY_ID } from '../../data/rooms.js';
import { STAGES, VARIANTS } from '../../data/stages.js';
import { SYMBOLS } from '../../data/symbols.js';
import { Rng } from '../../utils/rng.js';

/** The room's tiles as an array of strings, with broken blocks already removed. */
export function roomTiles(room) {
  const rows = TEMPLATE_BY_ID[room.template].rows.map((row) => [...row]);
  for (const index of room.broken ?? []) rows[Math.floor(index / COLS)][index % COLS] = ',';
  return rows;
}

function freeTiles(room) {
  const tiles = roomTiles(room);
  const out = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) if (tiles[r][c] === '.') out.push({ c, r });
  }
  return out;
}

/**
 * Who appears when the player walks in. Deterministic for a room, so reloading a save mid-fight
 * brings back the same encounter.
 * @param {{x: number, y: number}} avoid nobody spawns close to this point (the player's entry)
 * @returns {{type: string, x: number, y: number, elite: boolean}[]}
 */
export function rollEncounter(room, floor, avoid) {
  const stage = STAGES[floor.stage];
  const variant = VARIANTS[floor.variant];
  if (room.cleared) return [];
  if (room.type === 'boss') return [{ type: stage.boss, x: ROOM_CX, y: ROOM_CY - 30, elite: false }];
  if (room.type === 'miniboss') return [{ type: stage.miniboss, x: ROOM_CX, y: ROOM_CY - 30, elite: false }];
  if (room.type !== 'combat' && room.type !== 'elite') return [];

  const rng = new Rng(room.seed);
  let budget = stage.budget * (variant.enemyMul ?? 1) * rng.range(0.85, 1.2);
  if (room.type === 'elite') budget *= 0.8;
  const spots = rng.shuffle(freeTiles(room).map(({ c, r }) => tileCenter(c, r)));
  const out = [];
  while (budget > 0.5 && out.length < 6) {
    const affordable = stage.enemies.filter((id) => ENEMIES[id].cost <= budget + 0.5);
    if (!affordable.length) break;
    const type = rng.pick(affordable);
    const spot = spots.find(
      (p) => Math.hypot(p.x - avoid.x, p.y - avoid.y) > 120 && out.every((o) => Math.hypot(p.x - o.x, p.y - o.y) > 40),
    );
    if (!spot) break;
    spots.splice(spots.indexOf(spot), 1);
    const elite = room.type === 'elite' ? out.length < 2 : rng.chance(variant.eliteChance ?? 0.04);
    out.push({ type, x: spot.x, y: spot.y, elite });
    budget -= ENEMIES[type].cost * (elite ? 1.6 : 1);
  }
  return out;
}

const PLATE_SPOTS = [
  [-112, -56], [0, -56], [112, -56],
  [-112, 60], [0, 60], [112, 60],
];

/**
 * Fills in the lasting contents of a room on the first visit: pickups, altars, props, plates.
 * @param {object} ctx { pickItem(pool) -> item id or null, memoryCode: string[], firstRun: boolean }
 */
export function populateRoom(room, floor, ctx) {
  if (room.populated) return;
  room.populated = true;
  room.broken = [];
  room.pickups = [];
  room.pedestals = [];
  room.props = [];
  room.decals = [];
  const rng = new Rng(room.seed ^ 0x9e3779b9);
  const stage = STAGES[floor.stage];
  const pedestal = (pool, x, y, extra = {}) => {
    const item = ctx.pickItem(pool);
    if (item) room.pedestals.push({ item, x, y, taken: false, ...extra });
  };

  switch (room.type) {
    case 'start':
      if (stage.id === 'roots') room.props.push({ kind: 'clock', x: ROOM_CX - 150, y: ROOM_Y + 44 });
      else room.props.push({ kind: 'drawing', x: ROOM_CX + 130, y: ROOM_CY + 60 });
      break;
    case 'treasure':
      pedestal('treasure', ROOM_CX, ROOM_CY);
      break;
    case 'shop': {
      room.props.push({ kind: 'merchant', x: ROOM_CX, y: ROOM_Y + 44 });
      pedestal('shop', ROOM_CX - 100, ROOM_CY + 40, { price: PRICES.item });
      const heart = rng.chance(0.5) ? 'heart_red' : 'heart_blue';
      room.pickups.push({ kind: heart, x: ROOM_CX, y: ROOM_CY + 40, price: PRICES[heart] });
      const tool = rng.pick(['shard', 'ink', 'heart_glass']);
      room.pickups.push({ kind: tool, x: ROOM_CX + 100, y: ROOM_CY + 40, price: PRICES[tool] });
      break;
    }
    case 'puzzle':
    case 'memory': {
      const symbols = rng.shuffle(SYMBOLS);
      room.plates = PLATE_SPOTS.map(([dx, dy], i) => ({ symbol: symbols[i], x: ROOM_CX + dx, y: ROOM_CY + dy }));
      room.puzzle = { attempts: 0, solved: false };
      if (room.type === 'memory') room.props.push({ kind: 'memory_door', x: ROOM_CX, y: ROOM_Y + 32 });
      break;
    }
    case 'event':
      room.props.push({ kind: rng.chance(0.5) ? 'well' : 'mirror', x: ROOM_CX, y: ROOM_CY - 16, used: 0 });
      break;
    case 'secret': {
      const loot = ['dust_big', 'dust_big', 'shard', 'ink', 'heart_blue'];
      const count = rng.int(3, 4);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + 0.4;
        room.pickups.push({ kind: rng.pick(loot), x: ROOM_CX + Math.cos(angle) * 60, y: ROOM_CY + 36 + Math.sin(angle) * 30 });
      }
      // One piece of the code for the erased door. Which piece changes from run to run.
      const index = rng.int(0, 2);
      room.decals.push({ name: `${ctx.memoryCode[index]}_chalk`, x: ROOM_CX - 18, y: ROOM_CY - 64 });
      room.decals.push({ name: `dots${index + 1}`, x: ROOM_CX + 18, y: ROOM_CY - 64 });
      break;
    }
    default:
      break;
  }

  if (room.type === 'combat' && stage.id === 'toys' && rng.chance(0.25)) {
    room.props.push({ kind: 'clock', x: ROOM_CX + rng.pick([-112, 112]), y: ROOM_CY });
  }

  if (room.clue) {
    // The drawing sits off the main lanes, where a fight will not keep the player from seeing it.
    const tiles = roomTiles(room);
    const pairs = freeTiles(room).filter(({ c, r }) => c < COLS - 2 && tiles[r][c + 1] === '.');
    const aside = pairs.filter(({ c, r }) => Math.abs(c - 6) > 1 && r !== 3);
    const { c, r } = rng.pick(aside.length ? aside : pairs);
    const a = tileCenter(c, r);
    room.decals.push({ name: `${room.clue.symbol}_chalk`, x: a.x, y: a.y });
    room.decals.push({ name: `dots${room.clue.order}`, x: a.x + TILE, y: a.y });
  }
}

const DROPS = [
  ['dust', 5], ['dust_big', 1], ['heart_half', 2], ['heart_red', 1], ['shard', 1.4], ['ink', 1.4], ['heart_blue', 0.6],
];

/**
 * What a room leaves behind once it is cleared. Returned as pickup descriptions; the caller places them.
 * @param {object} ctx { luck, pickItem(pool) }
 */
export function rollReward(room, floor, ctx) {
  const rng = new Rng(room.seed ^ 0x51ed270b);
  const variant = VARIANTS[floor.variant];
  const pickups = [];
  const pedestals = [];
  const drop = () => rng.weighted(DROPS, ([, weight]) => weight)[0];
  if (room.type === 'boss') {
    const item = ctx.pickItem('boss');
    if (item) pedestals.push({ item, x: ROOM_CX, y: ROOM_CY + 50, taken: false });
    pickups.push({ kind: 'heart_red' }, { kind: 'dust_big' });
  } else if (room.type === 'miniboss') {
    pickups.push({ kind: 'heart_glass' }, { kind: 'dust_big' }, { kind: drop() });
  } else if (room.type === 'elite') {
    pickups.push({ kind: 'dust_big' }, { kind: 'shard' }, { kind: drop() });
  } else if (rng.chance((0.42 + ctx.luck * 0.06) * (variant.dropMul ?? 1))) {
    pickups.push({ kind: drop() });
  }
  return { pickups, pedestals };
}
