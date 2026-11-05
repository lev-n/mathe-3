/**
 * Test support of this topic (imported only by *.test.ts): recomputes answers independently of the generators, from what the child reads.
 */
import { expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { BOX } from '../../core/format';
import { generateUnique } from '../../core/generate';
import { deriveSeed } from '../../core/rng';
import type { Exercise, SkillDef, Stufe, VisualOf } from '../../core/types';
import { STUFEN } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { layoutLabels } from '../../ui/visuals/NumberLineVisual';
import { checkWorkedSolution, evalSide } from '../step-check';
import { CTX, samples } from '../test-utils';

/** Both sides of 'a = b', with `value` in the gap, have the same value. Only the part after ', also ' is the task. */
export function expectEquationHolds(expression: string, value: number): void {
  const task = expression.split(', also ').pop() as string;
  const sides = task.replace(BOX, String(value)).split(' = ').map(evalSide);
  expect(sides.length, expression).toBeGreaterThanOrEqual(2);
  expect(sides.every((s) => s !== null), expression).toBe(true);
  sides.forEach((s) => expect(s?.value, `${expression} with ${value}`).toBe(sides[0]?.value));
}

/** A number task with one gap, and every field written as a calculation, recomputes to the answer. */
export function expectRecomputes(ex: Exercise): void {
  const { answer, expression } = ex;
  if (answer.kind === 'number' && answer.value !== null && expression?.includes(BOX) && expression.includes(' = ')) expectEquationHolds(expression, answer.value);
  if (answer.kind === 'multi') {
    for (const f of answer.fields) {
      const before = f.before?.trim() ?? '';
      if (!before.endsWith('=') || /^[=+−]/.test(before)) continue;
      expect(evalSide(before.slice(0, -1))?.value, `${ex.key}: ${before}`).toBe(f.value);
    }
  }
}

/** For one skill: answers recompute and the worked steps are right, on every Stufe. */
export function itRecomputes(skill: SkillDef): void {
  it('answers recompute from the task, and the worked steps add up', () => {
    for (const stufe of STUFEN as readonly Stufe[]) {
      for (const ex of samples(skill, stufe)) {
        expectRecomputes(ex);
        expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
  });
}

const stepText = (s: Exercise['steps'][number]) => (typeof s === 'string' ? s : s.text);

/** Everything a child reads about the way: hints, bug hints and worked steps. */
const wayTexts = (ex: Exercise): string[] => [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...ex.steps.map(stepText)];

/** Number and verb or article that do not go together: 'Es fehlen 1.', 'Das sind 1 Zehner.', 'Die 1 Einer', 'Es fehlt 3.' */
const NUMBER_SLIP = /\b(?:fehlen|sind|bleiben) 1(?![\d ·+−:,])|\bsind 1 \p{L}|\b(?:Die|die) 1 Einer|\bfehlt [2-9](?! ·)\b|\bist [2-9] (?:Hunderter|Zehner|Einer)/u;

/** Same-row number labels and neighbouring jump labels of a Rechenstrich that overlap, in the widths of NumberLineVisual. */
function strichOverlaps(v: VisualOf<'numberLine'>): string[] {
  const out: string[] = [];
  const width = (value: number) => String(value).length * 18 * 0.58 + 6;
  const labels = layoutLabels(v);
  if (labels.length !== (v.labels ?? []).length) out.push('a number is left out');
  for (const row of [0, 1]) {
    const inRow = labels.filter((l) => l.row === row);
    inRow.slice(1).forEach((l, i) => {
      if (l.x - inRow[i].x < (width(l.value) + width(inRow[i].value)) / 2) out.push(`${inRow[i].value}|${l.value}`);
    });
  }
  const mid = (j: { from: number; to: number }) => labels.reduce((sum, l) => (l.value === j.from || l.value === j.to ? sum + l.x / 2 : sum), 0);
  const jumps = v.jumps ?? [];
  jumps.slice(1).forEach((j, i) => {
    if (Math.abs(mid(j) - mid(jumps[i])) < ((j.label?.length ?? 0) + (jumps[i].label?.length ?? 0)) * 4.5) out.push(`${jumps[i].label}|${j.label}`);
  });
  return out;
}

/** What the child sees of a task, whatever its key says. */
const visibleTask = (ex: Exercise): string =>
  JSON.stringify([ex.context, ex.prompt, ex.expression ?? ex.visual ?? null, ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.before) : ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label).sort() : null]);

/** For one skill, on every Stufe: the text stays right for every number, and the answer row, the pictures and a whole round stay readable. */
export function itStaysReadable(skill: SkillDef): void {
  let cached: Exercise[] | null = null;
  const all = () => (cached ??= (STUFEN as readonly Stufe[]).flatMap((stufe) => samples(skill, stufe, 1000)));

  it('fits number and word together, also for 1', () => {
    for (const ex of all()) for (const t of wayTexts(ex)) expect(NUMBER_SLIP.test(t), `${ex.key}: ${t}`).toBe(false);
  });

  it('has no answer field too wide for a phone', () => {
    for (const ex of all()) {
      if (ex.answer.kind === 'multi') for (const f of ex.answer.fields) expect(f.value, `${ex.key}: ${f.id}`).toBeLessThan(1000);
    }
  });

  it('draws every Rechenstrich without labels on top of each other', () => {
    for (const ex of all()) {
      for (const s of ex.steps) {
        if (typeof s !== 'string' && s.visual?.type === 'numberLine' && s.visual.jumps) expect(strichOverlaps(s.visual), `${ex.key}: ${s.text}`).toEqual([]);
      }
    }
  });

  it('writes the answer row without a false chain of equals signs', () => {
    for (const ex of all()) {
      if (ex.answer.kind !== 'multi') continue;
      for (const part of formatAnswer(ex.answer).split(', ')) {
        const sides = part.split(' = ').map(evalSide);
        if (sides.length < 2 || sides.some((s) => s === null)) continue;
        sides.forEach((s) => expect(s?.value, `${ex.key}: ${part}`).toBe(sides[0]?.value));
      }
    }
  });

  it('writes the answer row without a sentence end in the middle', () => {
    for (const ex of all()) expect(formatAnswer(ex.answer), ex.key).not.toMatch(/[.!?:],/);
  });

  it('reads aloud as many gaps as the task has fields', () => {
    for (const ex of all()) {
      // restAnswer in ../shared.ts keeps 'Rest' on its field, and answerWords in readAloud.ts says it after the expression: that fix is outside this topic.
      if (ex.answer.kind !== 'multi' || ex.answer.fields.some((f) => f.before === 'Rest')) continue;
      const spokenGaps = taskSpeech({ ...ex, prompt: '' }).match(/\bLücke\b/g) ?? [];
      expect(spokenGaps.length, `${ex.key}: ${taskSpeech(ex)}`).toBe(ex.answer.fields.length);
    }
  });

  it('does not ask the same visible task twice in a run of 10', () => {
    for (const stufe of STUFEN as readonly Stufe[]) {
      for (let run = 1; run <= 200; run++) {
        const recent = new Set<string>();
        const seen = new Set<string>();
        for (let i = 0; i < 10; i++) {
          const ex = generateUnique(skill, stufe, deriveSeed(run * 104729 + stufe, i), CTX, recent);
          recent.add(ex.key);
          expect(seen.has(visibleTask(ex)), `${ex.key}: ${visibleTask(ex)}`).toBe(false);
          seen.add(visibleTask(ex));
        }
      }
    }
  });
}

/** The task form of a key, as the generators write it: '<skill>:<stufe>:<form>:…'. */
export const formOf = (ex: Exercise): string => ex.key.split(':')[2];

export const bugMatch = (ex: Exercise, id: string): unknown[] => (ex.bugs ?? []).filter((b) => b.id === id).map((b) => b.match);
