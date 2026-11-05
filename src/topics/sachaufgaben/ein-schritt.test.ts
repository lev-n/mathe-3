import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, NumberAnswer, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { einSchrittSkill } from './ein-schritt';
import { CHANGE_WORDS, priceOf, shownTexts } from './testkit';

describeSkill(einSchrittSkill, { minDistinct: 40 });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => einSchrittSkill.generate(createRng(i * 809 + stufe), stufe, { ...CTX, ab })));
}

const value = (ex: Exercise) => (ex.answer as NumberAnswer).value as number;

const MINUS_IDS = ['ausleihen', 'aufkleber', 'erwachsene', 'plaetze', 'alter', 'klasse'];

describe('sachaufgaben.ein-schritt', () => {
  it('AB I: plus or minus up to 1000, recomputed from the numbers of the story', () => {
    for (const ex of byAb(1)) {
      const [, , kind, id, a, b] = ex.key.split(':');
      expect(kind).toBe('pm');
      expect(value(ex)).toBe(MINUS_IDS.includes(id) ? Number(a) - Number(b) : Number(a) + Number(b));
      expect(value(ex)).toBeLessThanOrEqual(1000);
      expect(ex.context).toContain(a);
      expect(ex.context).toContain(b);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('AB II: mal and geteilt, recomputed; every result stays up to 1000', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(2)) {
      const [, , kind, , x, y] = ex.key.split(':');
      kinds.add(kind);
      expect(value(ex)).toBe(kind === 'mal' ? Number(x) * Number(y) : Number(x) / Number(y));
      expect(Number.isInteger(value(ex))).toBe(true);
      expect(Math.max(value(ex), Number(x))).toBeLessThanOrEqual(1000);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['geteilt', 'mal']);
  });

  it('AB III: start, change and an unneeded number, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(3)) {
      const parts = ex.key.split(':');
      const kind = parts[2];
      kinds.add(kind);
      const [p, q] = [Number(parts[4]), Number(parts[5])];
      if (kind === 'anfang') expect(value(ex)).toBe(parts[3] === 'weg' ? q + p : q - p);
      else if (kind === 'aenderung') expect(value(ex)).toBe(q);
      else {
        expect(kind).toBe('zuviel');
        expect(value(ex)).toBe(MINUS_IDS.includes(parts[3]) ? p - q : p + q);
        // all three numbers stand in the story: the child has to leave one out
        expect(ex.context).toContain(parts[6]);
      }
      expect(value(ex)).toBeGreaterThan(0);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...kinds].sort()).toEqual(['aenderung', 'anfang', 'zuviel']);
  });

  it('adding all three numbers gets the hint about the question', () => {
    const ex = byAb(3).find((e) => e.key.includes(':zuviel:'))!;
    const [a, b, x] = ex.key.split(':').slice(4).map(Number);
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(a + b + x) }, ex.bugs);
    expect(r.bugId).toBe('alle-zahlen');
    expect(r.bugHint).toMatch(/Welche Zahlen brauchst du/);
  });

  it('a picture of a task never gives the unknown away', () => {
    for (const ex of byAb(3)) {
      if (ex.visual?.type === 'numberLine') expect(ex.visual.jumps?.[0].label).toBe('?');
    }
  });

  it('the dots in a worked step tell the same story as the text', () => {
    let seen = 0;
    for (const ex of byAb(2, 400)) {
      const [, , kind, id, t, y] = ex.key.split(':');
      if (kind !== 'geteilt') continue;
      const step = ex.steps.find((s) => typeof s !== 'string' && s.visual);
      if (!step || typeof step === 'string') continue;
      const v = step.visual;
      if (v?.type !== 'dotArray' || !('groups' in v)) throw new Error(ex.key);
      seen++;
      const share = Number(t) / Number(y);
      // 6 Kinder or 6 Hefte are 6 groups; a group size of 6 makes as many groups as the answer says
      if (id === 'verteilen' || id === 'preis') expect(v.groups, ex.key).toEqual(Array.from({ length: Number(y) }, () => share));
      else expect(v.groups, ex.key).toEqual(Array.from({ length: share }, () => Number(y)));
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a story of a whole and its parts gets help about parts: nothing comes or goes in it', () => {
    const seen = new Set<string>();
    for (const ex of byAb(1, 400)) {
      const id = ex.key.split(':')[3];
      if (!['tiere', 'erwachsene', 'plaetze'].includes(id)) continue;
      seen.add(id);
      for (const text of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ex.praise ?? '']) expect(text, ex.key).not.toMatch(CHANGE_WORDS);
      for (const b of ex.bugs ?? []) expect(b.hint, ex.key).toMatch(/ganze Menge/);
    }
    expect([...seen].sort()).toEqual(['erwachsene', 'plaetze', 'tiere']);
  });

  it('a change story keeps its question about what comes or goes', () => {
    for (const ex of byAb(1)) {
      if (['regal', 'karten', 'gaeste', 'ausleihen', 'aufkleber'].includes(ex.key.split(':')[3])) expect(ex.hints[0], ex.key).toMatch(/Kommt etwas dazu/);
    }
  });

  it('nobody sits alone among hundreds on a train: a Zug carries Menschen, and has no Wagen to divide them by', () => {
    let seen = 0;
    for (const ex of byAb(3, 400)) {
      if (!ex.context?.includes('Im Zug')) continue;
      seen++;
      expect(shownTexts(ex).join(' '), ex.key).not.toMatch(/Kinder|Wagen/);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a Heft keeps a realistic price', () => {
    for (const ex of byAb(2, 400)) {
      const price = priceOf('Heft', ex.context ?? '');
      if (price !== null) expect(price, ex.context).toBeLessThanOrEqual(4);
      if (ex.key.includes(':geteilt:preis:')) expect(value(ex), ex.key).toBeLessThanOrEqual(4);
    }
  });
});
