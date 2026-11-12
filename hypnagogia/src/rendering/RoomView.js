// Draws the static part of a room (walls, floor, blocks, chalk drawings) into one texture.
// It is rebuilt only when the room changes, e.g. when Ink breaks a block.
import * as THREE from 'three';
import { sheets } from '../app/Assets.js';
import { COLS, LAYER, ROOM_X, ROOM_Y, ROWS, TILE, VIEW_H, VIEW_W } from '../app/Config.js';
import { Rng } from '../utils/rng.js';

export class RoomView {
  constructor(scene) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.NoColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: this.texture, depthTest: false, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(VIEW_W, VIEW_H), material);
    this.mesh.position.set(VIEW_W / 2, -VIEW_H / 2, LAYER.floor);
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);
  }

  cell(sheet, name, x, y) {
    const { image, meta } = sheets[sheet];
    const entry = meta.anims[name];
    this.ctx.drawImage(image, 0, entry.row * meta.cellH, meta.cellW, meta.cellH, Math.round(x), Math.round(y), meta.cellW, meta.cellH);
  }

  /**
   * @param {string} tiles name of the tile sheet for this stage
   * @param {string[][]} grid room tiles: '.', '#', 'x' or ',' (rubble)
   * @param {{name: string, x: number, y: number}[]} decals chalk drawings, by centre
   */
  draw(tiles, grid, decals, seed) {
    const { ctx } = this;
    const rng = new Rng(seed);
    ctx.fillStyle = '#12101f';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const left = ROOM_X - TILE;
    const top = ROOM_Y - TILE;
    const right = ROOM_X + COLS * TILE;
    const bottom = ROOM_Y + ROWS * TILE;
    for (let c = 0; c < COLS; c++) {
      this.cell(tiles, 'wall_n', ROOM_X + c * TILE, top);
      this.cell(tiles, 'wall_s', ROOM_X + c * TILE, bottom);
    }
    for (let r = 0; r < ROWS; r++) {
      this.cell(tiles, 'wall_w', left, ROOM_Y + r * TILE);
      this.cell(tiles, 'wall_e', right, ROOM_Y + r * TILE);
    }
    this.cell(tiles, 'corner_nw', left, top);
    this.cell(tiles, 'corner_ne', right, top);
    this.cell(tiles, 'corner_sw', left, bottom);
    this.cell(tiles, 'corner_se', right, bottom);

    // Mostly the plainest floor tile, so the floor stays calm under the action.
    const variants = [...Array(12).fill('floor0'), 'floor1', 'floor2', 'floor3'];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = ROOM_X + c * TILE;
        const y = ROOM_Y + r * TILE;
        this.cell(tiles, rng.pick(variants), x, y);
        const tile = grid[r][c];
        if (tile === '.' && rng.chance(0.035)) this.cell(tiles, rng.chance(0.5) ? 'decor0' : 'decor1', x, y);
        if (tile === ',') this.cell(tiles, 'rubble', x, y);
      }
    }
    for (const decal of decals) this.cell('symbols', decal.name, decal.x - 8, decal.y - 8);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = grid[r][c];
        if (tile === '#' || tile === 'x') this.cell(tiles, tile === '#' ? 'block' : 'cracked', ROOM_X + c * TILE, ROOM_Y + r * TILE);
      }
    }
    this.texture.needsUpdate = true;
  }
}
