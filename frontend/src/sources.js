import { getSources } from './api.js';
import { useApi } from './useApi.js';

// Devuelve las fuentes como objeto { id: fuente } para buscarlas por su source_id.
export function useSourcesById() {
  const state = useApi(getSources, []);
  const byId = {};
  for (const s of state.data?.sources ?? []) byId[s.id] = s;
  return byId;
}
