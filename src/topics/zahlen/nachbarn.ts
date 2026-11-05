/**
 * zahlen.nachbarn: the numbers before and after, Nachbarzehner, Nachbarhunderter and riddles from two clues (docs/research.md §6).
 */
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, multiBugs } from '../shared';
import { ausFormen, strahl, zahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.nachbarn', topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'ZO.stellenwert'];

const HINT_NACHBAR = 'Davor heißt: 1 weniger. Danach heißt: 1 mehr.';

/** Section of the number line with its ten, and n labelled. */
function zehnerBild(n: number) {
  const lo = Math.floor(n / 10) * 10;
  return strahl(lo, lo + 10, 10, 1, true, { marks: [{ value: n, label: String(n) }] });
}

// ─── Stufe 1: before and after, inside a ten ─────────────────────────────────

const davorDanach = (formen: readonly ('beide' | 'danach' | 'davor')[]): Form => (rng, stufe, ab) => {
  const form = rng.pick(formen);
  // zehnerBild labels both ends of the ten: the number before an Einer 1 would stand there, as the number after an Einer 9 would
  const n = zahl(rng.int(1, 9), rng.int(0, 9), rng.int(form === 'danach' ? 1 : 2, 8));
  const fields: MultiField[] = [
    ...(form !== 'danach' ? [{ id: 'v', value: n - 1, before: 'davor:', label: 'Zahl davor' }] : []),
    ...(form !== 'davor' ? [{ id: 'f', value: n + 1, before: 'danach:', label: 'Zahl danach' }] : []),
  ];
  const prompt = form === 'beide' ? `Welche Zahlen stehen direkt neben ${n}?` : form === 'danach' ? `Welche Zahl kommt direkt nach ${n}?` : `Welche Zahl kommt direkt vor ${n}?`;
  return build(SKILL, stufe, {
    key: `nachbar:${n}:${form}`,
    ab,
    prompt,
    visual: zehnerBild(n),
    answer: { kind: 'multi', fields },
    hints: [HINT_NACHBAR, 'Nur die Einer ändern sich.'],
    steps: [`${n} − 1 = ${n - 1}`, `${n} + 1 = ${n + 1}`, form === 'beide' ? `Also: ${n - 1} und ${n + 1}.` : `Also: ${form === 'danach' ? n + 1 : n - 1}.`],
    bugs: multiBugs(
      [
        form === 'beide' && { id: 'vertauscht', match: { v: n + 1, f: n - 1 }, hint: HINT_NACHBAR },
        form === 'danach' && { id: 'vertauscht', match: { f: n - 1 }, hint: HINT_NACHBAR },
        form === 'davor' && { id: 'vertauscht', match: { v: n + 1 }, hint: HINT_NACHBAR },
        form !== 'danach' && { id: 'zehner-statt-einer', match: { v: n - 10 }, hint: 'Nachbarzahlen liegen direkt nebeneinander. Der Abstand ist 1.' },
        form !== 'davor' && { id: 'zehner-statt-einer', match: { f: n + 10 }, hint: 'Nachbarzahlen liegen direkt nebeneinander. Der Abstand ist 1.' },
      ],
      fields,
    ),
    praise: 'Du hast die direkten Nachbarn gefunden.',
    srText: prompt,
    kmk: KMK,
  });
};

/** One number, sought from its two neighbours, or from one of them. No line in the task: it would label the number. */
function einerNachbar(stufe: Stufe, ab: Ab, key: string, prompt: string, n: number, hints: string[], schritt: string, bugs: { id: string; match: { z: number }; hint: string }[]): Exercise {
  const fields: MultiField[] = [{ id: 'z', value: n, before: 'Die Zahl heißt', label: 'Die gesuchte Zahl' }];
  return build(SKILL, stufe, {
    key,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints,
    steps: [{ text: schritt, visual: zehnerBild(n) }, `Die Zahl heißt ${n}.`],
    bugs: multiBugs(bugs, fields),
    praise: 'Du hast vom Nachbarn aus gerechnet.',
    srText: prompt,
    kmk: KMK,
  });
}

/** 347 between 346 and 348. */
function zwischenZwei(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = zahl(rng.int(1, 9), rng.int(0, 9), rng.int(2, 8));
  return einerNachbar(stufe, ab, `zwischen:${n}`, `Welche Zahl steht genau zwischen ${n - 1} und ${n + 1}?`, n, ['Geh von der kleineren Zahl 1 weiter.', 'Von dort bis zur größeren Zahl ist es auch 1.'], `${n - 1} + 1 = ${n}`, [
    { id: 'vertauscht', match: { z: n - 1 }, hint: 'Diese Zahl steht in der Aufgabe. Gesucht ist die Zahl in der Mitte.' },
    { id: 'vertauscht', match: { z: n + 1 }, hint: 'Diese Zahl steht in der Aufgabe. Gesucht ist die Zahl in der Mitte.' },
    { id: 'zehner-statt-einer', match: { z: n + 10 }, hint: 'Nachbarzahlen liegen direkt nebeneinander. Der Abstand ist 1.' },
  ]);
}

/** From the neighbour back to the number: 'Direkt nach dieser Zahl kommt 348.' */
function vomNachbarn(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = zahl(rng.int(1, 9), rng.int(0, 9), rng.int(2, 8));
  const nach = rng.chance(0.5);
  const gegeben = nach ? n + 1 : n - 1;
  const prompt = nach ? `Direkt nach dieser Zahl kommt ${gegeben}. Wie heißt die Zahl?` : `Direkt vor dieser Zahl steht ${gegeben}. Wie heißt die Zahl?`;
  return einerNachbar(stufe, ab, `vomnachbarn:${n}:${nach ? 'nach' : 'vor'}`, prompt, n, [nach ? 'Die gesuchte Zahl ist 1 kleiner.' : 'Die gesuchte Zahl ist 1 größer.', HINT_NACHBAR], nach ? `${gegeben} − 1 = ${n}` : `${gegeben} + 1 = ${n}`, [
    { id: 'vertauscht', match: { z: nach ? gegeben + 1 : gegeben - 1 }, hint: nach ? 'Die gesuchte Zahl kommt zuerst. Geh 1 zurück.' : 'Die gesuchte Zahl kommt danach. Geh 1 weiter.' },
    { id: 'vertauscht', match: { z: gegeben }, hint: 'Diese Zahl steht in der Aufgabe. Gesucht ist ihr Nachbar.' },
    { id: 'zehner-statt-einer', match: { z: nach ? gegeben - 10 : gegeben + 10 }, hint: 'Nachbarzahlen liegen direkt nebeneinander. Der Abstand ist 1.' },
  ]);
}

// ─── Stufe 2: Nachbarzehner, Nachbarhunderter, across 399 and 400 ────────────

/** Nachbarzehner inside a hundred, or `ueber`: below a full hundred (397: 390 and 400). */
const nachbarZehner = (ueber: boolean): Form => (rng, stufe, ab) => {
  const z = ueber ? 9 : rng.int(0, 8);
  const h = rng.int(1, 9);
  const n = zahl(h, z, rng.int(1, 9));
  const lo = Math.floor(n / 10) * 10;
  const hi = lo + 10;
  const fields: MultiField[] = [
    { id: 'u', value: lo, before: 'nach unten:', label: 'Nachbarzehner nach unten' },
    { id: 'o', value: hi, before: 'nach oben:', label: 'Nachbarzehner nach oben' },
  ];
  return build(SKILL, stufe, {
    key: `zehner:${n}`,
    ab,
    prompt: `Wie heißen die Nachbarzehner von ${n}?`,
    answer: { kind: 'multi', fields },
    hints: ['Nachbarzehner haben bei den Einern eine 0.', ueber ? 'Über den 9 Zehnern kommt der nächste Hunderter.' : `Schau auf die Zehner von ${n}.`],
    steps: [{ text: `${n} liegt zwischen ${lo} und ${hi}.`, visual: zehnerBild(n) }, `Also: ${lo} < ${n} < ${hi}`],
    bugs: multiBugs(
      [
        { id: 'vertauscht', match: { u: hi, o: lo }, hint: 'Nach unten ist die kleinere Zahl. Nach oben ist die größere.' },
        { id: 'falsche-stelle', match: { u: Math.floor(n / 100) * 100, o: Math.floor(n / 100) * 100 + 100 }, hint: 'Gefragt sind die Zehner, nicht die Hunderter.' },
        ...(ueber
          ? [
              { id: 'zehner-ueber-hundert', match: { o: hi - 100 }, hint: 'Über den 9 Zehnern kommt der nächste Hunderter.' },
              { id: 'zehner-ueber-hundert', match: { o: Number(`${h}100`) }, hint: 'Über den 9 Zehnern kommt der nächste Hunderter.' },
            ]
          : []),
      ],
      fields,
    ),
    praise: ueber ? 'Du hast an den nächsten Hunderter gedacht.' : 'Du hast die Zehner vor und nach der Zahl gefunden.',
    srText: `Wie heißen die Nachbarzehner von ${n}?`,
    kmk: KMK,
  });
};

function nachbarHunderter(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 9);
  const n = rng.chance(0.3) ? zahl(h, rng.int(1, 9), 0) : zahl(h, rng.int(0, 9), rng.int(1, 9));
  const lo = h * 100;
  const hi = lo + 100;
  const fields: MultiField[] = [
    { id: 'u', value: lo, before: 'nach unten:', label: 'Nachbarhunderter nach unten' },
    { id: 'o', value: hi, before: 'nach oben:', label: 'Nachbarhunderter nach oben' },
  ];
  const zLo = Math.floor(n / 10) * 10;
  return build(SKILL, stufe, {
    key: `hunderter:${n}`,
    ab,
    prompt: `Wie heißen die Nachbarhunderter von ${n}?`,
    answer: { kind: 'multi', fields },
    hints: ['Nachbarhunderter haben bei Zehnern und Einern eine 0.', `Schau auf die erste Ziffer von ${n}.`],
    steps: [{ text: `${n} liegt zwischen ${lo} und ${hi}.`, visual: strahl(lo, hi, 50, 10, true, { marks: [{ value: n, label: String(n) }] }) }, `Also: ${lo} < ${n} < ${hi}`],
    bugs: multiBugs(
      [
        { id: 'vertauscht', match: { u: hi, o: lo }, hint: 'Nach unten ist die kleinere Zahl. Nach oben ist die größere.' },
        n % 10 !== 0 && { id: 'falsche-stelle', match: { u: zLo, o: zLo + 10 }, hint: 'Gefragt sind die Hunderter, nicht die Zehner.' },
      ],
      fields,
    ),
    praise: 'Du hast die Hunderter vor und nach der Zahl gefunden.',
    srText: `Wie heißen die Nachbarhunderter von ${n}?`,
    kmk: KMK,
  });
}

