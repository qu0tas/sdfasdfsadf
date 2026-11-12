// Every projectile in the room: the player's shots (shaped by the current build) and hostile ones.
import { LAYER } from '../../app/Config.js';
import { angleDiff } from '../../utils/math.js';

/** Shapes drawn pointing along their flight direction. The rest keep upright. */
const ROTATES = new Set(['tear', 'tooth', 'thorn', 'stitch']);
const TRAIL_LIMIT = 70;

export class Shots {
  constructor(world) {
    this.world = world;
    this.list = [];
  }

  add(shot, anim) {
    const sprite = this.world.stage.sprite('shots', anim);
    sprite.layer = LAYER.shots;
    sprite.scale = shot.scale ?? 1;
    shot.sprite = sprite;
    shot.t = 0;
    shot.dead = false;
    this.list.push(shot);
    return shot;
  }

  /**
   * Fires one of the player's shots.
   * @param {object} spec projectile rules from the build (see gameplay/items/Build.js)
   * @param {object} [o] { child: true } marks shots spawned by other shots, which never split again
   */
  firePlayer(x, y, angle, spec, damage, speed, range, o = {}) {
    const size = Math.max(0.6, spec.size);
    return this.add(
      {
        friendly: true, x, y, bx: x, by: y, angle, speed, damage,
        life: (range / speed) * (spec.drag ? 1.5 : 1),
        r: 3.5 * size, scale: size > 1.25 ? 1.5 : 1, spec, child: !!o.child,
        pierce: spec.pierce, bounce: spec.bounce, hit: new Set(), split: false, trailT: 0,
      },
      spec.shape,
    );
  }

  /**
   * @param {object} [o] { kind, r, damage (half hearts), life, accel, turn (radians per second) }
   */
  fireHostile(x, y, angle, speed, o = {}) {
    return this.add(
      { friendly: false, x, y, angle, speed, damage: o.damage ?? 1, life: o.life ?? 5, r: o.r ?? 3, accel: o.accel ?? 0, turn: o.turn ?? 0 },
      o.kind ?? 'orb',
    );
  }

  /** A ring of hostile shots. */
  ring(x, y, count, speed, offset = 0, o = {}) {
    for (let i = 0; i < count; i++) this.fireHostile(x, y, offset + (i / count) * Math.PI * 2, speed, o);
  }

