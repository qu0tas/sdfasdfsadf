// Things to pick up: resources and hearts on the floor, item altars, and shop goods with a price.
// The lasting data lives on the room (room.pickups / room.pedestals); this class gives it sprites.
import { LAYER } from '../../app/Config.js';
import { PLAYER } from '../../data/balance.js';
import { ITEM_BY_ID } from '../../data/items.js';
import { SYNERGIES } from '../../data/synergies.js';

const DUST_VALUE = { dust: 1, dust_big: 5 };

export class Loot {
  constructor(world) {
    this.world = world;
    this.pickups = [];
    this.pedestals = [];
  }

  clear() {
    for (const p of this.pickups) p.sprite.remove();
    for (const p of this.pedestals) {
      p.base.remove();
      p.icon?.remove();
    }
    this.pickups.length = 0;
    this.pedestals.length = 0;
    this.world.hud.labels([]);
  }

  build() {
    const room = this.world.room;
    for (const data of room.pickups) this.addPickup(data);
    for (const data of room.pedestals) this.addPedestal(data);
    this.refreshLabels();
  }

  addPickup(data, pop = false) {
    const sprite = this.world.stage.sprite('pickups', data.kind);
    sprite.layer = LAYER.ents;
    sprite.sortBias = -8;
    // A fresh drop hops out a little before it settles.
    const angle = Math.random() * Math.PI * 2;
    this.pickups.push({ data, sprite, vx: pop ? Math.cos(angle) * 80 : 0, vy: pop ? Math.sin(angle) * 80 : 0, wait: pop ? 0.35 : 0 });
  }

  /** Drops a new pickup into the room. */
  drop(kind, x, y) {
    const data = { kind, x, y };
    this.world.room.pickups.push(data);
    this.addPickup(data, true);
  }

  addPedestal(data) {
    const { stage } = this.world;
    const base = stage.sprite('props', 'pedestal');
    base.layer = LAYER.decal;
    base.x = data.x;
    base.y = data.y;
    const entry = { data, base, icon: null, armed: true };
    this.pedestals.push(entry);
    this.setIcon(entry);
  }

  setIcon(entry) {
    entry.icon?.remove();
    entry.icon = null;
    if (entry.data.taken) return;
    entry.icon = this.world.stage.sprite('items', entry.data.item);
    entry.icon.layer = LAYER.ents;
    entry.icon.x = entry.data.x;
    entry.icon.sortBias = 12;
  }

  spawnPedestal(item, x, y, extra = {}) {
    const data = { item, x, y, taken: false, ...extra };
    this.world.room.pedestals.push(data);
    this.addPedestal(data);
    this.world.fx.spawn('mist', x, y);
    this.refreshLabels();
  }

  refreshLabels() {
    const labels = [];
    for (const p of this.pickups) if (p.data.price) labels.push({ x: p.data.x, y: p.data.y + 20, text: String(p.data.price) });
    for (const p of this.pedestals) if (p.data.price && !p.data.taken) labels.push({ x: p.data.x, y: p.data.y + 24, text: String(p.data.price) });
    this.world.hud.labels(labels);
  }

  /** Applies a pickup to the run. Returns false when the player has no use for it right now. */
  apply(kind) {
    const { run, audio, fx, player } = this.world;
    const { health } = run;
    switch (kind) {
      case 'dust':
      case 'dust_big':
        run.dust += Math.max(1, Math.round(DUST_VALUE[kind] * run.build.stats.dustMul * (run.variant.dustMul ?? 1)));
        audio.sfx('dust');
        return true;
      case 'shard':
        run.shards += 1;
        audio.sfx('pickup');
        return true;
      case 'ink':
        run.ink += 1;
        audio.sfx('pickup');
        return true;
      case 'heart_red':
      case 'heart_half':
        if (!health.canHealRed()) return false;
        health.healRed(kind === 'heart_red' ? 2 : 1);
        audio.sfx('heart');
        fx.spawn('heal', player.x, player.y - 16);
        return true;
      case 'heart_blue':
        if (!health.canAddBlue()) return false;
        health.addBlue(2);
        audio.sfx('heart');
        return true;
      case 'heart_glass':
        if (!health.addGlass()) return false;
        audio.sfx('heart');
        return true;
      default:
        throw new Error(`Unknown pickup "${kind}"`);
    }
  }

