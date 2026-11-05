import type { Rng, SkillDef } from '../../core/types';
import { digitAt, numLength } from '../../core/written';
import { targetAb } from '../shared';
import { attempt, carryCount, writtenItem } from './common';
import { passtItem } from './formen';
import { lueckeItem } from './luecke';

const SKILL = { id: 'schriftlich.addieren', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich'];

/** Digits of two numbers, column by column, that stay below 10 together. Places beyond `lenB` belong to the first number only. */
export function noCarryPair(rng: Rng, lenA: number, lenB: number, allowZero = false): [number, number] {
  let a = 0;
  let b = 0;
  for (let p = 0; p < lenA; p++) {
    const first = p === lenA - 1;
    const low = !allowZero || first ? 1 : 0;
    if (p < lenB) {
      const lowB = !allowZero || p === lenB - 1 ? 1 : 0;
      const da = rng.int(low, 8);
      const db = rng.int(lowB, Math.max(lowB, 9 - da));
      a += da * 10 ** p;
      b += db * 10 ** p;
    } else {
      a += rng.int(low, 9) * 10 ** p;
    }
  }
  return [a, b];
}

/** One of two numbers has a 0 in a column that both reach. */
const zeroColumn = ([a, b]: readonly number[]) => [0, 1].some((p) => p < numLength(b) && (digitAt(a, p) === 0) !== (digitAt(b, p) === 0));

/** A pair with a zero in one column: 305 + 42, 360 + 29. */
function zeroPair(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, b] = noCarryPair(rng, 3, rng.chance(0.5) ? 3 : 2, true);
      return zeroColumn([a, b]) && carryCount([a, b]) === 0 ? [a, b] : null;
    },
    [360, 29],
  );
}

/** Three numbers without a Übertrag: `lengths` are the choices of their digit counts. */
function threeNumbers(rng: Rng, lengths: readonly (readonly number[])[]): [number, number, number] {
  return attempt<[number, number, number]>(
    () => {
      const ns = rng.pick(lengths).map((l) => (l === 1 ? rng.int(1, 9) : rng.int(10 ** (l - 1), 10 ** l - 1))) as [number, number, number];
      return carryCount(ns) === 0 ? ns : null;
    },
    [321, 45, 12],
  );
}

const zeroFree = (ops: readonly number[]) => !ops.join('').includes('0');

export const addierenSkill: SkillDef = {
  ...SKILL,
  title: 'Plus ohne Übertrag',
  description: 'Du rechnest von den Einern aus Stelle für Stelle.',
  stufen: {
    1: '2 Zahlen mit 2 oder 3 Ziffern',
    2: 'Verschieden lange Zahlen, auch mit einer Null',
    3: 'Ziffer im Kästchen finden; 3 Zahlen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = 'abziehen';
    const item = (operands: number[], prompt?: string) => writtenItem(SKILL, stufe, { ab, op: 'add', operands, method, kmk: KMK, prompt });
    const passt = (make: () => number[], valid: (ops: readonly number[]) => boolean) =>
      passtItem(SKILL, stufe, ab, rng, { op: 'add', make, valid: (ops) => carryCount(ops) === 0 && valid(ops), method, kmk: KMK });
    if (stufe === 1) {
      // same length, no 0: 24 + 53, then 245 + 132, then the task to a given result
      if (ab === 1) return item(noCarryPair(rng, 2, 2));
      if (ab === 2) return item(noCarryPair(rng, 3, 3));
      return passt(() => noCarryPair(rng, 3, 3), (ops) => zeroFree(ops) && numLength(ops[0]) === 3 && numLength(ops[1]) === 3);
    }
    if (stufe === 2) {
      // 756 + 43, then a 0 in a column, then the task to a given result
      if (ab === 1) return item(noCarryPair(rng, 3, 2), 'Rechne schriftlich. Schreib Einer unter Einer.');
      if (ab === 2) return item(zeroPair(rng), 'Rechne schriftlich. Achte auf die 0.');
      return passt(() => (rng.chance(0.5) ? zeroPair(rng) : noCarryPair(rng, 3, 2)), (ops) => numLength(ops[0]) !== numLength(ops[1]) || zeroColumn(ops));
    }
    // three numbers, then a box in two numbers, then a box in three numbers
    if (ab === 1) return item(threeNumbers(rng, [[3, 2, 1], [2, 2, 2], [3, 2, 2]]), 'Rechne alle 3 Zahlen schriftlich zusammen.');
    if (ab === 2) return lueckeItem(SKILL, stufe, ab, rng, 'add', noCarryPair(rng, 3, 3), method, [...KMK, 'PK.problemloesen']);
    return lueckeItem(SKILL, stufe, ab, rng, 'add', threeNumbers(rng, [[3, 3, 2], [3, 2, 2], [2, 2, 2]]), method, [...KMK, 'PK.problemloesen'], [0, 1, 2]);
  },
};
