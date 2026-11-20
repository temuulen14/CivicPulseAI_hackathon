import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../useApi.js';
import { getAreasCached, useAllAreas } from '../useAllYears.js';
import { compact, formatMeur, formatMeurWords, formatPct } from '../format.js';
import { MEASURES, totalOf } from '../measures.js';
import { useGovernments } from '../governments.js';
import { GovernmentBand } from '../components/BudgetBars.jsx';
import { shareStep } from '../scale.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import Spectrum from '../components/Spectrum.jsx';
import Segmented from '../components/Segmented.jsx';
import Sparkline from '../components/Sparkline.jsx';
import MeasureSwitch from '../components/MeasureSwitch.jsx';
import InflationChart from '../components/InflationChart.jsx';
import AreaTreemap from '../components/AreaTreemap.jsx';
import ShareLegend from '../components/ShareLegend.jsx';
import DivergingBars from '../components/DivergingBars.jsx';
import { SeverityIcon } from '../components/Severity.jsx';
import { SEVERITY } from '../labels.js';

// Página «Gasto público»: las cifras del año, los ámbitos vistos de cuatro maneras y la inflación.
// Antes todo esto estaba en la portada; se sacó aquí para que el inicio sea solo una puerta de entrada.

// Cuatro maneras de mirar los mismos datos, sin cambiar de página.
const VIEWS = [
  { value: 'map', label: 'Mapa' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'trend', label: 'Evolución' },
  { value: 'changes', label: 'Cambios' },
];

// 41,0 % -> «41 céntimos»
const euroCents = (pct) => `${Math.round(pct)} céntimos`;

const AXIS = { stroke: 'var(--line-strong)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false };

export default function Spending({ year, years, onYearChange, measure, onMeasureChange }) {
  const [view, setView] = useState('map');
  const governments = useGovernments();
  const [base, setBase] = useState('prev'); // vista Cambios: frente al año anterior o desde el primero
  const areas = useApi(() => getAreasCached(year), [year]);
  const all = useAllAreas(years);

  if (!areas.data) return <Status state={areas} />;
  const m = MEASURES[measure];
  const { total_meur, provisional, areas: list } = areas.data;
  const shownYear = areas.data.year;
  const byYear = all.data ?? {};

  // Valor de un ámbito en cada año, en la medida elegida (null si falta ese año).
  const seriesOf = (id) => years.map((y) => m.get(byYear[y]?.areas.find((a) => a.id === id)));
  const totals = Object.fromEntries(years.map((y) => [y, totalOf(byYear[y], measure)]));
  const ranking = [...list].sort((a, b) => b.amount_meur - a.amount_meur);
  const totalGdp = totalOf(areas.data, 'gdp');

  return (
    <>
      <section className="section">
        <nav className="breadcrumb" aria-label="Estás en">
          <a href="#/">Inicio</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Gasto público</span>
        </nav>
        <h1>¿En qué se gasta el dinero público?</h1>
        <p className="lead">
          El gasto de todas las administraciones de España (Estado, comunidades autónomas, ayuntamientos y Seguridad
          Social), repartido por ámbitos. Elige un año y pulsa un ámbito para ver su detalle.
        </p>
      </section>

      {/* Lo esencial del año: tres cifras de tamaño moderado y la barra de ámbitos. */}
      <section className="section glance-section" aria-labelledby="glance-title">
        <div className="section-head">
          <h2 id="glance-title">{shownYear}, en tres cifras</h2>
          <MeasureSwitch value={measure} onChange={onMeasureChange} />
        </div>
        <dl className="glance">
          <div>
            <dt>Gasto de todas las administraciones</dt>
            <dd>{measure === 'amount' ? formatMeurWords(total_meur) : `${formatPct(totalGdp)} del PIB`}</dd>
            <span className="glance-note">
              {measure === 'amount' ? formatMeur(total_meur) : formatMeurWords(total_meur)}
              {provisional && <span className="tag-provisional">Dato provisional</span>}
            </span>
          </div>
          <div>
            <dt>{measure === 'amount' ? 'Frente a lo que produce el país' : 'En euros'}</dt>
            <dd>{measure === 'amount' ? `${formatPct(totalGdp)} del PIB` : formatMeurWords(total_meur)}</dd>
            <span className="glance-note">
              {measure === 'amount' ? `${Math.round(totalGdp)} € de cada 100 € que produce el país` : 'En euros de ese año'}
            </span>
          </div>
          <div>
            <dt>La mayor parte va a</dt>
            <dd>{ranking[0].name}</dd>
            <span className="glance-note">
              {euroCents(ranking[0].share_of_total_pct)} de cada euro
            </span>
          </div>
        </dl>
        <Spectrum areas={list} />
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
    </>
  );
}
