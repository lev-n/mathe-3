/**
 * Geschichten mit einer Rechnung (docs/research.md §6).
 * AB I: plus or minus, numbers up to 1000, every number is needed.
 * AB II: mal or geteilt, numbers up to 1000; a Punktefeld for facts on Stufe 1 and 2, Zehnerzahlen from Stufe 2.
 * AB III: unknown start, unknown change, or one number the question does not need.
 */
import { MINUS, TIMES } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, numberBugs, pickPerson, targetAb } from '../shared';
import { EXTRA_STORIES, HEFT_EURO, HINT, PARTS_LOOK, PARTS_PRAISE_PLUS, answerStep, partsSought, partsWrongOp, rechenstrich, sentenceAnswer, spoken, storyNumber } from './helpers';

const SKILL = { id: 'sachaufgaben.ein-schritt', topicId: 'sachaufgaben' } as const;
const KMK = ['ZO.sachrechnen', 'PK.modellieren'];

interface Told {
  id: string;
  /** A whole and its parts: nothing comes or goes, so the help does not ask about it. */
  parts?: boolean;
  text: (a: number, b: number, name: string) => string;
  question: (name: string) => string;
  before: (name: string) => string;
  after: string;
}

const PLUS: readonly Told[] = [
  { id: 'regal', text: (a, b) => `Im Regal stehen ${a} Bücher. Die Bücherei stellt ${b} Bücher dazu.`, question: () => 'Wie viele Bücher stehen jetzt im Regal?', before: () => 'Im Regal stehen jetzt', after: 'Bücher.' },
  { id: 'karten', text: (a, b, n) => `${n} hat ${a} Karten. ${n} bekommt ${b} Karten dazu.`, question: (n) => `Wie viele Karten hat ${n} jetzt?`, before: (n) => `${n} hat jetzt`, after: 'Karten.' },
  { id: 'gaeste', text: (a, b) => `Vormittags kommen ${a} Gäste zum Schulfest. Nachmittags kommen ${b} Gäste.`, question: () => 'Wie viele Gäste kommen insgesamt?', before: () => 'Insgesamt kommen', after: 'Gäste.' },
  { id: 'tiere', parts: true, text: (a, b) => `Im Zoo leben ${a} Vögel. Dazu leben dort ${b} Fische.`, question: () => 'Wie viele Tiere sind das insgesamt?', before: () => 'Das sind insgesamt', after: 'Tiere.' },
];

const MINUS_STORIES: readonly Told[] = [
  { id: 'ausleihen', text: (a, b) => `Im Regal stehen ${a} Bücher. Kinder leihen ${b} Bücher aus.`, question: () => 'Wie viele Bücher bleiben im Regal?', before: () => 'Im Regal bleiben', after: 'Bücher.' },
  { id: 'aufkleber', text: (a, b, n) => `${n} hat ${a} Aufkleber. ${n} verschenkt ${b} Aufkleber.`, question: (n) => `Wie viele Aufkleber hat ${n} noch?`, before: (n) => `${n} hat noch`, after: 'Aufkleber.' },
  { id: 'erwachsene', parts: true, text: (a, b) => `Zum Schulfest kommen insgesamt ${a} Gäste. ${b} Gäste sind Kinder.`, question: () => 'Wie viele Gäste sind Erwachsene?', before: () => 'Es sind', after: 'Erwachsene.' },
  { id: 'plaetze', parts: true, text: (a, b) => `Der Zug hat ${a} Plätze. ${b} Plätze sind besetzt.`, question: () => 'Wie viele Plätze sind noch frei?', before: () => 'Es sind noch', after: 'Plätze frei.' },
];

