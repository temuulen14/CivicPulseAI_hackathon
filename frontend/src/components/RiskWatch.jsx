import { useState } from 'react';
import { SIGNAL_GROUPS, WINDOW, useAfterwards, useForecast } from '../forecast.js';
import Status from './Status.jsx';
import YearPicker from './YearPicker.jsx';

// Medidor de 4 tramos: cuántas señales de alerta temprana acumula un servicio.
function Meter({ score }) {
  const filled = Math.min(4, score);
  return (
    <span className={`risk-meter lvl-${filled}`} aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= filled ? 'on' : ''} />
      ))}
    </span>
  );
}

function RiskCard({ row, afterwards, cutoff }) {
  const href = `#/ambito/${row.id}`;
  return (
    <li className={`risk-card risk-${row.level.key}`}>
      <div className="risk-card-head">
        <a href={href} className="risk-name">
          {row.name}
        </a>
        <span className="risk-level">
          <Meter score={row.score} />
          {row.level.label}
        </span>
      </div>
      <ul className="risk-reasons">
        {row.signals.map((s, i) => (
          <li key={i}>{s.text}</li>
        ))}
      </ul>
      {afterwards && (
        <p className="risk-after">
          {afterwards.length
            ? `Qué pasó después: la web le dio avisos en ${afterwards.join(', ')}.`
            : `Después de ${cutoff}, la web no le dio avisos (solo mira cifras de gasto, no incidentes).`}
        </p>
      )}
    </li>
  );
}

// Previsión de riesgos. `compact` (portada): solo los primeros, sin selector de año.
// Completa (Avisos): selector "¿y si la web hubiera existido antes?" y tabla de señales.
export default function RiskWatch({ years, compact = false, limit = 3 }) {
  const latest = years[years.length - 1];
  const [cutoff, setCutoff] = useState(null);
  const shown = cutoff ?? latest;
  const forecast = useForecast(years, shown);
  const afterwards = useAfterwards(years, shown);
  const isPast = shown !== latest;

  if (!forecast.data) return <Status state={forecast} />;
  const { rows, base } = forecast.data;
  const flagged = rows.filter((r) => r.score >= 2);
  const list = compact ? flagged.slice(0, limit) : flagged;

  return (
    <div className="risk">
      {!compact && (
        <div className="risk-time">
          <div>
            <h3>¿Y si esta web hubiera existido antes?</h3>
            <p className="muted">
              Elige un año: la previsión se calcula solo con los datos que había hasta entonces, y debajo de cada
              servicio se ve qué pasó después.
            </p>
          </div>
          <YearPicker
            year={shown}
            years={years.filter((y) => y >= years[0] + 3)}
            onYearChange={(y) => setCutoff(y === latest ? null : y)}
            caption={isPast ? `Previsión hecha con los datos de ${base} a ${shown}.` : `Previsión con los datos de ${base} a ${shown}, los más recientes.`}
          />
        </div>
      )}

      {list.length === 0 ? (
        <p className="state">Con los datos hasta {shown}, ningún servicio acumula dos o más señales de alerta.</p>
      ) : (
        <ol className="risk-cards">
          {list.map((r) => (
            <RiskCard key={r.id} row={r} cutoff={shown} afterwards={isPast ? afterwards.data?.[r.id] ?? [] : null} />
          ))}
        </ol>
      )}

      {!compact && (
        <details className="risk-table-wrap">
          <summary>Ver las señales de los {rows.length} ámbitos y servicios</summary>
          <div className="table-wrap">
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Ámbito o servicio</th>
                  {SIGNAL_GROUPS.map((g) => (
                    <th key={g.key} className="center">
                      {g.label}
                    </th>
                  ))}
                  <th>Nivel</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.service ? 'is-service' : ''}>
                    <td>
                      <a href={`#/ambito/${r.id}`}>{r.name}</a>
                    </td>
                    {SIGNAL_GROUPS.map((g) => {
                      const pts = r.signals.filter((s) => s.group === g.key).reduce((s, x) => s + x.points, 0);
                      return (
                        <td key={g.key} className="center">
                          {pts > 0 ? (
                            <span className="risk-dot" title={`${pts} ${pts === 1 ? 'punto' : 'puntos'}`}>
                              {'●'.repeat(pts)}
                            </span>
                          ) : (
                            <span className="muted" aria-label="Sin señal">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="nowrap">
                      <Meter score={r.score} /> {r.level.label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <p className="risk-method">
        <strong>Cómo se calcula. </strong>
        Es una estimación orientativa del equipo, no una predicción oficial. Suma señales de alerta temprana de los
        últimos {WINDOW} años: avisos que se repiten, gastar bastante menos que la mediana de la UE (y alejarse),
        inversión que cae en % del PIB y pérdida de peso en el PIB. Los problemas de un servicio (averías, accidentes,
        esperas) suelen llegar después de años de estas señales. Dos puntos o más: «Vigilar»; cuatro o más: «Riesgo alto».
      </p>
    </div>
  );
}
