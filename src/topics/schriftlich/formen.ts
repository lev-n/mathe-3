/**
 * Two less direct task forms for the top AB level of a Stufe. They ask about the calculations of that Stufe and bring no new content: 'passt'
 * goes backwards from a result to its task, 'spalte' asks where a calculation needs care before it starts. Neither shows a wrong result: a
 * planted mistake stays on Stufe 3 (detektiv.ts).
 */
import { MINUS, TIMES, fmt, speak } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, Stufe, SubtractionMethod, WrittenOp } from '../../core/types';
import { correctResult, digitAt, layoutAdd, layoutMul, numLength, placeDative, writtenVisual } from '../../core/written';
import { MAX_NUMBER } from '../../core/age';
import { build, bugList, makeChoice, multiBugs } from '../shared';
import { bugsFor } from './bugs';
import { attempt, subLayout, termOf, workedSteps, writtenHints, type SkillRef } from './common';

/** The second factor of a written Mal stays a digit from 2. */
const fits = (op: WrittenOp, ops: readonly number[]) => {
  const result = correctResult(op, ops);
  if (result <= 0 || result > MAX_NUMBER || ops.some((n) => n > MAX_NUMBER)) return false;
  return op !== 'mul' || (ops[1] >= 2 && ops[1] <= 9);
};

/**
 * Tasks close to these: one digit of one number changed by 1 or 2, still a task of the same kind (`valid`), each with a result of its own. The
 * first two keep the Einer of the result, so that a look at the last digit does not decide the choice.
 */
function rivalTasks(rng: Rng, op: WrittenOp, operands: readonly number[], valid: (ops: readonly number[]) => boolean): number[][] {
  const changed: { ops: number[]; place: number }[] = [];
  operands.forEach((n, i) => {
    const len = numLength(n);
    for (let place = 0; place < len; place++) {
      for (const delta of [-2, -1, 1, 2]) {
        const d = digitAt(n, place) + delta;
        if (d < 0 || d > 9 || (d === 0 && place === len - 1)) continue;
        const ops = [...operands];
        ops[i] = n + delta * 10 ** place;
        changed.push({ ops, place });
      }
    }
  });
  const seen = new Set([correctResult(op, operands)]);
  const picked: number[][] = [];
  const take = (pool: readonly { ops: number[] }[], count: number) => {
    let left = count;
    for (const { ops } of pool) {
      if (left === 0) return;
      const r = correctResult(op, ops);
      if (seen.has(r) || !fits(op, ops) || !valid(ops)) continue;
      seen.add(r);
      picked.push(ops);
      left--;
    }
  };
  const inner = rng.shuffle(changed.filter((c) => c.place > 0));
  take(inner, 2);
  take(rng.shuffle(changed), 3 - picked.length);
  return picked;
}

export interface PasstSpec {
  op: WrittenOp;
  /** The numbers of the right task. */
  make: () => number[];
  /** Is this a task of the same kind? It holds for what `make` returns, and decides which close tasks may stand beside it. */
  valid: (ops: readonly number[]) => boolean;
  method: SubtractionMethod;
  kmk: string[];
}

/** From the result back to the task: which of these tasks has the result? */
export function passtItem(skill: SkillRef, stufe: Stufe, ab: Ab, rng: Rng, spec: PasstSpec): Exercise {
  const { op, method } = spec;
  const { operands, rivals } = attempt<{ operands: number[]; rivals: number[][] }>(
    () => {
      const ops = spec.make();
      const near = rivalTasks(rng, op, ops, spec.valid);
      return near.length >= 2 ? { operands: ops, rivals: near } : null;
    },
    (() => {
      const ops = spec.make();
      return { operands: ops, rivals: rivalTasks(rng, op, ops, () => true) };
    })(),
  );
  const result = correctResult(op, operands);
  const wrongs = rivals.map((ops): ChoiceOption => ({ label: termOf(op, ops), whyWrong: `Rechne diese Aufgabe nach: Das Ergebnis ist ${fmt(correctResult(op, ops))}.` }));
  const question = `Welche Aufgabe hat das Ergebnis ${fmt(result)}?`;
  return build(skill, stufe, {
    key: `passt:${op}:${operands.join('|')}${op === 'sub' ? `:${method[0]}` : ''}`,
    ab,
    prompt: question,
    answer: makeChoice(rng, { label: termOf(op, operands) }, wrongs),
    hints: ['Rechne jede Aufgabe von den Einern aus.', 'Vergleiche Spalte für Spalte mit dem Ergebnis.'],
    steps: workedSteps(stufe, op, operands, method),
    praise: 'Du hast die Aufgaben Spalte für Spalte geprüft.',
    srText: question,
    kmk: [...spec.kmk, 'PK.argumentieren'],
  });
}

