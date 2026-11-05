/**
 * Einkaufen und Rückgeld (docs/research.md §6).
 * AB I: two prices in whole euros and 50 ct (together, "wie viel mehr", what is left).
 * AB II: comma prices, Rückgeld from 20 € or 50 €.
 * AB III: three items, "Reicht das Geld?", Stückelung with the fewest notes and coins.
 */
import { fmtMoney } from '../../core/format';
import type { Ab, ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, numberBugs, pickPerson } from '../shared';
import { generator, moneyPieces, pieceText, qty, sr, type Form } from './helpers';

const SKILL = { id: 'groessen.einkaufen', topicId: 'groessen' } as const;
const KMK = ['GM.geld', 'GM.sachsituationen'];

interface Ware {
  /** Two words, so that a task with three items stays inside T2. */
  acc: string;
  nom: string;
  /** Whole euros of a fitting price. */
  low: number;
  high: number;
}

const WAREN: readonly Ware[] = [
  { acc: 'einen Stift', nom: 'Der Stift', low: 1, high: 3 },
  { acc: 'ein Heft', nom: 'Das Heft', low: 1, high: 3 },
  { acc: 'einen Saft', nom: 'Der Saft', low: 1, high: 3 },
  { acc: 'ein Brot', nom: 'Das Brot', low: 2, high: 5 },
  { acc: 'eine Mappe', nom: 'Die Mappe', low: 2, high: 6 },
  { acc: 'einen Kuchen', nom: 'Der Kuchen', low: 4, high: 9 },
  { acc: 'eine Mütze', nom: 'Die Mütze', low: 5, high: 12 },
  { acc: 'ein Buch', nom: 'Das Buch', low: 6, high: 15 },
  { acc: 'ein Puzzle', nom: 'Das Puzzle', low: 6, high: 18 },
  { acc: 'einen Ball', nom: 'Der Ball', low: 7, high: 20 },
  { acc: 'ein Spiel', nom: 'Das Spiel', low: 8, high: 24 },
];

const SMALL = WAREN.filter((w) => w.high <= 9);

/** Cent endings: 50 ct on AB I, else 10-ct steps on Stufe 1 and 5-ct steps above. */
function centsOf(rng: Rng, stufe: Stufe, ab: Ab): number {
  if (ab === 1) return rng.pick([0, 50]);
  return stufe === 1 ? rng.int(1, 9) * 10 : rng.int(1, 19) * 5;
}

/** Only larger things can cost up to twice as much: a Stift stays a Stift. */
const canDouble = (w: Ware) => w.high > 9;

/** On Stufe 3 the larger things cost up to twice as much: still at most 100 € for two prices. */
function priceOf(rng: Rng, w: Ware, stufe: Stufe, ab: Ab): number {
  const factor = stufe === 3 && canDouble(w) ? 2 : 1;
  return rng.int(w.low, w.high) * factor * 100 + centsOf(rng, stufe, ab);
}

function hintCentSumme(c1: number, c2: number): string {
  const sum = c1 + c2;
  return sum === 100 ? `${qty(c1, 'ct')} und ${qty(c2, 'ct')} sind ${qty(sum, 'ct')}. Das ist 1 €.` : `${qty(c1, 'ct')} und ${qty(c2, 'ct')} sind ${qty(sum, 'ct')}. Das ist 1 € ${qty(sum - 100, 'ct')}.`;
}

/** Euro and cent parts added line by line: the worked steps of a sum. */
function sumSteps(prices: readonly number[]): string[] {
  const euro = prices.reduce((s, p) => s + Math.floor(p / 100), 0);
  const ct = prices.reduce((s, p) => s + p % 100, 0);
  const total = euro * 100 + ct;
  const steps = [`Erst die Euro: ${prices.map((p) => qty(Math.floor(p / 100), '€')).join(' + ')} = ${qty(euro, '€')}`];
  if (ct > 0) {
    steps.push(`Dann die Cent: ${prices.map((p) => qty(p % 100, 'ct')).join(' + ')} = ${qty(ct, 'ct')}`);
    steps.push(`${qty(euro, '€')} + ${qty(ct, 'ct')} = ${fmtMoney(total)}`);
  } else {
    steps.push(`Zusammen: ${fmtMoney(total)}`);
  }
  return steps;
}

