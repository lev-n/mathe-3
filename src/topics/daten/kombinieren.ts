/**
 * Wie viele Möglichkeiten? (docs/research.md §6).
 * Stufe 1: pairs around 2 · 3, in words: no visual can show pictures yet. Stufe 2: pairs around 3 · 3 and the order of 3 things.
 * Stufe 3: up to 3 · 3 · 2; the Baumdiagramm (Bayern) stays on this Stufe, in the task up to TREE_MAX_ENDS ends and in the worked steps for every size.
 * The sizes vary, so the answer is never the same number.
 */
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { BOX } from '../../core/format';
import { bugList, build, makeChoice, pickPerson, targetAb } from '../shared';
import { say } from './helpers';

const SKILL = { id: 'daten.kombinieren', topicId: 'daten' } as const;
const KMK = ['DZ.kombinatorik', 'PK.problemloesen'];

interface Dim {
  /** Head of a table column, the plural. */
  title: string;
  /** The plural after a preposition: 'aus Zielen'. */
  dat: string;
  /** Accusative with article. */
  acc: string;
  /** 'Jedes T-Shirt' */
  every: string;
  /** 'jeder Hose' */
  everyDat: string;
  opts: readonly string[];
}

interface Theme {
  id: string;
  dims: readonly [Dim, Dim, Dim];
}

const THEMES: readonly Theme[] = [
  {
    id: 'kleidung',
    dims: [
      { title: 'T-Shirts', dat: 'T-Shirts', acc: 'ein T-Shirt', every: 'Jedes T-Shirt', everyDat: 'jedem T-Shirt', opts: ['Rot', 'Blau', 'Gelb', 'Grün'] },
      { title: 'Hosen', dat: 'Hosen', acc: 'eine Hose', every: 'Jede Hose', everyDat: 'jeder Hose', opts: ['Jeans', 'Shorts', 'Latzhose', 'Cordhose'] },
      { title: 'Mützen', dat: 'Mützen', acc: 'eine Mütze', every: 'Jede Mütze', everyDat: 'jeder Mütze', opts: ['Kappe', 'Wollmütze'] },
    ],
  },
  {
    id: 'eis',
    dims: [
      { title: 'Eissorten', dat: 'Eissorten', acc: 'eine Eissorte', every: 'Jede Eissorte', everyDat: 'jeder Eissorte', opts: ['Vanille', 'Schoko', 'Erdbeere', 'Zitrone'] },
      { title: 'Soßen', dat: 'Soßen', acc: 'eine Soße', every: 'Jede Soße', everyDat: 'jeder Soße', opts: ['Kirsche', 'Honig', 'Karamell', 'Mango'] },
      { title: 'Extras', dat: 'Extras', acc: 'ein Extra', every: 'Jedes Extra', everyDat: 'jedem Extra', opts: ['Sahne', 'Kekse'] },
    ],
  },
  {
    id: 'pause',
    dims: [
      { title: 'Brote', dat: 'Broten', acc: 'ein Brot', every: 'Jedes Brot', everyDat: 'jedem Brot', opts: ['Toast', 'Vollkorn', 'Brezel', 'Brötchen'] },
      { title: 'Beläge', dat: 'Belägen', acc: 'einen Belag', every: 'Jeder Belag', everyDat: 'jedem Belag', opts: ['Käse', 'Gurke', 'Ei', 'Tomate'] },
      { title: 'Getränke', dat: 'Getränken', acc: 'ein Getränk', every: 'Jedes Getränk', everyDat: 'jedem Getränk', opts: ['Wasser', 'Saft'] },
    ],
  },
  {
    id: 'ausflug',
    dims: [
      { title: 'Ausflüge', dat: 'Ausflügen', acc: 'einen Ausflug', every: 'Jeder Ausflug', everyDat: 'jedem Ausflug', opts: ['Zoo', 'Park', 'See', 'Burg'] },
      { title: 'Wege', dat: 'Wegen', acc: 'einen Weg', every: 'Jeder Weg', everyDat: 'jedem Weg', opts: ['Bus', 'Zug', 'Rad', 'zu Fuß'] },
      { title: 'Tage', dat: 'Tagen', acc: 'einen Tag', every: 'Jeder Tag', everyDat: 'jedem Tag', opts: ['Montag', 'Freitag'] },
    ],
  },
];

