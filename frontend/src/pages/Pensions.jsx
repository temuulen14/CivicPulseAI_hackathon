import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getArea } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { formatChange, formatMeur, formatPct } from '../format.js';
import { MEASURES } from '../measures.js';
import { useGovernments } from '../governments.js';
import { PENSIONERS, PENSIONERS_SOURCE, PENSION_AREAS, POPULATION_65, POPULATION_SOURCE } from '../pensionsDemand.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import { GovernmentBand } from '../components/BudgetBars.jsx';

const AXIS = { stroke: 'var(--line-strong)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false };
const int = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });
const millions = (n) => `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(n / 1e6)} millones`;

// Tres series del mismo color que el resto de la app: gasto = verde, demanda = azul y gris.
const SERIES = [
  { key: 'spend', color: 'var(--forest)', dash: null },
  { key: 'pensioners', color: 'var(--sky)', dash: null },
  { key: 'older', color: 'var(--graphite)', dash: '5 4' },
];

// Dinero destinado a pensiones frente a su demanda.
// Dinero: gasto de las administraciones en "Vejez" y "Supervivientes" (Eurostat, COFOG).
// Demanda: pensionistas de jubilación y supervivencia, y personas de 65 años o más (Eurostat).
export default function Pensions({ year, years, onYearChange, measure }) {
  const latest = years[years.length - 1];
  const areas = useApi(() => Promise.all(PENSION_AREAS.map((id) => getArea(id, latest))), [latest]);
  const governments = useGovernments();
  const sources = useSourcesById();
  const m = MEASURES[measure];

  const head = (
    <section className="section">
      <h1>Pensiones: dinero frente a demanda</h1>
      <p className="lead">
        Cuánto gastan las administraciones en pensiones de jubilación y de viudedad u orfandad, y cuánta gente las
        necesita. Si el gasto crece más despacio que la demanda, cada pensionista recibe menos.
      </p>
    </section>
  );
  if (!areas.data || !years.length) {
    return (
      <>
        {head}
        <Status state={areas} />
      </>
    );
  }

  // Gasto total en pensiones de cada año: suma de los dos ámbitos.
  const spendOf = (y, get) => {
    const parts = areas.data.map((a) => get(a.history.find((h) => h.year === y)));
    return parts.some((v) => v == null) ? null : parts.reduce((s, v) => s + v, 0);
  };
  const rows = years.map((y) => {
    const amount = spendOf(y, (h) => h?.amount_meur ?? null);
    const gdp = spendOf(y, (h) => h?.pct_gdp ?? null);
    const pensioners = PENSIONERS[y] ?? null;
    return {
      year: y,
      amount,
      gdp,
      pensioners,
      older: POPULATION_65[y] ?? null,
      perPensioner: amount != null && pensioners ? (amount * 1e6) / pensioners : null,
      provisional: areas.data.some((a) => a.history.find((h) => h.year === y)?.provisional),
    };
  });
  const first = rows.find((r) => r.amount != null && r.pensioners != null);
  const shownYear = rows.some((r) => r.year === year) ? year : latest;
  const now = rows.find((r) => r.year === shownYear);
  if (!first || !now) return head; // aún no han llegado los años
  const spendKey = measure === 'amount' ? 'amount' : 'gdp';

  // Índice 100 en el primer año: así se comparan crecimientos de cosas con unidades distintas.
  const index = (r, key) => (r[key] != null && first[key] ? (r[key] / first[key]) * 100 : null);
  const chart = rows.map((r) => ({
    year: r.year,
    spend: index(r, spendKey),
    pensioners: index(r, 'pensioners'),
    older: index(r, 'older'),
  }));
  const growth = (key) => (now[key] != null && first[key] ? ((now[key] - first[key]) / first[key]) * 100 : null);
  const labels = {
    spend: measure === 'amount' ? 'Gasto en pensiones (euros)' : 'Gasto en pensiones (% del PIB)',
    pensioners: 'Pensionistas',
    older: 'Personas de 65 años o más',
  };
  const ratio = now.pensioners && now.older ? (now.pensioners / now.older) * 100 : null;
  const cofog = sources['eurostat_gov_10a_exp'];

  return (
    <>
      {head}

      <section className="section">
        <YearPicker
          year={shownYear}
          years={years}
          onYearChange={onYearChange}
          values={Object.fromEntries(rows.map((r) => [r.year, r.perPensioner]))}
          format={(v) => `${int.format(v)} € por pensionista`}
          caption="Cada barra es el gasto por pensionista de ese año, en euros corrientes."
        />
        {governments.length > 0 && <GovernmentBand years={years} governments={governments} />}

        <div className="stats">
          <div className="stat">
            <span className="stat-label">Gasto en pensiones en {shownYear}</span>
            <span className="stat-value">{m.format(measure === 'amount' ? now.amount : now.gdp)}</span>
            <span className="stat-note">
              {measure === 'amount' ? `${formatPct(now.gdp)} del PIB` : formatMeur(now.amount)}
              {now.provisional && '. Dato provisional'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Pensionistas</span>
            <span className="stat-value">{now.pensioners ? millions(now.pensioners) : 'Sin dato'}</span>
            <span className="stat-note">De jubilación y de supervivencia</span>
          </div>
          <div className="stat">
            <span className="stat-label">Gasto por pensionista al año</span>
            <span className="stat-value">{now.perPensioner ? `${int.format(now.perPensioner)} €` : 'Sin dato'}</span>
            <span className="stat-note">Unos {now.perPensioner ? int.format(now.perPensioner / 14) : '—'} € en 14 pagas</span>
          </div>
          <div className="stat">
            <span className="stat-label">Personas de 65 años o más</span>
            <span className="stat-value">{now.older ? millions(now.older) : 'Sin dato'}</span>
            {ratio && <span className="stat-note">{int.format(ratio)} pensionistas por cada 100</span>}
          </div>
        </div>
      </section>

      <section className="panel section" aria-labelledby="pen-growth">
        <div className="section-title">
          <h2 id="pen-growth">
            Cómo ha crecido cada cosa desde {first.year}
          </h2>
          <p className="lead">
            Entre {first.year} y {shownYear}, el gasto en pensiones {measure === 'amount' ? 'creció' : 'pasó'}{' '}
            {measure === 'amount'
              ? `un ${formatChange(growth('amount')).replace('+', '')}`
              : `del ${formatPct(first.gdp)} al ${formatPct(now.gdp)} del PIB`}
            ; los pensionistas, un {formatChange(growth('pensioners')).replace('+', '')}, y las personas de 65 años o
            más, un {formatChange(growth('older')).replace('+', '')}.
          </p>
          <p className="muted">
            Índice: {first.year} = 100. Pulsa un año para verlo arriba.
            {measure === 'amount' && ' En euros corrientes: parte de la subida del gasto es la inflación.'}
          </p>
        </div>
        <div className="legend" aria-hidden="true">
          {SERIES.map((s) => (
            <span key={s.key}>
              <span className={`legend-line${s.dash ? '' : ' solid'}`} style={{ borderTopColor: s.color }} /> {labels[s.key]}
            </span>
          ))}
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chart}
              margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
              onClick={(e) => e?.activeLabel && onYearChange(Number(e.activeLabel))}
            >
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="year" {...AXIS} />
              <YAxis {...AXIS} axisLine={false} width={44} domain={['auto', 'auto']} />
              <ReferenceLine y={100} stroke="var(--line-strong)" />
              <ReferenceLine x={shownYear} stroke="var(--line-strong)" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="tooltip">
                      <strong>{label}</strong>
                      {payload.map((p) => (
                        <div key={p.dataKey}>
                          {labels[p.dataKey]}: {p.value != null ? int.format(p.value) : 'sin dato'}
                        </div>
                      ))}
                    </div>
                  ) : null
                }
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dash ?? undefined}
                  dot={s.dash ? false : { r: 3, fill: s.color, stroke: 'var(--paper)', strokeWidth: 2 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel-soft section" aria-labelledby="pen-read">
        <h2 id="pen-read">Cómo leerlo</h2>
        <ul className="reading-list">
          <li>
            El <strong>gasto</strong> es lo que pagan todas las administraciones en pensiones de jubilación
            («Vejez») y de viudedad y orfandad («Supervivientes»), según la clasificación COFOG.
          </li>
          <li>
            Los <strong>pensionistas</strong> son quienes cobran una pensión de jubilación o de supervivencia; quien
            cobra las dos cuenta una vez. La <strong>población de 65 años o más</strong> anticipa la demanda futura.
          </li>
          <li>
            En los Presupuestos del Estado, las pensiones son la política{' '}
            <a href="#/presupuestos/politica/21">21 «Pensiones»</a>, la más grande de todas.
          </li>
        </ul>
        <p className="muted">
          Fuentes:{' '}
          {cofog && (
            <>
              <a href={cofog.url} target="_blank" rel="noreferrer">
                {cofog.name}
              </a>
              ;{' '}
            </>
          )}
          <a href={PENSIONERS_SOURCE.url} target="_blank" rel="noreferrer">
            {PENSIONERS_SOURCE.name}
          </a>
          ;{' '}
          <a href={POPULATION_SOURCE.url} target="_blank" rel="noreferrer">
            {POPULATION_SOURCE.name}
          </a>
          .
        </p>
      </section>
    </>
  );
}
