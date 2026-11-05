import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { speak } from '../../core/format';
import { rulerLabel } from '../../ui/visuals/RulerVisual';
import { checkWorkedSolution } from '../step-check';
import { byAb, conversionProblem, orderStepProblems, pluralProblems } from './test-support';
import { laengenSkill } from './laengen';

describeSkill(laengenSkill, { minDistinct: { 1: 20, 2: 30, 3: 30 } });

/** A length as it is printed, in mm: '1,20 m', '1 m 5 cm', '35 mm', '3 cm 5 mm'. */
function inMm(text: string): number {
  const t = text.replace(/ /g, ' ');
  const comma = /^(\d+),(\d\d) m$/.exec(t);
  if (comma) return Number(comma[1]) * 1000 + Number(comma[2]) * 10;
  const unit: Record<string, number> = { mm: 1, cm: 10, m: 1000 };
  return [...t.matchAll(/(\d+) (mm|cm|m)\b/g)].reduce((s, m) => s + Number(m[1]) * unit[m[2]], 0);
}

describe('groessen.laengen', () => {
  it('worked solutions add up, and every expression recomputes to its answer', () => {
    for (const ex of byAb(laengenSkill)) {
      expect(checkWorkedSolution(ex)).toEqual([]);
      expect(conversionProblem(ex), ex.key).toBeNull();
    }
  });

  it('AB I measures on the ruler: the answer is the drawn length', () => {
    for (const ex of byAb(laengenSkill, 1)) {
      if (ex.visual?.type !== 'ruler') throw new Error('ruler expected');
      const a = ex.answer;
      const shown = a.kind === 'number' ? (a.value as number) * 10 : a.kind === 'multi' ? a.fields[0].value * 10 + a.fields[1].value : -1;
      expect(shown, ex.key).toBe(ex.visual.lengthMm);
    }
  });

  it('Stufe 1 measures in cm and mm: whole and half centimetres', () => {
    const measured = byAb(laengenSkill, 1).filter((e) => e.stufe === 1);
    for (const ex of measured) {
      if (ex.visual?.type === 'ruler') expect([0, 5], ex.key).toContain(ex.visual.lengthMm % 10);
    }
    expect(measured.filter((e) => e.answer.kind === 'multi').length).toBeGreaterThan(20);
    expect(measured.filter((e) => e.answer.kind === 'number').length).toBeGreaterThan(20);
  });

  it('Stufe 1 has no metres at any AB level: no comma with m (§2.2), and 2 m 15 cm starts on Stufe 2', () => {
    for (const ex of byAb(laengenSkill).filter((e) => e.stufe === 1)) {
      const a = ex.answer;
      const texts = [ex.expression ?? '', ...(a.kind === 'order' ? a.items : [])].join(' ').replace(/\u00A0/g, ' ');
      expect(texts, ex.key).not.toMatch(/\d m\b/);
    }
    expect(byAb(laengenSkill, 3).filter((e) => e.stufe === 2 && /\d,\d\d/.test(e.expression ?? '')).length).toBeGreaterThan(20);
  });

  it('1,20 m as 1 m 2 cm and 3 cm 5 mm as 305 mm are matched', () => {
    const comma = byAb(laengenSkill, 3).find((e) => e.key.includes(':kommacm:') && e.bugs?.some((b) => b.id === 'm-komma'))!;
    expect(comma.bugs!.some((b) => b.id === 'm-komma')).toBe(true);
    const mixed = byAb(laengenSkill, 2).find((e) => e.key.includes(':cmmm:'))!;
    const a = mixed.answer;
    if (a.kind !== 'number') throw new Error('number expected');
    const cm = Math.floor((a.value as number) / 10);
    expect(mixed.bugs!.find((b) => b.id === 'mm-cm')!.match).toBe(cm * 100 + (a.value as number) % 10);
  });

  it('order tasks sort by the length in mm', () => {
    let seen = 0;
    for (const ex of byAb(laengenSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'order') continue;
      seen++;
      const values = a.correct.map((i) => inMm(a.items[i]));
      const sorted = [...values].sort((x, y) => (a.direction === 'aufsteigend' ? x - y : y - x));
      expect(values, ex.key).toEqual(sorted);
      expect(new Set(values).size, ex.key).toBe(values.length);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('order tasks: the steps end in the target order, and task and srText name the direction and part the items', () => {
    let seen = 0;
    for (const ex of byAb(laengenSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'order') continue;
      seen++;
      expect(orderStepProblems(ex)).toEqual([]);
      expect(ex.prompt, ex.key).toContain(a.direction === 'aufsteigend' ? 'kleinsten' : 'größten');
      expect(ex.srText, ex.key).toContain(a.direction === 'aufsteigend' ? 'kleinsten' : 'größten');
      expect(ex.srText.split(', ').length, ex.key).toBe(a.items.length);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('srText holds what the ruler shows: the answer field is described by it alone', () => {
    let seen = 0;
    for (const ex of byAb(laengenSkill, 1)) {
      if (ex.visual?.type !== 'ruler') continue;
      seen++;
      expect(ex.srText, ex.key).toContain(speak(rulerLabel(ex.visual)));
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the value 1 takes the singular in every text', () => {
    for (const ex of byAb(laengenSkill)) expect(pluralProblems(ex)).toEqual([]);
  });
});
