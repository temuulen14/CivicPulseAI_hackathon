import { useEffect, useState } from 'react';
import { getMeta } from './api.js';
import { useApi } from './useApi.js';
import Home from './pages/Home.jsx';
import Area from './pages/Area.jsx';
import Compare from './pages/Compare.jsx';
import Alerts from './pages/Alerts.jsx';
import Sources from './pages/Sources.jsx';
import Budget from './pages/Budget.jsx';
import BudgetPolicy from './pages/BudgetPolicy.jsx';
import BudgetProgram from './pages/BudgetProgram.jsx';
import Pensions from './pages/Pensions.jsx';
import WorldLeaders from './pages/WorldLeaders.jsx';
import Calculator from './pages/Calculator.jsx';
import Search from './pages/Search.jsx';
import EuFunds from './pages/EuFunds.jsx';
import Segmented from './components/Segmented.jsx';

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
  { href: '#/fondos-europeos', page: 'fondos-europeos', label: 'Fondos europeos' },
  { href: '#/pensiones', page: 'pensiones', label: 'Pensiones' },
  { href: '#/calculadora', page: 'calculadora', label: 'Calculadora' },
  { href: '#/comparar', page: 'comparar', label: 'Comparar con otros países' },
  { href: '#/avisos', page: 'avisos', label: 'Avisos' },
];

// Cabecera: todas menos Pensiones, que tiene su propio bloque destacado en la portada
// (y un enlace desde Protección social), para no recargar el menú. El buscador va aparte,
// como lupa a la derecha.
const HEADER_NAV = NAV.filter((item) => item.page !== 'pensiones');

// «Comparar con otros países» tiene dos vistas; la elegida va en la URL (#/comparar/mapa).
const COMPARE_VIEWS = [
  { value: 'barras', label: 'País a país' },
  { value: 'mapa', label: 'Mapa' },
];

// Menú del pie: todas las páginas, con Fuentes bien visible (ya no está en la cabecera).
const FOOTER_NAV = [
  ...NAV,
  { href: '#/buscar', page: 'buscar', label: 'Buscar' },
  { href: '#/fuentes', page: 'fuentes', label: 'Fuentes de datos' },
];

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [year, setYear] = useState(null); // null = último año con datos
  // Los Presupuestos del Estado tienen sus propios años (2015–2025), por eso van aparte.
  const [budgetYear, setBudgetYear] = useState(null);
  // Euros o % del PIB: se elige en el interruptor de cada gráfico y vale para todas las páginas.
  const [measure, setMeasure] = useState('amount');
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
  const pageProps = { year: selectedYear, years, onYearChange: setYear, measure, onMeasureChange: setMeasure };
  const budgetProps = {
    measure,
    onMeasureChange: setMeasure,
    year: budgetYear ?? meta.data?.latest_budget_year ?? null,
    years: meta.data?.budget_years ?? [],
    onYearChange: setBudgetYear,
    dataYears: years, // años con gasto real (Eurostat): 2025 tiene presupuesto pero aún no gasto
  };

  let page;
  if (route.page === '') page = <Home {...pageProps} />;
  else if (route.page === 'ambito') page = <Area id={route.id} {...pageProps} onBudgetYearChange={setBudgetYear} />;
  else if (route.page === 'presupuestos' && route.id === 'politica') page = <BudgetPolicy id={route.sub} {...budgetProps} />;
  else if (route.page === 'presupuestos' && route.id === 'programa') page = <BudgetProgram id={route.sub} {...budgetProps} />;
  else if (route.page === 'presupuestos') page = <Budget {...budgetProps} />;
  else if (route.page === 'buscar') page = <Search query={route.id} {...budgetProps} />;
  else if (route.page === 'fondos-europeos') page = <EuFunds {...budgetProps} />;
  else if (route.page === 'pensiones') page = <Pensions {...pageProps} />;
  else if (route.page === 'calculadora') page = <Calculator year={selectedYear} />;
  else if (route.page === 'comparar' || route.page === 'mapa') {
    // #/mapa es la dirección antigua del mapa: se mantiene para no romper enlaces.
    const showMap = route.page === 'mapa' || route.id === 'mapa';
    page = (
      <>
        <Segmented
          label="Vista de la comparación"
          options={COMPARE_VIEWS}
          value={showMap ? 'mapa' : 'barras'}
          onChange={(view) => (window.location.hash = view === 'mapa' ? '#/comparar/mapa' : '#/comparar')}
        />
        {showMap ? <WorldLeaders {...pageProps} /> : <Compare {...pageProps} />}
      </>
    );
  }
  else if (route.page === 'avisos') page = <Alerts {...pageProps} focus={route.id} />;
  else if (route.page === 'fuentes') page = <Sources />;
  else page = <p className="state">Esta página no existe. <a href="#/">Volver al inicio</a></p>;

  const activePage = route.page === 'ambito' ? '' : route.page === 'mapa' ? 'comparar' : route.page;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#/" className="wordmark">
            CuentasClaras
          </a>
          <nav className="site-nav" aria-label="Principal">
            {HEADER_NAV.map((item) => (
              <a key={item.page} href={item.href} aria-current={activePage === item.page ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#/buscar"
            className="header-search"
            aria-label="Buscar en los Presupuestos"
            title="Buscar"
            aria-current={activePage === 'buscar' ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </a>
        </div>
      </header>

      <main className="container">
        {meta.error ? <p className="state state-error">No se pudieron cargar los datos: {meta.error}</p> : page}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a href="#/" className="wordmark">
              CuentasClaras
            </a>
            <p>
              Gasto del conjunto de las administraciones públicas según Eurostat (COFOG) y Presupuestos Generales del
              Estado. Datos oficiales y abiertos.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Pie de página">
            <h2 className="footer-title">Secciones</h2>
            <ul>
              {FOOTER_NAV.map((item) => (
                <li key={item.page}>
                  <a
                    href={item.href}
                    className={item.page === 'fuentes' ? 'footer-sources' : undefined}
                    aria-current={activePage === item.page ? 'page' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="footer-cta">
            <h2 className="footer-title">De dónde sale cada cifra</h2>
            <p>Cada dato enlaza a su fuente oficial: Eurostat, Hacienda, el BOE y la OCDE.</p>
            <a href="#/fuentes" className="button-link">
              Ver las fuentes de datos
            </a>
          </div>
        </div>
        <div className="container footer-base">
          <p>Hecho por el equipo Leather and Lies para el Hackatón 2Campus1Code.</p>
        </div>
      </footer>
    </>
  );
}
