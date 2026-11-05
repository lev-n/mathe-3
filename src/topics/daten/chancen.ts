/**
 * Wo sind die Chancen größer? (docs/research.md §6). Chances are compared by counting, never with numbers as probabilities.
 * Stufe 1: same total, which bag gives a colour more often? Stufe 2: Glücksräder with equal sectors, compare by count.
 * Stufe 3: change the bag; is the game fair? Choice answers only, so the bugs of §5 live in whyWrong.
 */
import type { Ab, ColorName, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, pickTwo, targetAb } from '../shared';
import { balls, COLOR_ADJ, COLOR_NOUN, COLORS, countOf, fixedChoice, say } from './helpers';

const SKILL = { id: 'daten.chancen', topicId: 'daten' } as const;
const KMK = ['DZ.zufall'];

const DRAW = 'Du ziehst ohne Hinsehen eine Kugel.';
const SPIN = 'Das Rad dreht sich einmal.';
const SAME = 'Bei beiden gleich';
/** The position of the correct option where SAME is on offer: the option is only sometimes correct, so it needs a look at both pictures. */
const WITH_SAME = [0, 1, 2] as const;

const BUG_SECHS = 'Jede Zahl am Würfel hat die gleiche Chance.';
const BUG_ANTEIL = 'Schau auch auf die anderen Kugeln. Wie viele sind es jeweils?';

interface Bag {
  target: number;
  other: number;
}

const onlyBalls = (n: number, c: ColorName) => `${n === 1 ? 'ist' : 'sind'} nur ${balls(n, c)}`;
const fields = (n: number) => countOf(n, 'Feld', 'Felder');
/** Two to compare: 'größer'. Only three take the superlative. */
const chanceSize = (n: number) => (n === 2 ? 'größer' : 'am größten');

const bagVisual = (b: Bag, target: ColorName, other: ColorName): Visual => ({ type: 'bag', balls: [{ color: target, count: b.target }, { color: other, count: b.other }] });

/** Stufe 1: bags with the same number of Kugeln. */
function sameTotal(rng: Rng, stufe: Stufe, ab: Ab, nBags: 2 | 3): Exercise {
  const [t, o] = rng.sample(COLORS, 2);
  const total = rng.pick([6, 8, 10]);
  const counts = rng.sample(Array.from({ length: total - 1 }, (_, i) => i + 1), nBags);
  const best = Math.max(...counts);
  const letters = ['A', 'B', 'C'];
  const prompt = `Wo ist die Chance auf ${COLOR_NOUN[t]} ${chanceSize(nBags)}?`;
  const options = counts.map((n, i) => ({
    label: `Säckchen ${letters[i]}`,
    visual: bagVisual({ target: n, other: total - n }, t, o),
    whyWrong: `In diesem Säckchen ${onlyBalls(n, t)}. Vergleiche die Säckchen.`,
  }));
  return build(SKILL, stufe, {
    key: ['gleich-viele', t, o, total, counts.join('-')].join(':'),
    ab,
    context: DRAW,
    prompt,
    answer: fixedChoice(options, counts.indexOf(best), 'grid'),
    hints: [`Zähle in jedem Säckchen die Kugeln mit der Farbe ${COLOR_NOUN[t]}.`, `Alle Säckchen haben ${total} Kugeln. Vergleiche nur die eine Farbe.`],
    steps: [`Jedes Säckchen hat ${total} Kugeln.`, `Kugeln mit der Farbe ${COLOR_NOUN[t]}: ${counts.join(', ')}.`, `Säckchen ${letters[counts.indexOf(best)]} hat die meisten.`],
    praise: 'Du hast die Kugeln dieser Farbe verglichen.',
    srText: say(DRAW, prompt),
    kmk: KMK,
  });
}

