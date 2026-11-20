import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatChange, formatMeur } from '../format.js';
import { INFLATION_PCT, INFLATION_SOURCE, PRICE_INDEX, toEurosOf } from '../inflation.js';
import Segmented from './Segmented.jsx';

const AXIS = { stroke: 'var(--line-strong)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false };
const int = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });

const VIEWS = [
  { value: 'yearly', label: 'Año a año' },
  { value: 'cumulative', label: 'Acumulado' },
];

// Mismos colores que el resto de la app: gasto = verde, lo que se compara (precios) = azul.
const LABELS = { spend: 'Gasto público', prices: 'Precios (inflación)' };
const COLORS = { spend: 'var(--forest)', prices: 'var(--sky)' };

// Gasto en euros frente a la inflación (IPCA de Eurostat).
// `values` es { año: millones de euros }. Siempre en euros: en % del PIB la inflación ya
// está descontada, porque el PIB también sube con los precios.
export default function InflationChart({ values, year, onYearChange, what = 'el gasto público' }) {
  const [view, setView] = useState('yearly');

  // Solo los años con gasto y con dato de precios. Un año con gasto 0 no sirve de base:
  // dividir entre él daba «∞ %» o «NaN %» en subámbitos que empiezan en cero.
  const years = Object.keys(values)
    .map(Number)
    .filter((y) => values[y] > 0 && PRICE_INDEX[y] != null)
    .sort((a, b) => a - b);
  if (years.length < 2) return null;

  const first = years[0];
  const last = years.includes(year) ? year : years[years.length - 1];

  // Año a año: cuánto cambió el gasto y cuánto los precios frente al año anterior.
  const yearly = years.slice(1).map((y) => ({
    year: y,
    spend: values[y - 1] ? ((values[y] - values[y - 1]) / values[y - 1]) * 100 : null,
    prices: INFLATION_PCT[y],
  }));

  // Acumulado: índice 100 en el primer año, para comparar cuánto ha crecido cada cosa.
  const cumulative = years.map((y) => ({
    year: y,
    spend: (values[y] / values[first]) * 100,
    prices: (PRICE_INDEX[y] / PRICE_INDEX[first]) * 100,
  }));

  // Resumen entre el primer año y el elegido.
  const spendGrowth = (values[last] / values[first] - 1) * 100;
  const priceGrowth = (PRICE_INDEX[last] / PRICE_INDEX[first] - 1) * 100;
  const realGrowth = (values[last] / toEurosOf(values[first], first, last) - 1) * 100;
  const shown = yearly.filter((r) => r.year <= last && r.spend != null);
  const beatPrices = shown.filter((r) => r.spend > r.prices).length;

  const data = view === 'yearly' ? yearly : cumulative;
  const format = view === 'yearly' ? formatChange : (v) => int.format(v);
  const tooltip = ({ active, payload, label }) =>
    active && payload?.length ? (
      <div className="tooltip">
        <strong>{label}</strong>
        {payload.map((p) => (
          <div key={p.dataKey}>
            {LABELS[p.dataKey]}: {p.value != null ? format(p.value) : 'sin dato'}
          </div>
        ))}
        {view === 'cumulative' && (
          <div className="muted">
            En euros de {first}: {formatMeur(toEurosOf(values[label], label, first))}
          </div>
        )}
      </div>
    ) : null;
  const common = {
    data,
    margin: { top: 10, right: 16, bottom: 0, left: 0 },
    onClick: (e) => e?.activeLabel && onYearChange?.(Number(e.activeLabel)),
  };

  return (
    <div className="inflation">
      <p className="lead">
        Entre {first} y {last}, {what} creció un {formatChange(spendGrowth).replace('+', '')} y los precios, un{' '}
        {formatChange(priceGrowth).replace('+', '')}. Descontada la inflación, la variación real es de{' '}
        <strong>{formatChange(realGrowth)}</strong>.
      </p>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Gasto, en euros de cada año</span>
          <span className="stat-value">{formatChange(spendGrowth)}</span>
          <span className="stat-note">
            {first}–{last}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Precios</span>
          <span className="stat-value">{formatChange(priceGrowth)}</span>
          <span className="stat-note">IPCA, Eurostat</span>
        </div>
        <div className="stat">
          <span className="stat-label">Gasto real (sin inflación)</span>
          <span className="stat-value">{formatChange(realGrowth)}</span>
          <span className="stat-note">
            {formatMeur(values[last])} de {last} = {formatMeur(toEurosOf(values[last], last, first))} de {first}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Años en que ganó a los precios</span>
          <span className="stat-value">
            {beatPrices} de {shown.length}
          </span>
          <span className="stat-note">El gasto subió más que la inflación</span>
        </div>
      </div>

      <div className="view-toolbar">
        <Segmented label="Cómo verlo" options={VIEWS} value={view} onChange={setView} />
        <p className="muted">
          {view === 'yearly'
            ? 'Variación frente al año anterior, en %. Si la barra verde es más baja que la azul, ese año el gasto perdió poder de compra.'
            : `Índice: ${first} = 100. Si la línea verde va por debajo de la azul, el gasto ha crecido menos que los precios.`}
        </p>
      </div>

      <div className="legend" aria-hidden="true">
        {Object.keys(LABELS).map((k) => (
          <span key={k}>
            {view === 'yearly' ? (
              <span className="swatch" style={{ background: COLORS[k] }} />
            ) : (
              <span
                className={`legend-line${k === 'spend' ? ' solid' : ''}`}
                style={{ borderTopColor: COLORS[k] }}
              />
            )}{' '}
            {LABELS[k]}
          </span>
        ))}
      </div>

      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'yearly' ? (
            <BarChart {...common} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="year" {...AXIS} />
              <YAxis {...AXIS} axisLine={false} width={44} tickFormatter={(v) => `${v} %`} />
              <ReferenceLine y={0} stroke="var(--line-strong)" />
              <Tooltip content={tooltip} cursor={{ fill: 'var(--mist)' }} />
              <Bar dataKey="spend" fill={COLORS.spend} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="prices" fill={COLORS.prices} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          ) : (
            <LineChart {...common}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="year" {...AXIS} />
              <YAxis {...AXIS} axisLine={false} width={44} domain={['auto', 'auto']} />
              <ReferenceLine y={100} stroke="var(--line-strong)" />
              <ReferenceLine x={last} stroke="var(--line-strong)" strokeDasharray="3 3" />
              <Tooltip content={tooltip} />
              {Object.keys(LABELS).map((k) => (
                <Line
                  key={k}
                  dataKey={k}
                  stroke={COLORS[k]}
                  strokeWidth={2}
                  strokeDasharray={k === 'prices' ? '5 4' : undefined}
                  dot={{ r: 3, fill: COLORS[k], stroke: 'var(--paper)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <p className="muted">
        Siempre en euros: en % del PIB la inflación ya está descontada, porque el PIB también sube con los precios.
        Fuente de los precios:{' '}
        <a href={INFLATION_SOURCE.url} target="_blank" rel="noreferrer">
          {INFLATION_SOURCE.name}
        </a>
        .
      </p>
    </div>
  );
}
