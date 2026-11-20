# Uso de IA

## Mario (datos)

Herramienta: Claude Code (modelo Claude Opus 5.5), en la terminal, sobre la carpeta `data/`.

- Exploración de fuentes: localizar y comprobar con llamadas reales las APIs de Eurostat, BOE y los CSV de los PGE en la web de Hacienda.
- `fetch.py` y `build.py`: escritura del código de descarga, aplanado del JSON-stat y lectura de los CSV de los PGE; revisado y ejecutado en cada paso.
- Validación: propuesta de las comprobaciones (sumas, duplicados, negativos) y análisis de los casos que fallaban antes de decidir la regla.
- Cruces gasto-uso: cálculo de cuotas; el criterio (qué se compara, umbral, notas y qué cruces se descartan) se discutió y decidió en la sesión.
- Presupuestos 2015-2025: recorrido de la web de Hacienda para leyes y prórrogas, conversión de la tabla HTML de 2015-2016, y detección de los huecos (Seguridad Social en las prórrogas, 2020 sin documento) al revisar la serie.
- Gobiernos: búsqueda y verificación de los nombramientos en la API del BOE y del partido en La Moncloa; la decisión de no sumar importes por partido se tomó en la sesión.
- Cruces de protección social: búsqueda de fuentes de uso (INE, Eurostat), comprobación de las cifras y propuesta de umbral; la decisión de incluir pensiones y dejar fuera sanidad y transporte se tomó en la sesión.
- Tests (`data/test_build.py`) y documentación: `data/README.md`, `docs/DATA_SOURCES.md` y las decisiones de datos en `docs/ARCHITECTURE.md`.

## Pedro (backend, contrato y entrega)

Herramienta: Claude Code, en la terminal, sobre `backend/` y `docs/`.

- Diseño inicial: arquitectura, contrato de la API y reparto de tareas (`docs/`), discutido y aprobado por el equipo antes de programar.
- Backend: escritura de la API (FastAPI), las dos reglas de aviso y sus tests; revisado y ejecutado en cada paso.
- Integración de los datos de Mario: lectura del dataset real, nuevas rutas de los PGE (`/api/budget…`), desglose por tipo de gasto y ampliación del contrato a la v1.1.
- Tests: casos límite de las reglas, un test por endpoint y comprobaciones de sumas contra el dataset real.
- Comparación con países de fuera de la UE en `/api/compare` (contrato v1.2), con sus tests escritos antes que el código.
- `README.md` de entrega y capturas de pantalla, tomadas con la aplicación en marcha.
- Frontend (sobre el trabajo de Dersu): bloque «Fuera de la UE» en Comparar y repaso de todas las páginas en navegador, a ancho de escritorio y de móvil, contra el backend real.
- Frontend: página «Mapa» (qué país dedica más a cada ámbito), con el mapa generado desde Natural Earth y comprobada en navegador.
- Buscador de partidas, página de fondos europeos y botón «Copiar el dato con su fuente»: propuesta de funciones a partir del dataset, dos rutas nuevas (contrato v1.3) con sus tests, páginas del frontend y comprobación en navegador.
- Cabecera: el mapa pasa a ser una vista de «Comparar con otros países» y el buscador una lupa a la derecha; comprobado en navegador a ancho de escritorio y de móvil.
- Revisión final de errores y seguridad de todo el repositorio: barrido de todas las rutas de la API con entradas válidas y hostiles sobre el dataset real, búsqueda de secretos en el historial y revisión de `frontend/` y `data/`; los fallos encontrados se corrigieron con su test.
- Frontend: el flujo de los PGE deja de ser una imagen fija de 2023 y pasa a ser un diagrama interactivo del año elegido (`BudgetSankey.jsx`); comprobado en navegador (resaltado, clic, modo oscuro y móvil). Después, el mismo resaltado en el flujo de la calculadora (`TaxSankey.jsx`), con un hook común (`useHighlight.js`); el parpadeo al cruzar cintas se reprodujo y se midió con un barrido automático del ratón.
- Material de estudio para la defensa (presentación y resumen de decisiones); no forma parte del código.
- Frontend: «Comparar» abre con el mapa en grande y en vista general, con el ámbito y el año debajo; iconos de ámbito redibujados en línea fina; comprobado con capturas a ancho de escritorio y de móvil.
- Frontend: la página «Avisos» pasa de una lista con filtros a una tarjeta por aviso (cifra de la desviación y las dos cifras que la explican); el diseño se eligió entre tres propuestas y se comprobó con capturas a ancho de escritorio y de móvil.
- Frontend: portada simplificada (pregunta, una cifra y tarjetas-enlace a cada sección); el detalle del gasto pasa a la página nueva «Gasto público»; lema «como el agua»; comprobado con lint, build y capturas a escritorio y móvil.
