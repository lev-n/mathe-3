/**
 * Fahrplan und Preisliste (docs/research.md §6).
 * Stufe 1: read a departure or a price, 3 rows. Stufe 2: which bus arrives first; a total from the Preisliste.
 * Stufe 3: travel time from two times, within 60 minutes.
 */
import { fmtMinutes, fmtMoney, fmtTime } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { bugList, build, makeChoice, pickPerson, targetAb } from '../shared';
import { countOf, distinctValues, say, sum } from './helpers';

const SKILL = { id: 'daten.fahrplan', topicId: 'daten' } as const;
const KMK_PLAN = ['DZ.daten', 'GM.zeit'];
const KMK_PREIS = ['DZ.daten', 'GM.geld'];

// ─── Fahrplan ────────────────────────────────────────────────────────────────

const ROUTES = ['Von der Schule zum Zoo', 'Vom Bahnhof zur Bücherei', 'Von der Schule zum Schwimmbad', 'Vom Markt zum Park', 'Vom Rathaus zum Bahnhof'];
const BUSES = ['Bus A', 'Bus B', 'Bus C'];

interface Trip {
  bus: string;
  /** Minutes since midnight. */
  dep: number;
  arr: number;
}

const clock = (t: number) => fmtTime(Math.floor(t / 60), t % 60);
const cell = (t: number) => fmtMinutes(t);

function planTable(route: string, trips: readonly Trip[]): VisualOf<'table'> {
  return { type: 'table', caption: route, header: ['Bus', 'Abfahrt', 'Ankunft'], rows: trips.map((t) => [t.bus, cell(t.dep), cell(t.arr)]) };
}

/** Three buses in the order of their departures, in five-minute steps. */
function trips(rng: Rng, hour = rng.int(7, 16), minDur = 15, maxDur = 50): Trip[] {
  const deps = distinctValues(rng, 3, 0, 55, 5).sort((a, b) => a - b);
  return deps.map((d, i) => {
    const dep = hour * 60 + d;
    return { bus: BUSES[i], dep, arr: dep + rng.int(minDur / 5, maxDur / 5) * 5 };
  });
}

const planKey = (form: string, route: string, ts: readonly Trip[], ...more: (string | number)[]) =>
  [form, ROUTES.indexOf(route), ts.map((t) => `${t.bus}${t.dep}-${t.arr}`).join('_'), ...more].join(':');

/** Stufe 1: read a departure or an arrival. The other time of this bus is the tempting option. */
function readTime(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const route = rng.pick(ROUTES);
  const ts = trips(rng);
  const t = rng.pick(ts);
  const wantsDep = ab === 1 || rng.chance(0.5);
  const value = wantsDep ? t.dep : t.arr;
  const column = wantsDep ? 'Abfahrt' : 'Ankunft';
  const prompt = wantsDep ? `Wann fährt ${t.bus} ab?` : `Wann kommt ${t.bus} an?`;
  const others = ts.filter((x) => x !== t);
  return build(SKILL, stufe, {
    key: planKey('zeit', route, ts, t.bus, column),
    ab,
    prompt,
    visual: planTable(route, ts),
    answer: makeChoice(rng, { label: clock(value) }, [
      { label: clock(wantsDep ? t.arr : t.dep), whyWrong: `Das ist die andere Spalte. Schau in die Spalte ${column}.` },
      ...others.map((x) => ({ label: clock(wantsDep ? x.dep : x.arr), whyWrong: `Das ist die Zeile von ${x.bus}. Such ${t.bus}.` })),
    ]),
    hints: [`Such die Zeile von ${t.bus}.`, `Geh in dieser Zeile zur Spalte ${column}.`],
    steps: [`Such die Zeile von ${t.bus}.`, `In der Spalte ${column} steht ${clock(value)}.`],
    praise: 'Du hast Zeile und Spalte zusammen gelesen.',
    srText: say(prompt),
    kmk: KMK_PLAN,
  });
}

