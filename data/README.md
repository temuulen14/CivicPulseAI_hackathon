# data/ · pipeline de datos (Mario)

```bash
pip install requests
python data/fetch.py   # descarga a raw/ (unos 2 minutos: Eurostat + 472 CSV de los PGE)
python data/build.py   # valida y escribe dataset.json; se para si algo no cuadra
```

`dataset.json` sigue la forma de `docs/API_CONTRACT.md` y añade cuatro claves nuevas.
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

## Presupuestos Generales del Estado 2023, partida a partida

El nivel más fino que se publica: cada programa de cada ministerio, hasta subconcepto.

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

**Ojo al contarlo:** son créditos **presupuestados** del **Estado central** (más la
Seguridad Social). No incluye a las comunidades autónomas ni a los ayuntamientos; por
eso Sanidad sale con 7 049 M€ en los PGE y con ~98 600 M€ en Eurostat (que suma todas
las administraciones y es gasto ejecutado). Sumar todos los programas no da el
presupuesto consolidado: hay transferencias entre administraciones y amortización de deuda.
