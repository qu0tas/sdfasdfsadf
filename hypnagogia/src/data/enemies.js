// Enemy and boss definitions. `ai` names a routine in gameplay/enemies/ai.js (or bosses/bossAi.js).
// hp is in the same units as the player's shot damage; `cost` is the price in a room's encounter budget.
// `attack` is the enemy's signature move in plain words; it is shown in the bestiary.
// Optional: flying (ignores blocks), rooted (cannot be pushed), scale (drawing size multiplier).
export const ENEMIES = {
  blob: {
    name: 'Клякса памяти', note: 'То, что осталось от сна, который никто не досмотрел.',
    attack: 'Оставляет липкий след. Развеянная, распадается на две капли.',
    sheet: 'blob', ai: 'oozer', hp: 10, speed: 48, radius: 13, cost: 1.5, essence: 1,
  },
  blobling: {
    name: 'Капля памяти', note: 'Обрывок обрывка.',
    attack: 'Просто бежит к тебе.',
    sheet: 'blob', ai: 'chaser', hp: 3, speed: 82, radius: 7, scale: 0.5, cost: 0.5, essence: 0,
  },
  spider: {
    name: 'Пуговичный паук', note: 'Пуговица помнит, что держала что-то вместе. Не помнит — что.',
    attack: 'Прыгает через всю комнату в отмеченное место.',
    sheet: 'spider', ai: 'leaper', hp: 7, speed: 0, radius: 11, cost: 1, essence: 1,
  },
  eye: {
    name: 'Парящий глаз', note: 'Смотрел сон слишком долго и остался в нём.',
    attack: 'Наводит тонкую линию и бьёт лучом. За преградой луч не достанет.',
    sheet: 'eye', ai: 'gazer', hp: 8, speed: 56, radius: 13, cost: 1.5, essence: 1, flying: true,
  },
  sprout: {
    name: 'Корневой росток', note: 'Корень, который тянется не к свету.',
    attack: 'Пускает по полу дорожку корней, затем уходит под землю.',
    sheet: 'sprout', ai: 'rooter', hp: 11, speed: 0, radius: 12, cost: 1.5, essence: 1, rooted: true,
  },
  windup: {
    name: 'Заводная мышь', note: 'Её завели и забыли. Она всё ещё бежит.',
    attack: 'Заводится и несётся по прямой, пока не врежется.',
    sheet: 'windup', ai: 'charger', hp: 12, speed: 55, radius: 12, cost: 1.5, essence: 1,
  },
  balloon: {
    name: 'Потерянный шарик', note: 'Его отпустили. Он не понял, почему.',
    attack: 'Подлетает, раздувается и лопается. Лопни его раньше — и он безвреден.',
    sheet: 'balloon', ai: 'popper', hp: 6, speed: 62, radius: 13, cost: 1, essence: 1, flying: true,
  },
  teddy: {
    name: 'Забытый мишка', note: 'Когда-то его обнимали каждую ночь.',
    attack: 'Швыряет ком набивки навесом. Там, где он упадёт, набивка разлетится.',
    sheet: 'teddy', ai: 'lobber', hp: 22, speed: 40, radius: 15, cost: 2.5, essence: 2,
  },
  tv: {
    name: 'Старый телевизор', note: 'Показывает сны, которые уже никто не вспомнит.',
    attack: 'Раскручивает вокруг себя крест из помех.',
    sheet: 'tv', ai: 'broadcaster', hp: 16, speed: 10, radius: 15, cost: 2, essence: 2,
  },
};

export const BOSSES = {
  jack: {
    name: 'Чёртик из табакерки', note: 'Он ждал, что крышку откроют. Дождался не тех.',
    attack: 'Скачет с закрытой крышкой, потом выскакивает и сыплет кольцами.',
    sheet: 'jack', ai: 'jack', hp: 120, speed: 85, radius: 24, essence: 6, tier: 'miniboss',
  },
  clump: {
    name: 'Ком Забытого', note: 'Сны, сросшиеся в корнях, когда их перестали различать.',
    attack: 'Катится следом, бьёт об пол, плюётся и роняет кляксы.',
    sheet: 'clump', ai: 'clump', hp: 230, speed: 44, radius: 38, essence: 10, tier: 'boss',
  },
  warden: {
    name: 'Малый Страж «Заводной»', note: 'Он был стражем. Он остался в детской слишком надолго. Его нельзя вернуть.',
    attack: 'Заводит ключ, бросается через комнату и мечет шестерёнки.',
    sheet: 'warden', ai: 'warden', hp: 380, speed: 62, radius: 28, essence: 12, tier: 'boss',
  },
  toyheart: {
    name: 'Сердце Детских Игрушек', note: 'Всё, что любили и оставили, сшитое в одно.',
    attack: 'Бьётся кольцами набивки, рвётся по шву, роняет игрушки и зовёт потерянных.',
    sheet: 'toyheart', ai: 'toyheart', hp: 540, speed: 0, radius: 40, essence: 14, tier: 'boss',
  },
};

/** Looks up a regular enemy or a boss by id. */
export const creatureDef = (id) => ENEMIES[id] ?? BOSSES[id];
