import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { zeroSheet } from './char-zero.mjs';
import { clampBorder } from './char-lib.mjs';

// Usage: node hypnagogia/tools/art/characters.mjs [sheet ...]   (PREVIEW=6 also writes /tmp/art-preview/*.png)
const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'sheets');
const only = process.argv.slice(2);
const sheets = { zero: zeroSheet };
for (const m of ['enemies', 'npc', 'boss']) {
  try {
    Object.assign(sheets, (await import(`./char-${m}.mjs`)).sheets);
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  }
}
for (const [name, make] of Object.entries(sheets)) {
  if (only.length && !only.includes(name)) continue;
  const s = make();
  s.save(out);
  if (process.env.PREVIEW) s.preview(`/tmp/art-preview/${name}.png`, Number(process.env.PREVIEW));
  console.log('wrote', name, 'clipped border px:', clampBorder.hits); clampBorder.hits = 0;
}
