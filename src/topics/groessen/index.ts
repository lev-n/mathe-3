// Topic "Geld, Längen, Zeit, Gewicht" (docs/research.md §6), skills in teaching order.
import type { TopicModule } from '../../core/types';
import { einkaufenSkill } from './einkaufen';
import { geldKommaSkill } from './geld-komma';
import { gewichtSkill } from './gewicht';
import { hohlmasseSkill } from './hohlmasse';
import { kilometerSkill } from './kilometer';
import { laengenSkill } from './laengen';
import { uhrSkill } from './uhr';
import { wasPasstSkill } from './was-passt';
import { zeitspannenSkill } from './zeitspannen';

const topic: TopicModule = {
  topicId: 'groessen',
  skills: [geldKommaSkill, einkaufenSkill, laengenSkill, kilometerSkill, uhrSkill, zeitspannenSkill, gewichtSkill, wasPasstSkill, hohlmasseSkill],
};
export default topic;
