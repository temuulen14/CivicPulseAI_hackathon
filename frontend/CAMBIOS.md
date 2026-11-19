# Registro de cambios del frontend

Para estudiar y defender el frontend ante el jurado. Cada entrada cuenta **qué** se hizo,
**por qué** y **cómo funciona**, y señala los archivos implicados. Va en el mismo orden que
los commits de la rama `Dersu`.

---

## 0. Decisión de stack: React + Vite + Recharts (JavaScript y CSS normales)

Los documentos del equipo (`CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/briefs/DERSU.md`)
proponían Vite + React + TypeScript + Tailwind + Recharts + React Router. Lo hemos reducido a
lo mínimo que sigue cubriendo **todas** las funciones del brief:

| Pieza | ¿Está? | Por qué |
|---|---|---|
| React | Sí | Construye la interfaz con componentes reutilizables (tarjeta de aviso, selector de año…). |
| Vite | Sí | Arranca React en desarrollo (`npm run dev`) y genera la versión final (`npm run build`). Sin él habría que cargar React desde un CDN. |
| Recharts | Sí | Los gráficos del brief (mapa de áreas, líneas, barras, comparación de países). Dibujarlos a mano en SVG serían cientos de líneas. |
| TypeScript | No | JavaScript normal, para tener menos que justificar. La forma de los datos está en `docs/API_CONTRACT.md` y en los comentarios de `src/api.js`. |
| Tailwind | No | Un solo archivo CSS (`src/index.css`) con variables de color. Se lee sin conocer ninguna convención extra. |
| React Router | No | La navegación son unas 20 líneas en `src/App.jsx` (ver punto 1). |

> Hay que actualizar esos tres documentos para que reflejen este stack (no son de la carpeta `frontend/`).

---

## 1. Esqueleto, API y datos de ejemplo

**Objetivo:** que el frontend funcione desde el primer minuto sin depender del backend.

### Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página base: idioma `es`, título y descripción. |
| `src/main.jsx` | Punto de entrada: monta `<App />` dentro de `#root`. |
| `src/App.jsx` | Cabecera, navegación, aviso de datos de ejemplo, pie y elección de página. |
| `src/api.js` | Una función por endpoint del contrato (`getMeta`, `getAreas`, `getArea`, `getAlerts`, `getCompare`, `getSources`). |
| `src/mocks.js` | Datos de ejemplo con la misma forma que el contrato. |
| `src/useApi.js` | Hook que hace una petición y devuelve `{ loading, error, data }`. |
| `src/format.js` | Formato numérico español: `84.500 M€`, `680 mil millones de €`, `12,4 %`. |
| `src/components/Status.jsx` | Mensajes de "Cargando…", error y "sin datos", iguales en todas las páginas. |
| `src/components/YearSelect.jsx` | Selector de año. |
| `src/index.css` | Todos los estilos, con modo claro y oscuro. |
| `.env.example` | Cómo apuntar al backend. |

### Cómo funciona

- **Datos de ejemplo o backend real.** `api.js` lee `VITE_API_URL`. Vacía → responde con
  `mocks.js` (tras una espera de 250 ms, para que también se vea el estado de carga). Con
  valor → `fetch` a `VITE_API_URL + ruta`. Las páginas no saben cuál de los dos se usa:
  cambiar al backend real es cambiar una variable.
- **Nunca se presentan datos de ejemplo como reales.** Mientras se usan los mocks, una franja
  amarilla bajo la cabecera lo dice. Las cifras de `mocks.js` son ilustrativas; solo el
  reparto modal (coche 84,0 %, tren 9,3 %, autobús 6,7 %) y la Ley 31/2022 salen de
  `docs/DATA_SOURCES.md`.
- **Navegación sin librería (hash routing).** La página va en la URL tras la `#`
  (`#/ambito/GF07`, `#/comparar`). Al pulsar un enlace cambia la `#`, el navegador lanza
  el evento `hashchange`, `App.jsx` lo escucha, lee la ruta y pinta la página que toca.
  El botón "atrás" y compartir enlaces funcionan sin hacer nada más, y no hace falta
  configurar el servidor porque todo lo que va tras la `#` no llega a él.
- **El año se comparte.** Vive en `App.jsx` y se pasa a cada página, así que si eliges 2022
  en la portada, la página de un ámbito también abre en 2022. `null` significa "el último
  año con datos" (`meta.latest_year`).
- **`useApi`** evita repetir en cada página el mismo `useEffect` + `useState`. La bandera
  `active` descarta respuestas antiguas: si cambias de año dos veces seguidas, solo se
  pinta la última respuesta.
- **Formato español.** `Intl.NumberFormat('es-ES')` con `useGrouping: 'always'`, porque
  por defecto el español no pone punto en los números de cuatro cifras (`8450` → `8.450`).

### Pendiente de hablar con Pedro

- La cabecera del ámbito pide "variación anual", pero `GET /areas/{id}` no trae
  `yoy_change_pct` (solo `GET /areas` lo trae). Mientras tanto se calcula a partir de
  `history` (año elegido frente al anterior). Si Pedro lo añade al contrato, se usa directamente.
