/**
 * Geschichten mit Größen (docs/research.md §6).
 * AB I: Euro, km and cm in whole numbers, one step.
 * AB II: comma prices and Rückgeld, kg and g, one step.
 * AB III: time spans and mixed units, two steps.
 * Numbers and results stay up to 1000 (§2.4, §6). Only a conversion may pass it (1 kg 300 g = 1300 g), and the result comes back below it.
 */
import { MINUS, NBSP, TIMES, fmtMixed, fmtMoney, fmtMoneyMixed, fmtQty, fmtTime } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, numberBugs, pickPerson, targetAb } from '../shared';
import { HEFT_EURO, HINT, WANDERTAG_KM, answerStep, euro, moneyItems, priceText, rueckgeldBugs, sentenceAnswer, spoken } from './helpers';

const SKILL = { id: 'sachaufgaben.mit-groessen', topicId: 'sachaufgaben' } as const;
const KMK = ['GM.sachsituationen', 'PK.modellieren'];

const km = (n: number) => fmtQty(n, 'km');
const cm = (n: number) => fmtQty(n, 'cm');
const gram = (n: number) => fmtQty(n, 'g');
const grams = (n: number) => fmtMixed(n, 1000, 'kg', 'g');

/** Rounded up to the next ruler end, at least 10 cm. */
const rulerEnd = (lengthCm: number) => Math.min(30, Math.max(10, Math.ceil(lengthCm / 5) * 5));

/** What all whole-number stories have in common. The other Rechnung is a `signalwort` unless the story names a closer slip. */
function wholeStory(
  stufe: Stufe,
  ab: Ab,
  o: { key: string; context: string; prompt: string; before: string; after: string; value: number; calc: string; visual?: Visual; wrongOp: number; wrongId?: string; wrongHint?: string; hints: string[]; praise: string },
): Exercise {
  return build(SKILL, stufe, {
    key: o.key,
    ab,
    context: o.context,
    prompt: o.prompt,
    ...(o.visual ? { visual: o.visual } : {}),
    answer: sentenceAnswer(o.value, o.before, o.after, o.prompt),
    hints: o.hints,
    steps: [`Rechnung: ${o.calc}`, answerStep(o.before, String(o.value), o.after)],
    bugs: numberBugs([{ id: o.wrongId ?? 'signalwort', match: o.wrongOp, hint: o.wrongHint ?? HINT.signalwort }], o.value),
    praise: o.praise,
    srText: spoken(o.context, o.prompt),
    kmk: KMK,
  });
}

/** Two things to buy with realistic prices; larger numbers on a higher Stufe come with dearer things, not with a dearer book. */
const SHOPPING: Readonly<Record<Stufe, { one: string; two: string; a: readonly [number, number]; b: readonly [number, number] }>> = {
  1: { one: 'Ein Buch', two: 'Ein Spiel', a: [5, 20], b: [5, 20] },
  2: { one: 'Ein Buch', two: 'Ein Spiel', a: [5, 25], b: [10, 40] },
  3: { one: 'Ein Fahrrad', two: 'Ein Helm', a: [90, 250], b: [15, 40] },
};

