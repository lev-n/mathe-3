import type { Rng, SkillDef } from '../../core/types';
import { layoutMul } from '../../core/written';
import { targetAb } from '../shared';
import { attempt, randLen, writtenItem } from './common';
import { detektivItem, plantable, type Planted } from './detektiv';
import { malLueckeItem, passtItem, spalteItem } from './formen';

const SKILL = { id: 'schriftlich.multiplizieren', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich-mal'];
const METHOD = 'abziehen';

function pair(rng: Rng, len: number, carries: number): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, len);
      const m = rng.int(2, 9);
      const lay = layoutMul(a, m);
      // no Übertrag at all, also none to the front; otherwise the Überträge between the columns count
      const fits = carries === 0 ? lay.carries.every((c) => c === 0) : lay.carryCount === carries;
      return a * m <= 1000 && fits ? [a, m] : null;
    },
    len === 2 ? [23, 3] : carries === 1 ? [234, 3] : [168, 3],
  );
}

/**
 * 2 digits, no Übertrag: the second factor from this range. Up to mal 4 only: from mal 5 on just 10 and 11 stay without a Übertrag, and 10 · 9 asks
 * less than 33 · 3. Mal 3 and 4 leave out 10 and 11 for the same reason.
 */
function noCarry(rng: Rng, low: number, high: number): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, 2);
      const m = rng.int(low, high);
      if (m > 2 && a < 12) return null;
      return layoutMul(a, m).carries.every((c) => c === 0) ? [a, m] : null;
    },
    high === 2 ? [23, 2] : low === 2 ? [23, 3] : [12, 4],
  );
}

/** 3 digits, one Übertrag, out of this place: 0 is 214 · 3, 1 is 162 · 3. */
function oneCarryAt(rng: Rng, place: 0 | 1): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, m] = pair(rng, 3, 1);
      return layoutMul(a, m).carries[place + 1] > 0 ? [a, m] : null;
    },
    place === 0 ? [214, 3] : [162, 3],
  );
}

function plant(rng: Rng): Planted {
  return attempt<Planted>(
    () => {
      const operands = rng.chance(0.5) ? pair(rng, 3, 2) : pair(rng, 3, 1);
      const options = plantable('mul', operands, METHOD);
      return options.length ? rng.pick(options) : null;
    },
    plantable('mul', [234, 3], METHOD)[0],
  );
}

export const multiplizierenSkill: SkillDef = {
  ...SKILL,
  title: 'Mal schriftlich',
  description: 'Du rechnest eine große Zahl mal eine kleine Zahl.',
  stufen: {
    1: 'Zahl mit 2 Ziffern, ohne Übertrag',
    2: 'Zahl mit 3 Ziffern, ein Übertrag',
    3: '2 Überträge und Fehlerdetektiv',
  },
  kmk: KMK,
  optional: 'extra',
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const item = (operands: [number, number]) => writtenItem(SKILL, stufe, { ab, op: 'mul', operands, method: METHOD, kmk: KMK });
    if (stufe === 1) {
      // mal 2, then mal 3 or 4, then the task to a given result or the missing second factor
      if (ab === 1) return item(noCarry(rng, 2, 2));
      if (ab === 2) return item(noCarry(rng, 3, 4));
      if (rng.chance(0.5)) {
        const [a, m] = noCarry(rng, 2, 4);
        return malLueckeItem(SKILL, stufe, ab, a, m, KMK);
      }
      return passtItem(SKILL, stufe, ab, rng, { op: 'mul', make: () => noCarry(rng, 2, 4), valid: ([a, m]) => a >= 10 && a < 100 && layoutMul(a, m).carries.every((c) => c === 0), method: METHOD, kmk: KMK });
    }
    if (stufe === 2) {
      // the Übertrag at the Einer, then at the Zehner, then the column with the Übertrag or the missing second factor
      if (ab === 1) return item(oneCarryAt(rng, 0));
      if (ab === 2) return item(oneCarryAt(rng, 1));
      const [a, m] = pair(rng, 3, 1);
      return rng.chance(0.5) ? spalteItem(SKILL, stufe, ab, rng, 'mul', [a, m], METHOD, KMK) : malLueckeItem(SKILL, stufe, ab, a, m, KMK);
    }
    // 2 Überträge, then where the mistake is or calculating again, then what the mistake was
    if (ab === 1) return item(pair(rng, 3, 2));
    return detektivItem(SKILL, stufe, ab, rng, plant(rng), [...KMK, 'ZO.kontrolle', 'PK.argumentieren'], ab === 2 ? ['wo', 'neu'] : ['warum']);
  },
};
