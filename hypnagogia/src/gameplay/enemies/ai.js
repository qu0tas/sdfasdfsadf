// Behaviour routines of the regular enemies. Each is called once per simulation step with
// (enemy, dt, world) and steers the enemy through `go`, `playOnce` and the room's shot list.
// `e.m` is the routine's private memory; `e.cd` counts down to the next attack.

/** Клякса памяти: oozes straight at the player and lunges when close. */
function chaser(e, dt, w) {
  const aim = e.aimAtPlayer();
  if (e.m.lunge > 0) {
    e.m.lunge -= dt;
    e.go(e.m.dx, e.m.dy, e.def.speed * 3.2);
    return;
  }
  const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
  e.go(dir.x, dir.y, e.def.speed);
  if (aim.dist < 46 && e.cd <= 0) {
    e.cd = 1.8;
    e.playOnce('attack', {
      release: 2,
      onRelease: () => {
        const now = e.aimAtPlayer();
        e.m.dx = now.dx / (now.dist || 1);
        e.m.dy = now.dy / (now.dist || 1);
        e.m.lunge = 0.28;
      },
    });
  }
}

/** Пуговичный паук: waits, crouches, then springs towards the player. */
function hopper(e, dt, w) {
  if (e.m.hop > 0) {
    e.m.hop -= dt;
    e.go(e.m.dx, e.m.dy, e.def.speed);
    return;
  }
  if (e.cd > 0 || e.oneShot) return;
  e.cd = 0.5 + Math.random() * 0.7;
  e.playOnce('attack', {
    release: 2,
    onRelease: () => {
      const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
      const angle = Math.atan2(dir.y, dir.x) + (Math.random() - 0.5) * 0.9;
      e.m.dx = Math.cos(angle);
      e.m.dy = Math.sin(angle);
      e.m.hop = 0.26;
    },
  });
}

/** Парящий глаз: keeps its distance, circles, and fires single aimed shots. */
function shooter(e, dt, w) {
  const aim = e.aimAtPlayer();
  e.m.side ??= Math.random() < 0.5 ? 1 : -1;
  if (e.bump.x || e.bump.y) e.m.side *= -1;
  const nx = aim.dx / (aim.dist || 1);
  const ny = aim.dy / (aim.dist || 1);
  let fx = -ny * e.m.side;
  let fy = nx * e.m.side;
  if (aim.dist < 70) {
    fx -= nx * 1.4;
    fy -= ny * 1.4;
  } else if (aim.dist > 125) {
    fx += nx * 1.2;
    fy += ny * 1.2;
  }
  const len = Math.hypot(fx, fy) || 1;
  if (!e.oneShot) e.go(fx / len, fy / len, e.def.speed);
  if (e.cd <= 0) {
    e.cd = 2.1 + Math.random() * 0.6;
    e.playOnce('attack', {
      release: 2,
      onRelease: () => {
        w.shots.fireHostile(e.x, e.y - 2, e.aimAtPlayer().angle, 88 * e.shotMul);
        w.audio.sfx('enemyShot');
      },
    });
  }
}

/** Корневой росток: rooted in place; spits thorns, then sinks and comes up somewhere else. */
function burrower(e, dt, w) {
  e.m.phase ??= 'up';
  e.m.t = (e.m.t ?? 1) - dt;
  if (e.oneShot) return;
  if (e.m.phase === 'down') {
    if (e.m.t > 0) return;
    const spot = w.grid.freeSpot(Math.random, w.player.x, w.player.y, 70);
    e.x = spot.x;
    e.y = spot.y;
    e.hidden = false;
    e.sprite.visible = true;
    w.fx.spawn('mist', e.x, e.y);
    e.m.phase = 'up';
    e.m.t = 0.9;
    e.m.volleys = 0;
    return;
  }
  if (e.m.t > 0) return;
  if ((e.m.volleys ?? 0) < 2) {
    e.m.volleys = (e.m.volleys ?? 0) + 1;
    e.m.t = 1.0;
    e.playOnce('attack', {
      release: 2,
      onRelease: () => {
        const { angle } = e.aimAtPlayer();
        w.shots.fireHostile(e.x, e.y - 4, angle, 112 * e.shotMul, { kind: 'thorn' });
        if (e.elite) w.shots.fan(e.x, e.y - 4, angle, 2, 0.7, 100, { kind: 'thorn' });
        w.audio.sfx('enemyShot');
      },
    });
    return;
  }
  // Sink: the retract animation plays once, then the sprout is gone until it resurfaces.
  e.playOnce('move', {
    then: () => {
      e.hidden = true;
      e.sprite.visible = false;
      e.m.phase = 'down';
      e.m.t = 0.7;
    },
  });
}

