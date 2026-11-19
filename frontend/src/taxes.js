// Calculadora de impuestos de un asalariado: cuánto paga al año y a qué ámbitos va ese dinero.
// Normas de 2025. Es una estimación: simplifica la declaración real (ver LIMITS más abajo).
// Cada regla lleva su fuente oficial en TAX_SOURCES.

// --- Cotización a la Seguridad Social (Orden PJC/178/2025) ---------------------------------
// Tipos en % del sueldo bruto. Trabajador: contingencias comunes 4,70 + desempleo 1,55
// (1,60 si el contrato es temporal) + formación profesional 0,10 + MEI 0,13.
// Empresa: 23,60 + desempleo 5,50 (6,70 temporal) + FOGASA 0,20 + FP 0,60 + MEI 0,67.
// No se incluye la cuota de accidentes de trabajo, que depende de la actividad de la empresa.
const SS_RATES = {
  indefinido: { worker: 6.48, employer: 30.57 },
  temporal: { worker: 6.53, employer: 31.77 },
};
const SS_MAX_BASE_YEAR = 4909.5 * 12; // base máxima de cotización: 4.909,50 € al mes

// --- IRPF (Ley 35/2006) ------------------------------------------------------------------------
// Escala general: tramo estatal + tramo autonómico de referencia sumados. Cada comunidad
// autónoma ajusta su parte, así que el resultado real varía unos cientos de euros.
const IRPF_SCALE = [
  { upTo: 12450, rate: 19 },
  { upTo: 20200, rate: 24 },
  { upTo: 35200, rate: 30 },
  { upTo: 60000, rate: 37 },
  { upTo: 300000, rate: 45 },
  { upTo: Infinity, rate: 47 },
];
const OTHER_EXPENSES = 2000; // art. 19: gastos deducibles de todo asalariado
const PERSONAL_MIN = 5550; // art. 57: mínimo personal
const AGE_MIN_EXTRA = { menos65: 0, de65a74: 1150, desde75: 1150 + 1400 };
const CHILD_MIN = [2400, 2700, 4000, 4500]; // art. 58: primer, segundo, tercer y cuarto hijo o más
const CHILD_UNDER3_EXTRA = 2800;

// --- IVA (Ley 37/1992) ---------------------------------------------------------------------------
// El IVA va dentro del precio: de cada 110 € con IVA del 10 %, 10 € son impuesto.
export const VAT_GROUPS = [
  { key: 'exempt', rate: 0, label: 'Vivienda, seguros, colegio y médico', hint: 'Sin IVA: alquiler o hipoteca, seguros, enseñanza y sanidad.' },
  { key: 'reduced', rate: 10, label: 'Comida, restaurantes y transporte', hint: 'IVA reducido del 10 % (los alimentos básicos pagan un 4 %, aquí se redondea al 10 %).' },
  { key: 'general', rate: 21, label: 'Luz, ropa, ocio, tecnología y el resto', hint: 'IVA general del 21 %.' },
];

export const LIMITS = [
  'El IRPF usa la escala estatal y la autonómica de referencia; tu comunidad puede cambiarla un poco.',
  'Los mínimos por hijos se aplican enteros; si la otra persona progenitora también declara, se reparten a medias.',
  'No se cuentan deducciones (vivienda, donativos, planes de pensiones…), ni impuestos especiales (gasolina, tabaco, alcohol), ni el IBI u otros tributos locales.',
  'El reparto entre ámbitos es proporcional al gasto de todas las administraciones: el dinero público es una caja común y una parte del gasto se paga con deuda, así que es una aproximación, no un recibo.',
];

export const TAX_SOURCES = [
  { name: 'Ley 35/2006 del IRPF (escala, mínimos y reducciones)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764' },
  { name: 'Ley 37/1992 del IVA (tipos del 21 %, 10 % y 4 %)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740' },
  { name: 'Seguridad Social: bases y tipos de cotización de 2025', url: 'https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537' },
];

// Aplica la escala por tramos: cada parte de la base paga el tipo de su tramo.
function applyScale(base) {
  let tax = 0;
  let from = 0;
  for (const { upTo, rate } of IRPF_SCALE) {
    if (base <= from) break;
    tax += ((Math.min(base, upTo) - from) * rate) / 100;
    from = upTo;
  }
  return tax;
}

// Art. 20: reducción por obtener rendimientos del trabajo (ayuda a los sueldos bajos).
function workReduction(netIncome) {
  if (netIncome <= 14852) return 7302;
  if (netIncome <= 17673.52) return 7302 - 1.75 * (netIncome - 14852);
  if (netIncome <= 19747.5) return 2364.34 - 1.14 * (netIncome - 17673.52);
  return 0;
}

function familyMinimum({ age, children, childrenUnder3 }) {
  let min = PERSONAL_MIN + AGE_MIN_EXTRA[age];
  for (let i = 0; i < children; i++) min += CHILD_MIN[Math.min(i, CHILD_MIN.length - 1)];
  return min + Math.min(childrenUnder3, children) * CHILD_UNDER3_EXTRA;
}

// Entrada: lo que responde la persona en el formulario. Salida: euros al año.
export function computeTaxes(input) {
  const gross = input.monthlyGross * input.payments;
  const rates = SS_RATES[input.contract];
  const contributionBase = Math.min(gross, SS_MAX_BASE_YEAR);
  const ssWorker = (contributionBase * rates.worker) / 100;
  const ssEmployer = input.includeEmployer ? (contributionBase * rates.employer) / 100 : 0;

  // IRPF: base = bruto − cotización − gastos − reducción; luego la escala menos la del mínimo.
  const netIncome = Math.max(0, gross - ssWorker - OTHER_EXPENSES);
  const base = Math.max(0, netIncome - Math.min(workReduction(netIncome), netIncome));
  const minimum = familyMinimum(input);
  const irpf = Math.max(0, applyScale(base) - applyScale(Math.min(minimum, base)));

  const net = gross - ssWorker - irpf;
  const vat = VAT_GROUPS.reduce((sum, g) => sum + (input.spending[g.key] || 0) * 12 * (g.rate / (100 + g.rate)), 0);
  const vatCapped = Math.min(vat, net); // no se puede pagar más IVA del que permite el sueldo
  const total = irpf + ssWorker + ssEmployer + vatCapped;

  return {
    gross,
    ssWorker,
    ssEmployer,
    irpf,
    vat: vatCapped,
    net,
    left: net - vatCapped,
    total,
    // Tipo efectivo: qué parte del coste total del sueldo acaba en impuestos.
    effectivePct: gross + ssEmployer > 0 ? (total / (gross + ssEmployer)) * 100 : 0,
  };
}

// Reparte el total entre los ámbitos según su peso en el gasto público de ese año.
export function splitByArea(total, areas) {
  return [...areas]
    .filter((a) => a.share_of_total_pct != null)
    .sort((a, b) => b.share_of_total_pct - a.share_of_total_pct)
    .map((a) => ({ id: a.id, name: a.name, share: a.share_of_total_pct, amount: (total * a.share_of_total_pct) / 100 }));
}
