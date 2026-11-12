// The top of the game: owns the systems, decides which screen is active and reacts to the big
// events of a run (start, death, moving between stages, the ending). Moment-to-moment play is in World.
import { ROOM_CX, ROOM_CY } from './Config.js';
import { GameLoop } from './GameLoop.js';
import { Audio } from '../audio/Audio.js';
import { TEMPLATE_BY_ID } from '../data/rooms.js';
import { STAGES, VARIANTS } from '../data/stages.js';
import { Run } from '../gameplay/progression/Run.js';
import { World } from '../gameplay/rooms/World.js';
import { Input } from '../input/Input.js';
import { Renderer } from '../rendering/Renderer.js';
import { RoomView } from '../rendering/RoomView.js';
import { Save } from '../save/Save.js';
import { Hud } from '../ui/Hud.js';
import { Menus } from '../ui/Menus.js';

const HINT = 'WASD — идти · мышь или стрелки — стрелять · Пробел — рывок · E — чернила · Tab — карта';

export class Game {
  constructor(canvas, frame, uiRoot) {
    this.save = new Save();
    this.renderer = new Renderer(canvas, frame);
    this.roomView = new RoomView(this.renderer.scene);
    this.input = new Input(this.renderer);
    this.audio = new Audio();
    this.hud = new Hud(uiRoot);
    this.menus = new Menus(uiRoot, this);
    this.state = 'title'; // title | playing | paused | over
    this.run = null;
    this.world = null;
    this.titleSprite = null;
    this.applySettings();

    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    // Leaving the tab pauses the game and the sound; nothing happens behind the player's back.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'playing') this.pause();
        this.audio.suspend();
      } else {
        this.audio.resume();
      }
    });
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.pause();
    });

    this.loop = new GameLoop((dt) => this.update(dt), (frameTime) => this.render(frameTime));
  }

  start() {
    this.showTitle();
    this.loop.start();
  }

  applySettings() {
    const { master, music, sfx, shake } = this.save.settings;
    this.audio.setVolumes({ master, music, sfx });
    this.renderer.shakeScale = shake;
  }

  // ---------------------------------------------------------------- screens

  /** The title screen: a quiet room in the roots with Крошка Ноль standing in it. */
  showTitle() {
    this.endWorld();
    this.state = 'title';
    this.hud.show(false);
    this.audio.setMood('title');
    this.roomView.draw(STAGES[0].tiles, TEMPLATE_BY_ID.open.rows.map((row) => [...row]), [], 7);
    this.titleSprite = this.renderer.stage.sprite('zero', 'idle');
    this.titleSprite.x = ROOM_CX;
    this.titleSprite.y = ROOM_CY + 44;
    this.menus.title();
  }

  endWorld() {
    this.world?.dispose();
    this.world = null;
    this.run = null;
    this.titleSprite?.remove();
    this.titleSprite = null;
  }

  beginWorld(run, fresh) {
    this.endWorld();
    this.menus.close();
    this.run = run;
    this.state = 'playing';
    this.hud.show(true);
    this.input.releaseAll();
    this.world = new World(this);
    this.world.begin(run, fresh);
    this.hud.banner(run.stage.name, fresh ? 'Последний страж идёт дальше' : VARIANTS[run.floor.variant].name);
  }

  newRun() {
    const { meta } = this.save;
    meta.runs += 1;
    this.firstRun = meta.runs === 1;
    this.beginWorld(Run.create(this.save), true);
  }

  continueRun() {
    const run = Run.restore(this.save, this.save.data.run);
    if (!run) {
      // The saved run cannot be rebuilt: say so and drop only the run, never the permanent progress.
      this.save.setRun(null);
      this.save.problem = 'Прерванный сон не удалось восстановить. Начните новый.';
      this.showTitle();
      return;
    }
    this.firstRun = false;
    this.beginWorld(run, false);
  }

  pause() {
    if (this.state !== 'playing' || this.world.player.dead) return;
    this.state = 'paused';
    this.input.releaseAll();
    this.menus.pause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.menus.close();
    this.input.releaseAll();
    this.state = 'playing';
  }

  quitToTitle() {
    this.showTitle();
  }

  wipeSave() {
    this.save.resetAll();
    this.applySettings();
    this.showTitle();
  }

  // ---------------------------------------------------------------- run events (called by World)

  onRoomEntered(room) {
    this.hintRoom = this.firstRun && room.type === 'start' && this.run.stageIndex === 0;
  }

  onStageRift(variantId) {
    const { world, run } = this;
    world.audio.sfx('rift');
    world.transition(() => {
      run.nextStage(variantId);
      world.enterRoom(run.roomId, null);
      world.hud.banner(run.stage.name, VARIANTS[variantId].name);
    });
  }

  onDeath() {
    const { run } = this;
    this.state = 'over';
    this.save.meta.deaths += 1;
    this.save.setRun(null);
    this.audio.setMood('title');
    this.menus.death(run);
  }

  onEnding() {
    const { run } = this;
    this.state = 'over';
    this.save.meta.wins += 1;
    this.save.setRun(null);
    this.audio.setMood('title');
    this.hud.show(false);
    this.menus.ending(run);
  }

  // ---------------------------------------------------------------- loop

  update(dt) {
    const { input } = this;
    if (this.state === 'playing') {
      if (input.take('pause')) this.pause();
      else {
        if (input.take('map')) this.hud.toggleMap(this.run);
        this.world.update(dt);
        if (this.hintRoom && !this.world.promptText) this.hud.prompt(HINT);
      }
    } else if (this.state === 'paused') {
      if (input.take('pause')) this.resume();
    } else if (this.state === 'over' && this.world) {
      // Keep the room alive behind the death screen so the last animation can finish.
      this.world.fx.update(dt);
      this.world.player.sprite.update(dt);
    } else if (this.titleSprite) {
      this.titleSprite.update(dt);
    }
    input.endStep();
  }

  render(frameTime) {
    this.input.poll();
    this.renderer.update(frameTime);
    if (this.run && this.state !== 'title') this.hud.update(this.run);
    this.renderer.render();
  }
}
