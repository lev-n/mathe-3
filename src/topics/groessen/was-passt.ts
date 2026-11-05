/**
 * Was passt? (docs/research.md §6): Größenvorstellung mit Dingen, die Kinder kennen.
 * AB I: choose the fitting unit. AB II: choose the fitting value (Tür 2 m, Apfel 150 g).
 * AB III: "Kann das stimmen?": find the impossible value.
 * Seconds start on Stufe 3 (§2.2): below it no thing, value, unit or known size is in seconds.
 */
import { BOX } from '../../core/format';
import type { ChoiceOption, SkillDef, Stufe } from '../../core/types';
import { makeChoice, pickPerson } from '../shared';
import { generator, qty, sr, unitChoiceSr, type Form } from './helpers';

const SKILL = { id: 'groessen.was-passt', topicId: 'groessen' } as const;
const KMK = ['GM.vorstellung'];

type Dim = 'laenge' | 'gewicht' | 'zeit' | 'geld';

/** Each unit in the smallest of its kind. */
const UNIT_SIZE: Readonly<Record<string, number>> = { mm: 1, cm: 10, m: 1000, km: 1_000_000, g: 1, kg: 1000, s: 1, min: 60, h: 3600, ct: 1, '€': 100 };
const UNITS: Readonly<Record<Dim, readonly string[]>> = { laenge: ['mm', 'cm', 'm', 'km'], gewicht: ['g', 'kg'], zeit: ['s', 'min', 'h'], geld: ['ct', '€'] };
/** Too much, too little. */
const TOO: Readonly<Record<Dim, readonly [string, string]>> = { laenge: ['lang', 'kurz'], gewicht: ['schwer', 'leicht'], zeit: ['lange', 'kurz'], geld: ['teuer', 'billig'] };
/** Known sizes; `thing` is the word stem that also finds compounds ('Kinderbuch'). */
const STUETZ: Readonly<Record<Dim, readonly { line: string; thing: string }[]>> = {
  laenge: [{ line: 'Deine Hand ist etwa 10 cm breit.', thing: 'hand' }, { line: 'Eine Tür ist etwa 2 m hoch.', thing: 'tür' }],
  gewicht: [{ line: 'Eine Packung Mehl wiegt 1 kg.', thing: 'mehl' }, { line: 'Ein Stift wiegt etwa 10 g.', thing: 'stift' }],
  zeit: [{ line: 'Eine Schulstunde dauert 45 min.', thing: 'schulstunde' }, { line: 'Einmal klatschen dauert 1 s.', thing: 'klatschen' }],
  geld: [{ line: 'Ein Brötchen kostet etwa 50 ct.', thing: 'brötchen' }, { line: 'Ein Buch kostet etwa 10 €.', thing: 'buch' }],
};

/** The known sizes of time below Stufe 3, without seconds. */
const ZEIT_OHNE_SEKUNDEN = [STUETZ.zeit[0], { line: 'Ein Kinofilm dauert etwa 2 h.', thing: 'kinofilm' }];

const stuetzOf = (dim: Dim, stufe: Stufe) => (dim === 'zeit' && stufe < 3 ? ZEIT_OHNE_SEKUNDEN : STUETZ[dim]);

const allStuetz = (dim: Dim, stufe: Stufe) => stuetzOf(dim, stufe).map((s) => s.line).join(' ');

interface Ding {
  dim: Dim;
  /** Sentence start with its verb. */
  text: string;
  /** Word after the quantity ('hoch'), if any. */
  adj?: string;
  question: string;
  value: number;
  unit: string;
  /** Values that do not fit: [value, unit]. */
  wrong: readonly (readonly [number, string])[];
}