/** Next whole euro above a price in Cent. */
const nextEuro = (price: number) => Math.ceil(price / 100) * 100;

/**
 * Counting up from the lower to the higher amount (§2.4: no written calculation with comma numbers): to the next full euro, on to the last
 * full euro, then the cents. Every piece is whole euros or cents, and a piece of 0 stays out.
 */
function upSteps(from: number, to: number): string[] {
  const up = Math.min(nextEuro(from), to);
  const whole = Math.max(up, Math.floor(to / 100) * 100);
  const pieces = [[from, up], [up, whole], [whole, to]].filter(([a, b]) => b > a);
  const amount = (d: number) => (d >= 100 ? qty(d / 100, '€') : qty(d, 'ct'));
  const lines = pieces.map(([a, b]) => `Von ${fmtMoney(a)} bis ${fmtMoney(b)} ${b - a === 100 || b - a === 1 ? 'ist es' : 'sind es'} ${amount(b - a)}.`);
  const total = to - from;
  if (pieces.length === 1) return [...lines, `${total === 100 ? 'Das ist' : 'Das sind'} ${fmtMoney(total)}.`];
  const sizes = pieces.map(([a, b]) => b - a).sort((x, y) => y - x);
  return [...lines, `${sizes.map(amount).join(' + ')} = ${fmtMoney(total)}`];
}

const zusammen: Form = (rng, stufe, ab) => {
  const who = pickPerson(rng);
  const [w1, w2] = rng.sample(WAREN, 2);
  const p1 = priceOf(rng, w1, stufe, ab);
  const p2 = priceOf(rng, w2, stufe, ab);
  const total = p1 + p2;
  const value = total / 100;
  const c1 = p1 % 100;
  const c2 = p2 % 100;
  const centSum = c1 + c2;
  const euro = Math.floor(p1 / 100) + Math.floor(p2 / 100);
  const context = `${who.name} kauft ${w1.acc} für ${fmtMoney(p1)} und ${w2.acc} für ${fmtMoney(p2)}.`;
  const prompt = 'Wie viel kostet alles zusammen?';
  return {
    key: `zusammen:${p1}:${p2}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, decimals: 2, before: 'Alles zusammen kostet', after: '€.', label: 'Preis in Euro' },
    hints: centSum === 0 ? ['Rechne die beiden Preise zusammen.', 'Hier sind es nur volle Euro.'] : ['Rechne erst die Euro zusammen, dann die Cent.', centSum >= 100 ? '100 ct sind 1 €.' : 'Die Cent stehen nach dem Komma.'],
    steps: sumSteps([p1, p2]),
    bugs: numberBugs(
      [
        centSum >= 100 && { id: 'komma-cent-summe', match: euro + (c1 + c2 - 100) / 100, hint: hintCentSumme(c1, c2) },
        centSum > 0 && { id: 'cent-vergessen', match: euro, hint: 'Rechne auch die Cent zusammen.' },
        { id: 'ein-preis', match: p1 / 100, hint: 'Hier sind es 2 Preise. Rechne beide Preise zusammen.' },
        { id: 'ein-preis', match: p2 / 100, hint: 'Hier sind es 2 Preise. Rechne beide Preise zusammen.' },
      ],
      value,
    ),
    praise: centSum >= 100 ? 'Du hast aus 100 ct einen Euro gemacht.' : centSum > 0 ? 'Du hast Euro und Cent getrennt gerechnet.' : 'Du hast mit beiden Preisen gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
};

const unterschied: Form = (rng, stufe, ab) => {
  const [a, b] = rng.sample(WAREN, 2);
  let pa = priceOf(rng, a, stufe, ab);
  let pb = priceOf(rng, b, stufe, ab);
  if (pa === pb) pb += 100;
  const [high, low] = pa > pb ? [a, b] : [b, a];
  if (pa < pb) [pa, pb] = [pb, pa];
  const diff = pa - pb;
  const value = diff / 100;
  const context = `${high.nom} kostet ${fmtMoney(pa)}. ${low.nom} kostet ${fmtMoney(pb)}.`;
  const prompt = `Wie viel mehr kostet ${high.nom[0].toLowerCase()}${high.nom.slice(1)}?`;
  const borrow = pa % 100 < pb % 100;
  return {
    key: `unterschied:${pa}:${pb}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, decimals: 2, before: `${high.nom} kostet`, after: '€ mehr.', label: 'Unterschied in Euro' },
    hints: ['Gesucht ist der Unterschied der Preise.', 'Geh vom kleinen Preis in Schritten bis zum großen Preis.'],
    steps: upSteps(pb, pa),
    bugs: numberBugs(
      [
        { id: 'signalwort', match: (pa + pb) / 100, hint: 'Stell dir die Preise vor. Der Unterschied ist kleiner als der große Preis.' },
        { id: 'ein-preis', match: pa / 100, hint: 'Das ist ein Preis. Gesucht ist der Unterschied.' },
        borrow && { id: 'cent-umgekehrt', match: (Math.floor(pa / 100) - Math.floor(pb / 100)) + (pb % 100 - pa % 100) / 100, hint: `Rechne von ${fmtMoney(pb)} erst bis ${fmtMoney(nextEuro(pb))}, dann weiter bis ${fmtMoney(pa)}.` },
      ],
      value,
    ),
    praise: 'Du hast den Unterschied der Preise gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
};

