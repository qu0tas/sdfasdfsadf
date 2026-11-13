// Крошка Ноль (Tiny Zero). The sprite is not redrawn by hand: it is cut straight out of the
// creator's concept art (reference/zero-concept.png) and every animation frame is built from
// that picture by moving its parts — body, two feet, two eyes — so he always looks like the concept.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, Sheet, PAL } from './lib.mjs';
import { dissolve, sparkle } from './char-lib.mjs';
import { cutOut, readPNG } from './png-read.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CELL = 48;
const WIDTH = 40; // width of the character in pixels

function loadParts() {
  const art = cutOut(readPNG(join(HERE, 'reference', 'zero-concept.png')), { width: WIDTH });
  const ox = Math.floor((CELL - art.w) / 2);
  const oy = CELL - 3 - art.h; // feet rest 3 px above the bottom of the cell
  const count = new Map();
  const runs = (y) => {
    let n = 0;
    for (let x = 0; x < art.w; x++) if (art.alpha(x, y) && !art.alpha(x - 1, y)) n++;
    return n;
  };
  // The feet are the bottom rows where the silhouette splits in two.
  let feetTop = art.h;
  while (feetTop > 0 && runs(feetTop - 1) === 2) feetTop--;

  const body = new Img(CELL, CELL);
  const feet = [new Img(CELL, CELL), new Img(CELL, CELL)];
  const eyes = [[], []];
  let darkest = [255, 255, 255, 255];
  for (let y = 0; y < art.h; y++) {
    for (let x = 0; x < art.w; x++) {
      const c = art.get(x, y);
      if (!c[3]) continue;
      if (c[0] + c[1] + c[2] < darkest[0] + darkest[1] + darkest[2]) darkest = c;
      if (y >= feetTop) {
        feet[x < art.w / 2 ? 0 : 1].set(x + ox, y + oy, c);
        continue;
      }
      body.set(x + ox, y + oy, c);
      if (Math.min(c[0], c[1], c[2]) > 165) eyes[x < art.w * 0.6 ? 0 : 1].push([x + ox, y + oy]);
      else count.set(c.join(), (count.get(c.join()) ?? 0) + 1);
    }
  }
  // The soft rim around each eye belongs to the eye too.
  for (const eye of eyes) {
    for (let pass = 0; pass < 2; pass++) {
      const has = new Set(eye.map(([x, y]) => x + ',' + y));
      for (const [x, y] of [...eye]) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = body.get(x + dx, y + dy);
          const key = x + dx + ',' + (y + dy);
          if (c[3] && !has.has(key) && Math.min(c[0], c[1], c[2]) > 132) {
            has.add(key);
            eye.push([x + dx, y + dy]);
          }
        }
      }
    }
  }
  const skin = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  return { body, feet, eyes, skin, outline: darkest, bodyBottom: feetTop + oy, mid: Math.round(ox + art.w / 2) };
}

const P = loadParts();
const GLOW = '#d9f8f0';
const CORE = '#fcf9f4';
const DIM = '#9fc4c0';
const LID = '#4f5966';

/** Repaints the eyes of a body layer. */
function setEyes(img, state) {
  if (state === 'open') return;
  for (const eye of P.eyes) {
    const ys = eye.map(([, y]) => y);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const middle = Math.round((top + bottom) / 2);
    for (const [x, y] of eye) {
      if (state === 'half') {
        if (y < middle) img.set(x, y, y === middle - 1 ? LID : P.skin);
      } else if (state === 'closed') {
        img.set(x, y, y === middle ? LID : P.skin);
      } else if (state === 'slit') {
        img.set(x, y, y === middle ? CORE : P.skin);
      } else if (state === 'dim') {
        img.set(x, y, DIM);
      } else if (state === 'big') {
        img.set(x, y, CORE);
      }
    }
    if (state === 'big') {
      // The glow spreads one pixel beyond the eye.
      const has = new Set(eye.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of eye) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!has.has(`${x + dx},${y + dy}`)) img.set(x + dx, y + dy, GLOW);
        }
      }
    }
  }
}

/** Removes (n > 0) or doubles (n < 0) rows low on the body, so it squashes and stretches like pixel art should. */
function squash(img, n) {
  if (!n) return img;
  const out = new Img(CELL, CELL);
  const at = P.bodyBottom - 8;
  for (let y = 0; y < CELL; y++) {
    const from = y >= at ? y : n > 0 ? y - n : Math.min(y - n, at - 1);
    for (let x = 0; x < CELL; x++) {
      const c = img.get(x, from);
      if (c[3]) out.set(x, y, c);
    }
  }
  return out;
}

/** Doubles (n > 0) or removes (n < 0) columns in the middle of the body. */
function widen(img, n) {
  if (!n) return img;
  const out = new Img(CELL, CELL);
  const at = P.mid + 2;
  for (let x = 0; x < CELL; x++) {
    const from = x >= at ? x : n > 0 ? Math.min(x + n, at - 1) : x + n;
    for (let y = 0; y < CELL; y++) {
      const c = img.get(from, y);
      if (c[3]) out.set(x, y, c);
    }
  }
  return out;
}

/**
 * One frame of Tiny Zero.
 * sq squashes the body, wd widens it, lf / rf lift a foot, lfx / rfx slide it, eyes repaints the eyes.
 */
