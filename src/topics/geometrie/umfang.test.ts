import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Cell, Exercise, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { umfangSkill } from './umfang';

describeSkill(umfangSkill, { minDistinct: { 1: 15, 2: 40, 3: 40 } });

const grid = (ex: Exercise) => ex.visual as Extract<Visual, { type: 'grid' }>;
const numberOf = (ex: Exercise) => (ex.answer.kind === 'number' ? (ex.answer.value as number) : NaN);

/** Independent count: unit edges between a filled and an empty cell. */
function edges(cells: readonly Cell[]): number {
  const set = new Set(cells.map((c) => c.join()));
  let p = 0;
  for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!set.has([x + dx, y + dy].join())) p++;
  return p;
}

describe('Einmal außen herum: answers recomputed', () => {
  it('walking a figure gives its outer edges; rectangles stay within 20 on Stufe 1', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(umfangSkill, stufe)) {
        if (!/:(rechteck|figur):/.test(ex.key)) continue;
        expect(numberOf(ex), ex.key).toBe(edges(grid(ex).cells));
        if (ex.key.includes(':rechteck:')) expect(numberOf(ex), ex.key).toBeLessThanOrEqual(20);
      }
    }
  });

  it('Stufe 1 walks around rectangles up to 20, without cm', () => {
    for (const ex of samples(umfangSkill, 1, 1000)) {
      expect(ex.key).not.toMatch(/:(cm|quadrat|figur):/);
      if (ex.answer.kind === 'number') {
        expect(ex.answer.unit, ex.key).toBe('Kanten');
        expect(ex.answer.value, ex.key).toBeLessThanOrEqual(20);
      }
      expect(JSON.stringify(ex), ex.key).not.toContain('cm');
      expect(ex.steps.filter((s) => typeof s === 'string' && /\b(2[1-9]|[3-9]\d)\b/.test(s)), ex.key).toEqual([]);
    }
  });

  it('Umfang and Fläche are mixed only on Stufe 3', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(umfangSkill, stufe, 1000)) {
        expect(ex.key).not.toMatch(/:(alltag|beides|satz|zweite|laenger):/);
      }
    }
  });

  it('the hint for half the way counts no sides on a figure with more than 4', () => {
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(umfangSkill, stufe)) {
        if (!ex.key.includes(':figur:')) continue;
        for (const b of ex.bugs ?? []) expect(b.hint, ex.key).not.toContain('4 Seiten');
      }
    }
  });

  it('comparing two walks: the named figure has the longer way', () => {
    let checked = 0;
    for (const ex of samples(umfangSkill, 1, 1000)) {
      if (!ex.key.includes(':weg:') || ex.answer.kind !== 'choice') continue;
      const [a, b] = ex.key.split(':').slice(3).map((id) => id.split('.').map(Number)).map(([w, h]) => 2 * (w + h));
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(a === b ? 'Beide gleich lang' : a > b ? 'Figur A' : 'Figur B');
      expect(Math.max(a, b), ex.key).toBeLessThanOrEqual(20);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('bugs compute exactly from their pattern: half the way, the border cells, the area', () => {
    for (const ex of samples(umfangSkill, 1)) {
      if (!ex.key.includes(':rechteck:')) continue;
      const [w, h] = ex.key.split(':')[3].split('.').map(Number);
      const match = (id: string) => ex.bugs?.find((b) => b.id === id)?.match;
      expect(match('halb'), ex.key).toBe(w + h);
      if (w * h !== 2 * (w + h)) expect(match('flaeche'), ex.key).toBe(w * h);
    }
  });

  it('rectangles in cm: 2 · (long + short)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(umfangSkill, stufe)) {
        const m = /Das Rechteck ist (\d+) ?\s?cm lang und (\d+)\s?cm breit/.exec(ex.prompt);
        if (m) expect(numberOf(ex), ex.key).toBe(2 * (Number(m[1]) + Number(m[2])));
      }
    }
  });

  it('same area, different Umfang: the gleicher-umfang bug is the Umfang of the first figure', () => {
    for (const ex of samples(umfangSkill, 3)) {
      if (!ex.key.includes(':zweite:')) continue;
      const cells = grid(ex).cells;
      const [ida, idb] = ex.key.split(':').slice(3);
      const parse = (id: string) => id.split('-').map((p) => p.split('.').map(Number) as unknown as Cell);
      const [a, b] = [parse(ida), parse(idb)];
      expect(a.length, ex.key).toBe(b.length);
      expect(a.length + b.length, ex.key).toBe(cells.length);
      expect(numberOf(ex), ex.key).toBe(edges(b));
      expect(ex.bugs?.find((x) => x.id === 'gleicher-umfang')?.match, ex.key).toBe(edges(a));
      expect(edges(a), ex.key).not.toBe(edges(b));
    }
  });

  it('both numbers of one figure, and the swap as a bug', () => {
    for (const ex of samples(umfangSkill, 3)) {
      if (ex.answer.kind !== 'multi') continue;
      const cells = grid(ex).cells;
      const f = ex.answer.fields.find((x) => x.id === 'f')!.value;
      const u = ex.answer.fields.find((x) => x.id === 'u')!.value;
      expect(f, ex.key).toBe(cells.length);
      expect(u, ex.key).toBe(edges(cells));
      if (f !== u) expect(ex.bugs?.[0].match, ex.key).toEqual({ f: u, u: f });
    }
  });
});
