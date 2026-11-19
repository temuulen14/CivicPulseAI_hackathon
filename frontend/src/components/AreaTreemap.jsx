import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { formatMeur, formatPct } from '../format.js';

// Escala de un solo tono (azul): más oscuro = más dinero.
// Se asigna por posición en el ranking, de mayor a menor importe.
const BLUES = ['#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#9ec5f4'];
const WHITE_TEXT_UNTIL = 4; // en los tonos más claros el texto va en negro para que se lea

const SEVERITY_COLOR = { critical: '#d03b3b', warning: '#fab219', info: '#ffffff' };

function goToArea(id) {
  window.location.hash = `#/ambito/${id}`;
}

// Recharts llama a esta función para dibujar cada rectángulo del mapa.
function Cell(props) {
  const { x, y, width, height, depth, name, id, rank, share_of_total_pct, amount_meur, alert_count, max_severity } = props;
  if (depth !== 1) return null; // depth 0 es la raíz; solo pintamos los ámbitos
  const fill = BLUES[Math.min(rank, BLUES.length - 1)];
  const ink = rank <= WHITE_TEXT_UNTIL ? '#ffffff' : '#0b0b0b';
  const showName = width > 80 && height > 40;
  const showAmount = width > 80 && height > 64;
  const hasBadge = alert_count > 0 && width > 40 && height > 30;
  const textRoom = width - 20 - (hasBadge ? 26 : 0); // espacio libre para el nombre
  const maxChars = Math.floor(textRoom / 7.5);

  return (
    <g
      className="treemap-cell"
      tabIndex={0}
      role="link"
      aria-label={`${name}: ${formatMeur(amount_meur)}, ${formatPct(share_of_total_pct)} del total${alert_count ? `, ${alert_count} avisos` : ''}`}
      onClick={() => goToArea(id)}
      onKeyDown={(e) => e.key === 'Enter' && goToArea(id)}
    >
      {/* el borde de 2px del color de fondo separa los rectángulos */}
      <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} stroke="var(--surface)" strokeWidth={2} />
      {showName && (
        <text x={x + 10} y={y + 22} fill={ink} fontSize={14} fontWeight={600}>
          {name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name}
        </text>
      )}
      {showAmount && (
        <text x={x + 10} y={y + 42} fill={ink} fontSize={13} opacity={0.9}>
          {formatPct(share_of_total_pct)}
        </text>
      )}
      {hasBadge && (
        <g aria-hidden="true">
          <circle cx={x + width - 16} cy={y + 16} r={10} fill={SEVERITY_COLOR[max_severity] ?? '#ffffff'} stroke={fill} strokeWidth={2} />
          <text
            x={x + width - 16}
            y={y + 20}
            textAnchor="middle"
            fontSize={11}
            fontWeight={800}
            fill={max_severity === 'critical' ? '#ffffff' : '#0b0b0b'}
          >
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
      {formatMeur(a.amount_meur)} · {formatPct(a.share_of_total_pct)} del total
      {a.alert_count > 0 && <div>{a.alert_count === 1 ? '1 aviso' : `${a.alert_count} avisos`}</div>}
    </div>
  );
}

export default function AreaTreemap({ areas }) {
  const data = [...areas]
    .sort((a, b) => b.amount_meur - a.amount_meur)
    .map((a, rank) => ({ ...a, rank }));

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
