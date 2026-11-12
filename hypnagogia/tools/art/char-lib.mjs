// Shared helpers for the character sheets.
import { PAL, Img } from './lib.mjs';

export function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ramp: [dark, mid, light, highlight?]. Light comes from the upper left. */
export function shadeShape(img, bx, by, bw, bh, test, ramp, o = {}) {
  const cx = bx + (bw - 1) / 2, cy = by + (bh - 1) / 2;
  const lo = o.lo ?? 0.42, hi = o.hi ?? -0.45;
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      if (!test(x, y)) continue;
      const u = (x - cx) / (bw / 2), v = (y - cy) / (bh / 2);
      const t = u * 0.6 + v * 0.8;
      let c = ramp[1];
      if (t > lo) c = ramp[0];
      else if (t < hi) c = ramp[2];
      img.set(x, y, c);
    }
  }
  if (ramp[3] && o.spark !== false) {
    const hx = Math.round(cx - bw * 0.25), hy = Math.round(cy - bh * 0.28);
    if (test(hx, hy)) img.set(hx, hy, ramp[3]);
    if (test(hx + 1, hy)) img.set(hx + 1, hy, ramp[3]);
  }
  return img;
}

export function shadeEllipse(img, cx, cy, rx, ry, ramp, o) {
  const bx = Math.floor(cx - rx), by = Math.floor(cy - ry);
  const bw = Math.ceil(cx + rx) - bx + 1, bh = Math.ceil(cy + ry) - by + 1;
  return shadeShape(img, bx, by, bw, bh, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 0.985, ramp, o);
}

/** Rounded rectangle, r = corner radius. */
export function shadeRRect(img, x, y, w, h, r, ramp, o) {
  const test = (px, py) => {
    const qx = Math.max(x + r - 0.5 - px, px - (x + w - r - 0.5), 0);
    const qy = Math.max(y + r - 0.5 - py, py - (y + h - r - 0.5), 0);
    return qx * qx + qy * qy <= r * r + 0.25;
  };
  return shadeShape(img, x, y, w, h, test, ramp, o);
}

export const R = {
  gb: [PAL.gb1, PAL.gb2, PAL.gb3, PAL.gb4],
  gbL: [PAL.gb2, PAL.gb3, PAL.gb4, PAL.gb5],
  pu: [PAL.pu1, PAL.pu2, PAL.pu3, PAL.pu4],
  puL: [PAL.pu2, PAL.pu3, PAL.pu4, PAL.pu5],
  rose: [PAL.rose1, PAL.rose2, PAL.rose3, PAL.white],
  sand: [PAL.sand1, PAL.sand2, PAL.sand3, PAL.white],
  moss: [PAL.moss1, PAL.moss2, PAL.moss3, PAL.cy3],
  heart: [PAL.heart1, PAL.heart2, PAL.heart3, PAL.rose3],
  cy: [PAL.cy1, PAL.cy2, PAL.cy3, PAL.cy4],
};

/** Vertical 2x3 glowing eye, top-left at (x,y). */
export function eye(img, x, y, st = 'open') {
  if (st === 'open') {
    img.rect(x, y, 2, 3, PAL.cy4);
    img.set(x, y, PAL.cy3); img.set(x + 1, y, PAL.cy3); img.set(x, y + 2, PAL.cy3); img.set(x + 1, y + 2, PAL.cy3);
  } else if (st === 'big') {
    img.rect(x - 1, y - 1, 4, 5, PAL.cy3);
    img.rect(x, y, 2, 3, PAL.cy4);
    img.set(x - 1, y - 1, PAL.none); img.set(x + 2, y - 1, PAL.none); img.set(x - 1, y + 3, PAL.none); img.set(x + 2, y + 3, PAL.none);
    img.clear(x - 1, y - 1); img.clear(x + 2, y - 1); img.clear(x - 1, y + 3); img.clear(x + 2, y + 3);
  } else if (st === 'half') {
    img.rect(x, y + 1, 2, 2, PAL.cy4); img.set(x, y + 1, PAL.cy3); img.set(x + 1, y + 1, PAL.cy3);
  } else if (st === 'closed') {
    img.rect(x, y + 2, 2, 1, PAL.cy2);
  } else if (st === 'slit') {
    img.rect(x, y + 1, 2, 1, PAL.cy3);
  } else if (st === 'dim') {
    img.rect(x, y, 2, 3, PAL.cy2);
  }
}

/**
 * Breaks a drawn (outlined) frame into pale dream-light motes. p: 0 intact .. 1 gone.
 * Pixels leave from the top (or randomly when top=false) and rise as motes.
 */
export function dissolve(src, p, { seed = 1, top = true, rise = 7, mote = 0.5, colors } = {}) {
  const out = new Img(src.w, src.h);
  let y0 = src.h, y1 = 0;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const hgt = Math.max(1, y1 - y0);
  const cols = colors ?? [PAL.cy3, PAL.cy4, PAL.cy2, PAL.cy3];
  const motes = [];
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      if (!src.alpha(x, y)) continue;
      const n = hash(x, y, seed);
      const ny = top ? (y - y0) / hgt : 0.5;
      const thr = ny * 0.72 + n * 0.28;
      if (thr >= p) { out.set(x, y, src.get(x, y)); continue; }
      const n2 = hash(x, y, seed + 7), n3 = hash(x, y, seed + 13);
      if (n3 < mote * (1 - p) ** 1.1) {
        const lift = Math.round((p - thr + 0.05) * rise * (0.6 + n2));
        const dx = Math.round((n2 - 0.5) * 4 * p);
        motes.push([x + dx, y - lift, cols[Math.floor(n2 * cols.length)]]);
      }
    }
  }
  for (const [x, y, c] of motes) if (x > 0 && y > 0 && x < src.w - 1 && y < src.h - 1) out.set(x, y, c);
  return out;
}

/** Sparse glints scattered inside an image box (for appear/ambient). */
export function sparkle(img, x, y, c = PAL.cy4) {
  img.set(x, y, c); img.set(x - 1, y, PAL.cy2 + '90'); img.set(x + 1, y, PAL.cy2 + '90');
  img.set(x, y - 1, PAL.cy2 + '90'); img.set(x, y + 1, PAL.cy2 + '90');
}

/** Pale cyan swirl glyph (spiral) with top-left at x,y; size 5x5. */
export function swirl(img, x, y, f = 0, c = PAL.cy3) {
  const rows = [
    ['.XXX.', 'X...X', 'X.X.X', 'X..XX', '.XXX.'],
    ['.XXX.', 'X...X', 'X.X.X', 'XX..X', '.XXX.'],
  ][f % 2];
  img.pixels(x, y, rows, { X: c });
}

export function clampBorder(img) {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++)
    if ((x === 0 || y === 0 || x === img.w - 1 || y === img.h - 1) && img.alpha(x, y)) { img.clear(x, y); clampBorder.hits++; (clampBorder.log ??= []).push(clampBorder.tag + ' @' + x + ',' + y); }
  return img;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t * t * (3 - 2 * t);
clampBorder.hits = 0;