function ganzeZahlen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const form = rng.pick(['euro-plus', 'euro-minus', 'euro-mal', 'km-plus', 'km-minus', 'band'] as const);
  switch (form) {
    case 'euro-plus': {
      const shop = SHOPPING[stufe];
      const [a, b] = [rng.int(shop.a[0], shop.a[1]), rng.int(shop.b[0], shop.b[1])];
      return wholeStory(stufe, ab, {
        key: `${form}:${a}:${b}`, context: `${shop.one} kostet ${euro(a)}. ${shop.two} kostet ${euro(b)}.`, prompt: 'Wie viel Euro kostet beides zusammen?', before: 'Beides kostet', after: '€.',
        value: a + b, calc: `${euro(a)} + ${euro(b)} = ${euro(a + b)}`, wrongOp: Math.abs(a - b), wrongHint: `Beides zusammen: Kostet das mehr als ${euro(Math.max(a, b))} oder weniger?`, hints: ['Beide Preise kommen zusammen.', 'Rechne erst die Zehner, dann die Einer.'], praise: 'Du hast beide Preise beachtet.',
      });
    }
    case 'euro-minus': {
      // a child has 20 € or 50 € and buys a ball; 100 € and more belong to the class and its trip
      const trip = stufe === 3 || (stufe === 2 && rng.chance(0.5));
      const a = trip ? rng.pick(stufe === 3 ? [100, 200] : [100]) : rng.pick(stufe === 1 ? [20, 50] : [50]);
      const b = trip ? rng.int(12, a - 12) : rng.int(5, Math.min(a - 5, 30));
      return wholeStory(stufe, ab, {
        key: `${form}:${a}:${b}`, context: trip ? `Die Klasse hat ${euro(a)}. Der Ausflug kostet ${euro(b)}.` : `${name} hat ${euro(a)}. Ein Ball kostet ${euro(b)}.`, prompt: trip ? 'Wie viel Euro bleiben der Klasse nach dem Ausflug?' : `Wie viel Euro bleiben ${name} nach dem Kauf?`, before: trip ? 'Der Klasse bleiben' : `${name} bleiben`, after: '€.',
        value: a - b, calc: `${euro(a)} ${MINUS} ${euro(b)} = ${euro(a - b)}`, visual: { type: 'money', items: moneyItems(a * 100) }, wrongOp: a + b, hints: ['Das Geld wird weniger.', `Rechne von ${b} bis ${a}.`], praise: 'Du hast den Preis vom Geld abgezogen.',
      });
    }
    case 'euro-mal': {
      const [k, n] = [rng.int(HEFT_EURO[0], HEFT_EURO[1]), rng.int(2, 9)];
      return wholeStory(stufe, ab, {
        key: `${form}:${k}:${n}`, context: `Ein Heft kostet ${euro(k)}. ${name} kauft ${n} Hefte.`, prompt: `Wie viel Euro bezahlt ${name}?`, before: `${name} bezahlt`, after: '€.',
        value: n * k, calc: `${n} ${TIMES} ${euro(k)} = ${euro(n * k)}`, wrongOp: n + k, wrongId: 'rechenart-+', wrongHint: `Jedes Heft kostet ${euro(k)}. Für ${n} Hefte zählst du ${euro(k)} ${n}-mal.`, hints: ['Jedes Heft kostet gleich viel.', `Das sind ${n}-mal ${euro(k)}.`], praise: 'Du hast den gleichen Preis mehrmals genommen.',
      });
    }
    case 'km-plus': {
      // a class walks one Wandertag; the larger numbers of a higher Stufe come with a bus, not with a longer walk
      const hike = stufe === 1;
      const a = rng.int(2, hike ? WANDERTAG_KM[1] - 4 : 19);
      const b = rng.int(2, hike ? WANDERTAG_KM[1] - a : 19);
      const [Who, who, verb] = hike ? ['Die Klasse', 'die Klasse', 'wandert'] : ['Der Bus', 'der Bus', 'fährt'];
      return wholeStory(stufe, ab, {
        key: `${form}:${a}:${b}`, context: `${Who} ${verb} vormittags ${km(a)}. Nachmittags ${verb} ${who} ${km(b)}.`, prompt: `Wie viele Kilometer ${verb} ${who} insgesamt?`, before: `${Who} ${verb} insgesamt`, after: 'km.',
        value: a + b, calc: `${km(a)} + ${km(b)} = ${km(a + b)}`, wrongOp: Math.abs(a - b), hints: ['Beide Wege kommen zusammen.', 'Beide Wege stehen schon in Kilometern.'], praise: 'Du hast beide Wege beachtet.',
      });
    }
    case 'km-minus': {
      const a = rng.int(10, stufe === 1 ? 30 : 90);
      const b = rng.int(2, a - 2);
      return wholeStory(stufe, ab, {
        key: `${form}:${a}:${b}`, context: `Der Weg zum Zoo ist ${km(a)} lang. Der Bus fährt schon ${km(b)}.`, prompt: 'Wie viele Kilometer fehlen noch?', before: 'Es fehlen noch', after: 'km.',
        value: a - b, calc: `${km(a)} ${MINUS} ${km(b)} = ${km(a - b)}`, wrongOp: a + b, hints: ['Ein Teil des Weges ist schon geschafft.', 'Gesucht ist der Rest des Weges.'], praise: 'Du hast den Rest des Weges gefunden.',
      });
    }
    case 'band': {
      const a = rng.int(12, 30);
      const b = rng.int(2, a - 4);
      return wholeStory(stufe, ab, {
        key: `${form}:${a}:${b}`, context: `Ein Band ist ${cm(a)} lang. ${name} schneidet ${cm(b)} ab.`, prompt: 'Wie viele Zentimeter bleiben übrig?', before: 'Es bleiben', after: 'cm übrig.',
        value: a - b, calc: `${cm(a)} ${MINUS} ${cm(b)} = ${cm(a - b)}`, visual: { type: 'ruler', maxCm: rulerEnd(a), startMm: 0, lengthMm: a * 10 }, wrongOp: a + b, hints: ['Das Band wird kürzer.', 'Lies die Länge am Lineal ab, dann zieh ab.'], praise: 'Du hast das Abschneiden als Minus erkannt.',
      });
    }
  }
}

