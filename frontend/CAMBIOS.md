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

---

## 8. Backend v1.1 de Pedro: Presupuestos Generales del Estado

Pedro publicó el contrato v1.1 (`docs/API_CONTRACT.md`). Solo añade campos y rutas, así que
nada de lo anterior se rompe. El frontend aprovecha todo lo nuevo:

### Ámbito

| Qué | Cómo |
|---|---|
| Variación anual | Se usa `yoy_change_pct` de la API. En % del PIB (puntos) se sigue calculando desde `history` |
| **"En qué se va el dinero"** | `spending_by_type`: personal, compras, inversión, subvenciones… con barra, porcentaje, importe y una frase que explica cada tipo. Los tipos a cero no se enseñan |
| **"En los Presupuestos del Estado"** | `budget_policies`: las políticas de los PGE que corresponden al ámbito, con enlace a cada una. El texto avisa de que es otra cifra y no se compara con la de arriba. Al pulsar, la sección de Presupuestos se abre en el mismo año |

### Sección nueva: Presupuestos (`#/presupuestos`)

Nueva entrada en el menú ("Comparar países" pasa a "Comparar" para que quepa). Tres pantallas,
igual que las rutas de la API:

1. **El año** (`Budget.jsx`, `/budget/years` y `/budget`):
   - La cifra de la Ley de ese año en grande. Si es una prórroga o no hay documento (2020), la
     frase lo dice, con la nota del backend.
   - **Evolución 2015–2025** (`BudgetBars.jsx`): columnas con la serie sin Seguridad Social (la
     única comparable entre años). Verde = ley aprobada, verde claro = prórroga, azul = fondos
     europeos de recuperación, hueco = sin documento. Cada columna es un botón que elige el año.
   - **Franja de Gobiernos** alineada con las columnas, con tonos neutros y sin colores de partido,
     más una frase: quién elaboró el presupuesto vigente y quién lo ejecutó (con días). No se
     suma nada por Gobierno.
   - **Políticas del año**: barras con el tramo de fondos europeos en azul. Se pueden agrupar
     **por política** o **por ámbito** (equivalencia aproximada) y ver **con o sin Seguridad
     Social** cuando la ley la incluye.
2. **La política** (`BudgetPolicy.jsx`, `/budget/policies/{id}`): cifras clave, su evolución (las
   mismas columnas, clicables), enlace al ámbito de Eurostat y sus programas.
3. **El programa** (`BudgetProgram.jsx`, `/budget/programs/{id}`): por ministerio y organismo; los
   capítulos (nivel 1) son filas desplegables y dentro aparecen artículos, conceptos y
   subconceptos sangrados por nivel. Solo se suman los capítulos, como dice el contrato.
   Un programa que no existe ese año muestra el error del backend y el selector para cambiar.

Un aviso fijo (`BudgetNotice.jsx`) explica en cada pantalla que **no es la misma cifra que la
portada**: lo presupuestado para el Estado central frente a lo gastado por todas las
administraciones.

### Otros cambios

- `api.js`: cuatro funciones nuevas (`getBudgetYears`, `getBudget`, `getBudgetPolicy`,
  `getBudgetProgram`).
- `mocksBudget.js`: datos de ejemplo con la forma de v1.1 y la estructura real (prórrogas en 2019,
  2024 y 2025; 2020 sin documento; fondos europeos desde 2021; los Gobiernos de cada año).
  `mocks.js` añade `budget_years`, `yoy_change_pct`, `spending_by_type` y `budget_policies`.
- `format.js`: `formatKeur` y `formatKeurWords` (los PGE vienen en miles de euros; se enseñan en
  millones como el resto). El € va con espacio de no separación para que nunca quede solo.
- `labels.js`: `sentenceCase` (ministerios y capítulos vienen en mayúsculas en el documento).
- `governments.js`: textos de los Gobiernos ("Sánchez (PSOE y Sumar)").
- `App.jsx`: rutas de tres partes (`#/presupuestos/programa/453B`) y un año propio para los PGE
  (2015–2025), separado del de Eurostat (2015–2024).
- `YearPicker`: sin valores, enseña solo los años (lo usa la página de programa).
- Portada: bloque "Partida a partida" que lleva a la sección nueva.

### Arreglos encontrados al revisar las capturas

