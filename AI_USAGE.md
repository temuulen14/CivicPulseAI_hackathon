# Uso de IA

## Mario (datos)

Herramienta: Claude Code (modelo Claude Opus 5.5), en la terminal, sobre la carpeta `data/`.

- Exploración de fuentes: localizar y comprobar con llamadas reales las APIs de Eurostat, BOE y los CSV de los PGE en la web de Hacienda.
- `fetch.py` y `build.py`: escritura del código de descarga, aplanado del JSON-stat y lectura de los CSV de los PGE; revisado y ejecutado en cada paso.
- Validación: propuesta de las comprobaciones (sumas, duplicados, negativos) y análisis de los casos que fallaban antes de decidir la regla.
- Cruces gasto-uso: cálculo de cuotas; el criterio (qué se compara, umbral, notas y qué cruces se descartan) se discutió y decidió en la sesión.
- Documentación: `data/README.md` y las decisiones de datos en `docs/ARCHITECTURE.md`.

## Pedro (backend, contrato y entrega)

Herramienta: Claude Code, en la terminal, sobre `backend/` y `docs/`.

- Diseño inicial: arquitectura, contrato de la API y reparto de tareas (`docs/`), discutido y aprobado por el equipo antes de programar.
- Backend: escritura de la API (FastAPI), las dos reglas de aviso y sus tests; revisado y ejecutado en cada paso.
- Integración de los datos de Mario: lectura del dataset real, nuevas rutas de los PGE (`/api/budget…`), desglose por tipo de gasto y ampliación del contrato a la v1.1.
- Tests: casos límite de las reglas, un test por endpoint y comprobaciones de sumas contra el dataset real.
- Material de estudio para la defensa (presentación y resumen de decisiones); no forma parte del código.
