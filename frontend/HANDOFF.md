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

Pasos 1–6 del brief **terminados, en commits y subidos** a `origin/Dersu` (ver
`frontend/CAMBIOS.md`). La app funciona con los mocks y con el backend real.

**Paso 7 (rediseño), a medias.** Hecho:
- `src/mocks.js` reescrito: años **2015–2024** (último 2024), 15 países, más subámbitos e
  indicadores y **8 avisos por año**. Los avisos se generan con las mismas reglas que el
  backend: 5 de gasto frente a uso (tren, **autobús**, carretera, universidad, salud
  pública) y 3 de comparación con la UE (vivienda, servicios generales, defensa).
- `index.html` carga las fuentes Newsreader y Geist de Google Fonts.
- `src/index.next.css`: **borrador** del CSS nuevo. Todavía no se importa: las páginas
  siguen usando `src/index.css`, el diseño antiguo.

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

## 5. Qué falta (en este orden)

1. **Cabecera y pie** (`App.jsx`): quitar `.brand-mark` (€); nombre `.wordmark` en serif;
   nav `.site-nav`. Cambiar `src/main.jsx` para importar el CSS nuevo (renombrar
   `index.next.css` → `index.css`) y adaptar las clases de cada página.
2. **Componentes nuevos:**
   - `YearPicker.jsx`: fila de años 2015–2024 con una barrita del total de cada año
     (clases `.years/.year/.year-bar`). Sustituye a `YearSelect`.
   - `useAllYears.js`: pide `getAreas(y)` para cada año de `meta.years` con `Promise.all`.
     Alimenta el YearPicker, las sparklines y la vista Evolución.
   - `Spectrum.jsx`: barra segmentada de la portada, con leyenda.
   - `Segmented.jsx`: control segmentado para vistas y medidas (`aria-pressed`).
   - `Sparkline.jsx`: SVG mínimo para las tablas.
   - `Severity.jsx` con iconos SVG en vez de "!!/!/i".
   - `AreaTreemap.jsx` con la escala verde de 5 pasos según `share_of_total_pct`
     (≥25, ≥10, ≥5, ≥2 y el resto).
3. **Portada:**
   - Hero (cifra total, etiqueta "provisional", espectro) y YearPicker.
   - Bloque "Explora el gasto" con vistas: **Mapa** (treemap), **Ranking** (tabla con
     barra de cuota, sparkline 2015–2024 y variación), **Evolución** (gráfico del total +
     pequeños múltiplos por ámbito, clicables) y **Cambios** (barras divergentes de la
     variación por ámbito, con opción "frente al año anterior" o "desde 2015").
   - Selector de medida: importe / % del PIB.
   - Los 3 avisos destacados.
4. **Avisos (rediseño completo):**
   - Título y una frase resumen calculada ("8 avisos en 2024: 1 importante, 5 merecen una
     mirada, 2 para tu información"). Sin el texto largo que hay que quitar.
   - **Filtros visuales en vez de desplegables:**
     - barra de severidad clicable (cada segmento con su número);
     - chips de tipo;
     - chips de ámbito con su recuento;
     - botón "Quitar filtros".
     Se piden todos los avisos del año una vez y se filtran en el cliente.
   - **Desgloses visuales:**
     - **Gasto frente a uso:** gráfico de mancuernas, un punto verde para la cuota de gasto y
       uno azul para la de uso, por aviso;
     - **España frente a la mediana UE:** barras divergentes con la distancia relativa,
       sacada de `evidence`;
     - recuento por ámbito.
     Al pulsar un elemento se filtra.
   - **Lista desplegable:** cada fila muestra icono de severidad, título, ámbito y cifras
     clave, y al desplegarla aparece la tarjeta completa. Orden por severidad o por ámbito.
5. **Ámbito:** YearPicker, estilos nuevos y gráfico de evolución con selector de importe o
   % del PIB.
6. **Comparar:** añadir "España frente a la mediana UE a lo largo de los años", con líneas
   a partir de `getCompare` para cada año.
7. **Fuentes:** solo estilos.
8. Quitar los "→" de los enlaces internos (tópico según frontend-design) y los " · " de los
   textos propios.
9. Capturas a 1280 px y 390 px de todas las páginas, con mocks y con el backend real.
10. Anotar el paso 7 en `CAMBIOS.md`, añadir filas en `docs/ARCHITECTURE.md` y hacer commit
    y push a `origin/Dersu`.

## 6. Cómo arrancar y verificar

```bash
# Frontend con datos de ejemplo
cd frontend && npm install && npm run dev                 # http://localhost:5173

# Backend real (Pedro) con el dataset real de Mario (está en la rama Mario, aún no en main)
git show origin/Mario:data/dataset.json > /tmp/mario_dataset.json   # o la ruta que prefieras
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
