import { PAL, Img, Sheet } from './lib.mjs';
import { R, shadeEllipse, shadeRRect, shadeShape, dissolve, hash, clampBorder, lerp } from './char-lib.mjs';

const O = PAL.outline;

function whiten(L) {
  return L.clone().map((x, y, c) => (c[0] + c[1] + c[2] < 110 ? null : PAL.gb5));
}

/** Splits an image down column cx into two halves moved apart by g, leaving a dark gap. */
function splitImg(src, cx, g, drop = 0, gapCol = PAL.pu1) {
  if (!g) return src;
  const out = new Img(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (!c[3]) continue;
      if (x < cx) out.set(x - g, y + drop, c); else out.set(x + g, y + drop, c);
    }
    if (src.alpha(cx, y) || src.alpha(cx - 1, y)) {
      for (let x = cx - g; x < cx + g; x++) if (!out.alpha(x, y)) out.set(x, y, gapCol);
    }
  }
  return out;
}

function gear(I, x, y, c = PAL.gb4) {
  I.pixels(x, y, ['X.X.X', '.XXX.', 'XX.XX', '.XXX.', 'X.X.X'], { X: O });
  I.pixels(x, y, ['.....', '..X..', '.X.X.'.replace(/X/g, 'X'), '..X..', '.....'].map((r, j) => (j === 2 ? 'X...X' : r)), { X: c });
  I.set(x + 2, y + 1, c); I.set(x + 1, y + 2, c); I.set(x + 3, y + 2, c); I.set(x + 2, y + 3, c);
  I.set(x + 2, y + 2, PAL.gb2);
}

/** Butterfly wind-up key seen from the front, centred at (x, y); a = rotation angle. */
function windKey(I, x, y, a, scale = 1, stemTo = null) {
  const wing = Math.cos(a);
  const rx = (1.6 + Math.abs(wing) * 3.8) * scale, ry = 4 * scale, off = (1.2 + Math.abs(wing) * 3.2) * scale;
  const key = new Img(I.w, I.h);
  if (stemTo) key.line(x, y, stemTo[0], stemTo[1], PAL.sand1), key.line(x + 1, y, stemTo[0] + 1, stemTo[1], PAL.sand2);
  for (const s of [-1, 1]) shadeEllipse(key, x + s * off, y, rx, ry, R.sand);
  shadeEllipse(key, x, y, 1.6 * scale, 2 * scale, R.sand, { spark: false });
  key.outline();
  if (Math.abs(wing) > 0.35) for (const s of [-1, 1]) key.ellipse(x + s * off, y, rx * 0.4, ry * 0.4, O);
  I.blit(key);
}

// ================================================================ clump (64x64)
const LUMPS = [
  // cx, cy, rx, ry, ramp
  [32, 40, 22, 19, R.pu],
  [15, 49, 9, 9, R.gb],
  [49, 49, 9, 9, R.pu],
  [11, 38, 6, 7, R.pu],
  [53, 38, 6, 7, R.gb],
  [21, 24, 10, 9, R.gb],
  [43, 25, 10, 9, R.pu],
  [32, 17, 10, 8, R.pu],
];
const EYES = [
  [24, 33, 4.6, 5], [40, 31, 3.6, 3.6], [32, 24, 3, 3.4], [16, 42, 3, 3], [47, 41, 4, 4.4],
  [32, 41, 5.6, 5.2], [22, 51, 2.6, 2.6], [41, 51, 2.8, 2.6],
];
const ALWAYS_CLOSED = new Set([6, 7]);

