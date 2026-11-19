// Datos de EJEMPLO de los Presupuestos Generales del Estado, con la forma de las rutas
// /budget de docs/API_CONTRACT.md (v1.1). Los importes son ilustrativos (la interfaz lo avisa).
// Sí se respeta la estructura real: prórrogas en 2019, 2024 y 2025 (sin Seguridad Social),
// 2020 sin documento, fondos europeos desde 2021 y los Gobiernos de cada año.

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

// Documento de cada año: Ley, Prorroga o null (2020: Hacienda no publicó documento).
const DOCUMENT = { 2019: 'Prorroga', 2020: null, 2024: 'Prorroga', 2025: 'Prorroga' };
const documentOf = (y) => (y in DOCUMENT ? DOCUMENT[y] : 'Ley');

// Total sin Seguridad Social, en miles de millones (ilustrativo).
const BASE_BN = { 2015: 304, 2016: 296, 2017: 298, 2018: 300, 2019: 300, 2021: 378, 2022: 346, 2023: 380, 2024: 375, 2025: 375 };
const EU_BN = { 2021: 22, 2022: 25, 2023: 27, 2024: 23, 2025: 23 };
const SS_FACTOR = 1.5; // con Seguridad Social el total crece un 50 % (solo años con Ley)

const NOTES = {
  2017: 'Aprobada en junio de 2017: el primer semestre rigió el presupuesto prorrogado de 2016.',
  2018: 'Aprobada en julio de 2018: el primer semestre rigió el presupuesto prorrogado de 2017.',
  2019: 'Sin ley nueva: se prorrogó el presupuesto de 2018.',
  2020: 'Sin ley nueva: siguió prorrogado el presupuesto de 2018. Hacienda no publica documento de prórroga para 2020.',
  2024: 'Sin ley nueva: se prorrogó el presupuesto de 2023.',
  2025: 'Sin ley nueva: siguió prorrogado el presupuesto de 2023.',
};

// Gobiernos (datos públicos) y quién elaboró y ejecutó cada presupuesto.
const GOVERNMENTS = [
  { id: 'rajoy_2011', president: 'Mariano Rajoy Brey', parties: ['PP'], start: '2011-12-21', end: '2016-10-31' },
  { id: 'rajoy_2016', president: 'Mariano Rajoy Brey', parties: ['PP'], start: '2016-10-31', end: '2018-06-02' },
  { id: 'sanchez_2018', president: 'Pedro Sánchez Pérez-Castejón', parties: ['PSOE'], start: '2018-06-02', end: '2020-01-08' },
  { id: 'sanchez_2020', president: 'Pedro Sánchez Pérez-Castejón', parties: ['PSOE', 'Unidas Podemos'], start: '2020-01-08', end: '2023-11-17' },
  { id: 'sanchez_2023', president: 'Pedro Sánchez Pérez-Castejón', parties: ['PSOE', 'Sumar'], start: '2023-11-17', end: null },
].map((g) => ({ ...g, appointment_boe_id: null, appointment_boe_url: null, coalition_boe_id: null, party_source_url: null, coalition_source_url: null, note: null }));

const DRAFTED_BY = {
  2015: 'rajoy_2011', 2016: 'rajoy_2011', 2017: 'rajoy_2016', 2018: 'rajoy_2016', 2019: 'rajoy_2016', 2020: 'rajoy_2016',
  2021: 'sanchez_2020', 2022: 'sanchez_2020', 2023: 'sanchez_2020', 2024: 'sanchez_2020', 2025: 'sanchez_2020',
};
const EXECUTED_BY = {
  2015: [['rajoy_2011', 365]],
  2016: [['rajoy_2011', 304], ['rajoy_2016', 62]],
  2017: [['rajoy_2016', 365]],
  2018: [['rajoy_2016', 152], ['sanchez_2018', 213]],
  2019: [['sanchez_2018', 365]],
  2020: [['sanchez_2018', 7], ['sanchez_2020', 359]],
  2021: [['sanchez_2020', 365]],
  2022: [['sanchez_2020', 365]],
  2023: [['sanchez_2020', 320], ['sanchez_2023', 45]],
  2024: [['sanchez_2023', 366]],
  2025: [['sanchez_2023', 365]],
};

