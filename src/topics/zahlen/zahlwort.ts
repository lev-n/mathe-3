/**
 * zahlen.zahlwort: from number word to number and back (docs/research.md §6, G1). The signature error is writing as spoken (90051 for
 * 951), so zeros and "written as spoken" come before the Zahlendreher. Number words are exempt from T10 here (src/core/textRules.ts).
 *
 * "Hören": the word is always on screen too. Vorlesen is hidden on devices without a local German voice (§7.1), so a word that could
 * only be heard would leave such a child without a task. The options stay silent, as they would give the word away. For the same reason
 * "number to word" shows its number in the table: Vorlesen says digits in the prompt or the expression as that very word.
 */
import { numberWord } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, multiBugs, numberBugs } from '../shared';
import { ausFormen, maxOptionen, ohneNullen, stellen, tafel, zahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.zahlwort', topicId: 'zahlen' } as const;
const KMK = ['ZO.stellenwert', 'ZO.zahlraum', 'PK.darstellen'];

/**
 * Soft hyphens around 'hundert', 'tausend' and the 'und' of the Zehner: a long word breaks there and not at any letter. The 'und' has to
 * follow a unit, as 'hundert' has an 'und' of its own.
 */
const weich = (word: string) => word.replace(/(?<=\p{L})(hundert|tausend)/gu, '\u00AD$1').replace(/(hundert|tausend)(?=\p{L})/gu, '$1\u00AD').replace(/(?<=ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und(?=\p{L})/u, '\u00ADund\u00AD');

const HINT_STELLEN = 'Diese Zahl hat 3 Stellen: Hunderter, Zehner, Einer.';
const HINT_NULL = 'Nennt das Wort eine Stelle nicht? Dann steht dort eine 0.';
const HINT_DREHER = 'Beim Hören kommen die Einer zuerst. Geschrieben stehen die Zehner vorne.';

/** Elf and zwölf do not say their Einer first. */
const hintReihenfolge = (z: number, e: number) => (z === 1 && e <= 2 ? 'Schreib erst die Zehner, dann die Einer.' : HINT_DREHER);

interface Verwechslung {
  id: string;
  value: number;
  hint: string;
}

/** The look-alikes of n (docs/research.md §5): 305 → 3005, 35, 350; 345 → 30045, 354. Each computes exactly from its pattern. */
export function verwechslungen(n: number): Verwechslung[] {
  if (n === 1000) {
    return [
      { id: 'null-vergessen', value: 100, hint: 'Der Tausender steht vorne. Danach kommen noch 3 Stellen.' },
      { id: 'zahlwort-anhaengen', value: 10000, hint: 'Nach dem Tausender kommen nur 3 Stellen.' },
    ];
  }
  const { h, z, e } = stellen(n);
  const rest = n % 100;
  const out: Verwechslung[] = [{ id: 'zahlwort-anhaengen', value: rest > 0 ? Number(`${h * 100}${rest}`) : h * 1000, hint: HINT_STELLEN }];
  if (z === 0 && e > 0) {
    out.push({ id: 'null-vergessen', value: 10 * h + e, hint: 'Keine Zehner? Dann steht dort eine 0.' });
    out.push({ id: 'null-falsche-stelle', value: zahl(h, e, 0), hint: `Stell dir die Tafel vor: ${h} Hunderter, 0 Zehner, ${e} Einer.` });
  } else if (e === 0 && z > 0) {
    out.push({ id: 'null-vergessen', value: 10 * h + z, hint: 'Keine Einer? Dann steht dort eine 0.' });
    out.push({ id: 'null-falsche-stelle', value: zahl(h, 0, z), hint: `Stell dir die Tafel vor: ${h} Hunderter, ${z} Zehner, 0 Einer.` });
  } else if (z === 0 && e === 0) {
    out.push({ id: 'null-vergessen', value: h, hint: 'Keine Zehner und keine Einer? Dann stehen dort Nullen.' });
    out.push({ id: 'null-vergessen', value: 10 * h, hint: 'Keine Zehner und keine Einer? Dann stehen dort Nullen.' });
  } else if (z !== e) {
    out.push({ id: 'zahlendreher', value: zahl(h, e, z), hint: hintReihenfolge(z, e) });
  }
  return out;
}

/** The word in parts, then the number in the table. */
function schritte(n: number) {
  const word = numberWord(n);
  if (n === 1000) return [`${word}: 1 Tausender, 0 Hunderter, 0 Zehner, 0 Einer.`, { text: 'Die Zahl heißt 1000.', visual: tafel(n) }];
  const { h, z, e } = stellen(n);
  const rest = n % 100;
  return [
    `${numberWord(h * 100)}: ${h} Hunderter.`,
    rest > 0 ? `${numberWord(rest)}: ${z} Zehner und ${e} Einer.` : 'Keine Zehner und keine Einer: Dort stehen Nullen.',
    { text: `Die Zahl heißt ${n}.`, visual: tafel(n) },
  ];
}

/** The next step for a typed number: a place the word leaves out, or the order of what it says. */
function tippHints(n: number): string[] {
  const { z, e } = stellen(n);
  if (n === 1000) return ['Das Wort nennt nur den Tausender. Die anderen Stellen sind Nullen.', HINT_NULL];
  return [HINT_STELLEN, z === 0 || e === 0 ? HINT_NULL : hintReihenfolge(z, e)];
}

/** Praise for a typed number: what the child wrote. */
function lob(n: number): string {
  const { h, z, e } = stellen(n);
  if (n === 1000) return 'Du hast den Tausender und die 3 Nullen geschrieben.';
  if (z === 0 && e === 0) return `Du hast ${h} Hunderter und 2 Nullen geschrieben.`;
  if (z === 0 || e === 0) return 'Du hast die Null an die richtige Stelle gesetzt.';
  return 'Du hast zuerst die Zehner geschrieben, dann die Einer.';
}

/** 305 or 350: a word that leaves out one place (the catalogue's S2). */
function mitNull(rng: Rng): number {
  const h = rng.int(1, 9);
  return rng.chance(0.5) ? zahl(h, 0, rng.int(1, 9)) : zahl(h, rng.int(1, 9), 0);
}

/** 305, 350 or 345: a number with a look-alike that matters. */
function knifflig(rng: Rng): number {
  if (rng.chance(0.5)) return mitNull(rng);
  const h = rng.int(1, 9);
  const z = rng.int(2, 9);
  return zahl(h, z, rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== z)));
}

