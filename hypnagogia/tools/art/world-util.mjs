// Shared helpers for the world/item/effect sprite generators.
import { Img, PAL } from './lib.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'sheets');
export const PREVIEW = '/tmp/art-preview';

/** Deterministic hash -> [0,1). */
export function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Small seeded generator. */
export function rng(seed) {
  let s = Math.imul(seed | 0 || 1, 2654435761) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws with `fn` onto a scratch image, outlines it, then blits it onto `img`. */
export function sprite(img, fn, { outline = PAL.outline, corners = false } = {}) {
  const t = new Img(img.w, img.h);
  fn(t);
  if (outline) t.outline(outline, { corners });
  img.blit(t);
  return img;
}

/** Ellipse with three tones, light from the upper left. tones = [dark, mid, light]. */
export function ball(img, cx, cy, rx, ry, tones, { lightCut = -0.55, darkCut = 0.4 } = {}) {
  const [d, m, l] = tones;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const k = dx * 0.7 + dy * 0.7;
      img.set(x, y, k > darkCut ? d : k < lightCut && l ? l : m);
    }
  }
  return img;
}

/** Rectangle with a lit top/left edge and a dark bottom/right edge. */
export function slab(img, x, y, w, h, tones) {
  const [d, m, l] = tones;
  img.rect(x, y, w, h, m);
  img.rect(x, y, w, 1, l);
  img.rect(x, y, 1, h, l);
  img.rect(x, y + h - 1, w, 1, d);
  img.rect(x + w - 1, y, 1, h, d);
  return img;
}

/** Wobbly thin line, with optional gaps — a child's chalk stroke. */
export function chalkLine(img, x0, y0, x1, y1, color, seed = 1, gap = 0.1) {
  const r = rng(seed * 7919 + 13);
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  let off = 0;
  for (let i = 0; i <= Math.round(n); i++) {
    const t = i / Math.round(n);
    if (r() < 0.12) off = Math.max(-1, Math.min(1, off + (r() < 0.5 ? -1 : 1)));
    const x = Math.round(x0 + (x1 - x0) * t) + (horiz ? 0 : off);
    const y = Math.round(y0 + (y1 - y0) * t) + (horiz ? off : 0);
    if (r() >= gap) img.set(x, y, color);
  }
  return img;
}

/** Chalk polyline through points. */
export function chalkPath(img, pts, color, seed = 1, closed = false) {
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    chalkLine(img, a[0], a[1], b[0], b[1], color, seed + i * 7);
  }
  return img;
}

export function chalkCircle(img, cx, cy, r, color, seed = 1, from = 0, to = Math.PI * 2) {
  const q = rng(seed);
  const steps = Math.ceil(r * 7);
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const rr = r + (q() - 0.5) * 0.7;
    if (q() > 0.1) img.set(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, color);
  }
  return img;
}

export const tri = (t) => 1 - Math.abs(((t * 2) % 2) - 1); // 0..1..0
export const sin01 = (t) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

/** Mock-room composer: returns an Img from a tiles Sheet-like getter. */
export function savePreview(img, name, scale = 4, bg = '#39405a') {
  img.scaled(scale).onBackground(bg).savePNG(join(PREVIEW, name));
}
