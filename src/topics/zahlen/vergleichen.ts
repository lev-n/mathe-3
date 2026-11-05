/**
 * zahlen.vergleichen: <, > and =, ordering numbers, the largest number from digit cards (docs/research.md §6). A comparison starts at the
 * Hunderter, not at the large digits (bug vergleich-ziffern). Choice answers carry their feedback in whyWrong, order answers in Bugs.
 * A Stellenwerttafel lines up the places: in the task on Stufe 1, in the worked steps on every Stufe.
 */
import { BOX } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, orderAnswer } from '../shared';
import { ausFormen, dreiZiffern, maxOptionen, stellen, tafel, tafelZeilen, zahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.vergleichen', topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'ZO.stellenwert'];

const ZEICHEN = ['<', '>', '='];
const zeichenVon = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');

/** Where a and b first differ, as the child compares them. */
function stelleText(a: number, b: number): { hint: string; schritt: string } {
  const x = stellen(a);
  const y = stellen(b);
  if (x.h !== y.h) return { hint: 'Schau zuerst auf die Hunderter.', schritt: `${a} hat ${x.h} Hunderter. ${b} hat ${y.h} Hunderter.` };
  if (x.z !== y.z) return { hint: 'Die Hunderter sind gleich. Schau auf die Zehner.', schritt: `Die Hunderter sind gleich. ${a} hat ${x.z} Zehner, ${b} hat ${y.z} Zehner.` };
  return { hint: 'Hunderter und Zehner sind gleich. Schau auf die Einer.', schritt: `Hunderter und Zehner sind gleich. ${a} hat ${x.e} Einer, ${b} hat ${y.e} Einer.` };
}

function zeichenWahl(rng: Rng, richtig: string, wennGleich: string, sonst: string) {
  const wrongs: ChoiceOption[] = ZEICHEN.filter((s) => s !== richtig).map((s) => ({ label: s, whyWrong: s === '=' || richtig === '=' ? wennGleich : sonst }));
  return makeChoice(rng, { label: richtig }, wrongs, { layout: 'symbols', order: ZEICHEN, max: 3 });
}

function zeichenAufgabe(a: number, b: number, rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const s = zeichenVon(a, b);
  const { hint, schritt } = stelleText(a, b);
  return build(SKILL, stufe, {
    key: `zeichen:${a}:${b}`,
    ab,
    prompt: 'Welches Zeichen passt?',
    expression: `${a} ${BOX} ${b}`,
    ...(stufe === 1 ? { visual: tafelZeilen([a, b]) } : {}),
    answer: zeichenWahl(rng, s, 'Die Zahlen sind nicht gleich. Vergleiche Stelle für Stelle.', hint),
    hints: [hint, 'Die Spitze zeigt zur kleineren Zahl.'],
    steps: [{ text: schritt, visual: tafelZeilen([a, b]) }, `Also: ${a} ${s} ${b}`],
    praise: stellen(a).h === stellen(b).h ? 'Du hast Stelle für Stelle verglichen.' : 'Du hast zuerst auf die Hunderter geschaut.',
    srText: `Vergleiche ${a} und ${b}.`,
    kmk: KMK,
  });
}

// ─── Stufe 1: different hundreds ─────────────────────────────────────────────

/**
 * Two numbers with different hundreds. 'klar': the larger one also has the larger digits behind. 'gemischt': often the smaller one has the
 * large digits, 289 and 301. 'falle': always, and the hundreds lie next to each other.
 */
type Paar = 'klar' | 'gemischt' | 'falle';

function hunderterPaar(rng: Rng, art: Paar): [number, number] {
  const h = rng.int(1, 8);
  const groesser = art === 'falle' ? h + 1 : h + rng.int(1, 9 - h);
  const faellt = art === 'falle' || (art === 'gemischt' && rng.chance(0.6));
  const klein = faellt ? zahl(h, rng.int(6, 9), rng.int(6, 9)) : art === 'klar' ? zahl(h, rng.int(0, 4), rng.int(0, 9)) : zahl(h, rng.int(0, 9), rng.int(0, 9));
  const gross = faellt ? zahl(groesser, rng.int(0, 3), rng.int(0, 3)) : art === 'klar' ? zahl(groesser, rng.int(5, 9), rng.int(0, 9)) : zahl(groesser, rng.int(0, 9), rng.int(0, 9));
  return rng.chance(0.5) ? [klein, gross] : [gross, klein];
}

const zeichenHunderter = (art: Paar): Form => (rng, stufe, ab) => {
  const [a, b] = hunderterPaar(rng, art);
  return zeichenAufgabe(a, b, rng, stufe, ab);
};

const welcheZahl = (art: Paar): Form => (rng, stufe, ab) => {
  const [a, b] = hunderterPaar(rng, art);
  const groesser = rng.chance(0.6);
  const right = groesser ? Math.max(a, b) : Math.min(a, b);
  const wrong = groesser ? Math.min(a, b) : Math.max(a, b);
  const { schritt } = stelleText(a, b);
  return build(SKILL, stufe, {
    key: `welche:${a}:${b}:${groesser ? 'g' : 'k'}`,
    ab,
    prompt: groesser ? 'Welche Zahl ist größer?' : 'Welche Zahl ist kleiner?',
    ...(stufe === 1 ? { visual: tafelZeilen([a, b]) } : {}),
    answer: makeChoice(rng, { label: String(right) }, [{ label: String(wrong), whyWrong: 'Schau zuerst auf die Hunderter.' }]),
    hints: ['Schau zuerst auf die Hunderter.', 'Große Ziffern hinten ändern daran nichts.'],
    steps: [{ text: schritt, visual: tafelZeilen([a, b]) }, `Also ist ${right} ${groesser ? 'größer' : 'kleiner'}.`],
    praise: 'Du hast zuerst auf die Hunderter geschaut.',
    srText: `${groesser ? 'Welche Zahl ist größer' : 'Welche Zahl ist kleiner'}: ${a} oder ${b}?`,
    kmk: KMK,
  });
};

/** The other way round: the sign and one number stand, and the other number is to choose. All hundreds differ from the given number. */
function passendeZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(3, 7);
  const zahlDa = zahl(h, rng.int(0, 3), rng.int(0, 9));
  const groesser = rng.chance(0.5);
  const unten = (): number => zahl(rng.int(1, h - 1), rng.int(6, 9), rng.int(6, 9));
  const oben = (): number => zahl(rng.int(h + 1, 9), rng.int(0, 3), rng.int(0, 9));
  const right = groesser ? oben() : unten();
  const andere = groesser ? [unten(), unten(), unten(), unten()] : [oben(), oben(), oben(), oben()];
  const zeichen = groesser ? '>' : '<';
  const wort = groesser ? 'kleiner' : 'größer';
  return build(SKILL, stufe, {
    key: `passend:${zeichen}:${zahlDa}:${right}`,
    ab,
    prompt: 'Welche Zahl passt in die Lücke?',
    expression: `${BOX} ${zeichen} ${zahlDa}`,
    answer: makeChoice(rng, { label: String(right) }, andere.map((x) => ({ label: String(x), whyWrong: `${x} ist ${wort} als ${zahlDa}. Schau zuerst auf die Hunderter.` })), { max: 4 }),
    hints: ['Schau zuerst auf die Hunderter.', 'Große Ziffern hinten ändern daran nichts.'],
    steps: [{ text: `${right} hat ${stellen(right).h} Hunderter. ${zahlDa} hat ${h} Hunderter.`, visual: tafelZeilen([right, zahlDa]) }, `Also: ${right} ${zeichen} ${zahlDa}`],
    praise: 'Du hast zuerst auf die Hunderter geschaut.',
    srText: `Welche Zahl passt: Lücke ${groesser ? 'größer' : 'kleiner'} als ${zahlDa}?`,
    kmk: KMK,
  });
}

