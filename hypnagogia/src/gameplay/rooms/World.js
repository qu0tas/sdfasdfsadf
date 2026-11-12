// The live room: everything that moves and fights. One World exists per run; it rebuilds its
// contents every time the player steps through a rift.
import { COLS, DIRS, LAYER, ROOM_CX, ROOM_CY, ROOM_H, ROOM_W, ROOM_X, ROOM_Y, entryPos, tileCenter } from '../../app/Config.js';
import { INK } from '../../data/balance.js';
import { ITEMS, ITEM_BY_ID } from '../../data/items.js';
import { MARKS } from '../../data/unlocks.js';
import { Effects } from '../../rendering/Effects.js';
import { Grid } from '../combat/Grid.js';
import { Shots } from '../combat/Shots.js';
import { Enemy } from '../enemies/Enemy.js';
import { ACTIVE, PASSIVE } from '../items/behaviours.js';
import { Player } from '../player/Player.js';
import { Plates } from '../puzzles/Plates.js';
import { Doors } from './Doors.js';
import { Loot } from './Loot.js';
import { populateRoom, rollEncounter, rollReward, roomTiles } from './populate.js';
import { Props } from './Props.js';

const BOSS_MARKS = { clump: 'roots_cleansed', warden: 'warden_silent', toyheart: 'heart_cleansed' };
const FADE = 0.13;

export class World {
  constructor(game) {
    this.game = game;
    this.renderer = game.renderer;
    this.stage = game.renderer.stage;
    this.roomView = game.roomView;
    this.audio = game.audio;
    this.input = game.input;
    this.save = game.save;
    this.hud = game.hud;
    this.fx = new Effects(this.stage);
    this.shots = new Shots(this);
    this.doors = new Doors(this);
    this.loot = new Loot(this);
    this.props = new Props(this);
    this.plates = new Plates(this);
    this.enemies = [];
    this.bombs = [];
    this.zones = [];
    this.trails = [];
    this.wisps = [];
    this.behaviours = new Map();
    this.time = 0;
    this.locked = false; // a fight is on: the rifts are sealed
    this.peaceful = false; // nothing can hurt the player (room changes, endings)
    this.fade = null;
    this.promptText = null;
    this.ending = 0;
  }

  /** Starts (or resumes) a run in its current room. */
  begin(run, fresh) {
    this.run = run;
    this.player = new Player(this);
    this.enterRoom(run.roomId, null);
    if (fresh) this.player.appear();
  }

  get room() {
    return this.run.room;
  }

  prompt(text) {
    this.promptText ??= text;
  }

  // ---------------------------------------------------------------- room lifecycle

  teardown() {
    for (const enemy of this.enemies) enemy.dispose();
    this.enemies.length = 0;
    this.shots.clear();
    this.fx.clear();
    for (const list of [this.bombs, this.zones, this.trails, this.wisps]) {
      for (const thing of list) thing.sprite.remove();
      list.length = 0;
    }
    for (const [id, state] of this.behaviours) PASSIVE[id].detach?.(this, state);
    this.behaviours.clear();
    this.doors.clear();
    this.loot.clear();
    this.props.clear();
    this.plates.clear();
    this.locked = false;
    this.ambush = false;
    this.bossEnemy = null;
    this.hud.boss(null);
  }

  /** @param {string | null} fromDir the direction the player travelled to get here */
  enterRoom(roomId, fromDir) {
    const { run } = this;
    this.teardown();
    run.roomId = roomId;
    const room = run.room;
    room.visited = true;
    room.seen = true;
    for (const door of Object.values(room.doors)) {
      if (door.kind !== 'secret' || door.found) run.floor.rooms[door.to].seen = true;
    }
    populateRoom(room, run.floor, { pickItem: (pool) => run.pickItem(pool), memoryCode: this.save.meta.memoryCode });

    this.rebuildGrid();
    const at = fromDir ? entryPos(DIRS[fromDir].opp) : { x: ROOM_CX, y: ROOM_CY + (room.type === 'start' ? 0 : 60) };
    this.player.place(at.x, at.y);

    this.loot.build();
    this.props.build();
    this.plates.build();
    this.syncBehaviours();
    const foes = rollEncounter(room, run.floor, this.player);
    if (foes.length) this.startFight(foes);
    this.doors.build();
    this.audio.setMood(run.stage.id, room.type === 'boss' && !room.cleared);
    this.game.onRoomEntered(room);
    this.saveRun();
  }

  rebuildGrid() {
    const room = this.run.room;
    const tiles = roomTiles(room);
    this.grid = new Grid(tiles);
    this.roomView.draw(this.run.stage.tiles, tiles, room.decals, room.seed);
  }