// Políticas de gasto. weight: parte del total sin Seguridad Social; ss: parte de lo que
// añade la Seguridad Social; eu: parte de los fondos europeos. Cada columna suma 1.
const POLICIES = [
  { id: '95', name: 'Deuda pública', area_id: 'GF01', weight: 0.387, ss: 0, eu: 0 },
  { id: '94', name: 'Transferencias a otras administraciones públicas', area_id: 'GF01', weight: 0.17, ss: 0, eu: 0.02 },
  { id: '21', name: 'Pensiones', area_id: 'GF10', weight: 0.06, ss: 0.85, eu: 0 },
  { id: '92', name: 'Servicios de carácter general', area_id: 'GF01', weight: 0.07, ss: 0, eu: 0.01 },
  { id: '25', name: 'Desempleo', area_id: 'GF10', weight: 0.06, ss: 0, eu: 0 },
  { id: '46', name: 'Investigación, desarrollo, innovación y digitalización', area_id: 'GF04', weight: 0.045, ss: 0, eu: 0.3 },
  { id: '45', name: 'Infraestructuras', area_id: 'GF04', weight: 0.034, ss: 0, eu: 0.17 },
  { id: '12', name: 'Defensa', area_id: 'GF02', weight: 0.033, ss: 0, eu: 0.01 },
  { id: '13', name: 'Seguridad ciudadana e instituciones penitenciarias', area_id: 'GF03', weight: 0.029, ss: 0, eu: 0.01 },
  { id: '42', name: 'Industria y energía', area_id: 'GF04', weight: 0.027, ss: 0, eu: 0.16 },
  { id: '22', name: 'Otras prestaciones económicas', area_id: 'GF10', weight: 0.004, ss: 0.1, eu: 0 },
  { id: '31', name: 'Sanidad', area_id: 'GF07', weight: 0.014, ss: 0.02, eu: 0.03 },
  { id: '32', name: 'Educación', area_id: 'GF09', weight: 0.014, ss: 0, eu: 0.05 },
  { id: '26', name: 'Acceso a la vivienda y fomento de la edificación', area_id: 'GF06', weight: 0.009, ss: 0, eu: 0.1 },
  { id: '23', name: 'Servicios sociales y promoción social', area_id: 'GF10', weight: 0.009, ss: 0.03, eu: 0.05 },
  { id: '33', name: 'Cultura', area_id: 'GF08', weight: 0.005, ss: 0, eu: 0.01 },
  { id: '11', name: 'Justicia', area_id: 'GF03', weight: 0.006, ss: 0, eu: 0.01 },
  { id: '29', name: 'Gestión y administración de la Seguridad Social', area_id: 'GF10', weight: 0.001, ss: 0.0, eu: 0 },
  { id: '41', name: 'Agricultura, pesca y alimentación', area_id: 'GF04', weight: 0.023, ss: 0, eu: 0.07 },
];

// Programas de algunas políticas (las demás llevan uno genérico). weight: parte de su política.
const PROGRAMS = {
  '45': [
    { program_id: '453A', name: 'Infraestructura del transporte ferroviario', section: 'MINISTERIO DE TRANSPORTES Y MOVILIDAD SOSTENIBLE', weight: 0.4 },
    { program_id: '453B', name: 'Creación de infraestructura de carreteras', section: 'MINISTERIO DE TRANSPORTES Y MOVILIDAD SOSTENIBLE', weight: 0.3 },
    { program_id: '453C', name: 'Conservación y explotación de carreteras', section: 'MINISTERIO DE TRANSPORTES Y MOVILIDAD SOSTENIBLE', weight: 0.2 },
    { program_id: '452A', name: 'Gestión e infraestructuras del agua', section: 'MINISTERIO PARA LA TRANSICIÓN ECOLÓGICA', weight: 0.1 },
  ],
  '31': [
    { program_id: '312A', name: 'Asistencia sanitaria del mutualismo administrativo', section: 'MINISTERIO DE INCLUSIÓN, SEGURIDAD SOCIAL Y MIGRACIONES', weight: 0.6 },
    { program_id: '313B', name: 'Salud pública, sanidad exterior y calidad', section: 'MINISTERIO DE SANIDAD', weight: 0.25 },
    { program_id: '311M', name: 'Dirección y servicios generales de sanidad', section: 'MINISTERIO DE SANIDAD', weight: 0.15 },
  ],
  '32': [
    { program_id: '323M', name: 'Becas y ayudas a estudiantes', section: 'MINISTERIO DE EDUCACIÓN Y FORMACIÓN PROFESIONAL', weight: 0.5 },
    { program_id: '322C', name: 'Enseñanzas universitarias', section: 'MINISTERIO DE CIENCIA, INNOVACIÓN Y UNIVERSIDADES', weight: 0.3 },
    { program_id: '322B', name: 'Educación secundaria y formación profesional', section: 'MINISTERIO DE EDUCACIÓN Y FORMACIÓN PROFESIONAL', weight: 0.2 },
  ],
};

