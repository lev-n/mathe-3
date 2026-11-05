/**
 * Misconception families of the topic 'groessen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'groessen-geld-stellen': { 'groessen.geld-komma': 'komma-einstellig ohne-null ohne-komma hundert-cent tafel-verrutscht' },
  'groessen-geld-einheiten': { 'groessen.geld-komma': 'einheiten-gemischt cent-anhaengen nur-euro cent-als-euro' },
  'groessen-einkauf-cent': { 'groessen.einkaufen': 'komma-cent-summe cent-vergessen' },
  'groessen-rueckgeld': { 'groessen.einkaufen': 'rueckgeld-cent rueckgeld-euro cent-umgekehrt' },
  'groessen-einkauf-frage': { 'groessen.einkaufen': 'addiert ein-preis signalwort preis-vergessen' },
  'groessen-lineal': { 'groessen.laengen': 'lineal-anfang lineal-mm lineal-ende lineal-naechster-cm' },
  'groessen-laengen-umwandeln': { 'groessen.laengen': 'mm-cm cm-100' },
  'groessen-laengen-komma': { 'groessen.laengen': 'm-komma ohne-komma' },
  'groessen-laengen-einheiten': { 'groessen.laengen': 'einheiten-gemischt einheit-zahl' },
  'groessen-km-umwandeln': { 'groessen.kilometer': 'km-100 km-10 km-null' },
  'groessen-km-komma': { 'groessen.kilometer': 'km-komma km-halb ohne-komma' },
  'groessen-km-einheiten': { 'groessen.kilometer': 'einheit-gemischt' },
  'groessen-km-fehlt': { 'groessen.kilometer': 'addiert' },
  'groessen-uhr-zeiger': { 'groessen.uhr': 'zeiger-getauscht naechste-stunde' },
  'groessen-uhr-minuten': { 'groessen.uhr': 'minute-zahl minute-strich' },
  'groessen-uhr-nachmittag': { 'groessen.uhr': 'ohne-12' },
  'groessen-uhr-tageszeit': { 'groessen.uhr': 'vormittag-plus' },
  'groessen-zeit-stunde': { 'groessen.zeitspannen': 'stunde-100 stunde-vergessen nur-bis-stunde stunde-komma' },
  'groessen-zeit-spanne': { 'groessen.zeitspannen': 'zeitpunkt-spanne spanne-plus' },
  'groessen-zeit-einheiten': { 'groessen.zeitspannen': 'minute-100 einheiten-gemischt' },
  'groessen-gewicht-umwandeln': { 'groessen.gewicht': 'kg-100 kg-null einheit-gemischt' },
  'groessen-gewicht-skala': { 'groessen.gewicht': 'skala-schritt' },
  'groessen-gewicht-halb': { 'groessen.gewicht': 'halb-kg' },
  'groessen-liter-umwandeln': { 'groessen.hohlmasse': 'liter-100 liter-halb liter-25 einheit-gemischt' },
  'groessen-liter-skala': { 'groessen.hohlmasse': 'skala-schritt' },
  'groessen-liter-becher': { 'groessen.hohlmasse': 'becher-plus' },
};

export default families;
