// `pickups`, `items` and `symbols` sheets (16x16 cells).
import { Img, PAL, Sheet } from './lib.mjs';
import { ball, slab, sprite, rng } from './world-util.mjs';
import { poly, halo, heart, glint, starPts, inHeart } from './world-shapes.mjs';
import { chalkPath, chalkLine, chalkCircle } from './world-util.mjs';

const TAU = Math.PI * 2;
const A = (c, a) => PAL[c] + a;
const ring = (t, cx, cy, r0, r1, c) => {
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) {
    for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r1 && d >= r0) t.set(x, y, c);
    }
  }
};

// ---------------------------------------------------------------- pickups
const pickups = new Sheet('pickups', 16, 16);
const P = (name, fn, o = { fps: 6 }) => pickups.anim(name, 4, (img, i) => fn(img, i), o);
const bob = [0, -1, 0, 1];

P('dust', (img, i) => {
  const dy = i === 1 ? -1 : 0;
  sprite(img, (t) => {
    poly(t, [[8, 5 + dy], [13, 12], [3, 12]], (x, y) => (x + y < 16 ? PAL.cy3 : y > 10 ? PAL.cy2 : PAL.cy3));
    t.ellipse(8, 11.5, 5.5, 2, PAL.cy2);
    t.rect(4, 11, 3, 1, PAL.cy3);
    t.set(8, 6 + dy, PAL.cy4);
    t.set(7, 8, PAL.cy4);
    t.set(9, 10, PAL.sand3);
  });
  const g = [[4, 5], [12, 6], [11, 3], [3, 8]][i];
  glint(img, g[0], g[1], i % 2 ? 2 : 1, PAL.cy3, PAL.white);
});

P('dust_big', (img, i) => {
  const sq = [0, 1, 0, 0][i];
  sprite(img, (t) => {
    ball(t, 8, 10 + (sq ? 0.3 : 0), 5 + sq * 0.3, 4.2 - sq * 0.3, [PAL.pu2, PAL.pu3, PAL.pu4]);
    t.rect(6, 4, 4, 2, PAL.pu3);
    t.rect(5, 6, 6, 1, PAL.sand2);
    t.set(6, 3, PAL.pu4);
    t.set(9, 3, PAL.pu4);
    t.set(8, 2 - (i === 2 ? 1 : 0), PAL.pu4);
    t.set(8, 9, PAL.cy3);
    t.set(10, 11, PAL.cy3);
  });
  glint(img, [12, 4, 3, 12][i], [5, 4, 11, 12][i], 1, PAL.cy3, PAL.white);
});

P('shard', (img, i) => {
  const d = bob[i];
  sprite(img, (t) => {
    poly(t, [[8, 1 + d], [12, 6 + d], [10, 14 + d], [5, 11 + d], [4, 5 + d]], (x, y) => (x < 7 ? PAL.cy4 : x > 9 ? PAL.cy2 : PAL.cy3));
    t.rect(7, 4 + d, 1, 5, PAL.white);
    t.rect(9, 8 + d, 2, 1, PAL.ink);
    t.rect(9, 10 + d, 1, 1, PAL.ink);
    t.rect(10, 9 + d, 1, 1, PAL.cy3);
  });
  if (i % 2) glint(img, 13, 3 + d, 1, PAL.cy4, PAL.white);
  if (i === 2) img.set(3, 10, PAL.cy4);
});

P('ink', (img, i) => {
  const d = i === 1 || i === 3 ? -1 : 0;
  sprite(img, (t) => {
    t.rect(6, 2 + d, 4, 3, PAL.sand2);
    t.rect(6, 2 + d, 4, 1, PAL.sand3);
    t.rect(6, 5 + d, 4, 2, PAL.gb4);
    ball(t, 8, 10 + d, 5, 4, [PAL.gb3, PAL.gb4, PAL.gb5]);
    t.ellipse(8, 10.5 + d, 3.5, 2.8, PAL.ink);
    t.set(6, 9 + d, PAL.dark);
    t.set(6, 8 + d, PAL.gb5);
  });
  if (i === 2) glint(img, 13, 4, 1, PAL.cy3, PAL.cy4);
  if (i === 0) img.set(11, 5, PAL.cy3);
});