const DINGE: readonly Ding[] = [
  { dim: 'laenge', text: 'Eine Tür ist', adj: 'hoch', question: 'Wie hoch ist eine Tür?', value: 2, unit: 'm', wrong: [[20, 'cm'], [20, 'm'], [2, 'km']] },
  { dim: 'laenge', text: 'Ein Bleistift ist', adj: 'lang', question: 'Wie lang ist ein Bleistift?', value: 15, unit: 'cm', wrong: [[15, 'mm'], [15, 'm'], [150, 'cm']] },
  { dim: 'laenge', text: 'Ein Schulbus ist', adj: 'lang', question: 'Wie lang ist ein Schulbus?', value: 12, unit: 'm', wrong: [[12, 'cm'], [120, 'm'], [12, 'km']] },
  { dim: 'laenge', text: 'Ein Tisch ist', adj: 'hoch', question: 'Wie hoch ist ein Tisch?', value: 70, unit: 'cm', wrong: [[70, 'mm'], [7, 'm'], [70, 'm']] },
  { dim: 'laenge', text: 'Ein Marienkäfer ist', adj: 'lang', question: 'Wie lang ist ein Marienkäfer?', value: 6, unit: 'mm', wrong: [[6, 'cm'], [6, 'm'], [60, 'cm']] },
  { dim: 'laenge', text: 'Ein Haus ist', adj: 'hoch', question: 'Wie hoch ist ein Haus?', value: 10, unit: 'm', wrong: [[10, 'cm'], [100, 'cm'], [10, 'km']] },
  { dim: 'laenge', text: 'Ein Kind ist', adj: 'groß', question: 'Wie groß ist ein Kind in Klasse 3?', value: 135, unit: 'cm', wrong: [[135, 'mm'], [135, 'm'], [13, 'cm']] },
  { dim: 'laenge', text: 'Die Fahrt in die nächste Stadt ist', adj: 'lang', question: 'Wie lang ist die Fahrt in die nächste Stadt?', value: 20, unit: 'km', wrong: [[20, 'cm'], [20, 'm'], [2, 'm']] },
  { dim: 'gewicht', text: 'Ein Apfel wiegt', question: 'Wie viel wiegt ein Apfel?', value: 150, unit: 'g', wrong: [[150, 'kg'], [15, 'kg'], [5, 'g']] },
  { dim: 'gewicht', text: 'Ein Schulranzen wiegt', question: 'Wie viel wiegt ein Schulranzen?', value: 3, unit: 'kg', wrong: [[3, 'g'], [30, 'kg'], [30, 'g']] },
  { dim: 'gewicht', text: 'Ein Kind wiegt', question: 'Wie viel wiegt ein Kind in Klasse 3?', value: 30, unit: 'kg', wrong: [[30, 'g'], [300, 'g'], [300, 'kg']] },
  { dim: 'gewicht', text: 'Ein Stück Butter wiegt', question: 'Wie viel wiegt ein Stück Butter?', value: 250, unit: 'g', wrong: [[250, 'kg'], [25, 'kg'], [2, 'g']] },
  { dim: 'gewicht', text: 'Ein Brief wiegt', question: 'Wie viel wiegt ein Brief?', value: 20, unit: 'g', wrong: [[20, 'kg'], [2, 'kg'], [200, 'kg']] },
  { dim: 'gewicht', text: 'Eine Katze wiegt', question: 'Wie viel wiegt eine Katze?', value: 4, unit: 'kg', wrong: [[4, 'g'], [40, 'kg'], [400, 'g']] },
  { dim: 'gewicht', text: 'Ein Fahrrad wiegt', question: 'Wie viel wiegt ein Fahrrad?', value: 12, unit: 'kg', wrong: [[12, 'g'], [120, 'kg'], [120, 'g']] },
  { dim: 'zeit', text: 'Eine Schulstunde dauert', question: 'Wie lange dauert eine Schulstunde?', value: 45, unit: 'min', wrong: [[45, 's'], [45, 'h'], [4, 'h']] },
  { dim: 'zeit', text: 'Zähneputzen dauert', question: 'Wie lange dauert Zähneputzen?', value: 3, unit: 'min', wrong: [[3, 's'], [3, 'h'], [30, 'min']] },
  { dim: 'zeit', text: 'Ein Kinofilm dauert', question: 'Wie lange dauert ein Kinofilm?', value: 2, unit: 'h', wrong: [[2, 'min'], [2, 's'], [20, 'h']] },
  { dim: 'zeit', text: 'Einmal klatschen dauert', question: 'Wie lange dauert einmal klatschen?', value: 1, unit: 's', wrong: [[1, 'min'], [1, 'h'], [10, 'min']] },
  { dim: 'zeit', text: 'Der Schulweg zu Fuß dauert', question: 'Wie lange dauert der Schulweg zu Fuß?', value: 15, unit: 'min', wrong: [[15, 's'], [15, 'h'], [5, 'h']] },
  { dim: 'zeit', text: 'Eine Nacht Schlaf dauert', question: 'Wie lange dauert eine Nacht Schlaf?', value: 10, unit: 'h', wrong: [[10, 'min'], [10, 's'], [100, 'min']] },
  { dim: 'geld', text: 'Ein Brötchen kostet', question: 'Wie viel kostet ein Brötchen?', value: 50, unit: 'ct', wrong: [[50, '€'], [5, '€'], [500, '€']] },
  { dim: 'geld', text: 'Ein Fahrrad kostet', question: 'Wie viel kostet ein Fahrrad?', value: 300, unit: '€', wrong: [[300, 'ct'], [3, '€'], [30, 'ct']] },
  { dim: 'geld', text: 'Ein Kinderbuch kostet', question: 'Wie viel kostet ein Kinderbuch?', value: 12, unit: '€', wrong: [[12, 'ct'], [120, '€'], [1200, '€']] },
  { dim: 'geld', text: 'Ein Eis kostet', question: 'Wie viel kostet ein Eis?', value: 2, unit: '€', wrong: [[2, 'ct'], [20, '€'], [200, '€']] },
];