function drawClump(p) {
  const { w = 1, h = 1, ox = 0, wob = 0, closed = new Set(), mouth = 0, glow = 0, rp = 0, look = 0, lift = 0, slam = 0 } = p;
  const tx = (x) => 32 + ox + (x - 32) * w;
  const ty = (y) => 60 - (60 - y) * h - lift;
  const L = new Img(64, 64);
  // roots behind
  const roots = new Img(64, 64);
  const rootList = [
    [[14, 56], [7, 56 + rp], [6, 49 - rp]], [[22, 58], [13, 62 - rp], [7, 60]], [[50, 56], [57, 56 + rp], [58, 49 - rp]],
    [[42, 58], [51, 62 - rp], [57, 60]], [[30, 58], [26, 62], [18, 61 + rp]], [[36, 58], [40, 62], [47, 61 - rp]],
  ];
  for (const pts of rootList) {
    const [a, b, c] = pts.map(([x, y]) => [tx(x), Math.min(60.5, ty(y) + (slam ? 0 : 0))]);
    for (let t = 0; t <= 1; t += 0.05) {
      const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
      const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
      roots.ellipse(x, y, 1.7 - t * 0.5, 1.7 - t * 0.5, PAL.moss1);
    }
    for (let t = 0; t <= 1; t += 0.05) {
      const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
      const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
      roots.set(x - 0.5, y - 0.6, PAL.moss2);
    }
  }
  L.blit(roots);
  // lumps
  LUMPS.forEach(([cx, cy, rx, ry, ramp], i) => {
    const bob = i > 4 ? Math.round(Math.sin(wob * Math.PI / 2 + i) * 1.2) : 0;
    shadeEllipse(L, tx(cx) + (i === 3 || i === 4 ? 0 : 0), ty(cy) + bob, rx * w, ry * h, ramp, { spark: i === 0 });
  });
  L.outline();
  // roots in front, at the base
  const front = new Img(64, 64);
  for (const [x, y, rr] of [[26, 59, 2], [38, 59, 2], [32, 60, 1.8]]) front.ellipse(tx(x), Math.min(60, ty(y)), rr + 1.5, 1.7, PAL.moss1);
  front.outline();
  front.map((x, y, c) => (c.join() === [0x1b, 0x1a, 0x2b, 255].join() ? null : PAL.moss2));
  L.blit(front);
  // tendrils climbing over the mass
  const climb = new Img(64, 64);
  const paths = [
    [[18, 58], [6, 46], [15, 34]], [[46, 58], [58, 46], [49, 34]], [[27, 58], [36, 50], [28, 44]], [[38, 20], [28, 24], [20, 20]],
  ];
  for (const pts of paths) {
    const [a, b, c] = pts.map(([x, y]) => [tx(x), ty(y)]);
    for (let t = 0; t <= 1; t += 0.04) {
      const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0] + Math.sin(rp + t * 4) * 0.8;
      const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
      climb.ellipse(x, y, 1.5 - t * 0.4, 1.5 - t * 0.4, PAL.moss1);
    }
    for (let t = 0; t <= 1; t += 0.08) {
      const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0] + Math.sin(rp + t * 4) * 0.8;
      const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
      climb.set(x - 0.4, y - 0.5, PAL.moss2);
    }
  }
  climb.outline();
  L.blit(climb);
  // pressed-in lost objects
  const objs = [
    [tx(9) + 4, ty(30), ['XXX....', 'X.XXXXX', 'XXX.X.X'], PAL.pu4],
    [tx(41), ty(45), ['XXXXX..', 'XXXXXXX', 'XXXXX.X', 'XXXXX.X', '.XXX.XX'], PAL.pu1],
    [tx(27), ty(52), ['..X..', '.XXX.', 'XXXXX', '.XXX.', 'X...X'], PAL.pu4],
    [tx(48), ty(26), ['XX.', 'XXX', 'XX.', 'XXX'], PAL.pu1],
  ];
  for (const [x, y, rows, c] of objs) L.pixels(Math.round(x), Math.round(y), rows, { X: c });
  // eyes
  EYES.forEach(([ex, ey, rx, ry], i) => {
    const X = tx(ex), Y = ty(ey);
    const rr = Math.max(2, rx * 1.12 * (w + h) / 2), rv = Math.max(2, ry * 1.12 * (w + h) / 2);
    const isClosed = closed.has(i) || ALWAYS_CLOSED.has(i);
    if (isClosed) {
      L.ellipse(X, Y, rr + 1, rv * 0.45 + 1, O);
      L.rect(Math.round(X - rr), Math.round(Y), Math.round(rr * 2) + 1, 1, PAL.pu1);
      L.set(Math.round(X - rr), Math.round(Y) - 1, PAL.pu1); L.set(Math.round(X + rr), Math.round(Y) - 1, PAL.pu1);
      return;
    }
    L.ellipse(X, Y, rr + 1, rv + 1, O);
    L.ellipse(X, Y, rr, rv, i % 3 === 0 ? PAL.pu5 : i % 3 === 1 ? PAL.gb5 : PAL.cy3);
    const px = X + Math.max(-1, Math.min(1, look + ((i % 3) - 1)));
    const py = Y + (i % 2 ? 1 : 0);
    L.ellipse(px, py, rr * 0.5, rv * 0.5, O);
    L.set(Math.round(px - 1), Math.round(py - 1), PAL.cy4);
    if (i === 5 || i === 1) L.rect(Math.round(X - rr), Math.round(Y - rv) - 0, Math.round(rr * 2) + 1, 1 + (i === 1 ? 1 : 0), PAL.pu2); // heavy lid
  });
  // mouth
  if (mouth) {
    const mx = tx(32), my = ty(46), mw = 4 + mouth * 4.5, mh = 1.5 + mouth * 3.2;
    L.ellipse(mx, my, mw + 1, mh + 1, O);
    L.ellipse(mx, my, mw, mh, PAL.pu1);
    L.ellipse(mx, my + 1, mw * 0.7, mh * 0.6, O);
    if (glow) { L.ellipse(mx, my, mw * 0.55, mh * 0.55, PAL.cy2); L.ellipse(mx - 1, my - 1, mw * 0.3, mh * 0.3, PAL.cy4); }
  }
  return L;
}

