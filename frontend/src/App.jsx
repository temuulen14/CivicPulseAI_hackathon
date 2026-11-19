import { useEffect, useState } from 'react';
import { getMeta, usingMocks } from './api.js';
import { useApi } from './useApi.js';
import Home from './pages/Home.jsx';
import Area from './pages/Area.jsx';
import Compare from './pages/Compare.jsx';
import Alerts from './pages/Alerts.jsx';
import Sources from './pages/Sources.jsx';
import Budget from './pages/Budget.jsx';
import BudgetPolicy from './pages/BudgetPolicy.jsx';
import BudgetProgram from './pages/BudgetProgram.jsx';

// Navegación sin librería: la página actual va en la URL tras la almohadilla
// (#/ambito/GF07, #/presupuestos/programa/453B). El navegador avisa con el evento
// "hashchange" cuando cambia, así que los enlaces, el botón "atrás" y compartir la URL
// funcionan sin más.
function readRoute() {
  const [page = '', id = null, sub = null] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { page, id, sub };
}

const NAV = [
  { href: '#/', page: '', label: 'Inicio' },
  { href: '#/presupuestos', page: 'presupuestos', label: 'Presupuestos' },
  { href: '#/comparar', page: 'comparar', label: 'Comparar' },
  { href: '#/avisos', page: 'avisos', label: 'Avisos' },
  { href: '#/fuentes', page: 'fuentes', label: 'Fuentes' },
];

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [year, setYear] = useState(null); // null = último año con datos
  // Los Presupuestos del Estado tienen sus propios años (2015–2025), por eso van aparte.
  const [budgetYear, setBudgetYear] = useState(null);
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
  const budgetProps = {
    year: budgetYear ?? meta.data?.latest_budget_year ?? null,
    years: meta.data?.budget_years ?? [],
    onYearChange: setBudgetYear,
  };

  let page;
  if (route.page === '') page = <Home {...pageProps} />;
  else if (route.page === 'ambito') page = <Area id={route.id} {...pageProps} onBudgetYearChange={setBudgetYear} />;
  else if (route.page === 'presupuestos' && route.id === 'politica') page = <BudgetPolicy id={route.sub} {...budgetProps} />;
  else if (route.page === 'presupuestos' && route.id === 'programa') page = <BudgetProgram id={route.sub} {...budgetProps} />;
  else if (route.page === 'presupuestos') page = <Budget {...budgetProps} />;
  else if (route.page === 'comparar') page = <Compare {...pageProps} />;
  else if (route.page === 'avisos') page = <Alerts {...pageProps} />;
  else if (route.page === 'fuentes') page = <Sources />;
  else page = <p className="state">Esta página no existe. <a href="#/">Volver al inicio</a></p>;

  const activePage = route.page === 'ambito' ? '' : route.page;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="wordmark">
            CuentasClaras
          </a>
          <nav className="site-nav" aria-label="Principal">
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
        <div className="container footer-inner">
          <p>
            Gasto del conjunto de las administraciones públicas según Eurostat (COFOG). Cada cifra enlaza a su
            fuente oficial en <a href="#/fuentes">Fuentes</a>.
          </p>
          <p>Hecho por el equipo Leather and Lies para el Hackatón 2Campus1Code.</p>
        </div>
      </footer>
    </>
  );
}
