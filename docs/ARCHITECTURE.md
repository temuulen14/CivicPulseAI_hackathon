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
| Frontend | React + Vite + Recharts (JavaScript y CSS normales) | La combinación más extendida para una web con gráficos |
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
  budget.py         Presupuestos Generales del Estado: año → política → programa → partida
  sample_dataset.json  datos de muestra para los tests
  test_api.py          tests con los datos de muestra (cifras esperadas fijas)
  test_real_dataset.py comprobaciones contra data/dataset.json
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
| Cinco archivos: `main.py` (rutas), `dataset.py` (carga y consultas), `alerts.py` (reglas), `budget.py` (PGE), `models.py` (forma de las respuestas) | Una responsabilidad por archivo; cada uno se explica por separado |
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
| Datos de muestra (`sample_dataset.json`) para los tests | Cifras esperadas fijas: los tests no cambian cuando Mario regenera los datos |
| Segundo archivo de tests (`test_real_dataset.py`) contra el dataset real | Comprueba que todos los endpoints responden en todos los años y que las sumas de la API coinciden con los totales del pipeline; si Mario cambia algo que rompe la API, salta aquí |
| Los PGE van en rutas propias (`/api/budget…`) y no mezclados con `/api/areas` | Son otra cosa: crédito presupuestado del Estado central, no gasto ejecutado de todas las administraciones (Eurostat). Sumarlos o compararlos sería un error |
| Importes de los PGE en miles de euros (`_keur`), sin convertir a millones | Como en el documento de Hacienda: cualquier cifra se coteja a mano. El sufijo del campo dice la unidad |
| Los PGE se sirven en tres niveles (año → política → programa); las partidas solo en el programa | El dataset pesa 15 MB, casi todo partidas; así cada respuesta pesa unos pocos KB |
| Los totales por política se suman en cada petición, sin tabla precalculada | Son como mucho 450 programas por año: tarda milisegundos y no hay una segunda copia que mantener |
| Cada total de los PGE va por duplicado: con y sin Seguridad Social | Las prórrogas (2019, 2024, 2025) no la incluyen; solo la serie sin ella es comparable entre años |
| Un año sin documento (2020) responde 200 con importes `null` y su nota, no 404 | El año existe y tiene explicación (siguió la prórroga); un 404 la ocultaría |
| Un programa repartido entre varios ministerios se devuelve una vez, con una sección por ministerio | En la Ley es un solo programa; el total es la suma de sus secciones |
| El nivel de cada partida (`level` 1-4) lo calcula el backend por la longitud del código económico | Capítulo, artículo, concepto, subconcepto: el frontend solo tiene que sangrar |
| Los Gobiernos se devuelven aparte y los años los citan por `id` | No se repite la ficha de cada Gobierno en cada año; y el backend no suma nada por Gobierno ni por partido (neutralidad) |
| El desglose por tipo de gasto va dentro de `/api/areas/{id}` | Es parte de la ficha del ámbito: una sola petición por página |
| Los países de fuera de la UE van en `world_rows`, aparte de `rows`, sin posición | La mediana, la posición y los avisos son europeos; mezclarlos cambiaría los tres. El frontend que no los use no nota nada |

### Datos (Mario)

