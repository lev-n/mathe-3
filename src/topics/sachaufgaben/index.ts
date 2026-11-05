// Topic "Sachaufgaben" (docs/research.md §6): skills in teaching order.
import type { TopicModule } from '../../core/types';
import { einSchrittSkill } from './ein-schritt';
import { fragePruefenSkill } from './frage-pruefen';
import { genauUngefaehrSkill } from './genau-ungefaehr';
import { mengePreisSkill } from './menge-preis';
import { mitGroessenSkill } from './mit-groessen';
import { rechnungFindenSkill } from './rechnung-finden';
import { restDeutenSkill } from './rest-deuten';
import { vergleichenSkill } from './vergleichen';
import { zweiSchritteSkill } from './zwei-schritte';

const topic: TopicModule = {
  topicId: 'sachaufgaben',
  skills: [rechnungFindenSkill, einSchrittSkill, vergleichenSkill, restDeutenSkill, mitGroessenSkill, zweiSchritteSkill, mengePreisSkill, fragePruefenSkill, genauUngefaehrSkill],
};
export default topic;
