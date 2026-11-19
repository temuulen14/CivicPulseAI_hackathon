# data/ · pipeline de datos (Mario)

```bash
pip install -r data/requirements.txt
python data/fetch.py   # descarga a raw/ (unos 15 minutos: Eurostat, BOE y 3 400 ficheros de los PGE)
python data/build.py   # valida y escribe dataset.json; se para si algo no cuadra
python -m pytest data/ # tests del pipeline (sin red)
```

`dataset.json` sigue la forma de `docs/API_CONTRACT.md` y añade claves propias: `spending_types`, `spending_by_type`, `world_countries`, `world_spending`, `governments`, `budget_policies`, `budget_years` y `budget_programs`.
**Todavía no están en el contrato** (hay que acordarlas con Pedro); el backend actual
las ignora, así que no rompen nada.

## Desglose por tipo de gasto (Eurostat, solo España)

¿En qué se va el dinero de cada ámbito? Personal, compras, conciertos, inversión…

```json
"spending_types": [
  {"id": "D1", "name": "Personal", "description": "Sueldos, salarios y cotizaciones..."}
],
"spending_by_type": [
  {"area_id": "GF0703", "country": "ES", "year": 2023, "type_id": "D1",
   "amount_meur": 16890.0, "provisional": false, "source_id": "eurostat_gov_10a_exp"}
]
```

Los diez tipos suman el `amount_meur` del ámbito en `spending` (validado). Existe para
los 10 ámbitos, los subámbitos y `TOTAL`, de 2015 a 2024.

## Comparación con grandes economías fuera de la UE (OCDE)

```json
"world_countries": [{"code": "USA", "name": "Estados Unidos", "currency": "USD"}],
"world_spending": [
  {"area_id": "GF07", "country": "USA", "year": 2023, "pct_gdp": 10.0,
   "amount_national_mio": 2793736.1, "currency": "USD", "source_id": "oecd_cofog_table11"}
]
```

- Estados Unidos, Japón, Reino Unido, Corea del Sur y Australia; `TOTAL` y los 10 ámbitos;
  2015-2024 (Corea hasta 2023). Mismos códigos COFOG que `spending`.
- **Va aparte de `spending` a propósito**: la mediana europea y los avisos se calculan
  con los países de `countries`; meter aquí a EE. UU. los cambiaría.
- Comparad en **% del PIB** (`pct_gdp`): los importes están en moneda nacional.
- Validado: la OCDE da para España exactamente lo mismo que Eurostat, y los ámbitos de
  cada país suman su total.
- **Sin datos**: China, India y Brasil (no son de la OCDE y no publican COFOG) ni Canadá.
  Decidlo en la página para que no parezca un olvido.

| 2023, % del PIB | España | UE-27 | EE. UU. | Japón | R. Unido | Corea | Australia |
|-----------------|------:|------:|-------:|------:|--------:|------:|----------:|
| Total | 45,4 | 48,8 | 39,2 | 38,9 | 46,3 | 35,6 | 40,0 |
| Defensa | 0,9 | 1,3 | 3,0 | 1,0 | 2,2 | 2,5 | 2,3 |
| Sanidad | 6,6 | 7,2 | 10,0 | 7,8 | 8,5 | 5,3 | 7,6 |
| Educación | 4,2 | 4,7 | 5,6 | 3,1 | 4,9 | 5,0 | 5,7 |
| Protección social | 18,5 | 19,1 | 7,9 | 15,5 | 15,2 | 9,3 | 10,6 |

**Ojo:** es gasto **público**. Donde las pensiones o los seguros médicos son sobre todo
privados (EE. UU., Corea), el gasto público en protección social sale bajo aunque el
país gaste mucho en total. No es "más o menos generoso", es "más o menos público".

## Presupuestos Generales del Estado 2015-2025, partida a partida

El nivel más fino que se publica: cada programa de cada ministerio, hasta subconcepto,
para cada año de la década. 3 209 programas en 10 años (2020 no tiene documento).

```json
"budget_policies": [{"id": "45", "name": "Infraestructuras", "area_id": "GF04"}],
"budget_programs": [
  {"year": 2023, "program_id": "453B", "name": "Creación de infraestructura de carreteras",
   "section_id": "17", "section_name": "MINISTERIO DE TRANSPORTES, MOVILIDAD Y AGENDA URBANA",
   "policy_id": "45", "total_keur": 1599547.10, "source_id": "sepg_pge_estado_gastos",
   "organics": [{"organic_id": "17.38", "name": "DIRECCIÓN GENERAL DE CARRETERAS",
                 "total_keur": 1599547.10, "undetailed_keur": 0.0}],
   "lines": [
     {"organic_id": "17.38", "economic_code": "7", "description": "TRANSFERENCIAS DE CAPITAL", "amount_keur": 470534.35},
     {"organic_id": "17.38", "economic_code": "755", "description": "Convenio con la Comunidad Autónoma de Canarias", "amount_keur": 210000.0}
   ]}
]
```

- Importes en **miles de euros** (`amount_keur`), como en el documento oficial.
- La jerarquía sale de la longitud de `economic_code`: 1 cifra = capítulo, 2 = artículo,
  3 = concepto, 5 = subconcepto. Un código cuelga del más largo que sea prefijo suyo.
