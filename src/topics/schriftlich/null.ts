import type { Rng, SkillDef } from '../../core/types';
import { digitAt } from '../../core/written';
import { targetAb } from '../shared';
import { attempt, methodOf, noZeros, randLen, subLayout, writtenItem } from './common';
import { passtItem } from './formen';

const SKILL = { id: 'schriftlich.null', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich'];

/** 847 − 205: a 0 in the lower number, nothing to regroup; the result keeps 3 digits. */
function zeroBelow(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = noZeros(rng, 3);
      const p = rng.int(0, 1);
      const b = randLen(rng, 3);
      const clean = b - digitAt(b, p) * 10 ** p;
      return a - clean >= 100 && digitAt(clean, 2) > 0 && subLayout(a, clean).regroupings === 0 && digitAt(clean, 1 - p) > 0 ? [a, clean] : null;
    },
    [847, 205],
  );
}

/** 847 − 205 without equal digits, so the result has no 0 inside (AB 1 of Stufe 1). */
function zeroBelowPlain(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, b] = zeroBelow(rng);
      return [0, 1].every((p) => digitAt(a, p) !== digitAt(b, p)) ? [a, b] : null;
    },
    [847, 205],
  );
}

/** 845 − 205: a 0 below and equal digits in another column, so the result has a 0 inside. */
function zeroBelowEqual(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, b] = zeroBelow(rng);
      const zero = digitAt(b, 0) === 0 ? 0 : 1;
      const other = 1 - zero;
      const top = a + (digitAt(b, other) - digitAt(a, other)) * 10 ** other;
      return top - b >= 100 ? [top, b] : null;
    },
    [845, 205],
  );
}

const zeroBelowOk = ([a, b]: readonly number[]) =>
  a - b >= 100 && !String(a).includes('0') && digitAt(b, 2) > 0 && (digitAt(b, 0) === 0) !== (digitAt(b, 1) === 0) && subLayout(a, b).regroupings === 0;

/** 605 − 213, 640 − 213: a 0 in the upper number with a digit below, and `count` wechsel at the neighbour, never across a 0. */
function zeroAbove(rng: Rng, count: 1 | 2): [number, number] {
  return attempt<[number, number]>(
    () => {
      const p = count === 2 ? 0 : rng.int(0, 1);
      const top = noZeros(rng, 3);
      const a = top - digitAt(top, p) * 10 ** p;
      const b = randLen(rng, 3);
      if (a <= b || digitAt(b, p) === 0) return null;
      const lay = subLayout(a, b);
      return lay.regroupings === count && !lay.acrossZero && a - b >= 100 ? [a, b] : null;
    },
    count === 2 ? [640, 258] : [605, 213],
  );
}

const zeroAboveOk = ([a, b]: readonly number[]) => {
  if (a - b < 100) return false;
  const lay = subLayout(a, b);
  return lay.regroupings >= 1 && !lay.acrossZero && [0, 1].some((p) => digitAt(a, p) === 0 && digitAt(b, p) > 0);
};

/** The wechsel has to cross a 0; the result keeps 3 digits: 403 − 178, or 700 − 258 and 1000 − 233 with nothing to take on top. */
function acrossZero(rng: Rng, form: 'zehner' | 'hunderter' | 'tausend'): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = form === 'tausend' ? 1000 : form === 'hunderter' ? rng.int(2, 9) * 100 : rng.int(2, 9) * 100 + rng.int(1, 8);
      const b = randLen(rng, 3);
      if (a - b < 100 || digitAt(b, 0) === 0) return null;
      return subLayout(a, b).acrossZero ? [a, b] : null;
    },
    form === 'tausend' ? [1000, 233] : form === 'hunderter' ? [700, 258] : [403, 178],
  );
}

const acrossZeroOk = ([a, b]: readonly number[]) => a - b >= 100 && digitAt(b, 0) !== 0 && subLayout(a, b).acrossZero;

export const nullSkill: SkillDef = {
  ...SKILL,
  title: 'Minus mit Null',
  description: 'Du rechnest sicher, auch wenn oben eine Null steht.',
  stufen: {
    1: 'Die 0 steht unten',
    2: 'Die 0 steht oben',
    3: 'Die 0 oben mit Übertrag, auch von 1000',
  },
  kmk: KMK,
  usesMethod: true,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = methodOf(ctx);
    const item = (operands: number[], prompt: string) => writtenItem(SKILL, stufe, { ab, op: 'sub', operands, method, kmk: KMK, prompt });
    const passt = (make: () => number[], valid: (ops: readonly number[]) => boolean) => passtItem(SKILL, stufe, ab, rng, { op: 'sub', make, valid, method, kmk: KMK });
    if (stufe === 1) {
      const below = 'Rechne schriftlich. Achte auf die 0 unten.';
      // 847 − 205, then with equal digits as well, then the task to a given result
      if (ab === 1) return item(zeroBelowPlain(rng), below);
      if (ab === 2) return item(zeroBelowEqual(rng), below);
      return passt(() => zeroBelow(rng), zeroBelowOk);
    }
    if (stufe === 2) {
      const above = 'Rechne schriftlich. Achte auf die 0 oben.';
      // 605 − 213, then 2-mal: 640 − 258, then the task to a given result
      if (ab === 1) return item(zeroAbove(rng, 1), above);
      if (ab === 2) return item(zeroAbove(rng, 2), above);
      return passt(() => zeroAbove(rng, rng.pick([1, 2])), zeroAboveOk);
    }
    const across = method === 'abziehen' ? 'Rechne schriftlich. Geh Schritt für Schritt über die 0.' : 'Rechne schriftlich. Denk bei der 0 an den Übertrag.';
    // 403 − 178, then 700 − 258 and 1000 − 233, then the task to a given result
    if (ab === 1) return item(acrossZero(rng, 'zehner'), across);
    if (ab === 2) return item(acrossZero(rng, rng.pick(['hunderter', 'tausend'])), across);
    return passt(() => acrossZero(rng, rng.pick(['zehner', 'hunderter', 'tausend'])), acrossZeroOk);
  },
};
