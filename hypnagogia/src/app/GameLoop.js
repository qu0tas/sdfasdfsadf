// Drives the game: a fixed-step simulation with rendering as fast as the display allows.
// Gameplay therefore runs at the same speed on a 60 Hz and a 144 Hz monitor.
import { STEP } from './Config.js';

export class GameLoop {
  /**
   * @param {(dt: number) => void} update one simulation step of STEP seconds
   * @param {(frameTime: number) => void} render called once per displayed frame with the real elapsed time
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.last = 0;
    this.acc = 0;
    this.running = false;
    this.tick = this.tick.bind(this);
  }

  start() {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.tick);
  }

  tick(now) {
    if (!this.running) return;
    // After a stall or a tab switch the gap is clamped, so nothing teleports or takes surprise damage.
    const frame = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.acc += frame;
    while (this.acc >= STEP) {
      this.update(STEP);
      this.acc -= STEP;
    }
    this.render(frame);
    requestAnimationFrame(this.tick);
  }
}