/** The things of this Stufe, and their values that do not fit. */
function dingeOf(stufe: Stufe): readonly Ding[] {
  if (stufe >= 3) return DINGE;
  return DINGE.filter((d) => d.unit !== 's').map((d) => ({ ...d, wrong: d.wrong.filter(([, u]) => u !== 's') }));
}

const unitsOf = (dim: Dim, stufe: Stufe) => UNITS[dim].filter((u) => stufe >= 3 || u !== 's');

const fact = (d: Ding, value: number, unit: string) => `${d.text} ${qty(value, unit)}${d.adj ? ` ${d.adj}` : ''}.`;

const sizeOf = (value: number, unit: string) => value * UNIT_SIZE[unit];

/** Why this value does not fit the thing. */
function whyNot(d: Ding, value: number, unit: string): string {
  const [more, less] = TOO[d.dim];
  return `Stell dir ${qty(value, unit)} vor. Das ist viel zu ${sizeOf(value, unit) > sizeOf(d.value, d.unit) ? more : less}.`;
}

/** A hint with known sizes: never the thing the task asks about, that would be the answer. */
const stuetzHint = (d: Ding, stufe: Stufe) => stuetzOf(d.dim, stufe).filter((s) => !d.text.toLowerCase().includes(s.thing)).map((s) => s.line).join(' ');
const hintsOf = (d: Ding, stufe: Stufe) => ['Stell dir das genau vor.', stuetzHint(d, stufe)];

const steps = (d: Ding, stufe: Stufe) => [allStuetz(d.dim, stufe), fact(d, d.value, d.unit)];

