# Brief de Mario · datos y transparencia

**Para pegar en tu Claude:**

> Lee `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md` (sección "Forma de
> `data/dataset.json`") y `docs/DATA_SOURCES.md`. Soy Mario, dueño de `data/`. Trabaja
> en la rama `Mario`. Implementa las tareas de `docs/briefs/MARIO.md` en orden, haciendo
> commit al terminar cada una. El diseño ya está aprobado: no lo rediscutas.

## Tu papel

Eres el responsable de que cada número sea cierto, tenga fuente y signifique lo que
decimos que significa. También eres quien pone el criterio: qué comparación entre gasto
y uso tiene sentido, y cuándo un desajuste merece un aviso.

Solo tocas `data/`. Tu entregable es `data/dataset.json` con la forma exacta del contrato.

## Tareas, en orden

### 1. Gasto real de España (objetivo: 45 minutos)

- `data/fetch.py`: descarga de Eurostat `gov_10a_exp` (sector `S13`, `na_item=TE`,
  unidades `MIO_EUR` y `PC_GDP`, todos los códigos COFOG, años 2015 en adelante) para
  España. Guarda la respuesta tal cual en `data/raw/`.
- `data/build.py`: lee `raw/`, aplana el JSON-stat y escribe `dataset.json` con `areas`,
  `spending` (incluido `TOTAL`) y `sources`.
- `data/areas.json`: nombre en español, descripción de una frase e icono para los 10
  ámbitos de nivel 1, y nombre en español para los subámbitos.
- **Hecho cuando:** `python data/build.py` genera el archivo y el total de España en
  2023 es 680 225 millones de euros. Haz merge a `main` y avisa a Pedro: en ese momento
  backend y frontend dejan de usar datos de ejemplo.

### 2. Otros países (30 minutos)

- Amplía la descarga a toda la UE (o como mínimo ES, FR, DE, IT, PT y `EU27_2020`).
- Rellena `countries` con el nombre en español.

### 3. Validación (30 minutos)

Dentro de `build.py`, comprobaciones que paren el script si fallan:

- La suma de los 10 ámbitos de nivel 1 coincide con `TOTAL` (tolerancia del 0,5 %).
- La suma de subámbitos coincide con su ámbito.
- No hay años duplicados ni importes negativos.
- Los datos provisionales de Eurostat (`status: "p"`) quedan marcados con `provisional: true`.

Esto es lo que vas a enseñar al jurado cuando pregunten por la calidad del dato.

### 4. Marco legal del BOE (30 minutos)

- En `fetch.py`, pide a la API del BOE los metadatos de la ley de presupuestos de cada
  año y rellena `legal`. Punto de partida comprobado: `BOE-A-2022-22128` (PGE 2023).
- Localiza y **confirma con la API** los identificadores de los demás años. En los años
  de presupuesto prorrogado, apunta a la ley vigente y explícalo en `note`.

### 5. Cruces gasto ↔ uso (el resto del tiempo; aquí está el valor)

Para cada cruce, una entrada en `data/cruces.json` y sus indicadores en `dataset.json`.
Empieza por transporte, que ya tiene un indicador comprobado (`tran_hv_psmod`: en 2022,
coche 84,0 %, autobús 6,7 %, tren 9,3 % de los viajeros-km).

Para cada cruce decide y escribe:

1. **Qué gasto** se compara (código COFOG o un desglose de otra fuente oficial, con URL).
2. **Qué indicador de uso** y por qué mide de verdad el uso de ese gasto.
3. **Umbral**: a partir de qué proporción entre cuota de gasto y cuota de uso salta el aviso.
4. **`analyst_note`**: dos o tres frases con el contexto que un ciudadano necesita para
   no sacar una conclusión equivocada (por ejemplo: la infraestructura ferroviaria se
   amortiza en décadas, el coche lo paga sobre todo el usuario…).

Objetivo: 3 o 4 cruces sólidos antes que 10 flojos. Ideas: sanidad (gasto frente a camas
o esperanza de vida), educación (gasto frente a alumnado), I+D, vivienda, medio ambiente.
Confirma cada código de Eurostat antes de usarlo.

Un aviso que no se sostiene nos hace más daño ante el jurado que no tenerlo. Si dudas de
un cruce, déjalo fuera.

## Reglas de tu área

- Ninguna cifra a mano sin `source_id` y URL oficial.
- Cada vez que cambie `dataset.json`: ejecuta `build.py` entero (con su validación),
  haz commit con prefijo `data:` y merge a `main`.
- Si necesitas un campo que no está en el contrato, pídeselo a Pedro; no lo añadas por
  tu cuenta.
