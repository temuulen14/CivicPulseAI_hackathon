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

---

## 5. Avisos y Fuentes

### Archivos

| Archivo | Para qué sirve |
|---|---|
| `src/pages/Alerts.jsx` | `#/avisos`: todos los avisos del año, con filtros de severidad y tipo. |
| `src/pages/Sources.jsx` | `#/fuentes`: tabla de `GET /sources`. **Entregable obligatorio.** |

### Cómo funciona y por qué

- **Los filtros los aplica el backend.** La página solo guarda qué severidad y qué tipo
  están elegidos y los manda en la petición (`/alerts?severity=warning&type=…`). Así hay
  una sola lógica de filtrado, en el backend.
- Reutiliza `AlertCard` de la página de ámbito, con un enlace extra al ámbito de cada aviso.
- La lista avisa a los lectores de pantalla cuando cambia (`aria-live="polite"`).
- **Fuentes:** nombre con enlace, organismo, licencia y fecha de consulta. Debajo, un bloque
  "Cómo leer las cifras" con las tres limitaciones que el jurado puede preguntar: gasto
  ejecutado frente a presupuesto, clasificación COFOG y datos provisionales.
- La fecha `2026-11-19` se da la vuelta a mano (`19/11/2026`) en vez de usar `new Date`,
  que la interpreta en UTC y podría mostrar el día anterior según la zona horaria.

### Arreglo de móvil

Las tablas anchas empujaban toda la página hacia los lados en el móvil. Causa: los
elementos de una rejilla CSS no encogen por debajo de su contenido por defecto. Solución:
`main.container > * { min-width: 0; }`, y la tabla hace scroll dentro de su caja.

### Comprobado

Capturas de `/avisos` y `/fuentes` a 1280 px y 390 px, sin errores ni scroll horizontal.

---

## 6. Integración con el backend y pulido

### Integración

- Rebase sobre `main`, que ya trae el backend de Pedro. Cambios del contrato que afectan
  al frontend: un año sin datos devuelve 404, y `eu_median` y `evidence[].source_id`
  pueden ser `null`. Los tres casos ya estaban cubiertos.
- Probado de punta a punta: backend de Pedro con el `dataset.json` real de Mario (rama
  `Mario`) y frontend con `VITE_API_URL=http://localhost:8000/api`. Todas las páginas cargan
  datos reales (2015–2024; por ahora solo de España, sin avisos ni indicadores de uso).
- Cómo arrancarlo todo:
  ```bash
  # terminal 1 (backend)
  cd backend && .venv/bin/uvicorn main:app --reload
  # terminal 2 (frontend)
  cd frontend && echo "VITE_API_URL=http://localhost:8000/api" > .env.local && npm run dev
  ```

### Arreglos encontrados al usar datos reales

| Problema | Causa | Solución |
|---|---|---|
| Con nueve subámbitos, los nombres se montaban unos sobre otros | Altura fija del gráfico (280 px) | La altura crece con el número de barras (44 px cada una) |
| Valores partidos en dos líneas ("4,6" / "%") en barras cortas | Recharts ajusta la etiqueta al ancho de la barra | `BarValueLabel.jsx` dibuja el texto a mano, al final de la barra |
| Con un solo país, el gráfico de comparación quedaba vacío y la leyenda hablaba de una mediana que no existe | `eu_median` es `null` con menos de tres países | Mensaje explicándolo, leyenda sin "Mediana UE" y altura ajustada a las filas |
| La tarjeta "Evolución" se estiraba con un hueco en blanco | Las celdas de una rejilla se estiran a la altura de la más alta | `align-content: start` en las tarjetas de gráficos |
| Con el backend apagado salía "Failed to fetch" (en inglés) | Es el mensaje del navegador | `api.js` lo traduce: "el servidor no responde. ¿Está arrancado el backend?" |

### Estado de las páginas

Todas tienen estado de carga, de error y de "sin datos". Revisadas a 1280 px y 390 px
(móvil), en modo claro y oscuro: sin errores en consola y sin scroll horizontal.

---

## 7. Rediseño

