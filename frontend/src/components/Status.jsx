// Estados comunes a todas las páginas: cargando, error y sin datos.
// Uso: const state = useApi(...); if (!state.data) return <Status state={state} />;
export default function Status({ state, emptyText = 'No hay datos para esta selección.' }) {
  if (state.loading) {
    return (
      <p className="state" role="status">
        <span className="spinner" aria-hidden="true" /> Cargando…
      </p>
    );
  }
  if (state.error) {
    return (
      <p className="state state-error" role="alert">
        No se pudieron cargar los datos: {state.error}
      </p>
    );
  }
  return <p className="state">{emptyText}</p>;
}
