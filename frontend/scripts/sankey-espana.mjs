// Genera public/presupuesto-2023-flujo.svg: un diagrama de flujo (Sankey) de los
// Presupuestos Generales del Estado de 2023, al estilo de googleexample.png.
//
// Uso (con el backend arrancado):  node scripts/sankey-espana.mjs
// Otra URL:                         API=http://host/api node scripts/sankey-espana.mjs
//
// Cifras: GET /budget?year=2023 (Hacienda, SEPG). 2023 es el último año con Ley aprobada
// (Ley 31/2022) y el último que incluye la Seguridad Social. No se inventa nada: las áreas
// son la agrupación oficial de los PGE por el primer dígito de la política de gasto.
import { writeFileSync } from 'node:fs';

const API = process.env.API || 'http://localhost:8000/api';
const YEAR = 2023;
const bn = (keur) => keur / 1e6; // miles de euros -> miles de millones

// Áreas oficiales de gasto de los PGE (primer dígito del código de política).
const AREAS = [
  { digit: '2', name: 'Protección y promoción social', color: '#12805c' },
  { digit: '9', name: 'Actuaciones de carácter general', color: '#3b72c9' },
  { digit: '4', name: 'Actuaciones de carácter económico', color: '#d98a1c' },
  { digit: '1', name: 'Servicios públicos básicos', color: '#b83a2e' },
  { digit: '3', name: 'Sanidad, educación y cultura', color: '#7a56b8' },
];
// Nombres cortos para que quepan en una línea (el oficial va en el título del SVG).
const SHORT = {
  22: 'Otras prestaciones económicas',
  94: 'Transferencias a otras AA. PP.',
  92: 'Servicios de carácter general',
  46: 'I+D+i y digitalización',
  13: 'Seguridad ciudadana y prisiones',
};
const MIN_SHOWN_BN = 5; // las políticas menores se agrupan en "Resto" (salvo en el área 3)

const fmt = (v) => `${v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil M€`;
const pct = (v, total) => `${Math.round((v / total) * 100)} % del total`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const budget = await (await fetch(`${API}/budget?year=${YEAR}`)).json();
const total = bn(budget.total_keur);
const state = bn(budget.total_without_social_security_keur);
const eu = bn(budget.eu_recovery_keur);

// ---- Datos: áreas con sus políticas ----
const areas = AREAS.map((a) => {
  const policies = budget.policies
    .filter((p) => p.id.startsWith(a.digit))
    .map((p) => ({ name: SHORT[p.id] || p.name, value: bn(p.total_keur) }))
    .sort((x, y) => y.value - x.value);
  const keepAll = a.digit === '3';
  const shown = policies.filter((p, i) => keepAll || i < 3 && p.value >= MIN_SHOWN_BN);
  const rest = policies.filter((p) => !shown.includes(p));
  if (rest.length) shown.push({ name: `Resto (${rest.length} políticas)`, value: rest.reduce((s, p) => s + p.value, 0) });
  return { ...a, value: policies.reduce((s, p) => s + p.value, 0), policies: shown };
});

// ---- Geometría ----
const W = 1600;
const K = 1.08; // píxeles por mil millones
const NODE_W = 22;
const X = [270, 570, 880, 1160]; // columnas
const TOP = 215;
const h = (v) => Math.max(v * K, 3);

// Columna 3 (políticas): cada una ocupa al menos una línea de texto.
let y3 = 0;
const col3 = [];
for (const a of areas) {
  for (const p of a.policies) {
    const slot = Math.max(h(p.value), 22);
    col3.push({ ...p, area: a, y: y3 + (slot - h(p.value)) / 2, h: h(p.value) });
    y3 += slot + 9;
  }
  y3 += 20;
}
const col3Height = y3 - 29;

// Columna 2 (áreas): etiqueta de tres líneas encima de cada nodo.
const LABEL2 = 74;
const col2Raw = [];
let y2 = 0;
for (const a of areas) {
  y2 += LABEL2;
  col2Raw.push({ ...a, y: y2, h: h(a.value) });
  y2 += h(a.value) + 22;
}
const col2Height = y2 - 22;

const plotH = Math.max(col2Height, col3Height);
const col2Off = TOP + (plotH - col2Height) / 2;
const col3Off = TOP + (plotH - col3Height) / 2;
col2Raw.forEach((n) => (n.y += col2Off));
col3.forEach((n) => (n.y += col3Off));

const totalNode = { y: TOP + (plotH - h(total)) / 2, h: h(total) };
const sources = [
  { name: 'Estado', value: state, color: '#5b8fd9' },
  { name: 'Seguridad Social', value: total - state, color: '#2f9e78' },
];
let ys = totalNode.y - 70;
for (const s of sources) {
  s.y = ys;
  s.h = h(s.value);
  ys += s.h + 140;
}