export const clump = (() => {
  const s = new Sheet('clump', 64, 64);
  const put = (img, p) => img.blit(clampBorder(drawClump(p)));
  s.anim('idle', 4, (img, i) => put(img, [
    { h: 1, w: 1, wob: 0, closed: new Set([1]), rp: 0 },
    { h: 1.03, w: 0.99, wob: 1, closed: new Set([3, 5]), rp: 1 },
    { h: 1.05, w: 0.98, wob: 2, closed: new Set([0]), rp: 0, look: 1 },
    { h: 1.02, w: 0.995, wob: 3, closed: new Set([4, 2]), rp: -1, look: -1 },
  ][i]), { fps: 5 });
  s.anim('move', 4, (img, i) => put(img, [
    { h: 0.96, w: 1.03, ox: -2, wob: 0, rp: 1, look: -1 },
    { h: 1.02, w: 0.99, ox: 0, wob: 1, rp: 0 },
    { h: 0.96, w: 1.03, ox: 2, wob: 2, rp: -1, look: 1 },
    { h: 1.04, w: 0.98, ox: 0, wob: 3, rp: 0 },
  ][i]), { fps: 7 });
  s.anim('attack', 5, (img, i) => put(img, [
    { h: 0.86, w: 1.03, wob: 0, closed: new Set([1, 2]), rp: 2 },
    { h: 1.0, w: 0.95, wob: 1, rp: -2, lift: 0, look: 0 },
    { h: 1.1, w: 0.9, wob: 2, rp: -3, lift: 1 },
    { h: 0.58, w: 1.04, wob: 3, rp: 3, closed: new Set([0, 1, 2, 3, 4, 5]), slam: 1 },
    { h: 0.9, w: 1.0, wob: 0, rp: 1, closed: new Set([1]) },
  ][i]), { fps: 9, loop: false });
  s.anim('spit', 4, (img, i) => put(img, [
    { h: 0.97, w: 1.0, mouth: 0.4, closed: new Set([5]) },
    { h: 1.0, w: 0.98, mouth: 0.8, closed: new Set([5]), wob: 1 },
    { h: 1.03, w: 0.97, mouth: 1.1, glow: 1, closed: new Set([5]), wob: 2, rp: -1 },
    { h: 0.99, w: 1.0, mouth: 0.5, wob: 3 },
  ][i]), { fps: 9, loop: false });
  s.anim('hit', 2, (img, i) => {
    if (i === 0) img.blit(clampBorder(whiten(drawClump({ h: 0.92, w: 1.03, ox: 1 }))));
    else put(img, { h: 0.94, w: 1.02, ox: -1, closed: new Set([0, 1, 2, 3, 4, 5]) });
  }, { fps: 12, loop: false });
  s.anim('death', 9, (img, i) => {
    const order = [5, 0, 4, 1, 2, 3];
    const closed = new Set(order.slice(0, Math.min(i + 1, 6)));
    const pose = { h: lerp(1, 0.86, Math.min(i, 5) / 5), w: lerp(1, 1.03, Math.min(i, 5) / 5), closed, rp: Math.min(i, 3) };
    const base = clampBorder(drawClump(pose));
    const p = [0, 0, 0, 0, 0.12, 0.32, 0.55, 0.8, 0.98][i];
    img.blit(p ? dissolve(base, p, { seed: 5, top: true, rise: 12, mote: 0.5, colors: [PAL.cy3, PAL.cy4, PAL.pu5, PAL.cy2, PAL.gb4] }) : base);
    if (i === 8) { img.set(32, 24, PAL.cy3); img.set(36, 20, PAL.cy4); img.set(28, 17, PAL.cy2); }
  }, { fps: 8, loop: false });
  return s;
})();

