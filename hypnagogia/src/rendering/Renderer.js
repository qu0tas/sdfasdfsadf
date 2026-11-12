// The Three.js side of the game: one flat scene looked at by an orthographic camera.
// Everything is drawn at the logical resolution and the canvas is scaled up by whole numbers.
import * as THREE from 'three';
import { VIEW_H, VIEW_W } from '../app/Config.js';
import { SpriteStage } from './Sprite.js';

export class Renderer {
  constructor(canvas, frame) {
    this.canvas = canvas;
    this.frame = frame; // element that wraps the canvas and the interface
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.gl.setPixelRatio(1);
    this.gl.setSize(VIEW_W, VIEW_H, false);
    this.gl.setClearColor(0x12101f, 1);
    // Sprite colours are authored for the screen; no colour-space conversion.
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.scene = new THREE.Scene();
    // Game y grows downward, so sprites are placed at -y and the camera looks at 0..-VIEW_H.
    this.camera = new THREE.OrthographicCamera(0, VIEW_W, 0, -VIEW_H, 1, 1000);
    this.camera.position.z = 500;
    this.stage = new SpriteStage(this.scene);

    this.shakeTime = 0;
    this.shakePower = 0;
    this.shakeScale = 1; // from settings; 0 turns shaking off
    this.scale = 1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Picks the largest whole-number scale that fits the window. */
  resize() {
    const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    // High-DPI screens: snap to whole device pixels so every game pixel has the same size.
    const dpr = window.devicePixelRatio || 1;
    const scale = fit >= 1 ? Math.max(1, Math.floor(fit * dpr)) / dpr : fit;
    this.scale = scale;
    this.frame.style.width = `${VIEW_W * scale}px`;
    this.frame.style.height = `${VIEW_H * scale}px`;
    this.frame.style.setProperty('--px', `${scale}px`);
  }

  shake(power, time = 0.18) {
    if (power * this.shakeScale <= 0) return;
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakePower = 0;
    }
  }

  render() {
    this.stage.sync();
    const power = this.shakePower * this.shakeScale;
    this.camera.position.x = power ? Math.round((Math.random() * 2 - 1) * power) : 0;
    this.camera.position.y = power ? Math.round((Math.random() * 2 - 1) * power) : 0;
    this.gl.render(this.scene, this.camera);
  }

  /** Converts a mouse event position to game coordinates. */
  toView(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }
}