/** Stufe 1, harder item: both bags have the same total, and "gleich" is only sometimes the answer; or the Würfel. */
function sameOrDice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (rng.chance(0.5)) return diceCompare(rng, stufe, ab);
  const [t, o, x] = rng.sample(COLORS, 3);
  const correct = rng.pick(WITH_SAME);
  const small = rng.int(2, 3);
  const large = small + rng.int(1, 2);
  const hitA = correct === 0 ? large : small;
  const hitB = correct === 1 ? large : small;
  // Bag B always has a third colour: the bags look different, also when the chance is the same.
  const total = large + rng.int(2, 3);
  const bagA: Visual = { type: 'bag', balls: [{ color: t, count: hitA }, { color: o, count: total - hitA }] };
  const bagB: Visual = { type: 'bag', balls: [{ color: t, count: hitB }, { color: o, count: 1 }, { color: x, count: total - hitB - 1 }] };
  const prompt = `Wo ist die Chance auf ${COLOR_NOUN[t]} größer?`;
  const equal = correct === 2;
  const whyBag = (hit: number) => (equal ? `In beiden Säckchen sind ${balls(hit, t)} und gleich viele Kugeln insgesamt.` : `In diesem Säckchen ${onlyBalls(hit, t)}. Vergleiche die Säckchen.`);
  return build(SKILL, stufe, {
    key: ['gleich', t, o, x, hitA, hitB, total].join(':'),
    ab,
    context: DRAW,
    prompt,
    answer: fixedChoice([
      { label: 'Säckchen A', visual: bagA, whyWrong: whyBag(hitA) },
      { label: 'Säckchen B', visual: bagB, whyWrong: whyBag(hitB) },
      { label: SAME, whyWrong: `Beide Säckchen haben ${total} Kugeln. Zähle die Kugeln mit der Farbe ${COLOR_NOUN[t]}.` },
    ], correct, 'grid'),
    hints: ['Vergleiche die Kugeln dieser Farbe.', 'Vergleiche dann alle Kugeln im Säckchen.'],
    steps: equal
      ? [`In beiden Säckchen sind ${balls(small, t)}.`, `In beiden Säckchen sind ${total} Kugeln.`, 'Die Chance ist bei beiden gleich.']
      : [`In beiden Säckchen sind ${total} Kugeln.`, `Säckchen A: ${balls(hitA, t)}. Säckchen B: ${balls(hitB, t)}.`, `Säckchen ${correct === 0 ? 'A' : 'B'} hat die größere Chance.`],
    praise: equal ? 'Du hast gemerkt: Die Chance ist hier gleich.' : 'Du hast die Kugeln dieser Farbe verglichen.',
    srText: say(DRAW, prompt),
    kmk: KMK,
  });
}

const DIE_SAME = 'Beide haben die gleiche Chance.';

