import { describe, expect, it } from 'vitest';
import { generateUnique } from '../../core/generate';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { FactBox, GenContext } from '../../core/types';
import { MUL_FACT_KEYS, factFactors, isDivisionFact } from '../../state/facts';
import { updateFact } from '../../state/mastery';
import type { FactProgress } from '../../state/types';
import { CTX, samples } from '../test-utils';
import { einmaleinsSkill, malAufgabe } from './einmaleins';
import { MUL_INTRO_ORDER, factKind, fastHint, malHint, malSteps, mulPool, pickFact } from './facts';
import { bugMatch, formOf, itRecomputes, itStaysReadable } from './testkit';

describeSkill(einmaleinsSkill);

const TODAY = '2026-10-19';
const ctx = (facts: Record<string, FactBox>): GenContext => ({ ...CTX, facts, today: TODAY });

describe('kopfrechnen.einmaleins: the 100 facts', () => {
  it('all 100 Malaufgaben are in the order, once', () => {
    expect(MUL_INTRO_ORDER).toHaveLength(100);
    expect([...MUL_INTRO_ORDER].sort()).toEqual([...MUL_FACT_KEYS].sort());
  });

  it('the Stufen hold the catalogue’s facts: Kern and squares, then all, then the hard ones', () => {
    expect(mulPool(1)).toHaveLength(70);
    expect(mulPool(2)).toHaveLength(100);
    expect(mulPool(3)).toHaveLength(30);
    expect(mulPool(1).every((k) => factKind(...factFactors(k)) !== 'schwer')).toBe(true);
    expect(mulPool(3).every((k) => factKind(...factFactors(k)) === 'schwer')).toBe(true);
  });

  it('is never row by row: no two neighbouring facts follow on in a row', () => {
    for (let i = 1; i < MUL_INTRO_ORDER.length; i++) {
      const [a1, b1] = factFactors(MUL_INTRO_ORDER[i - 1]);
      const [a2, b2] = factFactors(MUL_INTRO_ORDER[i]);
      expect(a1 === a2 && Math.abs(b1 - b2) === 1, `${MUL_INTRO_ORDER[i - 1]} ${MUL_INTRO_ORDER[i]}`).toBe(false);
      expect(b1 === b2 && Math.abs(a1 - a2) === 1, `${MUL_INTRO_ORDER[i - 1]} ${MUL_INTRO_ORDER[i]}`).toBe(false);
    }
  });

  it('a new learner starts with Kernaufgaben and a Punktefeld', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const ex = einmaleinsSkill.generate(createRng(seed), 1, { ...ctx({}), ab: 1 });
      expect(factKind(...factFactors(ex.factKey as string))).toBe('kern');
      expect(ex.visual?.type).toBe('dotArray');
    }
  });

  it('due facts come first, inside the Stufe', () => {
    const facts: Record<string, FactBox> = {};
    MUL_INTRO_ORDER.forEach((k) => (facts[k] = { box: 5, due: '2026-12-01' }));
    facts['7x8'] = { box: 3, due: '2026-10-10' };
    const picks = Array.from({ length: 50 }, (_, i) => pickFact(createRng(i), ctx(facts), mulPool(2)));
    expect(new Set(picks)).toEqual(new Set(['7x8']));
    // 7 · 8 is no fact of Stufe 1
    expect(pickFact(createRng(1), ctx(facts), mulPool(1))).not.toBe('7x8');
  });

  it('new facts wait while four facts are open', () => {
    const facts: Record<string, FactBox> = {};
    MUL_INTRO_ORDER.slice(0, 4).forEach((k) => (facts[k] = { box: 0, due: '2026-10-20' }));
    for (let i = 0; i < 100; i++) expect(MUL_INTRO_ORDER.slice(0, 4)).toContain(pickFact(createRng(i), ctx(facts), mulPool(1)));
  });

  it('with the real boxes a fluent child meets many facts, none drilled, and all 100 over the days', () => {
    let facts: Record<string, FactProgress> = {};
    const first: string[] = [];
    let seed = 1;
    for (let day = 0; day < 30; day++) {
      const today = new Date(Date.parse(`${TODAY}T00:00:00Z`) + day * 86_400_000).toISOString().slice(0, 10);
      const recent = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const ex = generateUnique(einmaleinsSkill, 2, seed++, { ...CTX, facts, today, ab: 1 }, recent);
        recent.add(ex.key);
        const k = ex.factKey as string;
        if (day === 0) first.push(k);
        facts = { ...facts, [k]: updateFact(facts[k], true, today) };
      }
    }
    expect(new Set(first).size).toBeGreaterThanOrEqual(12);
    expect(Math.max(...[...new Set(first)].map((k) => first.filter((x) => x === k).length))).toBeLessThanOrEqual(3);
    expect(Object.keys(facts)).toHaveLength(100);
  });
});

