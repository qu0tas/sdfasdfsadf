// A living creature in the room: regular enemies, minibosses and bosses all use this class.
// What it does each step comes from its `ai` routine (ai.js / bossAi.js); this file handles the
// shared parts: spawning from mist, animation, movement, being hit, dying.
import { sheets } from '../../app/Assets.js';
import { LAYER } from '../../app/Config.js';
import { creatureDef } from '../../data/enemies.js';
import { BOSS_AI } from '../bosses/bossAi.js';
import { AI } from './ai.js';

export class Enemy {
  /** @param {object} [o] { elite, minion } — minions are summoned mid-fight and leave no reward */
  constructor(world, type, x, y, o = {}) {
    const def = creatureDef(type);
    if (!def) throw new Error(`Unknown creature "${type}"`);
    this.world = world;
    this.type = type;
    this.def = def;
    this.boss = !!def.tier;
    this.elite = !!o.elite;
    this.minion = !!o.minion;
    this.routine = AI[def.ai] ?? BOSS_AI[def.ai];
    if (!this.routine) throw new Error(`Creature "${type}" has no AI routine "${def.ai}"`);

    this.x = x;
    this.y = y;
    this.radius = def.radius * (this.elite ? 1.1 : 1);
    this.flying = !!def.flying;
    this.maxHp = def.hp * (this.boss ? 1 : 1 + 0.3 * world.run.stageIndex) * (this.elite ? 2 : 1);
    this.hp = this.maxHp;
    this.shotMul = this.elite ? 1.25 : 1;
    this.vuln = 1; // damage multiplier; bosses raise it while exposed

    this.state = 'spawn';
    this.timer = this.boss ? 1.1 : 0.55;
    this.hidden = false;
    this.gone = false;
    this.frozen = 0;
    this.slow = 0;
    this.flash = 0;
    this.mvx = 0;
    this.mvy = 0;
    this.kx = 0;
    this.ky = 0;
    this.bump = { x: false, y: false };
    this.oneShot = null;
    this.pending = null;
    this.cd = 0.6 + Math.random() * 1.2; // time until the first attack
    this.m = {}; // free space for the AI routine

    this.sprite = world.stage.sprite(def.sheet, 'idle');
    this.sprite.layer = LAYER.ents;
    this.sprite.alpha = 0;
    // Sheets are drawn with the feet 3 px above the bottom of the cell.
    this.sprite.oy = this.radius - (sheets[def.sheet].meta.cellH / 2 - 3);
    this.sprite.sortBias = this.radius;
    if (this.elite) this.sprite.scale = 1.15;
    this.shadow = world.stage.sprite('props', this.radius > 10 ? 'shadow_l' : 'shadow_s');
    this.shadow.layer = LAYER.shadow;
    this.shadow.alpha = 0;
    world.fx.spawn('mist', x, y, { scale: this.boss ? 2 : 1 });
  }

  get targetable() {
    return this.state === 'active' && !this.hidden;
  }

  /**
   * Plays an animation once over the idle/move loop.
   * `release` is the frame at which `onRelease` runs — the moment an attack actually fires.
   */
  playOnce(anim, { release = 0, onRelease = null, then = null, speed = 1 } = {}) {
    this.oneShot = anim;
    this.pending = onRelease ? { anim, frame: release, fn: onRelease } : null;
    this.sprite.play(anim, {
      restart: true,
      speed,
      then: () => {
        if (this.oneShot === anim) this.oneShot = null;
        then?.();
      },
    });
  }

  /**
   * An animation held until `stopLoop`: a looping one keeps cycling (wind-ups, charges), a
   * one-off stays on its last frame (a lid that remains open).
   */
  loop(anim, { release = 0, onRelease = null } = {}) {
    if (this.oneShot === anim) return;
    this.oneShot = anim;
    this.pending = onRelease ? { anim, frame: release, fn: onRelease } : null;
    this.sprite.play(anim, { restart: true });
  }

