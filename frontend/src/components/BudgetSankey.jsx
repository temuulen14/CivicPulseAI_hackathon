import { useHighlight } from '../useHighlight.js';
import { formatKeur, formatPct } from '../format.js';

// Diagrama de flujo (Sankey) interactivo del presupuesto del año elegido:
// quién lo pone (Estado y Seguridad Social) → total → áreas de gasto → políticas.
// SVG hecho a mano, como TaxSankey: cada nodo es un rectángulo y cada flujo una cinta cuyo
// grosor es proporcional a los euros. Al pasar el ratón (o el foco) por un nodo o una cinta
// se resalta su camino y se enseña su cifra; cada política es un enlace a sus programas.

// Áreas oficiales de gasto de los PGE: el primer dígito del código de la política.
const AREAS = [
  { digit: '2', name: 'Protección y promoción social', color: 'var(--forest)' },
  { digit: '9', name: 'Actuaciones de carácter general', color: 'var(--sky)' },
  { digit: '4', name: 'Actuaciones de carácter económico', color: 'var(--flow-amber)' },
  { digit: '1', name: 'Servicios públicos básicos', color: 'var(--flow-red)' },
  { digit: '3', name: 'Sanidad, educación y cultura', color: 'var(--flow-violet)' },
];
// Nombres cortos para que la etiqueta quepa en una línea (el oficial sale en el detalle).
const SHORT = {
  13: 'Seguridad ciudadana y prisiones',
  14: 'Política exterior y cooperación',
  26: 'Vivienda y edificación',
  28: 'Gestión de trabajo y economía social',
  29: 'Gestión de la Seguridad Social',
  46: 'I+D+i y digitalización',
  94: 'Transferencias a otras AA. PP.',
};

const W = 1180;
const NODE_W = 16;
const X = [130, 310, 520, 730]; // columnas: origen, total, áreas, políticas
const TOP = 20;
const FLOW_H = 440; // altura que ocupa el presupuesto completo
const ROW = 22; // alto mínimo de la fila de una política (su etiqueta)
const ROW_GAP = 6;
const AREA_LABEL = 46; // hueco encima de cada área para su nombre y su cifra
const AREA_GAP = 16;

