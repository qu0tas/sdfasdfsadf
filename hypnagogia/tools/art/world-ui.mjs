// `glyphs` (map icons) and `hud` sheets, 12x12 cells.
import { Img, PAL, Sheet } from './lib.mjs';
import { sprite } from './world-util.mjs';

const KEY = {
  w: PAL.white, c: PAL.cy3, d: PAL.cy2, e: PAL.cy1, g: PAL.gb4, h: PAL.gb3, p: PAL.pu4, q: PAL.pu3,
  r: PAL.rose3, o: PAL.rose2, s: PAL.sand3, t: PAL.sand2, k: PAL.ink, m: PAL.moss3, n: PAL.moss2,
  a: PAL.heart2, l: PAL.heart3, b: PAL.heart1, u: PAL.pu1, v: PAL.pu2, z: PAL.dark, y: PAL.gb2, x: PAL.gb1,
};

/** Draws ASCII art centred in the 12x12 cell (max 10x10) and outlines it. */
function ascii(img, rows) {
  const w = Math.max(...rows.map((r) => r.length));
  const ox = 1 + Math.floor((10 - w) / 2);
  const oy = 1 + Math.floor((10 - rows.length) / 2);
  sprite(img, (t) => t.pixels(ox, oy, rows, KEY));
}

const glyphs = new Sheet('glyphs', 12, 12);
const G = (n, rows) => glyphs.still(n, (img) => ascii(img, rows));

G('treasure', [
  '....tt....',
  '....ss....',
  'ttssssssst',
  '.tsswssst.',
  '..tsssst..',
  '..tsssst..',
  '.tsst.sst.',
  '.tt....tt.',
]);
G('shop', [
  '...qpqp...',
  '....pp....',
  '...gwgg...',
  '..gwcccc..',
  '.gwcccccd.',
  '.gccccccd.',
  '.gccdcccd.',
  '..gcccdd..',
]);
G('boss', [
  '.rrrrrrrr.',
  'rrrrrrrrrr',
  'rrkkrrkkrr',
  'rkkkrrkkkr',
  'rkkkrrkkkr',
  'rrkkrrkkrr',
  'rrrrkkrrrr',
  '.rrrrrrrr.',
  '..r.rr.r..',
]);
G('miniboss', [
  'r........r',
  'rr......rr',
  '.rrrrrrrr.',
  '.rwwwwwwr.',
  'rwwkkkkwwr',
  'rwwkokkwwr',
  'rwwkkkkwwr',
  '.rwwwwwwr.',
  '..rrrrrr..',
]);
G('puzzle', [
  'pppppppppp',
  'pwwwwwwwwp',
  'pw......wp',
  'pw.wwww.wp',
  'pw.w..w.wp',
  'pw.w.ww.wp',
  'pw.w....wp',
  'pw.wwwwwwp',
  'pppppppppp',
]);
G('event', [
  '..cc..',
  '.cwcc.',
  '.cwcc.',
  '.cwcc.',
  '..cc..',
  '..cc..',
  '......',
  '..cc..',
  '.cwcc.',
  '..cc..',
]);
G('unknown', [
  '..cccc..',
  '.cwcccc.',
  '.cc..cc.',
  '.....cc.',
  '....cc..',
  '...cc...',
  '...cc...',
  '........',
  '...cc...',
  '...cc...',
]);
G('secret', [
  '..gggggg..',
  '.gg....gg.',
  'gg...gg.gg',
  'g...gg...g',
  'g....gg..g',
  'g.....g..g',
  'gg...g..gg',
  '.gg....gg.',
  '..gggggg..',
]);
G('memory', [
  '...pppp...',
  '..pwwwwp..',
  '..pwkkwp..',
  '..pwkkwp..',
  '...pwwp...',
  '...pkkp...',
  '...pppp...',
  'w..w..w...'.replace('w..w..w...', '.w..w..w..'),
]);
G('start', [
  '.g......g.',
  'gggggggggg',
  'gwggggggwg',
  'gggkggkggg',
  'gggkggkggg',
  'ggrggggrgg',
  '.gggkkggg.',
  '..gggggg..',
]);

