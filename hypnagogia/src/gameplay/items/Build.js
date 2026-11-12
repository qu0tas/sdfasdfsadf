// Turns the list of held items into the numbers and projectile rules the game uses.
// This is pure data work, so it runs only when the inventory changes and is easy to test.
import { BASE_SHOT, BASE_STATS } from '../../data/balance.js';
import { ITEM_BY_ID } from '../../data/items.js';
import { SYNERGIES } from '../../data/synergies.js';

/** When several sources ask for a trail, the highest priority wins. */
const TRAIL_PRIORITY = { crayon: 1, ink: 2 };

/** Limits that keep stacked items from breaking the game. */
const LIMITS = {
  damage: [0.5, 40],
  fireDelay: [0.09, 2],
  shotSpeed: [60, 420],
  range: [60, 600],
  speed: [50, 170],
  shots: [1, 7],
  spread: [0, 30],
  dashCd: [0.3, 2],
};

function ruleActive(rule, tags, held) {
  const needTags = rule.requires.tags ?? {};
  const needItems = rule.requires.items ?? [];
  return Object.entries(needTags).every(([tag, n]) => (tags[tag] ?? 0) >= n) && needItems.every((id) => held.has(id));
}

/**
 * Projectile fields:
 *   shape          sprite and impact style; the most recently gained shape wins, mechanics still stack
 *   size           added to the hit radius multiplier
 *   pierce         enemies a shot passes through
 *   bounce         wall bounces
 *   wave           sideways sway strength
 *   homing         how strongly a shot turns towards the nearest enemy
 *   drag           shots slow down and hang in the air
 *   knock          push applied to enemies
 *   chordEvery     every n-th volley is a heavy chord shot
 *   splitOnBounce  a bouncing shot splits in two
 *   splitOnHit     { count, shape, damageMul } spawned on the first hit
 *   burstOnEnd     { count, shape, damageMul } spawned when the shot expires
 *   trail          'crayon' (burns) or 'ink' (burns and slows) left behind the shot
 */
function applyShot(shot, change) {
  if (!change) return;
  for (const [key, value] of Object.entries(change)) {
    if (!(key in BASE_SHOT)) throw new Error(`Unknown shot field "${key}"`);
    if (key === 'trail') {
      if (!shot.trail || TRAIL_PRIORITY[value] > TRAIL_PRIORITY[shot.trail]) shot.trail = value;
    } else if (typeof value === 'number') {
      shot[key] += value;
    } else if (typeof value === 'boolean') {
      shot[key] = shot[key] || value;
    } else {
      shot[key] = value;
    }
  }
}

/**
 * @param {string[]} itemIds held items in pickup order
 * @returns {{stats: object, shot: object, behaviours: Set<string>, tags: object, synergies: string[]}}
 */
export function computeBuild(itemIds) {
  const held = new Set(itemIds);
  const tags = {};
  const sources = [];
  for (const id of itemIds) {
    const def = ITEM_BY_ID[id];
    if (!def) throw new Error(`Unknown item "${id}"`);
    for (const tag of def.tags) tags[tag] = (tags[tag] ?? 0) + 1;
    sources.push(def);
  }

  const synergies = SYNERGIES.filter((rule) => ruleActive(rule, tags, held));
  for (const rule of synergies) sources.push(rule.effect);

  // Order is fixed so stacking is predictable: every addition first, then every multiplication.
  const stats = { ...BASE_STATS };
  const mods = sources.flatMap((s) => s.mods ?? []);
  for (const mod of mods) {
    if (!(mod.stat in stats)) throw new Error(`Unknown stat "${mod.stat}"`);
    if (mod.op === 'add') stats[mod.stat] += mod.value;
  }
  for (const mod of mods) if (mod.op === 'mul') stats[mod.stat] *= mod.value;
  for (const [stat, [lo, hi]] of Object.entries(LIMITS)) stats[stat] = Math.max(lo, Math.min(hi, stats[stat]));
  stats.shots = Math.round(stats.shots);

  const shot = { ...BASE_SHOT };
  const behaviours = new Set();
  for (const source of sources) {
    applyShot(shot, source.shot);
    for (const id of source.behaviours ?? []) behaviours.add(id);
  }

  return { stats, shot, behaviours, tags, synergies: synergies.map((rule) => rule.id) };
}