function changeBugs(price: number, paid: number) {
  const ct = price % 100;
  const euroDiff = (paid - Math.floor(price / 100) * 100) / 100;
  return [
    { id: 'rueckgeld-cent', match: euroDiff + ct / 100, hint: `Rechne von ${fmtMoney(price)} erst bis ${fmtMoney(nextEuro(price))}, dann weiter bis ${fmtMoney(paid)}.` },
    { id: 'rueckgeld-euro', match: euroDiff + (100 - ct) / 100, hint: 'Du brauchst 1 € für die Cent. Bei den Euro bleibt 1 weniger.' },
    { id: 'addiert', match: (paid + price) / 100, hint: 'Du gibst Geld ab. Es bleibt weniger als vorher.' },
    { id: 'ein-preis', match: price / 100, hint: 'Das ist der Preis. Gefragt ist das Geld zurück.' },
  ];
}

const uebrig: Form = (rng, stufe, ab) => {
  const who = pickPerson(rng);
  const w = rng.pick(WAREN);
  const price = priceOf(rng, w, stufe, ab);
  const have = (Math.floor(price / 100) + rng.int(1, 9)) * 100 + rng.pick([0, 0, 50]);
  const change = have - price;
  const value = change / 100;
  const context = `${who.name} hat ${fmtMoney(have)}. ${who.name} kauft ${w.acc} für ${fmtMoney(price)}.`;
  const prompt = 'Wie viel Geld bleibt übrig?';
  return {
    key: `uebrig:${price}:${have}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: moneyPieces(have) },
    answer: { kind: 'number', value, decimals: 2, before: change === 100 ? 'Es bleibt' : 'Es bleiben', after: '€ übrig.', label: 'Betrag in Euro' },
    hints: ['Geh vom Preis in Schritten bis zum ganzen Geld.', price % 100 > 0 ? 'Rechne zuerst bis zum nächsten vollen Euro.' : have % 100 > 0 ? 'Rechne erst die vollen Euro, dann die Cent.' : 'Hier sind es nur volle Euro.'],
    steps: upSteps(price, have),
    bugs: numberBugs(
      [
        { id: 'addiert', match: (have + price) / 100, hint: 'Du gibst Geld ab. Es bleibt weniger als vorher.' },
        { id: 'ein-preis', match: price / 100, hint: 'Das ist der Preis. Gefragt ist das Geld danach.' },
        price % 100 > have % 100 && { id: 'rueckgeld-cent', match: (Math.floor(have / 100) - Math.floor(price / 100)) + (price % 100 - have % 100) / 100, hint: `Rechne von ${fmtMoney(price)} erst bis ${fmtMoney(nextEuro(price))}, dann weiter.` },
      ],
      value,
    ),
    praise: 'Du hast vom Preis bis zum ganzen Geld gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
};

const rueckgeld: Form = (rng, stufe, ab) => {
  const who = pickPerson(rng);
  const paid = stufe === 1 ? 2000 : rng.pick([2000, 5000]);
  const pool = WAREN.filter((w) => w.high * 100 < paid);
  const w = rng.pick(pool);
  const scale = paid === 5000 && canDouble(w) ? 2 : 1;
  const ct = stufe === 1 ? rng.int(1, 9) * 10 : rng.int(1, 19) * 5;
  const price = rng.int(w.low, w.high) * scale * 100 + ct;
  const change = paid - price;
  const value = change / 100;
  const context = `${who.name} kauft ${w.acc} für ${fmtMoney(price)}. ${who.name} bezahlt mit ${fmtMoney(paid)}.`;
  const prompt = `Wie viel Rückgeld bekommt ${who.name}?`;
  return {
    key: `rueckgeld:${price}:${paid}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: [paid] },
    answer: { kind: 'number', value, decimals: 2, before: `${who.name} bekommt`, after: '€ zurück.', label: 'Rückgeld in Euro' },
    hints: [`Rechne vom Preis erst bis zum nächsten vollen Euro.`, `Rechne dann weiter bis zum Schein.`],
    steps: upSteps(price, paid),
    bugs: numberBugs(changeBugs(price, paid), value),
    praise: 'Du hast vom Preis in Schritten bis zum Schein gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
};

