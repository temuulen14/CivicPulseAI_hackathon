import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCompare } from '../api.js';
import { useApi } from '../useApi.js';
import { cached, getAreasCached, useEachYear } from '../useAllYears.js';
import { useSourcesById } from '../sources.js';
import { formatPct } from '../format.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import AreaIcon from '../components/AreaIcon.jsx';
import CompareMap from '../components/CompareMap.jsx';
import { leaderOf } from '../leaders.js';

// Los enlaces internos no pueden cambiar la almohadilla (la usa la navegación), así que se desplaza a mano.
function jump(e) {
  e.preventDefault();
  document.getElementById(e.currentTarget.getAttribute('href').slice(1))?.scrollIntoView({ block: 'start' });
}

const AXIS = { stroke: 'var(--line-strong)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false };

// Frase que resume la posición de España, para que no haga falta leer el gráfico.
function summary(data) {
  const es = data.rows.find((r) => r.country === 'ES');
  if (!es || es.value === null || data.eu_median === null) return null;
  const diff = es.value - data.eu_median;
  const where =
    Math.abs(diff) < 0.05
      ? 'igual que la mediana'
      : `${formatPct(Math.abs(diff)).replace(' %', ' puntos')} ${diff > 0 ? 'por encima' : 'por debajo'} de la mediana`;
  const ranked = data.rows.filter((r) => r.value !== null).length;
  return `España dedica a ${data.area_name.toLowerCase()} el ${formatPct(es.value)} de su PIB: puesto ${es.rank} de ${ranked}, ${where} de la UE (${formatPct(data.eu_median)}).`;
}

// Para cada ámbito, la comparación entre países de ese año y el país que más le dedica.
async function loadLeaders(year) {
  const { areas, year: shownYear } = await getAreasCached(year);
  const compares = await Promise.all(
    areas.map((a) => cached(`compare-${a.id}-${shownYear}`, () => getCompare({ area: a.id, year: shownYear }))),
  );
  return areas.map((area, i) => ({ area, compare: compares[i], leader: leaderOf(compares[i]) })).filter((r) => r.leader);
}

export default function Compare({ year, years, onYearChange }) {
  const [areaId, setAreaId] = useState('GF07');
  const areas = useApi(() => getAreasCached(year), [year]);
  const compare = useApi(() => getCompare({ area: areaId, year }), [areaId, year]);
  // El mismo ámbito en todos los años, para la evolución de España frente a la mediana.
  const history = useEachYear((y) => getCompare({ area: areaId, year: y }), years, [areaId]);
  const leaders = useApi(() => loadLeaders(year), [year]);
  const [mapView, setMapView] = useState('area'); // 'area' = ámbito elegido; 'leaders' = líder de cada ámbito
  const sources = useSourcesById();

  // Elegir un ámbito desde el mapa o las tarjetas: cambia toda la página y vuelve a la vista del ámbito.
  function pickArea(id, scrollTo) {
    setAreaId(id);
    setMapView('area');
    if (scrollTo) document.getElementById(scrollTo)?.scrollIntoView({ block: 'start' });
  }

  const options = [...(areas.data?.areas ?? [])].sort((a, b) => b.amount_meur - a.amount_meur);
  const data = compare.data;
  const rows = data ? data.rows.filter((r) => r.value !== null).sort((a, b) => b.value - a.value) : [];
  // Grandes economías de fuera de la UE (OCDE). Van aparte: no tienen puesto ni entran en la mediana.
  const worldRows = (data?.world_rows ?? []).filter((r) => r.value !== null);
  // Una sola escala para las dos listas, para que las barras se puedan comparar entre sí.
  const max = Math.max(0, ...rows.map((r) => r.value), ...worldRows.map((r) => r.value));
  const source = data && sources[data.source_id];
  const worldSource = data && sources[data.world_source_id];

  const spainOf = (resp) => resp?.rows.find((r) => r.country === 'ES')?.value ?? null;
  const byYear = history.data ?? {};
  const trend = years.map((y) => ({ year: y, spain: spainOf(byYear[y]), median: byYear[y]?.eu_median ?? null }));
  const hasMedianTrend = trend.filter((t) => t.median !== null).length >= 2;

  return (
    <>
      <section className="section">
        <h1>Comparar con otros países</h1>
        <p className="lead">
          Cuánto dedica cada país a un mismo ámbito, en porcentaje de su PIB. Usar el % del PIB permite comparar
          países de tamaños muy distintos.
        </p>
        <div className="filter-group">
          <h2 className="filter-title">Ámbito</h2>
          <div className="chips">
            {options.map((a) => (
              <button key={a.id} type="button" className="chip" aria-pressed={areaId === a.id} onClick={() => setAreaId(a.id)}>
                <AreaIcon name={a.icon} size={16} />
                {a.name}
              </button>
            ))}
          </div>
        </div>
        <YearPicker
          year={data?.year ?? year}
          years={years}
          onYearChange={onYearChange}
          values={Object.fromEntries(trend.map((t) => [t.year, t.spain]))}
          format={(v) => `${formatPct(v)} del PIB en España`}
          caption="Cada barra es lo que dedica España a este ámbito ese año, en % del PIB."
        />
        <nav className="page-jump" aria-label="En esta página">
          <span className="muted">En esta página:</span>
          <a href="#cmp-map" onClick={jump}>Mapa</a>
          <a href="#cmp-title" onClick={jump}>Ranking de países</a>
          <a href="#trend-title" onClick={jump}>Evolución de España</a>
          <a href="#leaders-title" onClick={jump}>Quién lidera cada ámbito</a>
        </nav>
      </section>

      {!data ? (
        <Status state={compare} />
      ) : rows.length === 0 ? (
        <p className="state">No hay datos de otros países para esta selección.</p>
      ) : (
        <>
          <section className="section" aria-labelledby="cmp-map">
            <h2 id="cmp-map">
              {mapView === 'area' ? `${data.area_name} en el mapa, ${data.year}` : `Quién más dedica a cada ámbito, ${data.year}`}
            </h2>
            {mapView === 'area' && summary(data) && <p className="lead">{summary(data)}</p>}
            {!leaders.data ? (
              <Status state={leaders} />
            ) : (
              <CompareMap
                view={mapView}
                onViewChange={setMapView}
                compare={data}
                area={{ id: areaId, name: data.area_name }}
                leaders={leaders.data}
                onPickArea={(id) => pickArea(id)}
              />
            )}
          </section>

          <section className="section" aria-labelledby="cmp-title">
            <div className="section-head">
              <h2 id="cmp-title">Ranking de países</h2>
              <div className="legend" aria-hidden="true">
                <span><span className="swatch" style={{ background: 'var(--forest)' }} /> España</span>
                <span><span className="swatch" style={{ background: 'var(--neutral-bar)' }} /> Otros países</span>
                {data.eu_median !== null && <span><span className="legend-line" /> Mediana UE</span>}
              </div>
            </div>
            <p className="muted">{data.area_name} en {data.year}, en % del PIB. España, resaltada en verde.</p>
            {data.eu_median === null && (
              <p className="muted">
                Todavía no hay datos de suficientes países (al menos tres) para calcular la mediana europea.
              </p>
            )}
            <ol className="country-bars">
              {rows.map((r) => (
                <li key={r.country} className={`country-bar${r.country === 'ES' ? ' is-spain' : ''}`}>
                  <span className="country-rank">{r.rank}</span>
                  <span className="country-name">{r.name}</span>
                  <span className="country-track" aria-hidden="true">
                    <span style={{ width: `${max > 0 ? (r.value / max) * 100 : 0}%` }} />
                    {data.eu_median !== null && (
                      <span className="median-mark" style={{ left: `${(data.eu_median / max) * 100}%` }} />
                    )}
                  </span>
                  <span className="country-value">
                    {formatPct(r.value)}
                    {r.provisional && <span className="visually-hidden"> (provisional)</span>}
                  </span>
                </li>
              ))}
            </ol>
            {source && (
              <p className="muted">
                Fuente:{' '}
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.name}
                </a>
                .{rows.some((r) => r.provisional) && ' Algunos datos son provisionales.'}
              </p>
            )}

            {worldRows.length > 0 && (
              <>
                <h3 className="world-title">Fuera de la UE</h3>
                <p className="muted">
                  Grandes economías como referencia, con la misma escala. No tienen puesto ni cuentan para la mediana
                  europea.
                </p>
                <ul className="country-bars">
                  {worldRows.map((r) => (
                    <li key={r.country} className="country-bar">
                      <span className="country-rank" aria-hidden="true">–</span>
                      <span className="country-name">{r.name}</span>
                      <span className="country-track" aria-hidden="true">
                        <span style={{ width: `${(r.value / max) * 100}%` }} />
                        {data.eu_median !== null && (
                          <span className="median-mark" style={{ left: `${(data.eu_median / max) * 100}%` }} />
                        )}
                      </span>
                      <span className="country-value">{formatPct(r.value)}</span>
                    </li>
                  ))}
                </ul>
                {worldSource && (
                  <p className="muted">
                    Fuente:{' '}
                    <a href={worldSource.url} target="_blank" rel="noreferrer">
                      {worldSource.name}
                    </a>
                    . Es una fuente distinta de la europea, así que las cifras son orientativas.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="panel section" aria-labelledby="trend-title">
            <h2 id="trend-title">
              España frente a la mediana europea, {years[0]}–{years[years.length - 1]}
            </h2>
            <p className="muted">{data.area_name}, en % del PIB. Pulsa un año para verlo arriba.</p>
            {!history.data ? (
              <Status state={history} />
            ) : (
              <>
                <div className="legend" aria-hidden="true">
                  <span><span className="legend-line solid" /> España</span>
                  {hasMedianTrend && <span><span className="legend-line" /> Mediana UE</span>}
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trend}
                      margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                      onClick={(e) => e?.activeLabel && onYearChange(Number(e.activeLabel))}
                    >
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="year" {...AXIS} />
                      <YAxis {...AXIS} axisLine={false} width={52} domain={['auto', 'auto']} tickFormatter={formatPct} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div className="tooltip">
                              <strong>{label}</strong>
                              <div>España: {formatPct(payload[0].payload.spain)}</div>
                              {payload[0].payload.median !== null && (
                                <div>Mediana UE: {formatPct(payload[0].payload.median)}</div>
                              )}
                            </div>
                          ) : null
                        }
                      />
                      <ReferenceLine x={data.year} stroke="var(--line-strong)" strokeDasharray="3 3" />
                      <Line
                        dataKey="median"
                        stroke="var(--graphite)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        dataKey="spain"
                        stroke="var(--forest)"
                        strokeWidth={2}
                        dot={{ r: 3.5, fill: 'var(--forest)', stroke: 'var(--paper)', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </section>

          <section className="section" aria-labelledby="leaders-title">
            <h2 id="leaders-title">Quién lidera cada ámbito en {data.year}</h2>
            <p className="muted">
              El país que más dedica a cada ámbito y dónde queda España. Pulsa una tarjeta para ver ese ámbito en toda
              la página.
            </p>
            {!leaders.data ? (
              <Status state={leaders} />
            ) : (
              <ul className="leader-cards">
                {leaders.data.map(({ area, compare: c, leader }) => {
                  const spain = c.rows.find((r) => r.country === 'ES');
                  return (
                    <li key={area.id}>
                      <button
                        type="button"
                        className="leader-card"
                        aria-pressed={areaId === area.id}
                        onClick={() => pickArea(area.id, 'cmp-map')}
                      >
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
            )}
            <p className="muted">
              Contornos del mapa:{' '}
              <a href="https://www.naturalearthdata.com" target="_blank" rel="noreferrer">Natural Earth</a>.
            </p>
          </section>
        </>
      )}
    </>
  );
}
