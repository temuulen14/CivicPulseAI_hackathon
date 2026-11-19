import { useState } from 'react';
import { getBudgetEuRecovery, getBudgetYears } from '../api.js';
import { useApi } from '../useApi.js';
import { useSourcesById } from '../sources.js';
import { formatKeur, formatPct } from '../format.js';
import { sentenceCase } from '../labels.js';
import Status from '../components/Status.jsx';
import YearPicker from '../components/YearPicker.jsx';
import PolicyBar from '../components/PolicyBar.jsx';
import CiteButton from '../components/CiteButton.jsx';

const TOP_PROGRAMS = 15;

// Dónde van los fondos europeos de recuperación (NextGenerationEU) dentro de los
// Presupuestos del Estado: por política de gasto y programa a programa.
export default function EuFunds({ year, years, onYearChange }) {
  const [showAll, setShowAll] = useState(false);
  const funds = useApi(() => getBudgetEuRecovery(year), [year]);
  const all = useApi(getBudgetYears, []);
  const sources = useSourcesById();

  const header = (
    <section className="section">
      <nav className="breadcrumb" aria-label="Estás en">
        <a href="#/">Inicio</a>
        <span aria-hidden="true">/</span>
        <a href="#/presupuestos">Presupuestos</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Fondos europeos</span>
      </nav>
      <h1>¿A dónde van los fondos europeos?</h1>
      <p className="lead">
        Desde 2021 los Presupuestos del Estado incluyen dinero del plan europeo de recuperación (NextGenerationEU).
        Aquí se ve cuánto es cada año, a qué políticas va y en qué programas concretos se reparte.
      </p>
    </section>
  );

  if (!funds.data) {
    return (
      <>
        {header}
        <Status state={funds} />
      </>
    );
  }

  const f = funds.data;
  const source = sources[f.source_id];
  const byYear = Object.fromEntries((all.data?.years ?? []).map((y) => [y.year, y.eu_recovery_keur]));
  const maxPolicy = Math.max(0, ...f.policies.map((p) => p.eu_recovery_keur));
  const maxProgram = Math.max(0, ...f.programs.map((p) => p.eu_recovery_keur));
  const programs = showAll ? f.programs : f.programs.slice(0, TOP_PROGRAMS);

  return (
    <>
      {header}

      <section className="section">
        <YearPicker
          year={f.year}
          years={years}
          onYearChange={onYearChange}
          values={byYear}
          format={formatKeur}
          caption="Cada barra son los fondos europeos de recuperación presupuestados ese año."
        />
        {f.programs.length === 0 ? (
          <p className="state">
            {f.document === null
              ? `En ${f.year} Hacienda no publicó documento de presupuestos.`
              : `En ${f.year} los Presupuestos no llevan fondos europeos de recuperación: empezaron en 2021.`}
          </p>
        ) : (
          <>
            <div className="stats">
              <div className="stat">
                <span className="stat-label">Fondos europeos en {f.year}</span>
                <span className="stat-value">{formatKeur(f.eu_recovery_keur)}</span>
                {f.document === 'Prorroga' && <span className="tag-provisional">Prórroga</span>}
              </div>
              <div className="stat">
                <span className="stat-label">Parte del presupuesto del Estado</span>
                <span className="stat-value">{formatPct(f.share_of_state_budget_pct)}</span>
                <span className="stat-note">Sin contar la Seguridad Social</span>
              </div>
              <div className="stat">
                <span className="stat-label">Políticas de gasto que reciben</span>
                <span className="stat-value">{f.policies.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Programas que reciben</span>
                <span className="stat-value">{f.programs.length}</span>
              </div>
            </div>
            <CiteButton
              text={`Los Presupuestos Generales del Estado de ${f.year}${f.document === 'Prorroga' ? ' (prorrogados)' : ''} incluyen ${formatKeur(f.eu_recovery_keur)} de fondos europeos de recuperación, el ${formatPct(f.share_of_state_budget_pct)} del presupuesto del Estado sin Seguridad Social.`}
              source={source}
            />
          </>
        )}
      </section>

      {f.programs.length > 0 && (
        <>
          <section className="section" aria-labelledby="eu-policies-title">
            <div className="section-title">
              <h2 id="eu-policies-title">A qué políticas van en {f.year}</h2>
              <p className="muted">El porcentaje es la parte de los fondos europeos del año que se lleva cada política.</p>
            </div>
            <ul className="pbars eu-bars">
              {f.policies.map((p) => (
                <PolicyBar
                  key={p.id}
                  href={`#/presupuestos/politica/${p.id}`}
                  name={p.name}
                  note={formatPct(p.share_of_eu_recovery_pct)}
                  value={p.eu_recovery_keur}
                  max={maxPolicy}
                />
              ))}
            </ul>
          </section>

          <section className="section" aria-labelledby="eu-programs-title">
            <div className="section-title">
              <h2 id="eu-programs-title">En qué programas concretos</h2>
              <p className="muted">
                El código del nombre es el del Plan de Recuperación: «C12.I02» es la inversión 2 del componente 12.
                Pulsa un programa para verlo partida a partida.
              </p>
            </div>
            <ul className="pbars eu-bars">
              {programs.map((p) => (
                <PolicyBar
                  key={p.program_id}
                  href={`#/presupuestos/programa/${p.program_id}`}
                  name={p.name}
                  note={p.section_names.map(sentenceCase).join(', ')}
                  value={p.eu_recovery_keur}
                  max={maxProgram}
                />
              ))}
            </ul>
            {f.programs.length > TOP_PROGRAMS && (
              <p>
                <button type="button" className="cite-button" onClick={() => setShowAll(!showAll)}>
                  {showAll ? `Ver solo los ${TOP_PROGRAMS} mayores` : `Ver los ${f.programs.length} programas`}
                </button>
              </p>
            )}
            <p className="muted">
              Cómo se mide: es lo que gestionan en cada ministerio los servicios llamados «Mecanismo de Recuperación y
              Resiliencia». Es dinero presupuestado, no necesariamente gastado.
              {source && (
                <>
                  {' '}
                  Fuente:{' '}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name}
                  </a>
                  .
                </>
              )}
            </p>
          </section>
        </>
      )}
    </>
  );
}