  /** Pays the price if there is one. Returns false (and says so) when the player cannot afford it. */
  pay(price) {
    const { world } = this;
    if (!price) return true;
    if (world.run.dust < price) {
      world.prompt('Не хватает сонной пыли.');
      world.audio.sfx('deny');
      return false;
    }
    world.run.dust -= price;
    world.audio.sfx('buy');
    world.props.nod();
    return true;
  }

  takeItem(entry) {
    const { world } = this;
    const { run, hud, audio, fx, player } = world;
    const { data } = entry;
    const def = ITEM_BY_ID[data.item];
    const result = run.addItem(data.item);
    audio.sfx('item');
    fx.spawn('sparkle', data.x, data.y - 20);
    player.playOnce('use');
    hud.item(def.name, def.desc);
    for (const id of result.synergies) {
      const rule = SYNERGIES.find((s) => s.id === id);
      hud.toast(`Синергия: ${rule.name}`, rule.desc);
      audio.sfx('synergy');
    }
    if (result.dropped) {
      // Swapping active items: the old one stays on the altar.
      data.item = result.dropped;
      delete data.price;
      entry.armed = false;
    } else {
      data.taken = true;
    }
    this.setIcon(entry);
    this.refreshLabels();
    world.syncBehaviours();
    world.saveRun();
  }

  update(dt) {
    const { world } = this;
    const { player } = world;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const { data, sprite } = p;
      p.wait = Math.max(0, p.wait - dt);
      if (p.vx || p.vy) {
        world.grid.move(data, p.vx * dt, p.vy * dt, 7);
        p.vx *= Math.max(0, 1 - 6 * dt);
        p.vy *= Math.max(0, 1 - 6 * dt);
        if (Math.hypot(p.vx, p.vy) < 4) p.vx = p.vy = 0;
      }
      const dx = player.x - data.x;
      const dy = player.y - data.y;
      const d = Math.hypot(dx, dy) || 1;
      // Dust is drawn to the guardian.
      if (!data.price && DUST_VALUE[data.kind] && d < 70 && p.wait <= 0 && !player.dead) {
        world.grid.move(data, (dx / d) * 230 * dt, (dy / d) * 230 * dt, 5, true);
      }
      sprite.x = data.x;
      sprite.y = data.y;
      sprite.update(dt);

      if (player.dead || p.wait > 0 || d > player.radius + 11) {
        p.blocked = false;
        continue;
      }
      // Standing on something unaffordable or unneeded: say so, but try only once per visit.
      if (p.blocked) {
        world.prompt(p.blocked);
        continue;
      }
      const usable = this.canUse(data.kind);
      if (!usable || !this.pay(data.price)) {
        p.blocked = usable ? 'Не хватает сонной пыли.' : 'Сейчас это не нужно.';
        world.prompt(p.blocked);
        continue;
      }
      this.apply(data.kind);
      world.fx.spawn('sparkle', data.x, data.y);
      sprite.remove();
      this.pickups.splice(i, 1);
      const list = world.room.pickups;
      list.splice(list.indexOf(data), 1);
      if (data.price) this.refreshLabels();
    }

    for (const entry of this.pedestals) {
      const { data } = entry;
      entry.base.update(dt);
      if (entry.icon) entry.icon.y = data.y - 22 + Math.sin(world.time * 2.5 + data.x) * 2;
      if (data.taken || player.dead) continue;
      const d = Math.hypot(player.x - data.x, player.y - data.y);
      if (d < 46) {
        const def = ITEM_BY_ID[data.item];
        world.prompt(`${def.name} — ${def.desc}`);
      }
      if (d > 30) entry.armed = true;
      if (d < 18 && entry.armed) {
        entry.armed = false;
        if (this.pay(data.price)) this.takeItem(entry);
      }
    }
  }

  canUse(kind) {
    const { health } = this.world.run;
    if (kind === 'heart_red' || kind === 'heart_half') return health.canHealRed();
    if (kind === 'heart_blue') return health.canAddBlue();
    if (kind === 'heart_glass') return health.slots < PLAYER.maxHearts;
    return true;
  }
}