| Decisión | Por qué |
|----------|---------|
| El JSON-stat de Eurostat se aplana a mano (`flatten_jsonstat`, 20 líneas) | Sin librerías; el índice de cada valor es un número en base mixta con los tamaños de cada dimensión |
| Último año: 2024 (provisional); 2023 ya es definitivo | Es lo que publica hoy Eurostat; el contrato de ejemplo decía 2023 |
| 27 países + `EU27_2020`, desde 2015 | Comparación completa; el agregado va aparte porque no es un país |
| Desglose por tipo económico (personal, compras, conciertos, inversión…) solo para España | Para 28 países serían 240 000 filas que la app no enseña |
| Diez tipos económicos que no se solapan (`spending_types.json`) | Comprobado: suman el total en los 80 ámbitos y todos los años |
| Validación con tolerancia del 0,5 % o 2 M€ | Eurostat redondea cada partida por separado; en partidas pequeñas el redondeo pesa más que el 0,5 % |
| Si falta un subámbito de un país, esa suma no se comprueba | Eurostat deja huecos; comprobar con huecos daría falsos errores |
| Se admiten negativos en subámbitos, nunca en totales ni ámbitos | En contabilidad nacional un subámbito es negativo si se vende más de lo que se compra (terrenos en Finlandia, material militar en Eslovaquia 2023). España no tiene ninguno |
| PGE: se descargan los CSV oficiales de cada programa (Serie Roja, 472 ficheros) recorriendo la web de Hacienda | No hay API ni descarga única (el ZIP pesa 855 MB); la web exige cabecera de navegador |
| PGE: se excluye el programa 000X | Son transferencias internas entre el Estado y sus organismos; contarlas duplicaría |
| PGE: la parte de un organismo que la Ley no reparte por capítulos va en `undetailed_keur` | La Ley no siempre detalla los organismos autónomos; mejor decirlo que inventarlo |
| PGE: importes en miles de euros (`amount_keur`), como los publica Hacienda | Se pueden cotejar uno a uno con el documento oficial |
| PGE: equivalencia política de gasto → ámbito COFOG en `pge_policies.json` | Para enlazar el presupuesto con la página de cada ámbito. Es aproximada y nuestra, no oficial |
| PGE de 2015 a 2025: leyes aprobadas y documentos de prórroga (2019, 2024, 2025) | La década completa para ver la evolución; en las prórrogas se usa el documento de créditos prorrogados que publica Hacienda, que no es idéntico a la ley anterior |
| 2020 sin datos de PGE | Hacienda no publica documento de 2020 (siguió la prórroga de 2019); copiar 2019 sería inventar |
| Para comparar años, serie del Estado sin la Seguridad Social (sección 60) | Los documentos de prórroga no incluyen la Seguridad Social; es la única serie homogénea en los diez años |
| 2015 y 2016: la tabla HTML se guarda como CSV en `raw/` | Esos años no tienen CSV; el HTML pesa 25 MB por año (casi todo estilos) y la tabla tiene las mismas columnas |
| Fondos europeos medidos por los servicios "Mecanismo de Recuperación y Resiliencia" (`eu_recovery_keur`) | El nombre del programa no los identifica siempre (2021 y 2022 usan formatos distintos); el servicio sí |
| Gobiernos en `governments.json` con fechas del BOE (API de sumarios) y partido de La Moncloa | Cada dato con fuente oficial; el BOE no indica partidos |
| Por año, quién **elaboró** el presupuesto y quién lo **ejecutó** (días de cada Gobierno) | No coinciden en 2018-2020 ni en 2023-2025; atribuir un año a un solo partido sería falso |
| No se calculan importes por partido | El gasto depende de leyes, contexto y otras administraciones; un marcador por partidos rompe la neutralidad de la app ("señalan, no acusan") |
| Comparación internacional con la OCDE (EE. UU., Japón, Reino Unido, Corea, Australia) | Es la fuente oficial con la misma clasificación COFOG; para España da exactamente lo mismo que Eurostat (validado) |
| En % del PIB, calculado con el PIB nominal en moneda nacional de la OCDE | Sin depender de tipos de cambio; la OCDE no publica la tabla COFOG en % del PIB |
| En `world_spending`, aparte de `spending` | La mediana europea y los avisos se calculan con los países de la UE; mezclarlos los alteraría |
| Sin China, India, Brasil ni Canadá | No hay datos COFOG oficiales comparables; mejor decirlo que aproximarlo con otra fuente |
| `dataset.json` sin sangría | Con diez años de PGE pasaba de 20 MB; compacto pesa 15 MB |
| Ley de cada año en `legal.json`; el título se lee de la API del BOE | Los identificadores se confirmaron uno a uno; si un id no es una ley de presupuestos, `build.py` se para |
| Años prorrogados (2019, 2020, 2024) apuntan a la ley vigente, con nota | No hubo ley nueva; es lo que el ciudadano necesita saber |
| Cruces de educación: cuota de gasto por etapa frente a cuota de alumnado (2023) | Misma fuente (Eurostat), mismas etapas (ISCED) y relación directa gasto-uso |
| Alumnado solo de centros públicos y concertados | Es el que paga el gasto público; los privados no concertados no |
| Cuotas de gasto sobre las etapas atribuibles (GF0901-GF0904) | Los gastos no atribuibles a una etapa (comedor, transporte escolar…) no tienen alumnado con que compararse |
| Umbral 1,5 en educación | Es normal que una etapa cueste algo más por alumno; a partir del 50 % más merece una mirada. Hoy ninguna lo supera (0,93 / 1,19 / 0,80) |
| Transporte descartado como cruce | El gasto del Estado por modo no incluye la inversión de ADIF ni el autobús urbano que pagan comunidades y ayuntamientos: el aviso no se sostendría. El INE sí da viajeros por modo, pero falta el gasto con que compararlos |
| `cruces.json` en grupos, cada uno con su base de gasto, su base de uso y su fuente | Educación y pensiones se reparten con clasificaciones distintas; una cuota solo tiene sentido dentro de su grupo |
| Cruces de protección social: gasto en vejez y supervivencia frente a pensionistas de cada tipo (Eurostat, 2023) | Misma fuente que el gasto y misma partición; el gasto medio por pensión que sale (21 200 € y 11 800 € al año) cuadra con la Seguridad Social |
| Umbral 2 en viudedad y orfandad (1,5 en jubilación) | La ley fija la viudedad en torno al 52 % de la base del fallecido y la orfandad en el 20 %: que reciban menos gasto que su parte de pensiones es el diseño, no un desajuste. Hoy: 1,15 y 0,63, sin aviso |
| Incapacidad fuera de los cruces | Su gasto (GF1001) incluye las bajas por enfermedad, que no son pensiones: el aviso saldría falso |
| Sanidad sin cruce de uso | El gasto solo se divide en ambulatorio y hospitalario, y sus usos (consultas, ingresos) no se pueden sumar en una cuota común. Sanidad queda en la comparación con Europa y el desglose por tipo de gasto |