const cents = (euroPart: number, ct: number) => euroPart * 100 + ct;

function kommaPlus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  // the larger price from Stufe 2 belongs to a book: a Heft stays a Heft
  const x = cents(stufe === 1 ? rng.int(1, 3) : rng.int(4, 9), 10 * rng.int(1, 9));
  const y = cents(rng.int(1, 3), 10 * rng.int(1, 9));
  const total = x + y;
  const context = `${name} kauft ${stufe === 1 ? 'ein Heft' : 'ein Buch'} für ${fmtMoney(x)} und einen Stift für ${fmtMoney(y)}.`;
  const prompt = `Wie viel Euro bezahlt ${name}?`;
  const before = `${name} bezahlt`;
  const centSum = x % 100 + y % 100;
  const carries = centSum >= 100;
  return build(SKILL, stufe, {
    key: `komma-plus:${x}:${y}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(total / 100, before, '€.', prompt, { decimals: 2 }),
    hints: ['Rechne Euro und Cent getrennt: erst Euro, dann Cent.', 'Sind es 100 ct oder mehr? Dann gibt es 1 € mehr.'],
    steps: [`Euro: ${euro(Math.floor(x / 100))} + ${euro(Math.floor(y / 100))} = ${euro(Math.floor(x / 100) + Math.floor(y / 100))}`, `Cent: ${x % 100} ct + ${y % 100} ct = ${centSum} ct`, ...(carries ? [`${centSum} ct = ${fmtMoneyMixed(centSum)}`] : []), answerStep(before, priceText(total), '€.')],
    bugs: numberBugs(
      [
        carries && { id: 'komma-cent-summe', match: (total - 100) / 100, hint: `${x % 100} ct und ${y % 100} ct sind ${centSum === 100 ? 'genau' : 'mehr als'} 1 €. Der Euro kommt dazu.` },
        { id: 'unsinnig-gross', match: total, hint: HINT.unsinnig },
      ],
      total / 100,
    ),
    praise: carries ? 'Du hast aus 100 ct einen Euro gemacht.' : 'Du hast Euro und Cent getrennt gerechnet.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

function rueckgeld(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const paid = rng.pick(stufe === 1 ? [5, 10] : [10, 20]);
  const price = cents(rng.int(1, paid - 2), 10 * rng.int(1, 9));
  const value = paid * 100 - price;
  const nextEuro = Math.ceil(price / 100);
  const context = `${name} bezahlt mit ${euro(paid)}. Ein Buch kostet ${fmtMoney(price)}.`;
  const prompt = `Wie viel Euro bekommt ${name} zurück?`;
  const before = `${name} bekommt`;
  const after = '€ zurück.';
  return build(SKILL, stufe, {
    key: `rueckgeld:${paid}:${price}`,
    ab,
    context,
    prompt,
    visual: { type: 'money', items: [paid * 100] },
    answer: sentenceAnswer(value / 100, before, after, prompt, { decimals: 2 }),
    hints: [`Rechne von ${fmtMoney(price)} erst bis ${euro(nextEuro)}.`, `Dann rechne weiter bis ${euro(paid)}.`],
    steps: [`Von ${fmtMoney(price)} bis ${euro(nextEuro)} sind es ${nextEuro * 100 - price} ct.`, `Von ${euro(nextEuro)} bis ${euro(paid)} sind es ${euro(paid - nextEuro)}.`, answerStep(before, priceText(value), after)],
    bugs: numberBugs(
      [
        ...rueckgeldBugs(paid, price),
        { id: 'unsinnig-gross', match: value, hint: HINT.unsinnig },
        { id: 'signalwort', match: (paid * 100 + price) / 100, hint: 'Der Preis kommt nicht zum Schein dazu. Rechne vom Preis bis zum Schein.' },
      ],
      value / 100,
    ),
    praise: 'Du bist vom Preis bis zum Schein gegangen.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** The step of the grams on each Stufe: hundreds, then fifties. */
const gramStep = (stufe: Stufe) => (stufe === 3 ? 50 : 100);

/** One step with kg and g: from a weight with kg, up to 1 kg, or (Stufe 3) ½ kg and more. The result never lands on 1000 g: the hint '1 kg sind 1000 g' would say it. */
function gewicht(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const step = gramStep(stufe);
  const form = rng.pick<'minus' | 'fehlt' | 'plus'>(stufe === 3 ? ['minus', 'fehlt', 'plus'] : ['minus', 'fehlt']);
  // what stands above the kilogram: nothing on Stufe 1, up to 500 g on Stufe 2, up to 800 g on Stufe 3
  const small = stufe === 1 ? 0 : 100 * rng.int(1, stufe === 2 ? 5 : 8);
  const taken = small + step * rng.int(1, Math.floor((900 - small) / step));
  const drawn = step * rng.int(1, Math.floor(900 / step));
  const added = step * rng.int(1, Math.floor(450 / step));
  const [a, b] = form === 'minus' ? [1000 + small, taken] : form === 'fehlt' ? [1000, drawn] : [500, added];
  const value = form === 'plus' ? a + b : a - b;
  const half = `½${NBSP}kg`;
  const context =
    form === 'minus' ? `Ein Korb Äpfel wiegt ${grams(a)}. ${name} nimmt ${gram(b)} Äpfel heraus.`
    : form === 'fehlt' ? `Auf der Waage liegen ${gram(b)} Äpfel. ${name} möchte ${grams(a)} Äpfel.`
    : `Ein Beutel Zucker wiegt ${half}. Eine Tüte Reis wiegt ${gram(b)}.`;
  const prompt = form === 'minus' ? 'Wie viel Gramm wiegt der Korb jetzt?' : form === 'fehlt' ? 'Wie viel Gramm fehlen noch?' : 'Wie viel Gramm wiegt beides zusammen?';
  const before = form === 'minus' ? 'Der Korb wiegt jetzt' : form === 'fehlt' ? 'Es fehlen noch' : 'Beides wiegt';
  const after = 'g.';
  const sign = form === 'plus' ? '+' : MINUS;
  return build(SKILL, stufe, {
    key: `gewicht:${form}:${a}:${b}`,
    ab,
    context,
    prompt,
    ...(form === 'plus' ? {} : { visual: { type: 'scale' as const, maxGrams: 2000, stepGrams: step, grams: form === 'minus' ? a : b } }),
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Rechne zuerst alles in Gramm um.', form === 'plus' ? `${half} sind 500 g.` : '1 kg sind 1000 g.'],
    steps: [`${form === 'plus' ? half : grams(a)} = ${gram(a)}`, `Rechnung: ${gram(a)} ${sign} ${gram(b)} = ${gram(value)}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      form === 'plus'
        ? [{ id: 'signalwort', match: a - b, hint: `Beides zusammen: Wiegt das mehr als ${gram(a)} oder weniger?` }]
        : [{ id: 'einheit-gemischt', match: small > 0 && form === 'minus' ? b - small : b - 1, hint: 'Rechne zuerst alles in Gramm um.' }],
      value,
    ),
    praise: 'Du hast zuerst alles in Gramm umgerechnet.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'GM.gewicht'],
  });
}

