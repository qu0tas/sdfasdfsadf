// `props` sheet (32x32 cells): pedestal, well, mirror, clock, memory door, shadows, drawing.
import { Img, PAL, Sheet } from './lib.mjs';
import { ball, hash, sprite, chalkLine, chalkCircle } from './world-util.mjs';
import { halo, poly } from './world-shapes.mjs';

const A = (c, a) => PAL[c] + a;
const s = new Sheet('props', 32, 32);

// ---- pedestal
s.anim(
  'pedestal',
  4,
  (img, i) => {
    const p = [0, 1, 2, 1][i];
    halo(img, 16, 19, 15, 8, A('cy3', ['0c', '14', '1c', '14'][i]));
    sprite(img, (t) => {
      t.rect(5, 19, 22, 6, PAL.gb2);
      t.ellipse(16, 24.5, 11, 4.5, PAL.gb2);
      for (let x = 7; x < 26; x += 5) t.line(x, 21, x, 27, PAL.gb1);
      ball(t, 16, 19, 11, 6, [PAL.gb2, PAL.gb3, PAL.gb4], { lightCut: -0.6 });
      t.ellipse(16, 19, 8.6, 4.5, PAL.gb2);
      t.ellipse(16, 19.3, 7.4, 3.7, PAL.gb1);
    });
    img.ellipse(16, 19.4, 5 + p * 0.5, 2.4 + p * 0.25, PAL.cy1);
    img.ellipse(16, 19.4, 3 + p * 0.4, 1.4 + p * 0.2, PAL.cy2);
    if (p === 2) img.ellipse(16, 19.4, 1.4, 0.8, PAL.cy3);
    const sp = [[10, 18], [22, 20], [16, 16], [12, 21]][i];
    img.set(sp[0], sp[1], PAL.cy3);
    img.set(24 - sp[0] + 8, 22 - (i % 2), PAL.cy2);
  },
  { fps: 5 },
);

// ---- well
s.anim(
  'well',
  4,
  (img, i) => {
    halo(img, 16, 16, 15, 11, A('cy3', ['0c', '14', '1c', '14'][i]));
    sprite(img, (t) => {
      t.ellipse(16, 20, 11.5, 8.5, PAL.gb2);
      t.rect(4.5, 16, 23, 5, PAL.gb2);
      ball(t, 16, 16, 11.5, 8.5, [PAL.gb2, PAL.gb3, PAL.gb4], { lightCut: -0.6 });
    });
    // brick lines on the front face
    for (const x of [8, 13, 18, 23]) img.line(x, 20, x, 24, PAL.gb1);
    for (let x = 6; x < 27; x++) if (img.alpha(x, 22) && (x + 2) % 5) img.set(x, 22, PAL.gb1);
    img.ellipse(16, 16, 8, 6, PAL.gb2);
    img.ellipse(16, 16.4, 7.2, 5.2, PAL.gb1);
    img.ellipse(16, 16.8, 6.4, 4.5, PAL.cy1);
    // ripples
    for (let k = 0; k < 2; k++) {
      const r = ((i + k * 2) % 4) * 1.5 + 1;
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2;
        const x = 16 + Math.cos(ang) * r * 1.35;
        const y = 16.8 + Math.sin(ang) * r * 0.9;
        if (r < 5.6) img.set(x, y, k ? PAL.cy2 : PAL.cy3);
      }
    }
    img.set(14 + (i % 2), 15, PAL.cy4);
    img.set(18 - (i % 3), 17, PAL.cy3);
    // rim highlight + mossy corner
    img.set(9, 13, PAL.gb5);
    img.set(10, 12, PAL.gb5);
    img.set(24, 19, PAL.moss2);
    img.set(25, 20, PAL.moss1);
  },
  { fps: 5 },
);

