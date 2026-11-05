/**
 * Würfelgebäude. heights[row][col] = cubes on a field; row 0 = hinten, last row = vorne. A drawn building never grows towards the front
 * or the right, so every tower top is visible, and the count is clear because no cube floats.
 * Stufe 1: count cubes up to 12; hidden cubes shown by the plan.
 * Stufe 2: drawing to Bauplan; up to 20 cubes.
 * Stufe 3: cubes missing to a Quader; match views.
 */
import { makeChoice, numberBugs, plural } from '../shared';
import type { Rng, Visual } from '../../core/types';
import { correctLabel, makeSkill, pictureChoice, sum, sumText, zurWahl, type TaskFn, type TaskTable } from './common';

type Heights = number[][];

export const total = (h: Heights): number => sum(h.flat());
export const towers = (h: Heights): number => h.flat().filter((v) => v > 0).length;
const hid = (h: Heights): string => h.map((r) => r.join('')).join('-');

/** Cubes that cannot be seen in the drawing: front, right and top neighbour present. Exact for the buildings drawn here. */
export function hiddenCubes(h: Heights): number {
  let n = 0;
  h.forEach((row, r) => row.forEach((t, c) => {
    for (let z = 0; z < t; z++) if ((h[r + 1]?.[c] ?? 0) > z && (row[c + 1] ?? 0) > z && z + 1 < t) n++;
  }));
  return n;
}

/** Never higher towards the front or the right; the far ends are used, and the back-left tower is at least 2 high, so some cube is always hidden. */
function building(rng: Rng, R: number, C: number, maxH: number, maxCubes: number): Heights {
  for (;;) {
    const h: Heights = [];
    for (let r = 0; r < R; r++) {
      h.push([]);
      for (let c = 0; c < C; c++) {
        const ub = Math.min(r > 0 ? h[r - 1][c] : maxH, c > 0 ? h[r][c - 1] : maxH);
        h[r].push(rng.int(r === 0 && c === 0 ? 2 : 0, Math.max(ub, r === 0 && c === 0 ? 2 : 0)));
      }
    }
    if (h[R - 1][0] === 0 || h[0][C - 1] === 0 || total(h) > maxCubes) continue;
    return h;
  }
}

const iso = (heights: Heights): Visual => ({ type: 'cubeBuilding', heights, view: 'iso' });
const plan = (heights: Heights): Visual => ({ type: 'cubeBuilding', heights, view: 'plan' });

const rowWord = (R: number, r: number): string => (r === 0 ? 'hinten' : r === R - 1 ? 'vorne' : 'in der Mitte');
const speakPlan = (h: Heights): string => h.map((row, r) => `${rowWord(h.length, r)} von links: ${row.join(', ')}`).join('; ');

const FLOAT = 'Kein Würfel schwebt.';
const HIDDEN_HINT = 'Unter einem oberen Würfel steht noch einer.';
const TOWER_HINT = 'Du hast nur die Türme gezählt. Wie hoch ist jeder Turm?';
const plusLine = (values: readonly number[]): string => {
  const v = values.filter((x) => x > 0);
  return v.length > 1 ? `${sumText(v)} = ${sum(v)}` : `${sum(v)}`;
};

/** Sum of a Bauplan. */
const planCount: TaskFn = ({ rng, stufe, ab }) => {
  const small = stufe === 1 && ab === 1;
  for (;;) {
    const R = 2;
    const C = small ? 2 : rng.int(2, 3);
    const h: Heights = Array.from({ length: R }, () => Array.from({ length: C }, () => rng.int(small ? 1 : 0, stufe === 1 ? 3 : 4)));
    const n = total(h);
    if (n < 3 || n > (stufe === 1 ? 12 : 20) || towers(h) < 2) continue;
    const prompt = 'Das ist ein Bauplan. Wie viele Würfel brauchst du für das Gebäude?';
    return {
      key: `plan:${hid(h)}`,
      prompt,
      visual: plan(h),
      answer: { kind: 'number', value: n, unit: 'Würfel' },
      bugs: numberBugs([{ id: 'felder', match: towers(h), hint: TOWER_HINT }], n),
      hints: ['Jede Zahl sagt: So viele Würfel stehen dort übereinander.', 'Rechne alle Zahlen im Bauplan zusammen.'],
      steps: [{ text: 'So sieht das Gebäude aus:', visual: iso(h) }, plusLine(h.flat()), `Du brauchst ${n} Würfel.`],
      praise: 'Du hast den Bauplan Zahl für Zahl gelesen.',
      srText: `Bauplan von oben. Turmhöhen: ${speakPlan(h)}. Wie viele Würfel brauchst du für das Gebäude?`,
    };
  }
};

