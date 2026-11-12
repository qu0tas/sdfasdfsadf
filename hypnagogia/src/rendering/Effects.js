// Short-lived visual effects: each one is a sprite that plays its animation once and disappears.
import { LAYER } from '../app/Config.js';

export class Effects {
  constructor(stage) {
    this.stage = stage;
    this.list = [];
  }

  /**
   * @param {string} anim animation name in `sheet` (default sheet: 'fx')
   * @param {object} [o] { sheet, layer, rot, scale, alpha, vx, vy, speed }
   */
  spawn(anim, x, y, o = {}) {
    const sprite = this.stage.sprite(o.sheet ?? 'fx', anim);
    sprite.x = x;
    sprite.y = y;
    sprite.layer = o.layer ?? LAYER.fx;
    sprite.rot = o.rot ?? 0;
    sprite.scale = o.scale ?? 1;
    sprite.alpha = o.alpha ?? 1;
    sprite.speed = o.speed ?? 1;
    this.list.push({ sprite, vx: o.vx ?? 0, vy: o.vy ?? 0 });
    return sprite;
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const fx = this.list[i];
      fx.sprite.x += fx.vx * dt;
      fx.sprite.y += fx.vy * dt;
      fx.sprite.update(dt);
      if (fx.sprite.done) {
        fx.sprite.remove();
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const fx of this.list) fx.sprite.remove();
    this.list.length = 0;
  }
}