// ─── Exercises ───────────────────────────────────────────────────────────────

/** Stufe 1: all digits differ between the options, so no option is a look-alike of n. */
function wortWahl(n: number, rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { h, z, e } = stellen(n);
  const andere = (x: number) => rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== x));
  const wrongs: ChoiceOption[] = rng
    .sample([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== h), 3)
    .map((d) => ({ label: String(zahl(d, andere(z), andere(e))), whyWrong: `Achte auf den Anfang: ${numberWord(h * 100)} heißt ${h} Hunderter.` }));
  const word = numberWord(n);
  return build(SKILL, stufe, {
    key: `wahl1:${n}`,
    ab,
    prompt: 'Welche Zahl passt zum Zahlwort?',
    expression: weich(word),
    answer: { ...makeChoice(rng, { label: String(n) }, wrongs, { max: 4 }), silentOptions: true },
    hints: ['Achte auf den Anfang: Wie viele Hunderter sind es?', 'Achte dann auf das Ende des Worts.'],
    steps: schritte(n),
    praise: 'Du hast das Zahlwort in Hunderter und den Rest geteilt.',
    srText: `Welche Zahl passt zum Zahlwort ${word}?`,
    kmk: KMK,
  });
}

/** A word with Zehner and Einer in the plain order of speech: dreihundertfünfundvierzig. */
const wortWahlEinfach: Form = (rng, stufe, ab) => wortWahl(zahl(rng.int(1, 9), rng.int(2, 9), rng.int(1, 9)), rng, stufe, ab);

/** A word that hides its Zehner: dreihundertzwölf, dreihundertsiebzehn. */
const wortWahlZehnerWort: Form = (rng, stufe, ab) => wortWahl(zahl(rng.int(1, 9), 1, rng.int(1, 9)), rng, stufe, ab);

function stelleImWort(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  let n = ohneNullen(rng);
  const { h, z } = stellen(n);
  // the hints say that the word has its Einer first: not so in elf and zwölf
  if (n % 10 === z || (z === 1 && n % 10 === 2)) n = zahl(h, z, z === 9 ? 1 : z === 1 ? 3 : z + 1);
  const { e } = stellen(n);
  const zehner = rng.chance(0.5);
  const word = numberWord(n);
  return build(SKILL, stufe, {
    key: `stelle:${n}:${zehner ? 'Z' : 'E'}`,
    ab,
    prompt: zehner ? 'Wie viele Zehner hat die Zahl?' : 'Wie viele Einer hat die Zahl?',
    expression: weich(word),
    answer: { kind: 'number', value: zehner ? z : e, unit: zehner ? 'Zehner' : 'Einer', label: zehner ? 'Zehner' : 'Einer' },
    hints: ['Beim Hören kommen die Einer zuerst.', 'Die Zehner hörst du am Ende des Worts.'],
    steps: [...schritte(n), `Also hat die Zahl ${zehner ? `${z} Zehner` : `${e} Einer`}.`],
    bugs: numberBugs([{ id: 'zahlendreher', match: zehner ? e : z, hint: HINT_DREHER }], zehner ? z : e),
    praise: 'Du hast im Zahlwort Zehner und Einer richtig erkannt.',
    srText: `${word}. ${zehner ? 'Wie viele Zehner hat die Zahl?' : 'Wie viele Einer hat die Zahl?'}`,
    kmk: KMK,
  });
}

