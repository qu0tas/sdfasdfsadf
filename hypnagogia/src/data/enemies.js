// Enemy and boss definitions. `ai` names a routine in gameplay/enemies/ai.js (or bosses/bossAi.js).
// hp is in the same units as the player's shot damage; `cost` is the price in a room's encounter budget.
export const ENEMIES = {
  blob: {
    name: 'Клякса памяти', note: 'То, что осталось от сна, который никто не досмотрел.',
    sheet: 'blob', ai: 'chaser', hp: 10, speed: 36, radius: 7, cost: 1, essence: 1,
  },
  spider: {
    name: 'Пуговичный паук', note: 'Пуговица помнит, что держала что-то вместе. Не помнит — что.',
    sheet: 'spider', ai: 'hopper', hp: 7, speed: 150, radius: 6, cost: 1, essence: 1,
  },
  eye: {
    name: 'Парящий глаз', note: 'Смотрел сон слишком долго и остался в нём.',
    sheet: 'eye', ai: 'shooter', hp: 8, speed: 42, radius: 7, cost: 1.5, essence: 1, flying: true,
  },
  sprout: {
    name: 'Корневой росток', note: 'Корень, который тянется не к свету.',
    sheet: 'sprout', ai: 'burrower', hp: 11, speed: 0, radius: 7, cost: 1.5, essence: 1,
  },
  windup: {
    name: 'Заводная мышь', note: 'Её завели и забыли. Она всё ещё бежит.',
    sheet: 'windup', ai: 'charger', hp: 12, speed: 40, radius: 7, cost: 1.5, essence: 1,
  },
  balloon: {
    name: 'Потерянный шарик', note: 'Его отпустили. Он не понял, почему.',
    sheet: 'balloon', ai: 'drifter', hp: 6, speed: 30, radius: 7, cost: 1, essence: 1, flying: true,
  },
  teddy: {
    name: 'Забытый мишка', note: 'Когда-то его обнимали каждую ночь.',
    sheet: 'teddy', ai: 'lobber', hp: 22, speed: 28, radius: 8, cost: 2.5, essence: 2,
  },
  tv: {
    name: 'Старый телевизор', note: 'Показывает сны, которые уже никто не вспомнит.',
    sheet: 'tv', ai: 'turret', hp: 16, speed: 8, radius: 8, cost: 2, essence: 2,
  },
};

export const BOSSES = {
  jack: {
    name: 'Чёртик из табакерки', note: 'Он ждал, что крышку откроют. Дождался не тех.',
    sheet: 'jack', ai: 'jack', hp: 120, speed: 60, radius: 14, essence: 6, tier: 'miniboss',
  },
  clump: {
    name: 'Ком Забытого', note: 'Сны, сросшиеся в корнях, когда их перестали различать.',
    sheet: 'clump', ai: 'clump', hp: 230, speed: 30, radius: 22, essence: 10, tier: 'boss',
  },
  warden: {
    name: 'Малый Страж «Заводной»', note: 'Он был стражем. Он остался в детской слишком надолго. Его нельзя вернуть.',
    sheet: 'warden', ai: 'warden', hp: 380, speed: 44, radius: 15, essence: 12, tier: 'boss',
  },
  toyheart: {
    name: 'Сердце Детских Игрушек', note: 'Всё, что любили и оставили, сшитое в одно.',
    sheet: 'toyheart', ai: 'toyheart', hp: 540, speed: 0, radius: 22, essence: 14, tier: 'boss',
  },
};

/** Looks up a regular enemy or a boss by id. */
export const creatureDef = (id) => ENEMIES[id] ?? BOSSES[id];
