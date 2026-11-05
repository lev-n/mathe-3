import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Cell, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { parallelSenkrechtSkill } from './parallel-senkrecht';

describeSkill(parallelSenkrechtSkill, { minDistinct: { 1: 30, 2: 20, 3: 15 } });

/** Parallel strips never touch; strips at a right angle have one shared cell or touch. */
function shownWord(cells: readonly Cell[]): 'parallel' | 'senkrecht' {
  const rows = new Map<number, number>();
  const cols = new Map<number, number>();
  for (const [x, y] of cells) {
    rows.set(y, (rows.get(y) ?? 0) + 1);
    cols.set(x, (cols.get(x) ?? 0) + 1);
  }
  const longRows = [...rows.values()].filter((n) => n >= 3).length;
  const longCols = [...cols.values()].filter((n) => n >= 3).length;
  return longRows === 1 && longCols === 1 ? 'senkrecht' : 'parallel';
}

describe('Parallel und senkrecht: answers recomputed', () => {
  it('is an optional skill', () => {
    expect(parallelSenkrechtSkill.optional).toBe('extra');
  });

  it('the word fits the drawn strips', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(parallelSenkrechtSkill, stufe)) {
        if (!ex.key.includes(':linien:') || ex.answer.kind !== 'choice') continue;
        const v = ex.visual as Extract<Visual, { type: 'grid' }>;
        expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(shownWord(v.cells));
      }
    }
  });

  it('the opposite side is parallel, its neighbours are senkrecht', () => {
    const order = 'abcd';
    for (const ex of samples(parallelSenkrechtSkill, 2)) {
      if (!ex.key.includes(':seite:') || ex.answer.kind !== 'choice') continue;
      const [, , , , side, kind] = ex.key.split(':');
      const i = order.indexOf(side);
      const label = ex.answer.options[ex.answer.correct].label;
      if (kind === 'parallel') expect(label, ex.key).toBe(`Seite ${order[(i + 2) % 4]}`);
      else expect(label, ex.key).toBe(`Seite ${[order[(i + 1) % 4], order[(i + 3) % 4]].sort().join(' und ')}`);
    }
  });

  it('a riddle never offers a wider name for its answer', () => {
    const wider: Record<string, string[]> = { Quadrat: ['Rechteck', 'Parallelogramm', 'Raute'], Rechteck: ['Parallelogramm'] };
    const seen = new Set<string>();
    for (const ex of samples(parallelSenkrechtSkill, 3, 2000)) {
      if (!ex.key.includes(':raetsel:') || ex.answer.kind !== 'choice') continue;
      const right = ex.answer.options[ex.answer.correct].label;
      seen.add(right);
      for (const name of wider[right] ?? []) expect(ex.answer.options.map((o) => o.label), ex.key).not.toContain(name);
      expect(ex.answer.options.length, ex.key).toBe(4);
    }
    expect(seen).toContain('Quadrat');
    expect(seen).toContain('Rechteck');
  });

  it('parallel pairs: 2 in every four-sided figure, 3 in the Sechseck, none in a Dreieck', () => {
    const want: Record<string, number> = { quadrat: 2, rechteck: 2, parallelogramm: 2, raute: 2, sechseck: 3, dreieck: 0, 'gleichseitiges-dreieck': 0 };
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(parallelSenkrechtSkill, stufe)) {
        if (!ex.key.includes(':paare:') || ex.answer.kind !== 'number' || ex.visual?.type !== 'shape') continue;
        expect(ex.answer.value, ex.key).toBe(want[ex.visual.shape]);
      }
    }
  });
});