/** A row of towers: nothing can hide. */
function towerRow(rng: Rng): Heights {
  const row = Array.from({ length: rng.int(2, 4) }, () => rng.int(1, 3)).sort((a, b) => b - a);
  return [row];
}

/** A drawn building; `hidden` decides whether some cubes cannot be seen. */
function drawnCount(hidden: boolean): TaskFn {
  return ({ rng, stufe }) => {
    const max = stufe === 1 ? 12 : 20;
    const h = hidden ? building(rng, rng.int(2, stufe === 1 ? 2 : 3), rng.int(2, 3), stufe === 1 ? 3 : 4, max) : towerRow(rng);
    const n = total(h);
    const prompt = 'Wie viele Würfel hat das Gebäude?';
    const secret = hiddenCubes(h);
    return {
      key: `gebaeude:${hid(h)}`,
      ...(hidden ? { context: `${FLOAT} Unter jedem Würfel steht ein Würfel.` } : {}),
      prompt,
      visual: iso(h),
      answer: { kind: 'number', value: n, unit: 'Würfel' },
      bugs: numberBugs([
        secret > 0 && { id: 'verdeckt', match: n - secret, hint: HIDDEN_HINT },
        { id: 'felder', match: towers(h), hint: TOWER_HINT },
      ], n),
      hints: ['Geh Turm für Turm vor. Wie hoch ist jeder Turm?', hidden ? 'Hinter den vorderen Würfeln sind Würfel verdeckt.' : 'Rechne die Höhen aller Türme zusammen.'],
      steps: [{ text: 'Der Bauplan zeigt die Höhe jedes Turms:', visual: plan(h) }, plusLine(h.flat()), secret > 0 ? `${secret} ${plural(secret, 'Würfel ist', 'Würfel sind')} verdeckt. Das Gebäude hat ${n} Würfel.` : `Das Gebäude hat ${n} Würfel.`],
      praise: hidden ? 'Du hast auch an die verdeckten Würfel gedacht.' : 'Du hast Turm für Turm gezählt.',
      srText: `Würfelgebäude, schräg von vorne. Turmhöhen: ${speakPlan(h)}. ${prompt}`,
    };
  };
}

const rowOfPlan: TaskFn = ({ rng }) => {
  const R = 2;
  const C = rng.int(2, 3);
  // at most 2 high with 3 columns, so the plan stays within the 12 cubes of Stufe 1
  const h: Heights = Array.from({ length: R }, () => Array.from({ length: C }, () => rng.int(1, C === 3 ? 2 : 3)));
  const r = rng.int(0, 1);
  const n = sum(h[r]);
  const where = r === 0 ? 'hinteren' : 'vorderen';
  const asked = r === 0 ? 'hintere' : 'vordere';
  const prompt = `Das ist ein Bauplan. Wie viele Würfel stehen in der ${where} Reihe?`;
  return {
    key: `reihe:${hid(h)}:${r}`,
    prompt,
    visual: plan(h),
    answer: { kind: 'number', value: n, unit: 'Würfel' },
    bugs: numberBugs([
      { id: 'felder', match: C, hint: TOWER_HINT },
      { id: 'andere-reihe', match: sum(h[1 - r]), hint: 'Vorne ist im Bauplan unten. Hinten ist oben.' },
      { id: 'ganzer-plan', match: total(h), hint: `Gefragt ist nur die ${asked} Reihe.` },
    ], n),
    hints: ['Im Bauplan ist vorne unten und hinten oben.', 'Rechne nur die Zahlen dieser Reihe zusammen.'],
    steps: [`In der ${where} Reihe stehen: ${h[r].join(', ')}.`, `${sumText(h[r])} = ${n}`, `Das sind ${n} Würfel.`],
    praise: 'Du hast im Bauplan die richtige Reihe gefunden.',
    srText: `Bauplan von oben. Turmhöhen: ${speakPlan(h)}. Wie viele Würfel stehen in der ${where} Reihe?`,
  };
};

