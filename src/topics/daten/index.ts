/**
 * Topic "Daten und Zufall" (docs/research.md §6). Skills in teaching order: reading tables → changing representations →
 * diagrams → timetables and price lists → counting possibilities → sicher, möglich, unmöglich → comparing chances.
 */
import type { TopicModule } from '../../core/types';
import { chancenSkill } from './chancen';
import { darstellenSkill } from './darstellen';
import { diagrammeSkill } from './diagramme';
import { fahrplanSkill } from './fahrplan';
import { kombinierenSkill } from './kombinieren';
import { sicherMoeglichSkill } from './sicher-moeglich';
import { tabelleSkill } from './tabelle';

const topic: TopicModule = {
  topicId: 'daten',
  skills: [tabelleSkill, darstellenSkill, diagrammeSkill, fahrplanSkill, kombinierenSkill, sicherMoeglichSkill, chancenSkill],
};

export default topic;
