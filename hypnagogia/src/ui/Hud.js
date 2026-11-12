// The in-game interface: hearts, resources, active item, map, boss bar and messages.
// It is plain HTML laid over the canvas and only touches the page when a value has changed.
import { icon } from '../app/Assets.js';
import { VIEW_H, VIEW_W } from '../app/Config.js';
import { ESSENCE_PER_GLASS } from '../data/balance.js';
import { ITEM_BY_ID } from '../data/items.js';
import { Minimap } from './Minimap.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export class Hud {
  constructor(root) {
    this.root = el('div', 'hud');
    root.append(this.root);

    this.hearts = el('div', 'hearts');
    this.resources = el('div', 'resources');
    this.counts = {};
    for (const kind of ['dust', 'shard', 'ink']) {
      const row = el('span', 'res');
      this.counts[kind] = el('b', null, '0');
      row.append(icon('hud', kind), this.counts[kind]);
      this.resources.append(row);
    }
    this.active = el('div', 'active');
    this.stageName = el('div', 'stage-name');

    const mapCanvas = el('canvas', 'minimap');
    this.minimap = new Minimap(mapCanvas, false);
    this.bigMap = el('div', 'bigmap');
    const bigCanvas = el('canvas');
    this.fullmap = new Minimap(bigCanvas, true);
    this.bigMap.append(el('div', 'bigmap-title', 'Карта'), bigCanvas);

    this.bossBox = el('div', 'boss');
    this.bossName = el('span');
    this.bossFill = el('i');
    const bar = el('div', 'boss-bar');
    bar.append(this.bossFill);
    this.bossBox.append(this.bossName, bar);

    this.promptBox = el('div', 'prompt');
    this.itemBox = el('div', 'item-banner');
    this.toasts = el('div', 'toasts');
    this.labelBox = el('div', 'labels');
    this.bannerBox = el('div', 'banner');
    this.fadeBox = el('div', 'fade');

    this.root.append(
      this.labelBox, this.hearts, this.resources, this.active, this.stageName, mapCanvas,
      this.bossBox, this.promptBox, this.itemBox, this.toasts, this.bannerBox, this.bigMap, this.fadeBox,
    );
    this.last = {};
    this.show(false);
  }

  show(visible) {
    this.root.classList.toggle('hidden', !visible);
    if (!visible) this.bigMap.classList.remove('open');
  }

  /** Sets a text or attribute only when it differs from what is already shown. */
  changed(key, value) {
    if (this.last[key] === value) return false;
    this.last[key] = value;
    return true;
  }

  update(run) {
    const { health } = run;
    const heartsKey = `${health.redMax}|${health.red}|${health.blue}|${health.glass}|${health.glassFilled}`;
    if (this.changed('hearts', heartsKey)) {
      this.hearts.replaceChildren();
      for (let i = 0; i < health.redMax / 2; i++) {
        const left = health.red - i * 2;
        this.hearts.append(icon('hud', left >= 2 ? 'heart_full' : left === 1 ? 'heart_half' : 'heart_empty'));
      }
      for (let i = 0; i < health.glass; i++) {
        const glass = icon('hud', i < health.glassFilled ? 'glass_full' : 'glass_empty');
        if (i === health.glassFilled) glass.classList.add('filling');
        this.hearts.append(glass);
      }
      for (let i = 0; i < Math.ceil(health.blue / 2); i++) {
        this.hearts.append(icon('hud', health.blue - i * 2 >= 2 ? 'blue_full' : 'blue_half'));
      }
    }
    // The Glass Heart being filled shows how much essence it already holds.
    const fill = Math.round((health.essence / ESSENCE_PER_GLASS) * 10);
    if (this.changed('essence', `${heartsKey}|${fill}`)) {
      this.hearts.querySelector('.filling')?.style.setProperty('--fill', `${fill * 10}%`);
    }

    if (this.changed('dust', run.dust)) this.counts.dust.textContent = run.dust;
    if (this.changed('shard', run.shards)) this.counts.shard.textContent = run.shards;
    if (this.changed('ink', run.ink)) this.counts.ink.textContent = run.ink;

    if (this.changed('active', `${run.active}|${run.charge}`)) {
      this.active.replaceChildren();
      const def = ITEM_BY_ID[run.active];
      if (def) {
        const pips = el('span', 'pips');
        for (let i = 0; i < def.charge; i++) pips.append(icon('hud', i < run.charge ? 'charge_on' : 'charge_off'));
        this.active.append(icon('items', def.id), pips, el('span', 'key', 'Q'));
        this.active.classList.toggle('ready', run.charge >= def.charge);
      }
    }
    if (this.changed('stage', `${run.stageIndex}|${run.floor.variant}`)) {
      this.stageName.textContent = run.stage.name;
    }
    this.minimap.draw(run);
    if (this.bigMap.classList.contains('open')) this.fullmap.draw(run);
  }

  toggleMap(run) {
    const open = this.bigMap.classList.toggle('open');
    if (open) {
      this.fullmap.signature = '';
      this.fullmap.draw(run);
    }
  }

  /** @param {string | null} name null hides the bar @param {number} [fraction] health left, 0..1 */
  boss(name, fraction = 1) {
    if (this.changed('boss', name)) {
      this.bossBox.classList.toggle('open', !!name);
      if (name) this.bossName.textContent = name;
    }
    const width = Math.max(0, Math.round(fraction * 100));
    if (name && this.changed('bossHp', width)) this.bossFill.style.width = `${width}%`;
  }

  /** A line of context at the bottom of the screen; null hides it. */
  prompt(text) {
    if (!this.changed('prompt', text)) return;
    this.promptBox.classList.toggle('open', !!text);
    if (text) this.promptBox.textContent = text;
  }

  /** The name and description of an item that was just picked up. */
  item(name, desc) {
    this.itemBox.replaceChildren(el('b', null, name), el('span', null, desc));
    this.itemBox.classList.remove('open');
    void this.itemBox.offsetWidth; // restart the CSS animation
    this.itemBox.classList.add('open');
  }

  toast(title, sub) {
    const toast = el('div', 'toast');
    toast.append(el('b', null, title));
    if (sub) toast.append(el('span', null, sub));
    this.toasts.append(toast);
    setTimeout(() => toast.remove(), 5200);
  }

  /** A large title that fades in and out, used when a stage begins. */
  banner(title, sub) {
    this.bannerBox.replaceChildren(el('b', null, title), el('span', null, sub ?? ''));
    this.bannerBox.classList.remove('open');
    void this.bannerBox.offsetWidth;
    this.bannerBox.classList.add('open');
  }

  /** Price tags and other small texts pinned to places in the room. */
  labels(list) {
    this.labelBox.replaceChildren(
      ...list.map(({ x, y, text }) => {
        const label = el('span', 'label', text);
        label.style.left = `${(x / VIEW_W) * 100}%`;
        label.style.top = `${(y / VIEW_H) * 100}%`;
        return label;
      }),
    );
  }

  setFade(alpha) {
    if (this.changed('fade', alpha)) this.fadeBox.style.opacity = alpha;
  }
}
