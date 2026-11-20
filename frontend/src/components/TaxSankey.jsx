import { shareStep } from '../scale.js';
import { formatPct } from '../format.js';
import { useHighlight } from '../useHighlight.js';

// Diagrama de flujo (Sankey) de un sueldo, al estilo de googleexample.png:
// sueldo bruto → neto, IRPF y cotización → lo que te queda e IVA → tus impuestos → ámbitos.
// SVG hecho a mano: cada nodo es un rectángulo y cada flujo una cinta con curvas de Bézier
// cuyo grosor es proporcional a los euros. No hace falta ninguna librería.
// Interactivo, igual que BudgetSankey: al pasar el ratón (o el foco) por un nodo o una cinta
// se resaltan las cintas que entran y salen de él y se enseña su cifra; cada ámbito es un
// enlace a su ficha.

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

function Ribbon({ x0, y0, x1, y1, thick, from, to, id, className, onMouseEnter }) {
  const m = (x0 + x1) / 2;
  const d = `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1} L${x1},${y1 + thick} C${m},${y1 + thick} ${m},${y0 + thick} ${x0},${y0 + thick} Z`;
  return (
    <>
      <linearGradient id={id} x1={x0} x2={x1} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
      {/* borde invisible: hace las cintas finas más fáciles de acertar con el ratón */}
      <path d={d} fill={`url(#${id})`} stroke="transparent" strokeWidth="10" className={className} onMouseEnter={onMouseEnter} />
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
  const { active, show, hideSoon, hover } = useHighlight(); // active: 'gross', 'irpf', 'area:GF10'…
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
    const node = { ...a, key: `area:${a.id}`, rowY: y, rowH: slot(a), y: y + (slot(a) - h(a.amount)) / 2, h: h(a.amount), color: shareStep(a.share).fill };
    y += slot(a) + AREA_GAP;
    return node;
  });
  const lastLabel = y;
  const height = Math.ceil(Math.max(lastLabel + 20, ssEmp.y + ssEmp.h + 70, total.y + total.h + 90));

  // --- Cintas: cada nodo va gastando su altura de arriba abajo. Cada cinta recuerda de qué
  // nodo sale (`a`) y a cuál llega (`b`), para saber cuándo encenderla ---
  const ribbons = [];
  const link = (aKey, a, aOff, bKey, b, bOff, value, colA, colB, from, to) => {
    ribbons.push({ a: aKey, b: bKey, x0: X[colA] + NODE_W, y0: a.y + aOff, x1: X[colB], y1: b.y + bOff, thick: h(value), from, to });
  };
  link('gross', gross, 0, 'net', net, 0, result.net, 0, 1, COLORS.gross, COLORS.net);
  link('gross', gross, net.h, 'irpf', irpf, 0, result.irpf, 0, 1, COLORS.gross, COLORS.tax);
  link('gross', gross, net.h + irpf.h, 'ss', ss, 0, result.ssWorker, 0, 1, COLORS.gross, COLORS.tax);
  if (result.ssEmployer > 0) link('employer', employer, 0, 'ssEmp', ssEmp, 0, result.ssEmployer, 0, 1, COLORS.employer, COLORS.tax);
  link('net', net, 0, 'left', left, 0, result.left, 1, 2, COLORS.net, COLORS.left);
  link('net', net, left.h, 'vat', vat, 0, result.vat, 1, 2, COLORS.net, COLORS.tax);
  let off = 0;
  for (const [key, node, value, col] of [['vat', vat, result.vat, 2], ['irpf', irpf, result.irpf, 1], ['ss', ss, result.ssWorker, 1], ['ssEmp', ssEmp, result.ssEmployer, 1]]) {
    if (value > 0) link(key, node, 0, 'total', total, off, value, col, 3, COLORS.tax, COLORS.total);
    off += h(value);
  }
  off = 0;
  for (const a of areaNodes) {
    link('total', total, off, a.key, a, 0, a.amount, 3, 4, COLORS.total, a.color);
    off += a.h;
  }
  // Las finas se dibujan las últimas (encima), para que una gruesa vecina no las tape.
  ribbons.sort((r1, r2) => r2.thick - r1.thick);

  // Una cinta se enciende si el nodo resaltado es uno de sus dos extremos; un nodo, si es el
  // resaltado o está unido a él por una cinta.
  const touches = (r, key) => r.a === key || r.b === key;
  const litRibbon = (r) => !active || touches(r, active);
  const litNode = (key) => !active || key === active || ribbons.some((r) => touches(r, active) && touches(r, key));
  const dim = (key) => (litNode(key) ? undefined : 'is-dim');

  const right = (col) => X[col] + NODE_W + 10;
  const pct = (v) => `${Math.round((v / result.gross) * 100)} % del bruto`;
  const top = areaNodes[0];

  // Nodo con su etiqueta: un grupo que se resalta con el ratón o con el teclado.
  const node = (key, col, n, color, label) =>
    n.h > 0 && (
      <g key={key} className={dim(key)} tabIndex="0" {...hover(key)}>
        <rect x={X[col]} y={n.y} width={NODE_W} height={Math.max(n.h, 1.5)} fill={color} />
        {label}
      </g>
    );

  // Texto de la línea de detalle para cada nodo.
  const perMonth = (v) => `${eur(v)} al año · ${eur(v / 12)} al mes`;
  const details = {
    gross: { name: 'Sueldo bruto', text: `${perMonth(result.gross)} · de aquí salen tu neto, el IRPF y tu cotización` },
    employer: { name: 'Tu empresa', text: `${perMonth(result.ssEmployer)} · cotización que paga la empresa además de tu sueldo` },
    net: { name: 'Neto en tu cuenta', text: `${perMonth(result.net)} · ${pct(result.net)}` },
    irpf: { name: 'IRPF', text: `${perMonth(result.irpf)} · ${pct(result.irpf)}` },
    ss: { name: 'Tu cotización social', text: `${perMonth(result.ssWorker)} · ${pct(result.ssWorker)}` },
    ssEmp: { name: 'Cotización de la empresa', text: perMonth(result.ssEmployer) },
    left: { name: 'Te queda', text: `${perMonth(result.left)} · ahorro y gasto sin impuestos` },
    vat: { name: 'IVA', text: `${perMonth(result.vat)} · lo pagas al gastar tu neto` },
    total: { name: 'Tus impuestos', text: `${perMonth(result.total)} · ${Math.round(result.effectivePct)} % de lo que cuesta tu sueldo` },
  };
  for (const a of areaNodes) {
    details[a.key] = { name: a.name, text: `${perMonth(a.amount)} · ${formatPct(a.share)} de tus impuestos · pulsa para ver el ámbito` };
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
          <span className="muted">Pasa el ratón por una franja para ver su cifra. Pulsa un ámbito para abrir su ficha.</span>
        )}
      </p>
      <div className="sankey-scroll">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="sankey flow-svg"
          role="group"
          aria-label={`De un sueldo bruto de ${eur(result.gross)} al año, ${eur(result.total)} son impuestos. El ámbito que más recibe es ${top?.name ?? ''}, con ${eur(top?.amount ?? 0)}. La tabla de abajo tiene todas las cifras.`}
          onMouseLeave={() => show(null)}
        >
          {/* fondo invisible: en un hueco vacío el resaltado se apaga, pero no al instante */}
          <rect className="flow-bg" width={W} height={height} fill="transparent" onMouseEnter={hideSoon} />
          {ribbons.map((r, i) => (
            <Ribbon
              key={i}
              id={`sk-${i}`}
              {...r}
              className={`flow-ribbon ${active && litRibbon(r) ? 'is-lit' : ''} ${litRibbon(r) ? '' : 'is-dim'}`}
              onMouseEnter={() => show(r.b)}
            />
          ))}

          {node('gross', 0, gross, COLORS.gross,
            <Label x={X[0] - 10} y={gross.y + gross.h / 2 - 6} anchor="end" name="Sueldo bruto" value={eur(result.gross)} color={COLORS.gross} />)}
          {node('employer', 0, employer, COLORS.employer,
            <Label x={X[0] - 10} y={employer.y + employer.h / 2 - 6} anchor="end" name="Tu empresa" value={eur(result.ssEmployer)} color={COLORS.gross} />)}
          {node('net', 1, net, COLORS.net,
            <Label x={right(1)} y={net.y + 22} name="Neto en tu cuenta" value={eur(result.net)} color={COLORS.net} />)}
          {node('irpf', 1, irpf, COLORS.tax,
            <Label x={right(1)} y={irpf.y + irpf.h / 2 - 4} name="IRPF" value={`${eur(result.irpf)} · ${pct(result.irpf)}`} color={COLORS.tax} />)}
          {node('ss', 1, ss, COLORS.tax,
            <Label x={right(1)} y={ss.y + ss.h / 2 - 4} name="Tu cotización social" value={eur(result.ssWorker)} color={COLORS.tax} />)}
          {node('ssEmp', 1, ssEmp, COLORS.tax,
            <Label x={right(1)} y={ssEmp.y + ssEmp.h / 2 - 4} name="Cotización de la empresa" value={eur(result.ssEmployer)} color={COLORS.tax} />)}
          {node('left', 2, left, COLORS.left,
            <Label x={right(2)} y={left.y + 22} name="Te queda" value={eur(result.left)} color={COLORS.net} note="ahorro y gasto sin impuestos" />)}
          {node('vat', 2, vat, COLORS.tax,
            <Label x={right(2)} y={vat.y + vat.h / 2 - 4} name="IVA" value={eur(result.vat)} color={COLORS.tax} />)}
          {node('total', 3, total, COLORS.total,
            <Label
              x={X[3] + NODE_W / 2}
              y={total.y + total.h + 24}
              anchor="middle"
              name="Tus impuestos"
              value={eur(result.total)}
              note={`${Math.round(result.effectivePct)} % de lo que cuesta tu sueldo`}
              color={COLORS.total}
            />)}

          {areaNodes.map((a) => (
            <a key={a.key} href={`#/ambito/${a.id}`} className={dim(a.key)} {...hover(a.key)}>
              {/* rectángulo invisible: toda la fila es pulsable, incluido el hueco hasta la siguiente */}
              <rect x={X[4]} y={a.rowY - AREA_GAP / 2} width={W - X[4]} height={a.rowH + AREA_GAP} fill="transparent" />
              <rect x={X[4]} y={a.y} width={NODE_W} height={Math.max(a.h, 1.5)} fill={a.color} />
              <Label x={right(4)} y={a.y + a.h / 2 - 4} name={a.name} value={`${eur(a.amount)} al año · ${eur(a.amount / 12)} al mes`} color={COLORS.total} />
            </a>
          ))}
        </svg>
      </div>
    </div>
  );
}
