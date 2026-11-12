// Themed 16x16 tile sheets: tiles_roots, tiles_toys, tiles_heart.
import { Img, PAL, Sheet } from './lib.mjs';
import { ball, slab, sprite, hash, rng, chalkLine } from './world-util.mjs';

function specks(img, seed, n, colors, margin = 2) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = margin + Math.floor(r() * (16 - margin * 2));
    const y = margin + Math.floor(r() * (16 - margin * 2));
    img.set(x, y, colors[i % colors.length]);
  }
}

const THEMES = {
  roots: {
    floorBase: PAL.gb1,
    floor(img, v) {
      if (v === 1) {
        specks(img, 11, 5, ['dark', 'gb2']);
        img.rect(9, 10, 2, 1, 'dark');
      }
      if (v === 2) {
        chalkLine(img, 3, 5, 9, 7, 'dark', 5, 0);
        img.set(10, 8, 'dark');
        img.set(12, 12, 'gb2');
        img.set(4, 12, 'gb2');
      }
      if (v === 3) {
        specks(img, 41, 4, ['gb2', 'dark']);
        img.rect(5, 11, 3, 2, 'dark');
        img.set(5, 11, 'gb2');
        img.set(11, 4, 'moss1');
      }
      if (v === 0) specks(img, 3, 2, ['dark']);
    },
    top(x, y) {
      const v = (x + y) & 7;
      const w = (x - y + 32) & 15;
      if (w < 2) return v & 1 ? 'pu1' : 'gb1';
      return ['dark', 'pu1', 'gb1', 'pu1', 'ink', 'ink', 'dark', 'ink'][v];
    },
    glints: { n: [[3, 4], [12, 2]], s: [[5, 10], [12, 7]], w: [[4, 3], [9, 12]], e: [[10, 5], [5, 13]], c: [[7, 7]] },
    glint: 'cy1',
    rim: 'gb2',
    face(x, yy) {
      const g = (x * 3 + (x >> 2)) % 5;
      return yy === 0 ? 'gb2' : yy < 5 ? (g < 2 ? 'gb1' : 'pu1') : yy === 5 ? 'dark' : 'ink';
    },
  },
  toys: {
    floorBase: PAL.pu2,
    floor(img, v) {
      const dot = (x, y) => img.set(x, y, 'pu3');
      if (v === 1) {
        dot(4, 11); dot(11, 4);
      }
      if (v === 2) {
        dot(7, 7); dot(8, 7); dot(7, 8); dot(8, 8);
        img.set(2, 13, 'pu1');
      }
      if (v === 3) {
        img.rect(3, 3, 3, 1, 'pu3');
        img.set(10, 10, 'pu1');
        img.set(11, 10, 'pu1');
      }
    },
    top(x) {
      return x % 8 < 4 ? 'pu1' : 'dark';
    },
    glints: { n: [], s: [], w: [], e: [], c: [] },
    glint: 'rose1',
    rim: 'pu3',
    face(x, yy) {
      if (yy === 0) return 'pu4';
      if (yy <= 3) return x % 8 < 4 ? 'gb2' : 'gb1';
      if (yy === 4) return x % 8 === 2 ? 'rose1' : x % 8 < 4 ? 'gb2' : 'gb1';
      return yy === 5 ? 'pu3' : 'pu1';
    },
  },
  heart: {
    floorBase: PAL.pu2,
    floor(img, v) {
      const st = (x, y, vert) => {
        for (let i = 0; i < 3; i++) img.set(vert ? x : x + i * 2, vert ? y + i * 2 : y, 'pu3');
      };
      if (v === 1) {
        img.rect(3, 3, 10, 10, 'pu1');
        st(4, 3, false); st(4, 12, false); st(3, 5, true); st(12, 5, true);
      }
      if (v === 2) {
        st(2, 8, false); st(8, 4, false);
        img.set(11, 11, 'pu1');
      }
      if (v === 3) {
        img.set(6, 9, 'pu1');
        img.set(7, 9, 'pu1');
        img.set(10, 5, 'pu3');
      }
      if (v === 0) {
        img.set(3, 8, 'pu3');
        img.set(12, 8, 'pu3');
      }
    },
    top(x, y) {
      const dx = Math.abs((x % 8) - 4);
      const dy = Math.abs((y % 8) - 4);
      if (dx + dy === 4) return 'ink';
      if (dx + dy <= 2 && x % 8 < 4 && y % 8 < 4) return 'pu2';
      return 'pu1';
    },
    glints: { n: [], s: [], w: [], e: [], c: [] },
    glint: 'rose2',
    rim: 'pu3',
    face(x, yy) {
      if (yy === 0) return 'pu3';
      if (yy === 5) return 'dark';
      if (yy === 6) return 'ink';
      return yy === 3 && x % 3 !== 2 ? 'rose2' : 'pu2';
    },
  },
};

