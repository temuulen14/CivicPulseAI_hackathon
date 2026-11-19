import { useEffect, useState } from 'react';

// Ejecuta una petición y devuelve { loading, error, data }.
// Se repite cada vez que cambia algún valor de `deps` (año, ámbito, filtros…).
export function useApi(request, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let active = true; // evita guardar una respuesta antigua si el usuario ya cambió de filtro
    setState((prev) => ({ ...prev, loading: true, error: null }));
    request()
      .then((data) => active && setState({ loading: false, error: null, data }))
      .catch((err) => active && setState({ loading: false, error: err.message, data: null }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
