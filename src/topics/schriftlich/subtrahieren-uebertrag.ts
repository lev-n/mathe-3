import { MINUS, fmt, speak } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, SubtractionMethod } from '../../core/types';
import { digitAt, writtenVisual } from '../../core/written';
import { build, makeChoice, targetAb } from '../shared';
import { missingLine } from './bugs';
import { attempt, columnSteps, noZeros, randLen, solved, subLayout, termOf, writtenItem, methodOf } from './common';
import { detektivItem, plantable, type Planted } from './detektiv';
import { passtItem, spalteItem } from './formen';

const SKILL = { id: 'schriftlich.subtrahieren-uebertrag', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich'];

function regrouping(rng: Rng, count: number): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = noZeros(rng, 3);
      const b = noZeros(rng, 3);
      return a > b && a - b >= 100 && subLayout(a, b).regroupings === count ? [a, b] : null;
    },
    count === 1 ? [582, 327] : [432, 158],
  );
}

/** One regrouping, at this place: 0 is 582 − 327, 1 is 725 − 283 (Stufe 1). */
function regroupingAt(rng: Rng, place: 0 | 1): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, b] = regrouping(rng, 1);
      return subLayout(a, b).columns[place].regrouped ? [a, b] : null;
    },
    place === 0 ? [582, 327] : [725, 283],
  );
}

/** 732 − 58: the lower number is shorter, and both columns need a regrouping (Stufe 2). */
function shorterTwice(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = noZeros(rng, 3);
      const b = randLen(rng, 2);
      return a - b >= 100 && subLayout(a, b).regroupings === 2 ? [a, b] : null;
    },
    [732, 58],
  );
}

/** 756 − 94: the lower number is shorter, and the wechsel goes on to the Hunderter. */
function shorter(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = noZeros(rng, 3);
      const b = randLen(rng, 2);
      return digitAt(a, 1) < digitAt(b, 1) && digitAt(a, 0) >= digitAt(b, 0) ? [a, b] : null;
    },
    [756, 94],
  );
}

/**
 * The sentences of the Zehner column, one fits. The Einer have already changed this column, so the child works through them first and carries the
 * state along. Wrong sentences show a typical mistake in the Sprechweise of the method.
 */