function ueberHunderter(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 9);
  const voll = rng.chance(0.5);
  const n = voll ? (h + 1) * 100 - 1 : h * 100;
  const fields: MultiField[] = [
    { id: 'v', value: n - 1, before: 'davor:', label: 'Zahl davor' },
    { id: 'f', value: n + 1, before: 'danach:', label: 'Zahl danach' },
  ];
  return build(SKILL, stufe, {
    key: `ueber:${n}`,
    ab,
    prompt: `Welche Zahlen stehen direkt neben ${n}?`,
    // no line for 999: it would end at 1000, the number sought, and its name says so to a screen reader
    ...(n < 999 ? { visual: strahl(n - 5, n + 5, 5, 1, false, { labels: [n] }) } : {}),
    answer: { kind: 'multi', fields },
    hints: [HINT_NACHBAR, voll ? `Nach ${n} ist der Hunderter voll.` : 'Vor dem vollen Hunderter stehen bei Zehnern und Einern 2 Neunen.'],
    steps: [`${n} − 1 = ${n - 1}`, `${n} + 1 = ${n + 1}`, `Also: ${n - 1} und ${n + 1}.`],
    bugs: multiBugs(
      voll
        ? [
            { id: 'zaehlen-hunderter', match: { f: n + 1 - 100 }, hint: `Nach ${n} ist der Hunderter voll. Es geht mit dem nächsten Hunderter weiter.` },
            { id: 'zaehlen-hunderter', match: { f: Number(`${h}100`) }, hint: `Nach ${n} ist der Hunderter voll. Es geht mit dem nächsten Hunderter weiter.` },
          ]
        : [{ id: 'zaehlen-hunderter', match: { v: n - 1 + 100 }, hint: `Vor ${n} ist der Hunderter noch 1 kleiner.` }],
      fields,
    ),
    praise: 'Du hast beim Nachbarn an den Hunderter gedacht.',
    srText: `Welche Zahlen stehen direkt neben ${n}?`,
    kmk: KMK,
  });
}