// ================================================================ warden (48x48)
function drawWarden(p) {
  const { ox = 0, dy = 0, sx = 0, sy = 0, a = 0, lf = 0, rf = 0, lfx = 0, rfx = 0, glow = 'on', split = 0, drop = 0, keyOff = 0, ticks = 0, smear = 0, keyScale = 1, noKey = 0, cogs = 0, button = true } = p;
  const L = new Img(48, 48);
  const cx = 24 + ox;
  const H = 28 + sy, bottom = 41 + dy;
  const cy = bottom - (H - 1) / 2;
  const rx = 15 + sx / 2;
  const body = new Img(48, 48);
  if (!noKey) {
    // key rooted behind the shoulder
    windKey(L, Math.round(cx + 7 + keyOff), Math.round(cy - H / 2), a, keyScale * 1.15, [Math.round(cx + 6), Math.round(cy - H / 2 + 6)]);
  }
  // feet
  if (!smear) {
    for (const [fx, lift] of [[cx - 10 + lfx, lf], [cx + 4 + rfx, rf]]) {
      const x = Math.round(fx), y = 41 - lift;
      shadeRRect(body, x, y, 7, 4, 1.4, R.gb, { spark: false });
    }
  } else {
    body.rect(Math.round(cx - 9), bottom + 1, 7, 2, PAL.gb1); body.rect(Math.round(cx + 3), bottom + 1, 7, 2, PAL.gb1);
  }
  shadeEllipse(body, cx, cy, rx, H / 2, R.gbL);
  const inBody = (x, y) => body.alpha(x, y) > 0 && y < bottom - 0;
  // plates: belt band, shoulder arc, centre seam, rivets
  const top = Math.round(cy - H / 2);
  for (let x = 0; x < 48; x++) {
    if (!inBody(x, Math.round(cy + 5))) continue;
    body.set(x, Math.round(cy + 5), PAL.gb2);
    body.set(x, Math.round(cy + 6), PAL.rose2);
    body.set(x, Math.round(cy + 7), PAL.rose1);
  }
  for (let x = 0; x < 48; x++) if (inBody(x, top + 4) && (x - cx) ** 2 + 0 > 0) body.set(x, top + 4, PAL.gb2);
  for (let y = top; y <= bottom; y++) if (inBody(Math.round(cx), y)) body.set(Math.round(cx), y, PAL.gb1);
  for (const [dx, dyy] of [[-3, top + 6], [3, top + 6], [-3, Math.round(cy + 3)], [3, Math.round(cy + 3)], [-3, bottom - 3], [3, bottom - 3], [-12, Math.round(cy + 3)], [12, Math.round(cy + 3)]]) {
    const x = Math.round(cx) + dx, y = dyy;
    if (inBody(x, y)) { body.set(x, y, PAL.gb5); if (inBody(x + 1, y + 1)) body.set(x + 1, y + 1, PAL.gb1); }
  }
  // chipped paint
  for (const [dx, dyy] of [[-9, 2], [-8, 3], [8, -4], [11, 1], [-11, 6]]) { const x = Math.round(cx) + dx, y = Math.round(cy) + dyy; if (inBody(x, y)) body.set(x, y, PAL.gb2); }
  // faint swirl
  const sxp = Math.round(cx - rx * 0.7), syp = top + 6;
  body.pixels(sxp, syp, ['.XXXX.', 'X....X', 'X.XX.X', 'X.X..X', 'X.XXX.', '.X....'].map((r) => r), { X: PAL.gb2 });
  let B = body;
  B.outline();
  if (split) B = splitImg(B, Math.round(cx), split, drop);
  L.blit(B);
  if (split >= 3 && split < 8) {
    // big cog glimpsed inside the opened plates
    const gcx = Math.round(cx) - 2, gcy = Math.round(cy) - 3 + drop;
    L.ellipse(gcx + 2, gcy + 2, 4.2, 4.2, O); L.ellipse(gcx + 2, gcy + 2, 3.2, 3.2, PAL.gb3); L.rect(gcx + 1, gcy + 1, 3, 3, PAL.gb1); L.set(gcx + 2, gcy + 2, PAL.gb5);
    for (const [dx, dyy] of [[-5, 2], [7, 2], [2, -5], [2, 7]]) L.rect(gcx + 2 + dx - (dx < 0 ? 0 : 0), gcy + 2 + dyy, 1, 1, PAL.gb4);
  }
  // eyes
  const ey = Math.round(cy) - 1;
  const eyeL = Math.round(cx) - 8, eyeR = Math.round(cx) + 5;
  const sh = split ? -split : 0, sr = split ? split : 0;
  if (glow === 'on') { L.rect(eyeL + sh, ey - 1, 4, 6, PAL.cy3); L.rect(eyeL + 1 + sh, ey, 2, 4, PAL.cy4); L.clear(eyeL + sh, ey - 1); L.clear(eyeL + 3 + sh, ey - 1); L.clear(eyeL + sh, ey + 4); L.clear(eyeL + 3 + sh, ey + 4); }
  else if (glow === 'dim') { L.rect(eyeL + sh + 1, ey, 2, 4, PAL.cy2); L.rect(eyeL + sh, ey + 1, 4, 2, PAL.cy1); }
  else if (glow === 'spark') { L.rect(eyeL + sh + 1, ey + 1, 2, 2, PAL.cy1); }
  if (button) {
    const bx = eyeR + 1 + sr;
    L.ellipse(bx + 1.5, ey + 1.5, 3.4, 3.4, O);
    L.ellipse(bx + 1.5, ey + 1.5, 2.8, 2.8, PAL.sand3);
    L.ellipse(bx + 2, ey + 2, 2, 2, PAL.sand2);
    L.set(bx + 1, ey + 1, O); L.set(bx + 3, ey + 2, O);
    L.set(bx + 1, ey + 2, PAL.sand1); L.set(bx + 2, ey + 1, PAL.sand1);
  }
  if (ticks) {
    for (const s2 of [-1, 1]) { L.line(Math.round(cx + s2 * 17), Math.round(cy) - 2, Math.round(cx + s2 * 19), Math.round(cy) - 4 - ticks, PAL.gb5); L.line(Math.round(cx + s2 * 18), Math.round(cy) + 1, Math.round(cx + s2 * 20), Math.round(cy) + 1 - ticks, PAL.gb4); }
  }
  if (smear) {
    for (let k = 0; k < 4; k++) {
      const y = Math.round(cy - H / 2 + 3 + k * 3.5);
      const x1 = Math.round(cx - rx - 2);
      L.line(Math.max(1, x1 - [9, 6, 10, 5][(k + smear) % 4]), y, x1, y, k % 2 ? PAL.gb3 : PAL.gb4);
    }
  }
  if (cogs) {
    const dirs = [[-1, -1], [1, -1], [-1.4, 0.2], [1.4, 0.2]];
    dirs.forEach(([dx, dyy], k) => {
      const d = cogs * (4 + k % 2 * 2);
      const gx = Math.round(cx - 2 + dx * d), gy = Math.round(cy - 2 + dyy * d);
      if (gx > 1 && gx < 42 && gy > 1 && gy < 42) gear(L, gx, gy, k % 2 ? PAL.sand2 : PAL.gb4);
    });
  }
  return L;
}

