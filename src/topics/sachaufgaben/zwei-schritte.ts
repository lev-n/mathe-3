/**
 * Zwei Schritte (docs/research.md §6).
 * AB I: plus then plus, up to 500, with a picture; as a number or with one field per step.
 * AB II: buying then Rückgeld; mal then plus; with one field per step when the numbers are whole.
 * AB III: data from a table; three numbers, two steps.
 */
import { MINUS, TIMES, fmtMoney } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, multiBugs, numberBugs, pickPerson, speak, targetAb } from '../shared';
import { HINT, answerStep, euro, moneyItems, priceText, rueckgeldBugs, sentenceAnswer, spoken, spokenFields, storyNumber } from './helpers';

const SKILL = { id: 'sachaufgaben.zwei-schritte', topicId: 'sachaufgaben' } as const;
const KMK = ['ZO.sachrechnen', 'PK.modellieren'];

/** Three amounts that stay up to 500 together. */
function threeUpTo500(rng: Rng, stufe: Stufe): [number, number, number] {
  const a = storyNumber(rng, stufe, 100, 250);
  const b = storyNumber(rng, stufe, 20, 120);
  const c = storyNumber(rng, stufe, 20, 120);
  return [a, b, c];
}

/**
 * AB I with money. The picture shows the money the class has at the start: all three amounts on a phone are taller than the screen, and a
 * worksheet would shrink their labels to 5 pt. The money of a class: up to 500 € is no child's pocket money.
 */
function sparen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b, c] = threeUpTo500(rng, stufe);
  const first = a + b;
  const value = first + c;
  const context = `Die Klasse hat ${euro(a)}. Das Schulfest bringt ${euro(b)}. Der Flohmarkt bringt ${euro(c)}.`;
  const prompt = 'Wie viel Euro hat die Klasse jetzt?';
  const before = 'Die Klasse hat jetzt';
  return build(SKILL, stufe, {
    key: `sparen:${a}:${b}:${c}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: moneyItems(a * 100) },
    answer: sentenceAnswer(value, before, '€.', prompt),
    hints: ['Rechne zuerst das Geld vom Schulfest dazu.', 'Dann kommt das Geld vom Flohmarkt dazu.'],
    steps: [`Mit dem Schulfest: ${a} € + ${b} € = ${first} €`, `Mit dem Flohmarkt: ${first} € + ${c} € = ${value} €`, answerStep(before, String(value), '€.')],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: first, hint: HINT.ersterSchritt },
        { id: 'nur-erster-schritt', match: a + c, hint: 'Das Geld vom Schulfest und vom Flohmarkt zählt beides.' },
      ],
      value,
    ),
    praise: 'Du hast beide Schritte nacheinander gerechnet.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

interface Days {
  id: string;
  caption: string;
  /** What the table counts: the heading of its second column. */
  unit: string;
  text: (a: number, b: number, c: number) => string;
  question: string;
  before: string;
  after: string;
}

/** One row per day: three columns with these headings are wider than the card on a 375 px phone, and the last day would stay hidden. */
function dayTable(caption: string, unit: string, a: number, b: number, c: number): Visual {
  return { type: 'table', caption, header: ['Tag', unit], rows: [['Montag', String(a)], ['Dienstag', String(b)], ['Mittwoch', String(c)]] };
}

const DAYS: readonly Days[] = [
  { id: 'buecherei', caption: 'Kinder in der Bücherei', unit: 'Kinder', text: (a, b, c) => `Am Montag kommen ${a} Kinder in die Bücherei. Am Dienstag kommen ${b} Kinder. Am Mittwoch kommen ${c} Kinder.`, question: 'Wie viele Kinder kommen insgesamt?', before: 'Insgesamt kommen', after: 'Kinder.' },
  { id: 'flaschen', caption: 'Gesammelte Flaschen', unit: 'Flaschen', text: (a, b, c) => `Am Montag sammelt die Klasse ${a} Flaschen. Am Dienstag sind es ${b} Flaschen. Am Mittwoch sind es ${c} Flaschen.`, question: 'Wie viele Flaschen sind das zusammen?', before: 'Das sind zusammen', after: 'Flaschen.' },
];

/** AB I with one field per step and a table of the numbers as the picture. */
function tage(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(DAYS);
  const [a, b, c] = threeUpTo500(rng, stufe);
  const first = a + b;
  const value = first + c;
  const context = story.text(a, b, c);
  const fields: MultiField[] = [
    { id: 'erst', value: first, before: `${a} + ${b} =`, label: speak(`Erster Schritt: ${a} + ${b}`) },
    { id: 'dann', value, before: `Mit ${c} dazu:`, label: `Zweiter Schritt: Mit ${c} dazu` },
  ];
  return build(SKILL, stufe, {
    key: `tage:${story.id}:${a}:${b}:${c}`,
    ab,
    context,
    prompt: story.question,
    visual: dayTable(story.caption, story.unit, a, b, c),
    answer: { kind: 'multi', fields },
    hints: ['Rechne die ersten beiden Tage zusammen.', 'Dann nimm den letzten Tag dazu.'],
    steps: [`Erster Schritt: ${a} + ${b} = ${first}`, `Zweiter Schritt: ${first} + ${c} = ${value}`, `Antwort: Erst ${first}, am Ende ${value}.`],
    bugs: multiBugs(
      [
        { id: 'nur-erster-schritt', match: { erst: first, dann: first }, hint: HINT.ersterSchritt },
        { id: 'alle-zahlen', match: { erst: first, dann: first + c + a }, hint: `Die ${a} steckt schon im ersten Schritt.` },
      ],
      fields,
    ),
    praise: 'Du hast beide Schritte nacheinander gerechnet.',
    srText: spoken(context, story.question, spokenFields(fields)),
    kmk: KMK,
  });
}

/** AB II: buying with comma prices, then Rückgeld. */
function einkauf(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const x = 100 * rng.int(1, 3) + 10 * rng.int(1, 9);
  // the sum keeps its Cent: the way to the next Euro is part of the worked step
  const drawn = 100 * rng.int(1, 3) + 10 * rng.int(1, 9);
  const y = (x + drawn) % 100 === 0 ? drawn + 10 : drawn;
  const paid = 10;
  const total = x + y;
  const value = paid * 100 - total;
  const next = Math.ceil(total / 100);
  const context = `${name} kauft ein Heft für ${fmtMoney(x)} und einen Stift für ${fmtMoney(y)}. ${name} bezahlt mit ${euro(paid)}.`;
  const prompt = `Wie viel Euro bekommt ${name} zurück?`;
  const before = `${name} bekommt`;
  const after = '€ zurück.';
  return build(SKILL, stufe, {
    key: `einkauf:${x}:${y}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: [paid * 100] },
    answer: sentenceAnswer(value / 100, before, after, prompt, { decimals: 2 }),
    hints: ['Rechne zuerst den ganzen Preis aus.', 'Dann rechne vom Preis bis zum Schein.'],
    steps: [`Preis: ${fmtMoney(x)} + ${fmtMoney(y)} = ${fmtMoney(total)}`, `Bis ${euro(next)} fehlen ${next * 100 - total} ct, bis ${euro(paid)} noch ${euro(paid - next)}.`, answerStep(before, priceText(value), after)],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: total / 100, hint: HINT.ersterSchritt },
        ...rueckgeldBugs(paid, total),
        { id: 'alle-zahlen', match: (total + paid * 100) / 100, hint: `Mit den ${euro(paid)} bezahlst du nur. Dieses Geld kommt nicht zum Preis dazu.` },
        { id: 'unsinnig-gross', match: value, hint: HINT.unsinnig },
      ],
      value / 100,
    ),
    praise: 'Du hast erst den Preis und dann das Rückgeld gerechnet.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'GM.geld'],
  });
}