/** Stufe 1: from a time to the bus. */
function findBus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const route = rng.pick(ROUTES);
  const ts = trips(rng);
  const t = rng.pick(ts);
  const prompt = `Welcher Bus fährt um ${clock(t.dep)} ab?`;
  return build(SKILL, stufe, {
    key: planKey('bus', route, ts, t.bus),
    ab,
    prompt,
    visual: planTable(route, ts),
    answer: makeChoice(rng, { label: t.bus }, ts.filter((x) => x !== t).map((x) => ({ label: x.bus, whyWrong: `${x.bus} fährt um ${clock(x.dep)} ab.` }))),
    hints: ['Such die Uhrzeit in der Spalte Abfahrt.', 'Schau dann in dieser Zeile ganz nach links.'],
    steps: [`In der Spalte Abfahrt steht ${clock(t.dep)} bei ${t.bus}.`],
    praise: 'Du hast die Uhrzeit in der richtigen Spalte gesucht.',
    srText: say(prompt),
    kmk: KMK_PLAN,
  });
}

/** Stufe 1, harder item: the clock shows the time, the options are the timetable. */
function nextBus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const hour = rng.int(7, 16);
  const now = hour * 60 + rng.pick([20, 25, 30, 35]);
  const earlier = now - rng.pick([5, 10, 15]);
  const next = now + rng.pick([5, 10]);
  const later = next + rng.pick([10, 15]);
  const context = 'Die Uhr zeigt die Zeit jetzt.';
  const prompt = 'Welcher Bus fährt als Nächstes?';
  const [busEarlier, busNext, busLater] = rng.shuffle(BUSES);
  const visual: Visual = { type: 'clock', hours: hour, minutes: now % 60, showDigital: true };
  return build(SKILL, stufe, {
    key: ['uhr', now, earlier, next, later, busNext].join(':'),
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: `${busNext} um ${clock(next)}` }, [
      { label: `${busEarlier} um ${clock(earlier)}`, whyWrong: 'Dieser Bus ist schon weg. Schau auf die Uhr.' },
      { label: `${busLater} um ${clock(later)}`, whyWrong: 'Dieser Bus fährt später. Ein anderer Bus fährt vorher.' },
    ]),
    hints: ['Lies zuerst die Uhr ab.', 'Welche Abfahrt kommt nach dieser Uhrzeit zuerst?'],
    steps: [`Die Uhr zeigt ${clock(now)}.`, `${busEarlier} ist schon weg.`, `${busNext} fährt um ${clock(next)} als Nächstes.`],
    praise: 'Du hast die Uhrzeit mit den Abfahrten verglichen.',
    srText: say(context, prompt),
    kmk: KMK_PLAN,
  });
}

/** Stufe 2: which bus arrives first. With trap, the first departure is not the first arrival. */
function firstArrival(rng: Rng, stufe: Stufe, ab: Ab, trap: boolean): Exercise {
  const route = rng.pick(ROUTES);
  const hour = rng.int(7, 16);
  const start = hour * 60 + rng.pick([0, 5, 10, 15]);
  const gap1 = rng.pick([5, 10]);
  const gap2 = rng.pick([5, 10]);
  const deps = [start, start + gap1, start + gap1 + gap2];
  // Without the trap the durations do not change the order. With it the second bus overtakes.
  const durs = trap ? [gap1 + rng.pick([25, 30]), rng.pick([10, 15]), rng.pick([30, 35])] : [20, 25, 30].map((d) => d + rng.pick([0, 5]));
  // The names change places, so that no bus letter means "arrives first".
  const names = rng.shuffle(BUSES);
  const ts: Trip[] = deps.map((dep, i) => ({ bus: names[i], dep, arr: dep + durs[i] }));
  const winner = ts.reduce((a, b) => (b.arr < a.arr ? b : a));
  const prompt = 'Welcher Bus kommt zuerst an?';
  return build(SKILL, stufe, {
    key: planKey(trap ? 'ankunft-trick' : 'ankunft', route, ts),
    ab,
    prompt,
    visual: planTable(route, ts),
    answer: makeChoice(rng, { label: winner.bus }, ts.filter((t) => t !== winner).map((t) => ({
      label: t.bus,
      whyWrong: t.dep === start && trap ? 'Dieser Bus fährt zuerst ab. Gefragt ist die Ankunft.' : `${t.bus} kommt erst um ${clock(t.arr)} an.`,
    }))),
    hints: ['Schau nur in die Spalte Ankunft.', 'Welche Uhrzeit ist am frühesten?'],
    steps: [`Ankunft: ${ts.map((t) => `${t.bus} ${cell(t.arr)}`).join(', ')}.`, `Die früheste Zeit ist ${clock(winner.arr)}.`, `${winner.bus} kommt zuerst an.`],
    praise: 'Du hast in der Spalte Ankunft verglichen.',
    srText: say(prompt),
    kmk: KMK_PLAN,
  });
}

