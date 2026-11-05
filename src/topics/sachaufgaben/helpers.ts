/**
 * Helpers of the Sachaufgaben generators: the Antwortsatz, story numbers, the hints of the bug library (docs/research.md §5) and the
 * stories and pictures that several skills share. Every generator picks its task form by the planned AB level (the catalogue's columns
 * S1, S2, S3 are roughly AB I, II, III) and takes its numbers from the Stufe. Pure: randomness only through the Rng parameter.
 */
import { fmt, fmtMoney, fmtQty } from '../../core/format';
import type { MultiField, NumberAnswer, Rng, Stufe, Visual } from '../../core/types';
import { speak } from '../shared';

/** Hints of docs/research.md §5, word for word. */
export const HINT = {
  alleZahlen: 'Schau: Welche Zahlen brauchst du für diese Frage?',
  signalwort: 'Stell dir die Geschichte vor. Wird es mehr oder weniger?',
  ersterSchritt: 'Das ist schon ein guter Schritt. Was fragt die Geschichte am Ende?',
  unsinnig: 'Kann das stimmen? Denk an einen echten Einkauf.',
} as const;

export const euro = (n: number) => fmtQty(n, '€');

/** A realistic price of a Heft in whole Euro: the same in every story, as the hints ask the child to think of a real purchase. */
export const HEFT_EURO = [2, 4] as const;

/** What a class walks on one Wandertag, in km: the sensible value of frage-pruefen is the limit of the stories too. */
export const WANDERTAG_KM = [3, 9] as const;

/** A price for the Antwortsatz, where the sign stands after the field: 340 → '3,40'. */
export const priceText = (cents: number) => fmt(cents / 100, 2);

/** The Antwortsatz around the number field (§7.1). */
export function sentenceAnswer(value: number | null, before: string, after: string, label: string, extra: Partial<NumberAnswer> = {}): NumberAnswer {
  return { kind: 'number', value, before, after, label, ...extra };
}

/** The last worked step: the Antwortsatz with the result. */
export function answerStep(before: string, value: string, after: string): string {
  return `Antwort: ${before} ${value} ${after}`;
}

/** What the screen reader says: the whole task (T17). */
export function spoken(context: string, prompt: string, expression?: string): string {
  return speak([context, prompt, expression].filter(Boolean).join(' '));
}

/** The answer fields as they are read, with a gap for each field: the text around a field is hidden from the screen reader (T17). */
export function spokenFields(fields: readonly MultiField[]): string {
  return fields.map((f) => [f.before, '□', f.after].filter(Boolean).join(' ')).join('. ');
}

/**
 * Help for a story of a whole and its parts ('450 Gäste, 140 sind Kinder'). Nothing comes or goes in it, so a question about change
 * does not fit, and its 'kommen' would point the wrong way. `op` is the Rechnung of the story: plus looks for the whole, minus for a part.
 */
export const PARTS_LOOK = 'Stell dir die Geschichte vor. Was ist die ganze Menge, was ist ein Teil?';
export const PARTS_PRAISE_PLUS = 'Du hast aus den Teilen die ganze Menge gefunden.';

export function partsSought(op: string): string {
  return op === '+' ? 'Beide Teile stehen in der Geschichte. Gesucht ist die ganze Menge.' : 'Die ganze Menge steht in der Geschichte. Gesucht ist ein Teil.';
}

/** The answer to the other Rechnung (`wrongOp`) in such a story; `first` is the first number of the story. */
export function partsWrongOp(wrongOp: string, first: number): string {
  return wrongOp === '+' ? `Die ${first} ist schon die ganze Menge. Kann ein Teil größer sein?` : `Die ${first} ist nur ein Teil. Kann die ganze Menge kleiner sein?`;
}

/**
 * The two slips of Rückgeld from `paid` Euro. `rueckgeld-cent` (§5): 20 € − 12,40 € as 8,40 €, the Euro subtracted and the Cent copied.
 * `rueckgeld-euro` (as in groessen.einkaufen): 8,60 €, the Cent found, but the Euro they take still counted. At 50 ct both are one number.
 */