const heartPick = (img, i, fill) => {
  const s = [6, 6.5, 6, 5.6][i];
  const dy = bob[i] * 0.5;
  sprite(img, (t) => fill(t, 8, 8.5 + dy, s));
  img.set([5, 4, 4, 5][i], 5 + Math.round(dy), PAL.white);
};
P('heart_red', (img, i) =>
  heartPick(img, i, (t, cx, cy, s) => {
    heart(t, cx, cy, s, [PAL.heart1, PAL.heart2, PAL.heart3]);
  }),
);
P('heart_half', (img, i) =>
  heartPick(img, i, (t, cx, cy, s) => {
    heart(t, cx, cy, s, [PAL.heart1, PAL.heart2, PAL.heart3], { empty: PAL.pu1 });
  }),
);
P('heart_blue', (img, i) =>
  heartPick(img, i, (t, cx, cy, s) => {
    heart(t, cx, cy, s, [PAL.cy1, PAL.cy2, PAL.cy3]);
  }),
);
P('heart_glass', (img, i) => {
  const s = [6, 6.4, 6, 5.7][i];
  sprite(img, (t) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (!inHeart(x, y, 8, 8.5, s)) continue;
        const edge = !(inHeart(x - 1, y, 8, 8.5, s) && inHeart(x + 1, y, 8, 8.5, s) && inHeart(x, y - 1, 8, 8.5, s) && inHeart(x, y + 1, 8, 8.5, s));
        t.set(x, y, edge ? PAL.gb4 : PAL.gb5 + '28');
      }
    }
  });
  img.set(4, 5, PAL.white);
  img.set(5, 5, PAL.white);
  img.set(4, 6, PAL.white);
  const g = [[10, 9], [9, 10], [8, 11], [11, 8]][i];
  img.set(g[0], g[1], PAL.white);
});

P(
  'bomb',
  (img, i) => {
    const sw = [0, 0.5, 1, 1.5][i];
    const fuse = [6, 4, 3, 1][i];
    sprite(img, (t) => {
      t.rect(6, 4, 4, 2, PAL.sand2);
      t.rect(6, 4, 4, 1, PAL.sand3);
      ball(t, 8, 10, 4.2 + sw * 0.6, 3.8 + sw * 0.7, [PAL.gb2, PAL.gb4, PAL.gb5]);
      t.ellipse(8, 10.5, 3 + sw * 0.5, 2.6 + sw * 0.5, PAL.ink);
      t.set(6, 9, PAL.dark);
      t.line(9, 4, 10, 3, PAL.sand1);
      t.line(10, 3, 10 + (fuse > 2 ? 1 : 0), 3 - Math.min(2, fuse - 1), PAL.sand1);
    });
    const tipX = 10 + (fuse > 2 ? 1 : 0);
    const tipY = 3 - Math.min(2, fuse - 1);
    img.set(tipX, tipY - 1, PAL.white);
    img.set(tipX - 1, tipY - 1, PAL.sand3);
    img.set(tipX + 1, tipY - 1, i % 2 ? PAL.rose3 : PAL.sand2);
    img.set(tipX, tipY - 2, PAL.sand3);
    if (i >= 2) img.set(tipX + 2, tipY - 2, PAL.rose3);
    if (i === 3) {
      img.set(tipX - 2, tipY, PAL.sand3);
      img.set(tipX + 2, tipY + 1, PAL.white);
    }
  },
  { fps: 6 },
);

// ---------------------------------------------------------------- items
const items = new Sheet('items', 16, 16);
const I = (name, fn) => items.still(name, (img) => fn(img));
const R = (t, x, y, w, h, c) => t.rect(x, y, w, h, c);

I('warm_milk', (img) => {
  sprite(img, (t) => {
    R(t, 4, 5, 8, 9, PAL.gb4);
    R(t, 5, 7, 6, 6, PAL.white);
    R(t, 5, 7, 6, 1, PAL.sand3);
    R(t, 5, 12, 6, 1, PAL.gb5);
    R(t, 4, 5, 1, 9, PAL.gb5);
    R(t, 11, 5, 1, 9, PAL.gb3);
    R(t, 12, 7, 2, 1, PAL.gb4);
    R(t, 13, 8, 1, 3, PAL.gb4);
    R(t, 12, 11, 2, 1, PAL.gb3);
  });
  for (const [x, y] of [[6, 3], [7, 2], [6, 1], [9, 3], [10, 2]]) img.set(x, y, PAL.gb4);
});

