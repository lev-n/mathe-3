import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { CTX } from '../test-utils';
import { genauUngefaehrSkill } from './genau-ungefaehr';
import { largestNumber, priceOf, shownTexts } from './testkit';

describeSkill(genauUngefaehrSkill, { minDistinct: { 1: 30, 2: 30, 3: 15 } });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => genauUngefaehrSkill.generate(createRng(i * 373 + stufe), stufe, { ...CTX, ab })));
}

const rightLabel = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};

/** Whole Euro near a price with 90 or 10 Cent. */
const near = (cents: number) => Math.round(cents / 100);

describe('sachaufgaben.genau-ungefaehr', () => {
  it('is an Extra, and every answer is a choice', () => {
    expect(genauUngefaehrSkill.optional).toBe('extra');
    for (const ab of [1, 2, 3] as Ab[]) for (const ex of byAb(ab, 50)) expect(ex.answer.kind, ex.key).toBe('choice');
  });

  it('AB I: the Überschlag decides, and the exact sum does not contradict it', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(1)) {
      const parts = ex.key.split(':');
      kinds.add(parts[2]);
      if (parts[2] === 'zwei') {
        const [x, y, has] = parts.slice(3).map(Number);
        const enough = near(x) + near(y) <= has;
        expect(rightLabel(ex)).toBe(enough ? 'Ja, das Geld reicht.' : 'Nein, das Geld reicht nicht.');
        expect(x + y <= has * 100, ex.key).toBe(enough);
      } else {
        expect(parts[2]).toBe('wie');
        const exact = ['kasse', 'rueckgeld'].includes(parts[3]);
        expect(rightLabel(ex)).toBe(exact ? 'Ich muss genau rechnen.' : 'Ein Überschlag reicht.');
      }
    }
    expect([...kinds].sort()).toEqual(['wie', 'zwei']);
  });

  it('AB II: three prices; the exact sum agrees with the Überschlag, and the rounded term is right', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(2)) {
      const parts = ex.key.split(':');
      kinds.add(parts[2]);
      if (parts[2] === 'drei') {
        const [x, y, z, has] = parts.slice(3).map(Number);
        const enough = near(x) + near(y) + near(z) <= has;
        expect(rightLabel(ex)).toBe(enough ? 'Ja, das Geld reicht.' : 'Nein, das Geld reicht nicht.');
        expect(x + y + z <= has * 100, ex.key).toBe(enough);
      } else {
        expect(parts[2]).toBe('welcher');
        const [x, y, z] = parts.slice(3).map(Number);
        expect(rightLabel(ex).replace(/ /g, ' ')).toBe(`${near(x)} € + ${near(y)} € + ${near(z)} €`);
      }
    }
    expect([...kinds].sort()).toEqual(['drei', 'welcher']);
  });

  it('AB III: Fermi from the reference value in the story; the options lie far apart', () => {
    const value: Record<string, (n: number) => number> = { schritte: (m) => m * 2, aepfel: (kg) => kg * 10, schule: (n) => n * 25, regal: (n) => n * 30 };
    const ids = new Set<string>();
    for (const ex of byAb(3)) {
      const [, , kind, id, n] = ex.key.split(':');
      expect(kind).toBe('fermi');
      ids.add(id);
      const expected = value[id](Number(n));
      expect(parseInt(rightLabel(ex), 10)).toBe(expected);
      const others = (ex.answer as ChoiceAnswer).options.map((o) => parseInt(o.label, 10)).sort((a, b) => a - b);
      expect(others).toHaveLength(3);
      expect(others).toContain(expected);
      // powers of ten apart, so the size decides; the largest stays in the number range
      expect(others[2]).toBeLessThanOrEqual(1000);
      expect(others[1]).toBeGreaterThanOrEqual(others[0] * 5);
      expect(others[2]).toBeGreaterThanOrEqual(others[1] * 5);
    }
    expect([...ids].sort()).toEqual(['aepfel', 'regal', 'schritte', 'schule']);
  });

  it('the story says that all three things are bought, and the question what the Überschlag is for', () => {
    const items = byAb(2).filter((ex) => ex.key.includes(':welcher:'));
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      expect(ex.context, ex.key).toMatch(/Dazu kommt ein Stift für/);
      expect(ex.prompt).toBe('Welcher Überschlag passt zum ganzen Preis?');
    }
  });

  it('the story about checking the money does not state the outcome', () => {
    for (const ex of byAb(1)) expect(ex.context, ex.key).not.toMatch(/Das Geld reicht\./);
  });

  it('options are German: 1 Apfel, never 1 Äpfel', () => {
    const options = byAb(3).flatMap((ex) => (ex.answer as ChoiceAnswer).options.map((o) => o.label));
    expect(options).toContain('1 Apfel');
    for (const label of options) expect(label).not.toMatch(/^1 (Äpfel|Schritte|Kinder|Bücher)$/);
  });

  it('every shown number stays up to 1000, and prices stay believable', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of byAb(ab, 300)) {
        for (const t of shownTexts(ex)) expect(largestNumber(t), `${ex.key}: ${t}`).toBeLessThanOrEqual(1000);
        for (const [thing, top] of [['Heft', 4.1], ['Stift', 3.1], ['Buch', 9.1]] as const) {
          const price = priceOf(thing, ex.context ?? '');
          if (price !== null) expect(price, ex.context).toBeLessThanOrEqual(top);
        }
      }
    }
  });
});
