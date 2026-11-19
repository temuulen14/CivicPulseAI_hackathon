import { useState } from 'react';
import { getBudget, getBudgetYears } from '../api.js';
import { useApi } from '../useApi.js';
import { getAreasCached } from '../useAllYears.js';
import { useSourcesById } from '../sources.js';
import { formatKeur, formatKeurWords, formatPct } from '../format.js';
import Status from '../components/Status.jsx';
import Segmented from '../components/Segmented.jsx';
import BudgetBars, { GovernmentBand } from '../components/BudgetBars.jsx';
import { governmentLabel } from '../governments.js';
import BudgetNotice from '../components/BudgetNotice.jsx';
import PolicyBar from '../components/PolicyBar.jsx';

export default function Budget({ year, years, onYearChange }) {
  const [group, setGroup] = useState('policy'); // 'policy' | 'area'
  const [withSS, setWithSS] = useState(true);
  const all = useApi(getBudgetYears, []);
  const budget = useApi(() => getBudget(year), [year]);
  const areas = useApi(() => getAreasCached(null), []);
  const sources = useSourcesById();

  const header = (
    <section className="section">
      <h1>Presupuestos del Estado</h1>
      <p className="lead">
        Lo que la Ley de Presupuestos asigna cada año al Estado central, partida a partida: de la gran política de
        gasto hasta el último concepto.
      </p>
      <BudgetNotice />
    </section>
  );

  if (!budget.data || !all.data) {
    return (
      <>
        {header}
        <Status state={!budget.data ? budget : all} />
      </>
    );
  }

  const b = budget.data;
  const governments = Object.fromEntries(all.data.governments.map((g) => [g.id, g]));
  const areaName = Object.fromEntries((areas.data?.areas ?? []).map((a) => [a.id, a.name]));
  const ss = withSS && b.includes_social_security;
  const valueOf = (p) => (ss ? p.total_keur : p.total_without_social_security_keur);
  const policies = [...b.policies].sort((p1, p2) => (valueOf(p2) ?? 0) - (valueOf(p1) ?? 0));
  const max = Math.max(0, ...policies.map(valueOf));
  const source = sources[b.source_id];
  const drafted = governments[b.drafted_by];

  // Agrupar por ámbito de Eurostat (equivalencia aproximada que da el backend).
  const groups = {};
  for (const p of policies) (groups[p.area_id] ??= []).push(p);
  const groupList = Object.entries(groups)
    .map(([areaId, list]) => ({ areaId, list, total: list.reduce((s, p) => s + (valueOf(p) ?? 0), 0) }))
    .sort((g1, g2) => g2.total - g1.total);

  return (
    <>
      {header}

      <section className="hero-total budget-total" aria-live="polite">
        {b.total_keur == null ? (
          <>
            <p className="hero-kicker">En {b.year} no hubo documento de presupuestos</p>
            <p className="lead">{b.note}</p>
          </>
        ) : (
          <>
            <p className="hero-kicker">
              {b.document === 'Prorroga'
                ? `En ${b.year} no hubo ley nueva: siguió vigente, prorrogado, el presupuesto anterior, con`
                : `La Ley de Presupuestos de ${b.year} asignó`}
            </p>
            <p className="budget-figure">{formatKeurWords(b.total_keur)}</p>
            <p className="hero-sub">
              {b.includes_social_security
                ? `Incluye la Seguridad Social. Sin ella: ${formatKeur(b.total_without_social_security_keur)}.`
                : 'La prórroga no incluye la Seguridad Social.'}
              {b.eu_recovery_keur > 0 && ` De fondos europeos de recuperación: ${formatKeur(b.eu_recovery_keur)}.`}
            </p>
            {b.note && b.document !== 'Prorroga' && <p className="muted">{b.note}</p>}
          </>
        )}
        {b.legal && (
          <p className="muted">
            <a href={b.legal.boe_url} target="_blank" rel="noreferrer">
              {b.legal.law_title}
            </a>
          </p>
        )}
      </section>

      <section className="panel section" aria-labelledby="evo-title">
        <div className="section-title">
          <h2 id="evo-title">
            Evolución {years[0]}–{years[years.length - 1]}
          </h2>
          <p className="muted">Pulsa un año para ver su presupuesto.</p>
        </div>
        <BudgetBars
          rows={all.data.years.map((r) => ({
            year: r.year,
            document: r.document,
            value: r.total_without_social_security_keur,
            eu: r.eu_recovery_keur,
          }))}
          year={b.year}
          onYearChange={onYearChange}
        />
        <GovernmentBand years={years} governments={all.data.governments} />
        <p className="gov-detail">
          {drafted && (
            <>
              El presupuesto vigente en {b.year} lo elaboró el Gobierno {governmentLabel(drafted)}.{' '}
            </>
          )}
          Lo ejecutó{' '}
          {b.executed_by
            .map((e) => `${governments[e.government_id] ? governmentLabel(governments[e.government_id]) : e.government_id} (${e.days} días)`)
            .join(' y ')}
          .
        </p>
      </section>

      <section className="section" aria-labelledby="pol-title">
        <div className="section-head">
          <div className="section-title">
            <h2 id="pol-title">En qué se reparte en {b.year}</h2>
            <p className="muted">
              {policies.length} políticas de gasto. Pulsa una para ver su evolución y sus programas.
            </p>
          </div>
          {policies.length > 0 && (
            <div className="controls">
              <Segmented
                label="Agrupar"
                options={[
                  { value: 'policy', label: 'Por política' },
                  { value: 'area', label: 'Por ámbito' },
                ]}
                value={group}
                onChange={setGroup}
              />
              {b.includes_social_security && (
                <Segmented
                  label="Seguridad Social"
                  options={[
                    { value: 'with', label: 'Con Seguridad Social' },
                    { value: 'without', label: 'Sin ella' },
                  ]}
                  value={withSS ? 'with' : 'without'}
                  onChange={(v) => setWithSS(v === 'with')}
                />
              )}
            </div>
          )}
        </div>

        {policies.length === 0 ? (
          <p className="state">No hay desglose por políticas para {b.year}.</p>
        ) : (
          <>
            <div className="legend" aria-hidden="true">
              <span><span className="swatch" style={{ background: 'var(--forest)' }} /> Presupuesto de la política</span>
              <span><span className="swatch" style={{ background: 'var(--sky)' }} /> Parte de fondos europeos</span>
            </div>
            {group === 'policy' ? (
              <ul className="pbars">
                {policies.map((p) => (
                  <PolicyBar
                    key={p.id}
                    href={`#/presupuestos/politica/${p.id}`}
                    name={p.name}
                    note={formatPct(ss ? p.share_of_total_pct : ((valueOf(p) ?? 0) / b.total_without_social_security_keur) * 100)}
                    value={valueOf(p)}
                    eu={p.eu_recovery_keur}
                    max={max}
                  />
                ))}
              </ul>
            ) : (
              <div className="pgroups">
                {groupList.map((g) => (
                  <div key={g.areaId} className="pgroup">
                    <h3 className="pgroup-head">
                      <a href={`#/ambito/${g.areaId}`}>{areaName[g.areaId] ?? g.areaId}</a>
                      <span className="num">{formatKeur(g.total)}</span>
                    </h3>
                    <ul className="pbars">
                      {g.list.map((p) => (
                        <PolicyBar
                          key={p.id}
                          href={`#/presupuestos/politica/${p.id}`}
                          name={p.name}
                          value={valueOf(p)}
                          eu={p.eu_recovery_keur}
                          max={max}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="muted">
                  La correspondencia entre políticas y ámbitos es aproximada: la hace el equipo, no es oficial.
                </p>
              </div>
            )}
          </>
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
