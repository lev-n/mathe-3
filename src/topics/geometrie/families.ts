/**
 * Misconception families of the topic 'geometrie'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'geometrie-flaeche-umfang': { 'geometrie.flaeche': 'umfang', 'geometrie.umfang': 'flaeche' },
  'geometrie-umfang-halb': { 'geometrie.umfang': 'halb' },
  'geometrie-umfang-kaestchen': { 'geometrie.umfang': 'rand' },
  'geometrie-umfang-luecke': { 'geometrie.umfang': 'luecke' },
  'geometrie-gleicher-umfang': { 'geometrie.umfang': 'gleicher-umfang' },
  'geometrie-flaeche-plus': { 'geometrie.flaeche': 'plus' },
  'geometrie-flaeche-rand': { 'geometrie.flaeche': 'rand' },
  'geometrie-flaeche-ganzes': { 'geometrie.flaeche': 'ganzes' },
  'geometrie-flaeche-vergleich': { 'geometrie.flaeche': 'ganze-figur' },
  'geometrie-halbe-kaestchen': { 'geometrie.flaeche': 'halbe-vergessen halbe-ganz' },
  'geometrie-verdeckte-wuerfel': { 'geometrie.wuerfelgebaeude': 'verdeckt' },
  'geometrie-nur-verdeckte': { 'geometrie.wuerfelgebaeude': 'alle-wuerfel' },
  'geometrie-tuerme-gezaehlt': { 'geometrie.wuerfelgebaeude': 'felder' },
  'geometrie-bauplan-reihe': { 'geometrie.wuerfelgebaeude': 'andere-reihe ganzer-plan' },
  'geometrie-quader-fehlend': { 'geometrie.wuerfelgebaeude': 'ganzer-quader gebaeude' },
  'geometrie-koerper-verdeckt': { 'geometrie.koerper': 'verdeckt' },
  'geometrie-ecken-kanten': { 'geometrie.koerper': 'verwechselt' },
  'geometrie-koerper-liste': { 'geometrie.koerper': 'ganze-liste' },
  'geometrie-rechte-winkel': { 'geometrie.figuren': 'ecken-statt-winkel' },
  'geometrie-quadrat-rechteck': { 'geometrie.figuren': 'nur-rechtecke nur-quadrate' },
  'geometrie-figuren-sortieren': { 'geometrie.figuren': 'alle-figuren' },
  'geometrie-ecken-addieren': { 'geometrie.figuren': 'nur-figuren' },
  'geometrie-seitenpaare': { 'geometrie.parallel-senkrecht': 'seiten-statt-paare' },
  'geometrie-netz-gegenueber': { 'geometrie.netze': 'nachbar' },
  'geometrie-wuerfel-sieben': { 'geometrie.netze': 'gegenzahl' },
  'geometrie-achsen-diagonal': { 'geometrie.symmetrie': 'diagonale ohne-diagonale' },
  'geometrie-achsen-richtung': { 'geometrie.symmetrie': 'nur-senkrecht' },
};

export default families;
