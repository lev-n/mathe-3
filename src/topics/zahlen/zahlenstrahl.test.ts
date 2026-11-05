import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Ab, AnswerOf, Exercise, Stufe } from '../../core/types';
import { numberLineAriaLabel } from '../../ui/visuals/NumberLineVisual';
import { ZELLEN, expectScope, kindOf, samplesIn, samplesOf, solutionProblems } from './testHelp';
import { zahlenstrahlSkill } from './zahlenstrahl';

// Ticks of 100 leave few numbers on Stufe 1: 9 places on one line, read or placed. The content of the Stufe limits this, not the generator.
describeSkill(zahlenstrahlSkill, { minDistinct: { 1: 15 } });

interface LineLike {
  min: number;
  max: number;
  minorStep: number;
  labelMajor: boolean;
  labels?: number[];
}

const linie = (ex: Exercise): LineLike => {
  if (ex.answer.kind === 'numberline') return ex.answer;
  if (ex.visual?.type !== 'numberLine') throw new Error(`${ex.key}: no line`);
  return ex.visual;
};
const minorOf = (ex: Exercise) => linie(ex).minorStep;
const breite = (ex: Exercise) => linie(ex).max - linie(ex).min;
const antworten = (s: Stufe, a: Ab) => new Set(samplesOf(zahlenstrahlSkill, s, a).map((ex) => ex.answer.kind));