const hiddenCount: TaskFn = ({ rng }) => {
  const h = building(rng, rng.int(2, 3), rng.int(2, 3), 3, 20);
  const n = hiddenCubes(h);
  const context = `${FLOAT} Unter jedem Würfel steht ein Würfel.`;
  const prompt = 'Wie viele Würfel sind ganz verdeckt?';
  return {
    key: `verdeckt:${hid(h)}`,
    context,
    prompt,
    visual: iso(h),
    answer: { kind: 'number', value: n, unit: 'Würfel' },
    bugs: numberBugs([{ id: 'alle-wuerfel', match: total(h), hint: 'Gefragt sind nur die Würfel ohne sichtbare Fläche.' }], n),
    hints: ['Ein verdeckter Würfel hat vorne, rechts und oben einen Nachbarn.', 'Schau zuerst auf den höchsten Turm hinten links.'],
    steps: [{ text: 'Der Bauplan zeigt die Höhe jedes Turms:', visual: plan(h) }, `Das Gebäude hat ${total(h)} Würfel.`, `${n} ${plural(n, 'Würfel ist', 'Würfel sind')} ganz verdeckt.`],
    praise: 'Du hast dir das Innere des Gebäudes vorgestellt.',
    srText: `Würfelgebäude, schräg von vorne. Turmhöhen: ${speakPlan(h)}. ${context} ${prompt}`,
  };
};

const sameHeights = (a: Heights, b: Heights): boolean => hid(a) === hid(b);

/** The right plan of a drawing, with plans that mix up the sides or forget a hidden cube. */
const toPlan: TaskFn = ({ rng }) => {
  for (;;) {
    const h = building(rng, 2, rng.int(2, 3), 3, 20);
    const backFront = [...h].reverse();
    const mirrored = h.map((row) => [...row].reverse());
    const shorter = h.map((row) => row.map((v, c) => (c === 0 && row === h[0] && v > 1 ? v - 1 : v)));
    const cand: { heights: Heights; why: string }[] = [
      { heights: backFront, why: 'Im Bauplan ist vorne unten. Prüfe die Reihen.' },
      { heights: mirrored, why: 'Schau auf links und rechts. Der Bauplan zeigt das Gebäude von oben.' },
      { heights: shorter, why: HIDDEN_HINT },
    ].filter((x) => !sameHeights(x.heights, h));
    const unique = cand.filter((x, i) => cand.findIndex((y) => sameHeights(x.heights, y.heights)) === i);
    if (unique.length < 2) continue;
    const answer = pictureChoice(rng, plan(h), unique.map((x) => ({ visual: plan(x.heights), whyWrong: x.why })), 'Bauplan');
    const prompt = 'Welcher Bauplan passt zu diesem Gebäude?';
    return {
      key: `zum-plan:${hid(h)}`,
      prompt,
      visual: iso(h),
      answer,
      hints: ['Wie hoch ist der Turm hinten links? Das Feld liegt im Bauplan oben links.', 'Vergleiche danach die anderen Türme mit dem Bauplan.'],
      steps: [`Hinten von links: ${h[0].join(', ')}. Vorne von links: ${h[1].join(', ')}.`, `Das zeigt ${correctLabel(answer)}.`],
      praise: 'Du hast Bild und Bauplan Feld für Feld verglichen.',
      srText: `Würfelgebäude, schräg von vorne. Turmhöhen: ${speakPlan(h)}. ${prompt} ${zurWahl(answer)}`,
    };
  }
};

const towerHeight: TaskFn = ({ rng, stufe }) => {
  const h = building(rng, 2, rng.int(2, 3), 3, stufe === 1 ? 12 : 20);
  const r = rng.int(0, 1);
  const c = rng.pick(h[r].flatMap((v, i) => (v > 0 ? [i] : [])));
  const n = h[r][c];
  const col = c === 0 ? 'links' : c === h[r].length - 1 ? 'rechts' : 'in der Mitte';
  const where = `${rowWord(2, r)} ${col}`;
  const visibleInTower = n - (r === 0 && (h[1][c] ?? 0) > 0 && (h[0][c + 1] ?? 0) > 0 ? Math.min(h[1][c], h[0][c + 1], n - 1) : 0);
  const prompt = `Welche Zahl gehört im Bauplan auf das Feld ${where}?`;
  return {
    key: `turm:${hid(h)}:${r}.${c}`,
    context: FLOAT,
    prompt,
    visual: iso(h),
    answer: { kind: 'number', value: n, before: 'Zahl:' },
    bugs: numberBugs([{ id: 'verdeckt', match: visibleInTower, hint: HIDDEN_HINT }], n),
    hints: [`Suche den Turm ${where}. Vorne ist im Bild unten.`, 'Zähle die Würfel dieses Turms von unten bis oben.'],
    steps: [`Der Turm ${where} ist ${n} Würfel hoch.`, { text: `Im Bauplan steht dort die ${n}.`, visual: plan(h) }],
    praise: 'Du hast den Turm im Bauplan wiedergefunden.',
    srText: `Würfelgebäude, schräg von vorne. Turmhöhen: ${speakPlan(h)}. ${prompt}`,
  };
};