describe('kopfrechnen.einmaleins: tasks', () => {
  itRecomputes(einmaleinsSkill);
  itStaysReadable(einmaleinsSkill);

  it('only recall forms feed the boxes, with the fact as it is written', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(einmaleinsSkill, stufe)) {
        const form = formOf(ex);
        if (form === 'mal' || form === 'faktor') {
          const [a, b] = ex.key.split(':').slice(3).map(Number);
          expect(ex.factKey).toBe(`${a}x${b}`);
          expect(isDivisionFact(ex.factKey as string)).toBe(false);
        } else {
          expect(ex.factKey, ex.key).toBeUndefined();
        }
      }
    }
  });

  it('the Stufen have their forms: missing factor on 2, a choice of the way on 3', () => {
    expect(new Set(samples(einmaleinsSkill, 2).map(formOf))).toContain('faktor');
    expect(new Set(samples(einmaleinsSkill, 3).map(formOf))).toContain('weg');
  });

  it('Stufe 3 offers exactly one Rechnung that fits', () => {
    const value = (label: string) => {
      const terms = label.split(/ (?=[+−] )/);
      return terms.reduce((sum, t) => {
        const minus = t.startsWith('−');
        const m = t.replace(/^[+−] /, '').split(' · ').reduce((x, y) => x * Number(y), 1);
        return minus ? sum - m : sum + m;
      }, 0);
    };
    const items = samples(einmaleinsSkill, 3).filter((e) => formOf(e) === 'weg');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [a, b] = ex.key.split(':').slice(3).map(Number);
      ex.answer.options.forEach((o, i) => expect(value(o.label) === a * b, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('reads the first factor as the groups, also with 1 and 0', () => {
    for (let n = 2; n <= 10; n++) {
      expect(malHint(n, 1), `${n} · 1`).toBe('Die erste Zahl sagt: Wie oft nimmst du die 1?');
      expect(malSteps(n, 1)[0]).toBe(`${n}-mal die 1: Du zählst bis ${n}.`);
      expect(malHint(1, n), `1 · ${n}`).toBe('Du nimmst die zweite Zahl genau einmal.');
      expect(malSteps(1, n)[0]).toBe(`Du nimmst die ${n} genau einmal.`);
      // picture, bug hint and steps of one item tell the same meaning
      expect(malAufgabe(n, 1, true).bugs?.find((b) => b.id === 'mal-als-plus')?.hint).toContain(`${n}-mal die 1`);
    }
    const zero = samples(einmaleinsSkill, 2, 4000).filter((e) => formOf(e) === 'null');
    const [nullFirst, nullLast] = [zero.filter((e) => e.key.endsWith(':l')), zero.filter((e) => e.key.endsWith(':r'))];
    expect(nullFirst.length).toBeGreaterThan(0);
    expect(nullLast.length).toBeGreaterThan(0);
    for (const ex of nullFirst) expect(ex.hints[1], ex.key).toBe('Stell dir vor: Es gibt gar keinen Teller.');
    for (const ex of nullLast) expect(ex.hints[1], ex.key).toBe('Stell dir leere Teller vor.');
  });

  it('Stufe 1 doubles only inside its pool: the fact shown and the fact asked', () => {
    const items = samples(einmaleinsSkill, 1, 4000).filter((e) => formOf(e) === 'doppelt');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [a, b] = ex.key.split(':').slice(3).map(Number);
      expect(factKind(a, b), `${ex.key}: shown`).not.toBe('schwer');
      expect(factKind(2 * a, b), `${ex.key}: asked`).not.toBe('schwer');
    }
  });

  it('the hints of the zerlegen form leave every field to the child', () => {
    const items = samples(einmaleinsSkill, 3, 2000).filter((e) => formOf(e) === 'zerlegen');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      const [a, b] = ex.key.split(':').slice(3).map(Number);
      const known = new Set(ex.answer.fields.flatMap((f) => (f.before ?? '').match(/\d+/g) ?? []).concat(String(a), String(b)));
      for (const hint of ex.hints) {
        for (const f of ex.answer.fields) if (!known.has(String(f.value))) expect(hint.split(/\D+/), `${ex.key}: ${f.id} in ${hint}`).not.toContain(String(f.value));
      }
    }
  });

  it('a fact with and without its picture is one task', () => {
    expect(malAufgabe(2, 4, true).key).toBe(malAufgabe(2, 4, false).key);
  });

  it('computes the §5 bugs', () => {
    const m = (a: number, b: number) => ({ ...malAufgabe(a, b, false), ab: 1 as const });
    expect(m(4, 6).bugs?.filter((b) => b.id === 'operand').map((b) => b.match)).toEqual(expect.arrayContaining([18, 28]));
    expect(m(6, 8).bugs?.find((b) => b.id === 'mal-als-plus')?.match).toBe(14);
    expect(m(4, 6).bugs?.find((b) => b.id === 'operand')?.hint).toBe('Fast! Rechne 2 · 6 und verdopple.');
    const zero = samples(einmaleinsSkill, 2, 2000).find((e) => formOf(e) === 'null');
    expect(zero && bugMatch(zero, 'mal-null')).toHaveLength(1);
  });

  it('derives from the nearest known task, never naming the result in a hint', () => {
    expect(malSteps(6, 7)).toEqual(['Kernaufgabe: 5 · 7 = 35.', 'Einmal die 7 mehr: 35 + 7 = 42.', 'Also: 6 · 7 = 42.']);
    expect(malSteps(8, 7)[0]).toBe('Quadrataufgabe: 7 · 7 = 49.');
    expect(malSteps(9, 7)[1]).toBe('Einmal die 7 weniger: 70 − 7 = 63.');
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        for (const hint of [malHint(a, b), fastHint(a, b)]) expect(hint.split(/\D+/).includes(String(a * b)), `${a} · ${b}: ${hint}`).toBe(false);
      }
    }
  });

  it('the twin of a fact is a fact worked out the same way, whatever the pool of the slot holds', () => {
    const twins = (factKey: string, extra: Partial<GenContext> = {}) =>
      Array.from({ length: 300 }, (_, i) => generateUnique(einmaleinsSkill, 1, i + 1, { ...ctx({ '7x8': { box: 1, due: '2026-10-20' }, '3x4': { box: 2 } }), ab: 1, similarTo: factKey, ...extra }).factKey as string);
    for (const k of twins('7x8')) {
      const [a, b] = factFactors(k);
      expect(factKind(a, b), k).toBe('schwer');
      expect(a === 7 || b === 8, k).toBe(true);
    }
    expect(new Set(twins('6x7')).size).toBeGreaterThan(1);
    // 5 · 7 + 7: the same start in the same place, and another factor.
    for (const k of twins('6x7')) expect(k, k).toMatch(/^6x/);
    for (const k of twins('2x7')) expect(k, k).toMatch(/^2x/);
    for (const k of twins('7x2')) expect(k, k).toMatch(/x2$/);
    expect(twins('2x7', { avoidFacts: ['2x6', '2x8'] })).not.toContain('2x6');
  });

  it('every fact has a twin that is neither the fact nor its Tauschaufgabe', () => {
    for (const key of MUL_FACT_KEYS) {
      const [a, b] = factFactors(key);
      for (let seed = 1; seed <= 12; seed++) {
        const ex = einmaleinsSkill.generate(createRng(seed), 1, { ...CTX, ab: 1, similarTo: key });
        const [x, y] = factFactors(ex.factKey as string);
        expect(x * y, `${key} → ${ex.factKey}`).not.toBe(a * b);
      }
    }
  });
});
