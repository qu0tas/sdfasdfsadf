// Unique item logic: everything that cannot be expressed as a stat change or a projectile rule.
// Items refer to these by id (see `behaviours` and `use` in data/items.js). Each passive behaviour
// may implement any of the hooks below; the room calls them at the right moments.
//
//   attach(w, state)        the behaviour became active in this room
//   detach(w, state)        the room is being left or the item was lost
//   update(w, dt, state)    every simulation step
//   onRoomStart(w, state)   a fight has just begun
//   onPlayerHurt(w, state)  the player took damage
import { LAYER } from '../../app/Config.js';

export const PASSIVE = {
  /** Мобиль со звёздами: a star circles the player and burns whatever it touches. */
  orbit_star: {
    attach(w, state) {
      state.angle = 0;
      state.sprite = w.stage.sprite('shots', 'star');
      state.sprite.layer = LAYER.shots;
      state.cool = new Map();
    },
    detach(w, state) {
      state.sprite.remove();
    },
    update(w, dt, state) {
      state.angle += dt * 3.4;
      const x = w.player.x + Math.cos(state.angle) * 38;
      const y = w.player.y + Math.sin(state.angle) * 28;
      state.sprite.x = x;
      state.sprite.y = y;
      state.sprite.visible = !w.player.dead;
      state.sprite.update(dt);
      for (const enemy of w.enemies) {
        if (!enemy.targetable || Math.hypot(enemy.x - x, enemy.y - y) > enemy.radius + 9) continue;
        if ((state.cool.get(enemy) ?? 0) > w.time) continue;
        state.cool.set(enemy, w.time + 0.35);
        enemy.hurt(w.run.build.stats.damage * 0.8, 0, 0);
      }
    },
  },

  /** Одеяло: being hit throws back everything nearby and wipes close shots. */
  blanket: {
    onPlayerHurt(w) {
      const { player } = w;
      w.fx.spawn('ring', player.x, player.y, { sheet: 'boom' });
      for (const enemy of w.enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 120 && enemy.targetable) {
          enemy.kx += (dx / d) * 380;
          enemy.ky += (dy / d) * 380;
        }
      }
      for (const shot of w.shots.list) {
        if (!shot.friendly && Math.hypot(shot.x - player.x, shot.y - player.y) < 105) w.shots.kill(shot);
      }
    },
  },

  /** Сломанный будильник: enemies start each fight frozen for a moment. */
  alarm: {
    onRoomStart(w) {
      w.freezeAll(2.2);
    },
  },
};

/** Active item effects, triggered by the "use" key when the item is charged. */
export const ACTIVE = {
  /** Волчок: a ring of the player's own shots, with everything the build does to them. */
  ring_burst(w) {
    const { stats, shot } = w.run.build;
    const count = 14;
    for (let i = 0; i < count; i++) {
      w.shots.firePlayer(w.player.x, w.player.y, (i / count) * Math.PI * 2, shot, stats.damage * 1.5, stats.shotSpeed, stats.range);
    }
    w.fx.spawn('ring', w.player.x, w.player.y, { sheet: 'boom' });
  },

  /** Снежный шар. */
  freeze_all(w) {
    w.freezeAll(4);
    w.audio.sfx('freeze');
  },

  /** Карманные часы: hostile shots vanish and the room holds its breath. */
  time_erase(w) {
    w.shots.clearHostile();
    w.freezeAll(1.8);
    w.fx.spawn('ring', w.player.x, w.player.y, { sheet: 'boom' });
    w.audio.sfx('freeze');
  },
};
