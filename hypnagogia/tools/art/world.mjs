// Generates the world/item/effect sprite sheets into hypnagogia/assets/sheets.
// Run from the repo root: node hypnagogia/tools/art/world.mjs
import { OUT_DIR, PREVIEW, savePreview } from './world-util.mjs';
import { buildTiles, mockRoom } from './world-tiles.mjs';
import { buildRift, riftPreview } from './world-rift.mjs';
import { shots, fx, boom } from './world-fx.mjs';

const sheets = [];
const tiles = {};
for (const n of ['roots', 'toys', 'heart']) {
  const s = buildTiles(n);
  tiles[n] = s;
  sheets.push(s);
  savePreview(mockRoom(s), `room_${n}.png`, 4);
}
const rift = buildRift();
sheets.push(rift);
savePreview(riftPreview(rift, tiles.roots), 'rift_room.png', 5);
sheets.push(shots, fx, boom);

for (const mod of ['./world-ui.mjs', './world-items.mjs', './world-props.mjs']) {
  try {
    const m = await import(mod);
    sheets.push(...m.sheets);
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  }
}

import { Img } from './lib.mjs';
function grid(s, cols, scale) {
  const rows = Math.ceil(s.rows.length / cols);
  const g = new Img(cols * (s.cellW + 2), rows * (s.cellH + 2));
  s.rows.forEach((r, k) => g.blit(r.cells[0], (k % cols) * (s.cellW + 2), Math.floor(k / cols) * (s.cellH + 2)));
  savePreview(g, s.name + '_grid.png', scale);
}
for (const s of sheets) {
  if (['items', 'symbols', 'glyphs', 'hud', 'tiles_roots', 'tiles_toys', 'tiles_heart'].includes(s.name)) grid(s, 7, 8);
  s.save(OUT_DIR);
  s.preview(`${PREVIEW}/${s.name}.png`, s.cellW >= 32 ? 4 : 6);
}
console.log('ok', sheets.map((s) => s.name).join(' '));
