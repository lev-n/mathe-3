/**
 * Misconception families of the topic 'sachaufgaben'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * Skills that answer only by choice (rechnung-finden, genau-ungefaehr) have no Bug ids: their feedback is whyWrong.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'sachaufgaben-rechenart': {
    'sachaufgaben.ein-schritt': 'rechenart',
    'sachaufgaben.zwei-schritte': 'rechenart',
    'sachaufgaben.rest-deuten': 'rechenart',
    'sachaufgaben.mit-groessen': 'rechenart',
  },
  'sachaufgaben-signalwort': {
    'sachaufgaben.ein-schritt': 'signalwort',
    'sachaufgaben.vergleichen': 'signalwort',
    'sachaufgaben.mit-groessen': 'signalwort',
    'sachaufgaben.zwei-schritte': 'signalwort',
  },
  'sachaufgaben-alle-zahlen': {
    'sachaufgaben.ein-schritt': 'alle-zahlen',
    'sachaufgaben.mit-groessen': 'alle-zahlen',
    'sachaufgaben.zwei-schritte': 'alle-zahlen',
    'sachaufgaben.frage-pruefen': 'alle-zahlen',
  },
  'sachaufgaben-angaben': {
    'sachaufgaben.frage-pruefen': 'angaben-pruefen',
  },
  'sachaufgaben-nullen': {
    'sachaufgaben.ein-schritt': 'null-verloren teilen-null',
  },
  'sachaufgaben-unterschied': {
    'sachaufgaben.vergleichen': 'mehr-unterschied',
  },
  'sachaufgaben-mal-als-mehr': {
    'sachaufgaben.vergleichen': 'mal-als-mehr',
  },
  'sachaufgaben-rest-sache': {
    'sachaufgaben.rest-deuten': 'rest-sache rest-zahl',
  },
  'sachaufgaben-unsinnig-gross': {
    'sachaufgaben.mit-groessen': 'unsinnig-gross',
    'sachaufgaben.zwei-schritte': 'unsinnig-gross',
    'sachaufgaben.menge-preis': 'unsinnig-gross',
  },
  'sachaufgaben-geld-rechnen': {
    'sachaufgaben.mit-groessen': 'komma-cent-summe rueckgeld-cent rueckgeld-euro',
    'sachaufgaben.zwei-schritte': 'rueckgeld-cent rueckgeld-euro',
  },
  'sachaufgaben-einheit-gemischt': {
    'sachaufgaben.mit-groessen': 'einheit-gemischt',
  },
  'sachaufgaben-zeitspanne': {
    'sachaufgaben.mit-groessen': 'stunde-100 zeitpunkt-spanne',
  },
  'sachaufgaben-nur-erster-schritt': {
    'sachaufgaben.mit-groessen': 'nur-erster-schritt',
    'sachaufgaben.zwei-schritte': 'nur-erster-schritt',
  },
  'sachaufgaben-menge-preis': {
    'sachaufgaben.menge-preis': 'plus-statt-mal preis-gleich',
  },
  'sachaufgaben-je-mehr-weniger': {
    'sachaufgaben.menge-preis': 'je-mehr-mehr je-mehr-plus',
  },
};

export default families;
