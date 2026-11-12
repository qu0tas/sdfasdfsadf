// Tunable numbers. These are first-pass values for the playable slice, not final balance.

/** Player statistics before any item. Items change these through `mods` (see data/items.js). */
export const BASE_STATS = {
  damage: 3, // damage of one shot
  fireDelay: 0.36, // seconds between shots
  shotSpeed: 200, // pixels per second
  range: 210, // pixels a shot travels
  speed: 96, // movement, pixels per second
  shots: 1, // projectiles per volley
  spread: 0, // extra degrees between projectiles of one volley
  luck: 0, // improves drops and rare items
  dustMul: 1, // multiplier for Sleep Dust picked up
  essenceMul: 1, // multiplier for essence gained from enemies
  inkRadius: 1, // multiplier for the Ink explosion radius
  iframes: 1, // multiplier for invulnerability after a hit
  dashCd: 0.9, // seconds between dashes
};

/** The basic shot before items transform it. Every field is explained in gameplay/items/Build.js. */
export const BASE_SHOT = {
  shape: 'tear',
  size: 1,
  pierce: 0,
  bounce: 0,
  wave: 0,
  homing: 0,
  drag: 0,
  knock: 1,
  chordEvery: 0,
  splitOnBounce: false,
  splitOnHit: null,
  burstOnEnd: null,
  trail: null,
};

export const PLAYER = {
  radius: 5,
  startRed: 6, // in half hearts
  startGlass: 1,
  startShards: 1,
  startInk: 1,
  hitInvuln: 1.0,
  dashTime: 0.16,
  dashSpeed: 330,
  maxHearts: 12, // red containers + glass hearts
  maxBlue: 12, // half hearts
};

/** Proposal (open design question): essence needed to fill one Glass Heart. */
export const ESSENCE_PER_GLASS = 12;

export const INK = { fuse: 1.5, radius: 44, damage: 40 };

export const PRICES = { item: 15, heart_red: 4, heart_blue: 6, shard: 5, ink: 5, heart_glass: 9 };

/** How many wrong attempts a symbol puzzle tolerates before it falls silent for the rest of the run. */
export const PUZZLE_ATTEMPTS = 3;
