import { formatMeur, formatPct } from '../format.js';
import { shareStep } from '../scale.js';

// El "espectro" de la portada: los diez ámbitos en una sola barra, cada uno con el ancho
// de su cuota del total y el tono verde de la escala. Cada segmento enlaza a su ámbito.
// Los segmentos anchos llevan el nombre encima; todos aparecen en la lista de debajo.
export default function Spectrum({ areas }) {
  const sorted = [...areas].sort((a, b) => b.amount_meur - a.amount_meur);

  return (
    <figure className="spectrum-figure">
      <div className="spectrum-labels" aria-hidden="true">
        {sorted.map((a) => (
          <span key={a.id} style={{ flexGrow: a.share_of_total_pct ?? 0 }}>
            {a.share_of_total_pct >= 12 && (
              <>
                <strong>{formatPct(a.share_of_total_pct)}</strong> {a.name}
              </>
            )}
          </span>
        ))}
      </div>
      <div className="spectrum">
        {sorted.map((a) => (
          <a
            key={a.id}
            href={`#/ambito/${a.id}`}
            style={{ flexGrow: a.share_of_total_pct ?? 0, background: shareStep(a.share_of_total_pct).fill }}
            aria-label={`${a.name}: ${formatPct(a.share_of_total_pct)} del total, ${formatMeur(a.amount_meur)}`}
            title={`${a.name}: ${formatPct(a.share_of_total_pct)}`}
          />
        ))}
      </div>
      {/* La lista completa va plegada: la barra ya enseña el reparto y no hace falta leerlo todo de golpe. */}
      <figcaption>
        <details className="spectrum-more">
          <summary>Ver los diez ámbitos</summary>
          <ol className="spectrum-legend">
          {sorted.map((a) => (
            <li key={a.id}>
              <span className="swatch" style={{ background: shareStep(a.share_of_total_pct).fill }} aria-hidden="true" />
              <a href={`#/ambito/${a.id}`}>{a.name}</a>
              <span className="num">{formatPct(a.share_of_total_pct)}</span>
            </li>
          ))}
          </ol>
        </details>
      </figcaption>
    </figure>
  );
}