interface ThreeItems {
  who: string;
  prices: [number, number, number];
  total: number;
  /** The purchase as sentences, without what follows. */
  context: string;
  key: string;
}

function threeItems(rng: Rng, stufe: Stufe): ThreeItems {
  const who = pickPerson(rng).name;
  const [a, b, c] = rng.sample(SMALL, 3);
  const prices: [number, number, number] = [priceOf(rng, a, stufe, 3), priceOf(rng, b, stufe, 3), priceOf(rng, c, stufe, 3)];
  return {
    who,
    prices,
    total: prices[0] + prices[1] + prices[2],
    context: `${who} kauft ${a.acc} für ${fmtMoney(prices[0])} und ${b.acc} für ${fmtMoney(prices[1])}. ${who} kauft auch ${c.acc} für ${fmtMoney(prices[2])}.`,
    key: `${prices[0]}:${prices[1]}:${prices[2]}`,
  };
}

const dreiPreise: Form = (rng, stufe, ab) => {
  const t = threeItems(rng, stufe);
  const value = t.total / 100;
  const euro = t.prices.reduce((s, p) => s + Math.floor(p / 100), 0);
  const ct = t.prices.reduce((s, p) => s + p % 100, 0);
  const prompt = 'Wie viel kostet alles zusammen?';
  return {
    key: `drei:${t.key}`,
    ab,
    context: t.context,
    prompt,
    answer: { kind: 'number', value, decimals: 2, before: 'Alles zusammen kostet', after: '€.', label: 'Preis in Euro' },
    hints: ['Rechne alle 3 Preise zusammen.', 'Rechne erst die Euro, dann die Cent. 100 ct sind 1 €.'],
    steps: sumSteps(t.prices),
    bugs: numberBugs(
      [
        ...t.prices.map((p) => ({ id: 'preis-vergessen', match: (t.total - p) / 100, hint: 'Hier sind es 3 Preise. Rechne alle 3 zusammen.' })),
        ct >= 100 && { id: 'komma-cent-summe', match: euro + (ct % 100) / 100, hint: `Die Cent ergeben ${qty(ct, 'ct')}. 100 ct sind 1 €.` },
        ct > 0 && { id: 'cent-vergessen', match: euro, hint: 'Rechne auch die Cent zusammen.' },
      ],
      value,
    ),
    praise: 'Du hast mit allen 3 Preisen gerechnet.',
    srText: sr(t.context, prompt),
    kmk: KMK,
  };
};