  /** Writes the run to the save. The room's lasting contents are already plain data on the floor. */
  saveRun() {
    if (!this.player.dead) this.save.setRun(this.run.snapshot());
  }

  /** Fades to black, runs `swap`, fades back. The simulation waits while the screen is dark. */
  transition(swap) {
    if (this.fade) return;
    this.fade = { t: 0, out: true, swap };
    this.peaceful = true;
  }

  travel(dir, door) {
    this.audio.sfx('rift');
    this.transition(() => this.enterRoom(door.to, dir));
  }

  // ---------------------------------------------------------------- fights

  startFight(foes) {
    this.locked = true;
    this.bossHurt = false;
    this.audio.sfx('seal');
    for (const foe of foes) this.spawnEnemy(foe.type, foe.x, foe.y, { elite: foe.elite });
    for (const [id, state] of this.behaviours) PASSIVE[id].onRoomStart?.(this, state);
  }

  spawnEnemy(type, x, y, o = {}) {
    const px = Math.max(ROOM_X + 12, Math.min(ROOM_X + ROOM_W - 12, x));
    const py = Math.max(ROOM_Y + 12, Math.min(ROOM_Y + ROOM_H - 12, y));
    const enemy = new Enemy(this, type, px, py, o);
    this.enemies.push(enemy);
    if (enemy.boss) this.bossEnemy = enemy;
    return enemy;
  }

  freezeAll(time) {
    for (const enemy of this.enemies) if (enemy.state !== 'dead') enemy.frozen = Math.max(enemy.frozen, time);
  }

  onEnemyDied(enemy) {
    const { run } = this;
    this.audio.sfx(enemy.boss ? 'bossDie' : 'enemyDie');
    enemy.routine.onDeath?.(enemy, this);
    this.save.countKill(enemy.type);
    run.stats.kills += 1;
    if (enemy.boss) {
      this.renderer.shake(5, 0.6);
      this.shots.clearHostile();
      for (const other of this.enemies) if (other.minion && other.state !== 'dead') other.die();
    }
    if (enemy.minion) return;
    // Essence drifts to the player and fills Glass Hearts.
    const { health } = run;
    if (health.glassFilled < health.glass) {
      const count = enemy.def.essence * (enemy.elite ? 2 : 1);
      for (let i = 0; i < count; i++) {
        const sprite = this.stage.sprite('fx', 'essence');
        sprite.layer = LAYER.fx;
        const angle = Math.random() * Math.PI * 2;
        this.wisps.push({ sprite, x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 70, vy: Math.sin(angle) * 70, t: 0 });
      }
    }
    if (enemy.elite) this.loot.drop('dust_big', enemy.x, enemy.y);
    else if (!enemy.boss && Math.random() < 0.28 * (run.variant.dropMul ?? 1)) this.loot.drop('dust', enemy.x, enemy.y);
  }

  onPlayerHurt() {
    this.bossHurt = true;
    for (const [id, state] of this.behaviours) PASSIVE[id].onPlayerHurt?.(this, state);
  }

  onPlayerDied() {
    this.game.onDeath();
  }

  clearRoom() {
    const { run } = this;
    const room = run.room;
    this.locked = false;
    this.shots.clearHostile();
    this.audio.sfx('open');
    this.hud.boss(null);
    if (this.ambush) {
      this.ambush = false;
      this.doors.refresh();
      return;
    }
    room.cleared = true;
    run.stats.rooms += 1;
    const active = ITEM_BY_ID[run.active];
    if (active && run.charge < active.charge) {
      run.charge += 1;
      if (run.charge === active.charge) this.audio.sfx('charge');
    }

    const reward = rollReward(room, run.floor, { luck: run.build.stats.luck, pickItem: (pool) => run.pickItem(pool) });
    reward.pickups.forEach((pickup, i) => {
      const angle = (i / Math.max(1, reward.pickups.length)) * Math.PI * 2 + 0.6;
      const spot = this.clearSpot(ROOM_CX + Math.cos(angle) * 18, ROOM_CY + 4 + Math.sin(angle) * 14);
      this.loot.drop(pickup.kind, spot.x, spot.y);
    });
    for (const pedestal of reward.pedestals) this.loot.spawnPedestal(pedestal.item, pedestal.x, pedestal.y);

    if (room.type === 'boss') {
      this.audio.setMood(run.stage.id, false);
      this.mark(BOSS_MARKS[run.stage.boss]);
      if (!this.bossHurt) this.mark('untouched');
      if (run.isLastStage) {
        this.ending = 2.6;
        this.peaceful = true;
      } else {
        const free = Object.keys(DIRS).filter((dir) => !room.doors[dir]);
        room.stageRifts = run.rollStageRifts().map((rift, i) => ({ ...rift, dir: free[i] }));
      }
    }
    this.doors.build();
    this.saveRun();
  }

