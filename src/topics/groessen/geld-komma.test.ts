import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { moneyLabel } from '../../ui/visuals/MoneyVisual';
import { placeValueAriaLabel } from '../../ui/visuals/PlaceValueVisual';
import { checkWorkedSolution } from '../step-check';
import { cents } from '../test-utils';
import { byAb, conversionProblem, orderStepProblems, pluralProblems } from './test-support';
import { geldKommaSkill } from './geld-komma';

describeSkill(geldKommaSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

describe('groessen.geld-komma', () => {
  it('worked solutions add up, and every expression recomputes to its answer', () => {
    for (const ex of byAb(geldKommaSkill)) {
      expect(checkWorkedSolution(ex)).toEqual([]);
      if (ex.expression?.includes('=')) expect(conversionProblem(ex), ex.key).toBeNull();
    }
  });

  it('AB I keeps whole tens of cents, AB II brings the leading zero', () => {
    for (const ex of byAb(geldKommaSkill, 1)) {
      const ct = cents(ex.expression ?? '0 ct') % 100;
      if (ex.expression) expect(ct % 10, ex.key).toBe(0);
    }
    const zero = byAb(geldKommaSkill, 2).filter((ex) => /\d,0\d/.test(ex.expression ?? ''));
    expect(zero.length).toBeGreaterThan(20);
  });

  it('Stufe 1 keeps whole tens of cents at every AB level: no leading zero before Stufe 2 (G7)', () => {
    const amounts = (text: string) => [...text.replace(/\u00A0/g, ' ').matchAll(/\d+,\d\d €|\d+ ct/g)].map((m) => cents(m[0]) % 100);
    for (const ex of byAb(geldKommaSkill).filter((e) => e.stufe === 1)) {
      const a = ex.answer;
      for (const ct of amounts([ex.expression ?? '', ...(a.kind === 'order' ? a.items : [])].join(' '))) expect(ct % 10, ex.key).toBe(0);
      if (a.kind === 'number') expect(Math.round((a.value as number) * 100) % 10, ex.key).toBe(0);
      if (a.kind === 'multi') expect(a.fields[a.fields.length - 1].value % 10, ex.key).toBe(0);
    }
  });

  it('3,05 € read as 3 € 50 ct gets the hint about the 2 places', () => {
    const ex = byAb(geldKommaSkill, 2).find((e) => e.stufe === 2 && e.key.includes(':komma:') && e.answer.kind === 'multi')!;
    const bug = ex.bugs!.find((b) => b.id === 'komma-einstellig')!;
    const answer = ex.answer;
    if (answer.kind !== 'multi') throw new Error('multi expected');
    const values = Object.fromEntries(Object.entries(bug.match as Record<string, number>).map(([k, v]) => [k, String(v)]));
    expect(checkAnswer(answer, { kind: 'multi', values }, ex.bugs).bugHint).toMatch(/2 Stellen/);
  });

  it('order tasks: the correct order sorts the amounts by their value', () => {
    let seen = 0;
    for (const ex of byAb(geldKommaSkill, 3)) {
      if (ex.answer.kind !== 'order') continue;
      seen++;
      const values = ex.answer.correct.map((i) => cents((ex.answer as { items: string[] }).items[i]));
      const sorted = [...values].sort((a, b) => (ex.answer.kind === 'order' && ex.answer.direction === 'aufsteigend' ? a - b : b - a));
      expect(values, ex.key).toEqual(sorted);
      expect(new Set(values).size).toBe(values.length);
      expect(orderStepProblems(ex)).toEqual([]);
      expect(ex.prompt, ex.key).toContain(ex.answer.direction === 'aufsteigend' ? 'kleinsten' : 'größten');
      expect(ex.srText, ex.key).toContain(ex.answer.direction === 'aufsteigend' ? 'kleinsten' : 'größten');
      expect(ex.srText.split(', ').length, ex.key).toBe(ex.answer.items.length);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('the value 1 takes the singular in every text', () => {
    for (const ex of byAb(geldKommaSkill)) expect(pluralProblems(ex)).toEqual([]);
  });

  it('srText holds what the money picture and the filled table show: the answer field is described by it alone', () => {
    let seen = 0;
    for (const ex of byAb(geldKommaSkill)) {
      if (ex.visual?.type === 'money') expect(ex.srText, ex.key).toContain(moneyLabel(ex.visual));
      else if (ex.visual?.type === 'placeValue' && ex.answer.kind === 'number') expect(ex.srText, ex.key).toContain(placeValueAriaLabel(ex.visual));
      else continue;
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the Stellenwerttafel shows the digits of the amount', () => {
    let seen = 0;
    for (const ex of byAb(geldKommaSkill, 3)) {
      if (ex.visual?.type !== 'placeValue' || ex.answer.kind !== 'number') continue;
      seen++;
      const [a, b, c, d] = ex.visual.rows[0].values as number[];
      expect(Math.round((ex.answer.value as number) * 100), ex.key).toBe(a * 1000 + b * 100 + c * 10 + d);
      expect(ex.visual.headers).toEqual(['10 €', '1 €', '10 ct', '1 ct']);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('the money picture shows the amount of the answer', () => {
    let seen = 0;
    for (const ex of byAb(geldKommaSkill, 1)) {
      if (ex.visual?.type !== 'money' || ex.answer.kind !== 'number') continue;
      seen++;
      expect(ex.visual.items.reduce((s, c) => s + c, 0), ex.key).toBe(Math.round((ex.answer.value as number) * 100));
    }
    expect(seen).toBeGreaterThan(20);
  });
});
