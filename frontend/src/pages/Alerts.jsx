import { useEffect } from 'react';
import { getAlerts } from '../api.js';
import { useApi } from '../useApi.js';
import { useAllAreas } from '../useAllYears.js';
import { useSourcesById } from '../sources.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import AlertTile from '../components/AlertTile.jsx';
import RiskWatch from '../components/RiskWatch.jsx';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Sección de previsión, la misma en los dos estados de la página (cargando o con avisos).
function Forecast({ years }) {
  return (
    <section id="prevision" className="section forecast" aria-labelledby="forecast-title">
      <div className="section-title">
        <h2 id="forecast-title">Qué puede dar problemas más adelante</h2>
        <p className="lead">Los avisos de hoy son las averías de mañana.</p>
      </div>
      <RiskWatch years={years} />
    </section>
  );
}

export default function Alerts({ year, years, onYearChange, focus }) {
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
      onYearChange={onYearChange}
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

  const list = alerts.data.alerts;

  return (
    <>
      <section className="section">
        <h1>Avisos</h1>
        <p className="lead">
          {list.length ? `${plural(list.length, 'aviso', 'avisos')} en ${shownYear}.` : `No hay avisos en ${shownYear}.`}
        </p>
        {yearPicker}
      </section>

      {list.length > 0 && (
        <section className="alert-tiles" aria-label={`Avisos de ${shownYear}`}>
          {list.map((a) => (
            <AlertTile key={a.id} alert={a} sources={sources} areaName={areaName[a.area_id]} />
          ))}
        </section>
      )}
      {years.length > 0 && <Forecast years={years} />}
    </>
  );
}
