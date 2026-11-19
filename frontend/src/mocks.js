// Datos de EJEMPLO con la misma forma que docs/API_CONTRACT.md.
// Sirven para trabajar sin backend. Las cifras son ilustrativas, NO son datos reales:
// la interfaz muestra un aviso siempre que se usan.

const YEARS = [2021, 2022, 2023];
const LATEST = 2023;
// Factor para simular la evolución de cada año respecto a 2023.
const YEAR_FACTOR = { 2021: 0.92, 2022: 0.96, 2023: 1 };
// PIB aproximado, solo para calcular un % del PIB coherente en los ejemplos.
const GDP_MEUR = { 2021: 1235000, 2022: 1346000, 2023: 1498000 };

const AREAS = [
  { id: 'GF10', name: 'Protección social', icon: 'users', amount: 289225, description: 'Pensiones, desempleo, familia, dependencia y ayudas sociales.' },
  { id: 'GF07', name: 'Sanidad', icon: 'heart', amount: 95000, description: 'Hospitales, atención primaria, medicamentos y salud pública.' },
  { id: 'GF04', name: 'Asuntos económicos', icon: 'briefcase', amount: 84500, description: 'Transporte, energía, agricultura, industria y apoyo a la economía.' },
  { id: 'GF01', name: 'Servicios públicos generales', icon: 'landmark', amount: 80000, description: 'Funcionamiento de las instituciones, intereses de la deuda y relaciones exteriores.' },
  { id: 'GF09', name: 'Educación', icon: 'book', amount: 62000, description: 'Colegios, institutos, universidades y becas.' },
  { id: 'GF03', name: 'Orden público y seguridad', icon: 'shield', amount: 27000, description: 'Policía, bomberos, juzgados y prisiones.' },
  { id: 'GF02', name: 'Defensa', icon: 'flag', amount: 13000, description: 'Fuerzas armadas y defensa civil.' },
  { id: 'GF05', name: 'Protección del medio ambiente', icon: 'leaf', amount: 12000, description: 'Residuos, aguas residuales, contaminación y biodiversidad.' },
  { id: 'GF08', name: 'Ocio, cultura y religión', icon: 'music', amount: 11000, description: 'Deporte, cultura, medios públicos y actividades recreativas.' },
  { id: 'GF06', name: 'Vivienda y servicios comunitarios', icon: 'home', amount: 6500, description: 'Vivienda, urbanismo, abastecimiento de agua y alumbrado público.' },
];

const SUBAREAS = {
  GF04: [
    { id: 'GF0405', name: 'Transporte', share: 34.2 },
    { id: 'GF0401', name: 'Asuntos económicos generales', share: 28.0 },
    { id: 'GF0402', name: 'Agricultura, pesca y caza', share: 14.5 },
    { id: 'GF0403', name: 'Combustible y energía', share: 11.3 },
  ],
  GF07: [
    { id: 'GF0703', name: 'Servicios hospitalarios', share: 58.0 },
    { id: 'GF0702', name: 'Atención ambulatoria', share: 21.0 },
    { id: 'GF0701', name: 'Medicamentos y material sanitario', share: 16.0 },
    { id: 'GF0704', name: 'Salud pública', share: 3.0 },
  ],
  GF09: [
    { id: 'GF0902', name: 'Educación secundaria', share: 36.0 },
    { id: 'GF0901', name: 'Infantil y primaria', share: 33.0 },
    { id: 'GF0904', name: 'Universidad', share: 18.0 },
  ],
  GF10: [
    { id: 'GF1002', name: 'Vejez', share: 58.0 },
    { id: 'GF1001', name: 'Enfermedad e incapacidad', share: 12.0 },
    { id: 'GF1005', name: 'Desempleo', share: 9.0 },
    { id: 'GF1003', name: 'Supervivencia', share: 8.0 },
  ],
};

const INDICATORS = {
  GF04: [
    { id: 'modal_split_car', name: 'Viajeros que se mueven en coche', value: 84.0, unit: '% de los viajeros-km', year: 2022, source_id: 'eurostat_tran_hv_psmod' },
    { id: 'modal_split_rail', name: 'Viajeros que se mueven en tren', value: 9.3, unit: '% de los viajeros-km', year: 2022, source_id: 'eurostat_tran_hv_psmod' },
    { id: 'modal_split_bus', name: 'Viajeros que se mueven en autobús', value: 6.7, unit: '% de los viajeros-km', year: 2022, source_id: 'eurostat_tran_hv_psmod' },
  ],
};

