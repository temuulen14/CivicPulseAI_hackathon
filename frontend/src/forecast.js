import { getAlerts, getArea, getCompare } from './api.js';
import { useApi } from './useApi.js';
import { cached, getAreasCached } from './useAllYears.js';
import { formatPct } from './format.js';

// Previsión de riesgos: qué servicios públicos pueden dar problemas más adelante.
//
// No es un modelo estadístico ni una predicción oficial: es una regla sencilla y explicable
// que suma "señales de alerta temprana" de los datos que ya enseña la web. La idea: los
// problemas de un servicio (averías, accidentes, listas de espera) suelen llegar después de
// años de avisos repetidos, de inversión que cae o de quedarse por detrás de Europa.
// Si esta web hubiera existido antes, estas señales se habrían visto con años de antelación.
//
// Se calcula con los datos HASTA un año de corte (`cutoff`) y se compara con unos años antes
// (`base`), así se puede comprobar con el pasado: "¿qué habría dicho en 2019?".

// Además de los diez grandes ámbitos, servicios concretos que el ciudadano usa a diario
// (subámbitos COFOG). Ahí es donde un problema se nota: trenes, hospitales, agua, juzgados…
export const SERVICES = ['GF0405', 'GF0703', 'GF0702', 'GF0901', 'GF0902', 'GF0904', 'GF0301', 'GF0302', 'GF0303', 'GF0304', 'GF0603', 'GF0502', 'GF0501'];

export const WINDOW = 5; // años hacia atrás para medir tendencias
const INVESTMENT = 'OP5ANP'; // tipo de gasto "Inversión" (Eurostat)

export const LEVELS = [
  { min: 4, key: 'high', label: 'Riesgo alto' },
  { min: 2, key: 'medium', label: 'Vigilar' },
  { min: 1, key: 'low', label: 'Señal leve' },
  { min: 0, key: 'none', label: 'Sin señales' },
];
export const levelOf = (score) => LEVELS.find((l) => score >= l.min);

// Grupos de señales, para la tabla resumen.
export const SIGNAL_GROUPS = [
  { key: 'alerts', label: 'Avisos repetidos' },
  { key: 'europe', label: 'Por detrás de la UE' },
  { key: 'investment', label: 'Inversión a la baja' },
  { key: 'weight', label: 'Pierde peso en el PIB' },
];

const pct = (v) => formatPct(v);
const rel = (now, before) => (now == null || !before ? null : ((now - before) / before) * 100);

// Inversión de un ámbito en % del PIB: parte de la inversión sobre el gasto del ámbito × su % del PIB.
// En % del PIB no le afecta la inflación, así que se puede comparar entre años.
function investmentPctGdp(area) {
  const inv = area?.spending_by_type?.find((t) => t.type_id === INVESTMENT);
  if (!inv || !area.amount_meur || area.pct_gdp == null) return null;
  return (inv.amount_meur / area.amount_meur) * area.pct_gdp;
}

// Solo cuentan los avisos que apuntan a falta de recursos: gasto frente a uso, o gastar
// MENOS que la mediana europea. Gastar más que Europa (p. ej. medio ambiente) no es un riesgo.
function isRiskAlert(a) {
  if (a.type !== 'international_outlier') return true;
  const [es, median] = a.evidence ?? [];
  return es?.value != null && median?.value != null && es.value < median.value;
}

const spainOf = (cmp) => cmp?.rows.find((r) => r.country === 'ES')?.value ?? null;

