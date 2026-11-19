import { useState } from 'react';

// Botón de modo claro / oscuro de la cabecera.
// Por defecto manda el sistema (prefers-color-scheme). Si la persona pulsa, su elección se
// guarda en localStorage y se escribe en <html data-theme="…">, que es lo que lee index.css.
// index.html aplica la elección guardada antes de pintar, para que no haya parpadeo.

const KEY = 'cuentasclaras-theme';

function currentTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // sin almacenamiento (modo privado): el cambio vale hasta recargar
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={next === 'dark' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={next === 'dark' ? 'Modo oscuro' : 'Modo claro'}
    >
      {theme === 'dark' ? (
        // Sol: se ve en oscuro y lleva al modo claro
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={10 + Math.cos(a) * 6}
                y1={10 + Math.sin(a) * 6}
                x2={10 + Math.cos(a) * 8}
                y2={10 + Math.sin(a) * 8}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      ) : (
        // Luna: se ve en claro y lleva al modo oscuro
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
