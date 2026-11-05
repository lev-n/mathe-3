/** Facts about the ebene Figuren as ShapeVisual draws them: Sechseck and Achteck are regular, the Dreieck has no right angle and no equal sides. */
import type { ShapeKind, Stufe } from '../../core/types';

export interface ShapeFacts {
  name: string;
  /** 'ein Quadrat' */
  ein: string;
  ecken: number;
  rechteWinkel: number;
  /** Pairs of parallel sides. */
  paare: number;
  /** Symmetry axes; the Kreis has more than a child can count, and tasks leave it out. */
  achsen: number;
  /** Completes "Die Figur hat …" without naming the figure. */
  beschreibung: string;
}

export const SHAPES: Readonly<Record<ShapeKind, ShapeFacts>> = {
  quadrat: { name: 'Quadrat', ein: 'ein Quadrat', ecken: 4, rechteWinkel: 4, paare: 2, achsen: 4, beschreibung: '4 Ecken und 4 gleich lange Seiten' },
  rechteck: { name: 'Rechteck', ein: 'ein Rechteck', ecken: 4, rechteWinkel: 4, paare: 2, achsen: 2, beschreibung: '4 Ecken, 2 lange und 2 kurze Seiten' },
  dreieck: { name: 'Dreieck', ein: 'ein Dreieck', ecken: 3, rechteWinkel: 0, paare: 0, achsen: 0, beschreibung: '3 Ecken und 3 verschieden lange Seiten' },
  'gleichseitiges-dreieck': { name: 'Dreieck', ein: 'ein Dreieck', ecken: 3, rechteWinkel: 0, paare: 0, achsen: 3, beschreibung: '3 Ecken und 3 gleich lange Seiten' },
  kreis: { name: 'Kreis', ein: 'ein Kreis', ecken: 0, rechteWinkel: 0, paare: 0, achsen: 0, beschreibung: 'keine Ecken und ist ganz rund' },
  sechseck: { name: 'Sechseck', ein: 'ein Sechseck', ecken: 6, rechteWinkel: 0, paare: 3, achsen: 6, beschreibung: '6 Ecken und 6 gleich lange Seiten' },
  achteck: { name: 'Achteck', ein: 'ein Achteck', ecken: 8, rechteWinkel: 0, paare: 4, achsen: 8, beschreibung: '8 Ecken und 8 gleich lange Seiten' },
  parallelogramm: { name: 'Parallelogramm', ein: 'ein Parallelogramm', ecken: 4, rechteWinkel: 0, paare: 2, achsen: 0, beschreibung: '4 schiefe Ecken, 2 lange und 2 kurze Seiten' },
  raute: { name: 'Raute', ein: 'eine Raute', ecken: 4, rechteWinkel: 0, paare: 2, achsen: 2, beschreibung: '4 schiefe Ecken und 4 gleich lange Seiten' },
};

/** The other names a figure also has: a Quadrat is also a Rechteck. An option never marks one of these as wrong. */
export const WIDER_NAMES: Readonly<Record<string, readonly string[]>> = {
  Quadrat: ['Rechteck', 'Raute', 'Parallelogramm'],
  Rechteck: ['Parallelogramm'],
  Raute: ['Parallelogramm'],
};

/** The names that may be wrong options for a figure called `name`. */
export const distractorNames = (name: string, names: readonly string[]): string[] => names.filter((n) => n !== name && !WIDER_NAMES[name]?.includes(n));

/** The figures of a Stufe: the Parallelogramm comes on Stufe 3 only (docs/research.md §2.2). */
export const figuresOf = (stufe: Stufe, shapes: readonly ShapeKind[]): ShapeKind[] => shapes.filter((s) => stufe === 3 || s !== 'parallelogramm');

/** Turns for a figure that lies differently; 0 is the usual position. */
export const TURNS: readonly number[] = [0, 20, 30, 45, 60, 70];