function wallTop(img, th, key) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) img.set(x, y, th.top(x, y));
  for (const [x, y] of th.glints[key] ?? []) img.set(x, y, th.glint);
}

function wallTile(th, kind, name) {
  const img = new Img(16, 16);
  wallTop(img, th, kind);
  if (kind === 'n') {
    img.rect(0, 8, 16, 1, 'outline');
    for (let yy = 0; yy < 7; yy++) for (let x = 0; x < 16; x++) img.set(x, 9 + yy, th.face(x, yy));
    img.rect(0, 15, 16, 1, 'outline');
    if (name === 'heart') {
      img.rect(7, 10, 2, 2, 'rose3');
      img.set(7, 10, 'white');
      img.rect(7, 12, 2, 1, 'rose1');
    }
  } else if (kind === 's') {
    img.rect(0, 0, 16, 1, 'outline');
    img.rect(0, 1, 16, 1, th.rim);
    img.rect(0, 2, 16, 1, 'dark');
  } else if (kind === 'w') {
    img.rect(15, 0, 1, 16, 'outline');
    img.rect(14, 0, 1, 16, th.rim);
    img.rect(13, 0, 1, 16, 'dark');
  } else if (kind === 'e') {
    img.rect(0, 0, 1, 16, 'outline');
    img.rect(1, 0, 1, 16, th.rim);
    img.rect(2, 0, 1, 16, 'dark');
  }
  return img;
}

function cornerTile(th, c) {
  const img = new Img(16, 16);
  wallTop(img, th, 'c');
  const ix = c.includes('w') ? 15 : 0;
  const iy = c.includes('n') ? 15 : 0;
  const sx = ix === 15 ? -1 : 1;
  const sy = iy === 15 ? -1 : 1;
  img.set(ix, iy, 'outline');
  img.set(ix + sx, iy, th.rim);
  img.set(ix, iy + sy, th.rim);
  img.set(ix + sx, iy + sy, th.rim);
  img.set(ix + sx * 2, iy, 'outline');
  img.set(ix, iy + sy * 2, 'outline');
  return img;
}

function floorTile(th, v) {
  const img = new Img(16, 16).rect(0, 0, 16, 16, th.floorBase);
  th.floor(img, v);
  return img;
}

function crackLines(img) {
  const o = PAL.outline;
  img.line(8, 2, 7, 5, o);
  img.line(7, 5, 9, 7, o);
  img.line(9, 7, 8, 10, o);
  img.line(8, 10, 9, 13, o);
  img.line(7, 5, 4, 6, o);
  img.line(9, 7, 12, 8, o);
}

const OB = {
  roots(img, cracked) {
    sprite(img, (t) => {
      t.ellipse(7.5, 10, 6, 4, PAL.pu1);
      t.rect(2, 8, 12, 4, PAL.pu1);
      for (let x = 3; x < 13; x += 3) t.line(x, 10, x, 12, PAL.dark);
      t.rect(1, 13, 3, 1, PAL.pu1);
      t.rect(12, 13, 3, 1, PAL.pu1);
      ball(t, 7.5, 6.5, 6, 4.5, [PAL.gb1, PAL.gb2, PAL.gb3]);
      t.ellipse(7.5, 6.5, 3, 2, PAL.gb1);
      t.ellipse(7.5, 6.5, 1, 0.5, PAL.gb2);
      t.set(4, 4, PAL.cy1);
    });
    if (cracked) crackLines(img);
  },
  toys(img, cracked) {
    sprite(img, (t) => {
      t.rect(2, 9, 12, 5, PAL.sand1);
      t.rect(2, 9, 12, 1, PAL.sand2);
      slab(t, 2, 2, 12, 8, [PAL.sand1, PAL.sand2, PAL.sand3]);
      t.pixels(5, 3, ['.rrr.', 'r...r', 'r...r', 'rrrrr', 'r...r', 'r...r'], { r: PAL.rose2 });
    });
    if (cracked) crackLines(img);
  },
  heart(img, cracked) {
    sprite(img, (t) => {
      t.rect(2, 9, 12, 4, PAL.rose1);
      t.rect(3, 13, 10, 1, PAL.rose1);
      ball(t, 7.5, 7, 6, 5, [PAL.rose1, PAL.rose2, PAL.rose3]);
      t.ellipse(7.5, 7, 3, 2.5, PAL.rose2);
      for (const [x, y, c] of [[5, 4, 'cy3'], [10, 5, 'sand3'], [7, 8, 'white'], [11, 8, 'pu4']]) {
        t.set(x, y, PAL[c]);
        t.set(x, y + 1, PAL.gb4);
      }
      for (let x = 3; x < 13; x += 2) t.set(x, 11, PAL.heart1);
    });
    if (cracked) crackLines(img);
  },
};

