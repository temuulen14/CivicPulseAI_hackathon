# Fuentes de datos

Estado a 19-11-2026. Todas oficiales, todas usadas y comprobadas: `data/fetch.py` las
descarga y guarda la respuesta en `data/raw/`; cada cifra de `dataset.json` lleva el
`source_id` de una de ellas (lista completa en `/api/sources`).

| `source_id` | Fuente | Qué aporta |
|-------------|--------|-----------|
| `eurostat_gov_10a_exp` | Eurostat · gasto de las administraciones públicas por función (COFOG) | Gasto por ámbito, 27 países + UE, 2015-2024; desglose por tipo económico (España) |
| `eurostat_educ_uoe_enra01` | Eurostat · alumnado matriculado por nivel y tipo de centro | Cruces de educación |
| `sepg_pge_estado_gastos` | Hacienda (SEPG) · Presupuestos Generales del Estado, estado de gastos por programas | Presupuesto partida a partida, 2015-2025 |
| `oecd_cofog_table11` | OCDE · gasto público por función (COFOG) y PIB | Comparación con EE. UU., Japón, Reino Unido, Corea y Australia |
| `boe_legislacion_consolidada` | BOE · API de datos abiertos | Ley de presupuestos de cada año; nombramientos de cada Gobierno |
| `moncloa_gobiernos` | La Moncloa · presidentes y discursos de investidura | Partido del presidente y coaliciones |

## 1. Eurostat · gasto público por función (COFOG)

Sin clave, JSON-stat 2.0.

```
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp
  ?format=JSON&geo=ES&unit=MIO_EUR&unit=PC_GDP&sector=S13&na_item=TE&sinceTimePeriod=2015
```

- `unit`: `MIO_EUR` (millones de euros) y `PC_GDP` (% del PIB).
- `sector=S13`: conjunto de las administraciones públicas (Estado, comunidades,
  ayuntamientos y Seguridad Social). Es gasto **ejecutado**.
- `cofog99`: `TOTAL`, nivel 1 `GF01`…`GF10`, nivel 2 `GF0101`…
- `na_item=TE` es el gasto total. Para el desglose por tipo económico se piden los diez
  códigos de `data/spending_types.json` (`D1` personal, `P2` compras, `D632` servicios
  comprados para el ciudadano, `OP5ANP` inversión…), que suman `TE` (comprobado).
- Último año: **2024, provisional** (`status: "p"`). 2023 ya es definitivo. 2025 aún no
  se ha publicado.
- España 2023: total 680 225 M€; sanidad 98 630 M€; transporte 28 897 M€.

## 2. Eurostat · alumnado matriculado (`educ_uoe_enra01`)

```
…/data/educ_uoe_enra01?format=JSON&geo=ES&sex=T&worktime=TOTAL&sector=PUB&sector=PRV_DEP&isced11=ED0…ED8
```

Centros públicos (`PUB`) y concertados (`PRV_DEP`), que son los que paga el gasto público.

## 3. OCDE · gasto por función (Table 11) y PIB (Table 1)

API SDMX, sin clave. La clave lleva un valor (o vacío) por dimensión, en orden.

```
https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NASEC10@DF_TABLE11,/A.USA+JPN+GBR+KOR+AUS+ESP.S13...OTE...XDC....?startPeriod=2015&format=csvfilewithlabels
https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NAMAIN10@DF_TABLE1_EXPENDITURE,/A.USA+JPN+GBR+KOR+AUS+ESP.S1..B1GQ....XDC.V..?startPeriod=2015&format=csvfilewithlabels
```

- `S13` + `OTE`: gasto total de las administraciones públicas; `XDC`: moneda nacional,
  en millones. `B1GQ`: PIB nominal. % del PIB = gasto / PIB.
- España se descarga solo para comprobar que coincide con Eurostat (coincide).
- Sin datos: China, India, Brasil, Canadá.

## 4. Hacienda · Presupuestos Generales del Estado (Serie Roja)

Secretaría de Estado de Presupuestos y Gastos. No hay API ni descarga única (el ZIP de
un año pesa 855 MB): `fetch.py` recorre la web y baja el estado de gastos de cada
programa. La web exige cabecera de navegador (`User-Agent`).

```
https://www.sepg.pap.hacienda.gob.es/Presup/PGE2023Ley/MaestroDocumentos/PGE-ROM/N_23_E_R_31.htm
  > Sección (ministerio) > Presupuesto por programas > Estado de gastos > CSV del programa
```

| Año | Documento | Ruta | Formato |
|-----|-----------|------|---------|
| 2015, 2016 | Ley | `PGE2015Ley`, `PGE2016Ley` | Solo HTML: la tabla se guarda como CSV con las mismas columnas |
| 2017, 2018, 2021-2023 | Ley | `PGE20xxLey` | CSV |
| 2019, 2024, 2025 | Prórroga | `PGE20xxProrroga`, páginas `N_xxP_E_R_31.htm` | CSV; **sin la Seguridad Social** |
| 2020 | — | No existe documento | Siguió la prórroga de 2019 |

- Importes en miles de euros, presupuestados (créditos iniciales), del Estado, sus
  organismos y la Seguridad Social. **No** incluye comunidades autónomas ni ayuntamientos.
- Se excluye el programa `000X` (transferencias internas).

## 5. BOE · API de datos abiertos

Sin clave. Cabecera `Accept: application/json`.

```
https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{BOE-A-…}/metadatos
https://www.boe.es/datosabiertos/api/boe/sumario/AAAAMMDD
```

- Leyes de presupuestos (`data/legal.json`), todas confirmadas con `/metadatos`:
  `BOE-A-2014-13612` (2015), `BOE-A-2015-11644` (2016), `BOE-A-2017-7387` (2017),
  `BOE-A-2018-9268` (2018, prorrogada en 2019 y 2020), `BOE-A-2020-17339` (2021),
  `BOE-A-2021-21653` (2022), `BOE-A-2022-22128` (2023, prorrogada en 2024 y 2025).
- Nombramientos y ceses de Gobiernos (`data/governments.json`), confirmados con
  `/sumario` del día de publicación.
- La API da texto legal, no tablas de importes: las cifras salen de Hacienda y Eurostat.

## 6. La Moncloa

El BOE no dice a qué partido pertenece cada presidente. Se toma de su biografía oficial
y, para las coaliciones, de los discursos de investidura publicados por La Moncloa
(`https://www.lamoncloa.gob.es/presidente/presidentes/Paginas/index.aspx`).

## Consultadas y no usadas

- **Ministerio de Sanidad · Estadística de Gasto Sanitario Público** y **Hacienda ·
  Indicadores de gasto farmacéutico**: detalle de sanidad por comunidad (medicamentos de
  hospital, material sanitario). Se publican en Excel; leerlos exigiría dependencias
  nuevas. Fuera del alcance de la hackatón.
- **datos.gob.es**: responde, pero sus conjuntos de los PGE enlazan a páginas web, no a
  ficheros de datos.

## Reglas

- Guardar cada respuesta original en `data/raw/`.
- Registrar cada fuente en `sources` de `dataset.json` (página "Fuentes" de la app y
  README, que es un entregable obligatorio).
- No usar fuentes que no sean oficiales.
