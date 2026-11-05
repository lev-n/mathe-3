/**
 * Sicher, möglich, unmöglich (docs/research.md §6, C10).
 * Stufe 1: bag or Würfel. Stufe 2: Glücksrad; möglich, aber nicht sicher.
 * Stufe 3: order events; "wahrscheinlich" on its own appears only here (SN, NRW). No numbers as probabilities.
 */
import type { Ab, ChoiceAnswer, ColorName, Exercise, OrderAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, joinDe, makeChoice, targetAb } from '../shared';
import { balls, COLOR_NOUN, COLOR_WORD, COLORS, fixedChoice, say } from './helpers';

const SKILL = { id: 'daten.sicher-moeglich', topicId: 'daten' } as const;
const KMK = ['DZ.zufall'];

export type Klasse = 'sicher' | 'möglich' | 'unmöglich';
const KLASSEN: readonly Klasse[] = ['sicher', 'möglich', 'unmöglich'];
/** The three words stand on the options, so the question does not have to name them (T1). */
const QUESTION = 'Welches Wort passt?';
const DRAW = 'Du ziehst ohne Hinsehen eine Kugel.';
/** DRAW one word shorter: an order task has a second sentence about the direction. */
const DRAW_SHORT = 'Zieh ohne Hinsehen eine Kugel.';

const BUG_HAEUFIG = 'Sicher heißt: Es kommt immer so. Gibt es andere Kugeln?';
const HINT_WORDS = 'Sicher heißt immer, möglich heißt manchmal, unmöglich heißt nie.';

const PRAISE: Record<Klasse, string> = {
  sicher: 'Du hast geprüft: Jedes Ergebnis passt.',
  möglich: 'Du hast erkannt: Es kann so kommen, muss aber nicht.',
  unmöglich: 'Du hast geprüft: Kein Ergebnis passt.',
};

/** Why a word does not fit, per device: none fits, all fit, some fit. */
interface Why {
  sicherStattMoeglich: string;
  unmoeglichStattMoeglich: string;
  stattSicher: string;
  stattUnmoeglich: string;
}

function classChoice(rng: Rng, truth: Klasse, why: Why): ChoiceAnswer {
  const wrong = (k: Klasse): string => {
    if (truth === 'möglich') return k === 'sicher' ? why.sicherStattMoeglich : why.unmoeglichStattMoeglich;
    return truth === 'sicher' ? why.stattSicher : why.stattUnmoeglich;
  };
  return makeChoice(rng, { label: truth }, KLASSEN.filter((k) => k !== truth).map((k) => ({ label: k, whyWrong: wrong(k) })), { order: [...KLASSEN] });
}

// ─── Bag ─────────────────────────────────────────────────────────────────────

interface BagEvent {
  balls: { color: ColorName; count: number }[];
  /** 'rot' or 'rot oder blau' */
  event: string;
  truth: Klasse;
}

function bagEvent(rng: Rng, truth: Klasse): BagEvent {
  const [a, b, c] = rng.sample(COLORS, 3);
  if (truth === 'sicher') {
    if (rng.chance(0.5)) return { balls: [{ color: a, count: rng.int(4, 9) }], event: COLOR_WORD[a], truth };
    return { balls: [{ color: a, count: rng.int(2, 6) }, { color: b, count: rng.int(2, 6) }], event: `${COLOR_WORD[a]} oder ${COLOR_WORD[b]}`, truth };
  }
  if (truth === 'unmöglich') return { balls: [{ color: a, count: rng.int(2, 7) }, { color: b, count: rng.int(2, 7) }], event: COLOR_WORD[c], truth };
  // möglich: often a large majority, because that is the tempting case for "sicher"
  return { balls: [{ color: a, count: rng.int(5, 9) }, { color: b, count: rng.int(1, 3) }], event: COLOR_WORD[rng.chance(0.75) ? a : b], truth };
}

