# Contrato de API (v1.1)

Base: `http://localhost:8000/api`. Documentación interactiva en `http://localhost:8000/docs`.
Un `year` sin datos devuelve `404`. Todo JSON, campos en `snake_case`.
Cambios: solo los hace Pedro y se avisan al equipo antes del merge.

**v1.1 (19-11): solo añade, no rompe nada de v1.** Nuevo: `budget_years` y
`latest_budget_year` en `/meta`; `yoy_change_pct`, `spending_by_type` y `budget_policies`
en `/areas/{id}`; y las cuatro rutas de `/budget` (Presupuestos Generales del Estado).

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
  "generated_at": "2026-11-19T13:00:00Z",
  "budget_years": [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  "latest_budget_year": 2025
}
```

`years` son los años con gasto de Eurostat; `budget_years`, los de los PGE (ver `/budget`).

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
  "yoy_change_pct": -8.1,
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
  "spending_by_type": [
    {"type_id": "D3", "name": "Subvenciones", "description": "Pagos a empresas para reducir precios o costes de producción.",
     "amount_meur": 19364.0, "share_of_area_pct": 25.9}
  ],
  "budget_policies": [
    {"id": "45", "name": "Infraestructuras", "area_id": "GF04", "total_keur": 12644589.58,
     "total_without_social_security_keur": 12644589.58, "eu_recovery_keur": 4379469.88}
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

- `spending_by_type`: en qué se va el dinero del ámbito (personal, compras, inversión…),
  de mayor a menor. Diez tipos que suman `amount_meur`. Solo España; sirve para ámbitos y
  subámbitos. Lista vacía si no hay desglose.
- `budget_policies`: políticas de gasto de los PGE que corresponden a este ámbito (solo
  nivel 1), con su total de ese año; enlazan con `/budget/policies/{id}`. Importes `null`
  si ese año no hay documento. **No son comparables con `amount_meur`**: ver `/budget`.

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
- `evidence[].source_id` puede ser `null`.
- Las cifras del ejemplo son ilustrativas, no datos reales.

## GET /alerts?year=2023&severity=warning&type=usage_mismatch

Todos los filtros son opcionales. Orden: severidad descendente.

```json
{"year": 2023, "count": 7, "alerts": [ { "…": "Alert" } ]}
```

## GET /compare?area=GF07&year=2023&countries=ES,FR,DE,IT,PT

`area` admite nivel 1 o 2. Sin `countries`, devuelve todos los disponibles.
Solo aparecen países: los agregados (`EU27_2020`…) no entran en filas, mediana ni posición.
`eu_median` es `null` si hay menos de tres países con dato. `rank` es la posición entre
todos los países, aunque se filtre con `countries`.

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

## Presupuestos Generales del Estado: `/budget`

Otra fuente y otra cosa: lo que la Ley **presupuesta** para el **Estado central** (más la
Seguridad Social cuando el documento la incluye), partida a partida. No incluye comunidades
ni ayuntamientos, así que **no se suma ni se compara con las cifras de Eurostat** del resto
de la API (Sanidad: unos 7 000 M€ aquí, unos 98 600 M€ en Eurostat).

- Importes en **miles de euros** (`_keur`), como en el documento de Hacienda.
- Todo total viene dos veces: `total_keur` y `total_without_social_security_keur`. Las
  prórrogas (2019, 2024, 2025) no traen Seguridad Social: **para comparar años se usa
  siempre la serie sin ella**.
- `eu_recovery_keur`: la parte que son fondos europeos de recuperación (desde 2021).
- `document`: `"Ley"`, `"Prorroga"` o `null` (2020: Hacienda no publicó documento; sus
  importes son `null` y `note` lo explica).
- Sin `year`, se usa `meta.latest_budget_year`. Un año fuera de `meta.budget_years` da `404`.

### GET /budget/years

La década entera, para el gráfico de evolución y las franjas de Gobierno.

```json
{
  "years": [
    {"year": 2023, "document": "Ley", "includes_social_security": true,
     "total_keur": 583543307.1, "total_without_social_security_keur": 379810403.74,
     "eu_recovery_keur": 26538869.31,
     "drafted_by": "sanchez_2020",
     "executed_by": [{"government_id": "sanchez_2020", "days": 320}, {"government_id": "sanchez_2023", "days": 45}],
     "note": null}
  ],
  "governments": [
    {"id": "sanchez_2020", "president": "Pedro Sánchez Pérez-Castejón", "parties": ["PSOE", "Unidas Podemos"],
     "start": "2020-01-08", "end": "2023-11-17",
     "appointment_boe_id": "BOE-A-2020-231", "appointment_boe_url": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-231",
     "coalition_boe_id": "BOE-A-2020-413", "party_source_url": "https://…", "coalition_source_url": "https://…",
     "note": "Gobierno de coalición. …"}
  ]
}
```

`drafted_by` (quién elaboró el presupuesto vigente) y `executed_by` (quién lo ejecutó y
cuántos días) apuntan a `governments[].id`. Es contexto para los gráficos: **no se suman
importes por Gobierno ni por partido** (ver `data/README.md`).

### GET /budget?year=2023

Un año: los mismos campos que un elemento de `/budget/years`, más la ley y sus políticas
de gasto, de mayor a menor.

```json
{
  "year": 2023, "document": "Ley", "includes_social_security": true,
  "total_keur": 583543307.1, "total_without_social_security_keur": 379810403.74,
  "eu_recovery_keur": 26538869.31,
  "drafted_by": "sanchez_2020", "executed_by": [ { "…": "…" } ], "note": null,
  "legal": { "…": "igual que en /areas/{id}" },
  "source_id": "sepg_pge_estado_gastos",
  "policies": [
    {"id": "45", "name": "Infraestructuras", "area_id": "GF04",
     "total_keur": 12644589.58, "total_without_social_security_keur": 12644589.58,
     "eu_recovery_keur": 4379469.88, "share_of_total_pct": 2.2, "program_count": 39}
  ]
}
```

`area_id` es nuestra equivalencia aproximada con el ámbito de Eurostat (no es oficial).
`share_of_total_pct` es sobre `total_keur` del año. En 2020, `policies` es `[]`.

### GET /budget/policies/{id}?year=2023

Una política: su evolución en todos los años y sus programas del año pedido, de mayor a menor.

```json
{
  "id": "45", "name": "Infraestructuras", "area_id": "GF04", "year": 2023,
  "total_keur": 12644589.58, "total_without_social_security_keur": 12644589.58,
  "eu_recovery_keur": 4379469.88,
  "source_id": "sepg_pge_estado_gastos",
  "history": [
    {"year": 2019, "document": "Prorroga", "total_keur": 5529930.61,
     "total_without_social_security_keur": 5529930.61, "eu_recovery_keur": 0.0},
    {"year": 2020, "document": null, "total_keur": null,
     "total_without_social_security_keur": null, "eu_recovery_keur": null}
  ],
  "programs": [
    {"program_id": "453B", "name": "Creación de infraestructura de carreteras",
     "section_names": ["MINISTERIO DE TRANSPORTES, MOVILIDAD Y AGENDA URBANA"],
     "total_keur": 1599547.1, "eu_recovery_keur": 0.0}
  ]
}
```

Los códigos de política son estables entre años; los de programa y los nombres de
ministerio cambian con cada reorganización, así que la evolución se cuenta por política.

### GET /budget/programs/{program_id}?year=2023

Un programa hasta la última partida de la Ley. `404` si ese programa no existe ese año.

```json
{
  "program_id": "453B", "name": "Creación de infraestructura de carreteras",
  "year": 2023, "document": "Ley", "policy_id": "45", "policy_name": "Infraestructuras",
  "total_keur": 1599547.1, "eu_recovery_keur": 0.0,
  "source_id": "sepg_pge_estado_gastos",
  "sections": [
    {
      "section_id": "17", "section_name": "MINISTERIO DE TRANSPORTES, MOVILIDAD Y AGENDA URBANA",
      "total_keur": 1599547.1,
      "organics": [
        {"organic_id": "17.38", "name": "DIRECCIÓN GENERAL DE CARRETERAS", "total_keur": 1599547.1, "undetailed_keur": 0.0}
      ],
      "lines": [
        {"organic_id": "17.38", "economic_code": "1", "level": 1, "description": "GASTOS DE PERSONAL", "amount_keur": 35828.18},
        {"organic_id": "17.38", "economic_code": "12", "level": 2, "description": "Funcionarios", "amount_keur": 17335.98},
        {"organic_id": "17.38", "economic_code": "16000", "level": 4, "description": "Seguridad Social", "amount_keur": 5000.78}
      ]
    }
  ]
}
```

- Una `section` por ministerio: casi siempre una, pero un programa puede repartirse entre varios.
- `lines` viene en el orden del documento. `level`: 1 capítulo, 2 artículo, 3 concepto,
  4 subconcepto. Una línea cuelga de la anterior de nivel menor con su mismo `organic_id`.
  **Para sumar, solo las de `level` 1**: las demás ya están contenidas en ellas.
- `undetailed_keur`: la parte de un organismo que la Ley no reparte por capítulos.
- Un programa puede no tener `lines` (la Ley solo da su total).

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

- Además lleva `spending_types`, `spending_by_type`, `governments`, `budget_policies`,
  `budget_years` y `budget_programs`; su forma está en `data/README.md`. Son opcionales
  para el backend: si faltan, esas partes de la API salen vacías.
- `spending` incluye el total con `area_id: "TOTAL"`.
- Todo el gasto es del sector `S13` de Eurostat (conjunto de administraciones públicas).
- En cada cruce, Mario da siempre `spend_share_pct` (la cuota de gasto, calculada por
  `build.py` o tomada de otra fuente oficial) y `usage_indicator_id` (la cuota de uso).
  El backend solo divide una entre otra y compara con `threshold_ratio`. `evidence`
  lleva las cifras que se enseñan, cada una con su `source_id`.
