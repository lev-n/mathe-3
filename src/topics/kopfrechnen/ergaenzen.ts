import { BOX } from '../../core/format';
import type { Ab, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { bugList, pickPerson, targetAb } from '../shared';
import { finish, rechenstrich, spoken, strichSteps, zehnerStrahl, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.ergaenzen', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.kopfrechnen'];
const KMK_STORY = ['ZO.kopfrechnen', 'ZO.sachrechnen'];

const trailingZeros = (n: number): number => (n === 0 ? 0 : (String(n).match(/0+$/)?.[0].length ?? 0));

/** The way to the target over full numbers: 233, 240, 300, 1000. A number on a full ten jumps on from there. */
export function wegpunkte(n: number, target: number): number[] {
  const out = [n];
  let cur = n;
  while (cur < target) {
    const p = 10 ** (trailingZeros(cur) + 1);
    cur = Math.min(target, (Math.floor(cur / p) + 1) * p);
    out.push(cur);
  }
  return out;
}

/** Every digit completed to 10: 233 to 1000 gives 877 (§5 ergaenzen-1000). A zero at the end stays 0. */
export function jedeZifferZu10(n: number, target: number): number {
  const width = String(target).length - 1;
  return Number(String(n % 10 ** width).padStart(width, '0').split('').map((d) => (10 - Number(d)) % 10).join(''));
}

function wegSteps(n: number, target: number): Step[] {
  const points = wegpunkte(n, target);
  const v = target - n;
  const jumps = points.slice(1).map((to, i) => `${points[i]} + ${to - points[i]} = ${to}`);
  const sum = points.slice(1).map((to, i) => to - points[i]);
  const last = sum.length > 1 ? `Zusammen: ${sum.join(' + ')} = ${v}` : `Also ${v === 1 ? 'fehlt' : 'fehlen'} ${v}.`;
  return [...strichSteps(points, jumps), last];
}

/** The §5 hint for ergaenzen-1000. Every digit goes to 9 and the last one to 10, so a number on a full ten has only its Hunderter going to 9. */
const hilfe1000 = (known: number) => (known % 10 === 0 ? 'Bis zur 1000: Bei den Hundertern geht es bis 9.' : 'Bis zur 1000: Bei den Hundertern und Zehnern geht es bis 9.');
/** The §5 hint for neuner-ergaenzung. */
const einerBis10 = (e: number) => `Fast! ${e === 1 ? 'Den 1 Einer' : `Die ${e} Einer`} ergänzt du bis 10, nicht bis 9.`;

function ergaenzenBugs(n: number, target: number) {
  const v = target - n;
  const e = n % 10;
  const z = Math.floor(n / 10) % 10;
  const to1000 = target === 1000 && n % 100 !== 0;
  const toHundred = target !== 1000;
  const nines = to1000 && e !== 0;
  return bugList(v, [
    ['ergaenzen-1000', to1000 ? jedeZifferZu10(n, 1000) : null, hilfe1000(n)],
    ['ergaenzen-hunderter', toHundred && e !== 0 ? (10 - z) * 10 + (10 - e) : null, `Bis ${target}: Bei den Zehnern geht es nur bis 9.`],
    ['neuner-ergaenzung', nines ? v - 1 : null, einerBis10(e)],
    ['falsches-ziel', toHundred ? 1000 - n : null, `Gefragt ist nur der Weg bis ${target}.`],
    ['summe-gerechnet', n + target, `Das ist zu viel. Du suchst den Abstand bis ${target}.`],
  ]);
}

const HILFE_HUNDERTER = 'Geh erst zum nächsten Zehner, dann zum Hunderter.';
const HILFE_TAUSEND = 'Geh erst zum nächsten Zehner, dann zum Hunderter, dann bis 1000.';

function firstHint(n: number, target: number): string {
  if (n % 10 !== 0) return target === 1000 ? HILFE_TAUSEND : HILFE_HUNDERTER;
  if (target === 1000 && n % 100 !== 0) return 'Geh erst zum nächsten Hunderter, dann bis 1000.';
  return n % 100 === 0 ? `Geh in Hundertern bis ${target}.` : `Geh in Zehnern bis ${target}.`;
}

function secondHint(n: number, target: number): string {
  const next = wegpunkte(n, target)[1];
  return next === target ? `Prüfe mit der Probe: ${n} plus deine Zahl muss ${target} sein.` : `Dein erster Halt ist ${next}. Wie viel fehlt bis dorthin?`;
}

/** 370 + □ = 400 */
function plusLuecke(n: number, target: number): Task {
  const expression = `${n} + ${BOX} = ${target}`;
  return {
    key: `plus:${n}:${target}`,
    prompt: `Ergänze bis ${target}.`,
    expression,
    answer: { kind: 'number', value: target - n, label: 'Zahl in der Lücke' },
    hints: [firstHint(n, target), secondHint(n, target)],
    steps: wegSteps(n, target),
    bugs: ergaenzenBugs(n, target),
    praise: `Du bist in Schritten bis ${target} gegangen.`,
    srText: spoken(`Ergänze bis ${target}.`, expression),
  };
}

/** Wie viel fehlt? On the number line. */
function wieVielFehlt(n: number, target: number): Task {
  const prompt = `Wie viel fehlt von ${n} bis ${target}?`;
  return {
    key: `fehlt:${n}:${target}`,
    prompt,
    ...(target - n <= 100 ? { visual: zehnerStrahl(n, target) } : {}),
    answer: { kind: 'number', value: target - n, label: 'Was fehlt' },
    hints: [firstHint(n, target), secondHint(n, target)],
    steps: wegSteps(n, target),
    bugs: ergaenzenBugs(n, target),
    praise: `Du hast den Weg von ${n} bis ${target} gefunden.`,
    srText: spoken(prompt),
  };
}

/** □ + 30 = 400: the first number is missing. */
function ersteZahl(n: number, target: number): Task {
  const m = target - n;
  const expression = `${BOX} + ${m} = ${target}`;
  const parts = [m - (m % 100), (m % 100) - (m % 10), m % 10].filter((part) => part > 0);
  const points = parts.reduce((way, part) => [...way, way[way.length - 1] - part], [target]);
  const jumps = parts.map((part, i) => `${points[i]} − ${part} = ${points[i + 1]}`);
  const way: Step[] = parts.length > 1 ? [`Umkehraufgabe: ${target} − ${m} = ${BOX}.`, ...strichSteps(points, jumps)] : [{ text: `Umkehraufgabe: ${target} − ${m} = ${n}.`, visual: rechenstrich(points) }];
  const inParts = `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`;
  return {
    key: `erste:${n}:${target}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: n, label: 'Zahl in der Lücke' },
    hints: [`Rechne rückwärts: ${target} − ${m}.`, parts.length > 1 ? `Zerlege die ${m} in ${inParts}.` : `Geh von ${target} aus ${m} zurück.`],
    steps: [...way, `Probe: ${n} + ${m} = ${target}.`],
    bugs: bugList(n, [
      ['summe-gerechnet', target + m, `Du suchst eine kleinere Zahl. Rechne ${target} − ${m}.`],
      ['ergaenzen-1000', target === 1000 && m % 100 !== 0 ? jedeZifferZu10(m, 1000) : null, hilfe1000(m)],
    ]),
    praise: 'Du hast mit der Umkehraufgabe rückwärts gerechnet.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

/** 1000 − 233 = □ or 1000 − □ = 767: backwards. */
function rueckwaerts(n: number, gapInMiddle: boolean): Task {
  const v = 1000 - n;
  const expression = gapInMiddle ? `1000 − ${BOX} = ${v}` : `1000 − ${n} = ${BOX}`;
  const value = gapInMiddle ? n : v;
  const known = gapInMiddle ? v : n;
  const prompt = gapInMiddle ? 'Welche Zahl gehört in die Lücke?' : 'Rechne wie beim Ergänzen.';
  return {
    key: `rueck:${n}:${gapInMiddle ? 'm' : 'e'}`,
    prompt,
    expression,
    answer: { kind: 'number', value, label: gapInMiddle ? 'Zahl in der Lücke' : 'Ergebnis' },
    hints: [`Minus bis 1000 geht wie Ergänzen: ${known} + ${BOX} = 1000.`, firstHint(known, 1000)],
    steps: [`${known} + ${BOX} = 1000 hilft dir.`, ...wegSteps(known, 1000)],
    bugs: bugList(value, [
      ['ergaenzen-1000', jedeZifferZu10(known, 1000), hilfe1000(known)],
      ['neuner-ergaenzung', known % 10 !== 0 ? value - 1 : null, einerBis10(known % 10)],
    ]),
    praise: 'Du hast die Minusaufgabe als Ergänzen gerechnet.',
    srText: spoken(prompt, expression),
  };
}

/** A short story around 'Wie viel fehlt?' */
function geschichte(rng: Rng, n: number, target: number): Task {
  const person = pickPerson(rng);
  const kind = rng.int(0, 1);
  const context =
    kind === 0
      ? `Die Klasse sammelt ${target} Deckel für das Schulfest. ${n} Deckel sind schon da.`
      : `Beim Schulfest gibt es bei ${target} Punkten einen Preis. ${person.name} hat ${n} Punkte.`;
  const prompt = kind === 0 ? 'Wie viele Deckel fehlen noch?' : 'Wie viele Punkte fehlen noch?';
  const unit = kind === 0 ? 'Deckel' : 'Punkte';
  return {
    key: `story:${kind}:${kind === 0 ? '' : person.name}:${n}:${target}`,
    kmk: KMK_STORY,
    context,
    prompt,
    answer: { kind: 'number', value: target - n, unit, label: `Fehlende ${unit}` },
    hints: [`Rechne ${n} + ${BOX} = ${target}.`, firstHint(n, target)],
    steps: wegSteps(n, target),
    bugs: ergaenzenBugs(n, target),
    praise: `Du hast in der Geschichte bis ${target} ergänzt.`,
    srText: spoken(context, prompt),
  };
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

/** A number on a full ten, not on a hundred, and the next hundred. */
function zuHunderter(rng: Rng): [number, number] {
  const h = rng.int(1, 8);
  return [h * 100 + rng.int(1, 9) * 10, (h + 1) * 100];
}

function zuHunderterKrumm(rng: Rng): [number, number] {
  const h = rng.int(1, 8);
  return [h * 100 + rng.int(1, 9) * 10 + rng.int(1, 9), (h + 1) * 100];
}

const hzNull = (rng: Rng) => rng.int(1, 9) * 100 + rng.int(1, 9) * 10;
const hze = (rng: Rng) => rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng) => Task)[]>> = {
  1: {
    1: [(rng) => plusLuecke(...zuHunderter(rng))],
    2: [(rng) => wieVielFehlt(...zuHunderter(rng)), (rng) => plusLuecke(...zuHunderterKrumm(rng))],
    3: [(rng) => ersteZahl(...zuHunderter(rng)), (rng) => wieVielFehlt(...zuHunderterKrumm(rng))],
  },
  2: {
    1: [(rng) => plusLuecke(rng.int(1, 9) * 100, 1000), (rng) => plusLuecke(hzNull(rng), 1000)],
    2: [(rng) => plusLuecke(hzNull(rng), 1000), (rng) => wieVielFehlt(hzNull(rng), 1000)],
    3: [(rng) => ersteZahl(hzNull(rng), 1000), (rng) => geschichte(rng, hzNull(rng), 1000)],
  },
  3: {
    1: [(rng) => plusLuecke(hze(rng), 1000)],
    2: [(rng) => rueckwaerts(hze(rng), false), (rng) => wieVielFehlt(hze(rng), 1000)],
    3: [(rng) => rueckwaerts(hze(rng), true), (rng) => ersteZahl(hze(rng), 1000), (rng) => geschichte(rng, hze(rng), 1000)],
  },
};

export const ergaenzenSkill: SkillDef = {
  ...SKILL,
  title: 'Bis zum Hunderter und bis 1000',
  description: 'Du findest, wie viel bis zur nächsten vollen Zahl fehlt.',
  stufen: {
    1: 'Bis zum nächsten Hunderter: 370 + □ = 400',
    2: 'Von Hundertern und Zehnern bis 1000',
    3: 'Von jeder Zahl bis 1000, auch rückwärts',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, rng.pick(FORMS[stufe][ab])(rng));
  },
};
