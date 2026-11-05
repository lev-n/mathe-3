/**
 * Wie viel mehr? Wievielmal? (docs/research.md §6).
 * AB I: the difference of two amounts, numbers up to 1000.
 * AB II: 3-mal so viel, product up to 1000.
 * AB III: the reverse: Tom has 120, 3-mal so viel wie Mia; 'mehr als' to the smaller amount; wievielmal.
 */
import { MINUS, TIMES } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, numberBugs, pickTwo, targetAb } from '../shared';
import { HINT, answerStep, rechenstrich, sentenceAnswer, spoken, storyNumber } from './helpers';

const SKILL = { id: 'sachaufgaben.vergleichen', topicId: 'sachaufgaben' } as const;
const KMK = ['ZO.sachrechnen', 'PK.modellieren'];

const THINGS = ['Karten', 'Murmeln', 'Aufkleber', 'Punkte'] as const;

const DIFF_HINT = 'Gefragt ist der Unterschied: Wie viele sind es mehr?';

function unterschied(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const thing = rng.pick(THINGS);
  const big = storyNumber(rng, stufe, 300, 900);
  const small = storyNumber(rng, stufe, 100, big - 20);
  const value = big - small;
  // both orders of the story, and 'mehr' as well as 'weniger'
  const bigFirst = rng.chance(0.5);
  const more = rng.chance(0.6);
  const context = bigFirst ? `${p.name} hat ${big} ${thing}. ${q.name} hat ${small} ${thing}.` : `${q.name} hat ${small} ${thing}. ${p.name} hat ${big} ${thing}.`;
  const prompt = more ? `Wie viele ${thing} hat ${p.name} mehr als ${q.name}?` : `Wie viele ${thing} hat ${q.name} weniger als ${p.name}?`;
  const before = more ? `${p.name} hat` : `${q.name} hat`;
  const after = more ? `${thing} mehr.` : `${thing} weniger.`;
  return build(SKILL, stufe, {
    key: `diff:${big}:${small}:${more ? 'mehr' : 'weniger'}:${bigFirst ? 'gross' : 'klein'}:${thing}`,
    ab,
    context,
    prompt,
    ...(stufe <= 2 ? { visual: rechenstrich(small, big, '?') } : {}),
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [more ? 'Gefragt ist der Unterschied. Wie viele sind es mehr?' : 'Gefragt ist der Unterschied. Wie viele sind es weniger?', `Geh von ${small} aus weiter bis ${big}.`],
    steps: [`Der Unterschied zwischen ${big} und ${small} ist gesucht.`, { text: `Rechnung: ${big} ${MINUS} ${small} = ${value}`, visual: rechenstrich(small, big, `+ ${value}`) }, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'mehr-unterschied', match: big, hint: more ? DIFF_HINT : 'Gefragt ist der Unterschied: Wie viele sind es weniger?' },
        { id: 'mehr-unterschied', match: small, hint: more ? DIFF_HINT : 'Gefragt ist der Unterschied: Wie viele sind es weniger?' },
        { id: 'signalwort', match: big + small, hint: 'Hier kommt nichts dazu. Du vergleichst nur die beiden Mengen.' },
      ],
      value,
    ),
    praise: 'Du hast den Unterschied zwischen den Mengen gefunden.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

interface Times {
  id: string;
  text: (base: number, n: number, a: string, b: string) => string;
  question: (a: string) => string;
  before: (a: string) => string;
  after: string;
  /** Hint word: '3-mal so viel<e>'. */
  word: string;
  /** Base value in a sensible range for this story. */
  base: (rng: Rng, stufe: Stufe) => number;
  /** The largest result that still tells a real story (default: the number range). */
  maxValue?: number;
}

const baseOfCount = (rng: Rng, stufe: Stufe) => (stufe === 1 ? rng.int(2, 9) * 10 : stufe === 2 ? rng.int(2, 20) * 10 : rng.int(12, 99));

const TIMES_STORIES: readonly Times[] = [
  { id: 'karten', text: (base, n, a, b) => `${b} hat ${base} Karten. ${a} hat ${n}-mal so viele Karten.`, question: (a) => `Wie viele Karten hat ${a}?`, before: (a) => `${a} hat`, after: 'Karten.', word: 'so viele', base: baseOfCount },
  { id: 'preis', text: (base, n) => `Ein Buch kostet ${base} €. Ein Spiel kostet ${n}-mal so viel.`, question: () => 'Wie viel Euro kostet das Spiel?', before: () => 'Das Spiel kostet', after: '€.', word: 'so viel', base: (rng) => rng.int(4, 20), maxValue: 60 },
  { id: 'gaeste', text: (base, n) => `Am Freitag kommen ${base} Gäste in den Zoo. Am Samstag kommen ${n}-mal so viele Gäste.`, question: () => 'Wie viele Gäste kommen am Samstag?', before: () => 'Am Samstag kommen', after: 'Gäste.', word: 'so viele', base: baseOfCount },
  { id: 'alter', text: (base, n, a) => `${a} ist ${base} Jahre alt. Der Opa von ${a} ist ${n}-mal so alt.`, question: (a) => `Wie alt ist der Opa von ${a}?`, before: () => 'Der Opa ist', after: 'Jahre alt.', word: 'so alt', base: (rng) => rng.int(8, 9) },
];

function malSoViel(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(TIMES_STORIES);
  const [p, q] = pickTwo(rng);
  const base = story.base(rng, stufe);
  const maxN = Math.min(9, Math.floor((story.maxValue ?? 1000) / base));
  const n = story.id === 'alter' ? rng.int(7, 9) : rng.int(2, stufe === 1 ? Math.min(5, maxN) : maxN);
  const value = n * base;
  const context = story.text(base, n, p.name, q.name);
  const prompt = story.question(p.name);
  const before = story.before(p.name);
  const hint = n <= 4 ? `${n}-mal ${story.word} heißt: ${Array.from({ length: n }, () => base).join(' + ')}.` : `${n}-mal ${story.word} heißt: ${n} ${TIMES} ${base}.`;
  return build(SKILL, stufe, {
    key: `mal:${story.id}:${base}:${n}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, story.after, prompt),
    hints: [`Das Wort „mal“ heißt: ${n} gleich große Teile.`, `Jeder Teil ist ${base} groß.`],
    steps: [
      hint,
      { text: `Rechnung: ${n} ${TIMES} ${base} = ${value}`, visual: { type: 'numberLine', min: 0, max: value, majorStep: base, minorStep: base, labelMajor: true, jumps: Array.from({ length: n }, (_, i) => ({ from: i * base, to: (i + 1) * base, label: `+ ${base}` })) } },
      answerStep(before, String(value), story.after),
    ],
    bugs: numberBugs(
      [
        { id: 'mal-als-mehr', match: base + n, hint },
        Number.isInteger(base / n) && { id: 'signalwort', match: base / n, hint: `${n}-mal ${story.word} heißt: Es wird mehr.` },
      ],
      value,
    ),
    praise: `Du hast „${n}-mal ${story.word}“ richtig gerechnet.`,
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III: Tom has 120, that is 3-mal so viel wie Mia. The word 'mal' stands at a geteilt Rechnung (T14). */
function rueckwaertsMal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const thing = rng.pick(THINGS);
  const n = rng.int(2, 6);
  const value = stufe === 1 ? rng.int(2, 9) * 10 : stufe === 2 ? rng.int(4, 30) * 5 : rng.int(11, 99);
  const total = n * value;
  const context = `${p.name} hat ${total} ${thing}. Das sind ${n}-mal so viele ${thing} wie bei ${q.name}.`;
  const prompt = `Wie viele ${thing} hat ${q.name}?`;
  const before = `${q.name} hat`;
  const after = `${thing}.`;
  const parts = `${p.name} hat ${n} gleich große Teile. ${q.name} hat einen Teil davon.`;
  return build(SKILL, stufe, {
    key: `rueck:${total}:${n}:${thing}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [`Wer hat mehr: ${p.name} oder ${q.name}?`, parts],
    steps: [`${p.name} hat mehr. ${q.name} hat also weniger als ${total}.`, parts, `Rechnung: ${total} : ${n} = ${value}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'signalwort', match: total * n, hint: `${p.name} hat mehr als ${q.name}. Also hat ${q.name} weniger als ${total}.` },
        { id: 'mal-als-mehr', match: total - n, hint: parts },
        { id: 'mal-als-mehr', match: total + n, hint: parts },
      ],
      value,
    ),
    praise: 'Du hast dich vom Wort „mal“ nicht leiten lassen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III: 'mehr als', and the smaller amount is asked for. */
function rueckwaertsMehr(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const thing = rng.pick(THINGS);
  const total = storyNumber(rng, stufe, 300, 900);
  const d = storyNumber(rng, stufe, 20, 190);
  const value = total - d;
  const context = `${p.name} hat ${total} ${thing}. Das sind ${d} ${thing} mehr als bei ${q.name}.`;
  const prompt = `Wie viele ${thing} hat ${q.name}?`;
  const before = `${q.name} hat`;
  const after = `${thing}.`;
  return build(SKILL, stufe, {
    key: `mehr:${total}:${d}:${thing}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [HINT.signalwort, `Wer hat mehr: ${p.name} oder ${q.name}?`],
    steps: [`${p.name} hat mehr. ${q.name} hat also weniger als ${total}.`, { text: `Rechnung: ${total} ${MINUS} ${d} = ${value}`, visual: rechenstrich(total, value, `${MINUS} ${d}`) }, answerStep(before, String(value), after)],
    bugs: numberBugs([{ id: 'signalwort', match: total + d, hint: `Stell dir die Geschichte vor. Hat ${q.name} mehr oder weniger als ${p.name}?` }], value),
    praise: 'Du hast dich vom Wort „mehr“ nicht leiten lassen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III: wievielmal. The child divides in the head, with no written division (§2.4): by a one-digit number or a Zehnerzahl only. */
function wievielmal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const thing = rng.pick(THINGS);
  const value = rng.int(2, 9);
  const small = rng.int(2, 9) * (stufe === 1 ? 1 : 10);
  const big = value * small;
  const context = `${p.name} hat ${big} ${thing}. ${q.name} hat ${small} ${thing}.`;
  const prompt = `Wievielmal so viele ${thing} hat ${p.name} wie ${q.name}?`;
  const before = `${p.name} hat`;
  const after = `-mal so viele ${thing}.`;
  return build(SKILL, stufe, {
    key: `wieviel:${big}:${small}:${thing}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [`Wie oft passt die ${small} in die ${big}?`, 'Gefragt ist nicht der Unterschied.'],
    steps: [`Wie oft passt die ${small} in die ${big}?`, `Rechnung: ${big} : ${small} = ${value}`, `Antwort: ${before} ${value}-mal so viele ${thing}.`],
    // 'mal-als-mehr', not 'mehr-unterschied': the family of that id is about finding the difference, which this task does not ask for
    bugs: numberBugs([{ id: 'mal-als-mehr', match: big - small, hint: `Gefragt ist nicht der Unterschied. Wie oft passt die ${small} hinein?` }], value),
    praise: 'Du hast die kleine Menge mit der großen verglichen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

export const vergleichenSkill: SkillDef = {
  ...SKILL,
  title: 'Wie viel mehr? Wievielmal?',
  description: 'Du vergleichst zwei Mengen.',
  stufen: { 1: 'Wie viel mehr? Wie viel weniger?', 2: 'So viel mal so viele', 3: 'Rückwärts: Wie viele hat das andere Kind?' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (ab === 1) return unterschied(rng, stufe, ab);
    if (ab === 2) return malSoViel(rng, stufe, ab);
    const form = rng.pick([rueckwaertsMal, rueckwaertsMal, rueckwaertsMehr, wievielmal]);
    return form(rng, stufe, ab);
  },
};
