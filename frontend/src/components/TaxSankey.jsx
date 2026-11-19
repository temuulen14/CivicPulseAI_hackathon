import { shareStep } from '../scale.js';

// Diagrama de flujo (Sankey) de un sueldo, al estilo de googleexample.png:
// sueldo bruto → neto, IRPF y cotización → lo que te queda e IVA → tus impuestos → ámbitos.
// SVG hecho a mano: cada nodo es un rectángulo y cada flujo una cinta con curvas de Bézier
// cuyo grosor es proporcional a los euros. No hace falta ninguna librería.

const W = 1180;
const NODE_W = 16;
const X = [150, 400, 630, 770, 880]; // posición de las cinco columnas
const TOP = 40;
const FLOW_H = 480; // altura que ocupa el sueldo completo
const GAP = 18; // hueco entre nodos de una misma columna
const AREA_GAP = 6;
const LABEL_LINE = 34; // alto mínimo de cada etiqueta de ámbito (nombre + cifra)

const COLORS = {
  gross: 'var(--sky)',
  employer: 'var(--sky-2)',
  net: 'var(--graphite)',
  left: 'var(--muted)',
  tax: 'var(--forest)',
  total: 'var(--seq-5)',
};

const euro = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });
const eur = (v) => `${euro.format(v)}\u00a0€`;

function Ribbon({ x0, y0, x1, y1, thick, from, to, id }) {
  const m = (x0 + x1) / 2;
  const d = `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1} L${x1},${y1 + thick} C${m},${y1 + thick} ${m},${y0 + thick} ${x0},${y0 + thick} Z`;
  return (
    <>
      <linearGradient id={id} x1={x0} x2={x1} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
      <path d={d} fill={`url(#${id})`} opacity="0.4" />
    </>
  );
}

// Etiqueta de dos líneas: nombre en negrita del color del nodo y cifra debajo.
// El borde blanco (paint-order) la hace legible aunque pase por encima de una cinta.
function Label({ x, y, name, value, color, anchor = 'start', note }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="sankey-label">
      <tspan fill={color} fontWeight="700">
        {name}
      </tspan>
      <tspan x={x} dy="1.25em" className="sankey-value">
        {value}
      </tspan>
      {note && (
        <tspan x={x} dy="1.3em" className="sankey-note">
          {note}
        </tspan>
      )}
    </text>
  );
}

