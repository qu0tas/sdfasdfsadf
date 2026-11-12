// Everything the game remembers between sessions, kept in the browser's localStorage:
// settings, permanent progress ("meta") and the run in progress.
import { ITEM_BY_ID } from '../data/items.js';
import { SYMBOLS } from '../data/symbols.js';
import { MARKS } from '../data/unlocks.js';

const KEY = 'hypnagogia.save';
const VERSION = 1;

const DEFAULT_SETTINGS = { master: 0.8, music: 0.6, sfx: 0.8, shake: 1 };

function freshMeta() {
  // The code of the erased door is rolled once per save file, so what a player learns stays true.
  const pool = [...SYMBOLS];
  const memoryCode = [];
  for (let i = 0; i < 3; i++) memoryCode.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return { runs: 0, deaths: 0, wins: 0, kills: 0, itemsSeen: [], bestiary: {}, marks: [], memoryCode };
}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const strings = (list, allowed) => (Array.isArray(list) ? [...new Set(list.filter((v) => typeof v === 'string' && allowed(v)))] : []);

/** Rebuilds a save from untrusted data, keeping every valid part and replacing the rest with defaults. */
function sanitize(raw) {
  const data = { version: VERSION, settings: { ...DEFAULT_SETTINGS }, meta: freshMeta(), run: null };
  if (!raw || typeof raw !== 'object') return data;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (isNumber(raw.settings?.[key])) data.settings[key] = Math.max(0, Math.min(1, raw.settings[key]));
  }
  const meta = raw.meta ?? {};
  for (const key of ['runs', 'deaths', 'wins', 'kills']) if (isNumber(meta[key]) && meta[key] >= 0) data.meta[key] = Math.floor(meta[key]);
  data.meta.itemsSeen = strings(meta.itemsSeen, (id) => id in ITEM_BY_ID);
  data.meta.marks = strings(meta.marks, (id) => MARKS.some((mark) => mark.id === id));
  if (meta.bestiary && typeof meta.bestiary === 'object') {
    for (const [id, count] of Object.entries(meta.bestiary)) if (isNumber(count) && count > 0) data.meta.bestiary[id] = Math.floor(count);
  }
  const code = strings(meta.memoryCode, (id) => SYMBOLS.includes(id));
  if (code.length === 3) data.meta.memoryCode = code;
  // The run is checked more closely by Run.restore(), which refuses anything it cannot rebuild.
  if (raw.run && typeof raw.run === 'object' && raw.run.version === VERSION) data.run = raw.run;
  return data;
}

export class Save {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.problem = null; // a message for the player when the old save could not be read
    this.data = this.load();
  }

  load() {
    let text = null;
    try {
      text = this.storage?.getItem(KEY) ?? null;
    } catch (error) {
      this.problem = 'Браузер не разрешает хранить сохранения. Прогресс не будет записан.';
      console.warn('Save storage is unavailable', error);
      return sanitize(null);
    }
    if (text === null) return sanitize(null);
    try {
      const raw = JSON.parse(text);
      if (raw?.version !== VERSION) throw new Error(`unsupported save version ${raw?.version}`);
      return sanitize(raw);
    } catch (error) {
      // Never overwrite a save we could not read: keep a copy beside the new one.
      console.error('The save could not be read; keeping a backup copy', error);
      try {
        this.storage.setItem(`${KEY}.backup-${Date.now()}`, text);
      } catch (backupError) {
        console.error('Could not back up the unreadable save', backupError);
      }
      this.problem = 'Сохранение повреждено. Его копия оставлена в браузере, игра начата заново.';
      return sanitize(null);
    }
  }

  write() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('Could not write the save', error);
    }
  }

  get settings() {
    return this.data.settings;
  }

  get meta() {
    return this.data.meta;
  }

  hasMark(id) {
    return this.data.meta.marks.includes(id);
  }

  /** @returns {boolean} true when the mark is new */
  addMark(id) {
    if (this.hasMark(id)) return false;
    this.data.meta.marks.push(id);
    this.write();
    return true;
  }

  seeItem(id) {
    if (!this.data.meta.itemsSeen.includes(id)) this.data.meta.itemsSeen.push(id);
  }

  countKill(id) {
    this.data.meta.kills += 1;
    this.data.meta.bestiary[id] = (this.data.meta.bestiary[id] ?? 0) + 1;
  }

  setRun(snapshot) {
    this.data.run = snapshot;
    this.write();
  }

  resetAll() {
    this.data = sanitize(null);
    this.write();
  }
}
