# Handoff · frontend de CuentasClaras (rama `Dersu`)

_Actualizado: 2026-11-19. Código congelado el viernes 20-11-2026 a las 12:00._

**Para pegar en la sesión nueva:**

> Lee `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `frontend/HANDOFF.md` y
> `frontend/CAMBIOS.md`. Soy Dersu, dueño de `frontend/`, rama `Dersu`. Continúa el rediseño
> (paso 7) desde el punto "Qué falta" de `frontend/HANDOFF.md`. Usa las skills
> `frontend-design`, `ui-ux-pro-max` y `dataviz`. Haz commit al terminar cada bloque, anota
> cada cambio en `frontend/CAMBIOS.md` y haz push solo a `origin/Dersu` (el merge a `main`
> lo hago yo).

---

## 1. Reglas y preferencias del usuario (Dersu)

- **Stack del frontend (decidido por el usuario, distinto de los docs del equipo):**
  React + Vite + Recharts, en **JavaScript y CSS normales**. Sin TypeScript, sin Tailwind,
  sin React Router (la navegación va por `#` en `App.jsx`). No añadir más dependencias.
- **Git:** commits pequeños por bloque, con `Co-Authored-By`. **Push solo a
  `origin/Dersu`.** El merge a `main` lo hace el usuario.
- **Registro obligatorio:** cada cambio va explicado (qué, por qué, cómo funciona) en
  `frontend/CAMBIOS.md`, más una fila en el apartado "Frontend (Dersu)" de
  "Decisiones de implementación" de `docs/ARCHITECTURE.md` cuando no sea obvio.
- Solo se toca `frontend/` (y la fila del frontend en `docs/ARCHITECTURE.md`). `data/` es
  de Mario, y `backend/`, `README.md` y `AI_USAGE.md` son de Pedro.
- Ningún dato inventado presentado como real: los mocks llevan la franja "datos de ejemplo".
- El frontend **no calcula avisos**: solo los muestra (sí puede filtrar o agrupar en cliente).
- Verificar con capturas antes de dar algo por hecho (ver sección 6).

## 2. Estado actual

Pasos 1–7 **terminados, en commits y subidos** a `origin/Dersu`. El rediseño (paso 7) está
completo y explicado en `frontend/CAMBIOS.md`, sección 7. Se probó con mocks y con el backend
real, usando el dataset de `main` (27 países de la UE, cruces de educación y ley de cada año).

Las skills `frontend-design`, `ui-ux-pro-max` y `dataviz` se cargaron de forma nativa en la sesión del 19-11.

**Paso 8 (19-11):** frontend adaptado al contrato v1.1 de Pedro: sección Presupuestos
(año, política, programa y partidas), tipo de gasto y políticas de los PGE en cada ámbito. Ver
`frontend/CAMBIOS.md`, sección 8.

## 3. Qué pidió el usuario para el rediseño (literal, resumido)

1. UI **como la web de Anthropic**: blanca, bonita, elegante, con un toque futurista y
   sostenible sin pasarse. **No copiar su marca**: ni logo, ni nombre, ni su color arcilla.
   Se toma la sensación (blanco, serif editorial, mucho aire, líneas finas).
2. **Más años**, no solo 2021–2023 (hecho en mocks; el backend real ya da 2015–2024).
3. **Rediseñar la página de Avisos.**
   - **Quitar este texto:** "Señales que merecen una mirada: cuando la cuota de gasto de algo
     no se parece a su cuota de uso, o cuando España se aleja de la mediana europea. Informan,
     no acusan: cada aviso trae las cifras y su contexto."
   - Que **no** sean tres desplegables de filtro. Quiere **más maneras de desglosar los
     datos visualmente**, en toda la app.
4. **Quitar el logo del euro** y **cambiar la fuente del nombre** CuentasClaras (→ serif Newsreader).
5. **Usar las skills** (al menos una pasada) y cambiar todo lo que no sea apto.
6. **Más avisos**, por ejemplo usuarios de autobús frente a la proporción del presupuesto de
   transporte invertida en autobús (hecho en mocks).
7. Datos intuitivos y rápidos de encontrar, pero muy completos, no escasos.

## 4. Plan de diseño (ya revisado con las skills)

**Skills:** `dataviz` estaba activa en la sesión. `frontend-design` y `ui-ux-pro-max` se
instalaron con la sesión ya abierta (scope de proyecto en `/Users/dersuhernando/hackathon`),
así que se leyeron a mano desde `~/.claude/plugins/cache/...`. La sesión nueva debería
cargarlas de forma nativa. El usuario habló de "4 skills" y no se sabe cuál es la cuarta
(`superpowers` y `context7` no están instaladas): preguntárselo.

- **ui-ux-pro-max** (`--design-system`): estilo "Minimalism & Swiss", contraste 4.5:1, foco
  visible, `prefers-reduced-motion`, objetivos táctiles de 44 px, iconos SVG y no emoji,
  barras ordenadas con etiquetas directas y tabla como alternativa.
