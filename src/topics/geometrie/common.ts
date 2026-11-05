/**
 * Small helpers of the geometry generators: the skill builder with its task table, picture and Ja/Nein answers, and figures on a grid.
 * A skill names its task forms per Stufe and AB level (docs/research.md §6: the catalogue's columns are roughly AB I, II, III).
 */
import { NBSP, fmt } from '../../core/format';
import type { Ab, Cell, ChoiceAnswer, ChoiceOption, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, targetAb, type ExerciseBody } from '../shared';
import { bounds, describeCells, shift, type HalfCell } from './grid';

export interface TaskCtx {
  rng: Rng;
  stufe: Stufe;
  ab: Ab;
}

/** One exercise without what the skill fills in: `ab`, and `kmk` unless the task names its own tags. */
export type TaskBody = Omit<ExerciseBody, 'ab' | 'kmk'> & { kmk?: string[] };
export type TaskFn = (c: TaskCtx) => TaskBody;
export type TaskTable = Readonly<Record<Stufe, Readonly<Record<Ab, readonly TaskFn[]>>>>;

/** A SkillDef that picks a task form of its table for the planned AB level. */
export function makeSkill(meta: Omit<SkillDef, 'topicId' | 'generate'>, table: TaskTable): SkillDef {
  const id = { id: meta.id, topicId: 'geometrie' } as const;
  return {
    ...meta,
    topicId: 'geometrie',
    generate(rng, stufe, ctx): Exercise {
      const ab = targetAb(rng, stufe, ctx);
      const { kmk, ...body } = rng.pick(table[stufe][ab])({ rng, stufe, ab });
      return build(id, stufe, { ...body, ab, kmk: kmk ?? meta.kmk });
    },
  };
}

/** Ja and Nein in the fixed order children expect. */
export function jaNein(yes: boolean, whyWrong: string): ChoiceAnswer {
  const options: ChoiceOption[] = yes ? [{ label: 'Ja' }, { label: 'Nein', whyWrong }] : [{ label: 'Ja', whyWrong }, { label: 'Nein' }];
  return { kind: 'choice', options, correct: yes ? 0 : 1 };
}

export interface PictureOption {
  visual: Visual;
  whyWrong: string;
}

/** Options that are pictures, shuffled and named by their place ('Bild A', 'Bild B', …). */
export function pictureChoice(rng: Rng, correct: Visual, wrong: readonly PictureOption[], name = 'Bild'): ChoiceAnswer {
  const all = rng.shuffle([{ visual: correct, whyWrong: '' }, ...wrong]);
  const options: ChoiceOption[] = all.map((o, i) => ({ label: `${name} ${String.fromCharCode(65 + i)}`, visual: o.visual, ...(o.visual === correct ? {} : { whyWrong: o.whyWrong }) }));
  return { kind: 'choice', options, correct: all.findIndex((o) => o.visual === correct), layout: 'grid' };
}

/** The spoken list of a choice answer, for srText. */
export function zurWahl(answer: ChoiceAnswer): string {
  return `Zur Wahl: ${answer.options.map((o) => o.label.replace(/\.$/, '')).join('; ')}.`;
}

/** The label of the correct option, for the worked steps. */
export const correctLabel = (answer: ChoiceAnswer): string => answer.options[answer.correct].label;

/** The first letter as a capital, for a name that starts a sentence. */
export const cap = (s: string): string => `${s[0].toUpperCase()}${s.slice(1)}`;

/** '3 + 4 + 5' */
export const sumText = (parts: readonly number[]): string => parts.map((p) => fmt(p)).join(' + ');
export const sum = (parts: readonly number[]): number => parts.reduce((a, b) => a + b, 0);

/** '5 Kästchen', with a no-break space. */
export const kaestchen = (n: number): string => `${fmt(n)}${NBSP}Kästchen`;

type GridVisual = Extract<Visual, { type: 'grid' }>;

/** A figure on a grid with `margin` empty cells around it. */
export function placeOnGrid(cells: readonly Cell[], opts: { halves?: readonly HalfCell[]; margin?: number; caption?: string } = {}): { visual: GridVisual; cells: Cell[] } {
  const margin = opts.margin ?? 1;
  const b = bounds([...cells, ...(opts.halves ?? []).map((h) => h.cell)]);
  const dx = margin - b.minX;
  const dy = margin - b.minY;
  const moved = shift(cells, dx, dy);
  const visual: GridVisual = { type: 'grid', width: b.w + 2 * margin, height: b.h + 2 * margin, cells: moved, showOutline: true };
  if (opts.halves?.length) visual.halfCells = opts.halves.map((h) => ({ cell: [h.cell[0] + dx, h.cell[1] + dy] as Cell, corner: h.corner }));
  if (opts.caption) visual.caption = opts.caption;
  return { visual, cells: moved };
}

/** Two figures side by side on one grid, separated by `gap` empty columns, with their names written above them. */
export function twoFigures(a: readonly Cell[], b: readonly Cell[], gap = 2): GridVisual {
  const ba = bounds(a);
  const bb = bounds(b);
  const h = Math.max(ba.h, bb.h);
  const A = shift(a, 1 - ba.minX, 2 - ba.minY + h - ba.h);
  const B = shift(b, 1 + ba.w + gap - bb.minX, 2 - bb.minY + h - bb.h);
  return {
    type: 'grid',
    width: ba.w + gap + bb.w + 2,
    height: h + 3,
    cells: [...A, ...B],
    showOutline: true,
    labels: [{ cell: [1, 0], text: 'A' }, { cell: [1 + ba.w + gap, 0], text: 'B' }],
  };
}

/** The spoken form of twoFigures(a, b): where each figure stands and which cells it has. `countA` is the number of cells of a. */
export function twoFiguresText(visual: GridVisual, countA: number): string {
  return `Zwei Figuren im Kästchengitter. Figur A steht links. Angemalt: ${describeCells(visual.cells.slice(0, countA))}. Figur B steht rechts. Angemalt: ${describeCells(visual.cells.slice(countA))}.`;
}