I('night_light', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 7, 4.5, 4.5, [PAL.cy2, PAL.cy3, PAL.cy4]);
    R(t, 5, 10, 6, 3, PAL.gb3);
    R(t, 5, 10, 6, 1, PAL.gb4);
    R(t, 7, 13, 2, 1, PAL.gb2);
    t.set(7, 5, PAL.white);
  });
  halo(img, 8, 7, 7.5, 7, A('cy3', '26'));
  img.set(1, 3, PAL.cy3);
  img.set(14, 11, PAL.cy3);
});

I('spring', (img) => {
  sprite(img, (t) => {
    for (let k = 0; k < 3; k++) {
      const y = 2 + k * 4;
      t.line(3, y, 12, y + 3, PAL.gb4);
      t.line(3, y + 1, 12, y + 4, PAL.gb3);
      t.set(3, y, PAL.gb5);
      t.set(4, y, PAL.gb5);
      t.set(12, y + 4, PAL.gb2);
      if (k < 2) {
        t.set(12, y + 5, PAL.gb2);
        t.set(13, y + 5, PAL.gb3);
        t.set(2, y + 4, PAL.gb2);
      }
    }
  });
});

I('old_sneakers', (img) => {
  sprite(img, (t) => {
    R(t, 3, 4, 5, 7, PAL.rose2);
    R(t, 3, 8, 11, 3, PAL.rose2);
    t.ellipse(11.5, 9, 2.8, 2, PAL.sand3);
    R(t, 3, 4, 5, 1, PAL.rose3);
    R(t, 3, 4, 1, 7, PAL.rose3);
    R(t, 2, 11, 13, 2, PAL.white);
    R(t, 2, 12, 13, 1, PAL.gb4);
    t.set(4, 4, PAL.rose1);
    t.set(5, 4, PAL.rose1);
    t.set(6, 9, PAL.rose1);
  });
  for (const [x, y] of [[6, 6], [5, 7], [7, 7], [6, 8]]) img.set(x, y, PAL.white);
  img.set(10, 8, PAL.pu3);
});

I('lullaby', (img) => {
  sprite(img, (t) => {
    R(t, 3, 2, 10, 12, PAL.sand3);
    R(t, 12, 2, 1, 12, PAL.sand2);
    R(t, 3, 13, 10, 1, PAL.sand2);
    for (const y of [4, 6, 8]) R(t, 4, y, 8, 1, PAL.gb3);
    ball(t, 7, 11, 2.2, 2.2, [PAL.pu2, PAL.pu3, PAL.pu3]);
    t.set(8, 10, PAL.sand3);
    t.set(9, 10, PAL.sand3);
    t.set(9, 11, PAL.sand3);
    R(t, 10, 10, 1, 1, PAL.pu2);
    t.set(5, 5, PAL.pu2);
    t.set(8, 7, PAL.pu2);
    t.set(10, 5, PAL.pu2);
  });
});

I('music_box', (img) => {
  sprite(img, (t) => {
    R(t, 2, 6, 12, 8, PAL.sand1);
    R(t, 2, 4, 12, 3, PAL.sand2);
    R(t, 2, 4, 12, 1, PAL.sand3);
    R(t, 2, 7, 12, 1, PAL.ink);
    R(t, 5, 9, 6, 3, PAL.rose2);
    R(t, 5, 9, 6, 1, PAL.rose3);
    R(t, 4, 14, 2, 1, PAL.sand1);
    R(t, 10, 14, 2, 1, PAL.sand1);
  });
  img.set(7, 3, PAL.cy3);
  img.set(8, 2, PAL.cy3);
  img.set(8, 1, PAL.cy3);
  img.rect(14, 9, 1, 3, PAL.gb4);
});

