// Behaviour routines of the regular enemies. Each is called once per simulation step with
// (enemy, dt, world) and steers the enemy through `go`, `playOnce` and the room's helpers.
// `e.m` is the routine's private memory; `e.cd` counts down to the next attack.
//
// Every enemy has one signature attack that no other enemy uses:
//   blob     leaves sticky puddles and splits in two when destroyed
//   spider   leaps over everything onto a marked spot
//   eye      takes aim with a thin line, then fires a beam
//   sprout   sends a row of roots bursting out of the floor
//   windup   winds its key and charges in a straight line until it hits a wall
//   balloon  drifts close, swells and bursts
//   teddy    lobs a clump of stuffing in an arc; it scatters where it lands
//   tv       spins a rotating cross of static

/** Клякса памяти. */
function oozer(e, dt, w) {
  const aim = e.aimAtPlayer();
  e.m.drip = (e.m.drip ?? 0.4) - dt;
  if (e.m.drip <= 0) {
    e.m.drip = 0.55;
    w.addSlime(e.x, e.y + e.radius - 4);
  }
  if (e.m.lunge > 0) {
    e.m.lunge -= dt;
    e.go(e.m.dx, e.m.dy, e.speed * 3.2);
    return;
  }
  const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
  e.go(dir.x, dir.y, e.speed);
  if (aim.dist < 70 && e.cd <= 0) {
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
oozer.onDeath = (e, w) => {
  for (const side of [-1, 1]) w.spawnEnemy('blobling', e.x + side * 12, e.y + 4, { minion: true, quick: true });
};

/** Капля памяти: what a blob breaks into. It only runs at the player. */
function chaser(e, dt, w) {
  const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
  e.go(dir.x, dir.y, e.speed);
}

/** Пуговичный паук. */
function leaper(e, dt, w) {
  if (e.air) {
    const m = e.m;
    m.t += dt;
    const k = Math.min(1, m.t / m.time);
    e.x = m.x0 + (m.x1 - m.x0) * k;
    e.y = m.y0 + (m.y1 - m.y0) * k;
    e.lift = Math.sin(k * Math.PI) * 34;
    e.sprite.flip = m.x1 < m.x0;
    if (k >= 1) {
      e.air = false;
      e.lift = 0;
      e.cd = (e.elite ? 0.5 : 0.9) + Math.random() * 0.6;
      w.fx.spawn('puff', e.x, e.y + 6);
    }
    return;
  }
  if (e.cd > 0 || e.oneShot) return;
  e.cd = 9; // set properly on landing
  e.playOnce('attack', {
    release: 2,
    onRelease: () => {
      const spot = w.clearSpot(w.player.x, w.player.y);
      const time = 0.62;
      Object.assign(e.m, { x0: e.x, y0: e.y, x1: spot.x, y1: spot.y, t: 0, time });
      e.air = true;
      w.addZone({ x: spot.x, y: spot.y, r: 15, delay: time, damage: 1 });
    },
  });
}

/** Парящий глаз. */
function gazer(e, dt, w) {
  if (e.m.busy > 0) {
    e.m.busy -= dt;
    return;
  }
  const aim = e.aimAtPlayer();
  e.m.side ??= Math.random() < 0.5 ? 1 : -1;
  if (e.bump.x || e.bump.y) e.m.side *= -1;
  const nx = aim.dx / (aim.dist || 1);
  const ny = aim.dy / (aim.dist || 1);
  let fx = -ny * e.m.side;
  let fy = nx * e.m.side;
  if (aim.dist < 100) {
    fx -= nx * 1.4;
    fy -= ny * 1.4;
  } else if (aim.dist > 180) {
    fx += nx * 1.2;
    fy += ny * 1.2;
  }
  const len = Math.hypot(fx, fy) || 1;
  e.go(fx / len, fy / len, e.speed);
  if (e.cd <= 0) {
    e.cd = 3.2 + Math.random() * 0.8;
    const warn = 0.75;
    const fire = 0.45;
    e.m.busy = warn + fire + 0.15;
    // The elite's beam sweeps after the player instead of holding still.
    w.addBeam(e, aim.angle, { warn, fire, sweep: e.elite ? (Math.random() < 0.5 ? 1 : -1) * 0.9 : 0 });
    w.audio.sfx('telegraph');
    e.playOnce('attack', { speed: 4 / (10 * (warn + 0.1)), release: 3, onRelease: () => w.audio.sfx('beam') });
  }
}

/** Корневой росток. */
function rooter(e, dt, w) {
  e.m.phase ??= 'up';
  e.m.t = (e.m.t ?? 1) - dt;
  if (e.oneShot) return;
  if (e.m.phase === 'down') {
    if (e.m.t > 0) return;
    const spot = w.grid.freeSpot(Math.random, w.player.x, w.player.y, 110);
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
    e.m.t = 1.5;
    e.playOnce('attack', {
      release: 2,
      onRelease: () => {
        const aim = e.aimAtPlayer();
        const lines = e.elite ? [-0.5, 0, 0.5] : [0];
        const count = Math.max(2, Math.min(7, Math.ceil(aim.dist / 34)));
        for (const off of lines) {
          for (let k = 1; k <= count; k++) {
            const x = e.x + Math.cos(aim.angle + off) * k * 34;
            const y = e.y + Math.sin(aim.angle + off) * k * 34;
            if (!w.grid.inRoom(x, y, 8) || w.grid.solidAt(x, y)) break;
            w.addZone({ x, y, r: 13, delay: 0.5 + k * 0.13, damage: 1, small: true, fx: { anim: 'spike', sheet: 'fx2' } });
          }
        }
        w.audio.sfx('telegraph');
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

/** Заводная мышь. */
function charger(e, dt, w) {
  const aim = e.aimAtPlayer();
  e.m.phase ??= 'creep';
  if (e.m.phase === 'creep') {
    const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
    e.go(dir.x, dir.y, e.speed);
    if (e.cd <= 0 && aim.dist < 230 && w.grid.clearLine(e.x, e.y, w.player.x, w.player.y)) {
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
      e.m.t = 1.1;
      e.stopLoop();
    }
  } else if (e.m.phase === 'charge') {
    e.m.t -= dt;
    e.go(e.m.dx, e.m.dy, e.elite ? 360 : 300);
    if (e.m.started && (e.bump.x || e.bump.y || e.m.t <= 0)) {
      if (e.bump.x || e.bump.y) w.renderer.shake(1.5, 0.1);
      e.m.phase = 'dizzy';
      e.m.t = 0.9;
      e.m.started = false;
      e.m.stun = w.fx.spawn('stun', e.x, e.y - 22);
    } else {
      e.m.started = true;
    }
  } else {
    e.m.t -= dt;
    if (e.m.stun && !e.m.stun.done) {
      e.m.stun.x = e.x;
      e.m.stun.y = e.y - 22;
      if (e.m.t <= 0) e.m.stun.done = true;
    }
    if (e.m.t <= 0) {
      e.m.phase = 'creep';
      e.cd = 1 + Math.random();
    }
  }
}

/** Потерянный шарик. Shoot it before it gets close: destroyed early, it bursts harmlessly. */
function popper(e, dt, w) {
  const aim = e.aimAtPlayer();
  e.m.t = (e.m.t ?? Math.random() * 6) + dt;
  const angle = aim.angle + Math.sin(e.m.t * 2.2) * 0.8;
  if (e.m.swell === undefined) {
    e.go(Math.cos(angle), Math.sin(angle), e.speed);
    if (aim.dist < 62) {
      e.m.swell = 0;
      e.loop('attack');
      w.audio.sfx('telegraph');
    }
    return;
  }
  // Swelling: it can no longer be stopped by running, only by destroying it or getting away.
  const total = 0.9;
  e.m.swell += dt;
  e.go(Math.cos(angle), Math.sin(angle), e.speed * 0.35);
  e.sprite.scale = e.baseScale * (1 + 0.45 * (e.m.swell / total));
  e.flash = Math.floor(e.m.swell * 14) % 2 ? 0.6 : 0;
  if (e.m.swell >= total) {
    w.fx.spawn('ring', e.x, e.y, { sheet: 'boom', scale: 0.75 });
    w.audio.sfx('pop');
    w.renderer.shake(2, 0.15);
    w.shots.ring(e.x, e.y, e.elite ? 12 : 8, 80, Math.random() * Math.PI);
    if (aim.dist < 46) w.player.hurt(1);
    e.die();
  }
}

/** Забытый мишка. */
function lobber(e, dt, w) {
  const aim = e.aimAtPlayer();
  if (!e.oneShot) {
    const dir = w.grid.steer(e.x, e.y, w.player.x, w.player.y);
    e.go(dir.x, dir.y, e.speed);
  }
  if (e.cd <= 0 && aim.dist < 300) {
    e.cd = 2.6 + Math.random() * 0.6;
    e.playOnce('attack', {
      release: 2,
      onRelease: () => {
        const tx = w.player.x;
        const ty = w.player.y;
        w.addLob({
          x: e.x, y: e.y - 14, tx, ty, time: 0.95, kind: 'stuffing', r: 18,
          onLand: () => w.shots.ring(tx, ty, e.elite ? 7 : 4, 52, Math.random() * Math.PI, { kind: 'stuffing', r: 6, life: 1.1 }),
        });
        w.audio.sfx('enemyShot');
      },
    });
  }
}

/** Старый телевизор. */
function broadcaster(e, dt, w) {
  e.m.t = (e.m.t ?? 0) + dt;
  if (e.m.air > 0) {
    // On air: streams of static turn slowly around the set.
    e.m.air -= dt;
    e.m.tick -= dt;
    if (e.m.tick <= 0) {
      e.m.tick = 0.26;
      e.m.angle += 0.26 * e.m.spin;
      const arms = e.elite ? 5 : 4;
      for (let k = 0; k < arms; k++) w.shots.fireHostile(e.x, e.y - 4, e.m.angle + (k / arms) * Math.PI * 2, 60, { kind: 'static', life: 2.4 });
      w.audio.sfx('enemyShot');
    }
    if (e.m.air <= 0) {
      e.stopLoop();
      e.cd = 2.4;
    }
    return;
  }
  e.go(Math.cos(e.m.t * 1.3), Math.sin(e.m.t * 0.9), e.speed);
  if (e.cd <= 0 && !e.oneShot) {
    e.m.spin = e.m.spin === 1 ? -1 : 1;
    e.m.angle = Math.random() * Math.PI;
    e.m.tick = 0.45; // the screen lights up before the first static flies
    e.m.air = 2.6;
    e.loop('attack');
    w.audio.sfx('telegraph');
  }
}

export const AI = { oozer, chaser, leaper, gazer, rooter, charger, popper, lobber, broadcaster };