/** Cubes missing to the Quader around the building. */
function missing(useIso: boolean): TaskFn {
  return ({ rng }) => {
    const R = rng.int(2, 3);
    const C = rng.int(2, 3);
    const H = rng.int(2, 3);
    let h: Heights;
    do h = building(rng, R, C, H, 26);
    while (Math.max(...h.flat()) !== H || total(h) === R * C * H);
    const whole = R * C * H;
    const n = whole - total(h);
    const secret = hiddenCubes(h);
    // "Felder", not "3 Türme": spokenWords() reads a number before "Tü" as "Tausender" + "ürme".
    const context = `Das Gebäude soll ein Quader werden: ${R} Reihen mit je ${C} Feldern.`;
    const prompt = `Jeder Turm soll ${H} Würfel hoch sein. Wie viele Würfel fehlen?`;
    return {
      key: `quader:${useIso ? 'bild' : 'plan'}:${hid(h)}`,
      context,
      prompt,
      visual: useIso ? iso(h) : plan(h),
      answer: { kind: 'number', value: n, unit: 'Würfel' },
      bugs: numberBugs([
        { id: 'ganzer-quader', match: whole, hint: 'Du hast den ganzen Quader gerechnet. Ein Teil steht schon.' },
        { id: 'gebaeude', match: total(h), hint: 'So viele Würfel stehen schon. Gefragt sind die fehlenden Würfel.' },
        secret > 0 && { id: 'verdeckt', match: whole - (total(h) - secret), hint: HIDDEN_HINT },
      ], n),
      hints: [`Wie viele Würfel fehlen auf jedem Feld bis zur Höhe ${H}?`, 'Rechne: ganzer Quader minus Würfel im Gebäude.'],
      steps: [`Der ganze Quader hat ${R} · ${C} · ${H} = ${whole} Würfel.`, `Das Gebäude hat schon ${total(h)} Würfel.`, `${whole} − ${total(h)} = ${n}`, `Es ${plural(n, 'fehlt', 'fehlen')} ${n} Würfel.`],
      praise: 'Du hast den Quader mit dem Gebäude verglichen.',
      srText: `${useIso ? 'Würfelgebäude, schräg von vorne' : 'Bauplan von oben'}. Turmhöhen: ${speakPlan(h)}. ${context} ${prompt}`,
    };
  };
}

const frontView = (h: Heights): number[] => h[0].map((_, c) => Math.max(...h.map((row) => row[c])));
const sideView = (h: Heights): number[] => h.map((row) => Math.max(...row)).reverse();
const same = (a: readonly number[], b: readonly number[]): boolean => a.join() === b.join();

/** A silhouette as its own picture (a front view stands in one row, a side view in one column, seen from the right). */
function view(sil: readonly number[], kind: 'front' | 'side'): Visual {
  return kind === 'front' ? { type: 'cubeBuilding', heights: [[...sil]], view: 'front' } : { type: 'cubeBuilding', heights: [...sil].reverse().map((v) => [v]), view: 'side' };
}

