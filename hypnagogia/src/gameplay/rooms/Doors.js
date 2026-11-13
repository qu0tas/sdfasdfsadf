// The rifts in the room's walls: how they look, when they let the player through, and the
// stage rifts that appear after a boss.
import { DIRS, DIR_KEYS, LAYER, TILE, doorPos } from '../../app/Config.js';
import { VARIANTS } from '../../data/stages.js';

/** Glyph shown beside a rift whose destination is known but not yet visited. */
const GLYPH = {
  treasure: 'treasure', shop: 'shop', boss: 'boss', miniboss: 'miniboss', elite: 'miniboss',
  puzzle: 'puzzle', event: 'event', memory: 'memory',
};

export class Doors {
  constructor(world) {
    this.world = world;
    this.list = [];
  }

  clear() {
    for (const entry of this.list) {
      entry.sprite.remove();
      entry.glyph?.remove();
    }
    this.list.length = 0;
  }

  build() {
    this.clear();
    const { world } = this;
    const room = world.room;
    const make = (dir) => {
      const pos = doorPos(dir);
      const sprite = world.stage.sprite('rift', 'open');
      sprite.layer = LAYER.decal;
      sprite.x = pos.x;
      sprite.y = pos.y;
      sprite.rot = DIRS[dir].angle;
      return { dir, pos, sprite, glyph: null };
    };
    for (const dir of DIR_KEYS) {
      const door = room.doors[dir];
      if (door) this.list.push({ ...make(dir), door });
    }
    for (const rift of room.stageRifts ?? []) this.list.push({ ...make(rift.dir), stage: rift });
    this.refresh();
  }

  passable(entry) {
    if (this.world.locked) return false;
    if (entry.stage) return true;
    const { door } = entry;
    return door.kind === 'open' || (door.kind === 'locked' && door.unlocked) || (door.kind === 'secret' && door.found);
  }

  /** Picks the animation and the glyph for every rift from the current state of the room. */
  refresh() {
    const { world } = this;
    const rooms = world.run.floor.rooms;
    for (const entry of this.list) {
      const { sprite, door } = entry;
      let anim = 'open';
      let glyph = null;
      if (entry.stage) {
        anim = entry.stage.unstable ? 'unstable' : 'stage';
      } else {
        const target = rooms[door.to];
        if (door.kind === 'secret') anim = door.found ? 'secret' : 'crack';
        else if (world.locked) anim = 'sealed';
        else if (door.kind === 'locked' && !door.unlocked) anim = 'locked';
        else if (target.type === 'boss') anim = 'boss';
        else if (door.unstable && !target.visited) anim = 'unstable';
        if (door.kind !== 'secret' && !target.visited && GLYPH[target.type]) glyph = door.unstable ? 'unknown' : GLYPH[target.type];
      }
      if (sprite.anim !== anim) sprite.play(anim, { restart: true });

      if (glyph && !entry.glyph) {
        entry.glyph = world.stage.sprite('glyphs', glyph);
        entry.glyph.layer = LAYER.overlay;
        entry.glyph.x = entry.pos.x - DIRS[entry.dir].dx * 40;
        entry.glyphY = entry.pos.y - DIRS[entry.dir].dy * 40;
      } else if (!glyph && entry.glyph) {
        entry.glyph.remove();
        entry.glyph = null;
      }
      if (entry.glyph) entry.glyph.play(glyph);
    }
  }

  /** An Ink explosion near a hidden rift tears it open. */
  blast(x, y, radius) {
    const { world } = this;
    for (const entry of this.list) {
      const { door } = entry;
      if (!door || door.kind !== 'secret' || door.found) continue;
      if (Math.hypot(entry.pos.x - x, entry.pos.y - y) > radius + 22) continue;
      const target = world.run.floor.rooms[door.to];
      door.found = true;
      target.doors[DIRS[entry.dir].opp].found = true;
      target.seen = true;
      world.audio.sfx('unlock');
      world.fx.spawn('mist', entry.pos.x, entry.pos.y);
      world.mark('secret_found');
      this.refresh();
      world.saveRun();
    }
  }

  update(dt) {
    const { world } = this;
    const { player, run } = world;
    for (const entry of this.list) {
      entry.sprite.update(dt);
      if (entry.glyph) entry.glyph.y = entry.glyphY + Math.sin(world.time * 3) * 1.5;
      if (player.dead || world.fade) continue;

      const d = DIRS[entry.dir];
      // Standing in the rift's mouth and pushing into it.
      const across = d.dx ? Math.abs(player.y - entry.pos.y) : Math.abs(player.x - entry.pos.x);
      const depth = d.dx ? Math.abs(player.x - entry.pos.x) : Math.abs(player.y - entry.pos.y);
      const near = across < 15 && depth < TILE / 2 + player.radius + 3;
      const pushing = (player.moveX ?? 0) * d.dx + (player.moveY ?? 0) * d.dy > 0.3;
      if (!near) {
        if (entry.stage && Math.hypot(player.x - entry.pos.x, player.y - entry.pos.y) < 72) this.describe(entry.stage);
        continue;
      }

      if (entry.stage) {
        this.describe(entry.stage);
        if (pushing && !world.locked) world.game.onStageRift(entry.stage.variant);
        continue;
      }
      const { door } = entry;
      if (door.kind === 'locked' && !door.unlocked && !world.locked) {
        if (run.shards > 0) {
          run.shards -= 1;
          door.unlocked = true;
          run.floor.rooms[door.to].doors[d.opp].unlocked = true;
          world.audio.sfx('unlock');
          entry.sprite.play('unlock', { restart: true, then: () => this.refresh() });
        } else {
          world.prompt('Разлом заперт. Нужен осколок.');
        }
        continue;
      }
      if (pushing && this.passable(entry) && entry.sprite.anim !== 'unlock') world.travel(entry.dir, door);
    }
  }

  describe(rift) {
    const variant = VARIANTS[rift.variant];
    this.world.prompt(rift.unstable ? 'Разлом дрожит. Куда он ведёт — не разобрать.' : `${variant.name}. ${variant.hint}`);
  }
}