| Problema | Solución |
|---|---|
| En móvil las columnas de los PGE no se veían | Al ocultar la cifra de encima se descolocaba la rejilla; ahora la rejilla móvil tiene sus propias filas |
| En móvil el menú cortaba "Fuentes" | El menú pasa a dos líneas si no cabe |
| En móvil la cabecera perdía el margen lateral (ya pasaba antes) | El relleno vertical ya no pisa el lateral del contenedor |
| "mil millones de €" dejaba el € solo en otra línea | Espacio de no separación antes del € |
| "En qué se va el dinero" se descolocaba en escritorio | Heredaba una regla de columna de otra lista; se anula para esta |

### Comprobado

- `npx eslint src` y `npm run build` sin errores.
- Capturas a 1280 px y 390 px de todas las páginas (también las tres nuevas, con un capítulo
  desplegado), con mocks y con el backend de Pedro en `main` y el dataset real. Sin errores en
  consola y sin scroll horizontal.


---

## 9. Euros o % del PIB, previsión de riesgos, pensiones y 2020 (19-11-2026)

Lo que pidió el usuario, punto por punto, y cómo se hizo.

### 9.1 Interruptor «Euros / % del PIB»

- **Qué:** un control en la cabecera («Ver en: Euros | % del PIB») que cambia todas las cifras.
- **Cómo:** el estado `measure` vive en `App.jsx` (como el año) y baja a las páginas. Se quitaron
  los dos controles «Medida» que había dentro de la portada y del ámbito, para no tener dos
  botones que hacen lo mismo. Solo aparece en las páginas donde tiene sentido (Comparar ya va
  siempre en % del PIB).
- La cifra grande de la portada pasa a «el 45,6 % del PIB», y el selector de años, el treemap,
  el ranking y la evolución usan la medida elegida.
- **Presupuestos:** los PGE no traen PIB. Se deduce del gasto de Eurostat del mismo año
  (suma de importes / suma de % del PIB) y se enseña con «≈». En 2025 no hay dato de Eurostat:
  se dice y se queda en euros.

### 9.2 Distinción por Gobierno

Ya existía en Presupuestos. Ahora la franja de Gobiernos (`GovernmentBand`) aparece también bajo
el selector de años de la portada, de cada ámbito y de Pensiones. Los Gobiernos se piden una vez
(`useGovernments` en `governments.js`, con `/budget/years`). En tramos estrechos solo sale el
apellido para que no se corte a media palabra.

### 9.3 Sin franja de «datos de ejemplo»

- Se quitó la franja. Para no enseñar cifras de ejemplo como si fueran reales, `api.js` llama
  ahora **por defecto al backend real** (`http://localhost:8000/api`). Los mocks solo se usan con
  `VITE_API_URL=mocks` (ver `.env.example` y `README.md`).

### 9.4 Previsión: qué servicios públicos pueden dar problemas

- **Archivos:** `forecast.js` (la regla) y `components/RiskWatch.jsx` (la vista).
- **Idea:** los problemas de un servicio (averías, accidentes, esperas) llegan tras años de
  señales: avisos que se repiten, inversión que cae, quedarse por detrás de Europa. Se suman
  esas señales con una regla de puntos sencilla y explicada en la propia página:

| Señal | Puntos |
|---|---|
| Tiene avisos en el año (2 si alguno no es informativo) | 1–2 |
| Avisos en 3 o más de los últimos años | 1 |
| Gasta un 15 % o más por debajo de la mediana UE (en % del PIB, solo si la mediana es ≥ 0,3 %) | 1 |
| … y la distancia ha crecido | 1 |
| La inversión (tipo de gasto `OP5ANP`) cae un 15 % o más en % del PIB (2 puntos si cae un 30 %) | 1–2 |
| El ámbito pierde 0,2 puntos o más del PIB (y al menos un 5 %) | 1 |

  2 o más puntos = «Vigilar»; 4 o más = «Riesgo alto». Ventana de 5 años.
- Solo cuentan los avisos que apuntan a **falta** de recursos: gastar más que Europa (medio
  ambiente) no es un riesgo.
- Se analizan los diez ámbitos y 13 servicios concretos (transporte, hospitales, atención
  primaria, colegios, institutos, universidad, policía, bomberos, juzgados, prisiones, agua,
  aguas residuales y residuos).
