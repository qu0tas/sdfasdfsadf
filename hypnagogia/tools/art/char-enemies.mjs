import { PAL, Img, Sheet } from './lib.mjs';
import { R, shadeEllipse, shadeRRect, shadeShape, dissolve, hash, clampBorder } from './char-lib.mjs';

const O = PAL.outline;

/** Whitens every non-outline pixel (hit flash). */
function flash(L) {
  return L.clone().map((x, y, c) => {
    const lum = c[0] + c[1] + c[2];
    return lum < 110 ? null : lum > 500 ? PAL.white : PAL.gb5;
  });
}

function enemySheet(name, draw, poses, { death } = {}) {
  clampBorder.tag = name;
  const s = new Sheet(name, 24, 24);
  const blit = (img, L) => img.blit(clampBorder(L));
  s.anim('idle', 4, (img, i) => blit(img, ((clampBorder.tag = name + '/idle'), draw(poses.idle[i]))), { fps: 6 });
  s.anim('move', 4, (img, i) => blit(img, ((clampBorder.tag = name + '/move'), draw(poses.move[i]))), { fps: 8 });
  s.anim('attack', 4, (img, i) => blit(img, ((clampBorder.tag = name + '/attack'), draw(poses.attack[i]))), { fps: 10, loop: false });
  s.anim('hit', 2, (img, i) => blit(img, i === 0 ? flash(draw(poses.hit[0])) : draw(poses.hit[1])), { fps: 12, loop: false });
  s.anim('death', 6, (img, i) => {
    if (death) return death(img, i, draw);
    const p = [0.06, 0.26, 0.46, 0.66, 0.86, 0.97][i];
    blit(img, dissolve(draw(poses.hit[1]), p, { seed: name.length * 11, top: false, rise: 6, mote: 0.7, colors: [PAL.cy3, PAL.pu5, PAL.cy4, PAL.gb4] }));
  }, { fps: 10, loop: false });
  return s;
}

// ---------------------------------------------------------------- blob
function drawBlob(p) {
  const { rx = 9, ry = 8, ox = 0, eyes = 'open', mouth = 0, drip = 0 } = p;
  const L = new Img(24, 24);
  const cx = 12 + ox, bottom = 21;
  const cy = bottom - ry + 0.5;
  shadeEllipse(L, cx, cy, rx, ry, R.pu);
  // flat-ish base and droopy lumps
  L.rect(Math.round(cx - rx + 2), bottom - 1, Math.round(rx * 2 - 3), 1, PAL.pu1);
  shadeEllipse(L, cx - rx + 1, bottom - 1.5, 2, 1.6, R.pu);
  shadeEllipse(L, cx + rx - 1.5, bottom - 1.5, 2, 1.6, R.pu);
  if (drip) shadeEllipse(L, cx + 3, bottom, 1.5, 1, R.pu);
  L.outline();
  // faint shapes inside: a key, a star, a tiny house
  const f = PAL.pu2;
  L.pixels(Math.round(cx - 7), Math.round(cy + 1), ['.XX', 'X.X', '.XX', '..X'].map((r) => r), { X: f });
  L.pixels(Math.round(cx + 3), Math.round(cy + 2), ['.X.', 'XXX', '.X.'], { X: PAL.pu4 });
  L.pixels(Math.round(cx - 1), Math.round(cy + ry - 4), ['.X.', 'XXX', 'X.X'], { X: f });
  const ey = Math.round(cy - ry * 0.35);
  // mismatched eyes: big pale one, small high one
  const ex = Math.round(cx);
  if (eyes === 'open') {
    L.rect(ex - 5, ey, 4, 4, PAL.pu5); L.clear(ex - 5, ey); L.clear(ex - 2, ey); L.clear(ex - 5, ey + 3); L.clear(ex - 2, ey + 3);
    L.rect(ex - 5, ey + 1, 4, 2, PAL.pu5); L.rect(ex - 4, ey, 2, 4, PAL.pu5);
    L.rect(ex - 4, ey + 1, 2, 2, PAL.outline);
    L.set(ex - 4, ey + 1, PAL.cy3);
    L.rect(ex + 2, ey - 1, 2, 2, PAL.pu5); L.set(ex + 3, ey, PAL.outline);
  } else {
    L.rect(ex - 5, ey + 2, 4, 1, PAL.pu1); L.rect(ex + 2, ey, 2, 1, PAL.pu1);
  }
  if (mouth) L.rect(ex - 2, ey + 5, 5, mouth, PAL.pu1);
  else L.rect(ex - 1, ey + 6, 3, 1, PAL.pu1);
  return L;
}
const blob = enemySheet('blob', drawBlob, {
  idle: [{ rx: 8.5, ry: 8 }, { rx: 9, ry: 7.5 }, { rx: 8.5, ry: 8.5 }, { rx: 8, ry: 8 }],
  move: [{ rx: 7.5, ry: 9, ox: -1 }, { rx: 9, ry: 6, ox: 0, drip: 1 }, { rx: 8, ry: 8.5, ox: 1 }, { rx: 9, ry: 6.5, ox: 0, drip: 1 }],
  attack: [{ rx: 7.5, ry: 9.5, ox: -1 }, { rx: 8, ry: 6.5, ox: -1, mouth: 1 }, { rx: 8, ry: 5.5, ox: 1, mouth: 3 }, { rx: 9, ry: 7, mouth: 2 }],
  hit: [{ rx: 8, ry: 6, ox: 1, eyes: 'shut' }, { rx: 8, ry: 7, ox: -1, eyes: 'shut' }],
});

