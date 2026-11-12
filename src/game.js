// The Game: owns every system, the state machine and the frame loop.

import * as THREE from 'three';
import { DIFFICULTY } from './core/constants.js';
import { damp } from './core/utils.js';
import { Save } from './core/save.js';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { Sky } from './gfx/sky.js';
import { Effects } from './gfx/effects.js';
import { createEnvironment } from './gfx/materials.js';
import { Level } from './world/level.js';
import { LevelView } from './world/builder.js';
import { Mission } from './world/mission.js';
import { THEMES } from './world/themes.js';
import { LEVELS } from './world/levels/index.js';
import { LOGS, TOTAL_LOGS } from './world/story.js';
import { Player } from './entities/player.js';
import { WeaponSystem } from './entities/weapons.js';
import { EnemyManager } from './entities/enemies.js';
import { Projectiles } from './entities/projectiles.js';
import { Pickups } from './entities/pickups.js';
import { HUD } from './ui/hud.js';
import { Dialogue } from './ui/dialogue.js';
import { Menus } from './ui/menus.js';

const newStats = () => ({ shots: 0, hits: 0, kills: 0, damage: 0, damageTaken: 0, time: 0, deaths: 0 });
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

// Weapons granted when a later chapter is started from the chapter select.
const LOADOUTS = [[], ['rifle'], ['rifle', 'shotgun']];

