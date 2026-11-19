"""Tests de las piezas del pipeline que se pueden equivocar en silencio.

Uso: python -m pytest data/   (no necesitan red ni los datos de raw/)
"""

import pytest

from build import days_in_office, flatten_jsonstat, parse_amount, parse_pge_csv, sums_match


def test_flatten_jsonstat_recorre_dimensiones_en_orden():
    # 2 unidades x 3 años: el índice 4 es (PC_GDP, 2022), y el 1 falta (hueco).
    data = {
        "id": ["unit", "time"],
        "size": [2, 3],
        "dimension": {
            "unit": {"category": {"index": {"MIO_EUR": 0, "PC_GDP": 1}}},
            "time": {"category": {"index": {"2021": 0, "2022": 1, "2023": 2}}},
        },
        "value": {"0": 100.0, "2": 120.0, "4": 7.5},
        "status": {"2": "p"},
    }
    rows = flatten_jsonstat(data)
    assert rows == [
        {"unit": "MIO_EUR", "time": "2021", "value": 100.0, "status": None},
        {"unit": "MIO_EUR", "time": "2023", "value": 120.0, "status": "p"},
        {"unit": "PC_GDP", "time": "2022", "value": 7.5, "status": None},
    ]


def test_parse_amount_formato_espanol():
    assert parse_amount("1.071.624,66") == 1071624.66
    assert parse_amount("61,04") == 61.04
    assert parse_amount("  ") is None


def test_sums_match_tolerancia():
    assert sums_match(680_225 + 3_000, 680_225)       # 0,44 %: dentro
    assert not sums_match(680_225 + 4_000, 680_225)   # 0,59 %: fuera
    assert sums_match(11.5, 10.0)                     # partida pequeña: 2 M€ de margen


CSV_PROGRAMA = """;PRESUPUESTOS GENERALES DEL ESTADO;
;Sección: 17 MINISTERIO DE TRANSPORTES;
;Programa: 453B Creación de infraestructura de carreteras;
;(Miles de euros);
Orgánica;Económica;Explicación;;Total;
17.38;;DIRECCIÓN GENERAL DE CARRETERAS;;;
;1;GASTOS DE PERSONAL;;;
;12;Funcionarios;;100,00;
;16000; Seguridad Social;20,50;;
;;TOTAL GASTOS DE PERSONAL;;120,50;
;7;TRANSFERENCIAS DE CAPITAL;;;
;755;Convenio con la Comunidad Autónoma de Canarias;;1.000,00;
;;TOTAL TRANSFERENCIAS DE CAPITAL;;1.000,00;
;;TOTAL DIRECCIÓN GENERAL DE CARRETERAS;;1.120,50;
17.50;;MECANISMO DE RECUPERACIÓN Y RESILIENCIA;;30,00;
;;TOTAL Creación de infraestructura de carreteras;;1.150,50;
"""


def test_parse_pge_csv(tmp_path):
    path = tmp_path / "programa.CSV"
    path.write_bytes(CSV_PROGRAMA.encode("cp1252"))
    program = parse_pge_csv(path, 2023)

    assert program["program_id"] == "453B"
    assert program["section_id"] == "17"
    assert program["total_keur"] == 1150.50
    # El total del organismo viene en su línea TOTAL; el del MRR, en la misma fila.
    assert [(o["organic_id"], o["total_keur"]) for o in program["organics"]] == [
        ("17.38", 1120.50), ("17.50", 30.00)]
    amounts = {line["economic_code"]: line["amount_keur"] for line in program["lines"]}
    assert amounts["1"] == 120.50        # capítulo: de su línea TOTAL
    assert amounts["16000"] == 20.50     # subconcepto: importe en la columna 3
    assert amounts["755"] == 1000.00


def test_days_in_office_2018_se_reparte_entre_dos_gobiernos():
    governments = [
        {"id": "rajoy_2016", "start": "2016-10-31", "end": "2018-06-02"},
        {"id": "sanchez_2018", "start": "2018-06-02", "end": "2020-01-08"},
    ]
    assert days_in_office(governments, 2018) == [
        {"government_id": "rajoy_2016", "days": 152},
        {"government_id": "sanchez_2018", "days": 213},
    ]


def test_days_in_office_detecta_huecos():
    governments = [{"id": "a", "start": "2018-01-01", "end": "2018-06-01"}]
    with pytest.raises(ValueError):
        days_in_office(governments, 2018)
