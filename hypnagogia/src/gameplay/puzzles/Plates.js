// The symbol puzzle: six plates on the floor, three of which must be stepped on in the right order.
// The order is never written down for the player. In a puzzle room it is drawn in chalk across
// three other rooms of the same stage; for the erased door it is the same in every run of a save
// and has to be pieced together from secret rooms over several runs.
import { LAYER, ROOM_CX, ROOM_CY, ROOM_Y } from '../../app/Config.js';
import { PUZZLE_ATTEMPTS } from '../../data/balance.js';

export class Plates {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.sequence = [];
    this.wrongT = 0;
  }

  clear() {
    for (const plate of this.list) plate.sprite.remove();
    this.list.length = 0;
    this.sequence = [];
    this.wrongT = 0;
  }

  build() {
    const { world } = this;
    const room = world.room;
    if (!room.plates) return;
    for (const data of room.plates) {
      const sprite = world.stage.sprite('symbols', `${data.symbol}_plate`);
      sprite.layer = LAYER.decal;
      sprite.x = data.x;
      sprite.y = data.y;
      this.list.push({ data, sprite, lit: false, on: false });
    }
    this.restyle();
  }

  get code() {
    const { world } = this;
    return world.room.type === 'memory' ? world.save.meta.memoryCode : world.run.floor.code;
  }

  get silent() {
    const { puzzle } = this.world.room;
    return puzzle.solved || puzzle.attempts >= PUZZLE_ATTEMPTS;
  }

  restyle() {
    const { puzzle } = this.world.room;
    for (const plate of this.list) {
      const lit = puzzle.solved ? this.code.includes(plate.data.symbol) : plate.lit;
      plate.sprite.play(`${plate.data.symbol}_${lit ? 'lit' : 'plate'}`);
      plate.sprite.alpha = !puzzle.solved && puzzle.attempts >= PUZZLE_ATTEMPTS ? 0.45 : 1;
    }
  }

  solve() {
    const { world } = this;
    const room = world.room;
    room.puzzle.solved = true;
    world.audio.sfx('solve');
    world.renderer.shake(2, 0.3);
    this.restyle();
    if (room.type === 'memory') {
      const door = world.props.find('memory_door');
      door?.sprite.play('memory_open', { restart: true });
      // The first time, the door gives up what it was hiding. Later it holds an ordinary find.
      const first = !world.save.hasMark('first_dream');
      const item = first ? 'first_dream' : world.run.pickItem('treasure');
      if (item) world.loot.spawnPedestal(item, ROOM_CX, ROOM_Y + 96);
      world.mark('first_dream');
    } else {
      const item = world.run.pickItem('treasure');
      if (item) world.loot.spawnPedestal(item, ROOM_CX, ROOM_CY + 2);
      world.loot.drop('shard', ROOM_CX - 50, ROOM_CY + 4);
      world.loot.drop('dust_big', ROOM_CX + 50, ROOM_CY + 4);
      world.mark('puzzle_solved');
    }
    world.saveRun();
  }

  fail() {
    const { world } = this;
    const room = world.room;
    room.puzzle.attempts += 1;
    this.wrongT = 0.7;
    world.audio.sfx('wrong');
    for (const plate of this.list) if (plate.lit) plate.sprite.play('plate_wrong');
    // A wrong answer wakes something up.
    const pool = world.run.stage.enemies;
    world.spawnAmbush([pool[Math.floor(Math.random() * pool.length)], pool[Math.floor(Math.random() * pool.length)]]);
    if (room.puzzle.attempts >= PUZZLE_ATTEMPTS) world.hud.toast('Знаки больше не отзываются.');
    world.saveRun();
  }

  update(dt) {
    if (!this.list.length) return;
    const { world } = this;
    const { player } = world;
    if (this.wrongT > 0) {
      this.wrongT -= dt;
      if (this.wrongT <= 0) {
        for (const plate of this.list) plate.lit = false;
        this.sequence = [];
        this.restyle();
      }
      return;
    }
    if (this.silent || world.locked || player.dead) return;
    for (const plate of this.list) {
      const on = Math.hypot(player.x - plate.data.x, player.y - plate.data.y) < 13;
      const stepped = on && !plate.on;
      plate.on = on;
      if (!stepped || plate.lit) continue;
      plate.lit = true;
      this.sequence.push(plate.data.symbol);
      world.audio.sfx('plate');
      this.restyle();
      if (this.sequence.length === this.code.length) {
        if (this.sequence.every((symbol, i) => symbol === this.code[i])) this.solve();
        else this.fail();
        return;
      }
    }
  }
}