/** The Würfel: every number has the same chance, also the 6. Two numbers together have the larger chance. */
function diceCompare(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [other, third] = rng.sample([1, 2, 3, 4, 5], 2);
  const visual: Visual = { type: 'dice', values: [1, 2, 3, 4, 5, 6] };
  if (rng.chance(0.5)) {
    const context = `Du würfelst einmal. Vergleiche die 6 und die ${other}.`;
    const prompt = 'Welche Zahl hat die größere Chance?';
    return build(SKILL, stufe, {
      key: ['wuerfel', other].join(':'),
      ab,
      context,
      prompt,
      visual,
      answer: fixedChoice([{ label: 'die 6', whyWrong: BUG_SECHS }, { label: `die ${other}`, whyWrong: BUG_SECHS }, { label: DIE_SAME }], 2),
      hints: ['Wie oft steht jede Zahl auf dem Würfel?', 'Jede Seite des Würfels ist gleich groß.'],
      steps: ['Jede Zahl steht einmal auf dem Würfel.', 'Darum haben beide Zahlen die gleiche Chance.'],
      praise: 'Du hast geprüft: Jede Zahl steht einmal da.',
      srText: say(context, prompt),
      kmk: KMK,
    });
  }
  const [lo, hi] = [Math.min(other, third), Math.max(other, third)];
  const context = 'Du würfelst einmal. Vergleiche die Antworten unten.';
  const prompt = 'Was hat die größere Chance?';
  const why = 'Zähle die Seiten: Wie viele Seiten passen jeweils?';
  return build(SKILL, stufe, {
    key: ['wuerfel-zwei', lo, hi].join(':'),
    ab,
    context,
    prompt,
    visual,
    answer: fixedChoice([{ label: 'die 6', whyWrong: why }, { label: `die ${lo} oder die ${hi}` }, { label: DIE_SAME, whyWrong: why }], 1),
    hints: ['Wie oft steht jede Zahl auf dem Würfel?', why],
    steps: ['Jede Zahl steht einmal auf dem Würfel.', 'Für die 6 passt 1 Seite.', `Für die ${lo} oder die ${hi} passen 2 Seiten.`, `Die ${lo} oder die ${hi} hat die größere Chance.`],
    praise: 'Du hast die passenden Seiten gezählt.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

// ─── Stufe 2: Glücksräder ────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C'];

function wheel(target: ColorName, other: ColorName, n: number, total: number, rng: Rng): Visual {
  return { type: 'spinner', sectors: rng.shuffle(Array.from({ length: total }, (_, i) => (i < n ? target : other))) };
}

function compareWheels(rng: Rng, stufe: Stufe, ab: Ab, nWheels: 2 | 3): Exercise {
  const [t, o] = rng.sample(COLORS, 2);
  const total = rng.pick([4, 6, 8]);
  const counts = rng.sample(Array.from({ length: total - 1 }, (_, i) => i + 1), nWheels);
  const best = Math.max(...counts);
  const prompt = `Bei welchem Rad ist die Chance auf ${COLOR_NOUN[t]} ${chanceSize(nWheels)}?`;
  const options = counts.map((n, i) => ({
    label: `Rad ${LETTERS[i]}`,
    visual: wheel(t, o, n, total, rng),
    whyWrong: `Dieses Rad hat nur ${fields(n)} ${COLOR_NOUN[t]}. Vergleiche die Räder.`,
  }));
  return build(SKILL, stufe, {
    key: ['raeder', t, o, total, counts.join('-')].join(':'),
    ab,
    context: SPIN,
    prompt,
    answer: fixedChoice(options, counts.indexOf(best), 'grid'),
    hints: [`Zähle bei jedem Rad die Felder mit der Farbe ${COLOR_NOUN[t]}.`, 'Alle Felder sind gleich groß. Vergleiche die Anzahl.'],
    steps: [`Jedes Rad hat ${total} gleich große Felder.`, `Felder mit der Farbe ${COLOR_NOUN[t]}: ${counts.join(', ')}.`, `Rad ${LETTERS[counts.indexOf(best)]} hat die meisten.`],
    praise: 'Du hast die Felder der Räder verglichen.',
    srText: say(SPIN, prompt),
    kmk: KMK,
  });
}

/** Stufe 2, harder item: fields in other places. The place does not change the chance, the number of fields does. */
function scatteredWheels(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, o] = rng.sample(COLORS, 2);
  const half = rng.pick([2, 3, 4]);
  const n = rng.int(1, half);
  const total = half * 2;
  const correct = rng.pick(WITH_SAME);
  const equal = correct === 2;
  const hitA = correct === 0 ? n + 1 : n;
  const hitB = correct === 1 ? n + 1 : n;
  const together: ColorName[] = Array.from({ length: total }, (_, i) => (i < hitA ? t : o));
  const apart: ColorName[] = rng.shuffle(Array.from({ length: total }, (_, i) => (i < hitB ? t : o)));
  const same = JSON.stringify(together) === JSON.stringify(apart);
  const second: ColorName[] = same ? [...together.slice(1), together[0]] : apart;
  const noun = COLOR_NOUN[t];
  const prompt = `Bei welchem Rad ist die Chance auf ${noun} größer?`;
  const why = (hit: number) => (equal ? `Beide Räder haben ${fields(hit)} ${noun}. Der Platz ändert nichts.` : `Dieses Rad hat nur ${fields(hit)} ${noun}. Vergleiche die Räder.`);
  return build(SKILL, stufe, {
    key: ['verteilt', t, o, total, hitA, second.join('-')].join(':'),
    ab,
    context: SPIN,
    prompt,
    answer: fixedChoice([
      { label: 'Rad A', visual: { type: 'spinner', sectors: together }, whyWrong: why(hitA) },
      { label: 'Rad B', visual: { type: 'spinner', sectors: second }, whyWrong: why(hitB) },
      { label: SAME, whyWrong: `Zähle die Felder mit der Farbe ${noun} bei beiden Rädern.` },
    ], correct, 'grid'),
    hints: [`Zähle bei beiden Rädern die Felder mit der Farbe ${noun}.`, 'Spielt es eine Rolle, wo die Felder liegen?'],
    steps: equal
      ? [`Beide Räder haben ${total} Felder.`, `Beide Räder haben ${fields(n)} ${noun}.`, 'Die Chance ist bei beiden gleich.']
      : [`Beide Räder haben ${total} Felder.`, `Rad A: ${fields(hitA)} ${noun}. Rad B: ${fields(hitB)} ${noun}.`, `Rad ${correct === 0 ? 'A' : 'B'} hat die größere Chance.`],
    praise: equal ? 'Du hast gezählt und nicht auf den Platz geschaut.' : 'Du hast die Felder der Räder verglichen.',
    srText: say(SPIN, prompt),
    kmk: KMK,
  });
}

// ─── Stufe 3: fair? and changing the bag ─────────────────────────────────────

function fairOptions(a: string, b: string, whyA: string, whyB: string, whyFair: string, correct: 0 | 1 | 2) {
  return fixedChoice([
    { label: 'Ja, beide haben die gleiche Chance.', whyWrong: whyFair },
    { label: `Nein, ${a} hat die größere Chance.`, whyWrong: whyA },
    { label: `Nein, ${b} hat die größere Chance.`, whyWrong: whyB },
  ], correct);
}

function fairBag(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const [c1, c2] = rng.sample(COLORS, 2);
  const n1 = rng.int(2, 6);
  const n2 = rng.chance(0.4) ? n1 : rng.pick([1, 2, 3, 4, 5, 6, 7].filter((x) => x !== n1));
  const useWheel = n1 + n2 <= 8 && (n1 + n2) % 2 === 0 && rng.chance(0.4);
  const visual: Visual = useWheel
    ? { type: 'spinner', sectors: rng.shuffle([...Array.from({ length: n1 }, () => c1), ...Array.from({ length: n2 }, () => c2)]) }
    : { type: 'bag', balls: [{ color: c1, count: n1 }, { color: c2, count: n2 }] };
  const piece = useWheel ? 'Felder' : 'Kugeln';
  const pieces = (n: number) => (useWheel ? fields(n) : countOf(n, 'Kugel', 'Kugeln'));
  const context = `${p.name} gewinnt bei ${COLOR_NOUN[c1]}. ${q.name} gewinnt bei ${COLOR_NOUN[c2]}.`;
  const prompt = 'Ist das Spiel fair?';
  const correct = n1 === n2 ? 0 : n1 > n2 ? 1 : 2;
  const why = `Vergleiche die ${piece} beider Farben.`;
  return build(SKILL, stufe, {
    key: ['fair', useWheel ? 'rad' : 'beutel', c1, n1, c2, n2, p.name, q.name].join(':'),
    ab,
    context,
    prompt,
    visual,
    answer: fairOptions(p.name, q.name, why, why, why, correct),
    hints: [`Zähle die ${piece} von ${COLOR_NOUN[c1]} und ${COLOR_NOUN[c2]}.`, 'Fair heißt: Beide haben die gleiche Chance.'],
    steps: [`${COLOR_NOUN[c1]}: ${pieces(n1)}. ${COLOR_NOUN[c2]}: ${pieces(n2)}.`, n1 === n2 ? 'Beide Farben haben gleich viele. Das Spiel ist fair.' : `${n1 > n2 ? p.name : q.name} hat die größere Chance. Das Spiel ist nicht fair.`],
    praise: 'Du hast die Chancen beider Kinder verglichen.',
    srText: say(context, prompt),
    kmk: ['DZ.zufall', 'PK.argumentieren'],
  });
}

function fairDice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [p, q] = pickTwo(rng);
  const [x, y, z] = rng.sample([1, 2, 3, 4, 5, 6], 3);
  const two = rng.chance(0.5);
  const context = two ? `${p.name} gewinnt bei ${x} oder ${y}. ${q.name} gewinnt bei ${z}.` : `${p.name} gewinnt bei ${x}. ${q.name} gewinnt bei ${y}.`;
  const prompt = 'Ist das Spiel fair?';
  const correct = two ? 1 : 0;
  return build(SKILL, stufe, {
    key: ['fair-wuerfel', p.name, q.name, x, y, two ? z : 0].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'dice', values: [1, 2, 3, 4, 5, 6] },
    answer: fairOptions(p.name, q.name, BUG_SECHS, two ? `${p.name} hat mehr Zahlen zum Gewinnen.` : BUG_SECHS, two ? 'Zähle die Gewinnzahlen von beiden Kindern.' : '', correct),
    hints: ['Zähle die Gewinnzahlen von beiden Kindern.', BUG_SECHS],
    steps: [two ? `${p.name} hat 2 Gewinnzahlen, ${q.name} hat 1.` : 'Beide Kinder haben 1 Gewinnzahl.', two ? `${p.name} hat die größere Chance.` : 'Beide haben die gleiche Chance. Das Spiel ist fair.'],
    praise: 'Du hast die Gewinnzahlen verglichen.',
    srText: say(context, prompt),
    kmk: ['DZ.zufall', 'PK.argumentieren'],
  });
}

