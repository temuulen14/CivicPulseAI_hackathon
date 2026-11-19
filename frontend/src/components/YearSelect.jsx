// Selector de año compartido por las páginas. El año elegido vive en App.jsx.
export default function YearSelect({ year, years, onYearChange }) {
  if (!years.length) return null;
  return (
    <label className="field">
      <span>Año</span>
      <select value={year ?? ''} onChange={(e) => onYearChange(Number(e.target.value))}>
        {[...years].reverse().map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
