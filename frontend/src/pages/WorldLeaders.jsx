import { useState } from 'react';
import { getCompare } from '../api.js';
import { useApi } from '../useApi.js';
import { cached, getAreasCached } from '../useAllYears.js';
import { useSourcesById } from '../sources.js';
import { formatPct } from '../format.js';
import { EUROPE_BOX, WORLD_BOX } from '../worldMap.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import WorldMap from '../components/WorldMap.jsx';
import AreaIcon from '../components/AreaIcon.jsx';

// Todos los países con dato de un ámbito: los de la UE (Eurostat) y los de fuera (OCDE).
function valuesOf(compare) {
  return [...compare.rows, ...(compare.world_rows ?? [])].filter((r) => r.value !== null);
}

// El país que más dedica a un ámbito, en % de su PIB. Si dos empatan, queda el primero de la lista.
function leaderOf(compare) {
  return valuesOf(compare).reduce((best, r) => (best && best.value >= r.value ? best : r), null);
}

// Pide la lista de ámbitos y, para cada uno, la comparación entre países de ese año.
async function loadLeaders(year) {
  const { areas, year: shownYear } = await getAreasCached(year);
  const compares = await Promise.all(
    areas.map((a) => cached(`compare-${a.id}-${shownYear}`, () => getCompare({ area: a.id, year: shownYear }))),
  );
  const rows = areas.map((area, i) => ({ area, compare: compares[i], leader: leaderOf(compares[i]) }));
  return { year: shownYear, rows: rows.filter((r) => r.leader) };
}

export default function WorldLeaders({ year, years, onYearChange }) {
  const [selectedId, setSelectedId] = useState(null); // ámbito elegido; null = ver todas las banderas
  const state = useApi(() => loadLeaders(year), [year]);
  const sources = useSourcesById();

  if (!state.data) return <Status state={state} />;
  const { rows } = state.data;
  const selected = rows.find((r) => r.area.id === selectedId) ?? null;
  const toggle = (id) => setSelectedId((current) => (current === id ? null : id));

  // Nombre de cada país y los ámbitos que lidera.
  const names = {};
  const ledBy = {};
  for (const r of rows) {
    for (const v of valuesOf(r.compare)) names[v.country] = v.name;
    (ledBy[r.leader.country] ??= []).push(r);
  }

  // Banderas: todas, o solo la del ámbito elegido.
  const flags = {};
  for (const r of selected ? [selected] : rows) {
    const title = `${r.area.name}: ${r.leader.name}, ${formatPct(r.leader.value)} del PIB`;
    (flags[r.leader.country] ??= []).push({ id: r.area.id, icon: r.area.icon, title });
  }

  // Con un ámbito elegido, cada país se colorea según su % del PIB: más oscuro = más gasto.
  const selectedValues = selected ? Object.fromEntries(valuesOf(selected.compare).map((v) => [v.country, v.value])) : {};
  const low = Math.min(...Object.values(selectedValues));
  const high = Math.max(...Object.values(selectedValues));
  function fillOf(code) {
    if (!selected) return !names[code] ? null : ledBy[code] ? 'var(--seq-1)' : 'var(--map-low)';
    const value = selectedValues[code];
    if (value === undefined) return null;
    const strength = high > low ? ((value - low) / (high - low)) * 100 : 100;
    return `color-mix(in srgb, var(--forest-deep) ${strength.toFixed(0)}%, var(--map-low))`;
  }
  function titleOf(code) {
    if (selected) return `${names[code]}: ${formatPct(selectedValues[code])} del PIB en ${selected.area.name.toLowerCase()}`;
    const led = ledBy[code]?.map((r) => r.area.name.toLowerCase());
    return led ? `${names[code]}: el que más dedica a ${led.join(', ')}` : names[code];
  }

  const mapProps = { fillOf, titleOf, flags, onPick: toggle };
  const source = sources[rows[0]?.compare.source_id];
  const worldSource = sources[rows.find((r) => r.compare.world_source_id)?.compare.world_source_id];

  return (
    <>
      <section className="section">
        <h1>Quién gasta más en cada ámbito</h1>
        <p className="lead">
          Cada bandera marca el país que más dedica a un ámbito, medido en porcentaje de su PIB para poder comparar
          países de tamaños muy distintos. Solo aparecen en color los {Object.keys(names).length} países de los que
          hay datos oficiales.
        </p>
        <YearPicker year={state.data.year} years={years} onYearChange={onYearChange} />
      </section>

      <section className="section" aria-labelledby="map-title">
        <div className="section-head">
          <h2 id="map-title">
            {selected ? `${selected.area.name} en ${state.data.year}` : `Los líderes de ${state.data.year}`}
          </h2>
          {selected ? (
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
            <WorldMap box={WORLD_BOX} label="Mapa del mundo" flagSize={0.03} hideFlagsIn={EUROPE_BOX} {...mapProps} />
            <figcaption className="muted">El recuadro es Europa, ampliada en el otro mapa.</figcaption>
          </figure>
          <figure className="map-figure">
            <WorldMap box={EUROPE_BOX} label="Mapa de Europa" flagSize={0.055} {...mapProps} />
            <figcaption className="muted">Europa</figcaption>
          </figure>
        </div>

        <ul className="leader-cards">
          {rows.map(({ area, compare, leader }) => {
            const spain = compare.rows.find((r) => r.country === 'ES');
            return (
              <li key={area.id}>
                <button type="button" className="leader-card" aria-pressed={selectedId === area.id} onClick={() => toggle(area.id)}>
                  <span className="leader-flag"><AreaIcon name={area.icon} size={22} /></span>
                  <span className="leader-area">{area.name}</span>
                  <span className="leader-country">{leader.name}</span>
                  <span className="leader-value">{formatPct(leader.value)} del PIB</span>
                  {spain?.value != null && (
                    <span className="muted">
                      España: {formatPct(spain.value)}
                      {spain.rank ? ` (puesto ${spain.rank} de la UE)` : ''}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="muted">
          Pulsa un ámbito (o su bandera) para colorear el mapa con lo que le dedica cada país; vuelve a pulsarlo para
          ver todas las banderas.
        </p>

        <p className="muted">
          Fuentes:{' '}
          {source && <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>}
          {worldSource && (
            <>
              {' '}y, para los países de fuera de la UE,{' '}
              <a href={worldSource.url} target="_blank" rel="noreferrer">{worldSource.name}</a>. Son dos fuentes
              distintas, así que la comparación entre ellas es orientativa
            </>
          )}
          . Contornos del mapa: <a href="https://www.naturalearthdata.com" target="_blank" rel="noreferrer">Natural Earth</a>.
        </p>
      </section>
    </>
  );
}