/** All three places from a word without a zero. */
function wortZuStellen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ohneNullen(rng);
  const { h, z, e } = stellen(n);
  const word = numberWord(n);
  const prompt = 'Wie viele Hunderter, Zehner und Einer hat die Zahl?';
  const fields: MultiField[] = [
    { id: 'h', value: h, after: 'Hunderter', label: 'Hunderter' },
    { id: 'z', value: z, after: 'Zehner', label: 'Zehner' },
    { id: 'e', value: e, after: 'Einer', label: 'Einer' },
  ];
  return build(SKILL, stufe, {
    key: `stellen:${n}`,
    ab,
    prompt,
    expression: weich(word),
    answer: { kind: 'multi', fields },
    hints: [HINT_STELLEN, hintReihenfolge(z, e)],
    steps: schritte(n),
    bugs: multiBugs([{ id: 'zahlendreher', match: { z: e, e: z }, hint: hintReihenfolge(z, e) }], fields),
    praise: 'Du hast im Zahlwort alle Stellen erkannt.',
    srText: `${word}. ${prompt}`,
    kmk: KMK,
  });
}

function wortWahlMitNull(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = mitNull(rng);
  const word = numberWord(n);
  // 3005 is a look-alike of the catalogue; 60070 for 670 leaves every range a child reads here. It stays a bug for a typed answer (§5).
  const wrongs = verwechslungen(n).filter((v) => v.value < 10000).map((v) => ({ label: String(v.value), whyWrong: v.hint }));
  return build(SKILL, stufe, {
    key: `wahl2:${n}`,
    ab,
    prompt: 'Welche Zahl passt zum Zahlwort?',
    expression: weich(word),
    answer: { ...makeChoice(rng, { label: String(n) }, wrongs, { max: maxOptionen(stufe) }), silentOptions: true },
    hints: [HINT_STELLEN, HINT_NULL],
    steps: schritte(n),
    praise: 'Du hast die 0 an der richtigen Stelle erkannt.',
    srText: `Welche Zahl passt zum Zahlwort ${word}?`,
    kmk: KMK,
  });
}

function wortTippen(n: number, prompt: string, stufe: Stufe, ab: Ab): Exercise {
  const word = numberWord(n);
  return build(SKILL, stufe, {
    key: `tippen:${n}`,
    ab,
    prompt,
    expression: weich(word),
    answer: { kind: 'number', value: n, label: 'Zahl mit Ziffern' },
    hints: tippHints(n),
    steps: schritte(n),
    bugs: numberBugs(verwechslungen(n).map((v) => ({ id: v.id, match: v.value, hint: v.hint })), n),
    praise: lob(n),
    srText: `Schreib die Zahl ${word} mit Ziffern.`,
    kmk: KMK,
  });
}

/** The hardest words with a zero: two zeros, x01, x10. Stufe 2 reads them, without the top value. */
function schwereNull(rng: Rng): number {
  const h = rng.int(1, 9);
  return rng.pick([zahl(h, 0, 0), zahl(h, 0, 1), zahl(h, 1, 0), zahl(h, 0, rng.int(2, 9)), zahl(h, rng.int(2, 9), 0)]);
}

/** Which place holds the 0: the word says it by leaving the place out. */
function nullStelle(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 9);
  const keineZehner = rng.chance(0.5);
  const n = keineZehner ? zahl(h, 0, rng.int(1, 9)) : zahl(h, rng.int(1, 9), 0);
  const word = numberWord(n);
  const right = keineZehner ? 'Zehner' : 'Einer';
  const prompt = 'An welcher Stelle steht die 0?';
  const wrongs: ChoiceOption[] = ['Hunderter', 'Zehner', 'Einer'].filter((o) => o !== right).map((o) => ({ label: o, whyWrong: `Das Wort nennt die ${o}. Welche Stelle nennt es nicht?` }));
  return build(SKILL, stufe, {
    key: `nullstelle:${n}`,
    ab,
    prompt,
    expression: weich(word),
    answer: { ...makeChoice(rng, { label: right }, wrongs, { order: ['Hunderter', 'Zehner', 'Einer'] }), silentOptions: true },
    hints: [HINT_NULL, HINT_STELLEN],
    steps: [...schritte(n), `Die 0 steht bei den ${keineZehner ? 'Zehnern' : 'Einern'}.`],
    praise: 'Du hast die fehlende Stelle im Wort gefunden.',
    srText: `${word}. ${prompt}`,
    kmk: KMK,
  });
}

