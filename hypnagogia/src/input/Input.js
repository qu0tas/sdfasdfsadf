// The single place that reads the keyboard, mouse and gamepad. Gameplay asks for actions
// ("dash", "ink") and never looks at raw keys.
import { ROOM_CX, ROOM_CY } from '../app/Config.js';

/** Action -> keys (KeyboardEvent.code). Edit here to change the controls. */
export const BINDINGS = {
  up: ['KeyW'],
  down: ['KeyS'],
  left: ['KeyA'],
  right: ['KeyD'],
  fireUp: ['ArrowUp'],
  fireDown: ['ArrowDown'],
  fireLeft: ['ArrowLeft'],
  fireRight: ['ArrowRight'],
  dash: ['Space', 'ShiftLeft'],
  ink: ['KeyE'],
  use: ['KeyQ'],
  interact: ['KeyF'],
  map: ['Tab', 'KeyM'],
  pause: ['Escape', 'KeyP'],
};

/** Gamepad buttons (standard mapping) for the same actions. */
const PAD_BUTTONS = { dash: [0, 4], ink: [2], use: [3], interact: [1], pause: [9], map: [8] };

export class Input {
  constructor(renderer) {
    this.renderer = renderer;
    this.down = new Set();
    this.pressed = new Set(); // actions that went down since the last simulation step
    this.mouse = { x: ROOM_CX, y: ROOM_CY, held: false, moved: false };
    this.padHeld = new Set();
    this.padAim = null;
    this.padMove = { x: 0, y: 0 };
    this.usingPad = false;
    this.codeToActions = new Map();
    for (const [action, codes] of Object.entries(BINDINGS)) {
      for (const code of codes) this.codeToActions.set(code, [...(this.codeToActions.get(code) ?? []), action]);
    }

    window.addEventListener('keydown', (e) => {
      const actions = this.codeToActions.get(e.code);
      if (!actions) return;
      if (e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (e.repeat) return;
      this.usingPad = false;
      for (const action of actions) {
        this.down.add(action);
        this.pressed.add(action);
      }
    });
    window.addEventListener('keyup', (e) => {
      for (const action of this.codeToActions.get(e.code) ?? []) this.down.delete(action);
    });
    window.addEventListener('blur', () => this.releaseAll());
    window.addEventListener('pointermove', (e) => {
      Object.assign(this.mouse, renderer.toView(e.clientX, e.clientY));
      this.mouse.moved = true;
      this.usingPad = false;
    });
    renderer.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      Object.assign(this.mouse, renderer.toView(e.clientX, e.clientY));
      this.mouse.held = true;
      this.mouse.moved = true;
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.mouse.held = false;
    });
    renderer.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  releaseAll() {
    this.down.clear();
    this.pressed.clear();
    this.mouse.held = false;
  }

  /** Reads the gamepad. Called once per rendered frame. */
  poll() {
    const pad = navigator.getGamepads?.().find((p) => p && p.connected && p.mapping === 'standard');
    if (!pad) return;
    const dead = (v) => (Math.abs(v) < 0.25 ? 0 : v);
    this.padMove = { x: dead(pad.axes[0]), y: dead(pad.axes[1]) };
    const ax = dead(pad.axes[2]);
    const ay = dead(pad.axes[3]);
    this.padAim = ax || ay ? { x: ax, y: ay } : null;
    if (this.padAim || this.padMove.x || this.padMove.y) this.usingPad = true;
    for (const [action, buttons] of Object.entries(PAD_BUTTONS)) {
      const held = buttons.some((index) => pad.buttons[index]?.pressed);
      if (held && !this.padHeld.has(action)) {
        this.pressed.add(action);
        this.usingPad = true;
      }
      if (held) this.padHeld.add(action);
      else this.padHeld.delete(action);
    }
  }

  /** True once for each press of the action. */
  take(action) {
    return this.pressed.delete(action);
  }

  /** Call after a simulation step so one press is never handled twice. */
  endStep() {
    this.pressed.clear();
  }

  /** Movement direction, length 0..1. */
  move() {
    let x = (this.down.has('right') ? 1 : 0) - (this.down.has('left') ? 1 : 0);
    let y = (this.down.has('down') ? 1 : 0) - (this.down.has('up') ? 1 : 0);
    if (!x && !y) ({ x, y } = this.padMove);
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  /**
   * Where the player wants to shoot from position (px, py).
   * Arrow keys and the right stick fire in their direction; otherwise the mouse aims and its button fires.
   * @returns {{x: number, y: number, firing: boolean}} unit direction
   */
  aim(px, py) {
    const kx = (this.down.has('fireRight') ? 1 : 0) - (this.down.has('fireLeft') ? 1 : 0);
    const ky = (this.down.has('fireDown') ? 1 : 0) - (this.down.has('fireUp') ? 1 : 0);
    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      return { x: kx / len, y: ky / len, firing: true };
    }
    if (this.padAim) {
      const len = Math.hypot(this.padAim.x, this.padAim.y);
      return { x: this.padAim.x / len, y: this.padAim.y / len, firing: true };
    }
    const dx = this.mouse.x - px;
    const dy = this.mouse.y - py;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len, firing: this.mouse.held && !this.usingPad };
  }
}
