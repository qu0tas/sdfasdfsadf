import { PAL, Img, Sheet } from './lib.mjs';
import { R, shadeEllipse, shadeRRect, shadeShape, dissolve, hash, clampBorder } from './char-lib.mjs';

const O = PAL.outline;

// ================================================================ merchant (32x32)
function drawMerchant(p) {
  const { sy = 0, sx = 0, yawn = 0, eyes = 'half', dy = 0, cap = 0, tilt = 0 } = p;
  const L = new Img(32, 32);
  const w = 22 + sx, x0 = Math.round(16 - w / 2);
  const h = 15 + sy, bot = 27;
  const y0 = bot - h + 1 + dy;
  // feet
  L.ellipse(11, 27.8, 2.2, 1.5, PAL.rose1);
  L.ellipse(21, 27.8, 2.2, 1.5, PAL.rose1);
  // nightcap (behind/above pillow)
  const capBase = y0 + 1 + tilt;
  for (let r = 0; r < 11; r++) {
    const width = Math.round(14 - r * 0.95);
    const centre = 15 + Math.round(r * 0.35) + Math.round(cap * r / 10);
    const y = capBase - r;
    const ramp = R.rose;
    for (let x = centre - Math.floor(width / 2); x < centre - Math.floor(width / 2) + width; x++) {
      const t = (x - centre) / (width / 2 + 0.1);
      L.set(x, y, t > 0.4 ? ramp[0] : t < -0.35 ? ramp[2] : ramp[1]);
    }
  }
  const tipx = 15 + 4 + cap, tipy = capBase - 10;
  shadeEllipse(L, tipx + 2, tipy + 3, 2.3, 2.3, R.sand);
  shadeRRect(L, 8, capBase, 16, 3, 1.4, R.sand);
  // pillow
  shadeRRect(L, x0, y0, w, h, 5, R.puL);
  for (const [cx, cy] of [[x0, y0], [x0 + w - 1, y0], [x0, y0 + h - 1], [x0 + w - 1, y0 + h - 1]]) {
    shadeEllipse(L, cx + (cx === x0 ? -0.5 : 0.5), cy + (cy === y0 ? -0.5 : 0.5), 1.6, 1.6, R.sand, { spark: false });
  }
  L.outline();
  // stitched edge
  for (let x = x0 + 3; x < x0 + w - 3; x += 2) { L.set(x, y0 + 2, PAL.pu4); L.set(x, y0 + h - 3, PAL.pu2); }
  // face
  const ey = y0 + 4 + tilt;
  for (const ex of [10, 19]) {
    if (eyes === 'half') {
      L.rect(ex, ey, 3, 1, O); L.rect(ex, ey + 1, 3, 1, PAL.pu1); L.set(ex + 1, ey + 1, PAL.cy3);
    } else if (eyes === 'closed') {
      L.set(ex, ey + 1, O); L.rect(ex + 1, ey + 2, 1, 1, O); L.set(ex + 2, ey + 1, O);
      L.rect(ex, ey + 1, 3, 1, O);
    } else {
      L.rect(ex, ey, 3, 3, PAL.pu1); L.set(ex + 1, ey + 1, PAL.cy3);
    }
    L.rect(ex - (ex < 15 ? 1 : -1), ey + 3, 2, 1, PAL.rose2);
  }
  L.set(15, ey + 2, PAL.rose2); L.set(16, ey + 2, PAL.rose2);
  const my = ey + 5;
  if (yawn === 0) L.rect(15, my, 2, 1, PAL.pu1);
  else if (yawn === 1) { L.rect(14, my - 1, 4, 3, O); L.rect(15, my, 2, 1, PAL.rose2); }
  else { L.rect(14, my - 1, 5, 4, O); L.rect(15, my + 1, 3, 1, PAL.rose2); L.clear(14, my - 1); L.clear(18, my - 1); L.set(14, my - 1, PAL.pu1); L.set(18, my - 1, PAL.pu1); }
  return L;
}

export const merchant = (() => {
  const s = new Sheet('merchant', 32, 32);
  s.anim('idle', 6, (img, i) => {
    img.blit(clampBorder(drawMerchant([
      { sy: 0, cap: 0 }, { sy: 0, cap: 0, sx: 0 }, { sy: 1, cap: 1, sx: -1 }, { sy: 1, cap: 1, sx: -1 },
      { sy: 1, yawn: 1, eyes: 'closed', cap: 1, sx: -1 }, { sy: 2, yawn: 2, eyes: 'closed', cap: 2, sx: -1 },
    ][i])));
  }, { fps: 5 });
  s.anim('nod', 4, (img, i) => {
    img.blit(clampBorder(drawMerchant([
      { sy: -1, tilt: 1, eyes: 'closed', sx: 1, cap: -1 },
      { sy: -2, tilt: 2, eyes: 'closed', sx: 2, cap: -2 },
      { sy: -1, tilt: 1, eyes: 'closed', sx: 1, cap: 0 },
      { sy: 0, eyes: 'half', cap: 1 },
    ][i])));
  }, { fps: 8, loop: false });
  return s;
})();

