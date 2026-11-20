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

// Puntos de un servicio en un grupo de señales (avisos, Europa, inversión, peso en el PIB).
const pointsIn = (row, group) => row.signals.filter((s) => s.group === group).reduce((sum, s) => sum + s.points, 0);

// Tarjeta de un servicio: nivel, las cuatro señales como casillas (encendidas o no)
// y, plegadas, las frases con las cifras que las justifican.
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
      <div className="risk-card-body">
        <ul className="risk-signals">
          {SIGNAL_GROUPS.map((g) => {
            const pts = pointsIn(row, g.key);
            return (
              <li key={g.key} className={pts > 0 ? 'on' : ''}>
                <span className="risk-signal-points" aria-hidden="true">
                  {pts > 0 ? '●'.repeat(pts) : '○'}
                </span>
                {g.label}
                <span className="visually-hidden">{pts > 0 ? `: ${pts} ${pts === 1 ? 'punto' : 'puntos'}` : ': sin señal'}</span>
              </li>
            );
          })}
        </ul>
        <details className="risk-details">
          <summary>Ver las cifras</summary>
          <ul className="risk-reasons">
            {row.signals.map((s, i) => (
              <li key={i}>{s.text}</li>
            ))}
          </ul>
        </details>
        {afterwards && (
          <p className="risk-after">
            {afterwards.length
              ? `Qué pasó después: la web le dio avisos en ${afterwards.join(', ')}.`
              : `Después de ${cutoff}, la web no le dio avisos (solo mira cifras de gasto, no incidentes).`}
          </p>
        )}
      </div>
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
          <h3>¿Y si esta web hubiera existido antes?</h3>
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
        <ol className={`risk-cards${compact ? '' : ' wide'}`}>
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
                      const pts = pointsIn(r, g.key);
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

      <details className="risk-method">
        <summary>Estimación orientativa del equipo, no una predicción oficial. Cómo se calcula</summary>
        Suma señales de alerta temprana de los
        últimos {WINDOW} años: avisos que se repiten, gastar bastante menos que la mediana de la UE (y alejarse),
        inversión que cae en % del PIB y pérdida de peso en el PIB. Los problemas de un servicio (averías, accidentes,
        esperas) suelen llegar después de años de estas señales. Dos puntos o más: «Vigilar»; cuatro o más: «Riesgo alto».
      </details>
    </div>
  );
}
