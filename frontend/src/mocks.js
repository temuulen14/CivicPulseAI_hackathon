// Datos de EJEMPLO con la misma forma que docs/API_CONTRACT.md.
// Sirven para trabajar sin backend. Las cifras son ilustrativas, NO son datos reales:
// la interfaz muestra un aviso siempre que se usan.
// Los avisos de ejemplo siguen las mismas reglas que el backend (docs/ARCHITECTURE.md),
// para que se parezcan a lo que devolverá la API real.

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LATEST = 2024;

// Evolución ilustrativa del gasto total respecto a 2024 (con el salto de 2020).
const YEAR_FACTOR = { 2015: 0.66, 2016: 0.67, 2017: 0.69, 2018: 0.72, 2019: 0.75, 2020: 0.84, 2021: 0.87, 2022: 0.91, 2023: 0.95, 2024: 1 };
// PIB aproximado (millones de euros), solo para calcular % del PIB coherentes.
const GDP_MEUR = { 2015: 1078000, 2016: 1114000, 2017: 1162000, 2018: 1204000, 2019: 1245000, 2020: 1119000, 2021: 1222000, 2022: 1346000, 2023: 1462000, 2024: 1594000 };

// `trend` hace que cada ámbito evolucione distinto (>1 crece más que la media).
// `eu_ratio` es España ÷ mediana UE en % del PIB: >1 España gasta más que la mediana.
const AREAS = [
  { id: 'GF10', name: 'Protección social', icon: 'users', amount: 297500, trend: 1.0, eu_ratio: 1.04, description: 'Pensiones, desempleo, familia, dependencia y ayudas sociales.' },
  { id: 'GF07', name: 'Sanidad', icon: 'heart', amount: 102900, trend: 1.02, eu_ratio: 0.93, description: 'Hospitales, atención primaria, medicamentos y salud pública.' },
  { id: 'GF01', name: 'Servicios públicos generales', icon: 'landmark', amount: 92500, trend: 0.97, eu_ratio: 1.32, description: 'Funcionamiento de las instituciones, intereses de la deuda y relaciones exteriores.' },
  { id: 'GF04', name: 'Asuntos económicos', icon: 'briefcase', amount: 80900, trend: 1.04, eu_ratio: 1.08, description: 'Transporte, energía, agricultura, industria y apoyo a la economía.' },
  { id: 'GF09', name: 'Educación', icon: 'book', amount: 65900, trend: 0.99, eu_ratio: 0.86, description: 'Colegios, institutos, universidades y becas.' },
  { id: 'GF03', name: 'Orden público y seguridad', icon: 'shield', amount: 28600, trend: 0.98, eu_ratio: 1.12, description: 'Policía, bomberos, juzgados y prisiones.' },
  { id: 'GF08', name: 'Ocio, cultura y religión', icon: 'music', amount: 19200, trend: 1.01, eu_ratio: 0.95, description: 'Deporte, cultura, medios públicos y actividades recreativas.' },
  { id: 'GF05', name: 'Protección del medio ambiente', icon: 'leaf', amount: 15500, trend: 1.06, eu_ratio: 1.27, description: 'Residuos, aguas residuales, contaminación y biodiversidad.' },
  { id: 'GF02', name: 'Defensa', icon: 'flag', amount: 14200, trend: 1.03, eu_ratio: 0.7, description: 'Fuerzas armadas y defensa civil.' },
  { id: 'GF06', name: 'Vivienda y servicios comunitarios', icon: 'home', amount: 7600, trend: 0.95, eu_ratio: 0.42, description: 'Vivienda, urbanismo, abastecimiento de agua y alumbrado público.' },
];

