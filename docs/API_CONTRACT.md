# Contrato de API (v1)

Base: `http://localhost:8000/api`. Todo JSON, campos en `snake_case`.
Cambios: solo los hace Pedro y se avisan al equipo antes del merge.

Convenciones:

- Importes en **millones de euros** (`amount_meur`). Porcentajes como número de 0 a 100.
- `year` entero. Si no se pasa, el backend usa el último año con datos (`meta.latest_year`).
- `country` es el código Eurostat de dos letras (`ES`, `FR`, `DE`, `IT`, `PT`, `EU27_2020`).
- Un valor que falta es `null`, nunca `0`.
- Toda cifra mostrable lleva `source_id`, que apunta a un elemento de `/api/sources`.

## GET /meta

```json
{
  "years": [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
  "latest_year": 2023,
  "countries": [{"code": "ES", "name": "España"}, {"code": "FR", "name": "Francia"}],
  "generated_at": "2026-11-19T13:00:00Z"
}
```

## GET /areas?year=2023

Lista para la portada (mapa de áreas, ranking).

```json
{
  "year": 2023,
  "total_meur": 680225.0,
  "provisional": true,
  "areas": [
    {
      "id": "GF04",
      "name": "Asuntos económicos",
      "description": "Transporte, energía, agricultura, industria y apoyo a la economía.",
      "icon": "briefcase",
      "amount_meur": 84500.0,
      "share_of_total_pct": 12.4,
      "pct_gdp": 5.6,
      "yoy_change_pct": -8.1,
      "alert_count": 2,
      "max_severity": "warning"
    }
  ]
}
```

`max_severity` es `null` si no hay avisos.

## GET /areas/{id}?year=2023

Todo lo que necesita la página de un ámbito.

```json
{
  "id": "GF04",
  "name": "Asuntos económicos",
  "description": "…",
  "year": 2023,
  "amount_meur": 84500.0,
  "share_of_total_pct": 12.4,
  "pct_gdp": 5.6,
  "source_id": "eurostat_gov_10a_exp",
  "history": [
    {"year": 2022, "amount_meur": 91900.0, "pct_gdp": 6.8, "provisional": false},
    {"year": 2023, "amount_meur": 84500.0, "pct_gdp": 5.6, "provisional": true}
  ],
  "subareas": [
    {"id": "GF0405", "name": "Transporte", "amount_meur": 28897.0, "share_of_area_pct": 34.2}
  ],
  "indicators": [
    {
      "id": "modal_split_bus",
      "name": "Viajeros que se mueven en autobús",
      "value": 6.7,
      "unit": "% de los viajeros-km",
      "year": 2022,
      "source_id": "eurostat_tran_hv_psmod"
    }
  ],
  "alerts": [ { "…": "ver objeto Alert" } ],
  "legal": {
    "law_title": "Ley 31/2022, de 23 de diciembre, de Presupuestos Generales del Estado para el año 2023",
    "boe_id": "BOE-A-2022-22128",
    "boe_url": "https://www.boe.es/buscar/act.php?id=BOE-A-2022-22128",
    "note": "Presupuesto de 2023, prorrogado en ejercicios posteriores."
  }
}
```

`legal` puede ser `null` si no se ha localizado la ley de ese año.

## Objeto Alert

```json
{
  "id": "GF0405-usage_mismatch-2023",
  "type": "usage_mismatch",
  "severity": "warning",
  "area_id": "GF04",
  "subarea_id": "GF0405",
  "year": 2023,
  "title": "El gasto en ferrocarril no se corresponde con su uso",
  "message": "El tren recibe el 55% de la inversión en transporte y mueve el 9% de los viajeros.",
  "evidence": [
    {"label": "Cuota de gasto", "value": 55.0, "unit": "%", "source_id": "…"},
    {"label": "Cuota de uso", "value": 9.3, "unit": "%", "source_id": "eurostat_tran_hv_psmod"}
  ],
  "analyst_note": "Texto de Mario: contexto, matices, por qué puede ser razonable.",
  "source_ids": ["eurostat_tran_hv_psmod"]
}
```

