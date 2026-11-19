import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getArea } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { formatChange, formatMeur, formatNumber, formatPct } from '../format.js';
import Status from '../components/Status.jsx';
import YearSelect from '../components/YearSelect.jsx';
import AlertCard from '../components/AlertCard.jsx';
import BarValueLabel from '../components/BarValueLabel.jsx';

const AXIS = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false };
const compact = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });

function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {format(payload[0].value, payload[0].payload)}
    </div>
  );
}

// Variación respecto al año anterior, a partir de `history`
// (GET /areas/{id} no trae yoy_change_pct; ver CAMBIOS.md).
function yearOverYear(history, year) {
  const now = history.find((h) => h.year === year);
  const prev = history.find((h) => h.year === year - 1);
  if (!now?.amount_meur || !prev?.amount_meur) return null;
  return ((now.amount_meur - prev.amount_meur) / prev.amount_meur) * 100;
}

export default function Area({ id, year, years, onYearChange }) {
  const area = useApi(() => getArea(id, year), [id, year]);
  const sources = useSourcesById();

  if (!area.data) {
    return (
      <>
        <a href="#/" className="back">← Volver al mapa</a>
        <Status state={area} />
      </>
    );
  }

  const a = area.data;
  const current = a.history.find((h) => h.year === a.year);
  const change = yearOverYear(a.history, a.year);
  const spendSource = sources[a.source_id];

  return (
    <>
      <section className="section">
        <a href="#/" className="back">← Volver al mapa</a>
        <div className="section-head">
          <div className="section">
            <h1>{a.name}</h1>
            {a.description && <p className="lead">{a.description}</p>}
          </div>
          <YearSelect year={year} years={years} onYearChange={onYearChange} />
        </div>

        <div className="stats">
          <div className="card stat">
            <span className="stat-label">Gasto en {a.year}</span>
            <span className="stat-value">{formatMeur(a.amount_meur)}</span>
            {current?.provisional && <span className="tag tag-provisional" style={{ justifySelf: 'start' }}>Dato provisional</span>}
          </div>
          <div className="card stat">
            <span className="stat-label">Del gasto público total</span>
            <span className="stat-value">{formatPct(a.share_of_total_pct)}</span>
          </div>
          <div className="card stat">
            <span className="stat-label">Del PIB</span>
            <span className="stat-value">{formatPct(a.pct_gdp)}</span>
          </div>
          <div className="card stat">
            <span className="stat-label">Frente al año anterior</span>
            <span className="stat-value">{formatChange(change)}</span>
            {change !== null && <span className="stat-note">{change >= 0 ? 'Sube' : 'Baja'} respecto a {a.year - 1}</span>}
          </div>
        </div>
        {spendSource && (
          <p className="muted">
            Fuente: <a href={spendSource.url} target="_blank" rel="noreferrer">{spendSource.name} ↗</a>
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="alerts-title">
        <h2 id="alerts-title">En qué fijarse</h2>
        {a.alerts.length === 0 ? (
          <p className="muted">No hay avisos para este ámbito en {a.year}.</p>
        ) : (
          a.alerts.map((al) => <AlertCard key={al.id} alert={al} sources={sources} />)
        )}
      </section>

      <div className="charts-2">
        <section className="card section" aria-labelledby="history-title">
          <h2 id="history-title">Evolución del gasto</h2>
          <p className="muted">Millones de euros por año</p>
          {a.history.length < 2 ? (
            <p className="muted">No hay suficientes años para dibujar la evolución.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.history} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--grid)" />
                  <XAxis dataKey="year" {...AXIS} />
                  <YAxis {...AXIS} axisLine={false} width={48} tickFormatter={(v) => compact.format(v)} />
                  <Tooltip
                    content={<ChartTooltip format={(v, p) => `${formatMeur(v)}${p.provisional ? ' (provisional)' : ''}`} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount_meur"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card section" aria-labelledby="sub-title">
          <h2 id="sub-title">En qué se reparte</h2>
          <p className="muted">% del gasto del ámbito en {a.year}</p>
          {a.subareas.length === 0 ? (
            <p className="muted">No hay desglose disponible para este ámbito.</p>
          ) : (
            <div style={{ height: Math.max(200, a.subareas.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.subareas} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis type="category" dataKey="name" {...AXIS} axisLine={false} width={170} interval={0} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    content={<ChartTooltip format={(v, p) => `${formatPct(v)} · ${formatMeur(p.amount_meur)}`} />}
                  />
                  <Bar
                    dataKey="share_of_area_pct"
                    fill="var(--accent)"
                    barSize={20}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                    label={<BarValueLabel />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {a.indicators.length > 0 && (
        <section className="section" aria-labelledby="ind-title">
          <h2 id="ind-title">Cómo se usa</h2>
          <div className="indicators">
            {a.indicators.map((ind) => (
              <div className="card stat" key={ind.id}>
                <span className="stat-label">{ind.name}</span>
                <span className="stat-value">{formatNumber(ind.value, ind.unit?.startsWith('%') ? '%' : null)}</span>
                <span className="stat-note">
                  {ind.unit} · {ind.year}
                  {sources[ind.source_id] && (
                    <>
                      {' · '}
                      <a href={sources[ind.source_id].url} target="_blank" rel="noreferrer">Fuente ↗</a>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card legal" aria-labelledby="legal-title">
        <h2 id="legal-title">Marco legal</h2>
        {a.legal ? (
          <>
            <p>{a.legal.law_title}</p>
            {a.legal.note && <p className="muted">{a.legal.note}</p>}
            <a href={a.legal.boe_url} target="_blank" rel="noreferrer">
              Leer la ley en el BOE ({a.legal.boe_id}) ↗
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
