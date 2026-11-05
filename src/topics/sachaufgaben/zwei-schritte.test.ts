import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, MultiAnswer, NumberAnswer, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import MoneyVisual from '../../ui/visuals/MoneyVisual';
import { speak } from '../shared';
import { checkStepText } from '../step-check';
import { CTX, cents } from '../test-utils';
import { shownTexts } from './testkit';
import { zweiSchritteSkill } from './zwei-schritte';

describeSkill(zweiSchritteSkill, { minDistinct: 40 });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => zweiSchritteSkill.generate(createRng(i * 557 + stufe), stufe, { ...CTX, ab })));
}

const value = (ex: Exercise) => (ex.answer as NumberAnswer).value as number;
const fields = (ex: Exercise) => Object.fromEntries((ex.answer as MultiAnswer).fields.map((f) => [f.id, f.value]));
const stepsAddUp = (ex: Exercise) => ex.steps.forEach((s) => expect(checkStepText(typeof s === 'string' ? s : s.text), ex.key).toBeNull());

describe('sachaufgaben.zwei-schritte', () => {
  it('AB I: plus then plus up to 500, with a picture, recomputed', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(1)) {
      const parts = ex.key.split(':');
      kinds.add(parts[2]);
      if (parts[2] === 'sparen') {
        const [a, b, c] = parts.slice(3).map(Number);
        expect(value(ex)).toBe(a + b + c);
        expect(value(ex)).toBeLessThanOrEqual(500);
        // the money of the start, as the first sentence tells it: the other two amounts are the calculation
        if (ex.visual?.type !== 'money') throw new Error(ex.key);
        expect(ex.visual.items.reduce((x, y) => x + y, 0)).toBe(a * 100);
      } else {
        expect(parts[2]).toBe('tage');
        const [a, b, c] = parts.slice(4).map(Number);
        expect(fields(ex)).toEqual({ erst: a + b, dann: a + b + c });
        expect(a + b + c).toBeLessThanOrEqual(500);
        expect(ex.visual?.type).toBe('table');
      }
      stepsAddUp(ex);
    }
    expect([...kinds].sort()).toEqual(['sparen', 'tage']);
  });

  it('AB II: Rückgeld recomputed from the prices of the story; mal then plus from the key', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(2)) {
      const parts = ex.key.split(':');
      kinds.add(parts[2]);
      if (parts[2] === 'einkauf') {
        const [x, y] = ex.context!.split(' und ').map(cents);
        expect(Math.round(value(ex) * 100)).toBe(1000 - x - y);
        expect(value(ex)).toBeGreaterThan(0);
      } else {
        const [k, n, b] = parts.slice(4, 7).map(Number);
        if (ex.answer.kind === 'multi') expect(fields(ex)).toEqual({ erst: n * k, dann: n * k + b });
        else expect(value(ex)).toBe(n * k + b);
        expect(n * k + b).toBeLessThanOrEqual(1000);
      }
      stepsAddUp(ex);
    }
    expect([...kinds].sort()).toEqual(['einkauf', 'malplus']);
  });

  it('AB III: data from the table, and three numbers in two steps', () => {
    const kinds = new Set<string>();
    for (const ex of byAb(3)) {
      const parts = ex.key.split(':');
      kinds.add(parts[2]);
      if (parts[2] === 'preise') {
        const [p1, n, , p2, m] = parts.slice(4, 9);
        expect(value(ex)).toBe(Number(n) * Number(p1) + Number(m) * Number(p2));
        const v = ex.visual!;
        if (v.type !== 'table') throw new Error(ex.key);
        // the prices stand in the table, and only there (T15)
        expect(v.rows).toHaveLength(3);
        expect(ex.context).not.toContain('€');
      } else if (parts[2] === 'besuch') {
        const [a, b, c] = parts.slice(3).map(Number);
        expect(value(ex)).toBe(a + b - c);
        expect(value(ex)).toBeGreaterThan(0);
      } else {
        expect(parts[2]).toBe('drei');
        const [a, b, c] = parts.slice(4).map(Number);
        expect(value(ex)).toBe(a - b + c);
      }
      stepsAddUp(ex);
    }
    expect([...kinds].sort()).toEqual(['besuch', 'drei', 'preise']);
  });

  it('the intermediate result gets "Das ist schon ein guter Schritt"', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of byAb(ab, 40)) {
        const bug = ex.bugs?.find((b) => b.id === 'nur-erster-schritt');
        if (!bug || ex.answer.kind !== 'number') continue;
        const r = checkAnswer(ex.answer, { kind: 'number', text: String(bug.match).replace('.', ',') }, ex.bugs);
        expect(r.correct).toBe(false);
        expect(r.bugId).toBe('nur-erster-schritt');
      }
    }
  });

  it('a table of days has one row per day: three day columns do not fit a 375 px phone', () => {
    let seen = 0;
    for (const ab of [1, 3] as Ab[]) {
      for (const ex of byAb(ab)) {
        const v = ex.visual;
        if (v?.type !== 'table' || !v.rows.some((r) => r[0] === 'Mittwoch')) continue;
        seen++;
        expect(v.header).toHaveLength(2);
        expect(v.rows.map((r) => r[0])).toEqual(['Montag', 'Dienstag', 'Mittwoch']);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('the screen reader names what each step field asks for', () => {
    let seen = 0;
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of byAb(ab)) {
        if (ex.answer.kind !== 'multi') continue;
        seen++;
        const [erst, dann] = ex.answer.fields;
        expect(ex.srText, ex.key).toContain(speak(erst.before!.replace(/ =$/, '')));
        expect(ex.srText, ex.key).toContain(dann.before!.replace(/:$/, ''));
        expect(erst.label, ex.key).toContain(speak(erst.before!.replace(/ =$/, '')));
        expect(dann.label, ex.key).toContain(dann.before!.replace(/:$/, ''));
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a Kiste or Reihe never holds Zehnerzahlen; a Regal may', () => {
    let tens = 0;
    for (const ex of byAb(2, 400)) {
      const [, , kind, id, kText] = ex.key.split(':');
      if (kind !== 'malplus') continue;
      if (id === 'baelle' || id === 'stuehle' || id === 'zoo') expect(Number(kText), ex.key).toBeLessThan(10);
      else if (Number(kText) >= 10) tens++;
    }
    expect(tens).toBeGreaterThan(0);
  });

  it('the money picture stays small: field and Ziffernblock fit beside it, and 55 mm on a worksheet (208 px) keep its labels readable', () => {
    let tallest = 0;
    for (const stufe of STUFEN) {
      for (let i = 0; i < 1500; i++) {
        const ex = zweiSchritteSkill.generate(createRng(i * 557 + stufe), stufe, { ...CTX, ab: 1 });
        if (ex.visual?.type !== 'money') continue;
        const svg = renderToStaticMarkup(createElement(MoneyVisual, { visual: ex.visual }));
        tallest = Math.max(tallest, Number(/ height="(\d+)"/.exec(svg)![1]));
      }
    }
    expect(tallest).toBeGreaterThan(0);
    expect(tallest).toBeLessThanOrEqual(240);
  });

  it('rueckgeld-cent is the pattern of §5: the Euro subtracted, the Cent copied', () => {
    let seen = 0;
    for (const ex of byAb(2, 400)) {
      if (!ex.key.includes(':einkauf:')) continue;
      const bug = ex.bugs!.find((b) => b.id === 'rueckgeld-cent');
      const total = 1000 - Math.round(value(ex) * 100);
      const copied = 10 - Math.floor(total / 100) + (total % 100) / 100;
      // 10 € − 5,60 € copied is 5,60 €: the intermediate result, and that hint comes first
      if (copied === total / 100) expect(bug, ex.key).toBeUndefined();
      else {
        seen++;
        expect(bug?.match, ex.key).toBeCloseTo(copied, 9);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('nobody sits alone among hundreds on a train: a Zug carries Menschen', () => {
    let seen = 0;
    for (const ex of byAb(3)) {
      if (!ex.context?.includes('Zug')) continue;
      seen++;
      expect(shownTexts(ex).join(' '), ex.key).not.toContain('Kinder');
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('things that are only there do not "come": mal then plus asks about the last number', () => {
    for (const ex of byAb(2)) for (const b of ex.bugs ?? []) if (ex.key.includes(':malplus:')) expect(b.hint, ex.key).not.toContain('kommt noch etwas dazu');
  });

  it('nobody has 500 € of pocket money: the large savings belong to the class', () => {
    for (const ex of byAb(1)) if (ex.key.includes(':sparen:')) expect(ex.context, ex.key).toMatch(/^Die Klasse hat/);
  });
});
