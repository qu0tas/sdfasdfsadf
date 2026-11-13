// Checks every content definition once at startup and reports problems in plain words.
import { COLS, ROWS } from '../app/Config.js';
import { BASE_SHOT, BASE_STATS } from './balance.js';
import { BOSSES, ENEMIES } from './enemies.js';
import { ITEMS, ITEM_BY_ID } from './items.js';
import { ROOM_TEMPLATES, TEMPLATE_BY_ID } from './rooms.js';
import { STAGES, VARIANTS } from './stages.js';
import { SYNERGIES } from './synergies.js';
import { TAGS } from './tags.js';
import { MARKS } from './unlocks.js';

const ROOM_TYPES = ['treasure', 'shop', 'puzzle', 'event', 'miniboss', 'elite', 'memory'];

function checkEffect(where, effect, problems) {
  for (const mod of effect.mods ?? []) {
    if (!(mod.stat in BASE_STATS)) problems.push(`${where}: unknown stat "${mod.stat}"`);
    if (mod.op !== 'add' && mod.op !== 'mul') problems.push(`${where}: unknown operation "${mod.op}"`);
    if (typeof mod.value !== 'number') problems.push(`${where}: modifier value must be a number`);
  }
  for (const field of Object.keys(effect.shot ?? {})) {
    if (!(field in BASE_SHOT)) problems.push(`${where}: unknown shot field "${field}"`);
  }
}

function checkTemplate(template, problems) {
  const where = `room layout "${template.id}"`;
  if (template.rows.length !== ROWS || template.rows.some((row) => row.length !== COLS)) {
    problems.push(`${where}: must be ${COLS} x ${ROWS} tiles`);
    return;
  }
  if (template.rows.some((row) => /[^.#x]/.test(row))) problems.push(`${where}: only . # x are allowed`);
  const open = (c, r) => template.rows[r]?.[c] === '.';
  const midC = (COLS - 1) / 2;
  const midR = (ROWS - 1) / 2;
  const doors = [[midC, 0], [midC, ROWS - 1], [0, midR], [COLS - 1, midR]];
  const seen = new Set();
  const queue = [[midC, midR]];
  if (!open(midC, midR)) problems.push(`${where}: the centre tile must be floor`);
  while (queue.length) {
    const [c, r] = queue.pop();
    if (!open(c, r) || seen.has(r * COLS + c)) continue;
    seen.add(r * COLS + c);
    queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  for (const [c, r] of doors) if (!seen.has(r * COLS + c)) problems.push(`${where}: a rift is blocked at ${c},${r}`);
  const floor = template.rows.join('').split('.').length - 1;
  if (seen.size !== floor) problems.push(`${where}: some floor tiles cannot be reached`);
}

/**
 * @param {object} [behaviours] { passive: string[], active: string[] } ids implemented in code
 * @returns {string[]} problems; empty when the content is sound
 */
export function validateContent(behaviours) {
  const problems = [];
  const ids = new Set();
  const markIds = new Set(MARKS.map((mark) => mark.id));

  for (const item of ITEMS) {
    const where = `item "${item.id}"`;
    if (ids.has(item.id)) problems.push(`${where}: duplicate id`);
    ids.add(item.id);
    if (!item.name || !item.desc) problems.push(`${where}: needs a name and a description`);
    if (!['passive', 'active'].includes(item.kind)) problems.push(`${where}: unknown kind "${item.kind}"`);
    for (const tag of item.tags) if (!TAGS[tag]) problems.push(`${where}: unknown tag "${tag}"`);
    if (item.unlock && !markIds.has(item.unlock)) problems.push(`${where}: unknown mark "${item.unlock}"`);
    if (item.kind === 'active' && !(item.charge > 0 && item.use)) problems.push(`${where}: active items need charge and use`);
    if (behaviours) {
      for (const id of item.behaviours ?? []) {
        if (!behaviours.passive.includes(id)) problems.push(`${where}: behaviour "${id}" is not implemented`);
      }
      if (item.use && !behaviours.active.includes(item.use)) problems.push(`${where}: use "${item.use}" is not implemented`);
    }
    checkEffect(where, item, problems);
  }

  for (const rule of SYNERGIES) {
    const where = `synergy "${rule.id}"`;
    for (const tag of Object.keys(rule.requires.tags ?? {})) if (!TAGS[tag]) problems.push(`${where}: unknown tag "${tag}"`);
    for (const id of rule.requires.items ?? []) if (!ITEM_BY_ID[id]) problems.push(`${where}: unknown item "${id}"`);
    checkEffect(where, rule.effect, problems);
  }

  for (const template of ROOM_TEMPLATES) checkTemplate(template, problems);
  for (const id of ['open', 'corners']) if (!TEMPLATE_BY_ID[id]) problems.push(`room layout "${id}" is required`);

  for (const stage of STAGES) {
    const where = `stage "${stage.id}"`;
    for (const id of stage.enemies) if (!ENEMIES[id]) problems.push(`${where}: unknown enemy "${id}"`);
    if (!BOSSES[stage.boss]) problems.push(`${where}: unknown boss "${stage.boss}"`);
    for (const type of stage.special) if (!ROOM_TYPES.includes(type)) problems.push(`${where}: unknown room type "${type}"`);
    if (stage.special.includes('miniboss') && !BOSSES[stage.miniboss]) problems.push(`${where}: needs a miniboss`);
  }
  for (const [id, variant] of Object.entries(VARIANTS)) {
    for (const type of variant.extra ?? []) if (!ROOM_TYPES.includes(type)) problems.push(`variant "${id}": unknown room type "${type}"`);
  }
  return problems;
}
