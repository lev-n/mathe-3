/** Topic "Schriftlich rechnen" (docs/research.md §6), the skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { addierenSkill } from './addieren';
import { addierenUebertragSkill } from './addieren-uebertrag';
import { kopfOderSchriftlichSkill } from './kopf-oder-schriftlich';
import { multiplizierenSkill } from './multiplizieren';
import { nullSkill } from './null';
import { pruefenSkill } from './pruefen';
import { stellengerechtSkill } from './stellengerecht';
import { subtrahierenSkill } from './subtrahieren';
import { subtrahierenUebertragSkill } from './subtrahieren-uebertrag';

const topic: TopicModule = {
  topicId: 'schriftlich',
  skills: [
    stellengerechtSkill,
    addierenSkill,
    addierenUebertragSkill,
    subtrahierenSkill,
    subtrahierenUebertragSkill,
    nullSkill,
    pruefenSkill,
    kopfOderSchriftlichSkill,
    multiplizierenSkill,
  ],
};
export default topic;
