// `shots`, `fx` and `boom` sheets.
import { Img, PAL, Sheet } from './lib.mjs';
import { ball, hash, rng, sprite } from './world-util.mjs';
import { glint, halo, poly, rotShape, shearTop, starPts, inHeart } from './world-shapes.mjs';

const TAU = Math.PI * 2;
const A = (c, a) => PAL[c] + a; // alpha variant of a palette colour

// ---------------------------------------------------------------- shots
const shots = (() => {
  const s = new Sheet('shots', 16, 16);
  const S = (name, fn) => s.anim(name, 4, (img, i) => fn(img, i), { fps: 10 });

  S('tear', (img, i) => {
    const hr = [2.6, 2.9, 2.4, 2.3][i];
    const tail = [3.5, 4.5, 3, 2.8][i];
    const wob = [0, 0.6, 0, -0.6][i];
    sprite(img, (t) => {
      rotShape(t, 8, 8, 0, (u, v) => {
        const head = (u - 1) ** 2 + v ** 2 <= hr * hr;
        const w = Math.max(0, ((u + tail) / (tail + 0.5)) * hr * 0.95);
        const inTail = u < 1 && u > -tail && Math.abs(v - wob * (1 + u / tail)) <= w;
        if (!head && !inTail) return null;
        if (u > -1.6 && u < 1.2 && v < -0.8) return PAL.cy4;
        return v > 1 || u < -1.5 ? PAL.cy2 : PAL.cy3;
      });
    });
  });

  S('note', (img, i) => {
    const sw = [0, 1, 0, -1][i];
    sprite(img, (t) => {
      t.ellipse(6.5, 11, 2.8, 2.1, PAL.cy3);
      t.set(5, 10, PAL.white);
      t.set(6, 10, PAL.white);
      t.line(9, 10, 9 + sw, 3, PAL.cy3);
      t.line(10, 10, 10 + sw, 3, PAL.cy2);
      const fx = 10 + sw;
      t.line(fx, 3, fx + 2, 5 + [0, 1, 1, 0][i], PAL.cy3);
      t.line(fx, 5, fx + 2, 7 + [0, 1, 1, 0][i], PAL.cy3);
    });
  });

  S('tooth', (img, i) => {
    sprite(img, (t) => {
      rotShape(t, 8, 8, (i * Math.PI) / 2 + 0.3, (u, v) => {
        const crown = (u / 4) ** 2 + ((v + 0.6) / 2.8) ** 2 <= 1;
        const root = v > 0.6 && v <= 4.4 && Math.abs(Math.abs(u) - 1.8) <= 0.8;
        if (!crown && !root) return null;
        if (crown && u < -0.8 && v < -0.6) return PAL.white;
        return v > 0.4 || u > 1.6 ? PAL.gb4 : PAL.gb5;
      });
    });
  });

  S('bubble', (img, i) => {
    const rx = i % 2 ? 4.6 : 5.1;
    const ry = i % 2 ? 5.1 : 4.6;
    const a = (-2.4 + i * 0.5) % TAU;
    sprite(
      img,
      (t) => {
        for (let y = 2; y <= 14; y++) {
          for (let x = 2; x <= 14; x++) {
            const d = Math.hypot((x - 8) / rx, (y - 8) / ry);
            if (d <= 1.02 && d > 0.72) t.set(x, y, d > 0.9 && x > 8 && y > 8 ? PAL.cy2 : PAL.cy3);
            else if (d <= 0.72) t.set(x, y, A('cy3', '28'));
          }
        }
        t.set(8 + Math.cos(a) * 3.2, 8 + Math.sin(a) * 3.2, PAL.white);
        t.set(8 + Math.cos(a + 0.35) * 3.2, 8 + Math.sin(a + 0.35) * 3.2, PAL.white);
      },
      { outline: PAL.outline },
    );
  });

  S('bear', (img, i) => {
    sprite(img, (t) => {
      ball(t, 4.5, 4, 2, 1.9, [PAL.sand1, PAL.sand2, PAL.sand3]);
      ball(t, 11.5, 4, 2, 1.9, [PAL.sand1, PAL.sand2, PAL.sand3]);
      t.set(4, 4, PAL.rose2);
      t.set(11, 4, PAL.rose2);
      ball(t, 8, 8.5, 4.6, 4.2, [PAL.sand1, PAL.sand2, PAL.sand3]);
      t.ellipse(8, 10.5, 2, 1.4, PAL.sand3);
      t.set(8, 10, PAL.ink);
      t.set(6, 8, PAL.ink);
      t.set(10, 8, PAL.ink);
      t.set(5, 9 + (i % 2), PAL.rose2);
      shearTop(t, 8, [-1, 0, 1, 0][i] * 1.4);
    });
  });

  S('chord', (img, i) => {
    const p = [0, 1, 2, 1][i];
    sprite(img, (t) => {
      t.ellipse(4.5, 11.5, 2.6 + p * 0.1, 2, PAL.cy3);
      t.ellipse(10.5, 10.5, 2.6 + p * 0.1, 2, PAL.cy3);
      t.set(3, 11, PAL.white);
      t.set(9, 10, PAL.white);
      t.rect(6, 3, 1, 9, PAL.cy3);
      t.rect(12, 2, 1, 9, PAL.cy3);
      poly(t, [[6, 3], [13, 1], [13, 3], [6, 5]], PAL.cy4);
      t.line(6, 3, 13, 1, PAL.white);
    });
    halo(img, 8, 8, 6 + p * 0.6, 6, A('cy3', ['20', '30', '40', '30'][i]));
  });

  S('star', (img, i) => {
    const R = [5, 5.5, 4.7, 4.4][i];
    sprite(img, (t) => {
      poly(t, starPts(8, 8.4, R, R * 0.48, -Math.PI / 2 + [0, 0.12, 0.22, -0.12][i]), (x, y) => (x + y < 16 ? PAL.cy4 : PAL.cy3));
      t.set(8, 8, PAL.white);
    });
    if (i === 1 || i === 3) glint(img, [3, 0, 13, 0][i] || 3, [3, 0, 12, 0][i] || 3, 1, PAL.cy3, PAL.cy4);
    if (i === 3) glint(img, 13, 3, 1, PAL.cy3, PAL.cy4);
  });

  S('orb', (img, i) => {
    const r = [3.2, 3.7, 3.45, 2.8][i];
    sprite(img, (t) => {
      ball(t, 8, 8, r, r, [PAL.pu2, PAL.rose2, PAL.rose3], { lightCut: -0.7 });
      t.ellipse(8, 8, r * 0.42, r * 0.42, PAL.ink);
      if (i === 1) t.set(8 - 2, 8 - 2, PAL.rose3);
    });
  });

  S('static', (img, i) => {
    const r = rng(500 + i * 31);
    const cols = [PAL.ink, PAL.gb2, PAL.gb4, PAL.white, PAL.gb1, PAL.gb3];
    const cut = [[-1, -1], [1, 1], [1, -1], [-1, 1]][i];
    sprite(img, (t) => {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (dx === cut[0] * 3 && dy === cut[1] * 3) continue;
          if (r() < 0.12 && (Math.abs(dx) === 3 || Math.abs(dy) === 3)) continue;
          t.set(8 + dx, 8 + dy, cols[Math.floor(r() * r() * cols.length)]);
        }
      }
    });
  });

  S('cog', (img, i) => {
    sprite(img, (t) => {
      rotShape(t, 8, 8, (i * Math.PI) / 16, (u, v) => {
        const r = Math.hypot(u, v);
        const a = Math.atan2(v, u);
        const tooth = Math.cos(a * 8) > 0.15;
        if (r > 4.8 || (r > 3.4 && !tooth)) return null;
        if (r < 1.3) return PAL.ink;
        return u + v < -1 ? PAL.sand2 : u + v > 2 ? PAL.gb2 : PAL.sand1;
      });
    });
  });

  S('stuffing', (img, i) => {
    const o = [[0, 0], [1, -1], [0, 1], [-1, 0]][i];
    sprite(img, (t) => {
      ball(t, 6.5 - o[0], 8 + o[1], 2.7, 2.6, [PAL.rose2, PAL.rose3, PAL.white]);
      ball(t, 10 + o[0], 6.5 - o[1], 2.2, 2.1, [PAL.rose2, PAL.rose3, PAL.white]);
      ball(t, 9 - o[1], 10 + o[0], 2.1, 2, [PAL.rose2, PAL.rose3, PAL.white]);
      t.set(4 + (i % 2), 5, PAL.white);
      t.set(12, 11 - (i % 2), PAL.rose3);
    });
  });

  S('thorn', (img, i) => {
    const th = [2.2, 1.6, 0.9, 1.6][i];
    sprite(img, (t) => {
      rotShape(t, 8, 8, 0, (u, v) => {
        if (u < -3.5 || u > 5.5) return null;
        const hw = u < -1 ? Math.max(0, th * (1 - (-1 - u) / 3)) : th * ((5.5 - u) / 6.5);
        if (Math.abs(v) > hw + 0.3) return null;
        return v < -hw * 0.3 ? PAL.moss3 : v > hw * 0.5 ? PAL.moss1 : PAL.moss2;
      });
      t.set(7, 8 - Math.round(th) - 1, PAL.moss2);
      t.set(7, 8 + Math.round(th) + 1, PAL.moss1);
    });
  });

  S('stitch', (img, i) => {
    sprite(img, (t) => {
      t.line(4, 8, 12, 8, PAL.gb5);
      t.set(13, 8, PAL.white);
      t.rect(3, 7, 2, 3, PAL.gb4);
      t.set(3, 8, PAL.ink);
      for (let x = 0; x <= 2; x++) t.set(x + 1, 8 + Math.round(Math.sin((x + i * 1.5) * 1.6) * 1.2) - (x === 0 ? 0 : 0) + 1, PAL.rose2);
    });
  });
  return s;
})();

