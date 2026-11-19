import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAlerts } from '../api.js';
import { useApi } from '../useApi.js';
import { getAreasCached, useAllAreas } from '../useAllYears.js';
import { compact, formatMeur, formatMeurWords, formatPct } from '../format.js';
import { MEASURES, totalOf } from '../measures.js';
import { useGovernments } from '../governments.js';
import { GovernmentBand } from '../components/BudgetBars.jsx';
import RiskWatch from '../components/RiskWatch.jsx';
import { shareStep } from '../scale.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import Spectrum from '../components/Spectrum.jsx';
import Contours from '../components/Contours.jsx';
import Segmented from '../components/Segmented.jsx';
import Sparkline from '../components/Sparkline.jsx';
import MeasureSwitch from '../components/MeasureSwitch.jsx';
import InflationChart from '../components/InflationChart.jsx';
import AreaTreemap from '../components/AreaTreemap.jsx';
import ShareLegend from '../components/ShareLegend.jsx';
import DivergingBars from '../components/DivergingBars.jsx';
import { SeverityIcon } from '../components/Severity.jsx';
import { SEVERITY } from '../labels.js';

// Cuatro maneras de mirar los mismos datos, sin salir de la portada.
const VIEWS = [
  { value: 'map', label: 'Mapa' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'trend', label: 'Evolución' },
  { value: 'changes', label: 'Cambios' },
];

