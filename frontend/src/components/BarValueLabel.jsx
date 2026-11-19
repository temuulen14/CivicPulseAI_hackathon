import { formatPct } from '../format.js';

// Valor escrito al final de una barra horizontal.
// Recharts, por defecto, ajusta el texto al ancho de la barra y lo parte en dos líneas
// cuando la barra es corta ("4,6" / "%"); dibujarlo a mano lo evita.
export default function BarValueLabel({ x, y, width, height, value }) {
  return (
    <text x={x + width + 6} y={y + height / 2} dy={4} fill="var(--text-2)" fontSize={12}>
      {formatPct(value)}
    </text>
  );
}