function rubbleTile(th, name) {
  const img = floorTile(th, 0);
  const cols = { roots: ['gb2', 'pu1', 'dark'], toys: ['sand1', 'sand2', 'pu3'], heart: ['rose1', 'rose2', 'pu3'] }[name];
  const r = rng(77);
  for (let i = 0; i < 9; i++) {
    const x = 2 + Math.floor(r() * 11);
    const y = 3 + Math.floor(r() * 10);
    const c = cols[i % 3];
    if (i % 3 === 0) img.rect(x, y, 2, 1, c);
    else img.set(x, y, c);
  }
  img.rect(7, 8, 2, 1, cols[0]);
  img.set(7, 9, 'dark');
  return img;
}

function decorTile(th, name, n) {
  const img = floorTile(th, 0);
  const pts = (list, c) => list.forEach(([x, y]) => img.set(x, y, c));
  if (name === 'roots') {
    if (n === 0) {
      chalkLine(img, 2, 12, 8, 9, 'dark', 3, 0);
      chalkLine(img, 8, 9, 13, 3, 'dark', 4, 0);
      img.line(8, 9, 12, 11, PAL.dark);
      img.set(13, 3, 'moss1');
    } else {
      chalkLine(img, 3, 3, 6, 8, 'dark', 9, 0);
      chalkLine(img, 6, 8, 5, 13, 'dark', 8, 0);
      img.line(6, 8, 11, 9, PAL.dark);
      img.set(12, 9, 'cy1');
    }
  } else if (name === 'toys') {
    if (n === 0) {
      chalkLine(img, 3, 11, 6, 5, 'pu3', 2, 0);
      chalkLine(img, 6, 5, 9, 11, 'pu3', 3, 0);
      chalkLine(img, 4, 9, 8, 9, 'pu3', 4, 0);
    } else {
      pts([[4, 8], [5, 7], [6, 8], [7, 9], [8, 9], [9, 8], [10, 7], [11, 8]], 'pu3');
      img.rect(5, 12, 5, 1, 'rose1');
    }
  } else if (n === 0) {
    pts([[3, 4], [4, 5], [5, 6], [6, 7], [7, 7], [8, 7], [9, 8], [10, 9], [11, 10], [12, 11]], 'pu3');
    img.set(12, 12, 'rose2');
  } else {
    pts([[4, 11], [5, 10], [6, 10], [7, 11], [8, 12], [9, 12], [10, 11], [10, 10]], 'pu3');
    pts([[3, 4], [4, 4], [5, 4]], 'rose1');
  }
  return img;
}

export function buildTiles(name) {
  const th = THEMES[name];
  const s = new Sheet(`tiles_${name}`, 16, 16);
  const still = (id, img) => s.still(id, (c) => c.blit(img));
  for (let v = 0; v < 4; v++) still(`floor${v}`, floorTile(th, v));
  for (const k of ['n', 's', 'w', 'e']) still(`wall_${k}`, wallTile(th, k, name));
  for (const c of ['nw', 'ne', 'sw', 'se']) still(`corner_${c}`, cornerTile(th, c));
  for (const [id, cr] of [['block', false], ['cracked', true]]) {
    const img = floorTile(th, 0);
    OB[name](img, cr);
    still(id, img);
  }
  still('rubble', rubbleTile(th, name));
  still('decor0', decorTile(th, name, 0));
  still('decor1', decorTile(th, name, 1));
  return s;
}

/** Mock room for visual review. */
export function mockRoom(sheet) {
  const get = (id) => sheet.rows.find((r) => r.name === id).cells[0];
  const W = 12;
  const H = 8;
  const room = new Img(W * 16, H * 16);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let id;
      if (y === 0) id = x === 0 ? 'corner_nw' : x === W - 1 ? 'corner_ne' : 'wall_n';
      else if (y === H - 1) id = x === 0 ? 'corner_sw' : x === W - 1 ? 'corner_se' : 'wall_s';
      else if (x === 0) id = 'wall_w';
      else if (x === W - 1) id = 'wall_e';
      else id = `floor${Math.floor(hash(x, y, 9) * 4)}`;
      room.blit(get(id), x * 16, y * 16);
    }
  }
  for (const [id, x, y] of [['block', 4, 2], ['block', 5, 2], ['cracked', 8, 4], ['rubble', 3, 5], ['decor0', 6, 5], ['decor1', 9, 2]]) {
    room.blit(get(id), x * 16, y * 16);
  }
  return room;
}
