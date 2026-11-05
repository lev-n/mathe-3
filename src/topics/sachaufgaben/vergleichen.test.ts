import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, NumberAnswer, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { tagFor } from '../errorFamilies';
import { CTX } from '../test-utils';
import { vergleichenSkill } from './vergleichen';

describeSkill(vergleichenSkill, { minDistinct: 40 });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => vergleichenSkill.generate(createRng(i * 739 + stufe), stufe, { ...CTX, ab })));
}

const value = (ex: Exercise) => (ex.answer as NumberAnswer).value as number;

describe('sachaufgaben.vergleichen', () => {
  it('AB I: the difference, recomputed', () => {
    for (const ex of byAb(1)) {
      const [big, small] = ex.key.split(':').slice(3, 5).map(Number);
      expect(value(ex)).toBe(big - small);
      expect(value(ex)).toBeGreaterThan(0);
      expect(big).toBeLessThanOrEqual(1000);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('AB II: 3-mal so viel, recomputed, product up to 1000', () => {
    for (const ex of byAb(2)) {
      const [base, n] = ex.key.split(':').slice(4).map(Number);
      expect(value(ex)).toBe(base * n);
      expect(value(ex)).toBeLessThanOrEqual(1000);
      expect(ex.context).toContain(`${n}-mal`);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('"3-mal so viel wie 40" computed as 43 gets the mal-als-mehr hint', () => {
    const ex = byAb(2).find((e) => e.key.includes(':mal:karten:') && value(e) > 50)!;
    const [base, n] = ex.key.split(':').slice(4).map(Number);
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(base + n) }, ex.bugs);
    expect(r.bugId).toBe('mal-als-mehr');
    expect(r.bugHint).toContain('heißt');
  });

  it('AB III: all reverse forms appear and recompute', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(3)) {
      const [, , kind, x, y] = ex.key.split(':');
      kinds.add(kind);
      const [a, b] = [Number(x), Number(y)];
      if (kind === 'rueck') expect(value(ex)).toBe(a / b);
      else if (kind === 'mehr') expect(value(ex)).toBe(a - b);
      else expect(value(ex)).toBe(a / b);
      expect(Number.isInteger(value(ex))).toBe(true);
      expect(a).toBeLessThanOrEqual(1000);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['mehr', 'rueck', 'wieviel']);
  });

  it('the picture of a difference task does not show the result', () => {
    for (const ex of byAb(1)) if (ex.visual?.type === 'numberLine') expect(ex.visual.jumps?.[0].label).toBe('?');
  });

  it('wievielmal divides by a one-digit number or a Zehnerzahl only, as no written division is taught', () => {
    let seen = 0;
    for (const ex of byAb(3, 400)) {
      const [, , kind, , small] = ex.key.split(':');
      if (kind !== 'wieviel') continue;
      seen++;
      expect(Number(small) < 10 || Number(small) % 10 === 0, ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a price in "so viel mal" stays believable', () => {
    for (const ex of byAb(2, 400)) if (ex.key.includes(':mal:preis:')) expect(value(ex), ex.key).toBeLessThanOrEqual(60);
  });

  it('a wievielmal task does not feed the family about finding the difference', () => {
    for (const ex of byAb(3, 200)) {
      if (!ex.key.includes(':wieviel:')) continue;
      for (const b of ex.bugs ?? []) expect(tagFor(vergleichenSkill.id, b.id), ex.key).toBe('sachaufgaben-mal-als-mehr');
    }
  });
});
