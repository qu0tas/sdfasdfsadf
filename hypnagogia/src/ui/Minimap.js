// The map of the current stage, drawn on a small 2D canvas in the corner (and enlarged on Tab).
// It shows rooms the player has seen. What an unstable rift hides stays a question mark, and the
// hidden room appears only after it has been found.
import { sheets } from '../app/Assets.js';

const CELL_W = 14;
const CELL_H = 12;
const GRID_W = 9;
const GRID_H = 7;

const GLYPH = {
  start: 'start', treasure: 'treasure', shop: 'shop', boss: 'boss', miniboss: 'miniboss', elite: 'miniboss',
  puzzle: 'puzzle', event: 'event', memory: 'memory', secret: 'secret',
};

export class Minimap {
  /** @param {HTMLCanvasElement} canvas @param {boolean} full whole grid instead of a window around the player */
  constructor(canvas, full) {
    this.canvas = canvas;
    this.full = full;
    this.cols = full ? GRID_W : 5;
    this.rows = full ? GRID_H : 5;
    canvas.width = this.cols * CELL_W + 1;
    canvas.height = this.rows * CELL_H + 1;
    canvas.style.width = `calc(${canvas.width} * var(--px))`;
    canvas.style.height = `calc(${canvas.height} * var(--px))`;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.signature = '';
  }

  draw(run) {
    const { rooms } = run.floor;
    const signature = `${run.stageIndex}|${run.roomId}|${rooms.map((r) => `${+r.seen}${+r.visited}${+r.cleared}`).join('')}`;
    if (signature === this.signature) return;
    this.signature = signature;

    const { ctx } = this;
    const here = run.room;
    const ox = this.full ? 0 : here.gx - 2;
    const oy = this.full ? 0 : here.gy - 2;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const room of rooms) {
      if (!room.seen) continue;
      const cx = room.gx - ox;
      const cy = room.gy - oy;
      if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) continue;
      const x = cx * CELL_W;
      const y = cy * CELL_H;
      ctx.fillStyle = '#1b1a2b';
      ctx.fillRect(x, y, CELL_W + 1, CELL_H + 1);
      ctx.fillStyle = room === here ? '#b4e6ea' : room.visited ? '#7a89a6' : '#3c4660';
      ctx.fillRect(x + 1, y + 1, CELL_W - 1, CELL_H - 1);

      let glyph = GLYPH[room.type];
      if (room.type === 'start' && room !== here && run.stageIndex >= 0) glyph = 'start';
      // Seen only through unstable rifts: the map does not know what it is either.
      if (glyph && !room.visited && room.type !== 'secret') {
        const known = Object.values(room.doors).some((door) => {
          const from = rooms[door.to];
          const back = Object.values(from.doors).find((d) => d.to === room.id);
          return from.visited && !back.unstable;
        });
        if (!known) glyph = 'unknown';
      }
      if (glyph && room !== here) {
        const { image, meta } = sheets.glyphs;
        const entry = meta.anims[glyph];
        ctx.drawImage(image, 0, entry.row * meta.cellH, meta.cellW, meta.cellH, x + 1, y, meta.cellW, meta.cellH);
      }
    }

    // Open connections between seen rooms.
    ctx.fillStyle = '#cfd9e6';
    for (const room of rooms) {
      if (!room.visited) continue;
      for (const [dir, door] of Object.entries(room.doors)) {
        if (door.kind === 'secret' && !door.found) continue;
        const cx = room.gx - ox;
        const cy = room.gy - oy;
        if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) continue;
        const x = cx * CELL_W;
        const y = cy * CELL_H;
        if (dir === 'e') ctx.fillRect(x + CELL_W, y + 5, 1, 3);
        if (dir === 's') ctx.fillRect(x + 6, y + CELL_H, 3, 1);
        if (dir === 'w') ctx.fillRect(x, y + 5, 1, 3);
        if (dir === 'n') ctx.fillRect(x + 6, y, 3, 1);
      }
    }
  }
}