// ---------------------------------------------------------------- eye
function drawEye(p) {
  const { cy = 11, rx = 7.6, ry = 7.6, iris = 4, pupil = 2, flare = 0, wisp = 0, ph = 0, lx = 0, ly = 0, lid = 0 } = p;
  const L = new Img(24, 24);
  // wisps first so they sit beneath
  const W = new Img(24, 24);
  for (let k = 0; k < 3; k++) {
    const bx = 12 + (k - 1) * (3 + wisp * 2);
    for (let j = 0; j < Math.min(5, 22 - Math.round(cy + ry - 1) + 1); j++) {
      const sway = Math.round(Math.sin(ph + k * 1.7 + j * 0.9) * (1 + j * 0.3));
      W.set(bx + sway, Math.round(cy + ry - 1) + j, k === 1 ? PAL.gb4 : PAL.gb3);
      W.set(bx + sway + 1, Math.round(cy + ry - 1) + j, PAL.gb2);
    }
  }
  shadeEllipse(L, 12, cy, rx, ry, R.gbL);
  L.outline();
  const ix = 12 + lx, iy = cy + ly;
  L.ellipse(ix, iy, iris + 0.4, iris + 0.4, flare ? PAL.cy3 : PAL.cy2);
  L.ellipse(ix - 0.5, iy - 0.5, iris - 0.8, iris - 0.8, flare ? PAL.cy4 : PAL.cy3);
  L.ellipse(ix, iy, pupil, pupil, flare ? PAL.cy1 : PAL.outline);
  if (!flare && pupil > 0.9) L.set(Math.round(ix - 1), Math.round(iy - 1), PAL.white);
  // heavy drooping upper lid
  for (let x = 12 - rx; x <= 12 + rx; x++) {
    for (let y = Math.round(cy - ry); y < Math.round(cy - ry) + 2 + lid; y++) {
      if (L.alpha(x, y) && L.get(x, y).join() !== rgbOf(O)) L.set(x, y, PAL.gb2);
    }
  }
  const out = new Img(24, 24);
  out.blit(W); out.blit(L);
  return out;
}
const rgbOf = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255].join();
const eyeS = enemySheet('eye', drawEye, {
  idle: [{ cy: 11, ph: 0 }, { cy: 10, ph: 1.5, ly: 1 }, { cy: 11, ph: 3, lx: 1 }, { cy: 12, ph: 4.5, ly: 0 }],
  move: [{ cy: 11, ph: 0, lx: 2, wisp: 0 }, { cy: 10, ph: 2, lx: 2, ry: 7.5 }, { cy: 11, ph: 4, lx: 2 }, { cy: 12, ph: 6, lx: 2, ry: 7.5 }],
  attack: [{ cy: 11, iris: 3, pupil: 1, lid: 1, ph: 0 }, { cy: 11, iris: 3, pupil: 1, ph: 1, wisp: 0.5 }, { cy: 10, iris: 5.5, pupil: 2.5, flare: 1, wisp: 1, ph: 2 }, { cy: 11, iris: 4, pupil: 2, wisp: 0.6, ph: 3 }],
  hit: [{ cy: 11, lid: 2, iris: 3, ph: 0 }, { cy: 12, lid: 1, iris: 3.5, pupil: 1.5, ph: 2, lx: -1 }],
});

