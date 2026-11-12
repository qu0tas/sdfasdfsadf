// Menus and full-screen messages: title, pause, settings, collection, death and the ending.
// Plain HTML over the canvas. Every button here does something; nothing is a placeholder.
import { icon } from '../app/Assets.js';
import { BOSSES, ENEMIES } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { MARKS } from '../data/unlocks.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const CONTROLS = [
  ['W A S D', 'движение'],
  ['Мышь', 'прицел, левая кнопка — стрельба'],
  ['Стрелки', 'стрельба в четыре стороны'],
  ['Пробел', 'рывок: короткая неуязвимость'],
  ['E', 'поставить чернила: ломают преграды, вскрывают тайники'],
  ['Q', 'активный предмет'],
  ['F', 'взаимодействие'],
  ['Tab', 'карта'],
  ['Esc', 'пауза'],
];

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export class Menus {
  constructor(root, game) {
    this.game = game;
    this.root = el('div', 'menu hidden');
    root.append(this.root);
    this.screen = null;
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  get isOpen() {
    return this.screen !== null;
  }

  close() {
    this.screen = null;
    this.root.classList.add('hidden');
    this.root.replaceChildren();
  }

  /** Replaces the menu with a new panel and focuses its first button. */
  open(screen, className, ...children) {
    this.screen = screen;
    const panel = el('div', `panel ${className}`);
    panel.append(...children.filter(Boolean));
    this.root.replaceChildren(panel);
    this.root.classList.remove('hidden');
    this.root.dataset.screen = screen;
    panel.querySelector('button')?.focus();
  }

  button(text, action, className = '') {
    const button = el('button', className, text);
    button.type = 'button';
    button.addEventListener('click', () => {
      this.game.audio.unlock();
      this.game.audio.sfx('select');
      action();
    });
    return button;
  }

  onKey(e) {
    if (!this.isOpen) return;
    const buttons = [...this.root.querySelectorAll('button, input')];
    const index = buttons.indexOf(document.activeElement);
    const step = { ArrowDown: 1, KeyS: 1, ArrowUp: -1, KeyW: -1 }[e.code];
    if (step && !(document.activeElement instanceof HTMLInputElement && e.code.startsWith('Key'))) {
      buttons[(index + step + buttons.length) % buttons.length]?.focus();
      e.preventDefault();
    }
  }

  // ---------------------------------------------------------------- screens

  title() {
    const { game } = this;
    const { save } = game;
    const logo = el('div', 'logo');
    logo.append(el('h1', null, 'ГИПНАГОГИЯ'), el('p', null, 'Hypnagogia'));
    if (this.complete()) logo.append(icon('items', 'first_dream'));
    const list = el('div', 'buttons');
    if (save.data.run) list.append(this.button('Продолжить сон', () => game.continueRun()));
    list.append(
      this.button('Новый сон', () => game.newRun()),
      this.button('Коллекция', () => this.collection(() => this.title())),
      this.button('Настройки', () => this.settings(() => this.title())),
      this.button('Управление', () => this.controls(() => this.title())),
    );
    const note = save.problem ? el('p', 'warning', save.problem) : null;
    this.open('title', 'title', logo, list, note);
  }

  pause() {
    const { game } = this;
    const list = el('div', 'buttons');
    list.append(
      this.button('Продолжить', () => game.resume()),
      this.button('Коллекция', () => this.collection(() => this.pause())),
      this.button('Настройки', () => this.settings(() => this.pause())),
      this.button('Управление', () => this.controls(() => this.pause())),
      this.button('Выйти в меню', () => game.quitToTitle()),
    );
    this.open('pause', 'narrow', el('h2', null, 'Пауза'), this.buildSummary(), list, el('p', 'hint', 'Сон сохранён в начале этой комнаты.'));
  }

  /** The current build, so the player can check what they carry and which synergies are on. */
  buildSummary() {
    const { run } = this.game;
    if (!run) return null;
    const box = el('div', 'build');
    const held = run.active ? [...run.items, run.active] : run.items;
    if (!held.length) return null;
    const row = el('div', 'build-items');
    for (const id of held) {
      const def = ITEMS.find((item) => item.id === id);
      const cell = icon('items', id);
      cell.title = `${def.name} — ${def.desc}`;
      row.append(cell);
    }
    box.append(row);
    return box;
  }

  controls(back) {
    const table = el('div', 'controls');
    for (const [key, what] of CONTROLS) table.append(el('b', null, key), el('span', null, what));
    this.open('controls', 'narrow', el('h2', null, 'Управление'), table, el('p', 'hint', 'Геймпад: левый стик — движение, правый — стрельба, A — рывок, X — чернила, Y — предмет.'), this.button('Назад', back));
  }

  settings(back) {
    const { game } = this;
    const { settings } = game.save;
    const slider = (label, key) => {
      const row = el('label', 'slider');
      const input = el('input');
      input.type = 'range';
      input.min = '0';
      input.max = '1';
      input.step = '0.05';
      input.value = String(settings[key]);
      input.addEventListener('input', () => {
        settings[key] = Number(input.value);
        game.applySettings();
      });
      input.addEventListener('change', () => {
        game.save.write();
        game.audio.sfx('select');
      });
      row.append(el('span', null, label), input);
      return row;
    };
    const wipe = this.button('Стереть весь прогресс', () => {
      if (wipe.dataset.sure) {
        game.wipeSave();
        return;
      }
      wipe.dataset.sure = '1';
      wipe.textContent = 'Точно стереть? Нажмите ещё раз';
    }, 'danger');
    this.open(
      'settings', 'narrow', el('h2', null, 'Настройки'),
      slider('Общая громкость', 'master'), slider('Музыка', 'music'), slider('Звуки', 'sfx'), slider('Тряска экрана', 'shake'),
      wipe, this.button('Назад', back),
    );
  }

  /** True when everything there is to find has been found. Shown only as a small sprout on the title. */
  complete() {
    const { meta } = this.game.save;
    const creatures = [...Object.keys(ENEMIES), ...Object.keys(BOSSES)];
    return (
      MARKS.every((mark) => meta.marks.includes(mark.id)) &&
      ITEMS.every((item) => meta.itemsSeen.includes(item.id)) &&
      creatures.every((id) => meta.bestiary[id] > 0)
    );
  }

  collection(back, tab = 'items') {
    const { meta } = this.game.save;
    const tabs = el('div', 'tabs');
    for (const [id, name] of [['items', 'Вещи'], ['bestiary', 'Бестиарий'], ['marks', 'Отметки']]) {
      const button = this.button(name, () => this.collection(back, id), id === tab ? 'on' : '');
      tabs.append(button);
    }
    const body = el('div', 'collection');
    const detail = el('p', 'detail', ' ');

    if (tab === 'items') {
      const grid = el('div', 'grid');
      for (const item of ITEMS) {
        const seen = meta.itemsSeen.includes(item.id);
        const cell = el('button', seen ? 'cell' : 'cell unknown');
        cell.type = 'button';
        cell.append(icon('items', item.id));
        const show = () => {
          detail.textContent = seen ? `${item.name} — ${item.desc}` : 'Ещё не найдено.';
        };
        cell.addEventListener('focus', show);
        cell.addEventListener('mouseenter', show);
        grid.append(cell);
      }
      body.append(grid, detail);
    } else if (tab === 'bestiary') {
      const list = el('div', 'list');
      for (const [id, def] of [...Object.entries(ENEMIES), ...Object.entries(BOSSES)]) {
        const kills = meta.bestiary[id] ?? 0;
        const row = el('div', kills ? 'row' : 'row unknown');
        const text = el('div');
        text.append(el('b', null, kills ? def.name : '???'), el('span', null, kills ? def.note : 'Ещё не встречено.'));
        row.append(icon(def.sheet, 'idle'), text, el('i', 'count', kills ? `×${kills}` : ''));
        list.append(row);
      }
      body.append(list);
    } else {
      const list = el('div', 'list');
      for (const mark of MARKS) {
        const done = meta.marks.includes(mark.id);
        const row = el('div', done ? 'row' : 'row unknown');
        const text = el('div');
        text.append(el('b', null, done ? mark.name : '· · ·'), el('span', null, mark.desc));
        row.append(el('i', 'tick', done ? '✦' : '·'), text);
        list.append(row);
      }
      body.append(list, el('p', 'detail', `Снов: ${meta.runs} · Рассыпалось: ${meta.deaths} · Очищено сердец: ${meta.wins} · Кошмаров развеяно: ${meta.kills}`));
    }
    this.open('collection', 'wide', el('h2', null, 'Коллекция'), tabs, body, this.button('Назад', back));
  }

  stats(run) {
    const { stats } = run;
    return el('p', 'stats', `Комнат: ${stats.rooms} · Кошмаров: ${stats.kills} · Вещей: ${run.items.length + (run.active ? 1 : 0)} · Время: ${formatTime(stats.time)}`);
  }

  death(run) {
    const { game } = this;
    const list = el('div', 'buttons');
    list.append(this.button('Новый сон', () => game.newRun()), this.button('В меню', () => game.quitToTitle()));
    this.open(
      'death', 'narrow story', el('h2', null, 'Сон рассыпался'),
      el('p', null, 'Крошка Ноль распадается на свет. Ветвь остаётся неочищенной.'),
      el('p', null, 'Где-то у корней он собирается снова. Он не помнит, что уже был здесь. Древо — помнит.'),
      this.stats(run), list,
    );
  }

  ending(run) {
    const { game } = this;
    const list = el('div', 'buttons');
    list.append(this.button('Начать заново', () => game.newRun()), this.button('В меню', () => game.quitToTitle()));
    this.open(
      'ending', 'story', el('h2', null, 'Сердце очищено'),
      el('p', null, 'Швы расходятся. То, что было сшито из забытых игрушек, снова становится просто снами — тихими, ничьими. Ветвь дышит ровно.'),
      el('p', null, 'Крошка Ноль не радуется. Ему нечем. Он делает то, что делает всегда: стирает ветвь начисто и себя вместе с ней. Иначе страж остаётся в домене и становится его частью. Он это видел.'),
      el('p', null, 'В темноте за ветвью что-то отворачивается. Забвение всё ещё голодно. А у корней собирается из света маленькая круглая тень — и идёт дальше.'),
      this.stats(run), list,
    );
  }

  error(message) {
    this.open('error', 'narrow', el('h2', null, 'Игра не запустилась'), el('pre', 'warning', message), el('p', 'hint', 'Подробности — в консоли браузера (F12).'));
  }
}
