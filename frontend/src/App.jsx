import { useEffect, useState } from 'react';
import { getMeta } from './api.js';
import { useApi } from './useApi.js';
import Home from './pages/Home.jsx';
import Spending from './pages/Spending.jsx';
import Area from './pages/Area.jsx';
import Compare from './pages/Compare.jsx';
import Alerts from './pages/Alerts.jsx';
import Sources from './pages/Sources.jsx';
import Budget from './pages/Budget.jsx';
import BudgetPolicy from './pages/BudgetPolicy.jsx';
import BudgetProgram from './pages/BudgetProgram.jsx';
import Pensions from './pages/Pensions.jsx';
import Calculator from './pages/Calculator.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Brand from './components/Brand.jsx';
import HeaderSearch from './components/HeaderSearch.jsx';
import Search from './pages/Search.jsx';
import EuFunds from './pages/EuFunds.jsx';

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
  { href: '#/gasto', page: 'gasto', label: 'Gasto público' },
  { href: '#/presupuestos', page: 'presupuestos', label: 'Presupuestos' },
  { href: '#/fondos-europeos', page: 'fondos-europeos', label: 'Fondos europeos' },
  { href: '#/pensiones', page: 'pensiones', label: 'Pensiones' },
  { href: '#/calculadora', page: 'calculadora', label: 'Calculadora' },
  { href: '#/comparar', page: 'comparar', label: 'Comparar con otros países' },
  { href: '#/avisos', page: 'avisos', label: 'Avisos' },
];

// Cabecera: todas menos Pensiones, que tiene su tarjeta en la portada
// (y un enlace desde Protección social), para no recargar el menú. El buscador va aparte,
// como lupa a la derecha: al pulsarla se escribe ahí mismo (HeaderSearch).
const HEADER_NAV = NAV.filter((item) => item.page !== 'pensiones');


// Menú del pie: todas las páginas en una sola línea; Fuentes solo se enlaza desde aquí.
const FOOTER_NAV = [
  ...NAV,
  { href: '#/buscar', page: 'buscar', label: 'Buscar' },
  { href: '#/fuentes', page: 'fuentes', label: 'Fuentes' },
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
  else if (route.page === 'gasto') page = <Spending {...pageProps} />;
  else if (route.page === 'ambito') page = <Area id={route.id} {...pageProps} onBudgetYearChange={setBudgetYear} />;
  else if (route.page === 'presupuestos' && route.id === 'politica') page = <BudgetPolicy id={route.sub} {...budgetProps} />;
  else if (route.page === 'presupuestos' && route.id === 'programa') page = <BudgetProgram id={route.sub} {...budgetProps} />;
  else if (route.page === 'presupuestos') page = <Budget {...budgetProps} />;
  else if (route.page === 'buscar') page = <Search query={route.id} {...budgetProps} />;
  else if (route.page === 'fondos-europeos') page = <EuFunds {...budgetProps} />;
  else if (route.page === 'pensiones') page = <Pensions {...pageProps} />;
  else if (route.page === 'calculadora') page = <Calculator year={selectedYear} />;
  // #/mapa y #/comparar/mapa eran el mapa aparte; ahora vive dentro de Comparar y los enlaces antiguos siguen funcionando.
  else if (route.page === 'comparar' || route.page === 'mapa') page = <Compare {...pageProps} />;
  else if (route.page === 'avisos') page = <Alerts {...pageProps} focus={route.id} />;
  else if (route.page === 'fuentes') page = <Sources />;
  else page = <p className="state">Esta página no existe. <a href="#/">Volver al inicio</a></p>;

  const activePage = route.page === 'ambito' ? 'gasto' : route.page === 'mapa' ? 'comparar' : route.page;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="site-nav" aria-label="Principal">
            {HEADER_NAV.map((item) => (
              <a key={item.page} href={item.href} aria-current={activePage === item.page ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="header-tools">
            <HeaderSearch active={activePage === 'buscar'} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container">
        {meta.error ? <p className="state state-error">No se pudieron cargar los datos: {meta.error}</p> : page}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand />
          <nav className="footer-nav" aria-label="Pie de página">
            {FOOTER_NAV.map((item) => (
              <a key={item.page} href={item.href} aria-current={activePage === item.page ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="container footer-base">
          <p>Datos oficiales y abiertos: Eurostat, Hacienda, el BOE y la OCDE.</p>
          <p>Equipo Leather and Lies · Hackatón 2Campus1Code</p>
        </div>
      </footer>
    </>
  );
}