// ================================================================ jack in the box (48x48)
const BX = 11, BW = 26; // box x range

function crank(L, phase, dy) {
  const cx = 38, cy = 36 + dy;
  const a = (phase * Math.PI) / 2;
  const kx = cx + Math.round(Math.cos(a) * 4), ky = cy + Math.round(Math.sin(a) * 4);
  L.rect(cx - 1, cy - 1, 3, 3, PAL.sand1);
  L.line(cx, cy, kx, ky, PAL.sand2);
  L.line(cx + 1, cy, kx + 1, ky, PAL.sand2);
  L.ellipse(kx, ky, 1.6, 1.6, PAL.sand3);
}

function boxFront(p) {
  const { dy = 0, sq = 0, split = 0, shake = 0, ph = 0 } = p;
  const I = new Img(48, 48);
  const top = 28 + dy + sq, bot = 44 + dy;
  const x0 = BX + shake;
  shadeRRect(I, x0, top, BW, bot - top + 1, 3, R.pu);
  // panel ornaments
  const cy = Math.round((top + bot) / 2);
  I.rect(x0 + 3, cy - 1, BW - 6, 3, PAL.rose2);
  I.rect(x0 + 3, cy - 1, BW - 6, 1, PAL.rose3);
  I.rect(x0 + 3, cy + 1, BW - 6, 1, PAL.rose1);
  for (let x = x0 + 5; x < x0 + BW - 4; x += 4) {
    I.pixels(x, cy - 3, ['.X.', 'XXX', '.X.'], { X: PAL.sand2 });
    I.pixels(x, cy + 3, ['.X.', 'XXX', '.X.'], { X: PAL.pu4 });
  }
  I.rect(x0 + 1, top + 1, 2, bot - top - 1, PAL.pu1); // corner shadow edge
  if (split) {
    for (let y = top; y <= bot; y++) { I.clear(x0 + 12, y); I.clear(x0 + 13, y); I.set(x0 + 12 - split, y, O); }
  }
  I.outline();
  crank(I, ph, dy);
  I.outline();
  return I;
}

function lidShape(p) {
  const { dy = 0, sq = 0, lid = 0, shake = 0 } = p; // lid: 0 closed, 1 ajar, 2 open (hinged up at back)
  const I = new Img(48, 48);
  const x0 = BX - 1 + shake;
  const y = 24 + dy + sq;
  if (lid === 0) shadeRRect(I, x0, y, BW + 2, 5, 2, R.rose);
  else if (lid === 1) { shadeRRect(I, x0 - 1, y - 3, BW + 2, 5, 2, R.rose); }
  else { shadeRRect(I, x0 - 5, y - 11, 5, 14, 2, R.rose); }
  I.outline();
  return I;
}

function spring(I, x0, y0, x1, y1, coils, sag = 0) {
  const n = coils * 2;
  let px = x0, py = y0;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const x = x0 + (x1 - x0) * t + (k % 2 ? 4 : -4) * (1 - t * 0.2) + (k === n ? 0 : 0);
    const y = y0 + (y1 - y0) * t + sag * Math.sin(t * Math.PI);
    I.line(px, py, Math.round(x), Math.round(y), PAL.gb3);
    I.line(px + 1, py, Math.round(x) + 1, Math.round(y), PAL.gb4);
    px = Math.round(x); py = Math.round(y);
  }
  I.line(px, py, x1, y1, PAL.gb3);
}

function jackHead(I, cx, cy, mood = 0, tilt = 0) {
  // jester hat horns
  shadeEllipse(I, cx - 6 + tilt, cy - 7, 3, 3, R.rose);
  shadeEllipse(I, cx + 6 + tilt, cy - 7, 3, 3, R.puL);
  shadeEllipse(I, cx - 8 + tilt, cy - 9, 1.6, 1.6, R.sand, { spark: false });
  shadeEllipse(I, cx + 8 + tilt, cy - 9, 1.6, 1.6, R.sand, { spark: false });
  shadeEllipse(I, cx, cy, 8, 7.5, [PAL.pu3, PAL.pu5, PAL.white, PAL.white]);
  I.outline();
  // hollow pale eyes: dark sockets with a pale glint, uneven
  I.ellipse(cx - 3, cy - 1, 2, 2.2, O);
  I.ellipse(cx + 3, cy - 2, 1.8, 1.6, O);
  I.set(cx - 3, cy - 1, PAL.cy3); I.set(cx - 3, cy - 2, PAL.cy4);
  I.set(cx + 3, cy - 2, PAL.cy2);
  if (mood === 1) { I.rect(cx - 5, cy - 4, 4, 1, O); I.rect(cx + 2, cy - 5, 4, 1, O); }
  // slightly wrong stitched smile: higher on the left, runs past the cheek on the right
  const sm = [[-5, 3], [-4, 4], [-3, 5], [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5], [3, 4], [4, 4], [5, 3], [6, 2]];
  sm.forEach(([dx, dy2]) => I.set(cx + dx, cy + dy2, O));
  for (const dx of [-3, -1, 1, 3, 5]) { I.set(cx + dx, cy + 4 + (dx > 2 ? -1 : 0), PAL.rose1); I.set(cx + dx, cy + 6 + (dx > 2 ? -1 : 0), PAL.rose1); }
  I.set(cx - 6, cy + 1, PAL.rose2); I.set(cx - 7, cy + 1, PAL.rose2); I.set(cx + 6, cy + 1, PAL.rose2);
}

