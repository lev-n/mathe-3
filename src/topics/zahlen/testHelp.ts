/** Test support of the topic (imported only by *.test.ts): exercises of one planned AB level, and the arithmetic of worked solutions. */
import { expect } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Step, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';

/** n exercises with this planned AB level, over all three Stufen. */
export function samplesAb(skill: SkillDef, ab: Ab, n = 300): Exercise[] {
  const stufen: Stufe[] = [1, 2, 3];
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 4099 + 17), stufen[i % 3], { ...CTX, ab }));
}

/** n exercises of one Stufe with one planned AB level. */
export function samplesOf(skill: SkillDef, stufe: Stufe, ab: Ab, n = 150): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 4099 + 17 + stufe * 7 + ab), stufe, { ...CTX, ab }));
}

/** Every Stufe with every AB level: the cells of the table each skill pins. */
export const ZELLEN: readonly (readonly [Stufe, Ab])[] = ([1, 2, 3] as Stufe[]).flatMap((s) => ([1, 2, 3] as Ab[]).map((a) => [s, a] as const));

export const all = (skill: SkillDef, n = 200): Exercise[] => ([1, 2, 3] as Ab[]).flatMap((ab) => samplesAb(skill, ab, n));

/** Worked solutions compute, and the last step states the result. */
export function solutionProblems(skill: SkillDef): string[] {
  return all(skill).flatMap(checkWorkedSolution);
}

export const stepText = (s: Step) => (typeof s === 'string' ? s : s.text);

/** The matches of the bugs with this id. */
export const bugValue = (ex: Exercise, id: string) => (ex.bugs ?? []).filter((b) => b.id === id).map((b) => b.match);

export const kindOf = (ex: Exercise) => ex.key.split(':')[2];

/** The task forms that one Stufe and AB level produce. */
export const kindsOf = (skill: SkillDef, stufe: Stufe, ab: Ab, n = 150) => [...new Set(samplesOf(skill, stufe, ab, n).map(kindOf))].sort();

/** The table a skill pins: which task forms belong to each Stufe and AB level. */
export type Scope = Readonly<Record<Stufe, Readonly<Record<Ab, readonly string[]>>>>;

/** Every cell produces exactly the forms of the table, so no Stufe borrows content from another one. */
export function expectScope(skill: SkillDef, scope: Scope, n = 200): void {
  for (const [stufe, ab] of ZELLEN) expect(kindsOf(skill, stufe, ab, n), `${skill.id}, Stufe ${stufe}, AB ${ab}`).toEqual([...scope[stufe][ab]].sort());
}

/** All exercises of the listed Stufe and AB cells. */
export const samplesIn = (skill: SkillDef, cells: readonly (readonly [Stufe, Ab])[], n = 150): Exercise[] => cells.flatMap(([s, a]) => samplesOf(skill, s, a, n));