const treeOf = (opts: readonly (readonly string[])[]): VisualOf<'tree'> => ({ type: 'tree', levels: opts.map((o) => [...o]) });

/**
 * One row per option of the first choice, with all options of the second: every word in the right column is one pair.
 * Two columns whose text can wrap, so that no pair is out of view on a phone. A cross table with one column per option
 * is wider than the card, and counting its boxes is the task.
 */
function pairTable(d0: Dim, d1: Dim, o0: readonly string[], o1: readonly string[]): VisualOf<'table'> {
  return { type: 'table', caption: `${d0.title} und ${d1.title}`, header: [d0.title, d1.title], rows: o0.map((a) => [a, o1.join(', ')]) };
}

/** What there is to choose from, without the pairs: one row per choice. */
function offerTable(dims: readonly Dim[], opts: readonly (readonly string[])[]): VisualOf<'table'> {
  return { type: 'table', caption: 'Das steht zur Wahl', header: ['Art', 'Zur Wahl'], rows: dims.map((d, i) => [d.title, opts[i].join(', ')]) };
}

function pairContext(rng: Rng, a: Dim, b: Dim): string {
  return `${pickPerson(rng).name} wählt ${a.acc} und ${b.acc}.`;
}

const PROMPT = 'Wie viele Möglichkeiten gibt es?';
const everyHint = (a: Dim, b: Dim) => `${a.every} passt zu ${b.everyDat}. Zähle alle Paare.`;
const addBug = (a: Dim, b: Dim) => `${a.every} passt zu ${b.everyDat}. Rechne nicht plus.`;

type Size = readonly [number, number];
/** The catalogue size and its neighbours. 2 · 2 hides the plus mistake (2 + 2), so it stays one size among several. */
const PAIRS_1: readonly Size[] = [[2, 3], [3, 2], [2, 4], [4, 2], [2, 2]];
const PAIRS_2: readonly Size[] = [[3, 3], [3, 3], [3, 4], [4, 3], [2, 4], [4, 2]];
const PAIRS_3: readonly Size[] = [[3, 3], [3, 4], [4, 3], [2, 4], [4, 2]];
const THREE_CHOICES: readonly (readonly [number, number, number])[] = [[3, 3, 2], [3, 3, 2], [2, 3, 2], [3, 2, 2], [2, 2, 2], [4, 2, 2], [2, 4, 2]];
/**
 * A tree in the task has at most this many ends. A worksheet limits a picture to 55 mm (src/ui/pages/worksheet.css): 18 ends
 * would print the labels at about 4 pt, and counting the ends is the task. Larger sizes show the table and draw the tree in the worked steps.
 */
const TREE_MAX_ENDS = 12;

const PAIR_HINTS: Record<'baum' | 'paare' | 'wahl', (a: Dim, b: Dim) => string[]> = {
  baum: () => ['Geh jeden Weg im Baum von links nach rechts.', 'Zähle die Enden ganz rechts im Baum.'],
  paare: (a, b) => ['Schau auf eine Zeile: Wie viele Paare stehen dort?', everyHint(a, b)],
  wahl: (a, b) => [everyHint(a, b), 'Schreib die Paare auf oder rechne mal.'],
};

