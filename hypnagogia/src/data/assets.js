// Sprite sheets and animations the game cannot run without. Checked when assets load, so a missing
// file is reported clearly instead of failing somewhere in the middle of a fight.
import { ITEMS } from './items.js';

const ENEMY = ['idle', 'move', 'attack', 'hit', 'death'];
const TILES = [
  'floor0', 'floor1', 'floor2', 'floor3', 'wall_n', 'wall_s', 'wall_w', 'wall_e',
  'corner_nw', 'corner_ne', 'corner_sw', 'corner_se', 'block', 'cracked', 'rubble', 'decor0', 'decor1',
];
const SYMBOLS = ['moon', 'star', 'eye', 'key', 'spiral', 'clock'];

export const REQUIRED_SHEETS = {
  zero: ['idle', 'blink', 'walk', 'shoot', 'dash', 'hit', 'use', 'death', 'appear'],
  blob: ENEMY, eye: ENEMY, windup: ENEMY, teddy: ENEMY, spider: ENEMY, tv: ENEMY, balloon: ENEMY, sprout: ENEMY,
  merchant: ['idle', 'nod'],
  jack: ENEMY,
  clump: [...ENEMY, 'spit'],
  warden: [...ENEMY, 'windup', 'charge'],
  toyheart: ['idle', 'beat', 'open', 'hit', 'death'],
  tiles_roots: TILES, tiles_toys: TILES, tiles_heart: TILES,
  rift: ['open', 'sealed', 'locked', 'unlock', 'unstable', 'boss', 'stage', 'secret', 'crack'],
  glyphs: ['treasure', 'shop', 'boss', 'miniboss', 'puzzle', 'event', 'unknown', 'secret', 'memory', 'start'],
  shots: ['tear', 'note', 'tooth', 'bubble', 'bear', 'chord', 'star', 'orb', 'static', 'cog', 'stuffing', 'thorn', 'stitch'],
  fx: [
    'pop_cyan', 'pop_rose', 'mist', 'puff', 'sparkle', 'heal', 'shatter', 'essence', 'puddle', 'telegraph', 'stun', 'frost', 'trail',
  ],
  boom: ['ink', 'ring'],
  pickups: ['dust', 'dust_big', 'shard', 'ink', 'heart_red', 'heart_half', 'heart_blue', 'heart_glass', 'bomb'],
  hud: [
    'heart_full', 'heart_half', 'heart_empty', 'blue_full', 'blue_half', 'glass_empty', 'glass_full',
    'dust', 'shard', 'ink', 'essence', 'charge_on', 'charge_off',
  ],
  items: ITEMS.map((item) => item.id),
  symbols: [...SYMBOLS.flatMap((s) => [`${s}_chalk`, `${s}_plate`, `${s}_lit`]), 'dots1', 'dots2', 'dots3', 'plate_wrong'],
  props: ['pedestal', 'well', 'mirror', 'clock', 'memory_door', 'memory_open', 'shadow_s', 'shadow_l', 'drawing'],
};
