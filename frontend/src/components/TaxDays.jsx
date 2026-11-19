import { shareStep } from '../scale.js';

const DAYS = 365;
const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

// Fecha del día número `n` de un año de 365 días (1 = 1 de enero). Se usa 2025, que no es bisiesto.
const dayDate = (n) => dateFmt.format(new Date(2025, 0, Math.max(1, Math.round(n))));

const dayCount = (d) => (d < 0.5 ? 'menos de 1 día' : Math.round(d) === 1 ? '1 día' : `${Math.round(d)} días`);
// «del 2 al 3 de abril», o un solo día si empieza y acaba el mismo.
const range = (from, to) => (dayDate(from) === dayDate(to) ? `el ${dayDate(from)}` : `del ${dayDate(from)} al ${dayDate(to)}`);

// «Días de trabajo»: si lo que ganas en un año se repartiera por igual entre sus 365 días,
// cuántos días trabajas para pagar cada ámbito. Se empieza el 1 de enero y se van poniendo
// los ámbitos uno detrás de otro; el resto del año es para ti.
export default function TaxDays({ result, areas }) {
  const income = result.gross + result.ssEmployer; // lo que cuesta tu sueldo, con la parte de la empresa si se cuenta
  if (income <= 0) return null;
  const taxDays = (result.total / income) * DAYS;

  let start = 0;
  const segments = areas.map((a) => {
    const days = (a.amount / income) * DAYS;
    const seg = { ...a, days, from: start, to: start + days };
    start += days;
    return seg;
  });

  return (
    <div className="days">
      <p className="days-headline">
        Trabajas hasta el <strong>{dayDate(taxDays)}</strong> para pagar tus impuestos: {Math.round(taxDays)} días de
        cada {DAYS}. Desde ese día, trabajas para ti.
      </p>

      <div className="days-track" role="img" aria-label={`${Math.round(taxDays)} de ${DAYS} días para impuestos`}>
        {segments.map((s) => (
          <span
            key={s.id}
            title={`${s.name}: ${Math.round(s.days)} días`}
            style={{ width: `${(s.days / DAYS) * 100}%`, background: shareStep(s.share).fill }}
          />
        ))}
        <span className="days-mine" style={{ width: `${((DAYS - taxDays) / DAYS) * 100}%` }} />
      </div>
      <div className="days-months" aria-hidden="true">
        {MONTHS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>

      <ol className="days-list">
        {segments.map((s) => (
          <li key={s.id}>
            <span className="swatch" style={{ background: shareStep(s.share).fill }} aria-hidden="true" />
            <a href={`#/ambito/${s.id}`}>{s.name}</a>
            <span className="days-count">{dayCount(s.days)}</span>
            <span className="muted days-range">{range(s.from + 1, s.to)}</span>
          </li>
        ))}
        <li>
          <span className="swatch days-mine" aria-hidden="true" />
          <span>Para ti</span>
          <span className="days-count">{dayCount(DAYS - taxDays)}</span>
          <span className="muted days-range">del {dayDate(taxDays + 1)} al 31 de diciembre</span>
        </li>
      </ol>
      <p className="muted">
        Cuenta tu sueldo bruto{result.ssEmployer > 0 ? ' y lo que cotiza tu empresa' : ''} como si lo ganaras por igual
        cada día del año.
      </p>
    </div>
  );
}