export const warden = (() => {
  const s = new Sheet('warden', 48, 48);
  const put = (img, p) => { clampBorder.tag = 'warden' + JSON.stringify(p).replace(/ /g, ''); img.blit(clampBorder(drawWarden(p))); };
  s.anim('idle', 4, (img, i) => put(img, { a: [0.3, 0.9, 1.5, 2.2][i], sy: [0, 0, -1, 0][i], sx: [0, 0, 1, 0][i], ox: 0, dy: 0 }), { fps: 5 });
  s.anim('move', 6, (img, i) => put(img, {
    a: i * 0.5, ox: [-1, 0, 1, 1, 0, -1][i], dy: [0, -1, 0, 0, -1, 0][i],
    lf: [0, 3, 2, 0, 0, 0][i], rf: [0, 0, 0, 0, 3, 2][i], lfx: [0, 1, 1, 0, 0, 0][i], rfx: [0, 0, 0, 0, -1, -1][i],
  }), { fps: 10 });
  s.anim('windup', 4, (img, i) => put(img, { a: i * 2.1, ox: [-1, 1, -1, 1][i], dy: [0, -1, 0, -1][i], sx: [0, 1, 0, 1][i], ticks: i % 2 + 1, keyScale: 1 }), { fps: 10 });
  s.anim('charge', 3, (img, i) => put(img, { smear: i + 1, ox: [2, 3, 2][i], sy: [-5, -6, -4][i], sx: [5, 6, 4][i], a: i * 1.4, keyOff: -4, noKey: 0, glow: 'on' }), { fps: 14 });
  s.anim('attack', 5, (img, i) => put(img, [
    { sy: -2, sx: 2, ox: -1, a: 0.4 },
    { split: 2, a: 0.4, sy: 1 },
    { split: 5, drop: 0, cogs: 1, a: 0.8, sy: 2 },
    { split: 4, cogs: 2.2, a: 1.2, sy: 1 },
    { split: 1, a: 1.2, sy: -1, ox: 1 },
  ][i]), { fps: 10, loop: false });
  s.anim('hit', 2, (img, i) => {
    if (i === 0) img.blit(clampBorder(whiten(drawWarden({ sy: -3, sx: 3, ox: 1, a: 0.5 }))));
    else put(img, { sy: -1, sx: 1, ox: -1, a: 0.7, glow: 'dim' });
  }, { fps: 12, loop: false });
  s.anim('death', 10, (img, i) => {
    const poses = [
      { a: 1.0, glow: 'on', sy: -1 },
      { a: 1.4, glow: 'dim', sy: -2, sx: 1 },
      { a: 1.57, glow: 'dim', sy: -3, sx: 2, ox: 1 },
      { a: 1.57, glow: 'spark', sy: -3, sx: 2, split: 1, ox: 1, keyOff: 1 },
      { a: 1.57, glow: 'spark', sy: -3, sx: 2, split: 3, drop: 1, ox: 1, keyOff: 2 },
      { a: 1.57, glow: 'off', sy: -4, sx: 2, split: 4, drop: 1, ox: 1, keyOff: 3 },
      { a: 1.57, glow: 'off', sy: -4, sx: 2, split: 4, drop: 1, ox: 1, keyOff: 3 },
      { a: 1.57, glow: 'off', sy: -4, sx: 2, split: 4, drop: 1, ox: 1, keyOff: 3 },
      { a: 1.57, glow: 'off', sy: -4, sx: 2, split: 4, drop: 1, ox: 1, keyOff: 3 },
      { a: 1.57, glow: 'off', sy: -4, sx: 2, split: 4, drop: 1, ox: 1, keyOff: 3 },
    ];
    const base = clampBorder(drawWarden(poses[i]));
    const p = [0, 0, 0, 0, 0, 0.1, 0.3, 0.55, 0.8, 0.99][i];
    img.blit(p ? dissolve(base, p, { seed: 9, top: false, rise: 10, mote: 0.5, colors: [PAL.cy3, PAL.cy4, PAL.gb5, PAL.cy2] }) : base);
    if (i === 9) { img.set(18, 28, PAL.cy3); img.set(24, 22, PAL.cy4); }
  }, { fps: 8, loop: false });
  return s;
})();

