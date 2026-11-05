import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { spokenWords } from '../../core/format';
import type { Exercise, VisualOf } from '../../core/types';
import { stellengerechtSkill } from './stellengerecht';
import { at, everything, formOf, formsOf, rightOption, sharedChecks } from './test-helpers';

describeSkill(stellengerechtSkill);

/** A row of a table is right-aligned if it has no empty cell after its first digit and ends at the Einer. */
const aligned = (t: VisualOf<'placeValue'>) => t.rows.every((r) => r.values[r.values.length - 1] !== null);

const len = (n: number) => String(n).length;
const digit = (n: number, p: number) => Math.floor(n / 10 ** p) % 10;
const termNumbers = (text: string) => text.split(' + ').map(Number);

/** 'Schreib 378 + 214 untereinander. Unter welcher Ziffer steht die 4?': worked out by the place of the digit. */
function expectUnter(ex: Exercise, lenB: number): void {
  const [, a, b, low] = /Schreib (\d+) \+ (\d+) untereinander\. Unter welcher Ziffer steht die (\d)\?/.exec(ex.prompt) as RegExpExecArray;
  expect([a.length, b.length], ex.key).toEqual([3, lenB]);
  const place = b.length - 1 - b.indexOf(low);
  expect(rightOption(ex), ex.key).toBe(`unter der Ziffer ${digit(Number(a), place)}`);
}

