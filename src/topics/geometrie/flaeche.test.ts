import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { flaecheSkill } from './flaeche';

describeSkill(flaecheSkill, { minDistinct: { 1: 15, 2: 40, 3: 40 } });

const grid = (ex: Exercise) => ex.visual as Extract<Visual, { type: 'grid' }>;
const numberOf = (ex: Exercise) => (ex.answer.kind === 'number' ? (ex.answer.value as number) : NaN);

describe('Flächen auslegen: answers recomputed', () => {
  it('the answer is the number of drawn Kästchen, within the limits of the Stufe', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(flaecheSkill, stufe)) {
        if (!/:(rechteck|figur):/.test(ex.key)) continue;
        expect(numberOf(ex), ex.key).toBe(grid(ex).cells.length);
        expect(numberOf(ex), ex.key).toBeLessThanOrEqual(stufe === 1 ? 20 : 30);
      }
    }
  });

  it('half Kästchen are worth half: two halves make one whole', () => {
    for (const ex of samples(flaecheSkill, 3)) {
      if (!ex.key.includes(':halbe:')) continue;
      const v = grid(ex);
      expect(v.halfCells!.length % 2, ex.key).toBe(0);
      expect(numberOf(ex), ex.key).toBe(v.cells.length + v.halfCells!.length / 2);
      expect(ex.bugs?.find((b) => b.id === 'halbe-vergessen')?.match, ex.key).toBe(v.cells.length);
      expect(ex.bugs?.find((b) => b.id === 'halbe-ganz')?.match, ex.key).toBe(v.cells.length + v.halfCells!.length);
    }
  });

  it('half Kästchen: the question asks for the whole figure, so counting only the undivided cells is the bug it says it is', () => {
    let checked = 0;
    for (const ex of samples(flaecheSkill, 3)) {
      if (!ex.key.includes(':halbe:')) continue;
      expect(ex.prompt, ex.key).not.toMatch(/ganze/);
      expect(ex.context, ex.key).toMatch(/halben Kästchen mit/);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('comparing: the named figure really has more Kästchen', () => {
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(flaecheSkill, stufe)) {
        if (!ex.key.includes(':vergleich:') || ex.answer.kind !== 'choice') continue;
        const [, , , a, b] = ex.key.split(':');
        const [na, nb] = [a, b].map((id) => id.split('-').length);
        const label = ex.answer.options[ex.answer.correct].label;
        expect(label, ex.key).toBe(na === nb ? 'Beide gleich groß' : na > nb ? 'Figur A' : 'Figur B');
      }
    }
  });

  it('filling leaves exactly the rest of the rectangle', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(flaecheSkill, stufe)) {
        if (ex.answer.kind !== 'cells') continue;
        const [, , , size] = ex.key.split(':');
        const [w, h] = size.split('.').map(Number);
        expect(ex.answer.given.length + ex.answer.solution.length, ex.key).toBe(w * h);
      }
    }
  });

  it('same area: the right figure has as many Kästchen as the figure above, the others not', () => {
    for (const ex of samples(flaecheSkill, 3)) {
      if (!ex.key.includes(':gleich:') || ex.answer.kind !== 'choice') continue;
      const n = grid(ex).cells.length;
      ex.answer.options.forEach((o, i) => {
        const count = (o.visual as Extract<Visual, { type: 'grid' }>).cells.length;
        if (i === (ex.answer as { correct: number }).correct) expect(count, ex.key).toBe(n);
        else expect(count, ex.key).not.toBe(n);
      });
    }
  });
});