// ================================================================ toyheart (64x64)
const SEEDS = [
  // unit x, unit y (up), ramp
  [-0.62, 0.62, R.pu], [0.55, 0.62, R.rose], [0.0, 0.75, R.heart], [-0.35, 0.0, R.sand],
  [0.45, 0.05, R.moss], [-0.1, -0.55, R.gb], [0.25, -0.3, R.heart], [-0.8, 0.0, R.heart], [0.85, 0.2, R.pu],
];

function heartIn(x, y) {
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
}

function drawHeart(p) {
  const { s = 21, dx = 0, bright = 0, burst = 0, w = 0, core = 2, keyA = 0.4, stitch = 1, stuff = 0, coreRise = 0, coreOnly = false } = p;
  const cx = 32 + dx, cy = 58 - s;
  const L = new Img(64, 64);
  const px = (u, v) => [cx + u * s, cy - v * s];
  // patch map
  const patch = new Int8Array(64 * 64).fill(-1);
  const shade = new Int8Array(64 * 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const u = (x - cx) / s, v = -(y - cy) / s;
      if (!heartIn(u, v)) continue;
      let best = 0, bd = 1e9;
      SEEDS.forEach(([sx, sy], k) => {
        const d = (u - sx) ** 2 + (v - sy) ** 2 + Math.sin(u * 7 + v * 5 + k) * 0.015;
        if (d < bd) { bd = d; best = k; }
      });
      patch[y * 64 + x] = best;
      const t = ((x - cx) / (s * 1.14)) * 0.6 + ((y - (cy - 0.1 * s)) / (s * 1.1)) * 0.8;
      shade[y * 64 + x] = t > 0.55 - bright * 0.3 ? 0 : t < -0.35 - bright * 0.2 ? 2 : 1;
    }
  }
  const offs = SEEDS.map(([sx, sy]) => {
    const len = Math.hypot(sx, sy) || 1;
    return [Math.round((sx / len) * burst), Math.round(-(sy / len) * burst)];
  });
  const off = (k) => (burst ? offs[k] : [0, 0]);
  // toy bits poking out behind (teddy ear)
  const [ex, ey] = px(-0.95, 1.12);
  const ear = off(0);
  shadeEllipse(L, ex + ear[0], ey + ear[1], 5.2, 5.2, R.sand);
  L.ellipse(ex + 0.5 + ear[0], ey + 1 + ear[1], 2, 2, PAL.rose2);
  // key
  const [kx, ky] = px(0.8, 0.95);
  windKey(L, Math.round(Math.min(kx + 2, 52 + dx)), Math.round(ky - 4), keyA, 1.3, [Math.round(kx - 4), Math.round(ky + 6)]);
  // body
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const k = patch[y * 64 + x];
      if (k < 0 || coreOnly) continue;
      const ramp = SEEDS[k][2];
      const [ox, oy] = off(k);
      let c = ramp[shade[y * 64 + x]];
      if (bright && shade[y * 64 + x] === 1) c = ramp[2];
      // stitched seam where the patch changes
      const k2 = patch[y * 64 + x + 1], k3 = patch[(y + 1) * 64 + x];
      if ((k2 >= 0 && k2 !== k) || (k3 >= 0 && k3 !== k)) c = (x + y) % 3 === 0 ? PAL.sand2 : PAL.heart1;
      L.set(x + ox, y + oy, c);
    }
  }
  // ribbon bow sewn into the notch
  if (!coreOnly) {
    const [bx, by] = px(0.0, 1.12), bo2 = off(2);
    for (const sgn of [-1, 1]) shadeEllipse(L, bx + sgn * 4 + bo2[0], by - 0.5 + bo2[1], 3.6, 2.6, R.rose);
    L.rect(Math.round(bx) - 1 + bo2[0], Math.round(by) - 1 + bo2[1], 3, 3, PAL.heart1);
  }
  // torn seam with the core
  const [t0x, t0y] = px(-0.34, 0.34), [t1x, t1y] = px(0.2, -0.22);
  const tear = new Img(64, 64);
  if (!coreOnly) {
    for (let t = 0; t <= 1.001; t += 0.02) {
      const x = lerp(t0x, t1x, t), y = lerp(t0y, t1y, t);
      const hw = w * Math.pow(Math.sin(Math.PI * Math.min(0.98, t + 0.01)), 0.7) * 0.5 + 0.6;
      tear.ellipse(x, y, hw, hw, O);
    }
  }
  const [cox, coy] = px(-0.06, 0.06);
  const cyp = coy - coreRise;
  // inside the tear: core
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (!tear.alpha(x, y) && !coreOnly) continue;
      const d = Math.hypot(x - cox, y - cyp);
      if (d < core * 0.55) L.set(x, y, PAL.cy4);
      else if (d < core * 0.85) L.set(x, y, PAL.cy3);
      else if (d < core * 1.2) L.set(x, y, PAL.cy2);
      else if (!coreOnly) L.set(x, y, O);
    }
  }
  if (!coreOnly) {
    // stuffing at the tear lips and stitches across it
    for (let t = 0.1; t < 0.95; t += 0.1) {
      const x = lerp(t0x, t1x, t), y = lerp(t0y, t1y, t);
      if (hash(Math.round(x), Math.round(y), 4) < 0.6) L.set(Math.round(x - 2 - w * 0.4), Math.round(y - 1), PAL.pu5);
    }
    if (stitch) for (const t of [0.2, 0.8]) { const x = Math.round(lerp(t0x, t1x, t)), y = Math.round(lerp(t0y, t1y, t)); L.line(x - 2, y - 2, x + 2, y + 2, PAL.sand2); L.line(x - 2, y + 2, x + 2, y - 2, PAL.sand2); }
  }
  L.outline();
  if (!coreOnly) {
    // button, block letter, wheel on top of the patchwork
    const bt = px(-0.5, 0.42);
    const bo = off(3);
    const bX = Math.round(bt[0] + bo[0]), bY = Math.round(bt[1] + bo[1]);
    L.ellipse(bX, bY, 3.6, 3.6, O); L.ellipse(bX, bY, 3, 3, PAL.gb5); L.ellipse(bX + 0.5, bY + 0.5, 2, 2, PAL.gb4);
    L.set(bX - 1, bY - 1, O); L.set(bX + 1, bY - 1, O); L.set(bX - 1, bY + 1, O); L.set(bX + 1, bY + 1, O);
    const bl = px(0.52, 0.5), blo = off(4);
    const lX = Math.round(bl[0] + blo[0]) - 4, lY = Math.round(bl[1] + blo[1]) - 4;
    L.rect(lX - 1, lY - 1, 10, 10, O); L.rect(lX, lY, 8, 8, PAL.sand3); L.rect(lX, lY + 7, 8, 1, PAL.sand1); L.rect(lX + 7, lY, 1, 8, PAL.sand1);
    L.pixels(lX + 1, lY + 1, ['.XXX.', 'X...X', 'XXXXX', 'X...X', 'X...X'], { X: PAL.heart2 });
    const wh = px(0.12, -0.42), who = off(6);
    const wX = Math.round(wh[0] + who[0]), wY = Math.round(wh[1] + who[1]);
    L.ellipse(wX, wY, 5, 5, O); L.ellipse(wX, wY, 4.2, 4.2, PAL.gb2); L.ellipse(wX, wY, 3, 3, PAL.gb3);
    L.line(wX - 3, wY, wX + 3, wY, PAL.gb5); L.line(wX, wY - 3, wX, wY + 3, PAL.gb5);
    L.rect(wX - 1, wY - 1, 3, 3, PAL.gb1); L.set(wX, wY, PAL.gb4);
    if (stuff) for (let k = 0; k < stuff; k++) {
      const a = k * 2.4 + stuff * 0.5;
      const rr = 24 + k * 2 + stuff * 0.6;
      const x = Math.round(32 + Math.cos(a) * rr * 1.05), y = Math.round(34 + Math.sin(a) * rr * 0.8 - stuff);
      if (x > 2 && x < 61 && y > 2 && y < 61) { L.set(x, y, PAL.pu5); L.set(x + 1, y, PAL.white); L.set(x, y + 1, PAL.pu5); }
    }
  }
  return L;
}