/** The column that makes the calculation harder: the only one with a Übertrag (plus, mal) or with too little on top (minus). */
function hardColumn(op: WrittenOp, operands: readonly number[]): number {
  if (op === 'sub') return subLayout(operands[0], operands[1]).columns.findIndex((c) => c.regrouped);
  const carries = op === 'add' ? layoutAdd(operands).carries : layoutMul(operands[0], operands[1]).carries;
  return carries.findIndex((c) => c > 0) - 1;
}

/** Which column needs care? The numbers have exactly one such column. */
export function spalteItem(skill: SkillRef, stufe: Stufe, ab: Ab, rng: Rng, op: WrittenOp, operands: number[], method: SubtractionMethod, kmk: string[]): Exercise {
  const place = hardColumn(op, operands);
  const width = op === 'add' ? Math.max(...operands.map(numLength)) : numLength(operands[0]);
  const places = Array.from({ length: width }, (_, p) => p).reverse();
  const label = (p: number) => `Bei den ${placeDative(p)}`;
  const wrongText = (p: number) => {
    if (op === 'sub') return `Bei den ${placeDative(p)} steht oben genug.`;
    // 250 · 4: the front column gives 10 with its Übertrag, but no digit stands further left to take one
    const front = op === 'mul' && digitAt(operands[0], p) * operands[1] + layoutMul(operands[0], operands[1]).carries[p] >= 10;
    return front ? `Bei den ${placeDative(p)} schreibst du die ganze Zahl hin.` : `Bei den ${placeDative(p)} sind es weniger als 10.`;
  };
  const question = op === 'sub' ? 'Bei welcher Spalte steht oben zu wenig?' : 'Bei welcher Spalte gibt es einen Übertrag?';
  const wrongs = places.filter((p) => p !== place).map((p): ChoiceOption => ({ label: label(p), whyWrong: wrongText(p) }));
  const hints = op === 'sub'
    ? ['Vergleiche oben und unten, von den Einern aus.', 'Steht oben eine kleinere Ziffer als unten?']
    : op === 'mul'
      ? [`Nimm jede Ziffer mal ${operands[1]}, von den Einern aus.`, `Sind es 10 oder mehr? Dann gibt es einen Übertrag.`]
      : ['Rechne jede Spalte, von den Einern aus.', 'Sind es 10 oder mehr? Dann gibt es einen Übertrag.'];
  return build(skill, stufe, {
    key: `spalte:${op}:${operands.join('|')}${op === 'sub' ? `:${method[0]}` : ''}`,
    ab,
    prompt: question,
    visual: writtenVisual({ type: 'written', op, operands: [...operands], method: op === 'sub' ? method : undefined, showSolution: false, places: op !== 'mul' && stufe === 1 ? true : undefined }),
    answer: makeChoice(rng, { label: label(place) }, wrongs, { order: places.map(label) }),
    hints,
    steps: workedSteps(stufe, op, operands, method),
    praise: op === 'sub' ? 'Du hast oben und unten Spalte für Spalte verglichen.' : 'Du hast die Spalte mit dem Übertrag gefunden.',
    srText: `${speak(termOf(op, operands))}. ${question}`,
    kmk: [...kmk, 'PK.argumentieren'],
  });
}

