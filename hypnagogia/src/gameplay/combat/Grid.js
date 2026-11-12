// Room collision: a tile grid of solid blocks inside the room's walls, plus simple path help
// for walking enemies. Hitboxes are small squares/circles kept separate from the sprites.
import { COLS, ROOM_H, ROOM_W, ROOM_X, ROOM_Y, ROWS, TILE, tileAt, tileCenter } from '../../app/Config.js';

const SOLID = new Set(['#', 'x']);

export class Grid {
  /** @param {string[][]} tiles rows of '.', '#', 'x', ',' */
  constructor(tiles) {
    this.tiles = tiles;
    this.dist = new Int16Array(COLS * ROWS);
    this.flowTile = -1;
  }

  solid(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    return SOLID.has(this.tiles[r][c]);
  }

  solidAt(x, y) {
    const { c, r } = tileAt(x, y);
    return this.solid(c, r);
  }

  inRoom(x, y, margin = 0) {
    return x >= ROOM_X + margin && x <= ROOM_X + ROOM_W - margin && y >= ROOM_Y + margin && y <= ROOM_Y + ROOM_H - margin;
  }

  boxBlocked(x, y, half) {
    const a = tileAt(x - half, y - half);
    const b = tileAt(x + half, y + half);
    for (let r = a.r; r <= b.r; r++) for (let c = a.c; c <= b.c; c++) if (this.solid(c, r)) return true;
    return false;
  }

  /**
   * Moves a body by (dx, dy), sliding along walls and blocks. Flying bodies ignore blocks.
   * @returns {{x: boolean, y: boolean}} which axes were stopped
   */
  move(body, dx, dy, half, flying = false) {
    const hit = { x: false, y: false };
    const minX = ROOM_X + half;
    const maxX = ROOM_X + ROOM_W - half;
    const minY = ROOM_Y + half;
    const maxY = ROOM_Y + ROOM_H - half;
    const h = half - 0.01;

    let nx = body.x + dx;
    if (nx < minX || nx > maxX) {
      nx = Math.max(minX, Math.min(maxX, nx));
      hit.x = true;
    }
    if (!flying && dx !== 0 && this.boxBlocked(nx, body.y, h)) {
      const edge = tileAt(nx + Math.sign(dx) * h, body.y).c;
      nx = dx > 0 ? ROOM_X + edge * TILE - half : ROOM_X + (edge + 1) * TILE + half;
      // Squeezed from the side by a diagonal block: stay put instead of jumping.
      if (this.boxBlocked(nx, body.y, h)) nx = body.x;
      hit.x = true;
    }
    body.x = nx;

    let ny = body.y + dy;
    if (ny < minY || ny > maxY) {
      ny = Math.max(minY, Math.min(maxY, ny));
      hit.y = true;
    }
    if (!flying && dy !== 0 && this.boxBlocked(body.x, ny, h)) {
      const edge = tileAt(body.x, ny + Math.sign(dy) * h).r;
      ny = dy > 0 ? ROOM_Y + edge * TILE - half : ROOM_Y + (edge + 1) * TILE + half;
      if (this.boxBlocked(body.x, ny, h)) ny = body.y;
      hit.y = true;
    }
    body.y = ny;
    return hit;
  }

  /** True when nothing solid lies on the straight line between two points. */
  clearLine(x0, y0, x1, y1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  /** Recomputes walking distances to the target, only when it has moved to another tile. */
  aimFlow(x, y) {
    const { c, r } = tileAt(x, y);
    const index = r * COLS + c;
    if (index === this.flowTile || this.solid(c, r)) return;
    this.flowTile = index;
    this.dist.fill(-1);
    this.dist[index] = 0;
    const queue = [index];
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head];
      const ac = at % COLS;
      const ar = Math.floor(at / COLS);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = ac + dc;
        const nr = ar + dr;
        if (this.solid(nc, nr)) continue;
        const ni = nr * COLS + nc;
        if (this.dist[ni] !== -1) continue;
        this.dist[ni] = this.dist[at] + 1;
        queue.push(ni);
      }
    }
  }

  /**
   * Unit direction a walker at (x, y) should take to reach (tx, ty): straight when the way is
   * clear, otherwise around the blocks along the shortest tile path.
   */
  steer(x, y, tx, ty) {
    let dx = tx - x;
    let dy = ty - y;
    if (!this.clearLine(x, y, tx, ty)) {
      this.aimFlow(tx, ty);
      const { c, r } = tileAt(x, y);
      let best = this.solid(c, r) ? Infinity : this.dist[r * COLS + c];
      if (best < 0) best = Infinity;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (this.solid(c + dc, r + dr)) continue;
        const d = this.dist[(r + dr) * COLS + c + dc];
        if (d >= 0 && d < best) {
          best = d;
          const p = tileCenter(c + dc, r + dr);
          dx = p.x - x;
          dy = p.y - y;
        }
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  /** A random walkable spot, optionally away from a point. */
  freeSpot(rng, awayX = 0, awayY = 0, minDist = 0) {
    for (let i = 0; i < 60; i++) {
      const c = Math.floor(rng() * (COLS - 2)) + 1;
      const r = Math.floor(rng() * (ROWS - 2)) + 1;
      if (this.solid(c, r)) continue;
      const p = tileCenter(c, r);
      if (Math.hypot(p.x - awayX, p.y - awayY) >= minDist) return p;
    }
    return tileCenter(13, 6);
  }
}
