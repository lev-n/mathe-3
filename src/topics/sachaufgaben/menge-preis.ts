/**
 * Je mehr, desto mehr (docs/research.md §6). The child uses the rule, the words 'proportional' and 'antiproportional' stay out.
 * AB I: double amount, double price, in a table.
 * AB II: table with 1, 2, 5, 10 pieces, as one field per row or as a number.
 * AB III: je mehr, desto weniger: more helpers, less time.
 * Prices in the fields are whole Euro; comma prices appear in the number answers of AB I and II from Stufe 2.
 */
import { TIMES, fmtMoney } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, multiBugs, numberBugs, targetAb } from '../shared';
import { answerStep, euro, priceText, sentenceAnswer, spoken } from './helpers';

const SKILL = { id: 'sachaufgaben.menge-preis', topicId: 'sachaufgaben' } as const;
const KMK = ['MS.funktional', 'ZO.sachrechnen', 'PK.modellieren'];

interface Ware {
  one: string;
  many: string;
  /** A realistic price for 1 piece, in whole Euro. */
  euro: readonly [min: number, max: number];
}

const WAREN: readonly Ware[] = [
  { one: 'Heft', many: 'Hefte', euro: [2, 3] },
  { one: 'Stift', many: 'Stifte', euro: [2, 3] },
  { one: 'Ball', many: 'Bälle', euro: [4, 9] },
  { one: 'Brot', many: 'Brote', euro: [2, 4] },
  { one: 'Buch', many: 'Bücher', euro: [5, 9] },
];

const amount = (n: number, w: Ware) => `${n} ${n === 1 ? w.one : w.many}`;

/** A price table: the rows hold pieces and price, an unknown price is '?'. */
function priceTable(w: Ware, rows: readonly (readonly [pieces: number, price: string])[]): Visual {
  return { type: 'table', caption: 'Preise', header: [w.many, 'Preis'], rows: rows.map(([n, price]) => [String(n), price]) };
}

