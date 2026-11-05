import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, MultiAnswer, NumberAnswer, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { familyPhrase, tagFor } from '../errorFamilies';
import { CTX } from '../test-utils';
import { mengePreisSkill } from './menge-preis';

describeSkill(mengePreisSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => mengePreisSkill.generate(createRng(i * 503 + stufe), stufe, { ...CTX, ab })));
}

const value = (ex: Exercise) => (ex.answer as NumberAnswer).value as number;
const fields = (ex: Exercise) => Object.fromEntries((ex.answer as MultiAnswer).fields.map((f) => [f.id, f.value]));

describe('sachaufgaben.menge-preis', () => {
  it('AB I: double the amount, double the price, with the numbers in the table', () => {
    for (const ex of byAb(1)) {
      const [, , kind, , n, ct] = ex.key.split(':');
      expect(kind).toBe('doppelt');
      expect(Math.round(value(ex) * 100)).toBe(2 * Number(ct));
      const v = ex.visual!;
      if (v.type !== 'table') throw new Error(ex.key);
      expect(v.rows[0][0]).toBe(n);
      expect(v.rows[1]).toEqual([String(2 * Number(n)), '?']);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('AB II: every field is pieces · price; the number forms recompute from the key', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(2)) {
      const parts = ex.key.split(':');
      kinds.add(parts[2]);
      if (parts[2] === 'reihe') {
        const [start, p] = parts.slice(4).map(Number);
        const f = fields(ex);
        for (const n of [1, 2, 5, 10].filter((x) => x !== start)) expect(f[`s${n}`]).toBe(n * p);
        expect(Object.keys(f)).toHaveLength(3);
      } else {
        expect(parts[2]).toBe('zehn');
        const [from, to, p] = parts.slice(4).map(Number);
        expect(value(ex)).toBe(to * p);
        expect(ex.context).toContain(`${from * p}`);
      }
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['reihe', 'zehn']);
  });

  it('AB III: more helpers, less time; the product of helpers and time stays the same', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(3)) {
      const parts = ex.key.split(':');
      kinds.add(parts[2]);
      if (parts[2] === 'helfer') {
        const [g, h, m] = parts.slice(4).map(Number);
        expect(g * m).toBe(h * value(ex));
        expect(Number.isInteger(value(ex))).toBe(true);
        if (h > g) expect(value(ex)).toBeLessThan(m);
        else expect(value(ex)).toBeGreaterThan(m);
      } else {
        expect(parts[2]).toBe('zeit');
        const base = Number(parts[3]);
        expect(fields(ex)).toEqual({ zwei: base / 2, vier: base / 4 });
      }
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['helfer', 'zeit']);
  });

  it('"je mehr, desto mehr" on a helper task gets a question about the time', () => {
    const ex = byAb(3).find((e) => e.key.includes(':helfer:aufraeumen:2:4:'))!;
    const m = Number(ex.key.split(':').pop());
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(m * 2) }, ex.bugs);
    expect(r.bugId).toBe('je-mehr-mehr');
    expect(r.bugHint).toMatch(/länger oder kürzer/);
  });

  it('a helper story never feeds the family about a price, and its phrase fits Kinder and Ziegen alike', () => {
    const tags = new Set<string>();
    for (const ex of byAb(3)) for (const b of ex.bugs ?? []) tags.add(tagFor(mengePreisSkill.id, b.id) as string);
    expect([...tags]).toEqual(['sachaufgaben-je-mehr-weniger']);
    expect(familyPhrase('sachaufgaben-je-mehr-weniger').object).not.toMatch(/Helfer/);
  });
});
