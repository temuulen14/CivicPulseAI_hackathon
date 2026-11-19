import { COUNTRIES } from '../worldMap.js';
import AreaIcon from './AreaIcon.jsx';

// Mapa en SVG sin librería: cada país es un <path> ya calculado (ver scripts/buildWorldMap.mjs).
// El mismo componente pinta el mundo entero o solo Europa: lo único que cambia es `box`,
// el trozo del dibujo que se enseña (el viewBox del SVG).
//
// - `fillOf(code)`: color del país, o null si no hay datos de él (se pinta en gris claro).
// - `titleOf(code)`: texto que sale al dejar el ratón encima.
// - `flags`: { [código de país]: [ámbitos que lidera] }. Cada ámbito es un banderín en el mismo mástil.
// - `flagSize`: tamaño del banderín como fracción del ancho del mapa.
// - `hideFlagsIn`: zona [x, y, ancho, alto] donde no se ponen banderas (Europa en el mapa del
//   mundo, porque allí no caben) y que se marca con un recuadro.
export default function WorldMap({ box, label, fillOf, titleOf, flags, flagSize, onPick, hideFlagsIn }) {
  const size = box[2] * flagSize;
  const isHidden = ([x, y]) =>
    hideFlagsIn &&
    x >= hideFlagsIn[0] && x <= hideFlagsIn[0] + hideFlagsIn[2] &&
    y >= hideFlagsIn[1] && y <= hideFlagsIn[1] + hideFlagsIn[3];

  // De norte a sur, para que un mástil no tape el banderín del país de debajo.
  const poles = COUNTRIES.filter((c) => flags[c.code] && !isHidden(c.center)).sort((a, b) => a.center[1] - b.center[1]);

  return (
    <svg className="world-map" viewBox={box.join(' ')} role="img" aria-label={label}>
      {COUNTRIES.map((c) => {
        const fill = c.center ? fillOf(c.code) : null;
        return (
          <path key={c.code} d={c.d} className={fill ? 'map-country' : 'map-country is-empty'} style={fill ? { fill } : undefined}>
            {fill && <title>{titleOf(c.code)}</title>}
          </path>
        );
      })}

      {hideFlagsIn && (
        <rect className="map-zoom-box" x={hideFlagsIn[0]} y={hideFlagsIn[1]} width={hideFlagsIn[2]} height={hideFlagsIn[3]} />
      )}

      {poles.map((c) => {
        const [x, y] = c.center;
        const areas = flags[c.code];
        return (
          <g key={c.code} className="map-flag">
            <line x1={x} y1={y} x2={x} y2={y - size * (areas.length + 0.35)} />
            <circle cx={x} cy={y} r={size * 0.12} />
            {areas.map((area, i) => {
              // Cada banderín es un gallardete con dos puntas y el emblema del ámbito; se apilan mástil arriba.
              const top = y - size * (i + 1.35);
              const [w, h] = [size * 1.45, size * 0.92];
              return (
                <g key={area.id} onClick={() => onPick(area.id)}>
                  <title>{area.title}</title>
                  <path d={`M${x},${top}h${w}l${-size * 0.28},${h / 2}l${size * 0.28},${h / 2}h${-w}z`} />
                  <AreaIcon name={area.icon} x={x + size * 0.2} y={top + size * 0.12} width={size * 0.68} height={size * 0.68} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
