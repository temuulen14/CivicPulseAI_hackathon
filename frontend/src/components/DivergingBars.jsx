// Barras divergentes desde un eje central: a la derecha (verde) lo que sube o queda por
// encima; a la izquierda (azul) lo que baja o queda por debajo. Dos tonos y el eje neutro,
// como pide la skill dataviz para datos con signo. Cada fila puede ser un enlace o un botón.
// Si todos los valores tienen el mismo signo, el eje se va a un lado y las barras usan todo el ancho.
export default function DivergingBars({ rows, format, labels = ['Menos', 'Más'], onSelect, hrefFor }) {
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.value ?? 0)));
  const hasNeg = rows.some((r) => r.value < 0);
  const hasPos = rows.some((r) => r.value > 0);
  const axis = hasNeg && hasPos ? 50 : hasNeg ? 100 : 0; // posición del eje, en %
  const room = hasNeg && hasPos ? 50 : 100; // ancho máximo de una barra, en %

  return (
    <div className="diverging" style={{ '--axis': `${axis}%` }}>
      <div className="div-axis-labels" aria-hidden="true">
        <span />
        <span className="div-axis-names">
          <span>{hasNeg && labels[0]}</span>
          <span>{hasPos && labels[1]}</span>
        </span>
        <span />
      </div>
      {rows.map((r) => {
        const width = max > 0 && r.value != null ? (Math.abs(r.value) / max) * room : 0;
        const inner = (
          <>
            <span className="div-label">{r.label}</span>
            <span className="div-track" aria-hidden="true">
              {r.value != null && (
                <span
                  className={`div-bar ${r.value >= 0 ? 'more' : 'less'}`}
                  style={r.value >= 0 ? { left: `${axis}%`, width: `${width}%` } : { right: `${100 - axis}%`, width: `${width}%` }}
                />
              )}
            </span>
            <span className="div-value">{format(r.value)}</span>
          </>
        );
        if (hrefFor) {
          return (
            <a key={r.key} className="div-row" href={hrefFor(r)}>
              {inner}
            </a>
          );
        }
        if (onSelect) {
          return (
            <button key={r.key} type="button" className="div-row" onClick={() => onSelect(r)} aria-pressed={r.active}>
              {inner}
            </button>
          );
        }
        return (
          <div key={r.key} className="div-row">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
