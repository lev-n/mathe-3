/**
 * The subtraction method, asked once before the first minus skill (docs/research.md §7.1): Abziehen or Ergänzen, default Abziehen, never
 * mixed. No method is shown as the right one (§7.2), and "Das weiß ich noch nicht" keeps the default. An adult can change it later.
 */
import type { SkillDef, SubtractionMethod } from '../../core/types';
import type { PracticePlan } from '../../state/types';
import VisualView from '../visuals/Visual';

/** Does this plan start a minus skill? The method is read before the first item, so the first item already uses it. */
export function planUsesMethod(plan: PracticePlan, skills: readonly SkillDef[]): boolean {
  if (plan.mode === 'skill') return skills.some((s) => s.id === plan.skillId && s.usesMethod);
  if (plan.mode === 'mixed') return skills.some((s) => s.topicId === plan.topicId && s.usesMethod);
  return false;
}

/** The example of both methods, with a regrouping in the Zehner. */
const EXAMPLE = [713, 281];

export interface MethodQuestionProps {
  onAnswer: (method: SubtractionMethod) => void;
}

export default function MethodQuestion({ onAnswer }: MethodQuestionProps) {
  return (
    <section className="pr-message card pr-method" aria-labelledby="pr-method-title">
      <h2 id="pr-method-title">Wie rechnest du Minus in der Schule?</h2>
      <p>Beide Wege sind gut. Schau dir die Bilder an. Welcher Weg sieht aus wie in deinem Heft?</p>
      <div className="pr-method__options">
        <div className="pr-method__option">
          <VisualView visual={{ type: 'written', op: 'sub', operands: EXAMPLE, method: 'abziehen', showSolution: true }} />
          <button type="button" className="btn btn--primary btn--lg" onClick={() => onAnswer('abziehen')}>
            Abziehen
          </button>
        </div>
        <div className="pr-method__option">
          <VisualView visual={{ type: 'written', op: 'sub', operands: EXAMPLE, method: 'ergaenzen', showSolution: true }} />
          <button type="button" className="btn btn--primary btn--lg" onClick={() => onAnswer('ergaenzen')}>
            Ergänzen
          </button>
        </div>
      </div>
      <button type="button" className="btn btn--lg pr-method__unknown" onClick={() => onAnswer('abziehen')}>
        Das weiß ich noch nicht
      </button>
    </section>
  );
}
