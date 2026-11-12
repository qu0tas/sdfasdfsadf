// The state of one run: where the player is on the Tree, what they carry and how they are.
// Everything here is temporary and is dropped when the run ends; permanent progress lives in Save.
import { PLAYER } from '../../data/balance.js';
import { ITEMS, ITEM_BY_ID } from '../../data/items.js';
import { STAGES, VARIANTS } from '../../data/stages.js';
import { Rng, randomSeed } from '../../utils/rng.js';
import { Health } from '../health/Health.js';
import { computeBuild } from '../items/Build.js';
import { generateFloor, validateFloor } from '../rooms/FloorGenerator.js';

const SNAPSHOT_VERSION = 1;

export class Run {
  constructor(save) {
    this.save = save;
  }

  static create(save, seed = randomSeed()) {
    const run = new Run(save);
    run.seed = seed;
    run.rng = new Rng(seed);
    run.stageIndex = 0;
    run.floor = generateFloor(run.rng.seed(), 0, 'plain');
    run.roomId = run.floor.startId;
    run.items = [];
    run.active = null;
    run.charge = 0;
    run.health = new Health();
    run.dust = 0;
    run.shards = PLAYER.startShards;
    run.ink = PLAYER.startInk;
    run.offered = [];
    run.stats = { kills: 0, rooms: 0, time: 0 };
    run.recompute();
    console.info(`[Hypnagogia] run seed ${seed}`);
    return run;
  }

  /** Rebuilds a run from a save. Returns null when the saved data cannot be trusted. */
  static restore(save, data) {
    try {
      if (data?.version !== SNAPSHOT_VERSION) return null;
      const run = new Run(save);
      const number = (v) => (Number.isFinite(v) && v >= 0 ? v : null);
      run.seed = number(data.seed) ?? 0;
      run.rng = new Rng(number(data.rngState) ?? run.seed);
      run.stageIndex = data.stageIndex;
      if (!STAGES[run.stageIndex] || !VARIANTS[data.floor?.variant] || !Array.isArray(data.floor.rooms)) return null;
      run.floor = data.floor;
      if (validateFloor(run.floor).length) return null;
      run.roomId = run.floor.rooms[data.roomId] ? data.roomId : run.floor.startId;
      run.items = (data.items ?? []).filter((id) => ITEM_BY_ID[id]?.kind === 'passive');
      run.active = ITEM_BY_ID[data.active]?.kind === 'active' ? data.active : null;
      run.charge = number(data.charge) ?? 0;
      run.health = new Health(data.health);
      if (run.health.dead) return null;
      run.dust = number(data.dust) ?? 0;
      run.shards = number(data.shards) ?? 0;
      run.ink = number(data.ink) ?? 0;
      run.offered = (data.offered ?? []).filter((id) => ITEM_BY_ID[id]);
      run.stats = { kills: number(data.stats?.kills) ?? 0, rooms: number(data.stats?.rooms) ?? 0, time: number(data.stats?.time) ?? 0 };
      run.recompute();
      return run;
    } catch (error) {
      console.error('The saved run could not be restored', error);
      return null;
    }
  }

  snapshot() {
    return {
      version: SNAPSHOT_VERSION,
      seed: this.seed,
      rngState: this.rng.state,
      stageIndex: this.stageIndex,
      floor: this.floor,
      roomId: this.roomId,
      items: this.items,
      active: this.active,
      charge: this.charge,
      health: this.health.toJSON(),
      dust: this.dust,
      shards: this.shards,
      ink: this.ink,
      offered: this.offered,
      stats: this.stats,
    };
  }

  get stage() {
    return STAGES[this.stageIndex];
  }

  get variant() {
    return VARIANTS[this.floor.variant];
  }

  get room() {
    return this.floor.rooms[this.roomId];
  }

  get isLastStage() {
    return this.stageIndex === STAGES.length - 1;
  }

  /** Recalculates stats, projectile rules and synergies. Called only when the inventory changes. */
  recompute() {
    this.build = computeBuild(this.active ? [...this.items, this.active] : this.items);
  }

  /**
   * Chooses an item for an altar or a shop shelf. Items already shown this run and items that are
   * still locked are skipped; luck makes rare items a little more likely.
   * @returns {string | null}
   */
  pickItem(pool) {
    const luck = this.build.stats.luck;
    const options = ITEMS.filter(
      (item) =>
        item.pools.includes(pool) &&
        !this.offered.includes(item.id) &&
        (!item.unlock || this.save.hasMark(item.unlock)),
    );
    const item = this.rng.weighted(options, (o) => (o.rarity === 'rare' ? 0.4 + luck * 0.1 : 1));
    if (!item) return null;
    this.offered.push(item.id);
    return item.id;
  }

  /**
   * Adds an item to the build and applies its one-off gifts.
   * @returns {{dropped: string | null, synergies: string[]}} the active item that was swapped out,
   *   and the synergies that just switched on
   */
  addItem(id) {
    const def = ITEM_BY_ID[id];
    const before = new Set(this.build.synergies);
    let dropped = null;
    if (def.kind === 'active') {
      dropped = this.active;
      this.active = id;
      this.charge = def.charge;
    } else {
      this.items.push(id);
    }
    if (!this.offered.includes(id)) this.offered.push(id);
    const grant = def.grant ?? {};
    for (let i = 0; i < (grant.container ?? 0); i++) this.health.addContainer();
    for (let i = 0; i < (grant.glass ?? 0); i++) this.health.addGlass();
    if (grant.heal) this.health.healRed(grant.heal);
    if (grant.blue) this.health.addBlue(grant.blue);
    this.ink += grant.ink ?? 0;
    this.shards += grant.shards ?? 0;
    this.dust += grant.dust ?? 0;
    this.recompute();
    this.save.seeItem(id);
    return { dropped, synergies: this.build.synergies.filter((s) => !before.has(s)) };
  }

  /** Moves on to the next stage through a stage rift. */
  nextStage(variantId) {
    this.stageIndex += 1;
    this.floor = generateFloor(this.rng.seed(), this.stageIndex, variantId);
    this.roomId = this.floor.startId;
  }

  /**
   * The two ways onward offered after a boss: one rift that shows where it leads and one that does not.
   * @returns {{variant: string, unstable: boolean}[]}
   */
  rollStageRifts() {
    const ids = Object.keys(VARIANTS).filter((id) => VARIANTS[id].weight > 0);
    const known = this.rng.weighted(ids, (id) => VARIANTS[id].weight);
    // The unstable rift favours the rarer dreams: that is the reason to gamble on it.
    const hidden = this.rng.weighted(ids.filter((id) => id !== known), (id) => 4 - VARIANTS[id].weight + 1);
    return [{ variant: known, unstable: false }, { variant: hidden, unstable: true }];
  }
}
