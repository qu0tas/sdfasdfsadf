// Run structure: the stages along the Tree and the variants a stage rift can lead to.
// The order below is a proposal for the first playable slice (see README, "Открытые вопросы").
export const STAGES = [
  {
    id: 'roots', name: 'Корни Древа', tiles: 'tiles_roots',
    rooms: 6, budget: 3.2, enemies: ['blob', 'spider', 'eye', 'sprout'],
    special: ['treasure', 'shop', 'puzzle', 'elite'], boss: 'clump', lockTreasure: false,
  },
  {
    id: 'toys', name: 'Детская', tiles: 'tiles_toys',
    rooms: 8, budget: 4.6, enemies: ['windup', 'teddy', 'spider', 'balloon', 'tv', 'eye'],
    special: ['treasure', 'shop', 'puzzle', 'event', 'miniboss'], miniboss: 'jack', boss: 'warden', lockTreasure: true,
  },
  {
    id: 'heart', name: 'Сердце домена', tiles: 'tiles_heart',
    rooms: 6, budget: 5.8, enemies: ['windup', 'teddy', 'balloon', 'tv', 'blob', 'spider'],
    special: ['treasure', 'shop', 'event', 'memory', 'elite'], boss: 'toyheart', lockTreasure: true,
  },
];

/** What kind of dream waits behind a stage rift. `hint` is shown for a steady rift; an unstable one hides it. */
export const VARIANTS = {
  plain: { name: 'Ровный сон', hint: 'Сон как сон.', weight: 0 },
  calm: {
    name: 'Тихий сон', hint: 'Кошмаров меньше. Находок тоже.', weight: 3,
    enemyMul: 0.75, dropMul: 0.6,
  },
  restless: {
    name: 'Тревожный сон', hint: 'Кошмары сильнее. Есть ещё одна сокровищница.', weight: 3,
    enemyMul: 1.25, eliteChance: 0.3, extra: ['treasure'],
  },
  generous: {
    name: 'Щедрый сон', hint: 'Больше пыли и лишняя лавка.', weight: 2,
    dustMul: 1.6, extra: ['shop'],
  },
  deep: {
    name: 'Глубокий сон', hint: 'Длинный путь. Тот, кто дойдёт, найдёт больше.', weight: 1,
    extraRooms: 3, extra: ['treasure', 'event'],
  },
};
