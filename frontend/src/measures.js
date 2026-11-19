import { formatChange, formatMeur, formatPct, formatPoints } from './format.js';

// Las dos medidas que se pueden elegir en la portada y en cada ámbito.
// - Importe: millones de euros. La variación es relativa (+3,2 %).
// - % del PIB: quita el efecto del tamaño de la economía. La variación va en puntos (+0,3 p. p.).
// `get` sirve igual para un ámbito de /areas que para un año de `history`.
export const MEASURES = {
  amount: {
    label: 'Importe',
    unit: 'millones de euros',
    get: (x) => x?.amount_meur ?? null,
    format: formatMeur,
    change: (now, before) => (now == null || !before ? null : ((now - before) / before) * 100),
    formatChange,
  },
  gdp: {
    label: '% del PIB',
    unit: '% del PIB',
    get: (x) => x?.pct_gdp ?? null,
    format: formatPct,
    change: (now, before) => (now == null || before == null ? null : now - before),
    formatChange: formatPoints,
  },
};

export const MEASURE_OPTIONS = Object.entries(MEASURES).map(([value, m]) => ({ value, label: m.label }));

// Total de un año (respuesta de /areas) en la medida elegida.
export function totalOf(areasResponse, measure) {
  if (!areasResponse) return null;
  if (measure === 'amount') return areasResponse.total_meur;
  return areasResponse.areas.reduce((sum, a) => sum + (a.pct_gdp ?? 0), 0);
}

// Etiquetas cortas para el interruptor de la cabecera.
export const MEASURE_SWITCH = [
  { value: 'amount', label: 'Euros' },
  { value: 'gdp', label: '% del PIB' },
];
