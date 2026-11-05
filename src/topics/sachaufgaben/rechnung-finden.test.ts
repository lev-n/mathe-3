import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { rechnungFindenSkill } from './rechnung-finden';
import { CHANGE_WORDS } from './testkit';

describeSkill(rechnungFindenSkill, { minDistinct: 40 });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => rechnungFindenSkill.generate(createRng(i * 911 + stufe), stufe, { ...CTX, ab })));
}

const rightLabel = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};

const PLUS_IDS = ['regal-dazu', 'karten-dazu', 'gaeste', 'zoo'];
const MINUS_IDS = ['regal-weg', 'karten-weg', 'erwachsene', 'plaetze'];
const MAL_IDS = ['kisten', 'reihen', 'hefte'];
const GETEILT_IDS = ['gruppen', 'verteilen', 'tueten'];

const signOf = (id: string) => (PLUS_IDS.includes(id) ? '+' : MINUS_IDS.includes(id) ? '−' : MAL_IDS.includes(id) ? '·' : GETEILT_IDS.includes(id) ? ':' : null);

describe('sachaufgaben.rechnung-finden', () => {
  it('AB I: two options, plus or minus, and the story decides', () => {
    for (const ex of byAb(1)) {
      const [, , kind, id, a, b] = ex.key.split(':');
      expect(kind).toBe('pm');
      expect((ex.answer as ChoiceAnswer).options).toHaveLength(2);
      expect(rightLabel(ex)).toBe(`${a} ${signOf(id)} ${b}`);
      expect(Number(a) + Number(b)).toBeLessThanOrEqual(1000);
      expect(ex.context).toContain(a);
      expect(ex.context).toContain(b);
    }
  });

  it('AB II: all four operations appear, and the right term recomputes from the story', () => {
    const signs = new Set<string>();
    for (const ex of byAb(2)) {
      const [, , , id, big, s] = ex.key.split(':');
      const sign = signOf(id)!;
      signs.add(sign);
      expect((ex.answer as ChoiceAnswer).options).toHaveLength(4);
      expect(rightLabel(ex)).toBe(sign === '·' ? `${s} · ${big}` : `${big} ${sign} ${s}`);
      expect(Number(big) % Number(s)).toBe(0);
      if (sign === '·') expect(Number(big) * Number(s)).toBeLessThanOrEqual(1000);
    }
    expect([...signs].sort()).toEqual(['+', ':', '·', '−'].sort());
  });

  it('AB III: the word does not predict the operation', () => {
    const seen = new Set<string>();
    for (const ex of byAb(3)) {
      const [, , kind, sub, a, b] = ex.key.split(':');
      if (kind === 'wort') {
        seen.add(sub);
        expect(rightLabel(ex)).toBe(sub === 'weniger' ? `${a} + ${b}` : `${a} − ${b}`);
      } else {
        expect(kind).toBe('frage');
        seen.add(`frage-${sub}`);
        if (sub === 'plus') expect(rightLabel(ex)).toMatch(/zusammen\?$/);
        else expect(rightLabel(ex)).toMatch(sub === 'mehr' ? /mehr als/ : /weniger als/);
        expect(ex.expression).toBe(`${a} ${sub === 'plus' ? '+' : '−'} ${b}`);
      }
    }
    expect([...seen].sort()).toEqual(['frage-mehr', 'frage-plus', 'frage-weniger', 'insgesamt', 'mehr', 'weniger']);
  });

  it('every wrong option explains itself, and the worked lines add up', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of byAb(ab, 60)) {
        const a = ex.answer as ChoiceAnswer;
        a.options.forEach((o, i) => (i === a.correct ? expect(o.whyWrong).toBeUndefined() : expect(o.whyWrong, o.label).toBeTruthy()));
        expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
  });

  it('a mal story keeps a real group: at most 20 in a Kiste, Reihe or Packung', () => {
    for (const ex of byAb(2, 400)) {
      const [, , , id, big] = ex.key.split(':');
      if (MAL_IDS.includes(id)) expect(Number(big), ex.key).toBeLessThanOrEqual(20);
    }
  });

  it('feedback on the mal option in a geteilt story does not confirm the choice', () => {
    let seen = 0;
    for (const ex of byAb(2, 400)) {
      const [, , , id] = ex.key.split(':');
      if (!GETEILT_IDS.includes(id)) continue;
      const a = ex.answer as ChoiceAnswer;
      const mal = a.options.find((o) => o.label?.includes('·'))!;
      seen++;
      expect(mal.whyWrong, ex.key).not.toMatch(/gleich große Gruppen/);
      expect(mal.whyWrong, ex.key).toMatch(/Wie oft passt/);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a story of a whole and its parts gets help about parts: nothing comes or goes in it', () => {
    const seen = new Set<string>();
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of byAb(ab, 400)) {
        const id = ex.key.split(':')[3];
        if (!['zoo', 'erwachsene', 'plaetze'].includes(id)) continue;
        seen.add(id);
        const a = ex.answer as ChoiceAnswer;
        const step = ex.steps[0];
        for (const text of [...ex.hints, ...a.options.map((o) => o.whyWrong ?? ''), typeof step === 'string' ? step : step.text, ex.praise ?? '']) expect(text, ex.key).not.toMatch(CHANGE_WORDS);
      }
    }
    expect([...seen].sort()).toEqual(['erwachsene', 'plaetze', 'zoo']);
  });

  it('a Zug has a train full of Plätze, on every level', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of byAb(ab, 400)) {
        const m = /Der Zug hat (\d+) Plätze/.exec(ex.context ?? '');
        if (m) expect(Number(m[1]), ex.key).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it('the hint of the four operations separates mal from geteilt', () => {
    for (const ex of byAb(2, 20)) expect(ex.hints.join(' ')).toMatch(/teilt jemand auf/);
  });
});
