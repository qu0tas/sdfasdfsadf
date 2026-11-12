// Animated 2D sprites drawn with Three.js as flat textured quads.
// A Sprite shows one cell of a sprite sheet and steps through an animation row frame by frame.
import * as THREE from 'three';
import { animOf, sheets } from '../app/Assets.js';
import { VIEW_H } from '../app/Config.js';

const QUAD = new THREE.PlaneGeometry(1, 1);

const VERTEX = /* glsl */ `
  uniform vec4 uvRect;
  varying vec2 vUv;
  void main() {
    vUv = uvRect.xy + uv * uvRect.zw;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// `flash` whitens the sprite (hit feedback); `tint` multiplies its colour (elites, frozen enemies).
const FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform float flash;
  uniform float alpha;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, vUv);
    if (c.a < 0.02) discard;
    gl_FragColor = vec4(mix(c.rgb * tint, vec3(0.92, 0.98, 0.98), flash), c.a * alpha);
  }
`;

export class Sprite {
  constructor(stage, sheet) {
    this.stage = stage;
    this.sheet = sheet;
    const { texture, meta } = sheets[sheet];
    this.meta = meta;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        map: { value: texture },
        uvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        tint: { value: new THREE.Color(1, 1, 1) },
        flash: { value: 0 },
        alpha: { value: 1 },
      },
    });
    this.mesh = new THREE.Mesh(QUAD, this.material);
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.ox = 0; // drawing offset from the gameplay position
    this.oy = 0;
    this.layer = 3;
    this.sortBias = 0; // added to y when sorting inside a layer
    this.flip = false;
    this.rot = 0;
    this.scale = 1;
    this.alpha = 1;
    this.flash = 0;
    this.material.uniforms.tint.value.setRGB(1, 1, 1);
    this.visible = true;
    this.anim = null;
    this.entry = null;
    this.frame = 0;
    this.time = 0;
    this.speed = 1;
    this.done = false;
    this.then = null;
  }

  setTint(r, g, b) {
    this.material.uniforms.tint.value.setRGB(r, g, b);
    return this;
  }

  /**
   * Starts an animation. Asking for the one already playing does nothing unless `restart` is set.
   * `then` runs once when a non-looping animation reaches its last frame.
   */
  play(anim, { restart = false, then = null, speed = 1 } = {}) {
    if (this.anim === anim && !restart && !this.done) {
      this.then = then ?? this.then;
      return this;
    }
    this.anim = anim;
    this.entry = animOf(this.sheet, anim);
    this.frame = 0;
    this.time = 0;
    this.speed = speed;
    this.done = false;
    this.then = then;
    return this;
  }

  /** Shows a single frame and stops animating. */
  still(anim, frame = 0) {
    this.play(anim, { restart: true });
    this.frame = Math.min(frame, this.entry.frames - 1);
    this.done = true;
    return this;
  }

  update(dt) {
    if (!this.entry || this.done) return;
    this.time += dt * this.speed;
    const index = Math.floor(this.time * this.entry.fps);
    if (this.entry.loop) {
      this.frame = index % this.entry.frames;
    } else if (index >= this.entry.frames) {
      this.frame = this.entry.frames - 1;
      this.done = true;
      const then = this.then;
      this.then = null;
      then?.();
    } else {
      this.frame = index;
    }
  }

  /** Copies the sprite's state to the GPU objects. Called once per rendered frame. */
  sync() {
    const { mesh, meta } = this;
    mesh.visible = this.visible && this.alpha > 0 && !!this.entry;
    if (!mesh.visible) return;
    const w = meta.cellW / meta.width;
    const h = meta.cellH / meta.height;
    const u = this.frame * w;
    const v = 1 - (this.entry.row + 1) * h;
    this.material.uniforms.uvRect.value.set(this.flip ? u + w : u, v, this.flip ? -w : w, h);
    this.material.uniforms.flash.value = this.flash;
    this.material.uniforms.alpha.value = this.alpha;
    // Whole pixels only, so the art never lands between two screen pixels.
    const sort = Math.max(0, Math.min(1, (this.y + this.sortBias) / VIEW_H));
    mesh.position.set(Math.round(this.x + this.ox), -Math.round(this.y + this.oy), this.layer * 10 + sort * 9);
    mesh.rotation.z = this.rot;
    mesh.scale.set(meta.cellW * this.scale, meta.cellH * this.scale, 1);
  }

  /** Hides the sprite and returns it to the pool for reuse. */
  remove() {
    this.stage.release(this);
  }
}

/** Owns every live sprite and recycles them, so bullets and particles do not allocate each time. */
export class SpriteStage {
  constructor(scene) {
    this.scene = scene;
    this.live = new Set();
    this.pool = new Map();
  }

  sprite(sheet, anim) {
    const free = this.pool.get(sheet);
    const sprite = free?.pop() ?? new Sprite(this, sheet);
    sprite.reset();
    if (!sprite.mesh.parent) this.scene.add(sprite.mesh);
    this.live.add(sprite);
    if (anim) sprite.play(anim);
    return sprite;
  }

  release(sprite) {
    if (!this.live.delete(sprite)) return;
    sprite.mesh.visible = false;
    if (!this.pool.has(sprite.sheet)) this.pool.set(sprite.sheet, []);
    this.pool.get(sprite.sheet).push(sprite);
  }

  sync() {
    for (const sprite of this.live) sprite.sync();
  }
}
