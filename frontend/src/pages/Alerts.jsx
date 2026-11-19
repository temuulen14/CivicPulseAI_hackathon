import { useEffect, useState } from 'react';
import { getAlerts } from '../api.js';
import { useApi } from '../useApi.js';
import { useAllAreas } from '../useAllYears.js';
import { useSourcesById } from '../sources.js';
import { formatNumber, formatPct } from '../format.js';
import { ALERT_TYPES, SEVERITY } from '../labels.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import Segmented from '../components/Segmented.jsx';
import AlertCard from '../components/AlertCard.jsx';
import DivergingBars from '../components/DivergingBars.jsx';
import { SeverityIcon } from '../components/Severity.jsx';
import RiskWatch from '../components/RiskWatch.jsx';

const SEVERITY_KEYS = ['critical', 'warning', 'info'];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "8 avisos en 2024: 1 importante, 5 merecen una mirada y 2 para tu información."
function summary(alerts, year) {
  const count = (s) => alerts.filter((a) => a.severity === s).length;
  const parts = [
    count('critical') && plural(count('critical'), 'importante', 'importantes'),
    count('warning') && `${count('warning')} ${count('warning') === 1 ? 'merece' : 'merecen'} una mirada`,
    count('info') && `${count('info')} para tu información`,
  ].filter(Boolean);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
  return `${plural(alerts.length, 'aviso', 'avisos')} en ${year}: ${list}.`;
}

// Las dos cifras clave de un aviso, para la fila plegada: "55 % frente a 9,3 %".
function keyFigures(alert) {
  const [a, b] = alert.evidence;
  if (!a || !b) return null;
  const show = (e) => formatNumber(e.value, e.unit?.startsWith('%') ? '%' : null);
  return `${show(a)} frente a ${show(b)}`;
}

// Distancia relativa de España a la mediana, a partir de las dos cifras de `evidence`.
function distanceToMedian(alert) {
  const [es, median] = alert.evidence;
  if (es?.value == null || !median?.value) return null;
  return ((es.value - median.value) / median.value) * 100;
}

// Nombre corto para los gráficos: "Secundaria: gasto frente a alumnado" -> "Secundaria".
const shortTitle = (alert) => alert.title.split(':')[0];

// Sección de previsión, la misma en los dos estados de la página (cargando o con avisos).
function Forecast({ years }) {
  return (
    <section id="prevision" className="section forecast" aria-labelledby="forecast-title">
      <div className="section-title">
        <h2 id="forecast-title">Qué puede dar problemas más adelante</h2>
        <p className="lead">
          Los avisos de hoy son las averías de mañana. Si esta web hubiera existido hace unos años, la falta de
          inversión en transporte, por ejemplo, ya se habría visto venir.
        </p>
      </div>
      <RiskWatch years={years} />
    </section>
  );
}

