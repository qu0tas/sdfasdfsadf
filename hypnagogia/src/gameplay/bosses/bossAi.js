// Behaviour routines of the miniboss and the three bosses. Same contract as enemies/ai.js.
// Every attack is announced by an animation (and often a sound) before anything can hurt the player.
import { ROOM_CX, ROOM_CY, ROOM_H, ROOM_W, ROOM_X, ROOM_Y } from '../../app/Config.js';

const hurt = (e) => 1 - e.hp / e.maxHp; // 0 fresh .. 1 almost gone
const minions = (w) => w.enemies.filter((o) => o.minion && o.state !== 'dead').length;

/** Чёртик из табакерки: hops about with the lid shut, then bursts open and sprays rings. */
function jack(e, dt, w) {
  e.m.phase ??= 'rest';
  e.m.t = (e.m.t ?? 1) - dt;
  if (e.m.phase === 'rest') {
    if (e.m.t <= 0) {
      e.m.phase = 'hop';
      e.m.hops = 3;
      e.m.t = 0;
    }
  } else if (e.m.phase === 'hop') {
    if (e.m.t > 0) {
      e.go(e.m.dx, e.m.dy, e.m.t > 0.12 ? e.def.speed * 2.6 : 0);
    } else if (e.m.hops > 0) {
      e.m.hops -= 1;
      const { angle } = e.aimAtPlayer();
      const a = angle + (Math.random() - 0.5) * 0.8;
      e.m.dx = Math.cos(a);
      e.m.dy = Math.sin(a);
      e.m.t = 0.5;
    } else {
      e.m.phase = 'burst';
      e.m.t = 2.2;
      e.m.wave = 0;
      w.audio.sfx('telegraph');
      e.loop('attack', { release: 3, onRelease: () => { e.m.open = true; } });
    }
  } else if (e.m.phase === 'burst') {
    // The head is out: rings of shots, each turned a little from the last.
    if (e.m.open) {
      e.m.fire = (e.m.fire ?? 0) - dt;
      if (e.m.fire <= 0 && e.m.wave < (hurt(e) > 0.5 ? 5 : 3)) {
        e.m.fire = 0.38;
        e.m.wave += 1;
        w.shots.ring(e.x, e.y - 12, hurt(e) > 0.5 ? 12 : 9, 78, e.m.wave * 0.33);
        w.audio.sfx('enemyShot');
      }
    }
    if (e.m.t <= 0) {
      e.m.open = false;
      e.stopLoop();
      e.m.phase = 'rest';
      e.m.t = 0.9;
    }
  }
}

/** Ком Забытого: rolls after the player, slams the floor into rings, spits and sheds lesser blobs. */
function clump(e, dt, w) {
  e.m.phase ??= 'roll';
  e.m.t = (e.m.t ?? 2) - dt;
  if (e.oneShot) return;
  if (e.m.phase === 'roll') {
    const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
    e.go(dir.x, dir.y, e.def.speed * (1 + hurt(e) * 0.6));
    if (e.m.t > 0) return;
    e.m.count = (e.m.count ?? 0) + 1;
    e.m.t = 2.1 - hurt(e) * 0.7;
    if (e.m.count % 2 === 1) {
      w.audio.sfx('telegraph');
      e.playOnce('attack', {
        release: 3,
        onRelease: () => {
          w.renderer.shake(3, 0.25);
          w.audio.sfx('slam');
          w.fx.spawn('ring', e.x, e.y, { sheet: 'boom' });
          w.shots.ring(e.x, e.y, 14, 76, Math.random());
          if (hurt(e) > 0.5) w.shots.ring(e.x, e.y, 14, 52, Math.random());
        },
      });
    } else {
      e.playOnce('spit', {
        release: 2,
        onRelease: () => {
          const { angle } = e.aimAtPlayer();
          w.shots.fan(e.x, e.y, angle, 5, 0.9, 108, { r: 3.5 });
          w.audio.sfx('enemyShot');
          if (minions(w) < 3) {
            w.spawnEnemy('blob', e.x + Math.cos(angle + 1.6) * 30, e.y + Math.sin(angle + 1.6) * 30, { minion: true });
            if (hurt(e) > 0.5) w.spawnEnemy('blob', e.x + Math.cos(angle - 1.6) * 30, e.y + Math.sin(angle - 1.6) * 30, { minion: true });
          }
        },
      });
    }
  }
}

/**
 * Малый Страж «Заводной»: a guardian turned wind-up toy. Marches, winds its key, charges across
 * the room and throws cogs. It winds down for a moment after every cycle.
 */
