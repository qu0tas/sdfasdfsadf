/** Small seeded random generator (mulberry32). The whole state is one 32-bit integer, so it saves trivially. */
export class Rng {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max], both inclusive. */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /** Picks an entry with probability proportional to `weight(entry)`. */
  weighted(list, weight) {
    const total = list.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
    if (total <= 0) return list.length ? this.pick(list) : undefined;
    let roll = this.next() * total;
    for (const item of list) {
      roll -= Math.max(0, weight(item));
      if (roll < 0) return item;
    }
    return list[list.length - 1];
  }

  shuffle(list) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** A fresh 32-bit seed for a child generator. */
  seed() {
    return Math.floor(this.next() * 4294967296) >>> 0;
  }
}

export const randomSeed = () => (Math.floor(Math.random() * 4294967296) ^ Date.now()) >>> 0;