function bagItem(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const truth = rng.pick(KLASSEN);
  const e = bagEvent(rng, truth);
  const context = `${DRAW} Die Kugel ist ${e.event}.`;
  const list = joinDe(e.balls.map((x) => balls(x.count, x.color)));
  const why: Why = {
    sicherStattMoeglich: BUG_HAEUFIG,
    unmoeglichStattMoeglich: 'Diese Farbe liegt im Säckchen. Also kann die Farbe kommen.',
    stattSicher: 'Schau ins Säckchen: Kann eine andere Kugel kommen?',
    stattUnmoeglich: 'Schau ins Säckchen: Liegt diese Farbe überhaupt darin?',
  };
  return build(SKILL, stufe, {
    key: ['beutel', truth, e.balls.map((x) => `${x.color}${x.count}`).join('-'), e.event].join(':'),
    ab,
    context,
    prompt: QUESTION,
    visual: { type: 'bag', balls: e.balls },
    answer: classChoice(rng, truth, why),
    hints: ['Schau: Welche Farben liegen im Säckchen?', HINT_WORDS],
    steps: [`Im Säckchen: ${list}.`, truth === 'sicher' ? 'Jede Kugel passt.' : truth === 'unmöglich' ? 'Keine Kugel passt.' : 'Manche Kugeln passen, manche nicht.', `Das ist ${truth}.`],
    praise: PRAISE[truth],
    srText: say(context, QUESTION),
    kmk: KMK,
  });
}

// ─── Würfel ──────────────────────────────────────────────────────────────────

const DICE_EVENTS: readonly { id: string; text: string; fits: (v: number) => boolean }[] = [
  { id: 'gerade', text: 'gerade', fits: (v) => v % 2 === 0 },
  { id: 'ungerade', text: 'ungerade', fits: (v) => v % 2 === 1 },
  ...[1, 2, 3, 4, 5, 6].map((k) => ({ id: `gleich${k}`, text: `${k}`, fits: (v: number) => v === k })),
  { id: 'sieben', text: '7', fits: () => false },
  { id: 'acht', text: '8', fits: () => false },
  { id: 'null', text: '0', fits: () => false },
  { id: 'unter7', text: 'kleiner als 7', fits: (v) => v < 7 },
  { id: 'ueber0', text: 'größer als 0', fits: (v) => v > 0 },
  { id: 'ueber6', text: 'größer als 6', fits: (v) => v > 6 },
  { id: 'unter4', text: 'kleiner als 4', fits: (v) => v < 4 },
];
const DIE = [1, 2, 3, 4, 5, 6];

export function diceClass(fits: (v: number) => boolean): Klasse {
  const n = DIE.filter(fits).length;
  return n === 0 ? 'unmöglich' : n === 6 ? 'sicher' : 'möglich';
}

function diceItem(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const truth = rng.pick(KLASSEN);
  const e = rng.pick(DICE_EVENTS.filter((x) => diceClass(x.fits) === truth));
  const context = `Du würfelst einmal. Die Zahl ist ${e.text}.`;
  const fit = DIE.filter(e.fits);
  const why: Why = {
    sicherStattMoeglich: 'Sicher heißt: Es kommt immer so. Kann eine andere Zahl kommen?',
    unmoeglichStattMoeglich: 'Diese Zahl gibt es am Würfel. Also kann die Zahl kommen.',
    stattSicher: 'Prüfe alle Zahlen von 1 bis 6. Passen wirklich nur manche?',
    stattUnmoeglich: 'Prüfe die Zahlen von 1 bis 6. Passt überhaupt eine?',
  };
  return build(SKILL, stufe, {
    key: ['wuerfel', e.id].join(':'),
    ab,
    context,
    prompt: QUESTION,
    visual: { type: 'dice', values: DIE },
    answer: classChoice(rng, truth, why),
    hints: ['Der Würfel hat die Zahlen von 1 bis 6.', 'Prüfe jede Zahl: Passen alle, manche oder keine?'],
    steps: ['Am Würfel sind die Zahlen von 1 bis 6.', fit.length === 0 ? 'Keine Zahl passt.' : fit.length === 6 ? 'Alle Zahlen passen.' : `Es passen nur: ${joinDe(fit.map(String))}.`, `Das ist ${truth}.`],
    praise: PRAISE[truth],
    srText: say(context, QUESTION),
    kmk: KMK,
  });
}

