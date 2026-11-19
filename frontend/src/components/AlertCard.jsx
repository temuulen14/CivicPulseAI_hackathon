import { formatNumber } from '../format.js';
import { ALERT_TYPES } from '../labels.js';
import Severity from './Severity.jsx';

// Tarjeta de un aviso: título, frase, las cifras que lo justifican enfrentadas,
// nota del analista y enlaces a las fuentes. `sources` es un objeto { id: fuente }.
// `compact` la usa la lista de Avisos, donde el título ya está en la fila plegada.
export default function AlertCard({ alert, sources = {}, compact = false, areaName = null }) {
  // Las barras se miden contra la mayor de las cifras, para que se vea la diferencia de un vistazo.
  const max = Math.max(...alert.evidence.map((e) => e.value ?? 0), 0);

  return (
    <article className={`alert-card${compact ? ' compact' : ''}`}>
      {!compact && (
        <>
          <div className="alert-meta">
            <Severity level={alert.severity} />
            <span className="muted">{ALERT_TYPES[alert.type] ?? alert.type}</span>
          </div>
          <h3>{alert.title}</h3>
        </>
      )}
      <p className="alert-message">{alert.message}</p>

      {alert.evidence.length > 0 && (
        <div className="evidence" aria-label="Cifras que justifican el aviso">
          {alert.evidence.map((e, i) => (
            <div className="evidence-row" key={e.label}>
              <span className="evidence-label">{e.label}</span>
              <div className="evidence-track" aria-hidden="true">
                <div
                  className={`evidence-bar${i > 0 ? ' second' : ''}`}
                  style={{ width: `${max > 0 && e.value !== null ? (e.value / max) * 100 : 0}%` }}
                />
              </div>
              <span className="evidence-value">{formatNumber(e.value, e.unit === '%' ? '%' : null)}</span>
              {e.unit && e.unit !== '%' && <span className="evidence-unit">{e.unit}</span>}
            </div>
          ))}
        </div>
      )}

      {alert.analyst_note && (
        <p className="analyst-note">
          <strong>Contexto del analista. </strong>
          {alert.analyst_note}
        </p>
      )}

      <div className="alert-foot">
        {alert.source_ids.length > 0 && (
          <span className="alert-sources">
            Fuente:{' '}
            {alert.source_ids.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                {sources[id] ? (
                  <a href={sources[id].url} target="_blank" rel="noreferrer">
                    {sources[id].name}
                    <span className="visually-hidden"> (se abre en otra pestaña)</span>
                  </a>
                ) : (
                  id
                )}
              </span>
            ))}
          </span>
        )}
        {compact && areaName && <a href={`#/ambito/${alert.area_id}`}>Ver el ámbito {areaName}</a>}
      </div>
    </article>
  );
}
