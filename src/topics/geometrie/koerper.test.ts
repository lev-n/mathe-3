import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { koerperSkill } from './koerper';

describeSkill(koerperSkill, { minDistinct: { 1: 20, 2: 25, 3: 25 } });

/** Written out once more, from the Körper themselves. */
const FACTS: Record<string, Record<string, number>> = {
  wuerfel: { ecken: 8, kanten: 12, flaechen: 6 },
  quader: { ecken: 8, kanten: 12, flaechen: 6 },
  pyramide: { ecken: 5, kanten: 8, flaechen: 5 },
  kugel: { ecken: 0, kanten: 0, flaechen: 1 },
  zylinder: { ecken: 0, flaechen: 3 },
  kegel: { flaechen: 2 },
};
const ROLLS = new Set(['kugel', 'zylinder', 'kegel']);
const correctLabel = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options[ex.answer.correct].label : '');

describe('Körper: answers recomputed', () => {
  it('counts of Ecken, Kanten and Flächen', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(koerperSkill, stufe)) {
        if (!ex.key.includes(':zaehlen:') || ex.answer.kind !== 'number') continue;
        const [, , , kind, part] = ex.key.split(':');
        expect(ex.answer.value, ex.key).toBe(FACTS[kind][part]);
      }
    }
  });

  it('asks nothing about the Ecken of a Kegel or round Kanten', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(koerperSkill, stufe)) {
        expect(ex.key).not.toMatch(/zaehlen:kegel:(ecken|kanten)|zaehlen:zylinder:kanten/);
      }
    }
  });

  it('Stufe 1 keeps to Würfel, Quader, Kugel and Zylinder on its first level', () => {
    for (const ex of samples(koerperSkill, 1)) expect(ex.key).not.toMatch(/(name|rollen|zaehlen):(kegel|pyramide)/);
  });

  it('Stufe 1 never shows Pyramide or Kegel, in no task form', () => {
    for (const ex of samples(koerperSkill, 1, 1000)) expect(JSON.stringify(ex), ex.key).not.toMatch(/pyramide|kegel/i);
  });

  it('a Würfel is also a Quader: no option treats this as wrong', () => {
    const offered = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : []);
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(koerperSkill, stufe, 1500)) {
        if (/:(name|ding):/.test(ex.key) && correctLabel(ex) === 'Würfel') expect(offered(ex), ex.key).not.toContain('Quader');
        if (/:(zwei-ansichten|eigenschaft|raetsel):/.test(ex.key) && ['Würfel', 'Quader'].includes(correctLabel(ex))) {
          expect(offered(ex), ex.key).not.toContain(correctLabel(ex) === 'Würfel' ? 'Quader' : 'Würfel');
        }
        if (ex.key.includes(':bild:quader') && ex.answer.kind === 'choice') {
          expect(ex.answer.options.map((o) => (o.visual as Extract<Visual, { type: 'solid' }>).solid), ex.key).not.toContain('wuerfel');
        }
      }
    }
  });

  it('a stamp has exactly one fitting option, and a Quadrat counts as a Rechteck', () => {
    const FLAT: Record<string, string[]> = {
      Würfel: ['Quadrat', 'Rechteck'], Quader: ['Quadrat', 'Rechteck'], Pyramide: ['Quadrat', 'Rechteck', 'Dreieck'],
      Zylinder: ['Kreis'], Kegel: ['Kreis'], Kugel: [],
    };
    const seen = new Set<string>();
    for (const ex of samples(koerperSkill, 3, 2000)) {
      if (!ex.key.includes(':stempel:') || ex.answer.kind !== 'choice') continue;
      const print = ex.key.split(':')[3];
      seen.add(print);
      expect(ex.answer.options.filter((o) => FLAT[o.label].includes(print)).map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
    }
    expect([...seen].sort()).toEqual(['Dreieck', 'Kreis', 'Quadrat', 'Rechteck']);
  });

  it('a clue fits only its Körper', () => {
    const faces = (s: string) => FACTS[s].flaechen;
    expect(faces('kugel')).toBe(1);
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(koerperSkill, stufe, 800)) {
        if (!ex.key.includes(':eigenschaft:')) continue;
        expect(ex.prompt, ex.key).not.toContain('nur 1 gebogene Fläche');
        if (correctLabel(ex) === 'Kugel') expect(ex.prompt, ex.key).toContain('nur 1 Fläche');
      }
    }
  });

  it('hints: Ecken are no Spitzen, and no hint counts the Körper of a list', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(koerperSkill, stufe, 600)) {
        if (ex.key.includes(':zaehlen:')) [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)].forEach((h) => expect(h, ex.key).not.toMatch(/Ecken sind die Spitzen/));
        if (ex.key.includes(':liste:')) ex.hints.forEach((h) => expect(h, ex.key).not.toMatch(/\d/));
      }
    }
  });

  it('rolling is true for round Körper only', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(koerperSkill, stufe)) {
        if (!ex.key.includes(':rollen:') || ex.answer.kind !== 'choice') continue;
        const kind = ex.key.split(':')[3];
        expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(ROLLS.has(kind) ? 'Ja' : 'Nein');
      }
    }
  });

  it('counting in a list matches the named Körper', () => {
    const has: Record<string, (k: string) => boolean> = { rollen: (k) => ROLLS.has(k), spitze: (k) => k === 'kegel' || k === 'pyramide', flach: (k) => !ROLLS.has(k) };
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(koerperSkill, stufe)) {
        if (!ex.key.includes(':liste:') || ex.answer.kind !== 'number') continue;
        const [, , , prop, list] = ex.key.split(':');
        expect(ex.answer.value, ex.key).toBe(list.split('-').filter(has[prop]).length);
      }
    }
  });

  it('the Turmdach names its faces: a Kirchturm can also have a round roof, and then the Kegel would fit too', () => {
    const roofs = samples(koerperSkill, 2, 2000).filter((e) => /dach/i.test(e.prompt));
    expect(roofs.length).toBeGreaterThan(0);
    for (const ex of roofs) expect(ex.prompt, ex.key).toBe('Welcher Körper passt zu einem Turmdach mit 4 dreieckigen Flächen?');
  });
});
