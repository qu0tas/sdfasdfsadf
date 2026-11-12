// More drawing helpers: polygons, rotation, shear, hearts, halos.
import { Img, PAL } from './lib.mjs';

/** Even-odd polygon fill (pixel centres). */
export function poly(img, pts, color) {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.floor(Math.min(...ys));
  const y1 = Math.ceil(Math.max(...ys));
  const xs = pts.map((p) => p[0]);
  const x0 = Math.floor(Math.min(...xs));
  const x1 = Math.ceil(Math.max(...xs));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) img.set(x, y, typeof color === 'function' ? color(x, y) : color);
    }
  }
  return img;
}

/** Draws a shape defined in local coordinates `f(u, v) -> colour | null`, rotated by `ang`. */
export function rotShape(img, cx, cy, ang, f, reach = 10) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++) {
    for (let x = Math.floor(cx - reach); x <= Math.ceil(cx + reach); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const col = f(dx * c + dy * s, -dx * s + dy * c);
      if (col) img.set(x, y, col);
    }
  }
  return img;
}

/** Shifts rows above `y` by `k` px horizontally (a cheap wiggle/tilt). */
export function shearTop(img, y, k) {
  const src = img.clone();
  for (let yy = 0; yy < y; yy++) {
    for (let x = 0; x < img.w; x++) img.clear(x, yy);
  }
  for (let yy = 0; yy < y; yy++) {
    const sh = Math.round((k * (y - yy)) / y);
    for (let x = 0; x < img.w; x++) {
      const c = src.get(x, yy);
      if (c[3]) img.set(x + sh, yy, c);
    }
  }
  return img;
}

/** Implicit heart shape mask: returns true when pixel is inside a heart of half-width `s` at (cx, cy). */
export function inHeart(x, y, cx, cy, s) {
  const u = (x - cx) / s;
  const v = -(y - cy + s * 0.12) / s;
  return (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0 && Math.abs(u) < 1.3;
}

/** Shaded heart. tones = [dark, mid, light]. mode: 'full' | 'left' (left half only coloured). */
export function heart(img, cx, cy, s, tones, { empty = null } = {}) {
  const [d, m, l] = tones;
  for (let y = Math.floor(cy - s * 1.4); y <= Math.ceil(cy + s * 1.4); y++) {
    for (let x = Math.floor(cx - s * 1.4); x <= Math.ceil(cx + s * 1.4); x++) {
      if (!inHeart(x, y, cx, cy, s)) continue;
      const u = (x - cx) / s;
      const v = (y - cy) / s;
      if (empty && x >= cx) {
        img.set(x, y, empty);
        continue;
      }
      const k = u * 0.55 + v * 0.8;
      img.set(x, y, k > 0.45 ? d : u < -0.28 && v < -0.2 && l ? l : m);
    }
  }
  return img;
}

/** Soft halo drawn only onto transparent pixels so sprite colours stay pure. */
export function halo(img, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && img.alpha(x, y) === 0) img.set(x, y, color);
    }
  }
  return img;
}

/** N-point star polygon points. */
export function starPts(cx, cy, R, r, rot = -Math.PI / 2, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/** Four-point glint (plus with long arms). */
export function glint(img, cx, cy, len, color, core = PAL.white) {
  for (let i = -len; i <= len; i++) {
    img.set(cx + i, cy, color);
    img.set(cx, cy + i, color);
  }
  img.set(cx, cy, core);
  return img;
}

export { Img };
