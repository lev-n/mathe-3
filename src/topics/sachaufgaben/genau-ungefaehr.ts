/**
 * Genau oder ungefähr? (docs/research.md §6). Optional: 'opt' in the catalogue, an Extra for adults (src/data/curriculum.ts).
 * AB I: exact or Überschlag: is the money enough; which question needs an exact sum?
 * AB II: an Überschlag with three prices, to decide or to choose.
 * AB III: Fermi tasks with given reference values, as a choice.
 */
import { TIMES, fmtMoney } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { MAX_NUMBER } from '../../core/age';
import { build, makeChoice, pickPerson, plural, targetAb } from '../shared';
import { HEFT_EURO, euro, spoken } from './helpers';

const SKILL = { id: 'sachaufgaben.genau-ungefaehr', topicId: 'sachaufgaben' } as const;
const KMK = ['ZO.schaetzen', 'ZO.sachrechnen', 'PK.modellieren'];

const ENOUGH = 'Ja, das Geld reicht.';
const NOT_ENOUGH = 'Nein, das Geld reicht nicht.';

/** A price with 90 Cent or 10 Cent, so that rounding to whole Euro is easy. */
function nearEuro(rng: Rng, min: number, max: number): number {
  const whole = rng.int(min, max);
  return rng.chance(0.5) ? whole * 100 - 10 : whole * 100 + 10;
}

const rounded = (cents: number) => Math.round(cents / 100);

/** Realistic prices near a whole Euro. */
const bookPrice = (rng: Rng, stufe: Stufe) => nearEuro(rng, 4, stufe === 1 ? 6 : 9);
const heftPrice = (rng: Rng) => nearEuro(rng, HEFT_EURO[0], HEFT_EURO[1]);
const stiftPrice = (rng: Rng) => nearEuro(rng, 2, 3);

const EXACT = 'Ich muss genau rechnen.';
const ROUGH = 'Ein Überschlag reicht.';

interface Need {
  id: string;
  text: (name: string, x: string, y: string) => string;
  exact: boolean;
  why: string;
}

const NEEDS: readonly Need[] = [
  { id: 'reicht', exact: false, text: (n, x, y) => `${n} kauft ein Heft für ${x} und einen Stift für ${y}. ${n} hat ${euro(20)} und prüft nur: genug Geld oder nicht.`, why: 'Hier geht es nur um die Frage: Reicht das Geld?' },
  { id: 'kasse', exact: true, text: (n, x, y) => `${n} kauft ein Heft für ${x} und einen Stift für ${y}. Die Kasse will den genauen Preis.`, why: 'Die Kasse braucht den genauen Preis.' },
  { id: 'taschengeld', exact: false, text: (n, x, y) => `Ein Heft kostet ${x}. Ein Stift kostet ${y}. ${n} will nur ungefähr den Preis wissen.`, why: 'Der ungefähre Preis reicht. Das zeigt ein Überschlag.' },
  { id: 'rueckgeld', exact: true, text: (n, x, y) => `${n} kauft ein Heft für ${x} und einen Stift für ${y}. ${n} zählt das Rückgeld.`, why: 'Beim Rückgeld zählt jeder Cent.' },
];

