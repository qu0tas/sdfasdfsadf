// Run with: npm test
// Covers the parts of the game that are pure logic: content data, builds, hearts and floor generation.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESSENCE_PER_GLASS } from '../src/data/balance.js';
import { ITEMS } from '../src/data/items.js';
import { STAGES, VARIANTS } from '../src/data/stages.js';
import { validateContent } from '../src/data/validate.js';
import { Health } from '../src/gameplay/health/Health.js';
import { computeBuild } from '../src/gameplay/items/Build.js';
import { ACTIVE_USES, PASSIVE_BEHAVIOURS } from '../src/gameplay/items/behaviourIds.js';
import { generateFloor, validateFloor } from '../src/gameplay/rooms/FloorGenerator.js';
import { populateRoom, rollEncounter, rollReward } from '../src/gameplay/rooms/populate.js';

test('content definitions are valid', () => {
  assert.deepEqual(validateContent({ passive: PASSIVE_BEHAVIOURS, active: ACTIVE_USES }), []);
});

test('every item builds on its own', () => {
  for (const item of ITEMS) assert.ok(computeBuild([item.id]).stats.damage > 0, item.id);
});

test('stat modifiers add first, then multiply', () => {
  const build = computeBuild(['night_light', 'milk_tooth']);
  assert.equal(build.stats.damage, (3 + 1) * 1.4);
});

test('the newest shape wins while mechanics stack', () => {
  const build = computeBuild(['milk_tooth', 'soap_bubbles', 'thread_spool']);
  assert.equal(build.shot.shape, 'bubble');
  assert.equal(build.shot.pierce, 3);
  assert.equal(build.shot.drag, 1);
});

test('synergies switch on from tags and item pairs', () => {
  assert.deepEqual(computeBuild(['music_box']).synergies, []);
  assert.ok(computeBuild(['music_box', 'soap_bubbles']).shot.burstOnEnd);
  assert.ok(computeBuild(['glass_marble', 'mirror_shard']).shot.splitOnBounce);
  assert.equal(computeBuild(['inkwell', 'thread_spool', 'crayon']).shot.trail, 'ink');
  assert.ok(computeBuild(['milk_tooth', 'plush_heart']).synergies.includes('biting_bear'));
});

test('hearts are lost in the order blue, glass, red', () => {
  const hp = new Health({ redMax: 6, red: 6, blue: 1, glass: 1, glassFilled: 1 });
  assert.equal(hp.damage(2), 'blue');
  assert.equal(hp.blue, 0);
  assert.equal(hp.damage(2), 'glass');
  assert.equal(hp.glassFilled, 0);
  assert.equal(hp.damage(2), 'red');
  assert.equal(hp.red, 4);
  assert.equal(hp.dead, false);
  hp.damage(4);
  assert.equal(hp.dead, true);
});

test('essence fills glass hearts and stops when they are full', () => {
  const hp = new Health({ glass: 1 });
  assert.equal(hp.addEssence(ESSENCE_PER_GLASS - 1), 0);
  assert.equal(hp.addEssence(1), 1);
  assert.equal(hp.glassFilled, 1);
  assert.equal(hp.addEssence(50), 0);
  assert.equal(hp.essence, 0);
});

test('floors are sound for many seeds, every stage and every variant', () => {
  for (let stage = 0; stage < STAGES.length; stage++) {
    for (const variant of Object.keys(VARIANTS)) {
      for (let seed = 1; seed <= 60; seed++) {
        const floor = generateFloor(seed * 2654435761, stage, variant);
        assert.deepEqual(validateFloor(floor), [], `seed ${seed}, stage ${stage}, ${variant}`);
        for (const type of STAGES[stage].special) {
          assert.ok(floor.rooms.some((room) => room.type === type), `missing ${type}`);
        }
      }
    }
  }
});

test('the same seed gives the same floor', () => {
  assert.deepEqual(generateFloor(12345, 1, 'restless'), generateFloor(12345, 1, 'restless'));
});

test('rooms populate and roll encounters without errors', () => {
  const ctx = { luck: 0, memoryCode: ['moon', 'key', 'eye'], pickItem: () => 'night_light' };
  for (let stage = 0; stage < STAGES.length; stage++) {
    for (let seed = 1; seed <= 25; seed++) {
      const floor = generateFloor(seed * 7477, stage, 'restless');
      for (const room of floor.rooms) {
        populateRoom(room, floor, ctx);
        const foes = rollEncounter(room, floor, { x: 60, y: 135 });
        if (room.type === 'combat' && room.id !== floor.startId) assert.ok(foes.length > 0, 'a fight needs enemies');
        if (room.type === 'boss') assert.equal(foes[0].type, STAGES[stage].boss);
        if (room.clue) assert.equal(room.decals.length, 2);
        rollReward(room, floor, ctx);
      }
    }
  }
});
