import { useEffect, useState } from 'react';
import { getMeta, usingMocks } from './api.js';
import { useApi } from './useApi.js';
import Home from './pages/Home.jsx';
import Area from './pages/Area.jsx';
import Compare from './pages/Compare.jsx';
import Alerts from './pages/Alerts.jsx';
import Sources from './pages/Sources.jsx';

// Navegación sin librería: la página actual va en la URL tras la almohadilla
// (#/ambito/GF07). El navegador avisa con el evento "hashchange" cuando cambia,
// así que los enlaces, el botón "atrás" y compartir la URL funcionan sin más.
function readRoute() {
  const [page = '', id = null] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { page, id };
}

const NAV = [
  { href: '#/', page: '', label: 'Inicio' },
  { href: '#/comparar', page: 'comparar', label: 'Comparar países' },
  { href: '#/avisos', page: 'avisos', label: 'Avisos' },
  { href: '#/fuentes', page: 'fuentes', label: 'Fuentes' },
];

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [year, setYear] = useState(null); // null = último año con datos
  const meta = useApi(getMeta, []);

  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const years = meta.data?.years ?? [];
  const selectedYear = year ?? meta.data?.latest_year ?? null;
  const pageProps = { year: selectedYear, years, onYearChange: setYear };

  let page;
  if (route.page === '') page = <Home {...pageProps} />;
  else if (route.page === 'ambito') page = <Area id={route.id} {...pageProps} />;
  else if (route.page === 'comparar') page = <Compare {...pageProps} />;
  else if (route.page === 'avisos') page = <Alerts {...pageProps} />;
  else if (route.page === 'fuentes') page = <Sources />;
  else page = <p className="state">Esta página no existe. <a href="#/">Volver al inicio</a></p>;

  const activePage = route.page === 'ambito' ? '' : route.page;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="brand">
            <span className="brand-mark" aria-hidden="true">€</span>
            CuentasClaras
          </a>
          <nav aria-label="Principal">
            {NAV.map((item) => (
              <a key={item.page} href={item.href} aria-current={activePage === item.page ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {usingMocks && (
        <div className="mock-banner" role="note">
          <div className="container">
            Estás viendo <strong>datos de ejemplo</strong>: las cifras son ilustrativas, no reales.
          </div>
        </div>
      )}

      <main className="container">
        {meta.error ? <p className="state state-error">No se pudieron cargar los datos: {meta.error}</p> : page}
      </main>

      <footer className="site-footer">
        <div className="container">
          Gasto del conjunto de las administraciones públicas según Eurostat (COFOG). Cada cifra enlaza a su
          fuente oficial en <a href="#/fuentes">Fuentes</a>. Equipo Leather and Lies · Hackatón 2Campus1Code.
        </div>
      </footer>
    </>
  );
}
