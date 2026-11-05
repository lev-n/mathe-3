import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { kopfOderSchriftlichSkill } from './kopf-oder-schriftlich';
import { at, formsOf, rightOption, sharedChecks } from './test-helpers';

describeSkill(kopfOderSchriftlichSkill);

const term = (text: string) => /(\d+) ([+−]) (\d+)/.exec(text) as RegExpExecArray;

describe('schriftlich.kopf-oder-schriftlich', () => {
  sharedChecks(kopfOderSchriftlichSkill);

  it('Stufe 1, AB 1: full hundreds go in the head, the others on paper', () => {
    const seen = new Set<string>();
    expect(formsOf(at(kopfOderSchriftlichSkill, 1, 1))).toEqual(['weg']);
    for (const ex of at(kopfOderSchriftlichSkill, 1, 1)) {
      const [, a, , b] = term(ex.expression as string);
      const round = Number(a) % 100 === 0 && Number(b) % 100 === 0;
      const right = rightOption(ex);
      seen.add(right);
      expect(right, ex.key).toBe(round ? 'Im Kopf' : 'Schriftlich');
    }
    expect(seen.size).toBe(2);
  });

  it('Stufe 1, AB 1: a task on paper has no way in the head: no near hundred, no small difference, no full result', () => {
    const nearFull = (n: number) => Math.min(n % 100, 100 - (n % 100)) <= 5;
    for (const ex of at(kopfOderSchriftlichSkill, 1, 1, 'abziehen', 400)) {
      if (rightOption(ex) !== 'Schriftlich') continue;
      const [, x, sign, y] = term(ex.expression as string);
      const a = Number(x);
      const b = Number(y);
      const result = sign === '+' ? a + b : a - b;
      expect(nearFull(a) || nearFull(b), ex.key).toBe(false);
      expect(result % 100, ex.key).not.toBe(0);
      if (sign === '−') expect(result, ex.key).toBeGreaterThanOrEqual(100);
    }
  });

  it('a number that Stufe 2 solves in the head is never sent to paper on Stufe 1', () => {
    const paper = new Set<string>();
    for (const ex of at(kopfOderSchriftlichSkill, 1, 1, 'abziehen', 400)) {
      if (rightOption(ex) === 'Schriftlich') paper.add(ex.expression as string);
    }
    for (const ab of [1, 2, 3] as const) {
      for (const ex of at(kopfOderSchriftlichSkill, 2, ab, 'abziehen', 400)) expect(paper.has((ex.expression as string).replace(' = □', '')), ex.key).toBe(false);
    }
  });

  it('Stufe 1, AB 2: the only task in the head is the one with full hundreds', () => {
    expect(formsOf(at(kopfOderSchriftlichSkill, 1, 2))).toEqual(['leicht']);
    for (const ex of at(kopfOderSchriftlichSkill, 1, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.answer.options.length, ex.key).toBe(3);
      ex.answer.options.forEach((o) => {
        const [, a, , b] = term(o.label);
        expect(Number(a) % 100 === 0 && Number(b) % 100 === 0, ex.key).toBe(o.label === rightOption(ex));
      });
    }
  });

  it('Stufe 1, AB 3: the reason fits the numbers', () => {
    const seen = new Set<string>();
    expect(formsOf(at(kopfOderSchriftlichSkill, 1, 3))).toEqual(['warum']);
    for (const ex of at(kopfOderSchriftlichSkill, 1, 3)) {
      const [, a, , b] = term(ex.expression as string);
      const right = rightOption(ex);
      seen.add(right);
      expect(right, ex.key).toBe(Number(a) % 100 === 0 && Number(b) % 100 === 0 ? 'Es sind volle Hunderter.' : 'Es gibt mehrere Überträge.');
    }
    expect(seen.size).toBe(2);
  });

  it('Stufe 2: a number near a full hundred, at every AB', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of at(kopfOderSchriftlichSkill, 2, ab)) {
        const y = Number(term(ex.expression as string)[3]);
        expect(100 - (y % 100), ex.key).toBeLessThanOrEqual(2);
      }
    }
  });

  it('Stufe 2, AB 1: the chosen way gives the exact result', () => {
    expect(formsOf(at(kopfOderSchriftlichSkill, 2, 1))).toEqual(['wahl']);
    for (const ex of at(kopfOderSchriftlichSkill, 2, 1)) {
      const [, x, sign, y] = term(ex.expression as string);
      const exact = sign === '+' ? Number(x) + Number(y) : Number(x) - Number(y);
      const way = /^(\d+) ([+−]) (\d+) ([+−]) (\d+)$/.exec(rightOption(ex)) as RegExpExecArray;
      const first = way[2] === '+' ? Number(way[1]) + Number(way[3]) : Number(way[1]) - Number(way[3]);
      expect(way[4] === '+' ? first + Number(way[5]) : first - Number(way[5]), ex.key).toBe(exact);
    }
  });

  it('Stufe 2, AB 2: the number answer is the exact result', () => {
    expect(formsOf(at(kopfOderSchriftlichSkill, 2, 2))).toEqual(['rechnen']);
    for (const ex of at(kopfOderSchriftlichSkill, 2, 2)) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      const [, x, sign, y] = term(ex.expression as string);
      expect(ex.answer.value, ex.key).toBe(sign === '+' ? Number(x) + Number(y) : Number(x) - Number(y));
    }
  });

  it('Stufe 2, AB 3: each step of the way: the full number, what to even out, the exact result', () => {
    expect(formsOf(at(kopfOderSchriftlichSkill, 2, 3))).toEqual(['schritte']);
    for (const ex of at(kopfOderSchriftlichSkill, 2, 3)) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      const [, x, sign, y] = term(ex.expression as string);
      const [far, off, r] = ex.answer.fields;
      expect(far.value % 100, ex.key).toBe(0);
      expect(far.value - off.value, ex.key).toBe(Number(y));
      expect(r.value, ex.key).toBe(sign === '+' ? Number(x) + Number(y) : Number(x) - Number(y));
      expect(off.before, ex.key).toBe(sign === '+' ? '−' : '+');
    }
  });

  it('Stufe 3: from a full number at every AB, with the result of 3 digits', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of at(kopfOderSchriftlichSkill, 3, ab)) {
        const [, a, , b] = term(ex.expression as string);
        expect(Number(a) % 100, ex.key).toBe(0);
        expect(Number(a) - Number(b), ex.key).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it('Stufe 3, AB 1: the number answer is the exact result', () => {
    expect(formsOf(at(kopfOderSchriftlichSkill, 3, 1))).toEqual(['rechnen']);
    for (const ex of at(kopfOderSchriftlichSkill, 3, 1)) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      const [, a, , b] = term(ex.expression as string);
      expect(ex.answer.value, ex.key).toBe(Number(a) - Number(b));
    }
  });

  it('Stufe 3, AB 2: the child finds the way and calculates; the prompt names no way, and no hint gives the end of it', () => {
    expect(formsOf(at(kopfOderSchriftlichSkill, 3, 2))).toEqual(['frei']);
    for (const ex of at(kopfOderSchriftlichSkill, 3, 2)) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      const [, a, , b] = term(ex.expression as string);
      expect(ex.answer.value, ex.key).toBe(Number(a) - Number(b));
      expect(ex.prompt, ex.key).not.toMatch(/\d/);
      for (const hint of ex.hints) expect(hint, ex.key).not.toMatch(/\+ 1|die 1 wieder/);
    }
  });

  it('Stufe 3, AB 3: the comparison is true for the numbers of the second way, which start and end in several ways', () => {
    expect(formsOf(at(kopfOderSchriftlichSkill, 3, 3))).toEqual(['vergleich']);
    const seen = new Set<string>();
    const starts = new Set<string>();
    for (const ex of at(kopfOderSchriftlichSkill, 3, 3)) {
      const [, a, b, n, y, sign, off] = /^(\d+) − (\d+)   und   (\d+) − (\d+)(?: ([+−]) (\d+))?$/.exec(ex.expression as string) as RegExpExecArray;
      const nines = Number(n) === Number(a) - 1;
      starts.add(nines ? 'nines' : 'full');
      if (nines) expect(y, ex.key).toBe(b);
      else {
        expect(n, ex.key).toBe(a);
        expect(Number(y) % 10, ex.key).toBe(0);
        expect(Number(y) - Number(b), ex.key).toBeGreaterThan(0);
        expect(Number(y) - Number(b), ex.key).toBeLessThan(10);
      }
      const second = Number(n) - Number(y) + (sign === '+' ? Number(off) : sign === '−' ? -Number(off) : 0);
      const diff = Number(a) - Number(b) - second;
      const right = rightOption(ex);
      seen.add(right);
      expect(right, ex.key).toBe(diff === 0 ? 'Beide Wege geben dasselbe Ergebnis.' : `Der zweite Weg gibt ${diff} weniger.`);
    }
    expect(starts.size).toBe(2);
    expect(seen.size).toBeGreaterThan(5);
  });

  it('follows the method: a minus task on paper is solved in it', () => {
    expect(kopfOderSchriftlichSkill.usesMethod).toBe(true);
  });
});
