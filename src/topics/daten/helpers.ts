/**
 * Helpers of the topic 'daten': data themes with their German sentences, tables and charts, the picture choice and the colour words.
 * Colour is always named in the text as well (docs/research.md §7.2). Pure: randomness only through the Rng parameter.
 */
import { speak } from '../shared';
import { fmt } from '../../core/format';
import type { ChoiceAnswer, ChoiceOption, ColorName, PictoIcon, Rng, Visual, VisualOf } from '../../core/types';

// ─── Data themes (T13: Schule, Bücherei, Zoo, Schulfest) ────────────────────

/** A row of a table or a column of a chart. at: the phrase after a preposition, 'bei Hunden', 'am Montag'. */
export interface Cat {
  label: string;
  at: string;
}

export interface Theme {
  id: string;
  title: string;
  /** Head of the first table column. */
  head: string;
  /** What the numbers count. */
  unit: string;
  icon: PictoIcon;
  cats: readonly Cat[];
  /** Days stay in calendar order. */
  ordered?: boolean;
  /** The two value columns of a table with two columns, and a third that the table does not have (Stufe 3). */
  cols: readonly [Cat, Cat, Cat];
  /** What the columns name: the head of the first column where they stand in rows. */
  colHead: string;
  /** The question for one value, optionally for one column: where = ' an Schule A'. */
  ask(c: Cat, where?: string): string;
}

const cat = (label: string, at: string): Cat => ({ label, at });
const bei = (label: string, dativ = label): Cat => cat(label, `bei ${dativ}`);

/**
 * Column heads stay at most 3 letters: a row label and 2 value columns then fit a 375 px phone (tableFloor in testUtils.ts).
 * Whole schools, not classes: the cells go up to 60 and a column adds up to more than one class can have.
 */
const SCHULEN: Theme['cols'] = [cat('Ost', 'an Schule Ost'), cat('Süd', 'an Schule Süd'), cat('West', 'an Schule West')];
const TAGE: Theme['cols'] = [cat('Mo', 'am Montag'), cat('Di', 'am Dienstag'), cat('Mi', 'am Mittwoch')];
const FESTTAGE: Theme['cols'] = [cat('Fr', 'am Freitag'), cat('Sa', 'am Samstag'), cat('So', 'am Sonntag')];
const WOCHE: readonly Cat[] = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].map((d) => cat(d, `am ${d}`));

/** Themes with numbers up to about 100. */
export const SMALL_THEMES: readonly Theme[] = [
  {
    id: 'tiere', title: 'Lieblingstiere', head: 'Tier', unit: 'Kinder', icon: 'person', cols: SCHULEN, colHead: 'Schule',
    cats: [bei('Hunde', 'Hunden'), bei('Katzen'), bei('Pferde', 'Pferden'), bei('Hasen'), bei('Fische', 'Fischen')],
    ask: (c, where = '') => `Wie viele Kinder wählen ${c.label}${where}?`,
  },
  {
    id: 'obst', title: 'Lieblingsobst', head: 'Obst', unit: 'Kinder', icon: 'apfel', cols: SCHULEN, colHead: 'Schule',
    cats: [bei('Äpfel', 'Äpfeln'), bei('Birnen'), bei('Bananen'), bei('Trauben'), bei('Kirschen')],
    ask: (c, where = '') => `Wie viele Kinder wählen ${c.label}${where}?`,
  },
  {
    id: 'sport', title: 'Lieblingssport', head: 'Sport', unit: 'Kinder', icon: 'ball', cols: SCHULEN, colHead: 'Schule',
    cats: [cat('Fußball', 'beim Fußball'), cat('Turnen', 'beim Turnen'), cat('Schwimmen', 'beim Schwimmen'), cat('Tanzen', 'beim Tanzen'), cat('Judo', 'beim Judo')],
    ask: (c, where = '') => `Wie viele Kinder wählen ${c.label}${where}?`,
  },
  {
    id: 'buecherei', title: 'Bücher aus der Bücherei', head: 'Art', unit: 'Bücher', icon: 'buch', cols: TAGE, colHead: 'Tag',
    cats: [bei('Krimis'), bei('Comics'), bei('Märchen'), bei('Tierbücher', 'Tierbüchern'), bei('Witzbücher', 'Witzbüchern')],
    ask: (c, where = '') => `Wie viele ${c.label} leihen die Kinder${where} aus?`,
  },
  {
    id: 'schulfest', title: 'Verkauf beim Schulfest', head: 'Ware', unit: 'Stück', icon: 'stern', cols: FESTTAGE, colHead: 'Tag',
    cats: [bei('Waffeln'), bei('Muffins'), bei('Brezeln'), bei('Würstchen'), bei('Lose', 'Losen')],
    ask: (c, where = '') => `Wie viele ${c.label} verkauft die Klasse${where}?`,
  },
];

/** Themes with numbers up to 500 (Stufe 3 of daten.diagramme). */
export const BIG_THEMES: readonly Theme[] = [
  { id: 'zoo', title: 'Gäste im Zoo', head: 'Tag', unit: 'Gäste', icon: 'person', cols: SCHULEN, colHead: 'Schule', cats: WOCHE, ordered: true, ask: (c) => `Wie viele Gäste kommen ${c.at}?` },
  { id: 'flaschen', title: 'Gesammelte Flaschen', head: 'Tag', unit: 'Flaschen', icon: 'stern', cols: SCHULEN, colHead: 'Schule', cats: WOCHE, ordered: true, ask: (c) => `Wie viele Flaschen sammeln die Kinder ${c.at}?` },
  { id: 'ausleihe', title: 'Ausgeliehene Bücher', head: 'Tag', unit: 'Bücher', icon: 'buch', cols: SCHULEN, colHead: 'Schule', cats: WOCHE, ordered: true, ask: (c) => `Wie viele Bücher leihen Kinder ${c.at} aus?` },
];

