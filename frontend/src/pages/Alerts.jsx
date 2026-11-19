import { useState } from 'react';
import { getAlerts, getAreas } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { ALERT_TYPES, SEVERITY } from '../labels.js';
import Status from '../components/Status.jsx';
import YearSelect from '../components/YearSelect.jsx';
import AlertCard from '../components/AlertCard.jsx';

export default function Alerts({ year, years, onYearChange }) {
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  // El filtrado lo hace el backend (GET /alerts?severity=…&type=…); aquí solo se eligen los filtros.
  const alerts = useApi(() => getAlerts({ year, severity, type }), [year, severity, type]);
  const areas = useApi(() => getAreas(year), [year]);
  const sources = useSourcesById();

  const areaName = {};
  for (const a of areas.data?.areas ?? []) areaName[a.id] = a.name;

  return (
    <>
      <section className="section">
        <h1>Avisos</h1>
        <p className="lead">
          Señales que merecen una mirada: cuando la cuota de gasto de algo no se parece a su cuota de uso, o cuando
          España se aleja de la mediana europea. Informan, no acusan: cada aviso trae las cifras y su contexto.
        </p>
        <div className="filters">
          <label className="field">
            <span>Severidad</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(SEVERITY).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ALERT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <YearSelect year={year} years={years} onYearChange={onYearChange} />
        </div>
      </section>

      {!alerts.data ? (
        <Status state={alerts} />
      ) : alerts.data.alerts.length === 0 ? (
        <p className="state">No hay avisos con estos filtros.</p>
      ) : (
        <section className="section" aria-live="polite">
          <p className="muted">
            {alerts.data.count === 1 ? '1 aviso' : `${alerts.data.count} avisos`} en {alerts.data.year}
          </p>
          {alerts.data.alerts.map((al) => (
            <AlertCard key={al.id} alert={al} sources={sources} showArea={areaName[al.area_id] ?? al.area_id} />
          ))}
        </section>
      )}
    </>
  );
}
