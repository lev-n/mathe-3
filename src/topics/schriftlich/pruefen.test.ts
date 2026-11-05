import { describe, expect, it } from 'vitest';
import { roughlyEqual } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { toHundred } from './common';
import { pruefenSkill } from './pruefen';
import { METHODS, at, detektivItems, expectOneTrueOption, expectProbe, formOf, formsOf, mentionsNumber, rightOption, sharedChecks, writtenOf } from './test-helpers';

describeSkill(pruefenSkill);

const termOf = (text: string) => /(\d+) ([+−]) (\d+)/.exec(text) as RegExpExecArray;

describe('schriftlich.pruefen', () => {
  sharedChecks(pruefenSkill);

  const fromMiddle = (n: number) => Math.abs((n % 100) - 50);

  it('Stufe 1, AB 1 and 2: the correct Überschlag rounds both numbers, first clear ones, then one near the middle', () => {
    for (const ab of [1, 2] as const) {
      expect(formsOf(at(pruefenSkill, 1, ab))).toEqual(['wahl']);
      for (const ex of at(pruefenSkill, 1, ab)) {
        const [, x, sign, y] = termOf(ex.expression as string);
        const [a, b] = [Number(x), Number(y)];
        expect(rightOption(ex), ex.key).toBe(`${toHundred(a)} ${sign} ${toHundred(b)}`);
        if (ab === 1) expect(Math.min(fromMiddle(a), fromMiddle(b)), ex.key).toBeGreaterThanOrEqual(20);
        else expect(Math.min(fromMiddle(a), fromMiddle(b)), ex.key).toBeLessThanOrEqual(9);
      }
    }
  });

  it('Stufe 1, AB 3: the result near the own Überschlag, or the task with this Überschlag', () => {
    expect(formsOf(at(pruefenSkill, 1, 3))).toEqual(['aufgabe', 'ergebnis']);
    for (const ex of at(pruefenSkill, 1, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      if (formOf(ex) === 'ergebnis') {
        const [, x, sign, y] = termOf(ex.expression as string);
        const [a, b] = [Number(x), Number(y)];
        const exact = sign === '+' ? a + b : a - b;
        const u = sign === '+' ? toHundred(a) + toHundred(b) : toHundred(a) - toHundred(b);
        expect(Number(rightOption(ex)), ex.key).toBe(exact);
        expect(ex.prompt, ex.key).not.toContain(String(u));
        ex.answer.options.filter((o) => o.label !== rightOption(ex)).forEach((o) => expect(roughlyEqual(Number(o.label), u), ex.key).toBe(false));
      } else {
        const u = Number((/Überschlag (\d+)\?/.exec(ex.prompt) as RegExpExecArray)[1]);
        ex.answer.options.forEach((o) => {
          const [, x, sign, y] = termOf(o.label);
          const rough = sign === '+' ? toHundred(Number(x)) + toHundred(Number(y)) : toHundred(Number(x)) - toHundred(Number(y));
          expect(rough === u, `${ex.key}: ${o.label}`).toBe(o.label === rightOption(ex));
        });
      }
    }
  });

  it('Stufe 2, AB 1: round both numbers in fields and give the Überschlag', () => {
    expect(formsOf(at(pruefenSkill, 2, 1))).toEqual(['felder']);
    for (const ex of at(pruefenSkill, 2, 1)) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      const [, x, sign, y] = termOf(ex.expression as string);
      const [fa, fb, fu] = ex.answer.fields;
      expect(fa.value, ex.key).toBe(toHundred(Number(x)));
      expect(fb.value, ex.key).toBe(toHundred(Number(y)));
      expect(fu.value, ex.key).toBe(sign === '+' ? fa.value + fb.value : fa.value - fb.value);
    }
  });

  it('Stufe 2, AB 2: the Überschlag field expects the rounded calculation; it fits the result', () => {
    expect(formsOf(at(pruefenSkill, 2, 2))).toEqual(['ueberschlag']);
    for (const ex of at(pruefenSkill, 2, 2)) {
      const { operands: [a, b], op, ueberschlag, result } = writtenOf(ex);
      const u = op === 'add' ? toHundred(a) + toHundred(b) : toHundred(a) - toHundred(b);
      expect(ueberschlag, ex.key).toBe(u);
      expect(result, ex.key).toBe(op === 'add' ? a + b : a - b);
      expect(roughlyEqual(result, u), ex.key).toBe(true);
    }
  });

  it('Stufe 2, AB 3: the Umkehraufgabe, chosen, or calculate and check in the method set; no planted result and no result to copy', () => {
    for (const method of METHODS) {
      const items = at(pruefenSkill, 2, 3, method);
      expect(formsOf(items)).toEqual(['probe', 'probe-add', 'probe-sub']);
      for (const ex of items) {
        if (formOf(ex) === 'probe') {
          const [, x, y, c] = /(\d+) − (\d+) = (\d+)/.exec(ex.expression as string) as RegExpExecArray;
          expect(Number(x) - Number(y), ex.key).toBe(Number(c));
          expect(rightOption(ex), ex.key).toBe(`${c} + ${y}`);
          continue;
        }
        expectProbe(ex, formOf(ex) === 'probe-add' ? 'add' : 'sub', method);
      }
    }
  });

  it('Stufe 3: the forms: calculate again, then what happened, then which calculation', () => {
    expect(formsOf(at(pruefenSkill, 3, 1)).every((f) => f.startsWith('neu-'))).toBe(true);
    expect(formsOf(at(pruefenSkill, 3, 2))).toEqual(['fehler']);
    expect(formsOf(at(pruefenSkill, 3, 3))).toEqual(['welche']);
  });

  it('Stufe 3, AB 2: the arrows on the number line stay readable: apart from each other and inside the drawing', () => {
    // the geometry of NumberLineVisual: 340 units for 0 to 1000 from x = 30, in a drawing 400 wide; a bold digit of 20 is about 12 wide
    const x = (v: number) => 30 + v * 0.34;
    const half = (label: string) => (label.length * 12) / 2;
    let lines = 0;
    for (const ex of at(pruefenSkill, 3, 2)) {
      if (ex.visual?.type !== 'numberLine') continue;
      lines++;
      const [m1, m2] = ex.visual.marks ?? [];
      expect(Math.abs(x(m1.value) - x(m2.value)), ex.key).toBeGreaterThan(half(m1.label) + half(m2.label));
      for (const m of [m1, m2]) {
        expect(m.label, ex.key).toBe(String(m.value));
        expect(x(m.value) - half(m.label), ex.key).toBeGreaterThanOrEqual(0);
        expect(x(m.value) + half(m.label), ex.key).toBeLessThanOrEqual(400);
      }
    }
    expect(lines).toBeGreaterThan(0);
  });

  /** A shown calculation that lies far from its own Überschlag, while the exact result lies near. */
  const expectFar = (equation: string, key: string, stated?: number) => {
    const shown = /= (\d+)$/.exec(equation) as RegExpExecArray;
    const [, x, sign, y] = termOf(equation);
    const exact = sign === '+' ? Number(x) + Number(y) : Number(x) - Number(y);
    const u = sign === '+' ? toHundred(Number(x)) + toHundred(Number(y)) : toHundred(Number(x)) - toHundred(Number(y));
    if (stated !== undefined) expect(stated, key).toBe(u);
    expect(roughlyEqual(exact, u), key).toBe(true);
    expect(roughlyEqual(Number(shown[1]), u), key).toBe(false);
    // rounding to hundreds moves a result by up to 99: a correct calculation can reach anything nearer
    expect(Math.abs(Number(shown[1]) - u), key).toBeGreaterThanOrEqual(100);
    return exact;
  };

  it('Stufe 3, AB 1 and 2: the shown result lies far from the Überschlag, the exact result near it', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of at(pruefenSkill, 3, ab)) {
        const u = /Überschlag ist (\d+)/.exec(ex.prompt) as RegExpExecArray;
        const exact = expectFar(ex.expression as string, ex.key, Number(u[1]));
        if (ex.answer.kind === 'written') expect(ex.answer.result, ex.key).toBe(exact);
      }
    }
  });

  it('Stufe 3, AB 3: only the right calculation lies far; the others are true', () => {
    for (const method of METHODS) {
      for (const ex of at(pruefenSkill, 3, 3, method)) {
        if (ex.answer.kind !== 'choice') throw new Error(ex.key);
        expect(ex.answer.options.length, ex.key).toBe(3);
        ex.answer.options.forEach((o) => {
          if (o.label === rightOption(ex)) {
            expectFar(o.label, ex.key);
            return;
          }
          const [, x, sign, y] = termOf(o.label);
          const shown = Number((/= (\d+)$/.exec(o.label) as RegExpExecArray)[1]);
          expect(shown, ex.key).toBe(sign === '+' ? Number(x) + Number(y) : Number(x) - Number(y));
        });
      }
    }
  });

  it('no number of a task rounds away to 0: the Überschlag uses every number', () => {
    for (const method of METHODS) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of at(pruefenSkill, 3, ab, method)) {
          const texts = [ex.prompt, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))];
          for (const t of texts) expect(t, ex.key).not.toMatch(/Überschlag: .*[+−] 0 =/);
          if (ab === 3) continue;
          const [, x, , y] = termOf(ex.expression as string);
          expect(toHundred(Number(x)), ex.key).toBeGreaterThan(0);
          expect(toHundred(Number(y)), ex.key).toBeGreaterThan(0);
        }
      }
    }
  });

  it('Stufe 3, AB 1: the prompt never names the answer: an exact result equal to the Überschlag stays out', () => {
    for (const method of METHODS) {
      for (const ex of at(pruefenSkill, 3, 1, method, 1500)) {
        const { result } = writtenOf(ex);
        expect(mentionsNumber(`${ex.prompt} ${ex.expression}`, result), `${ex.key}: ${ex.prompt}`).toBe(false);
      }
    }
  });

  it('"Was stimmt nicht?" has one true option', () => {
    for (const method of METHODS) {
      const items = detektivItems(pruefenSkill, method, 'fehler', 2);
      expect(items.length, method).toBeGreaterThan(0);
      for (const ex of items) {
        const [, x, sign, y] = termOf(ex.expression as string);
        const shown = /= (\d+)$/.exec(ex.expression as string) as RegExpExecArray;
        expectOneTrueOption(ex, sign === '+' ? 'add' : 'sub', [Number(x), Number(y)], method, Number(shown[1]));
      }
    }
  });
});
