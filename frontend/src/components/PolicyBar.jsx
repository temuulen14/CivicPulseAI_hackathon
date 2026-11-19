import { formatKeur } from '../format.js';

// Una política como barra horizontal: el tramo azul es la parte de fondos europeos.
export default function PolicyBar({ href, name, note, value, eu, max, onClick }) {
  const width = max > 0 && value != null ? (value / max) * 100 : 0;
  const euWidth = value ? Math.min(100, ((eu ?? 0) / value) * 100) : 0;
  return (
    <li>
      <a className="pbar" href={href} onClick={onClick}>
        <span className="pbar-name">
          {name}
          {note && <span className="muted"> {note}</span>}
        </span>
        <span className="pbar-track" aria-hidden="true">
          <span className="pbar-fill" style={{ width: `${width}%` }}>
            {euWidth > 0 && <span className="pbar-eu" style={{ width: `${euWidth}%` }} />}
          </span>
        </span>
        <span className="pbar-value">{formatKeur(value)}</span>
      </a>
    </li>
  );
}