/** Pairs: with a Baumdiagramm (Stufe 3), with all pairs in rows, or only with what there is to choose from. */
function pairs(rng: Rng, stufe: Stufe, ab: Ab, [n0, n1]: Size, picture: 'baum' | 'paare' | 'wahl'): Exercise {
  const theme = rng.pick(THEMES);
  const [d0, d1] = rng.chance(0.5) ? [theme.dims[0], theme.dims[1]] : [theme.dims[1], theme.dims[0]];
  const o0 = rng.sample(d0.opts, n0);
  const o1 = rng.sample(d1.opts, n1);
  const value = n0 * n1;
  const context = pairContext(rng, d0, d1);
  const visual: Visual = picture === 'baum' ? treeOf([o0, o1]) : picture === 'paare' ? pairTable(d0, d1, o0, o1) : offerTable([d0, d1], [o0, o1]);
  return build(SKILL, stufe, {
    key: [picture, theme.id, d0.title, o0.join('-'), o1.join('-')].join(':'),
    ab,
    context,
    prompt: PROMPT,
    visual,
    answer: { kind: 'number', value, unit: 'Möglichkeiten', label: 'Anzahl der Möglichkeiten' },
    hints: PAIR_HINTS[picture](d0, d1),
    steps: [{ text: `Es gibt ${n0} ${d0.title} und ${n1} ${d1.title}.`, visual: picture === 'baum' ? treeOf([o0, o1]) : pairTable(d0, d1, o0, o1) }, `${n0} · ${n1} = ${value}`, `Es gibt ${value} Möglichkeiten.`],
    bugs: bugList(value, [
      ['kombi-addiert', n0 + n1, addBug(d0, d1)],
      ['nur-eine-wahl', n1, 'Das ist nur eine Wahl. Denk an beide Wahlen.'],
      ['nur-eine-wahl-2', n0, 'Das ist nur eine Wahl. Denk an beide Wahlen.'],
    ]),
    praise: picture === 'baum' ? 'Du bist jeden Weg im Baum gegangen.' : 'Du hast jedes Paar mitgezählt.',
    srText: say(context, PROMPT),
    kmk: KMK,
  });
}

