/**
 * Tausenderwürfel, Hunderterplatten, Zehnerstangen and Einerwürfel (docs/research.md §6): a plate shows its 100 units, a stick its ten,
 * cubes come in fives, so a Bündel can be seen. tens and ones may exceed 9 (Bündeln: 3 H 14 Z). `second` adds material in another look
 * ('dazu') or crosses out the last pieces of the first amount ('weg'). Hand-written SVG; a kind of piece goes below the others when it
 * would not fit beside them. With plates or a Tausenderwürfel the sticks are drawn half as long.
 */
import type { ReactNode } from 'react';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './BaseTenVisual.css';

type BaseTen = VisualOf<'baseTen'>;

const CUBE = 20;
const CUBE_STEP = 24;
const PER_ROW = 5;
const PLATE = 80;
const PLATE_STEP = 88;
const PLATES_PER_ROW = 3;
const PAD = 8;
const SECTION_GAP = 18;
/** Drawn at most 310 px wide: it fits a 375 px phone without shrinking. */
const MAX_W = 310;

const pieces = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function baseTenLabel(v: BaseTen): string {
  const named = (hundreds: number, tens: number, ones: number) =>
    [
      hundreds > 0 ? pieces(hundreds, 'Hunderterplatte', 'Hunderterplatten') : '',
      tens > 0 ? pieces(tens, 'Zehnerstange', 'Zehnerstangen') : '',
      ones > 0 ? pieces(ones, 'Einerwürfel', 'Einerwürfel') : '',
    ]
      .filter(Boolean)
      .join(' und ');
  const first = named(v.hundreds ?? 0, v.tens, v.ones);
  const big = (v.hundreds ?? 0) > 0 || (v.second?.hundreds ?? 0) > 0;
  const parts = [`${big ? 'Rechenmaterial' : 'Zehnerstangen und Einerwürfel'}: ${first || 'nichts'}.`];
  const added = v.second ? named(v.second.hundreds ?? 0, v.second.tens ?? 0, v.second.ones ?? 0) : '';
  if (v.second && added) parts.push(v.second.mode === 'dazu' ? `Dazu kommen ${added}.` : `Durchgestrichen sind ${added}.`);
  return parts.join(' ');
}

type Look = 'first' | 'second' | 'crossed';

/** The pieces of one kind: the crossed-out ones are the last of the first amount, then come the added ones. */
function looks(n: number, gone: number, added: number): Look[] {
  return [...Array.from({ length: n }, (_, i): Look => (i >= n - gone ? 'crossed' : 'first')), ...Array.from({ length: added }, (): Look => 'second')];
}

/** A section of the drawing: its size and its pieces, drawn with the top-left corner at (x, y). */
interface Section {
  w: number;
  h: number;
  draw: (x: number, y: number) => ReactNode;
}

const size = (count: number, step: number, piece: number) => (count ? count * step - (step - piece) : 0);

