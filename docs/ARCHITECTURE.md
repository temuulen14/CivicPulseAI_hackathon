# Arquitectura

## Idea en una frase

Un script descarga datos oficiales y los guarda en un único `dataset.json`; el backend
lo sirve y calcula los avisos; el frontend lo enseña.

```
 Eurostat  (gasto por función, indicadores de uso, otros países) ─┐
 BOE API   (ley de presupuestos de cada año)                      ├─► data/build.py ─► data/dataset.json
 data/cruces.json (criterio de Mario: qué gasto se compara        ─┘                        │
                   con qué uso)                                                             ▼
                                                    backend (FastAPI) ─► /api/* ─► frontend (React)
```

Tres piezas, una frontera entre cada una, y un solo sentido de circulación de los datos.

## Stack (y cómo justificarlo)

| Pieza | Tecnología | Por qué |
|-------|-----------|---------|
| Datos | Python + `requests` | El lenguaje habitual para tratar datos; sin más librerías porque son pocas filas |
| Backend | Python + FastAPI | El framework de API más usado en Python; documenta la API solo (`/docs`) |
| Frontend | React + Vite + TypeScript + Tailwind + Recharts | La combinación más extendida para una web con gráficos |
| Almacén | Un archivo JSON versionado en git | No hace falta base de datos para unos miles de filas |

Nada más: sin base de datos, sin ORM, sin gestor de estado, sin librería de peticiones
(basta `fetch`), sin Docker.

## Decisiones

- **Un solo archivo como frontera.** `dataset.json` va en git. La demo no depende de
  que las APIs externas respondan en ese momento, y cualquier cifra se puede rastrear
  hasta su fuente.
- **El BOE como ancla legal, Eurostat como fuente de cifras.** La API del BOE publica el
  texto de la ley, no tablas de importes. Eurostat da el gasto por función (clasificación
  COFOG, estándar internacional) para España y el resto de la UE con el mismo criterio,
  así que la comparación entre países sale de la misma fuente.
- **Una sola medida de gasto.** Gasto del conjunto de las administraciones públicas
  (sector `S13`). Es la única comparable entre países, porque cada país reparte las
  competencias de forma distinta, y es la que corresponde a los indicadores de uso (un
  viajero no distingue si el autobús lo paga el Estado o la comunidad autónoma).
- **El criterio humano vive en un archivo.** Qué gasto se compara con qué indicador de
  uso, con qué umbral y con qué explicación lo decide Mario en `data/cruces.json`. El
  código solo aplica la regla.

## Carpetas

```
data/
  fetch.py          descarga de Eurostat y BOE a raw/
  build.py          une raw/ + cruces.json + areas.json, valida y escribe dataset.json
  cruces.json       gasto ↔ uso: series, umbral y nota de Mario
  areas.json        nombre en español, descripción e icono de cada ámbito
  raw/              respuestas originales (se versionan)
  dataset.json      resultado final
backend/
  main.py           FastAPI: rutas y CORS
  models.py         modelos Pydantic (= el contrato)
  dataset.py        carga dataset.json y responde consultas sencillas
  alerts.py         las dos reglas de aviso y su aplicación
  sample_dataset.json  datos de muestra para desarrollo y tests
  test_api.py
frontend/
  src/api.ts        tipos del contrato + funciones fetch
  src/pages/        Inicio, Ámbito, Avisos, Comparar, Fuentes
  src/components/
docs/
```

## Modelo de datos

- **Ámbito**: función de gasto COFOG de nivel 1 (10 en total: sanidad, educación,
  asuntos económicos…). Identificador = código COFOG (`GF07`).
- **Subámbito**: nivel 2 (`GF0405` transporte…).
- **Gasto**: millones de euros y % del PIB, por ámbito, país y año.
- **Indicador de uso**: una medida de uso o resultado ligada a un ámbito (reparto de
  viajeros por modo, camas de hospital, alumnado…).
- **Cruce**: emparejamiento gasto ↔ indicador definido por Mario.
- **Aviso**: resultado de aplicar una regla.

## Avisos: dos tipos