/** Stufe 3: Kugeln come into the bag: what happens to the chances? */
function changeBag(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [c1, c2] = rng.sample(COLORS, 2);
  const n1 = rng.int(1, 4);
  const d = rng.int(1, 3);
  const n2 = n1 + d;
  const k = rng.int(1, d + 2);
  const after = n1 + k;
  const context = `Du legst noch ${balls(k, c1)} dazu.`;
  const prompt = 'Welche Farbe hat jetzt die größere Chance?';
  const correct = after > n2 ? 0 : after < n2 ? 1 : 2;
  const why = `Rechne zuerst: Wie viele ${COLOR_ADJ[c1]} Kugeln sind es danach?`;
  return build(SKILL, stufe, {
    key: ['aendern', c1, n1, c2, n2, k].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'bag', balls: [{ color: c1, count: n1 }, { color: c2, count: n2 }] },
    answer: fixedChoice([
      { label: COLOR_NOUN[c1], whyWrong: why },
      { label: COLOR_NOUN[c2], whyWrong: why },
      { label: 'Beide haben die gleiche Chance.', whyWrong: why },
    ], correct),
    hints: ['Rechne die neuen Kugeln zu ihrer Farbe dazu.', 'Vergleiche dann beide Farben.'],
    steps: [`${COLOR_NOUN[c1]}: ${n1} + ${k} = ${after} Kugeln.`, `${COLOR_NOUN[c2]}: ${n2} Kugeln.`, after === n2 ? 'Beide Farben haben die gleiche Chance.' : `${COLOR_NOUN[after > n2 ? c1 : c2]} hat die größere Chance.`],
    praise: 'Du hast die neuen Kugeln mitgerechnet.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Stufe 3, harder item: which change makes the game fair. */
function makeFair(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [c1, c2] = rng.sample(COLORS, 2);
  const n1 = rng.int(1, 4);
  const d = rng.int(2, 4);
  const n2 = n1 + d;
  const context = `Das Spiel mit ${COLOR_NOUN[c1]} und ${COLOR_NOUN[c2]} soll fair sein.`;
  const prompt = 'Welche Kugeln legst du dazu?';
  return build(SKILL, stufe, {
    key: ['fair-machen', c1, n1, c2, n2].join(':'),
    ab,
    context,
    prompt,
    visual: { type: 'bag', balls: [{ color: c1, count: n1 }, { color: c2, count: n2 }] },
    answer: makeChoice(rng, { label: balls(d, c1) }, [
      { label: balls(d, c2), whyWrong: 'Von dieser Farbe liegen schon mehr Kugeln im Säckchen.' },
      { label: balls(d - 1, c1), whyWrong: 'Dann fehlt noch eine Kugel. Vergleiche beide Farben.' },
      { label: balls(d + 1, c1), whyWrong: 'Dann liegen von dieser Farbe zu viele im Säckchen.' },
    ]),
    hints: ['Fair heißt hier: gleich viele Kugeln von beiden Farben.', 'Von welcher Farbe liegen weniger Kugeln im Säckchen?'],
    steps: [`${COLOR_NOUN[c1]}: ${countOf(n1, 'Kugel', 'Kugeln')}. ${COLOR_NOUN[c2]}: ${n2} Kugeln.`, `${n2} − ${n1} = ${d}`, `Dazu kommen ${balls(d, c1)}.`],
    praise: 'Du hast den Unterschied zwischen den Farben ausgeglichen.',
    srText: say(context, prompt),
    kmk: ['DZ.zufall', 'PK.problemloesen'],
  });
}

/** Stufe 3, harder item: more Kugeln of the colour, but a smaller chance (3 of 10 against 2 of 3). */
function countVersusShare(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, o] = rng.sample(COLORS, 2);
  const manyT = rng.int(3, 5);
  const manyO = manyT + rng.int(3, 5);
  const fewT = rng.int(2, manyT - 1);
  const fewO = rng.int(1, fewT - 1 || 1);
  const bagMany = bagVisual({ target: manyT, other: manyO }, t, o);
  const bagFew = bagVisual({ target: fewT, other: fewO }, t, o);
  const manyFirst = rng.chance(0.5);
  const prompt = `Wo ist die Chance auf ${COLOR_NOUN[t]} größer?`;
  const manyOption = { visual: bagMany, whyWrong: BUG_ANTEIL };
  const fewOption = { visual: bagFew, whyWrong: BUG_ANTEIL };
  const [first, second] = manyFirst ? [manyOption, fewOption] : [fewOption, manyOption];
  const whyBoth = 'Vergleiche in jedem Säckchen beide Farben miteinander.';
  return build(SKILL, stufe, {
    key: ['anteil', t, o, manyT, manyO, fewT, fewO, manyFirst ? 1 : 0].join(':'),
    ab,
    context: DRAW,
    prompt,
    answer: fixedChoice([
      { label: 'Säckchen A', ...first },
      { label: 'Säckchen B', ...second },
      { label: SAME, whyWrong: whyBoth },
    ], manyFirst ? 1 : 0, 'grid'),
    hints: [whyBoth, 'Gibt es mehr Kugeln dieser Farbe oder mehr andere Kugeln?'],
    steps: [`Ein Säckchen: ${balls(manyT, t)} und ${balls(manyO, o)}.`, `Das andere Säckchen: ${balls(fewT, t)} und ${balls(fewO, o)}.`, `Nur im kleineren Säckchen gibt es mehr ${COLOR_NOUN[t]} als andere Kugeln.`],
    praise: 'Du hast auch die anderen Kugeln beachtet.',
    srText: say(DRAW, prompt),
    kmk: ['DZ.zufall', 'PK.argumentieren'],
  });
}

export const chancenSkill: SkillDef = {
  ...SKILL,
  title: 'Wo sind die Chancen größer?',
  description: 'Du vergleichst Säckchen, Würfel und Glücksräder.',
  stufen: { 1: 'Gleich viele Kugeln: Wo kommt die Farbe öfter?', 2: 'Glücksräder vergleichen, Felder zählen', 3: 'Säckchen ändern: Ist das Spiel fair?' },
  kmk: ['DZ.zufall', 'PK.argumentieren', 'PK.problemloesen'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? sameTotal(rng, stufe, ab, 2) : ab === 2 ? sameTotal(rng, stufe, ab, 3) : sameOrDice(rng, stufe, ab);
    if (stufe === 2) {
      if (ab === 1) return compareWheels(rng, stufe, ab, 2);
      if (ab === 2) return rng.chance(0.75) ? compareWheels(rng, stufe, ab, 3) : diceCompare(rng, stufe, ab);
      return scatteredWheels(rng, stufe, ab);
    }
    if (ab === 1) return rng.chance(0.7) ? fairBag(rng, stufe, ab) : fairDice(rng, stufe, ab);
    if (ab === 2) return changeBag(rng, stufe, ab);
    return rng.chance(0.5) ? makeFair(rng, stufe, ab) : countVersusShare(rng, stufe, ab);
  },
};
