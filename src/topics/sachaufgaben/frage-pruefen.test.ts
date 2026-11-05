import { describe, expect, it } from 'vitest';
import { UNSOLVABLE_TEXT, checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, NumberAnswer, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { tagFor } from '../errorFamilies';
import { CTX } from '../test-utils';
import { fragePruefenSkill } from './frage-pruefen';
import { largestNumber, priceOf, shownTexts } from './testkit';

describeSkill(fragePruefenSkill, { minDistinct: 40 });

function generated(ab: Ab, stufe: Stufe, n = 300): Exercise[] {
  return Array.from({ length: n }, (_, i) => fragePruefenSkill.generate(createRng(i * 439 + stufe), stufe, { ...CTX, ab }));
}
const byAb = (ab: Ab, n = 200) => STUFEN.flatMap((s) => generated(ab, s, n));

const rightLabel = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};

describe('sachaufgaben.frage-pruefen', () => {
  it('AB I: the claim at the cash desk is judged by the recomputed price', () => {
    for (const ex of byAb(1)) {
      const parts = ex.key.split(':');
      if (parts[2] === 'kasse') {
        const [n, k, claim] = parts.slice(3).map(Number);
        const value = n * k;
        expect(rightLabel(ex)).toBe(claim === value ? 'Ja, das kann stimmen.' : claim > value ? 'Nein, das ist viel zu viel.' : 'Nein, das ist viel zu wenig.');
      } else {
        expect(parts[2]).toBe('sinn');
        const unit = parts[5];
        const sensible = { bleistift: 'cm', apfel: 'g', schulweg: 'min', wandern: 'km' }[parts[3]];
        if (unit === sensible) expect(rightLabel(ex)).toBe('Ja, das kann stimmen.');
        else expect(rightLabel(ex)).toMatch(/^Nein/);
      }
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('AB II: the extra number is the right choice, and the result leaves it out', () => {
    const kinds = new Set<string>();
    const MINUS_IDS = ['alter', 'klasse'];
    for (const ex of byAb(2)) {
      const [, , kind, id, aText, bText, xText] = ex.key.split(':');
      kinds.add(kind);
      const [a, b] = [Number(aText), Number(bText)];
      expect(ex.context).toContain(xText);
      if (kind === 'welche') expect(rightLabel(ex)).toBe(xText);
      else expect((ex.answer as NumberAnswer).value).toBe(MINUS_IDS.includes(id) ? a - b : a + b);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['ohne', 'welche']);
  });

  it('AB III on Stufe 3: "Nicht lösbar" is right exactly when a number is missing', () => {
    const kinds = new Set<string>();
    for (const ex of generated(3, 3)) {
      const a = ex.answer as NumberAnswer;
      expect(a.offerUnsolvable).toBe(true);
      const kind = ex.key.split(':')[2];
      kinds.add(kind);
      const pressed = checkAnswer(a, { kind: 'number', text: '', unsolvable: true }, ex.bugs);
      if (kind === 'offen') {
        expect(a.value).toBeNull();
        expect(pressed.correct).toBe(true);
      } else {
        const [n, k] = ex.key.split(':').slice(3).map(Number);
        expect(a.value).toBe(n * k);
        expect(pressed.correct).toBe(false);
      }
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['loesbar', 'offen']);
    expect(UNSOLVABLE_TEXT).toContain('Nicht lösbar');
  });

  it('AB III below Stufe 3: the same decision as a choice, no "Nicht lösbar" button', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of generated(3, stufe)) {
        expect(ex.answer.kind).toBe('choice');
        const fehlt = rightLabel(ex).includes('Angabe fehlt');
        expect(fehlt).toBe(ex.key.includes(':offen:'));
      }
    }
  });

  it('a Kapitänsaufgabe: adding the numbers gets a question, never the word for a mistake', () => {
    const ex = generated(3, 3).find((e) => e.key.includes(':kapitaen:'))!;
    const [a, b] = ex.key.split(':').slice(4).map(Number);
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(a + b) }, ex.bugs);
    expect(r.correct).toBe(false);
    expect(r.bugHint).toMatch(/Passen die Zahlen zur Frage/);
  });

  it('no choice of a solvable story has a second right Rechnung: 2 + 2 is 2 · 2', () => {
    for (const ex of generated(3, 1, 1500).concat(generated(3, 2, 1500))) {
      if (!ex.key.includes(':loesbar:')) continue;
      const [n, k] = ex.key.split(':').slice(3).map(Number);
      expect(n + k, ex.key).not.toBe(n * k);
    }
  });

  it('every shown number stays up to 1000, and a Heft keeps a realistic price', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of byAb(ab, 300)) {
        for (const t of shownTexts(ex)) expect(largestNumber(t), `${ex.key}: ${t}`).toBeLessThanOrEqual(1000);
        const price = priceOf('Heft', ex.context ?? '');
        if (price !== null) expect(price, ex.context).toBeLessThanOrEqual(4);
      }
    }
  });

  it('the extra number of a train story cannot be divided into its Menschen: no Wagen, and no Kinder by the hundred', () => {
    let seen = 0;
    for (const ex of byAb(2, 400)) {
      if (!ex.key.includes(':zug:')) continue;
      seen++;
      expect(shownTexts(ex).join(' '), ex.key).not.toMatch(/Kinder|Wagen/);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('seconds appear on Stufe 3 only, and the verb fits 1 €', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of generated(1, stufe, 600)) expect(ex.key.endsWith(':s'), ex.key).toBe(false);
    }
    expect(generated(1, 3, 600).some((ex) => ex.key.endsWith(':s'))).toBe(true);
    for (const ex of byAb(1, 300)) expect(ex.context, ex.key).not.toMatch(/stehen 1\D/);
  });

  it('a task that lacks a number or needs a check of the data feeds the family about the data, not about choosing numbers', () => {
    const tags = new Set<string>();
    for (const ex of generated(3, 3)) for (const b of ex.bugs ?? []) tags.add(tagFor(fragePruefenSkill.id, b.id) as string);
    expect([...tags]).toEqual(['sachaufgaben-angaben']);
  });
});
