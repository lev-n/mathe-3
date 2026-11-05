/**
 * Körper.
 * Stufe 1: Würfel, Quader, Kugel, Zylinder; Ecken, Kanten, Flächen.
 * Stufe 2: also Pyramide and Kegel; sort by properties.
 * Stufe 3: views (which solid from above?), stamps, riddles with clues.
 */
import { joinDe, makeChoice, numberBugs, plural, type MaybeBug } from '../shared';
import type { ChoiceOption, Rng, ShapeKind, Stufe, Visual } from '../../core/types';
import { cap, correctLabel, jaNein, makeSkill, pictureChoice, sum, sumText, zurWahl, type TaskFn, type TaskTable } from './common';
import { ALL_SOLIDS, FIRST_SOLIDS, otherSolids, SOLIDS, whyNotSolid, type Ansicht, type KoerperKind, type Part } from './solids';

const solid = (k: KoerperKind, named = false): Visual => ({ type: 'solid', solid: k, ...(named ? { named } : {}) });
const poolFor = (stufe: Stufe): readonly KoerperKind[] => (stufe === 1 ? FIRST_SOLIDS : ALL_SOLIDS);

function namesOf(rng: Rng, kind: KoerperKind, stufe: Stufe): ChoiceOption[] {
  const others = otherSolids(poolFor(stufe), kind);
  return rng.sample(others, Math.min(3, others.length)).map((k) => ({ label: SOLIDS[k].name, whyWrong: whyNotSolid(k, kind) }));
}

const nameSolid: TaskFn = ({ rng, stufe }) => {
  const kind = rng.pick(poolFor(stufe));
  const answer = makeChoice(rng, { label: SOLIDS[kind].name }, namesOf(rng, kind, stufe));
  const prompt = 'Wie heißt dieser Körper?';
  return {
    key: `name:${kind}`,
    prompt,
    visual: solid(kind),
    answer,
    hints: ['Hat der Körper Ecken? Oder ist der Körper rund?', 'Schau auf die Flächen: Welche Form haben die Flächen?'],
    steps: [SOLIDS[kind].beschreibung, `Der Körper heißt ${SOLIDS[kind].name}.`],
    praise: 'Du hast den Körper an den Flächen erkannt.',
    srText: `Zeichnung eines Körpers: ${SOLIDS[kind].beschreibung} ${prompt} ${zurWahl(answer)}`,
  };
};

const OBJECTS: readonly { thing: string; why: string; kind: KoerperKind }[] = [
  { thing: 'einem Ball', why: 'Ein Ball ist überall rund.', kind: 'kugel' },
  { thing: 'einer Orange', why: 'Eine Orange ist fast überall rund.', kind: 'kugel' },
  { thing: 'einem Spielwürfel', why: 'Ein Spielwürfel hat 6 gleich große Quadrate.', kind: 'wuerfel' },
  { thing: 'einem Schuhkarton', why: 'Ein Schuhkarton hat 6 rechteckige Flächen.', kind: 'quader' },
  { thing: 'einem Ziegelstein', why: 'Ein Ziegelstein hat 6 rechteckige Flächen.', kind: 'quader' },
  { thing: 'einer Dose', why: 'Eine Dose hat oben und unten einen Kreis.', kind: 'zylinder' },
  { thing: 'einer Kerze', why: 'Eine Kerze hat oben und unten einen Kreis.', kind: 'zylinder' },
  { thing: 'einer Eistüte', why: 'Eine Eistüte hat einen Kreis und eine Spitze.', kind: 'kegel' },
  { thing: 'einem Partyhut', why: 'Ein Partyhut hat einen Kreis und eine Spitze.', kind: 'kegel' },
  // The faces are named: a Turmdach can also be round, and then it is a Kegel.
  { thing: 'einem Turmdach mit 4 dreieckigen Flächen', why: 'Das Turmdach hat unten ein Quadrat und oben eine Spitze.', kind: 'pyramide' },
];

