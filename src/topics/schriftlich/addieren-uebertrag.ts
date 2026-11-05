import { fmt } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { digitAt, layoutAdd, numLength } from '../../core/written';
import { build, makeChoice, targetAb } from '../shared';
import { attempt, carryCount, noZeros, randLen, solved, writtenItem } from './common';
import { detektivItem, plantable, type Planted } from './detektiv';
import { passtItem, spalteItem } from './formen';

const SKILL = { id: 'schriftlich.addieren-uebertrag', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich'];
const METHOD = 'abziehen';

/** No 0 in either number: a column with a 0, above all a Übertrag into it (508 + 406), is the content of Stufe 2. */
const noZeroDigit = (ops: readonly number[]) => !ops.join('').includes('0');

function oneCarry(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const len = rng.pick([2, 3, 3, 3]);
      const a = noZeros(rng, len);
      const b = noZeros(rng, len);
      return a + b <= 999 && carryCount([a, b]) === 1 ? [a, b] : null;
    },
    [376, 112],
  );
}

/** One Übertrag, out of this place: 0 is 376 + 112, 1 is 372 + 251 (Stufe 1). */
function oneCarryAt(rng: Rng, place: 0 | 1): [number, number] {
  return attempt<[number, number]>(
    () => {
      const len = place === 0 ? rng.pick([2, 3, 3]) : 3;
      const a = noZeros(rng, len);
      const b = noZeros(rng, len);
      return a + b <= 999 && carryCount([a, b]) === 1 && layoutAdd([a, b]).carries[place + 1] > 0 ? [a, b] : null;
    },
    place === 0 ? [376, 112] : [372, 251],
  );
}

function twoCarries(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, 3);
      const b = randLen(rng, 3);
      return a + b <= 999 && carryCount([a, b]) === 2 ? [a, b] : null;
    },
    [376, 145],
  );
}

/** 508 + 406: a Übertrag arrives at a column of zeros. */
function carryToZero(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const ones = rng.int(2, 9);
      const a = rng.int(1, 5) * 100 + ones;
      const b = rng.int(1, 4) * 100 + rng.int(10 - ones, 9);
      return a + b <= 999 ? [a, b] : null;
    },
    [508, 406],
  );
}

/** 505 + 495: the result is exactly 1000. */
function toThousand(rng: Rng): [number, number] {
  const a = attempt<number>(
    () => {
      const n = rng.int(101, 899);
      return n % 100 !== 0 ? n : null;
    },
    505,
  );
  return [a, 1000 - a];
}

/** 587 + 34: a long and a short number, with 2 Überträge. */
function differentLengths(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, 3);
      const b = randLen(rng, 2);
      return a + b <= 1000 && carryCount([a, b]) === 2 ? [a, b] : null;
    },
    [587, 34],
  );
}

/** Three numbers; at least `carries` Überträge. */
function threeNumbers(rng: Rng, carries: number): [number, number, number] {
  return attempt<[number, number, number]>(
    () => {
      const lengths = rng.pick([[3, 3, 2], [3, 2, 2], [3, 3, 3], [3, 2, 1]]);
      const ns = lengths.map((l) => randLen(rng, l)) as [number, number, number];
      return ns.reduce((s, n) => s + n, 0) <= 1000 && carryCount(ns) >= carries ? ns : null;
    },
    [287, 145, 96],
  );
}

/** A Übertrag arrives at a column of zeros. */
const carryIntoZero = (ops: readonly number[]) => {
  const { carries } = layoutAdd(ops);
  return [1, 2].some((p) => carries[p] > 0 && ops.every((n) => digitAt(n, p) === 0));
};

