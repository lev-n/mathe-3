/**
 * Welche Rechnung passt? (docs/research.md §6). The child finds the operation, it does not calculate.
 * AB I: two options, plus or minus, numbers up to 1000.
 * AB II: all four operations; from the story to the Rechnung.
 * AB III: which question fits a Rechnung; a word that points to the other operation (T14).
 * Feedback on a wrong option lives in ChoiceOption.whyWrong, so this skill has no Bug ids.
 */
import { MINUS, TIMES } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, pickPerson, pickTwo, targetAb, type Person } from '../shared';
import { HINT, PARTS_LOOK, PARTS_PRAISE_PLUS, partsSought, partsWrongOp, spoken, storyNumber } from './helpers';

const SKILL = { id: 'sachaufgaben.rechnung-finden', topicId: 'sachaufgaben' } as const;
const KMK = ['ZO.sachrechnen', 'PK.modellieren'];
const PROMPT = 'Welche Rechnung passt?';

type Op = '+' | '-' | '*' | ':';

interface Story {
  id: string;
  /** a is the larger number of a plus or minus story; for mal and geteilt see the story's own wording. */
  text: (a: number, b: number, who: Person) => string;
  goal: (who: Person) => string;
  /** A whole and its parts: nothing comes or goes, so the help does not ask about it. */
  parts?: boolean;
  /** Tells no story with the small numbers of AB II: a Zug has no 12 Plätze. */
  large?: boolean;
}

const PLUS: readonly Story[] = [
  { id: 'regal-dazu', text: (a, b) => `Im Regal stehen ${a} Bücher. Die Bücherei stellt ${b} Bücher dazu.`, goal: () => 'die Bücher im Regal' },
  { id: 'karten-dazu', text: (a, b, w) => `${w.name} hat ${a} Karten. ${w.name} bekommt ${b} Karten geschenkt.`, goal: (w) => `die Karten von ${w.name}` },
  { id: 'gaeste', text: (a, b) => `Vormittags kommen ${a} Gäste zum Schulfest. Nachmittags kommen ${b} Gäste.`, goal: () => 'alle Gäste' },
  { id: 'zoo', parts: true, text: (a, b) => `Im Zoo leben ${a} Vögel. Dazu leben dort ${b} Fische.`, goal: () => 'die Tiere insgesamt' },
];

const MINUS_STORIES: readonly Story[] = [
  { id: 'regal-weg', text: (a, b) => `Im Regal stehen ${a} Bücher. Kinder leihen ${b} Bücher aus.`, goal: () => 'die Bücher im Regal' },
  { id: 'karten-weg', text: (a, b, w) => `${w.name} hat ${a} Karten. ${w.name} verschenkt ${b} Karten.`, goal: (w) => `die Karten von ${w.name}` },
  { id: 'erwachsene', parts: true, text: (a, b) => `Zum Schulfest kommen insgesamt ${a} Gäste. ${b} Gäste sind Kinder.`, goal: () => 'die Erwachsenen' },
  { id: 'plaetze', parts: true, large: true, text: (a, b) => `Der Zug hat ${a} Plätze. ${b} Plätze sind besetzt.`, goal: () => 'die freien Plätze' },
];

/** s is the small one-digit number, big a multiple of it. */
const MAL: readonly Story[] = [
  { id: 'kisten', text: (big, s) => `Im Keller stehen ${s} Kisten. In jeder Kiste liegen ${big} Bälle.`, goal: () => 'alle Bälle' },
  { id: 'reihen', text: (big, s) => `Im Saal stehen ${s} Reihen. In jeder Reihe stehen ${big} Stühle.`, goal: () => 'alle Stühle' },
  { id: 'hefte', text: (big, s, w) => `${w.name} kauft ${s} Packungen. In jeder Packung sind ${big} Hefte.`, goal: () => 'alle Hefte' },
];