// ------------------------------------------------------------------ fx
function popFx(img, i, cols) {
  const [flash, main, mid, low] = cols;
  const R = [2, 4, 6, 7.5, 9][i];
  if (i === 0) {
    img.ellipse(12, 12, 2.4, 2.4, main);
    img.ellipse(12, 12, 1.2, 1.2, flash);
  } else if (i < 4) {
    const c = [null, main, mid, low][i];
    for (let a = 0; a < 48; a++) {
      if (i === 3 && a % 3 === 0) continue;
      const ang = (a / 48) * TAU;
      img.set(12 + Math.cos(ang) * R, 12 + Math.sin(ang) * R, c);
      if (i === 1) img.set(12 + Math.cos(ang) * (R - 1), 12 + Math.sin(ang) * (R - 1), flash);
    }
  }
  const n = 8;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * TAU + 0.2;
    const rr = [0, 5.5, 8, 10, 11][i];
    if (i === 0) continue;
    const c = i < 3 ? flash : i === 3 ? main : low;
    img.set(12 + Math.cos(ang) * rr, 12 + Math.sin(ang) * rr, c);
    if (i === 1) img.set(12 + Math.cos(ang) * (rr + 1), 12 + Math.sin(ang) * (rr + 1), mid);
  }
}

const fx = (() => {
  const s = new Sheet('fx', 24, 24);

  s.anim('pop_cyan', 5, (img, i) => popFx(img, i, ['cy4', 'cy3', 'cy2', 'cy1']), { fps: 16, loop: false });
  s.anim('pop_rose', 5, (img, i) => popFx(img, i, ['rose3', 'rose2', 'pu3', 'pu2']), { fps: 16, loop: false });

  s.anim(
    'mist',
    7,
    (img, i) => {
      const blobs = [[0, 0, 1], [-4, 1, 0.8], [4, 0, 0.85], [-1, -4, 0.8], [1, 4, 0.7], [-5, -3, 0.55], [5, 3, 0.55]];
      const grow = Math.min(i, 4) / 4;
      const fade = ['ff', 'e0', 'c8', 'b0', '90', '60', '30'][i];
      for (const [bx, by, sz] of blobs) {
        const spread = 0.5 + grow * 0.65;
        const r = (2 + grow * 3.4) * sz * (i > 4 ? 1 + (i - 4) * 0.1 : 1);
        const x = 12 + bx * spread;
        const y = 12 + by * spread - (i > 3 ? (i - 3) * 0.8 : 0);
        img.ellipse(x, y, r, r * 0.85, PAL.gb3 + fade);
        img.ellipse(x - r * 0.25, y - r * 0.3, r * 0.6, r * 0.5, PAL.gb4 + fade);
      }
      if (i < 5) img.ellipse(10.5, 10.5, 1.6 + grow, 1.2 + grow * 0.6, PAL.gb5 + fade);
    },
    { fps: 12, loop: false },
  );

  s.anim(
    'puff',
    5,
    (img, i) => {
      const fade = ['ff', 'e0', 'b0', '80', '48'][i];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + 0.4;
        const rr = 1 + i * 2;
        const r = Math.max(1, 3 - i * 0.45);
        img.ellipse(12 + Math.cos(a) * rr, 12 + Math.sin(a) * rr * 0.8, r, r * 0.85, PAL.gb4 + fade);
        if (i < 3) img.set(12 + Math.cos(a) * rr - 1, 12 + Math.sin(a) * rr * 0.8 - 1, PAL.gb5 + fade);
      }
      if (i < 2) img.ellipse(12, 12, 3 - i, 2.5 - i, PAL.gb3 + fade);
    },
    { fps: 14, loop: false },
  );

  s.anim(
    'sparkle',
    6,
    (img, i) => {
      const pts = [[12, 12, 0], [6, 7, 1], [18, 8, 2], [8, 17, 3], [17, 17, 1], [12, 4, 2]];
      for (const [x, y, ph] of pts) {
        const t = (i - ph * 0.7) ;
        if (t < 0 || t > 3.6) continue;
        const len = Math.round(t < 1.8 ? 1 + t : 4.6 - t);
        glint(img, x, y, Math.max(0, len - 0), len > 2 ? PAL.cy3 : PAL.cy4, PAL.white);
      }
      if (i >= 3) for (const [x, y] of [[4, 12], [20, 12], [12, 20], [12, 2]]) img.set(x + (i - 3), y - (i - 3) * (y > 12 ? -1 : 1), PAL.cy2);
    },
    { fps: 12, loop: false },
  );

  s.anim(
    'heal',
    6,
    (img, i) => {
      const plus = (x, y, c, big) => {
        img.set(x, y, PAL.white);
        img.set(x - 1, y, c);
        img.set(x + 1, y, c);
        img.set(x, y - 1, c);
        img.set(x, y + 1, c);
        if (big) {
          img.set(x - 2, y, c);
          img.set(x + 2, y, c);
          img.set(x, y - 2, c);
          img.set(x, y + 2, c);
        }
      };
      const items = [[7, 0], [12, 1], [17, 2]];
      for (const [x, ph] of items) {
        const t = i - ph * 0.8;
        if (t < 0 || t > 4.2) continue;
        const y = 20 - t * 4.2;
        const sway = Math.round(Math.sin(t * 1.3 + x) * 1.2);
        if (ph === 1) {
          img.set(x + sway, y, PAL.heart3);
          img.set(x + sway + 2, y, PAL.heart3);
          img.rect(x + sway, y + 1, 3, 1, PAL.heart3);
          img.set(x + sway + 1, y + 2, PAL.heart2);
          img.set(x + sway + 1, y, PAL.heart3);
        } else plus(x + sway, y, PAL.moss3, t < 2.4);
      }
    },
    { fps: 12, loop: false },
  );

  s.anim(
    'shatter',
    6,
    (img, i) => {
      if (i === 0) {
        for (let y = 3; y < 22; y++) {
          for (let x = 3; x < 22; x++) {
            if (!inHeart(x, y, 12, 12, 7.5)) continue;
            img.set(x, y, x + y < 24 ? PAL.gb5 : PAL.gb4);
          }
        }
        img.line(12, 7, 10, 12, PAL.gb2);
        img.line(10, 12, 13, 15, PAL.gb2);
        img.line(13, 15, 12, 19, PAL.gb2);
        img.set(8, 8, PAL.white);
        img.set(9, 8, PAL.white);
        img.outline(PAL.outline);
        return;
      }
      const n = 8;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + 0.3;
        const d = i * 2.1 + 1;
        const x = 12 + Math.cos(a) * d;
        const y = 12 + Math.sin(a) * d * 0.85 + i * i * 0.35;
        const sz = Math.max(0.8, 3.2 - i * 0.45);
        const rot = a + i * 0.9;
        const pts = [[0, -sz], [sz * 0.8, sz * 0.7], [-sz * 0.7, sz * 0.5]].map(([u, v]) => [x + u * Math.cos(rot) - v * Math.sin(rot), y + u * Math.sin(rot) + v * Math.cos(rot)]);
        poly(img, pts, k % 2 ? PAL.gb5 : PAL.cy3);
        img.set(x, y, PAL.white);
      }
      if (i < 4) for (let k = 0; k < 4; k++) img.set(12 + Math.cos(k * 1.57 + 0.8) * (i * 1.6), 12 + Math.sin(k * 1.57 + 0.8) * (i * 1.6), PAL.cy4);
    },
    { fps: 14, loop: false },
  );

  s.anim(
    'essence',
    4,
    (img, i) => {
      const p = [0, 1, 2, 1][i];
      const sway = [0, 1, 0, -1][i];
      halo(img, 12, 12, 6, 6, A('cy3', p === 1 ? '2a' : '1c'));
      sprite(img, (t) => {
        ball(t, 12, 11, 2.3 + (p === 1 ? 0.3 : 0), 2.3 + (p === 2 ? 0.3 : 0), [PAL.cy2, PAL.cy3, PAL.cy4]);
        t.set(12, 8 - (p === 2 ? 1 : 0), PAL.cy3);
        t.set(12 + sway, 14, PAL.cy3);
        t.set(12 + sway * 2, 15, PAL.cy2);
        if (p) t.set(12 + sway * 2, 16, PAL.cy1);
      });
    },
    { fps: 10 },
  );

  s.anim(
    'puddle',
    4,
    (img, i) => {
      const r = rng(9);
      const lumps = Array.from({ length: 9 }, () => r());
      for (let y = 2; y < 22; y++) {
        for (let x = 0; x < 24; x++) {
          const dx = (x - 11.5) / 10;
          const dy = (y - 12) / 6.2;
          const a = Math.atan2(dy, dx);
          const k = Math.floor(((a + Math.PI) / TAU) * 9) % 9;
          const e = 0.88 + lumps[k] * 0.2 + [0, 0.04, 0, -0.04][i] * Math.sin(a * 3 + i);
          const d = Math.hypot(dx, dy);
          if (d > e) continue;
          img.set(x, y, d > e - 0.2 ? PAL.outline + 'e0' : PAL.ink + 'c8');
        }
      }
      const sx = [6, 8, 11, 14][i];
      img.rect(sx, 9, 3, 1, PAL.gb3 + '80');
      img.set(sx - 1 + (i % 2), 10, PAL.gb3 + '60');
    },
    { fps: 4 },
  );

  s.anim(
    'telegraph',
    4,
    (img, i) => {
      for (let k = 0; k < 160; k++) {
        const f = k / 160;
        const ph = (f * 8 + i / 4) % 1;
        if (ph > 0.58) continue;
        const a = f * TAU;
        img.set(12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, ph < 0.15 || ph > 0.5 ? PAL.rose1 : PAL.rose2);
      }
      for (let k = 0; k < 8; k++) {
        const a = ((k + i / 4 + 0.29) / 8) * TAU;
        img.set(12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, PAL.rose3);
      }
    },
    { fps: 8 },
  );

  s.anim(
    'stun',
    4,
    (img, i) => {
      const star = (x, y, big) => {
        img.set(x, y, PAL.white);
        img.set(x - 1, y, big ? PAL.sand3 : PAL.sand2);
        img.set(x + 1, y, big ? PAL.sand3 : PAL.sand2);
        img.set(x, y - 1, big ? PAL.sand3 : PAL.sand2);
        img.set(x, y + 1, big ? PAL.sand3 : PAL.sand2);
        if (big) {
          img.set(x - 1, y - 1, PAL.sand1);
          img.set(x + 1, y + 1, PAL.sand1);
        }
      };
      const order = [0, 1, 2].map((k) => {
        const a = (k / 3) * TAU + (i / 4) * (TAU / 3);
        return [12 + Math.cos(a) * 8, 12 + Math.sin(a) * 3, Math.sin(a)];
      });
      order.sort((a, b) => a[2] - b[2]);
      for (const [x, y, d] of order) star(Math.round(x), Math.round(y), d > 0);
    },
    { fps: 8 },
  );

  s.anim(
    'frost',
    4,
    (img, i) => {
      const spots = [[12, 4, 3], [5, 8, 2], [19, 9, 2], [7, 18, 2], [18, 18, 3], [12, 20, 2], [3, 13, 1], [21, 14, 1]];
      spots.forEach(([x, y, h], k) => {
        const sz = h + (((i + k) % 4) === 0 ? 1 : 0);
        poly(img, [[x, y - sz - 1], [x + 1.5, y], [x, y + sz], [x - 1.5, y]], (px) => (px < x ? PAL.cy4 : PAL.cy3));
        img.set(x, y - sz, PAL.white);
        img.set(x + 1, y + 1, PAL.cy1);
      });
      for (let k = 0; k < 4; k++) {
        const j = (k + i) % 4;
        img.set(8 + j * 3, 7 + ((k * 5) % 11), j % 2 ? PAL.white : PAL.cy3);
      }
      glint(img, [8, 16, 17, 6][i], [8, 6, 16, 15][i], 1, PAL.cy4, PAL.white);
    },
    { fps: 6 },
  );

  s.anim(
    'trail',
    4,
    (img, i) => {
      const keep = [1, 0.72, 0.42, 0.18][i];
      const col = [PAL.gb5, PAL.gb4, PAL.gb4, PAL.gb3][i];
      for (let k = 0; k < 9; k++) {
        const x = 8 + k;
        const y = 15 - k + Math.round(Math.sin(k * 1.3) * 1.2);
        for (const w of [0, 1]) {
          if (hash(x, y + w * 7, 3) < keep) img.set(x, y + w, col);
        }
        if (k % 3 === 1 && hash(x, y, 5) < keep) img.set(x + 1, y - 1, col);
      }
    },
    { fps: 12, loop: false },
  );
  return s;
})();

