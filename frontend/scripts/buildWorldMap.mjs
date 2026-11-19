// Genera src/worldMap.js: el contorno de cada país ya convertido en un trazo SVG.
// Así el navegador no necesita ninguna librería de mapas: solo pinta <path>.
//
// Uso (solo hace falta repetirlo si cambian los países con datos):
//   node scripts/buildWorldMap.mjs [ruta/al/ne_50m_admin_0_countries.geojson]
// Sin ruta, descarga el archivo de Natural Earth (dominio público).

import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

// Natural Earth usa códigos ISO de tres letras. Los países con datos se guardan con el
// código de nuestra API: dos letras de Eurostat para la UE (Grecia es EL) y tres de la OCDE.
const DATA_CODES = {
  ESP: 'ES', AUT: 'AT', BEL: 'BE', BGR: 'BG', CYP: 'CY', CZE: 'CZ', DEU: 'DE', DNK: 'DK', EST: 'EE',
  GRC: 'EL', FIN: 'FI', FRA: 'FR', HRV: 'HR', HUN: 'HU', IRL: 'IE', ITA: 'IT', LTU: 'LT', LUX: 'LU',
  LVA: 'LV', MLT: 'MT', NLD: 'NL', POL: 'PL', PRT: 'PT', ROU: 'RO', SWE: 'SE', SVN: 'SI', SVK: 'SK',
  USA: 'USA', JPN: 'JPN', GBR: 'GBR', KOR: 'KOR', AUS: 'AUS',
};

const WIDTH = 1000;
const TOP_LAT = 84; // se recorta el Ártico y la Antártida, donde no hay países con datos
const BOTTOM_LAT = -57;
const EUROPE = { west: -11.5, east: 38.5, north: 71.5, south: 33.5 };

// Proyección de Miller: como la de Mercator, pero sin agrandar tanto el norte.
const RADIUS = WIDTH / (2 * Math.PI);
const millerY = (lat) => RADIUS * 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * ((lat * Math.PI) / 180)));
const project = ([lon, lat]) => [((lon + 180) / 360) * WIDTH, millerY(TOP_LAT) - millerY(lat)];
const round = (n) => Math.round(n * 10) / 10;

// Europa sale también ampliada, así que ahí se guarda más detalle que en el resto del mundo.
const [EU_LEFT, EU_TOP] = project([EUROPE.west, EUROPE.north]);
const [EU_RIGHT, EU_BOTTOM] = project([EUROPE.east, EUROPE.south]);
const inEurope = ([x, y]) => x >= EU_LEFT && x <= EU_RIGHT && y >= EU_TOP && y <= EU_BOTTOM;

// Quita los puntos que quedan muy cerca del anterior: el contorno pesa mucho menos
// y a este tamaño no se nota.
function simplify(points) {
  const kept = [points[0]];
  for (const p of points) {
    const last = kept[kept.length - 1];
    const minGap = inEurope(p) ? 0.3 : 2.5;
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= minGap) kept.push(p);
  }
  return kept;
}

// Área (con signo) y centro de un polígono, con la fórmula del área de Gauss.
function areaAndCenter(points) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  return { area: Math.abs(area / 2), center: [cx / (3 * area), cy / (3 * area)] };
}

const file = argv[2];
const geojson = file ? JSON.parse(readFileSync(file, 'utf8')) : await (await fetch(SOURCE_URL)).json();

const countries = [];
for (const feature of geojson.features) {
  const iso = feature.properties.ADM0_A3;
  if (iso === 'ATA') continue;
  const code = DATA_CODES[iso];
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  // Solo el borde exterior de cada trozo del país (se ignoran los lagos interiores).
  const rings = polygons.map((polygon) => polygon[0].map(project));
  const biggest = rings.reduce((a, b) => (areaAndCenter(a).area >= areaAndCenter(b).area ? a : b));

  const d = rings
    .map((ring) => simplify(ring))
    .filter((ring, i) => ring.length >= 6 || rings[i] === biggest) // fuera islotes diminutos
    .map((ring) => `M${ring.map(([x, y]) => `${round(x)},${round(y)}`).join('L')}Z`)
    .join('');

  const country = { code: code ?? iso, d };
  // El centro del trozo más grande (la Francia europea, no la Guayana): ahí va la bandera.
  if (code) country.center = areaAndCenter(biggest).center.map(round);
  countries.push(country);
}

const height = round(millerY(TOP_LAT) - millerY(BOTTOM_LAT));
const europe = [EU_LEFT, EU_TOP, EU_RIGHT - EU_LEFT, EU_BOTTOM - EU_TOP].map(round);

const output = `// GENERADO por scripts/buildWorldMap.mjs. No editar a mano.
// Contornos: Natural Earth 1:50m (dominio público), https://www.naturalearthdata.com
// \`code\` es el código de nuestra API si hay datos del país (ES, EL, USA…); si no, su ISO de tres letras.
// \`center\` solo existe en los países con datos: es donde se clava la bandera.

export const WORLD_BOX = [0, 0, ${WIDTH}, ${height}];
export const EUROPE_BOX = ${JSON.stringify(europe)};

export const COUNTRIES = [
${countries.map((c) => `  ${JSON.stringify(c)},`).join('\n')}
];
`;

const target = new URL('../src/worldMap.js', import.meta.url);
writeFileSync(target, output);
console.log(`${countries.length} países, ${Math.round(output.length / 1024)} KB -> src/worldMap.js`);