// ---------------------------------------------------------------- hud
const hud = new Sheet('hud', 12, 12);

const HEART = [
  '.xxx.xxx.',
  'xxxxxxxxx',
  'xxxxxxxxx',
  'xxxxxxxxx',
  '.xxxxxxx.',
  '..xxxxx..',
  '...xxx...',
  '....x....',
];

function heartHud(img, colorAt) {
  sprite(img, (t) => {
    HEART.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch !== 'x') return;
        const c = colorAt(x, y);
        if (c) t.set(1 + x, 2 + y, c);
      });
    });
  });
}

const lit = (x, y) => (x <= 2 && y <= 1) || (x === 1 && y === 2);
const shade = (x, y) => x + y >= 12 || (x >= 7 && y >= 3 && x + y >= 10);
const tonesFill = (tones) => (x, y) => (lit(x, y) ? tones[2] : shade(x, y) ? tones[0] : tones[1]);
const redFill = tonesFill([PAL.heart1, PAL.heart2, PAL.heart3]);
const blueFill = tonesFill([PAL.cy1, PAL.cy2, PAL.cy3]);
const emptyFill = (x, y) => (lit(x, y) ? PAL.pu3 : PAL.pu1);
const half = (fill) => (x, y) => (x <= 4 ? fill(x, y) : emptyFill(x, y) === PAL.pu3 ? PAL.pu1 : PAL.pu1);

hud.still('heart_full', (img) => heartHud(img, redFill));
hud.still('heart_half', (img) => heartHud(img, half(redFill)));
hud.still('heart_empty', (img) => heartHud(img, emptyFill));
hud.still('blue_full', (img) => heartHud(img, blueFill));
hud.still('blue_half', (img) => heartHud(img, half(blueFill)));

const edgeOf = (x, y) => {
  const at = (a, b) => HEART[b]?.[a] === 'x';
  return !(at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1));
};
hud.still('glass_empty', (img) => {
  heartHud(img, (x, y) => (edgeOf(x, y) ? PAL.gb3 : lit(x, y) && (x + y) % 2 === 1 ? PAL.gb5 : x + y === 4 && x === 1 ? PAL.gb5 : PAL.gb1));
  img.set(3, 4, PAL.gb5);
  img.set(4, 4, PAL.gb5);
  img.set(3, 5, PAL.gb5);
});
hud.still('glass_full', (img) => {
  heartHud(img, (x, y) => (edgeOf(x, y) ? PAL.gb4 : lit(x, y) ? PAL.white : shade(x, y) ? PAL.cy2 : PAL.cy3));
  img.set(3, 4, PAL.white);
  img.set(4, 4, PAL.white);
});

const H = (n, rows) => hud.still(n, (img) => ascii(img, rows));
H('dust', [
  '....w.....',
  '...cwc....',
  '..ccccc...',
  '.cccdcccc.',
  'cdccccdccc',
  'dcccwcccdd',
]);
H('shard', [
  '.....cw',
  '....cwc',
  '...cwcc',
  '..cwccd',
  '..cccdd',
  '...ccd.',
  '...cdd.',
  '....d..',
]);
H('ink', [
  '...tt...',
  '...kk...',
  '..gggg..',
  '.gwkkkg.',
  '.gwkkkg.',
  '.gkkkkg.',
  '.gkkkkg.',
  '..gggg..',
]);
H('essence', [
  '....c.....',
  '...cwc....',
  '..cwwwc...',
  '..cwwwd...',
  '...cdd....',
  '....d.....',
  '...d......',
]);
H('charge_on', [
  '.cccccc.',
  'cwwcccdc',
  'cwccccdc',
  'cccccddc',
  'cccccddc',
  'cdccdddc',
  '.cccccc.',
]);
H('charge_off', [
  '.vvvvvv.',
  'vyuuuuuv',
  'vyuuuuuv',
  'vuuuuuuv',
  'vuuuuuuv',
  'vuuuuuuv',
  '.vvvvvv.',
]);

const sheets = [glyphs, hud];
export { sheets };