I('milk_tooth', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 6, 5.5, 4, [PAL.gb4, PAL.white, PAL.white]);
    R(t, 3, 6, 10, 2, PAL.white);
    R(t, 4, 8, 3, 5, PAL.white);
    R(t, 9, 8, 3, 5, PAL.white);
    R(t, 6, 8, 3, 2, PAL.gb5);
    R(t, 6, 6, 4, 1, PAL.white);
    R(t, 6, 9, 1, 4, PAL.gb4);
    R(t, 11, 8, 1, 5, PAL.gb4);
    R(t, 4, 12, 3, 1, PAL.gb4);
    R(t, 9, 12, 3, 1, PAL.gb4);
    t.set(5, 4, PAL.white);
  });
  img.set(6, 4, PAL.gb5);
  img.set(10, 8, PAL.rose3);
});

I('soap_bubbles', (img) => {
  sprite(img, (t) => {
    R(t, 3, 8, 6, 6, PAL.cy2);
    R(t, 3, 8, 1, 6, PAL.cy3);
    R(t, 8, 8, 1, 6, PAL.cy1);
    R(t, 4, 6, 4, 2, PAL.rose2);
    t.line(7, 6, 11, 3, PAL.gb3);
    ring(t, 12, 3.5, 1.6, 2.7, PAL.cy3);
  });

  img.set(11, 2, PAL.white);
  ring(img, 12, 11, 1.8, 2.6, PAL.cy3);
  img.set(11, 10, PAL.white);
});

I('plush_heart', (img) => {
  sprite(img, (t) => heart(t, 8, 8, 6.4, [PAL.rose1, PAL.rose2, PAL.rose3]));
  for (const [x, y] of [[6, 4], [8, 6], [10, 8]]) img.set(x, y, PAL.sand3);
  img.set(7, 7, PAL.sand3);
  img.set(9, 5, PAL.sand3);
  img.set(11, 7, PAL.sand3);
  img.set(10, 6, PAL.heart1);
  img.set(7, 11, PAL.heart1);
});

I('glass_marble', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 8, 5.7, 5.7, [PAL.cy1, PAL.cy2, PAL.cy3]);
    for (const [x, y] of [[5, 9], [6, 10], [8, 10], [10, 9], [10, 7], [9, 6], [7, 6], [6, 7], [7, 8], [8, 8]]) t.set(x, y, PAL.pu3);
    for (const [x, y] of [[5, 8], [10, 10]]) t.set(x, y, PAL.rose2);
    t.rect(4, 4, 2, 1, PAL.white);
    t.set(4, 5, PAL.white);
  });
});

I('mirror_shard', (img) => {
  sprite(img, (t) => {
    poly(t, [[5, 1], [12, 5], [11, 14], [4, 9]], (x, y) => (x + y < 12 ? PAL.gb5 : PAL.gb4));
    t.line(6, 4, 9, 11, PAL.cy3);
    t.line(7, 3, 10, 9, PAL.cy4);
    t.set(11, 11, PAL.gb3);
    t.set(10, 12, PAL.gb3);
  });
});

I('thread_spool', (img) => {
  sprite(img, (t) => {
    R(t, 3, 2, 8, 2, PAL.sand2);
    R(t, 3, 12, 8, 2, PAL.sand1);
    R(t, 4, 4, 6, 8, PAL.rose2);
    for (let y = 4; y < 12; y += 2) R(t, 4, y, 6, 1, PAL.rose3);
    R(t, 9, 4, 1, 8, PAL.rose1);
    t.line(13, 2, 13, 10, PAL.gb5);
    t.set(12, 3, PAL.gb4);
  });
  img.set(13, 12, PAL.gb3);
  img.set(12, 11, PAL.rose2);
  img.set(11, 10, PAL.rose2);
});

I('inkwell', (img) => {
  sprite(img, (t) => {
    ball(t, 7, 10, 5, 3.8, [PAL.ink, PAL.dark, PAL.gb2]);
    R(t, 5, 5, 4, 3, PAL.dark);
    R(t, 4, 5, 6, 1, PAL.sand2);
    t.set(4, 9, PAL.gb3);
    t.set(5, 8, PAL.gb3);
    poly(t, [[8, 6], [14, 1], [13, 5], [10, 8]], (x, y) => (x + y > 15 ? PAL.gb4 : PAL.white));
    t.line(8, 6, 11, 4, PAL.gb2);
  });
});

