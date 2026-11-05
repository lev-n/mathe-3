import { BOX } from '../../core/format';
import { divFactKeyOf, factFactors } from '../../state/facts';
import type { Ab, ChoiceOption, GenContext, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, makeChoice, multiBugs, pickPerson, targetAb } from '../shared';
import { askedFact, divPool, pickFact, searchHint, searchSteps, similarFact } from './facts';
import { durch, finish, gruppen, mal, spoken, spokenFields, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.umkehren', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.einmaleins'];

function teilenBugs(q: number, d: number, p: number) {
  return bugList(q, [
    ['nachbar', q > 1 ? q - 1 : null, `${mal(q - 1, d)} = ${(q - 1) * d}. Das ist noch zu wenig für ${p}.`],
    ['nachbar', q < 10 ? q + 1 : null, `${mal(q + 1, d)} = ${(q + 1) * d}. Das ist schon zu viel für ${p}.`],
    ['minus-gerechnet', p - d, `Das ist minus. Geteilt heißt: Wie oft passt die ${d} in ${p}?`],
    ['teiler-abgeschrieben', d, `Prüfe: ${mal(d, d)} = ${d * d}. Das passt nicht zu ${p}.`],
  ]);
}

/** p : d = □ */
export function geteiltAufgabe(p: number, d: number): Task {
  const q = p / d;
  const expression = `${durch(p, d)} = ${BOX}`;
  return {
    key: `geteilt:${p}:${d}`,
    prompt: 'Rechne die Geteiltaufgabe.',
    expression,
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: [`Denk an die Malaufgabe: ${BOX} · ${d} = ${p}.`, searchHint(q, d, p)],
    steps: [`Malaufgabe: ${BOX} · ${d} = ${p}.`, ...searchSteps(q, d), `Also: ${durch(p, d)} = ${q}.`],
    bugs: teilenBugs(q, d, p),
    praise: `Du hast die Malaufgabe mit der ${d} genutzt.`,
    srText: spoken('Rechne die Geteiltaufgabe.', expression),
    factKey: divFactKeyOf(p, d),
  };
}