- No todas las líneas intermedias traen importe (`null`) y no todas tienen hijos: la Ley
  solo detalla lo que detalla. `undetailed_keur` es la parte de un organismo que el
  documento no reparte por capítulos (pasa con los organismos autónomos).
- `area_id` de una política es una equivalencia aproximada nuestra con el ámbito COFOG.

### Evolución por años: `budget_years`

```json
"budget_years": [
  {"year": 2023, "document": "Ley", "includes_social_security": true,
   "total_keur": 583543000.0, "total_without_social_security_keur": 379810000.0,
   "eu_recovery_keur": 26539000.0, "note": null},
  {"year": 2024, "document": "Prorroga", "includes_social_security": false, "...": "..."},
  {"year": 2020, "document": null, "total_keur": null, "note": "Sin ley nueva: siguió prorrogado..."}
]
```

| Año | Documento | ¿Incluye Seguridad Social? |
|-----|-----------|----------------------------|
| 2015-2018, 2021-2023 | Ley aprobada | Sí |
| 2019, 2024, 2025 | Prórroga | **No**: Hacienda solo prorroga las secciones del Estado |
| 2020 | Ninguno (siguió la prórroga de 2019) | Sin datos: no se rellena copiando 2019 |

**Para comparar años, usad la serie sin la Seguridad Social** (filtrar
`section_id != "60"`, o `total_without_social_security_keur`). Es la única homogénea en
los diez años. Ejemplos (M€, Estado sin Seguridad Social):

| Política | 2015 | 2018 | 2021 | 2023 | 2025 |
|----------|-----:|-----:|-----:|-----:|-----:|
| 12 Defensa | 5 712 | 8 401 | 9 072 | 12 317 | 12 317 |
| 32 Educación | 2 270 | 2 579 | 4 891 | 5 352 | 5 335 |
| 45 Infraestructuras | 6 373 | 5 750 | 11 502 | 12 645 | 12 613 |
| 46 I+D+i y digitalización | 6 406 | 7 062 | 12 345 | 17 767 | 17 813 |

Los códigos de **política** (`policy_id`) son estables entre años; los de **programa** y
los nombres de ministerio (`section_name`) cambian con cada reorganización del Gobierno,
así que la evolución se cuenta mejor por política.

Saltos que tienen explicación (para que no parezcan errores):

- **Desde 2021, fondos europeos de recuperación.** `eu_recovery_keur` (por programa y por
  año) es lo que gestionan los servicios "Mecanismo de Recuperación y Resiliencia"
  (orgánica xx.50): al menos 22 000-26 500 M€ al año.
- **2017 y 2018: préstamo del Estado a la Seguridad Social** para pagar pensiones (unos
  10 000 M€, programa 291M de la sección 19).
- **Prórrogas 2024 y 2025:** algunas partidas bajan porque al prorrogar no se mantienen
  los créditos que vencían.

### Gobiernos: contexto para los gráficos, no un marcador

`governments` lista cada Gobierno desde 2011 (presidente, partidos, fechas, nombramiento
en el BOE y fuente del partido en La Moncloa). En `budget_years`, cada año dice quién
**elaboró** el presupuesto vigente (`drafted_by`) y quién lo **ejecutó**
(`executed_by`, con los días de cada Gobierno):

| Año | Presupuesto | Elaboró | Ejecutó |
|-----|-------------|---------|---------|
| 2015-2017 | Ley | Rajoy (PP) | Rajoy (PP) |
| 2018 | Ley | Rajoy (PP) | Rajoy (PP) 152 días, Sánchez (PSOE) 213 días |
| 2019 | Prórroga de 2018 | Rajoy (PP) | Sánchez (PSOE) |
| 2020 | Prórroga de 2018 (sin documento) | Rajoy (PP) | Sánchez (PSOE + Unidas Podemos) desde el 8 de enero |
| 2021-2022 | Ley | Sánchez (PSOE + Unidas Podemos) | el mismo |
| 2023 | Ley | Sánchez (PSOE + Unidas Podemos) | el mismo; desde el 17 de noviembre, Sánchez (PSOE + Sumar) |
| 2024-2025 | Prórroga de 2023 | Sánchez (PSOE + Unidas Podemos) | Sánchez (PSOE + Sumar) |

Cómo usarlo (acordado para que la app siga siendo neutral):

- **Sí:** franjas de fondo en los gráficos de evolución con el Gobierno de cada etapa, y en
  la ficha de cada año "elaborado por… / ejecutado por…", con enlace al BOE.
- **No:** sumar o comparar importes por partido ("el PP gastó X, el PSOE Y"). Elaborar y
  ejecutar no coinciden (2018-2020), cada ley se aprueba con votos de varios grupos, mucho
  gasto lo fija la ley o el contexto (pensiones, intereses, COVID, fondos europeos) y el
  gasto de Eurostat incluye comunidades y ayuntamientos de todos los colores.

**Ojo al contarlo:** son créditos **presupuestados** del **Estado central** (más la
Seguridad Social, salvo en las prórrogas). No incluye a las comunidades autónomas ni a los ayuntamientos; por
eso Sanidad sale con 7 049 M€ en los PGE y con ~98 600 M€ en Eurostat (que suma todas
las administraciones y es gasto ejecutado). Sumar todos los programas no da el
presupuesto consolidado: hay transferencias entre administraciones y amortización de deuda.
