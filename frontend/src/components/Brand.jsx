// Marca de la app: una gota de agua, el nombre «Cristalino» y su sobrenombre «claro como el
// agua». La gota es transparente (solo contorno y un brillo), como queremos que sean las cifras.
export const APP_NAME = 'Cristalino';
export const APP_TAGLINE = 'claro como el agua';

export default function Brand({ withTagline = true }) {
  return (
    <a href="#/" className="wordmark" aria-label={`${APP_NAME}, ${APP_TAGLINE}. Ir al inicio`}>
      <svg className="wordmark-drop" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 2.6c-3.3 4.4-6.6 8.2-6.6 12a6.6 6.6 0 0 0 13.2 0c0-3.8-3.3-7.6-6.6-12z" />
        <path className="wordmark-drop-shine" d="M8.9 14.6a3.2 3.2 0 0 0 2.4 3.3" />
      </svg>
      <span className="wordmark-name">{APP_NAME}</span>
      {withTagline && <span className="wordmark-tagline">{APP_TAGLINE}</span>}
    </a>
  );
}
