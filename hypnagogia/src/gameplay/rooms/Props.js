// Room furniture: the merchant, the dream well, the mirror, clocks and drawings.
// Some of it only sets the mood; the well and the mirror answer to the interact key.
import { LAYER, ROOM_CY } from '../../app/Config.js';
import { PLAYER } from '../../data/balance.js';

const WELL_COST = 3;
const WELL_USES = 6;
/** What the well may give back, with weights. */
const WELL = [
  [null, 5], ['heart_half', 3], ['shard', 2], ['ink', 2], ['dust_big', 2], ['heart_blue', 1.5], ['item', 0.7],
];

export class Props {
  constructor(world) {
    this.world = world;
    this.list = [];
  }

  clear() {
    for (const prop of this.list) prop.sprite.remove();
    this.list.length = 0;
  }

  build() {
    const { world } = this;
    for (const data of world.room.props) {
      const sheet = data.kind === 'merchant' ? 'merchant' : 'props';
      const sprite = world.stage.sprite(sheet, data.kind === 'merchant' ? 'idle' : data.kind);
      sprite.x = data.x;
      sprite.y = data.y;
      // Flat things lie on the floor; standing things are sorted with the characters.
      const flat = data.kind === 'drawing' || data.kind === 'clock' || data.kind === 'memory_door';
      sprite.layer = flat ? LAYER.decal : LAYER.ents;
      sprite.sortBias = 8;
      if (data.kind === 'memory_door' && world.room.puzzle?.solved) sprite.still('memory_open', 99);
      this.list.push({ data, sprite });
    }
  }

  find(kind) {
    return this.list.find((prop) => prop.data.kind === kind);
  }

  /** The merchant acknowledges a purchase. */
  nod() {
    const merchant = this.find('merchant');
    merchant?.sprite.play('nod', { restart: true, then: () => merchant.sprite.play('idle') });
  }

  useWell(prop) {
    const { world } = this;
    const { run } = world;
    if (run.dust < WELL_COST) {
      world.audio.sfx('deny');
      return;
    }
    run.dust -= WELL_COST;
    prop.data.used += 1;
    world.audio.sfx('buy');
    world.fx.spawn('sparkle', prop.data.x, prop.data.y - 6);
    const luck = run.build.stats.luck;
    const total = WELL.reduce((sum, [kind, weight]) => sum + (kind ? weight * (1 + luck * 0.15) : weight), 0);
    let roll = Math.random() * total;
    let result = null;
    for (const [kind, weight] of WELL) {
      roll -= kind ? weight * (1 + luck * 0.15) : weight;
      if (roll < 0) {
        result = kind;
        break;
      }
    }
    if (result === 'item') {
      const item = run.pickItem('treasure');
      if (item) world.loot.spawnPedestal(item, prop.data.x, prop.data.y + 44);
      else result = 'dust_big';
    }
    if (result && result !== 'item') world.loot.drop(result, prop.data.x, prop.data.y + 22);
    world.hud.toast(result ? 'Колодец что-то вернул.' : 'Пыль ушла на дно. Тихо.');
    world.saveRun();
  }

  useMirror(prop) {
    const { world } = this;
    const { run } = world;
    const { health } = run;
    health.redMax -= 2;
    health.red = Math.min(health.red, health.redMax);
    health.glass += 1;
    health.glassFilled += 1;
    prop.data.used = 1;
    world.audio.sfx('glass');
    world.fx.spawn('shatter', world.player.x, world.player.y - 4);
    const item = run.pickItem('treasure');
    if (item) world.loot.spawnPedestal(item, prop.data.x, Math.min(prop.data.y + 46, ROOM_CY + 70));
    world.hud.toast('Отражение взяло сердце и оставило стекло.');
    world.saveRun();
  }

  update(dt) {
    const { world } = this;
    const { player, input, run } = world;
    for (const prop of this.list) {
      prop.sprite.update(dt);
      const { data } = prop;
      if (player.dead || world.locked) continue;
      const near = Math.hypot(player.x - data.x, player.y - (data.y + 8)) < 30;
      if (!near) continue;
      if (data.kind === 'well') {
        if (data.used >= WELL_USES) {
          world.prompt('Колодец пуст.');
        } else {
          world.prompt(`F — бросить ${WELL_COST} сонной пыли в колодец`);
          if (input.take('interact')) this.useWell(prop);
        }
      } else if (data.kind === 'mirror') {
        if (data.used) {
          world.prompt('В зеркале никого нет.');
        } else if (run.health.redMax <= 2 || run.health.slots > PLAYER.maxHearts) {
          world.prompt('Отражению нечего у тебя взять.');
        } else {
          world.prompt('F — отдать красное сердце. Взамен: полное стеклянное сердце и вещь');
          if (input.take('interact')) this.useMirror(prop);
        }
      }
    }
  }
}