Lo pidió el usuario: una web blanca, elegante, con un toque sostenible, más años, más
maneras de desglosar los datos y una página de Avisos nueva. Se revisó con tres skills:
`frontend-design` (dirección visual), `ui-ux-pro-max` (accesibilidad y pautas de
interfaz) y `dataviz` (gráficos y colores).

### Datos de ejemplo

- **Años 2015–2024** y 15 países, igual que el backend real.
- **8 avisos por año**, generados con las dos reglas del backend (`docs/ARCHITECTURE.md`).
  Entre ellos, el que pidió el equipo: viajeros en autobús frente a la parte del
  presupuesto de transporte que recibe.
- Los títulos siguen el estilo de los avisos reales ("Autobús: inversión frente a
  viajeros"; "España gasta menos que la mediana europea en Defensa"), así la interfaz se
  diseña con textos parecidos a los de verdad.

### Aspecto general (`src/index.css`)

| Qué | Por qué |
|---|---|
| Fondo blanco, líneas finas de 1 px en vez de sombras, mucho aire | La sensación que pidió el usuario, sin copiar ninguna marca |
| **Newsreader** (serif) para el nombre, los titulares y las cifras grandes; **Geist** (sans) para la interfaz y las tablas | Dos familias bien distintas: la serif da el tono editorial y la sans se lee bien en tamaños pequeños. Si no hay conexión: Georgia y la fuente del sistema |
| Sin el logo del €; el nombre CuentasClaras va en Newsreader | Petición del usuario |
| Verde bosque `#12805c` para el dato principal (gasto, España) y azul cielo `#3b72c9` para el segundo (uso, comparación) | Paleta validada con `scripts/validate_palette.js` de `dataviz`: se distinguen también con daltonismo |
| Escala verde de 5 pasos para la cuota del gasto total (`src/scale.js`) | Con 10 pasos el validador no los distinguía. El tono depende de la cuota (≥25 %, ≥10 %…), no del puesto, así significa lo mismo en cualquier año |
| Severidad con iconos SVG propios: octógono (importante), triángulo (merece una mirada) y círculo (para tu información) | Sustituyen a "!!", "!" e "i". Forma + texto + color: nunca solo color |
| Se quitaron los "→" de los enlaces y los " · " de los textos propios, y no hay etiquetas en mayúsculas | `frontend-design` los señala como tópicos de página generada |
| Foco visible, objetivos táctiles de 40–44 px, `prefers-reduced-motion` respetado, contraste ≥ 4,5:1 (el ámbar de texto se oscureció a `#8a5a00`) | Pautas de `ui-ux-pro-max` |

### Componentes nuevos

| Archivo | Qué hace |
|---|---|
| `YearPicker.jsx` | Fila de años 2015–2024; cada año lleva una barrita con su valor (gasto total, avisos, gasto del ámbito o % del PIB de España según la página). Se ve la tendencia antes de pulsar. Las barras parten de cero para no exagerar. Sustituye al desplegable `YearSelect` |
| `useAllYears.js` | Pide `/areas` de todos los años a la vez (`Promise.allSettled`) y lo guarda en memoria, así la portada, Avisos y el selector lo comparten. Un año que da 404 simplemente no aparece. `useEachYear` hace lo mismo con cualquier petición (Comparar lo usa con `/compare`) |
| `measures.js` | Las dos medidas elegibles: importe (variación en %) y % del PIB (variación en puntos, "p. p."). Así cada gráfico cambia de medida sin repetir código |
| `Spectrum.jsx` | El elemento distintivo de la portada: los diez ámbitos en una sola barra, cada uno con el ancho de su cuota y su tono verde, con enlace a su página. Los anchos llevan el nombre encima y todos aparecen en la lista de debajo |
| `Contours.jsx` | Curvas de nivel muy tenues en SVG detrás de la cifra: el toque sostenible, sin imágenes |
| `Segmented.jsx` | Control segmentado (vista, medida, orden) con `aria-pressed` |
| `Sparkline.jsx` | Línea mínima en SVG para tablas y tarjetas. Un año sin dato corta la línea en vez de inventarlo |
| `DivergingBars.jsx` | Barras desde un eje central: verde lo que sube o queda por encima, azul lo que baja o queda por debajo. Si todos los valores tienen el mismo signo, el eje se va a un lado y las barras usan todo el ancho |
| `ShareLegend.jsx` | Leyenda de la escala verde |

### Portada

- **Cabecera:** la pregunta "¿Adónde va el dinero público?", el gasto total en serif muy
  grande, el **espectro** de los diez ámbitos y el selector de años.
- **"Explora el gasto":** cuatro vistas de los mismos datos y dos medidas (importe o % del PIB):
  - **Mapa:** treemap con la escala verde y el número de avisos de cada ámbito.
  - **Ranking:** tabla con barra de cuota, sparkline 2015–2024, variación y avisos. Es
    también la alternativa accesible a los gráficos.
  - **Evolución:** el total año a año (pulsar un punto cambia el año de toda la página) y
    un pequeño gráfico por ámbito, cada uno con su propia escala.
  - **Cambios:** barras divergentes de la variación de cada ámbito, frente al año anterior
    o desde 2015.
- **"En qué fijarse":** los tres avisos más importantes, como lista.

### Avisos (rediseño completo)

- Se quitó el párrafo largo de la cabecera. En su lugar va una frase calculada: "8 avisos
  en 2024: 1 importante, 5 merecen una mirada y 2 para tu información".
- **Filtros visuales en vez de tres desplegables:** barra de severidad clicable (cada
  trozo, con su número y su ancho proporcional), chips de tipo y de ámbito con su recuento, y
  "Quitar filtros". Se piden todos los avisos del año una vez y se filtran en el
  navegador: filtrar no es calcular avisos. Un tipo sin avisos ese año no se ofrece.
- **Dos desgloses visuales** que se actualizan con los filtros:
  - **Gasto frente a uso:** gráfico de mancuernas, con un punto verde para la cuota de gasto y uno azul
    para la de uso. Cuanto más separados, mayor el desajuste.
  - **España frente a la mediana europea:** barras divergentes con la distancia relativa,
    calculada con las dos cifras de `evidence`.
  - Pulsar una fila abre ese aviso en la lista y lo trae a la vista.
- **Lista desplegable:** cada fila muestra icono, título, ámbito, tipo y las dos cifras
  clave ("55 % frente a 9,3 %"); al abrirla aparece la tarjeta completa con la nota del
  analista y las fuentes. Orden por severidad o por ámbito.

### Ámbito

Migas de pan en vez de "← Volver", selector de años con el gasto del ámbito, cifras clave
en una rejilla de líneas finas, evolución con selector importe o % del PIB (pulsar un año
lo selecciona) y el reparto en subámbitos con barras propias en HTML (con importe), que ya
no se cortan con nombres largos.

### Comparar

- El ámbito se elige con chips en vez de un desplegable.
- Las barras de países se dibujan en HTML: España resaltada en verde y la mediana UE como
  línea discontinua que cruza todas las filas.
- **Nuevo gráfico: España frente a la mediana europea en 2015–2024**, a partir de
  `/compare` de cada año. Dice si la distancia es de un año o viene de lejos.

### Fuentes

Solo estilos.

### Arreglos encontrados al revisar las capturas

| Problema | Solución |
|---|---|
| En móvil el año elegido (2024) quedaba fuera de la fila de años | En móvil los diez años se reparten el ancho sin scroll |
| En móvil la barra de severidad cortaba "Importante" | En móvil los tres trozos se apilan |
| La cifra de los bloques estrechos del treemap se salía | Solo se escribe si cabe entera |
| El icono de "Importante" salía negro dentro de un enlace | Cada icono lleva su propio color |
| Con datos reales, los chips de ámbito se estiraban a la altura de la fila | `align-items: center` en los chips |
| Con datos reales salía el chip "Gasto frente a uso 0" | Los tipos sin avisos ese año no se muestran |

### Comprobado

- `npx eslint src` y `npm run build` sin errores.
- Capturas a 1280 px y 390 px de todas las páginas y de las cuatro vistas de la portada, con
  mocks y con el backend real (dataset de `main`: 27 países de la UE). Sin errores en consola
  y sin scroll horizontal.
- Con datos reales de 2024 hay 2 avisos (los dos de comparación con la UE). Los cruces de
  educación de Mario no superan su umbral, así que no generan aviso: es lo esperado.
