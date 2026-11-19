import { useState } from 'react';
import { getBudgetProgramInForce } from '../budgetInForce.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { formatKeur, formatPct } from '../format.js';
import { sentenceCase } from '../labels.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';

function Breadcrumb({ program }) {
  return (
    <nav className="breadcrumb" aria-label="Estás en">
      <a href="#/">Inicio</a>
      <span aria-hidden="true">/</span>
      <a href="#/presupuestos">Presupuestos</a>
      {program && (
        <>
          <span aria-hidden="true">/</span>
          <a href={`#/presupuestos/politica/${program.policy_id}`}>{program.policy_name}</a>
        </>
      )}
      <span aria-hidden="true">/</span>
      <span aria-current="page">{program ? `Programa ${program.program_id}` : 'Programa'}</span>
    </nav>
  );
}

// Las partidas vienen en el orden del documento. Cada capítulo (nivel 1) abre un grupo y las
// líneas de nivel 2-4 que le siguen cuelgan de él. Solo se suman los capítulos: los demás
// niveles ya están dentro (docs/API_CONTRACT.md).
function chaptersOf(lines, organicId) {
  const chapters = [];
  for (const line of lines.filter((l) => l.organic_id === organicId)) {
    if (line.level === 1) chapters.push({ ...line, children: [] });
    else chapters[chapters.length - 1]?.children.push(line);
  }
  return chapters;
}

function Chapter({ chapter, max, total }) {
  const [open, setOpen] = useState(false);
  const width = max > 0 ? (chapter.amount_keur / max) * 100 : 0;
  const content = (
    <>
      <span className="chapter-name">
        <span className="chapter-code">{chapter.economic_code}</span>
        {sentenceCase(chapter.description)}
      </span>
      <span className="pbar-track" aria-hidden="true">
        <span className="pbar-fill" style={{ width: `${width}%` }} />
      </span>
      <span className="pbar-value">
        {formatKeur(chapter.amount_keur)}
        <span className="muted"> {formatPct(total > 0 ? (chapter.amount_keur / total) * 100 : null)}</span>
      </span>
    </>
  );

  return (
    <li className={`chapter${open ? ' open' : ''}`}>
      {chapter.children.length === 0 ? (
        <div className="chapter-head">
          <span className="chevron-space" aria-hidden="true" />
          {content}
        </div>
      ) : (
        <button type="button" className="chapter-head" aria-expanded={open} onClick={() => setOpen(!open)}>
          <svg className="chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {content}
        </button>
      )}
      {open && (
        <ul className="lines">
          {chapter.children.map((l, i) => (
            <li key={`${l.economic_code}-${i}`} className={`line level-${l.level}`}>
              <span className="chapter-code">{l.economic_code}</span>
              <span className="line-desc">{l.description}</span>
              <span className="line-value">{formatKeur(l.amount_keur)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Un programa de los PGE hasta la última partida de la Ley: por ministerio y organismo,
// y dentro, por capítulos desplegables.
export default function BudgetProgram({ id, year, years, onYearChange }) {
  const program = useApi(() => getBudgetProgramInForce(id, year), [id, year]);
  const sources = useSourcesById();

  const picker = (
    <YearPicker year={year} years={years} onYearChange={onYearChange} caption="Los programas cambian de código con las reorganizaciones: puede que no exista en todos los años." />
  );

  if (!program.data) {
    return (
      <>
        <Breadcrumb />
        {picker}
        <Status state={program} />
      </>
    );
  }

  const pr = program.data;
  const source = sources[pr.source_id];

  return (
    <>
      <section className="section">
        <Breadcrumb program={pr} />
        <div className="area-head">
          <h1>{pr.name}</h1>
          <p className="lead">
            Programa {pr.program_id} de la política <a href={`#/presupuestos/politica/${pr.policy_id}`}>{pr.policy_name}</a>,
            en {pr.carried_from ? `la prórroga vigente en ${pr.year} (el mismo documento que en ${pr.carried_from})` : pr.document === 'Prorroga' ? `la prórroga de ${pr.year}` : `la Ley de Presupuestos de ${pr.year}`}.
          </p>
        </div>
        {picker}
      </section>

      <section className="stats" aria-label="Cifras del programa">
        <div className="stat">
          <span className="stat-label">Presupuesto en {pr.year}</span>
          <span className="stat-value">{formatKeur(pr.total_keur)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">De fondos europeos de recuperación</span>
          <span className="stat-value">{formatKeur(pr.eu_recovery_keur)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{pr.sections.length === 1 ? 'Ministerio' : 'Ministerios'}</span>
          <span className="stat-value">{pr.sections.length}</span>
        </div>
      </section>

      {pr.sections.map((s) => (
        <section key={s.section_id} className="section" aria-label={sentenceCase(s.section_name)}>
          <div className="section-head">
            <h2>{sentenceCase(s.section_name)}</h2>
            <span className="num">{formatKeur(s.total_keur)}</span>
          </div>
          {s.organics.map((o) => {
            const chapters = chaptersOf(s.lines, o.organic_id);
            const max = Math.max(0, ...chapters.map((c) => c.amount_keur));
            return (
              <div key={o.organic_id} className="panel">
                <div className="section-head">
                  <h3>{sentenceCase(o.name)}</h3>
                  <span className="num">{formatKeur(o.total_keur)}</span>
                </div>
                {chapters.length === 0 ? (
                  <p className="muted">La Ley solo da el total de este organismo, sin repartirlo por capítulos.</p>
                ) : (
                  <>
                    <p className="muted">Por capítulos. Pulsa uno para ver sus partidas.</p>
                    <ul className="chapters">
                      {chapters.map((c, i) => (
                        <Chapter key={`${c.economic_code}-${i}`} chapter={c} max={max} total={o.total_keur} />
                      ))}
                    </ul>
                  </>
                )}
                {o.undetailed_keur > 0 && (
                  <p className="muted">{formatKeur(o.undetailed_keur)} de este organismo no están repartidos por capítulos en la Ley.</p>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {source && (
        <p className="muted">
          Fuente:{' '}
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.name}
          </a>
          .
        </p>
      )}
    </>
  );
}