// ─── Stufe 2: same hundreds, digit swaps, equal forms ────────────────────────

/** The Zehner differ and the Einer are the same: 354 and 374. */
const andereZehner: Form = (rng, stufe, ab) => {
  const [x, y, w] = dreiZiffern(rng);
  const h = rng.int(1, 9);
  return zeichenAufgabe(zahl(h, x, w), zahl(h, y, w), rng, stufe, ab);
};

/** 354 and 345, the same digits swapped; or the Zehner are the same too: 354 and 357. */
const gedreht: Form = (rng, stufe, ab) => {
  const [x, y, w] = dreiZiffern(rng);
  const h = rng.int(1, 9);
  return rng.chance(0.7) ? zeichenAufgabe(zahl(h, x, y), zahl(h, y, x), rng, stufe, ab) : zeichenAufgabe(zahl(h, x, y), zahl(h, x, w), rng, stufe, ab);
};

/** 300 + 50 + 4 or 3 H 5 Z 4 E against a number: equal, or the Zehner and Einer swapped. */
function formVergleich(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [h, z, e] = dreiZiffern(rng);
  const n = zahl(h, z, e);
  const gleich = rng.chance(0.6);
  const m = gleich ? n : zahl(h, e, z);
  const s = zeichenVon(m, n);
  const { h: mh, z: mz, e: me } = stellen(m);
  const links = rng.chance(0.5) ? `${mh * 100} + ${mz * 10} + ${me}` : `${mh} H ${mz} Z ${me} E`;
  return build(SKILL, stufe, {
    key: `form:${links}:${n}`,
    ab,
    prompt: 'Welches Zeichen passt?',
    expression: `${links} ${BOX} ${n}`,
    answer: zeichenWahl(rng, s, gleich ? 'Rechne die linke Seite aus. Vergleiche dann.' : 'Die Zahlen sind nicht gleich. Vergleiche die Zehner.', 'Rechne die linke Seite aus. Vergleiche dann.'),
    hints: ['Schreib die linke Seite zuerst als Zahl.', 'Vergleiche dann Stelle für Stelle.'],
    steps: [{ text: `Die linke Seite ist ${m}.`, visual: tafelZeilen([m, n]) }, `Also: ${m} ${s} ${n}`],
    praise: 'Du hast die linke Seite zuerst als Zahl gelesen.',
    srText: `Vergleiche ${links} und ${n}.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

// ─── Stufe 3: order five numbers, digit cards ────────────────────────────────

/**
 * Five different numbers. 'hunderter': all hundreds differ. 'nah': some share the hundreds, two have swapped digits. 'gleich': all share the
 * hundreds, two have swapped digits.
 */
type Fuenf = 'hunderter' | 'nah' | 'gleich';

function fuenfZahlen(rng: Rng, art: Fuenf): number[] {
  if (art === 'hunderter') return rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 5).map((h) => zahl(h, rng.int(0, 9), rng.int(0, 9)));
  const [h1, h2] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
  const [x, y] = dreiZiffern(rng);
  const werte = new Set<number>(art === 'gleich' ? [zahl(h1, x, y), zahl(h1, y, x)] : [zahl(h1, x, y), zahl(h1, y, x), zahl(h2, x, y)]);
  while (werte.size < 5) werte.add(zahl(art === 'gleich' || rng.chance(0.5) ? h1 : rng.int(1, 9), rng.int(0, 9), rng.int(0, 9)));
  return [...werte];
}

/** Largest digit, as a child looks at it (bug vergleich-ziffern). */
const groessteZiffer = (n: number) => Math.max(...String(n).split('').map(Number));

const ordnen = (art: Fuenf): Form => (rng, stufe, ab) => {
  const werte = fuenfZahlen(rng, art);
  const auf = rng.chance(0.6);
  const answer = orderAnswer(rng, werte, auf ? 'aufsteigend' : 'absteigend');
  const sortiert = answer.correct.map((i) => Number(answer.items[i]));
  const index = (n: number) => answer.items.indexOf(String(n));
  const nachZiffer = [...werte].sort((a, b) => (auf ? 1 : -1) * (groessteZiffer(a) - groessteZiffer(b) || a - b)).map(index);
  const bugs: Bug[] = [
    { id: 'reihenfolge-umgekehrt', match: [...answer.correct].reverse(), hint: auf ? 'Fang mit der kleinsten Zahl an.' : 'Fang mit der größten Zahl an.' },
    { id: 'vergleich-ziffern', match: nachZiffer, hint: 'Schau zuerst auf die Hunderter, nicht auf die großen Ziffern.' },
  ].filter((b) => b.match.some((v, i) => v !== answer.correct[i]));
  return build(SKILL, stufe, {
    key: `ordnen:${auf ? 'a' : 'b'}:${answer.items.join(':')}`,
    ab,
    prompt: auf ? 'Ordne die Zahlen. Fang mit der kleinsten Zahl an.' : 'Ordne die Zahlen. Fang mit der größten Zahl an.',
    answer,
    hints: art === 'gleich' ? ['Die Hunderter sind gleich. Schau auf die Zehner.', 'Sind die Zehner gleich? Dann vergleiche die Einer.'] : ['Schau zuerst auf die Hunderter.', art === 'hunderter' ? 'Große Ziffern hinten ändern daran nichts.' : 'Sind die Hunderter gleich? Dann vergleiche die Zehner.'],
    steps: [art === 'gleich' ? 'Alle Hunderter sind gleich.' : 'Ordne zuerst nach den Hundertern.', { text: art === 'hunderter' ? 'Hier entscheiden die Hunderter allein.' : 'Bei gleichen Hundertern entscheiden die Zehner, dann die Einer.', visual: tafelZeilen(sortiert) }, `Also: ${sortiert.join(auf ? ' < ' : ' > ')}`],
    bugs,
    praise: art === 'hunderter' ? 'Du hast nach den Hundertern geordnet.' : 'Du hast Stelle für Stelle verglichen und richtig geordnet.',
    srText: `Ordne die Zahlen ${auf ? 'von klein nach groß' : 'von groß nach klein'}: ${answer.items.join(', ')}.`,
    kmk: KMK,
  });
};

/** The largest or smallest number from three cards; the 0 must not stand in front. */
const ziffernKarten = (groesste: boolean, mitNull: boolean): Form => (rng, stufe, ab) => {
  const [a, b, c] = dreiZiffern(rng);
  const karten = [a, b, mitNull ? 0 : c];
  const moeglich = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ].map(([i, j, k]) => zahl(karten[i], karten[j], karten[k])).filter((n) => n >= 100);
  const absteigend = [...moeglich].sort((x, y) => y - x);
  const right = groesste ? absteigend[0] : absteigend[absteigend.length - 1];
  const ziffern = String(right).split('').join(', ');
  const hundertHint = groesste ? 'Die größte Ziffer kommt zu den Hundertern.' : mitNull ? 'Die kleinste Ziffer ohne die 0 kommt zu den Hundertern.' : 'Die kleinste Ziffer kommt zu den Hundertern.';
  // the first place that differs: with the right Hunderter, the Zehner are the slip
  const zehnerHint = `Die Hunderter stimmen. Zu den Zehnern kommt die ${groesste ? 'größte' : 'kleinste'} übrige Ziffer.`;
  const wrongs: ChoiceOption[] = absteigend
    .filter((n) => n !== right)
    .map((n) => ({ label: String(n), whyWrong: stellen(n).h === stellen(right).h ? zehnerHint : hundertHint }));
  return build(SKILL, stufe, {
    key: `karten:${karten.join('')}:${groesste ? 'g' : 'k'}`,
    ab,
    prompt: groesste ? 'Lege aus den Karten die größte Zahl.' : 'Lege aus den Karten die kleinste Zahl.',
    expression: karten.join(', '),
    answer: makeChoice(rng, { label: String(right) }, wrongs, { max: maxOptionen(stufe) }),
    hints: groesste ? ['Die größte Ziffer kommt zu den Hundertern.', 'Die nächste Ziffer kommt zu den Zehnern.'] : mitNull ? ['Die 0 darf nicht vorne stehen.', 'Die kleinste andere Ziffer kommt zu den Hundertern.'] : ['Die kleinste Ziffer kommt zu den Hundertern.', 'Die nächste Ziffer kommt zu den Zehnern.'],
    steps: [`Von vorne nach hinten: ${ziffern}.`, { text: `Also heißt die Zahl ${right}.`, visual: tafel(right) }],
    praise: groesste ? 'Du hast die größte Ziffer vorne gewählt.' : mitNull ? 'Du hast die kleinste Ziffer ohne die 0 vorne gewählt.' : 'Du hast die kleinste Ziffer vorne gewählt.',
    srText: `${groesste ? 'Lege die größte Zahl' : 'Lege die kleinste Zahl'} aus den Karten ${karten.join(', ')}.`,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
};

/** The Stufe decides the content, the AB level the demand inside it. */
const FORMEN: Formen = {
  1: {
    1: [welcheZahl('klar'), zeichenHunderter('klar')],
    2: [zeichenHunderter('gemischt')],
    3: [zeichenHunderter('falle'), passendeZahl],
  },
  2: {
    1: [andereZehner],
    2: [gedreht],
    3: [formVergleich],
  },
  3: {
    1: [ordnen('hunderter'), ziffernKarten(true, false)],
    2: [ordnen('nah'), ziffernKarten(false, false)],
    3: [ordnen('gleich'), ziffernKarten(false, true), ziffernKarten(true, true)],
  },
};

export const vergleichenSkill: SkillDef = {
  ...SKILL,
  title: 'Größer oder kleiner',
  description: 'Du vergleichst Zahlen mit <, > und =.',
  stufen: {
    1: 'Verschiedene Hunderter: 289 und 301',
    2: 'Gleiche Hunderter, gedrehte Ziffern: 354 und 345',
    3: '5 Zahlen ordnen, die größte Zahl aus Ziffernkarten',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