- `type`: `usage_mismatch` | `international_outlier`
- `severity`: `info` | `warning` | `critical`
- `subarea_id` y `analyst_note` pueden ser `null`.
- Las cifras del ejemplo son ilustrativas, no datos reales.

## GET /alerts?year=2023&severity=warning&type=usage_mismatch

Todos los filtros son opcionales. Orden: severidad descendente.

```json
{"year": 2023, "count": 7, "alerts": [ { "…": "Alert" } ]}
```

## GET /compare?area=GF07&year=2023&countries=ES,FR,DE,IT,PT

`area` admite nivel 1 o 2. Sin `countries`, devuelve todos los disponibles.

```json
{
  "area_id": "GF07",
  "area_name": "Sanidad",
  "year": 2023,
  "unit": "pct_gdp",
  "eu_median": 7.1,
  "rows": [
    {"country": "ES", "name": "España", "value": 6.6, "rank": 14, "provisional": true},
    {"country": "FR", "name": "Francia", "value": 8.8, "rank": 3, "provisional": true}
  ],
  "source_id": "eurostat_gov_10a_exp"
}
```

## GET /sources

```json
{
  "sources": [
    {
      "id": "eurostat_gov_10a_exp",
      "name": "Eurostat · Gasto de las administraciones públicas por función (COFOG)",
      "publisher": "Eurostat",
      "url": "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table",
      "license": "Reutilización libre con cita",
      "retrieved_at": "2026-11-19"
    }
  ]
}
```

## Errores

`404` con `{"detail": "Área no encontrada: GF99"}`; `422` para parámetros inválidos (por defecto de FastAPI).

---

# Forma de `data/dataset.json`

Lo escribe Mario, lo lee Pedro. Es la versión "plana" de lo anterior; el backend
calcula cuotas, variaciones, rankings y avisos.

```json
{
  "generated_at": "2026-11-19T13:00:00Z",
  "countries": [{"code": "ES", "name": "España"}],
  "areas": [
    {"id": "GF04", "level": 1, "parent_id": null, "name": "Asuntos económicos", "description": "…", "icon": "briefcase"},
    {"id": "GF0405", "level": 2, "parent_id": "GF04", "name": "Transporte", "description": null, "icon": null}
  ],
  "spending": [
    {"area_id": "GF04", "country": "ES", "year": 2023,
     "amount_meur": 84500.0, "pct_gdp": 5.6, "provisional": true, "source_id": "eurostat_gov_10a_exp"}
  ],
  "indicators": [
    {"id": "modal_split_bus", "area_id": "GF0405", "name": "Viajeros que se mueven en autobús",
     "unit": "% de los viajeros-km", "country": "ES", "year": 2022, "value": 6.7,
     "source_id": "eurostat_tran_hv_psmod"}
  ],
  "crosses": [
    {"id": "bus_spend_vs_use", "area_id": "GF0405", "title": "…",
     "spend_share_pct": 12.0, "usage_indicator_id": "modal_split_bus",
     "threshold_ratio": 2.0, "analyst_note": "…", "evidence": []}
  ],
  "legal": [
    {"year": 2023, "law_title": "Ley 31/2022…", "boe_id": "BOE-A-2022-22128",
     "boe_url": "https://www.boe.es/buscar/act.php?id=BOE-A-2022-22128", "note": null}
  ],
  "sources": [ { "…": "igual que /sources" } ]
}
```

- `spending` incluye el total con `area_id: "TOTAL"`.
- Todo el gasto es del sector `S13` de Eurostat (conjunto de administraciones públicas).
- En cada cruce, Mario da siempre `spend_share_pct` (la cuota de gasto, calculada por
  `build.py` o tomada de otra fuente oficial) y `usage_indicator_id` (la cuota de uso).
  El backend solo divide una entre otra y compara con `threshold_ratio`. `evidence`
  lleva las cifras que se enseñan, cada una con su `source_id`.
