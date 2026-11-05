/**
 * Topic "Kopfrechnen und Einmaleins" (docs/research.md §6): small and big tasks, Plus and Minus to 1000, Ergänzen, the two fact trainers,
 * Zehnerzahlen, steps, Rest and, as an extra, Mal zuerst. Skills in teaching order.
 */
import type { TopicModule } from '../../core/types';
import { analogSkill } from './analog';
import { einmaleinsSkill } from './einmaleins';
import { ergaenzenSkill } from './ergaenzen';
import { inSchrittenSkill } from './in-schritten';
import { plusMinusSkill } from './plus-minus';
import { punktStrichSkill } from './punkt-strich';
import { teilenRestSkill } from './teilen-rest';
import { umkehrenSkill } from './umkehren';
import { zehnerzahlenSkill } from './zehnerzahlen';

const topic: TopicModule = {
  topicId: 'kopfrechnen',
  skills: [analogSkill, plusMinusSkill, ergaenzenSkill, einmaleinsSkill, umkehrenSkill, zehnerzahlenSkill, inSchrittenSkill, teilenRestSkill, punktStrichSkill],
};
export default topic;