/** Ziffernkarten: 4 cards, 2 numbers with 2 digits. The largest result has the large digits at the Zehner. */
function cards(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [d1, d2, d3, d4] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 4).sort((x, y) => y - x);
  const best = [d1 * 10 + d3, d2 * 10 + d4] as const;
  const value = best[0] + best[1];
  const candidates: [number, number][] = [[d1 * 10 + d2, d3 * 10 + d4], [d3 * 10 + d1, d4 * 10 + d2], [d4 * 10 + d3, d2 * 10 + d1], [d3 * 10 + d4, d1 * 10 + d2]];
  const seen = new Set<number>();
  const wrongs = candidates
    .filter(([x, y]) => x + y < value)
    .filter(([x, y]) => (seen.has(x + y) ? false : (seen.add(x + y), true)))
    .map(([x, y]): ChoiceOption => ({ label: `${x} + ${y}`, whyWrong: 'Eine Ziffer bei den Zehnern zählt mehr. Leg die großen Ziffern nach vorne.' }));
  const cardsText = rng.shuffle([d1, d2, d3, d4]).join('   ');
  return build(SKILL, stufe, {
    key: `karten:${d1}${d2}${d3}${d4}`,
    ab,
    prompt: 'Leg 2 Zahlen. Welche Aufgabe gibt das größte Ergebnis?',
    expression: cardsText,
    answer: makeChoice(rng, { label: `${best[0]} + ${best[1]}` }, wrongs),
    hints: ['Eine Ziffer bei den Zehnern zählt 10-mal so viel.', 'Die 2 größten Ziffern kommen zu den Zehnern.'],
    steps: [`Die größten Ziffern ${d1} und ${d2} kommen zu den Zehnern.`, `Die Ziffern ${d3} und ${d4} kommen zu den Einern.`, { text: `${best[0]} + ${best[1]} = ${fmt(value)}.`, visual: solved('add', [...best], METHOD, stufe) }],
    praise: 'Du hast die großen Ziffern bei den Zehnern gesucht.',
    srText: `Die Karten zeigen ${[d1, d2, d3, d4].join(', ')}. Leg 2 Zahlen. Welche Aufgabe gibt das größte Ergebnis?`,
    kmk: [...KMK, 'ZO.stellenwert', 'PK.problemloesen'],
    knobel: true,
  });
}

/** A calculation with a planted mistake: one of the column errors of §5. */
function plant(rng: Rng): Planted {
  return attempt<Planted>(
    () => {
      const operands = rng.pick([twoCarries, carryToZero, oneCarry])(rng);
      const options = plantable('add', operands, METHOD);
      return options.length ? rng.pick(options) : null;
    },
    plantable('add', [376, 145], METHOD)[0],
  );
}

export const addierenUebertragSkill: SkillDef = {
  ...SKILL,
  title: 'Plus mit Übertrag',
  description: 'Du trägst einen vollen Zehner in die nächste Spalte.',
  stufen: {
    1: 'Ein Übertrag, Ergebnis bis 999',
    2: '2 Überträge und Nullen, Ergebnis bis 1000',
    3: '3 Zahlen, Ziffernkarten und Fehlerdetektiv',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const item = (operands: number[], prompt?: string, praise?: string) => writtenItem(SKILL, stufe, { ab, op: 'add', operands, method: METHOD, kmk: KMK, prompt, praise });
    if (stufe === 1) {
      // the Übertrag at the Einer, then at the Zehner, then the task to a given result or the column with the Übertrag
      if (ab === 1) return item(oneCarryAt(rng, 0));
      if (ab === 2) return item(oneCarryAt(rng, 1));
      if (rng.chance(0.5)) return spalteItem(SKILL, stufe, ab, rng, 'add', oneCarry(rng), METHOD, KMK);
      return passtItem(SKILL, stufe, ab, rng, { op: 'add', make: () => oneCarryAt(rng, rng.pick([0, 1])), valid: (ops) => carryCount(ops) === 1 && numLength(ops[0]) === numLength(ops[1]) && noZeroDigit(ops), method: METHOD, kmk: KMK });
    }
    if (stufe === 2) {
      // 2 Überträge, then a 0, the sum 1000 or a short number, then the task to a given result
      if (ab === 1) return item(twoCarries(rng));
      if (ab === 2) {
        const form = rng.pick(['null', 'tausend', 'lang'] as const);
        if (form === 'null') return item(carryToZero(rng), 'Rechne schriftlich. Achte auf die 0.', 'Du hast den Übertrag auch zur 0 gerechnet.');
        if (form === 'tausend') return item(toThousand(rng), 'Rechne schriftlich. Schreib auch den letzten Übertrag.', 'Du hast den letzten Übertrag vorne hingeschrieben.');
        return item(differentLengths(rng), 'Rechne schriftlich. Schreib Einer unter Einer.', 'Du hast die Zahlen richtig untereinander gerechnet.');
      }
      return passtItem(SKILL, stufe, ab, rng, { op: 'add', make: () => rng.pick([twoCarries, twoCarries, carryToZero, toThousand])(rng), valid: (ops) => carryCount(ops) >= 2 || carryIntoZero(ops), method: METHOD, kmk: KMK });
    }
    // three numbers, then Ziffernkarten or three numbers with more Überträge, then the Fehlerdetektiv
    if (ab === 1) return item(threeNumbers(rng, 1), 'Rechne alle 3 Zahlen schriftlich zusammen.');
    if (ab === 2) return rng.chance(0.5) ? cards(rng, stufe, ab) : item(threeNumbers(rng, 2), 'Rechne alle 3 Zahlen schriftlich zusammen.');
    return detektivItem(SKILL, stufe, ab, rng, plant(rng), [...KMK, 'ZO.kontrolle', 'PK.argumentieren']);
  },
};