// ---------------------------------------------------------------- windup mouse
function drawMouse(p) {
  const { ox = 0, dy = 0, key = 0, sq = 0, spoke = 0, lean = 0, eyes = 'open' } = p;
  const L = new Img(24, 24);
  const cx = 12 + ox;
  const bot = 19 + dy;
  const H = 12 + sq;
  const cy = bot - H / 2 + 0.5;
  // ears
  shadeEllipse(L, cx - 6, cy - H / 2 + 1, 2.9, 2.9, R.rose);
  shadeEllipse(L, cx + 6, cy - H / 2 + 1, 2.9, 2.9, R.rose);
  // wheels
  for (const wx of [-6, 6]) {
    L.ellipse(cx + wx, 19.5, 2.2, 2.2, PAL.gb1);
  }
  shadeEllipse(L, cx, cy, 9, H / 2, R.gb);
  // snout / nose
  L.rect(Math.round(cx) - 1, Math.round(cy + H / 2) - 2, 3, 2, PAL.rose3);
  L.outline();
  for (const wx of [-6, 6]) {
    const x = Math.round(cx + wx), y = 19;
    L.rect(x - 1, y - 1, 3, 3, PAL.gb4);
    L.set(x - 1 + (spoke % 3), y - 1 + ((spoke + 1) % 3), PAL.dark);
    L.set(x + 1 - (spoke % 3), y + 1 - ((spoke + 1) % 3), PAL.dark);
  }
  // ear insides
  L.rect(Math.round(cx - 7), Math.round(cy - H / 2 + 1), 2, 2, PAL.rose1);
  L.rect(Math.round(cx + 6), Math.round(cy - H / 2 + 1), 2, 2, PAL.rose1);
  // eyes
  const ey = Math.round(cy - 1);
  if (eyes === 'open') {
    L.rect(Math.round(cx) - 5, ey, 3, 3, PAL.dark); L.set(Math.round(cx) - 4, ey, PAL.cy3);
    L.rect(Math.round(cx) + 3, ey, 3, 3, PAL.gb5); L.set(Math.round(cx) + 4, ey + 1, PAL.outline);
  } else {
    L.rect(Math.round(cx) - 5, ey + 1, 3, 1, PAL.dark); L.rect(Math.round(cx) + 3, ey + 1, 3, 1, PAL.dark);
  }
  // whiskers
  L.line(Math.round(cx) - 8, ey + 3, Math.round(cx) - 5, ey + 3, PAL.gb5);
  L.line(Math.round(cx) + 6, ey + 3, Math.round(cx) + 8, ey + 3, PAL.gb5);
  // key on top: rotating butterfly key
  const kx = Math.round(cx), ky = Math.round(cy - H / 2) - 1 + lean;
  const kk = key % 4;
  const stem = [kx, ky + 1];
  L.rect(stem[0], ky - 1, 1, 3, PAL.sand1);
  const wing = [
    ['XXXXX'],
    ['..X..', '.XXX.', '..X..'],
    ['..X..', '..X..'],
    ['.XXX.', 'XXXXX', '.XXX.'],
  ][kk];
  const rows = {
    0: [[-2, -3, 'XXXXX'], [-2, -2, 'X...X'], [-2, -1, 'XXXXX']],
    1: [[-1, -4, '.XXX.'], [-1, -3, 'X...X'], [-1, -2, '.XXX.']],
    2: [[-1, -4, 'XXX'], [-1, -3, 'X.X'], [-1, -2, 'XXX']],
    3: [[-2, -4, '.XXX.'], [-2, -3, 'XX.XX'], [-2, -2, '.XXX.']],
  }[kk];
  void wing;
  for (const [dx, dyy, row] of rows) {
    [...row].forEach((ch, i) => {
      if (ch === 'X') { const x = kx + dx + i, y = ky + dyy + 1; if (y >= 1) { L.set(x, y, kk % 2 ? PAL.sand2 : PAL.sand3); } }
    });
  }
  return L;
}
const mouse = enemySheet('windup', drawMouse, {
  idle: [{ key: 0 }, { key: 1, sq: -1 }, { key: 2 }, { key: 3, sq: 0, dy: 0 }],
  move: [{ key: 0, dy: 0, spoke: 0, ox: -1 }, { key: 1, dy: -1, spoke: 1, ox: 0 }, { key: 2, dy: 0, spoke: 2, ox: 1 }, { key: 3, dy: -1, spoke: 1, ox: 0 }],
  attack: [{ key: 1, sq: -2, dy: 0, ox: -1, spoke: 0 }, { key: 2, sq: -3, ox: -1, spoke: 1, lean: 1 }, { key: 3, sq: 1, ox: 1, dy: 1, spoke: 2, lean: 1 }, { key: 0, sq: -1, ox: 1, spoke: 1 }],
  hit: [{ key: 0, sq: -3, ox: 1, eyes: 'shut' }, { key: 2, sq: -2, ox: -1, eyes: 'shut' }],
});

