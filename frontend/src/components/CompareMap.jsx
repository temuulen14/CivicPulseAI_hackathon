import { formatPct } from '../format.js';
import { EUROPE_BOX, WORLD_BOX } from '../worldMap.js';
import WorldMap from './WorldMap.jsx';
import Segmented from './Segmented.jsx';
import { leaderOf, valuesOf } from '../leaders.js';

// Mapa de la página Comparar. Tiene dos vistas:
// - "area": cada país coloreado por lo que dedica al ámbito elegido (más oscuro = más gasto),
//   con la bandera del que más dedica.
// - "leaders": una bandera por ámbito, clavada en el país que más le dedica.
// Al pulsar una bandera se elige ese ámbito para toda la página.
export default function CompareMap({ view, onViewChange, compare, area, leaders, onPickArea }) {
  const isArea = view === 'area';

  const names = {};
  const ledBy = {};
  for (const r of leaders) {
    for (const v of valuesOf(r.compare)) names[v.country] = v.name;
    (ledBy[r.leader.country] ??= []).push(r);
  }
  for (const v of valuesOf(compare)) names[v.country] = v.name;

  const flags = {};
  const flagRows = isArea ? leaders.filter((r) => r.area.id === area.id) : leaders;
  for (const r of flagRows) {
    const title = `${r.area.name}: ${r.leader.name}, ${formatPct(r.leader.value)} del PIB`;
    (flags[r.leader.country] ??= []).push({ id: r.area.id, icon: r.area.icon, title });
  }

  const values = Object.fromEntries(valuesOf(compare).map((v) => [v.country, v.value]));
  const low = Math.min(...Object.values(values));
  const high = Math.max(...Object.values(values));

  function fillOf(code) {
    if (!isArea) return !names[code] ? null : ledBy[code] ? 'var(--seq-1)' : 'var(--map-low)';
    const value = values[code];
    if (value === undefined) return null;
    const strength = high > low ? ((value - low) / (high - low)) * 100 : 100;
    return `color-mix(in srgb, var(--forest-deep) ${strength.toFixed(0)}%, var(--map-low))`;
  }
  function titleOf(code) {
    if (isArea) return `${names[code]}: ${formatPct(values[code])} del PIB en ${area.name.toLowerCase()}`;
    const led = ledBy[code]?.map((r) => r.area.name.toLowerCase());
    return led ? `${names[code]}: el que más dedica a ${led.join(', ')}` : names[code];
  }

  const leader = leaderOf(compare);
  // Texto para lectores de pantalla: el mapa es un dibujo, así que se resume lo que muestra.
  const label = isArea
    ? `Mapa de ${area.name.toLowerCase()} en % del PIB, de ${formatPct(low)} a ${formatPct(high)}.` +
      (leader ? ` El que más dedica es ${leader.name}.` : '')
    : `Mapa de quién más dedica a cada ámbito: ${leaders.map((r) => `${r.area.name.toLowerCase()}, ${r.leader.name}`).join('; ')}.`;
  const mapProps = { fillOf, titleOf, flags, onPick: onPickArea };

  return (
    <>
      <div className="section-head">
        <Segmented
          label="Qué muestra el mapa"
          value={view}
          onChange={onViewChange}
          options={[
            { value: 'area', label: area.name },
            { value: 'leaders', label: 'Líder de cada ámbito' },
          ]}
        />
        {isArea ? (
          <div className="legend map-scale" aria-hidden="true">
            <span>{formatPct(low)}</span>
            <span className="map-scale-bar" />
            <span>{formatPct(high)} del PIB</span>
            <span><span className="swatch map-empty-swatch" /> Sin datos</span>
          </div>
        ) : (
          <div className="legend" aria-hidden="true">
            <span><span className="swatch" style={{ background: 'var(--seq-1)' }} /> Lidera algún ámbito</span>
            <span><span className="swatch" style={{ background: 'var(--map-low)' }} /> Con datos</span>
            <span><span className="swatch map-empty-swatch" /> Sin datos</span>
          </div>
        )}
      </div>

      <div className="map-grid">
        <figure className="map-figure">
          <WorldMap box={WORLD_BOX} label={label} flagSize={0.03} hideFlagsIn={EUROPE_BOX} {...mapProps} />
          <figcaption className="muted">El recuadro es Europa, ampliada al lado.</figcaption>
        </figure>
        <figure className="map-figure">
          <WorldMap box={EUROPE_BOX} label={`Detalle de Europa. ${label}`} flagSize={0.055} {...mapProps} />
          <figcaption className="muted">Europa</figcaption>
        </figure>
      </div>
      <p className="muted">
        {isArea
          ? 'Cuanto más oscuro, más porcentaje de su PIB dedica el país. La bandera marca al que más dedica. Deja el ratón sobre un país para ver su cifra.'
          : 'Cada bandera es un ámbito y está en el país que más le dedica. Pulsa una bandera para ver ese ámbito en toda la página.'}
      </p>
    </>
  );
}