/** Stufe 1, harder item: a list of pairs, one is missing. */
function missingPair(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const [d0, d1] = [theme.dims[0], theme.dims[1]];
  const o0 = rng.sample(d0.opts, 2);
  const o1 = rng.sample(d1.opts, 3);
  const all = o0.flatMap((a) => o1.map((b) => [a, b]));
  const missing = rng.pick(all);
  const listed = all.filter((p) => p !== missing);
  const label = (p: string[]) => `${p[0]} und ${p[1]}`;
  const context = `${pickPerson(rng).name} schreibt alle Paare auf. Ein Paar fehlt.`;
  const prompt = 'Welches Paar fehlt?';
  return build(SKILL, stufe, {
    key: ['fehlt', theme.id, o0.join('-'), o1.join('-'), label(missing)].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: 'Diese Paare stehen schon da', header: [d0.title, d1.title], rows: listed.map((p) => [...p]) },
    answer: makeChoice(rng, { label: label(missing) }, rng.sample(listed, 3).map((p) => ({ label: label(p), whyWrong: 'Dieses Paar steht schon in der Tabelle.' }))),
    hints: [`Prüfe zuerst alle Paare mit ${o0[0]}.`, `Prüfe dann alle Paare mit ${o0[1]}.`],
    steps: [`Paare mit ${o0[0]}: 3.`, `Paare mit ${o0[1]}: 3.`, `Es fehlt: ${label(missing)}.`],
    praise: 'Du hast der Reihe nach geprüft.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Which calculation fits: mal, not plus. */
function whichCalc(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const [d0, d1] = [theme.dims[0], theme.dims[1]];
  const n0 = 3;
  const n1 = rng.pick([3, 4]);
  const o0 = rng.sample(d0.opts, n0);
  const o1 = rng.sample(d1.opts, n1);
  const context = pairContext(rng, d0, d1);
  const prompt = 'Welche Rechnung passt?';
  return build(SKILL, stufe, {
    key: ['rechnung', theme.id, o0.join('-'), o1.join('-')].join(':'),
    ab,
    context,
    prompt,
    visual: pairTable(d0, d1, o0, o1),
    answer: makeChoice(rng, { label: `${n0} · ${n1}` }, [
      { label: `${n0} + ${n1}`, whyWrong: addBug(d0, d1) },
      { label: `${n0} · ${n1 + 1}`, whyWrong: 'Schau in die Tabelle: Wie viele Paare stehen in einer Zeile?' },
    ]),
    hints: ['Schau auf eine Zeile: Wie viele Paare stehen dort?', 'Wie viele Zeilen gleicher Länge gibt es?'],
    steps: [`Es gibt ${n0} Zeilen mit je ${n1} Paaren.`, `${n0} · ${n1} = ${n0 * n1}`],
    praise: 'Du hast die gleich langen Zeilen als Malaufgabe gesehen.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** All orders of 3 things as table rows. */
function ordersOf(x: readonly string[]): string[][] {
  const [a, b, c] = x;
  return [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
}

/** acc and dat: one of the things in a sentence. A name needs no article, a book does. */
const THINGS: readonly { id: string; context: (x: string[]) => string; acc: (x: string) => string; dat: (x: string) => string; items: readonly string[] }[] = [
  { id: 'kinder', context: (x) => `${x[0]}, ${x[1]} und ${x[2]} stellen sich in eine Reihe.`, acc: (x) => x, dat: (x) => x, items: ['Tom', 'Mia', 'Ali', 'Lea', 'Ben', 'Ida'] },
  { id: 'buecher', context: (x) => `Ein ${x[0]}, ein ${x[1]} und ein ${x[2]} stehen im Regal.`, acc: (x) => `den ${x}`, dat: (x) => `dem ${x}`, items: ['Krimi', 'Comic', 'Atlas'] },
];

const PLACES = ['1. Platz', '2. Platz', '3. Platz'];

/** Stufe 2: the order of 3 things. */
function orderOfThree(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.pick(THINGS);
  const x = rng.sample(t.items, 3);
  const context = t.context(x);
  const prompt = 'Wie viele Reihenfolgen gibt es?';
  const orders = ordersOf(x);
  return build(SKILL, stufe, {
    key: ['reihe', t.id, x.join('-')].join(':'),
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: 6, unit: 'Reihenfolgen', label: 'Anzahl der Reihenfolgen' },
    hints: [`Wer oder was ist vorne? Nimm zuerst ${t.acc(x[0])}.`, 'Für den nächsten Platz bleiben noch 2. Danach bleibt 1.'],
    steps: [
      { text: `Mit ${t.dat(x[0])} vorne gibt es 2 Reihenfolgen.`, visual: { type: 'table', caption: 'Alle Reihenfolgen', header: PLACES, rows: orders } },
      'Bei jedem anderen Anfang ist es genauso.',
      '3 · 2 = 6',
      'Es gibt 6 Reihenfolgen.',
    ],
    bugs: bugList(6, [
      ['reihe-nur-drei', 3, `Das ist nur der vordere Platz. Hinter ${t.dat(x[0])} gibt es 2 Reihenfolgen.`],
      ['reihe-mal-drei', 9, 'Ein Platz ist schon besetzt. Für den nächsten bleiben nur noch 2.'],
    ]),
    praise: 'Du hast die Plätze der Reihe nach besetzt.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Stufe 2: some orders stand in the table: how many are still missing? The answer changes, the 6 alone does not solve it. */
function ordersLeft(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.pick(THINGS);
  const x = rng.sample(t.items, 3);
  const listed = rng.int(2, 5);
  const shown = rng.sample(ordersOf(x), listed);
  const value = 6 - listed;
  const context = t.context(x);
  const prompt = 'Wie viele Reihenfolgen fehlen noch?';
  return build(SKILL, stufe, {
    key: ['reihe-rest', t.id, x.join('-'), shown.map((o) => o.join('-')).join('_')].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: 'Diese Reihenfolgen stehen schon da', header: PLACES, rows: shown },
    answer: { kind: 'number', value, label: 'Anzahl der Reihenfolgen' },
    hints: ['Wie viele Reihenfolgen gibt es bei 3 Dingen?', 'Zieh die Reihenfolgen aus der Tabelle davon ab.'],
    steps: ['Es gibt 6 Reihenfolgen.', `In der Tabelle stehen ${listed}.`, `6 − ${listed} = ${value}`],
    bugs: bugList(value, [
      ['reihe-alle', 6, 'Das sind alle Reihenfolgen. Einige stehen schon in der Tabelle.'],
      ['reihe-schon-da', listed, 'So viele stehen schon da. Gefragt sind die fehlenden Reihenfolgen.'],
    ]),
    praise: 'Du hast die fehlenden Reihenfolgen ausgerechnet.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Stufe 2, harder item: one option more. */
function oneMore(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const [d0, d1] = [theme.dims[0], theme.dims[1]];
  const n0 = rng.pick([2, 3]);
  const n1 = rng.pick([2, 3, 4]);
  const o0 = rng.sample(d0.opts, n0 + 1);
  const o1 = rng.sample(d1.opts, n1);
  const before = o0.slice(0, n0);
  const fresh = o0[n0];
  const value = (n0 + 1) * n1;
  const context = `Bei den ${d0.dat} kommt neu dazu: ${fresh}.`;
  const prompt = 'Wie viele Möglichkeiten gibt es jetzt?';
  return build(SKILL, stufe, {
    key: ['eins-mehr', theme.id, o0.join('-'), o1.join('-')].join(':'),
    ab,
    context,
    prompt,
    visual: pairTable(d0, d1, before, o1),
    answer: { kind: 'number', value, unit: 'Möglichkeiten', label: 'Anzahl der Möglichkeiten' },
    hints: [`Bisher sind es ${n0} · ${n1} Paare.`, `Die neue Wahl passt zu ${d1.everyDat}.`],
    steps: [`Bisher: ${n0} · ${n1} = ${n0 * n1}`, `Die neue Wahl bringt ${n1} neue Paare.`, `${n0 * n1} + ${n1} = ${value}`, `Es gibt jetzt ${value} Möglichkeiten.`],
    bugs: bugList(value, [
      ['neu-plus-eins', n0 * n1 + 1, `Das neue Teil bringt nicht nur 1 Paar. Es passt zu ${d1.everyDat}.`],
      ['kombi-addiert', n0 + 1 + n1, addBug(d0, d1)],
    ]),
    praise: 'Du hast alle neuen Paare mitgezählt.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Stufe 2, harder item: which order is missing. */
function missingOrder(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const x = rng.sample(THINGS[0].items, 3);
  const orders = ordersOf(x);
  const missing = rng.pick(orders);
  const listed = orders.filter((o) => o !== missing);
  const label = (o: string[]) => o.join(', ');
  const context = `${x[0]}, ${x[1]} und ${x[2]} stellen sich in eine Reihe.`;
  const prompt = 'Welche Reihenfolge fehlt in der Tabelle?';
  return build(SKILL, stufe, {
    key: ['reihe-fehlt', x.join('-'), label(missing)].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: 'Diese Reihenfolgen stehen schon da', header: PLACES, rows: listed },
    answer: makeChoice(rng, { label: label(missing) }, rng.sample(listed, 3).map((o) => ({ label: label(o), whyWrong: 'Diese Reihenfolge steht schon in der Tabelle.' }))),
    hints: [`Schau: Wie oft steht ${x[0]} vorne?`, 'Jedes Kind steht in 2 Reihen vorne.'],
    steps: [`Vorne steht ${missing[0]} nur einmal.`, `Es fehlt: ${label(missing)}.`],
    praise: 'Du hast die Reihenfolgen geordnet geprüft.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Stufe 3: three choices. wantsTree: with a Baumdiagramm in the task, if it stays readable. */
function threeChoices(rng: Rng, stufe: Stufe, ab: Ab, sizes: readonly [number, number, number], wantsTree: boolean): Exercise {
  const theme = rng.pick(THEMES);
  const [d0, d1, d2] = theme.dims;
  const opts = [rng.sample(d0.opts, sizes[0]), rng.sample(d1.opts, sizes[1]), rng.sample(d2.opts, sizes[2])];
  const [a, b, c] = sizes;
  const value = a * b * c;
  const withTree = wantsTree && value <= TREE_MAX_ENDS;
  const name = pickPerson(rng).name;
  const context = `${name} wählt ${d0.acc}, ${d1.acc} und ${d2.acc}.`;
  const visual: Visual = withTree ? treeOf(opts) : offerTable(theme.dims, opts);
  return build(SKILL, stufe, {
    key: ['drei', theme.id, withTree ? 'baum' : 'tabelle', opts.map((o) => o.join('-')).join('_')].join(':'),
    ab,
    context,
    prompt: PROMPT,
    visual,
    answer: { kind: 'number', value, unit: 'Möglichkeiten', label: 'Anzahl der Möglichkeiten' },
    hints: withTree ? ['Zähle die Enden ganz rechts im Baum.', `Jeder Ast teilt sich noch einmal in ${c} Äste.`] : [`Rechne zuerst die Paare aus ${d0.dat} und ${d1.dat}.`, `Jedes Paar gibt es dann ${c}-mal.`],
    steps: [{ text: `${d0.title} und ${d1.title}: ${a} · ${b} = ${a * b} Paare.`, visual: treeOf(opts) }, `Jedes Paar gibt es ${c}-mal: ${a * b} · ${c} = ${value}`, `Es gibt ${value} Möglichkeiten.`],
    bugs: bugList(value, [
      ['kombi-addiert', a + b + c, 'Jede Wahl passt zu jeder anderen Wahl. Rechne nicht plus.'],
      ['teil-produkt', a * b, `Das sind erst die Paare. Denk auch an ${d2.title}.`],
    ]),
    praise: withTree ? 'Du bist alle Wege bis ans Ende gegangen.' : 'Du hast Schritt für Schritt malgenommen.',
    srText: say(context, PROMPT),
    kmk: KMK,
  });
}

/** Stufe 3, harder item: backwards from the number of possibilities. */
function backwards(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const [d0, d1] = [theme.dims[0], theme.dims[1]];
  const n0 = rng.pick([2, 3]);
  const n1 = rng.pick([2, 3, 4]);
  const total = n0 * n1;
  const context = `${n0} ${d0.title} und einige ${d1.title} ergeben ${total} Möglichkeiten.`;
  const prompt = `Wie viele ${d1.title} sind es?`;
  return build(SKILL, stufe, {
    key: ['rueckwaerts', theme.id, n0, n1].join(':'),
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: n1, unit: d1.title, label: 'Anzahl' },
    hints: [`${n0} · ${BOX} = ${total}`, 'Welche Malaufgabe passt?'],
    steps: [`${n0} · ${n1} = ${total}`, `Es sind ${n1} ${d1.title}.`],
    bugs: bugList(n1, [
      ['kombi-addiert', total - n0, `${d0.every} passt zu ${d1.everyDat}. Hier passt mal, nicht plus.`],
      ['nur-eine-wahl', total, `Das sind alle Möglichkeiten. Gefragt sind nur ${d1.title}.`],
    ]),
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

export const kombinierenSkill: SkillDef = {
  ...SKILL,
  title: 'Wie viele Möglichkeiten?',
  description: 'Du findest alle Möglichkeiten und zählst sie.',
  stufen: { 1: 'Paare aus wenigen Dingen', 2: 'Mehr Paare, Reihenfolgen', 3: 'Dreimal wählen, mit Baumdiagramm' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return pairs(rng, stufe, ab, rng.pick(PAIRS_1), 'paare');
      return ab === 2 ? pairs(rng, stufe, ab, rng.pick(PAIRS_1), 'wahl') : missingPair(rng, stufe, ab);
    }
    if (stufe === 2) {
      if (ab === 1) return rng.chance(0.75) ? pairs(rng, stufe, ab, rng.pick(PAIRS_2), rng.pick(['paare', 'wahl'] as const)) : whichCalc(rng, stufe, ab);
      if (ab === 2) return rng.chance(0.5) ? orderOfThree(rng, stufe, ab) : ordersLeft(rng, stufe, ab);
      return rng.chance(0.5) ? oneMore(rng, stufe, ab) : missingOrder(rng, stufe, ab);
    }
    if (ab === 1) return pairs(rng, stufe, ab, rng.pick(PAIRS_3), 'baum');
    if (ab === 2) return threeChoices(rng, stufe, ab, rng.pick(THREE_CHOICES), true);
    return rng.chance(0.65) ? threeChoices(rng, stufe, ab, rng.pick(THREE_CHOICES), false) : backwards(rng, stufe, ab);
  },
};