interface MalPlus {
  id: string;
  text: (k: number, n: number, b: number) => string;
  question: string;
  before: string;
  after: string;
  /** Prices are small; counted things may be Zehnerzahlen. */
  money: boolean;
  /** Tells a story with Zehnerzahlen too: a Kiste with 80 Bällen does not. */
  tens: boolean;
}

const MAL_PLUS: readonly MalPlus[] = [
  { id: 'zoo', money: true, tens: false, text: (k, n, b) => `Eine Karte für den Zoo kostet ${euro(k)}. Die Klasse kauft ${n} Karten. Der Bus kostet ${euro(b)}.`, question: 'Wie viel Euro bezahlt die Klasse insgesamt?', before: 'Die Klasse bezahlt insgesamt', after: '€.' },
  { id: 'baelle', money: false, tens: false, text: (k, n, b) => `In jeder Kiste liegen ${k} Bälle. In der Halle stehen ${n} Kisten. Daneben liegen ${b} Bälle.`, question: 'Wie viele Bälle sind das insgesamt?', before: 'Das sind insgesamt', after: 'Bälle.' },
  { id: 'stuehle', money: false, tens: false, text: (k, n, b) => `In jeder Reihe stehen ${k} Stühle. Im Saal sind ${n} Reihen. Vorne stehen noch ${b} Stühle.`, question: 'Wie viele Stühle stehen im Saal?', before: 'Im Saal stehen', after: 'Stühle.' },
  { id: 'buecher', money: false, tens: true, text: (k, n, b) => `In jedem Regal stehen ${k} Bücher. In der Bücherei sind ${n} Regale. Auf dem Tisch liegen ${b} Bücher.`, question: 'Wie viele Bücher sind das insgesamt?', before: 'Das sind insgesamt', after: 'Bücher.' },
];