export default function TaxSankey({ result, areas }) {
  const k = FLOW_H / (result.gross + result.ssEmployer); // píxeles por euro
  const h = (v) => v * k;

  // --- Columnas 0 a 2: de dónde sale el dinero y en qué se divide ---
  const gross = { y: TOP, h: h(result.gross) };
  const employer = { y: gross.y + gross.h + GAP, h: h(result.ssEmployer) };
  const net = { y: TOP, h: h(result.net) };
  const irpf = { y: net.y + net.h + GAP, h: h(result.irpf) };
  const ss = { y: irpf.y + irpf.h + GAP, h: h(result.ssWorker) };
  const ssEmp = { y: ss.y + ss.h + GAP, h: h(result.ssEmployer) };
  const left = { y: TOP, h: h(result.left) };
  const vat = { y: left.y + left.h + GAP, h: h(result.vat) };

  // --- Columna 3: tus impuestos, a la altura media de lo que le llega ---
  const into = [vat, irpf, ss, ssEmp];
  const mid = into.reduce((s, n) => s + (n.y + n.h / 2) * n.h, 0) / Math.max(1, into.reduce((s, n) => s + n.h, 0));
  const total = { h: h(result.total) };
  total.y = Math.max(vat.y + 40, mid - total.h / 2);

  // --- Columna 4: ámbitos. Cada uno ocupa al menos el alto de su etiqueta (nombre + cifra),
  // así el nodo queda siempre junto a su texto y las cintas se abren en abanico, como en el ejemplo.
  const slot = (a) => Math.max(h(a.amount), LABEL_LINE);
  const stackH = areas.reduce((s, a) => s + slot(a) + AREA_GAP, -AREA_GAP);
  let y = Math.max(TOP, total.y + total.h / 2 - stackH / 2);
  const areaNodes = areas.map((a) => {
    const node = { ...a, y: y + (slot(a) - h(a.amount)) / 2, h: h(a.amount), color: shareStep(a.share).fill };
    y += slot(a) + AREA_GAP;
    return node;
  });
  const lastLabel = y;
  const height = Math.ceil(Math.max(lastLabel + 20, ssEmp.y + ssEmp.h + 70, total.y + total.h + 90));

  // --- Cintas: cada nodo va gastando su altura de arriba abajo ---
  const ribbons = [];
  const link = (a, aOff, b, bOff, value, colA, colB, from, to) => {
    ribbons.push({ x0: X[colA] + NODE_W, y0: a.y + aOff, x1: X[colB], y1: b.y + bOff, thick: h(value), from, to });
  };
  link(gross, 0, net, 0, result.net, 0, 1, COLORS.gross, COLORS.net);
  link(gross, net.h, irpf, 0, result.irpf, 0, 1, COLORS.gross, COLORS.tax);
  link(gross, net.h + irpf.h, ss, 0, result.ssWorker, 0, 1, COLORS.gross, COLORS.tax);
  if (result.ssEmployer > 0) link(employer, 0, ssEmp, 0, result.ssEmployer, 0, 1, COLORS.employer, COLORS.tax);
  link(net, 0, left, 0, result.left, 1, 2, COLORS.net, COLORS.left);
  link(net, left.h, vat, 0, result.vat, 1, 2, COLORS.net, COLORS.tax);
  let off = 0;
  for (const [node, value, col] of [[vat, result.vat, 2], [irpf, result.irpf, 1], [ss, result.ssWorker, 1], [ssEmp, result.ssEmployer, 1]]) {
    if (value > 0) link(node, 0, total, off, value, col, 3, COLORS.tax, COLORS.total);
    off += h(value);
  }
  off = 0;
  for (const a of areaNodes) {
    link(total, off, a, 0, a.amount, 3, 4, COLORS.total, a.color);
    off += a.h;
  }

  const rect = (col, node, color, key) =>
    node.h > 0 && <rect key={key} x={X[col]} y={node.y} width={NODE_W} height={Math.max(node.h, 1.5)} fill={color} />;
  const right = (col) => X[col] + NODE_W + 10;
  const pct = (v) => `${Math.round((v / result.gross) * 100)} % del bruto`;
  const top = areaNodes[0];

  return (
    <div className="sankey-scroll">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="sankey"
        role="img"
        aria-label={`De un sueldo bruto de ${eur(result.gross)} al año, ${eur(result.total)} son impuestos. El ámbito que más recibe es ${top?.name ?? ''}, con ${eur(top?.amount ?? 0)}. La tabla de abajo tiene todas las cifras.`}
      >
        {ribbons.map((r, i) => (
          <Ribbon key={i} id={`sk-${i}`} {...r} />
        ))}

        {rect(0, gross, COLORS.gross, 'g')}
        {rect(0, employer, COLORS.employer, 'e')}
        {rect(1, net, COLORS.net, 'n')}
        {rect(1, irpf, COLORS.tax, 'i')}
        {rect(1, ss, COLORS.tax, 's')}
        {rect(1, ssEmp, COLORS.tax, 'se')}
        {rect(2, left, COLORS.left, 'l')}
        {rect(2, vat, COLORS.tax, 'v')}
        {rect(3, total, COLORS.total, 't')}
        {areaNodes.map((a) => rect(4, a, a.color, a.id))}

        <Label x={X[0] - 10} y={gross.y + gross.h / 2 - 6} anchor="end" name="Sueldo bruto" value={eur(result.gross)} color={COLORS.gross} />
        {result.ssEmployer > 0 && (
          <Label x={X[0] - 10} y={employer.y + employer.h / 2 - 6} anchor="end" name="Tu empresa" value={eur(result.ssEmployer)} color={COLORS.gross} />
        )}
        <Label x={right(1)} y={net.y + 22} name="Neto en tu cuenta" value={eur(result.net)} color={COLORS.net} />
        <Label x={right(1)} y={irpf.y + irpf.h / 2 - 4} name="IRPF" value={`${eur(result.irpf)} · ${pct(result.irpf)}`} color={COLORS.tax} />
        <Label x={right(1)} y={ss.y + ss.h / 2 - 4} name="Tu cotización social" value={eur(result.ssWorker)} color={COLORS.tax} />
        {result.ssEmployer > 0 && (
          <Label x={right(1)} y={ssEmp.y + ssEmp.h / 2 - 4} name="Cotización de la empresa" value={eur(result.ssEmployer)} color={COLORS.tax} />
        )}
        <Label x={right(2)} y={left.y + 22} name="Te queda" value={eur(result.left)} color={COLORS.net} note="ahorro y gasto sin impuestos" />
        <Label x={right(2)} y={vat.y + vat.h / 2 - 4} name="IVA" value={eur(result.vat)} color={COLORS.tax} />
        <Label
          x={X[3] + NODE_W / 2}
          y={total.y + total.h + 24}
          anchor="middle"
          name="Tus impuestos"
          value={eur(result.total)}
          note={`${Math.round(result.effectivePct)} % de lo que cuesta tu sueldo`}
          color={COLORS.total}
        />
        {areaNodes.map((a) => (
          <Label key={a.id} x={right(4)} y={a.y + a.h / 2 - 4} name={a.name} value={`${eur(a.amount)} al año · ${eur(a.amount / 12)} al mes`} color={COLORS.total} />
        ))}
      </svg>
    </div>
  );
}