function sprechweise(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const [a, b] = regrouping(rng, 2);
  const top = digitAt(a, 1);
  const low = digitAt(b, 1);
  const before = top - 1;
  const r = before + 10 - low;
  const term = termOf('sub', [a, b]);
  const right = method === 'abziehen' ? `Oben ist jetzt ${before}. Wechsle 1 Hunderter: ${before + 10} ${MINUS} ${low} = ${r}.` : `${low} + 1 = ${low + 1}. ${missingLine(low + 1, top + 10)} Schreib ${r}, Übertrag 1.`;
  const wrongs: ChoiceOption[] = method === 'abziehen'
    ? [
        { label: `Oben bleibt ${top}. Wechsle 1 Hunderter: ${top + 10} ${MINUS} ${low} = ${r + 1}.`, whyWrong: 'Die Einer haben 1 Zehner gewechselt. Oben ist nun einer weniger.' },
        { label: `${low} ${MINUS} ${before} = ${low - before}. Schreib ${low - before}.`, whyWrong: `Oben steht die ${before}, unten die ${low}. Rechne von oben nach unten.` },
        { label: `Oben ist jetzt ${before}. Das geht nicht. Schreib 0.`, whyWrong: 'Oben steht zu wenig. Wechsle 1 Hunderter.' },
      ]
    : [
        { label: `${missingLine(low, top + 10)} Schreib ${r + 1}, Übertrag 1.`, whyWrong: 'Von den Einern kommt der Übertrag 1. Unten kommt der Übertrag zuerst dazu.' },
        { label: `${low} + 1 = ${low + 1}. ${missingLine(low + 1, top + 10)} Schreib ${r}, kein Übertrag.`, whyWrong: 'Du hast oben 10 dazugenommen. Dann kommt unten 1 dazu.' },
        { label: `${missingLine(top, low + 1)} Schreib ${low + 1 - top}.`, whyWrong: `Unten steht die ${low}. Ergänze von unten nach oben.` },
      ];
  const lines = columnSteps('sub', [a, b], method);
  const question = 'Rechne zuerst die Einer. Welcher Satz passt dann zu den Zehnern?';
  return build(SKILL, stufe, {
    key: `satz:${a}|${b}:${method[0]}`,
    ab,
    prompt: question,
    visual: writtenVisual({ type: 'written', op: 'sub', operands: [a, b], method, showSolution: false }),
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: ['Bei den Einern steht oben zu wenig. Was ändert sich dann bei den Zehnern?', method === 'abziehen' ? 'Oben steht bei den Zehnern nun einer weniger.' : 'Unten kommt bei den Zehnern der Übertrag dazu.'],
    steps: [lines[0], lines[1], { text: `So geht es weiter bis ${fmt(a - b)}.`, visual: solved('sub', [a, b], method, stufe) }],
    praise: method === 'abziehen' ? 'Du hast beim Wechseln an beide Spalten gedacht.' : 'Du hast beim Erweitern an beide Spalten gedacht.',
    srText: `${speak(term)}. ${question}`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

function plant(rng: Rng, method: SubtractionMethod): Planted {
  return attempt<Planted>(
    () => {
      const [a, b] = rng.chance(0.7) ? regrouping(rng, rng.pick([1, 2])) : shorter(rng);
      const options = plantable('sub', [a, b], method);
      return options.length ? rng.pick(options) : null;
    },
    plantable('sub', [713, 281], method)[0],
  );
}

export const subtrahierenUebertragSkill: SkillDef = {
  ...SKILL,
  title: 'Minus mit Übertrag',
  description: 'Du rechnest minus, auch wenn oben zu wenig steht.',
  stufen: {
    1: 'Einmal bei den Einern oder Zehnern',
    2: '2-mal, auch mit verschieden langen Zahlen',
    3: 'Fehlerdetektiv und der passende Satz',
  },
  kmk: KMK,
  usesMethod: true,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = methodOf(ctx);
    const item = (operands: [number, number], prompt?: string) => writtenItem(SKILL, stufe, { ab, op: 'sub', operands, method, kmk: KMK, prompt });
    if (stufe === 1) {
      // too little at the Einer, then at the Zehner, then the task to a given result or the column with too little
      if (ab === 1) return item(regroupingAt(rng, 0));
      if (ab === 2) return item(regroupingAt(rng, 1));
      if (rng.chance(0.5)) return spalteItem(SKILL, stufe, ab, rng, 'sub', regrouping(rng, 1), method, KMK);
      return passtItem(SKILL, stufe, ab, rng, { op: 'sub', make: () => regrouping(rng, 1), valid: (ops) => ops[0] - ops[1] >= 100 && !ops.join('').includes('0') && subLayout(ops[0], ops[1]).regroupings === 1, method, kmk: KMK });
    }
    if (stufe === 2) {
      // 2-mal, then 2-mal with a short number, then the task to a given result
      if (ab === 1) return item(regrouping(rng, 2));
      if (ab === 2) return item(shorterTwice(rng), 'Rechne schriftlich. Schreib Einer unter Einer.');
      return passtItem(SKILL, stufe, ab, rng, { op: 'sub', make: () => (rng.chance(0.5) ? regrouping(rng, 2) : shorterTwice(rng)), valid: (ops) => ops[0] - ops[1] >= 100 && subLayout(ops[0], ops[1]).regroupings === 2, method, kmk: KMK });
    }
    // the fitting sentence, then where the mistake is or calculating again, then what the mistake was
    const kmk = [...KMK, 'ZO.kontrolle', 'PK.argumentieren'];
    if (ab === 1) return sprechweise(rng, stufe, ab, method);
    return detektivItem(SKILL, stufe, ab, rng, plant(rng, method), kmk, ab === 2 ? ['wo', 'neu'] : ['warum']);
  },
};
