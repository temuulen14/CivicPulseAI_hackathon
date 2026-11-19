import { getAreas } from './api.js';
import { useApi } from './useApi.js';

// /areas de cada año se guarda en memoria: la portada, Avisos y el selector de años
// lo comparten y no se vuelve a pedir al cambiar de página.
const areasCache = new Map();

export function getAreasCached(year) {
  if (!areasCache.has(year)) {
    areasCache.set(
      year,
      getAreas(year).catch((err) => {
        areasCache.delete(year); // si falla, que se pueda reintentar
        throw err;
      }),
    );
  }
  return areasCache.get(year);
}

// Lanza `request(year)` para cada año a la vez y devuelve { [año]: respuesta }.
// Un año que falla (el backend da 404 si no hay datos) simplemente no aparece.
export function useEachYear(request, years, deps = []) {
  return useApi(async () => {
    const results = await Promise.allSettled(years.map((y) => request(y)));
    const byYear = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') byYear[years[i]] = r.value;
    });
    return byYear;
  }, [years.join(','), ...deps]);
}

// /areas de todos los años: alimenta el selector de años, las sparklines y la evolución.
export function useAllAreas(years) {
  return useEachYear(getAreasCached, years);
}

// Memoria genérica de peticiones por clave: la previsión de riesgos pide muchas veces lo
// mismo (un ámbito en un año) y así cada respuesta solo se pide una vez por sesión.
const memo = new Map();
export function cached(key, request) {
  if (!memo.has(key)) {
    memo.set(
      key,
      request().catch((err) => {
        memo.delete(key);
        throw err;
      }),
    );
  }
  return memo.get(key);
}
