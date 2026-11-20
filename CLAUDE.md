# Cristalino · equipo Leather and Lies

Explorador de los Presupuestos Generales del Estado: cuánto se gasta en cada ámbito,
qué uso real se le da, y avisos cuando gasto y uso no cuadran o cuando España se
desvía de otros países. Hackatón 2Campus1Code, **código congelado el viernes 20-11-2026 a las 12:00**.

Lee antes de tocar nada:

- `docs/ARCHITECTURE.md`: cómo encajan las piezas.
- `docs/API_CONTRACT.md`: el contrato JSON entre datos, backend y frontend. **Es la ley.**
- `docs/DATA_SOURCES.md`: fuentes oficiales, con las llamadas ya comprobadas.
- `docs/briefs/<TU_NOMBRE>.md`: tu encargo concreto.

## Quién es dueño de qué

| Persona | Carpeta | Rama |
|---------|---------|------|
| Mario | `data/` (pipeline, cruces, calidad de datos) | `Mario` |
| Pedro | `backend/`, despliegue, `README.md`, `AI_USAGE.md` | `Pedro` |
| Dersu | `frontend/` | `Dersu` |

Reglas:

1. **No edites carpetas de otro.** Si necesitas un cambio ahí, pídeselo a su dueño.
2. **El contrato solo cambia con aviso.** Cualquier cambio en `docs/API_CONTRACT.md` se
   anuncia al equipo antes de hacer merge; lo edita Pedro.
3. Ramas por persona, merge a `main` a menudo (como mínimo cada hora) y siempre con algo
   que arranque. Antes de empezar una tarea: `git pull --rebase civic main` (o el nombre
   que tenga tu remoto).
4. Commits pequeños y descriptivos (`feat:`, `fix:`, `data:`, `docs:`). El historial puntúa.
5. Ningún dato inventado. Cada cifra lleva su fuente oficial y su URL. Si un dato es
   provisional o estimado, se marca como tal.

## Stack

Lo más habitual y lo mínimo, para poder explicar cada pieza al jurado:

- **Datos**: Python 3.12 + `requests`. Salida: `data/dataset.json`.
- **Backend**: FastAPI + Pydantic. Sin base de datos: carga `dataset.json` al arrancar.
- **Frontend**: Vite + React + Recharts, en JavaScript y CSS normales, con `fetch` nativo.

**No añadas dependencias ni capas** (base de datos, ORM, gestor de estado, librería de
peticiones, Docker…) sin acordarlo con el equipo. Si algo se resuelve con veinte líneas
claras, no lleva librería.

Nombres de campos y código en inglés (`snake_case` en JSON); textos de interfaz y
documentación en español.

## Cómo trabajar con Claude en este repo

- El diseño ya está decidido y aprobado en `docs/`. **No vuelvas a abrir la fase de
  diseño**: ve directo a planificar e implementar tu brief. Solo pregunta al humano si
  algo contradice el contrato.
- Quedan pocas horas y el jurado preguntará por el código. Escribe el código más simple
  que funcione: funciones cortas, nombres claros, sin abstracciones para "más adelante".
  Cualquiera del equipo tiene que poder explicar cualquier archivo.
- Verifica antes de decir que algo está hecho: ejecuta el script, levanta el servidor,
  abre la página.
- Skills útiles si están instaladas: `frontend-design` y `ui-ux-pro-max` (interfaz),
  `dataviz` (gráficos), `superpowers:systematic-debugging` (errores),
  `superpowers:verification-before-completion`, `context7` (documentación de librerías).
  El repo propone instalar estos plugins al abrirlo (`.claude/settings.json`).
- Cuando tomes una decisión que no sea obvia, añade una fila (qué y por qué) a tu
  apartado de "Decisiones de implementación" en `docs/ARCHITECTURE.md`. El jurado
  pregunta por el código y hay que poder explicarlo.
- Anota en `AI_USAGE.md` (sección de tu nombre) para qué has usado la IA: una línea por
  bloque de trabajo basta.