// ---- Dibujo ----
const out = [];
const defs = [];
let gid = 0;
// Cinta entre dos nodos: desde (x0, a0..a1) hasta (x1, b0..b1), con degradado de color.
function ribbon(x0, a0, x1, b0, thick, c0, c1) {
  const id = `g${gid++}`;
  defs.push(`<linearGradient id="${id}" x1="${x0}" x2="${x1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`);
  const m = (x0 + x1) / 2;
  const d = `M${x0},${a0} C${m},${a0} ${m},${b0} ${x1},${b0} L${x1},${b0 + thick} C${m},${b0 + thick} ${m},${a0 + thick} ${x0},${a0 + thick} Z`;
  out.push(`<path d="${d}" fill="url(#${id})" opacity="0.45"/>`);
}
const rect = (x, y, hh, color) => out.push(`<rect x="${x}" y="${y.toFixed(1)}" width="${NODE_W}" height="${hh.toFixed(1)}" fill="${color}"/>`);
const text = (x, y, s, { size = 22, weight = 400, color = '#191b18', anchor = 'start', family = 'sans' } = {}) =>
  out.push(`<text x="${x}" y="${y.toFixed(1)}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" font-family="${family === 'serif' ? "Newsreader, Georgia, 'Times New Roman', serif" : "Geist, 'Helvetica Neue', Arial, sans-serif"}">${esc(s)}</text>`);

const TOTAL_COLOR = '#191b18';

// Fuentes -> total
let inY = totalNode.y;
for (const s of sources) {
  ribbon(X[0] + NODE_W, s.y, X[1], inY, s.h, s.color, '#8a8f87');
  inY += s.h;
}
// Total -> áreas
let outY = totalNode.y;
for (const a of col2Raw) {
  ribbon(X[1] + NODE_W, outY, X[2], a.y, a.h, '#8a8f87', a.color);
  outY += a.h;
}
// Áreas -> políticas
for (const a of col2Raw) {
  let off = a.y;
  for (const p of col3.filter((p) => p.area.digit === a.digit)) {
    ribbon(X[2] + NODE_W, off, X[3], p.y, p.h, a.color, a.color);
    off += p.h;
  }
}

// Nodos y etiquetas
for (const s of sources) {
  rect(X[0], s.y, s.h, s.color);
  const cy = s.y + s.h / 2;
  text(X[0] - 14, cy - 6, s.name, { size: 26, weight: 700, color: s.color, anchor: 'end' });
  text(X[0] - 14, cy + 24, fmt(s.value), { size: 22, anchor: 'end' });
}
rect(X[1], totalNode.y, totalNode.h, TOTAL_COLOR);
text(X[1] + NODE_W / 2, totalNode.y - 46, 'Presupuesto total', { size: 26, weight: 700, anchor: 'middle' });
text(X[1] + NODE_W / 2, totalNode.y - 16, fmt(total), { size: 24, anchor: 'middle' });
text(X[1] + NODE_W / 2, totalNode.y + totalNode.h + 26, `de ellos, ${fmt(eu)}`, { size: 15, color: '#575b55', anchor: 'middle' });
text(X[1] + NODE_W / 2, totalNode.y + totalNode.h + 45, 'de fondos europeos de recuperación', { size: 15, color: '#575b55', anchor: 'middle' });

for (const a of col2Raw) {
  rect(X[2], a.y, a.h, a.color);
  const words = a.name.split(' ');
  const mid = Math.ceil(words.length / 2);
  text(X[2] + NODE_W / 2, a.y - 52, words.slice(0, mid).join(' '), { size: 19, weight: 700, color: a.color, anchor: 'middle' });
  text(X[2] + NODE_W / 2, a.y - 30, words.slice(mid).join(' '), { size: 19, weight: 700, color: a.color, anchor: 'middle' });
  text(X[2] + NODE_W / 2, a.y - 8, `${fmt(a.value)} · ${pct(a.value, total)}`, { size: 16, anchor: 'middle' });
}
for (const p of col3) {
  rect(X[3], p.y, p.h, p.area.color);
  const cy = p.y + p.h / 2 + 6;
  text(X[3] + NODE_W + 12, cy, p.name, { size: 18, weight: 700, color: p.area.color });
  out.push(out.pop().replace('</text>', `<tspan font-weight="400" fill="#191b18">  ${fmt(p.value)}</tspan></text>`));
}

// Cabecera y pie
const H = Math.round(TOP + plotH + 110);
text(W / 2, 100, '¿A dónde va el dinero del Estado?', { size: 76, weight: 600, color: '#0f4e37', anchor: 'middle', family: 'serif' });
text(W / 2, 148, `Presupuestos Generales del Estado ${YEAR}, Estado y Seguridad Social`, { size: 24, color: '#575b55', anchor: 'middle' });
text(40, H - 40, `Fuente: Ley 31/2022 de PGE para ${YEAR} (BOE-A-2022-22128) · Ministerio de Hacienda, SEPG`, { size: 17, weight: 600 });
text(W - 40, H - 40, 'CuentasClaras', { size: 22, weight: 600, color: '#12805c', anchor: 'end', family: 'serif' });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">¿A dónde va el dinero del Estado? Presupuestos Generales del Estado ${YEAR}</title>
<desc id="d">Diagrama de flujo: ${fmt(total)} en total (${fmt(state)} del Estado y ${fmt(total - state)} de la Seguridad Social), repartidos en cinco áreas de gasto. La mayor es Protección y promoción social, con ${fmt(areas[0].value)}, de los que ${fmt(areas[0].policies[0].value)} son pensiones. Fuente: Ley 31/2022 de PGE para ${YEAR}, Ministerio de Hacienda.</desc>
<defs>${defs.join('')}</defs>
<rect width="${W}" height="${H}" fill="#ffffff"/>
${out.join('\n')}
</svg>
`;
writeFileSync(new URL('../public/presupuesto-2023-flujo.svg', import.meta.url), svg);
console.log(`OK · total ${fmt(total)} · áreas`, areas.map((a) => `${a.name} ${fmt(a.value)}`).join(' | '));