- **frontend-design:** evitar los tópicos de página generada: crema + serif + acento
  arcilla, etiquetas en mayúsculas sobre los títulos, `→` al final de los enlaces, tipografía
  mono para etiquetas, separadores " · " y tarjetas idénticas con sombra. El elemento
  llamativo se concentra en un solo sitio y el resto queda sobrio.
- **dataviz:** paleta validada con `scripts/validate_palette.js` (todo PASS):
  - Dos series: verde bosque `#12805c` (gasto, España, dato principal) y azul cielo
    `#3b72c9` (uso, comparación).
  - Escala de magnitud de **5 pasos** (con 10 no pasa el validador):
    `#74b598 #4b9776 #2a7a5a #165c42 #063323`. Texto blanco en los 3 más oscuros.
  - Sin modo oscuro: el usuario quiere la UI blanca.

**Tokens:** fondo `#ffffff`, bruma `#f6f7f4`, tinta `#191b18`, grafito `#575b55`, línea
`#e5e7e2`. Severidad: info `#3b72c9`, warning (texto `#9a6400`, marca `#f2b33d`), critical
`#b83a2e`, cada una con su fondo suave. Están todos en `src/index.next.css`.

**Tipografía:** Newsreader (serif) para el nombre, los titulares y las cifras grandes;
Geist (sans) para la interfaz y las tablas (con `tabular-nums`).

**Elemento distintivo:** en la portada, la cifra total en serif muy grande y debajo un
**"espectro"**: una barra segmentada con los 10 ámbitos en proporción y la escala verde,
cada segmento enlazado a su ámbito. Detrás, unas curvas de nivel muy tenues en SVG como
toque sostenible.

## 5. Qué falta

Nada del plan del rediseño. Ideas opcionales si sobra tiempo antes del código congelado:
- Que el usuario haga el merge de `Dersu` a `main` (el frontend aún no está en `main`).
- Dividir el bundle (aviso de Vite de más de 500 kB, sobre todo por Recharts). No bloquea.
- El MCP de Playwright busca Google Chrome, que no está instalado. Las capturas se hacen con
  `playwright-core` y el Chromium de la caché (sección 6).

## 6. Cómo arrancar y verificar

```bash
# Frontend con datos de ejemplo
cd frontend && npm install && npm run dev                 # http://localhost:5173

# Backend real (Pedro) con el dataset real de Mario (ya está en main)
git show origin/main:data/dataset.json > /tmp/mario_dataset.json   # o la ruta que prefieras
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DATASET_PATH=/tmp/mario_dataset.json .venv/bin/uvicorn main:app --port 8000

# Frontend contra el backend real
cd frontend && VITE_API_URL=http://localhost:8000/api npx vite --port 5174
```

- **Capturas:** Chromium de Playwright en
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`.
  Se usa con `playwright-core` instalado en una carpeta temporal y un script que abre la URL,
  hace captura de página completa, registra errores de consola y comprueba
  `scrollWidth > innerWidth` (scroll horizontal).
- `npx eslint src` y `npm run build` tienen que pasar sin errores.

## 7. Datos reales: situación

- El backend de Pedro ya está en `main` y cumple el contrato. Cambios del contrato:
  - un año sin datos devuelve 404;
  - `eu_median` es `null` con menos de tres países;
  - `evidence[].source_id` puede ser `null`.
- El `dataset.json` de Mario (rama `Mario`) trae 2015–2024 **solo de España, sin avisos,
  indicadores ni ley**, así que Comparar y Avisos salen casi vacíos con datos reales. Hay
  que pedirle a Mario otros países y cruces en `data/cruces.json`:
  - autobús, tren y carretera frente a `tran_hv_psmod`. Ojo: COFOG no separa la inversión
    por modo, así que hace falta otra fuente oficial para la cuota de gasto, por ejemplo el
    Ministerio de Transportes.
- Mario también tiene `spending_by_type` (personal, compras, inversión…). No está en el
  contrato; si se quiere mostrar, Pedro tiene que añadirlo.
- `GET /areas/{id}` no trae `yoy_change_pct`. El frontend lo calcula desde `history`.
  Opcional: pedirlo a Pedro.

## 8. Pendiente de equipo

- `CLAUDE.md`, `docs/ARCHITECTURE.md` (tabla de stack) y `docs/briefs/DERSU.md` siguen
  diciendo TypeScript + Tailwind + Router: avisar para actualizarlos.
- `AI_USAGE.md` es de Pedro. Línea propuesta para Dersu: "Claude Code para generar el
  frontend, revisarlo con capturas y documentar las decisiones en `frontend/CAMBIOS.md`".
- Webs de inspiración que se le pasaron al usuario: ¿Dónde van mis impuestos? (Civio),
  bundeshaushalt.de, USAspending.gov, Where Does My Money Go?, Our World in Data y OECD
  Government at a Glance.
