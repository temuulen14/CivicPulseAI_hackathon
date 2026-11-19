// Línea mínima en SVG para enseñar la tendencia dentro de una tabla o una tarjeta.
// Es decorativa (aria-hidden): la cifra exacta siempre está escrita al lado.
// Los huecos (null) cortan la línea en vez de inventar un valor.
export default function Sparkline({ values, width = 112, height = 32, className = '' }) {
  const nums = values.filter((v) => v != null);
  if (nums.length < 2) return <span className="muted">—</span>;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const pad = 3;
  const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v) => (max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - pad * 2));

  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  const lastIndex = values.findLastIndex((v) => v != null);

  return (
    <svg
      className={`sparkline ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke="var(--forest)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={x(lastIndex)} cy={y(values[lastIndex])} r="2.5" fill="var(--forest)" />
    </svg>
  );
}
