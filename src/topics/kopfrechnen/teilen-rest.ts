import { BOX } from '../../core/format';
import type { Ab, Bug, MultiField, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { multiBugs, pickPerson, probeLine, restAnswer, targetAb } from '../shared';
import { durch, finish, gruppen, loseGruppen, mal, spoken, spokenFields, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.teilen-rest', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.rest'];

interface Teilung {
  p: number;
  d: number;
  q: number;
  r: number;
}

function teilung(rng: Rng, minD: number, maxD: number, restZero = false): Teilung {
  const d = rng.int(minD, maxD);
  const q = rng.int(2, 9);
  const r = restZero ? 0 : rng.int(1, d - 1);
  return { p: q * d + r, d, q, r };
}

/** 'Bis 17 fehlen noch 2.' */
const fehlt = (p: number, r: number) => `Bis ${p} ${r === 1 ? 'fehlt' : 'fehlen'} noch ${r}.`;

/** Division with Rest, all the §5 bugs that compute from it. rest-komma needs a comma key, which these items do not have. */
function restBugs({ p, d, q, r }: Teilung): (Bug | false)[] {
  const check = `${mal(q, d)} sind ${q * d}.`;
  return [
    { id: 'rest-zu-gross', match: { q: q - 1, r: r + d }, hint: `Der Rest muss kleiner als ${d} sein.` },
    r > 0 && { id: 'rest-vergessen', match: { q, r: 0 }, hint: `Prüfe: ${check} ${fehlt(p, r)}` },
    { id: 'rest-ueber', match: { q: q + 1, r: (q + 1) * d - p }, hint: `${mal(q + 1, d)} sind ${(q + 1) * d}. Das ist schon mehr als ${p}.` },
    r > 0 && q !== r && { id: 'rest-getauscht', match: { q: r, r: q }, hint: 'Zuerst kommt das Ergebnis, dann der Rest.' },
  ];
}

function restSteps({ p, d, q, r }: Teilung): Step[] {
  const near: Step = { text: `${mal(q, d)} = ${q * d}. Das passt noch in ${p}.`, visual: gruppen(q, d, r) };
  return [near, r > 0 ? `${p} − ${q * d} = ${r}. Es ${r === 1 ? 'bleibt' : 'bleiben'} ${r} übrig.` : 'Es bleibt nichts übrig.', `Probe: ${probeLine(q, d, r)}.`, `${durch(p, d)} = ${q} Rest ${r}`];
}

/** The same words with and without a Rest: a hint that changes with the Rest would give it away. */
function restHints({ p, d }: Teilung): string[] {
  return [`Welche Malaufgabe mit der ${d} passt gerade noch in ${p}?`, `Rechne dann: Wie viel fehlt noch bis ${p}? Das ist der Rest.`];
}

/** 17 : 5 = □ Rest □ */
function teilenMitRest(t: Teilung, picture: 'gruppen' | 'lose' | null): Task {
  const { p, d, q, r } = t;
  const expression = `${durch(p, d)} = ${BOX} Rest ${BOX}`;
  const answer = restAnswer(q, r);
  const visual = picture === 'gruppen' ? gruppen(q, d, r) : picture === 'lose' ? loseGruppen(p) : undefined;
  const prompt = 'Teile und gib den Rest an.';
  return {
    // With or without a picture it is the same task: the key leaves the picture out, so that a round does not ask it twice.
    key: `rest:${p}:${d}`,
    prompt,
    expression,
    ...(visual ? { visual } : {}),
    answer,
    hints: restHints(t),
    steps: restSteps(t),
    bugs: multiBugs(restBugs(t), answer.fields),
    praise: 'Du hast geteilt und den Rest geprüft.',
    srText: spoken(prompt, expression),
  };
}

/** A story: share out, what is left? */
function verteilen(rng: Rng, t: Teilung, picture: boolean): Task {
  const { p, d, q, r } = t;
  const person = pickPerson(rng);
  const fields: MultiField[] = [
    { id: 'q', value: q, before: 'Jedes Kind bekommt', after: 'Stifte', label: 'Stifte für jedes Kind' },
    { id: 'r', value: r, before: 'Stifte übrig:', label: 'Stifte übrig' },
  ];
  const context = `${person.name} verteilt ${p} Stifte an ${d} Kinder. Jedes Kind bekommt gleich viele.`;
  const prompt = 'Wie viele Stifte bekommt jedes Kind und wie viele bleiben übrig?';
  return {
    key: `story:${person.name}:${p}:${d}`,
    context,
    prompt,
    ...(picture ? { visual: loseGruppen(p) } : {}),
    answer: { kind: 'multi', fields },
    hints: restHints(t),
    steps: restSteps(t),
    bugs: multiBugs(restBugs(t), fields),
    praise: 'Du hast verteilt und den Rest gefunden.',
    srText: spoken(context, prompt, spokenFields(fields)),
  };
}

/** 59 : 8 = 7 Rest □: the Rest alone. */
function restZuerst(t: Teilung): Task {
  const { p, d, q, r } = t;
  const expression = `${durch(p, d)} = ${q} Rest ${BOX}`;
  // No words around the field: the expression already says 'Rest □', and the voice would read a second gap (T17).
  const fields: MultiField[] = [{ id: 'r', value: r, label: 'Rest' }];
  const prompt = 'Finde den Rest.';
  return {
    key: `nur-rest:${p}:${d}`,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [`Rechne ${mal(q, d)}.`, `Wie viel fehlt dann noch bis ${p}?`],
    steps: restSteps(t),
    bugs: multiBugs(
      [
        { id: 'rest-nicht-abgezogen', match: { r: q * d }, hint: `Das ist ${mal(q, d)}. Wie viel fehlt noch bis ${p}?` },
        r > 0 && { id: 'rest-vergessen', match: { r: 0 }, hint: `Prüfe: ${mal(q, d)} sind ${q * d}. ${fehlt(p, r)}` },
      ],
      fields,
    ),
    praise: 'Du hast den Rest von der Malaufgabe aus gefunden.',
    srText: spoken(prompt, expression),
  };
}

/** The Probe: 3 · 5 + 2 worked out in two fields. */
function probeRechnen(t: Teilung): Task {
  const { p, d, q, r } = t;
  const expression = `${durch(p, d)} = ${q} Rest ${r}`;
  const fields: MultiField[] = [
    { id: 'm', value: q * d, before: `${mal(q, d)} =`, label: 'Malaufgabe' },
    { id: 's', value: p, before: `Dazu der Rest ${r}:`, label: 'Mit Rest' },
  ];
  const prompt = 'Mach die Probe.';
  return {
    key: `probe:${p}:${d}`,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [`Rechne zuerst ${mal(q, d)}.`, `Dann kommt der Rest ${r} dazu.`],
    steps: [`Probe: ${probeLine(q, d, r)}.`, `${q * d} + ${r} = ${p}. Das ist die Zahl aus der Aufgabe: Die Probe stimmt.`],
    bugs: multiBugs([{ id: 'rest-vergessen', match: { s: q * d }, hint: `Denk auch an den Rest ${r}.` }], fields),
    praise: 'Du hast die Rechnung mit der Probe geprüft.',
    srText: spoken(prompt, expression, spokenFields(fields)),
  };
}

/** □ : 5 = 3 Rest 2: the number before the sign. */
function zahlFinden(t: Teilung): Task {
  const { p, d, q, r } = t;
  const expression = `${BOX} : ${d} = ${q} Rest ${r}`;
  // No words around the field: the □ in the expression is the gap, and the voice would read a second one (T17).
  const fields: MultiField[] = [{ id: 'n', value: p, label: 'Zahl in der Lücke' }];
  const prompt = 'Welche Zahl gehört in die Lücke?';
  return {
    key: `zahl:${p}:${d}`,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [`Rechne rückwärts: ${mal(q, d)}.`, `Dann kommt der Rest ${r} dazu.`],
    steps: [`Umkehraufgabe: ${mal(q, d)} = ${q * d}.`, `Probe: ${probeLine(q, d, r)}.`, `Die Zahl ist ${p}.`],
    bugs: multiBugs([{ id: 'rest-vergessen', match: { n: q * d }, hint: `Denk auch an den Rest: ${mal(q, d)} und ${r} dazu.` }], fields),
    praise: 'Du hast aus Malaufgabe und Rest die Zahl gefunden.',
    srText: spoken(prompt, expression),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng) => Task)[]>> = {
  1: {
    1: [(rng) => teilenMitRest(teilung(rng, 2, 5), 'gruppen')],
    2: [(rng) => teilenMitRest(teilung(rng, 2, 5), 'lose')],
    3: [(rng) => verteilen(rng, teilung(rng, 3, 5), true)],
  },
  2: {
    1: [(rng) => teilenMitRest(teilung(rng, 2, 9), null)],
    2: [(rng) => teilenMitRest(teilung(rng, 3, 9), null), (rng) => teilenMitRest(teilung(rng, 6, 9), null)],
    3: [(rng) => verteilen(rng, teilung(rng, 3, 9), false), (rng) => teilenMitRest(teilung(rng, 4, 9, true), null)],
  },
  3: {
    1: [(rng) => teilenMitRest(teilung(rng, 3, 9), null)],
    2: [(rng) => restZuerst(teilung(rng, 3, 9)), (rng) => probeRechnen(teilung(rng, 3, 9))],
    3: [(rng) => zahlFinden(teilung(rng, 3, 9)), (rng) => teilenMitRest(teilung(rng, 4, 9, true), null), (rng) => restZuerst(teilung(rng, 6, 9))],
  },
};

export const teilenRestSkill: SkillDef = {
  ...SKILL,
  title: 'Teilen mit Rest',
  description: 'Du teilst und schaust, was übrig bleibt.',
  stufen: {
    1: 'Zahlen bis 50, geteilt durch 2 bis 5, mit Bild',
    2: 'Zahlen bis 90, geteilt durch 2 bis 9',
    3: 'Den Rest zuerst finden und die Probe rechnen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, rng.pick(FORMS[stufe][ab])(rng));
  },
};