// ---------------------------------------------------------------- boom
const boom = (() => {
  const s = new Sheet('boom', 64, 64);
  const lumps = Array.from({ length: 11 }, (_, k) => hash(k, 17));
  const edgeR = (a, R, wob) => {
    const u = (((a % TAU) + TAU) % TAU) / TAU * 11;
    const k = Math.floor(u);
    const f = u - k;
    const v = lumps[k % 11] + (lumps[(k + 1) % 11] - lumps[k % 11]) * f;
    return R * (0.82 + v * 0.3 + wob * Math.sin(a * 5 + k));
  };

  s.anim(
    'ink',
    8,
    (img, i) => {
      const cx = 32;
      const cy = 32;
      if (i <= 4) {
        const R = [7, 15, 22, 27, 28][i];
        const hole = i === 4 ? 0.1 : 0;
        for (let y = 0; y < 64; y++) {
          for (let x = 0; x < 64; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d > R * 1.2) continue;
            const e = edgeR(Math.atan2(dy, dx), R, 0.04 * i);
            if (d > e) continue;
            let c;
            if (d > e - 2) c = d > e - 1 ? PAL.cy3 : PAL.cy2;
            else if (d > e - 3.2 && dx + dy < 0) c = PAL.cy1;
            else if (hole && d > e * 0.45 && hole && hash(x, y, 2) > 0.995) c = PAL.dark;
            else c = d < e * 0.5 && dx + dy < 0 ? PAL.dark : PAL.ink;
            img.set(x, y, c);
          }
        }
        if (i >= 1) for (let k = 0; k < 6; k++) img.set(cx - 0.35 * R + k, cy - 0.2 * R - (k * 0.3), PAL.dark);
        if (i === 0) img.ellipse(cx, cy, 3, 3, PAL.cy4);
        if (i >= 3) for (let k = 0; k < 10; k++) {
          const a = k * 0.63 + 0.3;
          const rr = R + 1 + (k % 3);
          img.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.2, 1.2, PAL.ink);
        }
      } else {
        const t = i - 4; // 1..3
        // remaining core shrinks, droplets fly out and shrink
        const core = [18, 10, 4][t - 1];
        for (let y = 0; y < 64; y++) {
          for (let x = 0; x < 64; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d > core * 1.2) continue;
            const e = edgeR(Math.atan2(dy, dx), core, 0.05);
            if (d > e) continue;
            img.set(x, y, d > e - 1.6 ? PAL.cy3 : PAL.ink);
          }
        }
        for (let k = 0; k < 18; k++) {
          const a = k * 0.349 + (k % 2) * 0.1;
          const r0 = 15 + t * 3 + (k % 3) * 2;
          const sz = Math.max(0.8, ([3.4, 2.4, 1.5][t - 1]) * (0.6 + hash(k, 4) * 0.7));
          const x = cx + Math.cos(a) * r0;
          const y = cy + Math.sin(a) * r0;
          img.ellipse(x, y, sz + 0.8, sz + 0.8, PAL.cy3);
          img.ellipse(x, y, sz, sz, PAL.ink);
          if (t < 3 && sz > 1.6) img.set(x - 1, y - 1, PAL.cy2);
        }
        if (t === 3) for (let k = 0; k < 8; k++) img.set(cx + Math.cos(k * 0.8) * (28 + (k % 3) * 2), cy + Math.sin(k * 0.8) * (28 + (k % 3) * 2), PAL.cy2);
      }
    },
    { fps: 14, loop: false },
  );

  s.anim(
    'ring',
    6,
    (img, i) => {
      const R = [6, 14, 22, 27, 30, 31][i];
      const th = [2.4, 2.2, 1.8, 1.4, 1.1, 0.8][i];
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const d = Math.hypot(x - 31.5, y - 31.5);
          const k = Math.abs(d - R);
          if (k > th) continue;
          if (i >= 4 && hash(x, y, 8) < (i - 3) * 0.3) continue;
          img.set(x, y, k < th * 0.45 ? PAL.white : k < th * 0.8 ? PAL.cy3 : PAL.cy2);
        }
      }
      if (i >= 1 && i <= 4) {
        for (let k = 0; k < 10; k++) {
          const a = k * 0.628 + i;
          img.set(31.5 + Math.cos(a) * (R - 3), 31.5 + Math.sin(a) * (R - 3), PAL.cy1);
        }
      }
    },
    { fps: 14, loop: false },
  );
  return s;
})();

export { shots, fx, boom };