/** n categories of a theme, days in calendar order; with maxLabel only those with a label of at most this length. */
export function pickCats(rng: Rng, theme: Theme, n: number, maxLabel = Infinity): Cat[] {
  const picked = rng.sample(theme.cats.filter((c) => c.label.length <= maxLabel), n);
  return theme.ordered ? theme.cats.filter((c) => picked.includes(c)) : picked;
}

/** The themes that have n categories with a label of at most maxLabel letters. */
export const themesWith = (themes: readonly Theme[], n: number, maxLabel: number): Theme[] => themes.filter((t) => t.cats.filter((c) => c.label.length <= maxLabel).length >= n);

/** Content width of the card on a 375 px phone. */
export const CARD_PX = 311;
/** Content width of an answer option on a 375 px phone. */
export const OPTION_PX = 277;

/**
 * Longest label of a Säulendiagramm with n columns that fits `room` px without sideways scrolling.
 * Mirrors the layout of src/ui/visuals/BarChartVisual.tsx (column max(72, 10 per letter + 16), floor 0.7 of the width).
 */
export function maxChartLabel(n: number, axisMax: number, room: number): number {
  const beside = 14 + fmt(axisMax).length * 10 + 10 + 20;
  return Math.floor((Math.floor((room / 0.7 - beside) / n) - 16) / 10);
}

/** n different multiples of step in [lo, hi]. */
export function distinctValues(rng: Rng, n: number, lo: number, hi: number, step = 1): number[] {
  const pool: number[] = [];
  for (let v = lo; v <= hi; v += step) pool.push(v);
  return rng.sample(pool, n);
}

export const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

/** 'bei Hunden' → 'Bei Hunden': the phrase at the start of a sentence. */
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Read-aloud and screen reader text of a task. The visuals bring their own labels. */
export function say(...parts: (string | undefined)[]): string {
  return speak(parts.filter(Boolean).join(' '));
}

// ─── Visuals ─────────────────────────────────────────────────────────────────

export function oneColumnTable(theme: Theme, cats: readonly Cat[], values: readonly number[]): VisualOf<'table'> {
  return { type: 'table', caption: theme.title, header: [theme.head, theme.unit], rows: cats.map((c, i) => [c.label, String(values[i])]) };
}

export function chart(theme: Theme, cats: readonly Cat[], values: readonly number[], axisMax: number, axisStep: number, horizontal = false): VisualOf<'barChart'> {
  return { type: 'barChart', title: theme.title, categories: cats.map((c) => c.label), values: [...values], axisMax, axisStep, valueLabel: theme.unit, ...(horizontal ? { horizontal } : {}) };
}

export function tally(theme: Theme, cats: readonly Cat[], values: readonly number[]): VisualOf<'tally'> {
  return { type: 'tally', title: theme.title, rows: cats.map((c, i) => ({ label: c.label, count: values[i] })) };
}

// ─── Choice between pictures ─────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Options with a picture each; they get their letter after shuffling: 'Tabelle A', 'Tabelle B' … Equal pictures are dropped. */
export function pictureChoice(rng: Rng, noun: string, correct: Visual, wrongs: { visual: Visual; whyWrong: string }[], max: number): ChoiceAnswer {
  const seen = new Set([JSON.stringify(correct)]);
  const list: { visual: Visual; whyWrong?: string }[] = [{ visual: correct }];
  for (const w of wrongs) {
    const sig = JSON.stringify(w.visual);
    if (seen.has(sig) || list.length >= max) continue;
    seen.add(sig);
    list.push(w);
  }
  const shown = rng.shuffle(list);
  const options: ChoiceOption[] = shown.map((o, i) => ({ label: `${noun} ${LETTERS[i]}`, visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) }));
  return { kind: 'choice', options, correct: shown.indexOf(list[0]), layout: 'grid' };
}

/** Options that keep their place: the correct one by index, whyWrong for the others. */
export function fixedChoice(options: { label: string; visual?: Visual; whyWrong?: string }[], correct: number, layout?: ChoiceAnswer['layout']): ChoiceAnswer {
  return {
    kind: 'choice',
    options: options.map((o, i) => (i === correct ? { label: o.label, ...(o.visual ? { visual: o.visual } : {}) } : o)),
    correct,
    ...(layout ? { layout } : {}),
  };
}

// ─── Colours ─────────────────────────────────────────────────────────────────

export const COLORS: readonly ColorName[] = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'];
/** 'Der Zeiger bleibt auf Grün stehen.' */
export const COLOR_NOUN: Record<ColorName, string> = { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün', lila: 'Lila', orange: 'Orange' };
/** 'Die Kugel ist grün.' */
export const COLOR_WORD: Record<ColorName, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };
/** '3 grüne Kugeln' */
export const COLOR_ADJ: Record<ColorName, string> = { rot: 'rote', blau: 'blaue', gelb: 'gelbe', gruen: 'grüne', lila: 'lila', orange: 'orange' };

/** '1 Feld', '3 Felder' */
export const countOf = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** '1 rote Kugel', '3 rote Kugeln' */
export const balls = (n: number, c: ColorName): string => countOf(n, `${COLOR_ADJ[c]} Kugel`, `${COLOR_ADJ[c]} Kugeln`);

