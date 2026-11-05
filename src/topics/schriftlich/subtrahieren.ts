import { MINUS, fmt, speak } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, SubtractionMethod } from '../../core/types';
import { digitAt, numLength } from '../../core/written';
import { build, bugList, targetAb } from '../shared';
import { attempt, methodOf, subLayout, workedSteps, writtenItem } from './common';
import { fitsProbe, passtItem, probeItem } from './formen';
import { lueckeItem } from './luecke';

const SKILL = { id: 'schriftlich.subtrahieren', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich'];

/** Column by column, the upper digit is at least the lower digit. `zeroBelow` makes these places of b a 0. */
function noRegroup(rng: Rng, lenB: number, zeroBelow: readonly number[] = [], zeroFree = true): [number, number] {
  let a = 0;
  let b = 0;
  for (let p = 0; p < 3; p++) {
    const top = rng.int(p === 2 ? 2 : 1, 9);
    const low = zeroBelow.includes(p) ? 0 : p < lenB ? rng.int(p === lenB - 1 || zeroFree ? 1 : 0, top) : 0;
    a += top * 10 ** p;
    b += low * 10 ** p;
  }
  return [a, b];
}

/** 756 − 43: different lengths; 847 − 205: a zero below. */
function pair(rng: Rng, form: 'gleich' | 'lang' | 'null'): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, b] = form === 'gleich' ? noRegroup(rng, 3) : form === 'lang' ? noRegroup(rng, 2) : noRegroup(rng, 3, [rng.int(0, 1)]);
      return a > b && subLayout(a, b).regroupings === 0 && a - b >= 100 ? [a, b] : null;
    },
    form === 'null' ? [847, 205] : form === 'lang' ? [756, 43] : [586, 243],
  );
}

/** 586 − 243: no equal digits, so no 0 inside the result (AB 1 of Stufe 1). */
function plainPair(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, b] = pair(rng, 'gleich');
      return [0, 1].every((p) => digitAt(a, p) !== digitAt(b, p)) ? [a, b] : null;
    },
    [586, 243],
  );
}

/** 753 − 251: equal digits in a column, so the result has a 0 inside. */
function equalDigits(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const [a, low] = noRegroup(rng, 3);
      const p = rng.int(0, 1);
      const b = low + (digitAt(a, p) - digitAt(low, p)) * 10 ** p;
      return a - b >= 100 && subLayout(a, b).regroupings === 0 ? [a, b] : null;
    },
    [753, 251],
  );
}

const noRegrouping = (ops: readonly number[]) => ops[0] - ops[1] >= 100 && subLayout(ops[0], ops[1]).regroupings === 0;
const zeroFree = (ops: readonly number[]) => !ops.join('').includes('0');

/** The Probe forwards: the child calculates, then adds the lower number to the own result. */
function probe(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const operands = attempt<[number, number]>(
    () => {
      const ops = pair(rng, rng.chance(0.5) ? 'gleich' : 'lang');
      return fitsProbe('sub', ops) ? ops : null;
    },
    [586, 243],
  );
  return probeItem(SKILL, stufe, ab, { op: 'sub', operands, method, form: 'probe', kmk: [...KMK, 'ZO.kontrolle'], prompt: 'Rechne schriftlich. Prüfe dein Ergebnis dann mit Plus.' });
}

/** The Probe backwards: □ − 243 = 343. The child has to see that plus finds the upper number. */
function upperNumber(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const [a, b] = pair(rng, rng.chance(0.5) ? 'gleich' : 'lang');
  const c = a - b;
  const expression = `□ ${MINUS} ${fmt(b)} = ${fmt(c)}`;
  const prompt = 'Rechne mit Plus. Welche Zahl steht oben?';
  return build(SKILL, stufe, {
    key: `oben:${a}|${b}:${method[0]}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: a, label: 'Zahl oben' },
    hints: [`Plus prüft Minus: ${fmt(c)} + ${fmt(b)}.`, 'Das Ergebnis und die untere Zahl geben zusammen die obere Zahl.'],
    steps: workedSteps(stufe, 'add', [c, b], method, [`Die Probe ist ${fmt(c)} + ${fmt(b)}.`]),
    bugs: bugList(a, [['plus-statt-minus', c >= b ? c - b : null, `Du suchst die obere Zahl. Rechne ${fmt(c)} + ${fmt(b)}.`]]),
    praise: 'Du hast die obere Zahl mit Plus gefunden.',
    srText: `${speak(expression)}. ${prompt}`,
    kmk: [...KMK, 'ZO.kontrolle', 'PK.problemloesen'],
  });
}

export const subtrahierenSkill: SkillDef = {
  ...SKILL,
  title: 'Minus ohne Übertrag',
  description: 'Du rechnest von den Einern aus untereinander minus.',
  stufen: {
    1: 'Zahlen mit 3 Ziffern, oben steht immer genug',
    2: 'Verschieden lange Zahlen und Nullen',
    3: 'Selbst rechnen und mit Plus prüfen; Ziffer im Kästchen finden',
  },
  kmk: KMK,
  usesMethod: true,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = methodOf(ctx);
    const item = (operands: [number, number], prompt?: string) => writtenItem(SKILL, stufe, { ab, op: 'sub', operands, method, kmk: KMK, prompt });
    if (stufe === 1) {
      // 586 − 243, then equal digits in a column, then the task to a given result
      if (ab === 1) return item(plainPair(rng));
      if (ab === 2) return item(equalDigits(rng), 'Rechne schriftlich. Schau auf die gleichen Ziffern.');
      return passtItem(SKILL, stufe, ab, rng, { op: 'sub', make: () => pair(rng, 'gleich'), valid: (ops) => noRegrouping(ops) && zeroFree(ops) && numLength(ops[1]) === 3, method, kmk: KMK });
    }
    if (stufe === 2) {
      // 756 − 43, then a 0 below, then the task to a given result
      if (ab === 1) return item(pair(rng, 'lang'), 'Rechne schriftlich. Schreib Einer unter Einer.');
      if (ab === 2) return item(pair(rng, 'null'), 'Rechne schriftlich. Achte auf die 0 unten.');
      return passtItem(SKILL, stufe, ab, rng, {
        op: 'sub',
        make: () => pair(rng, rng.chance(0.5) ? 'lang' : 'null'),
        valid: (ops) => noRegrouping(ops) && (numLength(ops[1]) < 3 || String(ops[1]).includes('0')),
        method,
        kmk: KMK,
      });
    }
    // the Probe with plus, then a box on the easier rows, then the upper digit or number
    const kmk = [...KMK, 'PK.problemloesen'];
    if (ab === 1) return probe(rng, stufe, ab, method);
    if (ab === 2) return lueckeItem(SKILL, stufe, ab, rng, 'sub', pair(rng, 'gleich'), method, kmk, ['r', 1]);
    return rng.chance(0.5) ? lueckeItem(SKILL, stufe, ab, rng, 'sub', pair(rng, 'gleich'), method, kmk, [0]) : upperNumber(rng, stufe, ab, method);
  },
};