/** Stufe 1, harder item: which of the results has this word. */
function pickResult(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b, c] = rng.sample(COLORS, 3);
  const want = rng.pick(KLASSEN);
  const list = [{ color: a, count: rng.int(3, 7) }, { color: b, count: rng.int(1, 3) }];
  const texts: Record<Klasse, string> = {
    sicher: `Die Kugel ist ${COLOR_WORD[a]} oder ${COLOR_WORD[b]}.`,
    möglich: `Die Kugel ist ${COLOR_WORD[a]}.`,
    unmöglich: `Die Kugel ist ${COLOR_WORD[c]}.`,
  };
  const why: Record<Klasse, string> = {
    sicher: 'Das ist sicher. Jede Kugel im Säckchen passt.',
    möglich: 'Das ist möglich. Es kann auch eine andere Farbe kommen.',
    unmöglich: 'Das ist unmöglich. Diese Farbe liegt nicht im Säckchen.',
  };
  const prompt = `Welches Ergebnis ist ${want}?`;
  return build(SKILL, stufe, {
    key: ['ergebnis', want, a, list[0].count, b, list[1].count, c].join(':'),
    ab,
    context: DRAW,
    prompt,
    visual: { type: 'bag', balls: list },
    answer: makeChoice(rng, { label: texts[want] }, KLASSEN.filter((k) => k !== want).map((k) => ({ label: texts[k], whyWrong: why[k] }))),
    hints: ['Schau: Welche Farben liegen im Säckchen?', HINT_WORDS],
    steps: [`Im Säckchen: ${joinDe(list.map((x) => balls(x.count, x.color)))}.`, texts[want], `Das ist ${want}.`],
    praise: PRAISE[want],
    srText: say(DRAW, prompt),
    kmk: KMK,
  });
}

// ─── Glücksrad ───────────────────────────────────────────────────────────────

function sectors(rng: Rng, parts: readonly [ColorName, number][]): ColorName[] {
  return rng.shuffle(parts.flatMap(([c, n]) => Array.from({ length: n }, () => c)));
}

function spinnerItem(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const truth = rng.pick(KLASSEN);
  const [a, b, c] = rng.sample(COLORS, 3);
  const total = rng.pick([4, 6, 8]);
  const nA = truth === 'sicher' ? total : rng.int(Math.ceil(total / 2), total - 1);
  const parts: [ColorName, number][] = nA === total ? [[a, total]] : [[a, nA], [b, total - nA]];
  const target = truth === 'unmöglich' ? c : truth === 'sicher' ? a : rng.chance(0.75) ? a : b;
  const context = `Das Rad dreht sich einmal. Der Zeiger bleibt auf ${COLOR_NOUN[target]} stehen.`;
  const why: Why = {
    sicherStattMoeglich: 'Sicher heißt: Es kommt immer so. Gibt es andere Felder?',
    unmoeglichStattMoeglich: 'Diese Farbe gibt es auf dem Rad. Also kann die Farbe kommen.',
    stattSicher: 'Schau auf das Rad: Gibt es Felder mit einer anderen Farbe?',
    stattUnmoeglich: 'Schau auf das Rad: Gibt es diese Farbe überhaupt?',
  };
  return build(SKILL, stufe, {
    key: ['rad', truth, target, parts.map(([k, n]) => `${k}${n}`).join('-')].join(':'),
    ab,
    context,
    prompt: QUESTION,
    visual: { type: 'spinner', sectors: sectors(rng, parts) },
    answer: classChoice(rng, truth, why),
    hints: ['Schau: Welche Farben hat das Rad?', HINT_WORDS],
    steps: [`Das Rad hat ${total} gleich große Felder.`, truth === 'sicher' ? 'Jedes Feld passt.' : truth === 'unmöglich' ? 'Kein Feld passt.' : 'Manche Felder passen, manche nicht.', `Das ist ${truth}.`],
    praise: PRAISE[truth],
    srText: say(context, QUESTION),
    kmk: KMK,
  });
}

