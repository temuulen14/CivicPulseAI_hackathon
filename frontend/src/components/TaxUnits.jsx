import { shareStep } from '../scale.js';

const euro = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });

// Reparte 100 casillas entre los ámbitos según su cuota, y que sumen exactamente 100:
// primero la parte entera de cada uno, y las que faltan a los que tienen mayor resto.
function hundredths(areas) {
  const total = areas.reduce((s, a) => s + a.share, 0) || 1;
  const rows = areas.map((a) => {
    const exact = (a.share / total) * 100;
    return { ...a, units: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let missing = 100 - rows.reduce((s, r) => s + r.units, 0);
  [...rows]
    .sort((r1, r2) => r2.rest - r1.rest)
    .forEach((r) => {
      if (missing > 0) {
        r.units += 1;
        missing -= 1;
      }
    });
  return rows;
}

// «De cada 100 € que pagas»: una casilla por euro, en una fila por ámbito.
// Se cuentan las casillas igual que monedas, sin tener que leer un eje.
export default function TaxUnits({ areas, total }) {
  const rows = hundredths(areas);
  return (
    <div className="units">
      <p className="muted">
        Cada casilla es 1 € de cada 100 € que pagas. En tu caso, cada casilla son unos {euro.format(total / 100)}{' '}€
        al año.
      </p>
      <ul className="units-list">
        {rows.map((r) => (
          <li key={r.id} className="units-row">
            <a href={`#/ambito/${r.id}`} className="units-name">
              {r.name}
            </a>
            <span className="units-cells" role="img" aria-label={`${r.units} de cada 100 euros`}>
              {Array.from({ length: r.units }, (_, i) => (
                <span key={i} style={{ background: shareStep(r.share).fill }} />
              ))}
            </span>
            <span className="units-value">{r.units}{' '}€</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
