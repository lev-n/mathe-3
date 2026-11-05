/**
 * Passt das? (docs/research.md §6).
 * AB I: is a result plausible? A claim about a real thing, or a shopping result to check.
 * AB II: an extra number the question does not need: name it, or calculate without it.
 * AB III: Nicht lösbar and Kapitänsaufgabe. On Stufe 3 a number task with "Nicht lösbar" (F17), and solvable ones in the mix so that
 * the button is a real decision. On Stufe 1 and 2 the same stories as a choice, as the button belongs to Stufe 3 only.
 */
import { MINUS, TIMES, fmtQty } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, targetAb } from '../shared';
import { EXTRA_STORIES, HEFT_EURO, HINT, WANDERTAG_KM, answerStep, euro, sentenceAnswer, spoken, storyNumber } from './helpers';

const SKILL = { id: 'sachaufgaben.frage-pruefen', topicId: 'sachaufgaben' } as const;
const KMK = ['ZO.sachrechnen', 'PK.argumentieren', 'GM.vorstellung'];

const YES = 'Ja, das kann stimmen.';
const TOO_MUCH = 'Nein, das ist viel zu viel.';
const TOO_LITTLE = 'Nein, das ist viel zu wenig.';

type Verdict = 'ok' | 'much' | 'little';

const LABEL: Readonly<Record<Verdict, string>> = { ok: YES, much: TOO_MUCH, little: TOO_LITTLE };

interface Claim {
  id: string;
  text: (shown: string, name: string) => string;
  /** A sensible number, its unit, and the units that make the same number far too much or far too little. */
  value: (rng: Rng) => number;
  ok: string;
  much?: string;
  little?: string;
  /** The first Stufe that knows the `little` unit: seconds belong to Stufe 3 (§2.2). */
  littleFrom?: Stufe;
  /** The real thing, for the hint: 'Stell dir <thing> vor.' */
  thing: string;
  /** What a sensible value looks like, in the worked step. */
  sense: string;
}

const CLAIMS: readonly Claim[] = [
  { id: 'bleistift', text: (s, n) => `${n} misst einen Bleistift. ${n} sagt: Der Bleistift ist ${s} lang.`, value: (r) => r.int(12, 19), ok: 'cm', much: 'm', little: 'mm', thing: 'einen echten Bleistift', sense: 'Ein Bleistift ist etwa so lang wie deine Hand.' },
  { id: 'apfel', text: (s) => `Ein Apfel liegt auf der Waage. Die Waage zeigt ${s}.`, value: (r) => r.int(12, 25) * 10, ok: 'g', much: 'kg', thing: 'einen echten Apfel', sense: 'Ein Apfel wiegt etwa 150 g.' },
  { id: 'schulweg', text: (s, n) => `${n} geht zu Fuß zur Schule. Der Weg dauert ${s}.`, value: (r) => r.int(5, 25), ok: 'min', much: 'h', little: 's', littleFrom: 3, thing: 'deinen Schulweg', sense: 'Ein Schulweg dauert einige Minuten.' },
  { id: 'wandern', text: (s) => `Die Klasse wandert an einem Tag ${s}.`, value: (r) => r.int(WANDERTAG_KM[0], WANDERTAG_KM[1]), ok: 'km', little: 'cm', thing: 'einen Wandertag', sense: 'An einem Wandertag gehst du einige Kilometer.' },
];

