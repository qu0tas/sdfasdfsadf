// Tiny pixel-art toolkit used by the sprite generators in this folder.
// It rasterises into plain RGBA buffers and writes PNG sprite sheets plus a
// JSON description of their animations (see Sheet.save).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The shared Hypnagogia palette. Generators must only use these colours. */
export const PAL = {
  none: '#00000000',
  outline: '#1b1a2b',
  ink: '#12101f',
  dark: '#2a2940',
  // grey-blue ramp (Tiny Zero, walls, most of the world)
  gb1: '#3c4660',
  gb2: '#56637f',
  gb3: '#7a89a6',
  gb4: '#a3b1c9',
  gb5: '#cfd9e6',
  // dusty purple ramp
  pu1: '#3a2f4a',
  pu2: '#5a4870',
  pu3: '#7d6a94',
  pu4: '#a892b8',
  pu5: '#d0c0da',
  // pale cyan glow ramp (use sparingly)
  cy1: '#4f8f9c',
  cy2: '#7fc7cf',
  cy3: '#b4e6ea',
  cy4: '#e6fbfb',
  // faded pastels
  rose1: '#8a5266',
  rose2: '#b97a8c',
  rose3: '#d9a5b0',
  sand1: '#a8966a',
  sand2: '#d8c98f',
  sand3: '#efe5b8',
  moss1: '#4f6b63',
  moss2: '#6f8f84',
  moss3: '#9dbaa8',
  heart1: '#7c3347',
  heart2: '#a84a5c',
  heart3: '#cf6f7e',
  white: '#f4f7fa',
};

const cache = new Map();
/** '#rrggbb' or '#rrggbbaa' (or a PAL key) -> [r, g, b, a]. */
export function rgba(color) {
  if (Array.isArray(color)) return color;
  let c = cache.get(color);
  if (c) return c;
  const hex = (PAL[color] ?? color).replace('#', '');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) throw new Error(`Bad colour: ${color}`);
  c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  c.push(hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255);
  cache.set(color, c);
  return c;
}

export class Img {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  clone() {
    const o = new Img(this.w, this.h);
    o.data.set(this.data);
    return o;
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Alpha of a pixel; 0 outside the image. */
  alpha(x, y) {
    return this.inside(x, y) ? this.data[(y * this.w + x) * 4 + 3] : 0;
  }

  get(x, y) {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  /** Writes a pixel. Colours with partial alpha are blended over the old value. */
  set(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return this;
    const [r, g, b, a] = rgba(color);
    const i = (y * this.w + x) * 4;
    if (a === 255 || this.data[i + 3] === 0) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = a;
    } else if (a > 0) {
      const t = a / 255;
      this.data[i] = r * t + this.data[i] * (1 - t);
      this.data[i + 1] = g * t + this.data[i + 1] * (1 - t);
      this.data[i + 2] = b * t + this.data[i + 2] * (1 - t);
      this.data[i + 3] = Math.max(this.data[i + 3], a);
    }
    return this;
  }

  clear(x, y) {
    if (this.inside(x, y)) this.data.fill(0, (y * this.w + x) * 4, (y * this.w + x) * 4 + 4);
    return this;
  }

  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
    return this;
  }

