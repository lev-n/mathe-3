/**
 * Misconception families of the topic 'kopfrechnen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'kopfrechnen-nullen': {
    'kopfrechnen.analog': 'klein-gerechnet null-zu-wenig null-zu-viel',
    'kopfrechnen.zehnerzahlen': 'null-verloren null-zu-viel teilen-null',
    'kopfrechnen.in-schritten': 'null-verloren',
  },
  'kopfrechnen-uebergang': {
    'kopfrechnen.analog': 'hunderter-uebergang',
    'kopfrechnen.plus-minus': 'hunderter-uebergang zehner-uebergang',
  },
  'kopfrechnen-minus-schritte': {
    'kopfrechnen.analog': 'minus-spalten',
    'kopfrechnen.plus-minus': 'minus-spalten',
  },
  'kopfrechnen-rechenzeichen': {
    'kopfrechnen.analog': 'rechenzeichen',
    'kopfrechnen.plus-minus': 'rechenzeichen',
    'kopfrechnen.punkt-strich': 'rechenzeichen',
  },
  'kopfrechnen-luecke': {
    'kopfrechnen.analog': 'summe-gerechnet',
    'kopfrechnen.plus-minus': 'summe-gerechnet umkehr-richtung',
    'kopfrechnen.ergaenzen': 'summe-gerechnet',
  },
  'kopfrechnen-paeckchen': {
    'kopfrechnen.analog': 'paeckchen-schritt',
  },
  'kopfrechnen-stelle': {
    'kopfrechnen.plus-minus': 'stelle-verwechselt',
  },
  'kopfrechnen-ergaenzen': {
    'kopfrechnen.ergaenzen': 'ergaenzen-1000 ergaenzen-hunderter neuner-ergaenzung',
  },
  'kopfrechnen-ziel': {
    'kopfrechnen.ergaenzen': 'falsches-ziel',
  },
  'kopfrechnen-nachbarfakt': {
    'kopfrechnen.einmaleins': 'operand',
    'kopfrechnen.umkehren': 'nachbar',
  },
  'kopfrechnen-mal-plus': {
    'kopfrechnen.einmaleins': 'mal-als-plus',
    'kopfrechnen.zehnerzahlen': 'mal-als-plus',
    'kopfrechnen.in-schritten': 'mal-als-plus',
    'kopfrechnen.punkt-strich': 'mal-als-plus',
  },
  'kopfrechnen-mal-null': {
    'kopfrechnen.einmaleins': 'mal-null',
  },
  'kopfrechnen-rechenart': {
    'kopfrechnen.einmaleins': 'minus-gerechnet',
    'kopfrechnen.umkehren': 'minus-gerechnet plus-gerechnet',
    'kopfrechnen.zehnerzahlen': 'minus-gerechnet',
    'kopfrechnen.in-schritten': 'minus-gerechnet',
  },
  'kopfrechnen-nachbaraufgabe': {
    'kopfrechnen.einmaleins': 'nachbar-eins nachbar-richtung',
    'kopfrechnen.in-schritten': 'nachbar-eins nachbar-richtung',
  },
  'kopfrechnen-verdoppeln': {
    'kopfrechnen.einmaleins': 'verdoppeln-plus',
  },
  'kopfrechnen-zerlegen': {
    'kopfrechnen.einmaleins': 'nicht-malgenommen',
    'kopfrechnen.in-schritten': 'zerlegen-einer teile-vergessen',
  },
  'kopfrechnen-abgeschrieben': {
    'kopfrechnen.umkehren': 'teiler-abgeschrieben ergebnis-abgeschrieben',
  },
  'kopfrechnen-familie': {
    'kopfrechnen.umkehren': 'familie-vertauscht',
  },
  'kopfrechnen-richtung': {
    'kopfrechnen.zehnerzahlen': 'falsche-richtung',
  },
  'kopfrechnen-rest-groesse': {
    'kopfrechnen.teilen-rest': 'rest-zu-gross rest-ueber',
  },
  'kopfrechnen-rest-beachten': {
    'kopfrechnen.teilen-rest': 'rest-vergessen rest-nicht-abgezogen',
  },
  'kopfrechnen-rest-reihenfolge': {
    'kopfrechnen.teilen-rest': 'rest-getauscht',
  },
  'kopfrechnen-mal-zuerst': {
    'kopfrechnen.punkt-strich': 'punkt-strich',
  },
};

export default families;
