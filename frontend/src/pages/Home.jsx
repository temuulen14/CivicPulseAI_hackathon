import { getAlerts, getAreas } from '../api.js';
import { useApi } from '../useApi.js';
import { formatChange, formatMeur, formatMeurWords, formatPct } from '../format.js';
import Status from '../components/Status.jsx';
import YearSelect from '../components/YearSelect.jsx';
import AreaTreemap from '../components/AreaTreemap.jsx';
import Severity from '../components/Severity.jsx';

export default function Home({ year, years, onYearChange }) {
  const areas = useApi(() => getAreas(year), [year]);
  const alerts = useApi(() => getAlerts({ year }), [year]);

  if (!areas.data) return <Status state={areas} />;
  const { total_meur, provisional, areas: list } = areas.data;
  const ranking = [...list].sort((a, b) => b.amount_meur - a.amount_meur);
  const topAlerts = alerts.data?.alerts.slice(0, 3) ?? []; // el backend ya los ordena por severidad

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="section-head">
          <h1 id="hero-title">¿Adónde va el dinero público?</h1>
          <YearSelect year={year} years={years} onYearChange={onYearChange} />
        </div>
        <p className="muted">Gasto total de las administraciones públicas en {areas.data.year}</p>
        <div className="hero-row">
          <span className="hero-figure">{formatMeurWords(total_meur)}</span>
          {provisional && <span className="tag tag-provisional">Dato provisional</span>}
        </div>
        <p className="lead">
          {formatMeur(total_meur)} repartidos en diez grandes ámbitos. Pulsa uno para ver en qué se gasta,
          cómo ha evolucionado y en qué merece la pena fijarse.
        </p>
      </section>

      <section className="card section" aria-labelledby="map-title">
        <div className="section-head">
          <h2 id="map-title">Mapa del gasto</h2>
          <p className="muted">El tamaño de cada bloque es su importe. El círculo indica cuántos avisos tiene.</p>
        </div>
        <AreaTreemap areas={list} />
      </section>

      <section className="section" aria-labelledby="alerts-title">
        <div className="section-head">
          <h2 id="alerts-title">Avisos destacados</h2>
          <a href="#/avisos">Ver todos los avisos →</a>
        </div>
        {!alerts.data ? (
          <Status state={alerts} />
        ) : topAlerts.length === 0 ? (
          <p className="muted">No hay avisos para {areas.data.year}.</p>
        ) : (
          <div className="alert-strip">
            {topAlerts.map((al) => (
              <a key={al.id} href={`#/ambito/${al.area_id}`} className={`card alert-mini sev-border-${al.severity}`}>
                <Severity level={al.severity} />
                <h3>{al.title}</h3>
                <p className="muted">{al.message}</p>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="card section" aria-labelledby="ranking-title">
        <h2 id="ranking-title">Los diez ámbitos, de mayor a menor</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ámbito</th>
                <th className="num">Importe</th>
                <th className="num">% del total</th>
                <th className="num">% del PIB</th>
                <th className="num">Variación anual</th>
                <th>Avisos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((a) => (
                <tr key={a.id}>
                  <td>
                    <a href={`#/ambito/${a.id}`}>{a.name}</a>
                  </td>
                  <td className="num">{formatMeur(a.amount_meur)}</td>
                  <td className="num">{formatPct(a.share_of_total_pct)}</td>
                  <td className="num">{formatPct(a.pct_gdp)}</td>
                  <td className="num">{formatChange(a.yoy_change_pct)}</td>
                  <td>{a.alert_count > 0 ? <Severity level={a.max_severity} /> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
