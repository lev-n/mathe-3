/**
 * Was bedeutet der Rest? (docs/research.md §6). Rounding up or down follows from the story, never from a rule.
 * AB I: Aufteilen with a Rest, with a picture, dividend up to 50.
 * AB II: rounding up: 17 Kinder, 5 per car.
 * AB III: rounding up or down, chosen from the story, as a number or a choice about the meaning of the Rest.
 */
import { TIMES } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, probeLine, targetAb } from '../shared';
import { answerStep, sentenceAnswer, spoken } from './helpers';

const SKILL = { id: 'sachaufgaben.rest-deuten', topicId: 'sachaufgaben' } as const;
const KMK = ['ZO.rest', 'ZO.sachrechnen', 'PK.modellieren'];

interface Situation {
  id: string;
  /** Realistic group sizes. */
  k: readonly number[];
  /** The largest number that still tells a real story (default: the range of the Stufe). */
  maxN?: number;
  text: (n: number, k: number, name: string) => string;
  question: (name: string) => string;
  before: (name: string) => string;
  after: string;
  /** Singular and plural of what the division counts (Auto, Autos), and what stays over (Kinder). */
  one: string;
  many: string;
  rest: string;
  /** The extra group of a story: 'noch ein Auto', 'eine weitere Karte'. */
  another: string;
  /** 'Alle Kinder sollen mitfahren.' or 'Für 5 Karten reicht es nicht.': why the Rest counts or does not. */
  why: (q: number) => string;
  /** The Rest in one sentence, for the choice 'Was bedeutet der Rest?'. */
  meaning: (r: number) => string;
}

const UP: readonly Situation[] = [
  { id: 'autos', k: [3, 4, 5], text: (n, k) => `${n} Kinder fahren zum Zoo. In ein Auto passen ${k} Kinder.`, question: () => 'Wie viele Autos braucht die Klasse?', before: () => 'Die Klasse braucht', after: 'Autos.', one: 'Auto', many: 'Autos', rest: 'Kinder', another: 'noch ein Auto', why: (q) => `Alle Kinder sollen mitfahren. Reichen ${q} Autos?`, meaning: (r) => `${r} Kinder brauchen noch ein Auto.` },
  { id: 'tische', k: [6, 8], text: (n, k) => `Zum Schulfest kommen ${n} Gäste. An einen Tisch passen ${k} Gäste.`, question: () => 'Wie viele Tische braucht die Schule?', before: () => 'Die Schule braucht', after: 'Tische.', one: 'Tisch', many: 'Tische', rest: 'Gäste', another: 'noch einen Tisch', why: (q) => `Alle Gäste sollen sitzen. Reichen ${q} Tische?`, meaning: (r) => `${r} Gäste brauchen noch einen Tisch.` },
  { id: 'boote', k: [4, 5, 6], text: (n, k) => `${n} Kinder fahren auf den See. In ein Boot passen ${k} Kinder.`, question: () => 'Wie viele Boote braucht die Gruppe?', before: () => 'Die Gruppe braucht', after: 'Boote.', one: 'Boot', many: 'Boote', rest: 'Kinder', another: 'noch ein Boot', why: (q) => `Alle Kinder sollen mitfahren. Reichen ${q} Boote?`, meaning: (r) => `${r} Kinder brauchen noch ein Boot.` },
  { id: 'kisten', k: [6, 8, 9], text: (n, k) => `Die Bücherei packt ${n} Bücher ein. In eine Kiste passen ${k} Bücher.`, question: () => 'Wie viele Kisten braucht die Bücherei?', before: () => 'Die Bücherei braucht', after: 'Kisten.', one: 'Kiste', many: 'Kisten', rest: 'Bücher', another: 'noch eine Kiste', why: (q) => `Alle Bücher sollen in Kisten. Reichen ${q} Kisten?`, meaning: (r) => `${r} Bücher brauchen noch eine Kiste.` },
];