  /** Filled ellipse centred on (cx, cy); half-pixel centres give even widths. */
  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color);
      }
    }
    return this;
  }

  line(x0, y0, x1, y1, color) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** Draws rows of text where each character maps to a colour via `key` ('.' and ' ' are skipped). */
  pixels(x, y, rows, key) {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return;
        if (!(ch in key)) throw new Error(`Unknown pixel key "${ch}"`);
        this.set(x + i, y + j, key[ch]);
      });
    });
    return this;
  }

  /** Copies another image on top of this one. */
  blit(src, dx = 0, dy = 0, { flipX = false, flipY = false } = {}) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, flipY ? src.h - 1 - y : y);
        if (c[3] > 0) this.set(dx + x, dy + y, c);
      }
    }
    return this;
  }

  /** Recolours every opaque pixel for which `fn(x, y, rgba)` returns a colour. */
  map(fn) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        const out = fn(x, y, c);
        if (out) {
          this.clear(x, y);
          this.set(x, y, out);
        }
      }
    }
    return this;
  }

  /**
   * Adds a one pixel outline around everything opaque.
   * `corners` also fills diagonal neighbours, giving a heavier line.
   */
  outline(color = PAL.outline, { corners = false } = {}) {
    const src = this.clone();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (src.alpha(x, y) > 0) continue;
        const near =
          src.alpha(x - 1, y) || src.alpha(x + 1, y) || src.alpha(x, y - 1) || src.alpha(x, y + 1);
        const diag =
          corners &&
          (src.alpha(x - 1, y - 1) || src.alpha(x + 1, y - 1) || src.alpha(x - 1, y + 1) || src.alpha(x + 1, y + 1));
        if (near || diag) this.set(x, y, color);
      }
    }
    return this;
  }

  /** Nearest-neighbour upscale, for previews. */
  scaled(k) {
    const o = new Img(this.w * k, this.h * k);
    for (let y = 0; y < o.h; y++) {
      for (let x = 0; x < o.w; x++) {
        const s = ((Math.floor(y / k) * this.w + Math.floor(x / k)) * 4) | 0;
        o.data.set(this.data.subarray(s, s + 4), (y * o.w + x) * 4);
      }
    }
    return o;
  }

  /** Same image composited over a flat background, for previews. */
  onBackground(color) {
    const o = new Img(this.w, this.h).rect(0, 0, this.w, this.h, color);
    return o.blit(this);
  }

  savePNG(path) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, encodePNG(this));
    return this;
  }
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePNG(img) {
  const raw = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    Buffer.from(img.data.buffer, y * img.w * 4, img.w * 4).copy(raw, y * (img.w * 4 + 1) + 1);
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(img.w, 0);
  head.writeUInt32BE(img.h, 4);
  head.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * A sprite sheet: every animation is one row of equally sized cells.
 *
 *   const s = new Sheet('zero', 24, 24);
 *   s.anim('idle', 4, (img, i, t) => draw(img, t), { fps: 5 });
 *   s.save(outDir);   // writes zero.png and zero.json
 */
export class Sheet {
  /**
   * `scale` is how many screen pixels of the game one pixel of this sheet covers. The generated
   * world art is drawn small and shown at 2; detailed art such as the hero is drawn at 1.
   */
  constructor(name, cellW, cellH, { scale = 2 } = {}) {
    this.scale = scale;
    this.name = name;
    this.cellW = cellW;
    this.cellH = cellH;
    this.rows = [];
  }

  /**
   * `draw(img, index, t)` paints frame `index` into a blank cell; `t` runs 0..1 over the animation.
   * `loop: false` makes the animation hold its last frame.
   */
  anim(name, frames, draw, { fps = 8, loop = true } = {}) {
    if (this.rows.some((r) => r.name === name)) throw new Error(`Duplicate animation ${name}`);
    const cells = [];
    for (let i = 0; i < frames; i++) {
      const img = new Img(this.cellW, this.cellH);
      draw(img, i, frames > 1 ? i / frames : 0);
      cells.push(img);
    }
    this.rows.push({ name, cells, fps, loop });
    return this;
  }

  /** A single static frame. */
  still(name, draw) {
    return this.anim(name, 1, (img) => draw(img), { fps: 1, loop: false });
  }

  compose() {
    const cols = Math.max(...this.rows.map((r) => r.cells.length));
    const img = new Img(cols * this.cellW, this.rows.length * this.cellH);
    this.rows.forEach((row, j) => row.cells.forEach((cell, i) => img.blit(cell, i * this.cellW, j * this.cellH)));
    return img;
  }

  save(dir) {
    const img = this.compose();
    img.savePNG(join(dir, `${this.name}.png`));
    const anims = {};
    this.rows.forEach((row, j) => {
      anims[row.name] = { row: j, frames: row.cells.length, fps: row.fps, loop: row.loop };
    });
    const meta = { name: this.name, cellW: this.cellW, cellH: this.cellH, scale: this.scale, width: img.w, height: img.h, anims };
    writeFileSync(join(dir, `${this.name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    return img;
  }

  /** Writes an upscaled copy on a flat background so the sheet can be inspected. */
  preview(path, scale = 4, background = '#39405a') {
    this.compose().scaled(scale).onBackground(background).savePNG(path);
  }
}