### Frontend (Dersu)

Explicación detallada, paso a paso, en `frontend/CAMBIOS.md`.

| Decisión | Por qué |
|----------|---------|
| Stack reducido: React + Vite + Recharts, en JavaScript y CSS normales (sin TypeScript, Tailwind ni React Router) | Cubre todas las funciones del brief con menos piezas que justificar; cada una se explica en una frase |
| Navegación por `#` (`#/ambito/GF07`) con el evento `hashchange`, en unas 20 líneas de `App.jsx` | No hace falta librería ni configurar el servidor; el botón "atrás" y compartir enlaces funcionan igual |
| `api.js` llama por defecto al backend real (`localhost:8000/api`); los mocks solo con `VITE_API_URL=mocks` | Se quitó la franja de "datos de ejemplo" a petición del usuario: por eso lo normal tiene que ser ver cifras reales, y los mocks quedan para desarrollar |
| Un hook `useApi` para todas las peticiones, que descarta respuestas antiguas | Estados de carga, error y vacío iguales en todas las páginas sin repetir código |
| El año elegido es compartido entre páginas (vive en `App.jsx`) | Si miras 2022 en la portada, el ámbito también abre en 2022 |
| Mapa de áreas (treemap) y espectro con una escala verde de 5 pasos según la cuota del total (≥25, ≥10, ≥5, ≥2 %, resto), validada con la skill `dataviz` | Diez colores distintos no se distinguen; asignar el tono por cuota (no por puesto) hace que signifique lo mismo en cualquier año. Con 10 pasos el validador no los distinguía |
| Severidad siempre con icono + texto ("Merece una mirada"), nunca solo color | Accesible y sin tono alarmista: los avisos señalan, no acusan |
| Tarjeta de aviso: las dos cifras de `evidence` en barras medidas contra la mayor | La diferencia (55 % frente a 9 %) se ve sin leer números |
| Comparación en % del PIB, ordenada, España en verde y mediana UE como línea discontinua, más la evolución de España frente a la mediana 2015–2024 | Compara países de tamaños distintos; ordenar lo convierte en un ranking; la línea temporal dice si la distancia es de un año o de siempre |
| Variación anual del ámbito: la da la API desde el contrato v1.1 (`yoy_change_pct`); en % del PIB se calcula desde `history` | En puntos del PIB es una resta, no un aviso |
| La portada ofrece cuatro vistas de los mismos datos (Mapa, Ranking, Evolución, Cambios) y dos medidas (importe, % del PIB) con controles segmentados | El usuario pidió más maneras de desglosar los datos; la vista Ranking es además la tabla accesible con la cifra exacta |
| Rediseño visual: fondo blanco, Newsreader (serif) para titulares y cifras, Geist para la interfaz, verde bosque y azul cielo como colores de dato, sin logo | Petición del usuario (web blanca y elegante, sin el €); se evitan los tópicos de página generada que señala la skill `frontend-design` (crema, acento arcilla, etiquetas en mayúsculas, flechas en enlaces) |
| Selector de años en fila con una barrita por año (`YearPicker`) en vez de un desplegable | Enseña la tendencia antes de pulsar; las barras parten de cero para no exagerar |
| `/areas` de los diez años se pide en paralelo una vez y se guarda en memoria (`useAllYears.js`) | Alimenta el selector de años, las sparklines y las vistas de evolución sin cambiar el contrato |
| Avisos: se piden todos los del año y se filtran en el navegador con botones (barra de severidad, chips de tipo y ámbito) | Filtrar no es calcular avisos; así cada botón enseña su recuento y no hay que esperar al servidor |
| Avisos: mancuernas (cuota de gasto frente a cuota de uso) y barras divergentes (distancia a la mediana UE), sacadas de `evidence` | Dos desgloses visuales que no necesitan campos nuevos en la API |
| Presupuestos del Estado en una sección propia (`#/presupuestos`), con un aviso fijo de que no es la misma cifra que la portada | Son otra fuente (lo presupuestado para el Estado central, no lo gastado por todas las administraciones): mezclarlos o compararlos con Eurostat sería un error (contrato v1.1) |
| Navegación de los PGE en tres niveles: año → política → programa, y dentro del programa los capítulos se despliegan para ver las partidas | Sigue la forma de la API; cada pantalla pide solo lo que enseña y el detalle aparece al pulsar |
| La evolución de los PGE usa siempre la serie sin Seguridad Social, y las columnas son botones que eligen el año | Las prórrogas no traen la Seguridad Social: es la única serie comparable. El gráfico hace también de selector |
| Franja de Gobiernos con tonos neutros alternos, sin colores de partido, y una frase con quién elaboró y quién ejecutó el presupuesto del año | Contexto para leer el gráfico, no una valoración; no se suma nada por Gobierno ni por partido |
| Importes de los PGE (miles de euros) mostrados en millones con `formatKeur` | Misma unidad visible en toda la app; el campo `_keur` se respeta en el código |
| El año de los PGE (2015–2025) se guarda aparte del de Eurostat (2015–2024) | Tienen años distintos; compartirlo dejaría páginas sin datos |
| Interruptor global «Euros / % del PIB» en la cabecera (estado en `App.jsx`) | Una sola elección vale para portada, ámbitos, pensiones y presupuestos; en los PGE el % del PIB es aproximado (PIB deducido del gasto de Eurostat) y se marca con «≈» |
| 2020 en los PGE enseña el documento de prórroga de 2019 (`budgetInForce.js`), rayado y explicado | En 2020 siguió vigente la misma prórroga del presupuesto de 2018 y Hacienda no publicó otro documento: no es una cifra inventada, es el presupuesto que estuvo vigente |
| Previsión de riesgos calculada en el navegador (`forecast.js`) con una regla de puntos explicada en la propia página | Petición del usuario. No es un aviso del backend ni una predicción estadística: suma señales ya visibles (avisos que se repiten y apuntan a falta de recursos, distancia a la mediana UE, inversión en % del PIB, peso en el PIB). Se puede «probar con el pasado» calculándola solo con datos hasta un año anterior |
| Página de Pensiones con la demanda (pensionistas y mayores de 65) desde Eurostat, guardada en `frontend/src/pensionsDemand.js` | Se añadió a última hora; cada cifra lleva su consulta exacta y su URL. Lo correcto a medio plazo es que entre en el pipeline de `data/` y lo sirva el backend |
| Franja de Gobiernos también bajo los selectores de año de la portada, los ámbitos y Pensiones | Distinguir por Gobierno en todos los gráficos por años, no solo en los PGE |
| Fuentes sale de la cabecera y pasa al menú del pie, destacada y con botón | Petición del usuario: la cabecera queda para las secciones de uso diario |
| Países de fuera de la UE en Comparar: lista aparte, sin puesto, con la misma escala que la europea | La mediana, el puesto y los avisos son europeos y no deben cambiar; con una sola escala las barras de las dos listas se comparan a ojo. La fuente (OCDE) es distinta y se dice |
| Porcentajes siempre con un decimal («9,0 %») | En una columna quedan alineados y no parece que unos datos sean más precisos que otros |
| El interruptor «Euros / % del PIB» sale de la cabecera y va junto a cada gráfico o tabla que cambia con la medida (`MeasureSwitch.jsx`); el estado sigue en `App.jsx` | Petición del usuario: el control está donde se ve su efecto. Al compartir el estado, la elección se mantiene en todos los gráficos y páginas |
| Pensiones sale de la cabecera; entra por un bloque destacado en la portada, justo bajo la cifra principal, por un enlace en Protección social y por el pie | Petición del usuario: cabecera más ligera, sin que Pensiones pierda visibilidad |
| Infografía de flujo de los PGE 2023 como SVG estático generado por `frontend/scripts/sankey-espana.mjs` desde `/budget?year=2023` | Petición del usuario. Sin librería de Sankey: el script dibuja nodos y cintas con SVG plano. Se fija 2023 por ser el último año con Ley y con Seguridad Social |
| Calculadora de impuestos (`#/calculadora`): IRPF, cotización e IVA con las normas de 2025 en `src/taxes.js`, repartidos entre ámbitos según `share_of_total_pct` de `/areas` | Petición del usuario. Cálculo en el cliente porque solo depende de lo que escribe la persona; reglas y fuentes (BOE, Seguridad Social) en un solo archivo. El reparto proporcional se presenta como aproximación, no como recibo |
| Diagrama de flujo de la calculadora en React (`TaxSankey.jsx`), sin librería | Mismo estilo que `googleexample.png` y que el SVG de los PGE, pero en vivo: cambia con cada respuesta del formulario |
| Gasto frente a inflación (`InflationChart.jsx`) en la portada y en cada ámbito, con el IPCA de Eurostat guardado en `frontend/src/inflation.js` | Petición del usuario. Se usa el IPCA (armonizado) por ser la misma fuente europea que el gasto COFOG. Siempre en euros: en % del PIB la inflación ya está descontada. Como Pensiones, a medio plazo debería servirlo el backend |
| Mapa (`#/mapa`) en SVG propio: `scripts/buildWorldMap.mjs` convierte los contornos de Natural Earth en trazos ya proyectados (`src/worldMap.js`) y el mismo componente pinta el mundo y Europa cambiando el `viewBox` | Evita una librería de mapas para dibujar 240 contornos; Europa va ampliada porque casi todos los países líderes están allí y sus banderas se taparían |
