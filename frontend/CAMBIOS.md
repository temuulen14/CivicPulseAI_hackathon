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

---

## 2. Portada

**Objetivo:** que en diez segundos se vea cuánto se gasta, en qué y qué merece atención.

### Archivos

| Archivo | Para qué sirve |
|---|---|
| `src/pages/Home.jsx` | La portada: cifra total, mapa del gasto, avisos destacados y ranking. |
| `src/components/AreaTreemap.jsx` | Mapa de áreas (treemap de Recharts). |
| `src/components/Severity.jsx` | Etiqueta de severidad (color + icono + texto). |
| `src/labels.js` | Textos de severidad y de tipo de aviso, en un solo sitio. |

### Cómo funciona y por qué

- **Cifra grande.** Total en palabras ("680 mil millones de €") porque se entiende mejor
  que "680.225 M€"; la cifra exacta va justo debajo. Si `provisional` es verdadero,
  aparece la etiqueta "Dato provisional".
- **Selector de año.** Cambia el año compartido de `App.jsx`. `useApi(..., [year])` vuelve
  a pedir los datos cada vez que cambia.
- **Mapa del gasto (treemap).** Cada bloque es un ámbito y su **área es proporcional al
  importe**. Es el gráfico que mejor muestra "partes de un todo" con diez elementos: con
  diez sectores, una tarta no se lee.
  - Color: **un solo tono azul**, más oscuro cuanto más dinero (refuerza el tamaño, no
    añade información nueva). No usamos colores distintos por ámbito porque diez colores
    no se distinguen y harían pensar que significan algo.
  - Los ámbitos con avisos llevan un **círculo con el número de avisos**, del color de su
    severidad más alta.
  - Clic o tecla Intro en un bloque → `#/ambito/<id>`. Cada bloque se puede enfocar con
    el tabulador y tiene `aria-label` para lectores de pantalla.
  - El nombre se recorta con "…" si no cabe, y en los bloques muy pequeños no se escribe
    (está en el tooltip y en la tabla).
  - `Cell` es la función que Recharts llama para dibujar cada rectángulo; ahí decidimos
    el color, el texto y el círculo.
- **Avisos destacados.** Los tres primeros de `GET /alerts`, que el backend ya devuelve
  ordenados por severidad. **El frontend no calcula avisos**, solo los muestra.
- **Tabla "de mayor a menor".** Las mismas cifras del mapa en una tabla: sirve en el móvil,
  para lectores de pantalla y para quien quiera la cifra exacta.
- **Severidad nunca solo con color.** Siempre icono + texto: "Para tu información",
  "Merece una mirada", "Importante". Lenguaje que señala sin acusar, como pide el brief.

### Comprobado

`npm run build` y `eslint` sin errores. Capturas a 1280 px y a 390 px (móvil): sin errores
en consola y sin scroll horizontal.

---

## 3. Página de ámbito

**Objetivo:** la pantalla que más se enseñará en la demo. Explica un ámbito y, sobre todo,
sus avisos.

### Archivos

| Archivo | Para qué sirve |
|---|---|
| `src/pages/Area.jsx` | Página `#/ambito/<id>`: cabecera, avisos, gráficos, indicadores y marco legal. |
| `src/components/AlertCard.jsx` | Tarjeta de aviso. Se reutiliza en la página `/avisos`. |
| `src/sources.js` | `useSourcesById()`: pide `/sources` y permite buscar cada fuente por su `source_id`. |

### Cómo funciona y por qué

- **Cabecera en cuatro cifras:** importe, % del gasto total, % del PIB y variación anual.
  La variación se calcula a partir de `history` (año elegido frente al anterior), porque el
  contrato no la incluye en esta ruta. Es una resta, no un aviso: no rompe la regla de
  "no calcular avisos en el cliente".
- **"En qué fijarse" va antes que los gráficos**, porque es lo que aporta valor más allá
  de mostrar datos.
- **Tarjeta de aviso (`AlertCard`).** Severidad (icono + texto), tipo de aviso, título,
  frase y las dos cifras de `evidence` **enfrentadas en barras**. Cada barra se mide
  contra la mayor de las dos, así la diferencia (55 % frente a 9,3 %) se ve sin leer
  números. La primera cifra va en azul y la segunda en gris: el color distingue "lo que
  se gasta" de "con qué se compara" sin parecer una alarma. Debajo, la nota del analista
  (si la hay) y los enlaces a cada fuente.
- **Evolución del gasto:** gráfico de líneas (un solo dato a lo largo del tiempo), con eje
  Y desde cero para no exagerar los cambios. El tooltip avisa si el año es provisional.
- **En qué se reparte:** barras horizontales, porque los nombres de los subámbitos son
  largos y así se leen enteros. Valor escrito al final de cada barra.
- **Cómo se usa:** los indicadores de uso del ámbito, cada uno con su año, unidad y fuente.
- **Marco legal:** la ley de presupuestos en el BOE. Si `legal` es `null`, se dice
  claramente. Recordamos que las cifras son gasto ejecutado y no el crédito de la ley
  (es una limitación documentada en `docs/ARCHITECTURE.md`).
- **Estados vacíos:** sin avisos, sin desglose, sin historial o sin ley, cada bloque lo dice
  en vez de quedarse en blanco. Un ámbito inexistente (`#/ambito/GF99`) muestra el error
  del backend ("Área no encontrada").

### Comprobado

Capturas a 1280 px (claro) y 390 px (oscuro) del ámbito GF04, y del ámbito inexistente
GF99: sin errores en consola y sin scroll horizontal.

---

## 4. Comparar países

**Objetivo:** ver de un vistazo si España gasta más o menos que otros países en un mismo ámbito.

### Archivos

`src/pages/Compare.jsx` (y la leyenda en `src/index.css`).

### Cómo funciona y por qué

- **Selector de ámbito y de año.** El ámbito es estado local de la página (empieza en
  Sanidad); el año es el compartido. Cada cambio vuelve a pedir `GET /compare`.
- **Barras horizontales ordenadas de mayor a menor**: con doce países, ordenar convierte
  el gráfico en un ranking que se entiende sin leer números.
- **España en azul, el resto en gris.** Un solo color de acento para lo que importa.
- **Línea discontinua de la mediana de la UE** (`ReferenceLine` de Recharts), con su valor
  escrito encima. La mediana y no la media porque un país extremo no la mueve.
- **Frase resumen** encima del gráfico ("puesto 9 de 12, 0,5 % del PIB por debajo de la
  mediana"): la conclusión está escrita, el gráfico la respalda.
- **% del PIB y no euros**, porque compara países de tamaños muy distintos.

### Comprobado

Capturas a 1280 px y 390 px, sin errores ni scroll horizontal.