const einheit: Form = (rng, stufe, ab) => {
  const d = rng.pick(dingeOf(stufe));
  const prompt = `${d.text} ${d.value} ${BOX}${d.adj ? ` ${d.adj}` : ''}. Welche Einheit passt?`;
  const wrongs: ChoiceOption[] = unitsOf(d.dim, stufe).filter((u) => u !== d.unit).map((u) => ({ label: u, whyWrong: whyNot(d, d.value, u) }));
  const answer = makeChoice(rng, { label: d.unit }, wrongs, { layout: 'symbols', max: stufe === 1 ? 4 : 6 });
  return {
    key: `einheit:${d.text}`,
    ab,
    prompt,
    answer,
    hints: hintsOf(d, stufe),
    steps: steps(d, stufe),
    praise: 'Du hast dir die Größe genau vorgestellt.',
    srText: sr(prompt, unitChoiceSr(answer)),
    kmk: KMK,
  };
};

const wert: Form = (rng, stufe, ab) => {
  const d = rng.pick(dingeOf(stufe));
  const wrongs = d.wrong.map(([v, u]) => ({ label: qty(v, u), whyWrong: whyNot(d, v, u) }));
  return {
    key: `wert:${d.text}`,
    ab,
    prompt: d.question,
    answer: makeChoice(rng, { label: qty(d.value, d.unit) }, wrongs, { max: stufe === 1 ? 4 : 6 }),
    hints: hintsOf(d, stufe),
    steps: steps(d, stufe),
    praise: 'Du hast mit bekannten Dingen verglichen.',
    srText: sr(d.question),
    kmk: KMK,
  };
};

const stimmt: Form = (rng, stufe, ab) => {
  const d = rng.pick(dingeOf(stufe));
  const who = pickPerson(rng);
  const possible = rng.chance(0.5);
  const [v, u] = possible ? [d.value, d.unit] : rng.pick(d.wrong);
  const context = `${who.name} sagt: ${fact(d, v, u)}`;
  const prompt = 'Kann das stimmen?';
  const yes: ChoiceOption = { label: 'Ja, das kann stimmen.' };
  const no: ChoiceOption = { label: 'Nein, das kann nicht stimmen.' };
  return {
    key: `stimmt:${d.text}:${v}:${u}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, possible ? yes : no, [{ ...(possible ? no : yes), whyWrong: possible ? `Das passt. ${fact(d, d.value, d.unit)}` : whyNot(d, v, u) }], { order: [yes.label, no.label] }),
    hints: hintsOf(d, stufe),
    steps: possible ? steps(d, stufe) : [allStuetz(d.dim, stufe), `Das kann nicht stimmen: ${qty(v, u)}.`, fact(d, d.value, d.unit)],
    praise: 'Du hast die Angabe an etwas Bekanntem geprüft.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

/** Three things with fitting values and one with an impossible value. */
const unmoeglich: Form = (rng, stufe, ab) => {
  const [bad, ...good] = rng.sample(dingeOf(stufe), 4);
  const [v, u] = rng.pick(bad.wrong);
  const prompt = 'Welche Angabe kann nicht stimmen?';
  const wrongs = good.map((d) => ({ label: fact(d, d.value, d.unit), whyWrong: 'Das kann stimmen. Prüfe die anderen Angaben.' }));
  return {
    key: `unmoeglich:${bad.text}:${v}:${u}:${good.map((d) => d.text).join('|')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fact(bad, v, u) }, wrongs),
    hints: ['Stell dir jede Angabe genau vor.', 'Schau auch auf die Einheit.'],
    steps: [`Das kann nicht stimmen: ${qty(v, u)}.`, fact(bad, bad.value, bad.unit)],
    praise: 'Du hast die unmögliche Angabe gefunden.',
    srText: sr(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

export const wasPasstSkill: SkillDef = {
  ...SKILL,
  title: 'Was passt?',
  description: 'Du schätzt mit Dingen, die du gut kennst.',
  stufen: { 1: 'Die passende Einheit wählen', 2: 'Den passenden Wert wählen', 3: 'Kann das stimmen? Unmögliche Angaben finden' },
  kmk: KMK,
  generate: generator(SKILL, { 1: [einheit], 2: [wert], 3: [stimmt, unmoeglich] }),
};