export const toyheart = (() => {
  const s = new Sheet('toyheart', 64, 64);
  const put = (img, p) => img.blit(clampBorder(drawHeart(p)));
  s.anim('idle', 4, (img, i) => put(img, { s: [22, 22.6, 23.2, 22.4][i], w: 2.5, core: 2.8, keyA: 0.3 + i * 0.5 }), { fps: 5 });
  s.anim('beat', 4, (img, i) => put(img, [
    { s: 20.5, w: 1.5, core: 2, keyA: 0.3 },
    { s: 24.3, bright: 1, w: 4, core: 4, keyA: 1.0 },
    { s: 23.2, bright: 1, w: 3, core: 3.4, keyA: 1.5 },
    { s: 22, w: 2.5, core: 2.8, keyA: 2.0 },
  ][i]), { fps: 10, loop: false });
  s.anim('open', 5, (img, i) => put(img, {
    s: [22, 22.6, 23, 22.6, 23][i], dx: [0, -1, 1, -1, 0][i], w: [3, 5, 7, 8.5, 9][i], core: [2.5, 3.5, 4.5, 5.5, 6][i],
    stitch: 0, stuff: [0, 1, 2, 3, 4][i], bright: i > 2 ? 1 : 0, keyA: i * 0.4,
  }), { fps: 9, loop: false });
  s.anim('hit', 2, (img, i) => {
    if (i === 0) img.blit(clampBorder(whiten(drawHeart({ s: 20, dx: 1 }))));
    else put(img, { s: 20.5, dx: -1, w: 3, core: 2.5 });
  }, { fps: 12, loop: false });
  s.anim('death', 10, (img, i) => {
    const bursts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8];
    const p = [0, 0, 0, 0.05, 0.15, 0.3, 0.5, 0.75, 1, 1][i];
    const base = clampBorder(drawHeart({ s: 22 - Math.min(i, 5) * 0.2, burst: bursts[i], w: 4 + i, core: 3 + Math.min(i, 5) * 0.4, stitch: 0, stuff: i, dx: i < 4 ? (i % 2 ? 1 : -1) : 0, bright: i > 2 ? 1 : 0 }));
    img.blit(p < 1 ? (p ? dissolve(base, p, { seed: 31, top: false, rise: 10, mote: 0.5, colors: [PAL.pu5, PAL.cy3, PAL.rose3, PAL.cy4] }) : base) : new Img(64, 64));
    // the core rises as light and fades
    if (i >= 4) {
      const rise = (i - 3) * 5;
      const r = [0, 0, 0, 0, 4, 4.5, 4, 3, 2.2, 1][i];
      const cyc = 38 - rise;
      img.ellipse(32, cyc, r, r, PAL.cy2 + (i >= 8 ? '' : ''));
      img.ellipse(32, cyc, r * 0.6, r * 0.6, PAL.cy4);
      if (i >= 6) for (const [dx, dy] of [[-4, 3], [5, 5], [-2, 8], [3, -3]]) img.set(32 + dx, cyc + dy, PAL.cy3);
    }
  }, { fps: 8, loop: false });
  return s;
})();

export const sheets = { clump: () => clump, warden: () => warden, toyheart: () => toyheart };