function ribbonPath(x0, y0, x1, y1, thick) {
  const m = (x0 + x1) / 2;
  return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1} L${x1},${y1 + thick} C${m},${y1 + thick} ${m},${y0 + thick} ${x0},${y0 + thick} Z`;
}

// Reparte el alto sobrante para que una columna quede centrada respecto a la más alta.
const centre = (nodes, height, plotH) => nodes.forEach((n) => (n.y += TOP + (plotH - height) / 2));

export default function BudgetSankey({ budget, withSS }) {
  const { active, show, hideSoon, hover } = useHighlight(); // active: p. ej. 'pol:21'

  const valueOf = (p) => (withSS ? p.total_keur : p.total_without_social_security_keur) ?? 0;
  const total = withSS ? budget.total_keur : budget.total_without_social_security_keur;
  const h = (v) => Math.max((v / total) * FLOW_H, 1.5);

  // ---- Datos: áreas (de mayor a menor) con sus políticas (de mayor a menor) ----
  const areas = AREAS.map((a) => {
    const policies = budget.policies
      .filter((p) => p.id.startsWith(a.digit) && valueOf(p) > 0)
      .map((p) => ({ ...p, key: `pol:${p.id}`, value: valueOf(p), areaKey: `area:${a.digit}`, color: a.color }))
      .sort((p1, p2) => p2.value - p1.value);
    return { ...a, key: `area:${a.digit}`, policies, value: policies.reduce((s, p) => s + p.value, 0) };
  })
    .filter((a) => a.value > 0)
    .sort((a1, a2) => a2.value - a1.value);
  const policies = areas.flatMap((a) => a.policies);

  const state = budget.total_without_social_security_keur;
  const sources = [{ key: 'src:state', name: 'Estado', value: state, color: 'var(--sky)' }];
  if (withSS) sources.push({ key: 'src:ss', name: 'Seguridad Social', value: total - state, color: 'var(--forest)' });

  // ---- Geometría: cada columna se apila de arriba abajo y luego se centra ----
  let y = 0;
  for (const a of areas) {
    for (const p of a.policies) {
      const row = Math.max(h(p.value), ROW);
      Object.assign(p, { rowY: y, rowH: row, y: y + (row - h(p.value)) / 2, h: h(p.value) });
      y += row + ROW_GAP;
    }
    y += AREA_GAP;
  }
  const policiesH = y - ROW_GAP - AREA_GAP;

  y = 0;
  for (const a of areas) {
    y += AREA_LABEL;
    Object.assign(a, { y, h: h(a.value) });
    y += a.h + AREA_GAP;
  }
  const areasH = y - AREA_GAP;

  const plotH = Math.max(policiesH, areasH);
  centre(policies, policiesH, plotH);
  policies.forEach((p) => (p.rowY += TOP + (plotH - policiesH) / 2));
  centre(areas, areasH, plotH);
  const totalNode = { y: TOP + (plotH - FLOW_H) / 2, h: FLOW_H };
  const SRC_GAP = 60;
  y = totalNode.y - (SRC_GAP * (sources.length - 1)) / 2;
  for (const s of sources) {
    Object.assign(s, { y, h: h(s.value) });
    y += s.h + SRC_GAP;
  }
  const height = Math.ceil(TOP + plotH + 20);

  // ---- Cintas. `keys` son los nodos que la encienden; `target`, el que resalta al tocarla ----
  const ribbons = [];
  let off = totalNode.y;
  for (const s of sources) {
    ribbons.push({ thick: s.h, d: ribbonPath(X[0] + NODE_W, s.y, X[1], off, s.h), color: s.color, target: s.key, keys: [s.key] });
    off += s.h;
  }
  off = totalNode.y;
  for (const a of areas) {
    const keys = [a.key, ...a.policies.map((p) => p.key)];
    ribbons.push({ thick: a.h, d: ribbonPath(X[1] + NODE_W, off, X[2], a.y, a.h), color: a.color, target: a.key, keys });
    off += a.h;
    let out = a.y;
    for (const p of a.policies) {
      ribbons.push({ thick: p.h, d: ribbonPath(X[2] + NODE_W, out, X[3], p.y, p.h), color: a.color, target: p.key, keys: [a.key, p.key] });
      out += p.h;
    }
  }

  // Las finas se dibujan las últimas (encima): así su borde invisible, que las hace más
  // fáciles de acertar con el ratón, no queda tapado por una cinta gruesa vecina.
  ribbons.sort((r1, r2) => r2.thick - r1.thick);

  // Un elemento está «encendido» si no hay nada resaltado, si se resalta el total o si le toca.
  const lit = (keys) => !active || active === 'total' || keys.includes(active);
  const dim = (keys) => (lit(keys) ? undefined : 'is-dim');

  const share = (v) => `${formatPct((v / total) * 100)} del total`;
  const details = {
    total: { name: 'Presupuesto total', text: `${formatKeur(total)}${budget.eu_recovery_keur > 0 ? ` · ${formatKeur(budget.eu_recovery_keur)} son fondos europeos de recuperación` : ''}` },
  };
  for (const s of sources) details[s.key] = { name: s.name, text: `${formatKeur(s.value)} · ${share(s.value)}` };
  for (const a of areas) details[a.key] = { name: a.name, text: `${formatKeur(a.value)} · ${share(a.value)} · ${a.policies.length} políticas de gasto` };
  for (const p of policies) {
    const eu = p.eu_recovery_keur > 0 ? ` · ${formatKeur(p.eu_recovery_keur)} de fondos europeos` : '';
    details[p.key] = { name: p.name, text: `${formatKeur(p.value)} · ${share(p.value)}${eu} · pulsa para ver sus programas` };
  }
  const detail = details[active];

  return (
    <div className="flow">
      <p className="flow-detail">
        {detail ? (
          <>
            <strong>{detail.name}</strong> {detail.text}
          </>
        ) : (
          <span className="muted">Pasa el ratón por una franja para ver su cifra. Pulsa una política para abrir sus programas.</span>
        )}
      </p>
      <div className="sankey-scroll">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="sankey flow-svg"
          role="group"
          aria-label={`Diagrama de flujo del presupuesto de ${budget.year}: ${formatKeur(total)} repartidos en ${areas.length} áreas y ${policies.length} políticas de gasto. La lista de abajo tiene las mismas cifras.`}
          onMouseLeave={() => show(null)}
        >
          {/* fondo invisible: en un hueco vacío el resaltado se apaga, pero no al instante */}
          <rect className="flow-bg" width={W} height={height} fill="transparent" onMouseEnter={hideSoon} />
          {ribbons.map((r, i) => (
            <path
              key={i}
              d={r.d}
              fill={r.color}
              stroke="transparent"
              strokeWidth="10"
              className={`flow-ribbon ${active && lit(r.keys) ? 'is-lit' : ''} ${dim(r.keys) ?? ''}`}
              onMouseEnter={() => show(r.target)}
            />
          ))}

          {sources.map((s) => (
            <g key={s.key} className={dim([s.key])} tabIndex="0" {...hover(s.key)}>
              <rect x={X[0]} y={s.y} width={NODE_W} height={s.h} fill={s.color} />
              <text x={X[0] - 10} y={s.y + s.h / 2 - 4} textAnchor="end" className="sankey-label">
                <tspan fontWeight="700" fill="var(--ink)">{s.name}</tspan>
                <tspan x={X[0] - 10} dy="1.25em" className="sankey-value">{formatKeur(s.value)}</tspan>
              </text>
            </g>
          ))}

          <g tabIndex="0" {...hover('total')}>
            <rect x={X[1]} y={totalNode.y} width={NODE_W} height={totalNode.h} fill="var(--ink)" />
            <text x={X[1] + NODE_W / 2} y={totalNode.y - 28} textAnchor="middle" className="sankey-label">
              <tspan fontWeight="700" fill="var(--ink)">Total {budget.year}</tspan>
              <tspan x={X[1] + NODE_W / 2} dy="1.25em" className="sankey-value">{formatKeur(total)}</tspan>
            </text>
          </g>

          {areas.map((a) => (
            <g key={a.key} className={dim([a.key, ...a.policies.map((p) => p.key)])} tabIndex="0" {...hover(a.key)}>
              <rect x={X[2]} y={a.y} width={NODE_W} height={a.h} fill={a.color} />
              <text x={X[2] + NODE_W / 2} y={a.y - 26} textAnchor="middle" className="sankey-label">
                <tspan fontWeight="700" fill="var(--ink)">{a.name}</tspan>
                <tspan x={X[2] + NODE_W / 2} dy="1.25em" className="sankey-value">
                  {formatKeur(a.value)} · {formatPct((a.value / total) * 100)}
                </tspan>
              </text>
            </g>
          ))}

          {policies.map((p) => (
            <a key={p.key} href={`#/presupuestos/politica/${p.id}`} className={dim([p.key, p.areaKey])} {...hover(p.key)}>
              {/* rectángulo invisible: toda la fila es pulsable, no solo el texto. Incluye el hueco
                  hasta la fila siguiente para que el resaltado no parpadee al bajar por la lista */}
              <rect x={X[3]} y={p.rowY - ROW_GAP / 2} width={W - X[3]} height={p.rowH + ROW_GAP} fill="transparent" />
              <rect x={X[3]} y={p.y} width={NODE_W} height={p.h} fill={p.color} />
              <text x={X[3] + NODE_W + 10} y={p.rowY + p.rowH / 2 + 5} className="sankey-label">
                <tspan fontWeight="600" fill="var(--ink)">{SHORT[p.id] ?? p.name}</tspan>
                <tspan dx="10" className="sankey-value">{formatKeur(p.value)}</tspan>
              </text>
            </a>
          ))}
        </svg>
      </div>
    </div>
  );
}
