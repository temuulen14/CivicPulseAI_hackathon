import { SEVERITY } from '../labels.js';

// Iconos SVG propios (en vez de "!!", "!" e "i"): la severidad nunca depende solo del color.
// Cada icono lleva su propio color, así se ve igual dentro de cualquier texto.
// Importante = octógono, Merece una mirada = triángulo, Para tu información = círculo.
export function SeverityIcon({ level, size = 16 }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true, className: 'sev-icon' };
  if (level === 'critical') {
    return (
      <svg {...common}>
        <path d="M5.2 1h5.6L15 5.2v5.6L10.8 15H5.2L1 10.8V5.2z" fill="var(--critical)" />
        <path d="M8 4.2v4.6M8 11.2v.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (level === 'warning') {
    return (
      <svg {...common}>
        <path d="M8 1.5 15 14H1z" fill="var(--warning-mark)" stroke="var(--warning-mark)" strokeLinejoin="round" />
        <path d="M8 6v3.6M8 11.6v.4" stroke="#191b18" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="7" fill="var(--info)" />
      <path d="M8 7.2v4.4M8 4.6v.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Etiqueta de severidad: icono + texto.
export default function Severity({ level }) {
  const s = SEVERITY[level];
  if (!s) return null;
  return (
    <span className={`sev sev-${level}`}>
      <SeverityIcon level={level} size={14} />
      {s.label}
    </span>
  );
}
