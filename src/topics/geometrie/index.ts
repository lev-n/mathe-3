/**
 * Topic "Geometrie" (docs/research.md §6). Teaching order: Figuren, then lines, then Körper and what is built from them,
 * then Spiegeln, Fläche and Umfang (Fläche first: Umfang is compared with it), and Muster last.
 */
import type { TopicModule } from '../../core/types';
import { figurenSkill } from './figuren';
import { flaecheSkill } from './flaeche';
import { koerperSkill } from './koerper';
import { musterSkill } from './muster';
import { netzeSkill } from './netze';
import { parallelSenkrechtSkill } from './parallel-senkrecht';
import { symmetrieSkill } from './symmetrie';
import { umfangSkill } from './umfang';
import { wuerfelgebaeudeSkill } from './wuerfelgebaeude';

const topic: TopicModule = {
  topicId: 'geometrie',
  skills: [figurenSkill, parallelSenkrechtSkill, koerperSkill, wuerfelgebaeudeSkill, netzeSkill, symmetrieSkill, flaecheSkill, umfangSkill, musterSkill],
};
export default topic;