  /** A fan of hostile shots centred on `angle`. */
  fan(x, y, angle, count, spread, speed, o = {}) {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      this.fireHostile(x, y, angle + t * spread, speed, o);
    }
  }

  kill(shot, pop = true) {
    if (shot.dead) return;
    shot.dead = true;
    if (pop) this.world.fx.spawn(shot.friendly ? 'pop_cyan' : 'pop_rose', shot.x, shot.y);
  }

  /** Removes hostile shots, e.g. when the room is cleared or the pocket watch is used. */
  clearHostile() {
    for (const shot of this.list) if (!shot.friendly) this.kill(shot);
  }

  clear() {
    for (const shot of this.list) shot.sprite.remove();
    this.list.length = 0;
  }

  childSpec(spec, shape) {
    return { ...spec, shape, splitOnHit: null, burstOnEnd: null, splitOnBounce: false, size: 1, drag: 0, wave: 0, trail: null };
  }

  updateFriendly(shot, dt) {
    const { world } = this;
    const { spec } = shot;

    if (spec.homing > 0) {
      let best = null;
      let bestDist = 120;
      for (const enemy of world.enemies) {
        if (!enemy.targetable) continue;
        const d = Math.hypot(enemy.x - shot.x, enemy.y - shot.y);
        if (d < bestDist) {
          bestDist = d;
          best = enemy;
        }
      }
      if (best) {
        const want = Math.atan2(best.y - shot.y, best.x - shot.x);
        const turn = spec.homing * 4 * dt;
        shot.angle += Math.max(-turn, Math.min(turn, angleDiff(shot.angle, want)));
      }
    }
    if (spec.drag) shot.speed = Math.max(22, shot.speed * (1 - 1.1 * dt));

    const vx = Math.cos(shot.angle) * shot.speed * dt;
    const vy = Math.sin(shot.angle) * shot.speed * dt;
    let nx = shot.bx + vx;
    let ny = shot.by + vy;

    // Walls and blocks: bounce if the build allows, otherwise stop.
    const blocked = (x, y) => !world.grid.inRoom(x, y, 2) || world.grid.solidAt(x, y);
    if (blocked(nx, ny)) {
      if (shot.bounce > 0) {
        shot.bounce -= 1;
        const hitX = blocked(nx, shot.by);
        const hitY = blocked(shot.bx, ny);
        if (hitX || !hitY) shot.angle = Math.PI - shot.angle;
        if (hitY || !hitX) shot.angle = -shot.angle;
        nx = shot.bx;
        ny = shot.by;
        if (spec.splitOnBounce && !shot.child && !shot.split) {
          shot.split = true;
          const twin = this.firePlayer(nx, ny, shot.angle + 0.45, this.childSpec(spec, spec.shape), shot.damage, shot.speed, shot.life * shot.speed, { child: true });
          twin.bounce = shot.bounce;
          shot.angle -= 0.45;
        }
      } else {
        shot.x = nx;
        shot.y = ny;
        this.end(shot);
        return;
      }
    }
    shot.bx = nx;
    shot.by = ny;

    // The sway of notes is visual and real: the hit position sways too.
    const sway = spec.wave ? Math.sin(shot.t * 16) * 6 * spec.wave : 0;
    shot.x = nx - Math.sin(shot.angle) * sway;
    shot.y = ny + Math.cos(shot.angle) * sway;

    for (const enemy of world.enemies) {
      if (!enemy.targetable || shot.hit.has(enemy)) continue;
      if (Math.hypot(enemy.x - shot.x, enemy.y - shot.y) > enemy.radius + shot.r) continue;
      shot.hit.add(enemy);
      enemy.hurt(shot.damage, Math.cos(shot.angle) * 40 * spec.knock, Math.sin(shot.angle) * 40 * spec.knock);
      world.fx.spawn('pop_cyan', shot.x, shot.y);
      if (spec.splitOnHit && !shot.child && !shot.split) {
        shot.split = true;
        const { count, shape, damageMul } = spec.splitOnHit;
        for (let i = 0; i < count; i++) {
          const angle = shot.angle + (i - (count - 1) / 2) * 0.9;
          const child = this.firePlayer(shot.x, shot.y, angle, this.childSpec(spec, shape), shot.damage * damageMul, shot.speed, 110, { child: true });
          child.hit.add(enemy);
        }
      }
      if (shot.pierce > 0) shot.pierce -= 1;
      else {
        this.end(shot, false);
        return;
      }
    }

    if (spec.trail) {
      shot.trailT -= dt;
      if (shot.trailT <= 0 && world.trails.length < TRAIL_LIMIT) {
        shot.trailT = spec.trail === 'ink' ? 0.09 : 0.06;
        world.addTrail(spec.trail, shot.x, shot.y, shot.damage);
      }
    }

    shot.life -= dt;
    if (shot.life <= 0) this.end(shot);
  }

  /** A player's shot is over: pop, and burst into children if the build says so. */
  end(shot, pop = true) {
    const { spec } = shot;
    if (spec.burstOnEnd && !shot.child) {
      const { count, shape, damageMul } = spec.burstOnEnd;
      const offset = Math.random() * Math.PI;
      for (let i = 0; i < count; i++) {
        this.firePlayer(shot.x, shot.y, offset + (i / count) * Math.PI * 2, this.childSpec(spec, shape), shot.damage * damageMul, 150, 70, { child: true });
      }
    }
    this.kill(shot, pop);
  }

  updateHostile(shot, dt) {
    const { world } = this;
    shot.angle += shot.turn * dt;
    shot.speed = Math.max(20, shot.speed + shot.accel * dt);
    shot.x += Math.cos(shot.angle) * shot.speed * dt;
    shot.y += Math.sin(shot.angle) * shot.speed * dt;
    shot.life -= dt;
    if (shot.life <= 0 || !world.grid.inRoom(shot.x, shot.y, 1) || world.grid.solidAt(shot.x, shot.y)) {
      this.kill(shot);
      return;
    }
    const { player } = world;
    if (!player.dead && Math.hypot(player.x - shot.x, player.y - shot.y) < player.radius + shot.r - 1) {
      if (player.hurt(shot.damage)) this.kill(shot);
    }
  }

  update(dt) {
    // Shots fired during this loop (splits, bursts) are appended and updated next step.
    const count = this.list.length;
    for (let i = 0; i < count; i++) {
      const shot = this.list[i];
      if (shot.dead) continue;
      shot.t += dt;
      if (shot.friendly) this.updateFriendly(shot, dt);
      else this.updateHostile(shot, dt);
      const { sprite } = shot;
      sprite.x = shot.x;
      sprite.y = shot.y;
      sprite.rot = ROTATES.has(sprite.anim) ? -shot.angle : 0;
      sprite.update(dt);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!this.list[i].dead) continue;
      this.list[i].sprite.remove();
      this.list.splice(i, 1);
    }
  }
}