function programsOf(policy) {
  return PROGRAMS[policy.id] ?? [{ program_id: `${policy.id}0A`, name: `Programa principal de ${policy.name.toLowerCase()}`, section: 'VARIOS MINISTERIOS', weight: 1 }];
}

// Reparto de un programa por capítulos (código económico de nivel 1) y algunos artículos.
const CHAPTERS = [
  { code: '1', description: 'GASTOS DE PERSONAL', weight: 0.12, children: [['12', 'Funcionarios', 0.6], ['13', 'Laborales', 0.4]] },
  { code: '2', description: 'GASTOS CORRIENTES EN BIENES Y SERVICIOS', weight: 0.08, children: [['22', 'Material, suministros y otros', 1]] },
  { code: '4', description: 'TRANSFERENCIAS CORRIENTES', weight: 0.3, children: [['45', 'A comunidades autónomas', 0.7], ['48', 'A familias e instituciones sin fines de lucro', 0.3]] },
  { code: '6', description: 'INVERSIONES REALES', weight: 0.35, children: [['60', 'Inversión nueva en infraestructuras', 0.8], ['61', 'Inversión de reposición', 0.2]] },
  { code: '7', description: 'TRANSFERENCIAS DE CAPITAL', weight: 0.15, children: [['75', 'A comunidades autónomas', 1]] },
];

const round2 = (n) => Math.round(n * 100) / 100;
const BN = 1e6; // mil millones en miles de euros

function pickYear(year) {
  return YEARS.includes(Number(year)) ? Number(year) : YEARS[YEARS.length - 1];
}

function yearTotals(y) {
  const doc = documentOf(y);
  if (doc === null) return { total_keur: null, total_without_social_security_keur: null, eu_recovery_keur: null };
  const base = BASE_BN[y] * BN;
  return {
    total_keur: round2(doc === 'Ley' ? base * SS_FACTOR : base),
    total_without_social_security_keur: round2(base),
    eu_recovery_keur: round2((EU_BN[y] ?? 0) * BN),
  };
}

function yearRow(y) {
  return {
    year: y,
    document: documentOf(y),
    includes_social_security: documentOf(y) === 'Ley',
    ...yearTotals(y),
    drafted_by: DRAFTED_BY[y],
    executed_by: EXECUTED_BY[y].map(([government_id, days]) => ({ government_id, days })),
    note: NOTES[y] ?? null,
  };
}

function policyTotals(policy, y) {
  const t = yearTotals(y);
  if (t.total_keur === null) return { total_keur: null, total_without_social_security_keur: null, eu_recovery_keur: null };
  const without = t.total_without_social_security_keur * policy.weight;
  const ss = (t.total_keur - t.total_without_social_security_keur) * policy.ss;
  return {
    total_keur: round2(without + ss),
    total_without_social_security_keur: round2(without),
    eu_recovery_keur: round2(t.eu_recovery_keur * policy.eu),
  };
}

// --- Respuestas con la forma de cada ruta -----------------------------------

export const budgetMeta = { budget_years: YEARS, latest_budget_year: YEARS[YEARS.length - 1] };

export function budgetYears() {
  return { years: YEARS.map(yearRow), governments: GOVERNMENTS };
}

export function budget(year) {
  const y = pickYear(year);
  const row = yearRow(y);
  const policies =
    row.document === null
      ? []
      : POLICIES.map((p) => {
          const t = policyTotals(p, y);
          return {
            id: p.id,
            name: p.name,
            area_id: p.area_id,
            ...t,
            share_of_total_pct: Math.round((t.total_keur / row.total_keur) * 1000) / 10,
            program_count: programsOf(p).length,
          };
        }).sort((a, b) => b.total_keur - a.total_keur);
  return { ...row, legal: null, source_id: 'sepg_pge_estado_gastos', policies };
}

// Para /areas/{id}: las políticas que corresponden a un ámbito, con su total del año.
export function policiesOfArea(areaId, year) {
  return POLICIES.filter((p) => p.area_id === areaId)
    .map((p) => ({ id: p.id, name: p.name, area_id: p.area_id, ...policyTotals(p, year) }))
    .sort((a, b) => (b.total_keur ?? 0) - (a.total_keur ?? 0));
}

