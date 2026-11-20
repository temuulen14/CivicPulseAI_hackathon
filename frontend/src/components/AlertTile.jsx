import { formatChange, formatNumber, formatPct } from '../format.js';
import { SeverityIcon } from './Severity.jsx';

// "0,9 % del PIB": el porcentaje siempre con un decimal, y detrás el resto de la unidad.
function showValue(e) {
  if (e.unit?.startsWith('%')) return `${formatPct(e.value)}${e.unit.slice(1)}`;
  return formatNumber(e.value, e.unit);
}

// Un aviso de un vistazo: la desviación en grande y las dos cifras que la explican
// (`evidence[0]` frente a `evidence[1]`) como dos puntos sobre la misma escala.
// En pantalla ancha ocupa toda la fila: la cifra a la izquierda y la escala a la derecha.
// `sources` es un objeto { id: fuente }.
export default function AlertTile({ alert, sources = {}, areaName }) {
  const [a, b] = alert.evidence;
  const hasPair = a?.value != null && b?.value != null && b.value !== 0;
  const diff = hasPair ? ((a.value - b.value) / b.value) * 100 : null;
  const max = hasPair ? Math.max(a.value, b.value) : 0;
  const reference = alert.type === 'international_outlier' ? 'la mediana europea' : b?.label.toLowerCase();

  return (
    <article className="alert-tile" id={`alert-${alert.id}`}>
      <div className="alert-tile-main">
        <h2 className="alert-tile-area">
          <SeverityIcon level={alert.severity} />
          {areaName ?? alert.area_id}
          <span className="visually-hidden">: {alert.title}</span>
        </h2>
        {hasPair && (
          <p className="alert-tile-figure">
            {formatChange(diff)}
            <span className="alert-tile-caption">
              {diff < 0 ? 'por debajo de' : 'por encima de'} {reference}
            </span>
          </p>
        )}
      </div>

      <div className="alert-tile-data">
        {hasPair ? (
          <>
            <div className="dumbbell-track" aria-hidden="true">
              <span
                className="dumbbell-link"
                style={{
                  left: `${(Math.min(a.value, b.value) / max) * 100}%`,
                  width: `${(Math.abs(a.value - b.value) / max) * 100}%`,
                }}
              />
              <span className="dumbbell-dot dot-spend" style={{ left: `${(a.value / max) * 100}%` }} />
              <span className="dumbbell-dot dot-use" style={{ left: `${(b.value / max) * 100}%` }} />
            </div>
            <dl className="alert-tile-values">
              {[a, b].map((e, i) => (
                <div key={e.label}>
                  <dt>
                    <span className={`dot ${i === 0 ? 'dot-spend' : 'dot-use'}`} aria-hidden="true" /> {e.label}
                  </dt>
                  <dd>{showValue(e)}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p>{alert.message}</p>
        )}

        {alert.analyst_note && <p className="alert-tile-note">{alert.analyst_note}</p>}

        <div className="alert-tile-foot">
          {alert.source_ids.map((id) =>
            sources[id] ? (
              <a key={id} href={sources[id].url} target="_blank" rel="noreferrer">
                Fuente: {sources[id].publisher}
                <span className="visually-hidden"> (se abre en otra pestaña)</span>
              </a>
            ) : null,
          )}
          <a href={`#/ambito/${alert.area_id}`}>Ver el ámbito</a>
        </div>
      </div>
    </article>
  );
}