- **«¿Y si esta web hubiera existido antes?»:** se elige un año y la previsión se calcula solo con
  los datos hasta ese año; cada tarjeta dice qué pasó después. Con los datos reales, en 2019 ya
  salía **Transporte** («Vigilar»: un 42 % por debajo de la mediana UE e inversión del 0,82 % al
  0,55 % del PIB entre 2015 y 2019), que es justo el ejemplo del usuario con el ferrocarril.
- Está en Avisos (completa, con tabla de señales) y en la portada.
- **Por qué en el frontend:** lo pidió el usuario a última hora. No es un aviso del backend: usa
  las respuestas de `/areas`, `/areas/{id}`, `/alerts` y `/compare`, guardadas en memoria
  (`cached` en `useAllYears.js`) para no pedir dos veces lo mismo.

### 9.5 «En qué fijarse» en el último año

Solo cuando se mira el año más reciente (2024), la sección de la portada pasa a «En qué fijarse
ahora»: explica que es el año más cercano a hoy, enseña las tres primeras tarjetas de la
previsión y enlaza a la completa (`#/avisos/prevision`, que baja directamente a ella). El resto
de años sigue igual.

### 9.6 Pensiones: dinero frente a demanda

- **Página nueva** `#/pensiones` (`pages/Pensions.jsx`), en el menú principal.
- **Dinero:** gasto de todas las administraciones en «Vejez» (GF1002) y «Supervivientes» (GF1003),
  de `/areas/{id}`.
- **Demanda:** pensionistas de jubilación y supervivencia (Eurostat `spr_pns_ben`, `OLD_SRV`, que
  no cuenta dos veces a quien cobra ambas) y población de 65 años o más (Eurostat
  `demo_pjanbroad`). Descargadas de la API de Eurostat el 19-11-2026 y guardadas, con la
  consulta exacta, en `pensionsDemand.js`. Habría que pasarlas al pipeline de Mario.
- **Qué enseña:** gasto, pensionistas, gasto por pensionista (y en 14 pagas), mayores de 65 y
  pensionistas por cada 100; un gráfico índice (2015 = 100) con las tres curvas; una frase que lo
  resume («el gasto creció un 61,5 %; los pensionistas, un 11,3 %…»). En euros se avisa de que
  parte de la subida es inflación; en % del PIB no hace falta.

### 9.7 Fuentes en el pie

«Fuentes» sale de la cabecera. El pie es nuevo: marca y descripción, menú con todas las secciones
(«Fuentes de datos» destacada en verde) y un bloque «De dónde sale cada cifra» con botón.

### 9.8 2020 ya no sale vacío en Presupuestos

En 2020 no hubo ley ni documento: siguió vigente la prórroga del presupuesto de 2018, la misma
que en 2019. `budgetInForce.js` envuelve las llamadas de los PGE: si un año no tiene documento,
usa el del año anterior y lo marca con `carried_from`. La página lo dice («siguió vigente la
misma prórroga que en 2019… las cifras son las del documento de 2019»), la columna de 2020 sale
rayada con la etiqueta «Prórroga (=2019)», y lo mismo en las páginas de política y programa.
Quién lo elaboró y quién lo ejecutó siguen siendo los de 2020.

### 9.9 Interfaz

- Cabecera con el interruptor de medida en negro; menú centrado.
- Tarjetas de riesgo con medidor de 4 tramos, filo de color por nivel y lista de motivos.
- Barras del selector de años algo más altas (se lee mejor la tendencia).
- Pie nuevo en gris bruma con tres columnas (una en móvil).

### Comprobado

- `npx eslint src` y `npm run build` sin errores.
- Capturas a 1280 y 390 px con el backend de Pedro y el dataset real de `main`: portada (euros y
  % del PIB), Avisos (previsión en 2024 y en 2019), Pensiones, Presupuestos en 2020, un servicio
  (Transporte) y Fuentes. Sin errores en consola y sin scroll horizontal.

## 10. Contrato v1.2: países de fuera de la UE en Comparar, y pulido (19-11-2026, Pedro)

Hecho por Pedro en la rama `Dersu` (acordado), después de mezclar `main` (backend v1.2).

### 10.1 «Fuera de la UE» en Comparar

- **Qué:** debajo de la lista de los 27 países sale un bloque «Fuera de la UE» con Estados
  Unidos, Reino Unido, Australia, Japón y Corea del Sur (los que tengan dato ese año).