function plusMinus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const op = rng.chance(0.5) ? '+' : '-';
  const story = rng.pick(op === '+' ? PLUS : MINUS_STORIES);
  const { name } = pickPerson(rng);
  const a = storyNumber(rng, stufe, 200, 800);
  const b = storyNumber(rng, stufe, 20, 190);
  const value = op === '+' ? a + b : a - b;
  const context = story.text(a, b, name);
  const prompt = story.question(name);
  const before = story.before(name);
  const sign = op === '+' ? '+' : MINUS;
  return build(SKILL, stufe, {
    key: `pm:${story.id}:${a}:${b}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, story.after, prompt),
    hints: story.parts ? [PARTS_LOOK, partsSought(op)] : ['Stell dir die Geschichte vor. Kommt etwas dazu oder geht etwas weg?', op === '+' ? 'Die beiden Mengen kommen zusammen.' : 'Von der großen Menge geht ein Teil weg.'],
    steps: [
      { text: `Rechnung: ${a} ${sign} ${b} = ${value}`, visual: rechenstrich(a, value, `${sign} ${b}`) },
      answerStep(before, String(value), story.after),
    ],
    bugs: numberBugs([{ id: 'signalwort', match: op === '+' ? a - b : a + b, hint: story.parts ? partsWrongOp(op === '+' ? '-' : '+', a) : HINT.signalwort }], value),
    praise: op === '-' ? 'Du hast den Teil von der ganzen Menge abgezogen.' : story.parts ? PARTS_PRAISE_PLUS : 'Du hast erkannt: Hier kommt etwas dazu.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

interface Grouped {
  id: string;
  /** Tells a story with Zehnerzahlen too: a price of 240 € for a Heft does not. */
  tens: boolean;
  /** The range of the small factor, when the story has a realistic one (default 3 to 9). */
  small?: readonly [min: number, max: number];
  /** y parts get the same share (y Kinder, y Hefte), rather than a group size of y: the picture draws y groups then. */
  shares?: boolean;
  text: (x: number, y: number, name: string) => string;
  question: (name: string) => string;
  before: (name: string) => string;
  after: string;
}

const SMALL: readonly [number, number] = [3, 9];

/** x groups with y each. */
const MAL: readonly Grouped[] = [
  { id: 'kisten', tens: false, text: (x, y) => `Die Schule hat ${x} Kisten. In jeder Kiste liegen ${y} Bälle.`, question: () => 'Wie viele Bälle sind das?', before: () => 'Das sind', after: 'Bälle.' },
  { id: 'hefte', tens: false, small: HEFT_EURO, text: (x, y, n) => `${n} kauft ${x} Hefte. Jedes Heft kostet ${y} €.`, question: (n) => `Wie viel Euro bezahlt ${n}?`, before: (n) => `${n} bezahlt`, after: '€.' },
  { id: 'reihen', tens: false, text: (x, y) => `Im Saal stehen ${x} Reihen. In jeder Reihe stehen ${y} Stühle.`, question: () => 'Wie viele Stühle sind das?', before: () => 'Das sind', after: 'Stühle.' },
  { id: 'packungen', tens: true, text: (x, y, n) => `${n} kauft ${x} Packungen. In jeder Packung sind ${y} Karten.`, question: (n) => `Wie viele Karten hat ${n} dann?`, before: (n) => `${n} hat dann`, after: 'Karten.' },
  { id: 'seiten', tens: true, text: (x, y, n) => `${n} liest ${x} Wochen lang. Jede Woche liest ${n} ${y} Seiten.`, question: (n) => `Wie viele Seiten liest ${n} insgesamt?`, before: (n) => `${n} liest insgesamt`, after: 'Seiten.' },
];

/** t in parts of y, or t shared by y. */
const GETEILT: readonly Grouped[] = [
  { id: 'gruppen', tens: true, text: (t, y) => `${t} Kinder gehen in den Zoo. Je ${y} Kinder bilden eine Gruppe.`, question: () => 'Wie viele Gruppen gibt es?', before: () => 'Es gibt', after: 'Gruppen.' },
  { id: 'verteilen', tens: true, shares: true, text: (t, y, n) => `${n} verteilt ${t} Karten an ${y} Kinder. Jedes Kind bekommt gleich viele.`, question: () => 'Wie viele Karten bekommt jedes Kind?', before: () => 'Jedes Kind bekommt', after: 'Karten.' },
  { id: 'tueten', tens: true, text: (t, y) => `${t} Äpfel kommen in Tüten. In jede Tüte kommen ${y} Äpfel.`, question: () => 'Wie viele Tüten sind das?', before: () => 'Das sind', after: 'Tüten.' },
  { id: 'preis', tens: false, shares: true, small: HEFT_EURO, text: (t, y) => `${y} gleiche Hefte kosten zusammen ${t} €.`, question: () => 'Wie viel Euro kostet ein Heft?', before: () => 'Ein Heft kostet', after: '€.' },
];

/** A Zehnerzahl story from Stufe 2 on, when the story allows it. */
function withTens(rng: Rng, stufe: Stufe, tens: boolean): number {
  return stufe >= 2 && tens && rng.chance(0.5) ? 10 : 1;
}

function mal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(MAL);
  const { name } = pickPerson(rng);
  const x = rng.int(3, 9);
  const [lo, hi] = story.small ?? SMALL;
  const small = rng.int(lo, hi);
  const y = small * withTens(rng, stufe, story.tens);
  const value = x * y;
  const context = story.text(x, y, name);
  const prompt = story.question(name);
  const before = story.before(name);
  const dots: Visual = { type: 'dotArray', rows: x, cols: small };
  return build(SKILL, stufe, {
    key: `mal:${story.id}:${x}:${y}`,
    ab,
    context,
    prompt,
    ...(stufe <= 2 && y === small ? { visual: dots } : {}),
    answer: sentenceAnswer(value, before, story.after, prompt),
    hints: ['Gibt es hier mehrmals gleich große Gruppen?', `Stell dir ${x} Gruppen vor. In jeder Gruppe sind ${y}.`],
    steps: [`${x}-mal die ${y}. Das heißt mal.`, `Rechnung: ${x} ${TIMES} ${y} = ${value}`, answerStep(before, String(value), story.after)],
    bugs: numberBugs(
      [
        { id: 'rechenart-+', match: x + y, hint: `${x}-mal die ${y} heißt: ${y} + ${y} und so weiter.` },
        y !== small && { id: 'null-verloren', match: x * small, hint: `${x} ${TIMES} ${small} sind ${x * small}. Bei ${y} sind es Zehner: ${x * small} Zehner.` },
      ],
      value,
    ),
    praise: 'Du hast die gleich großen Gruppen erkannt.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

function geteilt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(GETEILT);
  const { name } = pickPerson(rng);
  const y = rng.int(3, 9);
  const [lo, hi] = story.small ?? SMALL;
  const small = rng.int(lo, hi);
  const value = small * withTens(rng, stufe, story.tens);
  const t = y * value;
  const context = story.text(t, y, name);
  const prompt = story.question(name);
  const before = story.before(name);
  // the picture shows the story (T15): 6 Kinder with 8 Karten each are 6 groups of 8, 8 Tüten with 6 Äpfel each are 8 groups of 6
  const dots: Visual = { type: 'dotArray', groups: story.shares ? Array.from({ length: y }, () => value) : Array.from({ length: value }, () => y) };
  return build(SKILL, stufe, {
    key: `geteilt:${story.id}:${t}:${y}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, story.after, prompt),
    hints: ['Hier teilt jemand gerecht auf. Welche Rechnung passt dazu?', `Wie oft passt die ${y} in die ${t}?`],
    steps: [
      value === small ? { text: `Rechnung: ${t} : ${y} = ${value}`, visual: dots } : `Rechnung: ${t} : ${y} = ${value}`,
      `Probe: ${value} ${TIMES} ${y} = ${t}`,
      answerStep(before, String(value), story.after),
    ],
    bugs: numberBugs(
      [
        { id: 'rechenart-*', match: t * y, hint: 'Hier teilt jemand auf. Das Ergebnis wird kleiner.' },
        { id: 'rechenart--', match: t - y, hint: 'Hier teilt jemand gerecht auf. Wie oft passt die kleine Zahl hinein?' },
        { id: 'rechenart-+', match: t + y, hint: 'Hier kommt nichts dazu. Hier teilt jemand gerecht auf.' },
        value !== small && { id: 'teilen-null', match: small, hint: `${y} ${TIMES} ${small} sind ${y * small}. Für ${t} rechnest du mit Zehnern.` },
      ],
      value,
    ),
    praise: 'Du hast erkannt: Hier teilt jemand gerecht auf.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III: the start is unknown. The story tells 'gibt ab', and the Rechnung is plus. */
function anfangGesucht(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const c = storyNumber(rng, stufe, 20, 190);
  const r = storyNumber(rng, stufe, 200, 700);
  const lost = rng.chance(0.5);
  const value = lost ? r + c : r - c;
  const context = lost
    ? `${name} hat einige Karten. ${name} verschenkt ${c} Karten. Jetzt hat ${name} noch ${r} Karten.`
    : `Im Regal stehen einige Bücher. Die Bücherei stellt ${c} Bücher dazu. Jetzt stehen dort ${r} Bücher.`;
  const prompt = lost ? `Wie viele Karten hat ${name} am Anfang?` : 'Wie viele Bücher stehen am Anfang im Regal?';
  const before = lost ? `Am Anfang hat ${name}` : 'Am Anfang stehen dort';
  const after = lost ? 'Karten.' : 'Bücher.';
  const sign = lost ? '+' : MINUS;
  return build(SKILL, stufe, {
    key: `anfang:${lost ? 'weg' : 'dazu'}:${c}:${r}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [lost ? 'Am Anfang sind es mehr als jetzt.' : 'Am Anfang sind es weniger als jetzt.', 'Geh die Geschichte von hinten nach vorne durch.'],
    steps: [
      lost ? `Am Ende fehlen ${c} Karten. Am Anfang sind es also mehr.` : `Am Ende sind ${c} Bücher mehr da. Am Anfang sind es also weniger.`,
      { text: `Rechnung: ${r} ${sign} ${c} = ${value}`, visual: rechenstrich(r, value, `${sign} ${c}`) },
      answerStep(before, String(value), after),
    ],
    bugs: numberBugs([{ id: 'signalwort', match: lost ? r - c : r + c, hint: lost ? `${name} verschenkt Karten. Hat ${name} am Anfang mehr oder weniger?` : 'Es kommen Bücher dazu. Sind es am Anfang mehr oder weniger?' }], value),
    praise: 'Du bist die Geschichte von hinten durchgegangen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III: the change is unknown. */
function aenderungGesucht(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = storyNumber(rng, stufe, 200, 600);
  const value = storyNumber(rng, stufe, 20, 190);
  const up = rng.chance(0.5);
  const end = up ? a + value : a - value;
  const context = up
    ? `Im Zug fahren ${a} Menschen. Am Bahnhof steigen Menschen ein. Jetzt fahren ${end} Menschen im Zug.`
    : `Im Zug fahren ${a} Menschen. Am Bahnhof steigen Menschen aus. Jetzt fahren ${end} Menschen im Zug.`;
  const prompt = up ? 'Wie viele Menschen steigen ein?' : 'Wie viele Menschen steigen aus?';
  const before = 'Es steigen';
  const after = up ? 'Menschen ein.' : 'Menschen aus.';
  const [lo, hi] = up ? [a, end] : [end, a];
  return build(SKILL, stufe, {
    key: `aenderung:${up ? 'ein' : 'aus'}:${a}:${value}`,
    ab,
    context,
    prompt,
    visual: rechenstrich(a, end, '?'),
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Du kennst den Anfang und das Ende. Gesucht ist der Sprung dazwischen.', 'Wie groß ist der Unterschied zwischen den beiden Zahlen?'],
    steps: [`Der Unterschied zwischen ${lo} und ${hi} ist gesucht.`, { text: `Rechnung: ${hi} ${MINUS} ${lo} = ${value}`, visual: rechenstrich(a, end, `${up ? '+' : MINUS} ${value}`) }, answerStep(before, String(value), after)],
    bugs: numberBugs([{ id: 'alle-zahlen', match: a + end, hint: 'Beide Zahlen zählen die Menschen im Zug. Wie groß ist der Unterschied?' }], value),
    praise: 'Du hast den Sprung zwischen Anfang und Ende gefunden.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III: one number is not needed. */
function eineZahlZuviel(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(EXTRA_STORIES);
  const { name } = pickPerson(rng);
  const a = storyNumber(rng, stufe, 200, 700);
  const b = storyNumber(rng, stufe, 30, 190);
  const x = rng.int(story.x[0], story.x[1]);
  const value = story.op === '+' ? a + b : a - b;
  const context = story.text(a, b, x, name);
  const prompt = story.question(name);
  const before = story.before(name);
  const sign = story.op === '+' ? '+' : MINUS;
  return build(SKILL, stufe, {
    key: `zuviel:${story.id}:${a}:${b}:${x}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, story.after, prompt),
    hints: [HINT.alleZahlen, 'Lies die Frage zuerst. Dann such die passenden Zahlen.'],
    steps: [`Die ${x} zählt ${story.what}. Danach fragt die Geschichte nicht.`, `Rechnung: ${a} ${sign} ${b} = ${value}`, answerStep(before, String(value), story.after)],
    bugs: numberBugs(
      [
        { id: 'alle-zahlen', match: value + x, hint: HINT.alleZahlen },
        { id: 'alle-zahlen', match: value - x, hint: HINT.alleZahlen },
        { id: 'alle-zahlen', match: a + b + x, hint: HINT.alleZahlen },
        { id: 'signalwort', match: story.op === '+' ? a - b : a + b, hint: HINT.signalwort },
      ],
      value,
    ),
    praise: 'Du hast nur die passenden Zahlen benutzt.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

export const einSchrittSkill: SkillDef = {
  ...SKILL,
  title: 'Geschichten mit einer Rechnung',
  description: 'Du löst eine Geschichte mit einer Rechnung.',
  stufen: { 1: 'Plus oder minus, alle Zahlen brauchst du', 2: 'Mal oder geteilt, Zahlen bis 1000', 3: 'Der Anfang fehlt, oder eine Zahl ist zu viel' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (ab === 1) return plusMinus(rng, stufe, ab);
    if (ab === 2) return rng.chance(0.5) ? mal(rng, stufe, ab) : geteilt(rng, stufe, ab);
    const form = rng.pick([anfangGesucht, aenderungGesucht, eineZahlZuviel]);
    return form(rng, stufe, ab);
  },
};