/** Whole five minutes between two times: from..to crosses a full hour. */
function span(rng: Rng): { h: number; from: number; to: number } {
  const h = rng.int(8, 15);
  const from = 5 * rng.int(7, 11);
  const to = 5 * rng.int(1, 6);
  return { h, from, to };
}

function zeitspanne(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { h, from, to } = span(rng);
  const value = 60 - from + to;
  const t1 = fmtTime(h, from);
  const t2 = fmtTime(h + 1, to);
  const context = `Der Bus fährt um ${t1} los. Der Bus kommt um ${t2} an.`;
  const prompt = 'Wie viele Minuten dauert die Fahrt?';
  const before = 'Die Fahrt dauert';
  const after = 'min.';
  const full = fmtTime(h + 1, 0);
  return build(SKILL, stufe, {
    key: `zeit:${h}:${from}:${to}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: h, minutes: from, showDigital: true },
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [`Rechne erst bis ${full}.`, `Dann kommen noch ${to} Minuten dazu.`],
    steps: [`Von ${t1} bis ${full} sind es ${60 - from} min.`, `Von ${full} bis ${t2} sind es ${to} min.`, `${60 - from} min + ${to} min = ${value} min`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'stunde-100', match: 100 - from + to, hint: `Eine Stunde hat 60 Minuten. Rechne erst bis ${full}.` },
        { id: 'zeitpunkt-spanne', match: h + 1, hint: 'Gefragt ist: Wie lange? Nicht: Wann?' },
      ],
      value,
    ),
    praise: 'Du hast die Fahrt am vollen Stundenpunkt geteilt.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'GM.zeit'],
  });
}

function zeitZweiSchritte(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const { h, from, to } = span(rng);
  const first = 60 - from + to;
  // the sum never lands on 60: the hint 'Eine Stunde hat 60 Minuten' would say the result
  const drawn = 5 * rng.int(2, 8);
  const extra = first + drawn === 60 ? drawn + 5 : drawn;
  const value = first + extra;
  const t1 = fmtTime(h, from);
  const t2 = fmtTime(h + 1, to);
  const full = fmtTime(h + 1, 0);
  const context = `${name} liest von ${t1} bis ${t2}. Danach malt ${name} noch ${extra} min.`;
  const prompt = 'Wie viele Minuten sind das insgesamt?';
  const before = 'Das sind insgesamt';
  const after = 'min.';
  return build(SKILL, stufe, {
    key: `zeit-zwei:${h}:${from}:${to}:${extra}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: [`Rechne erst die Lesezeit: zuerst bis ${full}.`, 'Dann kommt die Zeit zum Malen dazu.'],
    steps: [`Von ${t1} bis ${full} sind es ${60 - from} min.`, `Lesen: ${60 - from} min + ${to} min = ${first} min`, `Mit Malen: ${first} min + ${extra} min = ${value} min`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: first, hint: HINT.ersterSchritt },
        { id: 'stunde-100', match: 100 - from + to + extra, hint: `Eine Stunde hat 60 Minuten. Rechne erst bis ${full}.` },
      ],
      value,
    ),
    praise: 'Du hast beide Zeiten beachtet.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'GM.zeit'],
  });
}