/** AB I: double amount, double price. Whole Euro on Stufe 1, comma prices from Stufe 2. */
function doppelt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const w = rng.pick(WAREN);
  const n = rng.int(1, 5);
  const comma = stufe >= 2 && rng.chance(0.5);
  const piece = 100 * rng.int(w.euro[0], w.euro[1]) + (comma ? 10 * rng.int(1, 9) : 0);
  const priceCt = n * piece;
  const doubled = 2 * priceCt;
  const shown = comma ? fmtMoney(priceCt) : euro(priceCt / 100);
  const shownDouble = comma ? fmtMoney(doubled) : euro(doubled / 100);
  const context = `${amount(n, w)} kosten ${shown}. ${w.many} kosten immer gleich viel.`.replace(/^1 (\S+) kosten/, '1 $1 kostet');
  const prompt = `Wie viel Euro kosten ${2 * n} ${w.many}?`;
  const before = `${2 * n} ${w.many} kosten`;
  const after = '€.';
  return build(SKILL, stufe, {
    key: `doppelt:${w.one}:${n}:${priceCt}`,
    ab,
    context,
    prompt,
    visual: priceTable(w, [[n, shown], [2 * n, '?']]),
    answer: sentenceAnswer(doubled / 100, before, after, prompt, comma ? { decimals: 2 } : {}),
    hints: ['Wie viel mal so viele sind es?', 'Doppelt so viele kosten doppelt so viel.'],
    steps: [`${2 * n} sind doppelt so viele wie ${n}.`, `Rechnung: 2 ${TIMES} ${shown} = ${shownDouble}`, answerStep(before, comma ? priceText(doubled) : String(doubled / 100), after)],
    bugs: numberBugs(
      [
        { id: 'plus-statt-mal', match: (priceCt + n * 100) / 100, hint: `Doppelt so viele ${w.many} kosten doppelt so viel.` },
        { id: 'preis-gleich', match: priceCt / 100, hint: `Das ist der Preis für ${amount(n, w)}. Gefragt sind ${2 * n}.` },
        comma && { id: 'unsinnig-gross', match: doubled, hint: 'Kann das stimmen? Denk an einen echten Einkauf.' },
      ],
      doubled / 100,
    ),
    praise: 'Du hast erkannt: doppelte Menge, doppelter Preis.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB II: a row 1, 2, 5, 10 with one field per row. Given: 1 or 2 pieces; whole Euro. */
function reihe(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const w = rng.pick(WAREN);
  const p = rng.int(w.euro[0], w.euro[1]);
  const start = stufe === 1 ? 1 : rng.pick([1, 2]);
  const asked = [1, 2, 5, 10].filter((n) => n !== start);
  const fields: MultiField[] = asked.map((n) => ({ id: `s${n}`, value: n * p, before: `${amount(n, w)}:`, after: '€', label: `Preis für ${amount(n, w)}` }));
  const context = `${amount(start, w)} ${start === 1 ? 'kostet' : 'kosten'} ${euro(start * p)}. ${w.many} kosten immer gleich viel.`;
  const prompt = 'Fülle die Tabelle aus.';
  const fromPlus = (n: number) => start * p + (n - start);
  const steps: string[] = [
    start === 1 ? `1 ${w.one} kostet ${euro(p)}.` : `1 ${w.one}: ${euro(2 * p)} : 2 = ${euro(p)}`,
    ...asked.filter((n) => n > 1).map((n) => `${amount(n, w)}: ${n} ${TIMES} ${euro(p)} = ${euro(n * p)}`),
    `Antwort: ${asked.map((n) => euro(n * p)).join(', ')}`,
  ];
  return build(SKILL, stufe, {
    key: `reihe:${w.one}:${start}:${p}`,
    ab,
    context,
    prompt,
    visual: priceTable(w, [1, 2, 5, 10].map((n) => [n, n === start ? euro(start * p) : '?'] as const)),
    answer: { kind: 'multi', fields },
    hints: [start === 1 ? `Jedes Stück kostet ${euro(p)}.` : 'Rechne zuerst den Preis für 1 Stück aus.', 'Rechne jede Zeile mit dem Preis für 1 Stück.'],
    // Stufe 1 keeps four lines (T16)
    steps: stufe === 1 ? [`1 ${w.one} kostet ${euro(p)}.`, `2 ${TIMES} ${euro(p)} = ${euro(2 * p)}; 5 ${TIMES} ${euro(p)} = ${euro(5 * p)}`, `10 ${TIMES} ${euro(p)} = ${euro(10 * p)}`, `Antwort: ${asked.map((n) => euro(n * p)).join(', ')}`] : steps,
    bugs: multiBugs(
      [{ id: 'plus-statt-mal', match: Object.fromEntries(asked.map((n) => [`s${n}`, fromPlus(n)])), hint: 'Jedes Stück kostet den vollen Preis, nicht nur 1 € mehr.' }],
      fields,
    ),
    praise: 'Du hast den Preis für 1 Stück benutzt.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB II: from 10 pieces to 5, from 5 to 10, from 10 to 1, as a number. */
function zehnFuenf(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const w = rng.pick(WAREN);
  const p = rng.int(w.euro[0], w.euro[1]);
  const [from, to] = rng.pick([[10, 5], [5, 10], [10, 1], [2, 10]] as const);
  const value = to * p;
  const context = `${from} ${w.many} kosten ${euro(from * p)}. ${w.many} kosten immer gleich viel.`;
  const prompt = to === 1 ? `Wie viel Euro kostet 1 ${w.one}?` : `Wie viel Euro kosten ${to} ${w.many}?`;
  const before = to === 1 ? `1 ${w.one} kostet` : `${to} ${w.many} kosten`;
  const after = '€.';
  const op = to > from ? `${from * p} € ${TIMES} ${to / from} = ${value} €` : `${from * p} € : ${from / to} = ${value} €`;
  return build(SKILL, stufe, {
    key: `zehn:${w.one}:${from}:${to}:${p}`,
    ab,
    context,
    prompt,
    visual: priceTable(w, [[from, euro(from * p)], [to, '?']]),
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [to > from ? 'Es sind mehr Stück. Wird der Preis höher oder niedriger?' : 'Es sind weniger Stück. Wird der Preis höher oder niedriger?', to > from ? `Wie oft passt die ${from} in die ${to}?` : `Wie oft passt die ${to} in die ${from}?`],
    steps: [to > from ? `${to} ist ${to / from}-mal so viel wie ${from}.` : `${from} ist ${from / to}-mal so viel wie ${to}.`, `Rechnung: ${op}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'plus-statt-mal', match: to > from ? from * p + (to - from) : from * p - (from - to), hint: 'Jedes Stück kostet den vollen Preis, nicht nur 1 €.' },
        { id: 'preis-gleich', match: from * p, hint: `Das ist der Preis für ${from} ${w.many}. Gefragt ${to === 1 ? 'ist 1 Stück' : `sind ${to} Stück`}.` },
      ],
      value,
    ),
    praise: 'Du hast den Preis passend zur Menge verändert.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

interface Helpers {
  id: string;
  text: (h: number, m: number) => string;
  question: (h: number) => string;
  before: (h: number) => string;
  after: string;
  /** What changes in the story: 'Es helfen mehr mit.', and the worked line for double and half. */
  more: string;
  fewer: string;
  double: string;
  half: string;
}

const HELFER: readonly Helpers[] = [
  { id: 'aufraeumen', text: (h, m) => `${h} Kinder räumen die Bücherei in ${m} min auf. Jedes Kind schafft gleich viel.`, question: (h) => `Wie viele Minuten brauchen ${h} Kinder?`, before: (h) => `${h} Kinder brauchen`, after: 'min.', more: 'Es helfen mehr mit. Dauert es länger oder kürzer?', fewer: 'Es helfen weniger mit. Dauert es länger oder kürzer?', double: 'Doppelt so viele Kinder brauchen nur die Hälfte der Zeit.', half: 'Halb so viele Kinder brauchen doppelt so lange.' },
  { id: 'stuehle', text: (h, m) => `${h} Kinder stellen die Stühle in ${m} min auf. Jedes Kind schafft gleich viel.`, question: (h) => `Wie viele Minuten brauchen ${h} Kinder?`, before: (h) => `${h} Kinder brauchen`, after: 'min.', more: 'Es helfen mehr mit. Dauert es länger oder kürzer?', fewer: 'Es helfen weniger mit. Dauert es länger oder kürzer?', double: 'Doppelt so viele Kinder brauchen nur die Hälfte der Zeit.', half: 'Halb so viele Kinder brauchen doppelt so lange.' },
  { id: 'futter', text: (h, m) => `Das Futter reicht für ${h} Ziegen ${m} Tage. Jede Ziege frisst gleich viel.`, question: (h) => `Wie viele Tage reicht das Futter für ${h} Ziegen?`, before: () => 'Das Futter reicht', after: 'Tage.', more: 'Es fressen mehr Ziegen. Reicht das Futter länger oder kürzer?', fewer: 'Es fressen weniger Ziegen. Reicht das Futter länger oder kürzer?', double: 'Doppelt so viele Ziegen: Das Futter reicht nur halb so lange.', half: 'Halb so viele Ziegen: Das Futter reicht doppelt so lange.' },
];

/** The pair: h helpers instead of g, always a clean double or half. */
function helfer(rng: Rng): { g: number; h: number; m: number } {
  const [g, h] = rng.pick([[2, 4], [3, 6], [4, 8], [4, 2], [6, 3], [8, 4]] as const);
  // with more helpers m is even, so the half stays whole
  const m = (h > g ? 2 : 1) * 5 * rng.int(2, 6);
  return { g, h, m };
}

function jeMehrDestoWeniger(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(HELFER);
  const { g, h, m } = helfer(rng);
  const value = (g * m) / h;
  const context = story.text(g, m);
  const prompt = story.question(h);
  const before = story.before(h);
  const more = h > g;
  const factor = more ? h / g : g / h;
  const line = more ? `${m} : ${factor} = ${value}` : `${m} ${TIMES} ${factor} = ${value}`;
  return build(SKILL, stufe, {
    key: `helfer:${story.id}:${g}:${h}:${m}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, story.after, prompt),
    hints: [more ? story.more : story.fewer, more ? `${h} ist doppelt so viel wie ${g}.` : `${h} ist die Hälfte von ${g}.`],
    steps: [more ? story.double : story.half, `Rechnung: ${line}`, answerStep(before, String(value), story.after)],
    bugs: numberBugs(
      [
        Number.isInteger(m / factor) && { id: 'je-mehr-mehr', match: more ? m * factor : m / factor, hint: more ? story.more : story.fewer },
        // not 'plus-statt-mal': the family of that id is about a price, and no price stands in these stories
        { id: 'je-mehr-plus', match: m + (more ? -(h - g) : g - h), hint: 'Rechne nicht mit dem Unterschied. Denk an doppelt und halb.' },
      ],
      value,
    ),
    praise: 'Du hast erkannt: Je mehr, desto weniger.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III as a table: 1, 2, 4 children and the time they need. */
function zeitTabelle(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const base = 20 * rng.int(2, 6);
  const fields: MultiField[] = [
    { id: 'zwei', value: base / 2, before: '2 Kinder:', after: 'min', label: 'Minuten für 2 Kinder' },
    { id: 'vier', value: base / 4, before: '4 Kinder:', after: 'min', label: 'Minuten für 4 Kinder' },
  ];
  const context = `1 Kind braucht ${base} min zum Aufräumen. Jedes Kind schafft gleich viel.`;
  const prompt = 'Fülle die Tabelle aus.';
  return build(SKILL, stufe, {
    key: `zeit:${base}`,
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: 'Aufräumen', header: ['Kinder', 'Minuten'], rows: [['1', String(base)], ['2', '?'], ['4', '?']] },
    answer: { kind: 'multi', fields },
    hints: ['Mehr Kinder helfen mit. Dauert es länger oder kürzer?', 'Doppelt so viele Kinder brauchen die Hälfte der Zeit.'],
    steps: [`2 Kinder: ${base} : 2 = ${base / 2}`, `4 Kinder: ${base / 2} : 2 = ${base / 4}`, `Antwort: ${base / 2} min und ${base / 4} min`],
    bugs: multiBugs(
      [{ id: 'je-mehr-mehr', match: { zwei: base * 2, vier: base * 4 }, hint: 'Mehr Kinder helfen mit. Dauert es länger oder kürzer?' }],
      fields,
    ),
    praise: 'Du hast erkannt: mehr Hilfe, weniger Zeit.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

export const mengePreisSkill: SkillDef = {
  ...SKILL,
  title: 'Je mehr, desto mehr',
  description: 'Du erkennst: Doppelte Menge, doppelter Preis.',
  stufen: { 1: 'Doppelte Menge, doppelter Preis in der Tabelle', 2: 'Tabelle mit 1, 2, 5 und 10 Stück', 3: 'Je mehr Helfer, desto weniger Zeit' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (ab === 1) return doppelt(rng, stufe, ab);
    if (ab === 2) return rng.chance(0.6) ? reihe(rng, stufe, ab) : zehnFuenf(rng, stufe, ab);
    return rng.chance(0.7) ? jeMehrDestoWeniger(rng, stufe, ab) : zeitTabelle(rng, stufe, ab);
  },
};
