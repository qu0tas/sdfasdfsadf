// Shared constants: the virtual pixel grid, room geometry and draw layers.

/** Logical resolution. The canvas is always rendered at this size and scaled up by whole numbers. */
export const VIEW_W = 480;
export const VIEW_H = 270;

export const TILE = 16;
/** Room interior, in tiles. Both are odd so every wall has a centre tile for its rift. */
export const COLS = 27;
export const ROWS = 13;
/** Top-left corner of the room interior, in view pixels. */
export const ROOM_X = 24;
export const ROOM_Y = 40;
export const ROOM_W = COLS * TILE;
export const ROOM_H = ROWS * TILE;
export const ROOM_CX = ROOM_X + ROOM_W / 2;
export const ROOM_CY = ROOM_Y + ROOM_H / 2;

/** Fixed simulation step, in seconds. Rendering runs as fast as the display allows. */
export const STEP = 1 / 120;

export const DIRS = {
  n: { dx: 0, dy: -1, opp: 's', angle: 0 },
  e: { dx: 1, dy: 0, opp: 'w', angle: -Math.PI / 2 },
  s: { dx: 0, dy: 1, opp: 'n', angle: Math.PI },
  w: { dx: -1, dy: 0, opp: 'e', angle: Math.PI / 2 },
};
export const DIR_KEYS = ['n', 'e', 's', 'w'];

/** Centre of the wall segment that holds the rift for each direction. */
export function doorPos(dir) {
  switch (dir) {
    case 'n': return { x: ROOM_CX, y: ROOM_Y - TILE / 2 };
    case 's': return { x: ROOM_CX, y: ROOM_Y + ROOM_H + TILE / 2 };
    case 'w': return { x: ROOM_X - TILE / 2, y: ROOM_CY };
    default: return { x: ROOM_X + ROOM_W + TILE / 2, y: ROOM_CY };
  }
}

/** Where the player stands after arriving through the rift in wall `dir`. */
export function entryPos(dir) {
  const p = doorPos(dir);
  const d = DIRS[dir];
  return { x: p.x - d.dx * 26, y: p.y - d.dy * 26 };
}

export const tileCenter = (c, r) => ({ x: ROOM_X + c * TILE + TILE / 2, y: ROOM_Y + r * TILE + TILE / 2 });
export const tileAt = (x, y) => ({ c: Math.floor((x - ROOM_X) / TILE), r: Math.floor((y - ROOM_Y) / TILE) });

/** Draw order. Sprites inside the same layer are sorted by their y position. */
export const LAYER = { floor: 0, decal: 1, shadow: 2, ents: 3, shots: 4, fx: 5, overlay: 6 };
