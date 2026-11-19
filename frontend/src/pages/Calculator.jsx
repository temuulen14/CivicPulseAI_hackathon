import { useState } from 'react';
import { useApi } from '../useApi.js';
import { getAreasCached } from '../useAllYears.js';
import { computeTaxes, splitByArea, LIMITS, TAX_SOURCES, VAT_GROUPS } from '../taxes.js';
import { formatPct } from '../format.js';
import { shareStep } from '../scale.js';
import Segmented from '../components/Segmented.jsx';
import Status from '../components/Status.jsx';
import TaxSankey from '../components/TaxSankey.jsx';

const euro = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });
const eur = (v) => `${euro.format(v)}\u00a0€`;

const VIEWS = [
  { value: 'flow', label: 'Flujo del dinero' },
  { value: 'bars', label: 'Barras' },
  { value: 'table', label: 'Tabla' },
];

// Respuestas por defecto: un sueldo cercano al salario medio, para que la página nunca salga vacía.
const DEFAULTS = {
  monthlyGross: 2000,
  payments: 14,
  contract: 'indefinido',
  age: 'menos65',
  children: 0,
  childrenUnder3: 0,
  includeEmployer: false,
  spending: { exempt: 700, reduced: 450, general: 350 },
};

// Campo numérico en euros. Vacío cuenta como 0 para no romper el cálculo mientras se escribe.
function MoneyField({ label, hint, value, onChange, step = 50 }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input type="number" inputMode="decimal" min="0" step={step} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
        <span aria-hidden="true">€</span>
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function ChoiceField({ label, options, value, onChange }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <Segmented label={label} options={options} value={value} onChange={onChange} />
    </div>
  );
}

const count = (n) => Array.from({ length: n }, (_, i) => ({ value: i, label: i === n - 1 ? `${i} o más` : String(i) }));

