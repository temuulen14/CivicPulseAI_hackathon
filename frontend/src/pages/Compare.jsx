import { useState } from 'react';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAreas, getCompare } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { formatPct } from '../format.js';
import Status from '../components/Status.jsx';
import YearSelect from '../components/YearSelect.jsx';

function CompareTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{r.name}</strong>
      {formatPct(r.value)} del PIB · puesto {r.rank}
      {r.provisional && ' (provisional)'}
    </div>
  );
}

// Frase que resume la posición de España, para que no haga falta leer el gráfico.
function summary(data) {
  const es = data.rows.find((r) => r.country === 'ES');
  if (!es || es.value === null || data.eu_median === null) return null;
  const diff = es.value - data.eu_median;
  const where = Math.abs(diff) < 0.05 ? 'igual que la mediana' : `${formatPct(Math.abs(diff))} del PIB ${diff > 0 ? 'por encima' : 'por debajo'} de la mediana`;
  return `España dedica a ${data.area_name.toLowerCase()} el ${formatPct(es.value)} de su PIB: puesto ${es.rank} de ${data.rows.length}, ${where} de la UE (${formatPct(data.eu_median)}).`;
}

export default function Compare({ year, years, onYearChange }) {
  const [areaId, setAreaId] = useState('GF07');
  const areas = useApi(() => getAreas(year), [year]);
  const compare = useApi(() => getCompare({ area: areaId, year }), [areaId, year]);
  const sources = useSourcesById();

  const options = [...(areas.data?.areas ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const data = compare.data;
  const rows = data ? data.rows.filter((r) => r.value !== null).sort((a, b) => b.value - a.value) : [];
  const source = data && sources[data.source_id];

  return (
    <>
      <section className="section">
        <h1>Comparar con otros países</h1>
        <p className="lead">
          Cuánto dedica cada país a un mismo ámbito, en porcentaje de su PIB. Usar el % del PIB permite comparar
          países de tamaños muy distintos.
        </p>
        <div className="filters">
          <label className="field">
            <span>Ámbito</span>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              {options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <YearSelect year={year} years={years} onYearChange={onYearChange} />
        </div>
      </section>

      {!data ? (
        <Status state={compare} />
      ) : rows.length === 0 ? (
        <p className="state">No hay datos de otros países para esta selección.</p>
      ) : (
        <section className="card section" aria-labelledby="cmp-title">
          <div className="section-head">
            <h2 id="cmp-title">
              {data.area_name} · {data.year}
            </h2>
            <p className="muted">
              <span className="legend-swatch legend-es" aria-hidden="true" /> España{'  '}
              <span className="legend-swatch legend-line" aria-hidden="true" /> Mediana UE
            </p>
          </div>
          {summary(data) && <p className="alert-message">{summary(data)}</p>}
          <div style={{ height: Math.max(260, rows.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 24, right: 56, bottom: 0, left: 0 }}>
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-2)', fontSize: 13 }}
                />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<CompareTooltip />} />
                <Bar
                  dataKey="value"
                  barSize={18}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                  label={{ position: 'right', fill: 'var(--text-2)', fontSize: 12, formatter: (v) => formatPct(v) }}
                >
                  {rows.map((r) => (
                    <Cell key={r.country} fill={r.country === 'ES' ? 'var(--accent)' : 'var(--neutral-bar)'} />
                  ))}
                </Bar>
                {data.eu_median !== null && (
                  <ReferenceLine
                    x={data.eu_median}
                    stroke="var(--text)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    label={{ value: `Mediana UE ${formatPct(data.eu_median)}`, position: 'top', fill: 'var(--text)', fontSize: 12 }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {source && (
            <p className="muted">
              Fuente: <a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>
              {rows.some((r) => r.provisional) && ' · Algunos datos son provisionales.'}
            </p>
          )}
        </section>
      )}
    </>
  );
}
