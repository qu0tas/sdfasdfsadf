// `rift` sheet: dream tears used as doors (drawn for the NORTH wall, band rows 8..23).
import { Img, PAL, Sheet } from './lib.mjs';
import { hash, rng, sin01 } from './world-util.mjs';

const TAU = Math.PI * 2;

/** Jagged radius multiplier for angle `a`: linear blend between random sector spikes. */
function edge(a, seed, jag, sectors = 12) {
  const u = (((a % TAU) + TAU) % TAU) / TAU * sectors;
  const k = Math.floor(u);
  const f = u - k;
  const v0 = hash(k % sectors, seed);
  const v1 = hash((k + 1) % sectors, seed);
  return 1 + jag * ((v0 + (v1 - v0) * f) * 2 - 1);
}

/**
 * Draws a jagged lens-shaped tear into a scratch image, then outlines it onto `img`.
 * fill(x, y, r, a, rim) -> colour.  `shift(y)` offsets rows for glitch effects.
 */
function tear(img, o) {
  const { cx = 16, cy = 16, rx = 10, ry = 7, seed = 1, jag = 0.3, rimW = 0.24, fill, shift = () => 0 } = o;
  const t = new Img(img.w, img.h);
  for (let y = Math.floor(cy - ry * 1.3); y <= Math.ceil(cy + ry * 1.3); y++) {
    for (let x = Math.floor(cx - rx * 1.3); x <= Math.ceil(cx + rx * 1.3); x++) {
      const dx = (x - cx - shift(y)) / rx;
      const dy = (y - cy) / ry;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const e = edge(a, seed, jag);
      if (r > e) continue;
      const rim = r > e - rimW;
      const c = fill(x, y, r / e, a, rim, dx, dy);
      if (c) t.set(x, y, c);
    }
  }
  t.outline(PAL.outline);
  img.blit(t);
  return t;
}

const glow = (img, cx, cy, rx, ry, color) => img.ellipse(cx, cy, rx, ry, color);

function swirlColor(r, a, phase, pal) {
  const s = Math.sin(a * 3 + r * 5 - phase);
  if (r < 0.18) return pal[0];
  if (s > 0.72) return pal[1];
  if (s > 0.3) return pal[2];
  if (s > -0.35) return pal[3];
  return pal[4];
}

const OPEN_PAL = ['cy4', 'cy3', 'pu3', 'pu1', 'ink'];

function drawOpen(img, i, n = 6) {
  const ph = (i / n) * (TAU / 3) * 3;
  const pulse = i % 2;
  glow(img, 16, 26, 11 + pulse, 3, PAL.cy3 + '22');
  glow(img, 16, 25, 7, 2, PAL.cy3 + '30');
  tear(img, {
    seed: 4,
    fill: (x, y, r, a, rim) => (rim ? (hash(Math.floor(a * 6), i) > 0.5 ? 'cy3' : 'cy2') : swirlColor(r, a, ph, OPEN_PAL)),
  });
  // drifting motes spilling out
  const m = (i * 3) % 6;
  img.set(10 + m, 25, PAL.cy3);
  img.set(21 - m, 27, PAL.cy2);
}

function threads(img, pulse) {
  for (let k = 0; k < 6; k++) {
    const x = 7 + k * 3;
    img.line(x, 11, x + 3, 20, PAL.gb1);
    img.line(x + 3, 11, x, 20, PAL.dark);
    img.set(x + 1, 15, PAL.gb3);
    img.set(x + 2, 16, PAL.gb3);
  }
  img.rect(6, 15, 20, 1, PAL.outline);
  if (pulse) for (let k = 0; k < 5; k++) img.set(8 + k * 4, 15, PAL.pu3);
}

function drawSealed(img, i) {
  const p = [0, 1, 2, 1][i];
  glow(img, 16, 26, 9, 2, PAL.pu2 + (p ? '33' : '1c'));
  tear(img, {
    seed: 4,
    fill: (x, y, r, a, rim) => (rim ? (p === 2 ? 'pu3' : 'pu2') : r < 0.35 + p * 0.12 ? 'pu1' : r < 0.6 ? 'dark' : 'ink'),
  });
  threads(img, p > 0);
}

const KEYHOLE = [
  '..rrr..',
  '.rkkkr.',
  'rkkkkkr',
  'rkkkkkr',
  '.rkkkr.',
  '..rkr..',
  '..rkkr.',
  '..rkr..',
  '..rkkr.',
  '..rrr..',
];

function keyhole(img, rimCol, flash = false, glint = -1) {
  const key = { r: PAL[rimCol], k: flash ? PAL.cy4 : PAL.ink };
  img.pixels(13, 11, KEYHOLE, key);
  if (glint >= 0) {
    const path = [[16, 11], [18, 13], [17, 15], [16, 19], [15, 17], [13, 14]];
    const [gx, gy] = path[glint % path.length];
    img.set(gx, gy, PAL.cy4);
  }
}