// ---------------------------------------------------------------- teddy
const TB = [PAL.rose1, PAL.sand1, PAL.sand2, PAL.sand3];
function drawTeddy(p) {
  const { arms = 0, seam = 0, dy = 0, ox = 0, sq = 0, eyes = 'open', toss = 0 } = p;
  const L = new Img(24, 24);
  const cx = 12 + ox;
  const top = 3 + dy;
  // ears, head
  shadeEllipse(L, cx - 4.5, top + 2, 2.2, 2.2, TB);
  shadeEllipse(L, cx + 4.5, top + 2, 2.2, 2.2, TB);
  // legs
  shadeEllipse(L, cx - 4, 19.5, 3, 1.8, TB);
  shadeEllipse(L, cx + 4, 19.5, 3, 1.8, TB);
  // body
  shadeEllipse(L, cx, 14.5 + dy + sq / 2, 6.5, 5.5 - sq / 2, TB);
  // arms
  const ay = arms ? top + 4 : 13.5 + dy;
  shadeEllipse(L, cx - 7, ay, 2, arms ? 3.2 : 3, TB);
  shadeEllipse(L, cx + 7, ay, 2, arms ? 3.2 : 3, TB);
  shadeEllipse(L, cx, top + 5, 5.5, 4.5, TB);
  L.outline();
  // inner ears
  L.set(Math.round(cx - 5), top + 2, PAL.rose2); L.set(Math.round(cx + 5), top + 2, PAL.rose2);
  // muzzle
  L.ellipse(cx, top + 7, 2.5, 1.7, PAL.sand3);
  L.rect(Math.round(cx) - 1, top + 6, 2, 1, PAL.dark);
  // eyes: left button, right missing with thread X
  const ey = top + 3;
  const exL = Math.round(cx) - 3, exR = Math.round(cx) + 2;
  if (eyes === 'open') {
    L.rect(exL, ey, 2, 2, PAL.pu1); L.set(exL, ey, PAL.pu4);
    L.rect(exR - 1, ey - 1, 4, 4, PAL.outline);
    L.line(exR - 1, ey - 1, exR + 2, ey + 2, PAL.sand2); L.line(exR + 2, ey - 1, exR - 1, ey + 2, PAL.sand2);
  } else {
    L.rect(exL, ey + 1, 2, 1, PAL.pu1);
    L.rect(exR - 1, ey - 1, 4, 4, PAL.outline);
    L.line(exR - 1, ey - 1, exR + 2, ey + 2, PAL.sand1); L.line(exR + 2, ey - 1, exR - 1, ey + 2, PAL.sand1);
  }
  // stitched tummy seam
  const sy = Math.round(12 + dy + sq / 2);
  const tx = Math.round(cx);
  if (seam === 0) {
    for (let y = sy; y < sy + 7; y++) if (y % 2 === 0) L.set(tx, y, PAL.rose1);
    for (let y = sy + 1; y < sy + 7; y += 2) { L.set(tx - 1, y, PAL.rose1); L.set(tx + 1, y, PAL.rose1); }
    L.set(tx + 2, sy + 5, PAL.sand3); L.set(tx + 3, sy + 5, PAL.white); L.set(tx + 3, sy + 4, PAL.pu5);
  } else {
    const w = seam;
    L.rect(tx - 1, sy, 2 + w, 7, PAL.outline);
    L.rect(tx, sy + 1, w, 2, PAL.pu5); L.rect(tx - 1, sy + 3, w + 1, 2, PAL.white); L.rect(tx, sy + 5, w, 1, PAL.pu4);
    L.set(tx - 2, sy, PAL.rose1); L.set(tx - 2, sy + 6, PAL.rose1);
  }
  if (toss) {
    const pts = [[tx + 5, sy + 2], [tx + 7, sy], [tx + 6, sy + 4], [tx - 6, sy + 1], [tx - 5, sy + 4]];
    pts.slice(0, toss).forEach(([x, y]) => { L.set(x, y, PAL.pu5); L.set(x + 1, y, PAL.white); });
  }
  return L;
}
const teddy = enemySheet('teddy', drawTeddy, {
  idle: [{}, { sq: 1 }, { sq: 0, dy: 0, eyes: 'open' }, { sq: -1 }].map((q, i) => ({ ...q, ox: [0, 0, 0, 0][i] })),
  move: [{ ox: -1, dy: 0, sq: 0 }, { ox: 0, dy: -1 }, { ox: 1, dy: 0 }, { ox: 0, dy: -1 }],
  attack: [{ arms: 0, sq: 1, dy: 1 }, { arms: 1, dy: 0, seam: 1 }, { arms: 1, seam: 3, toss: 5, dy: -1 }, { arms: 0, seam: 1, toss: 2 }],
  hit: [{ sq: 2, ox: 1, eyes: 'shut' }, { sq: 1, ox: -1, eyes: 'shut' }],
});

