# Brief de Pedro · backend, integración y entrega

**Para pegar en tu Claude:**

> Lee `CLAUDE.md`, `docs/ARCHITECTURE.md` y `docs/API_CONTRACT.md`. Soy Pedro, dueño de
> `backend/`. Trabaja en la rama `Pedro`. Implementa las tareas de
> `docs/briefs/PEDRO.md` en orden, con un test por endpoint y commit al terminar cada una.

## Tu papel

El backend, y además el pegamento: el contrato, las integraciones, el README y que la
demo funcione.

## Tareas, en orden

### 1. API con datos de ejemplo (objetivo: 45 minutos)

- `backend/models.py`: modelos Pydantic copiados del contrato.
- `backend/main.py`: FastAPI con CORS abierto para `localhost:5173`, carga
  `data/dataset.json` al arrancar (ruta configurable con una variable de entorno) y
  expone `/api/meta`, `/api/areas`, `/api/areas/{id}`, `/api/sources`.
- Mientras Mario no tenga datos reales, un `backend/sample_dataset.json` pequeño con la
  forma del contrato.
- Cálculos en el backend: `share_of_total_pct`, `share_of_area_pct`, `yoy_change_pct`.
- **Hecho cuando:** `uvicorn main:app --reload` responde y `/docs` muestra los endpoints.

### 2. Comparación de países (30 minutos)

- `/api/compare`: filas por país, mediana de la UE (con `statistics.median`) y posición.

### 3. Avisos (1 hora)

- `backend/alerts.py`, dos funciones puras, una por tipo:
  - `usage_mismatch(cross, spend_share, usage_share)`: proporción entre ambas cuotas
    contra el umbral del cruce.
  - `international_outlier(spain_pct_gdp, eu_median)`: diferencia contra un umbral fijo.
- Severidad según lo lejos que quede del umbral. Los umbrales, como constantes con
  nombre al principio del archivo.
- `/api/alerts` con filtros; `alert_count` y `max_severity` en `/api/areas`.
- Tests con casos límite: sin indicador, valor `null`, justo en el umbral.

### 4. Integración (continuo)

- Cuando Mario suba el primer `dataset.json` real: cambiar la ruta y comprobar que los
  tests pasan con datos reales.
- Cuando Dersu conecte el frontend: revisar juntos cada pantalla contra el backend.
- Cambios de contrato: los editas tú en `docs/API_CONTRACT.md` y avisas a los dos.

### 5. Entrega (viernes, antes de las 12:00)

- `README.md`: qué es, capturas, cómo arrancarlo en tres comandos, enlaces a las fuentes.
- `AI_USAGE.md`: recoger las notas de los tres.
- Despliegue (opcional): frontend en Vercel o Netlify, backend en Render. Solo si a las
  11:00 del viernes todo lo demás está cerrado; la demo en local es válida.
- Ensayo del pitch de 5 minutos con cronómetro.
