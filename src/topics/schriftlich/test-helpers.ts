/** Test support of this topic (imported only by *.test.ts). */
import { expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, AnswerOf, Exercise, SkillDef, Stufe, SubtractionMethod, WrittenOp } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';

export const METHODS: readonly SubtractionMethod[] = ['abziehen', 'ergaenzen'];

/** Exercises of a planned AB level, on every Stufe, for one method. */
export function planned(skill: SkillDef, ab: Ab, method: SubtractionMethod = 'abziehen', n = 120): Exercise[] {
  return STUFEN.flatMap((stufe) => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 4099 + 17 + stufe * 7), stufe, { subtractionMethod: method, extras: true, ab })));
}

/** Exercises of one Stufe and one planned AB level, for one method. */
export function at(skill: SkillDef, stufe: Stufe, ab: Ab, method: SubtractionMethod = 'abziehen', n = 120): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 4099 + 17 + stufe * 7), stufe, { subtractionMethod: method, extras: true, ab }));
}

/** The written answer of an item that has to be a calculation. */
export function writtenOf(ex: Exercise): AnswerOf<'written'> {
  if (ex.answer.kind !== 'written') throw new Error(`not a calculation: ${ex.key}`);
  return ex.answer;
}

/** The right option of an item that has to be a choice. */
export function rightOption(ex: Exercise): string {
  if (ex.answer.kind !== 'choice') throw new Error(`not a choice: ${ex.key}`);
  return ex.answer.options[ex.answer.correct].label;
}

/** The forms of these items, sorted: the catalogue of what they ask. */
export const formsOf = (items: readonly Exercise[]) => [...new Set(items.map(formOf))].sort();

/** Worked by hand, without the layout engine: the places whose column of a plus task gives a Übertrag. */
export function plusCarries(operands: readonly number[]): number[] {
  const out: number[] = [];
  let carry = 0;
  for (let p = 0; p < 4; p++) {
    const s = operands.reduce((sum, n) => sum + (Math.floor(n / 10 ** p) % 10), carry);
    carry = Math.floor(s / 10);
    if (carry > 0) out.push(p);
  }
  return out;
}

/** Worked by hand: the places where the top digit of a minus task is too small when the calculation reaches it. */
export function minusRegroupings(a: number, b: number): number[] {
  const out: number[] = [];
  let borrow = 0;
  for (let p = 0; p < 4; p++) {
    const low = (Math.floor(a / 10 ** p) % 10) - borrow;
    borrow = low < Math.floor(b / 10 ** p) % 10 ? 1 : 0;
    if (borrow) out.push(p);
  }
  return out;
}

/** Worked by hand: the places whose column of a mal task sends a Übertrag to another digit of the upper number. */
export function malCarries(a: number, m: number): number[] {
  const out: number[] = [];
  let carry = 0;
  for (let p = 0; p < String(a).length - 1; p++) {
    carry = Math.floor(((Math.floor(a / 10 ** p) % 10) * m + carry) / 10);
    if (carry > 0) out.push(p);
  }
  return out;
}

/** The value of a term on an option: '245 + 132', '732 − 458', '23 · 3'. */
export function termValue(label: string): number {
  const m = /^(\d+) ([+−·]) (\d+)$/.exec(label);
  if (!m) throw new Error(`not a term: ${label}`);
  const [x, y] = [Number(m[1]), Number(m[3])];
  return m[2] === '+' ? x + y : m[2] === '−' ? x - y : x * y;
}

/** 'passt': only the right option has the result of the question. The options are tasks of the form `inScope` allows. */
export function expectPasst(ex: Exercise, inScope: (x: number, y: number) => boolean): void {
  if (ex.answer.kind !== 'choice') throw new Error(ex.key);
  const asked = Number((/Ergebnis (\d+)\?/.exec(ex.prompt) as RegExpExecArray)[1]);
  const right = ex.answer.correct;
  expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
  ex.answer.options.forEach((o, i) => {
    const [x, y] = o.label.split(/ [+−·] /).map(Number);
    expect(i === right, `${ex.key}: ${o.label}`).toBe(termValue(o.label) === asked);
    expect(inScope(x, y), `${ex.key}: ${o.label} is outside the Stufe`).toBe(true);
  });
}

/** 'spalte': the right option names the one column `places` found by hand; the task picture stays without a result. */
export function expectSpalte(ex: Exercise, places: (operands: readonly number[]) => number[]): void {
  const v = ex.visual;
  if (v?.type !== 'written' || ex.answer.kind !== 'choice') throw new Error(ex.key);
  const found = places(v.operands);
  expect(found.length, ex.key).toBe(1);
  const names = ['Einern', 'Zehnern', 'Hundertern'];
  expect(rightOption(ex), ex.key).toBe(`Bei den ${names[found[0]]}`);
  expect(v.showSolution, ex.key).toBe(false);
}