// Señales de un ámbito. Cada señal suma puntos y trae una frase con sus cifras.
export function signalsFor({ id, cutoff, base, alertsByYear, areaNow, areaBase, cmpNow, cmpBase, gdpNow, gdpBase }) {
  const signals = [];
  const add = (group, points, text) => signals.push({ group, points, text });

  // 1. Avisos: que haya avisos ahora y, sobre todo, que se repitan año tras año.
  const yearsWithAlerts = Object.entries(alertsByYear)
    .filter(([y, list]) => Number(y) >= base && Number(y) <= cutoff && list.some((a) => a.area_id === id && isRiskAlert(a)))
    .map(([y]) => Number(y));
  const nowAlerts = (alertsByYear[cutoff] ?? []).filter((a) => a.area_id === id && isRiskAlert(a));
  if (nowAlerts.length) {
    const serious = nowAlerts.some((a) => a.severity !== 'info');
    add('alerts', serious ? 2 : 1, `${nowAlerts.length === 1 ? 'Tiene un aviso' : `Tiene ${nowAlerts.length} avisos`} en ${cutoff}${serious ? ', alguno serio' : ''}.`);
  }
  if (yearsWithAlerts.length >= 3) {
    add('alerts', 1, `Ha tenido avisos ${yearsWithAlerts.length} de los últimos ${cutoff - base + 1} años: no es algo puntual.`);
  }

  // 2. Europa: gasta bastante menos que la mediana de la UE, y la distancia crece.
  const esNow = spainOf(cmpNow);
  const medNow = cmpNow?.eu_median ?? null;
  const gapNow = rel(esNow, medNow);
  const gapBase = rel(spainOf(cmpBase), cmpBase?.eu_median ?? null);
  // Con menos de 0,3 % del PIB el redondeo a un decimal da diferencias falsas (0,1 frente a 0,2).
  if (gapNow != null && medNow >= 0.3 && gapNow <= -15) {
    add('europe', 1, `España le dedica el ${pct(esNow)} del PIB; la mediana de la UE, el ${pct(medNow)} (${Math.round(Math.abs(gapNow))} % menos).`);
    if (gapBase != null && gapBase < 0 && gapNow < gapBase - 5) {
      add('europe', 1, `Y la distancia crece: en ${base} era un ${Math.round(Math.abs(gapBase))} % menos.`);
    }
  }

  // 3. Inversión: la que mantiene vías, hospitales o equipos. Si cae varios años, el desgaste
  //    no se ve enseguida, pero se acumula (el ejemplo clásico: el mantenimiento ferroviario).
  const invNow = investmentPctGdp(areaNow);
  const invBase = investmentPctGdp(areaBase);
  const invChange = rel(invNow, invBase);
  if (invChange != null && invBase >= 0.05 && invChange <= -15) {
    add(
      'investment',
      invChange <= -30 ? 2 : 1,
      `La inversión bajó del ${invBase.toFixed(2).replace('.', ',')} % al ${invNow.toFixed(2).replace('.', ',')} % del PIB entre ${base} y ${cutoff} (${Math.round(invChange)} %).`,
    );
  }

  // 4. Peso en el PIB: el ámbito recibe una parte cada vez menor de la riqueza del país.
  if (gdpNow != null && gdpBase != null && gdpNow - gdpBase <= -0.2 && rel(gdpNow, gdpBase) <= -5) {
    add('weight', 1, `Pasó del ${pct(gdpBase)} al ${pct(gdpNow)} del PIB entre ${base} y ${cutoff}.`);
  }

  return signals;
}

// Pide todo lo necesario y devuelve la previsión de cada ámbito, ordenada por riesgo.
// `years` son todos los años con datos; solo se usan los que llegan hasta `cutoff`.
export function useForecast(years, cutoff) {
  return useApi(async () => {
    if (!cutoff || !years.length) return null;
    const base = Math.max(years[0], cutoff - WINDOW);
    const span = years.filter((y) => y >= base);

    const [list, ...alertResponses] = await Promise.all([
      getAreasCached(cutoff),
      ...span.map((y) => cached(`alerts-${y}`, () => getAlerts({ year: y })).catch(() => null)),
    ]);
    const alertsByYear = {};
    span.forEach((y, i) => (alertsByYear[y] = alertResponses[i]?.alerts ?? []));

    const ids = [...list.areas.map((a) => a.id), ...SERVICES];
    const fetchOne = (key, fn) => cached(key, fn).catch(() => null); // un dato que falta solo quita su señal
    const details = await Promise.all(
      ids.map((id) =>
        Promise.all([
          fetchOne(`area-${id}-${cutoff}`, () => getArea(id, cutoff)),
          fetchOne(`area-${id}-${base}`, () => getArea(id, base)),
          fetchOne(`cmp-${id}-${cutoff}`, () => getCompare({ area: id, year: cutoff })),
          fetchOne(`cmp-${id}-${base}`, () => getCompare({ area: id, year: base })),
        ]),
      ),
    );

    const rows = ids.map((id, i) => {
      const [areaNow, areaBase, cmpNow, cmpBase] = details[i];
      if (!areaNow) return null;
      const signals = signalsFor({
        id,
        cutoff,
        base,
        alertsByYear,
        areaNow,
        areaBase,
        cmpNow,
        cmpBase,
        gdpNow: areaNow.pct_gdp,
        gdpBase: areaBase?.pct_gdp ?? null,
      });
      const score = signals.reduce((s, x) => s + x.points, 0);
      return { id, name: areaNow.name, service: id.length > 4, score, level: levelOf(score), signals };
    }).filter(Boolean);
    rows.sort((r1, r2) => r2.score - r1.score || r1.name.localeCompare(r2.name, 'es'));
    return { cutoff, base, rows };
  }, [years.join(','), cutoff]);
}

// Lo que pasó DESPUÉS del año de corte, para comprobar la previsión con el pasado:
// años posteriores en los que ese ámbito tuvo avisos.
export function useAfterwards(years, cutoff) {
  const later = years.filter((y) => y > cutoff);
  return useApi(async () => {
    const responses = await Promise.all(later.map((y) => cached(`alerts-${y}`, () => getAlerts({ year: y })).catch(() => null)));
    const byArea = {};
    later.forEach((y, i) => {
      for (const a of responses[i]?.alerts ?? []) (byArea[a.area_id] ??= new Set()).add(y);
    });
    return Object.fromEntries(Object.entries(byArea).map(([id, set]) => [id, [...set].sort()]));
  }, [later.join(',')]);
}
