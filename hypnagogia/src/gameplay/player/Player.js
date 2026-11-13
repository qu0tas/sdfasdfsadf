// Крошка Ноль: movement, aiming, shooting, the dash and taking damage.
import { sheets } from '../../app/Assets.js';
import { LAYER, ROOM_CX, ROOM_CY } from '../../app/Config.js';
import { PLAYER } from '../../data/balance.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.x = ROOM_CX;
    this.y = ROOM_CY;
    this.radius = PLAYER.radius;
    this.aimX = 1;
    this.aimY = 0;
    this.moving = false;
    this.fireT = 0;
    this.volley = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.dashX = 1;
    this.dashY = 0;
    this.inv = 0; // seconds of invulnerability left
    this.dead = false;
    this.locked = 0; // seconds during which input is ignored (appearing, room change)
    this.oneShot = null;
    this.blinkT = 3;

    this.sprite = world.stage.sprite('zero', 'idle');
    this.sprite.layer = LAYER.ents;
    this.sprite.oy = this.radius - (sheets.zero.meta.cellH / 2 - 3) * sheets.zero.meta.scale;
    this.sprite.sortBias = this.radius;
    this.shadow = world.stage.sprite('props', 'shadow_s');
    this.shadow.layer = LAYER.shadow;
    this.shadow.scale = 1.3;
  }

  get stats() {
    return this.world.run.build.stats;
  }

  get dashing() {
    return this.dashT > 0;
  }

  playOnce(anim, then = null) {
    this.oneShot = anim;
    this.sprite.play(anim, {
      restart: true,
      then: () => {
        if (this.oneShot === anim) this.oneShot = null;
        then?.();
      },
    });
  }

  place(x, y) {
    this.x = x;
    this.y = y;
    this.dashT = 0;
  }

  /** The gathering-from-light animation at the start of a run. */
  appear() {
    this.locked = 0.6;
    this.playOnce('appear');
  }

  update(dt, input) {
    const { world, sprite, stats } = this;
    sprite.update(dt);
    this.shadow.x = this.x;
    this.shadow.y = this.y + this.radius - 1;
    sprite.x = this.x;
    sprite.y = this.y;
    if (this.dead) return;

    this.inv = Math.max(0, this.inv - dt);
    this.fireT = Math.max(0, this.fireT - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.locked = Math.max(0, this.locked - dt);
    const free = this.locked <= 0;

    const move = free ? input.move() : { x: 0, y: 0 };
    const aim = input.aim(this.x, this.y);
    this.aimX = aim.x;
    this.aimY = aim.y;

    if (free && input.take('dash') && this.dashCd <= 0 && !this.dashing) {
      const len = Math.hypot(move.x, move.y);
      this.dashX = len ? move.x / len : aim.x;
      this.dashY = len ? move.y / len : aim.y;
      this.dashT = PLAYER.dashTime;
      this.dashCd = stats.dashCd;
      this.inv = Math.max(this.inv, PLAYER.dashTime + 0.06);
      this.playOnce('dash');
      world.fx.spawn('puff', this.x, this.y + 6);
      world.audio.sfx('dash');
    }

    // Sticky puddles left by blobs slow him down.
    const pace = stats.speed * (world.inSlime(this.x, this.y) ? 0.5 : 1);
    let vx = move.x * pace;
    let vy = move.y * pace;
    if (this.dashing) {
      this.dashT -= dt;
      vx = this.dashX * PLAYER.dashSpeed;
      vy = this.dashY * PLAYER.dashSpeed;
    }
    world.grid.move(this, vx * dt, vy * dt, this.radius);
    this.moving = Math.hypot(vx, vy) > 1;
    this.moveX = move.x;
    this.moveY = move.y;

    if (free && aim.firing && this.fireT <= 0 && !this.dashing) this.shoot();

    // Animation: one-off actions play over the idle/walk loop.
    if (!this.oneShot) {
      sprite.play(this.moving ? 'walk' : 'idle');
      this.blinkT -= dt;
      if (this.blinkT <= 0 && !this.moving) {
        this.blinkT = 2.5 + Math.random() * 3;
        this.playOnce('blink');
      }
    }
    // He is drawn exactly as in the concept art, so he is never mirrored - except the dash smear.
    sprite.flip = this.oneShot === 'dash' && this.dashX < 0;
    // Blinking while invulnerable after a hit.
    sprite.alpha = this.inv > 0 && !this.dashing && Math.floor(this.inv * 14) % 2 ? 0.35 : 1;
  }

  shoot() {
    const { world, stats } = this;
    const { shot } = world.run.build;
    this.fireT = stats.fireDelay;
    this.volley += 1;
    const base = Math.atan2(this.aimY, this.aimX);
    const ox = this.x + this.aimX * 12;
    const oy = this.y + this.aimY * 12 - 6;

    if (shot.chordEvery && this.volley % shot.chordEvery === 0) {
      world.shots.firePlayer(ox, oy, base, { ...shot, shape: 'chord', size: shot.size + 0.6 }, stats.damage * 2.5, stats.shotSpeed, stats.range);
      world.audio.sfx('chord');
    } else {
      const gap = ((8 + stats.spread) * Math.PI) / 180;
      for (let i = 0; i < stats.shots; i++) {
        const angle = base + (i - (stats.shots - 1) / 2) * gap;
        world.shots.firePlayer(ox, oy, angle, shot, stats.damage, stats.shotSpeed, stats.range);
      }
      world.audio.sfx('shoot');
    }
    if (!this.oneShot || this.oneShot === 'blink' || this.oneShot === 'shoot') this.playOnce('shoot');
  }

  /**
   * @param {number} amount half hearts
   * @returns {boolean} false when the hit was ignored (dash or invulnerability)
   */
  hurt(amount = 1) {
    const { world } = this;
    if (this.dead || this.inv > 0 || world.peaceful) return false;
    const health = world.run.health;
    const took = health.damage(amount);
    this.inv = PLAYER.hitInvuln * this.stats.iframes;
    world.renderer.shake(3, 0.2);
    if (took === 'glass') {
      world.audio.sfx('glass');
      world.fx.spawn('shatter', this.x, this.y - 8);
    } else {
      world.audio.sfx('hurt');
    }
    world.onPlayerHurt(took);
    if (health.dead) {
      this.dead = true;
      this.sprite.alpha = 1;
      this.shadow.visible = false;
      world.audio.sfx('death');
      this.playOnce('death', () => world.onPlayerDied());
      this.oneShot = 'death';
    } else {
      this.playOnce('hit');
    }
    return true;
  }

  dispose() {
    this.sprite.remove();
    this.shadow.remove();
  }
}