const SUBAREAS = {
  GF01: [
    { id: 'GF0107', name: 'Intereses de la deuda pública', share: 38.0 },
    { id: 'GF0101', name: 'Órganos ejecutivos y legislativos', share: 31.0 },
    { id: 'GF0103', name: 'Servicios generales', share: 18.0 },
    { id: 'GF0102', name: 'Ayuda económica exterior', share: 4.0 },
  ],
  GF03: [
    { id: 'GF0301', name: 'Policía', share: 55.0 },
    { id: 'GF0303', name: 'Tribunales de justicia', share: 22.0 },
    { id: 'GF0302', name: 'Bomberos y protección civil', share: 11.0 },
    { id: 'GF0304', name: 'Prisiones', share: 9.0 },
  ],
  GF04: [
    { id: 'GF0405', name: 'Transporte', share: 35.4 },
    { id: 'GF0401', name: 'Asuntos económicos generales', share: 26.1 },
    { id: 'GF0402', name: 'Agricultura, pesca y caza', share: 8.8 },
    { id: 'GF0403', name: 'Combustibles y energía', share: 7.1 },
    { id: 'GF0408', name: 'I+D en asuntos económicos', share: 6.8 },
    { id: 'GF0404', name: 'Minería e industria', share: 3.1 },
  ],
  GF05: [
    { id: 'GF0501', name: 'Gestión de residuos', share: 46.0 },
    { id: 'GF0502', name: 'Aguas residuales', share: 27.0 },
    { id: 'GF0504', name: 'Biodiversidad y paisaje', share: 12.0 },
    { id: 'GF0503', name: 'Reducción de la contaminación', share: 8.0 },
  ],
  GF06: [
    { id: 'GF0603', name: 'Abastecimiento de agua', share: 34.0 },
    { id: 'GF0602', name: 'Desarrollo comunitario', share: 30.0 },
    { id: 'GF0601', name: 'Vivienda', share: 22.0 },
    { id: 'GF0604', name: 'Alumbrado público', share: 10.0 },
  ],
  GF07: [
    { id: 'GF0703', name: 'Servicios hospitalarios', share: 58.0 },
    { id: 'GF0702', name: 'Atención ambulatoria', share: 21.0 },
    { id: 'GF0701', name: 'Medicamentos y material sanitario', share: 16.0 },
    { id: 'GF0704', name: 'Salud pública', share: 3.0 },
  ],
  GF08: [
    { id: 'GF0802', name: 'Cultura', share: 38.0 },
    { id: 'GF0801', name: 'Deporte y ocio', share: 31.0 },
    { id: 'GF0803', name: 'Radio, televisión y edición', share: 22.0 },
  ],
  GF09: [
    { id: 'GF0902', name: 'Educación secundaria', share: 36.0 },
    { id: 'GF0901', name: 'Infantil y primaria', share: 33.0 },
    { id: 'GF0904', name: 'Universidad', share: 18.0 },
    { id: 'GF0906', name: 'Servicios auxiliares (comedor, transporte)', share: 6.0 },
  ],
  GF10: [
    { id: 'GF1002', name: 'Vejez (pensiones)', share: 58.0 },
    { id: 'GF1001', name: 'Enfermedad e incapacidad', share: 12.0 },
    { id: 'GF1005', name: 'Desempleo', share: 9.0 },
    { id: 'GF1003', name: 'Supervivencia (viudedad, orfandad)', share: 8.0 },
    { id: 'GF1004', name: 'Familia e hijos', share: 5.0 },
    { id: 'GF1006', name: 'Vivienda social', share: 1.0 },
  ],
};

// Indicadores de uso. El reparto modal sale de docs/DATA_SOURCES.md (Eurostat, 2022);
// el resto es ilustrativo.
const INDICATORS = {
  GF04: [
    { id: 'modal_split_car', name: 'Viajeros que se mueven en coche', value: 84.0, unit: '% de los viajeros-km', year: 2022, source_id: 'eurostat_tran_hv_psmod' },
    { id: 'modal_split_rail', name: 'Viajeros que se mueven en tren', value: 9.3, unit: '% de los viajeros-km', year: 2022, source_id: 'eurostat_tran_hv_psmod' },
    { id: 'modal_split_bus', name: 'Viajeros que se mueven en autobús', value: 6.7, unit: '% de los viajeros-km', year: 2022, source_id: 'eurostat_tran_hv_psmod' },
  ],
  GF09: [
    { id: 'students_tertiary', name: 'Alumnado que está en la universidad', value: 21.0, unit: '% del alumnado', year: 2022, source_id: 'eurostat_educ_uoe_enra' },
  ],
  GF07: [
    { id: 'hospital_beds', name: 'Camas de hospital', value: 2.9, unit: 'por cada 1.000 habitantes', year: 2022, source_id: 'eurostat_hlth_rs_bds' },
  ],
};

