import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { CTX } from '../test-utils';
import topic from './index';

const SEEDS = 200;
/** What the child gets, without the Stufe in the key: the form and the numbers of the item. */
const inhalt = (ex: Exercise) => ex.key.split(':').slice(2).join(':');

/** The share of same-seed items that differ between two Stufen. */
function unterschied(skill: (typeof topic.skills)[number], a: Stufe, b: Stufe, ab: Ab): number {
  let anders = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const x = skill.generate(createRng(seed * 3571), a, { ...CTX, ab });
    const y = skill.generate(createRng(seed * 3571), b, { ...CTX, ab });
    if (inhalt(x) !== inhalt(y)) anders++;
  }
  return anders / SEEDS;
}

describe('the Stufe decides the content, not only the AB mix', () => {
  it('has all 9 skills', () => {
    expect(topic.skills.length).toBe(9);
  });

  for (const skill of topic.skills) {
    for (const ab of [1, 2, 3] as Ab[]) {
      it(`${skill.id}, AB ${ab}: at least half of the same-seed items differ between the Stufen`, () => {
        expect(unterschied(skill, 1, 3, ab), 'Stufe 1 and Stufe 3').toBeGreaterThanOrEqual(0.5);
        expect(unterschied(skill, 1, 2, ab), 'Stufe 1 and Stufe 2').toBeGreaterThanOrEqual(0.5);
        expect(unterschied(skill, 2, 3, ab), 'Stufe 2 and Stufe 3').toBeGreaterThanOrEqual(0.5);
      });
    }
  }
});