I('button_eye', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 8, 5.7, 5.7, [PAL.sand1, PAL.sand2, PAL.sand3]);
    t.ellipse(8, 8, 4, 2.7, PAL.white);
    t.ellipse(8, 8, 1.9, 1.9, PAL.pu3);
    t.ellipse(8, 8, 1, 1, PAL.ink);
    t.set(7, 7, PAL.white);
    t.line(4, 8, 5, 8, PAL.sand1);
    t.line(11, 8, 12, 8, PAL.sand1);
    t.set(8, 11, PAL.rose2);
    t.set(8, 12, PAL.rose2);
    t.set(9, 13, PAL.rose2);
  });
});

I('rattle', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 5, 4.4, 4.4, [PAL.pu3, PAL.pu4, PAL.pu5]);
    R(t, 4, 5, 9, 1, PAL.sand2);
    R(t, 7, 9, 2, 3, PAL.sand2);
    ring(t, 8, 12.5, 1.1, 2.1, PAL.rose2);
    t.set(6, 3, PAL.white);
    t.set(9, 5, PAL.sand3);
  });
});

I('star_mobile', (img) => {
  sprite(img, (t) => {
    t.line(2, 2, 13, 2, PAL.sand1);
    t.set(2, 1, PAL.sand1);
    t.set(13, 1, PAL.sand1);
    t.line(4, 3, 4, 6, PAL.gb3);
    t.line(11, 3, 11, 8, PAL.gb3);
    ball(t, 4, 9, 2.8, 2.8, [PAL.pu3, PAL.pu4, PAL.pu5]);
    t.ellipse(5.2, 8.4, 2, 2, PAL.none);
    poly(t, starPts(11, 11, 3.6, 1.7), PAL.sand2);
    t.set(11, 11, PAL.sand3);
  });
  img.set(3, 8, PAL.pu5);
});

I('blanket', (img) => {
  const cols = [PAL.rose2, PAL.moss2, PAL.pu3, PAL.sand2, PAL.gb3, PAL.rose3];
  sprite(img, (t) => {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) R(t, 2 + c * 4, 3 + r * 4, 4, 4, cols[(r * 3 + c * 2 + r) % 6]);
    R(t, 2, 11, 12, 2, PAL.pu2);
    R(t, 2, 11, 12, 1, PAL.pu3);
    for (const x of [2, 4, 6, 8, 10, 12]) t.set(x, 13, PAL.sand2);
  });
  for (const [x, y] of [[4, 5], [8, 5], [12, 7], [4, 9], [8, 9]]) img.set(x, y, PAL.outline);
});

I('alarm_clock', (img) => {
  sprite(img, (t) => {
    ball(t, 4, 3, 2, 2, [PAL.gb3, PAL.gb4, PAL.gb5]);
    ball(t, 12, 3, 2, 2, [PAL.gb3, PAL.gb4, PAL.gb5]);
    R(t, 7, 1, 2, 2, PAL.gb3);
    ball(t, 8, 9, 6, 5.5, [PAL.rose1, PAL.rose2, PAL.rose3]);
    t.ellipse(8, 9, 4.3, 4, PAL.sand3);
    R(t, 3, 14, 2, 1, PAL.rose1);
    R(t, 11, 14, 2, 1, PAL.rose1);
  });
  img.line(8, 9, 8, 6, PAL.ink);
  img.line(8, 9, 10, 10, PAL.ink);
  for (const [x, y] of [[9, 5], [8, 7], [10, 8], [9, 10], [10, 12]]) img.set(x, y, PAL.outline);
  img.line(9, 5, 7, 7, PAL.outline);
  img.line(7, 7, 10, 9, PAL.outline);
});

I('piggy_bank', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 8.5, 6, 4.6, [PAL.rose1, PAL.rose2, PAL.rose3]);
    ball(t, 13, 8.5, 1.7, 1.9, [PAL.rose2, PAL.rose3, PAL.rose3]);
    poly(t, [[9, 4], [12, 3], [11, 6]], PAL.rose2);
    R(t, 4, 12, 2, 2, PAL.rose1);
    R(t, 10, 12, 2, 2, PAL.rose1);
    t.set(2, 7, PAL.rose2);
    t.set(1, 6, PAL.rose2);
  });
  img.rect(6, 5, 3, 1, PAL.ink);
  img.set(11, 8, PAL.ink);
  img.set(13, 8, PAL.heart1);
});

