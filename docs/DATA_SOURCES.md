# Fuentes de datos

Estado a 19-11-2026. "Comprobado" significa que la llamada se ejecutó y devolvió datos.

## 1. Eurostat · gasto público por función (COFOG) — comprobado

Columna vertebral del proyecto. Sin clave, JSON-stat 2.0.

```
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp
  ?format=JSON&geo=ES&unit=MIO_EUR&sector=S13&na_item=TE&cofog99=GF0405&time=2023
```

- `unit`: `MIO_EUR` (millones de euros) o `PC_GDP` (% del PIB).
- `sector=S13`: conjunto de las administraciones públicas. Es el único que usamos.
- `na_item=TE`: gasto total.
- `cofog99`: `TOTAL`, nivel 1 `GF01`…`GF10`, nivel 2 `GF0101`… (por ejemplo `GF0405` transporte).
- Los parámetros se repiten para pedir varios valores (`&geo=ES&geo=FR`).
- Respuestas vistas (España, 2023, millones de euros): total 680 225; transporte 28 897.
  2023 viene marcado como provisional (`status: "p"`).
- Formato: `value` es un diccionario índice → valor; el índice se calcula a partir de
  `id` y `size`. Los huecos simplemente no aparecen. Lo más cómodo es añadir
  `&format=JSON` y aplanarlo a mano, o pedir `format=SDMX-CSV` en la API SDMX:
  `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/gov_10a_exp/…?format=SDMX-CSV`
  (esta segunda vía no está comprobada).

## 2. Eurostat · indicadores de uso — uno comprobado

- `tran_hv_psmod` — reparto modal del transporte interior de viajeros (comprobado).
  España 2022: coche 84,0 %, autobús 6,7 %, tren 9,3 %.
- Candidatos sin comprobar (confirmar código y dimensiones en el navegador de datos de
  Eurostat antes de usarlos): camas de hospital (`hlth_rs_bds`), alumnado matriculado
  (`educ_uoe_enra*`), gasto en I+D (`rd_e_gerdtot`), población reclusa (`crim_pris_cap`),
  residuos municipales (`env_wasmun`).

Ventaja: mismos códigos de país y año que el gasto, y permiten comparar con otros países.

## 3. BOE · API de datos abiertos — comprobado

Ancla legal: qué ley aprueba el presupuesto de cada año. Sin clave. Cabecera
`Accept: application/json`.

```
https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/BOE-A-2022-22128/metadatos
https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/BOE-A-2022-22128/texto/indice
https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/BOE-A-2022-22128/texto/bloque/{id_bloque}
https://www.boe.es/datosabiertos/api/boe/sumario/AAAAMMDD
```

- `BOE-A-2022-22128` = Ley 31/2022, PGE para 2023 (comprobado: metadatos e índice).
- Identificadores de otros años: **sin comprobar**, hay que buscarlos (Ley 22/2021 para
  2022, Ley 11/2020 para 2021…) y confirmar cada uno con `/metadatos`. Ojo con los años
  de presupuesto prorrogado: no hay ley nueva y hay que indicarlo en `legal.note`.
- La API devuelve texto, no tablas de importes. No intentar extraer cifras de aquí.
- Documentación: https://www.boe.es/datosabiertos/

## 4. Hacienda (SEPG / IGAE) — no se usa

Presupuesto inicial por políticas de gasto y ejecución mensual. Los portales responden
(`sepg.pap.hacienda.gob.es`, `igae.pap.hacienda.gob.es`), pero hace falta cabecera de
navegador (`User-Agent`) y no se ha localizado una URL estable de descarga; la ruta de
"datos abiertos" que probamos da 404. Queda fuera del proyecto; se anota
aquí para poder explicar por qué no se usó.

## 5. datos.gob.es — comprobado que responde

```
https://datos.gob.es/apidata/catalog/dataset/title/{texto}?_format=json&_pageSize=10
```

Útil para localizar indicadores de uso nacionales (viajeros por modo del Ministerio de
Transportes, estadísticas del INE). La búsqueda por "presupuestos generales" devuelve
sobre todo datos autonómicos, no del Estado.

## Reglas

- Guardar cada respuesta original en `data/raw/`.
- Registrar cada fuente usada en `sources` del `dataset.json` (acaba en la página
  "Fuentes" de la app y en el README, que es un entregable obligatorio).
- No usar fuentes que no sean oficiales.
