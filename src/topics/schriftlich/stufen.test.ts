/**
 * Stufe and AB are two separate things in this topic: the Stufe decides the content (docs/research.md §6), the AB the demand inside it. A
 * generator that picks its forms by AB alone gives the same item on every Stufe, and this suite fails.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import topic from './index';

/** A key without its Stufe: the same task on two Stufen has the same rest. */
const task = (ex: Exercise) => ex.key.split(':').slice(2).join(':');

const SAMPLES = 200;

function differing(skill: SkillDef, ab: Ab, low: Stufe, high: Stufe): number {
  let count = 0;
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const ctx = { subtractionMethod: 'abziehen', extras: true, ab } as const;
    if (task(skill.generate(createRng(seed), low, ctx)) !== task(skill.generate(createRng(seed), high, ctx))) count++;
  }
  return count / SAMPLES;
}

describe.each(topic.skills.map((s) => [s.id, s] as const))('%s', (_id, skill) => {
  it.each([1, 2, 3] as Ab[])('AB %i: the same seed gives another task on Stufe 1 and Stufe 3', (ab) => {
    expect(differing(skill, ab, 1, 3)).toBeGreaterThanOrEqual(0.5);
  });

  it.each([1, 2, 3] as Ab[])('AB %i: and on the Stufen next to each other', (ab) => {
    expect(differing(skill, ab, 1, 2)).toBeGreaterThanOrEqual(0.5);
    expect(differing(skill, ab, 2, 3)).toBeGreaterThanOrEqual(0.5);
  });
});
