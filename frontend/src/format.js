// Formato numérico español para toda la app.
// useGrouping 'always' fuerza el punto de miles también en números de 4 cifras (8.450).

const number = (digits) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: 0, useGrouping: 'always' });

const int = number(0);
const dec1 = number(1);
// Los porcentajes llevan siempre un decimal ("9,0 %", no "9 %"): en una columna quedan
// alineados y no parece que unos datos sean más precisos que otros.
const pct1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

// 84500 -> "84.500 M€"
export function formatMeur(value) {
  if (value === null || value === undefined) return 'Sin dato';
  return `${int.format(value)} M€`;
}

// 680225 -> "680 mil millones de €"; 8450 -> "8.450 millones de €"
// El espacio antes del € es de no separación: así el símbolo nunca queda solo en una línea.
export function formatMeurWords(value) {
  if (value === null || value === undefined) return 'Sin dato';
  if (value >= 1000) return `${int.format(value / 1000)} mil millones de\u00a0€`;
  return `${int.format(value)} millones de\u00a0€`;
}

// 12.4 -> "12,4 %"
export function formatPct(value) {
  if (value === null || value === undefined) return 'Sin dato';
  return `${pct1.format(value)} %`;
}

// -8.1 -> "−8,1 %"; 3 -> "+3,0 %"
export function formatChange(value) {
  if (value === null || value === undefined) return 'Sin dato';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${pct1.format(Math.abs(value))} %`;
}

export function formatNumber(value, unit) {
  if (value === null || value === undefined) return 'Sin dato';
  if (unit === '%') return formatPct(value);
  return `${dec1.format(value)}${unit ? ` ${unit}` : ''}`;
}

// Diferencia en puntos porcentuales: 0.34 -> "+0,3 p. p."
export function formatPoints(value) {
  if (value === null || value === undefined) return 'Sin dato';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${pct1.format(Math.abs(value))} p. p.`;
}

// Para ejes de gráficos: 680225 -> "680 mil"
export const compact = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });

// Los Presupuestos del Estado vienen en miles de euros (_keur), como el documento de Hacienda.
// Se enseñan en millones, igual que el resto de la app: 1599547.1 -> "1.600 M€"
// Por debajo del millón se dice en miles o en euros: una partida de 316.000 € no es "0 M€".
export function formatKeur(value) {
  if (value === null || value === undefined) return 'Sin dato';
  const size = Math.abs(value);
  if (size >= 1000 || size === 0) return formatMeur(value / 1000);
  if (size >= 1) return `${int.format(value)} mil\u00a0€`;
  return `${int.format(value * 1000)}\u00a0€`;
}

export function formatKeurWords(value) {
  if (value === null || value === undefined) return 'Sin dato';
  return formatMeurWords(value / 1000);
}