/** A number of a mixed story: its step and smallest multiple on each Stufe. */
const MIXED_STEP: Readonly<Record<Stufe, readonly [step: number, min: number]>> = { 1: [100, 1], 2: [50, 2], 3: [10, 11] };

/** The most a mixed story takes from the 1000 in its first step: 100 stay at least. */
const MIXED_FIRST = 900;

function wegGemischt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const [unit, min] = MIXED_STEP[stufe];
  const way = unit * rng.int(min, Math.floor(MIXED_FIRST / 2 / unit));
  const both = way * 2;
  const value = 1000 - both;
  const context = `${name} will ${km(1)} laufen. ${name} geht zur Schule und zurück. Der Schulweg ist ${fmtQty(way, 'm')} lang.`;
  const prompt = 'Wie viele Meter fehlen noch?';
  const before = 'Es fehlen noch';
  const after = 'm.';
  return build(SKILL, stufe, {
    key: `weg:${way}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Rechne zuerst alles in Meter um.', 'Zur Schule und zurück: Das ist der Weg 2-mal.'],
    steps: [`${km(1)} = ${fmtQty(1000, 'm')}`, `Hin und zurück: 2 ${TIMES} ${fmtQty(way, 'm')} = ${fmtQty(both, 'm')}`, `Es fehlen: ${fmtQty(1000, 'm')} ${MINUS} ${fmtQty(both, 'm')} = ${fmtQty(value, 'm')}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: both, hint: HINT.ersterSchritt },
        { id: 'einheit-gemischt', match: both - 1, hint: 'Rechne zuerst alles in Meter um.' },
        { id: 'alle-zahlen', match: 1000 - way, hint: 'Zur Schule und zurück: Das ist der Weg 2-mal.' },
      ],
      value,
    ),
    praise: 'Du hast alles in Meter umgerechnet und beide Wege gezählt.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'GM.laenge'],
  });
}