- **Cómo:** `/compare` trae desde la v1.2 `world_rows` y `world_source_id`. Se pintan con las
  mismas barras (`country-bar`) y la **misma escala** que la lista europea (el máximo se
  calcula con las dos listas), para que una barra de EE. UU. se pueda comparar a ojo con una
  de Francia. La línea de la mediana UE también las cruza.
- **Por qué aparte y no mezclados:** no tienen puesto (`rank`) ni cuentan para la mediana ni
  para los avisos, que son europeos. En vez de número de puesto llevan un guion.
- La fuente es otra (OCDE, no Eurostat): se enlaza y se avisa de que las cifras son orientativas.
- Si `world_rows` viene vacío (subámbitos, o los mocks), el bloque no aparece.

### 10.2 Porcentajes siempre con un decimal

- **Qué:** `formatPct`, `formatChange` y `formatPoints` escriben siempre un decimal: «9,0 %»
  y no «9 %».
- **Por qué:** en las columnas (Comparar, portada) se mezclaban «9 %» y «9,5 %»: quedaban
  desalineados y parecía que unos datos eran menos precisos que otros.

### 10.3 Arreglos encontrados al probar con el backend real

| Problema | Solución |
|---|---|
| Presupuestos pedía `/areas?year=2025` y el backend respondía 404 (2025 tiene presupuesto pero aún no gasto de Eurostat). No rompía nada, pero dejaba un error en la consola | `App.jsx` pasa `dataYears` (los años con gasto real) y `Budget.jsx` solo hace la petición si el año está en esa lista |
| La pestaña pedía `favicon.ico` y daba 404 | Icono SVG escrito dentro de `index.html` (cuadrado verde con tres barras), sin archivo aparte |

### Comprobado

- `npx eslint src` y `npm run build` sin errores.
- En navegador contra el backend v1.2 y el dataset real, a 1280 px y 390 px: portada,
  Presupuestos (año, política y programa), Pensiones, Comparar, Avisos, Fuentes y ámbitos
  (nivel 1 y subámbito). Sin errores de consola, sin peticiones fallidas, sin scroll
  horizontal y sin «NaN»/«null» en pantalla.

### 10.4 El ancho de la página sigue a la pantalla (Pedro)

- **Qué:** `.container` pasa de un ancho fijo de 1180 px a `clamp(1180px, 88vw, 1680px)`.
- **Cómo se lee:** la página ocupa el 88 % de la ventana, con un mínimo de 1180 px (en un
  portátil se ve igual que antes) y un máximo de 1680 px.
- **Por qué el máximo:** en un monitor ultrapanorámico las barras serían tan largas que el
  nombre del país quedaría muy lejos de su cifra. Los párrafos no se alargan: ya tenían su
  propio límite en caracteres (`max-width: 62ch`).
- Comprobado a 390, 1280, 1366, 1920 y 2560 px: sin scroll horizontal.

## 11. Titular de la portada: «A dónde» en vez de «Adónde»

- **Qué:** el titular de la portada pasa de «¿Adónde va el dinero público?» a «¿A dónde va el
  dinero público?». También cambia la meta `description` de `index.html`.
- **Por qué:** lo pidió el usuario. Las dos formas son correctas según la RAE, así que es una
  cuestión de estilo.
- **Cómo:** se cambió el texto en `src/pages/Home.jsx` (el `h1#hero-title`) y en `index.html`.

## 12. El interruptor «Euros / % del PIB» sale de la cabecera

- **Qué:** la cabecera ya no tiene el interruptor. Ahora hay uno junto a cada gráfico o tabla
  cuyas cifras cambian con la medida:
  - Portada: encima del selector de años (cifra grande y barras por año) y junto a «Vista» en
    «Explora el gasto» (mapa, ranking, evolución y cambios).
  - Ámbito: encima del selector de años y en el panel «Evolución».
  - Pensiones: en el gráfico «Cómo ha crecido cada cosa».
  - Presupuestos: en el bloque de la cifra total (si ese año hubo documento).
  - Comparar, Avisos y las páginas de política y programa no lo llevan: sus cifras no cambian
    con la medida.
- **Por qué:** lo pidió el usuario. El control queda donde se ve su efecto, en vez de en una
  cabecera que comparten todas las páginas.