/** The claim about a real thing. */
function behauptung(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const claim = rng.pick(CLAIMS);
  const { name } = pickPerson(rng);
  const n = claim.value(rng);
  const little = claim.little !== undefined && stufe >= (claim.littleFrom ?? 1);
  const verdict = rng.pick<Verdict>(['ok', ...(claim.much ? (['much'] as const) : []), ...(little ? (['little'] as const) : [])]);
  const unit = (verdict === 'ok' ? claim.ok : verdict === 'much' ? claim.much : claim.little) as string;
  const shown = fmtQty(n, unit);
  const context = claim.text(shown, name);
  const prompt = 'Kann das stimmen?';
  const others: ChoiceOption[] = (['ok', 'much', 'little'] as const)
    .filter((v) => v !== verdict)
    .map((v) => ({ label: LABEL[v], whyWrong: `Stell dir ${claim.thing} vor. Passt ${shown} dazu?` }));
  return build(SKILL, stufe, {
    key: `sinn:${claim.id}:${n}:${unit}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: LABEL[verdict] }, others),
    hints: [`Stell dir ${claim.thing} vor.`, 'Schau genau auf die Einheit.'],
    steps: [claim.sense, verdict === 'ok' ? `${shown} passt dazu. Das kann stimmen.` : verdict === 'much' ? `${shown} ist viel zu viel.` : `${shown} ist viel zu wenig.`],
    praise: 'Du hast an die echte Sache gedacht.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** A shopping result to check by rough calculation. */
function ergebnisPruefen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const k = rng.int(HEFT_EURO[0], HEFT_EURO[1]);
  const n = rng.int(2, 9);
  const value = n * k;
  const verdict = rng.pick<Verdict>(['ok', 'much', 'little']);
  // ten times the price is far too much, and stays up to 1000 (§2.4)
  const claim = verdict === 'ok' ? value : verdict === 'much' ? value * 10 : 1;
  const context = `${name} kauft ${n} Hefte. Jedes Heft kostet ${euro(k)}. Die Kasse zeigt ${euro(claim)}.`;
  const prompt = 'Kann das stimmen?';
  const others: ChoiceOption[] = (['ok', 'much', 'little'] as const)
    .filter((v) => v !== verdict)
    .map((v) => ({ label: LABEL[v], whyWrong: v === 'ok' ? HINT.unsinnig : `Rechne nach: ${n} ${TIMES} ${euro(k)}. Passt das?` }));
  return build(SKILL, stufe, {
    key: `kasse:${n}:${k}:${claim}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: LABEL[verdict] }, others),
    hints: [`Wie viel kosten ${n} Hefte ungefähr?`, 'Vergleiche dein Ergebnis mit der Kasse.'],
    steps: [`Rechnung: ${n} ${TIMES} ${euro(k)} = ${euro(value)}`, verdict === 'ok' ? `Die Kasse zeigt ${euro(claim)}. Das kann stimmen.` : `Die Kasse zeigt ${euro(claim)}. Das ist viel zu ${verdict === 'much' ? 'viel' : 'wenig'}.`],
    praise: 'Du hast das Ergebnis mit deiner Rechnung geprüft.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB II, first kind: which number is not needed? */
function welcheZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(EXTRA_STORIES);
  const { name } = pickPerson(rng);
  const a = storyNumber(rng, stufe, 200, 700);
  const b = storyNumber(rng, stufe, 30, 190);
  const x = rng.int(story.x[0], story.x[1]);
  const context = story.text(a, b, x, name);
  const prompt = `Welche Zahl brauchst du nicht für ${story.goal(name)}?`;
  const value = story.op === '+' ? a + b : a - b;
  const sign = story.op === '+' ? '+' : MINUS;
  const whyWrong = `Die Rechnung braucht ${a} und ${b}. Sonst fehlt ein Teil.`;
  return build(SKILL, stufe, {
    key: `welche:${story.id}:${a}:${b}:${x}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: String(x) }, [{ label: String(a), whyWrong }, { label: String(b), whyWrong }]),
    hints: [HINT.alleZahlen, 'Was zählt jede Zahl? Geht es in der Frage darum?'],
    steps: [`Die ${x} zählt ${story.what}.`, `Rechnung: ${a} ${sign} ${b} = ${value}`, `Du brauchst die ${x} nicht.`],
    praise: 'Du hast die Zahlen an der Frage geprüft.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

/** AB II, second kind: calculate without the extra number. */
function ohneExtraZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(EXTRA_STORIES);
  const { name } = pickPerson(rng);
  const a = storyNumber(rng, stufe, 200, 700);
  const b = storyNumber(rng, stufe, 30, 190);
  const x = rng.int(story.x[0], story.x[1]);
  const value = story.op === '+' ? a + b : a - b;
  const context = story.text(a, b, x, name);
  const prompt = story.question(name);
  const before = story.before(name);
  const sign = story.op === '+' ? '+' : MINUS;
  return build(SKILL, stufe, {
    key: `ohne:${story.id}:${a}:${b}:${x}`,
    ab,
    context,
    prompt,
    answer: sentenceAnswer(value, before, story.after, prompt),
    hints: [HINT.alleZahlen, 'Lies die Frage zuerst. Dann such die passenden Zahlen.'],
    steps: [`Die ${x} zählt ${story.what}. Danach fragt die Geschichte nicht.`, `Rechnung: ${a} ${sign} ${b} = ${value}`, answerStep(before, String(value), story.after)],
    bugs: numberBugs(
      [
        { id: 'alle-zahlen', match: a + b + x, hint: HINT.alleZahlen },
        { id: 'alle-zahlen', match: value + x, hint: HINT.alleZahlen },
        { id: 'alle-zahlen', match: value - x, hint: HINT.alleZahlen },
      ],
      value,
    ),
    praise: 'Du hast nur die passenden Zahlen benutzt.',
    srText: spoken(context, prompt),
    kmk: KMK,
  });
}

interface Open {
  id: string;
  text: (a: number, b: number, name: string) => string;
  question: (name: string) => string;
  before: (name: string) => string;
  after: string;
  missing: string;
  /** For the choice form: 'Du suchst <goal>.' */
  goal: string;
  /** Two numbers of the story, for a calculation that is no answer. */
  numbers: 'zwei' | 'eine';
}

/** Stories with no way to the answer: Kapitänsaufgaben, and tasks with a gap. */
const OPEN: readonly Open[] = [
  { id: 'kapitaen', numbers: 'zwei', text: (a, b) => `Auf einem Schiff sind ${a} Schafe und ${b} Ziegen.`, question: () => 'Wie alt ist der Kapitän?', before: () => 'Der Kapitän ist', after: 'Jahre alt.', missing: 'Das Alter steht nicht in der Geschichte.', goal: 'das Alter vom Kapitän' },
  { id: 'fahrer', numbers: 'zwei', text: (a, b) => `Im Bus sitzen ${a} Kinder. An der Haltestelle steigen ${b} Kinder ein.`, question: () => 'Wie alt ist der Busfahrer?', before: () => 'Der Busfahrer ist', after: 'Jahre alt.', missing: 'Das Alter steht nicht in der Geschichte.', goal: 'das Alter vom Busfahrer' },
  { id: 'hefte', numbers: 'eine', text: (a, _b, n) => `${n} kauft ${a} Hefte.`, question: (n) => `Wie viel Euro bezahlt ${n}?`, before: (n) => `${n} bezahlt`, after: '€.', missing: 'Der Preis fehlt.', goal: 'den ganzen Preis' },
  { id: 'freund', numbers: 'eine', text: (a, _b, n) => `${n} hat ${a} Karten. Ben hat mehr Karten als ${n}.`, question: () => 'Wie viele Karten hat Ben?', before: () => 'Ben hat', after: 'Karten.', missing: 'Die Zahl für Ben fehlt.', goal: 'die Karten von Ben' },
];

const UNSOLVABLE_HINT = 'Steht alles für die Frage in der Geschichte?';

/** Numbers of an open story: sensible for the story. */
function openNumbers(rng: Rng, story: Open): { a: number; b: number } {
  if (story.id === 'kapitaen') return { a: rng.int(12, 40), b: rng.int(3, 11) };
  if (story.id === 'fahrer') return { a: rng.int(12, 30), b: rng.int(2, 9) };
  if (story.id === 'hefte') return { a: rng.int(2, 9), b: 0 };
  return { a: 10 * rng.int(2, 30), b: 0 };
}

function offen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const story = rng.pick(OPEN);
  const { name } = pickPerson(rng);
  const { a, b } = openNumbers(rng, story);
  const who = story.id === 'freund' && name === 'Ben' ? 'Mia' : name;
  const context = story.text(a, b, who);
  const prompt = story.question(who);
  const before = story.before(who);
  const key = `offen:${story.id}:${a}:${b}`;
  if (stufe === 3) {
    return build(SKILL, stufe, {
      key,
      ab,
      context,
      prompt,
      answer: sentenceAnswer(null, before, story.after, prompt, { offerUnsolvable: true }),
      hints: [UNSOLVABLE_HINT, 'Welche Angabe brauchst du für die Frage?'],
      steps: [story.missing, 'Die Aufgabe ist nicht lösbar.'],
      bugs: numberBugs(
        story.numbers === 'zwei'
          ? [
              { id: 'angaben-pruefen', match: a + b, hint: 'Die Zahlen zählen etwas anderes. Passen die Zahlen zur Frage?' },
              { id: 'angaben-pruefen', match: a - b, hint: 'Die Zahlen zählen etwas anderes. Passen die Zahlen zur Frage?' },
            ]
          : [{ id: 'angaben-pruefen', match: a, hint: 'Diese Zahl allein beantwortet die Frage nicht. Was fehlt noch?' }],
        null,
      ),
      praise: 'Du hast erkannt: Hier fehlt eine Angabe.',
      srText: spoken(context, prompt),
      kmk: KMK,
    });
  }
  const right = 'Das kann niemand ausrechnen. Eine Angabe fehlt.';
  const wrongs: ChoiceOption[] = story.numbers === 'zwei'
    ? [{ label: `${a} + ${b}`, whyWrong: 'Die Zahlen zählen etwas anderes. Passen die Zahlen zur Frage?' }, { label: `${a} ${MINUS} ${b}`, whyWrong: 'Die Zahlen zählen etwas anderes. Passen die Zahlen zur Frage?' }]
    : [{ label: `${a} + 10`, whyWrong: 'Die 10 steht nicht in der Geschichte.' }, { label: `${a} ${TIMES} 2`, whyWrong: 'Die 2 steht nicht in der Geschichte.' }];
  const choicePrompt = 'Welche Rechnung passt?';
  const storyWithGoal = `${context} Du suchst ${story.goal}.`;
  return build(SKILL, stufe, {
    key: `${key}:wahl`,
    ab,
    context: storyWithGoal,
    prompt: choicePrompt,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [UNSOLVABLE_HINT, 'Welche Angabe brauchst du für die Frage?'],
    steps: [story.missing, `Passend ist also: ${right}`],
    praise: 'Du hast erkannt: Hier fehlt eine Angabe.',
    srText: spoken(storyWithGoal, choicePrompt),
    kmk: KMK,
  });
}

/** The solvable twin of the open stories, so that "Nicht lösbar" stays a real decision. */
function loesbar(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const n = rng.int(2, 9);
  // never 2 Hefte for 2 €: 2 + 2 gives the same price as 2 · 2, so the plus option would be right as well
  const k = rng.int(n === 2 ? HEFT_EURO[0] + 1 : HEFT_EURO[0], HEFT_EURO[1]);
  const value = n * k;
  const context = `${name} kauft ${n} Hefte. Jedes Heft kostet ${euro(k)}.`;
  const prompt = `Wie viel Euro bezahlt ${name}?`;
  const before = `${name} bezahlt`;
  if (stufe === 3) {
    return build(SKILL, stufe, {
      key: `loesbar:${n}:${k}`,
      ab,
      context,
      prompt,
      answer: sentenceAnswer(value, before, '€.', prompt, { offerUnsolvable: true }),
      hints: [UNSOLVABLE_HINT, 'Anzahl und Preis stehen in der Geschichte.'],
      steps: [`Rechnung: ${n} ${TIMES} ${euro(k)} = ${euro(value)}`, answerStep(before, String(value), '€.')],
      bugs: numberBugs([{ id: 'angaben-pruefen', match: n + k, hint: 'Jedes Heft kostet gleich viel. Das heißt mal.' }], value),
      praise: 'Du hast geprüft: Alle Angaben stehen da.',
      srText: spoken(context, prompt),
      kmk: KMK,
    });
  }
  const right = `${n} ${TIMES} ${k}`;
  const choicePrompt = 'Welche Rechnung passt für den Preis?';
  return build(SKILL, stufe, {
    key: `loesbar:${n}:${k}:wahl`,
    ab,
    context,
    prompt: choicePrompt,
    answer: makeChoice(rng, { label: right }, [
      { label: 'Das kann niemand ausrechnen. Eine Angabe fehlt.', whyWrong: 'Anzahl und Preis stehen in der Geschichte. Es fehlt nichts.' },
      { label: `${n} + ${k}`, whyWrong: 'Jedes Heft kostet gleich viel. Das heißt mal.' },
    ]),
    hints: [UNSOLVABLE_HINT, 'Anzahl und Preis stehen in der Geschichte.'],
    steps: [`Rechnung: ${n} ${TIMES} ${euro(k)} = ${euro(value)}`, `Passend ist also ${right}.`],
    praise: 'Du hast geprüft: Alle Angaben stehen da.',
    srText: spoken(context, choicePrompt),
    kmk: KMK,
  });
}

export const fragePruefenSkill: SkillDef = {
  ...SKILL,
  title: 'Passt das?',
  description: 'Du prüfst, ob Frage und Antwort Sinn ergeben.',
  stufen: { 1: 'Kann das Ergebnis stimmen?', 2: 'Eine Zahl brauchst du nicht', 3: 'Nicht lösbar: Hier fehlt eine Angabe' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const form = ab === 1 ? rng.pick([behauptung, ergebnisPruefen]) : ab === 2 ? rng.pick([welcheZahl, ohneExtraZahl]) : rng.pick([offen, offen, loesbar]);
    return form(rng, stufe, ab);
  },
};