const DOWN: readonly Situation[] = [
  { id: 'schachteln', k: [6, 10], text: (n, k) => `Auf dem Hof liegen ${n} Eier. In eine Schachtel passen ${k} Eier.`, question: () => 'Wie viele Schachteln werden voll?', before: () => 'Es werden', after: 'Schachteln voll.', one: 'Schachtel', many: 'Schachteln', rest: 'Eier', another: 'eine weitere Schachtel', why: (q) => `Es zählen nur volle Schachteln. Für ${q} Schachteln reichen die Eier nicht.`, meaning: (r) => `${r} Eier bleiben ohne volle Schachtel.` },
  { id: 'karten', k: [3, 4, 5], maxN: 40, text: (n, k, w) => `${w} hat ${n} €. Eine Karte für das Karussell kostet ${k} €.`, question: (w) => `Wie viele Karten kann ${w} kaufen?`, before: (w) => `${w} kann`, after: 'Karten kaufen.', one: 'Karte', many: 'Karten', rest: 'Euro', another: 'eine weitere Karte', why: (q) => `Für ${q} Karten reicht das Geld nicht.`, meaning: (r) => `${r} € bleiben übrig. Für eine Karte reicht das nicht.` },
  { id: 'straeusse', k: [5, 6, 7], text: (n, k) => `Im Garten blühen ${n} Tulpen. Ein Strauß braucht ${k} Tulpen.`, question: () => 'Wie viele Sträuße werden fertig?', before: () => 'Es werden', after: 'Sträuße fertig.', one: 'Strauß', many: 'Sträuße', rest: 'Tulpen', another: 'einen weiteren Strauß', why: (q) => `Es zählen nur fertige Sträuße. Für ${q} Sträuße reichen die Tulpen nicht.`, meaning: (r) => `${r} Tulpen reichen für keinen Strauß.` },
  { id: 'teams', k: [5, 6], text: (n, k) => `${n} Kinder spielen Fußball. Eine Mannschaft hat genau ${k} Kinder.`, question: () => 'Wie viele ganze Mannschaften gibt es?', before: () => 'Es gibt', after: 'ganze Mannschaften.', one: 'Mannschaft', many: 'Mannschaften', rest: 'Kinder', another: 'eine weitere Mannschaft', why: (q) => `Es zählen nur ganze Mannschaften. Für ${q} Mannschaften fehlen Kinder.`, meaning: (r) => `${r} Kinder reichen für keine ganze Mannschaft.` },
];

/** AB I: the stories that show the division itself; the Rest is one of the two things to read. */
interface Share {
  id: string;
  text: (n: number, k: number) => string;
  /** Question, before and after for the number of full groups. */
  groups: readonly [question: string, before: string, after: string];
  /** The same for what stays over. */
  left: readonly [question: string, before: string, after: string];
}

const SHARES: readonly Share[] = [
  { id: 'gruppen', text: (n, k) => `${n} Kinder bilden Gruppen. In jede Gruppe kommen ${k} Kinder.`, groups: ['Wie viele volle Gruppen gibt es?', 'Es gibt', 'volle Gruppen.'], left: ['Wie viele Kinder bleiben übrig?', 'Es bleiben', 'Kinder übrig.'] },
  { id: 'aepfel', text: (n, k) => `${n} Äpfel kommen in Tüten. In jede Tüte kommen ${k} Äpfel.`, groups: ['Wie viele Tüten werden voll?', 'Es werden', 'Tüten voll.'], left: ['Wie viele Äpfel bleiben übrig?', 'Es bleiben', 'Äpfel übrig.'] },
  { id: 'stifte', text: (n, k) => `${n} Stifte kommen in Dosen. In jede Dose kommen ${k} Stifte.`, groups: ['Wie viele Dosen werden voll?', 'Es werden', 'Dosen voll.'], left: ['Wie viele Stifte bleiben übrig?', 'Es bleiben', 'Stifte übrig.'] },
];