// ─── Fahrzeit ────────────────────────────────────────────────────────────────

/** Empty Rechenstrich with clock times: to the full hour and on. */
function spanLine(dep: number, arr: number): Visual {
  const full = Math.ceil(dep / 60) * 60;
  const crosses = full > dep && full < arr;
  return {
    type: 'numberLine', time: true, min: dep, max: arr, majorStep: arr - dep, minorStep: arr - dep, labelMajor: false,
    labels: crosses ? [dep, full, arr] : [dep, arr],
    jumps: crosses ? [{ from: dep, to: full, label: `+ ${full - dep}` }, { from: full, to: arr, label: `+ ${arr - full}` }] : [{ from: dep, to: arr, label: `+ ${arr - dep}` }],
  };
}

function travelSteps(dep: number, arr: number): (string | { text: string; visual: Visual })[] {
  const full = Math.ceil(dep / 60) * 60;
  const d = arr - dep;
  if (full > dep && full < arr) {
    return [
      { text: `Von ${clock(dep)} bis ${clock(full)} sind es ${full - dep} Minuten.`, visual: spanLine(dep, arr) },
      `Von ${clock(full)} bis ${clock(arr)} ${arr - full === 1 ? 'ist es' : 'sind es'} ${countOf(arr - full, 'Minute', 'Minuten')}.`,
      `${full - dep} + ${arr - full} = ${d}`,
      `Die Fahrt dauert ${d} Minuten.`,
    ];
  }
  return [{ text: `Von ${clock(dep)} bis ${clock(arr)} rechnest du ${arr % 60 || 60} − ${dep % 60}.`, visual: spanLine(dep, arr) }, `${arr % 60 || 60} − ${dep % 60} = ${d}`, `Die Fahrt dauert ${d} Minuten.`];
}

/** The number a child gets by subtracting the times like decimals: 9.10 − 8.45 gives 65. */
const asHundreds = (t: number) => Math.floor(t / 60) * 100 + (t % 60);