/** Eine Packung Mehl wiegt 1 kg: the Stützpunkt of groessen.gewicht and of §2.2, so no other weight for it. */
function einkaufGemischt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const [unit, min] = MIXED_STEP[stufe];
  const n = rng.int(2, 4);
  const portion = unit * rng.int(min, Math.floor(MIXED_FIRST / n / unit));
  const first = n * portion;
  const value = 1000 - first;
  const context = `Eine Packung Mehl wiegt ${grams(1000)}. ${name} backt ${n} Kuchen. Für jeden Kuchen nimmt ${name} ${gram(portion)} Mehl.`;
  const prompt = 'Wie viel Gramm Mehl bleiben übrig?';
  const before = 'Es bleiben';
  const after = 'g Mehl übrig.';
  return build(SKILL, stufe, {
    key: `einkauf:${portion}:${n}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, after, prompt),
    hints: ['Rechne zuerst alles in Gramm um.', `Jeder Kuchen braucht gleich viel: ${n}-mal.`],
    steps: [`${grams(1000)} = ${gram(1000)}`, `Für die Kuchen: ${n} ${TIMES} ${gram(portion)} = ${gram(first)}`, `Es bleiben: ${gram(1000)} ${MINUS} ${gram(first)} = ${gram(value)}`, answerStep(before, String(value), after)],
    bugs: numberBugs(
      [
        { id: 'nur-erster-schritt', match: first, hint: HINT.ersterSchritt },
        { id: 'einheit-gemischt', match: first - 1, hint: 'Rechne zuerst alles in Gramm um.' },
        { id: 'alle-zahlen', match: 1000 - portion, hint: `${name} backt ${n} Kuchen. Wie viel Mehl brauchen alle Kuchen?` },
      ],
      value,
    ),
    praise: 'Du hast zuerst alles in Gramm umgerechnet.',
    srText: spoken(context, prompt),
    kmk: [...KMK, 'GM.gewicht'],
  });
}

export const mitGroessenSkill: SkillDef = {
  ...SKILL,
  title: 'Geschichten mit Größen',
  description: 'Du rechnest mit Euro, Metern, Gramm oder Minuten.',
  stufen: { 1: 'Euro und Kilometer in ganzen Zahlen', 2: 'Preise mit Komma, Kilogramm und Gramm', 3: 'Zeitspannen und gemischte Einheiten, mit mehreren Schritten' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (ab === 1) return ganzeZahlen(rng, stufe, ab);
    const form = ab === 2 ? rng.pick([kommaPlus, rueckgeld, gewicht]) : rng.pick([zeitspanne, zeitZweiSchritte, wegGemischt, einkaufGemischt]);
    return form(rng, stufe, ab);
  },
};
