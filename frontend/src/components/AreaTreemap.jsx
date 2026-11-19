import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { formatMeur, formatPct } from '../format.js';
import { MEASURES } from '../measures.js';
import { shareStep } from '../scale.js';

// Color del círculo con el número de avisos (texto oscuro en el ámbar para que se lea).
const BADGE = {
  critical: { fill: 'var(--critical)', ink: 'var(--on-accent)' },
  warning: { fill: 'var(--warning-mark)', ink: '#191b18' },
  info: { fill: 'var(--info)', ink: 'var(--on-accent)' },
};

function goToArea(id) {
  window.location.hash = `#/ambito/${id}`;
}

// Recharts llama a esta función para dibujar cada rectángulo del mapa.
function Cell(props) {
  const { x, y, width, height, depth, name, id, share_of_total_pct, alert_count, max_severity, label } = props;
  if (depth !== 1) return null; // depth 0 es la raíz; solo pintamos los ámbitos
  const { fill, ink } = shareStep(share_of_total_pct);
  const showName = width > 80 && height > 40;
  const showValue = height > 64 && label.length * 11 + 24 < width; // solo si la cifra cabe entera
  const hasBadge = alert_count > 0 && width > 44 && height > 32;
  const textRoom = width - 24 - (hasBadge ? 28 : 0);
  const maxChars = Math.floor(textRoom / 7.6);
  const badge = BADGE[max_severity] ?? BADGE.info;

  return (
    <g
      className="treemap-cell"
      tabIndex={0}
      role="link"
      aria-label={`${name}: ${label}, ${formatPct(share_of_total_pct)} del total${alert_count ? `, ${alert_count} avisos` : ''}`}
      onClick={() => goToArea(id)}
      onKeyDown={(e) => e.key === 'Enter' && goToArea(id)}
    >
      {/* el borde blanco de 2 px separa los rectángulos */}
      <rect x={x} y={y} width={width} height={height} rx={8} fill={fill} stroke="var(--paper)" strokeWidth={2} />
      {showName && (
        <text x={x + 12} y={y + 24} fill={ink} fontSize={14} fontWeight={500}>
          {name.length > maxChars ? `${name.slice(0, Math.max(1, maxChars - 1))}…` : name}
        </text>
      )}
      {showValue && (
        <text x={x + 12} y={y + 50} fill={ink} fontSize={20} fontFamily="var(--serif)">
          {label}
        </text>
      )}
      {hasBadge && (
        <g aria-hidden="true">
          <circle cx={x + width - 18} cy={y + 18} r={10} fill={badge.fill} stroke="var(--paper)" strokeWidth={2} />
          <text x={x + width - 18} y={y + 22} textAnchor="middle" fontSize={11} fontWeight={600} fill={badge.ink}>
            {alert_count}
          </text>
        </g>
      )}
    </g>
  );
}

function TreemapTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const a = payload[0].payload;
  return (
    <div className="tooltip">
      <strong>{a.name}</strong>
      <div>{formatMeur(a.amount_meur)}</div>
      <div>{formatPct(a.share_of_total_pct)} del gasto total, {formatPct(a.pct_gdp)} del PIB</div>
      {a.alert_count > 0 && <div>{a.alert_count === 1 ? '1 aviso' : `${a.alert_count} avisos`}</div>}
    </div>
  );
}

// Mapa del gasto: el área de cada bloque es su importe y el tono, su cuota del total.
export default function AreaTreemap({ areas, measure = 'amount' }) {
  const m = MEASURES[measure];
  const data = [...areas]
    .sort((a, b) => b.amount_meur - a.amount_meur)
    .map((a) => ({ ...a, label: m.format(m.get(a)) }));

  return (
    <div className="treemap-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={data} dataKey="amount_meur" nameKey="name" content={<Cell />} isAnimationActive={false}>
          <Tooltip content={<TreemapTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