function warden(e, dt, w) {
  e.m.phase ??= 'march';
  e.m.t = (e.m.t ?? 1.6) - dt;
  const rage = hurt(e) > 0.5;
  switch (e.m.phase) {
    case 'march': {
      const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
      e.go(dir.x, dir.y, e.def.speed);
      if (e.m.t <= 0) {
        e.m.charges = rage ? 3 : 2;
        e.m.phase = 'wind';
        e.m.t = 0.8;
        e.loop('windup');
        w.audio.sfx('telegraph');
      }
      break;
    }
    case 'wind':
      if (e.m.t <= 0) {
        const aim = e.aimAtPlayer();
        e.m.dx = aim.dx / (aim.dist || 1);
        e.m.dy = aim.dy / (aim.dist || 1);
        e.m.phase = 'charge';
        e.m.t = 1.4;
        e.m.started = false;
        e.loop('charge');
        w.audio.sfx('dash');
      }
      break;
    case 'charge':
      e.go(e.m.dx, e.m.dy, 250);
      if (e.m.started && (e.bump.x || e.bump.y || e.m.t <= 0)) {
        w.renderer.shake(3, 0.2);
        w.audio.sfx('slam');
        w.shots.ring(e.x, e.y, rage ? 12 : 9, 84, Math.random(), { kind: 'cog' });
        e.stopLoop();
        e.m.charges -= 1;
        if (e.m.charges > 0) {
          e.m.phase = 'wind';
          e.m.t = 0.6;
          e.loop('windup');
          w.audio.sfx('telegraph');
        } else {
          e.m.phase = 'cogs';
          e.m.t = 0.5;
          e.m.volleys = 3;
        }
      }
      e.m.started = true;
      break;
    case 'cogs':
      if (e.m.t <= 0 && !e.oneShot) {
        if (e.m.volleys > 0) {
          e.m.volleys -= 1;
          e.m.t = 0.25;
          e.playOnce('attack', {
            release: 2,
            onRelease: () => {
              w.shots.fan(e.x, e.y - 4, e.aimAtPlayer().angle, rage ? 7 : 5, 1.3, 104, { kind: 'cog' });
              w.audio.sfx('enemyShot');
            },
          });
        } else {
          if (rage && minions(w) < 2) {
            w.spawnEnemy('windup', e.x - 30, e.y + 10, { minion: true });
            w.spawnEnemy('windup', e.x + 30, e.y + 10, { minion: true });
          }
          // Wound down: a short opening for the player.
          e.m.phase = 'rest';
          e.m.t = 1.3;
        }
      }
      break;
    default:
      if (e.m.t <= 0) {
        e.m.phase = 'march';
        e.m.t = 1.5;
      }
  }
}

/**
 * Сердце Детских Игрушек: does not move. It beats out rings of stuffing, tears open to spin
 * spirals (and is easier to hurt while open), drops toys from above and calls lost toys to it.
 */
function toyheart(e, dt, w) {
  e.m.phase ??= 'idle';
  e.m.t = (e.m.t ?? 1.5) - dt;
  const h = hurt(e);
  if (e.m.phase === 'idle') {
    if (e.m.t > 0 || e.oneShot) return;
    const order = ['beat', 'rain', 'open', 'call'];
    e.m.step = ((e.m.step ?? -1) + 1) % order.length;
    e.m.phase = order[e.m.step];
    e.m.n = 0;
    e.m.t = 0;
    return;
  }
  if (e.m.phase === 'beat') {
    if (e.m.t > 0 || e.oneShot) return;
    if (e.m.n >= 4) {
      e.m.phase = 'idle';
      e.m.t = 1.1;
      return;
    }
    e.m.n += 1;
    e.m.t = 0.3;
    e.playOnce('beat', {
      release: 1,
      onRelease: () => {
        w.shots.ring(e.x, e.y, h > 0.5 ? 18 : 13, 74, e.m.n % 2 ? 0 : 0.24, { kind: 'stuffing', r: 3.5 });
        w.renderer.shake(1.5, 0.1);
        w.audio.sfx('slam');
      },
    });
  } else if (e.m.phase === 'rain') {
    if (e.m.n === 0) {
      e.m.n = 1;
      e.m.t = 1.9;
      const count = h > 0.75 ? 9 : h > 0.4 ? 7 : 5;
      w.audio.sfx('telegraph');
      for (let i = 0; i < count; i++) {
        const x = i === 0 ? w.player.x : ROOM_X + 20 + Math.random() * (ROOM_W - 40);
        const y = i === 0 ? w.player.y : ROOM_Y + 20 + Math.random() * (ROOM_H - 40);
        w.addZone({
          x, y, r: 13, delay: 0.9 + i * 0.1, damage: 2,
          onLand: () => w.shots.ring(x, y, 4, 80, Math.PI / 4, { kind: 'cog' }),
        });
      }
    }
    if (e.m.t <= 0) {
      e.m.phase = 'idle';
      e.m.t = 0.8;
    }
  } else if (e.m.phase === 'open') {
    if (e.m.n === 0) {
      e.m.n = 1;
      e.m.t = 3.4;
      e.m.spin = Math.random() * 6;
      e.m.fire = 0.5;
      e.loop('open');
      w.audio.sfx('telegraph');
    }
    // Held open on the last frame of the tear; the core is exposed.
    if (e.sprite.done) e.vuln = 1.6;
    e.m.fire -= dt;
    if (e.m.fire <= 0) {
      e.m.fire = 0.13;
      e.m.spin += 0.3;
      const arms = h > 0.5 ? 3 : 2;
      for (let i = 0; i < arms; i++) w.shots.fireHostile(e.x, e.y, e.m.spin + (i / arms) * Math.PI * 2, 82, { kind: 'stitch' });
    }
    if (e.m.t <= 0) {
      e.vuln = 1;
      e.stopLoop();
      e.m.phase = 'idle';
      e.m.t = 1.2;
    }
  } else if (e.m.phase === 'call') {
    if (minions(w) < 3) {
      const types = ['balloon', 'windup', 'spider'];
      for (const side of [-1, 1]) {
        w.spawnEnemy(types[Math.floor(Math.random() * types.length)], ROOM_CX + side * 120, ROOM_CY + (Math.random() - 0.5) * 80, { minion: true });
      }
    }
    e.m.phase = 'idle';
    e.m.t = 1.6;
  }
}

export const BOSS_AI = { jack, clump, warden, toyheart };