export function policy(id, year) {
  const y = pickYear(year);
  const p = POLICIES.find((x) => x.id === id);
  if (!p) throw new Error(`Política no encontrada: ${id}`);
  const t = policyTotals(p, y);
  return {
    id: p.id,
    name: p.name,
    area_id: p.area_id,
    year: y,
    ...t,
    source_id: 'sepg_pge_estado_gastos',
    history: YEARS.map((yy) => ({ year: yy, document: documentOf(yy), ...policyTotals(p, yy) })),
    programs:
      t.total_keur === null
        ? []
        : programsOf(p).map((pr) => ({
            program_id: pr.program_id,
            name: pr.name,
            section_names: [pr.section],
            total_keur: round2(t.total_keur * pr.weight),
            eu_recovery_keur: round2(t.eu_recovery_keur * pr.weight),
          })),
  };
}

export function program(programId, year) {
  const y = pickYear(year);
  const p = POLICIES.find((x) => programsOf(x).some((pr) => pr.program_id === programId));
  const pr = p && programsOf(p).find((x) => x.program_id === programId);
  const t = p && policyTotals(p, y);
  if (!pr || t.total_keur === null) throw new Error(`Programa no encontrado en ${y}: ${programId}`);
  const total = round2(t.total_keur * pr.weight);
  const organicId = '17.38';
  const lines = CHAPTERS.flatMap((c) => {
    const amount = round2(total * c.weight);
    return [
      { organic_id: organicId, economic_code: c.code, level: 1, description: c.description, amount_keur: amount },
      ...c.children.map(([code, description, w]) => ({ organic_id: organicId, economic_code: code, level: 2, description, amount_keur: round2(amount * w) })),
    ];
  });
  return {
    program_id: pr.program_id,
    name: pr.name,
    year: y,
    document: documentOf(y),
    policy_id: p.id,
    policy_name: p.name,
    total_keur: total,
    eu_recovery_keur: round2(t.eu_recovery_keur * pr.weight),
    source_id: 'sepg_pge_estado_gastos',
    sections: [
      {
        section_id: '17',
        section_name: pr.section,
        total_keur: total,
        organics: [{ organic_id: organicId, name: 'DIRECCIÓN GENERAL (EJEMPLO)', total_keur: total, undetailed_keur: 0 }],
        lines,
      },
    ],
  };
}

// Resumen de todos los programas de ejemplo de un año, con su política.
function programSummaries(y) {
  return POLICIES.flatMap((p) => {
    const t = policyTotals(p, y);
    if (t.total_keur === null) return [];
    return programsOf(p).map((pr) => ({
      program_id: pr.program_id,
      name: pr.name,
      policy_id: p.id,
      policy_name: p.name,
      section_names: [pr.section],
      total_keur: round2(t.total_keur * pr.weight),
      eu_recovery_keur: round2(t.eu_recovery_keur * pr.weight),
    }));
  });
}

// Como el backend, pero solo por nombre de programa (los datos de ejemplo no traen partidas reales).
export function search(q, year) {
  const y = pickYear(year);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = programSummaries(y)
    .filter((pr) => words.every((w) => `${pr.program_id} ${pr.name}`.toLowerCase().includes(w)))
    .map((pr) => ({ ...pr, name_match: true, matched_bodies: [], line_match_count: 0, lines: [] }));
  return {
    query: q,
    year: y,
    document: documentOf(y),
    program_count: results.length,
    source_id: results.length ? 'sepg_pge_estado_gastos' : null,
    results,
  };
}

export function euRecovery(year) {
  const y = pickYear(year);
  const totals = yearTotals(y);
  const programs = programSummaries(y)
    .filter((pr) => pr.eu_recovery_keur > 0)
    .sort((a, b) => b.eu_recovery_keur - a.eu_recovery_keur);
  const policies = POLICIES.map((p) => ({ id: p.id, name: p.name, area_id: p.area_id, ...policyTotals(p, y) }))
    .filter((p) => p.eu_recovery_keur > 0)
    .map((p) => ({ ...p, share_of_eu_recovery_pct: Math.round((p.eu_recovery_keur / totals.eu_recovery_keur) * 1000) / 10 }))
    .sort((a, b) => b.eu_recovery_keur - a.eu_recovery_keur);
  return {
    year: y,
    document: documentOf(y),
    eu_recovery_keur: totals.eu_recovery_keur,
    total_without_social_security_keur: totals.total_without_social_security_keur,
    share_of_state_budget_pct: totals.eu_recovery_keur
      ? Math.round((totals.eu_recovery_keur / totals.total_without_social_security_keur) * 1000) / 10
      : null,
    source_id: programs.length ? 'sepg_pge_estado_gastos' : null,
    policies,
    programs,
  };
}
