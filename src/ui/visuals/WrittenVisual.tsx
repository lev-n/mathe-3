/**
 * Column layout of a written calculation (schriftliches Rechnen) in German Kästchen notation.
 *
 * - showSolution: result plus Überträge (add, mul) and Entbündeln marks (Abziehen: marked digit with the new value above; a digit
 *   that was first made smaller and then entbündelt shows both stages, 4 → 3 → 13) or Erweitern marks (Ergänzen: small 1 at the
 *   Minuend and the gemerkte 1 at the Subtrahend).
 * - places: head row H Z E (add, sub).
 * - shownResult (Fehlerdetektiv) and masks (Ziffernrätsel).
 * Rendered as a layout table inside role="img" with a German aria-label describing the whole calculation.
 */
import { toSpeech } from '../../core/format';
import type { VisualOf, WrittenMask } from '../../core/types';
import { correctResult, digitAt, digitsOf, layoutAdd, layoutMul, layoutSub, numLength, placeDative, placeShort, type SubColumn } from '../../core/written';
import type { VisualProps } from './types';
import './WrittenVisual.css';

interface Cell {
  text?: string;
  /** Small prefix (Ergänzen: the extended 1). */
  ext?: string;
  struck?: boolean;
  mask?: string;
  place?: number;
  cls?: string;
}

interface Row {
  cells: Cell[];
  cls?: string;
}

const OP_SIGN = { add: '+', sub: '−', mul: '·' } as const;
const OP_WORD = { add: 'plus', sub: 'minus', mul: 'mal' } as const;

function maskAt(masks: readonly WrittenMask[], row: 'operand' | 'result', index: number, place: number): WrittenMask | undefined {
  return masks.find((m) => m.row === row && (row === 'result' || (m.index ?? 0) === index) && m.place === place);
}

/** Digit cells of n, right-aligned in `width` cells; leading positions empty. */
function digitCells(n: number | null, width: number, masks: readonly WrittenMask[], row: 'operand' | 'result', index: number): Cell[] {
  const len = n === null ? 0 : numLength(n);
  return Array.from({ length: width }, (_, i) => {
    const place = width - 1 - i;
    if (n === null || place >= len) return { place };
    const m = maskAt(masks, row, index, place);
    return m ? { place, mask: m.label } : { place, text: String(digitAt(n, place)) };
  });
}

function emptyBoxes(width: number): Cell[] {
  return Array.from({ length: width }, (_, i) => ({ place: width - 1 - i, cls: 'wv-box' }));
}

/** The head row H Z E. */
function headRow(width: number): Row {
  return { cls: 'wv-head', cells: [{ cls: 'wv-sign' }, ...Array.from({ length: width }, (_, i): Cell => ({ text: placeShort(width - 1 - i), cls: 'wv-headcell' }))] };
}

// ─── Builders ────────────────────────────────────────────────────────────────

function buildAdd(v: VisualOf<'written'>): Row[] {
  const { masks = [], shownResult } = v;
  const lay = layoutAdd(v.operands);
  const result = shownResult ?? (v.showSolution ? lay.result : null);
  const width = Math.max(lay.width, result === null ? 0 : numLength(result));
  const rows: Row[] = v.places ? [headRow(width)] : [];
  v.operands.forEach((n, i) => rows.push({
    cls: 'wv-operand',
    cells: [{ text: i > 0 ? '+' : '', cls: 'wv-sign' }, ...digitCells(n, width, masks, 'operand', i)],
  }));
  if (v.showSolution && lay.carries.some((c) => c > 0)) {
    rows.push({
      cls: 'wv-carry-row',
      cells: [{ cls: 'wv-sign' }, ...Array.from({ length: width }, (_, i) => {
        const place = width - 1 - i;
        const c = lay.carries[place] ?? 0;
        return { place, text: c > 0 ? String(c) : undefined, cls: 'wv-carry' };
      })],
    });
  }
  rows.push({
    cls: 'wv-result',
    cells: [{ cls: 'wv-sign' }, ...(result === null ? emptyBoxes(width) : digitCells(result, width, masks, 'result', 0))],
  });
  return rows;
}

/** Abziehen: the Minuend digit was made smaller by an Entbündeln further right (4 → 3, or 0 → 9). */
function reducedFirst(c: SubColumn): boolean {
  return c.before !== c.a;
}