/**
 * Typing on Stufe 3 needs numbers harder to write than the zeros of Stufe 2, as the word stays on screen: a word that spells its digits unlike the
 * digit. Teens say the Einer first (dreihundertsiebzehn), and -dreißig, -sechzig, -siebzig change the sound of their digit.
 */
function schwerSchreiben(rng: Rng): number {
  const h = rng.int(1, 9);
  if (rng.chance(0.5)) return zahl(h, 1, rng.int(3, 9));
  const z = rng.pick([3, 6, 7]);
  return zahl(h, z, rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((e) => e !== z)));
}

/** The hardest: no digit heard at all (elf, zwölf), a word that drops letters (sechzehn, siebzehn), the same digit in front and behind (373), and 1000. */
function amSchwersten(rng: Rng): number {
  const h = rng.int(1, 9);
  const form = rng.int(0, 9);
  if (form === 0) return 1000;
  if (form <= 3) return zahl(h, 1, rng.pick([1, 2]));
  if (form <= 6) return zahl(h, 1, rng.pick([6, 7]));
  return zahl(h, rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((z) => z !== h)), h);
}

/** Stufe 3, number to word: mostly hard numbers, with full hundreds. */
function wortZahl(rng: Rng): number {
  const form = rng.int(1, 9);
  if (form === 1) return zahl(rng.int(1, 9), 0, 0);
  if (form === 2) return zahl(rng.int(1, 9), 1, rng.int(1, 9));
  if (form === 3) return zahl(rng.int(1, 9), 0, 1);
  return knifflig(rng);
}

function zahlZuWort(n: number, rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const word = numberWord(n);
  const { h, z, e } = stellen(n);
  const anders = (d: number) => (d === 9 ? 8 : d + 1);
  // only look-alikes with a word in the range of this topic, then words that start alike: the first word alone must not decide
  const kandidaten = [...verwechslungen(n).map((v) => v.value), zahl(h, e, z), zahl(h, anders(z), e), zahl(h, z, anders(e)), zahl(h === 9 ? 1 : h + 1, z, e)].filter((v) => v >= 100 && v < 1000 && v !== n);
  const wrongs: ChoiceOption[] = kandidaten.map((v) => ({ label: weich(numberWord(v)), whyWrong: `Dieses Wort gehört zu ${v}. Schau noch einmal auf die Stellen.` }));
  return build(SKILL, stufe, {
    key: `zuwort:${n}`,
    ab,
    prompt: 'Welches Zahlwort passt zu der Zahl in der Tafel?',
    visual: tafel(n),
    answer: { ...makeChoice(rng, { label: weich(word) }, wrongs, { max: Math.min(4, maxOptionen(stufe)) }), silentOptions: true },
    hints: ['Lies zuerst die Hunderter.', 'Steht bei den Zehnern eine 0? Dann nennt das Wort keine Zehner.'],
    steps: [...schritte(n).slice(0, 2), `Das Zahlwort heißt ${word}.`],
    praise: 'Du hast die Stellen der Zahl mit dem Wort verglichen.',
    srText: `In der Tafel stehen ${h} Hunderter, ${z} Zehner und ${e} Einer. Welches Zahlwort passt?`,
    kmk: KMK,
  });
}

const HOEREN = 'Hör dir das Zahlwort an oder lies es. Schreib die Zahl.';

/** The Stufe decides the content, the AB level the demand inside it. Stufe 3 has typing from audio and number to word; lower Stufen read words. */
const FORMEN: Formen = {
  1: {
    1: [wortWahlEinfach],
    2: [wortWahlZehnerWort, stelleImWort],
    3: [wortZuStellen],
  },
  2: {
    1: [wortWahlMitNull],
    2: [(rng, stufe, ab) => wortTippen(mitNull(rng), 'Schreib die Zahl mit Ziffern.', stufe, ab)],
    3: [(rng, stufe, ab) => wortTippen(schwereNull(rng), 'Schreib die Zahl mit Ziffern.', stufe, ab), nullStelle],
  },
  3: {
    1: [(rng, stufe, ab) => wortTippen(schwerSchreiben(rng), HOEREN, stufe, ab)],
    2: [(rng, stufe, ab) => zahlZuWort(knifflig(rng), rng, stufe, ab)],
    3: [(rng, stufe, ab) => wortTippen(amSchwersten(rng), HOEREN, stufe, ab), (rng, stufe, ab) => zahlZuWort(wortZahl(rng), rng, stufe, ab)],
  },
};

export const zahlwortSkill: SkillDef = {
  ...SKILL,
  title: 'Zahlen lesen und hören',
  description: 'Du hörst ein Zahlwort und schreibst die Zahl.',
  stufen: {
    1: 'Zahlwörter ohne Null der passenden Zahl zuordnen',
    2: 'Zahlwörter mit Null: dreihundertfünf',
    3: 'Zahlen nach Gehör schreiben und das Zahlwort finden',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
