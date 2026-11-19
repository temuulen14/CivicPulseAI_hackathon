# Backend

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload      # http://localhost:8000/docs
.venv/bin/python -m pytest -q
```

Si `python3 -m venv` falla por falta de `ensurepip` (Debian/Ubuntu sin `python3-venv`):

```bash
python3 -m venv --without-pip .venv
python3 -m pip --python .venv/bin/python install -r requirements.txt
```

Carga `data/dataset.json` (15 MB, medio segundo al arrancar). Se puede forzar otro archivo
con `DATASET_PATH`. `sample_dataset.json` es solo para los tests: mezcla valores
ilustrativos con un extracto real de los PGE.

| Archivo | Qué hace |
|---------|----------|
| `main.py` | Rutas de la API y CORS |
| `dataset.py` | Carga el JSON en memoria y responde consultas sencillas |
| `alerts.py` | Las dos reglas de aviso y sus textos |
| `budget.py` | Presupuestos Generales del Estado: año → política → programa → partida, buscador y fondos europeos |
| `models.py` | Forma de cada respuesta (igual que `docs/API_CONTRACT.md`) |
| `test_api.py` | Tests con los datos de muestra |
| `test_real_dataset.py` | Comprobaciones contra el dataset real |
