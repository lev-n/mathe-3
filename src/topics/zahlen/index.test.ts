import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import topic from './index';
import { all } from './testHelp';

/** The rows of the catalogue table of this topic (docs/research.md §6). */
function katalog(): { id: string; titel: string; beschreibung: string; status: string }[] {
  const text = readFileSync(new URL('../../../docs/research.md', import.meta.url), 'utf8');
  const teil = text.slice(text.indexOf('### `zahlen`'), text.indexOf('### `schriftlich`'));
  return teil
    .split('\n')
    .filter((l) => l.startsWith('| `zahlen.'))
    .map((l) => l.split('|').map((c) => c.trim()))
    .map((c) => ({ id: c[1].replace(/`/g, ''), titel: c[2], beschreibung: c[3], status: c[c.length - 2] }));
}

describe('the whole topic', () => {
  it('a tap writes and places nothing: the praise of a choice names what the child really did', () => {
    for (const skill of topic.skills) {
      for (const ex of all(skill, 100)) {
        if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(/schrieben|gesetzt|gestellt|gelegt|geordnet|eingetragen|getippt/);
      }
    }
  });

  it('no task or screen-reader text states a number answer', () => {
    for (const skill of topic.skills) {
      for (const ex of all(skill, 150)) {
        if (ex.answer.kind !== 'number' || ex.answer.value === null || ex.answer.value < 10) continue;
        const shown = new RegExp(`(?<!\\d)${ex.answer.value}(?!\\d)`);
        expect(`${ex.prompt} ${ex.expression ?? ''}`, ex.key).not.toMatch(shown);
        expect(ex.srText, ex.key).not.toMatch(shown);
      }
    }
  });
});

describe('screen readers', () => {
  it('get words, never the box sign, in the hidden task text and in the name of a field', () => {
    for (const skill of topic.skills) {
      for (const ex of all(skill, 150)) {
        const a = ex.answer;
        const namen = a.kind === 'number' ? [a.label] : a.kind === 'multi' ? a.fields.map((f) => f.label) : [];
        for (const text of [ex.srText, ...namen]) expect(text ?? '', ex.key).not.toContain('□');
      }
    }
  });
});

describe('the topic follows the catalogue', () => {
  it('has its skills in teaching order, with the title and description word for word', () => {
    expect(topic.skills.map((s) => ({ id: s.id, titel: s.title, beschreibung: s.description }))).toEqual(katalog().map(({ id, titel, beschreibung }) => ({ id, titel, beschreibung })));
  });

  it('marks exactly the optional skills as Extra', () => {
    for (const k of katalog()) expect(topic.skills.find((s) => s.id === k.id)?.optional, k.id).toBe(k.status === 'opt' ? 'extra' : undefined);
  });
});