  /** Awards a completion mark once and tells the player what it unlocked. */
  mark(id) {
    if (!id || !this.save.addMark(id)) return;
    const mark = MARKS.find((m) => m.id === id);
    const item = ITEMS.find((i) => i.unlock === id);
    this.hud.toast(`Отметка: ${mark.name}`, item ? `В снах теперь встречается: ${item.name}` : mark.desc);
  }

  /** The nearest walkable point to (x, y). */
  clearSpot(x, y) {
    if (!this.grid.solidAt(x, y)) return { x, y };
    return this.grid.freeSpot(Math.random, 0, 0, 0);
  }

  /** Enemies that appear in an already cleared room (a failed puzzle). No reward for these. */
  spawnAmbush(types) {
    this.ambush = true;
    this.locked = true;
    this.audio.sfx('seal');
    for (const type of types) {
      const spot = this.grid.freeSpot(Math.random, this.player.x, this.player.y, 80);
      this.spawnEnemy(type, spot.x, spot.y, { minion: true });
    }
    this.doors.refresh();
  }

  // ---------------------------------------------------------------- ink, zones, trails

  placeInk() {
    const { run, player } = this;
    if (run.ink <= 0) {
      this.audio.sfx('deny');
      return;
    }
    run.ink -= 1;
    const sprite = this.stage.sprite('pickups', 'bomb');
    sprite.layer = LAYER.ents;
    sprite.x = player.x;
    sprite.y = player.y + 2;
    // Stretch the four fuse frames over the whole fuse time.
    sprite.speed = 4 / (sprite.entry.fps * INK.fuse);
    this.bombs.push({ sprite, x: player.x, y: player.y + 2, t: INK.fuse });
    this.audio.sfx('place');
  }

  explode(x, y) {
    const { run, player } = this;
    const radius = INK.radius * run.build.stats.inkRadius;
    this.fx.spawn('ink', x, y, { sheet: 'boom', scale: radius > 50 ? 1.5 : 1 });
    this.renderer.shake(4, 0.3);
    this.audio.sfx('boom');
    for (const enemy of this.enemies) {
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d < radius + enemy.radius) enemy.hurt(INK.damage, ((enemy.x - x) / (d || 1)) * 200, ((enemy.y - y) / (d || 1)) * 200);
    }
    if (Math.hypot(player.x - x, player.y - y) < radius * 0.8) player.hurt(2);
    for (const shot of this.shots.list) if (!shot.friendly && Math.hypot(shot.x - x, shot.y - y) < radius) this.shots.kill(shot);