export function zeroFrame({ sq = 0, wd = 0, lf = 0, rf = 0, lfx = 0, rfx = 0, eyes = 'open', crack = 0 } = {}) {
  const out = new Img(CELL, CELL);
  out.blit(P.feet[0], lfx, -lf);
  out.blit(P.feet[1], rfx, -rf);
  const body = P.body.clone();
  setEyes(body, eyes);
  out.blit(widen(squash(body, sq), wd));
  if (crack) {
    const top = CELL - 3 - 42 + sq + 3;
    out.line(27, top, 30, top + 5, P.outline);
    out.line(30, top + 5, 28, top + 8, P.outline);
    if (crack > 1) {
      out.line(9, 30, 13, 33, P.outline);
      out.line(13, 33, 12, 36, P.outline);
    }
  }
  return out;
}

/** The dash: the whole body flattened into a streak, legs tucked away, eyes narrowed. */
function dashFrame(i) {
  const flat = [0.8, 0.68, 0.68, 0.8][i];
  const long = [1.04, 1.1, 1.1, 1.04][i];
  const body = P.body.clone();
  setEyes(body, 'slit');
  const out = new Img(CELL, CELL);
  const baseY = P.bodyBottom + 3;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const sx = Math.round(P.mid + (x - P.mid - 1) / long);
      const sy = Math.round(P.bodyBottom - 1 + (y - baseY) / flat);
      const c = body.get(sx, sy);
      if (c[3]) out.set(x, y, c);
    }
  }
  for (let k = 0; k < 5; k++) {
    const y = baseY - 26 * flat + k * 5;
    const len = [4, 7, 5, 3, 6][(k + i) % 5];
    out.line(1, y, 1 + len, y, GLOW + '70');
  }
  return out;
}

const SPIRAL = ['..XXXX..', '.X....X.', 'X..XX..X', 'X.X..X.X', 'X.X.XX.X', 'X.X....X', 'X..XXXX.', '.X......'];

export function zeroSheet() {
  const s = new Sheet('zero', CELL, CELL, { scale: 1 });
  s.anim('idle', 4, (img, i) => img.blit(zeroFrame({ sq: [0, 0, -1, 0][i], wd: [0, 0, -1, 0][i] })), { fps: 5 });
  s.anim('blink', 3, (img, i) => img.blit(zeroFrame({ eyes: ['half', 'closed', 'half'][i] })), { fps: 10, loop: false });
  s.anim('walk', 6, (img, i) => img.blit(zeroFrame({
    lf: [0, 3, 2, 0, 0, 0][i], rf: [0, 0, 0, 0, 3, 2][i],
    lfx: [0, 2, 1, 0, -2, -1][i], rfx: [0, -2, -1, 0, 2, 1][i],
    sq: [0, 1, 0, 0, 1, 0][i], wd: [0, 1, 0, 0, 1, 0][i],
  })), { fps: 12 });
  s.anim('shoot', 3, (img, i) => img.blit([
    zeroFrame({ sq: 2, wd: 1, eyes: 'big' }),
    zeroFrame({ sq: 3, wd: 2, eyes: 'big' }),
    zeroFrame({ sq: -1, wd: -1 }),
  ][i]), { fps: 16, loop: false });
  s.anim('dash', 4, (img, i) => img.blit(dashFrame(i)), { fps: 18, loop: false });
  s.anim('hit', 3, (img, i) => img.blit([
    zeroFrame({ sq: 4, wd: 2, eyes: 'slit', crack: 1 }),
    zeroFrame({ sq: 3, wd: 2, eyes: 'slit', crack: 2 }),
    zeroFrame({ sq: -1, wd: -1, eyes: 'half', crack: 1 }),
  ][i]), { fps: 12, loop: false });
  s.anim('use', 5, (img, i) => {
    img.blit(zeroFrame({ sq: [0, 1, 2, 1, 0][i], eyes: i === 0 ? 'open' : 'big' }));
    if (i >= 1) {
      img.pixels(20, 5 - i, SPIRAL, { X: i === 4 ? PAL.cy2 : PAL.cy3 });
      if (i > 1) {
        sparkle(img, 12 + i * 2, 4 + (i % 2));
        sparkle(img, 38 - i * 2, 3 + ((i + 1) % 2));
      }
    }
  }, { fps: 10, loop: false });
  s.anim('death', 9, (img, i) => {
    const base = zeroFrame({ eyes: i < 3 ? 'dim' : 'open', sq: i === 0 ? 1 : 0 });
    const p = [0, 0.12, 0.25, 0.38, 0.52, 0.66, 0.8, 0.92, 1][i];
    img.blit(dissolve(base, p, { seed: 3, rise: 12, mote: 0.4 }));
    if (i === 8) {
      img.set(24, 14, PAL.cy3);
      img.set(28, 10, PAL.cy4);
      img.set(20, 8, PAL.cy2);
    }
  }, { fps: 9, loop: false });
  s.anim('appear', 6, (img, i) => {
    const p = [0.97, 0.8, 0.6, 0.4, 0.2, 0][i];
    img.blit(dissolve(zeroFrame({ sq: i === 4 ? 1 : 0 }), p, { seed: 3, rise: 10, mote: 0.6 }));
  }, { fps: 12, loop: false });
  return s;
}