// Cruces gasto ↔ uso de ejemplo (en la app real los decide Mario en data/cruces.json).
// spend: cuota de gasto (%), use: cuota de uso (%), threshold: umbral del cruce.
const CROSSES = [
  {
    key: 'rail', area_id: 'GF04', subarea_id: 'GF0405', spend: 55.0, use: 9.3, threshold: 2.0,
    title: 'El tren recibe mucha más inversión que viajeros',
    message: (s, u) => `El ferrocarril se lleva el ${fmt(s)} % de la inversión en transporte y mueve el ${fmt(u)} % de los viajeros.`,
    labels: ['Inversión en tren', 'Viajeros en tren'],
    note: 'Las infraestructuras ferroviarias cuestan mucho al principio y se usan durante décadas. En años de construcción de alta velocidad es normal que la cuota de gasto supere a la de uso.',
    sources: ['eurostat_gov_10a_exp', 'eurostat_tran_hv_psmod'],
  },
  {
    key: 'bus', area_id: 'GF04', subarea_id: 'GF0405', spend: 3.2, use: 6.7, threshold: 1.5,
    title: 'El autobús mueve más viajeros de los que recibe en inversión',
    message: (s, u) => `El autobús recibe el ${fmt(s)} % del presupuesto de transporte y mueve el ${fmt(u)} % de los viajeros.`,
    labels: ['Inversión en autobús', 'Viajeros en autobús'],
    note: 'Buena parte del autobús lo pagan ayuntamientos y empresas concesionarias con tarifas, y no aparece como inversión pública en transporte.',
    sources: ['eurostat_gov_10a_exp', 'eurostat_tran_hv_psmod'],
  },
  {
    key: 'road', area_id: 'GF04', subarea_id: 'GF0405', spend: 38.0, use: 84.0, threshold: 1.5,
    title: 'La carretera recibe menos inversión de lo que se usa',
    message: (s, u) => `Las carreteras reciben el ${fmt(s)} % de la inversión en transporte y por ellas se mueve el ${fmt(u)} % de los viajeros en coche.`,
    labels: ['Inversión en carretera', 'Viajeros en coche'],
    note: 'Gran parte del coste del coche lo pagan los conductores (vehículo, combustible, peajes). Una cuota de inversión pública menor que la de uso puede ser deliberada para favorecer el transporte colectivo.',
    sources: ['eurostat_gov_10a_exp', 'eurostat_tran_hv_psmod'],
  },
  {
    key: 'university', area_id: 'GF09', subarea_id: 'GF0904', spend: 18.0, use: 21.0, threshold: 1.15,
    title: 'La universidad recibe algo menos de lo que pesa su alumnado',
    message: (s, u) => `La universidad recibe el ${fmt(s)} % del gasto en educación y concentra el ${fmt(u)} % del alumnado.`,
    labels: ['Gasto en universidad', 'Alumnado universitario'],
    note: 'Las matrículas cubren parte del coste universitario, así que no todo el gasto aparece como gasto público.',
    sources: ['eurostat_gov_10a_exp', 'eurostat_educ_uoe_enra'],
  },
  {
    key: 'public_health', area_id: 'GF07', subarea_id: 'GF0704', spend: 3.0, use: 8.0, threshold: 2.0,
    title: 'La salud pública recibe poco frente a las consultas que atiende',
    message: (s, u) => `La salud pública recibe el ${fmt(s)} % del gasto sanitario y atiende el ${fmt(u)} % de las consultas.`,
    labels: ['Gasto en salud pública', 'Consultas de salud pública'],
    note: 'La prevención (vacunas, cribados) es barata por persona atendida; una cuota de gasto baja no implica por sí sola que falten recursos.',
    sources: ['eurostat_gov_10a_exp', 'eurostat_hlth_rs_bds'],
  },
];

const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia', factor: 1.3 },
  { code: 'DE', name: 'Alemania', factor: 1.12 },
  { code: 'IT', name: 'Italia', factor: 1.15 },
  { code: 'PT', name: 'Portugal', factor: 0.95 },
  { code: 'NL', name: 'Países Bajos', factor: 1.0 },
  { code: 'BE', name: 'Bélgica', factor: 1.2 },
  { code: 'AT', name: 'Austria', factor: 1.18 },
  { code: 'SE', name: 'Suecia', factor: 1.1 },
  { code: 'PL', name: 'Polonia', factor: 0.9 },
  { code: 'IE', name: 'Irlanda', factor: 0.55 },
  { code: 'GR', name: 'Grecia', factor: 1.05 },
  { code: 'FI', name: 'Finlandia', factor: 1.22 },
  { code: 'DK', name: 'Dinamarca', factor: 1.16 },
  { code: 'CZ', name: 'Chequia', factor: 0.88 },
];