/** Заводная мышь: creeps closer, winds up, then charges in a straight line until it hits something. */
function charger(e, dt, w) {
  const aim = e.aimAtPlayer();
  e.m.phase ??= 'creep';
  if (e.m.phase === 'creep') {
    const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
    e.go(dir.x, dir.y, e.def.speed);
    if (e.cd <= 0 && aim.dist < 150 && w.grid.clearLine(e.x, e.y, w.player.x, w.player.y)) {
      e.m.phase = 'wind';
      e.m.t = 0.55;
      e.loop('attack');
      w.audio.sfx('telegraph');
    }
  } else if (e.m.phase === 'wind') {
    e.m.t -= dt;
    e.sprite.flip = aim.dx < 0;
    if (e.m.t <= 0) {
      e.m.dx = aim.dx / (aim.dist || 1);
      e.m.dy = aim.dy / (aim.dist || 1);
      e.m.phase = 'charge';
      e.m.t = 0.9;
      e.stopLoop();
    }
  } else if (e.m.phase === 'charge') {
    e.m.t -= dt;
    e.go(e.m.dx, e.m.dy, 215 * e.shotMul);
    if (e.m.started && (e.bump.x || e.bump.y || e.m.t <= 0)) {
      if (e.bump.x || e.bump.y) w.renderer.shake(1.5, 0.1);
      e.m.phase = 'dizzy';
      e.m.t = 0.8;
      e.m.started = false;
      e.m.stun = w.fx.spawn('stun', e.x, e.y - 12, { speed: 1 });
    } else {
      e.m.started = true;
    }
  } else {
    e.m.t -= dt;
    if (e.m.stun && !e.m.stun.done) {
      e.m.stun.x = e.x;
      e.m.stun.y = e.y - 12;
      if (e.m.t <= 0) e.m.stun.done = true;
    }
    if (e.m.t <= 0) {
      e.m.phase = 'creep';
      e.cd = 1 + Math.random();
    }
  }
}

/** Потерянный шарик: drifts after the player in a lazy wobble. Bursts into a ring when popped. */
function drifter(e, dt, w) {
  const aim = e.aimAtPlayer();
  e.m.t = (e.m.t ?? Math.random() * 6) + dt;
  const wobble = Math.sin(e.m.t * 2.2) * 0.9;
  const angle = aim.angle + wobble;
  e.go(Math.cos(angle), Math.sin(angle), e.def.speed);
  if (aim.dist < 34 && !e.oneShot && e.cd <= 0) {
    e.cd = 1.5;
    e.playOnce('attack');
  }
}
drifter.onDeath = (e, w) => {
  w.shots.ring(e.x, e.y, e.elite ? 10 : 6, 70, Math.random() * Math.PI);
};

/** Забытый мишка: trudges after the player and throws handfuls of stuffing. */
function lobber(e, dt, w) {
  const aim = e.aimAtPlayer();
  if (!e.oneShot) {
    const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
    e.go(dir.x, dir.y, e.def.speed);
  }
  if (e.cd <= 0 && aim.dist < 180) {
    e.cd = 2.4 + Math.random() * 0.6;
    e.playOnce('attack', {
      release: 2,
      onRelease: () => {
        w.shots.fan(e.x, e.y - 3, e.aimAtPlayer().angle, e.elite ? 5 : 3, e.elite ? 1.0 : 0.6, 96 * e.shotMul, { kind: 'stuffing', r: 3.5 });
        w.audio.sfx('enemyShot');
      },
    });
  }
}

/** Старый телевизор: shuffles on the spot and bursts static in eight directions. */
function turret(e, dt, w) {
  e.m.t = (e.m.t ?? 0) + dt;
  if (!e.oneShot) e.go(Math.cos(e.m.t * 1.3), Math.sin(e.m.t * 0.9), e.def.speed);
  if (e.cd <= 0) {
    e.cd = 2.7;
    e.m.turn = !e.m.turn;
    e.playOnce('attack', {
      release: 2,
      onRelease: () => {
        w.shots.ring(e.x, e.y - 2, 8, 72 * e.shotMul, e.m.turn ? Math.PI / 8 : 0, { kind: 'static' });
        w.audio.sfx('enemyShot');
      },
    });
  }
}

export const AI = { chaser, hopper, shooter, burrower, charger, drifter, lobber, turret };