function possibleNotSure(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b, c] = rng.sample(COLORS, 3);
  const total = rng.pick([4, 6, 8]);
  const nA = rng.int(total / 2, total - 1);
  const parts: [ColorName, number][] = [[a, nA], [b, total - nA]];
  const prompt = 'Welches Ergebnis ist möglich, aber nicht sicher?';
  const context = 'Das Rad dreht sich einmal.';
  const target = rng.chance(0.75) ? a : b;
  return build(SKILL, stufe, {
    key: ['nicht-sicher', a, nA, b, c, target].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'spinner', sectors: sectors(rng, parts) },
    answer: makeChoice(rng, { label: `Der Zeiger zeigt auf ${COLOR_NOUN[target]}.` }, [
      { label: `Der Zeiger zeigt auf ${COLOR_NOUN[a]} oder ${COLOR_NOUN[b]}.`, whyWrong: 'Das ist sicher. Jedes Feld passt.' },
      { label: `Der Zeiger zeigt auf ${COLOR_NOUN[c]}.`, whyWrong: 'Das ist unmöglich. Diese Farbe gibt es hier nicht.' },
    ]),
    hints: ['Möglich heißt: Es kann so kommen.', 'Nicht sicher heißt: Es kann auch anders kommen.'],
    steps: [`Das Rad hat ${COLOR_NOUN[a]} und ${COLOR_NOUN[b]}.`, `${COLOR_NOUN[target]} kann kommen, muss aber nicht.`],
    praise: PRAISE.möglich,
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/**
 * Stufe 2, harder item: the true sentence about a wheel with a large majority, or the sum of 2 dice.
 * Every word stands on the options whether its sentence is true or not, so only the wheel tells which sentence stimmt.
 */
function trueSentence(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (rng.chance(0.4)) return diceSum(rng, stufe, ab);
  const [a, b, c] = rng.sample(COLORS, 3);
  const [nounA, nounB, nounC] = [COLOR_NOUN[a], COLOR_NOUN[b], COLOR_NOUN[c]];
  const total = rng.pick([6, 8]);
  const nA = total - 1;
  const truth = rng.pick(KLASSEN);
  const possible = rng.chance(0.5) ? nounA : nounB;
  const BUG_SICHER = 'Sicher heißt: Es kommt immer so. Gibt es andere Felder?';
  const sentences: Record<Klasse, { yes: string; no: string; whyWrong: string; proof: string }> = {
    sicher: { yes: `${nounA} oder ${nounB} ist sicher.`, no: `${nounA} oder ${nounC} ist sicher.`, whyWrong: BUG_SICHER, proof: `Jedes Feld ist ${nounA} oder ${nounB}.` },
    möglich: { yes: `${possible} ist möglich, aber nicht sicher.`, no: `${nounC} ist möglich, aber nicht sicher.`, whyWrong: 'Diese Farbe gibt es hier nicht.', proof: `${possible} kann kommen, muss aber nicht.` },
    unmöglich: { yes: `${nounC} ist unmöglich.`, no: `${nounB} ist unmöglich.`, whyWrong: 'Diese Farbe gibt es auf dem Rad. Also kann die Farbe kommen.', proof: `${nounC} gibt es auf dem Rad nicht.` },
  };
  const context = 'Das Rad dreht sich einmal.';
  const prompt = 'Welcher Satz stimmt?';
  return build(SKILL, stufe, {
    key: ['satz', truth, possible, a, b, c, total].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'spinner', sectors: sectors(rng, [[a, nA], [b, 1]]) },
    answer: makeChoice(rng, { label: sentences[truth].yes }, [
      ...KLASSEN.filter((k) => k !== truth).map((k) => ({ label: sentences[k].no, whyWrong: sentences[k].whyWrong })),
      { label: `${nounA} ist sicher.`, whyWrong: BUG_SICHER },
    ]),
    hints: ['Prüfe jeden Satz am Rad.', HINT_WORDS],
    steps: [`Das Rad hat ${nA} Felder ${nounA} und 1 Feld ${nounB}.`, sentences[truth].proof],
    praise: 'Du hast jeden Satz am Rad geprüft.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

function diceSum(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const truth = rng.pick(KLASSEN);
  const n = truth === 'möglich' ? rng.int(2, 12) : truth === 'unmöglich' ? rng.pick([0, 1, 13, 14, 15]) : 0;
  const event = truth === 'sicher' ? 'Das Ergebnis ist kleiner als 13.' : `Das Ergebnis ist ${n}.`;
  const context = `Du würfelst 2-mal und rechnest plus. ${event}`;
  const why: Why = {
    sicherStattMoeglich: 'Sicher heißt: Es kommt immer so. Kann ein anderes Ergebnis kommen?',
    unmoeglichStattMoeglich: 'Das kann kommen. Probiere 2 Zahlen von 1 bis 6.',
    stattSicher: 'Das größte Ergebnis ist 6 + 6. Passt wirklich jedes Ergebnis?',
    stattUnmoeglich: 'Das kleinste Ergebnis ist 1 + 1, das größte 6 + 6.',
  };
  return build(SKILL, stufe, {
    key: ['summe', truth, n].join(':'),
    ab,
    context,
    prompt: QUESTION,
    visual: { type: 'dice', values: DIE },
    answer: classChoice(rng, truth, why),
    hints: ['Das kleinste Ergebnis ist 1 + 1.', 'Das größte Ergebnis ist 6 + 6.'],
    steps: ['Das kleinste Ergebnis ist 1 + 1 = 2.', 'Das größte Ergebnis ist 6 + 6 = 12.', `Das ist ${truth}.`],
    praise: PRAISE[truth],
    srText: say(context, QUESTION),
    kmk: KMK,
  });
}

// ─── Stufe 3: wahrscheinlich, unwahrscheinlich ───────────────────────────────

function likelyItem(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = rng.sample(COLORS, 2);
  const nA = rng.int(7, 9);
  const nB = rng.int(1, 2);
  const likely = rng.chance(0.5);
  const target = likely ? a : b;
  const context = `${DRAW} Die Kugel ist ${COLOR_WORD[target]}.`;
  const prompt = 'Ist das wahrscheinlich oder unwahrscheinlich?';
  return build(SKILL, stufe, {
    key: ['wahrscheinlich', a, nA, b, nB, target].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'bag', balls: [{ color: a, count: nA }, { color: b, count: nB }] },
    answer: fixedChoice([
      { label: 'wahrscheinlich', whyWrong: 'Von dieser Farbe liegen nur wenige Kugeln im Säckchen.' },
      { label: 'unwahrscheinlich', whyWrong: 'Von dieser Farbe liegen viele Kugeln im Säckchen.' },
    ], likely ? 0 : 1),
    hints: ['Vergleiche die Kugeln im Säckchen.', 'Von welcher Farbe liegen viele Kugeln darin?'],
    steps: [`Im Säckchen: ${balls(nA, a)} und ${balls(nB, b)}.`, `Das ist ${likely ? 'wahrscheinlich' : 'unwahrscheinlich'}.`],
    praise: 'Du hast die Kugeln beider Farben verglichen.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** The list in another order: reading a list or a picture from left to right never solves an order task. */
function notInOrder<T>(rng: Rng, list: readonly T[]): T[] {
  const shown = rng.shuffle(list);
  return shown.every((x, i) => x === list[i]) ? [...shown.slice(1), shown[0]] : shown;
}

/** items in display order (never already in the target order), correct: from the largest to the smallest chance. */
export function chanceOrder(rng: Rng, fromLikely: readonly string[]): OrderAnswer {
  const shown = notInOrder(rng, fromLikely);
  return { kind: 'order', items: shown, correct: fromLikely.map((x) => shown.indexOf(x)), direction: 'absteigend', instruction: 'Tippe der Reihe nach an: zuerst die größte Chance, zuletzt die kleinste.' };
}

const ORDER_PROMPT = 'Ordne von wahrscheinlich bis unwahrscheinlich.';

function orderColors(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const cs = rng.sample(COLORS, 3);
  const counts = [rng.int(5, 7), rng.int(3, 4), rng.int(1, 2)];
  const answer = chanceOrder(rng, cs.map((c) => COLOR_NOUN[c]));
  const reversed = [...answer.correct].reverse();
  const bag = notInOrder(rng, cs.map((color, i) => ({ color, count: counts[i] })));
  return build(SKILL, stufe, {
    key: ['ordnen', bag.map((g) => `${g.color}${g.count}`).join('-')].join(':'),
    ab,
    context: DRAW_SHORT,
    prompt: ORDER_PROMPT,
    visual: { type: 'bag', balls: bag },
    answer,
    hints: ['Viele Kugeln einer Farbe bedeuten eine große Chance.', 'Tippe zuerst die Farbe mit den meisten Kugeln an.'],
    steps: [`Im Säckchen: ${joinDe(cs.map((c, i) => balls(counts[i], c)))}.`, `Die Reihenfolge ist: ${cs.map((c) => COLOR_NOUN[c]).join(', ')}.`],
    bugs: [{ id: 'umgedreht', match: reversed, hint: 'Schau auf die Richtung: Zuerst kommt die größte Chance.' }],
    praise: 'Du hast nach der Zahl der Kugeln geordnet.',
    srText: say(DRAW_SHORT, ORDER_PROMPT),
    kmk: KMK,
  });
}

/** From sicher through wahrscheinlich and unwahrscheinlich to unmöglich. */
function orderEvents(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b, c] = rng.sample(COLORS, 3);
  const nA = rng.int(6, 9);
  const nB = rng.int(1, 2);
  const events = [`${COLOR_NOUN[a]} oder ${COLOR_NOUN[b]}`, COLOR_NOUN[a], COLOR_NOUN[b], COLOR_NOUN[c]];
  const answer = chanceOrder(rng, events);
  const prompt = 'Ordne von sicher bis unmöglich.';
  const parts: [string, string][] = [[events[0], 'sicher'], [events[1], 'wahrscheinlich'], [events[2], 'unwahrscheinlich'], [events[3], 'unmöglich']];
  const bag = rng.shuffle([{ color: a, count: nA }, { color: b, count: nB }]);
  return build(SKILL, stufe, {
    key: ['ereignisse', bag.map((g) => `${g.color}${g.count}`).join('-'), c].join(':'),
    ab,
    context: DRAW_SHORT,
    prompt,
    visual: { type: 'bag', balls: bag },
    answer,
    hints: ['Was kommt immer? Das steht vorne.', 'Was kann nie kommen? Das steht hinten.'],
    steps: parts.map(([text, word]) => `${text}: ${word}.`),
    bugs: [{ id: 'umgedreht', match: [...answer.correct].reverse(), hint: 'Schau auf die Richtung: Zuerst kommt das Sichere.' }],
    praise: 'Du hast von sicher bis unmöglich geordnet.',
    srText: say(DRAW_SHORT, prompt),
    kmk: KMK,
  });
}

export const sicherMoeglichSkill: SkillDef = {
  ...SKILL,
  title: 'Sicher, möglich, unmöglich',
  description: 'Du sagst, ob etwas sicher, möglich oder unmöglich ist.',
  stufen: { 1: 'Säckchen und Würfel', 2: 'Glücksrad: möglich, aber nicht sicher', 3: 'Ereignisse ordnen: wahrscheinlich, unwahrscheinlich' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? bagItem(rng, stufe, ab) : ab === 2 ? diceItem(rng, stufe, ab) : pickResult(rng, stufe, ab);
    if (stufe === 2) return ab === 1 ? spinnerItem(rng, stufe, ab) : ab === 2 ? possibleNotSure(rng, stufe, ab) : trueSentence(rng, stufe, ab);
    return ab === 1 ? likelyItem(rng, stufe, ab) : ab === 2 ? orderColors(rng, stufe, ab) : orderEvents(rng, stufe, ab);
  },
};