// ---------------------------------------------------------------- button spider
function drawSpider(p) {
  const { ph = 0, dy = 0, crouch = 0, spread = 0, ry = 5 } = p;
  const L = new Img(24, 24);
  const cx = 12, cy = 13 + dy + crouch;
  // legs: 4 per side, thread
  const legs = [];
  for (let k = 0; k < 4; k++) {
    for (const s of [-1, 1]) {
      const lift = ((k + (s > 0 ? 1 : 0)) % 2 === ph % 2) ? 2 : 0;
      const kneeX = cx + s * ([6, 8, 8, 6][k] + spread), kneeY = cy + [-6, -4, 0, 3][k] - lift;
      const footX = cx + s * ([7, 8, 8, 7][k] + spread), footY = Math.min(21, cy + [2, 5, 7, 8][k] - lift * 2);
      legs.push([cx + s * 5, cy + [-3, -1, 1, 3][k], kneeX, kneeY, footX, footY]);
    }
  }
  for (const [x0, y0, x1, y1, x2, y2] of legs) {
    L.line(x0, y0, x1, y1, PAL.outline);
    L.line(x1, y1, x2, y2, PAL.outline);
  }
  const body = new Img(24, 24);
  shadeEllipse(body, cx, cy, 6.5, ry, R.gbL);
  body.outline();
  L.blit(body);
  // legs get a faint pale core on mid segments, keeps threads readable
  for (const [x0, y0, x1, y1, x2, y2] of legs) {
    L.set(x1, y1, PAL.gb2);
    L.set(x2, y2, PAL.gb3);
  }
  // button rim + four holes (two with pale glints)
  L.ellipse(cx, cy, 4.2, ry - 1.6, PAL.gb3);
  L.ellipse(cx - 0.5, cy - 0.5, 3.4, Math.max(1, ry - 2.4), PAL.gb4);
  const hx = [cx - 3, cx + 1], hy = [cy - 2, cy + 0];
  for (const x of hx) for (const y of hy) { L.rect(Math.round(x), Math.round(y), 2, 2, PAL.pu1); }
  L.set(Math.round(hx[0]), Math.round(hy[0]), PAL.cy3);
  L.set(Math.round(hx[1]), Math.round(hy[0]), PAL.cy3);
  // a loose thread stitch across
  L.line(Math.round(cx - 2), Math.round(cy + 2), Math.round(cx + 3), Math.round(cy + 2), PAL.rose2);
  return L;
}
const spider = enemySheet('spider', drawSpider, {
  idle: [{ ph: 0 }, { ph: 0, dy: 1, ry: 4.5 }, { ph: 0 }, { ph: 0, dy: -1 }],
  move: [{ ph: 0, dy: 0 }, { ph: 1, dy: -1 }, { ph: 0, dy: 0 }, { ph: 1, dy: -1 }],
  attack: [{ crouch: 3, ry: 4.5, spread: 1 }, { crouch: 4, ry: 4, spread: 1 }, { dy: -4, ry: 5.5, spread: -1 }, { dy: -1, spread: 0 }],
  hit: [{ crouch: 2, ry: 4, spread: 1 }, { crouch: 1, spread: 1 }],
});

