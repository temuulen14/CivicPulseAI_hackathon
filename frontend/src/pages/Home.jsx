import { useApi } from '../useApi.js';
import { getAreasCached, useAllAreas } from '../useAllYears.js';
import { formatMeurWords } from '../format.js';
import Status from '../components/Status.jsx';
import TreeRings from '../components/TreeRings.jsx';
import DoorArt from '../components/DoorArt.jsx';

// Portada: una puerta de entrada. La pregunta principal y un banner grande por cada cosa que
// se puede hacer en la web, con la pregunta que responde. Las cifras y los gráficos están en sus páginas
// (el gasto por ámbitos, que antes vivía aquí, está en «Gasto público», pages/Spending.jsx).
const DOORS = [
  {
    href: '#/calculadora',
    art: 'coin',
    featured: true,
    title: '¿A dónde van mis impuestos?',
    text: 'Escribe tu sueldo y mira cuánto pagas al año y en qué se gasta cada euro.',
    go: 'Calcúlalo',
  },
  {
    href: '#/gasto',
    art: 'bars',
    title: '¿En qué se gasta el dinero de todos?',
    go: 'Ver el reparto',
  },
  {
    href: '#/pensiones',
    art: 'pensioners',
    title: '¿Habrá dinero para las pensiones?',
    text: 'La mayor partida del gasto, frente a cuántos pensionistas hay y cuánto toca a cada uno.',
    go: 'Ver las pensiones',
  },
  {
    href: '#/comparar',
    art: 'europe',
    title: '¿Gastamos más que otros países?',
    text: 'España frente a Europa y el mundo, en un mapa.',
    go: 'Comparar',
  },
  {
    href: '#/avisos',
    art: 'outlier',
    title: '¿Hay algo que no cuadra?',
    text: 'Dónde España se aparta de los demás y qué servicios pueden dar problemas.',
    go: 'Ver los avisos',
  },
  {
    href: '#/presupuestos',
    art: 'blocks',
    title: '¿Qué dice el presupuesto, partida a partida?',
    text: 'Los Presupuestos Generales del Estado, de las grandes políticas al último programa.',
    go: 'Abrir los presupuestos',
  },
  {
    href: '#/fondos-europeos',
    art: 'stars',
    title: '¿Qué se hace con el dinero de Europa?',
    text: 'En qué políticas y programas se usan los fondos europeos de recuperación.',
    go: 'Ver los fondos',
  },
  {
    href: '#/buscar',
    art: 'search',
    title: '¿Cuánto se dedica a lo que me importa?',
    text: 'Busca una palabra (becas, carreteras, museos…) en los presupuestos.',
    go: 'Buscar',
  },
];

export default function Home({ year, years, onYearChange }) {
  const areas = useApi(() => getAreasCached(year), [year]);
  const all = useAllAreas(years);

  if (!areas.data) return <Status state={areas} />;
  const { total_meur, provisional, areas: list } = areas.data;
  const shownYear = areas.data.year;
  const byYear = all.data ?? {};
  const ranking = [...list].sort((a, b) => b.amount_meur - a.amount_meur);
  // La única cifra de la portada va en el banner del gasto; el detalle está en «Gasto público».
  const spendingText = `${formatMeurWords(total_meur)} en ${shownYear}${provisional ? ' (dato provisional)' : ''}. De cada euro, ${Math.round(ranking[0].share_of_total_pct)} céntimos van a ${ranking[0].name}.`;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-text">
          <h1 id="hero-title">
            ¿A dónde va el <span className="swash">dinero público</span>?
          </h1>
          <p className="hero-lead">
            Una web para entender, sin ser experto, en qué gastan las administraciones públicas de España. Con datos
            oficiales y explicado sin prisa.
          </p>
          <div className="hero-actions">
            <a href="#/gasto" className="button-link">
              Ver en qué se gasta
            </a>
            <a href="#/calculadora" className="quiet-link">
              Calcula a dónde van tus impuestos <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <TreeRings
          totals={Object.fromEntries(years.map((y) => [y, byYear[y]?.total_meur ?? 0]))}
          year={shownYear}
          onYearChange={onYearChange}
        />
      </section>

      {/* Un banner por pregunta: la pregunta en grande, un dibujo y un botón. Todo el banner es el enlace. */}
      <ul className="doors" aria-label="Qué puedes ver aquí">
        {DOORS.map((door) => (
          <li key={door.href} className={door.featured ? 'is-featured' : undefined}>
            <a href={door.href} className="door">
              <span className="door-body">
                <span className="door-title">{door.title}</span>
                <span className="door-text">{door.text ?? spendingText}</span>
                <span className="door-go">
                  {door.go} <span aria-hidden="true">→</span>
                </span>
              </span>
              <DoorArt kind={door.art} areas={ranking} />
            </a>
          </li>
        ))}
      </ul>
      <p className="muted">
        Cada cifra lleva su fuente oficial (Eurostat, Hacienda, el BOE y la OCDE). <a href="#/fuentes">Ver las fuentes</a>
      </p>
    </>
  );
}