const AXIS = { stroke: 'var(--line-strong)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false };

export default function Home({ year, years, onYearChange, measure, onMeasureChange }) {
  const [view, setView] = useState('map');
  const governments = useGovernments();
  const [base, setBase] = useState('prev'); // vista Cambios: frente al año anterior o desde el primero
  const areas = useApi(() => getAreasCached(year), [year]);
  const all = useAllAreas(years);
  const alerts = useApi(() => getAlerts({ year }), [year]);

  if (!areas.data) return <Status state={areas} />;
  const m = MEASURES[measure];
  const { total_meur, provisional, areas: list } = areas.data;
  const shownYear = areas.data.year;
  const byYear = all.data ?? {};

  // Valor de un ámbito en cada año, en la medida elegida (null si falta ese año).
  const seriesOf = (id) => years.map((y) => m.get(byYear[y]?.areas.find((a) => a.id === id)));
  const totals = Object.fromEntries(years.map((y) => [y, totalOf(byYear[y], measure)]));
  const ranking = [...list].sort((a, b) => b.amount_meur - a.amount_meur);
  const topAlerts = alerts.data?.alerts.slice(0, 3) ?? []; // el backend ya los ordena por severidad
  const areaName = Object.fromEntries(list.map((a) => [a.id, a.name]));
  const isLatest = shownYear === years[years.length - 1];
  const totalGdp = totalOf(areas.data, 'gdp');

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <Contours />
        <h1 id="hero-title">¿A dónde va el dinero público?</h1>
        <div className="hero-total">
          <p className="hero-kicker">En {shownYear}, las administraciones públicas de España gastaron</p>
          <p className="hero-figure">
            {measure === 'amount' ? formatMeurWords(total_meur) : `el ${formatPct(totalGdp)} del PIB`}
          </p>
          <p className="hero-sub">
            {measure === 'amount' ? `${formatMeur(total_meur)}, el ${formatPct(totalGdp)} del PIB` : formatMeurWords(total_meur)}
            {provisional && <span className="tag-provisional">Dato provisional</span>}
          </p>
        </div>
        <Spectrum areas={list} />
        <MeasureSwitch value={measure} onChange={onMeasureChange} />
        <YearPicker
          year={shownYear}
          years={years}
          onYearChange={onYearChange}
          values={totals}
          format={m.format}
          caption={`Cada barra es el gasto total de ese año${measure === 'gdp' ? ', en % del PIB' : ''}. Pulsa un año para ver sus cifras.`}
        />
        {governments.length > 0 && <GovernmentBand years={years} governments={governments} />}
      </section>

      {/* Pensiones no está en la cabecera: este bloque, justo bajo la cifra principal, es su puerta de entrada. */}
      <section className="feature section" aria-labelledby="pensions-feature">
        <div className="feature-text">
          <p className="feature-kicker">Tema destacado</p>
          <h2 id="pensions-feature">Pensiones: ¿crece el dinero al ritmo de quienes las cobran?</h2>
          <p>
            Es la mayor partida del gasto público. Compara año a año cuánto se gasta en pensiones, cuántos pensionistas
            hay y cuánto toca a cada uno.
          </p>
        </div>
        <a href="#/pensiones" className="feature-link">
          Ver las pensiones <span aria-hidden="true">→</span>
        </a>
      </section>

      <section className="section" aria-labelledby="explore-title">
        <div className="section-head">
          <div className="section-title">
            <h2 id="explore-title">Explora el gasto de {shownYear}</h2>
            <p className="muted">Los mismos datos, vistos de cuatro maneras. Pulsa un ámbito para ver su detalle.</p>
          </div>
          <div className="controls">
            <Segmented label="Vista" options={VIEWS} value={view} onChange={setView} />
            <MeasureSwitch value={measure} onChange={onMeasureChange} />
          </div>
        </div>

        {view === 'map' && (
          <div className="view">
            <p className="muted">El tamaño de cada bloque es su importe. El círculo indica cuántos avisos tiene.</p>
            <AreaTreemap areas={list} measure={measure} />
            <ShareLegend />
          </div>
        )}

        {view === 'ranking' && (
          <div className="view table-wrap">
            <table className="ranking">
              <thead>
                <tr>
                  <th>Ámbito</th>
                  <th className="share-col">Cuota del total</th>
                  <th className="num">{m.label}</th>
                  <th>
                    {years[0]}–{years[years.length - 1]}
                  </th>
                  <th className="num">Frente a {shownYear - 1}</th>
                  <th>Avisos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((a) => {
                  const values = seriesOf(a.id);
                  const i = years.indexOf(shownYear);
                  const change = measure === 'amount' ? a.yoy_change_pct : m.change(values[i], values[i - 1]);
                  return (
                    <tr key={a.id}>
                      <td>
                        <a href={`#/ambito/${a.id}`}>{a.name}</a>
                      </td>
                      <td className="share-col">
                        <span className="share-cell">
                          <span className="share-track" aria-hidden="true">
                            <span
                              style={{
                                width: `${(a.share_of_total_pct / ranking[0].share_of_total_pct) * 100}%`,
                                background: shareStep(a.share_of_total_pct).fill,
                              }}
                            />
                          </span>
                          <span className="num">{formatPct(a.share_of_total_pct)}</span>
                        </span>
                      </td>
                      <td className="num">{m.format(m.get(a))}</td>
                      <td>
                        <Sparkline values={values} />
                      </td>
                      <td className="num">{m.formatChange(change)}</td>
                      <td>
                        {a.alert_count > 0 ? (
                          <a href="#/avisos" className="alert-count" title={SEVERITY[a.max_severity]?.label}>
                            <SeverityIcon level={a.max_severity} size={14} />
                            {a.alert_count}
                          </a>
                        ) : (
                          <span className="muted">Ninguno</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === 'trend' && (
          <div className="view">
            {!all.data ? (
              <Status state={all} />
            ) : (
              <>
                <div className="panel">
                  <h3>Gasto total, {m.unit}</h3>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={years.map((y) => ({ year: y, value: totals[y] }))}
                        margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
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
                                <div>{m.format(payload[0].value)}</div>
                              </div>
                            ) : null
                          }
                        />
                        <ReferenceLine x={shownYear} stroke="var(--line-strong)" strokeDasharray="3 3" />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="var(--forest)"
                          strokeWidth={2}
                          dot={{ r: 4, fill: 'var(--forest)', stroke: 'var(--paper)', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="muted">Pulsa un año del gráfico para verlo en toda la página.</p>
                </div>
                <h3 className="multiples-title">Cada ámbito, {years[0]}–{years[years.length - 1]}</h3>
                <p className="muted">Cada gráfico tiene su propia escala, para que se vea bien la forma de su evolución.</p>
                <div className="multiples">
                  {ranking.map((a) => {
                    const values = seriesOf(a.id);
                    const first = values.find((v) => v != null);
                    const change = m.change(m.get(a), first);
                    return (
                      <a key={a.id} href={`#/ambito/${a.id}`} className="multiple">
                        <span className="multiple-name">{a.name}</span>
                        <span className="multiple-value">{m.format(m.get(a))}</span>
                        <Sparkline values={values} width={240} height={56} className="sparkline-wide" />
                        <span className="muted">
                          {m.formatChange(change)} desde {years[0]}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {view === 'changes' && (
          <div className="view">
            <div className="view-toolbar">
              <Segmented
                label="Comparar con"
                options={[
                  { value: 'prev', label: `Frente a ${shownYear - 1}` },
                  { value: 'first', label: `Desde ${years[0]}` },
                ]}
                value={base}
                onChange={setBase}
              />
              <p className="muted">
                {measure === 'amount'
                  ? 'Variación del importe, en porcentaje.'
                  : 'Diferencia en puntos del PIB (p. p.).'}
              </p>
            </div>
            {!all.data ? (
              <Status state={all} />
            ) : (
              (() => {
                const baseYear = base === 'prev' ? shownYear - 1 : years[0];
                const before = byYear[baseYear];
                if (!before || baseYear === shownYear) {
                  return <p className="state">No hay datos de {baseYear} para comparar.</p>;
                }
                const rows = list
                  .map((a) => ({
                    key: a.id,
                    id: a.id,
                    label: a.name,
                    value: m.change(m.get(a), m.get(before.areas.find((b) => b.id === a.id))),
                  }))
                  .sort((r1, r2) => (r2.value ?? -Infinity) - (r1.value ?? -Infinity));
                return (
                  <DivergingBars
                    rows={rows}
                    format={m.formatChange}
                    labels={['Baja', 'Sube']}
                    hrefFor={(r) => `#/ambito/${r.id}`}
                  />
                );
              })()
            )}
          </div>
        )}
      </section>

      <section className="panel section" aria-labelledby="inflation-title">
        <div className="section-title">
          <h2 id="inflation-title">El gasto público frente a la inflación</h2>
          <p className="muted">
            Si los precios suben más que el gasto, con el mismo dinero se pagan menos médicos, profesores o kilómetros de
            carretera. Pulsa un año para verlo en toda la página.
          </p>
        </div>
        {!all.data ? (
          <Status state={all} />
        ) : (
          <InflationChart
            values={Object.fromEntries(years.map((y) => [y, byYear[y]?.total_meur ?? null]))}
            year={shownYear}
            onYearChange={onYearChange}
          />
        )}
      </section>

      <section className="panel-soft section budget-teaser" aria-labelledby="pge-teaser">
        <h2 id="pge-teaser">Partida a partida</h2>
        <p className="lead">
          Los Presupuestos Generales del Estado de cada año, desde las grandes políticas de gasto hasta el último
          concepto, con quién los elaboró y quién los ejecutó.
        </p>
        <a href="#/presupuestos">Ver los Presupuestos del Estado</a>
      </section>

      <section className="section" aria-labelledby="alerts-title">
        <div className="section-head">
          <div className="section-title">
            <h2 id="alerts-title">{isLatest ? 'En qué fijarse ahora' : `En qué fijarse en ${shownYear}`}</h2>
            {isLatest && (
              <p className="muted">
                {shownYear} es el último año con datos, el más cercano a hoy: además de sus avisos, qué servicios
                públicos pueden dar problemas en los próximos años.
              </p>
            )}
          </div>
          <a href="#/avisos">Ver todos los avisos</a>
        </div>
        {isLatest && (
          <div className="now-block">
            <h3>Qué puede dar problemas</h3>
            <RiskWatch years={years} compact />
            <a href="#/avisos/prevision">Ver la previsión completa y probarla con años pasados</a>
          </div>
        )}
        {isLatest && <h3>Avisos de {shownYear}</h3>}
        {!alerts.data ? (
          <Status state={alerts} />
        ) : topAlerts.length === 0 ? (
          <p className="muted">No hay avisos para {shownYear}.</p>
        ) : (
          <ul className="alert-list">
            {topAlerts.map((al) => (
              <li key={al.id}>
                <a href={`#/ambito/${al.area_id}`} className={`alert-item sev-text-${al.severity}`}>
                  <SeverityIcon level={al.severity} />
                  <span className="alert-item-body">
                    <span className="alert-item-title">{al.title}</span>
                    <span className="muted">
                      {SEVERITY[al.severity]?.label}. {areaName[al.area_id] ?? al.area_id}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
