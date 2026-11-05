import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { spokenWords } from '../../core/format';
import type { Exercise, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { wuerfelgebaeudeSkill } from './wuerfelgebaeude';

describeSkill(wuerfelgebaeudeSkill, { minDistinct: { 1: 40, 2: 60, 3: 60 } });

function heightsOf(ex: Exercise): number[][] {
  const v = ex.visual as Extract<Visual, { type: 'cubeBuilding' }>;
  return v.heights;
}
const sum = (h: number[][]) => h.flat().reduce((a, b) => a + b, 0);
const numberOf = (ex: Exercise) => (ex.answer.kind === 'number' ? ex.answer.value : NaN);

/** Independent visibility, cube by cube: a cube is hidden when it shows no front, right or top face. */
function hiddenIndependent(h: number[][]): number {
  const has = (r: number, c: number, z: number) => r < h.length && c < h[0].length && h[r][c] > z;
  let n = 0;
  for (let r = 0; r < h.length; r++) for (let c = 0; c < h[0].length; c++) for (let z = 0; z < h[r][c]; z++) if (has(r + 1, c, z) && has(r, c + 1, z) && has(r, c, z + 1)) n++;
  return n;
}

describe('Würfelgebäude: answers recomputed', () => {
  it('a count is the sum of the towers, within the limits of the Stufe', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(wuerfelgebaeudeSkill, stufe)) {
        if (!/:(plan|gebaeude):/.test(ex.key)) continue;
        expect(numberOf(ex), ex.key).toBe(sum(heightsOf(ex)));
        expect(numberOf(ex), ex.key).toBeLessThanOrEqual(stufe === 1 ? 12 : 20);
      }
    }
  });

  it('Stufe 1 never draws more than 12 cubes', () => {
    for (const ex of samples(wuerfelgebaeudeSkill, 1)) {
      if (ex.visual?.type === 'cubeBuilding') expect(sum(ex.visual.heights), ex.key).toBeLessThanOrEqual(12);
    }
  });

  it('drawn buildings never grow towards the front or the right', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(wuerfelgebaeudeSkill, stufe)) {
        const v = ex.visual;
        if (v?.type !== 'cubeBuilding' || v.view !== 'iso') continue;
        v.heights.forEach((row, r) => row.forEach((t, c) => {
          if (r + 1 < v.heights.length) expect(v.heights[r + 1][c], ex.key).toBeLessThanOrEqual(t);
          if (c + 1 < row.length) expect(row[c + 1], ex.key).toBeLessThanOrEqual(t);
        }));
      }
    }
  });

  it('verdeckt bugs and hidden counts agree with a cube-by-cube count', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(wuerfelgebaeudeSkill, stufe)) {
        if (ex.key.includes(':verdeckt:')) expect(numberOf(ex), ex.key).toBe(hiddenIndependent(heightsOf(ex)));
        if (ex.key.includes(':gebaeude:')) {
          const h = heightsOf(ex);
          const bug = ex.bugs?.find((b) => b.id === 'verdeckt');
          if (hiddenIndependent(h) > 0) expect(bug?.match, ex.key).toBe(sum(h) - hiddenIndependent(h));
          else expect(bug, ex.key).toBeUndefined();
        }
      }
    }
  });

  it('missing cubes complete the Quader', () => {
    for (const ex of samples(wuerfelgebaeudeSkill, 3)) {
      if (!ex.key.includes(':quader:')) continue;
      const h = heightsOf(ex);
      const H = Math.max(...h.flat());
      expect(numberOf(ex), ex.key).toBe(h.flat().reduce((a, t) => a + H - t, 0));
    }
  });

  it('the Quader task reads aloud without a garbled word', () => {
    let checked = 0;
    for (const ex of samples(wuerfelgebaeudeSkill, 3)) {
      if (!ex.key.includes(':quader:')) continue;
      expect(spokenWords(`${ex.context} ${ex.prompt}`), ex.key).not.toMatch(/Tausender/);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('the front view is the highest tower of each column, the side view of each row', () => {
    for (const ex of samples(wuerfelgebaeudeSkill, 3)) {
      if (!ex.key.includes(':ansicht:') || ex.answer.kind !== 'choice') continue;
      const h = heightsOf(ex);
      const right = ex.answer.options[ex.answer.correct].visual as Extract<Visual, { type: 'cubeBuilding' }>;
      if (ex.key.includes(':front:')) expect(right.heights[0], ex.key).toEqual(h[0].map((_, c) => Math.max(...h.map((row) => row[c]))));
      else expect(right.heights.map((r) => r[0]).reverse(), ex.key).toEqual(h.map((row) => Math.max(...row)).reverse());
    }
  });

  it('says "Es fehlt 1 Würfel." in the singular', () => {
    const lines = samples(wuerfelgebaeudeSkill, 3, 3000).flatMap((ex) => ex.steps.map((s) => (typeof s === 'string' ? s : s.text))).filter((t) => /^Es (fehlt|fehlen) /.test(t));
    expect(lines).toContain('Es fehlt 1 Würfel.');
    expect(lines).not.toContain('Es fehlen 1 Würfel.');
  });
});