const ALERTS = [
  {
    id: 'GF0405-usage_mismatch-2023', type: 'usage_mismatch', severity: 'warning', area_id: 'GF04', subarea_id: 'GF0405',
    title: 'El gasto en ferrocarril no se corresponde con su uso',
    message: 'El tren recibe el 55% de la inversión en transporte y mueve el 9% de los viajeros.',
    evidence: [
      { label: 'Cuota de gasto', value: 55.0, unit: '%', source_id: 'eurostat_gov_10a_exp' },
      { label: 'Cuota de uso', value: 9.3, unit: '%', source_id: 'eurostat_tran_hv_psmod' },
    ],
    analyst_note: 'Las infraestructuras ferroviarias tienen un coste inicial alto y se usan durante décadas; una cuota de gasto mayor que la de uso puede ser razonable en años de construcción.',
    source_ids: ['eurostat_gov_10a_exp', 'eurostat_tran_hv_psmod'],
  },
  {
    id: 'GF01-international_outlier-2023', type: 'international_outlier', severity: 'critical', area_id: 'GF01', subarea_id: null,
    title: 'Servicios generales por encima de la mediana europea',
    message: 'España dedica a servicios públicos generales bastante más que la mediana de la UE, en % del PIB.',
    evidence: [
      { label: 'España', value: 5.3, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
      { label: 'Mediana UE', value: 4.1, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
    ],
    analyst_note: 'Esta función incluye los intereses de la deuda pública, que dependen del nivel de deuda acumulado más que de las decisiones de cada año.',
    source_ids: ['eurostat_gov_10a_exp'],
  },
  {
    id: 'GF09-international_outlier-2023', type: 'international_outlier', severity: 'warning', area_id: 'GF09', subarea_id: null,
    title: 'Educación por debajo de la mediana europea',
    message: 'España dedica a educación menos que la mediana de la UE, en % del PIB.',
    evidence: [
      { label: 'España', value: 4.1, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
      { label: 'Mediana UE', value: 4.7, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
    ],
    analyst_note: null,
    source_ids: ['eurostat_gov_10a_exp'],
  },
  {
    id: 'GF04-international_outlier-2023', type: 'international_outlier', severity: 'info', area_id: 'GF04', subarea_id: null,
    title: 'Asuntos económicos, cerca de la media europea',
    message: 'La diferencia con la mediana de la UE es pequeña, pero ha cambiado respecto al año anterior.',
    evidence: [
      { label: 'España', value: 5.6, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
      { label: 'Mediana UE', value: 5.2, unit: '% del PIB', source_id: 'eurostat_gov_10a_exp' },
    ],
    analyst_note: null,
    source_ids: ['eurostat_gov_10a_exp'],
  },
];

const COUNTRIES = [
  { code: 'ES', name: 'España', factor: 1 },
  { code: 'FR', name: 'Francia', factor: 1.3 },
  { code: 'DE', name: 'Alemania', factor: 1.12 },
  { code: 'IT', name: 'Italia', factor: 1.15 },
  { code: 'PT', name: 'Portugal', factor: 0.95 },
  { code: 'NL', name: 'Países Bajos', factor: 1.02 },
  { code: 'BE', name: 'Bélgica', factor: 1.2 },
  { code: 'AT', name: 'Austria', factor: 1.18 },
  { code: 'SE', name: 'Suecia', factor: 1.1 },
  { code: 'PL', name: 'Polonia', factor: 0.9 },
  { code: 'IE', name: 'Irlanda', factor: 0.55 },
  { code: 'GR', name: 'Grecia', factor: 1.05 },
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

function amountOf(area, year) {
  return round1(area.amount * YEAR_FACTOR[year]);
}

function totalOf(year) {
  return round1(AREAS.reduce((sum, a) => sum + amountOf(a, year), 0));
}

function alertsOf(year) {
  // Los avisos de ejemplo solo existen para el último año.
  return year === LATEST ? ALERTS.map((a) => ({ ...a, year })) : [];
}

function pickYear(year) {
  return YEARS.includes(Number(year)) ? Number(year) : LATEST;
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
    provisional: y === LATEST,
    areas: AREAS.map((a) => {
      const own = alerts.filter((al) => al.area_id === a.id);
      const amount = amountOf(a, y);
      const prev = YEARS.includes(y - 1) ? amountOf(a, y - 1) : null;
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        amount_meur: amount,
        share_of_total_pct: round1((amount / total) * 100),
        pct_gdp: round1((amount / GDP_MEUR[y]) * 100),
        yoy_change_pct: prev ? round1(((amount - prev) / prev) * 100) : null,
        alert_count: own.length,
        max_severity: own.length ? own.map((al) => al.severity).sort((s1, s2) => SEVERITY_ORDER[s1] - SEVERITY_ORDER[s2])[0] : null,
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
      pct_gdp: round1((amountOf(a, yy) / GDP_MEUR[yy]) * 100),
      provisional: yy === LATEST,
    })),
    subareas: (SUBAREAS[id] || []).map((s) => ({
      id: s.id,
      name: s.name,
      amount_meur: round1((summary.amount_meur * s.share) / 100),
      share_of_area_pct: s.share,
    })),
    indicators: INDICATORS[id] || [],
    alerts: alertsOf(y).filter((al) => al.area_id === id),
    legal: y === 2023
      ? {
          law_title: 'Ley 31/2022, de 23 de diciembre, de Presupuestos Generales del Estado para el año 2023',
          boe_id: 'BOE-A-2022-22128',
          boe_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-22128',
          note: 'Presupuesto de 2023, prorrogado en ejercicios posteriores.',
        }
      : null,
  };
}

export function alerts({ year, severity, type } = {}) {
  const y = pickYear(year);
  const list = alertsOf(y)
    .filter((al) => !severity || al.severity === severity)
    .filter((al) => !type || al.type === type)
    .sort((a1, a2) => SEVERITY_ORDER[a1.severity] - SEVERITY_ORDER[a2.severity]);
  return { year: y, count: list.length, alerts: list };
}

export function compare({ area: areaId, year } = {}) {
  const y = pickYear(year);
  const a = AREAS.find((x) => x.id === areaId) || AREAS[0];
  const esPct = round1((amountOf(a, y) / GDP_MEUR[y]) * 100);
  const rows = COUNTRIES
    .map((c) => ({ country: c.code, name: c.name, value: round1(esPct * c.factor), provisional: y === LATEST }))
    .sort((r1, r2) => r2.value - r1.value)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const values = rows.map((r) => r.value).sort((v1, v2) => v1 - v2);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : round1((values[mid - 1] + values[mid]) / 2);
  return { area_id: a.id, area_name: a.name, year: y, unit: 'pct_gdp', eu_median: median, rows, source_id: 'eurostat_gov_10a_exp' };
}

export function sources() {
  return { sources: SOURCES };
}
