import { getBudgetPolicyInForce } from '../budgetInForce.js';
import { useApi } from '../useApi.js';
import { getAreasCached } from '../useAllYears.js';
import { useSourcesById } from '../sources.js';
import { formatKeur, formatPct } from '../format.js';
import { sentenceCase } from '../labels.js';
import Status from '../components/Status.jsx';
import BudgetBars from '../components/BudgetBars.jsx';
import BudgetNotice from '../components/BudgetNotice.jsx';
import PolicyBar from '../components/PolicyBar.jsx';
import CiteButton from '../components/CiteButton.jsx';

function Breadcrumb({ name }) {
  return (
    <nav className="breadcrumb" aria-label="Estás en">
      <a href="#/">Inicio</a>
      <span aria-hidden="true">/</span>
      <a href="#/presupuestos">Presupuestos</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{name ?? 'Política'}</span>
    </nav>
  );
}

// Una política de gasto de los PGE: su evolución en todos los años y sus programas del año elegido.
export default function BudgetPolicy({ id, year, onYearChange }) {
  const policy = useApi(() => getBudgetPolicyInForce(id, year), [id, year]);
  const areas = useApi(() => getAreasCached(null), []);
  const sources = useSourcesById();

  if (!policy.data) {
    return (
      <>
        <Breadcrumb />
        <Status state={policy} />
      </>
    );
  }

  const p = policy.data;
  const area = areas.data?.areas.find((a) => a.id === p.area_id);
  const max = Math.max(0, ...p.programs.map((pr) => pr.total_keur ?? 0));
  const source = sources[p.source_id];
  const yearRow = p.history.find((h) => h.year === p.year);

  return (
    <>
      <section className="section">
        <Breadcrumb name={p.name} />
        <div className="area-head">
          <h1>{p.name}</h1>
          <p className="lead">
            Política de gasto {p.id} de los Presupuestos Generales del Estado.
            {area && (
              <>
                {' '}
                En el gasto de todas las administraciones entra dentro de{' '}
                <a href={`#/ambito/${area.id}`}>{area.name}</a> (correspondencia aproximada).
              </>
            )}
          </p>
        </div>
        <BudgetNotice />
      </section>

      <section className="stats" aria-label={`Cifras de ${p.year}`}>
        <div className="stat">
          <span className="stat-label">Presupuesto en {p.year}</span>
          <span className="stat-value">{formatKeur(p.total_keur)}</span>
          {yearRow?.document === 'Prorroga' && <span className="tag-provisional">Prórroga</span>}
          {p.carried_from && <span className="stat-note">Mismo documento que en {p.carried_from}</span>}
        </div>
        <div className="stat">
          <span className="stat-label">Sin Seguridad Social</span>
          <span className="stat-value">{formatKeur(p.total_without_social_security_keur)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">De fondos europeos de recuperación</span>
          <span className="stat-value">{formatKeur(p.eu_recovery_keur)}</span>
          {p.total_keur > 0 && p.eu_recovery_keur > 0 && (
            <span className="stat-note">{formatPct((p.eu_recovery_keur / p.total_keur) * 100)} de la política</span>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">Programas</span>
          <span className="stat-value">{p.programs.length}</span>
        </div>
      </section>
      {p.total_keur != null && (
        <CiteButton
          text={`La política de gasto «${p.name}» tiene ${formatKeur(p.total_keur)} en ${yearRow?.document === 'Prorroga' ? `el presupuesto prorrogado vigente en ${p.year}` : `los Presupuestos Generales del Estado de ${p.year}`}.`}
          source={source}
        />
      )}

      <section className="panel section" aria-labelledby="evo-title">
        <div className="section-title">
          <h2 id="evo-title">Evolución</h2>
          <p className="muted">Pulsa un año para ver sus programas.</p>
        </div>
        <BudgetBars
          rows={p.history.map((h) => ({ year: h.year, document: h.document, value: h.total_without_social_security_keur, eu: h.eu_recovery_keur, carried: h.carried_from }))}
          year={p.year}
          onYearChange={onYearChange}
        />
      </section>

      <section className="section" aria-labelledby="prog-title">
        <div className="section-title">
          <h2 id="prog-title">Programas en {p.year}</h2>
          <p className="muted">Pulsa un programa para verlo partida a partida.</p>
        </div>
        {p.programs.length === 0 ? (
          <p className="state">No hay programas para {p.year}: ese año no hubo documento de presupuestos.</p>
        ) : (
          <ul className="pbars">
            {p.programs.map((pr) => (
              <PolicyBar
                key={pr.program_id}
                href={`#/presupuestos/programa/${pr.program_id}`}
                name={pr.name}
                note={pr.section_names.map(sentenceCase).join(', ')}
                value={pr.total_keur}
                eu={pr.eu_recovery_keur}
                max={max}
              />
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
    </>
  );
}