- **Cómo:** nuevo componente `src/components/MeasureSwitch.jsx` (el mismo `Segmented` con la
  etiqueta «Ver en»). La elección sigue guardada en `App.jsx` (`measure`) y llega a cada
  página con `onMeasureChange`. Así, al cambiarla en un gráfico, cambian todos, y se mantiene
  al pasar de una página a otra. Se quitaron de `App.jsx` `MEASURE_PAGES` y el bloque de la
  cabecera.
- **Comprobado:** `npx eslint src` y `npm run build` sin errores. Capturas a 1280 y 390 px de la
  portada, Sanidad, Pensiones y Presupuestos: ningún interruptor en la cabecera, ningún scroll
  horizontal. El único error de consola es el 404 de Presupuestos, que ya salía antes: aún no hay
  datos de Eurostat de 2025.

## 13. Infografía de flujo del presupuesto de 2023 (Presupuestos)

- **Qué:** nueva imagen `public/presupuesto-2023-flujo.svg`, un diagrama de flujo (Sankey) al
  estilo de `googleexample.png`, pero con los PGE de 2023: Estado (379,8 mil M€) y Seguridad
  Social (203,7) → presupuesto total (583,5) → las cinco áreas de gasto → sus políticas
  principales (las menores de 5 mil M€ se agrupan en «Resto»). Sale en la página Presupuestos,
  en el bloque «El presupuesto de 2023, de un vistazo», entre la evolución y el reparto.
- **Por qué:** lo pidió el usuario. Enseña de un vistazo cómo se reparte cada euro. Es 2023
  porque es el último año con Ley aprobada (Ley 31/2022) y el último que incluye la Seguridad
  Social (las prórrogas de 2024 y 2025 no la traen).
- **Cómo:** `scripts/sankey-espana.mjs` (Node, sin dependencias) lee `GET /budget?year=2023`
  del backend y escribe el SVG a mano: rectángulos para los nodos y curvas de Bézier con
  degradado para las cintas. Las áreas son la agrupación oficial de los PGE por el primer dígito
  de la política (1 servicios públicos básicos, 2 protección social, 3 bienes públicos de
  carácter preferente, que la imagen llama «Sanidad, educación y cultura» para que se entienda,
  4 actuaciones económicas y 9 actuaciones generales). Ninguna cifra está escrita a mano.
  Para regenerarla: `node scripts/sankey-espana.mjs`, con el backend arrancado.
- **Comprobado:** las áreas suman 583,5 = total del año. `npx eslint src scripts` y
  `npm run build` sin errores. Capturas a 1280 y 390 px sin scroll horizontal. El único error de
  consola es el 404 de `/areas?year=2025`, que ya salía antes.

## 14. Pensiones sale de la cabecera, pero gana un bloque destacado en la portada

- **Qué:**
  - La cabecera ya no enlaza a Pensiones. El pie sí, con todas las demás páginas.
  - En la portada, justo después de la cifra principal y antes de «Explora el gasto», hay un
    bloque verde oscuro («Tema destacado») con la pregunta «¿Crece el dinero al ritmo de quienes
    las cobran?», una frase sobre qué se puede ver y un botón blanco: «Ver las pensiones →».
  - En el ámbito Protección social (`GF10`), bajo la descripción: «Buena parte de este gasto son
    pensiones», con un enlace a la página.
- **Por qué:** lo pidió el usuario. La cabecera queda más ligera, y Pensiones sigue siendo uno de
  los puntos principales: es lo segundo que se ve en la portada, y aparece también donde un
  usuario la buscaría (Protección social).
- **Cómo:** en `App.jsx`, `HEADER_NAV` es `NAV` sin Pensiones; el pie sigue usando `NAV`
  completo. El bloque está en `Home.jsx` (clase `.feature`, en `index.css`) y el enlace, en
  `Area.jsx`.
- **Comprobado:** `npx eslint src` y `npm run build` sin errores. Capturas a 1280 y 390 px de la
  portada y de Protección social: la cabecera no tiene Pensiones, el pie sí, no hay scroll
  horizontal y la consola no tiene errores.

## 15. Calculadora de impuestos y «Comparar con otros países» en la cabecera

