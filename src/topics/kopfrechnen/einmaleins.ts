import { BOX } from '../../core/format';
import { factFactors, factKeyOf } from '../../state/facts';
import type { Ab, ChoiceOption, GenContext, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { bugList, makeChoice, multiBugs, plural, targetAb } from '../shared';
import { NEAREST, anchorTerm, askedFact, derivation, factKind, fastHint, isNewFact, malHint, malQuestion, malSteps, mulPool, pickFact, searchHint, searchSteps, similarFact } from './facts';
import { finish, mal, punktefeld, spoken, spokenFields, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.einmaleins'];

const inRange = (x: number) => x >= 1 && x <= 10;

/** §5 operand and mal-als-plus for a · b. */
function malBugs(a: number, b: number) {
  const anchor = derivation(a, b);
  const start = anchor ? ` Fang mit ${anchorTerm(a, b, anchor)} an.` : '';
  const fast = fastHint(a, b);
  return bugList(a * b, [
    ['mal-als-plus', a + b, `${mal(a, b)} heißt ${a}-mal die ${b}.${start}`],
    ['operand', inRange(a - 1) ? (a - 1) * b : null, fast],
    ['operand', inRange(a + 1) ? (a + 1) * b : null, fast],
    ['operand', inRange(b - 1) ? a * (b - 1) : null, fast],
    ['operand', inRange(b + 1) ? a * (b + 1) : null, fast],
  ]);
}

function praiseFor(a: number, b: number): string {
  const d = derivation(a, b);
  if (!d) return `Du hast die Kernaufgabe ${mal(a, b)} gewusst.`;
  return `Die ${d.name} ${anchorTerm(a, b, d)} hilft bei ${mal(a, b)}.`;
}

// ─── Fact forms (they feed the per-fact boxes) ────────────────────────────────

/** a · b = □ */
export function malAufgabe(a: number, b: number, dots: boolean): Task {
  const steps: Step[] = malSteps(a, b);
  if (dots) steps.unshift({ text: `${mal(a, b)} heißt: ${a} ${plural(a, 'Reihe', 'Reihen')} mit je ${b} ${plural(b, 'Punkt', 'Punkten')}.`, visual: punktefeld(a, b) });
  const expression = `${mal(a, b)} = ${BOX}`;
  return {
    // With or without the picture it is the same task: the key leaves the picture out, so that a round does not ask it twice.
    key: `mal:${a}:${b}`,
    prompt: 'Rechne die Malaufgabe.',
    expression,
    ...(dots ? { visual: punktefeld(a, b) } : {}),
    answer: { kind: 'number', value: a * b, label: 'Ergebnis' },
    hints: [malQuestion(a, b), malHint(a, b)],
    steps,
    bugs: malBugs(a, b),
    praise: praiseFor(a, b),
    srText: spoken('Rechne die Malaufgabe.', expression),
    factKey: factKeyOf(a, b),
  };
}

/** □ · b = p or a · □ = p: the same fact, the child looks for a factor. */
function faktorLuecke(a: number, b: number, first: boolean): Task {
  const p = a * b;
  const expression = first ? `${BOX} · ${b} = ${p}` : `${a} · ${BOX} = ${p}`;
  const value = first ? a : b;
  const known = first ? b : a;
  return {
    key: `faktor:${a}:${b}:${first ? 'l' : 'r'}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: [`Wie oft passt die ${known} in die ${p}?`, searchHint(value, known, p)],
    steps: [`Frage: Wie oft passt die ${known} in die ${p}?`, ...searchSteps(value, known), `In die Lücke gehört ${value}.`],
    bugs: bugList(value, [
      ['operand', inRange(value - 1) ? value - 1 : null, `${mal(value - 1, known)} = ${(value - 1) * known}. Das ist noch zu wenig für ${p}.`],
      ['operand', inRange(value + 1) ? value + 1 : null, `${mal(value + 1, known)} = ${(value + 1) * known}. Das ist schon zu viel für ${p}.`],
      ['minus-gerechnet', p - known, `Das ist minus. Hier suchst du: Wie oft passt die ${known}?`],
    ]),
    praise: `Du hast die passende Malaufgabe mit der ${known} gefunden.`,
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
    factKey: factKeyOf(a, b),
  };
}

// ─── Forms that show the fact or a help (no factKey: they do not test recall) ─

/** 5 · 7 = 35, also 6 · 7 = □, or from the row above: 5 · 7 = 35, also 4 · 7 = □. */
function nachbar(a: number, k: number, b: number): Task {
  const expression = `${mal(k, b)} = ${k * b}, also ${mal(a, b)} = ${BOX}`;
  const more = a > k;
  return {
    key: `nachbar:${k}:${a}:${b}`,
    prompt: 'Nutze die Nachbaraufgabe.',
    expression,
    answer: { kind: 'number', value: a * b, label: 'Ergebnis' },
    hints: [`${mal(a, b)} ist einmal die ${b} ${more ? 'mehr' : 'weniger'} als ${mal(k, b)}.`, `Rechne ${k * b} ${more ? '+' : '−'} ${b}.`],
    steps: [`Einmal die ${b} ${more ? 'mehr' : 'weniger'}: ${k * b} ${more ? '+' : '−'} ${b} = ${a * b}.`, `Also: ${mal(a, b)} = ${a * b}.`],
    bugs: bugList(a * b, [
      ['nachbar-eins', more ? k * b + 1 : k * b - 1, `Es kommt nicht 1 ${more ? 'dazu' : 'weg'}, sondern eine ganze ${b}.`],
      ['nachbar-richtung', more ? k * b - b : k * b + b, `${mal(a, b)} hat ${more ? 'mehr' : 'weniger'} Reihen als ${mal(k, b)}.`],
    ]),
    praise: `Du hast die Nachbaraufgabe ${mal(k, b)} genutzt.`,
    srText: spoken('Nutze die Nachbaraufgabe.', expression),
  };
}

/** The [a, b] of a · b = …, also 2a · b = □ on Stufe 1: the fact shown and the fact asked both stay in its pool (§6). */
const DOPPELT_STUFE1: readonly [number, number][] = mulPool(1)
  .map((k) => factFactors(k))
  .filter(([x, b]) => x % 2 === 0 && b > 1 && factKind(x / 2, b) !== 'schwer')
  .map(([x, b]): [number, number] => [x / 2, b]);

/** 2 · 5 = 10, also 4 · 5 = □ */
function verdoppeln(a: number, b: number): Task {
  const kp = a * b;
  const expression = `${mal(a, b)} = ${kp}, also ${mal(2 * a, b)} = ${BOX}`;
  return {
    key: `doppelt:${a}:${b}`,
    prompt: 'Verdopple das Ergebnis.',
    expression,
    answer: { kind: 'number', value: 2 * kp, label: 'Ergebnis' },
    hints: [`${2 * a} ist das Doppelte von ${a}.`, `Dann ist auch das Ergebnis doppelt so groß: ${kp} + ${kp}.`],
    steps: [`${2 * a} ist das Doppelte von ${a}.`, `${kp} + ${kp} = ${2 * kp}`, `Also: ${mal(2 * a, b)} = ${2 * kp}.`],
    bugs: bugList(2 * kp, [
      ['operand', kp + b, `Das ist ${mal(a + 1, b)}. Bei ${mal(2 * a, b)} verdoppelst du ${kp}.`],
      ['verdoppeln-plus', kp + 2, 'Verdoppeln heißt: noch einmal so viel, nicht plus 2.'],
    ]),
    praise: `Du hast ${kp} verdoppelt.`,
    srText: spoken('Verdopple das Ergebnis.', expression),
  };
}

/** Which Malaufgabe does this Punktefeld show? */
function bildWaehlen(rng: Rng, a: number, b: number): Task {
  const prompt = 'Welche Malaufgabe passt zum Punktefeld?';
  const wrongs: ChoiceOption[] = [
    { label: `${a} + ${b}`, whyWrong: 'Das ist plus. Im Feld stehen gleich lange Reihen.' },
    ...(inRange(a + 1) ? [{ label: mal(a + 1, b), whyWrong: `Schau auf die Reihen: Es sind ${a} Reihen.` }] : []),
    ...(inRange(a - 1) ? [{ label: mal(a - 1, b), whyWrong: `Schau auf die Reihen: Es sind ${a} Reihen.` }] : []),
    ...(inRange(b + 1) ? [{ label: mal(a, b + 1), whyWrong: `Schau in eine Reihe: Dort sind ${b} Punkte.` }] : []),
    ...(inRange(b - 1) ? [{ label: mal(a, b - 1), whyWrong: `Schau in eine Reihe: Dort sind ${b} Punkte.` }] : []),
  ];
  return {
    key: `bild:${a}:${b}`,
    prompt,
    visual: punktefeld(a, b),
    answer: makeChoice(rng, { label: mal(a, b) }, wrongs),
    hints: ['Wie viele Reihen siehst du?', 'Wie viele Punkte stehen in einer Reihe?'],
    steps: [{ text: `Das Feld hat ${a} ${plural(a, 'Reihe', 'Reihen')} mit je ${b} ${plural(b, 'Punkt', 'Punkten')}.`, visual: punktefeld(a, b) }, `Das ist ${mal(a, b)}.`],
    praise: 'Du hast Reihen und Punkte im Feld gesehen.',
    srText: spoken(prompt),
  };
}

/** 4 · 5 and 5 · 4 have the same result. */
function tauschWaehlen(rng: Rng, a: number, b: number): Task {
  const prompt = `Welche Aufgabe hat das gleiche Ergebnis wie ${mal(a, b)}?`;
  const wrongs: ChoiceOption[] = [
    { label: `${a} + ${b}`, whyWrong: 'Das ist plus. Gesucht ist eine Malaufgabe.' },
    { label: mal(a, a), whyWrong: `Bei der Tauschaufgabe kommen beide Zahlen vor: ${a} und ${b}.` },
    { label: mal(b, b), whyWrong: `Bei der Tauschaufgabe kommen beide Zahlen vor: ${a} und ${b}.` },
  ];
  return {
    key: `tausch:${a}:${b}`,
    prompt,
    visual: punktefeld(a, b),
    answer: makeChoice(rng, { label: mal(b, a) }, wrongs),
    hints: ['Dreh das Punktefeld im Kopf.', 'Reihen werden zu Spalten. Die Zahl der Punkte bleibt gleich.'],
    steps: [{ text: `${mal(a, b)} ist ${a * b}.`, visual: punktefeld(a, b) }, `Die Tauschaufgabe ${mal(b, a)} ist auch ${a * b}.`],
    praise: 'Du hast die Tauschaufgabe gefunden.',
    srText: spoken(prompt),
  };
}

/** 7 · 0 = □ or 0 · 7 = □: outside the 100 facts, so no factKey. */
function malNull(n: number, nullFirst: boolean): Task {
  const expression = nullFirst ? `0 · ${n} = ${BOX}` : `${n} · 0 = ${BOX}`;
  return {
    key: `null:${n}:${nullFirst ? 'l' : 'r'}`,
    prompt: 'Rechne die Malaufgabe.',
    expression,
    answer: { kind: 'number', value: 0, label: 'Ergebnis' },
    hints: [nullFirst ? `0-mal die ${n}: Wie viele sind das?` : `${n}-mal gar nichts: Wie viel ist das?`, nullFirst ? 'Stell dir vor: Es gibt gar keinen Teller.' : 'Stell dir leere Teller vor.'],
    steps: [nullFirst ? `0-mal die ${n} ist gar nichts.` : `${n}-mal gar nichts bleibt nichts.`, `Also: ${nullFirst ? `0 · ${n}` : `${n} · 0`} = 0.`],
    bugs: bugList(0, [['mal-null', n, nullFirst ? `0-mal die ${n} bleibt nichts.` : `${n}-mal gar nichts bleibt nichts.`]]),
    praise: 'Du hast an die Regel mit der Null gedacht.',
    srText: spoken('Rechne die Malaufgabe.', expression),
  };
}

// ─── Stufe 3: strategy for the hard facts ─────────────────────────────────────

/** A Kernaufgabe split of the first factor of a hard fact: 7 · 8 = 5 · 8 + 2 · 8. */
function kernSplit(a: number, b: number): { k: number; m: number; sign: '+' | '−'; kp: number; mp: number } {
  const k = NEAREST[a];
  const m = Math.abs(a - k);
  return { k, m, sign: a > k ? '+' : '−', kp: k * b, mp: m * b };
}

/** Which Rechnung gives 7 · 8? */
function wegWaehlen(rng: Rng, a: number, b: number): Task {
  const p = a * b;
  const { k, m, sign, kp, mp } = kernSplit(a, b);
  const right = `${mal(k, b)} ${sign} ${mal(m, b)}`;
  const other = sign === '+' ? '−' : '+';
  const candidates: (ChoiceOption & { value: number })[] = [
    { label: `${mal(k, b)} ${sign} ${m}`, value: sign === '+' ? kp + m : kp - m, whyWrong: `Es geht um ${m}-mal die ${b}, nicht nur um ${m}.` },
    { label: `${mal(k, b)} ${other} ${mal(m, b)}`, value: sign === '+' ? kp - mp : kp + mp, whyWrong: `${a} ist ${sign === '+' ? 'mehr' : 'weniger'} als ${k}. Schau auf das Rechenzeichen.` },
    { label: `${a} + ${b}`, value: a + b, whyWrong: `${mal(a, b)} heißt ${a}-mal die ${b}.` },
    { label: `${mal(k, m)} + ${b}`, value: k * m + b, whyWrong: `Nimm die ${b} jedes Mal: ${k}-mal und ${m}-mal.` },
  ];
  const wrongs = candidates.filter((c) => c.value !== p).map(({ label, whyWrong }) => ({ label, whyWrong }));
  const prompt = `Welche Rechnung passt zu ${mal(a, b)}?`;
  return {
    key: `weg:${a}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [`Zerlege die ${a}: ${a} = ${k} ${sign} ${m}.`, `Dann nimmst du beide Teile mit ${b} mal.`],
    steps: [`${a} = ${k} ${sign} ${m}`, `${mal(a, b)} = ${right}`, `${kp} ${sign} ${mp} = ${p}`],
    praise: `Du hast ${mal(a, b)} in leichte Aufgaben zerlegt.`,
    srText: spoken(prompt),
  };
}

/** 8 · 7 = 5 · 7 + □ · 7 = 35 + □ = □ */
function zerlegen(a: number, b: number): Task {
  const p = a * b;
  const { k, m, sign, kp, mp } = kernSplit(a, b);
  const fields = [
    { id: 'm', value: m, before: `${mal(a, b)} = ${mal(k, b)} ${sign}`, after: `· ${b}`, label: 'Wie oft die Zahl dazu oder weg' },
    { id: 'mp', value: mp, before: `= ${kp} ${sign}`, label: 'Teilergebnis' },
    { id: 'e', value: p, before: '=', label: 'Ergebnis' },
  ];
  const prompt = 'Zerlege die Aufgabe und rechne.';
  return {
    key: `zerlegen:${a}:${b}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Nutze die Kernaufgabe ${mal(k, b)}. Wie weit ist es von ${k} bis ${a}?`, `Nimm diese Zahl mal ${b}. Rechne dann ${kp} ${sign} das Teilergebnis.`],
    steps: [`${a} = ${k} ${sign} ${m}`, `${mal(k, b)} = ${kp} und ${mal(m, b)} = ${mp}`, `${mal(a, b)} = ${mal(k, b)} ${sign} ${mal(m, b)} = ${kp} ${sign} ${mp} = ${p}`],
    bugs: multiBugs([{ id: 'nicht-malgenommen', match: { m, mp: m, e: sign === '+' ? kp + m : kp - m }, hint: `Nimm die ${m} noch mal: ${mal(m, b)}.` }], fields),
    praise: `Du hast ${mal(a, b)} in 2 leichte Aufgaben zerlegt.`,
    srText: spoken(prompt, spokenFields(fields)),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

/** A fact of the pool, chosen by the boxes, as [a, b]. */
function fact(rng: Rng, ctx: GenContext, stufe: Stufe): [number, number] {
  return factFactors(pickFact(rng, ctx, mulPool(stufe)));
}

/** A new fact gets its Punktefeld; without fact data about one fact in five does. */
function withDots(rng: Rng, ctx: GenContext, a: number, b: number): boolean {
  const fresh = isNewFact(`${a}x${b}`, ctx);
  return fresh === null ? rng.chance(0.2) : fresh;
}

const plain = (rng: Rng, ctx: GenContext, stufe: Stufe, dots: boolean): Task => {
  const [a, b] = fact(rng, ctx, stufe);
  return malAufgabe(a, b, dots && withDots(rng, ctx, a, b));
};

const gap = (rng: Rng, ctx: GenContext, stufe: Stufe): Task => {
  const [a, b] = fact(rng, ctx, stufe);
  return faktorLuecke(a, b, rng.chance(0.6));
};

function tausch(rng: Rng, ctx: GenContext, stufe: Stufe): Task {
  const [a, b] = fact(rng, ctx, stufe);
  // A square has no Tauschaufgabe, and a picture of 1 · 8 asks nothing.
  return a === b || a === 1 || b === 1 ? malAufgabe(a, b, false) : tauschWaehlen(rng, a, b);
}

/** For the three AB levels of a Stufe: which task forms (§6). Only forms that test recall carry a factKey. */
function task(rng: Rng, stufe: Stufe, ab: Ab, ctx: GenContext): Task {
  if (stufe === 1) {
    if (ab === 1) return plain(rng, ctx, 1, true);
    if (ab === 2) {
      if (rng.chance(0.6)) return plain(rng, ctx, 1, false);
      const [a, b] = fact(rng, ctx, 1);
      return a === 1 || b === 1 ? malAufgabe(a, b, false) : bildWaehlen(rng, a, b);
    }
    return rng.chance(0.5) ? tausch(rng, ctx, 1) : verdoppeln(...rng.pick(DOPPELT_STUFE1));
  }
  if (stufe === 2) {
    if (ab === 1) return plain(rng, ctx, 2, false);
    if (ab === 2) return gap(rng, ctx, 2);
    const roll = rng.next();
    if (roll < 0.5) return gap(rng, ctx, 2);
    if (roll < 0.8) {
      const a = rng.int(3, 9);
      return nachbar(a, a + (rng.chance(0.3) ? 1 : -1), rng.int(2, 9));
    }
    return malNull(rng.int(2, 9), rng.chance(0.5));
  }
  if (ab === 1) return plain(rng, ctx, 3, false);
  const [a, b] = fact(rng, ctx, 3);
  if (ab === 2) return rng.chance(0.6) ? wegWaehlen(rng, a, b) : faktorLuecke(a, b, rng.chance(0.5));
  return rng.chance(0.6) ? zerlegen(a, b) : wegWaehlen(rng, a, b);
}

export const einmaleinsSkill: SkillDef = {
  ...SKILL,
  title: 'Einmaleins sicher',
  description: 'Du weißt alle Malaufgaben und übst sie immer wieder.',
  stufen: {
    1: 'Kernaufgaben und Quadrataufgaben, immer gemischt',
    2: 'Alle 100 Malaufgaben, auch mit Lücke: □ · 7 = 56',
    3: 'Schwere Aufgaben: Welcher Rechenweg hilft bei 7 · 8?',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const asked = askedFact(ctx, false) ?? similarFact(rng, ctx, false);
    if (asked) {
      const [a, b] = factFactors(asked);
      return finish(SKILL, stufe, ctx.ab ?? 1, KMK, malAufgabe(a, b, false));
    }
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, task(rng, stufe, ab, ctx));
  },
};