I('pillow', (img) => {
  sprite(img, (t) => {
    t.ellipse(8, 8, 6.4, 5, PAL.pu3);
    R(t, 2, 4, 12, 9, PAL.pu3);
    t.clear(2, 4);
    t.clear(13, 4);
    t.clear(2, 12);
    t.clear(13, 12);
    R(t, 3, 4, 10, 1, PAL.pu4);
    R(t, 2, 5, 1, 7, PAL.pu4);
    R(t, 3, 12, 10, 1, PAL.pu2);
    R(t, 13, 5, 1, 7, PAL.pu2);
    R(t, 7, 7, 2, 2, PAL.pu5);
  });
  img.set(1, 3, PAL.sand2);
  img.set(14, 13, PAL.sand2);
});

I('lucky_coin', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 8, 5.7, 5.7, [PAL.sand1, PAL.sand2, PAL.sand3]);
    ring(t, 8, 8, 4.6, 5.2, PAL.sand1);
    for (const [x, y] of [[7, 6], [9, 6], [7, 10], [9, 10], [6, 8], [10, 8]]) t.set(x, y, PAL.moss1);
    R(t, 7, 7, 3, 3, PAL.moss2);
    t.set(8, 8, PAL.ink);
    t.set(8, 11, PAL.moss1);
  });
});

I('crayon', (img) => {
  sprite(img, (t) => {
    poly(t, [[3, 11], [10, 4], [13, 7], [6, 14]], (x, y) => (x + y > 17 ? PAL.rose1 : PAL.rose2));
    poly(t, [[7, 8], [10, 5], [11, 6], [8, 9]], PAL.sand3);
    poly(t, [[10, 4], [13, 7], [14, 2]], PAL.rose3);
    t.line(4, 11, 7, 14, PAL.rose1);
    t.set(13, 2, PAL.rose2);
    t.line(5, 10, 9, 6, PAL.rose3);
  });
});

I('paper_plane', (img) => {
  sprite(img, (t) => {
    poly(t, [[2, 8], [14, 2], [8, 9]], PAL.white);
    poly(t, [[8, 9], [14, 2], [10, 13]], PAL.gb4);
    t.line(2, 8, 8, 9, PAL.gb3);
    t.line(8, 9, 10, 12, PAL.gb3);
  });
  img.set(1, 11, PAL.cy3);
  img.set(3, 12, PAL.cy3);
});

I('dream_catcher', (img) => {
  sprite(img, (t) => {
    ring(t, 8, 6, 4.2, 5.6, PAL.sand2);
    t.line(8, 1, 8, 11, PAL.gb4);
    t.line(3, 4, 13, 8, PAL.gb4);
    t.line(13, 4, 3, 8, PAL.gb4);
    t.set(8, 6, PAL.cy3);
    t.line(8, 12, 8, 13, PAL.gb3);
    t.line(5, 11, 5, 14, PAL.gb3);
    t.line(11, 11, 11, 14, PAL.gb3);
  });
  img.rect(4, 13, 3, 2, PAL.rose2);
  img.rect(10, 13, 3, 2, PAL.cy2);
  img.set(8, 14, PAL.pu3);
});

I('spinning_top', (img) => {
  sprite(img, (t) => {
    R(t, 7, 1, 2, 3, PAL.sand2);
    poly(t, [[2, 7], [14, 7], [8, 14]], (x, y) => (y < 9 ? PAL.pu3 : x < 7 ? PAL.rose2 : PAL.rose1));
    t.ellipse(8, 6.5, 6, 2.6, PAL.pu4);
    t.rect(4, 6, 8, 1, PAL.sand2);
    t.set(5, 5, PAL.pu5);
    t.set(8, 14, PAL.gb3);
  });
  img.line(5, 9, 11, 9, PAL.sand2);
});