/** AB I, first kind: which way of calculating fits this situation? */
function genauOderUngefaehr(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const need = rng.pick(NEEDS);
  const { name } = pickPerson(rng);
  const xc = heftPrice(rng);
  const yc = stiftPrice(rng);
  const context = need.text(name, fmtMoney(xc), fmtMoney(yc));
  const prompt = 'Wie rechnest du hier?';
  const right = need.exact ? EXACT : ROUGH;
  const other: ChoiceOption = { label: need.exact ? ROUGH : EXACT, whyWrong: need.why };
  return build(SKILL, stufe, {
    key: `wie:${need.id}:${xc}:${yc}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, [other]),
    hints: ['Was will die Geschichte am Ende wissen?', 'Zählt jeder Cent, oder reicht eine ungefähre Zahl?'],
    steps: [need.why, need.exact ? 'Du musst also genau rechnen.' : 'Ein Überschlag reicht also.'],
    praise: need.exact ? 'Du hast erkannt: Hier zählt jeder Cent.' : 'Du hast erkannt: Eine ungefähre Zahl reicht hier.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB I, second kind: two prices and an amount of money; the difference is large enough for an Überschlag. */
function reichtZwei(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const xc = bookPrice(rng, stufe);
  const yc = heftPrice(rng);
  const rough = rounded(xc) + rounded(yc);
  const enough = rng.chance(0.5);
  const has = enough ? rough + rng.int(2, 6) : Math.max(1, rough - rng.int(2, 3));
  const context = `${name} hat ${euro(has)}. ${name} möchte ein Buch für ${fmtMoney(xc)} und ein Heft für ${fmtMoney(yc)}.`;
  const prompt = 'Reicht das Geld?';
  const right = enough ? ENOUGH : NOT_ENOUGH;
  return build(SKILL, stufe, {
    key: `zwei:${xc}:${yc}:${has}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, [{ label: enough ? NOT_ENOUGH : ENOUGH, whyWrong: 'Mach einen Überschlag: Runde beide Preise auf ganze Euro.' }], { order: [ENOUGH, NOT_ENOUGH] }),
    hints: ['Runde beide Preise auf ganze Euro.', `Vergleiche dann mit ${euro(has)}.`],
    steps: [`Überschlag: ${euro(rounded(xc))} + ${euro(rounded(yc))} = ${euro(rough)}`, `${name} hat ${euro(has)}. ${enough ? 'Das Geld reicht.' : 'Das Geld reicht nicht.'}`],
    praise: 'Du hast zuerst überschlagen und dann entschieden.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB II, first kind: three prices; decide with the Überschlag. */
function reichtDrei(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const [xc, yc, zc] = [bookPrice(rng, stufe), heftPrice(rng), stiftPrice(rng)];
  const rough = rounded(xc) + rounded(yc) + rounded(zc);
  const enough = rng.chance(0.5);
  const has = enough ? rough + rng.int(2, 6) : rough - rng.int(2, 3);
  const context = `${name} möchte ein Buch für ${fmtMoney(xc)} und ein Heft für ${fmtMoney(yc)}. Dazu kommt ein Stift für ${fmtMoney(zc)}. ${name} hat ${euro(has)}.`;
  const prompt = 'Reicht das Geld?';
  const right = enough ? ENOUGH : NOT_ENOUGH;
  return build(SKILL, stufe, {
    key: `drei:${xc}:${yc}:${zc}:${has}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, [{ label: enough ? NOT_ENOUGH : ENOUGH, whyWrong: 'Runde alle Preise auf ganze Euro und rechne sie zusammen.' }], { order: [ENOUGH, NOT_ENOUGH] }),
    hints: ['Runde alle Preise auf ganze Euro.', `Rechne zusammen und vergleiche mit ${euro(has)}.`],
    steps: [`Überschlag: ${euro(rounded(xc))} + ${euro(rounded(yc))} + ${euro(rounded(zc))} = ${euro(rough)}`, `${name} hat ${euro(has)}. ${enough ? 'Das Geld reicht.' : 'Das Geld reicht nicht.'}`],
    praise: 'Du hast alle Preise gerundet und dann verglichen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB II, second kind: which Überschlag fits three prices? */
function welcherUeberschlag(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const [xc, yc, zc] = [bookPrice(rng, stufe), heftPrice(rng), stiftPrice(rng)];
  const [x, y, z] = [rounded(xc), rounded(yc), rounded(zc)];
  const context = `${name} kauft ein Buch für ${fmtMoney(xc)} und ein Heft für ${fmtMoney(yc)}. Dazu kommt ein Stift für ${fmtMoney(zc)}.`;
  const prompt = 'Welcher Überschlag passt zum ganzen Preis?';
  const sumOf = (a: number, b: number, c: number) => `${a} € + ${b} € + ${c} €`;
  const right = sumOf(x, y, z);
  const wrongs: ChoiceOption[] = [
    { label: sumOf(Math.floor(xc / 100), Math.floor(yc / 100), Math.floor(zc / 100)), whyWrong: '90 ct sind fast ein ganzer Euro. Runde hier auf.' },
    { label: sumOf(Math.ceil(xc / 100), Math.ceil(yc / 100), Math.ceil(zc / 100)), whyWrong: '10 ct sind nur wenig. Runde hier ab.' },
    { label: sumOf(x + 1, y + 1, z + 1), whyWrong: 'Schau auf jeden Preis: Welcher ganze Euro liegt nah?' },
    { label: sumOf(x, y + 2, z), whyWrong: 'Schau auf jeden Preis: Welcher ganze Euro liegt nah?' },
  ];
  return build(SKILL, stufe, {
    key: `welcher:${xc}:${yc}:${zc}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: ['Welcher ganze Euro liegt nah an jedem Preis?', '90 ct runden auf, 10 ct runden ab.'],
    steps: [`${fmtMoney(xc)} sind etwa ${euro(x)}.`, `${fmtMoney(yc)} sind etwa ${euro(y)}. ${fmtMoney(zc)} sind etwa ${euro(z)}.`, `Passend ist also: ${right}`],
    praise: 'Du hast jeden Preis auf den nächsten Euro gerundet.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

interface Fermi {
  id: string;
  /** The reference value and the amount stand in the story; the options are powers of ten apart. */
  /** One piece and many (Apfel, Äpfel): an option can come down to 1. */
  one: string;
  gen: (rng: Rng) => { key: string; context: string; value: number; line: string; unit: string };
}

const FERMI: readonly Fermi[] = [
  {
    id: 'schritte',
    one: 'Schritt',
    gen: (r) => {
      const m = 100 * r.int(1, 5);
      return { key: `${m}`, context: `Ein Schritt von dir ist etwa 50 cm lang. Der Schulweg ist ${m} m lang.`, value: m * 2, line: `2 Schritte sind etwa 1 m. Das sind etwa 2 ${TIMES} ${m} Schritte.`, unit: 'Schritte' };
    },
  },
  {
    id: 'aepfel',
    one: 'Apfel',
    gen: (r) => {
      const kg = r.int(1, 5);
      return { key: `${kg}`, context: `Ein Apfel wiegt etwa 100 g. Die Äpfel im Korb wiegen ${kg} kg.`, value: kg * 10, line: `1 kg sind etwa 10 Äpfel. Das sind etwa ${kg} ${TIMES} 10 Äpfel.`, unit: 'Äpfel' };
    },
  },
  {
    id: 'schule',
    one: 'Kind',
    gen: (r) => {
      const n = r.int(4, 16) * 2;
      return { key: `${n}`, context: `In einer Klasse sind etwa 25 Kinder. Die Schule hat ${n} Klassen.`, value: n * 25, line: `Das sind etwa ${n} ${TIMES} 25 Kinder.`, unit: 'Kinder' };
    },
  },
  {
    id: 'regal',
    one: 'Buch',
    gen: (r) => {
      const n = r.int(2, 9);
      return { key: `${n}`, context: `Auf ein Brett passen etwa 30 Bücher. Das Regal hat ${n} Bretter.`, value: n * 30, line: `Das sind etwa ${n} ${TIMES} 30 Bücher.`, unit: 'Bücher' };
    },
  },
];

/** A tenth, as a whole number. */
const tenth = (n: number) => (n % 10 === 0 ? n / 10 : Math.ceil(n / 10));

/** AB III: Fermi with reference values; the options lie a factor of 10 apart, so the size decides. They stay up to 1000 (§2.4): with a large value both others are smaller. */
function fermi(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const f = rng.pick(FERMI);
  const { key, context, value, line, unit } = f.gen(rng);
  const prompt = f.id === 'regal' ? 'Wie viele Bücher passen ungefähr hinein?' : f.id === 'schule' ? 'Wie viele Kinder sind ungefähr an der Schule?' : f.id === 'aepfel' ? 'Wie viele Äpfel sind ungefähr im Korb?' : 'Wie viele Schritte sind das ungefähr?';
  const count = (n: number) => `${n} ${plural(n, f.one, unit)}`;
  const right = count(value);
  const whyBig = 'Das ist viel zu viel. Rechne mit dem Wert aus der Geschichte.';
  const whySmall = 'Das ist viel zu wenig. Rechne mit dem Wert aus der Geschichte.';
  const wrongs: ChoiceOption[] = [
    value * 10 <= MAX_NUMBER ? { label: count(value * 10), whyWrong: whyBig } : { label: count(tenth(tenth(value))), whyWrong: whySmall },
    { label: count(tenth(value)), whyWrong: whySmall },
  ];
  return build(SKILL, stufe, {
    key: `fermi:${f.id}:${key}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: ['Nimm den Wert aus der Geschichte. Der Wert stimmt nur ungefähr.', 'Rechne mit runden Zahlen.'],
    steps: [line, `Passend ist also: ${right}`],
    praise: 'Du hast mit dem Wert aus der Geschichte überschlagen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

export const genauUngefaehrSkill: SkillDef = {
  ...SKILL,
  optional: 'extra',
  title: 'Genau oder ungefähr?',
  description: 'Du entscheidest, ob ein Überschlag reicht.',
  stufen: { 1: 'Genau oder ungefähr: Reicht das Geld?', 2: 'Überschlag mit mehreren Preisen', 3: 'Wie viele ungefähr? Rechne mit einem bekannten Wert' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (ab === 1) return rng.chance(0.5) ? genauOderUngefaehr(rng, stufe, ab) : reichtZwei(rng, stufe, ab);
    if (ab === 2) return rng.chance(0.5) ? reichtDrei(rng, stufe, ab) : welcherUeberschlag(rng, stufe, ab);
    return fermi(rng, stufe, ab);
  },
};