/** A travel time in a table of 3 buses. form: within one hour, over the full hour, or over the full hour with single minutes. */
function travelTime(rng: Rng, stufe: Stufe, ab: Ab, form: 'stunde' | 'uebergang' | 'genau'): Exercise {
  const route = rng.pick(ROUTES);
  const hour = rng.int(7, 16);
  let dep: number;
  let arr: number;
  if (form === 'stunde') {
    const m = rng.pick([0, 5, 10, 15, 20]);
    dep = hour * 60 + m;
    arr = dep + rng.int(3, 7) * 5;
  } else if (form === 'uebergang') {
    const m = rng.pick([30, 35, 40, 45, 50, 55]);
    dep = hour * 60 + m;
    const toFull = 60 - m;
    arr = hour * 60 + 60 + rng.int(1, (60 - toFull) / 5) * 5;
  } else {
    const m = rng.int(31, 58);
    dep = hour * 60 + m;
    arr = hour * 60 + 60 + rng.int(1, m - 1);
  }
  // The other two buses of this hour; the table stays in the order of the departures.
  const others = trips(rng, hour).slice(0, 2).map(({ dep: x, arr: y }) => ({ dep: x, arr: y }));
  const ts: Trip[] = [...others, { dep, arr }].sort((a, b) => a.dep - b.dep).map((x, i) => ({ bus: BUSES[i], ...x }));
  const t = ts.find((x) => x.dep === dep && x.arr === arr)!;
  const d = arr - dep;
  const prompt = `Wie lange fährt ${t.bus}?`;
  const crosses = Math.floor(dep / 60) !== Math.floor(arr / 60);
  return build(SKILL, stufe, {
    key: planKey(form, route, ts, t.bus),
    ab,
    prompt,
    visual: planTable(route, ts),
    answer: { kind: 'number', value: d, before: 'Die Fahrt dauert', after: 'Minuten.', label: 'Fahrzeit in Minuten' },
    hints: crosses ? ['Rechne erst bis zur vollen Stunde.', 'Rechne dann die Minuten bis zur Ankunft dazu.'] : [`Such die Zeile von ${t.bus}.`, 'Rechne von der Abfahrt bis zur Ankunft.'],
    steps: travelSteps(dep, arr),
    bugs: bugList(d, [
      ['fahrplan-spanne', asHundreds(arr) - asHundreds(dep), 'Eine Stunde hat nicht 100 Minuten. Rechne erst bis zur vollen Stunde.'],
      ['nur-minuten', Math.abs(arr % 60 - dep % 60) || null, 'Die Stunde wechselt hier. Rechne erst bis zur vollen Stunde, dann weiter.'],
      ['nur-ankunft', arr % 60 || null, 'Das sind nur die Minuten der Ankunft. Fang bei der Abfahrt an.'],
    ]),
    praise: crosses ? 'Du hast erst bis zur vollen Stunde gerechnet.' : 'Du hast von der Abfahrt bis zur Ankunft gerechnet.',
    srText: say(prompt),
    kmk: KMK_PLAN,
  });
}

/**
 * Stufe 3, harder item: which of 3 trips over the full hour is the shortest. A bus leaves at 35 minutes past the hour or
 * later and drives at least 30 minutes, so every trip passes the full hour and the hint fits every bus.
 */
function shortestTrip(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const route = rng.pick(ROUTES);
  const hour = rng.int(7, 16);
  const deps = distinctValues(rng, 3, 35, 50, 5).sort((a, b) => a - b);
  const durs = rng.sample([30, 35, 40, 45, 50], 3);
  const ts: Trip[] = BUSES.map((bus, i) => {
    const dep = hour * 60 + deps[i];
    return { bus, dep, arr: dep + durs[i] };
  });
  const winner = ts.reduce((a, b) => (b.arr - b.dep < a.arr - a.dep ? b : a));
  const prompt = 'Welcher Bus fährt am kürzesten?';
  return build(SKILL, stufe, {
    key: planKey('kuerzeste', route, ts),
    ab,
    prompt,
    visual: planTable(route, ts),
    answer: makeChoice(rng, { label: winner.bus }, ts.filter((t) => t !== winner).map((t) => ({ label: t.bus, whyWrong: `${t.bus} fährt ${t.arr - t.dep} Minuten. Rechne auch die anderen Fahrzeiten aus.` }))),
    hints: ['Rechne für jeden Bus die Fahrzeit aus.', 'Rechne erst bis zur vollen Stunde, dann weiter.'],
    steps: [...ts.map((t) => `${t.bus}: von ${cell(t.dep)} bis ${cell(t.arr)} sind es ${t.arr - t.dep} Minuten.`), `${winner.bus} fährt am kürzesten.`],
    praise: 'Du hast jede Fahrzeit ausgerechnet.',
    srText: say(prompt),
    kmk: KMK_PLAN,
  });
}

// ─── Preisliste ──────────────────────────────────────────────────────────────

interface Ware {
  label: string;
  nom: string;
  acc: string;
  pl: string;
  /** A price that fits this ware, in Cent. */
  lo: number;
  hi: number;
}