/** p : □ = q, the missing divisor: the same fact as p : d. */
function teilerLuecke(p: number, d: number): Task {
  const q = p / d;
  const expression = `${p} : ${BOX} = ${q}`;
  return {
    key: `teiler:${p}:${d}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: d, label: 'Zahl in der Lücke' },
    hints: [`Denk an die Malaufgabe: ${q} · ${BOX} = ${p}.`, `Wie oft passt die ${q} in die ${p}?`],
    steps: [`Malaufgabe: ${q} · ${BOX} = ${p}.`, `Dazu passt ${mal(q, d)} = ${p}.`, `Also: ${durch(p, d)} = ${q}.`],
    bugs: bugList(d, [
      ['nachbar', d > 1 ? d - 1 : null, `${mal(q, d - 1)} = ${q * (d - 1)}. Das ist noch zu wenig für ${p}.`],
      ['nachbar', d < 10 ? d + 1 : null, `${mal(q, d + 1)} = ${q * (d + 1)}. Das ist schon zu viel für ${p}.`],
      ['minus-gerechnet', p - q, `Das ist minus. Hier suchst du eine Malaufgabe mit der ${q}.`],
      ['ergebnis-abgeschrieben', q, `Prüfe: ${mal(q, q)} = ${q * q}. Das passt nicht zu ${p}.`],
    ]),
    praise: 'Du hast die fehlende Zahl mit der Malaufgabe gefunden.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
    factKey: divFactKeyOf(p, d),
  };
}

/** Stories: p things shared out, or groups of d. A group of 1 makes no story, so that fact stays a plain task. */
function verteilen(rng: Rng, p: number, d: number): Task {
  if (d === 1) return geteiltAufgabe(p, d);
  const q = p / d;
  const person = pickPerson(rng);
  const kind = rng.int(0, 2);
  const context = [
    `${person.name} verteilt ${p} Stifte an ${d} Kinder. Jedes Kind bekommt gleich viele Stifte.`,
    `Die Bücherei hat ${p} neue Bücher. Auf jeden Stapel kommen ${d} Bücher.`,
    `Beim Ausflug fahren ${p} Kinder mit. In jedes Boot passen ${d} Kinder.`,
  ][kind];
  const prompt = ['Wie viele Stifte bekommt jedes Kind?', 'Wie viele Stapel gibt es?', 'Wie viele Boote brauchen die Kinder?'][kind];
  const unit = ['Stifte', 'Stapel', 'Boote'][kind];
  return {
    key: `story:${kind}:${kind === 0 ? person.name : ''}:${p}:${d}`,
    context,
    prompt,
    answer: { kind: 'number', value: q, unit, label: unit },
    hints: [`Das ist die Aufgabe ${durch(p, d)}.`, searchHint(q, d, p)],
    steps: [`Rechne ${durch(p, d)}.`, ...searchSteps(q, d), `Also: ${durch(p, d)} = ${q}.`],
    bugs: teilenBugs(q, d, p),
    praise: 'Du hast die Geschichte als Geteiltaufgabe gesehen.',
    srText: spoken(context, prompt),
    kmk: ['ZO.einmaleins', 'ZO.sachrechnen'],
    factKey: divFactKeyOf(p, d),
  };
}

// ─── Forms that show the Malaufgabe (no factKey) ──────────────────────────────

/** 7 · 5 = 35, also 35 : 5 = □, with the groups as a picture. */
function ausMalaufgabe(q: number, d: number): Task {
  const p = q * d;
  const expression = `${mal(q, d)} = ${p}, also ${durch(p, d)} = ${BOX}`;
  return {
    key: `aus-mal:${p}:${d}`,
    prompt: 'Nutze die Malaufgabe.',
    expression,
    visual: gruppen(q, d),
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: [`${p} geteilt durch ${d} heißt: Wie oft passt die ${d} in ${p}?`, 'Die Malaufgabe steht schon da. Lies die erste Zahl.'],
    steps: [{ text: `${mal(q, d)} = ${p} heißt: ${q}-mal die ${d}.`, visual: gruppen(q, d) }, `Also: ${durch(p, d)} = ${q}.`],
    bugs: teilenBugs(q, d, p),
    praise: 'Du hast die Malaufgabe umgekehrt.',
    srText: spoken('Nutze die Malaufgabe.', expression),
  };
}

/** □ : d = q: the number before the sign is missing. */
function zahlLuecke(q: number, d: number): Task {
  const p = q * d;
  const expression = `${BOX} : ${d} = ${q}`;
  return {
    key: `zahl:${p}:${d}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: p, label: 'Zahl in der Lücke' },
    hints: ['Rechne rückwärts mit der Malaufgabe.', `Welche Zahl geteilt durch ${d} ergibt ${q}? Rechne ${mal(q, d)}.`],
    steps: [`Umkehraufgabe: ${mal(q, d)} = ${p}.`, `Also: ${durch(p, d)} = ${q}.`],
    bugs: bugList(p, [
      ['plus-gerechnet', q + d, `Das ist plus. Rechne ${mal(q, d)}.`],
      ['minus-gerechnet', q > d ? q - d : null, `Das ist minus. Rechne ${mal(q, d)}.`],
      ['nachbar', (q - 1) * d > 0 ? (q - 1) * d : null, `${(q - 1) * d} : ${d} = ${q - 1}, nicht ${q}.`],
      ['nachbar', (q + 1) * d, `${(q + 1) * d} : ${d} = ${q + 1}, nicht ${q}.`],
    ]),
    praise: 'Du hast mit der Malaufgabe rückwärts gerechnet.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

/** Which Malaufgabe helps with p : d? */
function hilfeWaehlen(rng: Rng, q: number, d: number): Task {
  const p = q * d;
  const near = (x: number) => ({ label: `${mal(x, d)} = ${x * d}`, whyWrong: `${x * d} ist nicht ${p}. Diese Aufgabe passt nicht.` });
  const wrongs: ChoiceOption[] = [
    ...(q < 10 ? [near(q + 1)] : []),
    ...(q > 1 ? [near(q - 1)] : []),
    { label: `${p} − ${d} = ${p - d}`, whyWrong: 'Zu einer Geteiltaufgabe passt eine Malaufgabe, keine Minusaufgabe.' },
    ...(d !== q ? [{ label: `${mal(d, d)} = ${d * d}`, whyWrong: `${d * d} ist nicht ${p}. Diese Aufgabe passt nicht.` }] : []),
  ];
  const prompt = `Welche Malaufgabe hilft bei ${durch(p, d)}?`;
  return {
    key: `hilfe:${p}:${d}`,
    prompt,
    answer: makeChoice(rng, { label: `${mal(q, d)} = ${p}` }, wrongs),
    hints: ['Geteilt und mal gehören zusammen.', `Suche die Malaufgabe mit dem Ergebnis ${p}.`],
    steps: [`${durch(p, d)} = ${BOX} gehört zu ${BOX} · ${d} = ${p}.`, `${mal(q, d)} = ${p}, also ${durch(p, d)} = ${q}.`],
    praise: 'Du hast die passende Malaufgabe gefunden.',
    srText: spoken(prompt),
  };
}

/** a : a = 1: a rule, no tracked fact. */
function durchSichSelbst(a: number): Task {
  const expression = `${durch(a, a)} = ${BOX}`;
  return {
    key: `selbst:${a}`,
    prompt: 'Rechne die Geteiltaufgabe.',
    expression,
    answer: { kind: 'number', value: 1, label: 'Ergebnis' },
    hints: [`Wie oft passt die ${a} in die ${a}?`, `Denk an die Malaufgabe: ${BOX} · ${a} = ${a}.`],
    steps: [`Die ${a} passt genau einmal in die ${a}.`, `Also: ${durch(a, a)} = 1.`],
    bugs: bugList(1, [
      ['teiler-abgeschrieben', a, `Prüfe: ${mal(a, a)} ist viel mehr als ${a}.`],
      ['minus-gerechnet', 0, `Das ist minus. Geteilt heißt: Wie oft passt die ${a}?`],
    ]),
    praise: 'Du hast gesehen: Die Zahl passt genau einmal.',
    srText: spoken('Rechne die Geteiltaufgabe.', expression),
  };
}

/** Aufgabenfamilie of four, from a Malaufgabe or a Geteiltaufgabe. */
function familie(a: number, b: number, fromDivision: boolean): Task {
  const p = a * b;
  const expression = fromDivision ? `${durch(p, b)} = ${a}` : `${mal(a, b)} = ${p}`;
  const fields = fromDivision
    ? [
        { id: 'm1', value: p, before: `${mal(a, b)} =`, label: 'Malaufgabe' },
        { id: 'm2', value: p, before: `${mal(b, a)} =`, label: 'Tauschaufgabe' },
        { id: 'u', value: b, before: `${durch(p, a)} =`, label: 'Zweite Geteiltaufgabe' },
      ]
    : [
        { id: 'm2', value: p, before: `${mal(b, a)} =`, label: 'Tauschaufgabe' },
        { id: 'u', value: b, before: `${durch(p, a)} =`, label: 'Erste Geteiltaufgabe' },
        { id: 'v', value: a, before: `${durch(p, b)} =`, label: 'Zweite Geteiltaufgabe' },
      ];
  const swapped: Record<string, number> = fromDivision ? { u: a } : { u: a, v: b };
  const prompt = 'Ergänze die Aufgabenfamilie.';
  const teilen = `Teile ${p} durch eine der anderen Zahlen. Das Ergebnis ist die dritte Zahl.`;
  return {
    key: `familie:${a}:${b}:${fromDivision ? 'g' : 'm'}`,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Bei der Tauschaufgabe bleibt das Ergebnis gleich.', teilen],
    steps: [`Die Familie hat die Zahlen ${a}, ${b} und ${p}.`, `${fields.map((f) => `${f.before} ${f.value}`).join('; ')}.`],
    bugs: multiBugs([{ id: 'familie-vertauscht', match: swapped, hint: teilen }], fields),
    praise: 'Du hast alle Aufgaben der Familie gefunden.',
    srText: spoken(prompt, expression, spokenFields(fields)),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

function fact(rng: Rng, ctx: GenContext, stufe: Stufe): [p: number, d: number, q: number] {
  const [p, d] = factFactors(pickFact(rng, ctx, divPool(stufe)));
  return [p, d, p / d];
}

/** Two different factors above 1 for a family. */
function familienFaktoren(rng: Rng): [number, number] {
  const a = rng.int(2, 9);
  let b = rng.int(2, 9);
  if (b === a) b = a === 9 ? 8 : a + 1;
  return [a, b];
}

function task(rng: Rng, stufe: Stufe, ab: Ab, ctx: GenContext): Task {
  const [p, d, q] = fact(rng, ctx, stufe);
  if (stufe === 1) {
    if (ab === 1) return geteiltAufgabe(p, d);
    if (ab === 2) return rng.chance(0.5) ? ausMalaufgabe(q, d) : geteiltAufgabe(p, d);
    return rng.chance(0.5) ? hilfeWaehlen(rng, q, d) : zahlLuecke(q, d);
  }
  if (stufe === 2) {
    if (ab === 1) return geteiltAufgabe(p, d);
    if (ab === 2) {
      const roll = rng.next();
      if (roll < 0.15) return durchSichSelbst(rng.int(2, 10));
      return roll < 0.75 ? geteiltAufgabe(p, d) : verteilen(rng, p, d);
    }
    const roll = rng.next();
    if (roll < 0.4) return verteilen(rng, p, d);
    return roll < 0.7 ? zahlLuecke(q, d) : hilfeWaehlen(rng, q, d);
  }
  if (ab === 1) return geteiltAufgabe(p, d);
  if (ab === 2) {
    const [a, b] = familienFaktoren(rng);
    return familie(a, b, rng.chance(0.3));
  }
  return rng.chance(0.65) ? teilerLuecke(p, d) : familie(...familienFaktoren(rng), true);
}

export const umkehrenSkill: SkillDef = {
  ...SKILL,
  title: 'Geteiltaufgaben sicher',
  description: 'Du findest zu jeder Malaufgabe die Geteiltaufgabe.',
  stufen: {
    1: 'Geteilt durch 1, 2, 5 und 10',
    2: 'Alle 90 Geteiltaufgaben, geteilt durch 1 bis 10',
    3: 'Aufgabenfamilien und Lücken: 56 : □ = 7',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const asked = askedFact(ctx, true) ?? similarFact(rng, ctx, true);
    if (asked) {
      const [p, d] = factFactors(asked);
      return finish(SKILL, stufe, ctx.ab ?? 1, KMK, geteiltAufgabe(p, d));
    }
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, task(rng, stufe, ab, ctx));
  },
};