| Tipo | Qué detecta | Regla | Cobertura |
|------|-------------|-------|-----------|
| `usage_mismatch` | La cuota de gasto de algo no se parece a su cuota de uso (el caso "90% a autobuses, 10% de uso") | cuota de gasto ÷ cuota de uso supera el umbral del cruce (o queda por debajo de su inverso): `warning`; si dobla el umbral: `critical` | Ámbitos con cruce curado |
| `international_outlier` | España gasta bastante más o menos que la mediana de la UE en esa función | distancia relativa a la mediana (en % del PIB) de un 25 % o más: `info`; de un 50 % o más: `warning` | Todos los ámbitos, automático |

Son dos reglas aritméticas que caben en una pizarra. Cada aviso lleva severidad
(`info`, `warning`, `critical`), una frase en lenguaje llano, los números que lo
justifican y la fuente. Los avisos **señalan, no acusan**: "merece una mirada", nunca
"esto es un despilfarro".

El segundo tipo es automático para los diez ámbitos, así que la app tiene contenido
aunque solo dé tiempo a curar tres o cuatro cruces de uso.

## Decisiones de implementación

El detalle fino, para poder explicar cualquier línea al jurado. Cada uno añade aquí las
de su parte: qué se decidió y por qué, en una fila.

### Backend (Pedro)

| Decisión | Por qué |
|----------|---------|
| Cuatro archivos: `main.py` (rutas), `dataset.py` (carga y consultas), `alerts.py` (reglas), `models.py` (forma de las respuestas) | Una responsabilidad por archivo; cada uno se explica por separado |
| Los avisos se calculan en el backend, no en el frontend | Un único sitio para las reglas, y se pueden probar con tests |
| Las reglas son funciones que reciben números y devuelven una severidad | No dependen de la web ni de los datos: se prueban y se explican solas |
| Gasto-uso: se dispara en los dos sentidos (mucho gasto para poco uso, o poco gasto para mucho uso) | Los dos casos merecen una mirada; se invierte la división cuando es menor que 1 |
| Gasto-uso: el umbral va en cada cruce, no es global | Cada ámbito es distinto; lo decide Mario con criterio |
| España-Europa: distancia **relativa** a la mediana, no diferencia en puntos de PIB | Con diferencia absoluta solo saltarían los ámbitos grandes (protección social) y nunca los pequeños (medio ambiente) |
| Mediana y no media | Un país con un valor extremo no la arrastra |
| La mediana solo se calcula con tres países o más, y sin agregados como la UE-27 | Con dos valores no dice nada; un agregado no es un país |
| Indicador de uso: el último año disponible que no supere el año consultado | Las estadísticas de uso salen con retraso; exigir el mismo año ocultaría casi todas. El año real se muestra en la evidencia |
| La posición de un país se calcula sobre todos, aunque se filtren países | Que España sea la 14.ª no cambia por mostrar solo tres |
| Un dato que falta es `null`, nunca `0` | Un 0 se leería como "no se gasta nada" |
| Un año sin datos devuelve 404 | Mejor un error claro que una respuesta vacía que parezca válida |
| CORS abierto y solo peticiones GET | Datos públicos de solo lectura, sin credenciales |
| Datos de muestra (`sample_dataset.json`) para desarrollo y tests | Los tests no dependen de los datos reales ni de la red |

### Datos (Mario)

_Por rellenar._

### Frontend (Dersu)

Explicación detallada, paso a paso, en `frontend/CAMBIOS.md`.