/** The other way round: which number has these neighbours? The lower wrong option is itself a neighbour, the others have other neighbours. */
function welcheHatNachbarn(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const aufHunderter = rng.chance(0.4);
  const auf = aufHunderter ? 100 : 10;
  const wort = aufHunderter ? 'Nachbarhunderter' : 'Nachbarzehner';
  const lo = aufHunderter ? rng.int(1, 9) * 100 : zahl(rng.int(1, 9), rng.chance(0.3) ? 9 : rng.int(0, 8), 0);
  const hi = lo + auf;
  const rest = aufHunderter ? 10 * rng.int(1, 9) + rng.int(0, 9) : rng.int(1, 9);
  const right = lo + rest;
  const andere = (x: number): ChoiceOption => ({ label: String(x), whyWrong: `${x} hat die ${wort} ${Math.floor(x / auf) * auf} und ${(Math.floor(x / auf) + 1) * auf}.` });
  const wrongs: ChoiceOption[] = [
    ...[hi + rest, lo - auf + rest].filter((x) => x >= 100 && x < 1000).map(andere),
    { label: String(lo), whyWrong: `${lo} ist selbst ein Nachbar. Gesucht ist eine Zahl dazwischen.` },
    { label: String(hi), whyWrong: `${hi} ist selbst ein Nachbar. Gesucht ist eine Zahl dazwischen.` },
  ];
  const prompt = `Welche Zahl hat die ${wort} ${lo} und ${hi}?`;
  return build(SKILL, stufe, {
    key: `welche:${lo}:${auf}:${right}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: String(right) }, wrongs),
    hints: [`Die gesuchte Zahl liegt zwischen ${lo} und ${hi}.`, 'Prüfe jede Zahl.'],
    steps: [{ text: `${right} liegt zwischen ${lo} und ${hi}.`, visual: aufHunderter ? strahl(lo, hi, 50, 10, true, { marks: [{ value: right, label: String(right) }] }) : zehnerBild(right) }, `Also passt ${right}.`],
    praise: 'Du hast die Zahl zwischen den Nachbarn gefunden.',
    srText: prompt,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 3: riddles from two clues ─────────────────────────────────────────
// The number speaks: 'mir' and 'ich' tie both clues to the number sought, as a bare 'die Zahl danach' reads as the number just named.

interface Raetsel {
  key: string;
  prompt: string;
  n: number;
  steps: string[];
  bugs: { id: string; match: { z: number }; hint: string }[];
}

/** Nachbarzehner nach unten and the last digit of the number after it. */
function raetselUnten(rng: Rng): Raetsel {
  const lo = rng.int(10, 99) * 10;
  const n = lo + rng.int(1, 9);
  const endet = (n + 1) % 10;
  return {
    key: `unten:${n}`,
    prompt: `Mein Nachbarzehner nach unten: ${lo}. Die Zahl nach mir endet auf ${endet}. Wer bin ich?`,
    n,
    steps: [`Die gesuchte Zahl liegt zwischen ${lo} und ${lo + 10}.`, `Die Zahl nach der gesuchten Zahl ist ${n + 1}.`, `${n + 1} − 1 = ${n}`, `Die gesuchte Zahl heißt ${n}.`],
    bugs: [
      { id: 'nachbar-statt-zahl', match: { z: n + 1 }, hint: 'Das ist die Zahl nach der gesuchten Zahl. Geh 1 zurück.' },
      { id: 'nachbar-statt-zahl', match: { z: lo }, hint: 'Das ist der Nachbarzehner. Gesucht ist die Zahl darüber.' },
    ],
  };
}

/** Nachbarzehner nach oben and the last digit of the number before it; the number may lie just below a full hundred. */
function raetselOben(rng: Rng): Raetsel {
  const hi = rng.chance(0.5) ? rng.int(2, 10) * 100 : rng.int(11, 99) * 10;
  const n = hi - rng.int(1, 9);
  const endet = (n - 1) % 10;
  return {
    key: `oben:${n}`,
    prompt: `Mein Nachbarzehner nach oben: ${hi}. Die Zahl vor mir endet auf ${endet}. Wer bin ich?`,
    n,
    steps: [`Die gesuchte Zahl liegt zwischen ${hi - 10} und ${hi}.`, `Die Zahl vor der gesuchten Zahl ist ${n - 1}.`, `${n - 1} + 1 = ${n}`, `Die gesuchte Zahl heißt ${n}.`],
    bugs: [
      { id: 'nachbar-statt-zahl', match: { z: n - 1 }, hint: 'Das ist die Zahl vor der gesuchten Zahl. Geh 1 weiter.' },
      { id: 'nachbar-statt-zahl', match: { z: hi }, hint: 'Das ist der Nachbarzehner. Gesucht ist die Zahl darunter.' },
    ],
  };
}

/**
 * Nachbarzehner and the number 2 away, which can lie beyond the ten: 351 has 349 two before it. 'Nachbarzehner' without 'Mein': the riddle keeps to 15
 * words (T1), and 'mir' in the next clue still ties it to the number sought.
 */
function raetselZwei(rng: Rng): Raetsel {
  const vor = rng.chance(0.5);
  const unten = rng.int(10, 99) * 10;
  const n = unten + rng.int(1, 9);
  const oben = unten + 10;
  const nachbar = vor ? n - 2 : n + 2;
  const endet = nachbar % 10;
  return {
    key: `zwei:${n}:${vor ? 'vor' : 'nach'}`,
    prompt: `Nachbarzehner nach ${vor ? `oben: ${oben}` : `unten: ${unten}`}. Die Zahl 2 ${vor ? 'vor' : 'nach'} mir endet auf ${endet}. Wer bin ich?`,
    n,
    steps: [`Die gesuchte Zahl liegt zwischen ${unten} und ${oben}.`, `Die Zahl 2 ${vor ? 'vor' : 'nach'} der gesuchten Zahl ist ${nachbar}.`, vor ? `${nachbar} + 2 = ${n}` : `${nachbar} − 2 = ${n}`, `Die gesuchte Zahl heißt ${n}.`],
    bugs: [
      { id: 'nachbar-statt-zahl', match: { z: nachbar }, hint: `Das ist die Zahl 2 ${vor ? 'vor' : 'nach'} der gesuchten Zahl. Geh 2 ${vor ? 'weiter' : 'zurück'}.` },
      { id: 'nachbar-statt-zahl', match: { z: vor ? n - 1 : n + 1 }, hint: 'Der Abstand zur gesuchten Zahl ist noch 1.' },
      { id: 'nachbar-statt-zahl', match: { z: vor ? oben : unten }, hint: `Das ist der Nachbarzehner. Gesucht ist die Zahl ${vor ? 'darunter' : 'darüber'}.` },
    ],
  };
}

const raetsel = (art: (rng: Rng) => Raetsel): Form => (rng, stufe, ab) => {
  const r = art(rng);
  const fields: MultiField[] = [{ id: 'z', value: r.n, before: 'Die Zahl heißt', label: 'Die gesuchte Zahl' }];
  return build(SKILL, stufe, {
    key: `raetsel:${r.key}`,
    ab,
    prompt: r.prompt,
    answer: { kind: 'multi', fields },
    hints: ['Nimm den ersten Hinweis: Zwischen welchen Zahlen liegt die gesuchte Zahl?', 'Prüfe dann mit dem zweiten Hinweis.'],
    steps: r.steps,
    bugs: multiBugs(r.bugs, fields),
    praise: 'Du hast beide Hinweise genutzt.',
    srText: r.prompt,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
};

/** The Stufe decides the content, the AB level the demand inside it. */
const FORMEN: Formen = {
  1: {
    1: [davorDanach(['danach', 'davor'])],
    2: [davorDanach(['beide'])],
    3: [zwischenZwei, vomNachbarn],
  },
  2: {
    1: [nachbarZehner(false), nachbarHunderter],
    2: [nachbarZehner(true), ueberHunderter],
    3: [welcheHatNachbarn],
  },
  3: {
    1: [raetsel(raetselUnten)],
    2: [raetsel(raetselOben)],
    3: [raetsel(raetselZwei)],
  },
};

export const nachbarnSkill: SkillDef = {
  ...SKILL,
  title: 'Nachbarzahlen',
  description: 'Du findest die Zahlen davor und danach und die Nachbarhunderter.',
  stufen: {
    1: 'Die Zahl davor und die Zahl danach',
    2: 'Nachbarzehner und Nachbarhunderter, über 399 hinweg',
    3: 'Zahlenrätsel mit 2 Hinweisen',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