const everydayThing: TaskFn = ({ rng, stufe }) => {
  const item = rng.pick(OBJECTS.filter((o) => poolFor(stufe).includes(o.kind)));
  const answer = makeChoice(rng, { label: SOLIDS[item.kind].name }, namesOf(rng, item.kind, stufe));
  const prompt = `Welcher Körper passt zu ${item.thing}?`;
  return {
    key: `ding:${item.thing}`,
    prompt,
    answer,
    hints: ['Stell dir das Ding vor. Kann das Ding rollen?', 'Hat das Ding Ecken? Welche Form haben die Flächen?'],
    steps: [item.why, `Das passt zum Körper ${SOLIDS[item.kind].name}.`],
    praise: 'Du hast den Körper im Alltag wiedererkannt.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const canRoll: TaskFn = ({ rng, stufe }) => {
  const kind = rng.pick(poolFor(stufe));
  const f = SOLIDS[kind];
  const prompt = 'Kann dieser Körper rollen?';
  return {
    key: `rollen:${kind}`,
    prompt,
    visual: solid(kind),
    answer: jaNein(f.rollt, f.rollt ? 'Schau auf die gebogene Fläche. Die Fläche ist rund.' : 'Schau auf die Flächen. Alle Flächen sind flach und eckig.'),
    hints: ['Ein Körper rollt auf einer gebogenen Fläche.', 'Hat dieser Körper eine gebogene Fläche?'],
    steps: [f.rollt ? 'Der Körper hat eine gebogene Fläche.' : 'Der Körper hat nur flache Flächen.', `Die Antwort ist ${f.rollt ? 'Ja' : 'Nein'}.`],
    praise: 'Du hast auf die Flächen des Körpers geachtet.',
    srText: `Zeichnung: ${f.der}. ${prompt}`,
  };
};

const PART_WORD: Readonly<Record<Part, string>> = { ecken: 'Ecken', kanten: 'Kanten', flaechen: 'Flächen' };
const WHAT_IS: Readonly<Record<Part, string>> = {
  ecken: 'An einer Ecke treffen sich Kanten.',
  kanten: 'Kanten sind die Linien zwischen den Ecken.',
  flaechen: 'Flächen kannst du anfassen. Der Körper kann auf einer Fläche stehen.',
};
const HIDDEN_HINT: Readonly<Record<Part, string>> = {
  ecken: 'Denk auch an die verdeckte Ecke hinten.',
  kanten: 'Denk auch an die verdeckten Kanten. Die Linien sind gestrichelt.',
  flaechen: 'Denk auch an die verdeckten Flächen hinten und unten.',
};

/** Pairs of Körper and part that a task may ask (src/topics/geometrie/solids.ts names the ones it leaves out). */
function askable(pool: readonly KoerperKind[]): [KoerperKind, Part][] {
  const out: [KoerperKind, Part][] = [];
  for (const k of pool) for (const part of ['ecken', 'kanten', 'flaechen'] as const) if (SOLIDS[k][part] !== null) out.push([k, part]);
  return out;
}

const countPart: TaskFn = ({ rng, stufe }) => {
  const [kind, part] = rng.pick(askable(poolFor(stufe)));
  const f = SOLIDS[kind];
  const n = f[part] as number;
  const word = PART_WORD[part];
  const curved = f.rollt && part === 'flaechen';
  const prompt = curved ? 'Zähle die gebogene Fläche mit. Wie viele Flächen hat dieser Körper?' : `Wie viele ${word} hat dieser Körper?`;
  const others = (['ecken', 'kanten', 'flaechen'] as const).filter((p) => p !== part);
  const bugs: MaybeBug[] = [
    f.sichtbar && { id: 'verdeckt', match: f.sichtbar[part], hint: HIDDEN_HINT[part] },
    ...others.map((p): MaybeBug => (f[p] ? { id: 'verwechselt', match: f[p] as number, hint: WHAT_IS[part] } : null)),
  ];
  const parts = f.zaehlen[part] ?? [];
  const steps = [f.wo[part]!, ...(parts.length > 1 && parts.length < 6 ? [`${sumText(parts)} = ${sum(parts)}`] : []), `${cap(f.der)} hat ${n} ${plural(n, 'Fläche', word)}.`]; // only the Kugel has exactly 1 of a part
  return {
    key: `zaehlen:${kind}:${part}`,
    prompt,
    visual: solid(kind, true),
    // No unit on the round Körper: "Fläche" beside the field would say that the Kugel has 1.
    answer: curved ? { kind: 'number', value: n, before: 'Anzahl:' } : { kind: 'number', value: n, unit: word },
    bugs: numberBugs(bugs, n),
    hints: [WHAT_IS[part], f.rollt ? 'Fahre mit dem Finger einmal um den Körper herum.' : 'Zähle oben, dann unten, dann dazwischen.'],
    steps,
    praise: f.sichtbar ? 'Du hast auch an die verdeckten Teile gedacht.' : `Du hast die ${word} genau geprüft.`,
    srText: `Zeichnung: ${f.der}. ${prompt}`,
  };
};

const CLUES: readonly { clue: string; kind: KoerperKind }[] = [
  { clue: 'nur 1 Fläche', kind: 'kugel' },
  { clue: '2 Kreise und 1 gebogene Fläche', kind: 'zylinder' },
  { clue: '1 Kreis und eine Spitze', kind: 'kegel' },
  { clue: '1 Quadrat und 4 Dreiecke', kind: 'pyramide' },
  { clue: '5 Ecken und 8 Kanten', kind: 'pyramide' },
  { clue: '6 gleich große Quadrate', kind: 'wuerfel' },
  { clue: '6 Rechtecke und keine Spitze', kind: 'quader' },
];

const byProperty: TaskFn = ({ rng, stufe }) => {
  const pool = poolFor(stufe);
  const item = rng.pick(CLUES.filter((c) => pool.includes(c.kind)));
  const others = otherSolids(pool, item.kind, true);
  const answer = makeChoice(rng, { label: SOLIDS[item.kind].name }, rng.sample(others, Math.min(3, others.length)).map((k) => ({ label: SOLIDS[k].name, whyWrong: whyNotSolid(k, item.kind) })));
  const prompt = `Welcher Körper hat ${item.clue}?`;
  return {
    key: `eigenschaft:${item.clue}`,
    prompt,
    answer,
    hints: ['Stell dir jeden Körper vor. Prüfe die Flächen.', 'Fange mit einem Körper an. Prüfe dann den nächsten Körper.'],
    steps: [`${cap(SOLIDS[item.kind].der)} hat ${item.clue}.`, `Der Körper heißt ${SOLIDS[item.kind].name}.`],
    praise: 'Du hast die Körper nach Eigenschaften geprüft.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const LIST_PROPS: readonly { key: string; prompt: string; has: (k: KoerperKind) => boolean; why: string }[] = [
  { key: 'rollen', prompt: 'Wie viele dieser Körper können rollen?', has: (k) => SOLIDS[k].rollt, why: 'Ein Körper rollt auf einer gebogenen Fläche.' },
  { key: 'spitze', prompt: 'Wie viele dieser Körper haben eine Spitze?', has: (k) => SOLIDS[k].hatSpitze, why: 'Prüfe jeden Körper: Läuft der Körper oben spitz zu?' },
  { key: 'flach', prompt: 'Wie viele dieser Körper haben nur flache Flächen?', has: (k) => !SOLIDS[k].rollt, why: 'Körper mit gebogener Fläche passen nicht zur Frage.' },
];

const sortList: TaskFn = ({ rng }) => {
  const p = rng.pick(LIST_PROPS);
  const list = rng.sample(ALL_SOLIDS, rng.int(4, 5));
  const n = list.filter(p.has).length;
  const names = list.map((k) => SOLIDS[k].name);
  const prompt = `${names.join(', ')}. ${p.prompt}`;
  return {
    key: `liste:${p.key}:${list.join('-')}`,
    prompt,
    answer: { kind: 'number', value: n, unit: 'Körper' },
    bugs: numberBugs([{ id: 'ganze-liste', match: list.length, hint: 'Prüfe jeden Körper einzeln: Passt der Körper zur Frage?' }], n),
    hints: ['Stell dir jeden Körper einzeln vor.', p.why],
    steps: [n === 0 ? 'Kein Körper passt zur Frage.' : `Zur Frage passen: ${joinDe(list.filter(p.has).map((k) => SOLIDS[k].name))}.`, plural(n, 'Das ist 1 Körper.', `Das sind ${n} Körper.`)],
    praise: 'Du hast jeden Körper einzeln geprüft.',
    srText: prompt,
  };
};

const VIEW_SHAPE: Readonly<Record<Ansicht, ShapeKind>> = { Kreis: 'kreis', Quadrat: 'quadrat', Rechteck: 'rechteck', Dreieck: 'gleichseitiges-dreieck' };
const VIEWS: readonly Ansicht[] = ['Kreis', 'Quadrat', 'Rechteck', 'Dreieck'];

const viewOf: TaskFn = ({ rng }) => {
  const kind = rng.pick(ALL_SOLIDS);
  const f = SOLIDS[kind];
  const fromAbove = rng.chance(0.65);
  const right = fromAbove ? f.oben : f.vorne;
  const other = fromAbove ? f.vorne : f.oben;
  const dir = fromAbove ? 'von oben' : 'von vorne';
  // a Quadrat is also a Rechteck: a view that shows a Quadrat offers no Rechteck
  const wrongs = VIEWS.filter((v) => v !== right && !(right === 'Quadrat' && v === 'Rechteck'));
  const options: ChoiceOption[] = wrongs.map((label) => ({
    label,
    visual: { type: 'shape', shape: VIEW_SHAPE[label], named: true },
    whyWrong: label === other ? `So sieht der Körper ${fromAbove ? 'von vorne' : 'von oben'} aus. Stell dich in Gedanken um.` : 'Stell den Körper in Gedanken vor dich auf den Tisch.',
  }));
  const answer = makeChoice(rng, { label: right, visual: { type: 'shape', shape: VIEW_SHAPE[right], named: true } }, options, { layout: 'grid' });
  const prompt = `Du schaust genau ${dir} auf diesen Körper. Was siehst du?`;
  return {
    key: `ansicht:${kind}:${dir}`,
    prompt,
    visual: solid(kind),
    answer,
    hints: [`Stell den Körper in Gedanken auf den Tisch. Schau ${dir}.`, fromAbove ? 'Von oben siehst du den Umriss der Grundfläche.' : 'Von vorne siehst du den Umriss des Körpers.'],
    steps: [`${cap(f.der)} steht auf dem Tisch.`, `${dir[0].toUpperCase()}${dir.slice(1)} siehst du: ${right}.`],
    praise: 'Du hast den Körper in Gedanken angeschaut.',
    srText: `Zeichnung: ${f.der}. ${prompt} ${zurWahl(answer)}`,
  };
};

const twoViews: TaskFn = ({ rng }) => {
  const kind = rng.pick(ALL_SOLIDS);
  const f = SOLIDS[kind];
  const article = (v: Ansicht) => (v === 'Kreis' ? 'einen Kreis' : `ein ${v}`);
  const context = `Von oben siehst du ${article(f.oben)}. Von vorne siehst du ${article(f.vorne)}.`;
  const prompt = 'Welcher Körper ist das?';
  const answer = makeChoice(rng, { label: f.name, visual: solid(kind, true) }, rng.sample(otherSolids(ALL_SOLIDS, kind, true), 3).map((k) => ({
    label: SOLIDS[k].name,
    visual: solid(k, true),
    whyWrong: `${cap(SOLIDS[k].der)} sieht von oben oder von vorne anders aus.`,
  })), { layout: 'grid' });
  return {
    key: `zwei-ansichten:${kind}`,
    context,
    prompt,
    answer,
    hints: ['Welche Körper sehen von oben so aus?', 'Prüfe diese Körper mit dem Blick von vorne.'],
    steps: [`Von oben: ${f.oben}. Von vorne: ${f.vorne}.`, `Beides passt nur zum Körper ${f.name}.`],
    praise: 'Du hast beide Ansichten zusammen geprüft.',
    srText: `${context} ${prompt} ${zurWahl(answer)}`,
  };
};

/** A Quadrat is also a Rechteck: Würfel and Pyramide print one too, so no Rechteck row calls them wrong. A Quader may have square faces as well. */
const STAMPS: readonly { print: Ansicht; fit: readonly KoerperKind[]; unfit: readonly KoerperKind[] }[] = [
  { print: 'Kreis', fit: ['zylinder', 'kegel'], unfit: ['wuerfel', 'quader', 'pyramide', 'kugel'] },
  { print: 'Quadrat', fit: ['wuerfel', 'pyramide'], unfit: ['kugel', 'zylinder', 'kegel'] },
  { print: 'Rechteck', fit: ['quader'], unfit: ['kugel', 'zylinder', 'kegel'] },
  { print: 'Dreieck', fit: ['pyramide'], unfit: ['wuerfel', 'kugel', 'zylinder', 'quader'] },
];

const stamp: TaskFn = ({ rng }) => {
  const s = rng.pick(STAMPS);
  const kind = rng.pick(s.fit);
  const article = s.print === 'Kreis' ? 'ein Kreis' : `ein ${s.print}`;
  const context = `Du stempelst mit einer flachen Fläche. Der Abdruck ist ${article}.`;
  const prompt = 'Welcher Körper passt?';
  const answer = makeChoice(rng, { label: SOLIDS[kind].name }, rng.sample(s.unfit, 3).map((k) => ({ label: SOLIDS[k].name, whyWrong: k === 'kugel' ? 'Eine Kugel hat keine flache Fläche.' : 'Welche flachen Flächen hat dieser Körper? Prüfe jede Fläche.' })));
  return {
    key: `stempel:${s.print}:${kind}`,
    context,
    prompt,
    answer,
    hints: ['Stell dir jeden Körper als Stempel vor.', 'Welche Form hat jede flache Fläche des Körpers?'],
    steps: [`${cap(SOLIDS[kind].der)} hat eine solche Fläche: ${s.print}.`, `Der Körper heißt ${SOLIDS[kind].name}.`],
    praise: 'Du hast die Flächen der Körper verglichen.',
    srText: `${context} ${prompt} ${zurWahl(answer)}`,
  };
};

const RIDDLES: readonly { kind: KoerperKind; clue: string }[] = [
  { kind: 'wuerfel', clue: 'Ich habe 8 Ecken. Alle meine Kanten sind gleich lang.' },
  { kind: 'wuerfel', clue: 'Meine Flächen sind 6 gleich große Quadrate. Ich rolle nicht.' },
  { kind: 'quader', clue: 'Ich habe 12 Kanten. Meine Flächen sind Rechtecke. Nicht alle Kanten sind gleich lang.' },
  { kind: 'quader', clue: 'Ich sehe aus wie ein Schuhkarton. Ich habe 6 Flächen.' },
  { kind: 'kugel', clue: 'Ich habe keine Ecke und keine Kante. Ich rolle in jede Richtung.' },
  { kind: 'zylinder', clue: 'Ich kann rollen. Oben und unten habe ich einen Kreis.' },
  { kind: 'zylinder', clue: 'Ich habe 3 Flächen. Eine davon ist gebogen.' },
  { kind: 'kegel', clue: 'Ich kann rollen. Unten habe ich einen Kreis. Oben habe ich eine Spitze.' },
  { kind: 'kegel', clue: 'Ich sehe aus wie eine Eistüte. Ich habe 2 Flächen.' },
  { kind: 'pyramide', clue: 'Ich habe 5 Ecken. Meine Seiten sind Dreiecke.' },
  { kind: 'pyramide', clue: 'Oben habe ich eine Spitze. Unten habe ich ein Quadrat.' },
];

const riddle: TaskFn = ({ rng }) => {
  const item = rng.pick(RIDDLES);
  const prompt = 'Wer bin ich?';
  const answer = makeChoice(rng, { label: SOLIDS[item.kind].name }, rng.sample(otherSolids(ALL_SOLIDS, item.kind, true), 3).map((k) => ({ label: SOLIDS[k].name, whyWrong: 'Prüfe jeden Satz an diesem Körper. Welcher Satz passt nicht?' })));
  return {
    key: `raetsel:${RIDDLES.indexOf(item)}`,
    context: item.clue,
    prompt,
    answer,
    hints: ['Lies den ersten Satz. Welche Körper passen?', 'Prüfe diese Körper mit dem nächsten Satz.'],
    steps: ['Nur ein Körper passt zu allen Sätzen.', `Der Körper heißt ${SOLIDS[item.kind].name}.`],
    praise: 'Du hast jeden Satz am Körper geprüft.',
    srText: `${item.clue} ${prompt} ${zurWahl(answer)}`,
  };
};

const pickSolidPicture: TaskFn = ({ rng, stufe }) => {
  const kind = rng.pick(poolFor(stufe));
  // The question names a Quader: a drawn Würfel is one as well. Asked for a Würfel, a drawn Quader is a fair wrong picture.
  const others = poolFor(stufe).filter((k) => k !== kind && !(kind === 'quader' && k === 'wuerfel'));
  const answer = pictureChoice(rng, solid(kind), rng.sample(others, Math.min(3, others.length)).map((k) => ({ visual: solid(k), whyWrong: whyNotSolid(kind, k) })), 'Körper');
  const prompt = `Welcher Körper ist ${kind === 'kugel' || kind === 'pyramide' ? 'eine' : 'ein'} ${SOLIDS[kind].name}?`;
  return {
    key: `bild:${kind}`,
    prompt,
    answer,
    hints: ['Schau auf die Flächen: Welche Form haben die Flächen?', 'Kann der Körper rollen? Hat der Körper eine Spitze?'],
    steps: [`${cap(SOLIDS[kind].der)} ist ${correctLabel(answer)}.`],
    praise: 'Du hast den Körper an den Flächen erkannt.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const TABLE: TaskTable = {
  1: {
    1: [nameSolid, everydayThing, pickSolidPicture],
    2: [countPart, canRoll],
    3: [countPart, canRoll, byProperty],
  },
  2: {
    1: [nameSolid, everydayThing, canRoll],
    2: [countPart, byProperty, sortList],
    3: [sortList, viewOf, byProperty],
  },
  3: {
    1: [countPart, canRoll, byProperty],
    2: [viewOf, stamp, sortList],
    3: [twoViews, riddle, stamp],
  },
};

export const koerperSkill = makeSkill({
  id: 'geometrie.koerper',
  title: 'Körper',
  description: 'Du kennst Körper und ihre Ecken, Kanten und Flächen.',
  stufen: { 1: 'Würfel, Quader, Kugel, Zylinder; Ecken, Kanten, Flächen', 2: 'Auch Pyramide und Kegel; nach Eigenschaften sortieren', 3: 'Körper von oben ansehen; Rätsel mit Hinweisen' },
  kmk: ['RF.koerper'],
}, TABLE);
