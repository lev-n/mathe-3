import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { ShapeKind, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { figurenSkill } from './figuren';

describeSkill(figurenSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

/** Recounted by hand from the polygons of ShapeVisual. */
const CORNERS: Partial<Record<ShapeKind, number>> = { quadrat: 4, rechteck: 4, dreieck: 3, 'gleichseitiges-dreieck': 3, kreis: 0, sechseck: 6, achteck: 8, parallelogramm: 4 };

describe('Figuren: answers recomputed', () => {
  it('counted Ecken and Seiten fit the drawn figure, rechte Winkel only the Quadrat and the Rechteck', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe)) {
        if (ex.visual?.type !== 'shape' || ex.answer.kind !== 'number') continue;
        if (ex.key.includes(':zaehlen:')) expect(ex.answer.value, ex.key).toBe(CORNERS[ex.visual.shape]);
        if (ex.key.includes(':winkel:')) expect(ex.answer.value, ex.key).toBe(ex.visual.shape === 'quadrat' || ex.visual.shape === 'rechteck' ? 4 : 0);
      }
    }
  });

  it('corners of a row are the sum over its figures; a Quadrat counts as a Rechteck', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe)) {
        if (ex.visual?.type !== 'shapeRow' || ex.answer.kind !== 'number') continue;
        const shapes = ex.visual.items.map((i) => i.shape as ShapeKind);
        if (ex.key.includes(':zusammen:')) expect(ex.answer.value, ex.key).toBe(shapes.reduce((a, s) => a + CORNERS[s]!, 0));
        if (ex.key.includes(':rechtecke:')) expect(ex.answer.value, ex.key).toBe(shapes.filter((s) => s === 'quadrat' || s === 'rechteck').length);
      }
    }
  });

  it('naming a Quadrat never offers Rechteck, and no task about rechte Winkel draws the Raute', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe)) {
        if (ex.key.includes(':name:quadrat') && ex.answer.kind === 'choice') expect(ex.answer.options.map((o) => o.label)).not.toContain('Rechteck');
        if (ex.key.includes(':winkel:') || ex.key.includes(':finden:')) expect(JSON.stringify(ex)).not.toContain('"raute"');
      }
    }
  });

  it('a riddle never offers a wider name for its answer', () => {
    const wider: Record<string, string[]> = { Quadrat: ['Rechteck', 'Parallelogramm'], Rechteck: ['Parallelogramm'] };
    const seen = new Set<string>();
    for (const ex of samples(figurenSkill, 3, 2000)) {
      if (!ex.key.includes(':raetsel:') || ex.answer.kind !== 'choice') continue;
      const right = ex.answer.options[ex.answer.correct].label;
      seen.add(right);
      for (const name of wider[right] ?? []) expect(ex.answer.options.map((o) => o.label), ex.key).not.toContain(name);
    }
    expect(seen).toContain('Quadrat');
  });

  it('the Raute is not in the catalogue of this skill: no task names or draws it', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe, 1500)) expect(JSON.stringify(ex), ex.key).not.toMatch(/raute/i);
    }
  });

  it('nothing about a Kreis presupposes Ecken or Seiten', () => {
    const seen = new Set<string>();
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe, 1500)) {
        if (ex.visual?.type !== 'shape' || ex.visual.shape !== 'kreis') continue;
        seen.add(ex.key.split(':')[2]);
        expect(ex.praise, ex.key).not.toMatch(/Ecke|Seite/);
        ex.hints.forEach((h) => expect(h, ex.key).not.toMatch(/^Tippe jede Ecke|erste Ecke|erste Seite|auf die Seiten|Sind alle Seiten/));
        if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => expect(o.whyWrong ?? '', ex.key).not.toMatch(/^Tippe jede Ecke|Merke dir/));
      }
    }
    expect([...seen].sort()).toEqual(['gruppe', 'name', 'zaehlen']);
  });

  it('a turn never marks the right picture: all options with corners lie the same way', () => {
    const seen = new Set<string>();
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe, 1500)) {
        if (!/:(finden|parallelogramm-finden):/.test(ex.key) || ex.answer.kind !== 'choice') continue;
        const shapes = ex.answer.options.map((o) => o.visual as Extract<Visual, { type: 'shape' }>).filter((v) => v.shape !== 'kreis');
        const turns = new Set(shapes.map((v) => v.rotate ?? 0));
        expect(turns.size, ex.key).toBe(1);
        if ([...turns][0] > 0) seen.add(ex.key.split(':')[2]);
      }
    }
    expect([...seen].sort()).toEqual(['finden', 'parallelogramm-finden']);
  });

  it('a spoken figure with 4 Ecken says whether they are rechte Winkel when a task depends on it', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe, 1000)) {
        if (!/:(gedreht|gruppe):/.test(ex.key) || ex.visual?.type !== 'shape') continue;
        const { shape } = ex.visual;
        if (shape === 'quadrat' || shape === 'rechteck') expect(ex.srText, ex.key).toContain('Alle 4 Ecken sind rechte Winkel.');
        if (shape === 'parallelogramm') expect(ex.srText, ex.key).toContain('Keine Ecke ist ein rechter Winkel.');
      }
    }
  });

  it('picture options of a rechte-Winkel task are read by name: their description says nothing about the angles', () => {
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe, 800)) {
        if (!ex.key.includes(':finden:') || ex.answer.kind !== 'choice') continue;
        ex.answer.options.forEach((o) => expect((o.visual as Extract<Visual, { type: 'shape' }>).named, ex.key).toBe(true));
      }
    }
  });

  it('feedback on the name Quadrat looks at what tells the figures apart', () => {
    for (const ex of samples(figurenSkill, 1, 1500)) {
      if (!ex.key.includes(':name:') || ex.answer.kind !== 'choice' || ex.visual?.type !== 'shape') continue;
      const why = ex.answer.options.find((o) => o.label === 'Quadrat')?.whyWrong;
      if (why && ex.visual.shape !== 'rechteck' && ex.visual.shape !== 'kreis') expect(why, ex.key).toContain('4 Ecken');
      if (why && ex.visual.shape === 'rechteck') expect(why, ex.key).toContain('Seiten');
    }
  });

  it('the hint of a turned figure fits the question: Seiten for the Quadrat, Ecken for the Rechteck', () => {
    for (const ex of samples(figurenSkill, 1, 1000)) {
      if (!ex.key.includes(':gedreht:')) continue;
      const asked = ex.key.split(':')[4];
      expect(ex.hints[1], ex.key).toMatch(asked === 'Rechteck' ? /Ecken/ : /Seiten/);
    }
  });

  it('a turned Quadrat is still a Quadrat and a turned Rechteck is not one', () => {
    for (const ex of samples(figurenSkill, 1)) {
      if (!ex.key.includes(':gedreht:') || ex.answer.kind !== 'choice' || ex.visual?.type !== 'shape') continue;
      const asked = ex.key.split(':')[4];
      const isIt = asked === 'Rechteck' || ex.visual.shape === 'quadrat';
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(isIt ? 'Ja' : 'Nein');
      expect(ex.visual.rotate).toBeGreaterThan(0);
    }
  });
});