// ---- mirror
s.anim(
  'mirror',
  4,
  (img, i) => {
    const fig = [-2, 0, 2, 0][i];
    sprite(img, (t) => {
      t.rect(8, 3, 16, 25, PAL.pu2);
      t.rect(10, 2, 12, 1, PAL.pu2);
      t.rect(8, 3, 16, 1, PAL.pu3);
      t.rect(8, 3, 1, 25, PAL.pu3);
      t.rect(23, 4, 1, 24, PAL.pu1);
      t.rect(9, 27, 14, 1, PAL.pu1);
      t.rect(10, 5, 12, 21, PAL.gb4);
      t.rect(10, 28, 3, 3, PAL.pu1);
      t.rect(19, 28, 3, 3, PAL.pu1);
    });
    // reflected room: a vague figure that is slightly wrong
    img.ellipse(16 + fig, 13, 2.5, 2.6, PAL.gb2);
    img.rect(13 + fig, 16, 6, 9, PAL.gb2);
    img.set(15 + fig, 13, PAL.cy3);
    img.set(17 + fig, i === 2 ? 12 : 13, PAL.cy3);
    if (i === 2) img.set(16 + fig, 11, PAL.cy3);
    img.rect(11, 22, 10, 3, PAL.gb3);
    // moving sheen
    const sh = [0, 3, 6, 3][i];
    img.line(11 + sh, 6, 11 + sh + 4, 12, PAL.gb5);
    img.line(12 + sh, 6, 12 + sh + 4, 12, PAL.gb5);
    img.set(10, 5, PAL.white);
    img.set(11, 5, PAL.white);
  },
  { fps: 5 },
);

// ---- clock (always exactly 3:07)
s.anim(
  'clock',
  4,
  (img, i) => {
    sprite(img, (t) => {
      ball(t, 16, 14, 12, 12, [PAL.sand1, PAL.sand2, PAL.sand3], { lightCut: -0.65 });
      t.ellipse(16, 14, 9.6, 9.6, PAL.sand3);
      t.ellipse(16, 14, 9, 9, PAL.white);
    });
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      const r = h % 3 === 0 ? 7 : 8;
      img.set(16 + Math.sin(a) * r, 14 - Math.cos(a) * r, PAL.ink);
      if (h % 3 === 0) img.set(16 + Math.sin(a) * (r - 1), 14 - Math.cos(a) * (r - 1), PAL.ink);
    }
    const hand = (deg, len, col) => {
      const a = (deg * Math.PI) / 180;
      img.line(16, 14, 16 + Math.sin(a) * len, 14 - Math.cos(a) * len, col);
    };
    hand(3 * 30 + 3.5, 4.5, PAL.ink);
    hand(93.5 + 0.0, 4.5, PAL.ink);
    img.set(16, 15, PAL.ink);
    hand(7 * 6, 7, PAL.outline);
    hand(7 * 6, 6, PAL.ink);
    // ticking second hand and swinging pendulum: the only parts that change
    hand([172, 178, 172, 166][i], 8, PAL.rose2);
    const sw = [-3, 0, 3, 0][i];
    img.line(16, 26, 16 + sw, 29, PAL.gb3);
    img.ellipse(16 + sw, 30, 1.6, 1.4, PAL.sand2);
    img.set(16 + sw, 29, PAL.sand3);
    img.set(15 + sw, 31, PAL.outline);
    img.set(16 + sw, 31, PAL.outline);
    img.set(17 + sw, 31, PAL.outline);
    img.set(14 + sw, 30, PAL.outline);
    img.set(18 + sw, 30, PAL.outline);
    img.set(16, 14, PAL.rose2);
  },
  { fps: 2 },
);

// ---- memory door
function slab(img, i, dissolve = 0) {
  const p = [0, 1, 2, 1][i % 4];
  const inSlab = (x, y) => x >= 6 && x <= 25 && y >= 4 && y <= 28 && !((x <= 7 || x >= 24) && y <= 5);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (!inSlab(x, y)) continue;
      if (dissolve && hash(x >> 1, y >> 1, 3) < dissolve) continue;
      const edge = !(inSlab(x - 1, y) && inSlab(x + 1, y) && inSlab(x, y - 1) && inSlab(x, y + 1));
      let c = PAL.gb2;
      if (edge) c = PAL.outline;
      else if (x <= 7 || y <= 5) c = PAL.gb3;
      else if (x >= 24 || y >= 27) c = PAL.gb1;
      img.set(x, y, c);
    }
  }
  // erased patches: scrubbed-out areas where the picture used to be
  for (const [cx, cy, rx, ry] of [[12, 9, 4, 2.2], [20, 23, 4, 2], [10, 25, 3, 1.6], [21, 8, 3, 1.6]]) {
    for (let y = cy - 3; y <= cy + 3; y++) {
      for (let x = cx - 5; x <= cx + 5; x++) {
        if (img.alpha(x, y) && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && !(dissolve && hash(x >> 1, y >> 1, 3) < dissolve)) {
          if (img.get(x, y)[0] !== 0x1b) img.set(x, y, PAL.gb1 === PAL.gb2 ? PAL.gb3 : PAL.gb3);
        }
      }
    }
  }
  img.set(9, 12, PAL.gb4);
  img.set(10, 12, PAL.gb4);
  return p;
}