// ---------------------------------------------------------------- tv
function drawTV(p) {
  const { f = 0, ox = 0, dy = 0, mode = 'static', ant = 0, leg = 0, sq = 0 } = p;
  const L = new Img(24, 24);
  const x0 = 3 + ox, y0 = 8 + dy + sq, w = 18, h = 12 - sq;
  // antennae
  const ax = 12 + ox;
  const bend = ant;
  L.line(ax - 1, y0, ax - 5 - bend, y0 - 5, PAL.gb3);
  L.line(ax + 1, y0, ax + 5 + bend, y0 - 5, PAL.gb3);
  // legs
  L.rect(x0 + 2, y0 + h, 3, 2 - (leg === 1 ? 1 : 0), PAL.gb1);
  L.rect(x0 + w - 5, y0 + h, 3, 2 - (leg === 2 ? 1 : 0), PAL.gb1);
  shadeRRect(L, x0, y0, w, h, 2, R.pu);
  L.outline();
  L.set(ax - 5 - bend, y0 - 5, PAL.gb5); L.set(ax + 5 + bend, y0 - 5, PAL.gb5);
  // screen
  const sx = x0 + 2, sy = y0 + 2, sw = 11, sh = h - 4;
  L.rect(sx - 1, sy - 1, sw + 2, sh + 2, PAL.outline);
  if (mode === 'static') {
    const cols = [PAL.gb5, PAL.gb3, PAL.gb2, PAL.dark, PAL.gb4];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) L.set(sx + x, sy + y, cols[Math.floor(hash(x, y, f + 5) * cols.length)]);
    const bar = (f * 3) % sh;
    for (let x = 0; x < sw; x++) L.set(sx + x, sy + bar, PAL.gb5);
  } else {
    L.rect(sx, sy, sw, sh, PAL.cy3);
    L.rect(sx, sy, sw, 1, PAL.cy4);
    // dark eye shape
    L.ellipse(sx + sw / 2 - 0.5, sy + sh / 2, 4, 2.4, PAL.outline);
    L.rect(Math.round(sx + sw / 2) - 1, Math.round(sy + sh / 2) - 1, 2, 2, PAL.cy4);
    if (mode === 'flare') { L.set(sx + 1, sy + 1, PAL.white); L.set(sx + sw - 2, sy + sh - 2, PAL.white); }
  }
  // glass sheen & side panel knobs
  L.rect(x0 + w - 5, y0 + 3, 3, 3, PAL.pu4); L.set(x0 + w - 4, y0 + 4, PAL.pu1);
  L.rect(x0 + w - 5, y0 + 7, 3, 1, PAL.pu1); L.rect(x0 + w - 5, y0 + 9, 3, 1, PAL.pu1);
  if (mode !== 'static' && (f % 2 === 0 || mode === 'flare')) {
    const tipsL = [ax - 5 - bend, y0 - 5], tipsR = [ax + 5 + bend, y0 - 5];
    for (const [x, y] of [tipsL, tipsR]) { L.set(x, y - 1, PAL.cy4); L.set(x - 1, y, PAL.cy3); L.set(x + 1, y, PAL.cy3); }
  }
  return L;
}
const tv = enemySheet('tv', drawTV, {
  idle: [{ f: 0 }, { f: 1, dy: 0 }, { f: 2, ant: 1 }, { f: 3, ant: 0 }],
  move: [{ f: 4, ox: -1, leg: 1 }, { f: 5, ox: 0, leg: 0, dy: -1 }, { f: 6, ox: 1, leg: 2 }, { f: 7, ox: 0, dy: -1 }],
  attack: [{ f: 8, sq: 1, ant: 0 }, { f: 9, mode: 'cy', ant: 1, sq: 0 }, { f: 10, mode: 'flare', ant: 2, dy: -1 }, { f: 11, mode: 'cy', ant: 1 }],
  hit: [{ f: 12, ox: 1, sq: 1 }, { f: 13, ox: -1 }],
});

