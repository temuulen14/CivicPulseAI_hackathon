// Marca de la app: el nombre «Cristalino» y su sobrenombre «como el agua», solo con letra.
export const APP_NAME = 'Cristalino';
export const APP_TAGLINE = 'como el agua';

export default function Brand({ withTagline = true }) {
  return (
    <a href="#/" className="wordmark" aria-label={`${APP_NAME}, ${APP_TAGLINE}. Ir al inicio`}>
      <span className="wordmark-name">{APP_NAME}</span>
      {withTagline && <span className="wordmark-tagline">{APP_TAGLINE}</span>}
    </a>
  );
}