describe('zahlen.zahlenstrahl', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(zahlenstrahlSkill, {
      1: { 1: ['lesen'], 2: ['setzen'], 3: ['lesen', 'setzen'] },
      2: { 1: ['lesen', 'setzen'], 2: ['lesen', 'setzen'], 3: ['lesen', 'setzen'] },
      3: { 1: ['lesen', 'schaetzen'], 2: ['lesen', 'schaetzen', 'setzen'], 3: ['lesen', 'schaetzen', 'schaetzlesen', 'setzen'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(zahlenstrahlSkill)).toEqual([]);
  });

  it('reading: the answer is where the arrow stands, on a tick; placing: the value lies on the grid', () => {
    for (const ex of samplesIn(zahlenstrahlSkill, ZELLEN)) {
      if (ex.answer.kind === 'number') {
        if (ex.visual?.type !== 'numberLine') throw new Error('no line');
        expect(ex.visual.marks![0].value).toBe(ex.answer.value);
        expect(ex.visual.marks![0].label).toBe('A');
        expect((ex.answer.value! - ex.visual.min) % ex.visual.minorStep).toBe(0);
      } else if (ex.answer.kind === 'numberline') {
        expect((ex.answer.value - ex.answer.min) % ex.answer.step).toBe(0);
        expect(ex.prompt).toContain(String(ex.answer.value));
      } else if (ex.answer.kind === 'choice') {
        if (ex.visual?.type !== 'numberLine') throw new Error('no line');
        const a = ex.answer as AnswerOf<'choice'>;
        expect(ex.visual.marks).toEqual([{ value: Number(a.options[a.correct].label), label: 'A' }]);
      } else {
        throw new Error(`${ex.key}: ${ex.answer.kind}`);
      }
    }
  });

  it('the arrow in a task never carries its number: not as its label, not in the name of the line', () => {
    for (const ex of samplesIn(zahlenstrahlSkill, ZELLEN)) {
      if (ex.visual?.type !== 'numberLine') continue;
      const value = ex.visual.marks![0].value;
      expect(ex.visual.marks![0].label, ex.key).toBe('A');
      expect(ex.visual.labels ?? [], ex.key).not.toContain(value);
      expect(numberLineAriaLabel(ex.visual), ex.key).not.toMatch(new RegExp(`(?<!\\d)${value}(?!\\d)`));
    }
  });

  it('Stufe 1: ticks of 100 on 0–1000 at every AB level; reading, placing, then only the ends labelled', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(zahlenstrahlSkill, 1, ab)) {
        expect(minorOf(ex), ex.key).toBe(100);
        expect(breite(ex), ex.key).toBe(1000);
        expect(linie(ex).labels, ex.key).toEqual(ab === 3 ? [0, 1000] : [0, 500, 1000]);
      }
    }
    expect(antworten(1, 1)).toEqual(new Set(['number']));
    expect(antworten(1, 2)).toEqual(new Set(['numberline']));
    expect(antworten(1, 3)).toEqual(new Set(['number', 'numberline']));
  });

  it('Stufe 2: ticks of 50 on the whole line; a section of 100 with ticks of 10, then with only its ends labelled', () => {
    for (const ex of samplesOf(zahlenstrahlSkill, 2, 1)) {
      expect(minorOf(ex), ex.key).toBe(50);
      expect(breite(ex), ex.key).toBe(1000);
    }
    for (const ab of [2, 3] as const) {
      for (const ex of samplesOf(zahlenstrahlSkill, 2, ab)) {
        expect(minorOf(ex), ex.key).toBe(10);
        expect(breite(ex), ex.key).toBe(100);
        expect(linie(ex).labelMajor, ex.key).toBe(ab === 2);
        if (ab === 3) expect(linie(ex).labels, ex.key).toEqual([linie(ex).min, linie(ex).max]);
      }
    }
    for (const ab of [1, 2, 3] as const) expect(antworten(2, ab)).toEqual(new Set(['number', 'numberline']));
  });

  it('Stufe 3: only the empty line and sections with ticks of 5; the estimate gets tighter, and only the ends stay labelled', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(zahlenstrahlSkill, 3, ab)) {
        const kind = kindOf(ex);
        if (kind === 'schaetzen' || kind === 'schaetzlesen') {
          expect(minorOf(ex), ex.key).toBe(1000);
        } else {
          expect(minorOf(ex), ex.key).toBe(5);
          expect(breite(ex), ex.key).toBe(100);
          expect(linie(ex).labelMajor, ex.key).toBe(ab !== 3);
        }
        if (kind === 'schaetzen' && ex.answer.kind === 'numberline') {
          expect(ex.answer.tolerance, ex.key).toBe(ab === 3 ? 50 : 75);
          if (ab === 1) expect(ex.answer.value % 50, ex.key).toBe(0);
        }
      }
    }
    expect(antworten(3, 1)).toEqual(new Set(['number', 'numberline']));
    expect(antworten(3, 3)).toEqual(new Set(['number', 'numberline', 'choice']));
  });

  it('an estimate has a tolerance and no ticks to count; a mirror bug lies outside the tolerance', () => {
    let seen = 0;
    for (const ex of samplesIn(zahlenstrahlSkill, [[3, 1], [3, 2], [3, 3]], 200)) {
      if (kindOf(ex) !== 'schaetzen' || ex.answer.kind !== 'numberline') continue;
      seen++;
      expect(ex.answer.majorStep).toBe(1000);
      expect(ex.answer.labelMajor).toBe(true);
      expect(ex.answer.tolerance).toBeGreaterThan(0);
      expect(checkAnswer(ex.answer, { kind: 'numberline', value: ex.answer.value + ex.answer.tolerance }).correct).toBe(true);
      expect(checkAnswer(ex.answer, { kind: 'numberline', value: ex.answer.value + ex.answer.tolerance + 10 }).correct).toBe(false);
      for (const b of ex.bugs ?? []) expect(Math.abs((b.match as number) - ex.answer.value), ex.key).toBeGreaterThan(ex.answer.tolerance);
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('the arrow on the empty line: halving does not decide, as the nearest options lie 100 away', () => {
    let seen = 0;
    for (const ex of samplesOf(zahlenstrahlSkill, 3, 3, 300)) {
      if (kindOf(ex) !== 'schaetzlesen') continue;
      seen++;
      const a = ex.answer as AnswerOf<'choice'>;
      const richtig = Number(a.options[a.correct].label);
      expect(a.options.length).toBe(4);
      expect([250, 500, 750], ex.key).not.toContain(richtig);
      const abstaende = a.options.map((o) => Math.abs(Number(o.label) - richtig)).filter((d) => d > 0);
      expect(Math.min(...abstaende), ex.key).toBe(100);
      for (const d of abstaende) expect(d, ex.key).toBeLessThanOrEqual(300);
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('a tick read as 10: 650 becomes 610 and a section of 10 reads 370 as 307', () => {
    for (const ex of samplesIn(zahlenstrahlSkill, [[2, 1], [2, 2], [2, 3]])) {
      if (ex.answer.kind !== 'number' || ex.visual?.type !== 'numberLine') continue;
      const v = ex.answer.value!;
      const matches = (ex.bugs ?? []).filter((b) => b.id === 'strahl-schritt').map((b) => b.match);
      if (ex.visual.minorStep === 50) expect(matches).toContain(v - 50 + 10);
      else expect(matches).toContain(ex.visual.min + (v - ex.visual.min) / 10);
    }
  });

  it('the same number on a line with fewer labels has a key of its own', () => {
    const keys = new Map<string, string>();
    for (const ex of samplesIn(zahlenstrahlSkill, [[1, 1], [1, 2], [1, 3]], 200)) {
      const line = JSON.stringify(linie(ex).labels);
      expect(keys.get(ex.key) ?? line, ex.key).toBe(line);
      keys.set(ex.key, line);
    }
  });
});
