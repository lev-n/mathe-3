import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, NumberAnswer, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { restDeutenSkill } from './rest-deuten';

describeSkill(restDeutenSkill, { minDistinct: 40 });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => restDeutenSkill.generate(createRng(i * 677 + stufe), stufe, { ...CTX, ab })));
}

const value = (ex: Exercise) => (ex.answer as NumberAnswer).value as number;

describe('sachaufgaben.rest-deuten', () => {
  it('AB I: dividend up to 50, a picture with the same numbers, the answer recomputed', () => {
    for (const ex of byAb(1)) {
      const [, , , , nText, kText, what] = ex.key.split(':');
      const [n, k] = [Number(nText), Number(kText)];
      expect(n).toBeLessThanOrEqual(50);
      expect(n % k).toBeGreaterThan(0);
      expect(value(ex)).toBe(what === 'rest' ? n % k : Math.floor(n / k));
      const v = ex.visual!;
      if (v.type !== 'dotArray' || !('groups' in v)) throw new Error(ex.key);
      expect(v.groups.reduce((x, y) => x + y, 0)).toBe(n);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('AB II: rounding up, recomputed; rounding down as an answer gets the story hint', () => {
    for (const ex of byAb(2)) {
      const [, , kind, , n, k] = ex.key.split(':');
      expect(kind).toBe('auf');
      expect(value(ex)).toBe(Math.ceil(Number(n) / Number(k)));
      const r = checkAnswer(ex.answer, { kind: 'number', text: String(Math.floor(Number(n) / Number(k))) }, ex.bugs);
      expect(r.bugId).toBe('rest-sache');
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('AB III: up, down and the meaning of the Rest all appear', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(3)) {
      const [, , kind, id, nText, kText] = ex.key.split(':');
      const [n, k] = [Number(nText), Number(kText)];
      kinds.add(kind);
      if (kind === 'auf') expect(value(ex)).toBe(Math.ceil(n / k));
      else if (kind === 'ab') expect(value(ex)).toBe(Math.floor(n / k));
      else {
        expect(kind).toBe('bedeutung');
        const a = ex.answer as ChoiceAnswer;
        expect(a.options[a.correct].label).toContain(String(n % k));
        expect(ex.expression).toBe(`${n} : ${k} = ${Math.floor(n / k)} Rest ${n % k}`);
        expect(id.length).toBeGreaterThan(0);
      }
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['ab', 'auf', 'bedeutung']);
  });

  it('every worked solution has its Probe line (G6)', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of byAb(ab, 40)) expect(ex.steps.some((s) => /\d+ · \d+ \+ \d+ = \d+/.test(typeof s === 'string' ? s : s.text)), ex.key).toBe(true);
    }
  });

  it('a question about the Rest never gets a hint that points to the full groups', () => {
    for (const ex of byAb(1, 400)) {
      if (!ex.key.endsWith(':rest')) continue;
      for (const b of ex.bugs ?? []) if (b.id === 'rest-sache') expect(b.hint, ex.key).not.toMatch(/Zähle nur die vollen/);
    }
  });

  it('the picture of a story that decides about the Rest does not count the groups for the screen reader', () => {
    let pictures = 0;
    for (const ex of byAb(2, 400)) {
      const v = ex.visual;
      if (!v) continue;
      pictures++;
      if (v.type !== 'dotArray' || !('groups' in v)) throw new Error(ex.key);
      const [n, k] = ex.key.split(':').slice(4).map(Number);
      expect(v.groups, ex.key).toEqual([n]);
      expect(v.perRow, ex.key).toBe(k);
    }
    expect(pictures).toBeGreaterThan(0);
  });

  it('neither a hint nor the feedback on an option names what the Rest counts: matching words must not find the answer', () => {
    let seen = 0;
    for (const ex of byAb(3, 400)) {
      if (!ex.key.includes(':bedeutung:')) continue;
      seen++;
      const a = ex.answer as ChoiceAnswer;
      const counted = a.options[a.correct].label.split(' ')[1]; // '3 Kinder brauchen noch ein Auto.', '3 € bleiben übrig.'
      for (const text of [...ex.hints, ...a.options.map((o) => o.whyWrong ?? '')]) expect(text, ex.key).not.toContain(counted);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('nobody buys Karussell tickets with more than 40 €', () => {
    for (const ex of byAb(3, 400)) {
      if (ex.key.split(':')[3] === 'karten') expect(Number(ex.key.split(':')[4]), ex.key).toBeLessThanOrEqual(40);
    }
  });
});
