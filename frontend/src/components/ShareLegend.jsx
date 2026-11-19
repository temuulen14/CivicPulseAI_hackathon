import { SHARE_STEPS } from '../scale.js';

// Leyenda de la escala verde: qué cuota del gasto total significa cada tono.
export default function ShareLegend() {
  return (
    <div className="share-legend">
      <span>Cuota del gasto total:</span>
      {[...SHARE_STEPS].reverse().map((s) => (
        <span key={s.label} className="share-legend-item">
          <span className="swatch" style={{ background: s.fill }} aria-hidden="true" />
          {s.label}
        </span>
      ))}
    </div>
  );
}