const BARREL = { radius: 6, damage: 70, enemyScale: 1.6 };
const ATTRACT = { cx: 20, cz: 20, radius: 12, height: 3.2, look: new THREE.Vector3(15, 2, 18) };

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.state = 'boot';
    this.time = 0; // simulated seconds
    this.wall = 0; // seconds of rendered time, keeps running in menus
    this.stats = newStats();
    this.level = null;
    this.view = null;
    this.mission = null;
    this.levelIndex = -1;
    this.checkpoint = null;
    this.timers = [];
    this.errors = [];
    this.lockFails = 0;
    this.attractT = 0;
    this.deadT = 0;
    this.flowT = 0;
    this._amb = [1, 1, 1];
    this._actors = [];
    this._busy = false;

    this.save = new Save();
    this.difficulty = DIFFICULTY[this.save.settings.difficulty] || DIFFICULTY.normal;
    this.audio = new AudioEngine(this.save.settings);
    this.input = new Input(canvas);
    this.hud = new HUD(uiRoot, this);
    this.dialogue = new Dialogue(this, this.hud);
    this.menus = new Menus(uiRoot, this);

    try {
      this.engine = new Engine(canvas, this.save.settings);
    } catch (err) {
      console.error(err);
      this.failed = true;
      this.menus.show('error', { message: 'This browser could not create a WebGL2 context. Enable hardware acceleration or try another browser.' });
      return;
    }

    this.sky = new Sky();
    this.engine.scene.add(this.sky.mesh);
    this.fx = new Effects(this.engine, this.engine.quality);
    this.fx.shakeEnabled = this.save.settings.shake;
    this.player = new Player(this);
    this.weapons = new WeaponSystem(this);
    this.enemies = new EnemyManager(this);
    this.projectiles = new Projectiles(this);
    this.pickups = new Pickups(this);
    this.weapons.root.visible = false;

    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'playing' && !this.input.freeLook) this.pause();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    this._frame = this._frame.bind(this);
  }

  // ---------------------------------------------------------------- lifecycle

  async boot() {
    if (this.failed) return;
    this.menus.show('loading');
    // Door signs are drawn on a canvas with Orbitron, so the font must be ready first.
    await Promise.race([
      document.fonts?.load('700 48px Orbitron').catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
    await nextFrame();
    try {
      this.loadLevel(0);
      this._enterTitle();
    } catch (err) {
      this._fatal(err);
      return;
    }
    this.last = performance.now();
    requestAnimationFrame(this._frame);
  }

  _fatal(err) {
    console.error(err);
    this.errors.push(String(err?.stack || err));
    this.setState('boot');
    this.menus.show('error', { message: 'Something went wrong while building the station: ' + (err?.message || err) });
  }

  setState(state) {
    this.state = state;
    this.input.enabled = state === 'playing';
    if (this.weapons) this.weapons.root.visible = state === 'playing' || state === 'dead';
    this.hud.show(state === 'playing' || state === 'paused' || state === 'dead');
    document.body.dataset.state = state;
  }

  _clearDynamic() {
    this.enemies.clear();
    this.projectiles.clear();
    this.pickups.clear();
    this.fx.clear();
    this.dialogue.clear();
    this.hud.reset();
    this.timers.length = 0;
    const f = this.engine.fx;
    f.damage = f.flash = f.desat = f.fade = 0;
  }

  loadLevel(index) {
    if (this.view) this.view.dispose();
    this.view = null;
    this.mission = null;
    this._clearDynamic();
    this.env?.dispose();

    const def = LEVELS[index];
    const { engine } = this;
    this.levelIndex = index;
    this.def = def;
    this.level = new Level(def);
    for (const d of this.level.doors) d.lockedAtStart = d.locked;
    this.theme = THEMES[def.theme];
    this.view = new LevelView(this.level, this.theme, engine);
    engine.scene.add(this.view.group);
    engine.scene.fog = new THREE.FogExp2(this.theme.fog, this.theme.fogDensity);
    this.env = createEnvironment(engine.renderer, this.theme);
    engine.scene.environment = this.env.texture;
    engine.scene.environmentIntensity = 0.6;
    engine.viewScene.environment = this.env.texture;
    engine.viewScene.environmentIntensity = 0.9;
    this.sky.applyTheme(this.theme);
    engine.applyTheme(this.theme);
    this.fx.setTheme(this.theme);
    try {
      engine.renderer.compile(engine.scene, engine.camera);
    } catch {
      // Pre-compiling is only an optimisation.
    }
  }

  // Reset everything that changes during play and put the run in its starting (or saved) state.
  prepareRun(cp) {
    const { level, def } = this;
    this._clearDynamic();
    this.view.resetDynamic();
    for (const d of level.doors) {
      d.open = 0;
      d.want = 0;
      if (d.slab) d.slab.solid = true;
      level.setDoorLocked(d, d.lockedAtStart);
    }
    this.view.setAlarm(false);
    this.audio.setIntensity(0);
    this.mission = new Mission(this, level, this.view, def);
    this.hud.setChapter(`${def.chapter} · ${def.title}`);
    const deaths = this.stats.deaths;

    if (cp) {
      this.difficulty = DIFFICULTY[cp.difficulty] || this.difficulty;
      this.mission.restore(cp.mission);
      this.player.reset(cp.player.x, cp.player.z, cp.player.yaw);
      this.player.health = cp.player.health;
      this.player.shield = cp.player.shield;
      this.weapons.restore(cp.weapons);
      this.pickups.spawnLevel(this.mission.collected);
      this.stats = { ...newStats(), ...cp.stats };
      if (this._retrying) this.stats.deaths = Math.max(deaths, this.stats.deaths);
      this.pendingBegin = false;
    } else {
      this.player.reset(level.start.x, level.start.z, def.startYaw || 0);
      this.weapons._resetState();
      this.pickups.spawnLevel(new Set());
      this.stats = newStats();
      this.pendingBegin = true;
    }
    this.deadT = 0;
    this.flowT = 0;
    this.engine.camera.fov = this.save.settings.fov;
    this.engine.camera.updateProjectionMatrix();
    level.updateFlow(this.player.pos.x, this.player.pos.z);
    this._placeCamera(0);
  }

  _placeCamera(dt) {
    this.player._camera(dt, this.save.settings);
    this.view.update(dt, this.wall, this.player.pos);
    this.sky.update(dt, this.engine.camera);
  }

  _enterTitle() {
    this._clearDynamic();
    this.view.resetDynamic();
    this.view.setPower(true, true);
    this.view.setAlarm(false);
    this.audio.setIntensity(0);
    this.setState('title');
    this.menus.returnTo = 'title';
    this.menus.show('title');
  }

  // ---------------------------------------------------------------- menu actions

  newGame(difficultyId) {
    const s = this.save.settings;
    if (DIFFICULTY[difficultyId]) s.difficulty = difficultyId;
    this.difficulty = DIFFICULTY[s.difficulty] || DIFFICULTY.normal;
    this.weapons.reset();
    this.checkpoint = null;
    this.save.setCheckpoint(null);
    this.audio.startMusic(THEMES[LEVELS[0].theme].music);
    this.setState('intro');
    this.menus.show('intro');
  }

  continueGame() {
    const cp = this.save.data.checkpoint;
    if (!cp || !LEVELS[cp.level]) return;
    this.startLevel(cp.level, cp);
  }

  startChapter(i) {
    if (!LEVELS[i]) return;
    this.difficulty = DIFFICULTY[this.save.settings.difficulty] || DIFFICULTY.normal;
    this.weapons.reset();
    for (const id of LOADOUTS[i] || []) this.weapons.give(id);
    if (i > 0) this.weapons.current = 'rifle';
    this.startLevel(i);
  }

  async startLevel(i, checkpoint = null) {
    if (this._busy) return;
    this._busy = true;
    this.setState('boot');
    this.menus.show('loading');
    await nextFrame();
    try {
      if (this.levelIndex !== i) this.loadLevel(i);
      this.prepareRun(checkpoint);
      if (checkpoint) this.checkpoint = checkpoint;
      this.setState('ready');
      this.menus.show('deploy', { chapter: this.def.chapter, title: this.def.title, subtitle: this.def.subtitle, resume: !!checkpoint });
    } catch (err) {
      this._fatal(err);
    } finally {
      this._busy = false;
    }
  }

  // Try to capture the pointer; fall back to free look when the browser keeps refusing.
  async _capture(forgiving) {
    const ok = await this.input.requestLock();
    if (ok) {
      this.lockFails = 0;
      this.input.freeLook = false;
      return true;
    }
    this.lockFails++;
    if (this.input.freeLook) return true;
    if (forgiving || this.lockFails >= 2) {
      this.input.freeLook = true;
      this._freeLookNotice = true;
      return true;
    }
    return false;
  }

  _play() {
    this.menus.hide();
    this.setState('playing');
    this.input.endFrame();
    this.input.releaseAll();
    this.last = performance.now();
    if (this._freeLookNotice) {
      this._freeLookNotice = false;
      this.hud.toast('Mouse capture unavailable — free look enabled. Press Esc or P to pause.', 'warn', 7);
    }
  }

  async deploy() {
    if (this.state !== 'ready' || this._busy) return;
    this._busy = true;
    this.audio.init();
    await this._capture(true);
    this._busy = false;
    if (this.state !== 'ready') return;
    this._play();
    this.audio.startMusic(this.theme.music);
    if (this.pendingBegin) {
      this.pendingBegin = false;
      this.mission.begin();
      this.hud.chapterCard(this.def.chapter, this.def.title, this.def.subtitle);
      this.saveCheckpoint(true);
    }
  }

  pause(note) {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.input.releaseAll();
    this.input.exitLock();
    this.menus.returnTo = 'pause';
    this.menus.show('pause', { note });
  }

  async resume() {
    if ((this.state !== 'paused' && this.state !== 'choice') || this._busy) return;
    this._busy = true;
    const ok = await this._capture(false);
    this._busy = false;
    if (this.state !== 'paused' && this.state !== 'choice') return;
    if (!ok) {
      // Browsers refuse to re-capture the mouse for a moment after Esc.
      this.setState('paused');
      this.menus.returnTo = 'pause';
      this.menus.show('pause', { note: 'The browser is not ready to capture the mouse yet — choose Resume again.' });
      return;
    }
    this._play();
  }

  async retry() {
    const cp = this.checkpoint || this.save.data.checkpoint;
    if (this._busy) return;
    if (!cp || cp.level !== this.levelIndex) {
      this.startLevel(this.levelIndex);
      return;
    }
    this._busy = true;
    const ok = await this._capture(false);
    this._busy = false;
    try {
      this._retrying = true;
      this.prepareRun(cp);
    } catch (err) {
      this._fatal(err);
      return;
    } finally {
      this._retrying = false;
    }
    if (ok) this._play();
    else {
      this.setState('ready');
      this.menus.show('deploy', { chapter: this.def.chapter, title: this.def.title, subtitle: this.def.subtitle, resume: true });
    }
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) this.quitToTitle();
    else this.startLevel(this.levelIndex + 1);
  }

  async quitToTitle() {
    if (this._busy) return;
    this.audio.stopMusic();
    this.input.exitLock();
    this.mission = null;
    if (this.levelIndex !== 0) {
      this._busy = true;
      this.setState('boot');
      this.menus.show('loading');
      await nextFrame();
      this._busy = false;
      try {
        this.loadLevel(0);
      } catch (err) {
        this._fatal(err);
        return;
      }
    }
    this._enterTitle();
  }

  openChoice() {
    if (this.state !== 'playing') return;
    this.setState('choice');
    this.input.releaseAll();
    this.input.exitLock();
    this.menus.show('choice');
  }

  chooseEnding(id) {
    const endings = this.save.data.endings;
    if (!endings.includes(id)) endings.push(id);
    this.checkpoint = null;
    this.save.setCheckpoint(null);
    this.audio.setIntensity(0);
    this.setState('ending');
    this.menus.show('ending', { id, stats: { ...this.stats } });
  }

  completeLevel() {
    if (this.state !== 'playing') return;
    const { def, levelIndex: i } = this;
    this.setState('complete');
    this.input.releaseAll();
    this.input.exitLock();
    this.audio.setIntensity(0);
    this.save.unlock(Math.min(LEVELS.length, i + 2));
    // The finished chapter's checkpoint is spent; the next one is taken on deployment.
    this.checkpoint = null;
    this.save.setCheckpoint(null);
    const found = this.save.data.logs;
    this.menus.show('complete', {
      chapter: def.chapter,
      title: def.title,
      stats: { ...this.stats },
      logs: (def.logs || []).filter((id) => found.includes(id)).length,
      logTotal: (def.logs || []).length,
      next: LEVELS[i + 1] ? LEVELS[i + 1].title : 'TITLE',
    });
  }

  applySettings(key) {
    const s = this.save.settings;
    switch (key) {
      case 'master':
      case 'music':
      case 'sfx':
        this.audio.applyVolumes();
        break;
      case 'quality':
        this.engine.setQuality(s.quality);
        if (this.theme) this.engine.applyTheme(this.theme);
        this.view?.applyQuality(this.engine.quality);
        break;
      case 'difficulty':
        this.difficulty = DIFFICULTY[s.difficulty] || DIFFICULTY.normal;
        break;
      case 'shake':
        this.fx.shakeEnabled = s.shake;
        break;
      default:
        break; // fov, sensitivity, invertY and dynRes are read live
    }
  }

  // ---------------------------------------------------------------- gameplay hooks

  saveCheckpoint(silent) {
    const p = this.player;
    const snap = {
      level: this.levelIndex,
      difficulty: Object.keys(DIFFICULTY).find((k) => DIFFICULTY[k] === this.difficulty) || 'normal',
      player: { x: p.pos.x, z: p.pos.z, yaw: p.yaw, health: p.health, shield: p.shield },
      weapons: this.weapons.serialize(),
      mission: this.mission.snapshot(),
      stats: { ...this.stats },
    };
    this.checkpoint = snap;
    this.save.setCheckpoint(snap);
    if (!silent) {
      this.audio.play('checkpoint');
      this.hud.toast('Checkpoint saved', 'good');
    }
  }

  onPlayerDeath() {
    if (this.state !== 'playing') return;
    this.setState('dead');
    this.stats.deaths++;
    this.deadT = 0;
    this.audio.setIntensity(0);
  }

  onEnemyKilled(e) {
    if (e.type === 'pylon') return;
    this.stats.kills++;
    const x = e.pos.x, z = e.pos.z;
    if (e.type === 'warden') return;
    if (e.type === 'juggernaut') {
      this.pickups.drop('healthOrb', x - 0.5, z);
      this.pickups.drop('ammoOrb', x + 0.5, z);
    } else if (this.player.health < 70 && Math.random() < 0.22) this.pickups.drop('healthOrb', x, z);
    else if (this.weapons.needsAmmo() && Math.random() < 0.28) this.pickups.drop('ammoOrb', x, z);
  }

  collectLog(id) {
    const log = LOGS[id];
    if (!log) return;
    this.save.addLog(id);
    this.hud.showLog(log);
    this.audio.play('log');
    this.hud.toast(`Data log recovered · ${this.save.data.logs.length} / ${TOTAL_LOGS}`, 'good');
  }

  after(seconds, fn) {
    this.timers.push({ t: seconds, fn });
  }

  explode(x, y, z, radius, damage, { enemyScale = 1 } = {}) {
    const p = this.player;
    this.fx.explosion(x, y, z, radius);
    this.audio.play('explosion', { pos: { x, z } });
    const d = Math.hypot(p.pos.x - x, p.pos.y + 0.9 - y, p.pos.z - z);
    this.fx.shake(Math.max(0, 0.6 * (1 - d / (radius * 3))));
    if (p.alive && d < radius && this.level.lineOfSight(x, y, z, p.pos.x, p.pos.y + 0.9, p.pos.z)) {
      _from.set(x, y, z);
      p.takeDamage(damage * (1 - d / radius), _from);
    }
    this.enemies.damageRadius(x, y, z, radius, damage * enemyScale);
    for (const b of this.view.barrels) {
      if (!b.alive || Math.hypot(b.x - x, b.z - z) > radius * 0.9) continue;
      this.after(0.12, () => this.damageBarrel(b, 999));
    }
  }

  damageBarrel(barrel) {
    if (!barrel.alive) return;
    this.view.removeBarrel(barrel);
    this.explode(barrel.x, 0.7, barrel.z, BARREL.radius, BARREL.damage, { enemyScale: BARREL.enemyScale });
  }

  // ---------------------------------------------------------------- frame loop

  _frame(now) {
    requestAnimationFrame(this._frame);
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    try {
      this._tick(dt);
    } catch (err) {
      const msg = String(err?.stack || err);
      if (!this.errors.includes(msg)) {
        this.errors.push(msg);
        console.error(err);
      }
    }
  }

  _tick(dt) {
    const s = this.state;
    if (s === 'boot' || !this.view) return;
    this.wall += dt;
    if (s === 'playing') this._simulate(dt);
    else if (s === 'dead') this._simulateDead(dt);
    else if (s === 'title' || s === 'intro') this._attract(dt);
    else if (s === 'ready') {
      this._placeCamera(dt);
      this.fx.update(dt, this.engine.camera);
    }
    this.engine.render(dt, this.wall);
    this.input.endFrame();
  }

  _runTimers(dt) {
    const timers = this.timers;
    for (let i = timers.length - 1; i >= 0; i--) {
      const t = timers[i];
      t.t -= dt;
      if (t.t <= 0) {
        timers.splice(i, 1);
        t.fn();
      }
    }
  }

  _world(dt) {
    const p = this.player, cam = this.engine.camera;
    this.fx.update(dt, cam);
    this.view.update(dt, this.time, p.pos);
    this.sky.update(dt, cam);
    this.audio.setListener(p.pos.x, p.pos.z, p.yaw);
    this.weapons.setAmbient(this.level.sampleLight(p.pos.x, p.pos.z, this._amb));
  }

  _simulate(dt) {
    const { player: p, level, input, enemies } = this;
    this.time += dt;
    this.stats.time += dt;

    this.flowT -= dt;
    if (this.flowT <= 0) {
      this.flowT = 0.25;
      level.updateFlow(p.pos.x, p.pos.z);
    }
    p.update(dt);
    this.weapons.update(dt, true);

    const actors = this._actors;
    actors.length = 0;
    actors.push(p.pos);
    for (const e of enemies.list) if (e.alive) actors.push(e.pos);
    level.updateDoors(dt, actors, (door, opening) => this.audio.play(opening ? 'door' : 'doorClose', { pos: door }));

    enemies.update(dt);
    this.projectiles.update(dt);
    this.pickups.update(dt);
    this._runTimers(dt);
    this.mission.update(dt);
    this._world(dt);

    const f = this.engine.fx;
    f.damage = Math.max(0, f.damage - dt * 1.3);
    f.flash = Math.max(0, f.flash - dt * 3.2);
    f.desat = damp(f.desat, 0, 6, dt);
    f.fade = damp(f.fade, 0, 6, dt);

    const n = enemies.engaged();
    this.view.setAlarm(n > 0);
    this.audio.setIntensity(n > 0 ? Math.min(1, 0.5 + n * 0.1) : 0);

    this.hud.update(dt);
    this.dialogue.update(dt);

    if (this.state !== 'playing') return;
    if (input.hit('Escape') || input.hit('KeyP')) this.pause();
    else if (input.hit('KeyJ')) {
      this.pause();
      this.menus.open('journal');
    }
  }

  // The world keeps moving around the fallen player until the menu comes up.
  _simulateDead(dt) {
    const p = this.player;
    this.time += dt;
    p.update(dt);
    this.weapons.update(dt, false);
    this.enemies.update(dt);
    this.projectiles.update(dt);
    this._runTimers(dt);
    this._world(dt);
    const f = this.engine.fx;
    f.flash = Math.max(0, f.flash - dt * 3.2);
    f.damage = Math.max(0.35, f.damage - dt * 0.6);
    f.desat = damp(f.desat, 0.85, 2.2, dt);
    f.fade = damp(f.fade, 0.45, 1.4, dt);
    this.hud.update(dt);
    this.dialogue.update(dt);
    const before = this.deadT;
    this.deadT += dt;
    if (before < 1.2 && this.deadT >= 1.2) {
      this.input.exitLock();
      this.menus.show('dead');
    }
  }

  // Slow orbit around the hangar behind the title screen and the intro.
  _attract(dt) {
    const cam = this.engine.camera;
    this.attractT += dt;
    const a = 2.2 + this.attractT * 0.045;
    cam.position.set(ATTRACT.cx + Math.cos(a) * ATTRACT.radius, ATTRACT.height, ATTRACT.cz + Math.sin(a) * ATTRACT.radius);
    cam.lookAt(ATTRACT.look);
    if (Math.abs(cam.fov - 62) > 0.01) {
      cam.fov = 62;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
    this.fx.update(dt, cam);
    this.view.update(dt, this.wall, cam.position);
    this.sky.update(dt, cam);
  }
}

const _from = new THREE.Vector3();
