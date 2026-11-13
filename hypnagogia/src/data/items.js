// Item definitions. Reusable data only: what the player currently holds lives in the run state.
//
// An item can influence the game through three separate channels:
//   mods        numeric stat changes: { stat, op: 'add' | 'mul', value }
//   tags        themes counted by synergy rules (see data/tags.js and data/synergies.js)
//   behaviours  ids of unique logic registered in gameplay/items/behaviours.js
// plus two data shortcuts:
//   shot        changes to the projectile (see gameplay/items/Build.js for every field)
//   grant       one-off gifts when picked up: container, heal, blue (half hearts), glass, ink, shards, dust
//
// kind: 'passive' | 'active'. Active items have `charge` (rooms to recharge) and `use` (an id in behaviours.js).
// pools: where the item may appear. unlock: id of the completion mark that adds it to the pools.

export const ITEMS = [
  {
    id: 'warm_milk', name: 'Тёплое молоко', desc: 'Ещё одно сердце. Становится спокойнее.',
    kind: 'passive', rarity: 'common', tags: ['sleep'], pools: ['treasure', 'shop', 'boss'],
    grant: { container: 1, heal: 2 },
  },
  {
    id: 'night_light', name: 'Ночник', desc: 'Выстрелы бьют сильнее.',
    kind: 'passive', rarity: 'common', tags: ['light'], pools: ['treasure', 'shop', 'boss'],
    mods: [{ stat: 'damage', op: 'add', value: 1 }],
  },
  {
    id: 'spring', name: 'Пружинка', desc: 'Стрельба становится чаще.',
    kind: 'passive', rarity: 'common', tags: ['toy'], pools: ['treasure', 'shop', 'boss'],
    mods: [{ stat: 'fireDelay', op: 'mul', value: 0.8 }],
  },
  {
    id: 'old_sneakers', name: 'Старые кеды', desc: 'Быстрее шаг, чаще рывок.',
    kind: 'passive', rarity: 'common', tags: [], pools: ['treasure', 'shop'],
    mods: [{ stat: 'speed', op: 'add', value: 20 }, { stat: 'dashCd', op: 'mul', value: 0.75 }],
  },
  {
    id: 'lullaby', name: 'Колыбельная', desc: 'Выстрелы летят дальше и быстрее.',
    kind: 'passive', rarity: 'common', tags: ['music', 'sleep'], pools: ['treasure', 'shop'],
    mods: [{ stat: 'shotSpeed', op: 'mul', value: 1.2 }, { stat: 'range', op: 'mul', value: 1.3 }],
  },
  {
    id: 'music_box', name: 'Музыкальная шкатулка', desc: 'Выстрелы становятся нотами и летят волной.',
    kind: 'passive', rarity: 'common', tags: ['music', 'toy'], pools: ['treasure', 'boss'],
    mods: [{ stat: 'damage', op: 'add', value: 0.5 }],
    shot: { shape: 'note', wave: 1 },
  },
  {
    id: 'milk_tooth', name: 'Молочный зуб', desc: 'Выстрелы становятся зубами: бьют больно и насквозь, но реже.',
    kind: 'passive', rarity: 'common', tags: ['tooth'], pools: ['treasure', 'boss'],
    mods: [{ stat: 'damage', op: 'mul', value: 1.4 }, { stat: 'fireDelay', op: 'mul', value: 1.2 }],
    shot: { shape: 'tooth', pierce: 1 },
  },
  {
    id: 'soap_bubbles', name: 'Мыльные пузыри', desc: 'Выстрелы становятся пузырями: большие, медленные, долго висят.',
    kind: 'passive', rarity: 'common', tags: ['bubble'], pools: ['treasure', 'boss'],
    mods: [
      { stat: 'damage', op: 'mul', value: 1.25 },
      { stat: 'shotSpeed', op: 'mul', value: 0.8 },
      { stat: 'range', op: 'mul', value: 1.5 },
    ],
    shot: { shape: 'bubble', drag: 1, size: 0.35 },
  },
  {
    id: 'plush_heart', name: 'Плюшевое сердечко', desc: 'Выстрелы становятся мишками и сами ищут цель.',
    kind: 'passive', rarity: 'rare', tags: ['toy'], pools: ['treasure', 'boss'],
    mods: [{ stat: 'damage', op: 'add', value: 0.5 }],
    shot: { shape: 'bear', homing: 1 },
  },
  {
    id: 'glass_marble', name: 'Стеклянный шарик', desc: 'Даёт пустое стеклянное сердце.',
    kind: 'passive', rarity: 'common', tags: ['glass'], pools: ['treasure', 'shop', 'boss'],
    grant: { glass: 1 },
  },
  {
    id: 'mirror_shard', name: 'Осколок зеркала', desc: 'Выстрелы отскакивают от стен.',
    kind: 'passive', rarity: 'common', tags: ['glass'], pools: ['treasure', 'shop'],
    shot: { bounce: 2 },
  },
  {
    id: 'thread_spool', name: 'Катушка ниток', desc: 'Выстрелы прошивают врагов насквозь.',
    kind: 'passive', rarity: 'common', tags: ['thread'], pools: ['treasure', 'shop'],
    shot: { pierce: 2 },
  },
  {
    id: 'inkwell', name: 'Чернильница', desc: 'Три порции чернил. Кляксы становятся шире.',
    kind: 'passive', rarity: 'common', tags: ['ink'], pools: ['treasure', 'shop'],
    mods: [{ stat: 'inkRadius', op: 'mul', value: 1.35 }],
    grant: { ink: 3 },
  },
  {
    id: 'button_eye', name: 'Пуговица-глаз', desc: 'Два выстрела вместо одного, каждый чуть слабее.',
    kind: 'passive', rarity: 'rare', tags: ['thread', 'toy'], pools: ['treasure', 'boss'],
    mods: [{ stat: 'shots', op: 'add', value: 1 }, { stat: 'damage', op: 'mul', value: 0.8 }],
  },
  {
    id: 'rattle', name: 'Погремушка', desc: 'Веер из трёх выстрелов. Каждый слабее.',
    kind: 'passive', rarity: 'rare', tags: ['toy', 'music'], pools: ['treasure', 'boss'],
    mods: [
      { stat: 'shots', op: 'add', value: 2 },
      { stat: 'spread', op: 'add', value: 13 },
      { stat: 'damage', op: 'mul', value: 0.7 },
    ],
  },
  {
    id: 'star_mobile', name: 'Мобиль со звёздами', desc: 'Вокруг кружит звезда и обжигает кошмары.',
    kind: 'passive', rarity: 'rare', tags: ['light', 'sleep'], pools: ['treasure', 'boss'],
    behaviours: ['orbit_star'], unlock: 'roots_cleansed',
  },
  {
    id: 'blanket', name: 'Одеяло', desc: 'Удар отбрасывает всё вокруг. Под одеялом безопаснее.',
    kind: 'passive', rarity: 'common', tags: ['sleep'], pools: ['treasure', 'shop'],
    mods: [{ stat: 'iframes', op: 'mul', value: 1.4 }],
    behaviours: ['blanket'],
  },
  {
    id: 'alarm_clock', name: 'Сломанный будильник', desc: 'В начале боя кошмары ненадолго замирают.',
    kind: 'passive', rarity: 'common', tags: ['toy'], pools: ['treasure', 'shop'],
    behaviours: ['alarm'],
  },
  {
    id: 'piggy_bank', name: 'Копилка', desc: 'Сонной пыли становится больше.',
    kind: 'passive', rarity: 'common', tags: ['toy'], pools: ['treasure', 'shop'],
    mods: [{ stat: 'dustMul', op: 'mul', value: 1.5 }],
    grant: { dust: 5 },
  },
  {
    id: 'pillow', name: 'Подушка', desc: 'Два синих сердца.',
    kind: 'passive', rarity: 'common', tags: ['sleep'], pools: ['treasure', 'shop', 'boss'],
    grant: { blue: 4 },
  },
  {
    id: 'lucky_coin', name: 'Счастливая монетка', desc: 'Находки случаются чаще.',
    kind: 'passive', rarity: 'common', tags: [], pools: ['treasure', 'shop'],
    mods: [{ stat: 'luck', op: 'add', value: 2 }],
  },
  {
    id: 'crayon', name: 'Восковой мелок', desc: 'Выстрелы оставляют за собой жгучий след.',
    kind: 'passive', rarity: 'rare', tags: ['ink'], pools: ['treasure', 'boss'],
    shot: { trail: 'crayon' }, unlock: 'secret_found',
  },
  {
    id: 'paper_plane', name: 'Бумажный самолётик', desc: 'Выстрелы летят дальше и слегка доворачивают к цели.',
    kind: 'passive', rarity: 'common', tags: [], pools: ['treasure', 'shop'],
    mods: [{ stat: 'range', op: 'mul', value: 1.25 }, { stat: 'shotSpeed', op: 'mul', value: 1.15 }],
    shot: { homing: 0.4 },
  },
  {
    id: 'dream_catcher', name: 'Ловец снов', desc: 'Эссенции вдвое больше: стеклянные сердца наполняются быстрее.',
    kind: 'passive', rarity: 'rare', tags: ['sleep', 'thread'], pools: ['treasure', 'boss'],
    mods: [{ stat: 'essenceMul', op: 'mul', value: 2 }], unlock: 'puzzle_solved',
  },
  {
    id: 'spinning_top', name: 'Волчок', desc: 'Активный. Выпускает кольцо выстрелов во все стороны.',
    kind: 'active', rarity: 'common', tags: ['toy'], pools: ['treasure', 'shop'],
    charge: 3, use: 'ring_burst',
  },
  {
    id: 'snow_globe', name: 'Снежный шар', desc: 'Активный. Замораживает всех кошмаров в комнате.',
    kind: 'active', rarity: 'rare', tags: ['glass'], pools: ['treasure', 'shop'],
    charge: 4, use: 'freeze_all', unlock: 'warden_silent',
  },
  {
    id: 'pocket_watch', name: 'Карманные часы', desc: 'Активный. Стирает вражеские снаряды и останавливает мгновение.',
    kind: 'active', rarity: 'rare', tags: [], pools: ['treasure', 'shop'],
    charge: 5, use: 'time_erase', unlock: 'heart_cleansed',
  },
  {
    id: 'first_dream', name: 'Первый сон', desc: 'Росток, с которого всё началось. Он тёплый.',
    kind: 'passive', rarity: 'special', tags: ['memory', 'light', 'sleep'], pools: [],
    mods: [{ stat: 'damage', op: 'add', value: 1 }, { stat: 'fireDelay', op: 'mul', value: 0.85 }],
    grant: { container: 1, heal: 12 },
  },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((item) => [item.id, item]));