// ---------------------------------------------------------------- balloon
function drawBalloon(p) {
  const { rx = 7.5, ry = 7.5, cy = 10, sway = 0, ph = 0, face = 'sad', pop = 0 } = p;
  const L = new Img(24, 24);
  const S = new Img(24, 24);
  // string
  const by = Math.round(cy + ry) + 2;
  let sx = 12;
  for (let y = by; y <= 21; y++) {
    sx = 12 + Math.round(Math.sin(ph + (y - by) * 0.9) * (0.8 + sway));
    S.set(sx, y, PAL.gb4);
  }
  shadeEllipse(L, 12, cy, rx, ry, R.rose);
  // knot
  const ky = Math.round(cy + ry);
  L.rect(11, ky, 3, 1, PAL.rose1); L.rect(12, ky + 1, 1, 1, PAL.rose1);
  L.outline();
  // face: hollow dark eyes, tiny frown
  const ey = Math.round(cy - 1);
  if (face === 'sad') {
    L.rect(8, ey, 2, 3, PAL.outline); L.rect(14, ey, 2, 3, PAL.outline);
    L.set(8, ey, PAL.rose1); L.set(15, ey, PAL.rose1);
    L.set(8, ey - 1, PAL.rose1); L.set(9, ey - 1, PAL.rose1);
    L.set(14, ey - 1, PAL.rose1); L.set(15, ey - 1, PAL.rose1);
    L.set(10, ey - 2, PAL.rose1); L.set(13, ey - 2, PAL.rose1);
    L.rect(11, ey + 5, 3, 1, PAL.rose1); L.set(10, ey + 6, PAL.rose1); L.set(14, ey + 6, PAL.rose1);
  } else {
    L.rect(8, ey + 1, 3, 1, PAL.outline); L.rect(14, ey + 1, 3, 1, PAL.outline);
    L.ellipse(12, ey + 5, 1.5, 1.5, PAL.outline);
  }
  L.pixels(8, Math.round(cy - ry + 2), ['.XX', 'X..', 'X..'], { X: PAL.white });
  const out = new Img(24, 24);
  out.blit(S); out.blit(L);
  return out;
}
const balloon = enemySheet('balloon', drawBalloon, {
  idle: [{ cy: 10, ph: 0 }, { cy: 9, ph: 1.6, sway: 0.3 }, { cy: 10, ph: 3.2 }, { cy: 11, ph: 4.8, ry: 7.3 }],
  move: [{ cy: 10, ph: 0, rx: 7, ry: 8, sway: 0.8 }, { cy: 9, ph: 2, sway: 1 }, { cy: 10, ph: 4, rx: 7, ry: 8, sway: 0.8 }, { cy: 11, ph: 6, sway: 1 }],
  attack: [{ cy: 10, rx: 7, ry: 7 }, { cy: 10, rx: 7.8, ry: 7.8, ph: 1 }, { cy: 11, rx: 8.5, ry: 8.5, ph: 2, face: 'o' }, { cy: 10, rx: 7.8, ry: 7.8, ph: 3 }],
  hit: [{ cy: 11, rx: 8, ry: 6.5, face: 'o' }, { cy: 10, rx: 7, ry: 8, face: 'o' }],
}, {
  death(img, i) {
    const pop = [0, 1, 2, 3, 4, 5][i];
    if (i === 0) return img.blit(clampBorder(drawBalloon({ cy: 11, rx: 8.5, ry: 8.5, face: 'o' })));
    const scraps = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.3], [1.3, 0], [-1.3, 0], [0, 1.3]];
    scraps.forEach(([dx, dy], k) => {
      const r = i * 2.2 * (0.8 + (k % 3) * 0.25);
      const x = Math.round(12 + dx * r * 1.1), y = Math.round(10 + dy * r);
      const live = i < 5 || k % 3 === 0;
      if (i === 5) { if (k === 0) img.set(x, y, PAL.cy3); return; }
      if (!live) return;
      const c = i >= 4 ? PAL.rose1 : PAL.rose2;
      const t = [[0, 0], [1, 0], [0, 1]];
      if (i < 3) t.push([1, 1]);
      t.forEach(([a, b]) => img.set(x + a, y + b, c));
      img.set(x, y, i >= 4 ? PAL.rose1 : PAL.rose3);
    });
    if (i < 3) for (let k = 0; k < 5; k++) img.set(Math.round(12 + Math.cos(k * 1.3) * (3 + i * 3)), Math.round(10 + Math.sin(k * 1.3) * (3 + i * 3)), PAL.cy3);
    void pop;
    clampBorder(img);
  },
});