const GETEILT: readonly Story[] = [
  { id: 'gruppen', text: (big, s) => `${big} Kinder bilden gleich große Gruppen. In jeder Gruppe sind ${s} Kinder.`, goal: () => 'die Zahl der Gruppen' },
  { id: 'verteilen', text: (big, s, w) => `${w.name} verteilt ${big} Karten an ${s} Kinder. Jedes Kind bekommt gleich viele.`, goal: () => 'die Karten für ein Kind' },
  { id: 'tueten', text: (big, s) => `${big} Äpfel kommen in Tüten. In jede Tüte kommen ${s} Äpfel.`, goal: () => 'die Zahl der Tüten' },
];

/** The most units a story keeps in one group or Packung: more would tell no real Kiste, Reihe or Packung. */
const MAX_PER_GROUP = 20;

const WHY_WRONG: Readonly<Record<Op, string>> = {
  '+': 'Kommt in der Geschichte etwas dazu? Stell dir die Geschichte vor.',
  '-': 'Geht in der Geschichte etwas weg? Stell dir die Geschichte vor.',
  '*': 'Gibt es in der Geschichte mehrmals gleich große Gruppen?',
  ':': 'Teilt jemand in der Geschichte etwas auf? Stell dir die Geschichte vor.',
};

const MEANING: Readonly<Record<Op, string>> = {
  '+': 'Hier kommt etwas dazu. Das heißt plus.',
  '-': 'Von der ganzen Menge fällt ein Teil weg. Das heißt minus.',
  '*': 'Gleich große Gruppen wiederholen sich. Das heißt mal.',
  ':': 'Hier teilt jemand gerecht auf. Das heißt geteilt.',
};

const PRAISE: Readonly<Record<Op, string>> = {
  '+': 'Du hast erkannt: Hier kommt etwas dazu.',
  '-': 'Du hast den Teil von der ganzen Menge abgezogen.',
  '*': 'Du hast die gleich großen Gruppen erkannt.',
  ':': 'Du hast erkannt: Hier teilt jemand gerecht auf.',
};

function term(op: Op, a: number, b: number): string {
  const sign = op === '+' ? '+' : op === '-' ? MINUS : op === '*' ? TIMES : ':';
  return `${a} ${sign} ${b}`;
}

function value(op: Op, a: number, b: number): number {
  return op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
}

const FILM = 'Stell dir die Geschichte wie einen kleinen Film vor.';
const HINTS_PLUS_MINUS = [FILM, 'Kommt etwas dazu oder geht etwas weg?'];
// gleich große Gruppen stand in mal and geteilt stories alike: what separates them is whether the whole is told or sought
const HINTS_ALL = [FILM, 'Kommt etwas dazu, geht etwas weg? Wiederholt sich eine Gruppe, oder teilt jemand auf?'];
const HINTS_ALL_PARTS = ['Stell dir die Geschichte vor.', 'Sind es Teile einer ganzen Menge? Wiederholt sich eine Gruppe, oder teilt jemand auf?'];

/** The first worked step and the praise. In a story of parts nothing comes or goes. */
const meaning = (story: Story, op: Op) => (story.parts ? `${partsSought(op)} Das heißt ${op === '+' ? 'plus' : 'minus'}.` : MEANING[op]);
const praise = (story: Story, op: Op) => (story.parts && op === '+' ? PARTS_PRAISE_PLUS : PRAISE[op]);

