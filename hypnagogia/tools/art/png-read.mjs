// Reads a PNG into an Img. Supports what image editors normally export: 8-bit RGB or RGBA,
// not interlaced. Used to bring hand-made or generated art into the sprite pipeline.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Img } from './lib.mjs';

export function readPNG(path) {
  const buf = readFileSync(path);
  let p = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const name = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (name === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      type = data[9];
      if (data[8] !== 8 || data[12] !== 0 || (type !== 2 && type !== 6)) {
        throw new Error(`${path}: save the image as an 8-bit RGB or RGBA PNG without interlacing`);
      }
    }
    if (name === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = (v + pred) & 255;
    }
  }
  const img = new Img(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = px[i * bpp];
    img.data[i * 4 + 1] = px[i * bpp + 1];
    img.data[i * 4 + 2] = px[i * bpp + 2];
    img.data[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] : 255;
  }
  return img;
}

/**
 * Cuts a character out of a picture and shrinks it to real pixel art.
 *
 * The picture may have any flat or chequered background: everything reachable from the `seeds`
 * without crossing the character's dark outline is treated as background.
 * @param {Img} src
 * @param {object} o { width: target width in pixels, colors: palette size, seeds: [[x, y], ...] (0..1), dark: outline brightness limit }
 * @returns {Img} the character, tightly cropped
 */
export function cutOut(src, { width, colors = 14, seeds = [[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]], dark = 105 } = {}) {
  const { w, h } = src;
  const lum = (i) => (src.data[i * 4] * 3 + src.data[i * 4 + 1] * 6 + src.data[i * 4 + 2]) / 10;
  const bg = new Uint8Array(w * h);
  const stack = seeds.map(([fx, fy]) => Math.floor(fy * (h - 1)) * w + Math.floor(fx * (w - 1)));
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  while (stack.length) {
    const i = stack.pop();
    if (bg[i] || lum(i) < dark) continue;
    bg[i] = 1;
    const x = i % w;
    const y = (i - x) / w;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  // The character is whatever the background surrounds.
  let cx0 = w;
  let cy0 = h;
  let cx1 = 0;
  let cy1 = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (bg[y * w + x]) continue;
      cx0 = Math.min(cx0, x);
      cx1 = Math.max(cx1, x);
      cy0 = Math.min(cy0, y);
      cy1 = Math.max(cy1, y);
    }
  }
  const step = (cx1 - cx0 + 1) / width;
  const height = Math.round((cy1 - cy0 + 1) / step);
  const out = new Img(width, height);
  const list = [];
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const sx0 = cx0 + tx * step;
      const sy0 = cy0 + ty * step;
      let fg = 0;
      let total = 0;
      const sum = [0, 0, 0];
      let n = 0;
      for (let y = Math.floor(sy0); y < sy0 + step; y++) {
        for (let x = Math.floor(sx0); x < sx0 + step; x++) {
          if (x > x1 || y > y1) continue;
          total++;
          if (bg[y * w + x]) continue;
          fg++;
          // Colour comes from the middle of the block, away from the blurry edges between source pixels.
          const u = (x - sx0) / step;
          const v = (y - sy0) / step;
          if (u < 0.25 || u > 0.75 || v < 0.25 || v > 0.75) continue;
          for (let k = 0; k < 3; k++) sum[k] += src.data[(y * w + x) * 4 + k];
          n++;
        }
      }
      if (fg / Math.max(1, total) < 0.5 || n === 0) continue;
      const c = [sum[0] / n, sum[1] / n, sum[2] / n];
      list.push({ tx, ty, c });
    }
  }
  // Reduce to a small palette (k-means), as a pixel artist would.
  let centres = Array.from({ length: colors }, (_, k) => [...list[Math.floor(((k + 0.5) / colors) * list.length)].c]);
  for (let round = 0; round < 24; round++) {
    const acc = centres.map(() => [0, 0, 0, 0]);
    for (const p of list) {
      let best = 0;
      let bd = Infinity;
      centres.forEach((c, k) => {
        const d = (c[0] - p.c[0]) ** 2 + (c[1] - p.c[1]) ** 2 + (c[2] - p.c[2]) ** 2;
        if (d < bd) {
          bd = d;
          best = k;
        }
      });
      p.k = best;
      for (let j = 0; j < 3; j++) acc[best][j] += p.c[j];
      acc[best][3]++;
    }
    centres = centres.map((c, k) => (acc[k][3] ? acc[k].slice(0, 3).map((v) => v / acc[k][3]) : c));
  }
  for (const p of list) out.set(p.tx, p.ty, [...centres[p.k].map(Math.round), 255]);
  return out;
}