I('snow_globe', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 6.5, 6, 5.5, [PAL.gb4, PAL.cy3, PAL.cy4]);
    t.ellipse(8, 6.5, 4.5, 4, PAL.cy3);
    poly(t, [[8, 2], [11, 8], [5, 8]], PAL.moss2);
    t.set(8, 9, PAL.sand1);
    t.set(5, 3, PAL.white);
    t.set(11, 4, PAL.white);
    t.set(4, 7, PAL.white);
    R(t, 4, 11, 8, 3, PAL.pu2);
    R(t, 4, 11, 8, 1, PAL.pu3);
  });
  img.set(4, 3, PAL.white);
  img.set(5, 3, PAL.white);
});

I('pocket_watch', (img) => {
  sprite(img, (t) => {
    ball(t, 8, 9, 5.6, 5.6, [PAL.sand1, PAL.sand2, PAL.sand3]);
    t.ellipse(8, 9, 4, 4, PAL.white);
    R(t, 7, 2, 2, 2, PAL.sand1);
    t.line(9, 2, 12, 1, PAL.gb3);
    t.line(12, 1, 14, 3, PAL.gb3);
    t.line(14, 3, 13, 5, PAL.gb3);
  });
  img.line(8, 9, 8, 6, PAL.ink);
  img.line(8, 9, 10, 10, PAL.ink);
  img.set(8, 12, PAL.gb3);
});

I('first_dream', (img) => {
  sprite(img, (t) => {
    t.line(8, 14, 8, 6, PAL.cy2);
    t.line(9, 14, 9, 9, PAL.cy1);
    poly(t, [[8, 10], [3, 9], [1, 5], [6, 6]], (x, y) => (y < 7 ? PAL.cy4 : PAL.cy3));
    poly(t, [[8, 8], [12, 7], [14, 3], [9, 4]], (x, y) => (y < 5 ? PAL.cy4 : PAL.cy3));
    t.line(8, 10, 4, 7, PAL.cy2);
    t.line(8, 8, 12, 5, PAL.cy2);
    t.rect(5, 14, 6, 1, PAL.cy1);
    t.set(8, 5, PAL.white);
    t.set(8, 4, PAL.cy4);
  });
  halo(img, 8, 8, 7.5, 7.5, A('cy3', '28'));
  img.set(2, 3, PAL.white);
  img.set(13, 12, PAL.cy4);
  img.set(1, 10, PAL.cy3);
});

// ---------------------------------------------------------------- symbols
const symbols = new Sheet('symbols', 16, 16);

/** Symbols in local coordinates (about +-4); `s` offers line / arc / dot. */
const SYM = {
  moon(s) {
    s.arc(0, 0, 4, 0.9, TAU - 0.9);
    s.arc(1.6, 0, 3.2, 1.2, TAU - 1.2, true);
    s.line(2.4, -3, 2.4, -3);
  },
  star(s) {
    const p = starPts(0, 0.3, 4.6, 4.6, -Math.PI / 2, 5);
    const order = [0, 4, 8, 2, 6, 0];
    for (let k = 0; k < 5; k++) s.line(p[order[k]][0], p[order[k]][1], p[order[k + 1]][0], p[order[k + 1]][1]);
  },
  eye(s) {
    s.line(-4.5, 0, -2, -2);
    s.line(-2, -2, 2, -2);
    s.line(2, -2, 4.5, 0);
    s.line(4.5, 0, 2, 2);
    s.line(2, 2, -2, 2);
    s.line(-2, 2, -4.5, 0);
    s.arc(0, 0, 1.2, 0, TAU);
  },
  key(s) {
    s.arc(-2.2, -2, 2, 0, TAU);
    s.line(-0.8, -0.6, 3.8, 4);
    s.line(2, 2.2, 0.6, 3.6);
    s.line(3.4, 3.6, 2.2, 4.8);
  },
  spiral(s) {
    let px = 0;
    let py = 0;
    for (let a = 0; a <= TAU * 1.7; a += 0.35) {
      const r = 0.4 + a * 0.58;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (a > 0) s.line(px, py, x, y);
      px = x;
      py = y;
    }
  },
  clock(s) {
    s.arc(0, 0, 4.3, 0, TAU);
    s.line(0, 0, 0, -3);
    s.line(0, 0, 2.2, 1.2);
  },
};