export const WAREN: readonly Ware[] = [
  { label: 'Brötchen', nom: 'ein Brötchen', acc: 'ein Brötchen', pl: 'Brötchen', lo: 40, hi: 80 },
  { label: 'Apfel', nom: 'ein Apfel', acc: 'einen Apfel', pl: 'Äpfel', lo: 30, hi: 70 },
  { label: 'Saft', nom: 'ein Saft', acc: 'einen Saft', pl: 'Säfte', lo: 100, hi: 200 },
  { label: 'Brezel', nom: 'eine Brezel', acc: 'eine Brezel', pl: 'Brezeln', lo: 60, hi: 120 },
  { label: 'Banane', nom: 'eine Banane', acc: 'eine Banane', pl: 'Bananen', lo: 30, hi: 70 },
  { label: 'Joghurt', nom: 'ein Joghurt', acc: 'einen Joghurt', pl: 'Joghurts', lo: 60, hi: 120 },
  { label: 'Muffin', nom: 'ein Muffin', acc: 'einen Muffin', pl: 'Muffins', lo: 120, hi: 220 },
];

interface Liste {
  waren: Ware[];
  /** Prices in Cent. */
  prices: number[];
  visual: VisualOf<'table'>;
}

function priceList(rng: Rng, n: number, step: number): Liste {
  const waren = rng.sample(WAREN, n);
  // Every ware keeps to its own range, and no two wares of a list cost the same.
  const prices = waren.reduce<number[]>((taken, w) => {
    const pool = Array.from({ length: Math.floor((w.hi - w.lo) / step) + 1 }, (_, i) => w.lo + i * step);
    return [...taken, rng.pick(pool.filter((p) => !taken.includes(p)))];
  }, []);
  return { waren, prices, visual: { type: 'table', caption: 'Preisliste', header: ['Ware', 'Preis'], rows: waren.map((w, i) => [w.label, fmtMoney(prices[i])]) } };
}

const priceKey = (form: string, l: Liste, ...more: (string | number)[]) => [form, l.waren.map((w) => w.label).join('-'), l.prices.join('-'), ...more].join(':');

function readPrice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const l = priceList(rng, 3, 10);
  const i = rng.int(0, 2);
  const prompt = `Was kostet ${l.waren[i].nom}?`;
  const value = l.prices[i] / 100;
  return build(SKILL, stufe, {
    key: priceKey('preis', l, i),
    ab,
    prompt,
    visual: l.visual,
    answer: { kind: 'number', value, unit: '€', decimals: 2, label: 'Preis in Euro' },
    hints: [`Such die Zeile ${l.waren[i].label}.`, 'Geh in dieser Zeile nach rechts zum Preis.'],
    steps: [`Such die Zeile ${l.waren[i].label}.`, `Dort steht ${fmtMoney(l.prices[i])}.`],
    bugs: bugList(value, [['andere-zeile', l.prices[(i + 1) % 3] / 100, `Das ist eine andere Zeile. Such ${l.waren[i].label}.`]]),
    praise: 'Du hast den Preis in der richtigen Zeile gefunden.',
    srText: say(prompt),
    kmk: KMK_PREIS,
  });
}

function findWare(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const l = priceList(rng, 3, 10);
  const i = rng.int(0, 2);
  const prompt = `Welche Ware kostet ${fmtMoney(l.prices[i])}?`;
  return build(SKILL, stufe, {
    key: priceKey('ware', l, i),
    ab,
    prompt,
    visual: l.visual,
    answer: makeChoice(rng, { label: l.waren[i].label }, l.waren.flatMap((w, k) => (k === i ? [] : [{ label: w.label, whyWrong: `${w.label} kostet ${fmtMoney(l.prices[k])}.` }]))),
    hints: ['Such den Preis in der Spalte Preis.', 'Schau dann in dieser Zeile nach links.'],
    steps: [`In der Zeile ${l.waren[i].label} steht ${fmtMoney(l.prices[i])}.`],
    praise: 'Du hast den Preis in der Liste gefunden.',
    srText: say(prompt),
    kmk: KMK_PREIS,
  });
}

/** 2,50 € + 1,80 €: the cents make a new Euro, and it gets lost. */
function carryBug(a: number, b: number): [string, number | null, string] {
  const cents = a % 100 + b % 100;
  if (cents < 100) return ['cent-uebertrag', null, ''];
  const rest = cents - 100;
  return ['cent-uebertrag', (a + b - 100) / 100, `${a % 100} ct und ${b % 100} ct sind ${cents} ct. Das ist 1 € ${rest} ct.`];
}