export function drawJack(p) {
  const { head = null, lid = 0, dy = 0, sq = 0, shake = 0, ph = 0, split = 0, headMood = 0, hx = 0, springCoils = 3, sag = 0, tilt = 0, lidDx = 0, lidDy = 0 } = p;
  const L = new Img(48, 48);
  const back = new Img(48, 48);
  if (lid === 2) back.blit(lidShape({ dy, sq, lid: 2, shake: shake + lidDx }));
  L.blit(back);
  if (head !== null) {
    const S = new Img(48, 48);
    const top = 28 + dy + sq;
    spring(S, 24 + shake, top + 1, 24 + hx, head + 7, springCoils, sag);
    S.outline();
    L.blit(S);
    const H = new Img(48, 48);
    jackHead(H, 24 + hx, head, headMood, tilt);
    L.blit(H);
  }
  L.blit(boxFront({ dy, sq, split, shake, ph }));
  if (lid < 2) {
    const lidImg = lidShape({ dy, sq, lid, shake });
    if (lidDx || lidDy) { const m = new Img(48, 48); m.blit(lidImg, lidDx, lidDy); L.blit(m); } else L.blit(lidImg);
  }
  return L;
}

export const jack = (() => {
  const s = new Sheet('jack', 48, 48);
  const put = (img, p) => img.blit(clampBorder(drawJack(p)));
  s.anim('idle', 4, (img, i) => put(img, { shake: [0, -1, 0, 1][i], ph: i, sq: [0, 0, 1, 0][i], dy: 0 }), { fps: 6 });
  s.anim('move', 4, (img, i) => put(img, [
    { dy: 0, sq: 2, ph: 0 }, { dy: -5, sq: -2, ph: 1 }, { dy: -7, sq: -2, ph: 2 }, { dy: -1, sq: 2, ph: 3 },
  ][i]), { fps: 10 });
  s.anim('attack', 6, (img, i) => put(img, [
    { shake: -1, sq: 1, ph: 0 },
    { shake: 1, lid: 1, sq: 0, ph: 1, dy: -1 },
    { lid: 2, head: 24, hx: 1, springCoils: 2, ph: 2, headMood: 1 },
    { lid: 2, head: 13, hx: 0, springCoils: 5, ph: 3, headMood: 1, lidDx: -1 },
    { lid: 2, head: 14, hx: 5, springCoils: 5, ph: 0, sag: 3, tilt: 1 },
    { lid: 2, head: 16, hx: -4, springCoils: 5, ph: 1, sag: -3, tilt: -1 },
  ][i]), { fps: 10, loop: false });
  s.anim('hit', 2, (img, i) => {
    const d = drawJack(i === 0 ? { shake: 1, sq: 2 } : { shake: -1, sq: 1, dy: 0 });
    if (i === 0) img.blit(clampBorder(d.clone().map((x, y, c) => (c[0] + c[1] + c[2] < 110 ? null : PAL.gb5))));
    else img.blit(clampBorder(d));
  }, { fps: 12, loop: false });
  s.anim('death', 8, (img, i) => {
    const poses = [
      { lid: 2, head: 22, hx: 3, springCoils: 3, sag: 2, headMood: 0, tilt: 1 },
      { lid: 2, head: 27, hx: 7, springCoils: 2, sag: 4, tilt: 2 },
      { lid: 2, head: 30, hx: 9, springCoils: 2, sag: 5, split: 1, lidDx: 2 },
      { lid: 2, head: 33, hx: 9, springCoils: 1, sag: 5, split: 2, sq: 2, lidDx: 3 },
      { lid: 2, head: 34, hx: 9, springCoils: 1, sag: 4, split: 3, sq: 3, shake: 1 },
      { lid: 2, head: 35, hx: 9, springCoils: 1, split: 4, sq: 4 },
      { lid: 2, head: 35, hx: 9, springCoils: 1, split: 4, sq: 4 },
      { lid: 2, head: 35, hx: 9, springCoils: 1, split: 4, sq: 4 },
    ];
    const base = clampBorder(drawJack(poses[i]));
    const p = [0, 0, 0.12, 0.3, 0.5, 0.7, 0.9, 1][i];
    img.blit(dissolve(base, p, { seed: 21, top: false, rise: 8, mote: 0.5, colors: [PAL.cy3, PAL.pu5, PAL.cy4, PAL.rose3] }));
    if (i === 7) { img.set(24, 38, PAL.cy3); img.set(27, 34, PAL.cy4); }
  }, { fps: 9, loop: false });
  return s;
})();

export const sheets = { merchant: () => merchant, jack: () => jack };
