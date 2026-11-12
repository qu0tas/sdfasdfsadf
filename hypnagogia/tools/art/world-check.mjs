// Sanity check for generated world sheets: expected names, frame counts, non-empty cells, palette.
// Run after world.mjs: node hypnagogia/tools/art/world-check.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAL, rgba } from './lib.mjs';
import { OUT_DIR } from './world-util.mjs';
import * as tilesMod from './world-tiles.mjs';
import { buildRift } from './world-rift.mjs';
import { shots, fx, boom } from './world-fx.mjs';
import { sheets as ui } from './world-ui.mjs';
import { sheets as items } from './world-items.mjs';
import { sheets as props } from './world-props.mjs';

const all = [buildRift(), shots, fx, boom, ...ui, ...items, ...props, ...['roots', 'toys', 'heart'].map((n) => tilesMod.buildTiles(n))];
const pal = new Set(Object.values(PAL).map((c) => rgba(c).slice(0, 3).join(',')));
let bad = 0;
for (const s of all) {
  const meta = JSON.parse(readFileSync(join(OUT_DIR, `${s.name}.json`), 'utf8'));
  for (const r of s.rows) {
    const m = meta.anims[r.name];
    if (!m || m.frames !== r.cells.length) {
      console.log('meta mismatch', s.name, r.name);
      bad++;
    }
    r.cells.forEach((c, i) => {
      let n = 0;
      const off = new Set();
      for (let k = 0; k < c.data.length; k += 4) {
        if (!c.data[k + 3]) continue;
        n++;
        if (c.data[k + 3] === 255 && !pal.has(`${c.data[k]},${c.data[k + 1]},${c.data[k + 2]}`)) off.add(`${c.data[k]},${c.data[k + 1]},${c.data[k + 2]}`);
      }
      if (!n) {
        console.log('EMPTY', s.name, r.name, i);
        bad++;
      }
      if (off.size) {
        console.log('OFF-PALETTE', s.name, r.name, i, [...off].join(' '));
        bad++;
      }
      if (i > 0 && s.cellW <= 16 && r.cells[0].data.every((v, k) => v === c.data[k])) console.log('identical frame', s.name, r.name, i);
    });
  }
}
console.log(bad ? `${bad} problems` : 'all sheets ok');
