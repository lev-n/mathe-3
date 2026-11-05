import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { FactBox, GenContext } from '../../core/types';
import { DIV_FACT_KEYS, factFactors, isDivisionFact } from '../../state/facts';
import { CTX, samples } from '../test-utils';
import { DIV_INTRO_ORDER, divPool, pickFact } from './facts';
import { formOf, itRecomputes, itStaysReadable } from './testkit';
import { geteiltAufgabe, umkehrenSkill } from './umkehren';

describeSkill(umkehrenSkill);

describe('kopfrechnen.umkehren', () => {
  itRecomputes(umkehrenSkill);
  itStaysReadable(umkehrenSkill);

  it('all 90 Geteiltaufgaben are in the order, once', () => {
    expect(DIV_INTRO_ORDER).toHaveLength(90);
    expect([...DIV_INTRO_ORDER].sort()).toEqual([...DIV_FACT_KEYS].sort());
  });

  it('the Stufen hold the catalogue’s facts', () => {
    expect(divPool(1).every((k) => [1, 2, 5, 10].includes(factFactors(k)[1]))).toBe(true);
    expect(divPool(1)).toHaveLength(36);
    expect(divPool(2)).toHaveLength(90);
    expect(divPool(3).every((k) => ![1, 2, 5, 10].includes(factFactors(k)[1]))).toBe(true);
  });

  it('never divides by 0, and every division comes out whole', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(umkehrenSkill, stufe)) {
        for (const m of (ex.expression ?? '').matchAll(/(\d+) : (\d+)/g)) {
          expect(Number(m[2]), ex.key).toBeGreaterThan(0);
          expect(Number(m[1]) % Number(m[2]), ex.key).toBe(0);
        }
      }
    }
  });

  it('recall forms feed the boxes of the Geteiltaufgaben, forms that show the Malaufgabe do not', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(umkehrenSkill, stufe)) {
        const form = formOf(ex);
        if (form === 'geteilt' || form === 'teiler') {
          const [p, d] = ex.key.split(':').slice(3);
          expect(ex.factKey).toBe(`${p}:${d}`);
          expect(isDivisionFact(ex.factKey as string)).toBe(true);
        }
        if (['aus-mal', 'hilfe', 'zahl', 'familie', 'selbst'].includes(form)) expect(ex.factKey, ex.key).toBeUndefined();
      }
    }
  });

  it('due facts come first', () => {
    const facts: Record<string, FactBox> = {};
    DIV_INTRO_ORDER.forEach((k) => (facts[k] = { box: 5, due: '2026-12-01' }));
    facts['56:7'] = { box: 2, due: '2026-10-10' };
    const c: GenContext = { ...CTX, facts, today: '2026-10-19' };
    for (let i = 0; i < 40; i++) expect(pickFact(createRng(i), c, divPool(2))).toBe('56:7');
  });

  it('a family holds the Tauschaufgabe and both Geteiltaufgaben, each worked out', () => {
    const items = samples(umkehrenSkill, 3).filter((e) => formOf(e) === 'familie');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      expect(ex.answer.fields).toHaveLength(3);
      expect(ex.bugs?.[0].id).toBe('familie-vertauscht');
    }
  });

  it('Stufe 3 has the missing divisor, and a story never has a group of 1', () => {
    expect(new Set(samples(umkehrenSkill, 3).map(formOf))).toContain('teiler');
    for (const ex of samples(umkehrenSkill, 2, 2000).filter((e) => e.context)) expect(ex.context, ex.key).not.toMatch(/ 1 (Bücher|Kinder)/);
  });

  it('a story has quantities that can be true', () => {
    const stories = [...samples(umkehrenSkill, 2, 2000), ...samples(umkehrenSkill, 3, 2000)].filter((e) => e.context);
    expect(stories.some((e) => e.context?.includes('Bücherei'))).toBe(true);
    // a shelf holds far more than 10 books, a library far more than 100
    for (const ex of stories) expect(`${ex.context} ${ex.prompt}`, ex.key).not.toMatch(/Regal/);
  });

  it('a family speaks of Zahlen, in main clauses (T5, T11)', () => {
    const items = samples(umkehrenSkill, 3, 2000).filter((e) => formOf(e) === 'familie');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      for (const hint of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) {
        expect(hint, ex.key).not.toMatch(/Faktor/);
        expect(hint, ex.key).not.toMatch(/^\p{Lu}\p{Ll}*st du\b[^.?!]*,/u);
      }
    }
  });

  it('computes the bugs on an example', () => {
    const g = geteiltAufgabe(56, 7);
    expect(g.bugs?.filter((b) => b.id === 'nachbar').map((b) => b.match)).toEqual([7, 9]);
    expect(g.bugs?.find((b) => b.id === 'minus-gerechnet')?.match).toBe(49);
    expect(g.factKey).toBe('56:7');
  });

  it('the twin of a Geteiltaufgabe keeps the divisor, with a quotient of the same kind', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const ex = umkehrenSkill.generate(createRng(seed), 1, { ...CTX, ab: 1, similarTo: '56:7' });
      seen.add(ex.factKey as string);
    }
    expect([...seen].sort()).toEqual(['42:7', '49:7', '63:7']);
    for (const key of DIV_FACT_KEYS) expect(umkehrenSkill.generate(createRng(3), 1, { ...CTX, similarTo: key }).factKey, key).not.toBe(key);
  });
});