    // Blocks break; cracked ones may hide something.
    const room = run.room;
    let broke = false;
    this.grid.tiles.forEach((row, r) => {
      row.forEach((tile, c) => {
        if (tile !== '#' && tile !== 'x') return;
        const p = tileCenter(c, r);
        if (Math.hypot(p.x - x, p.y - y) > radius) return;
        room.broken.push(r * COLS + c);
        broke = true;
        this.fx.spawn('puff', p.x, p.y);
        if (tile === 'x' && Math.random() < 0.7) {
          const kinds = ['dust_big', 'shard', 'heart_half', 'ink'];
          this.loot.drop(kinds[Math.floor(Math.random() * kinds.length)], p.x, p.y);
        }
      });
    });
    if (broke) this.rebuildGrid();
    this.doors.blast(x, y, radius);
  }

  /** A marked spot where something lands after `delay` seconds. */
  addZone({ x, y, r, delay, damage = 1, onLand = null }) {
    const sprite = this.stage.sprite('fx', 'telegraph');
    sprite.layer = LAYER.decal;
    sprite.x = x;
    sprite.y = y;
    this.zones.push({ sprite, x, y, r, t: delay, damage, onLand });
  }

  /** A mark left behind a shot: crayon burns, ink burns and slows. */
  addTrail(kind, x, y, damage) {
    const ink = kind === 'ink';
    const sprite = this.stage.sprite('fx', ink ? 'puddle' : 'trail');
    sprite.layer = LAYER.decal;
    sprite.x = x;
    sprite.y = y;
    if (ink) sprite.scale = 0.5;
    else sprite.speed = 0.5;
    this.trails.push({ sprite, x, y, ink, r: ink ? 8 : 5, life: ink ? 2.2 : 0.7, max: ink ? 2.2 : 0.7, damage: damage * (ink ? 0.25 : 0.4), tick: 0 });
  }

  updateHazards(dt) {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.t -= dt;
      bomb.sprite.update(dt);
      if (bomb.t <= 0) {
        bomb.sprite.remove();
        this.bombs.splice(i, 1);
        this.explode(bomb.x, bomb.y);
      }
    }
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      zone.t -= dt;
      zone.sprite.update(dt);
      if (zone.t > 0) continue;
      zone.sprite.remove();
      this.zones.splice(i, 1);
      this.fx.spawn('pop_rose', zone.x, zone.y, { scale: 2 });
      this.audio.sfx('pop');
      if (Math.hypot(this.player.x - zone.x, this.player.y - zone.y) < zone.r + this.player.radius) this.player.hurt(zone.damage);
      zone.onLand?.();
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      trail.life -= dt;
      trail.tick -= dt;
      trail.sprite.update(dt);
      trail.sprite.alpha = Math.min(1, trail.life / (trail.max * 0.4));
      if (trail.tick <= 0) {
        trail.tick = 0.25;
        for (const enemy of this.enemies) {
          if (!enemy.targetable || enemy.flying || Math.hypot(enemy.x - trail.x, enemy.y - trail.y) > enemy.radius + trail.r) continue;
          enemy.hurt(trail.damage);
          if (trail.ink) enemy.slow = 0.5;
        }
      }
      if (trail.life <= 0) {
        trail.sprite.remove();
        this.trails.splice(i, 1);
      }
    }
    const { player, run } = this;
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const wisp = this.wisps[i];
      wisp.t += dt;
      const dx = player.x - wisp.x;
      const dy = player.y - wisp.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, wisp.t * 1.6);
      wisp.vx += ((dx / d) * 420 * pull - wisp.vx * 3) * dt;
      wisp.vy += ((dy / d) * 420 * pull - wisp.vy * 3) * dt;
      wisp.x += wisp.vx * dt;
      wisp.y += wisp.vy * dt;
      wisp.sprite.x = wisp.x;
      wisp.sprite.y = wisp.y;
      wisp.sprite.update(dt);
      if (d < 8 || wisp.t > 4) {
        wisp.sprite.remove();
        this.wisps.splice(i, 1);
        if (run.health.addEssence(run.build.stats.essenceMul) > 0) {
          this.audio.sfx('fill');
          this.fx.spawn('heal', player.x, player.y - 8);
        }
      }
    }
  }

  // ---------------------------------------------------------------- items

  /** Starts and stops unique item behaviours so they match the current build. */
  syncBehaviours() {
    const wanted = this.run.build.behaviours;
    for (const [id, state] of this.behaviours) {
      if (wanted.has(id)) continue;
      PASSIVE[id].detach?.(this, state);
      this.behaviours.delete(id);
    }
    for (const id of wanted) {
      if (this.behaviours.has(id)) continue;
      const state = {};
      PASSIVE[id].attach?.(this, state);
      this.behaviours.set(id, state);
    }
  }

  useActive() {
    const { run } = this;
    const def = ITEM_BY_ID[run.active];
    if (!def) return;
    if (run.charge < def.charge) {
      this.audio.sfx('deny');
      return;
    }
    run.charge = 0;
    this.audio.sfx('use');
    this.player.playOnce('use');
    ACTIVE[def.use](this);
  }

  // ---------------------------------------------------------------- the step

  update(dt) {
    const { player, input, run } = this;
    this.promptText = null;

    if (this.fade) {
      const fade = this.fade;
      fade.t += dt;
      const k = Math.min(1, fade.t / FADE);
      this.hud.setFade(fade.out ? k : 1 - k);
      if (k >= 1 && fade.out) {
        fade.swap();
        fade.out = false;
        fade.t = 0;
      } else if (k >= 1) {
        this.fade = null;
        this.peaceful = this.ending > 0;
      }
      if (this.fade?.out) return;
    }

    this.time += dt;
    run.stats.time += dt;
    player.update(dt, input);
    if (!player.dead && player.locked <= 0) {
      if (input.take('ink')) this.placeInk();
      if (input.take('use')) this.useActive();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt);
      if (enemy.gone) {
        enemy.dispose();
        this.enemies.splice(i, 1);
      }
    }
    this.shots.update(dt);
    this.updateHazards(dt);
    this.fx.update(dt);
    this.loot.update(dt);
    this.props.update(dt);
    this.plates.update(dt);
    this.doors.update(dt);
    for (const [id, state] of this.behaviours) PASSIVE[id].update?.(this, dt, state);

    const boss = this.bossEnemy;
    if (boss && boss.state !== 'dead') this.hud.boss(boss.def.name, boss.hp / boss.maxHp);
    if (this.locked && !this.enemies.some((enemy) => enemy.state !== 'dead')) this.clearRoom();

    if (this.ending > 0) {
      this.ending -= dt;
      if (this.ending <= 0) this.game.onEnding();
    }
    this.hud.prompt(this.promptText);
  }

  dispose() {
    this.teardown();
    this.player?.dispose();
    this.hud.prompt(null);
    this.hud.setFade(0);
  }
}
