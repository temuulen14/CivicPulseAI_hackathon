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

Carga `data/dataset.json` si existe; si no, `sample_dataset.json` (valores en parte
ilustrativos, solo para desarrollo). Se puede forzar otro archivo con `DATASET_PATH`.
