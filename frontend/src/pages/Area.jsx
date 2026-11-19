import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getArea } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { compact, formatMeur, formatNumber, formatPct } from '../format.js';
import { MEASURES, MEASURE_OPTIONS } from '../measures.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import Segmented from '../components/Segmented.jsx';
import AlertCard from '../components/AlertCard.jsx';

const AXIS = { stroke: 'var(--line-strong)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false };

function Breadcrumb({ name }) {
  return (
    <nav className="breadcrumb" aria-label="Estás en">
      <a href="#/">Inicio</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{name ?? 'Ámbito'}</span>
    </nav>
  );
}

export default function Area({ id, year, years, onYearChange }) {
  const [measure, setMeasure] = useState('amount');
  const area = useApi(() => getArea(id, year), [id, year]);
  const sources = useSourcesById();

  if (!area.data) {
    return (
      <>
        <Breadcrumb />
        <Status state={area} />
      </>
    );
  }

  const a = area.data;
  const m = MEASURES[measure];
  const current = a.history.find((h) => h.year === a.year);
  const previous = a.history.find((h) => h.year === a.year - 1);
  // GET /areas/{id} no trae yoy_change_pct: se calcula desde `history` (ver CAMBIOS.md).
  const change = m.change(m.get(current), m.get(previous));
  const spendSource = sources[a.source_id];
  const maxSub = Math.max(0, ...a.subareas.map((s) => s.share_of_area_pct ?? 0));

  return (
    <>
      <section className="section">
        <Breadcrumb name={a.name} />
        <div className="area-head">
          <h1>{a.name}</h1>
          {a.description && <p className="lead">{a.description}</p>}
        </div>
        <YearPicker
          year={a.year}
          years={years}
          onYearChange={onYearChange}
          values={Object.fromEntries(a.history.map((h) => [h.year, h.amount_meur]))}
          format={formatMeur}
          caption={`Cada barra es el gasto en ${a.name.toLowerCase()} de ese año.`}
        />

        <div className="stats">
          <div className="stat">
            <span className="stat-label">Gasto en {a.year}</span>
            <span className="stat-value">{formatMeur(a.amount_meur)}</span>
            {current?.provisional && <span className="tag-provisional">Dato provisional</span>}
          </div>
          <div className="stat">
            <span className="stat-label">Parte del gasto público total</span>
            <span className="stat-value">{formatPct(a.share_of_total_pct)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Parte del PIB</span>
            <span className="stat-value">{formatPct(a.pct_gdp)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Frente a {a.year - 1}</span>
            <span className="stat-value">{m.formatChange(change)}</span>
            <span className="stat-note">{measure === 'amount' ? 'Variación del importe' : 'Diferencia en puntos del PIB'}</span>
          </div>
        </div>
        {spendSource && (
          <p className="muted">
            Fuente:{' '}
            <a href={spendSource.url} target="_blank" rel="noreferrer">
              {spendSource.name}
            </a>
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="alerts-title">
        <h2 id="alerts-title">En qué fijarse</h2>
        {a.alerts.length === 0 ? (
          <p className="muted">No hay avisos para este ámbito en {a.year}.</p>
        ) : (
          <div className="alert-cards">
            {a.alerts.map((al) => (
              <AlertCard key={al.id} alert={al} sources={sources} />
            ))}
          </div>
        )}
      </section>

      <div className="two-col">
        <section className="panel section" aria-labelledby="history-title">
          <div className="section-head">
            <h2 id="history-title">Evolución</h2>
            <Segmented label="Medida" options={MEASURE_OPTIONS} value={measure} onChange={setMeasure} />
          </div>
          <p className="muted">
            {m.label === 'Importe' ? 'Millones de euros' : 'Porcentaje del PIB'} por año. Pulsa un año para verlo.
          </p>
          {a.history.length < 2 ? (
            <p className="muted">No hay suficientes años para dibujar la evolución.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={a.history.map((h) => ({ ...h, value: m.get(h) }))}
                  margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                  onClick={(e) => e?.activeLabel && onYearChange(Number(e.activeLabel))}
                >
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="year" {...AXIS} />
                  <YAxis
                    {...AXIS}
                    axisLine={false}
                    width={52}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => (measure === 'amount' ? compact.format(v) : formatPct(v))}
                  />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="tooltip">
                          <strong>{label}</strong>
                          <div>
                            {m.format(payload[0].value)}
                            {payload[0].payload.provisional && ' (provisional)'}
                          </div>
                        </div>
                      ) : null
                    }
                  />
                  <ReferenceLine x={a.year} stroke="var(--line-strong)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--forest)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'var(--forest)', stroke: 'var(--paper)', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel section" aria-labelledby="sub-title">
          <h2 id="sub-title">En qué se reparte</h2>
          <p className="muted">Parte del gasto del ámbito en {a.year}</p>
          {a.subareas.length === 0 ? (
            <p className="muted">No hay desglose disponible para este ámbito.</p>
          ) : (
            <ul className="hbars">
              {[...a.subareas]
                .sort((s1, s2) => (s2.share_of_area_pct ?? 0) - (s1.share_of_area_pct ?? 0))
                .map((s) => (
                  <li key={s.id} className="hbar" title={formatMeur(s.amount_meur)}>
                    <span className="hbar-label">{s.name}</span>
                    <span className="hbar-track" aria-hidden="true">
                      <span style={{ width: `${maxSub > 0 ? ((s.share_of_area_pct ?? 0) / maxSub) * 100 : 0}%` }} />
                    </span>
                    <span className="hbar-value">{formatPct(s.share_of_area_pct)}</span>
                    <span className="hbar-amount muted">{formatMeur(s.amount_meur)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      {a.indicators.length > 0 && (
        <section className="section" aria-labelledby="ind-title">
          <h2 id="ind-title">Cómo se usa</h2>
          <div className="stats">
            {a.indicators.map((ind) => (
              <div className="stat" key={ind.id}>
                <span className="stat-label">{ind.name}</span>
                <span className="stat-value">{formatNumber(ind.value, ind.unit?.startsWith('%') ? '%' : null)}</span>
                <span className="stat-note">
                  {ind.unit}, {ind.year}.{' '}
                  {sources[ind.source_id] && (
                    <a href={sources[ind.source_id].url} target="_blank" rel="noreferrer">
                      Fuente
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel-soft section" aria-labelledby="legal-title">
        <h2 id="legal-title">Marco legal</h2>
        {a.legal ? (
          <>
            <p>{a.legal.law_title}</p>
            {a.legal.note && <p className="muted">{a.legal.note}</p>}
            <a href={a.legal.boe_url} target="_blank" rel="noreferrer">
              Leer la ley en el BOE ({a.legal.boe_id})
            </a>
          </>
        ) : (
          <p className="muted">No se ha localizado la ley de presupuestos de {a.year}.</p>
        )}
        <p className="muted">
          Las cifras de esta página son gasto ejecutado de todas las administraciones (Eurostat), no el crédito
          inicial que aprueba la ley.
        </p>
      </section>
    </>
  );
}
