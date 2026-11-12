import { PAL, Img, Sheet } from './lib.mjs';
import { R, shadeEllipse, eye, dissolve, sparkle, swirl } from './char-lib.mjs';

/** Draws Tiny Zero into a fresh 24x24 layer (outlined). */
export function zeroBody(p = {}) {
  const { sx = 0, sy = 0, dy = 0, ox = 0, lf = 0, rf = 0, lfx = 0, rfx = 0, eyes = 'open', eyeDx = 0, eyeDy = 0, crack = 0, swirlF = 0 } = p;
  const L = new Img(24, 24);
  const H = 15 + sy;
  const bottom = 19 + dy;
  const cy = bottom - (H - 1) / 2;
  const cx = 12 + ox;
  const rx = 8.5 + sx / 2;
  for (const [fx, lift] of [[8 + lfx, lf], [14 + rfx, rf]]) {
    const y = 20 - lift;
    L.rect(fx, y, 3, 2, PAL.gb2);
    L.rect(fx, y + 1, 3, 1, PAL.gb1);
    L.set(fx, y, PAL.gb3);
  }
  shadeEllipse(L, cx, cy, rx, H / 2, R.gb);
  L.outline();
  const sxp = Math.round(cx - rx * 0.62), syp = Math.round(cy - H * 0.3);
  L.pixels(sxp, syp, swirlF ? ['XXX.', '...X', 'X.XX', '.XX.'] : ['XXX.', '...X', '.X.X', '.XX.'], { X: PAL.gb1 });
  const ey = Math.round(cy + 0.5) + eyeDy;
  const ex = Math.round(cx) + eyeDx;
  eye(L, ex - 4, ey - 1, eyes);
  eye(L, ex + 2, ey - 1, eyes);
  if (crack) {
    const top = Math.round(cy - H / 2);
    L.line(ex + 3, top + 2, ex + 5, top + 5, PAL.outline);
    if (crack > 1) L.line(ex - 6, ey + 2, ex - 4, ey + 4, PAL.outline);
  }
  return L;
}

function dashFrame(i) {
  const L = new Img(24, 24);
  const rx = [9, 9.5, 9.5, 9][i], ry = [6.5, 5.5, 5.5, 6.5][i];
  const cx = 12, cy = 14;
  shadeEllipse(L, cx, cy, rx, ry, R.gb);
  const fy = Math.round(cy + ry);
  L.rect(cx - 3, fy, 3, 1, PAL.gb1);
  L.rect(cx + 2, fy, 3, 1, PAL.gb1);
  L.outline();
  for (let k = 0; k < 4; k++) {
    const yy = Math.round(cy - ry + 2 + k * 2.2);
    const len = [3, 5, 4, 2][(k + i) % 4] + (i === 1 || i === 2 ? 1 : 0);
    const x1 = Math.round(cx - rx - 1);
    L.line(Math.max(1, x1 - len), yy, x1, yy, PAL.gb3 + '90');
  }
  const ex = cx + 3;
  for (const x of [ex, ex - 5]) {
    L.rect(x, 12, 3, 2, PAL.cy4);
    L.rect(x, 12, 3, 1, PAL.cy3);
  }
  return L;
}

export function zeroSheet() {
  const s = new Sheet('zero', 24, 24);
  s.anim('idle', 4, (img, i) => img.blit(zeroBody({ sy: [0, 0, 1, 0][i], sx: [0, 0, -1, 0][i] })), { fps: 5 });
  s.anim('blink', 3, (img, i) => img.blit(zeroBody({ eyes: ['half', 'closed', 'half'][i] })), { fps: 10, loop: false });
  s.anim('walk', 6, (img, i) => {
    const lf = [0, 2, 1, 0, 0, 0][i], rf = [0, 0, 0, 0, 2, 1][i];
    const bob = [0, 1, 0, 0, 1, 0][i];
    img.blit(zeroBody({ lf, rf, lfx: [0, 1, 1, 0, 0, 0][i], rfx: [0, 0, 0, 0, -1, -1][i], sy: bob ? -1 : 0, sx: bob, swirlF: i % 2 }));
  }, { fps: 12 });
  s.anim('shoot', 3, (img, i) => img.blit([
    zeroBody({ sx: 1, sy: -2, ox: -1, eyes: 'big' }),
    zeroBody({ sx: 2, sy: -3, ox: -1, eyes: 'big', eyeDx: 1 }),
    zeroBody({ sx: 0, sy: 0, eyes: 'open' }),
  ][i]), { fps: 16, loop: false });
  s.anim('dash', 4, (img, i) => img.blit(dashFrame(i)), { fps: 18, loop: false });
  s.anim('hit', 3, (img, i) => img.blit([
    zeroBody({ sx: 2, sy: -3, ox: -1, eyes: 'slit', crack: 1 }),
    zeroBody({ sx: 1, sy: -2, ox: 1, eyes: 'slit', crack: 2 }),
    zeroBody({ sx: 0, sy: -1, ox: 0, eyes: 'half', crack: 1 }),
  ][i]), { fps: 12, loop: false });
  s.anim('use', 5, (img, i) => {
    img.blit(zeroBody({ sy: [0, 0, -1, 0, 0][i], eyes: i === 0 ? 'open' : 'big' }));
    if (i >= 1) {
      const sy = 4 - (i - 1);
      swirl(img, 10, Math.max(1, sy - 2), i, i === 4 ? PAL.cy2 : PAL.cy3);
      if (i > 1) sparkle(img, 7 + i, 4 + (i % 2));
    }
  }, { fps: 10, loop: false });
  s.anim('death', 9, (img, i) => {
    const base = zeroBody({ eyes: i < 3 ? 'dim' : 'open', sy: i === 0 ? 1 : 0 });
    const p = [0, 0.12, 0.25, 0.38, 0.52, 0.66, 0.8, 0.92, 1][i];
    img.blit(dissolve(base, p, { seed: 3, rise: 6, mote: 0.55 }));
    if (i === 8) { img.set(12, 7, PAL.cy3); img.set(14, 5, PAL.cy4); img.set(10, 4, PAL.cy2); }
  }, { fps: 9, loop: false });
  s.anim('appear', 6, (img, i) => {
    const base = zeroBody({ eyes: 'open', sy: i === 4 ? -1 : 0 });
    const p = [0.97, 0.8, 0.6, 0.4, 0.2, 0][i];
    if (i === 0) { img.set(12, 13, PAL.cy4); img.set(9, 9, PAL.cy3); img.set(15, 16, PAL.cy3); img.set(11, 18, PAL.cy2); }
    else img.blit(dissolve(base, p, { seed: 3, rise: 5, mote: 0.8 }));
  }, { fps: 12, loop: false });
  return s;
}