/** n as a whole number in this text. */
export const mentionsNumber = (text: string, n: number) => new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text);

/** 'probe': the child calculates and checks. The result stands nowhere on screen, and no hint says what the calculation or the Probe gives. */
export function expectProbe(ex: Exercise, op: 'add' | 'sub', method: SubtractionMethod): void {
  if (ex.answer.kind !== 'multi') throw new Error(ex.key);
  // only the calculation, with no = and no result behind it
  const [, x, sign, y] = /^(\d+) ([+−]) (\d+)$/.exec(ex.expression ?? '') as RegExpExecArray;
  const [a, b] = [Number(x), Number(y)];
  const result = op === 'add' ? a + b : a - b;
  const [r, p] = ex.answer.fields;
  expect(sign, ex.key).toBe(op === 'add' ? '+' : '−');
  expect(ex.visual, ex.key).toBeUndefined();
  expect([r.value, p.value], ex.key).toEqual([result, a]);
  expect(mentionsNumber(ex.expression as string, result), ex.key).toBe(false);
  expect(p.before, ex.key).toBe(`Probe: Ergebnis ${op === 'add' ? '−' : '+'} ${b} =`);
  const solved = ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual?.type === 'written' && s.visual.op === 'sub' ? [s.visual] : []));
  if (op === 'sub') expect(solved.map((v) => v.method), ex.key).toEqual([method]);
  for (const text of [ex.prompt, ex.srText, r.before ?? '', p.before ?? '', r.label ?? '', p.label ?? '']) expect(mentionsNumber(text, result), `${ex.key}: ${text}`).toBe(false);
  for (const hint of ex.hints) {
    expect(mentionsNumber(hint, result), `${ex.key}: ${hint}`).toBe(false);
    expect(mentionsNumber(hint, a), `${ex.key}: ${hint}`).toBe(false);
    expect(hint, ex.key).not.toMatch(/kommt.*heraus|wieder die obere|obere Zahl/);
  }
}

/** Every exercise of a skill, for both methods. */
export function everything(skill: SkillDef, n = 120): Exercise[] {
  return METHODS.flatMap((method) => ([1, 2, 3] as Ab[]).flatMap((ab) => planned(skill, ab, method, n)));
}

/**
 * Worked by hand, without the bug library: the labels that also describe a wrong result, column by column. A column that lost its Übertrag
 * shows the right digit minus the Übertrag (plus, mal) or plus 1 (minus).
 */
export function trueLabels(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, shown: number): string[] {
  const digit = (n: number, p: number) => Math.floor(n / 10 ** p) % 10;
  const labels = new Set<string>();
  if (op === 'sub') {
    const [a, b] = operands;
    const width = String(a).length;
    let borrow = 0;
    for (let p = 0; p < width; p++) {
      const lost = borrow === 1 && digit(shown, p) === (digit(a - b, p) + 1) % 10;
      if (lost) {
        labels.add(method === 'abziehen' ? 'Nach dem Wechseln steht oben nicht 1 weniger.' : 'Unten fehlt der Übertrag 1.');
        if (p === width - 1 || p >= String(b).length) labels.add(method === 'abziehen' ? 'Vorne fehlt der Wechsel.' : 'Vorne fehlt der Übertrag.');
        if (digit(a, p) === 0) labels.add(method === 'abziehen' ? 'Beim Wechseln über die 0 fehlt ein Schritt.' : 'Bei der 0 fehlt der Übertrag.');
      }
      borrow = digit(a, p) - borrow < digit(b, p) ? 1 : 0;
    }
    return [...labels];
  }
  const correct = op === 'add' ? operands.reduce((s, n) => s + n, 0) : operands[0] * operands[1];
  const width = String(correct).length;
  const len = Math.max(...operands.map((n) => String(n).length));
  let carry = 0;
  for (let p = 0; p < width; p++) {
    const here = operands.filter((n, i) => (op === 'add' || i === 0) && String(n).length > p).map((n) => digit(n, p));
    const lost = carry > 0 && digit(shown, p) === (digit(correct, p) - carry + 10) % 10;
    const next = op === 'add' ? here.reduce((s, d) => s + d, carry) : (here[0] ?? 0) * operands[1] + carry;
    if (lost) {
      labels.add('Der Übertrag fehlt.');
      if (op === 'add' && p >= len - 1) labels.add('Vorne fehlt der letzte Übertrag.');
      if (p < len && here.every((d) => d === 0)) labels.add('Bei der 0 fehlt der Übertrag.');
    }
    carry = Math.floor(next / 10);
  }
  return [...labels];
}