/** AB I: plus or minus, two options. */
function plusMinus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const op: Op = rng.chance(0.5) ? '+' : '-';
  const story = rng.pick(op === '+' ? PLUS : MINUS_STORIES);
  const who = pickPerson(rng);
  const a = storyNumber(rng, stufe, 200, 800);
  const b = storyNumber(rng, stufe, 20, 190);
  const context = story.text(a, b, who);
  const prompt = `Du suchst ${story.goal(who)}. ${PROMPT}`;
  const right = term(op, a, b);
  const other: Op = op === '+' ? '-' : '+';
  return build(SKILL, stufe, {
    key: `pm:${story.id}:${a}:${b}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, [{ label: term(other, a, b), whyWrong: story.parts ? partsWrongOp(other, a) : HINT.signalwort }]),
    hints: story.parts ? [PARTS_LOOK, partsSought(op)] : HINTS_PLUS_MINUS,
    steps: [meaning(story, op), `Die Rechnung ist ${right} = ${value(op, a, b)}.`, `Passend ist also ${right}.`],
    praise: praise(story, op),
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB II: all four operations. All four terms use the same two numbers, so only the story decides. */
function vierRechenarten(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const op = rng.pick<Op>(['+', '-', '*', ':', '*', ':']);
  const story = rng.pick(op === '+' ? PLUS : op === '-' ? MINUS_STORIES.filter((m) => !m.large) : op === '*' ? MAL : GETEILT);
  const who = pickPerson(rng);
  const s = rng.int(3, 9);
  // in a mal story big counts one Kiste or Reihe, so it stays small and without Zehnerzahlen (as in ein-schritt.ts)
  const q = rng.int(2, op === '*' ? Math.max(2, Math.floor(MAX_PER_GROUP / s)) : 9);
  // Zehnerzahlen from Stufe 2, as far as the product stays in the range
  const big = s * q * (op !== '*' && stufe >= 2 && s * q * 10 * s <= 1000 && rng.chance(0.5) ? 10 : 1);
  const context = story.text(big, s, who);
  const prompt = `Du suchst ${story.goal(who)}. ${PROMPT}`;
  // in a mal story the small number comes first, as the story tells it: 6 Kisten mit je 40 Bällen
  const [a, b] = op === '*' ? [s, big] : [big, s];
  const right = term(op, a, b);
  const wrongs: ChoiceOption[] = (['+', '-', '*', ':'] as const)
    .filter((o) => o !== op)
    .map((o) => {
      const [x, y] = o === '*' ? [s, big] : [big, s];
      // a geteilt story has gleich große Gruppen too, so the question about them would confirm the mal option
      const whyWrong = o === '*' && op === ':' ? `Die ${big} ist schon die ganze Menge. Wie oft passt die ${s} hinein?` : story.parts && (o === '+' || o === '-') ? partsWrongOp(o, big) : WHY_WRONG[o];
      return { label: term(o, x, y), whyWrong };
    });
  return build(SKILL, stufe, {
    key: `vier:${story.id}:${big}:${s}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: story.parts ? HINTS_ALL_PARTS : HINTS_ALL,
    steps: [meaning(story, op), `Die Rechnung ist ${right} = ${value(op, a, b)}.`, `Passend ist also ${right}.`],
    praise: praise(story, op),
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

const THINGS = ['Karten', 'Murmeln', 'Aufkleber', 'Bücher'] as const;

/** AB III, first kind: which question fits a Rechnung. The word 'mehr' stands at a minus Rechnung. */
function frageZurRechnung(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const thing = rng.pick(THINGS);
  const a = storyNumber(rng, stufe, 300, 700);
  const b = storyNumber(rng, stufe, 40, 280);
  const op: Op = rng.chance(0.6) ? '-' : '+';
  const context = `${p.name} hat ${a} ${thing}. ${q.name} hat ${b} ${thing}.`;
  const prompt = 'Welche Frage passt zur Rechnung?';
  const expression = term(op, a, b);
  const more = `Wie viele ${thing} hat ${p.name} mehr als ${q.name}?`;
  const fewer = `Wie viele ${thing} hat ${q.name} weniger als ${p.name}?`;
  const both = `Wie viele ${thing} haben ${p.name} und ${q.name} zusammen?`;
  const given: ChoiceOption = { label: `Wie viele ${thing} hat ${q.name}?`, whyWrong: 'Das steht schon in der Geschichte. Dafür brauchst du keine Rechnung.' };
  const subject = rng.chance(0.5) ? more : fewer;
  const right = op === '-' ? subject : both;
  const wrong: ChoiceOption[] = op === '-'
    ? [{ label: both, whyWrong: 'Zusammen heißt: Beide Mengen kommen zusammen. Passt dazu minus?' }, given]
    : [{ label: subject, whyWrong: 'Gefragt ist hier der Unterschied. Passt dazu plus?' }, given];
  return build(SKILL, stufe, {
    key: `frage:${op === '-' ? (subject === more ? 'mehr' : 'weniger') : 'plus'}:${a}:${b}:${thing}`,
    ab,
    context,
    prompt,
    expression,
    answer: makeChoice(rng, { label: right }, wrong),
    hints: ['Was rechnet die Rechnung aus: den Unterschied oder beide zusammen?', 'Prüfe jede Frage: Passt dazu plus oder minus?'],
    steps: [op === '-' ? 'Minus zeigt hier den Unterschied zwischen den Mengen.' : 'Plus nimmt beide Mengen zusammen.', `${expression} = ${value(op, a, b)}`, `Passend ist also: ${right}`],
    praise: 'Du hast die Fragen an der Rechnung geprüft.',
    srText: spoken(context, prompt, expression),
    kmk: KMK,
  });
}

/** AB III, second kind: 'mehr' with minus, 'weniger' with plus, 'insgesamt' with minus. */
function irrefuehrendesWort(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const a = storyNumber(rng, stufe, 300, 700);
  const b = storyNumber(rng, stufe, 40, 280);
  const kind = rng.pick(['mehr', 'weniger', 'insgesamt'] as const);
  const context =
    kind === 'mehr' ? `${p.name} hat ${a} Karten. Das sind ${b} Karten mehr als bei ${q.name}.`
    : kind === 'weniger' ? `${p.name} hat ${a} Karten. Das sind ${b} Karten weniger als bei ${q.name}.`
    : `Die Bücherei hat insgesamt ${a} Bücher. ${b} Bücher sind ausgeliehen.`;
  const prompt = kind === 'insgesamt' ? `Du suchst die Bücher im Regal. ${PROMPT}` : `Du suchst die Karten von ${q.name}. ${PROMPT}`;
  const op: Op = kind === 'weniger' ? '+' : '-';
  const other: Op = op === '+' ? '-' : '+';
  const whyWrong = kind === 'insgesamt' ? 'Die Bücher im Regal sind nur ein Teil. Kann ein Teil größer sein?' : `Stell dir die Geschichte vor. Hat ${q.name} mehr oder weniger als ${p.name}?`;
  const right = term(op, a, b);
  const explain =
    kind === 'mehr' ? `${p.name} hat mehr. ${q.name} hat also weniger als ${a}.`
    : kind === 'weniger' ? `${p.name} hat weniger. ${q.name} hat also mehr als ${a}.`
    : `Die ${a} Bücher sind alle. Im Regal steht nur ein Teil.`;
  return build(SKILL, stufe, {
    key: `wort:${kind}:${a}:${b}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, [{ label: term(other, a, b), whyWrong }]),
    hints: ['Lass dich nicht von einem einzelnen Wort leiten.', kind === 'insgesamt' ? 'Sind die Bücher im Regal alle oder nur ein Teil?' : `Wer hat mehr: ${p.name} oder ${q.name}?`],
    steps: [explain, `Die Rechnung ist ${right} = ${value(op, a, b)}.`, `Passend ist also ${right}.`],
    praise: kind === 'insgesamt' ? 'Du hast dir die Geschichte genau vorgestellt.' : `Du hast nicht nur auf „${kind}“ geschaut.`,
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

export const rechnungFindenSkill: SkillDef = {
  ...SKILL,
  title: 'Welche Rechnung passt?',
  description: 'Du findest die Rechnung zur Geschichte.',
  stufen: { 1: 'Plus oder minus: Welche Rechnung passt?', 2: 'Plus, minus, mal und geteilt', 3: 'Welche Frage passt? Ein Wort führt in die Irre' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (ab === 1) return plusMinus(rng, stufe, ab);
    if (ab === 2) return vierRechenarten(rng, stufe, ab);
    return rng.chance(0.5) ? frageZurRechnung(rng, stufe, ab) : irrefuehrendesWort(rng, stufe, ab);
  },
};