export default function Calculator({ year }) {
  const [form, setForm] = useState(DEFAULTS);
  const [view, setView] = useState('flow');
  const areas = useApi(() => getAreasCached(year), [year]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setSpending = (key) => (value) => setForm((f) => ({ ...f, spending: { ...f.spending, [key]: value } }));

  const result = computeTaxes(form);
  const byArea = areas.data ? splitByArea(result.total, areas.data.areas) : [];
  const max = Math.max(0, ...byArea.map((a) => a.amount));
  const monthlyNet = result.net / form.payments;
  const spent = Object.values(form.spending).reduce((s, v) => s + v, 0);

  return (
    <>
      <section className="section">
        <h1>¿A dónde van tus impuestos?</h1>
        <p className="lead">
          Responde unas preguntas sobre tu sueldo y tus gastos. Calculamos cuánto pagas al año en IRPF, cotización
          social e IVA, y lo repartimos entre los ámbitos según lo que gastan de verdad las administraciones públicas.
        </p>
      </section>

      <section className="section" aria-labelledby="calc-form">
        <h2 id="calc-form">Tu sueldo</h2>
        <div className="calc-form panel">
          <MoneyField label="Sueldo bruto mensual" hint="Lo que pone en tu nómina antes de retenciones." value={form.monthlyGross} onChange={set('monthlyGross')} />
          <ChoiceField label="Pagas al año" options={[{ value: 12, label: '12' }, { value: 14, label: '14' }]} value={form.payments} onChange={set('payments')} />
          <ChoiceField label="Contrato" options={[{ value: 'indefinido', label: 'Indefinido' }, { value: 'temporal', label: 'Temporal' }]} value={form.contract} onChange={set('contract')} />
          <ChoiceField
            label="Edad"
            options={[{ value: 'menos65', label: 'Menos de 65' }, { value: 'de65a74', label: '65 a 74' }, { value: 'desde75', label: '75 o más' }]}
            value={form.age}
            onChange={set('age')}
          />
          <ChoiceField label="Hijos a tu cargo (menores de 25)" options={count(5)} value={form.children} onChange={set('children')} />
          {form.children > 0 && (
            <ChoiceField label="De ellos, menores de 3 años" options={count(form.children + 1).map((o) => ({ ...o, label: String(o.value) }))} value={Math.min(form.childrenUnder3, form.children)} onChange={set('childrenUnder3')} />
          )}
          <ChoiceField
            label="¿Contar lo que tu empresa cotiza por ti?"
            options={[{ value: false, label: 'No' }, { value: true, label: 'Sí' }]}
            value={form.includeEmployer}
            onChange={set('includeEmployer')}
          />
        </div>

        <h2>Tus gastos de cada mes</h2>
        <p className="muted">
          Para calcular el IVA. Te quedan unos {eur(monthlyNet)} netos al mes
          {form.payments === 14 ? ' (en 14 pagas)' : ''}; ahora indicas {eur(spent)} de gasto.
        </p>
        <div className="calc-form panel">
          {VAT_GROUPS.map((g) => (
            <MoneyField key={g.key} label={g.label} hint={g.hint} value={form.spending[g.key]} onChange={setSpending(g.key)} />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="calc-result">
        <h2 id="calc-result">Lo que aportas</h2>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Impuestos al año</span>
            <span className="stat-value">{eur(result.total)}</span>
            <span className="stat-note">{eur(result.total / 12)} al mes</span>
          </div>
          <div className="stat">
            <span className="stat-label">IRPF</span>
            <span className="stat-value">{eur(result.irpf)}</span>
            <span className="stat-note">{formatPct(result.gross ? (result.irpf / result.gross) * 100 : 0)} de tu bruto</span>
          </div>
          <div className="stat">
            <span className="stat-label">Cotización social</span>
            <span className="stat-value">{eur(result.ssWorker + result.ssEmployer)}</span>
            <span className="stat-note">{result.ssEmployer > 0 ? `${eur(result.ssEmployer)} los pone la empresa` : 'solo tu parte'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">IVA</span>
            <span className="stat-value">{eur(result.vat)}</span>
            <span className="stat-note">de tus compras</span>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="calc-split">
        <div className="section-head">
          <div className="section-title">
            <h2 id="calc-split">A qué se dedica cada euro</h2>
            <p className="muted">
              Reparto según el gasto de todas las administraciones públicas en {areas.data?.year ?? year} (Eurostat, COFOG).
            </p>
          </div>
          <Segmented label="Forma de ver el reparto" options={VIEWS} value={view} onChange={setView} />
        </div>

        {!areas.data ? (
          <Status state={areas} />
        ) : result.total <= 0 ? (
          <p className="state">Escribe un sueldo para ver el reparto.</p>
        ) : view === 'flow' ? (
          <TaxSankey result={result} areas={byArea} />
        ) : view === 'bars' ? (
          <ul className="hbars calc-bars">
            {byArea.map((a) => (
              <li key={a.id} className="hbar">
                <a className="hbar-label" href={`#/ambito/${a.id}`}>
                  {a.name}
                </a>
                <span className="hbar-value">
                  {eur(a.amount)} <span className="muted">· {eur(a.amount / 12)} al mes</span>
                </span>
                <span className="hbar-track">
                  <span style={{ display: 'block', height: '100%', width: `${(a.amount / max) * 100}%`, background: shareStep(a.share).fill }} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Ámbito</th>
                  <th scope="col" className="num">Cuota del gasto</th>
                  <th scope="col" className="num">Al año</th>
                  <th scope="col" className="num">Al mes</th>
                </tr>
              </thead>
              <tbody>
                {byArea.map((a) => (
                  <tr key={a.id}>
                    <th scope="row">
                      <a href={`#/ambito/${a.id}`}>{a.name}</a>
                    </th>
                    <td className="num">{formatPct(a.share)}</td>
                    <td className="num">{eur(a.amount)}</td>
                    <td className="num">{eur(a.amount / 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section panel-soft" aria-labelledby="calc-method">
        <h2 id="calc-method">Cómo se calcula</h2>
        <ul className="reading-list">
          <li>Cotización social: el 6,48 % de tu bruto (6,53 % con contrato temporal), hasta la base máxima de 4.909,50 € al mes. La empresa paga además un 30,57 % (31,77 % temporal).</li>
          <li>IRPF: al bruto se le restan la cotización, 2.000 € de gastos y la reducción por rendimientos del trabajo; a esa base se le aplica la escala general (del 19 % al 47 %) y se descuenta la escala aplicada a tu mínimo personal y familiar.</li>
          <li>IVA: la parte de impuesto que va dentro del precio de lo que compras (10/110 o 21/121).</li>
          <li>Reparto: cada ámbito recibe la misma proporción de tus impuestos que su peso en el gasto público total.</li>
        </ul>
        <h3>Lo que no tiene en cuenta</h3>
        <ul className="reading-list">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <h3>Fuentes</h3>
        <ul className="reading-list">
          {TAX_SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