const matchView: TaskFn = ({ rng }) => {
  const kind = rng.pick(['front', 'side'] as const);
  for (;;) {
    const R = rng.int(2, 3);
    const C = rng.int(2, 3);
    const h: Heights = Array.from({ length: R }, () => Array.from({ length: C }, () => rng.int(0, 3)));
    if (h.some((row) => row.every((v) => v === 0)) || h[0].some((_, c) => h.every((row) => row[c] === 0))) continue;
    const right = kind === 'front' ? frontView(h) : sideView(h);
    const cand: { sil: number[]; why: string }[] = kind === 'front'
      ? [
          { sil: [...right].reverse(), why: 'So sieht das Gebäude von hinten aus. Links und rechts sind vertauscht.' },
          { sil: [...h[R - 1]], why: 'Du hast nur die vordere Reihe angeschaut. Höhere Türme dahinter siehst du auch.' },
          { sil: h[0].map((_, c) => sum(h.map((row) => row[c]))), why: 'Von vorne siehst du nur den höchsten Turm jeder Spalte.' },
        ]
      : [
          { sil: [...right].reverse(), why: 'So sieht das Gebäude von links aus. Vorne und hinten sind vertauscht.' },
          { sil: h.map((row) => row[C - 1]).reverse(), why: 'Du hast nur die rechte Spalte angeschaut. Höhere Türme dahinter siehst du auch.' },
          { sil: h.map((row) => sum(row)).reverse(), why: 'Von rechts siehst du nur den höchsten Turm jeder Reihe.' },
        ];
    const wrong = cand.filter((x, i) => !same(x.sil, right) && Math.max(...x.sil) <= 6 && cand.findIndex((y) => same(x.sil, y.sil)) === i);
    if (wrong.length < 2) continue;
    const answer = pictureChoice(rng, view(right, kind), wrong.map((w) => ({ visual: view(w.sil, kind), whyWrong: w.why })), 'Ansicht');
    const dir = kind === 'front' ? 'von vorne' : 'von rechts';
    const prompt = `Das ist ein Bauplan. Wie sieht das Gebäude ${dir} aus?`;
    return {
      key: `ansicht:${kind}:${hid(h)}`,
      prompt,
      visual: plan(h),
      answer,
      hints: [kind === 'front' ? 'Vorne ist im Bauplan unten. Stell dich dorthin.' : 'Stell dich rechts neben den Bauplan. Vorne ist dann links.', kind === 'front' ? 'Du siehst in jeder Spalte nur den höchsten Turm.' : 'Du siehst in jeder Reihe nur den höchsten Turm.'],
      steps: [`Der höchste Turm ${kind === 'front' ? 'jeder Spalte, von links' : 'jeder Reihe, von vorne'}: ${right.join(', ')}.`, { text: `Das zeigt ${correctLabel(answer)}.`, visual: view(right, kind) }],
      praise: 'Du hast dich in Gedanken neben das Gebäude gestellt.',
      srText: `Bauplan von oben. Turmhöhen: ${speakPlan(h)}. ${prompt} ${zurWahl(answer)}`,
    };
  }
};

/** Reading one tower off the drawing. */
const heightOfBuilding: TaskFn = ({ rng, stufe }) => {
  const h = building(rng, rng.int(2, 3), rng.int(2, 3), 4, stufe === 1 ? 12 : 20);
  const n = Math.max(...h.flat());
  const prompt = 'Wie viele Würfel hoch ist der höchste Turm?';
  const answer = makeChoice(rng, { label: `${n}` }, [n + 1, n - 1, total(h)].filter((v) => v > 0 && v !== n).map((v) => ({ label: `${v}`, whyWrong: 'Suche den höchsten Turm. Zähle die Würfel von unten nach oben.' })));
  return {
    key: `hoehe:${hid(h)}`,
    prompt,
    visual: iso(h),
    answer,
    hints: ['Der höchste Turm steht in diesem Gebäude hinten links.', 'Zähle dort die Würfel von unten nach oben.'],
    steps: ['Der Turm hinten links ist am höchsten.', `Der Turm ist ${n} Würfel hoch.`],
    praise: 'Du hast den höchsten Turm gefunden.',
    srText: `Würfelgebäude, schräg von vorne. Turmhöhen: ${speakPlan(h)}. ${prompt} ${zurWahl(answer)}`,
  };
};

const TABLE: TaskTable = {
  1: {
    1: [planCount, drawnCount(false)],
    2: [drawnCount(true), rowOfPlan, heightOfBuilding],
    3: [drawnCount(true), towerHeight],
  },
  2: {
    1: [planCount, drawnCount(true)],
    2: [toPlan, towerHeight, drawnCount(true)],
    3: [hiddenCount, toPlan],
  },
  3: {
    1: [drawnCount(true), toPlan],
    2: [missing(false), matchView, hiddenCount],
    3: [missing(true), matchView],
  },
};

export const wuerfelgebaeudeSkill = makeSkill({
  id: 'geometrie.wuerfelgebaeude',
  title: 'Würfelgebäude',
  description: 'Du zählst Würfel und liest Baupläne.',
  stufen: { 1: 'Würfel zählen bis 12; verdeckte Würfel im Bauplan sehen', 2: 'Vom Gebäude zum Bauplan; bis 20 Würfel', 3: 'Fehlende Würfel zum Quader; Ansichten zuordnen' },
  kmk: ['RF.raum'],
}, TABLE);
