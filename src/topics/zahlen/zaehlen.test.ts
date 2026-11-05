import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise } from '../../core/types';
import { numberLineAriaLabel } from '../../ui/visuals/NumberLineVisual';
import { ZELLEN, bugValue, expectScope, kindOf, samplesIn, samplesOf, solutionProblems } from './testHelp';
import { zaehlenSkill } from './zaehlen';

describeSkill(zaehlenSkill);

/** The row with the gaps filled in from the answer. */
function gefuellt(ex: Exercise): number[] {
  const values = (ex.answer as AnswerOf<'multi'>).fields.map((f) => f.value);
  return ex.expression!.split(', ').map((t) => (t === 'A' ? values[0] : t === 'B' ? values[1] : Number(t)));
}
const schrittVon = (ex: Exercise) => Number(/immer (\d+)/.exec(ex.prompt)![1]);
const richtungVon = (ex: Exercise) => (/weiter/.test(ex.prompt) ? 1 : -1);
const lueckenVon = (ex: Exercise) => ex.expression!.split(', ').flatMap((t, i) => (/[AB]/.test(t) ? [i] : []));
const hundert = (n: number) => Math.floor(n / 100);

describe('zahlen.zaehlen', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(zaehlenSkill, {
      1: { 1: ['reihe'], 2: ['reihe'], 3: ['reihe', 'schritte'] },
      2: { 1: ['reihe'], 2: ['reihe'], 3: ['reihe'] },
      3: { 1: ['reihe'], 2: ['reihe'], 3: ['regel', 'reihe'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(zaehlenSkill)).toEqual([]);
  });

  it('every filled row keeps its step, stays in 0–1000, and the prompt names the step', () => {
    for (const ex of samplesIn(zaehlenSkill, ZELLEN)) {
      if (kindOf(ex) !== 'reihe') continue;
      const row = gefuellt(ex);
      for (let i = 1; i < row.length; i++) expect(row[i] - row[i - 1]).toBe(richtungVon(ex) * schrittVon(ex));
      for (const n of row) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('Stufe 1: steps of 10 and 100 from a multiple at every AB level, and a step of 10 stays inside its hundred', () => {
    for (const ab of [1, 2, 3] as const) {
      const steps = new Set<number>();
      for (const ex of samplesOf(zaehlenSkill, 1, ab)) {
        if (kindOf(ex) !== 'reihe') continue;
        const s = schrittVon(ex);
        steps.add(s);
        const row = gefuellt(ex);
        for (const n of row) expect(n % s).toBe(0);
        if (s === 10) expect(new Set(row.map(hundert)).size).toBe(1);
      }
      expect(steps).toEqual(new Set([10, 100]));
    }
  });

  it('Stufe 1: AB I forwards with the gaps at the end, AB II both ways with gaps inside, AB III backwards or how many steps', () => {
    for (const ex of samplesOf(zaehlenSkill, 1, 1)) {
      expect(richtungVon(ex)).toBe(1);
    }
    expect(new Set(samplesOf(zaehlenSkill, 1, 2).map(richtungVon))).toEqual(new Set([1, -1]));
    for (const ex of samplesOf(zaehlenSkill, 1, 2)) {
      // a row up to 1000 keeps its last number shown (the line may not run past 1000): a gap at the end moves in, next to the other gap
      expect(ex.expression!.endsWith('1000') ? [[1, 3], [2, 3]] : [[1, 3], [2, 4]], ex.key).toContainEqual(lueckenVon(ex));
    }
    let schritte = 0;
    for (const ex of samplesOf(zaehlenSkill, 1, 3)) {
      if (kindOf(ex) === 'reihe') {
        expect(richtungVon(ex)).toBe(-1);
        continue;
      }
      schritte++;
      const [von, bis, schritt] = [...ex.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      expect(von % schritt).toBe(0);
      if (schritt === 10) expect(hundert(von)).toBe(hundert(bis));
      expect((ex.answer as AnswerOf<'number'>).value).toBe((bis - von) / schritt);
      expect(bugValue(ex, 'schritt-falsch')).toContain((bis - von) / schritt + 1);
    }
    expect(schritte).toBeGreaterThan(30);
  });

  it('Stufe 2: steps of 1 and 10 at every AB level, the first gap crosses a hundred, and the bugs compute from it', () => {
    for (const ab of [1, 2, 3] as const) {
      const steps = new Set<number>();
      for (const ex of samplesOf(zaehlenSkill, 2, ab, 200)) {
        const s = schrittVon(ex);
        steps.add(s);
        const row = gefuellt(ex);
        const i = lueckenVon(ex)[0];
        const a = row[i];
        expect(hundert(row[i - 1]), ex.key).not.toBe(hundert(a));
        const dir = richtungVon(ex);
        if (s === 1) expect(bugValue(ex, 'zaehlen-hunderter')).toContainEqual({ a: a - dir * 100 });
        else expect(bugValue(ex, 'zehner-ueber-hundert')).toEqual([{ a: a - dir * 100 }]);
        // 399 then 3100
        if (s === 1 && dir > 0) expect(bugValue(ex, 'zaehlen-hunderter')).toContainEqual({ a: Number(`${hundert(row[i - 1])}100`) });
      }
      expect(steps, `AB ${ab}`).toEqual(new Set([1, 10]));
    }
  });

  it('Stufe 2: AB I forwards from a full ten, AB II any Einer or backwards, AB III backwards with B further away', () => {
    for (const ex of samplesOf(zaehlenSkill, 2, 1)) {
      expect(richtungVon(ex)).toBe(1);
      if (schrittVon(ex) === 10) expect(gefuellt(ex)[0] % 10).toBe(0);
      expect(lueckenVon(ex)).toEqual([3, 4]);
    }
    for (const ex of samplesOf(zaehlenSkill, 2, 2)) {
      if (schrittVon(ex) === 10) expect(gefuellt(ex)[0] % 10, ex.key).not.toBe(0);
      else expect(richtungVon(ex)).toBe(-1);
      expect(lueckenVon(ex)).toEqual([3, 4]);
    }
    for (const ex of samplesOf(zaehlenSkill, 2, 3)) {
      expect(richtungVon(ex)).toBe(-1);
      expect(lueckenVon(ex)).toEqual([2, 4]);
    }
  });

  it('Stufe 3: steps of 25 and 50; AB I forwards from a multiple, AB II any start in both ways, AB III the rule and backwards', () => {
    for (const ex of samplesOf(zaehlenSkill, 3, 1)) {
      const s = schrittVon(ex);
      expect([25, 50]).toContain(s);
      expect(richtungVon(ex)).toBe(1);
      expect(gefuellt(ex)[0] % s).toBe(0);
    }
    const anyStart = new Set<number>();
    const wege = new Set<number>();
    for (const ex of samplesOf(zaehlenSkill, 3, 2)) {
      expect([25, 50]).toContain(schrittVon(ex));
      anyStart.add(gefuellt(ex)[0] % 5);
      wege.add(richtungVon(ex));
    }
    expect(anyStart.size).toBeGreaterThan(1);
    expect(wege).toEqual(new Set([1, -1]));
    for (const ex of samplesOf(zaehlenSkill, 3, 3)) {
      if (kindOf(ex) === 'reihe') {
        expect([25, 50]).toContain(schrittVon(ex));
        expect(richtungVon(ex)).toBe(-1);
      } else {
        const zahlen = ex.expression!.split(', ').map(Number);
        const [schritt, next] = (ex.answer as AnswerOf<'multi'>).fields.map((f) => f.value);
        expect(Math.abs(zahlen[1] - zahlen[0])).toBe(schritt);
        expect(next - zahlen[3]).toBe(zahlen[1] - zahlen[0]);
        expect(next).toBeLessThanOrEqual(1000);
        expect(next).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('no Stufe borrows steps: 100 stays on Stufe 1, 1 on Stufe 2, 25 and 50 on Stufe 3', () => {
    const stepsOf = (stufe: 1 | 2 | 3) => new Set(([1, 2, 3] as const).flatMap((ab) => samplesOf(zaehlenSkill, stufe, ab)).filter((ex) => kindOf(ex) === 'reihe').map(schrittVon));
    expect(stepsOf(1)).toEqual(new Set([10, 100]));
    expect(stepsOf(2)).toEqual(new Set([1, 10]));
    expect(stepsOf(3)).toEqual(new Set([25, 50]));
  });

  it('the line never gives a gap away: not at its ends, not in its accessible name, and inside 0–1000', () => {
    let amEnde = 0;
    let bisTausend = 0;
    for (const ex of samplesIn(zaehlenSkill, ZELLEN, 300)) {
      if (kindOf(ex) !== 'reihe') continue;
      if (ex.visual?.type !== 'numberLine') throw new Error('no line');
      const { min, max } = ex.visual;
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(1000);
      const row = gefuellt(ex);
      const name = numberLineAriaLabel(ex.visual);
      const teile = ex.expression!.split(', ');
      const luecken = row.filter((_, i) => /[AB]/.test(teile[i]));
      for (const n of luecken) {
        expect([min, max], ex.key).not.toContain(n);
        expect(name, `${ex.key}: ${name}`).not.toMatch(new RegExp(`(?<!\\d)${n}(?!\\d)`));
        expect(ex.visual.labels, ex.key).not.toContain(n);
      }
      if (/[AB]/.test(teile[4])) amEnde++;
      if (row.includes(1000) && richtungVon(ex) > 0) {
        bisTausend++;
        expect(teile[4], ex.key).toBe('1000');
      }
    }
    expect(amEnde).toBeGreaterThan(100);
    expect(bisTausend).toBeGreaterThan(5);
  });
});
