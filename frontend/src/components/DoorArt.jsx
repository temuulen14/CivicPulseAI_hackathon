import { shareStep } from '../scale.js';
import { PENSIONERS } from '../pensionsDemand.js';
import { COUNTRIES, EUROPE_BOX } from '../worldMap.js';

// El dibujo de cada banner de la portada. Cuatro salen de datos reales (la moneda y las
// barras, con la cuota de cada ámbito; la línea de pensionistas; el mapa de Europa) y
// cuatro son ilustraciones sin datos (avisos, presupuestos, fondos europeos y buscador).

// Un euro partido en trozos: cada trozo es la cuota de un ámbito. El radio 15,915 hace que
// la circunferencia mida 100, así que la cuota en % es directamente el largo del trozo.
function Coin({ areas }) {
  let start = 0;
  return (
    <svg viewBox="0 0 42 42" className="door-art" aria-hidden="true">
      {areas.map((a) => {
        const offset = 25 - start; // 25 = empezar arriba (las 12 en punto)
        const length = Math.max(a.share_of_total_pct - 0.8, 0.2); // 0,8 de hueco entre trozos
        start += a.share_of_total_pct;
        return (
          <circle
            key={a.id}
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={shareStep(a.share_of_total_pct).fill}
            strokeWidth="7"
            strokeDasharray={`${length} ${100 - length}`}
            strokeDashoffset={offset}
          />
        );
      })}
      <text x="21" y="24" textAnchor="middle" className="door-art-coin">1 €</text>
    </svg>
  );
}

// Una barra por ámbito, de mayor a menor: la altura es su cuota del gasto.
function Bars({ areas }) {
  const max = areas[0].share_of_total_pct;
  return (
    <svg viewBox="0 0 100 60" className="door-art" aria-hidden="true">
      {areas.map((a, i) => {
        const h = Math.max((a.share_of_total_pct / max) * 56, 2);
        return <rect key={a.id} x={i * 10 + 1} y={60 - h} width="8" height={h} rx="2" fill={shareStep(a.share_of_total_pct).fill} />;
      })}
    </svg>
  );
}

// Pensionistas en España, año a año (Eurostat, pensionsDemand.js). La escala va del mínimo al
// máximo, como en las líneas pequeñas del resto de la web: enseña la forma, no la cifra.
function Pensioners() {
  const values = Object.values(PENSIONERS);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((v, i) => [5 + (i / (values.length - 1)) * 90, 62 - ((v - min) / (max - min)) * 50]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg viewBox="0 0 100 70" className="door-art door-trend" aria-hidden="true">
      <path className="door-trend-area" d={`M${line} L95,68 L5,68 Z`} />
      <path className="door-trend-line" d={`M${line}`} />
      <circle cx={lastX} cy={lastY} r="3.5" />
    </svg>
  );
}

// Europa recortada del mismo mapa de «Comparar», con España resaltada.
function Europe() {
  return (
    <svg viewBox={EUROPE_BOX.join(' ')} className="door-art door-map" aria-hidden="true">
      {COUNTRIES.map((c) => (
        <path key={c.code} d={c.d} className={c.code === 'ES' ? 'is-spain' : undefined} />
      ))}
    </svg>
  );
}

// Avisos: una fila de puntos en su sitio y uno que se sale.
function Outlier() {
  return (
    <svg viewBox="0 0 100 60" className="door-art door-outlier" aria-hidden="true">
      <line x1="4" y1="42" x2="96" y2="42" />
      {[12, 27, 42, 72, 87].map((x) => (
        <circle key={x} cx={x} cy="42" r="5" />
      ))}
      <circle className="is-out" cx="57" cy="16" r="7" />
      <circle className="is-ring" cx="57" cy="16" r="12" />
    </svg>
  );
}

// Presupuestos: un bloque que se parte en bloques cada vez más pequeños (de la política al programa).
function Blocks() {
  return (
    <svg viewBox="0 0 100 70" className="door-art door-blocks" aria-hidden="true">
      <rect x="0" y="0" width="48" height="70" rx="5" />
      <rect x="52" y="0" width="48" height="33" rx="5" />
      <rect x="52" y="37" width="22" height="33" rx="5" />
      <rect x="78" y="37" width="22" height="14.5" rx="4" />
      <rect x="78" y="55.5" width="9" height="14.5" rx="3" />
      <rect className="is-last" x="91" y="55.5" width="9" height="14.5" rx="3" />
    </svg>
  );
}

// Fondos europeos: las doce estrellas en círculo.
const STAR = 'M0,-5L1.2,-1.6L4.8,-1.5L1.9,0.6L2.9,4L0,2L-2.9,4L-1.9,0.6L-4.8,-1.5L-1.2,-1.6Z';
function Stars() {
  return (
    <svg viewBox="-40 -40 80 80" className="door-art door-stars" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return <path key={i} d={STAR} transform={`translate(${(Math.sin(angle) * 28).toFixed(1)} ${(-Math.cos(angle) * 28).toFixed(1)})`} />;
      })}
    </svg>
  );
}

// Buscador: una caja de búsqueda en pequeño, con una palabra de ejemplo.
function SearchPill() {
  return (
    <span className="door-search" aria-hidden="true">
      becas<span className="door-caret" />
    </span>
  );
}

const ART = { coin: Coin, bars: Bars, pensioners: Pensioners, europe: Europe, outlier: Outlier, blocks: Blocks, stars: Stars, search: SearchPill };

export default function DoorArt({ kind, areas }) {
  const Drawing = ART[kind];
  return <Drawing areas={areas} />;
}
