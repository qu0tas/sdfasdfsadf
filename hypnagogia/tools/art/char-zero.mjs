// Крошка Ноль (Tiny Zero), drawn after the creator's concept art: a wide round grey body with a
// dark rim that thickens underneath, a pale swirl on the upper left, two glowing mint eyes set
// off-centre (he looks slightly to the right) and two stubby dark legs.
import { Img, Sheet, PAL } from './lib.mjs';
import { dissolve, sparkle, swirl } from './char-lib.mjs';

/** Colours sampled from the concept art. They belong to this character only. */
const C = {
  outline: '#10141f',
  body: '#747e88',
  rimTop: '#56606d',
  rim: '#3c3f48',
  swirl: '#8f9ba4',
  foot: '#4c5366',
  footDark: '#383c47',
  eyeCore: '#fcf9f4',
  eye: '#d9f8f0',
  eyeEdge: '#b2dad2',
};

/** The body: a flat grey ellipse inside a darker rim, thin on top and heavy below and to the right. */
function blob(L, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      const inner = ((x - (cx - 0.5)) / (rx - 1.1)) ** 2 + ((y - (cy - 0.9)) / (ry - 1.5)) ** 2 <= 1;
      const low = y > cy || x > cx + rx * 0.55;
      L.set(x, y, inner ? C.body : low ? C.rim : C.rimTop);
    }
  }
}

/** One eye, `w` pixels wide and three tall, with its top-left corner at (x, y). */
function eye(L, x, y, w, state) {
  const mid = w === 4 ? [1, 2] : [1];
  const corner = (i, j) => (i === 0 || i === w - 1) && j !== 1;
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < w; i++) {
      const core = j === 1 && mid.includes(i);
      let c = null;
      if (state === 'open') c = core ? C.eyeCore : corner(i, j) ? C.eyeEdge : C.eye;
      else if (state === 'big') c = corner(i, j) ? C.eye : C.eyeCore;
      else if (state === 'dim') c = corner(i, j) ? null : core ? C.eye : C.eyeEdge;
      else if (state === 'half') c = j === 0 ? C.rimTop : core ? C.eyeCore : C.eye;
      else if (state === 'closed') c = j === 1 ? C.rim : null;
      else if (state === 'slit') c = j === 1 ? C.eye : null;
      if (c) L.set(x + i, y + j, c);
    }
  }
  if (state === 'big') {
    // A soft halo while the eyes flare.
    for (let i = 0; i < w; i++) {
      L.set(x + i, y - 1, C.eye + '90');
      L.set(x + i, y + 3, C.eye + '90');
    }
    for (let j = 0; j < 3; j++) {
      L.set(x - 1, y + j, C.eye + '90');
      L.set(x + w, y + j, C.eye + '90');
    }
  }
}

const SWIRL = ['.XXX.', 'X...X', 'X.XX.', '.XX..'];
const FOOT = ['LLD', 'LDD', 'DDD'];

/**
 * Draws Tiny Zero into a fresh 24x24 layer.
 * sx / sy stretch the body, dy drops it, lf / rf lift a foot, lfx / rfx slide it.
 */
export function zeroBody(p = {}) {
  const { sx = 0, sy = 0, dy = 0, lf = 0, rf = 0, lfx = 0, rfx = 0, eyes = 'open', crack = 0 } = p;
  const L = new Img(24, 24);
  const cx = 11.5;
  const H = 14 + sy;
  const bottom = 18 + dy;
  const cy = bottom - (H - 1) / 2;
  const rx = 9.2 + sx * 0.5;
  for (const [fx, lift] of [[7 + lfx, lf], [14 + rfx, rf]]) {
    L.pixels(fx, 19 - lift, FOOT, { L: C.foot, D: C.footDark });
  }
  blob(L, cx, cy, rx, H / 2);
  L.outline(C.outline);
  L.pixels(Math.round(cx - rx * 0.6), Math.round(cy - (H / 2) * 0.75) + 1, SWIRL, { X: C.swirl });
  const ey = Math.floor(cy);
  eye(L, 7, ey, 4, eyes);
  eye(L, 16, ey - 1, 3, eyes);
  if (crack) {
    const top = Math.round(cy - H / 2);
    L.line(13, top + 1, 15, top + 4, C.outline);
    if (crack > 1) L.line(4, ey + 3, 6, ey + 5, C.outline);
  }
  return L;
}

