/**
 * Topic "Zahlen bis 1000" (docs/research.md §6): Bündeln, Stellenwerte, Zahlwörter, Zählen, Nachbarzahlen, Vergleichen, Zahlenstrahl,
 * Runden, plus the Tausenderbuch as an Extra. Skills in teaching order.
 */
import type { TopicModule } from '../../core/types';
import { buendelnSkill } from './buendeln';
import { nachbarnSkill } from './nachbarn';
import { rundenSkill } from './runden';
import { stellenwerteSkill } from './stellenwerte';
import { tausenderbuchSkill } from './tausenderbuch';
import { vergleichenSkill } from './vergleichen';
import { zaehlenSkill } from './zaehlen';
import { zahlenstrahlSkill } from './zahlenstrahl';
import { zahlwortSkill } from './zahlwort';

const topic: TopicModule = {
  topicId: 'zahlen',
  skills: [
    buendelnSkill,
    stellenwerteSkill,
    zahlwortSkill,
    zaehlenSkill,
    nachbarnSkill,
    vergleichenSkill,
    zahlenstrahlSkill,
    rundenSkill,
    tausenderbuchSkill,
  ],
};
export default topic;
