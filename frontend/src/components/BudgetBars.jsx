import { compact, formatKeur } from '../format.js';
import { governmentLabel, partiesText } from '../governments.js';

// Evolución de los Presupuestos del Estado año a año. Cada columna es un botón: pulsarla
// elige ese año en toda la sección, así el gráfico hace también de selector de año.
// - Se usa la serie SIN Seguridad Social: es la única comparable entre años (las prórrogas no la traen).
// - Azul: la parte que son fondos europeos de recuperación. Verde: el resto.
// - Verde claro: año prorrogado (no hubo ley nueva). 2020 no tuvo documento propio: se
//   dibuja con la prórroga que seguía vigente (la de 2019), rayada para distinguirla.
export default function BudgetBars({ rows, year, onYearChange }) {
  const max = Math.max(0, ...rows.map((r) => r.value ?? 0));

  return (
    <div className="bbars-wrap">
      <div className="bbars" role="group" aria-label="Elegir año">
        {rows.map((r) => {
          const height = max > 0 && r.value != null ? (r.value / max) * 100 : 0;
          const euShare = r.value ? ((r.eu ?? 0) / r.value) * 100 : 0;
          const doc = r.carried ? `Prórroga (=${r.carried})` : r.document === 'Prorroga' ? 'Prórroga' : r.document === null ? 'Sin documento' : 'Ley';
          const text = `${r.year}: ${r.value != null ? formatKeur(r.value) : r.document == null ? 'sin documento' : 'sin dato'}${r.carried ? ` (sigue vigente la prórroga de ${r.carried})` : r.document === 'Prorroga' ? ' (prórroga)' : ''}${r.eu ? `, de ellos ${formatKeur(r.eu)} de fondos europeos` : ''}`;
          return (
            <button
              key={r.year}
              type="button"
              className={`bbar${r.document === 'Prorroga' ? ' is-extension' : ''}${r.carried ? ' is-carried' : ''}`}
              aria-pressed={r.year === year}
              aria-label={text}
              title={text}
              onClick={() => onYearChange(r.year)}
            >
              <span className="bbar-value" aria-hidden="true">
                {r.value != null ? compact.format(r.value / 1000) : ''}
              </span>
              <span className="bbar-plot" aria-hidden="true">
                {r.value == null ? (
                  <span className="bbar-empty" />
                ) : (
                  <span className="bbar-stack" style={{ height: `${height}%` }}>
                    {euShare > 0 && <span className="bbar-eu" style={{ height: `${euShare}%` }} />}
                    <span className="bbar-rest" />
                  </span>
                )}
              </span>
              <span className="bbar-year">{r.year}</span>
              <span className="bbar-doc">{doc}</span>
            </button>
          );
        })}
      </div>
      <div className="legend" aria-hidden="true">
        <span><span className="swatch" style={{ background: 'var(--forest)' }} /> Ley aprobada</span>
        <span><span className="swatch" style={{ background: 'var(--seq-1)' }} /> Prórroga del año anterior</span>
        <span><span className="swatch" style={{ background: 'var(--sky)' }} /> Fondos europeos de recuperación</span>
        <span>Cifras en millones de euros, sin Seguridad Social.</span>
      </div>
    </div>
  );
}

// Franja de Gobiernos alineada con las columnas de BudgetBars: cada tramo va de la fecha de
// inicio a la de fin de ese Gobierno. Tonos neutros alternos y sin colores de partido: es
// contexto para leer el gráfico, no una valoración. No se suma nada por Gobierno.
export function GovernmentBand({ years, governments }) {
  const from = Date.UTC(years[0], 0, 1);
  const to = Date.UTC(years[years.length - 1] + 1, 0, 1);
  const pos = (date) => ((Math.min(Math.max(date, from), to) - from) / (to - from)) * 100;

  const segments = governments
    .map((g) => {
      const start = pos(Date.parse(g.start));
      const end = pos(g.end ? Date.parse(g.end) : to);
      return { g, start, width: end - start };
    })
    .filter((s) => s.width > 0);

  return (
    <div className="gov-band">
      <span className="gov-band-title">Gobierno en cada momento</span>
      <div className="gov-band-track">
        {segments.map(({ g, start, width }, i) => (
          <span
            key={g.id}
            className={`gov-seg${i % 2 ? ' alt' : ''}`}
            style={{ left: `${start}%`, width: `${width}%` }}
            title={`${g.president} (${partiesText(g.parties)}), ${g.start} a ${g.end ?? 'hoy'}`}
          >
            {/* tramos estrechos: solo el apellido, para que no se corte a media palabra */}
            {width < 14 ? g.president.split(' ')[1] : governmentLabel(g)}
          </span>
        ))}
      </div>
    </div>
  );
}