// ---------------------------------------------------------------- sprout
function drawSprout(p) {
  const { h = 1, bend = 0, bud = 'closed', spit = 0, mound = 0, ph = 0 } = p;
  const L = new Img(24, 24);
  // tendril
  const segs = Math.max(1, Math.round(11 * h));
  const pts = [];
  for (let k = 0; k <= segs; k++) {
    const t = k / segs;
    pts.push([12 + bend * t * t * 1.2 + Math.sin(ph + t * 3) * 0.6 * t, 18 - 11 * h * t]);
  }
  const root = new Img(24, 24);
  for (const [x, y] of pts) root.ellipse(x, y, 1.9, 1.9, PAL.moss1);
  for (const [x, y] of pts) root.ellipse(x - 0.4, y - 0.4, 1.2, 1.2, PAL.moss2);
  for (const [x, y] of pts.filter((_, k) => k % 3 === 1)) root.set(Math.round(x - 1), Math.round(y - 1), PAL.moss3);
  // mound
  const mh = 4 - mound;
  shadeEllipse(L, 12, 21 - mh + 0.5, 9, mh, [PAL.gb1, PAL.gb2, PAL.gb3, PAL.moss3]);
  L.blit(root);
  // bud on tip
  const [tx, ty] = pts[pts.length - 1];
  if (h > 0.4) {
    shadeEllipse(L, tx, ty - 1, 4.2, 3.6, R.moss);
    // side leaves
    shadeEllipse(L, tx - 4, ty + 2, 1.8, 1, R.moss); shadeEllipse(L, tx + 4, ty + 2, 1.8, 1, R.moss);
  } else shadeEllipse(L, tx, ty - 1, 2.5, 2, R.moss);
  // re-draw mound over base to hide root bottom? keep root on top, then outline
  L.outline();
  const ex = Math.round(tx), ey = Math.round(ty) - 1;
  if (h > 0.4) {
    if (bud === 'closed') { L.rect(ex - 2, ey - 1, 5, 3, PAL.cy2); L.rect(ex - 1, ey, 3, 1, PAL.cy3); L.set(ex, ey, PAL.cy4); }
    else if (bud === 'half') { L.rect(ex - 2, ey - 1, 5, 3, PAL.cy2); L.rect(ex - 1, ey, 3, 1, PAL.cy4); L.set(ex, ey - 1, PAL.outline); }
    else {
      L.rect(ex - 2, ey - 2, 5, 5, PAL.outline);
      L.rect(ex - 1, ey - 1, 3, 3, PAL.cy3); L.set(ex, ey, PAL.cy4);
    }
    if (spit) { L.set(ex, ey - 4, PAL.cy4); L.set(ex, ey - 3, PAL.cy3); if (ey - 6 > 0) L.set(ex, ey - 6, PAL.cy2); }
  }
  // mound sprinkles of moss
  L.set(7, 19 + mound, PAL.moss3); L.set(16, 20, PAL.moss2); L.set(10, 20, PAL.moss1);
  return L;
}
const sprout = enemySheet('sprout', drawSprout, {
  idle: [{ bend: -1, ph: 0 }, { bend: 0, ph: 1 }, { bend: 1, ph: 2 }, { bend: 0, ph: 3 }],
  move: [{ h: 0.85, bend: 1, mound: 0 }, { h: 0.6, bend: 0, mound: 1, bud: 'closed' }, { h: 0.35, mound: 1 }, { h: 0.1, mound: 2 }],
  attack: [{ h: 1, bend: -2, bud: 'closed' }, { h: 0.95, bend: -1, bud: 'half' }, { h: 1.05, bend: 1, bud: 'open', spit: 1 }, { h: 1, bend: 0, bud: 'half' }],
  hit: [{ h: 0.8, bend: 2, bud: 'closed', mound: 0 }, { h: 0.9, bend: -1 }],
});

export const sheets = {
  blob: () => blob,
  eye: () => eyeS,
  windup: () => mouse,
  teddy: () => teddy,
  spider: () => spider,
  tv: () => tv,
  balloon: () => balloon,
  sprout: () => sprout,
};