  stopLoop() {
    this.oneShot = null;
    this.pending = null;
  }

  aimAtPlayer() {
    const { player } = this.world;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    return { dx, dy, dist: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
  }

  /** Sets the wish to walk in a direction at `speed` pixels per second for this step. */
  go(dirX, dirY, speed) {
    this.mvx = dirX * speed;
    this.mvy = dirY * speed;
  }

  update(dt) {
    const { sprite, world } = this;
    sprite.update(dt);
    if (this.state === 'dead') return;

    if (this.state === 'spawn') {
      this.timer -= dt;
      sprite.alpha = Math.min(1, sprite.alpha + dt * 3);
      this.shadow.alpha = sprite.alpha;
      if (this.timer <= 0) {
        this.state = 'active';
        sprite.alpha = 1;
      }
    } else {
      this.mvx = 0;
      this.mvy = 0;
      if (this.frozen > 0) {
        this.frozen -= dt;
        sprite.speed = 0;
        if (this.frozen <= 0) sprite.speed = 1;
      } else {
        this.cd -= dt;
        this.routine(this, dt, world);
      }
      if (this.state === 'dead') return;

      if (this.slow > 0) {
        this.slow -= dt;
        this.mvx *= 0.5;
        this.mvy *= 0.5;
      }
      this.bump = world.grid.move(this, (this.mvx + this.kx) * dt, (this.mvy + this.ky) * dt, this.radius - 1, this.flying);
      const decay = Math.max(0, 1 - 9 * dt);
      this.kx *= decay;
      this.ky *= decay;

      if (!this.oneShot) sprite.play(Math.hypot(this.mvx, this.mvy) > 3 ? 'move' : 'idle');
      if (this.pending && sprite.anim === this.pending.anim && sprite.frame >= this.pending.frame) {
        const { fn } = this.pending;
        this.pending = null;
        fn();
      }
      if (Math.abs(this.mvx) > 3) sprite.flip = this.mvx < 0;
      else if (!this.oneShot || this.boss) sprite.flip = world.player.x < this.x;

      const { player } = world;
      if (!this.hidden && !player.dead && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius - 2) {
        player.hurt(1);
      }
    }

    this.flash = Math.max(0, this.flash - dt * 7);
    sprite.flash = this.flash;
    if (this.frozen > 0) sprite.setTint(0.75, 1.05, 1.25);
    else if (this.elite) sprite.setTint(1.15, 0.85, 1.25);
    else sprite.setTint(1, 1, 1);
    sprite.x = this.x;
    sprite.y = this.y;
    this.shadow.x = this.x;
    this.shadow.y = this.y + this.radius - 1;
    this.shadow.visible = !this.hidden;
  }

  hurt(damage, kx = 0, ky = 0) {
    if (!this.targetable) return;
    this.hp -= damage * this.vuln;
    this.flash = 1;
    const push = this.boss ? 0.08 : this.def.speed === 0 ? 0 : 1;
    this.kx += kx * push;
    this.ky += ky * push;
    this.world.audio.sfx('enemyHit');
    if (this.hp <= 0) this.die();
    else if (!this.oneShot && !this.boss) this.playOnce('hit');
  }

  freeze(time) {
    if (this.state === 'active') this.frozen = Math.max(this.frozen, time);
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.pending = null;
    this.oneShot = 'death';
    this.sprite.speed = 1;
    this.sprite.setTint(1, 1, 1);
    this.sprite.flash = 0;
    this.sprite.alpha = 1;
    this.sprite.visible = true;
    this.sprite.play('death', { restart: true, then: () => { this.gone = true; } });
    this.shadow.remove();
    this.shadow = null; // it goes back to the pool and may already belong to something else
    if (this.m.stun) this.m.stun.done = true;
    this.world.onEnemyDied(this);
  }

  /** Removes the creature's sprites. Called by the room when it is gone or the room is left. */
  dispose() {
    this.sprite.remove();
    this.shadow?.remove();
  }
}