function drawSym(t, id, k, mode, seed, color, color2) {
  const api = {
    line(x0, y0, x1, y1) {
      const a = [8 + x0 * k, 8 + y0 * k, 8 + x1 * k, 8 + y1 * k];
      if (mode === 'chalk') chalkLine(t, ...a, color, seed++, 0.1);
      else t.line(...a, color);
    },
    arc(cx, cy, r, a0, a1, erase = false) {
      if (erase) return;
      if (mode === 'chalk') chalkCircle(t, 8 + cx * k, 8 + cy * k, r * k, color, seed++, a0, a1);
      else {
        const n = Math.ceil(r * k * 6);
        for (let i = 0; i <= n; i++) {
          const a = a0 + ((a1 - a0) * i) / n;
          t.set(8 + (cx + Math.cos(a) * r) * k, 8 + (cy + Math.sin(a) * r) * k, color);
        }
      }
    },
  };
  if (id === 'moon') {
    const inM = (x, y) => Math.hypot(x - 8, y - 8) <= 4.2 * k && Math.hypot(x - 8 - 1.9 * k, y - 8 + 0.5 * k) > 3.4 * k;
    const r = rng(seed);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (!inM(x, y)) continue;
        const edge = !(inM(x - 1, y) && inM(x + 1, y) && inM(x, y - 1) && inM(x, y + 1));
        if (mode === 'chalk' ? edge && r() > 0.1 : true) t.set(x, y, color);
      }
    }
    return;
  }
  SYM[id](api);
}

const chalkCol = PAL.gb4;
const ids = ['moon', 'star', 'eye', 'key', 'spiral', 'clock'];

function plate(t, fill, edge, light, shadow) {
  sprite(t, (u) => {
    u.rect(1, 1, 14, 14, fill);
    u.rect(2, 1, 12, 1, light);
    u.rect(1, 2, 1, 12, light);
    u.rect(2, 14, 12, 1, shadow);
    u.rect(14, 2, 1, 12, shadow);
    for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) u.clear(x, y);
    u.set(2, 2, edge);
    u.set(13, 13, shadow);
  }, { outline: PAL.outline });
}

for (const id of ids) {
  symbols.still(`${id}_chalk`, (img) => drawSym(img, id, 1.45, 'chalk', ids.indexOf(id) * 13 + 3, chalkCol));
  symbols.still(`${id}_plate`, (img) => {
    plate(img, PAL.gb2, PAL.gb4, PAL.gb4, PAL.gb1);
    const eng = new Img(16, 16);
    drawSym(eng, id, 0.95, 'plate', 1, PAL.gb4);
    img.blit(eng, 1, 1);
    const ink = new Img(16, 16);
    drawSym(ink, id, 0.95, 'plate', 1, PAL.ink);
    img.blit(ink);
  });
  symbols.still(`${id}_lit`, (img) => {
    plate(img, PAL.cy1, PAL.cy3, PAL.cy2, PAL.moss1);
    const g = new Img(16, 16);
    drawSym(g, id, 0.95, 'plate', 1, PAL.cy4);
    // glow: thicken
    const g2 = g.clone();
    g2.map(() => PAL.cy3);
    img.blit(g2, 1, 0);
    img.blit(g2, 0, 1);
    img.blit(g);
  });
}
for (let n = 1; n <= 3; n++) {
  symbols.still(`dots${n}`, (img) => {
    const xs = n === 1 ? [8] : n === 2 ? [5, 11] : [3, 8, 13];
    xs.forEach((x, k) => {
      const r = rng(k * 5 + n);
      for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) if (r() > 0.08 || (dx === 0 && dy === 0)) img.set(x + dx, 8 + dy, chalkCol);
    });
  });
}
symbols.still('plate_wrong', (img) => {
  plate(img, PAL.rose2, PAL.rose3, PAL.rose3, PAL.rose1);
  img.line(5, 5, 10, 10, PAL.rose1);
  img.line(10, 5, 5, 10, PAL.rose1);
  img.line(4, 4, 9, 9, PAL.rose3);
});

export const sheets = [pickups, items, symbols];
