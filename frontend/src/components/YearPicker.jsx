// Selector de año: una fila 2015–2024 donde cada año lleva una barrita con su valor
// (gasto total, avisos, gasto del ámbito…), así se ve la tendencia antes de pulsar.
// Las barras empiezan en cero para no exagerar las diferencias.
export default function YearPicker({ year, years, onYearChange, values = {}, format = String, caption }) {
  if (!years.length) return null;
  const max = Math.max(0, ...years.map((y) => values[y] ?? 0));

  return (
    <div className="year-picker">
      <div className="years" role="group" aria-label="Elegir año">
        {years.map((y) => {
          const v = values[y];
          const height = v != null && max > 0 ? Math.max(6, (v / max) * 100) : 0;
          const text = v != null ? `${y}: ${format(v)}` : `${y}: sin dato`;
          return (
            <button
              key={y}
              type="button"
              className="year"
              aria-pressed={y === year}
              aria-label={text}
              title={text}
              onClick={() => onYearChange(y)}
            >
              <span className="year-bar" aria-hidden="true">
                <span style={{ height: `${height}%` }} />
              </span>
              <span className="year-label">{y}</span>
            </button>
          );
        })}
      </div>
      {caption && <p className="year-caption">{caption}</p>}
    </div>
  );
}
