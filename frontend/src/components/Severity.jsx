import { SEVERITY } from '../labels.js';

// Etiqueta de severidad: color + icono + texto, nunca solo color.
export default function Severity({ level }) {
  const s = SEVERITY[level];
  if (!s) return null;
  return (
    <span className={`sev sev-${level}`}>
      <span className="sev-icon" aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}