const SOURCES = [
  {
    id: 'eurostat_gov_10a_exp',
    name: 'Eurostat · Gasto de las administraciones públicas por función (COFOG)',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table',
    license: 'Reutilización libre con cita',
    retrieved_at: '2026-11-19',
  },
  {
    id: 'eurostat_tran_hv_psmod',
    name: 'Eurostat · Reparto modal del transporte interior de viajeros',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_psmod/default/table',
    license: 'Reutilización libre con cita',
    retrieved_at: '2026-11-19',
  },
  {
    id: 'eurostat_educ_uoe_enra',
    name: 'Eurostat · Alumnado matriculado por nivel educativo (ejemplo, pendiente de confirmar)',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/databrowser/explore/all/popul?subtheme=educ.educ_part',
    license: 'Reutilización libre con cita',
    retrieved_at: '2026-11-19',
  },
  {
    id: 'eurostat_hlth_rs_bds',
    name: 'Eurostat · Recursos sanitarios: camas de hospital (ejemplo, pendiente de confirmar)',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/databrowser/explore/all/popul?subtheme=hlth.hlth_care',
    license: 'Reutilización libre con cita',
    retrieved_at: '2026-11-19',
  },
  {
    id: 'boe_datos_abiertos',
    name: 'BOE · API de datos abiertos (legislación consolidada)',
    publisher: 'Agencia Estatal Boletín Oficial del Estado',
    url: 'https://www.boe.es/datosabiertos/',
    license: 'Reutilización libre con cita',
    retrieved_at: '2026-11-19',
  },
];

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

// --- Funciones auxiliares ---------------------------------------------------

const round1 = (n) => Math.round(n * 10) / 10;
const fmt = (n) => String(round1(n)).replace('.', ',');

function amountOf(area, year) {
  // El factor del año, corregido por la tendencia propia del ámbito.
  const yearsBack = LATEST - year;
  return round1(area.amount * YEAR_FACTOR[year] * Math.pow(area.trend, -yearsBack));
}

function totalOf(year) {
  return round1(AREAS.reduce((sum, a) => sum + amountOf(a, year), 0));
}

function pctGdp(area, year) {
  return round1((amountOf(area, year) / GDP_MEUR[year]) * 100);
}

// Valor de un país en % del PIB: se reparte alrededor de la mediana de ese ámbito.
function countryValue(area, year, country) {
  const es = pctGdp(area, year);
  if (country.code === 'ES') return es;
  const median = es / area.eu_ratio;
  return round1((median * country.factor) / 1.11); // 1.11 = mediana de los factores, para centrarlos en 1
}

function medianOf(values) {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : round1((v[mid - 1] + v[mid]) / 2);
}

// Regla 1 (backend): cuota de gasto ÷ cuota de uso frente al umbral del cruce.
function usageAlert(cross, year) {
  const drift = 1 + (year - LATEST) * 0.015; // las cuotas cambian algo de un año a otro
  const spend = round1(cross.spend * drift);
  const use = cross.use;
  const ratio = spend >= use ? spend / use : use / spend;
  if (ratio < cross.threshold) return null;
  return {
    id: `${cross.subarea_id}-usage_mismatch-${cross.key}-${year}`,
    type: 'usage_mismatch',
    severity: ratio >= cross.threshold * 2 ? 'critical' : 'warning',
    area_id: cross.area_id,
    subarea_id: cross.subarea_id,
    year,
    title: cross.title,
    message: cross.message(spend, use),
    evidence: [
      { label: cross.labels[0], value: spend, unit: '%', source_id: cross.sources[0] },
      { label: cross.labels[1], value: use, unit: '%', source_id: cross.sources[1] },
    ],
    analyst_note: cross.note,
    source_ids: cross.sources,
  };
}

