import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise } from '../../core/types';
import { hundredChartLabel } from '../../ui/visuals/HundredChartVisual';
import { ZELLEN, expectScope, kindOf, samplesIn, samplesOf, solutionProblems } from './testHelp';
import { tausenderbuchSkill } from './tausenderbuch';

describeSkill(tausenderbuchSkill);

const number = (ex: Exercise) => (ex.answer as AnswerOf<'number'>).value!;
function chart(ex: Exercise) {
  if (ex.visual?.type !== 'hundredChart') throw new Error(`${ex.key}: no chart`);
  return ex.visual;
}

describe('zahlen.tausenderbuch', () => {
  it('is an Extra', () => {
    expect(tausenderbuchSkill.optional).toBe('extra');
  });

  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(tausenderbuchSkill, {
      1: { 1: ['nachbar'], 2: ['feld', 'nachbar'], 3: ['feld', 'reihe'] },
      2: { 1: ['stueck'], 2: ['stueck', 'wo'], 3: ['stueck', 'wo'] },
      3: { 1: ['seiten'], 2: ['passtnichtwahl'], 3: ['passtnicht'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(tausenderbuchSkill)).toEqual([]);
  });

  it('Stufe 1: one whole page at every AB level; the masked cell holds the answer, a neighbour lies where the prompt says', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(tausenderbuchSkill, 1, ab)) {
        const v = chart(ex);
        expect(v.piece, ex.key).toBeUndefined();
        if (kindOf(ex) === 'reihe') continue;
        expect(v.masked).toEqual([number(ex)]);
        expect(number(ex)).toBeGreaterThanOrEqual(v.start);
        expect(number(ex)).toBeLessThanOrEqual(v.start + 99);
        if (kindOf(ex) === 'nachbar') {
          const n = Number(/(\d+)\?$/.exec(ex.prompt)![1]);
          expect(v.marked).toEqual([n]);
          const d = /rechts/.test(ex.prompt) ? 1 : /links/.test(ex.prompt) ? -1 : /unter/.test(ex.prompt) ? 10 : -10;
          expect(number(ex)).toBe(n + d);
          expect(Math.abs(d), ex.key).toBe(ab === 1 ? 1 : 10);
        }
      }
    }
  });

  it('Stufe 1, AB III: the row of a number is counted from the top, and an edge cell has a neighbour on one side only', () => {
    let reihen = 0;
    for (const ex of samplesOf(tausenderbuchSkill, 1, 3, 300)) {
      const v = chart(ex);
      if (kindOf(ex) === 'feld') {
        expect([0, 9], ex.key).toContain((number(ex) - v.start) % 10);
        continue;
      }
      reihen++;
      const n = Number(/(\d+)\?$/.exec(ex.prompt)![1]);
      expect(number(ex)).toBe(Math.floor((n - v.start) / 10) + 1);
      expect(v.masked, 'the whole page shows').toBeUndefined();
    }
    expect(reihen).toBeGreaterThan(50);
  });

  it('Stufe 2: a piece at every AB level; a cross, a staircase, two gaps; the chosen field is the place of the number', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(tausenderbuchSkill, 2, ab)) {
        const v = chart(ex);
        expect(v.piece, ex.key).toBeDefined();
        if (kindOf(ex) === 'stueck') {
          expect(v.masked).toContain(number(ex));
          expect(v.piece).toContain(number(ex));
          expect(v.masked![0]).toBe(number(ex));
          expect(v.piece!.length, ex.key).toBe(ab === 1 ? 5 : 6);
          expect(v.masked!.length, ex.key).toBe(ab === 3 ? 2 : 1);
        } else {
          const [c, t] = [...ex.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
          const a = ex.answer as AnswerOf<'choice'>;
          const masked = v.masked!;
          expect(masked.length).toBe(4);
          expect(masked).toContain(t);
          expect(v.piece).toContain(c);
          expect(masked).not.toContain(c);
          // the same kind of step in all four fields: straight on AB II, the corners on AB III
          for (const n of masked) expect(Math.abs(n - c) === 1 || Math.abs(n - c) === 10, ex.key).toBe(ab === 2);
          expect(a.options.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
          expect(masked[a.correct]).toBe(t);
        }
      }
    }
  });

  it('a retry never shows the answer: no item here is a one-cell painting, where the marks after a check would name the cell', () => {
    for (const ex of samplesIn(tausenderbuchSkill, ZELLEN)) expect(ex.answer.kind, ex.key).not.toBe('cells');
  });

  it('which field: a wrong field hears its own number, not the number to find', () => {
    let seen = 0;
    for (const ex of samplesIn(tausenderbuchSkill, [[2, 2], [2, 3]])) {
      if (kindOf(ex) !== 'wo') continue;
      seen++;
      const masked = chart(ex).masked!;
      const a = ex.answer as AnswerOf<'choice'>;
      a.options.forEach((o, i) => {
        if (i !== a.correct) expect(o.whyWrong, ex.key).toContain(`Dort steht ${masked[i]}.`);
      });
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('a piece: the field has a name in words', () => {
    const namen = new Set<string>();
    for (const ex of samplesIn(tausenderbuchSkill, [[2, 1], [2, 2], [2, 3]])) if (kindOf(ex) === 'stueck') namen.add((ex.answer as AnswerOf<'number'>).label!);
    expect(namen).toEqual(new Set(['Zahl im leeren Feld', 'Zahl im Feld A']));
  });

  it('Stufe 3, AB I: across two pages, in a table of 3 columns (4 of this size are wider than a 375 px phone); only + 10 or + 20 solves it, as no number stands beside the gap', () => {
    const tiefen = new Set<number>();
    for (const ex of samplesOf(tausenderbuchSkill, 3, 1, 300)) {
      if (ex.visual?.type !== 'table') throw new Error('no table');
      const v = ex.visual;
      expect(v.header.length).toBe(3);
      const r = v.rows.findIndex((row) => row.includes('□'));
      expect(r, ex.key).toBe(v.rows.length - 1);
      const i = v.rows[r].indexOf('□');
      for (const row of v.rows) row.forEach((t, k) => expect(t === '' || (t === '□' && k === i), ex.key).toBe(true));
      const oben = Number(v.header[i]);
      tiefen.add(r + 1);
      expect(number(ex), ex.key).toBe(oben + 10 * (r + 1));
      // really across pages: the column changes its Hunderter on the way
      expect(Math.floor(number(ex) / 100), ex.key).toBe(Math.floor(oben / 100) + 1);
      expect(oben % 100, ex.key).toBeGreaterThan(90);
    }
    expect(tiefen).toEqual(new Set([1, 2]));
  });

  it('the name of a page never says the number sought: no first or last cell as the gap', () => {
    let seen = 0;
    for (const ex of samplesIn(tausenderbuchSkill, [[1, 2], [1, 3]], 800)) {
      if (kindOf(ex) !== 'feld') continue;
      seen++;
      const shown = new RegExp(`(?<!\\d)${number(ex)}(?!\\d)`);
      expect(ex.srText, ex.key).not.toMatch(shown);
      expect(hundredChartLabel(chart(ex)), ex.key).not.toMatch(shown);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Stufe 3, AB II: choose the wrong number; AB III: name the number that belongs there', () => {
    for (const ab of [2, 3] as const) {
      for (const ex of samplesOf(tausenderbuchSkill, 3, ab)) {
        const v = chart(ex);
        const { cell, shows } = v.replaced![0];
        expect(shows).not.toBe(cell);
        expect(v.piece).not.toContain(shows);
        expect(shows).toBeLessThanOrEqual(1000);
        if (ab === 3) {
          expect(number(ex)).toBe(cell);
          expect((ex.bugs ?? []).map((b) => b.match)).toEqual([shows]);
        } else {
          const a = ex.answer as AnswerOf<'choice'>;
          expect(a.options[a.correct].label).toBe(String(shows));
          // every other option stands in the piece and is right where it stands
          for (const o of a.options) if (o.label !== String(shows)) expect(v.piece).toContain(Number(o.label));
          expect(new Set(a.options.map((o) => o.label)).has(String(cell))).toBe(false);
        }
      }
    }
  });
});
