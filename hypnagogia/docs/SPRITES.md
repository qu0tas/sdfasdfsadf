# Спрайты: как заменить и как сгенерировать

## Как игра читает спрайты

Каждый лист спрайтов — это пара файлов в `assets/sheets/`: картинка `имя.png` и описание `имя.json`.

- Картинка — сетка одинаковых ячеек. Одна строка — одна анимация, кадры идут слева направо.
- В JSON указаны размер ячейки (`cellW`, `cellH`), размер всей картинки (`width`, `height`) и для каждой анимации номер строки, число кадров, скорость и зацикленность.
- Поле `scale` говорит, сколько пикселей экрана игры занимает один пиксель листа. У нарисованных скриптами листов это 2, у Крошки Ноля — 1. Новые детальные спрайты делайте с `scale: 1`.
- Фон прозрачный. Ноги существа стоят на 3 пикселя выше нижнего края ячейки, существо смотрит вправо.

Чтобы заменить врага, положите свои `blob.png` и `blob.json` на место старых. Имена анимаций менять нельзя: игра проверяет их при запуске и прямо на экране напишет, чего не хватает. Команда `npm run art` перерисовывает все листы скриптами и затрёт ручные замены, поэтому после замены уберите соответствующий лист из скриптов в `tools/art/`.

Клетка комнаты — 32 пикселя экрана игры. Ориентиры по размеру при `scale: 1`:

| Что | Ячейка | Само существо |
| --- | --- | --- |
| Крошка Ноль | 48 × 48 | около 40 в ширину |
| Обычный враг | 48 × 48 | 28–36 в ширину |
| Мини-босс | 96 × 96 | около 56 |
| Босс | 128 × 128 | 90–110 |
| Снаряд | 32 × 32 | 10–20 |
| Предмет, находка | 32 × 32 | 20–28 |
| Плитка пола или стены | 32 × 32 | вся ячейка |

Анимации, которые нужны каждому обычному врагу: `idle` (4 кадра), `move` (4), `attack` (4, на третьем кадре атака срабатывает), `hit` (2), `death` (6). Полный список по всем листам — в `src/data/assets.js`.

## Крошка Ноль

Он не рисуется вручную. Скрипт `tools/art/char-zero.mjs` вырезает его из `tools/art/reference/zero-concept.png` и собирает кадры из частей этой картинки. Чтобы обновить героя, замените картинку и выполните `npm run art`. Требования к ней: PNG, тёмный замкнутый контур вокруг персонажа, фон светлее контура.

## Какой нейросетью генерировать

Модели для картинок быстро меняются, поэтому важнее не название, а три возможности:

1. **Работа по образцу.** Модель должна принимать картинку-референс. Прикладывайте концепт Крошки Ноля к каждому запросу — так стиль останется общим.
2. **Прозрачный фон** или хотя бы ровный одноцветный, который легко убрать.
3. **Несколько кадров одного персонажа** в одной картинке без изменения его облика.

Концепт героя сделан в генераторе изображений ChatGPT; он умеет первое и второе, и продолжать в нём — самый простой путь к единому стилю. Для анимаций по кадрам удобнее специализированные сервисы для пиксель-арта, например PixelLab или Retro Diffusion: они выдают настоящую пиксельную сетку и умеют делать листы кадров. Проверьте, что они сейчас предлагают, — я не могу подтвердить их текущие возможности и цены.

Любая «пиксельная» картинка от обычной модели на деле большая и размытая на стыках пикселей. Перед вставкой в игру её нужно уменьшить до настоящего размера. Для одиночной фигуры это делает функция `cutOut` в `tools/art/png-read.mjs` — так получен герой. Кадры анимации надёжнее доводить вручную в редакторе пиксель-арта (Aseprite, бесплатные LibreSprite или Piskel).

## Запросы

Общая часть, которую стоит добавлять к каждому запросу (вместе с картинкой героя):

```
Pixel art sprite for a 2D top-down roguelike, same style as the attached reference character:
thick dark outline, soft 2–3 tone shading with light from the upper left and a heavier dark rim
underneath, rounded simple silhouette, muted grey-blue and dusty purple palette with small pale
cyan glows, cute but melancholic and slightly unsettling, dreamcore mood. Seen from above and
slightly from the front, like enemies in The Binding of Isaac. Clean pixel grid, no anti-aliasing,
no gradients, no text, transparent background.
```

Дальше — описание существа и кадров. Примеры:

```
A forgotten teddy bear enemy: faded sand-brown plush, one button eye missing with a thread X in
its place, a torn seam on the tummy with stuffing showing. 34 px wide inside a 48x48 cell.
Sprite sheet, 5 rows, every cell 48x48, same character in every frame:
row 1 idle, 4 frames, slow breathing;
row 2 walk, 4 frames, a heavy waddle;
row 3 attack, 4 frames: raises both arms, the tummy seam opens, throws a clump of stuffing on frame 3;
row 4 hit, 2 frames, flinches;
row 5 death, 6 frames, falls apart into pale motes of light.
```

```
A lost balloon enemy: a faded rose balloon with a sad hollow face and a dangling string, floating.
Sheet rows: idle 4 frames (bobbing, string swaying), move 4 frames, attack 4 frames (swells larger
and larger, about to burst), hit 2 frames, death 6 frames (pops into scraps).
```

```
Boss, 128x128 cells: the Heart of Childhood Toys — a large patchwork plush heart sewn from pieces
of many toys (a teddy ear, a button, a wooden block with a letter, a ribbon), stitched seams, a
small glowing pale-cyan core visible through a torn seam. Rows: idle 4 frames (slow heartbeat),
beat 4 frames (one hard pulse), open 5 frames (the seam tears wider and the core shows),
hit 2 frames, death 10 frames (seams burst one by one, the core rises as light and fades).
```

```
Floor and wall tiles for one room, each tile 32x32, seamless: the inside of the roots of a giant
tree. A calm, low-contrast dark grey-blue earth floor (4 variants), walls of woven roots with tiny
cyan glints for the top, bottom, left and right sides and four corners, a knotted root stump as an
obstacle, the same stump cracked, and flat rubble.
```

Описания остальных существ для таких запросов есть в `src/data/enemies.js`: поля `note` и `attack`.