function drawLocked(img, i) {
  const p = [0, 1, 2, 1][i];
  glow(img, 16, 26, 9, 2, PAL.cy1 + '1c');
  tear(img, {
    seed: 4,
    fill: (x, y, r, a, rim) => (rim ? 'gb2' : (x + y) % 5 === 0 && r > 0.45 ? 'gb1' : 'dark'),
  });
  img.line(8, 14, 12, 12, PAL.gb1);
  img.line(20, 12, 24, 15, PAL.gb1);
  img.line(9, 19, 13, 20, PAL.gb1);
  img.line(19, 20, 23, 18, PAL.gb1);
  keyhole(img, p === 1 ? 'cy3' : 'cy2', false, i * 2);
  if (p === 2) img.set(13, 15, PAL.cy3);
}

function drawUnlock(img, i) {
  const gap = [0, 0, 3, 6, 10][i];
  const flash = i <= 1;
  glow(img, 16, 26, 9 + i * 1.5, 2 + i * 0.6, PAL.cy3 + (i >= 3 ? '40' : '28'));
  tear(img, {
    seed: 4,
    fill: (x, y, r, a, rim, dx) => {
      if (Math.abs(x - 16) < gap) return rim ? 'cy3' : swirlColor(r, a, i * 1.3, OPEN_PAL);
      if (rim) return i >= 2 ? 'cy2' : 'gb2';
      return (x + y) % 5 === 0 && r > 0.45 ? 'gb1' : 'dark';
    },
  });
  if (i < 2) {
    img.line(8, 14, 12, 12, PAL.gb1);
    img.line(20, 12, 24, 15, PAL.gb1);
  } else {
    // snapped thread ends curling away
    img.line(9, 12, 7, 10, PAL.gb3);
    img.line(23, 12, 25, 10, PAL.gb3);
    img.set(10, 20, PAL.gb3);
    img.set(22, 21, PAL.gb3);
  }
  if (i <= 2) keyhole(img, i === 0 ? 'cy4' : 'cy3', flash, -1);
  if (i === 1) {
    img.line(16, 10, 16, 20, PAL.cy4);
    img.line(11, 15, 21, 15, PAL.cy3);
  }
  if (i >= 3) for (let k = 0; k < 4; k++) img.set(8 + ((i * 5 + k * 6) % 17), 24 + (k % 3), PAL.cy3);
}

function drawUnstable(img, i) {
  const r = rng(100 + i * 17);
  const sh = [0, 2, -1, 3, -2, 1];
  glow(img, 16, 26, 10, 3, PAL.gb3 + '26');
  const rows = {};
  for (let y = 0; y < 32; y++) rows[y] = r() < 0.22 ? Math.round((r() - 0.5) * 6) : sh[i] * (y % 5 === i % 5 ? 1 : 0);
  const cols = ['ink', 'gb1', 'gb2', 'gb4', 'white', 'cy3', 'pu3', 'dark'];
  tear(img, {
    seed: 7 + (i % 2),
    jag: 0.28,
    shift: (y) => rows[y] ?? 0,
    fill: (x, y, rr, a, rim) => {
      const v = r();
      if (rim) return v > 0.5 ? 'white' : 'cy3';
      if (y % 3 === i % 3) return v > 0.5 ? 'gb4' : 'gb2';
      return cols[Math.floor(v * v * cols.length)];
    },
  });
  // scanline tear bars outside the shape
  const by = 10 + ((i * 4) % 12);
  img.rect(4 + (i % 3), by, 6, 1, PAL.gb4);
  img.rect(22 - (i % 3) * 2, by + 3, 5, 1, PAL.cy3);
}

function drawBoss(img, i) {
  const look = [-2, -1, 0, 1, 2, 0][i];
  const blink = i === 4 ? 2 : i === 3 || i === 5 ? 1 : 0;
  glow(img, 16, 26, 13, 4, PAL.rose2 + '2a');
  glow(img, 16, 25, 8, 2, PAL.rose3 + '30');
  const rx = 13;
  const ry = 9.5;
  tear(img, {
    cy: 15.5,
    rx,
    ry,
    seed: 9,
    jag: 0.3,
    rimW: 0.3,
    fill: (x, y, r, a, rim) => {
      if (rim) return hash(Math.floor(a * 7), 3) > 0.45 ? 'rose2' : 'pu3';
      return swirlColor(r, a, i * 1.05, ['ink', 'rose1', 'pu2', 'pu1', 'ink']);
    },
  });
  // eye-like core
  const ey = 15;
  const open = [4.5, 3.3, 1.2][blink];
  const ex = 16;
  for (let y = ey - 5; y <= ey + 5; y++) {
    for (let x = ex - 8; x <= ex + 8; x++) {
      const dx = (x - ex) / 8;
      const dy = (y - ey) / open;
      if (dx * dx + dy * dy <= 1) img.set(x, y, dy > 0.5 ? PAL.rose3 : PAL.sand3);
    }
  }
  for (let x = ex - 9; x <= ex + 9; x++) {
    const h = Math.round(open * Math.sqrt(Math.max(0, 1 - ((x - ex) / 9) ** 2)));
    img.set(x, ey - h - 1, PAL.outline);
    img.set(x, ey + h + 1, PAL.outline);
  }
  if (blink < 2) {
    img.ellipse(ex + look, ey, 2.5, Math.min(open - 0.3, 3.5), PAL.heart1);
    img.rect(ex + look, ey - Math.min(3, Math.floor(open - 0.6)), 1, Math.min(6, Math.floor(open * 2 - 1)), PAL.ink);
    img.set(ex + look - 1, ey - 2, PAL.rose3);
  }
}

