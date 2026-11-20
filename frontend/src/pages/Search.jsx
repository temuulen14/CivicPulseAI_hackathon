import { searchBudget } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { formatKeur } from '../format.js';
import { sentenceCase } from '../labels.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import SearchBox from '../components/SearchBox.jsx';

const EXAMPLES = ['becas', 'meteorología', 'Guardia Civil', 'incendios forestales', 'Museo del Prado', 'dependencia'];

// El texto viaja en la URL codificado (#/buscar/guardia%20civil).
function decode(query) {
  try {
    return decodeURIComponent(query ?? '');
  } catch {
    return '';
  }
}

// Los capítulos vienen en mayúsculas («GASTOS DE PERSONAL») y se pasan a minúsculas; el resto
// de partidas ya vienen bien escritas y se dejan como están, con sus nombres propios.
const tidy = (text) => (text === text.toUpperCase() ? sentenceCase(text) : text);

function Result({ result }) {
  const more = result.line_match_count - result.lines.length;
  return (
    <li className="result">
      <div className="result-head">
        <h3>
          <a href={`#/presupuestos/programa/${result.program_id}`}>{result.name}</a>
        </h3>
        <span className="num">{formatKeur(result.total_keur)}</span>
      </div>
      <p className="muted">
        Programa {result.program_id} · <a href={`#/presupuestos/politica/${result.policy_id}`}>{result.policy_name}</a> ·{' '}
        {result.section_names.map(sentenceCase).join(', ')}
      </p>
      {result.matched_bodies.length > 0 && (
        <p className="muted">Lo gestiona: {result.matched_bodies.map(sentenceCase).join(', ')}.</p>
      )}
      {result.lines.length > 0 && (
        <ul className="lines result-lines">
          {result.lines.map((line, i) => (
            <li key={`${line.economic_code}-${i}`} className="line">
              <span className="chapter-code">{line.economic_code}</span>
              <span className="line-desc">{tidy(line.description)}</span>
              <span className="line-value">{formatKeur(line.amount_keur)}</span>
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <p className="muted">
          y {more} {more === 1 ? 'partida más' : 'partidas más'} dentro del programa.
        </p>
      )}
    </li>
  );
}

// Buscador de los Presupuestos del Estado: programas y partidas que contienen las palabras
// escritas, en el año elegido. La búsqueda la hace el backend (/budget/search).
export default function Search({ query, year, years, onYearChange }) {
  const text = decode(query).trim();
  const canSearch = text.length >= 2 && year != null;
  const found = useApi(() => (canSearch ? searchBudget(text, year) : Promise.resolve(null)), [text, year]);
  const sources = useSourcesById();
  const data = found.data;
  const source = sources[data?.source_id];

  return (
    <>
      <section className="section">
        <h1>Buscar en los Presupuestos</h1>
        <p className="lead">
          ¿Cuánto dedica el Estado a algo concreto? Escribe una o varias palabras y verás los programas y las partidas
          de la Ley de Presupuestos que las contienen, con su importe.
        </p>
        {/* key: al llegar con otra búsqueda en la URL, la caja se rehace con ese texto */}
        <SearchBox key={text} initial={text} />
        <YearPicker year={year} years={years} onYearChange={onYearChange} caption="Se busca en el presupuesto del año elegido." />
      </section>

      {!canSearch ? (
        <section className="section" aria-label="Ejemplos">
          <p className="muted">Por ejemplo:</p>
          <div className="controls">
            {EXAMPLES.map((example) => (
              <a key={example} className="chip-link" href={`#/buscar/${encodeURIComponent(example)}`}>
                {example}
              </a>
            ))}
          </div>
        </section>
      ) : !data || found.loading ? (
        // Mientras llega la búsqueda nueva no se enseñan los resultados de la anterior bajo el título nuevo.
        <Status state={found} />
      ) : (
        <section className="section" aria-live="polite" aria-labelledby="results-title">
          <div className="section-title">
            <h2 id="results-title">
              {data.program_count === 0
                ? `Nada con «${text}» en ${data.year}`
                : `${data.program_count} ${data.program_count === 1 ? 'programa' : 'programas'} con «${text}» en ${data.year}`}
            </h2>
            {data.program_count > data.results.length && (
              <p className="muted">Se muestran los {data.results.length} más relevantes. Añade otra palabra para afinar.</p>
            )}
            {data.program_count > 0 && (
              <p className="muted">
                El importe de la derecha es el del programa entero. Debajo, las partidas que coinciden: pueden estar
                unas dentro de otras, así que no se suman.
                {data.document === 'Prorroga' && ` En ${data.year} no hubo ley nueva: son las cifras de la prórroga.`}
              </p>
            )}
          </div>
          {data.program_count === 0 ? (
            <p className="state">
              {data.document === null
                ? `En ${data.year} Hacienda no publicó documento de presupuestos. Prueba con otro año.`
                : 'Prueba con otra palabra o con el nombre completo en lugar de las siglas: los Presupuestos escriben «Agencia Estatal de Meteorología», no «AEMET».'}
            </p>
          ) : (
            <ul className="results">
              {data.results.map((result) => (
                <Result key={result.program_id} result={result} />
              ))}
            </ul>
          )}
          {source && (
            <p className="muted">
              Fuente:{' '}
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
              .
            </p>
          )}
        </section>
      )}
    </>
  );
}