- **Qué:** nueva página **Calculadora** (`#/calculadora`, en la cabecera y el pie). Pregunta
  sueldo bruto mensual, pagas (12 o 14), tipo de contrato, edad, hijos (y cuántos menores de 3),
  si contar la cotización de la empresa y el gasto mensual en tres grupos según su IVA (sin IVA,
  10 % y 21 %). Devuelve cuánto pagas al año en IRPF, cotización social e IVA, y cuánto de eso va a
  cada ámbito, al año y al mes. Tres formas de verlo: **flujo del dinero** (diagrama tipo
  `googleexample.png`), **barras** y **tabla**. Además, el enlace de la cabecera «Comparar» pasa a
  llamarse «Comparar con otros países».
- **Por qué:** lo pidió el usuario. Pasa de cifras de miles de millones a «tus» euros, que se
  entienden de un vistazo.
- **Cómo:**
  - `src/taxes.js`: el cálculo, en funciones cortas y con la fuente de cada regla. Cotización
    6,48 % (6,53 % temporal) hasta la base máxima; empresa 30,57 % (31,77 %). IRPF = escala general
    (19–47 %) sobre bruto − cotización − 2.000 € − reducción por rendimientos del trabajo, menos la
    escala aplicada al mínimo personal y familiar. IVA = la parte de impuesto que va dentro del
    precio (10/110, 21/121). El total se reparte por `share_of_total_pct` de `GET /areas` del año
    elegido (Eurostat COFOG).
  - `src/components/TaxSankey.jsx`: SVG hecho a mano. Sueldo bruto (y pago de la empresa) → neto,
    IRPF y cotización → te queda e IVA → tus impuestos → los diez ámbitos. Cada cinta es una curva
    de Bézier con degradado y grosor proporcional a los euros. Los ámbitos tienen un alto mínimo
    para que cada etiqueta quede junto a su nodo; las etiquetas llevan borde blanco para leerse
    sobre las cintas. En móvil el diagrama se desliza dentro de su caja, sin mover la página.
  - `src/pages/Calculator.jsx`: formulario, cifras clave, las tres vistas y el bloque «Cómo se
    calcula» con lo que no cuenta (deducciones, impuestos especiales, tributos locales) y las
    fuentes (BOE y Seguridad Social).
- **Límites, dichos en la propia página:** escala autonómica de referencia (cada comunidad cambia
  algo), mínimos por hijos enteros, y el reparto es proporcional: una aproximación, no un recibo.
- **Comprobado:** `npx eslint src` y `npm run build` sin errores. Caso de control: 2.000 € × 14
  pagas, indefinido, sin hijos → cotización 1.814 €, IRPF 4.367 € (15,6 % del bruto). Capturas a
  1280 y 390 px, con y sin la cotización de la empresa: sin scroll horizontal de la página y sin
  errores de consola.

## 16. El gasto público frente a la inflación

- **Qué:** nuevo bloque «El gasto público frente a la inflación» en la portada (después de
  «Explora el gasto») y otro, «Frente a la inflación», en cada ámbito (después de «Evolución» y
  «En qué se reparte»). Cada uno trae:
  - Una frase resumen: cuánto creció el gasto, cuánto los precios y la variación real.
  - Cuatro cifras: gasto en euros de cada año, subida de precios, gasto real (sin inflación, con
    la equivalencia «X M€ de 2024 = Y M€ de 2015») y en cuántos años el gasto subió más que los
    precios.
  - Dos vistas: **Año a año** (barras verdes y azules: variación del gasto y de los precios frente
    al año anterior) y **Acumulado** (líneas con índice 100 en el primer año). Pulsar un año lo
    elige en toda la página.
- **Por qué:** lo pidió el usuario. Un gasto que sube un 50 % en euros no es un 50 % más de
  servicios si los precios han subido un 23 %: así se ve qué parte es crecimiento real.
- **Cómo:**
  - `src/inflation.js`: IPCA de España de Eurostat (`prc_hicp_aind`, `coicop=CP00`, `geo=ES`),
    índice 2015 = 100 y variación anual, 2014–2025, con la consulta exacta y su URL. Igual que
    `pensionsDemand.js`: va en el frontend porque se añadió a última hora; lo ideal es que entre
    en el pipeline de `data/`. `toEurosOf()` pasa euros de un año a otro con el índice.
  - `src/components/InflationChart.jsx`: recibe `{ año: millones de euros }` y lo dibuja con
    Recharts. En la portada recibe `total_meur` de `/areas` de cada año; en el ámbito, su
    `history`.
  - Siempre en euros, aunque esté elegido «% del PIB»: en % del PIB la inflación ya está
    descontada, porque el PIB también crece con los precios. Se dice bajo el gráfico.
