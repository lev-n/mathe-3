import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { STUFEN } from '../../core/types';
import { correctResponse } from '../../core/check';
import { spokenWords } from '../../core/format';
import type { Exercise } from '../../core/types';
import { samples } from '../test-utils';
import { checkWorkedSolution } from '../step-check';
import topic from './index';
import phrases from './phrases';

const CATALOGUE = ['figuren', 'parallel-senkrecht', 'koerper', 'wuerfelgebaeude', 'netze', 'symmetrie', 'flaeche', 'umfang', 'muster'];

/** What a child sees: the same text, picture and options in any order, with the same right one. */
function shownTask(ex: Exercise): string {
  const a = ex.answer;
  const answer = a.kind === 'choice'
    ? { options: a.options.map((o) => JSON.stringify(o.visual ? o.visual : o.label)).sort(), right: JSON.stringify(a.options[a.correct].visual ?? a.options[a.correct].label) }
    : a;
  return JSON.stringify([ex.context, ex.prompt, ex.visual, answer]);
}

/** Everything a child reads or hears of an exercise. */
function shownTexts(ex: Exercise): string[] {
  const a = ex.answer;
  return [
    ex.context ?? '', ex.prompt, ex.praise, ex.srText, ...ex.hints,
    ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)),
    ...(ex.bugs ?? []).map((b) => b.hint),
    ...(a.kind === 'choice' ? a.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : []),
  ];
}

describe('Geometrie: the topic', () => {
  it('T11: no addieren, subtrahieren, Summe or Differenz without a definition card', () => {
    const banned = /addier|subtrahier|summe|differenz/i;
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(s, stufe, 200)) for (const text of shownTexts(ex)) expect(text, ex.key).not.toMatch(banned);
      }
    }
    for (const { phrase } of Object.values(phrases)) expect(`${phrase.object} ${phrase.participle}`).not.toMatch(banned);
  });

  it('T17: reading aloud never glues a place value word onto a word', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(s, stufe, 100)) for (const text of shownTexts(ex)) expect(spokenWords(text), ex.key).not.toMatch(/(Tausender|Hunderter|Zehner|Einer)\p{L}/u);
      }
    }
  });

  it('the same task always has the same key: no key depends on a shuffle', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        const keys = new Map<string, string>();
        for (const ex of samples(s, stufe, 1200)) {
          const shown = shownTask(ex);
          expect(ex.key, shown).toBe(keys.get(shown) ?? ex.key);
          keys.set(shown, ex.key);
        }
      }
    }
  });

  it('the spoken text decides the answer: one srText never has two answers', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        const answers = new Map<string, string>();
        for (const ex of samples(s, stufe, 800)) {
          const a = ex.answer;
          // Options that are pictures have their own aria-label; their place in the list is no answer.
          if (a.kind === 'choice' && a.options.some((o) => o.visual)) continue;
          const right = a.kind === 'choice' ? a.options[a.correct].label : JSON.stringify(correctResponse(a));
          expect(right, `${ex.key}: ${ex.srText}`).toBe(answers.get(ex.srText) ?? right);
          answers.set(ex.srText, right);
        }
      }
    }
  });

  it('the unit beside the field never gives away the answer 1', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        const exercises = samples(s, stufe, 800);
        const form = (ex: Exercise) => ex.key.split(':').slice(2, 3).join();
        for (const ex of exercises) {
          if (ex.answer.kind !== 'number' || !ex.answer.unit) continue;
          expect(['Spiegelachse', 'Rechteck', 'Figur', 'Fläche', 'Seitenpaar', 'rechter Winkel', 'Kante', 'Ecke', 'Seite'], ex.key).not.toContain(ex.answer.unit);
          if (ex.answer.value !== 1) continue;
          const unit = ex.answer.unit;
          expect(exercises.some((o) => form(o) === form(ex) && o.answer.kind === 'number' && o.answer.value !== 1 && o.answer.unit === unit), ex.key).toBe(true);
        }
      }
    }
  });

  it('worked steps inflect the count of 1', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(s, stufe, 800)) {
          for (const step of ex.steps) expect(typeof step === 'string' ? step : step.text, ex.key).not.toMatch(/\bsind 1\b|\b1 (längliche Rechtecke|Figuren|Quadrate|Spiegelachsen|Falten|Rechtecke|Flächen|Kanten|Ecken)\b/);
        }
      }
    }
  });

  it('every two-figure task says which figure is A and which is B', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(s, stufe, 400)) {
          if (ex.visual?.type !== 'grid' || !ex.visual.labels?.some((l) => l.text === 'B') || !ex.visual.labels.some((l) => l.text === 'A')) continue;
          expect(ex.srText, ex.key).toContain('Figur A steht links');
          expect(ex.srText, ex.key).toContain('Figur B steht rechts');
        }
      }
    }
  });

  it('has every skill of the catalogue; only parallel-senkrecht is optional', () => {
    expect(topic.skills.map((s) => s.id).sort()).toEqual(CATALOGUE.map((s) => `geometrie.${s}`).sort());
    for (const s of topic.skills) expect(s.optional, s.id).toBe(s.id === 'geometrie.parallel-senkrecht' ? 'extra' : undefined);
  });

  it('generates pure: the same seed gives the same exercise', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        const a = s.generate(createRng(4242), stufe, { subtractionMethod: 'abziehen', extras: true });
        const b = s.generate(createRng(4242), stufe, { subtractionMethod: 'abziehen', extras: true });
        expect(JSON.stringify(a), s.id).toBe(JSON.stringify(b));
      }
    }
  });

  it('the arithmetic lines of the worked steps are right', () => {
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(s, stufe, 120)) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      }
    }
  });

  it('the Parallelogramm comes on Stufe 3 only (§2.2), by name and as a picture', () => {
    const seen = new Set<string>();
    for (const s of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(s, stufe, 300)) {
          const has = JSON.stringify(ex).toLowerCase().includes('parallelogramm');
          if (stufe < 3) expect(has, `${ex.key}, Stufe ${stufe}`).toBe(false);
          else if (has) seen.add(s.id);
        }
      }
    }
    expect([...seen].sort()).toEqual(['geometrie.figuren', 'geometrie.parallel-senkrecht', 'geometrie.symmetrie']);
  });
});
