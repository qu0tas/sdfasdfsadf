// Synergy rules. A rule turns on when the player's build satisfies `requires`:
//   tags:  { tagId: minimumCount }   counted over all held items
//   items: [itemId, ...]             every listed item must be held
// Its `effect` uses the same `mods` / `shot` / `behaviours` fields as an item (see data/items.js).
export const SYNERGIES = [
  {
    id: 'singing_bubbles', name: 'Поющие пузыри', desc: 'Выстрелы, угасая, рассыпаются нотами.',
    requires: { tags: { music: 1, bubble: 1 } },
    effect: { shot: { burstOnEnd: { count: 4, shape: 'note', damageMul: 0.5 } } },
  },
  {
    id: 'biting_bear', name: 'Кусачий мишка', desc: 'При попадании из выстрела вылетают два зуба.',
    requires: { tags: { tooth: 1 }, items: ['plush_heart'] },
    effect: { shot: { splitOnHit: { count: 2, shape: 'tooth', damageMul: 0.5 } } },
  },
  {
    id: 'kaleidoscope', name: 'Калейдоскоп', desc: 'Отскочив от стены, выстрел раздваивается.',
    requires: { tags: { glass: 2 } },
    effect: { shot: { splitOnBounce: true, bounce: 1 } },
  },
  {
    id: 'ink_thread', name: 'Чернильная нить', desc: 'Выстрелы тянут за собой вязкие чернила.',
    requires: { tags: { ink: 1, thread: 1 } },
    effect: { shot: { trail: 'ink' } },
  },
  {
    id: 'duet', name: 'Дуэт', desc: 'Каждый четвёртый выстрел — громкий аккорд.',
    requires: { tags: { music: 2 } },
    effect: { shot: { chordEvery: 4 } },
  },
  {
    id: 'night_watch', name: 'Ночной дозор', desc: 'Свет в тишине бьёт сильнее и дальше.',
    requires: { tags: { light: 1, sleep: 2 } },
    effect: { mods: [{ stat: 'damage', op: 'add', value: 1 }, { stat: 'range', op: 'mul', value: 1.2 }] },
  },
  {
    id: 'toy_box', name: 'Ящик с игрушками', desc: 'Стрельба чаще, выстрелы отталкивают сильнее.',
    requires: { tags: { toy: 3 } },
    effect: { mods: [{ stat: 'fireDelay', op: 'mul', value: 0.85 }], shot: { knock: 1 } },
  },
];