- **Comprobado:** `npx eslint src` y `npm run build` sin errores. Con el backend real: 2015–2024,
  gasto +52,7 %, precios +23,3 %, real +23,8 % (725.001 M€ de 2024 = 587.855 M€ de 2015). Capturas a
  1280 y 390 px de la portada (las dos vistas) y de Sanidad: sin scroll horizontal y sin errores
  de consola.

## 17. Mapa: quién gasta más en cada ámbito (19-11-2026, Pedro)

Página nueva, `#/mapa` (`pages/WorldLeaders.jsx`), a petición de Pedro.

### 17.1 Qué enseña

- Un mapa del mundo y otro de Europa ampliada. En color, solo los países con datos (27 de la
  UE + EE. UU., Japón, Reino Unido, Corea y Australia); el resto queda en gris claro.
- **Una bandera por ámbito**, clavada en el país que más le dedica en % de su PIB. Si un país
  lidera varios ámbitos, los banderines se apilan en el mismo mástil.
- Debajo, una tarjeta por ámbito: país líder, su cifra y la de España con su puesto en la UE.
  Es la misma información del mapa en texto (para móvil, teclado y lectores de pantalla).
- Al pulsar una tarjeta o una bandera, el mapa se colorea con lo que dedica cada país a ese
  ámbito (más oscuro = más % del PIB). Otra pulsación vuelve a todas las banderas.

### 17.2 Cómo está hecho

| Pieza | Qué hace | Por qué así |
|---|---|---|
| `scripts/buildWorldMap.mjs` → `src/worldMap.js` | Convierte los contornos de Natural Earth (1:50m, dominio público) en trazos SVG ya proyectados (proyección de Miller) y guarda el centro de cada país con datos | El navegador solo pinta `<path>`: no hace falta librería de mapas (ni d3 ni leaflet). El archivo generado se guarda en el repo; el script solo se repite si cambian los países |
| Detalle fino solo en Europa | Fuera de Europa se quita un punto de cada varios | El archivo baja de 366 KB a 180 KB (unos 65 KB comprimido) y Europa, que se ve ampliada, sigue nítida |
| `components/WorldMap.jsx` | Un único componente para los dos mapas: solo cambia el `viewBox` | Menos código que explicar; Europa es el mismo dibujo, recortado |
| Mapa de Europa aparte | En el mapa del mundo no se ponen banderas dentro del recuadro de Europa | Casi todos los líderes son europeos (9 de 10 en 2024) y en el mapa del mundo las banderas se taparían |
| `components/AreaIcon.jsx` | Diez emblemas macizos dibujados a mano, uno por ámbito según el campo `icon` de `/areas`, sobre banderines de dos puntas: sello (servicios generales), torre (defensa), placa (orden público), engranaje (economía), árbol (medio ambiente), llave (vivienda), cruz (sanidad), máscara (cultura), libro (educación) y paraguas (protección social) | Los iconos de línea habituales parecían de plantilla; un emblema macizo se lee mejor en pequeño y recuerda a una bandera de verdad. Sin librería de iconos |
| Datos | Una llamada a `/compare` por ámbito (10), guardadas en memoria con `cached` | No hizo falta tocar el backend ni el contrato; el líder es el máximo de `rows` + `world_rows` |
| Color | Banderas en tinta oscura con icono; mapa en una sola gama de verde (`color-mix` entre `--map-low` y `--forest-deep`) | Diez colores distintos no se distinguen: el ámbito lo dice el icono, y el verde queda libre para la cantidad |

### 17.3 Límites que se dicen en la propia página

- La UE viene de Eurostat y los otros cinco países de la OCDE: son fuentes distintas y la
  comparación entre ellas es orientativa (se dice junto a las fuentes).
- Si dos países empatan, la bandera va al primero de la lista.

### Comprobado

- `npx eslint src scripts` y `npm run build` sin errores.
- En navegador (Chrome sin ventana) contra el backend real, a 1280 px y 390 px: 10 ámbitos
  con líder, 11 banderines entre los dos mapas, selección de ámbito, sin errores de consola,
  sin scroll horizontal y sin «NaN»/«null».

