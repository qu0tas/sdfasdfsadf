// `fx2` sheet: effects for the enemies' signature attacks.
import { PAL, Sheet } from './lib.mjs';

const s = new Sheet('fx2', 24, 24);

// A piece of the eye's beam. It runs left to right across the whole cell so pieces join end to end.
s.anim('beam', 4, (img, i) => {
  const half = [2, 3, 2, 1][i];
  for (let x = 0; x < 24; x++) {
    const wob = (x + i * 3) % 6 < 3 ? 0 : 1;
    for (let d = -half - 1; d <= half + 1; d++) {
      const a = Math.abs(d);
      const y = 12 + d;
      if (a > half) img.set(x, y + (d < 0 ? wob - 1 : 1 - wob) * 0, PAL.rose1 + '90');
      else if (a === half) img.set(x, y, PAL.rose2);
      else if (a >= half - 1) img.set(x, y, PAL.rose3);
      else img.set(x, y, PAL.white);
    }
    if (wob) img.set(x, 12 - half - 2, PAL.rose2 + '80');
    else img.set(x, 12 + half + 2, PAL.rose2 + '80');
  }
}, { fps: 14 });

// The thin sighting line shown before the beam fires.
s.anim('aim', 4, (img, i) => {
  for (let x = 0; x < 24; x++) if ((x + i * 2) % 8 < 5) img.set(x, 12, PAL.rose3 + 'c0');
}, { fps: 12 });

// Roots bursting out of the floor and sinking back.
s.anim('spike', 6, (img, i) => {
  const rise = [3, 9, 13, 12, 7, 2][i];
  const spikes = [[8, 1], [12, 0], [16, 2], [10, 3], [14, 4]];
  img.ellipse(12, 19, 8, 2.5, PAL.ink + '70');
  for (const [x, cut] of spikes) {
    const h = Math.max(0, rise - cut * 2);
    for (let k = 0; k < h; k++) {
      const y = 19 - k;
      const w = k > h - 3 ? 0 : 1;
      for (let dx = -w; dx <= w; dx++) img.set(x + dx, y, dx < 0 ? PAL.moss2 : PAL.moss1);
      img.set(x - w - 1, y, PAL.outline);
      img.set(x + w + 1, y, PAL.outline);
    }
    if (h > 0) {
      img.set(x, 19 - h, PAL.outline);
      img.set(x, 20 - h, PAL.moss3);
    }
  }
}, { fps: 14, loop: false });

// A sticky puddle left by a blob.
s.anim('slime', 4, (img, i) => {
  const rx = [8, 8.5, 9, 8.5][i];
  img.ellipse(12, 13, rx + 1, 5.5, PAL.pu1 + 'b0');
  img.ellipse(12, 13, rx, 4.5, PAL.pu2 + 'd0');
  img.ellipse(10 + (i % 2), 12, 3, 1.5, PAL.pu3 + 'c0');
  img.set(15, 14 - (i % 2), PAL.pu4 + 'c0');
}, { fps: 4 });

export const sheets = [s];