export default function BaseTenVisual({ visual, print }: VisualProps<BaseTen>) {
  const { tens, ones, second } = visual;
  const hundreds = visual.hundreds ?? 0;
  const dazu = second?.mode === 'dazu';
  const weg = second?.mode === 'weg';
  const plates = looks(hundreds, weg ? (second?.hundreds ?? 0) : 0, dazu ? (second?.hundreds ?? 0) : 0);
  const sticks = looks(tens, weg ? (second?.tens ?? 0) : 0, dazu ? (second?.tens ?? 0) : 0);
  const cubes = looks(ones, weg ? (second?.ones ?? 0) : 0, dazu ? (second?.ones ?? 0) : 0);
  const compact = plates.length > 0;
  const unit = compact ? 8 : 16;
  const stickW = compact ? 12 : 20;
  const stickStep = compact ? 18 : 28;

  const sections: Section[] = [];
  if (plates.length) {
    const rows = Math.ceil(plates.length / PLATES_PER_ROW);
    sections.push({
      w: size(Math.min(plates.length, PLATES_PER_ROW), PLATE_STEP, PLATE),
      h: size(rows, PLATE_STEP, PLATE),
      draw: (x0, y0) =>
        plates.map((look, i) => {
          const x = x0 + (i % PLATES_PER_ROW) * PLATE_STEP;
          const y = y0 + Math.floor(i / PLATES_PER_ROW) * PLATE_STEP;
          return (
            <g key={`p${i}`} data-piece="platte" data-look={look}>
              <rect className={`bt-piece bt-piece--${look}`} x={x} y={y} width={PLATE} height={PLATE} rx={2} />
              {Array.from({ length: 9 }, (_, u) => (
                <g key={u}>
                  <line className="bt-unit" x1={x} y1={y + ((u + 1) * PLATE) / 10} x2={x + PLATE} y2={y + ((u + 1) * PLATE) / 10} />
                  <line className="bt-unit" x1={x + ((u + 1) * PLATE) / 10} y1={y} x2={x + ((u + 1) * PLATE) / 10} y2={y + PLATE} />
                </g>
              ))}
              {look === 'crossed' && <line className="bt-cross" x1={x - 3} y1={y + PLATE + 3} x2={x + PLATE + 3} y2={y - 3} />}
            </g>
          );
        }),
    });
  }
  if (sticks.length) {
    const stickH = unit * 10;
    sections.push({
      w: size(sticks.length, stickStep, stickW),
      h: stickH,
      draw: (x0, y) =>
        sticks.map((look, i) => {
          const x = x0 + i * stickStep;
          return (
            <g key={`s${i}`} data-piece="stange" data-look={look}>
              <rect className={`bt-piece bt-piece--${look}`} x={x} y={y} width={stickW} height={stickH} rx={3} />
              {Array.from({ length: 9 }, (_, u) => (
                <line key={u} className="bt-unit" x1={x} y1={y + (u + 1) * unit} x2={x + stickW} y2={y + (u + 1) * unit} />
              ))}
              {look === 'crossed' && <line className="bt-cross" x1={x - 3} y1={y + stickH - 4} x2={x + stickW + 3} y2={y + 4} />}
            </g>
          );
        }),
    });
  }
  if (cubes.length) {
    sections.push({
      w: size(Math.min(cubes.length, PER_ROW), CUBE_STEP, CUBE),
      h: size(Math.ceil(cubes.length / PER_ROW), CUBE_STEP, CUBE),
      draw: (x0, y0) =>
        cubes.map((look, i) => {
          const x = x0 + (i % PER_ROW) * CUBE_STEP;
          const y = y0 + Math.floor(i / PER_ROW) * CUBE_STEP;
          return (
            <g key={`c${i}`} data-piece="wuerfel" data-look={look}>
              <rect className={`bt-piece bt-piece--${look}`} x={x} y={y} width={CUBE} height={CUBE} rx={3} />
              {look === 'crossed' && <line className="bt-cross" x1={x - 2} y1={y + CUBE + 2} x2={x + CUBE + 2} y2={y - 2} />}
            </g>
          );
        }),
    });
  }

  // Sections side by side, standing on one line; the next line starts when a section would not fit.
  const lines: Section[][] = [];
  for (const s of sections) {
    const line = lines[lines.length - 1];
    const used = line ? line.reduce((n, o) => n + o.w + SECTION_GAP, 0) : 0;
    if (line && used + s.w + 2 * PAD <= MAX_W) line.push(s);
    else lines.push([s]);
  }
  let y = PAD;
  let right = 2 * PAD + 10;
  const drawn = lines.map((line) => {
    const lineH = Math.max(...line.map((s) => s.h));
    let x = PAD;
    const out = line.map((s) => {
      const node = s.draw(x, y + lineH - s.h);
      x += s.w + SECTION_GAP;
      return node;
    });
    right = Math.max(right, x - SECTION_GAP + PAD);
    y += lineH + SECTION_GAP;
    return out;
  });
  const w = right;
  const h = Math.max(2 * PAD + 10, y - SECTION_GAP + PAD);
  return (
    <svg
      className={`visual visual-baseten${print ? ' visual--print' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={baseTenLabel(visual)}
    >
      {drawn}
    </svg>
  );
}