function buildSub(v: VisualOf<'written'>): Row[] {
  const { masks = [], shownResult } = v;
  const [a, b] = v.operands;
  const method = v.method ?? 'abziehen';
  const lay = layoutSub(a, b, method);
  const result = shownResult ?? (v.showSolution ? lay.result : null);
  // a shown (wrong) result may be longer than the Minuend
  const width = Math.max(lay.width, result === null ? 0 : numLength(result));
  const rows: Row[] = v.places ? [headRow(width)] : [];
  const minuend = digitCells(a, width, masks, 'operand', 0);
  if (v.showSolution && method === 'abziehen' && lay.columns.some((c) => c.top !== c.a)) {
    /** One row of small digits above the Minuend; `pick` returns the cell content of a column (or nothing). */
    const regroupRow = (pick: (col: SubColumn) => Pick<Cell, 'text' | 'struck'> | null): Row => ({
      cls: 'wv-carry-row wv-regroup-row',
      cells: [{ cls: 'wv-sign' }, ...Array.from({ length: width }, (_, i): Cell => {
        const place = width - 1 - i;
        const col = lay.columns[place];
        const content = col ? pick(col) : null;
        return { place, cls: 'wv-carry', ...(content ?? {}) };
      })],
    });
    // upper row: columns that were first made smaller and then entbündelt themselves (4 → 3 → 13)
    if (lay.columns.some((c) => reducedFirst(c) && c.regrouped)) {
      rows.push(regroupRow((c) => (reducedFirst(c) && c.regrouped ? { text: String(c.top) } : null)));
    }
    // lower row: the smaller digit (crossed out again if it was entbündelt), or the entbündelte value
    rows.push(regroupRow((c) => {
      if (reducedFirst(c)) return { text: String(c.before), struck: c.regrouped };
      return c.regrouped ? { text: String(c.top) } : null;
    }));
    for (const cell of minuend) {
      const col = cell.place === undefined ? undefined : lay.columns[cell.place];
      if (col && col.top !== col.a) cell.struck = true;
    }
  }
  if (v.showSolution && method === 'ergaenzen') {
    for (const cell of minuend) {
      const col = cell.place === undefined ? undefined : lay.columns[cell.place];
      if (col?.extended) cell.ext = '1';
    }
  }
  rows.push({ cls: 'wv-operand', cells: [{ cls: 'wv-sign' }, ...minuend] });
  rows.push({ cls: 'wv-operand', cells: [{ text: OP_SIGN.sub, cls: 'wv-sign' }, ...digitCells(b, width, masks, 'operand', 1)] });
  if (v.showSolution && method === 'ergaenzen' && lay.columns.some((c) => c.carryIn > 0)) {
    rows.push({
      cls: 'wv-carry-row',
      cells: [{ cls: 'wv-sign' }, ...Array.from({ length: width }, (_, i) => {
        const place = width - 1 - i;
        return { place, text: (lay.columns[place]?.carryIn ?? 0) > 0 ? '1' : undefined, cls: 'wv-carry' };
      })],
    });
  }
  rows.push({
    cls: 'wv-result',
    cells: [{ cls: 'wv-sign' }, ...(result === null ? emptyBoxes(width) : digitCells(result, width, masks, 'result', 0))],
  });
  return rows;
}

function buildMul(v: VisualOf<'written'>): Row[] {
  const { masks = [], shownResult } = v;
  const [a, b] = v.operands;
  const la = numLength(a);
  const width = la + 2;
  const lay = layoutMul(a, b);
  const result = shownResult ?? (v.showSolution ? lay.result : null);
  const top: Cell[] = [
    ...digitsOf(a).map((d, i): Cell => {
      const place = la - 1 - i;
      const m = maskAt(masks, 'operand', 0, place);
      return m ? { mask: m.label, place } : { text: String(d), place };
    }),
    { text: OP_SIGN.mul, cls: 'wv-op' },
    maskAt(masks, 'operand', 1, 0) ? { mask: maskAt(masks, 'operand', 1, 0)!.label } : { text: String(b) },
  ];
  const rows: Row[] = [{ cls: 'wv-top', cells: top }];
  if (v.showSolution && lay.carries.some((c, p) => c > 0 && p < la)) {
    rows.push({
      cls: 'wv-carry-row',
      cells: Array.from({ length: width }, (_, i) => {
        const place = width - 1 - i;
        const c = place < la ? lay.carries[place] ?? 0 : 0;
        return { place, text: c > 0 ? String(c) : undefined, cls: 'wv-carry' };
      }),
    });
  }
  const cells: Cell[] = Array.from({ length: width }, (_, i) => ({ place: width - 1 - i }));
  if (result !== null) {
    const len = numLength(result);
    for (let p = 0; p < len; p++) {
      const col = width - 1 - p;
      if (col < 0) continue;
      const m = maskAt(masks, 'result', 0, p);
      cells[col] = m ? { place: p, mask: m.label } : { place: p, text: String(digitAt(result, p)) };
    }
  } else {
    for (let p = 0; p < la + 1; p++) cells[width - 1 - p] = { place: p, cls: 'wv-box' };
  }
  rows.push({ cls: 'wv-result-plain', cells });
  return rows;
}

