# Uso de IA

## Mario (datos)

Herramienta: Claude Code (modelo Claude Opus 5.5), en la terminal, sobre la carpeta `data/`.

- Exploración de fuentes: localizar y comprobar con llamadas reales las APIs de Eurostat, BOE y los CSV de los PGE en la web de Hacienda.
- `fetch.py` y `build.py`: escritura del código de descarga, aplanado del JSON-stat y lectura de los CSV de los PGE; revisado y ejecutado en cada paso.
- Validación: propuesta de las comprobaciones (sumas, duplicados, negativos) y análisis de los casos que fallaban antes de decidir la regla.
- Cruces gasto-uso: cálculo de cuotas; el criterio (qué se compara, umbral, notas y qué cruces se descartan) se discutió y decidió en la sesión.
- Documentación: `data/README.md` y las decisiones de datos en `docs/ARCHITECTURE.md`.