describe('schriftlich.stellengerecht', () => {
  sharedChecks(stellengerechtSkill);

  it('a choice of tables fits a phone: at most 2 tables of 2 rows, as every table takes a row of its own', () => {
    let seen = 0;
    for (const ex of everything(stellengerechtSkill, 60)) {
      if (ex.answer.kind !== 'choice') continue;
      const tables = ex.answer.options.flatMap((o) => (o.visual?.type === 'placeValue' ? [o.visual] : []));
      if (tables.length === 0) continue;
      seen++;
      expect(tables.length, ex.key).toBe(2);
      for (const t of tables) expect(t.rows.length, ex.key).toBe(2);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('every task keeps its sum up to 1000 (§6), also in the last picture', () => {
    for (const ex of everything(stellengerechtSkill)) {
      const last = ex.steps[ex.steps.length - 1];
      const operands = typeof last !== 'string' && last.visual?.type === 'written' ? last.visual.operands : null;
      if (!operands) throw new Error(ex.key);
      expect(operands.reduce((s, n) => s + n, 0), ex.key).toBeLessThanOrEqual(1000);
    }
  });

  it('AB 2: the voice says the digit of "unter der Ziffer 5", not a date', () => {
    expect(spokenWords('unter der Ziffer 5.')).toBe('unter der Ziffer fünf.');
    expect(spokenWords('unter der Ziffer 0.')).toBe('unter der Ziffer null.');
  });

  it('Stufe 1: 2 numbers with 3 digits: is it right, then which layout, then the digit above', () => {
    expect(formsOf(at(stellengerechtSkill, 1, 1))).toEqual(['janein']);
    for (const ex of at(stellengerechtSkill, 1, 1)) {
      expect(rightOption(ex), ex.key).toBe(aligned(ex.visual as VisualOf<'placeValue'>) ? 'Ja' : 'Nein');
      expect(termNumbers(ex.expression as string).map(len), ex.key).toEqual([3, 3]);
    }
    expect(formsOf(at(stellengerechtSkill, 1, 2))).toEqual(['wahl']);
    for (const ex of at(stellengerechtSkill, 1, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      ex.answer.options.forEach((o, i) => expect(aligned(o.visual as VisualOf<'placeValue'>), ex.key).toBe(i === (ex.answer as { correct: number }).correct));
      expect(termNumbers(ex.expression as string).map(len), ex.key).toEqual([3, 3]);
    }
    expect(formsOf(at(stellengerechtSkill, 1, 3))).toEqual(['unter']);
    for (const ex of at(stellengerechtSkill, 1, 3)) expectUnter(ex, 3);
  });

  it('Stufe 2: a long and a short number: which layout, then the digits in columns, then reasoning', () => {
    expect(formsOf(at(stellengerechtSkill, 2, 1))).toEqual(['wahl2']);
    for (const ex of at(stellengerechtSkill, 2, 1)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      ex.answer.options.forEach((o, i) => expect(aligned(o.visual as VisualOf<'placeValue'>), ex.key).toBe(i === (ex.answer as { correct: number }).correct));
      expect(termNumbers(ex.expression as string).map(len), ex.key).toEqual([3, 2]);
    }
    expect(formsOf(at(stellengerechtSkill, 2, 2))).toEqual(['felder']);
    const answers = new Set<string>();
    for (const ex of at(stellengerechtSkill, 2, 2)) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      const b = Number((/felder:\d+\|(\d+)/.exec(ex.key) as RegExpExecArray)[1]);
      const a = Number((/felder:(\d+)/.exec(ex.key) as RegExpExecArray)[1]);
      const [z, e] = ex.answer.fields;
      // the fields name digits of the long number, not the places: the long number counts
      expect([z.before, z.value], ex.key).toEqual([`Unter der Ziffer ${digit(a, 1)}:`, Math.floor(b / 10)]);
      expect([e.before, e.value], ex.key).toEqual([`Unter der Ziffer ${digit(a, 0)}:`, b % 10]);
      expect(ex.bugs?.[0]?.match, ex.key).toEqual({ z: b % 10, e: Math.floor(b / 10) });
      // the table holds only the upper number: its head names the places, and no empty row looks like an input
      expect((ex.visual as VisualOf<'placeValue'>).rows.length, ex.key).toBe(1);
      expect(ex.prompt, ex.key).not.toMatch(/Felder|Kästchen/);
      expect(ex.answer.kind, ex.key).not.toBe('cells');
      answers.add(`${z.value}${e.value}`);
    }
    expect(answers.size).toBeGreaterThan(10);
    expect(formsOf(at(stellengerechtSkill, 2, 3))).toEqual(['darunter', 'unter']);
    for (const ex of at(stellengerechtSkill, 2, 3)) {
      if (formOf(ex) === 'unter') {
        expectUnter(ex, 2);
        continue;
      }
      const [, a, b, top] = /Schreib (\d+) \+ (\d+) untereinander\. Was steht unter der Ziffer (\d)\?/.exec(ex.prompt) as RegExpExecArray;
      const place = 2 - a.indexOf(top);
      expect(rightOption(ex), ex.key).toBe(place === 2 ? 'Keine Ziffer' : `Die Ziffer ${digit(Number(b), place)}`);
    }
  });

  /** The Zehner of the numbers that have one, worked out from the end of each number. */
  const tens = (ns: readonly number[]) => ns.filter((n) => len(n) >= 2).map((n) => digit(n, 1));

  it('Stufe 3: one table of 3 numbers: which number is out of line, also none or the long one', () => {
    expect(formsOf(at(stellengerechtSkill, 3, 1))).toEqual(['welche']);
    const rights = new Set<string>();
    for (const ex of at(stellengerechtSkill, 3, 1, 'abziehen', 400)) {
      const t = ex.visual as VisualOf<'placeValue'>;
      const ns = termNumbers(ex.expression as string);
      expect(ns.length, ex.key).toBe(3);
      expect(new Set(ns.map(len)).size, ex.key).toBeGreaterThan(1);
      const out = ns.filter((_, i) => t.rows[i].values[t.rows[i].values.length - 1] === null);
      expect(out.length, ex.key).toBeLessThanOrEqual(1);
      const right = rightOption(ex);
      expect(right, ex.key).toBe(out.length ? String(out[0]) : 'Keine Zahl');
      rights.add(right === 'Keine Zahl' ? right : len(Number(right)) === 3 ? 'long' : 'short');
    }
    expect(rights).toEqual(new Set(['Keine Zahl', 'long', 'short']));
  });

  it('Stufe 3, AB 2 and 3: no picture at all: which digits stand at the Zehner, then what they give together', () => {
    expect(formsOf(at(stellengerechtSkill, 3, 2))).toEqual(['spalte']);
    for (const ex of at(stellengerechtSkill, 3, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.visual, ex.key).toBeUndefined();
      const ns = termNumbers(ex.expression as string);
      expect(ns.length, ex.key).toBe(3);
      expect(rightOption(ex), ex.key).toBe(tens(ns).join(', '));
      expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
    }
    expect(formsOf(at(stellengerechtSkill, 3, 3))).toEqual(['zehner']);
    for (const ex of at(stellengerechtSkill, 3, 3)) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      expect(ex.visual, ex.key).toBeUndefined();
      const ns = termNumbers(ex.expression as string);
      expect(ex.answer.value, ex.key).toBe(tens(ns).reduce((s, d) => s + d, 0));
    }
  });
});
