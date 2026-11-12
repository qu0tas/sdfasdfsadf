// The three kinds of hearts. All amounts are in half hearts unless noted.
//
// Rules used by this build (proposals — the brief leaves the exact rules open):
//   Red     containers that can be refilled.
//   Blue    extra protection on top; lost first; gone once spent.
//   Glass   a container that starts empty. Essence from defeated enemies fills it. A filled Glass Heart
//           absorbs one whole hit, whatever its size, then is empty again and can be refilled.
// Order of loss: Blue, then a filled Glass Heart, then Red. The run ends when no Red, Blue or filled
// Glass Heart is left.
import { ESSENCE_PER_GLASS, PLAYER } from '../../data/balance.js';

export class Health {
  constructor(data = {}) {
    this.redMax = data.redMax ?? PLAYER.startRed;
    this.red = data.red ?? this.redMax;
    this.blue = data.blue ?? 0;
    this.glass = data.glass ?? PLAYER.startGlass; // number of Glass Hearts
    this.glassFilled = data.glassFilled ?? 0;
    this.essence = data.essence ?? 0;
  }

  toJSON() {
    const { redMax, red, blue, glass, glassFilled, essence } = this;
    return { redMax, red, blue, glass, glassFilled, essence };
  }

  get dead() {
    return this.red <= 0 && this.blue <= 0 && this.glassFilled <= 0;
  }

  /** Whole-heart slots in use, against PLAYER.maxHearts. */
  get slots() {
    return this.redMax / 2 + this.glass;
  }

  /**
   * @param {number} amount half hearts
   * @returns {'blue' | 'glass' | 'red'} what took the hit
   */
  damage(amount = 1) {
    if (this.blue > 0) {
      this.blue = Math.max(0, this.blue - amount);
      return 'blue';
    }
    if (this.glassFilled > 0) {
      this.glassFilled -= 1;
      return 'glass';
    }
    this.red = Math.max(0, this.red - amount);
    return 'red';
  }

  canHealRed() {
    return this.red < this.redMax;
  }

  healRed(amount) {
    const before = this.red;
    this.red = Math.min(this.redMax, this.red + amount);
    return this.red - before;
  }

  canAddBlue() {
    return this.blue < PLAYER.maxBlue;
  }

  addBlue(amount) {
    this.blue = Math.min(PLAYER.maxBlue, this.blue + amount);
  }

  /** Adds a red container (one whole heart). Returns false when there is no room for it. */
  addContainer() {
    if (this.slots >= PLAYER.maxHearts) return false;
    this.redMax += 2;
    return true;
  }

  addGlass() {
    if (this.slots >= PLAYER.maxHearts) return false;
    this.glass += 1;
    return true;
  }

  /** @returns {number} how many Glass Hearts this essence just filled */
  addEssence(amount) {
    if (this.glassFilled >= this.glass) {
      this.essence = 0;
      return 0;
    }
    this.essence += amount;
    let filled = 0;
    while (this.essence >= ESSENCE_PER_GLASS && this.glassFilled < this.glass) {
      this.essence -= ESSENCE_PER_GLASS;
      this.glassFilled += 1;
      filled += 1;
    }
    if (this.glassFilled >= this.glass) this.essence = 0;
    return filled;
  }
}
