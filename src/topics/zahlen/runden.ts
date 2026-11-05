/**
 * zahlen.runden: the nearest ten or hundred (docs/research.md §6). A hint names the next step, never the rounded number, so the wording of
 * the §5 hints that state a result ('näher an 350') is reduced here: every answer may be that number.
 */
import { APPROX, BOX } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, type MaybeBug } from '../shared';
import { ausFormen, stellen, strahl, zahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.runden', topicId: 'zahlen' } as const;
const KMK = ['ZO.runden', 'ZO.zahlraum'];

type Auf = 10 | 100;

const STELLE: Record<Auf, { name: string; schaue: string; plural: string }> = {
  10: { name: 'Zehner', schaue: 'Einer', plural: 'Einern' },
  100: { name: 'Hunderter', schaue: 'Zehner', plural: 'Zehnern' },
};

const runde = (n: number, auf: Auf) => Math.floor((n + auf / 2) / auf) * auf;

/** The section of the line between the two candidates, with n marked. */
function abschnitt(n: number, auf: Auf) {
  const lo = Math.floor(n / auf) * auf;
  return strahl(lo, lo + auf, auf / 2, auf / 10, true, { marks: [{ value: n, label: String(n) }] });
}

/** The digit that decides. */
const entscheidet = (n: number, auf: Auf) => (auf === 10 ? n % 10 : stellen(n).z);

function regelHints(n: number, auf: Auf): string[] {
  const s = STELLE[auf];
  return [`Schau auf die ${s.schaue} von ${n}.`, 'Bei 0 bis 4 rundest du ab. Bei 5 bis 9 rundest du auf.'];
}

function richtungBugs(n: number, auf: Auf): MaybeBug[] {
  const lo = Math.floor(n / auf) * auf;
  const hi = lo + auf;
  const r = runde(n, auf);
  const d = entscheidet(n, auf);
  const s = STELLE[auf];
  return [
    r === hi && { id: 'runden-abschneiden', match: lo, hint: d === 5 ? `Bei 5 ${s.plural} rundest du auf.` : `${d} ${s.schaue} sind näher am nächsten ${s.name}. Runde auf.` },
    r === lo && { id: 'runden-aufrunden', match: hi, hint: `${d} ${s.schaue} ${d === 1 ? 'ist' : 'sind'} näher am ${s.name} davor. Runde ab.` },
    { id: 'nicht-gerundet', match: n, hint: auf === 10 ? 'Beim Runden auf Zehner steht hinten eine 0.' : 'Beim Runden auf Hunderter stehen hinten 2 Nullen.' },
  ];
}

function schritte(n: number, auf: Auf) {
  const lo = Math.floor(n / auf) * auf;
  const hi = lo + auf;
  const r = runde(n, auf);
  const d = entscheidet(n, auf);
  const s = STELLE[auf];
  return [
    { text: `${n} liegt zwischen ${lo} und ${hi}.`, visual: abschnitt(n, auf) },
    `Die ${s.schaue}: ${d}. Also rundest du ${r === hi ? 'auf' : 'ab'}.`,
    `${n} ${APPROX} ${r}`,
  ];
}

function rundenAufgabe(n: number, auf: Auf, extra: MaybeBug[], praise: string, stufe: Stufe, ab: Ab, mitBild = stufe === 1): Exercise {
  const r = runde(n, auf);
  const s = STELLE[auf];
  return build(SKILL, stufe, {
    key: `runden:${n}:${auf}`,
    ab,
    prompt: `Runde auf ${s.name}.`,
    expression: `${n} ${APPROX} ${BOX}`,
    ...(mitBild ? { visual: abschnitt(n, auf) } : {}),
    answer: { kind: 'number', value: r, label: 'Gerundete Zahl' },
    hints: regelHints(n, auf),
    steps: schritte(n, auf),
    bugs: numberBugs([...extra, ...richtungBugs(n, auf)], r),
    praise,
    srText: `Runde ${n} auf ${s.name}.`,
    kmk: KMK,
  });
}

function naeher(n: number, auf: Auf, rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const lo = Math.floor(n / auf) * auf;
  const hi = lo + auf;
  const r = runde(n, auf);
  const s = STELLE[auf];
  const anders = r === lo ? hi : lo;
  return build(SKILL, stufe, {
    key: `naeher:${n}:${auf}`,
    ab,
    prompt: `Welcher ${s.name} liegt näher an ${n}?`,
    ...(stufe === 1 ? { visual: abschnitt(n, auf) } : {}),
    answer: makeChoice(rng, { label: String(r) }, [{ label: String(anders), whyWrong: `Schau auf die ${s.schaue} von ${n}. Der andere ${s.name} liegt näher.` }]),
    hints: regelHints(n, auf),
    steps: schritte(n, auf),
    praise: `Du hast auf die ${s.schaue} geschaut.`,
    srText: `Welcher ${s.name} liegt näher an ${n}: ${lo} oder ${hi}?`,
    kmk: KMK,
  });
}

// ─── Stufe 1: to tens, staying inside the hundred ────────────────────────────

const LOB_ZEHNER = 'Du hast auf die Einer geschaut und richtig gerundet.';

/** Einer far from the middle, with the section on screen. */
const zehnerKlar: Form = (rng, stufe, ab) => {
  const n = zahl(rng.int(1, 9), rng.int(0, 8), rng.pick([1, 2, 8, 9]));
  return rng.chance(0.4) ? naeher(n, 10, rng, stufe, ab) : rundenAufgabe(n, 10, [], LOB_ZEHNER, stufe, ab);
};

/** Any Einer but the 5, with the section on screen. */
const zehnerAlle: Form = (rng, stufe, ab) => rundenAufgabe(zahl(rng.int(1, 9), rng.int(0, 8), rng.pick([1, 2, 3, 4, 6, 7, 8, 9])), 10, [], LOB_ZEHNER, stufe, ab);

/** Without the section: exactly halfway, just below a full hundred (394), or just above one (304). */
const zehnerOhneBild: Form = (rng, stufe, ab) => {
  const h = rng.int(1, 9);
  const n = rng.pick([zahl(h, rng.int(0, 8), 5), zahl(h, 9, rng.int(1, 4)), zahl(h, 0, rng.int(1, 9))]);
  return rundenAufgabe(n, 10, [], LOB_ZEHNER, stufe, ab, false);
};

// ─── Stufe 2: to hundreds ────────────────────────────────────────────────────

/** The digits decide: Zehner far from the middle with an optional choice, close to it, or the trap of rounding twice (345, 351). */
function aufHunderter(n: number, stufe: Stufe, ab: Ab): Exercise {
  const { h, z, e } = stellen(n);
  // 345 to 350 and then to 400: rounding twice
  const kette = z === 4 && e >= 5;
  return rundenAufgabe(
    n,
    100,
    [
      { id: 'runden-stelle', match: runde(n, 10), hint: `Gefragt sind Hunderter. Schau auf die Zehner von ${n}.` },
      kette && { id: 'runden-kette', match: (h + 1) * 100, hint: 'Runde nur einmal. Schau nur auf die Zehner.' },
    ],
    'Du hast auf die Zehner geschaut und auf Hunderter gerundet.',
    stufe,
    ab,
  );
}

const hunderterKlar: Form = (rng, stufe, ab) => {
  const z = rng.pick([0, 1, 2, 7, 8, 9]);
  const n = zahl(rng.int(1, z >= 5 ? 8 : 9), z, rng.int(z === 0 ? 1 : 0, 9));
  return rng.chance(0.4) ? naeher(n, 100, rng, stufe, ab) : aufHunderter(n, stufe, ab);
};

const hunderterMitte: Form = (rng, stufe, ab) => {
  const z = rng.int(3, 6);
  return aufHunderter(zahl(rng.int(1, z >= 5 ? 8 : 9), z, rng.int(0, 9)), stufe, ab);
};

const hunderterFalle: Form = (rng, stufe, ab) => {
  const n = rng.chance(0.7) ? zahl(rng.int(1, 9), 4, rng.int(5, 9)) : zahl(rng.int(1, 8), 5, rng.int(0, 4));
  return aufHunderter(n, stufe, ab);
};

// ─── Stufe 3: across a hundred, which numbers round to 350 ───────────────────

const LOB_UEBERGANG = 'Du hast beim Runden an den Hunderter gedacht.';
const HINT_UEBERGANG = 'Nach der 9 kommt der nächste Hunderter. Der Hunderter wird größer.';

/** 396 to 400: to tens across a full hundred. */
function zehnerUebergang(n: number, stufe: Stufe, ab: Ab): Exercise {
  const h = Math.floor(n / 100);
  return rundenAufgabe(n, 10, [{ id: 'runden-uebergang', match: h * 100, hint: HINT_UEBERGANG }, { id: 'runden-uebergang', match: Number(`${h}100`), hint: HINT_UEBERGANG }], LOB_UEBERGANG, stufe, ab);
}

const uebergangKlar: Form = (rng, stufe, ab) => zehnerUebergang(zahl(rng.int(1, 9), 9, rng.int(6, 9)), stufe, ab);

/** 395 exactly halfway, or 962 to 1000. */
const uebergangSchwer: Form = (rng, stufe, ab) => {
  if (rng.chance(0.5)) return zehnerUebergang(zahl(rng.int(1, 9), 9, 5), stufe, ab);
  const n = zahl(9, rng.int(5, 9), rng.int(0, 9));
  return rundenAufgabe(n, 100, [{ id: 'runden-stelle', match: runde(n, 10), hint: `Gefragt sind Hunderter. Schau auf die Zehner von ${n}.` }], LOB_UEBERGANG, stufe, ab);
};

const welcheZahl = (auf: Auf): Form => (rng, stufe, ab) => {
  const ziel = auf === 10 ? rng.int(11, 98) * 10 : rng.int(2, 9) * 100;
  const s = STELLE[auf];
  const halb = auf / 2;
  const einheit = auf / 10;
  const anders = [ziel + halb, ziel - halb - 1, ziel + halb + 2 * einheit, ziel - halb - 2 * einheit];
  const n = ziel + rng.pick([1, -1]) * rng.int(1, halb - 1);
  const answer = makeChoice(
    rng,
    { label: String(n) },
    anders.map((x) => ({ label: String(x), whyWrong: `Runde ${x} auf ${s.name}. Das ist nicht ${ziel}.` })),
  );
  return build(SKILL, stufe, {
    key: `welche:${ziel}:${n}:${auf}`,
    ab,
    prompt: `Runde auf ${s.name}. Welche Zahl ergibt ${ziel}?`,
    answer,
    hints: [`Runde jede Zahl auf ${s.name}.`, `Schau bei jeder Zahl auf die ${s.schaue}.`],
    steps: [`Gesucht ist eine Zahl von ${ziel - halb} bis ${ziel + halb - 1}.`, `${n} liegt in diesem Bereich.`, `${n} ${APPROX} ${ziel}`],
    praise: 'Du hast jede Zahl geprüft.',
    srText: `Runde auf ${s.name}. Welche Zahl ergibt ${ziel}?`,
    kmk: [...KMK, 'PK.argumentieren'],
    knobel: true,
  });
};

function grenze(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const ziel = rng.int(11, 98) * 10;
  const groesste = rng.chance(0.5);
  const value = groesste ? ziel + 4 : ziel - 5;
  const prompt = `Runde auf Zehner: Das Ergebnis ist ${ziel}. Wie heißt die ${groesste ? 'größte' : 'kleinste'} passende Zahl?`;
  return build(SKILL, stufe, {
    key: `grenze:${ziel}:${groesste ? 'g' : 'k'}`,
    ab,
    prompt,
    answer: { kind: 'number', value, label: 'Zahl' },
    hints: ['Bei 5 Einern rundest du auf. Bei 4 Einern rundest du ab.', groesste ? 'Welche Zahlen rundest du noch ab?' : 'Welche Zahlen rundest du schon auf?'],
    steps: [groesste ? `${value} rundest du auf ${ziel} ab.` : `${value} rundest du auf ${ziel} auf.`, groesste ? `${value + 1} rundest du schon auf.` : `${value - 1} rundest du noch ab.`, `Also heißt die Zahl ${value}.`],
    bugs: numberBugs(
      groesste
        ? [
            { id: 'runden-grenze', match: ziel + 5, hint: 'Bei 5 Einern rundest du auf. Probier die Zahl davor.' },
            { id: 'runden-grenze', match: ziel + 9, hint: 'Bei 5 bis 9 Einern rundest du auf.' },
            { id: 'nicht-gerundet', match: ziel, hint: `Auch größere Zahlen ergeben ${ziel}.` },
          ]
        : [
            { id: 'runden-grenze', match: ziel - 4, hint: 'Auch die Zahl davor rundest du noch auf.' },
            { id: 'runden-grenze', match: ziel - 6, hint: 'Bei 4 Einern rundest du ab. Probier die Zahl danach.' },
            { id: 'nicht-gerundet', match: ziel, hint: `Auch kleinere Zahlen ergeben ${ziel}.` },
          ],
      value,
    ),
    praise: 'Du hast die Grenze beim Runden genau gefunden.',
    srText: prompt,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

/** The Stufe decides the content, the AB level the demand inside it. */
const FORMEN: Formen = {
  1: {
    1: [zehnerKlar],
    2: [zehnerAlle],
    3: [zehnerOhneBild],
  },
  2: {
    1: [hunderterKlar],
    2: [hunderterMitte],
    3: [hunderterFalle],
  },
  3: {
    1: [uebergangKlar],
    2: [uebergangSchwer, welcheZahl(10)],
    3: [grenze, welcheZahl(100)],
  },
};

export const rundenSkill: SkillDef = {
  ...SKILL,
  title: 'Runden',
  description: 'Du findest den nächsten Zehner oder Hunderter.',
  stufen: {
    1: 'Auf Zehner runden, im selben Hunderter',
    2: 'Auf Hunderter runden: 347 wird 300',
    3: 'Über den Hunderter: 396 wird 400; passende Zahlen finden',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
