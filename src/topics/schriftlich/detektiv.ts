/**
 * Fehlerdetektiv (docs/research.md §7.1): a calculation with a planted, computed mistake. The child finds the place, names the mistake or
 * calculates again. A wrong result always comes from the bug library, so that the mistake on screen is one that children really make.
 */
import { speak } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, Stufe, SubtractionMethod, WrittenOp } from '../../core/types';
import { correctResult, firstDiffPlace, numLength, placeDative, placeName, writtenVisual } from '../../core/written';
import { build, makeChoice, pickPerson } from '../shared';
import { candidatesFor, otherReadings, type BugCandidate } from './bugs';
import { columnSteps, equationOf, solved, writtenItem, type SkillRef } from './common';

/** Bugs that can be shown in a layout with correct columns. */
const PLANTABLE: Record<WrittenOp, readonly string[]> = {
  add: ['uebertrag-vergessen', 'uebertrag-zur-null', 'uebertrag-zu-viel', 'null-plus'],
  sub: ['uebertrag-minus', 'kleiner-von-groesser', 'null-minus', 'minus-null', 'ueber-die-null', 'gleiche-ziffern', 'stellenzahl'],
  mul: ['mal-uebertrag', 'uebertrag-zur-null'],
};

export interface Planted {
  op: WrittenOp;
  operands: number[];
  method: SubtractionMethod;
  bug: BugCandidate;
  shown: number;
  /** The rightmost wrong digit. */
  place: number;
}

/** The planted bugs these numbers show. The wrong result has as many digits as the right one, or the mistake is obvious at a glance. */
export function plantable(op: WrittenOp, operands: number[], method: SubtractionMethod): Planted[] {
  const correct = correctResult(op, operands);
  return candidatesFor(op, operands, method)
    .filter((c): c is BugCandidate & { value: number } => PLANTABLE[op].includes(c.id) && c.value !== null && c.value > 0 && c.value !== correct && numLength(c.value) === numLength(correct))
    .map((bug) => ({ op, operands, method, bug, shown: bug.value, place: firstDiffPlace(correct, bug.value) }));
}

/** Other mistakes as answer options. The columns on screen stand correctly, so the layout is no option here. */
function explanationOptions(pl: Planted): ChoiceOption[] {
  return otherReadings(pl.op, pl.operands, pl.method, pl.bug, pl.shown)
    .filter((c) => c.id !== 'nicht-stellengerecht')
    .map((c) => ({ label: c.label, whyWrong: `Rechne die ${placeName(pl.place)} selbst nach. Was fällt dir auf?` }));
}

/** The forms of a Fehlerdetektiv: find the place, name the mistake, calculate again. */
export type DetektivForm = 'wo' | 'warum' | 'neu';

/**
 * A Fehlerdetektiv item for planted numbers, by a draw of `forms`. §7.1: 'Stufe 3 or after Sicher'. A generator does not know the mastery, so
 * only Stufe 3 asks for one.
 */
export function detektivItem(skill: SkillRef, stufe: Stufe, ab: Ab, rng: Rng, pl: Planted, kmk: string[], forms: readonly DetektivForm[] = ['wo', 'warum', 'neu']): Exercise {
  const { op, operands, method, shown, place } = pl;
  const person = pickPerson(rng);
  const correct = correctResult(op, operands);
  const given = equationOf(op, operands, shown);
  const visual = writtenVisual({ type: 'written', op, operands: [...operands], method: op === 'sub' ? method : undefined, showSolution: false, shownResult: shown });
  const form = rng.pick(forms);
  const columnLine = columnSteps(op, operands, method)[place];
  const key = `det-${form}:${op}:${operands.join('|')}:${pl.bug.id}:${method[0]}`;
  const commonSteps = [
    `Hier steht ${given}.`,
    ...(columnLine ? [columnLine] : []),
    `Der Fehler: ${pl.bug.label}`,
    { text: `Richtig ist ${equationOf(op, operands)}.`, visual: solved(op, operands, method, stufe) },
  ];
  const srLead = `${person.name} rechnet ${speak(given)}.`;

  if (form === 'neu') {
    return writtenItem(skill, stufe, {
      ab,
      op,
      operands,
      method,
      kmk,
      form: key,
      prompt: `${person.name} rechnet so. Rechne selbst neu. Fang bei den Einern an.`,
      visual,
      bugs: [{ id: pl.bug.id, match: shown, hint: pl.bug.hint }],
      praise: 'Du hast Spalte für Spalte neu gerechnet.',
      srLead: `${srLead} Rechne selbst neu`,
    });
  }

  const hints = ['Rechne selbst nach, von den Einern aus.', `Vergleiche jede Spalte mit dem Ergebnis von ${person.name}.`];
  if (form === 'wo') {
    const width = Math.max(numLength(correct), numLength(shown));
    const places = Array.from({ length: Math.min(width, 4) }, (_, p) => p).reverse();
    const label = (p: number) => `Bei den ${placeDative(p)}`;
    const wrongs = places
      .filter((p) => p !== place)
      .map((p): ChoiceOption => ({ label: label(p), whyWrong: p < place ? `Bei den ${placeDative(p)} stimmt alles. Schau weiter nach links.` : 'Schau zuerst weiter rechts. Dort steckt der erste Fehler.' }));
    return build(skill, stufe, {
      key,
      ab,
      prompt: `${person.name} rechnet so. Von den Einern aus: Wo steckt der erste Fehler?`,
      visual,
      answer: makeChoice(rng, { label: label(place) }, wrongs, { order: places.map(label) }),
      hints,
      steps: commonSteps,
      praise: 'Du hast die Rechnung Spalte für Spalte geprüft.',
      srText: `${srLead} Wo steckt der erste Fehler?`,
      kmk,
    });
  }
  return build(skill, stufe, {
    key,
    ab,
    prompt: `${person.name} rechnet so. Was stimmt nicht?`,
    visual,
    answer: makeChoice(rng, { label: pl.bug.label }, rng.shuffle(explanationOptions(pl)), { max: 4 }),
    hints,
    steps: commonSteps,
    praise: 'Du hast den Fehler in der Rechnung erkannt.',
    srText: `${srLead} Was stimmt nicht?`,
    kmk,
  });
}