export function rueckgeldBugs(paid: number, price: number) {
  const euroDiff = paid * 100 - Math.floor(price / 100) * 100;
  const cent = price % 100;
  const next = Math.ceil(price / 100);
  return [
    { id: 'rueckgeld-cent', match: (euroDiff + cent) / 100, hint: `Rechne von ${fmtMoney(price)} erst bis ${euro(next)}, dann bis ${euro(paid)}.` },
    { id: 'rueckgeld-euro', match: (euroDiff + 100 - cent) / 100, hint: 'Du brauchst 1 € für die Cent. Bei den Euro bleibt 1 weniger.' },
  ];
}

const STEP: Readonly<Record<Stufe, number>> = { 1: 10, 2: 5, 3: 1 };

/** A number of the story: whole tens on Stufe 1, multiples of 5 on Stufe 2, any number on Stufe 3. */
export function storyNumber(rng: Rng, stufe: Stufe, min: number, max: number): number {
  const step = STEP[stufe];
  return step * rng.int(Math.ceil(min / step), Math.floor(max / step));
}

/** An empty Rechenstrich with one jump. Only in worked steps, or with a '?' between two given numbers: the spoken text names both ends. */
export function rechenstrich(from: number, to: number, label: string): Visual {
  const min = Math.min(from, to);
  const max = Math.max(from, to);
  return { type: 'numberLine', min, max, majorStep: max - min, minorStep: max - min, labelMajor: false, labels: [min, max], jumps: [{ from, to, label }] };
}

/** An amount in Cent as few notes and coins as possible. */
export function moneyItems(cents: number): number[] {
  const out: number[] = [];
  let left = cents;
  for (const piece of [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]) {
    while (left >= piece) {
      out.push(piece);
      left -= piece;
    }
  }
  return out;
}

/** A story with one number that the question does not need (`x`): a − b or a + b. */
export interface ExtraStory {
  id: string;
  op: '+' | '-';
  /** Range of the unneeded number; always below the smallest b (30), so the numbers of a story differ. */
  x: readonly [min: number, max: number];
  text: (a: number, b: number, x: number, name: string) => string;
  question: (name: string) => string;
  before: (name: string) => string;
  after: string;
  /** What the child looks for: 'Welche Zahl brauchst du nicht für <goal>?' */
  goal: (name: string) => string;
  /** What the unneeded number counts, for the worked step: 'Die 9 zählt <what>.' */
  what: string;
}

export const EXTRA_STORIES: readonly ExtraStory[] = [
  {
    id: 'alter', op: '-', x: [8, 10],
    text: (a, b, x, n) => `${n} ist ${x} Jahre alt. ${n} hat ${a} Karten. ${n} gibt ${b} Karten ab.`,
    question: (n) => `Wie viele Karten hat ${n} noch?`, before: (n) => `${n} hat noch`, after: 'Karten.', goal: (n) => `die Karten von ${n}`, what: 'die Jahre',
  },
  {
    id: 'klasse', op: '-', x: [20, 28],
    text: (a, b, x) => `Die Klasse hat ${x} Kinder. Im Regal stehen ${a} Bücher. Kinder leihen ${b} Bücher aus.`,
    question: () => 'Wie viele Bücher bleiben im Regal?', before: () => 'Im Regal bleiben', after: 'Bücher.', goal: () => 'die Bücher im Regal', what: 'die Kinder',
  },
  {
    id: 'zug', op: '+', x: [3, 9],
    // Menschen by the hundred, as no class fills a train; Bahnhöfe do not divide them into impossible Wagen
    text: (a, b, x) => `Der Zug hält an ${x} Bahnhöfen. Im Zug fahren ${a} Menschen. Dann steigen ${b} Menschen ein.`,
    question: () => 'Wie viele Menschen fahren jetzt im Zug?', before: () => 'Im Zug fahren jetzt', after: 'Menschen.', goal: () => 'alle Menschen', what: 'die Bahnhöfe',
  },
  {
    id: 'zoo', op: '+', x: [10, 25],
    text: (a, b, x) => `Im Zoo leben ${x} Affen. Am Morgen kommen ${a} Gäste. Am Mittag kommen ${b} Gäste.`,
    question: () => 'Wie viele Gäste kommen insgesamt?', before: () => 'Insgesamt kommen', after: 'Gäste.', goal: () => 'alle Gäste', what: 'die Affen',
  },
];