export default function Alerts({ year, years, onYearChange, focus }) {
  const [severity, setSeverity] = useState(null);
  const [type, setType] = useState(null);
  const [areaId, setAreaId] = useState(null);
  const [order, setOrder] = useState('severity');
  const [openId, setOpenId] = useState(null);
  // Se piden todos los avisos del año una vez; los filtros se aplican aquí, al momento.
  const alerts = useApi(() => getAlerts({ year }), [year]);
  const all = useAllAreas(years);
  const sources = useSourcesById();

  // #/avisos/prevision (enlace de la portada): baja directamente a la previsión.
  useEffect(() => {
    if (focus !== 'prevision') return;
    const t = setTimeout(() => document.getElementById('prevision')?.scrollIntoView({ block: 'start' }), 400);
    return () => clearTimeout(t);
  }, [focus]);

  const byYear = all.data ?? {};
  const shownYear = alerts.data?.year ?? year;
  const areas = byYear[shownYear]?.areas ?? [];
  const areaName = Object.fromEntries(areas.map((a) => [a.id, a.name]));
  // Avisos de cada año = suma de alert_count de sus ámbitos (no hace falta otra petición).
  const countsByYear = Object.fromEntries(
    years.map((y) => [y, byYear[y] ? byYear[y].areas.reduce((s, a) => s + a.alert_count, 0) : null]),
  );

  const yearPicker = (
    <YearPicker
      year={shownYear}
      years={years}
      onYearChange={(y) => {
        onYearChange(y);
        setOpenId(null);
      }}
      values={countsByYear}
      format={(n) => plural(n, 'aviso', 'avisos')}
      caption="Cada barra es el número de avisos de ese año."
    />
  );

  if (!alerts.data) {
    return (
      <>
        <section className="section">
          <h1>Avisos</h1>
          {yearPicker}
        </section>
        <Status state={alerts} />
        {years.length > 0 && <Forecast years={years} />}
      </>
    );
  }

  const everything = alerts.data.alerts;
  const filtered = everything.filter(
    (a) => (!severity || a.severity === severity) && (!type || a.type === type) && (!areaId || a.area_id === areaId),
  );
  const hasFilters = severity || type || areaId;
  const clear = () => {
    setSeverity(null);
    setType(null);
    setAreaId(null);
  };
  const toggle = (setter, current, value) => setter(current === value ? null : value);

  // Recuentos para los botones de filtro (sobre todos los avisos del año).
  const bySeverity = Object.fromEntries(SEVERITY_KEYS.map((s) => [s, everything.filter((a) => a.severity === s).length]));
  const areaCounts = {};
  for (const a of everything) areaCounts[a.area_id] = (areaCounts[a.area_id] ?? 0) + 1;

  const usage = filtered.filter((a) => a.type === 'usage_mismatch' && a.evidence.length >= 2);
  const outliers = filtered.filter((a) => a.type === 'international_outlier' && distanceToMedian(a) !== null);
  const usageMax = Math.max(1, ...usage.flatMap((a) => [a.evidence[0].value ?? 0, a.evidence[1].value ?? 0]));

  const openAlert = (id) => {
    setOpenId(id);
    // espera a que la fila se despliegue y la trae a la vista
    requestAnimationFrame(() => document.getElementById(`alert-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const sorted = [...filtered].sort((a, b) =>
    order === 'area'
      ? (areaName[a.area_id] ?? a.area_id).localeCompare(areaName[b.area_id] ?? b.area_id, 'es') ||
        SEVERITY_KEYS.indexOf(a.severity) - SEVERITY_KEYS.indexOf(b.severity)
      : SEVERITY_KEYS.indexOf(a.severity) - SEVERITY_KEYS.indexOf(b.severity),
  );

  return (
    <>
      <section className="section">
        <h1>Avisos</h1>
        <p className="lead">{everything.length ? summary(everything, shownYear) : `No hay avisos en ${shownYear}.`}</p>
        {yearPicker}
      </section>

      {everything.length > 0 && (
        <section className="section filters-panel" aria-label="Filtrar avisos">
          <div className="filter-group">
            <h2 className="filter-title">Severidad</h2>
            <div className={`sev-bar${severity ? ' filtered' : ''}`}>
              {SEVERITY_KEYS.filter((s) => bySeverity[s] > 0).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`sev-seg sev-seg-${s}`}
                  style={{ flexGrow: bySeverity[s] }}
                  aria-pressed={severity === s}
                  onClick={() => toggle(setSeverity, severity, s)}
                >
                  <span className="sev-seg-count">{bySeverity[s]}</span>
                  <span className="sev-seg-label">
                    <SeverityIcon level={s} size={14} />
                    {SEVERITY[s].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <h2 className="filter-title">Tipo</h2>
              <div className="chips">
                {Object.entries(ALERT_TYPES)
                  .map(([key, label]) => [key, label, everything.filter((a) => a.type === key).length])
                  .filter(([, , n]) => n > 0) // un tipo sin avisos este año no se ofrece como filtro
                  .map(([key, label, n]) => (
                    <button key={key} type="button" className="chip" aria-pressed={type === key} onClick={() => toggle(setType, type, key)}>
                      {label}
                      <span className="chip-count">{n}</span>
                    </button>
                  ))}
              </div>
            </div>
            <div className="filter-group">
              <h2 className="filter-title">Ámbito</h2>
              <div className="chips">
                {Object.entries(areaCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => (
                    <button key={id} type="button" className="chip" aria-pressed={areaId === id} onClick={() => toggle(setAreaId, areaId, id)}>
                      {areaName[id] ?? id}
                      <span className="chip-count">{n}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <p className="filter-status" aria-live="polite">
            {hasFilters ? `Se muestran ${filtered.length} de ${everything.length}.` : `Se muestran los ${everything.length}.`}
            {hasFilters && (
              <button type="button" className="link-button" onClick={clear}>
                Quitar filtros
              </button>
            )}
          </p>
        </section>
      )}

      {(usage.length > 0 || outliers.length > 0) && (
        <section className="breakdowns" aria-label="Desglose visual de los avisos">
          {usage.length > 0 && (
            <div className="panel">
              <h2>Gasto frente a uso</h2>
              <p className="muted">
                Qué parte del gasto recibe algo y qué parte del uso supone. Cuanto más separados los puntos, mayor el
                desajuste. Pulsa una fila para leer el aviso.
              </p>
              <div className="legend" aria-hidden="true">
                <span><span className="dot dot-spend" /> Cuota de gasto</span>
                <span><span className="dot dot-use" /> Cuota de uso</span>
              </div>
              <div className="dumbbells">
                {usage.map((a) => {
                  const [spend, use] = a.evidence;
                  const x1 = ((spend.value ?? 0) / usageMax) * 100;
                  const x2 = ((use.value ?? 0) / usageMax) * 100;
                  return (
                    <button key={a.id} type="button" className="dumbbell-row" onClick={() => openAlert(a.id)}>
                      <span className="dumbbell-label">
                        <SeverityIcon level={a.severity} size={14} />
                        {shortTitle(a)}
                      </span>
                      <span className="dumbbell-track" aria-hidden="true">
                        <span className="dumbbell-link" style={{ left: `${Math.min(x1, x2)}%`, width: `${Math.abs(x1 - x2)}%` }} />
                        <span className="dumbbell-dot dot-spend" style={{ left: `${x1}%` }} />
                        <span className="dumbbell-dot dot-use" style={{ left: `${x2}%` }} />
                      </span>
                      <span className="dumbbell-values">
                        {formatPct(spend.value)} <span className="muted">y</span> {formatPct(use.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {outliers.length > 0 && (
            <div className="panel">
              <h2>España frente a la mediana europea</h2>
              <p className="muted">
                Cuánto se aleja el gasto de España (en % del PIB) de la mediana de los países de la UE. Pulsa una fila
                para leer el aviso.
              </p>
              <DivergingBars
                rows={outliers
                  .map((a) => ({ key: a.id, id: a.id, label: areaName[a.area_id] ?? a.area_id, value: distanceToMedian(a) }))
                  .sort((r1, r2) => r2.value - r1.value)}
                format={(v) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v))} %`}
                labels={['Gasta menos', 'Gasta más']}
                onSelect={(r) => openAlert(r.id)}
              />
            </div>
          )}
        </section>
      )}

      {everything.length > 0 && (
        <section className="section" aria-labelledby="list-title">
          <div className="section-head">
            <h2 id="list-title">Todos los avisos</h2>
            <Segmented
              label="Ordenar por"
              options={[
                { value: 'severity', label: 'Por severidad' },
                { value: 'area', label: 'Por ámbito' },
              ]}
              value={order}
              onChange={setOrder}
            />
          </div>
          {sorted.length === 0 ? (
            <p className="state">
              Ningún aviso cumple estos filtros.{' '}
              <button type="button" className="link-button" onClick={clear}>
                Quitar filtros
              </button>
            </p>
          ) : (
            <ul className="alert-rows">
              {sorted.map((a) => {
                const open = openId === a.id;
                return (
                  <li key={a.id} id={`alert-${a.id}`} className={`alert-row${open ? ' open' : ''}`}>
                    <button
                      type="button"
                      className="alert-row-head"
                      aria-expanded={open}
                      aria-controls={`alert-body-${a.id}`}
                      onClick={() => setOpenId(open ? null : a.id)}
                    >
                      <span className={`sev-text-${a.severity}`}>
                        <SeverityIcon level={a.severity} />
                      </span>
                      <span className="alert-row-title">
                        <span>{a.title}</span>
                        <span className="muted">
                          {areaName[a.area_id] ?? a.area_id}. {ALERT_TYPES[a.type] ?? a.type}
                        </span>
                      </span>
                      <span className="alert-row-figures">{keyFigures(a)}</span>
                      <svg className="chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {open && (
                      <div id={`alert-body-${a.id}`} className="alert-row-body">
                        <AlertCard alert={a} sources={sources} compact areaName={areaName[a.area_id]} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      {years.length > 0 && <Forecast years={years} />}
    </>
  );
}
