import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Axis, Cell, Exercise, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { axesOfCells, symmetrieSkill } from './symmetrie';

describeSkill(symmetrieSkill, { minDistinct: { 1: 30, 2: 40, 3: 40 } });

/** Mirrors a cell over a line, written afresh for the test. */
function reflect([x, y]: Cell, a: Axis): Cell {
  return a.orientation === 'vertical' ? [2 * a.at - 1 - x, y] : [x, 2 * a.at - 1 - y];
}
const asSet = (cells: readonly Cell[]) => new Set(cells.map((c) => c.join()));
const symmetricOver = (cells: readonly Cell[], a: Axis) => {
  const set = asSet(cells);
  return cells.every((c) => set.has(reflect(c, a).join()));
};
const grid = (v: Visual | undefined) => v as Extract<Visual, { type: 'grid' }>;
const correct = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct] : undefined);

describe('Spiegeln: answers recomputed', () => {
  it('Ja stands for a real Spiegelachse', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(symmetrieSkill, stufe)) {
        if (!ex.key.includes(':achse:')) continue;
        const v = grid(ex.visual);
        expect(correct(ex)?.label, ex.key).toBe(symmetricOver(v.cells, v.axis!) ? 'Ja' : 'Nein');
      }
    }
  });

  it('the painted cells are the mirror image of the given ones, inside the grid and within 6 × 6', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(symmetrieSkill, stufe)) {
        if (ex.answer.kind !== 'cells') continue;
        const { given, solution, axis, width, height } = ex.answer;
        expect(width).toBeLessThanOrEqual(6);
        expect(height).toBeLessThanOrEqual(6);
        expect(asSet(solution), ex.key).toEqual(asSet(given.map((c) => reflect(c, axis!))));
        solution.forEach(([x, y]) => expect(x >= 0 && y >= 0 && x < width && y < height, ex.key).toBe(true));
      }
    }
  });

  it('Stufe 2 asks for a vertical line and Stufe 3 uses a horizontal one', () => {
    for (const ex of samples(symmetrieSkill, 2)) if (ex.answer.kind === 'cells') expect(ex.answer.axis?.orientation).toBe('vertical');
    expect(samples(symmetrieSkill, 3).some((ex) => ex.answer.kind === 'cells' && ex.answer.axis?.orientation === 'horizontal')).toBe(true);
  });

  it('in a picture task only the correct picture is symmetric', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(symmetrieSkill, stufe)) {
        if (!/:(bild|spiegelbild|linie):/.test(ex.key) || ex.answer.kind !== 'choice') continue;
        const flags = ex.answer.options.map((o) => symmetricOver(grid(o.visual).cells, grid(o.visual).axis!));
        expect(flags.filter(Boolean), ex.key).toHaveLength(1);
        expect(flags[ex.answer.correct], ex.key).toBe(true);
      }
    }
  });

  it('no axes of a Raute: the picture cannot be told from a turned Quadrat', () => {
    for (const ex of samples(symmetrieSkill, 3, 1000)) {
      if (ex.key.includes(':achsen-figur:')) expect(ex.key).not.toContain('raute');
    }
  });

  it('the two Dreiecke read differently, as their answers differ', () => {
    const spoken = new Map<string, Set<string>>();
    for (const ex of samples(symmetrieSkill, 3, 1000)) {
      if (!ex.key.includes('dreieck') || !ex.key.includes(':achsen-figur:') || ex.visual?.type !== 'shape') continue;
      expect(ex.visual.named, ex.key).toBeFalsy();
      spoken.set(ex.visual.shape, (spoken.get(ex.visual.shape) ?? new Set()).add(ex.srText));
    }
    expect(spoken.size).toBe(2);
    const [a, b] = [...spoken.values()].map((s) => [...s][0]);
    expect(a).not.toBe(b);
  });

  it('counted axes of figures', () => {
    const want: Record<string, number> = { quadrat: 4, rechteck: 2, 'gleichseitiges-dreieck': 3, sechseck: 6, parallelogramm: 0, dreieck: 0 };
    for (const ex of samples(symmetrieSkill, 3)) {
      if (ex.answer.kind !== 'number') continue;
      if (ex.key.includes(':achsen-figur:') && ex.visual?.type === 'shape') expect(ex.answer.value, ex.key).toBe(want[ex.visual.shape]);
      if (ex.key.includes(':achsen-gitter:')) expect(ex.answer.value, ex.key).toBe(axesOfCells(grid(ex.visual).cells));
    }
    expect(axesOfCells([[0, 0], [1, 0], [0, 1], [1, 1]])).toBe(4);
    expect(axesOfCells([[0, 0], [1, 0], [2, 0]])).toBe(2);
    expect(axesOfCells([[0, 0], [1, 0], [0, 1]])).toBe(1);
    expect(axesOfCells([[0, 0], [1, 0], [2, 0], [0, 1]])).toBe(0);
  });
});