// ─── Description ─────────────────────────────────────────────────────────────

function spokenNumber(n: number, masks: readonly WrittenMask[], row: 'operand' | 'result', index: number): string {
  if (!masks.some((m) => m.row === row && (row === 'result' || (m.index ?? 0) === index))) return String(n);
  const len = numLength(n);
  const parts: string[] = [];
  for (let p = len - 1; p >= 0; p--) {
    const m = maskAt(masks, row, index, p);
    parts.push(m ? `Lücke ${m.label}` : String(digitAt(n, p)));
  }
  return parts.join(' ');
}

export function describeWritten(v: VisualOf<'written'>): string {
  const { masks = [], shownResult } = v;
  const task = v.operands.map((n, i) => spokenNumber(n, masks, 'operand', i)).join(` ${OP_WORD[v.op]} `);
  // The words of the task texts (T11, T12): plus, minus, mal, wechseln, Übertrag.
  let text = `Untereinander gerechnet: ${task}`;
  if (v.showSolution) {
    text += `, Ergebnis ${correctResult(v.op, v.operands)}`;
    if (v.op === 'add') {
      const carries = layoutAdd(v.operands).carries.map((c, p) => (c > 0 ? `${c} bei den ${placeDative(p)}` : '')).filter(Boolean);
      if (carries.length) text += `. Übertrag ${carries.join(', ')}`;
    } else if (v.op === 'sub') {
      const lay = layoutSub(v.operands[0], v.operands[1], v.method ?? 'abziehen');
      const marked = lay.columns.filter((c) => (lay.method === 'abziehen' ? c.regrouped : c.extended)).map((c) => placeDative(c.place));
      if (marked.length) text += `. ${lay.method === 'abziehen' ? 'Gewechselt bei den' : 'Unten kommt der Übertrag nach den'} ${marked.join(', ')}`;
      if (lay.method === 'abziehen') {
        // the new digits above the Minuend, both stages where a digit changed twice
        const changes = lay.columns
          .filter((c) => c.top !== c.a)
          .map((c) => `bei den ${placeDative(c.place)}: aus ${c.a} wird ${reducedFirst(c) ? c.before : c.top}${reducedFirst(c) && c.regrouped ? `, dann ${c.top}` : ''}`);
        if (changes.length) text += `. Neue Ziffern ${changes.join('; ')}`;
      }
    }
  } else if (shownResult !== undefined) {
    text += `, darunter steht als Ergebnis ${spokenNumber(shownResult, masks, 'result', 0)}`;
  }
  return toSpeech(`${text}.`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WrittenVisual({ visual, print }: VisualProps<VisualOf<'written'>>) {
  const rows = visual.op === 'add' ? buildAdd(visual) : visual.op === 'sub' ? buildSub(visual) : buildMul(visual);
  const width = Math.max(...rows.map((r) => r.cells.length));
  return (
    <div className={`visual written-visual${print ? ' written-visual--print' : ''}`} role="img" aria-label={describeWritten(visual)}>
      <table className="wv-table" aria-hidden="true">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className={row.cls}>
              {Array.from({ length: width }, (_, i) => {
                const c = row.cells[i] ?? {};
                const cls = ['wv-cell', c.cls, c.struck ? 'wv-struck' : '', c.mask ? 'wv-mask' : ''].filter(Boolean).join(' ');
                return (
                  <td key={i} className={cls}>
                    {c.ext ? <span className="wv-ext">{c.ext}</span> : null}
                    {c.mask ?? c.text ?? ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