| Decisión | Por qué |
|----------|---------|
| Stack reducido: React + Vite + Recharts, en JavaScript y CSS normales (sin TypeScript, Tailwind ni React Router) | Cubre todas las funciones del brief con menos piezas que justificar; cada una se explica en una frase |
| Navegación por `#` (`#/ambito/GF07`) con el evento `hashchange`, en unas 20 líneas de `App.jsx` | No hace falta librería ni configurar el servidor; el botón "atrás" y compartir enlaces funcionan igual |
| `api.js` usa los datos de ejemplo de `mocks.js` si `VITE_API_URL` está vacía | El frontend se pudo construir sin esperar al backend; cambiar al real es cambiar una variable |
| Franja visible "datos de ejemplo" mientras se usan los mocks | Nunca presentar cifras ilustrativas como reales |
| Un hook `useApi` para todas las peticiones, que descarta respuestas antiguas | Estados de carga, error y vacío iguales en todas las páginas sin repetir código |
| El año elegido es compartido entre páginas (vive en `App.jsx`) | Si miras 2022 en la portada, el ámbito también abre en 2022 |
| Mapa de áreas (treemap) y espectro con una escala verde de 5 pasos según la cuota del total (≥25, ≥10, ≥5, ≥2 %, resto), validada con la skill `dataviz` | Diez colores distintos no se distinguen; asignar el tono por cuota (no por puesto) hace que signifique lo mismo en cualquier año. Con 10 pasos el validador no los distinguía |
| Severidad siempre con icono + texto ("Merece una mirada"), nunca solo color | Accesible y sin tono alarmista: los avisos señalan, no acusan |
| Tarjeta de aviso: las dos cifras de `evidence` en barras medidas contra la mayor | La diferencia (55 % frente a 9 %) se ve sin leer números |
| Comparación en % del PIB, ordenada, España en verde y mediana UE como línea discontinua, más la evolución de España frente a la mediana 2015–2024 | Compara países de tamaños distintos; ordenar lo convierte en un ranking; la línea temporal dice si la distancia es de un año o de siempre |
| Variación anual del ámbito calculada desde `history` | `GET /areas/{id}` no trae `yoy_change_pct`; es una resta, no un aviso |
| La portada ofrece cuatro vistas de los mismos datos (Mapa, Ranking, Evolución, Cambios) y dos medidas (importe, % del PIB) con controles segmentados | El usuario pidió más maneras de desglosar los datos; la vista Ranking es además la tabla accesible con la cifra exacta |
| Rediseño visual: fondo blanco, Newsreader (serif) para titulares y cifras, Geist para la interfaz, verde bosque y azul cielo como colores de dato, sin logo | Petición del usuario (web blanca y elegante, sin el €); se evitan los tópicos de página generada que señala la skill `frontend-design` (crema, acento arcilla, etiquetas en mayúsculas, flechas en enlaces) |
| Selector de años en fila con una barrita por año (`YearPicker`) en vez de un desplegable | Enseña la tendencia antes de pulsar; las barras parten de cero para no exagerar |
| `/areas` de los diez años se pide en paralelo una vez y se guarda en memoria (`useAllYears.js`) | Alimenta el selector de años, las sparklines y las vistas de evolución sin cambiar el contrato |
| Avisos: se piden todos los del año y se filtran en el navegador con botones (barra de severidad, chips de tipo y ámbito) | Filtrar no es calcular avisos; así cada botón enseña su recuento y no hay que esperar al servidor |
| Avisos: mancuernas (cuota de gasto frente a cuota de uso) y barras divergentes (distancia a la mediana UE), sacadas de `evidence` | Dos desgloses visuales que no necesitan campos nuevos en la API |
| Formato `Intl.NumberFormat('es-ES')` con `useGrouping: 'always'` | Por defecto el español no pone punto en números de cuatro cifras (8450 → 8.450) |

## Limitaciones (para contarlas antes de que pregunten)

- Las cifras son **gasto ejecutado** de todas las administraciones según Eurostat, no
  el crédito inicial que aparece en la ley. La ley del BOE se enlaza como marco legal.
- El último año va con uno o dos años de retraso y puede ser provisional; la app lo
  marca con una etiqueta.

## Orden de construcción

1. **Ahora, en paralelo** — Mario: `fetch.py` + `build.py` con gasto real. Pedro: backend
   con un `dataset.json` de ejemplo. Dersu: frontend con datos de ejemplo del contrato.
2. **Primera integración** — en cuanto exista un `dataset.json` real: el backend lo
   carga y el frontend apunta al backend. Todo visible de punta a punta, aunque feo.
3. **Comparación de países y avisos automáticos.**
4. **Cruces de uso** de Mario, de uno en uno; cada uno aparece solo en la app.
5. **Viernes por la mañana**: pulido, README, `AI_USAGE.md` y ensayo de la demo. Ninguna
   función nueva.