/** AB II: mal then plus; with one field per step on Stufe 1 and 2. */
function malDannPlus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(MAL_PLUS);
  const k = rng.int(3, 9) * (story.tens && stufe >= 2 && rng.chance(0.5) ? 10 : 1);
  const n = rng.int(3, 9);
  const b = story.money ? rng.int(2, 8) * 10 : rng.int(2, 9) * (stufe === 1 ? 5 : 1);
  const first = n * k;
  const value = first + b;
  const context = story.text(k, n, b);
  const useFields = stufe <= 2 && rng.chance(0.5);
  const fields: MultiField[] = [
    { id: 'erst', value: first, before: `${n} ${TIMES} ${k} =`, label: speak(`Erster Schritt: ${n} ${TIMES} ${k}`) },
    { id: 'dann', value, before: `Mit ${b} dazu:`, label: `Zweiter Schritt: Mit ${b} dazu` },
  ];
  const wrongFirst = n + k;
  return build(SKILL, stufe, {
    key: `malplus:${story.id}:${k}:${n}:${b}:${useFields ? 'felder' : 'zahl'}`,
    ab,
    context,
    prompt: story.question,
    answer: useFields ? { kind: 'multi', fields } : sentenceAnswer(value, story.before, story.after, story.question),
    hints: ['Rechne zuerst die gleich großen Gruppen aus.', 'Dann kommt die letzte Zahl dazu.'],
    steps: [`Erster Schritt: ${n} ${TIMES} ${k} = ${first}`, `Zweiter Schritt: ${first} + ${b} = ${value}`, useFields ? `Antwort: Erst ${first}, am Ende ${value}.` : answerStep(story.before, String(value), story.after)],
    bugs: useFields
      ? multiBugs(
          [
            { id: 'nur-erster-schritt', match: { erst: first, dann: first }, hint: HINT.ersterSchritt },
            { id: 'rechenart-+', match: { erst: wrongFirst, dann: wrongFirst + b }, hint: `${n}-mal die ${k} heißt: mal, nicht plus.` },
          ],
          fields,
        )
      : numberBugs(
          [
            { id: 'nur-erster-schritt', match: first, hint: HINT.ersterSchritt },
            { id: 'alle-zahlen', match: n + k + b, hint: HINT.alleZahlen },
            { id: 'signalwort', match: first - b, hint: `Die ${b} zählt auch mit. Sind es dadurch mehr oder weniger?` },
          ],
          value,
        ),
    praise: 'Du hast erst malgenommen und dann dazugezählt.',
    srText: spoken(context, story.question, useFields ? spokenFields(fields) : undefined),
    kmk: KMK,
  });
}

interface PriceRow {
  label: string;
  plural: string;
  range: readonly [number, number];
}

const SHOP: readonly PriceRow[] = [
  { label: 'Heft', plural: 'Hefte', range: [2, 4] },
  { label: 'Stift', plural: 'Stifte', range: [1, 3] },
  { label: 'Ball', plural: 'Bälle', range: [5, 9] },
  { label: 'Buch', plural: 'Bücher', range: [6, 12] },
];

/** AB III: prices stand in the table only (T15); one row is not needed. */
function tabellePreise(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const [one, two, unused] = rng.sample(SHOP, 3);
  const [p1, p2, p3] = [rng.int(one.range[0], one.range[1]), rng.int(two.range[0], two.range[1]), rng.int(unused.range[0], unused.range[1])];
  const n = rng.int(2, 5);
  const m = rng.int(2, 5);
  const first = n * p1;
  const second = m * p2;
  const value = first + second;
  const context = `${name} kauft ${n} ${one.plural} und ${m} ${two.plural}.`;
  const prompt = `Wie viel Euro bezahlt ${name}?`;
  const before = `${name} bezahlt`;
  return build(SKILL, stufe, {
    key: `preise:${one.label}:${p1}:${n}:${two.label}:${p2}:${m}:${unused.label}:${p3}`,
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: 'Preise', header: ['Ware', 'Preis'], rows: rng.shuffle([[one.label, euro(p1)], [two.label, euro(p2)], [unused.label, euro(p3)]]) },
    answer: sentenceAnswer(value, before, '€.', prompt),
    hints: ['Such die beiden Preise in der Tabelle.', 'Rechne jede Ware einzeln, dann beide zusammen.'],
    steps: [`${one.plural}: ${n} ${TIMES} ${euro(p1)} = ${euro(first)}`, `${two.plural}: ${m} ${TIMES} ${euro(p2)} = ${euro(second)}`, `Zusammen: ${euro(first)} + ${euro(second)} = ${euro(value)}`, answerStep(before, String(value), '€.')],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: first, hint: HINT.ersterSchritt },
        { id: 'nur-erster-schritt', match: second, hint: HINT.ersterSchritt },
        { id: 'alle-zahlen', match: p1 + p2 + p3, hint: HINT.alleZahlen },
        { id: 'alle-zahlen', match: p1 + p2, hint: `${name} kauft mehr als ein Stück. Wie viele sind es?` },
      ],
      value,
    ),
    praise: 'Du hast die passenden Preise aus der Tabelle genommen.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'DZ.daten'],
  });
}