function sockets(img, p, lit = false, dissolve = 0) {
  for (const cx of [11, 16, 21]) {
    if (dissolve && hash(cx, 16, 3) < dissolve) continue;
    img.ellipse(cx, 16, 3, 3, PAL.gb4);
    img.ellipse(cx, 16, 2.2, 2.2, lit ? PAL.cy3 : PAL.ink);
    if (!lit && p === 2) img.set(cx, 16, PAL.cy1);
    if (!lit) img.set(cx - 1, 15, PAL.dark);
  }
}

s.anim(
  'memory_door',
  4,
  (img, i) => {
    const p = [0, 1, 2, 1][i];
    halo(img, 16, 16, 15 + p * 0.4, 15 + p * 0.4, A('cy3', ['08', '10', '18', '10'][i]));
    slab(img, i);
    sockets(img, p);
    // faint breathing line along the lintel
    img.rect(9, 6 + (p === 2 ? 0 : 1), 14, 1, p ? PAL.pu3 : PAL.gb3);
    img.set(8 + p * 8, 27, PAL.cy1);
  },
  { fps: 4 },
);

s.anim(
  'memory_open',
  6,
  (img, i) => {
    const d = [0, 0.18, 0.4, 0.62, 0.85, 1.05][i];
    // passage behind the slab
    for (let y = 4; y <= 28; y++) {
      for (let x = 7; x <= 24; x++) {
        const w = Math.abs(x - 15.5);
        if (y < 7 && w > 6) continue;
        const k = i === 0 ? 0 : 1;
        const c = w < 2.5 ? PAL.cy4 : w < 5 ? PAL.cy3 : w < 7.5 ? PAL.cy2 : PAL.cy1;
        if (k && (x + y * 2 + i * 3) % 9 === 0 && w < 6) img.set(x, y, PAL.white);
        else if (k) img.set(x, y, c);
      }
    }
    if (i < 5) {
      const t = new Img(32, 32);
      slab(t, 0, d);
      sockets(t, 0, true, d);
      img.blit(t);
    }
    if (i === 5) for (const [x, y] of [[6, 5], [25, 6], [6, 27], [25, 28], [8, 4], [23, 4]]) img.set(x, y, PAL.gb1);
    halo(img, 16, 16, 15, 15, A('cy3', i > 1 ? '18' : '0c'));
  },
  { fps: 8, loop: false },
);

// ---- shadows
s.still('shadow_s', (img) => {
  img.ellipse(16, 16, 7, 2.6, A('ink', '66'));
  img.ellipse(16, 16, 5, 1.6, A('ink', '44'));
});
s.still('shadow_l', (img) => {
  img.ellipse(16, 16, 14, 4.6, A('ink', '5a'));
  img.ellipse(16, 16, 10, 3, A('ink', '44'));
});

// ---- crayon drawing
s.still('drawing', (img) => {
  img.rect(4, 7, 24, 18, PAL.gb3);
  for (const [x, y] of [[4, 7], [27, 7], [4, 24], [27, 24]]) img.clear(x, y);
  img.rect(5, 8, 22, 1, PAL.gb4);
  img.rect(4, 24, 24, 1, PAL.gb2);
  img.rect(27, 8, 1, 16, PAL.gb2);
  chalkLine(img, 6, 21, 25, 21, PAL.pu3, 11, 0.2);
  // tree
  img.rect(20, 14, 2, 7, PAL.sand1);
  chalkCircle(img, 21, 11, 4, PAL.moss2, 5);
  chalkCircle(img, 21, 11, 2.4, PAL.moss2, 6);
  img.set(18, 10, PAL.moss1);
  img.set(24, 12, PAL.moss1);
  // the round figure beneath it
  chalkCircle(img, 12, 16, 2.2, PAL.rose2, 8);
  img.line(12, 18, 12, 20, PAL.rose2);
  img.line(10, 19, 14, 19, PAL.rose2);
  img.set(11, 15, PAL.pu2);
  img.set(13, 15, PAL.pu2);
});

export const sheets = [s];