function groupsPicture(q: number, k: number, r: number): Visual {
  return { type: 'dotArray', groups: [...Array.from({ length: q }, () => k), r] };
}

/** The largest pile the picture of a task draws (src/core/testing.ts). */
const MAX_PILE = 20;

/**
 * The picture of a task where the decision about the Rest is the point: one pile in rows of k, as the frames of groupsPicture would
 * name the answer in the spoken label ('Punkte in 6 Gruppen'). Whether the short last row counts stays with the child.
 */
function rowsPicture(n: number, k: number): Visual {
  return { type: 'dotArray', groups: [n], perRow: k };
}

/** q and r of a division with q ≥ 2 and a dividend up to max. A Rest ≥ 2 keeps the sentences plural: '2 Kinder brauchen noch ein Auto'. */
function divide(rng: Rng, k: number, max: number): { n: number; q: number; r: number } {
  const q = rng.int(2, Math.max(2, Math.floor((max - k + 1) / k)));
  const r = rng.int(2, k - 1);
  return { n: q * k + r, q, r };
}

function aufteilen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const share = rng.pick(SHARES);
  const k = rng.int(3, 9);
  const { n, q, r } = divide(rng, k, stufe === 1 ? 30 : 50);
  const askRest = rng.chance(0.5);
  const [prompt, before, after] = askRest ? share.left : share.groups;
  const value = askRest ? r : q;
  const context = share.text(n, k);
  return build(SKILL, stufe, {
    key: `teilen:${share.id}:${n}:${k}:${askRest ? 'rest' : 'voll'}`,
    ab,
    context,
    prompt,
    visual: groupsPicture(q, k, r),
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Schau auf das Bild. Welche Gruppe ist nicht voll?', askRest ? 'Die letzte Gruppe zeigt den Rest.' : 'Zähle nur die vollen Gruppen.'],
    steps: [`${n} : ${k} = ${q} Rest ${r}`, `Probe: ${probeLine(q, k, r)}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'rest-zahl', match: askRest ? q : r, hint: askRest ? 'Das sind die vollen Gruppen. Gefragt ist der Rest.' : 'Das ist der Rest. Gefragt sind die vollen Gruppen.' },
        { id: 'rest-sache', match: q + 1, hint: askRest ? 'Gefragt ist der Rest. Zähle die Punkte in der letzten Gruppe.' : 'Die letzte Gruppe ist nicht voll. Zähle nur die vollen Gruppen.' },
      ],
      value,
    ),
    praise: askRest ? 'Du hast den Rest im Bild gefunden.' : 'Du hast nur die vollen Gruppen gezählt.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** A story of `list`, as a number answer: up or down decides the answer. */
function numberStory(rng: Rng, stufe: Stufe, ab: Ab, list: readonly Situation[], picture: boolean): Exercise {
  const sit = rng.pick(list);
  const { name } = pickPerson(rng);
  const k = rng.pick(sit.k);
  const { n, q, r } = divide(rng, k, Math.min(sit.maxN ?? 90, picture ? MAX_PILE : stufe === 1 ? 40 : stufe === 2 ? 60 : 90));
  const up = UP.includes(sit);
  const value = up ? q + 1 : q;
  const context = sit.text(n, k, name);
  const prompt = sit.question(name);
  const before = sit.before(name);
  const rest = sit.rest === 'Euro' ? `${r} €` : `${r} ${sit.rest}`;
  return build(SKILL, stufe, {
    key: `${up ? 'auf' : 'ab'}:${sit.id}:${n}:${k}`,
    ab,
    context,
    prompt,
    ...(picture && n <= MAX_PILE ? { visual: rowsPicture(n, k) } : {}),
    answer: sentenceAnswer(value, before, sit.after, prompt),
    hints: ['Teile mit Rest. Was bedeutet der Rest in dieser Geschichte?', up ? 'Auch der Rest braucht einen Platz.' : 'Reicht der Rest für noch eine ganze Gruppe?'],
    steps: [
      { text: `${n} : ${k} = ${q} Rest ${r}`, visual: groupsPicture(q, k, r) },
      `Probe: ${probeLine(q, k, r)}`,
      up ? `${rest} brauchen ${sit.another}: ${q} + 1 = ${value}` : `Die übrigen ${rest} reichen nicht für ${sit.another}.`,
      answerStep(before, String(value), sit.after),
    ],
    bugs: numberBugs(
      [
        { id: 'rest-sache', match: up ? q : q + 1, hint: sit.why(up ? q : q + 1) },
        { id: 'rest-zahl', match: r, hint: `Das ist der Rest. Gefragt sind ${up ? 'alle' : 'nur die ganzen'} ${sit.many}.` },
        { id: 'rechenart-*', match: n * k, hint: `Hier teilst du auf. Wie oft passt die ${k} in die ${n}?` },
      ],
      value,
    ),
    praise: up ? `Du hast auch an die übrigen ${sit.rest} gedacht.` : `Du hast nur ganze ${sit.many} gezählt.`,
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB III: the division stands there; what does the Rest mean in this story? */
function restBedeutung(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const up = rng.chance(0.5);
  const sit = rng.pick(up ? UP : DOWN);
  const { name } = pickPerson(rng);
  const k = rng.pick(sit.k);
  const { n, q, r } = divide(rng, k, Math.min(sit.maxN ?? 60, stufe === 1 ? 40 : 60));
  const context = sit.text(n, k, name);
  const prompt = 'Was bedeutet der Rest?';
  const expression = `${n} : ${k} = ${q} Rest ${r}`;
  const right = sit.meaning(r);
  const wrongs = [
    { label: `Es fehlen noch ${r} ${sit.many}.`, whyWrong: `Der Rest zählt keine ${sit.many}. Schau auf die ${n} in der Geschichte.` },
    { label: `Es sind genau ${q} ${sit.many}, und nichts bleibt übrig.`, whyWrong: `Prüfe: ${q} ${TIMES} ${k} sind ${q * k}. Bis ${n} fehlen noch ${r}.` },
    { label: `Für ${q + 1} ${sit.many} reicht es genau.`, whyWrong: `Prüfe: ${q + 1} ${TIMES} ${k} sind ${(q + 1) * k}. Das ist mehr als ${n}.` },
  ];
  return build(SKILL, stufe, {
    key: `bedeutung:${sit.id}:${n}:${k}`,
    ab,
    context,
    prompt,
    expression,
    answer: makeChoice(rng, { label: right }, wrongs),
    // the hints point to the number that is divided: naming what the Rest counts would find the option by its first words
    hints: [`Was zählt die ${r} in dieser Geschichte?`, `Schau auf die ${n} in der Geschichte. Davon bleiben ${r} übrig.`],
    steps: [expression, `Probe: ${probeLine(q, k, r)}`, `Der Rest zählt ${sit.rest}.`, `Passend ist also: ${right}`],
    praise: 'Du hast den Rest in der Geschichte gedeutet.',
    srText: spoken(context, prompt, expression),
    kmk: KMK,
  });
}

export const restDeutenSkill: SkillDef = {
  ...SKILL,
  title: 'Was bedeutet der Rest?',
  description: 'Du überlegst, was mit dem Rest passiert.',
  stufen: { 1: 'Aufteilen mit Rest, mit Bild', 2: 'Alle sollen mit: Du brauchst noch eine Gruppe', 3: 'Die Geschichte entscheidet: mit Rest oder ohne?' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (ab === 1) return aufteilen(rng, stufe, ab);
    if (ab === 2) return numberStory(rng, stufe, ab, UP, stufe === 1);
    return rng.chance(0.4) ? restBedeutung(rng, stufe, ab) : numberStory(rng, stufe, ab, rng.chance(0.5) ? UP : DOWN, false);
  },
};