/** AB III: a table of days; compare two days with a third. */
function tabelleTage(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = storyNumber(rng, stufe, 40, 150);
  const b = storyNumber(rng, stufe, 40, 150);
  const c = storyNumber(rng, stufe, 20, a + b - 20);
  const first = a + b;
  const value = first - c;
  const context = 'Die Tabelle zeigt die Kinder in der Bücherei.';
  const prompt = 'Wie viele Kinder kommen Montag und Dienstag zusammen mehr als am Mittwoch?';
  const before = 'Es sind';
  const after = 'Kinder mehr.';
  return build(SKILL, stufe, {
    key: `besuch:${a}:${b}:${c}`,
    ab,
    context,
    prompt,
    visual: dayTable('Kinder in der Bücherei', 'Kinder', a, b, c),
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Rechne zuerst Montag und Dienstag zusammen.', 'Dann vergleiche mit Mittwoch.'],
    steps: [`Zusammen: ${a} + ${b} = ${first}`, `Unterschied: ${first} ${MINUS} ${c} = ${value}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: first, hint: HINT.ersterSchritt },
        { id: 'alle-zahlen', match: first + c, hint: 'Der Mittwoch kommt nicht dazu. Du vergleichst mit dem Mittwoch.' },
      ],
      value,
    ),
    praise: 'Du hast erst beide Tage genommen und dann verglichen.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'DZ.daten'],
  });
}

/** AB III: three numbers in two steps; out and in. */
function dreiZahlen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = storyNumber(rng, stufe, 200, 600);
  const b = storyNumber(rng, stufe, 40, 150);
  const c = storyNumber(rng, stufe, 20, 150);
  const first = a - b;
  const value = first + c;
  const bus = rng.chance(0.5);
  const context = bus ? `Im Zug fahren ${a} Menschen. Am Bahnhof steigen ${b} Menschen aus. Dann steigen ${c} Menschen ein.` : `In der Bücherei stehen ${a} Bücher. Kinder leihen ${b} Bücher aus. Andere Kinder bringen ${c} Bücher zurück.`;
  const prompt = bus ? 'Wie viele Menschen fahren jetzt im Zug?' : 'Wie viele Bücher stehen jetzt in der Bücherei?';
  const before = bus ? 'Im Zug fahren jetzt' : 'In der Bücherei stehen jetzt';
  const after = bus ? 'Menschen.' : 'Bücher.';
  return build(SKILL, stufe, {
    key: `drei:${bus ? 'zug' : 'buecher'}:${a}:${b}:${c}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Geh die Geschichte Satz für Satz durch.', 'Was geht weg? Was kommt dazu?'],
    steps: [`Zuerst: ${a} ${MINUS} ${b} = ${first}`, `Dann: ${first} + ${c} = ${value}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: first, hint: HINT.ersterSchritt },
        { id: 'alle-zahlen', match: a + b + c, hint: 'Ein Teil geht weg, ein Teil kommt dazu. Lies Satz für Satz.' },
        { id: 'signalwort', match: first - c, hint: HINT.signalwort },
      ],
      value,
    ),
    praise: 'Du bist die Geschichte Satz für Satz durchgegangen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

export const zweiSchritteSkill: SkillDef = {
  ...SKILL,
  title: 'Zwei Schritte',
  description: 'Du rechnest zwei Schritte nacheinander.',
  stufen: { 1: 'Plus und noch einmal plus, bis 500', 2: 'Einkaufen und Rückgeld; mal und dann plus', 3: 'Daten aus der Tabelle; mehrere Zahlen' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const form = ab === 1 ? rng.pick([sparen, tage]) : ab === 2 ? rng.pick([einkauf, malDannPlus]) : rng.pick([tabellePreise, tabelleTage, dreiZahlen]);
    return form(rng, stufe, ab);
  },
};