/** The second factor is missing: 214 · □ = 642. The first digit that is not 0 gets no Übertrag, so its column shows the way. */
export function malLueckeItem(skill: SkillRef, stufe: Stufe, ab: Ab, a: number, m: number, kmk: string[]): Exercise {
  const result = a * m;
  const place = Array.from({ length: numLength(a) }, (_, p) => p).find((p) => digitAt(a, p) > 0) ?? 0;
  const d = digitAt(a, place);
  const expression = `${fmt(a)} ${TIMES} □ = ${fmt(result)}`;
  // 1 · □ ends with the answer itself, and so does 6 · □ with an even answer: such a column would state it
  const end = digitAt(d * m, 0);
  const columnHint = end === m ? `Wie oft passt ${fmt(a)} in ${fmt(result)}?` : `Bei den ${placeDative(place)}: ${d} ${TIMES} □ endet mit ${end}.`;
  return build(skill, stufe, {
    key: `luecke:${a}|${m}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: m, label: 'Zahl in der Lücke' },
    hints: [columnHint, `Probiere die Zahl aus. Rechne dann ${fmt(a)} mal diese Zahl.`],
    steps: workedSteps(stufe, 'mul', [a, m], 'abziehen'),
    bugs: bugList(m, [['rechenzeichen', result - a, 'Schau noch einmal auf das Rechenzeichen.']]),
    praise: 'Du hast rückwärts nach der kleinen Zahl gesucht.',
    srText: `${speak(expression)}. Welche Zahl gehört in die Lücke?`,
    kmk: [...kmk, 'PK.problemloesen'],
  });
}

export interface ProbeSpec {
  op: 'add' | 'sub';
  operands: [number, number];
  method: SubtractionMethod;
  kmk: string[];
  /** The form in the key. */
  form: string;
  prompt: string;
}

/** The result is nowhere on screen, and the lower number must not give it away. */
export const fitsProbe = (op: 'add' | 'sub', [a, b]: readonly number[]) => (op === 'add' ? a + b : a - b) !== b;

/**
 * The Probe as real work: the child calculates, then checks the own result with the Umkehraufgabe. The task shows only the calculation, without a
 * result: an equation on screen would hold the number the Probe gives, ready to copy. No hint says what the Probe has to give.
 */
export function probeItem(skill: SkillRef, stufe: Stufe, ab: Ab, spec: ProbeSpec): Exercise {
  const { op, operands, method, kmk, form, prompt } = spec;
  const [a, b] = operands;
  const result = correctResult(op, operands);
  const sign = op === 'add' ? MINUS : '+';
  const fields: MultiField[] = [
    { id: 'r', value: result, before: 'Ergebnis:', label: 'Ergebnis' },
    { id: 'p', value: a, before: `Probe: Ergebnis ${sign} ${fmt(b)} =`, label: 'Ergebnis der Probe' },
  ];
  const otherWay = op === 'add' ? result + b : result - b;
  const checkHint = `Zur Probe rechnest du dein Ergebnis ${op === 'add' ? 'minus' : 'plus'} ${fmt(b)}.`;
  return build(skill, stufe, {
    key: `${form}:${a}|${b}${op === 'sub' ? `:${method[0]}` : ''}`,
    ab,
    prompt,
    // no written picture: its empty result boxes would look like the fields to fill in
    expression: termOf(op, operands),
    answer: { kind: 'multi', fields },
    hints: [writtenHints(op, operands, method)[0], checkHint],
    steps: [...workedSteps(stufe, op, operands, method), `Probe: ${fmt(result)} ${sign} ${fmt(b)} = ${fmt(a)}.`],
    bugs: multiBugs(
      [
        ...bugsFor(op, operands, method).map((bug) => ({ ...bug, match: { r: bug.match as number } })),
        otherWay > 0 && { id: 'plus-statt-minus', match: { p: otherWay }, hint: checkHint },
      ],
      fields,
    ),
    praise: 'Du hast gerechnet und dein Ergebnis geprüft.',
    srText: `${speak(termOf(op, operands))}. ${prompt}`,
    kmk,
  });
}
