// Todos los países con dato de un ámbito: los de la UE (Eurostat) y los de fuera (OCDE).
export function valuesOf(compare) {
  return [...compare.rows, ...(compare.world_rows ?? [])].filter((r) => r.value !== null);
}

// El país que más dedica a un ámbito, en % de su PIB. Si dos empatan, queda el primero de la lista.
export function leaderOf(compare) {
  return valuesOf(compare).reduce((best, r) => (best && best.value >= r.value ? best : r), null);
}
