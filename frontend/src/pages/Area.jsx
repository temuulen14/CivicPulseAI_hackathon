import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getArea } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { compact, formatMeur, formatNumber, formatPct } from '../format.js';
import { MEASURES } from '../measures.js';
import { useGovernments } from '../governments.js';
import { GovernmentBand } from '../components/BudgetBars.jsx';
import Status from '../components/Status.jsx';
import MeasureSwitch from '../components/MeasureSwitch.jsx';
import YearPicker from '../components/YearPicker.jsx';
import AlertCard from '../components/AlertCard.jsx';
import PolicyBar from '../components/PolicyBar.jsx';
import InflationChart from '../components/InflationChart.jsx';

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

export default function Area({ id, year, years, onYearChange, onBudgetYearChange, measure, onMeasureChange }) {
  const governments = useGovernments();
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
  // Desde el contrato v1.1 la API trae yoy_change_pct; en % del PIB (puntos) se calcula desde `history`.
  const change =
    measure === 'amount' && a.yoy_change_pct != null ? a.yoy_change_pct : m.change(m.get(current), m.get(previous));
  const spendSource = sources[a.source_id];
  const maxSub = Math.max(0, ...a.subareas.map((s) => s.share_of_area_pct ?? 0));

  return (
    <>
      <section className="section">
        <Breadcrumb name={a.name} />
        <div className="area-head">
          <h1>{a.name}</h1>
          {a.description && <p className="lead">{a.description}</p>}
          {a.id === 'GF10' && (
            <p className="area-pensions">
              Buena parte de este gasto son pensiones. <a href="#/pensiones">Ver pensiones: dinero frente a demanda</a>
            </p>
          )}
        </div>
        <MeasureSwitch value={measure} onChange={onMeasureChange} />
        <YearPicker
          year={a.year}
          years={years}
          onYearChange={onYearChange}
          values={Object.fromEntries(a.history.map((h) => [h.year, m.get(h)]))}
          format={m.format}
          caption={`Cada barra es el gasto en ${a.name.toLowerCase()} de ese año${measure === 'gdp' ? ', en % del PIB' : ''}.`}
        />
        {governments.length > 0 && <GovernmentBand years={years} governments={governments} />}

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
            <MeasureSwitch value={measure} onChange={onMeasureChange} />
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

      <section className="panel section" aria-labelledby="inflation-title">
        <h2 id="inflation-title">Frente a la inflación</h2>
        <InflationChart
          values={Object.fromEntries(a.history.map((h) => [h.year, h.amount_meur]))}
          year={a.year}
          onYearChange={onYearChange}
          what={`el gasto en ${a.name.toLowerCase()}`}
        />
      </section>

      {a.spending_by_type?.some((t) => t.amount_meur > 0) && (
        <section className="section" aria-labelledby="type-title">
          <div className="section-title">
            <h2 id="type-title">En qué se va el dinero</h2>
            <p className="muted">Por tipo de gasto en {a.year}: sueldos, compras, inversión, ayudas…</p>
          </div>
          <ul className="type-bars">
            {a.spending_by_type
              .filter((t) => t.amount_meur > 0)
              .map((t) => (
                <li key={t.type_id} className="type-bar">
                  <span className="type-name">
                    {t.name}
                    <span className="muted">{t.description}</span>
                  </span>
                  <span className="hbar-track" aria-hidden="true">
                    <span style={{ width: `${(t.share_of_area_pct / Math.max(...a.spending_by_type.map((x) => x.share_of_area_pct))) * 100}%` }} />
                  </span>
                  <span className="type-value">
                    {formatPct(t.share_of_area_pct)}
                    <span className="muted">{formatMeur(t.amount_meur)}</span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

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

      {a.budget_policies?.length > 0 && (
        <section className="section" aria-labelledby="pge-title">
          <div className="section-title">
            <h2 id="pge-title">En los Presupuestos del Estado</h2>
            <p className="muted">
              Políticas de gasto de la Ley de Presupuestos de {a.year} que corresponden a este ámbito (correspondencia
              aproximada). Es otra cifra: solo el Estado central y lo presupuestado, así que no se compara con la de
              arriba. Pulsa una para verla partida a partida.
            </p>
          </div>
          <ul className="pbars">
            {a.budget_policies.map((p) => (
              <PolicyBar
                key={p.id}
                href={`#/presupuestos/politica/${p.id}`}
                onClick={() => onBudgetYearChange?.(a.year)}
                name={p.name}
                value={p.total_keur}
                eu={p.eu_recovery_keur}
                max={Math.max(0, ...a.budget_policies.map((x) => x.total_keur ?? 0))}
              />
            ))}
          </ul>
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