function drawStage(img, i) {
  glow(img, 16, 27, 12, 3, PAL.cy3 + '30');
  glow(img, 16, 26, 7, 2, PAL.cy4 + '40');
  glow(img, 16, 16, 12, 12, PAL.cy3 + '12');
  tear(img, {
    cy: 15,
    rx: 8,
    ry: 12.5,
    seed: 2,
    jag: 0.2,
    rimW: 0.22,
    fill: (x, y, r, a, rim) => {
      if (rim) return 'cy4';
      const s = Math.sin(x * 0.9 + (y + i * 4) * 0.45);
      const u = ((y + i * 4) % 8) < 2;
      if (r < 0.35) return 'cy4';
      if (u && Math.abs(x - 16) < 4) return 'white';
      return s > 0.3 ? 'cy3' : s > -0.6 ? 'cy2' : 'pu4';
    },
  });
  for (let k = 0; k < 3; k++) img.set(12 + ((i * 4 + k * 7) % 9), 28 - ((i * 2 + k * 3) % 6), PAL.cy4);
  img.set(16, 3 + (i % 3), PAL.cy3);
}

function drawSecret(img) {
  const r = rng(5);
  glow(img, 16, 24, 10, 3, PAL.ink + '55');
  tear(img, {
    cx: 16,
    cy: 16,
    rx: 9,
    ry: 7,
    seed: 11,
    jag: 0.35,
    rimW: 0.3,
    fill: (x, y, rr, a, rim) => (rim ? (r() > 0.4 ? 'gb1' : 'pu1') : rr > 0.6 ? 'ink' : 'outline'),
  });
  for (const [x, y, w] of [[6, 24, 2], [10, 26, 1], [21, 25, 2], [24, 23, 1], [15, 27, 2]]) {
    img.rect(x, y, w, 1, PAL.gb1);
    img.set(x, y + 1, PAL.outline);
  }
  img.set(8, 25, PAL.pu1);
  img.set(23, 26, PAL.dark);
}

function drawCrack(img) {
  const pts = [[14, 9], [15, 11], [14, 13], [16, 15], [15, 17], [17, 19], [16, 22]];
  for (let k = 0; k < pts.length - 1; k++) img.line(...pts[k], ...pts[k + 1], PAL.ink);
  img.line(15, 15, 18, 14, PAL.ink);
  img.set(17, 15, PAL.gb1);
  img.set(15, 12, PAL.gb1);
}

export function buildRift() {
  const s = new Sheet('rift', 32, 32);
  s.anim('open', 6, (img, i) => drawOpen(img, i), { fps: 8 });
  s.anim('sealed', 4, (img, i) => drawSealed(img, i), { fps: 6 });
  s.anim('locked', 4, (img, i) => drawLocked(img, i), { fps: 5 });
  s.anim('unlock', 5, (img, i) => drawUnlock(img, i), { fps: 12, loop: false });
  s.anim('unstable', 6, (img, i) => drawUnstable(img, i), { fps: 12 });
  s.anim('boss', 6, (img, i) => drawBoss(img, i), { fps: 8 });
  s.anim('stage', 6, (img, i) => drawStage(img, i), { fps: 8 });
  s.still('secret', (img) => drawSecret(img));
  s.still('crack', (img) => drawCrack(img));
  return s;
}

/** Review image: each rift animation frame over a roots-like wall band + floor. */
export function riftPreview(sheet, tilesSheet) {
  const cell = (sh, id) => sh.rows.find((r) => r.name === id).cells[0];
  const rows = sheet.rows;
  const cols = 6;
  const out = new Img(cols * 32, rows.length * 32);
  rows.forEach((row, j) => {
    for (let c = 0; c < cols; c++) {
      const x0 = c * 32;
      const y0 = j * 32;
      for (let k = 0; k < 2; k++) {
        out.blit(cell(tilesSheet, 'wall_n'), x0 + k * 16, y0 + 8);
      }
      for (let k = 0; k < 2; k++) {
        for (let m = 0; m < 2; m++) out.blit(cell(tilesSheet, `floor${(k + m) % 4}`), x0 + k * 16, y0 + 24 - 8 + m * 8 - 0, {});
      }
      out.rect(x0, y0, 32, 8, PAL.ink);
      out.rect(x0, y0 + 24, 32, 8, PAL.gb1);
      for (let k = 0; k < 2; k++) out.blit(cell(tilesSheet, 'wall_n'), x0 + k * 16, y0 + 8);
      out.blit(row.cells[c % row.cells.length], x0, y0);
    }
  });
  return out;
}