const reichtDasGeld: Form = (rng, stufe, ab) => {
  const t = threeItems(rng, stufe);
  const exact = t.total % 100 === 0;
  const have = rng.chance(0.5) ? Math.ceil(t.total / 100) * 100 : Math.floor(t.total / 100) * 100 - (exact ? 100 : 0);
  const enough = have >= t.total;
  const context = `${t.context} ${t.who} hat ${fmtMoney(have)}.`;
  const prompt = 'Reicht das Geld?';
  const why = `Rechne alle 3 Preise zusammen. Vergleiche dann mit ${fmtMoney(have)}.`;
  const yes: ChoiceOption = { label: 'Ja, das Geld reicht.' };
  const no: ChoiceOption = { label: 'Nein, es fehlt Geld.' };
  return {
    key: `reicht:${t.key}:${have}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: moneyPieces(have) },
    answer: makeChoice(rng, enough ? yes : no, [{ ...(enough ? no : yes), whyWrong: why }]),
    hints: ['Rechne zuerst alle 3 Preise zusammen.', `Vergleiche den Preis mit ${fmtMoney(have)}.`],
    steps: [...sumSteps(t.prices), `${fmtMoney(t.total)} ist ${have === t.total ? 'genau das Geld' : `${enough ? 'weniger' : 'mehr'} als ${fmtMoney(have)}`}: ${enough ? 'Das Geld reicht.' : 'Es fehlt Geld.'}`],
    praise: 'Du hast erst alle Preise gerechnet und dann verglichen.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

/** Smaller notes and coins for one piece, the same value. */
const SPLIT: Readonly<Record<number, number[]>> = {
  5000: [2000, 2000, 1000],
  2000: [1000, 1000],
  1000: [500, 500],
  500: [200, 200, 100],
  200: [100, 100],
  100: [50, 50],
  50: [20, 20, 10],
  20: [10, 10],
  10: [5, 5],
};
const LOWER: Readonly<Record<number, number>> = { 5000: 2000, 2000: 1000, 1000: 500, 500: 200, 200: 100, 100: 50, 50: 20, 20: 10, 10: 5, 5: 2 };

const piecesLabel = (items: readonly number[]) => items.map(pieceText).join(' + ');

function splitAt(items: readonly number[], index: number): number[] {
  return [...items.slice(0, index), ...SPLIT[items[index]], ...items.slice(index + 1)].sort((a, b) => b - a);
}

const stueckelung: Form = (rng, stufe, ab) => {
  let money = 0;
  do {
    money = stufe === 1 ? rng.int(6, 60) * 100 : rng.int(6, 60) * 100 + rng.int(1, 19) * 5;
  } while (moneyPieces(money).length < 2);
  const best = moneyPieces(money);
  const splittable = best.map((p, i) => (SPLIT[p] ? i : -1)).filter((i) => i >= 0);
  const more = { whyWrong: 'Das passt auch. Es geht aber mit weniger Scheinen und Münzen.' };
  const wrongTotal = best.map((p, i) => (i === best.length - 1 ? LOWER[p] ?? p : p));
  const option = (items: number[]): ChoiceOption => ({ label: piecesLabel(items), visual: { type: 'money', items } });
  const prompt = `Du bezahlst ${fmtMoney(money)} genau. Wo sind es die wenigsten Scheine und Münzen?`;
  return {
    key: `stueckelung:${money}`,
    ab,
    prompt,
    answer: makeChoice(
      rng,
      option(best),
      [
        { ...option(splitAt(best, splittable[0])), ...more },
        { ...option(splitAt(best, splittable[splittable.length - 1])), ...more },
        { ...option(wrongTotal), whyWrong: `Das sind nicht ${fmtMoney(money)}. Rechne das Geld zusammen.` },
      ],
      { layout: 'grid', max: 4 },
    ),
    hints: ['Nimm zuerst den größten passenden Schein.', 'Nimm dann für den Rest wieder das größte passende Stück.'],
    steps: ['Nimm immer das größte passende Stück.', `${piecesLabel(best)} = ${fmtMoney(money)}`],
    praise: 'Du hast immer das größte passende Stück genommen.',
    srText: sr(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

export const einkaufenSkill: SkillDef = {
  ...SKILL,
  title: 'Einkaufen und Rückgeld',
  description: 'Du rechnest Preise zusammen und findest das Rückgeld.',
  stufen: { 1: '2 Preise mit ganzen Euro und 50 ct', 2: 'Preise mit Komma und Rückgeld', 3: '3 Preise, reicht das Geld, wenige Scheine' },
  kmk: KMK,
  generate: generator(SKILL, {
    1: [zusammen, unterschied, uebrig],
    2: [rueckgeld, rueckgeld, zusammen, unterschied],
    3: [dreiPreise, reichtDasGeld, stueckelung],
  }),
};