// Regla 2 (backend): distancia relativa de España a la mediana UE (≥25 % info, ≥50 % warning).
function internationalAlert(area, year) {
  const values = COUNTRIES.map((c) => countryValue(area, year, c));
  const es = values[0];
  const median = medianOf(values);
  const distance = Math.abs(es - median) / median;
  if (distance < 0.25) return null;
  const more = es > median;
  return {
    id: `${area.id}-international_outlier-${year}`,
    type: 'international_outlier',
    severity: distance >= 0.5 ? 'warning' : 'info',
    area_id: area.id,
    subarea_id: null,
    year,
    title: `${area.name}: España ${more ? 'por encima' : 'por debajo'} de la mediana europea`,
    message: `España dedica a ${area.name.toLowerCase()} el ${fmt(es)} % de su PIB, un ${Math.round(distance * 100)} % ${more ? 'más' : 'menos'} que la mediana de la UE (${fmt(median)} %).`,
    evidence: [
      { label: 'España', value: es, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
      { label: 'Mediana UE', value: median, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
    ],
    analyst_note: area.id === 'GF01'
      ? 'Esta función incluye los intereses de la deuda pública, que dependen de la deuda acumulada más que de las decisiones de cada año.'
      : area.id === 'GF06'
        ? 'En España la vivienda se apoya sobre todo en deducciones fiscales y en las comunidades autónomas, que no siempre se contabilizan en esta función.'
        : null,
    source_ids: ['eurostat_gov_10a_exp'],
  };
}

function alertsOf(year) {
  return [
    ...CROSSES.map((c) => usageAlert(c, year)),
    ...AREAS.map((a) => internationalAlert(a, year)),
  ].filter(Boolean);
}

function pickYear(year) {
  return YEARS.includes(Number(year)) ? Number(year) : LATEST;
}

function bySeverity(a1, a2) {
  return SEVERITY_ORDER[a1.severity] - SEVERITY_ORDER[a2.severity];
}

// --- Respuestas con la forma de cada endpoint ------------------------------

export function meta() {
  return {
    years: YEARS,
    latest_year: LATEST,
    countries: COUNTRIES.map(({ code, name }) => ({ code, name })),
    generated_at: '2026-11-19T13:00:00Z',
  };
}

export function areas(year) {
  const y = pickYear(year);
  const total = totalOf(y);
  const alerts = alertsOf(y);
  return {
    year: y,
    total_meur: total,
    provisional: y >= LATEST - 1,
    areas: AREAS.map((a) => {
      const own = alerts.filter((al) => al.area_id === a.id).sort(bySeverity);
      const amount = amountOf(a, y);
      const prev = YEARS.includes(y - 1) ? amountOf(a, y - 1) : null;
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        amount_meur: amount,
        share_of_total_pct: round1((amount / total) * 100),
        pct_gdp: pctGdp(a, y),
        yoy_change_pct: prev ? round1(((amount - prev) / prev) * 100) : null,
        alert_count: own.length,
        max_severity: own.length ? own[0].severity : null,
      };
    }),
  };
}

export function area(id, year) {
  const y = pickYear(year);
  const a = AREAS.find((x) => x.id === id);
  if (!a) throw new Error(`Área no encontrada: ${id}`);
  const summary = areas(y).areas.find((x) => x.id === id);
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    year: y,
    amount_meur: summary.amount_meur,
    share_of_total_pct: summary.share_of_total_pct,
    pct_gdp: summary.pct_gdp,
    source_id: 'eurostat_gov_10a_exp',
    history: YEARS.map((yy) => ({
      year: yy,
      amount_meur: amountOf(a, yy),
      pct_gdp: pctGdp(a, yy),
      provisional: yy >= LATEST - 1,
    })),
    subareas: (SUBAREAS[id] || []).map((s) => ({
      id: s.id,
      name: s.name,
      amount_meur: round1((summary.amount_meur * s.share) / 100),
      share_of_area_pct: s.share,
    })),
    indicators: INDICATORS[id] || [],
    alerts: alertsOf(y).filter((al) => al.area_id === id).sort(bySeverity),
    legal: y === 2023 || y === 2024
      ? {
          law_title: 'Ley 31/2022, de 23 de diciembre, de Presupuestos Generales del Estado para el año 2023',
          boe_id: 'BOE-A-2022-22128',
          boe_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-22128',
          note: y === 2024 ? 'Presupuesto de 2023, prorrogado en 2024.' : null,
        }
      : null,
  };
}

export function alerts({ year, severity, type } = {}) {
  const y = pickYear(year);
  const list = alertsOf(y)
    .filter((al) => !severity || al.severity === severity)
    .filter((al) => !type || al.type === type)
    .sort(bySeverity);
  return { year: y, count: list.length, alerts: list };
}

export function compare({ area: areaId, year } = {}) {
  const y = pickYear(year);
  const a = AREAS.find((x) => x.id === areaId) || AREAS[0];
  const rows = COUNTRIES
    .map((c) => ({ country: c.code, name: c.name, value: countryValue(a, y, c), provisional: y >= LATEST - 1 }))
    .sort((r1, r2) => r2.value - r1.value)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return {
    area_id: a.id,
    area_name: a.name,
    year: y,
    unit: 'pct_gdp',
    eu_median: medianOf(rows.map((r) => r.value)),
    rows,
    source_id: 'eurostat_gov_10a_exp',
  };
}

export function sources() {
  return { sources: SOURCES };
}