/** The planted reading is the only true option; at least 2 others stay, so that the choice still asks something. */
export function expectOneTrueOption(ex: Exercise, op: WrittenOp, operands: readonly number[], method: SubtractionMethod, shown: number): void {
  if (ex.answer.kind !== 'choice') throw new Error(ex.key);
  const right = ex.answer.options[ex.answer.correct].label;
  const others = ex.answer.options.map((o) => o.label).filter((l) => l !== right);
  const alsoTrue = trueLabels(op, operands, method, shown);
  expect(others.filter((l) => alsoTrue.includes(l)), `${ex.key} shows ${shown}, right is "${right}"`).toEqual([]);
  expect(others.length, ex.key).toBeGreaterThanOrEqual(2);
}

/** Fehlerdetektiv items of a skill on Stufe 3, for one method. */
export const detektivItems = (skill: SkillDef, method: SubtractionMethod, form: string, ab: Ab = 3) =>
  Array.from({ length: 1500 }, (_, i) => skill.generate(createRng(i * 4099 + 17), 3, { subtractionMethod: method, extras: true, ab })).filter((ex) => formOf(ex) === form);

/** The form of a task, from its key: 'schriftlich.addieren:2:rechnen:add:…' → 'rechnen'. */
export const formOf = (ex: Exercise) => ex.key.split(':')[2];

/** The checks that every skill of this topic shares, beyond describeSkill. */
export function sharedChecks(skill: SkillDef): void {
  it('the worked steps calculate correctly', () => {
    for (const ex of everything(skill)) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('the two methods keep their own words (T12)', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(skill, ab, 'abziehen')) expect(JSON.stringify(ex).toLowerCase(), ex.key).not.toMatch(/erweiter|ergänze/);
      for (const ex of planned(skill, ab, 'ergaenzen')) expect(JSON.stringify(ex).toLowerCase(), ex.key).not.toMatch(/wechsel|wechsle|entbünd|über die (0|null)/);
    }
  });

  it('the Sprechweise of a column stays in the method set (T12, §7.2)', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(skill, ab, 'abziehen')) expect(JSON.stringify(ex).toLowerCase(), ex.key).not.toMatch(/von \S+ bis \S+ (fehlt|fehlen)/);
      // a whole task like 847 − 205 is fine; a single column with minus, or the words of Abziehen, are not
      for (const ex of planned(skill, ab, 'ergaenzen')) expect(JSON.stringify(ex).toLowerCase(), ex.key).not.toMatch(/abzieh|unten minus oben|aus \d − 0|spalte: [^"]*−|(einer|zehner|hunderter|tausender): [^"]*\d − \d/);
    }
  });

  it('a Fehlerdetektiv with a planted result appears on Stufe 3 only (§7.1)', () => {
    for (const ex of everything(skill)) {
      if (ex.stufe < 3) expect(formOf(ex), ex.key).not.toMatch(/^(det-|fehler|neu-|welche)/);
    }
  });

  it('the spoken task names every number of a written calculation (T17)', () => {
    for (const ex of everything(skill)) {
      if (ex.answer.kind !== 'written') continue;
      for (const n of ex.answer.operands) expect(ex.srText, ex.key).toMatch(new RegExp(`(?<!\\d)${n}(?!\\d)`));
    }
  });

  it('"fehlt 1", but "fehlen" for every other number', () => {
    for (const ex of planned(skill, 3, 'ergaenzen')) {
      const text = JSON.stringify(ex).toLowerCase();
      expect(text, ex.key).not.toMatch(/von \S+ bis \S+ fehlen 1(?!\d)/);
      expect(text, ex.key).not.toMatch(/von \S+ bis \S+ fehlt (?!1(?!\d)|a\b)/);
    }
  });

  it('options with a picture show different pictures', () => {
    for (const ex of everything(skill)) {
      if (ex.answer.kind !== 'choice') continue;
      const pictures = ex.answer.options.filter((o) => o.visual).map((o) => JSON.stringify(o.visual));
      expect(new Set(pictures).size, ex.key).toBe(pictures.length);
    }
  });

  it('no text ends in "der 5", which the voice would read as a date (T17)', () => {
    for (const ex of everything(skill)) {
      const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
      for (const text of [ex.prompt, ...ex.hints, ...options]) expect(text, ex.key).not.toMatch(/\b(der|am|vom|zum|den) \d{1,2}(\.|$)/);
    }
  });

  it('every written minus on screen shows the method set, never the other one', () => {
    for (const method of METHODS) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(skill, ab, method)) {
          const shown = [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual)), ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.visual) : [])];
          for (const v of shown) if (v?.type === 'written' && v.op === 'sub') expect(v.method, ex.key).toBe(method);
          if (ex.answer.kind === 'written' && ex.answer.op === 'sub') expect(ex.answer.method, ex.key).toBe(method);
        }
      }
    }
  });

  it('a written answer keeps numbers and results up to 1000', () => {
    for (const ex of everything(skill)) {
      if (ex.answer.kind !== 'written') continue;
      expect(ex.answer.result, ex.key).toBeLessThanOrEqual(1000);
      ex.answer.operands.forEach((n) => expect(n, ex.key).toBeLessThanOrEqual(1000));
    }
  });
}
