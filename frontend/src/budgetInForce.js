import { getBudget, getBudgetPolicy, getBudgetProgram } from './api.js';

// Presupuesto VIGENTE de cada año.
// En 2020 no hubo ley ni documento de prórroga: siguió vigente el presupuesto de 2018
// prorrogado, exactamente el mismo que ya rigió en 2019. Hacienda solo publica el
// documento de 2019, así que para 2020 se enseña ese documento, marcado como tal.
// No se inventa ninguna cifra: es la misma prórroga, contada en el año en que estuvo vigente.

const isEmpty = (r) => r && r.total_keur == null && r.document == null;

// Año más reciente, antes de `year`, que sí tiene documento (2020 -> 2019).
async function previousWithDocument(fetchYear, year, minYear = 2015) {
  for (let y = year - 1; y >= minYear; y--) {
    try {
      const r = await fetchYear(y);
      if (!isEmpty(r)) return r;
    } catch {
      // un año sin datos (404): se sigue buscando hacia atrás
    }
  }
  return null;
}

// Rellena los años vacíos de una serie con el documento vigente (el anterior) y los marca
// con `carried_from` para que la interfaz lo diga.
export function fillCarried(rows) {
  const out = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    if (isEmpty(r) && prev && prev.total_keur != null) {
      out.push({
        ...r,
        total_keur: prev.total_keur,
        total_without_social_security_keur: prev.total_without_social_security_keur,
        eu_recovery_keur: prev.eu_recovery_keur,
        document: 'Prorroga',
        carried_from: prev.carried_from ?? prev.year,
      });
    } else out.push(r);
  }
  return out;
}

export async function getBudgetInForce(year) {
  const b = await getBudget(year);
  if (!isEmpty(b)) return b;
  const prev = await previousWithDocument(getBudget, year);
  if (!prev) return b;
  // Se toman las cifras y las políticas del documento vigente; el año, la nota, quién lo
  // elaboró y quién lo ejecutó siguen siendo los de 2020.
  return {
    ...prev,
    year: b.year,
    document: 'Prorroga',
    note: b.note,
    drafted_by: b.drafted_by,
    executed_by: b.executed_by,
    legal: b.legal ?? prev.legal,
    carried_from: prev.year,
  };
}

export async function getBudgetPolicyInForce(id, year) {
  const p = await getBudgetPolicy(id, year);
  const history = fillCarried(p.history ?? []);
  if (p.total_keur != null) return { ...p, history };
  const prev = await previousWithDocument((y) => getBudgetPolicy(id, y), year);
  if (!prev) return { ...p, history };
  return { ...prev, year: p.year, history, carried_from: prev.year };
}

export async function getBudgetProgramInForce(id, year) {
  try {
    return await getBudgetProgram(id, year);
  } catch (err) {
    // Solo se busca el documento vigente si ese año no tuvo documento (2020).
    const b = await getBudget(year).catch(() => null);
    if (!isEmpty(b)) throw err;
    const prev = await previousWithDocument((y) => getBudgetProgram(id, y), year);
    if (!prev) throw err;
    return { ...prev, year, document: 'Prorroga', carried_from: prev.year };
  }
}
