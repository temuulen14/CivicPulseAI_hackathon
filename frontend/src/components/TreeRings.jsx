import { useRef, useState } from 'react';
import { formatMeurWords } from '../format.js';

// «Los anillos del gasto»: el detalle artístico de la portada, hecho con datos reales.
// Como en el tronco de un árbol, cada anillo es un año, del centro (el primero) hacia fuera
// (el último), y su grosor es lo que se gastó ese año: un anillo más ancho = más gasto.
// La forma es irregular a propósito (como la madera), pero igual para todos los anillos,
// así que encajan unos dentro de otros. Pulsar un anillo elige ese año.
//
// Encima va una capa de agua (lo «cristalino»): al cargar cae una gota en el centro y abre
// ondas, y cada vez que se pulsa un anillo salen ondas desde ese punto. Un reflejo de luz
// cruza el tronco de vez en cuando, como a través de un cristal. Es solo decoración: todo
// se hace con CSS y desaparece si la persona pidió menos movimiento (prefers-reduced-motion).

const SIZE = 400;
const C = SIZE / 2;
const CORE = 22; // médula: el centro del tronco
const OUTER = 182;
const STEPS = 48;

// Radio de un anillo en cada ángulo: un círculo con ondulaciones suaves. `k` cambia un poco
// el detalle fino de cada anillo para que no parezcan copias.
function wobble(angle, k) {
  return 1 + 0.035 * Math.sin(3 * angle + 0.8) + 0.025 * Math.cos(2 * angle - 0.4) + 0.008 * Math.sin(7 * angle + k * 1.3);
}

// Contorno cerrado y suave (Catmull-Rom a Bézier) de un anillo de radio medio r.
function ringPath(r, k) {
  const pts = Array.from({ length: STEPS }, (_, i) => {
    const a = (i / STEPS) * Math.PI * 2;
    const rr = r * wobble(a, k);
    return [C + Math.cos(a) * rr, C + Math.sin(a) * rr];
  });
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < STEPS; i++) {
    const p0 = pts[(i - 1 + STEPS) % STEPS];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % STEPS];
    const p3 = pts[(i + 2) % STEPS];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

// Grietas radiales muy finas, como las de un tronco cortado. Solo decoración.
const CRACKS = [
  { a: -0.5, from: 0.18, to: 0.62 },
  { a: 2.3, from: 0.3, to: 0.85 },
  { a: 4.1, from: 0.12, to: 0.45 },
];

const RIPPLE_MS = 2200;

export default function TreeRings({ totals, year, onYearChange }) {
  const svgRef = useRef(null);
  const [ripples, setRipples] = useState([]); // ondas vivas: { id, x, y }
  const years = Object.keys(totals)
    .map(Number)
    .filter((y) => totals[y] > 0)
    .sort((a, b) => a - b);
  if (years.length < 2) return null;

  // El grosor de cada anillo es proporcional a su gasto; entre todos llenan el tronco.
  const sum = years.reduce((s, y) => s + totals[y], 0);
  let r = CORE;
  const rings = years.map((y, i) => {
    const inner = r;
    r += (totals[y] / sum) * (OUTER - CORE);
    return { year: y, inner, outer: r, i, d: ringPath(r, i) };
  });
  const selected = rings.find((g) => g.year === year) ?? rings[rings.length - 1];
  const labelOf = (g) => ({ x: C, y: C - (g.inner + g.outer) / 2 + 4 });
  const first = rings[0];
  const outline = rings[rings.length - 1].d; // borde del tronco: recorta el agua y el reflejo

  // Pasa el punto pulsado (en píxeles de pantalla) a coordenadas del dibujo y lanza una onda allí.
  function splash(event) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    const id = Date.now() + Math.random();
    setRipples((list) => [...list, { id, x: p.x, y: p.y }]);
    setTimeout(() => setRipples((list) => list.filter((r) => r.id !== id)), RIPPLE_MS);
  }

  return (
    <figure className="rings">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Anillos del gasto: un anillo por año, de ${first.year} en el centro a ${rings[rings.length - 1].year} fuera. Su grosor es el gasto de ese año.`}
      >
        {/* De fuera hacia dentro: cada anillo tapa el interior del anterior y solo se ve su banda. */}
        {[...rings].reverse().map((g) => (
          <path
            key={g.year}
            d={g.d}
            pathLength="1"
            className={`ring${g.year === selected.year ? ' is-selected' : ''}${g.i % 2 ? ' is-odd' : ''}`}
            style={{ '--i': g.i }}
            onClick={(event) => {
              splash(event);
              onYearChange?.(g.year);
            }}
          >
            <title>{`${g.year}: ${formatMeurWords(totals[g.year])}`}</title>
          </path>
        ))}
        <circle cx={C} cy={C} r={CORE} className="ring-core" />
        {CRACKS.map((c, i) => (
          <line
            key={i}
            className="ring-crack"
            x1={C + Math.cos(c.a) * OUTER * c.from}
            y1={C + Math.sin(c.a) * OUTER * c.from}
            x2={C + Math.cos(c.a) * OUTER * c.to}
            y2={C + Math.sin(c.a) * OUTER * c.to}
          />
        ))}
        {/* Agua: la gota inicial, las ondas y el reflejo, recortados al borde del tronco. */}
        <defs>
          <clipPath id="rings-water">
            <path d={outline} />
          </clipPath>
          <linearGradient id="rings-sheen" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" className="sheen-stop" stopOpacity="0" />
            <stop offset="0.5" className="sheen-stop" stopOpacity="0.55" />
            <stop offset="1" className="sheen-stop" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="water" clipPath="url(#rings-water)" aria-hidden="true">
          <rect className="water-sheen" x={-120} y={-40} width={110} height={SIZE + 80} fill="url(#rings-sheen)" />
          <Ripple x={C} y={C} intro />
          {ripples.map((r) => (
            <Ripple key={r.id} x={r.x} y={r.y} />
          ))}
        </g>
        <circle cx={C} cy={C - 120} r={4} className="water-drop" aria-hidden="true" />
        <text {...labelOf(selected)} className="ring-label is-selected" textAnchor="middle">
          {selected.year}
        </text>
        {selected !== first && (
          <text x={C} y={C + 4} className="ring-label" textAnchor="middle">
            {first.year}
          </text>
        )}
      </svg>
      <figcaption>
        Los anillos del gasto. Como en un tronco, cada anillo es un año, de {first.year} en el centro a{' '}
        {rings[rings.length - 1].year} fuera; cuanto más ancho, más se gastó. Pulsa uno para verlo.
      </figcaption>
    </figure>
  );
}

// Una onda: tres círculos que crecen y se desvanecen uno tras otro, como al tirar una piedra.
// Se dibujan con radio 1 y crecen con `transform: scale`, que el navegador anima con suavidad.
function Ripple({ x, y, intro = false }) {
  return [0, 1, 2].map((n) => (
    <circle
      key={n}
      cx={x}
      cy={y}
      r={1}
      className={`ripple${intro ? ' is-intro' : ''}`}
      style={{ '--n': n }}
    />
  ));
}