/** Stufe 2: two wares, or on the harder item 2 pieces of one ware and another ware. */
function totalPrice(rng: Rng, stufe: Stufe, ab: Ab, twice: boolean): Exercise {
  const l = priceList(rng, rng.int(3, 4), 5);
  const [p, q] = rng.sample(l.waren.map((_, i) => i), 2);
  const name = pickPerson(rng).name;
  const a = l.prices[p];
  const b = l.prices[q];
  const total = (twice ? 2 * a : a) + b;
  const context = twice ? `${name} kauft 2 ${l.waren[p].pl} und ${l.waren[q].acc}.` : `${name} kauft ${l.waren[p].acc} und ${l.waren[q].acc}.`;
  const prompt = 'Was kostet das zusammen?';
  const value = total / 100;
  return build(SKILL, stufe, {
    key: priceKey(twice ? 'doppelt' : 'zwei', l, p, q),
    ab,
    context,
    prompt,
    visual: l.visual,
    answer: { kind: 'number', value, unit: '€', decimals: 2, label: 'Preis in Euro' },
    hints: ['Such die Preise in der Liste.', twice ? 'Rechne zuerst den Preis für die 2 gleichen Waren.' : 'Rechne erst die Euro, dann die Cent.'],
    steps: twice
      ? [`2 ${l.waren[p].pl}: ${fmtMoney(a)} + ${fmtMoney(a)} = ${fmtMoney(2 * a)}`, `${fmtMoney(2 * a)} + ${fmtMoney(b)} = ${fmtMoney(total)}`, `Das kostet ${fmtMoney(total)}.`]
      : [`${l.waren[p].label}: ${fmtMoney(a)}`, `${l.waren[q].label}: ${fmtMoney(b)}`, `${fmtMoney(a)} + ${fmtMoney(b)} = ${fmtMoney(total)}`],
    bugs: bugList(value, [
      ['nur-ein-preis', a / 100, 'Das ist nur ein Preis. Rechne alles zusammen.'],
      ...(twice ? [['menge-vergessen', (a + b) / 100, 'Schau auf die Menge. Von einer Ware sind es 2 Stück.'] as [string, number, string]] : []),
      ['alle-preise', sum(l.prices) / 100, 'Du brauchst nur die Waren aus der Geschichte.'],
      twice ? ['cent-uebertrag', null, ''] : carryBug(a, b),
    ]),
    praise: twice ? 'Du hast an die Menge gedacht.' : 'Du hast die passenden Preise plus gerechnet.',
    srText: say(context, prompt),
    kmk: KMK_PREIS,
  });
}

export const fahrplanSkill: SkillDef = {
  ...SKILL,
  title: 'Fahrplan und Preisliste',
  description: 'Du findest Zeiten und Preise und rechnest damit.',
  stufen: { 1: 'Abfahrt oder Preis ablesen', 2: 'Welcher Bus kommt zuerst? Preise plus rechnen', 3: 'Fahrzeit aus 2 Uhrzeiten ausrechnen' },
  kmk: ['DZ.daten', 'GM.zeit', 'GM.geld'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return rng.chance(0.5) ? readTime(rng, stufe, ab) : readPrice(rng, stufe, ab);
      if (ab === 2) return rng.pick([readTime, findBus, findWare])(rng, stufe, ab);
      return nextBus(rng, stufe, ab);
    }
    if (stufe === 2) {
      if (ab === 1) return firstArrival(rng, stufe, ab, false);
      if (ab === 2) return totalPrice(rng, stufe, ab, false);
      return rng.chance(0.5) ? firstArrival(rng, stufe, ab, true) : totalPrice(rng, stufe, ab, true);
    }
    if (ab === 1) return travelTime(rng, stufe, ab, 'stunde');
    if (ab === 2) return travelTime(rng, stufe, ab, 'uebergang');
    return rng.chance(0.7) ? travelTime(rng, stufe, ab, 'genau') : shortestTrip(rng, stufe, ab);
  },
};
