import { getSources } from '../api.js';
import { useApi } from '../useApi.js';
import Status from '../components/Status.jsx';

// Página de fuentes: entregable obligatorio del hackatón.
export default function Sources() {
  const state = useApi(getSources, []);

  return (
    <>
      <section className="section">
        <h1>Fuentes de datos</h1>
        <p className="lead">
          Todas las cifras de Cristalino salen de fuentes oficiales y abiertas. Aquí puedes consultarlas
          directamente.
        </p>
      </section>

      {!state.data ? (
        <Status state={state} />
      ) : state.data.sources.length === 0 ? (
        <p className="state">No hay fuentes registradas.</p>
      ) : (
        <section className="table-wrap">
          <table>
              <thead>
                <tr>
                  <th>Fuente</th>
                  <th>Publicada por</th>
                  <th>Licencia</th>
                  <th>Consultada</th>
                </tr>
              </thead>
              <tbody>
                {state.data.sources.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.name}
                      </a>
                    </td>
                    <td>{s.publisher}</td>
                    <td>{s.license}</td>
                    <td className="nowrap">
                      {s.retrieved_at ? s.retrieved_at.split('-').reverse().join('/') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </section>
      )}

      <section className="panel-soft section">
        <h2>Cómo leer las cifras</h2>
        <ul className="reading-list">
          <li>
            Es el <strong>gasto ejecutado</strong> del conjunto de las administraciones públicas (Estado, comunidades
            autónomas, ayuntamientos y Seguridad Social), no el presupuesto inicial aprobado en la ley.
          </li>
          <li>
            Se usa la clasificación por funciones <strong>COFOG</strong>, el estándar europeo, para poder comparar
            con otros países con el mismo criterio.
          </li>
          <li>
            El último año disponible llega con uno o dos años de retraso y puede ser <strong>provisional</strong>;
            se marca siempre con una etiqueta.
          </li>
        </ul>
      </section>
    </>
  );
}