/** The dash: flattened into a streak, legs tucked, eyes narrowed to bright slits. */
function dashFrame(i) {
  const L = new Img(24, 24);
  const rx = [9, 9.4, 9.4, 9][i];
  const ry = [6, 5, 5, 6][i];
  const cx = 12.5;
  const cy = 14;
  L.rect(8, Math.round(cy + ry), 3, 1, C.footDark);
  L.rect(14, Math.round(cy + ry), 3, 1, C.footDark);
  blob(L, cx, cy, rx, ry);
  L.outline(C.outline);
  for (let k = 0; k < 4; k++) {
    const y = Math.round(cy - ry + 2 + k * 2.2);
    const len = [3, 5, 4, 2][(k + i) % 4];
    L.line(Math.max(1, 2 - len + 2), y, 2, y, C.body + '90');
  }
  L.rect(9, 13, 4, 1, C.eye);
  L.rect(17, 12, 3, 1, C.eye);
  return L;
}

export function zeroSheet() {
  const s = new Sheet('zero', 24, 24);
  s.anim('idle', 4, (img, i) => img.blit(zeroBody({ sy: [0, 0, 1, 0][i], sx: [0, 0, -1, 0][i] })), { fps: 5 });
  s.anim('blink', 3, (img, i) => img.blit(zeroBody({ eyes: ['half', 'closed', 'half'][i] })), { fps: 10, loop: false });
  s.anim('walk', 6, (img, i) => {
    const bob = [0, 1, 0, 0, 1, 0][i];
    img.blit(zeroBody({
      lf: [0, 2, 1, 0, 0, 0][i], rf: [0, 0, 0, 0, 2, 1][i],
      lfx: [0, 1, 1, 0, -1, -1][i], rfx: [0, -1, -1, 0, 1, 1][i],
      sy: bob ? -1 : 0, sx: bob,
    }));
  }, { fps: 12 });
  s.anim('shoot', 3, (img, i) => img.blit([
    zeroBody({ sx: 1, sy: -2, eyes: 'big' }),
    zeroBody({ sx: 1, sy: -3, eyes: 'big' }),
    zeroBody({ sy: 1, sx: -1 }),
  ][i]), { fps: 16, loop: false });
  s.anim('dash', 4, (img, i) => img.blit(dashFrame(i)), { fps: 18, loop: false });
  s.anim('hit', 3, (img, i) => img.blit([
    zeroBody({ sx: 1, sy: -3, eyes: 'slit', crack: 1 }),
    zeroBody({ sx: 1, sy: -2, eyes: 'slit', crack: 2 }),
    zeroBody({ sy: 1, sx: -1, eyes: 'half', crack: 1 }),
  ][i]), { fps: 12, loop: false });
  s.anim('use', 5, (img, i) => {
    img.blit(zeroBody({ sy: [0, 0, -1, 0, 0][i], eyes: i === 0 ? 'open' : 'big' }));
    if (i >= 1) {
      swirl(img, 10, Math.max(0, 2 - i) + 0, i, i === 4 ? PAL.cy2 : PAL.cy3);
      if (i > 1) sparkle(img, 5 + i * 3, 3 + (i % 2));
    }
  }, { fps: 10, loop: false });
  s.anim('death', 9, (img, i) => {
    const base = zeroBody({ eyes: i < 3 ? 'dim' : 'open', sy: i === 0 ? 1 : 0 });
    const p = [0, 0.12, 0.25, 0.38, 0.52, 0.66, 0.8, 0.92, 1][i];
    img.blit(dissolve(base, p, { seed: 3, rise: 6, mote: 0.55 }));
    if (i === 8) {
      img.set(12, 7, PAL.cy3);
      img.set(14, 5, PAL.cy4);
      img.set(10, 4, PAL.cy2);
    }
  }, { fps: 9, loop: false });
  s.anim('appear', 6, (img, i) => {
    const base = zeroBody({ sy: i === 4 ? -1 : 0 });
    const p = [0.97, 0.8, 0.6, 0.4, 0.2, 0][i];
    if (i === 0) {
      img.set(12, 13, PAL.cy4);
      img.set(9, 9, PAL.cy3);
      img.set(15, 16, PAL.cy3);
      img.set(11, 18, PAL.cy2);
    } else {
      img.blit(dissolve(base, p, { seed: 3, rise: 5, mote: 0.8 }));
    }
  }, { fps: 12, loop: false });
  return s;
}
