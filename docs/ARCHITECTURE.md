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
