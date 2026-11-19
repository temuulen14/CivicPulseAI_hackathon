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
| `dataset.json` sin sangría | Con diez años de PGE pasaba de 20 MB; compacto pesa 15 MB |
| Ley de cada año en `legal.json`; el título se lee de la API del BOE | Los identificadores se confirmaron uno a uno; si un id no es una ley de presupuestos, `build.py` se para |
| Años prorrogados (2019, 2020, 2024) apuntan a la ley vigente, con nota | No hubo ley nueva; es lo que el ciudadano necesita saber |
| Cruces de educación: cuota de gasto por etapa frente a cuota de alumnado (2023) | Misma fuente (Eurostat), mismas etapas (ISCED) y relación directa gasto-uso |
| Alumnado solo de centros públicos y concertados | Es el que paga el gasto público; los privados no concertados no |
| Cuotas de gasto sobre las etapas atribuibles (GF0901-GF0904) | Los gastos no atribuibles a una etapa (comedor, transporte escolar…) no tienen alumnado con que compararse |
| Umbral 1,5 en educación | Es normal que una etapa cueste algo más por alumno; a partir del 50 % más merece una mirada. Hoy ninguna lo supera (0,93 / 1,19 / 0,80) |
| Transporte descartado como cruce | El gasto del Estado por modo no incluye la inversión de ADIF ni el autobús urbano que pagan comunidades y ayuntamientos: el aviso no se sostendría |

### Frontend (Dersu)

_Por rellenar._

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
