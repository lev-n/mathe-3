// The round flow with the real skills: the state code and the generators have to agree on slots, levels and facts.
import { beforeAll, describe, expect, it } from 'vitest';
import { abSequence, roundSize } from '../core/age';
import { createRng } from '../core/rng';
import type { SkillDef, Stufe } from '../core/types';
import { STUFEN } from '../core/types';
import { TOPICS, loadTopic } from '../topics/registry';
import { ALL_FACT_KEYS, DIV_FACT_KEYS, EINMALEINS_SKILL_ID, MUL_FACT_KEYS, UMKEHREN_SKILL_ID, factSkillId } from './facts';
import { buildRound } from './round';
import { emptyState } from './store';
import type { ProgressState } from './types';

const DAY = '2026-10-19';
let skills: SkillDef[] = [];
const skillOf = (id: string) => skills.find((s) => s.id === id)!;

beforeAll(async () => {
  skills = (await Promise.all(TOPICS.map((t) => loadTopic(t.id)))).flatMap((m) => m.skills);
});

/** A state with these facts due today (and the settings the test wants). */
function withDueFacts(keys: readonly string[], extras = true): ProgressState {
  const state = emptyState();
  return {
    ...state,
    settings: { ...state.settings, extras },
    facts: Object.fromEntries(keys.map((k) => [k, { box: 1, due: DAY, seen: 1, correct: 1 }])),
  };
}

describe('skill rounds', () => {
  it('every real skill: 10 items, 8 in schriftlich, with the AB mix of the Stufe, easier items first, each item at its planned level', () => {
    expect(skills.length).toBeGreaterThanOrEqual(61);
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        const slots = buildRound({ mode: 'skill', skillId: skill.id, stufe }, emptyState(), DAY, createRng(1), skills);
        expect(slots).toHaveLength(skill.topicId === 'schriftlich' ? 8 : 10);
        expect(slots.map((s) => s.ab), `${skill.id} Stufe ${stufe}`).toEqual(abSequence(stufe, roundSize(skill.topicId)));
        expect(slots.map((s) => s.ab), skill.id).toEqual([...slots.map((s) => s.ab)].sort());
        slots.forEach((slot, i) => {
          const ex = skill.generate(createRng(i * 37 + 5), stufe, { subtractionMethod: 'abziehen', extras: true, ab: slot.ab, today: DAY });
          expect(ex.ab, `${ex.key} planned AB ${slot.ab}`).toBe(slot.ab);
          expect(ex.skillId).toBe(skill.id);
          expect(ex.stufe).toBe(stufe);
        });
      }
    }
  });
});

describe('review rounds', () => {
  it('a due fact goes to its fact trainer, which returns exactly this fact', () => {
    for (const key of ALL_FACT_KEYS) {
      const slots = buildRound({ mode: 'review' }, withDueFacts([key]), DAY, createRng(2), skills);
      expect(slots, key).toHaveLength(1);
      const [slot] = slots;
      expect(slot.factKey).toBe(key);
      expect(slot.skillId).toBe(factSkillId(key));
      expect(slot.purpose).toBe('review');
      expect(skillOf(slot.skillId).optional, key).toBeUndefined();
      for (let seed = 1; seed <= 5; seed++) {
        const ex = skillOf(slot.skillId).generate(createRng(seed), slot.stufe, { subtractionMethod: 'abziehen', extras: true, factKey: key, today: DAY });
        expect(ex.factKey, key).toBe(key);
      }
    }
  });

  it('at most 3 fact slots in a review round, each with its trainer', () => {
    const slots = buildRound({ mode: 'review' }, withDueFacts(ALL_FACT_KEYS), DAY, createRng(3), skills);
    expect(slots.length).toBe(3);
    for (const slot of slots) expect(slot.skillId).toBe(factSkillId(slot.factKey!));
  });

  it('the trainers are core, so a due fact also comes while extras are hidden', () => {
    expect(skillOf(EINMALEINS_SKILL_ID).optional).toBeUndefined();
    expect(skillOf(UMKEHREN_SKILL_ID).optional).toBeUndefined();
    expect(MUL_FACT_KEYS.every((k) => factSkillId(k) === EINMALEINS_SKILL_ID)).toBe(true);
    expect(DIV_FACT_KEYS.every((k) => factSkillId(k) === UMKEHREN_SKILL_ID)).toBe(true);
    const [slot] = buildRound({ mode: 'review' }, withDueFacts(['7x8'], false), DAY, createRng(4), skills);
    expect(slot).toMatchObject({ skillId: EINMALEINS_SKILL_ID, factKey: '7x8' });
  });

  it('the trainers fill the schedule: an answered recall task carries a tracked fact', () => {
    const fed = new Set<string>();
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (let seed = 1; seed <= 40; seed++) {
          const ex = skill.generate(createRng(seed * 11 + stufe), stufe, { subtractionMethod: 'abziehen', extras: true, today: DAY });
          if (ex.factKey) {
            expect(ALL_FACT_KEYS, ex.key).toContain(ex.factKey);
            expect(factSkillId(ex.factKey), ex.key).toBe(skill.id);
            fed.add(skill.id);
          }
        }
      }
    }
    expect([...fed].sort()).toEqual([EINMALEINS_SKILL_ID, UMKEHREN_SKILL_ID].sort());
  });

});

describe('mixed rounds', () => {
  it('a new topic: 10 slots, 8 in schriftlich, over core skills only, whose generators accept the slot', () => {
    for (const topic of TOPICS) {
      const slots = buildRound({ mode: 'mixed', topicId: topic.id }, emptyState(), DAY, createRng(5), skills);
      expect(slots, topic.id).toHaveLength(roundSize(topic.id));
      for (const slot of slots) {
        const skill = skillOf(slot.skillId);
        expect(skill.topicId).toBe(topic.id);
        expect(skill.optional, slot.skillId).toBeUndefined();
        expect(skill.generate(createRng(9), slot.stufe, { subtractionMethod: 'abziehen', extras: true }).skillId).toBe(slot.skillId);
      }
    }
  });
});
