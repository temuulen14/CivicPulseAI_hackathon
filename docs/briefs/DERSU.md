# Brief de Dersu · frontend

**Para pegar en tu Claude:**

> Lee `CLAUDE.md`, `docs/ARCHITECTURE.md` y `docs/API_CONTRACT.md`. Soy Dersu, dueño de
> `frontend/`. Trabaja en la rama `Dersu`. Implementa las tareas de
> `docs/briefs/DERSU.md` en orden, haciendo commit al terminar cada una. El diseño
> técnico ya está aprobado: no lo rediscutas. Para lo visual usa las skills
> `frontend-design` y `dataviz` si están disponibles.

## Tu papel

Que un ciudadano entienda en diez segundos adónde va el dinero y en qué merece la pena
fijarse. La interfaz vale 15 puntos directos y condiciona los 25 de impacto y los 15 del
pitch, que es una demo en vivo.

Solo tocas `frontend/`. Consumes la API tal como está en el contrato.

## Stack

Vite + React + TypeScript + Tailwind + Recharts + React Router. Peticiones con `fetch`.
Sin gestor de estado ni más librerías.

## Tareas, en orden

### 1. Esqueleto y datos de ejemplo (objetivo: 30 minutos)

- Proyecto Vite en `frontend/`, Tailwind, rutas vacías.
- `src/api.ts`: los tipos TypeScript del contrato y una función por endpoint.
- `src/mocks.ts`: datos de ejemplo copiados del contrato. Variable `VITE_API_URL`: si
  está vacía, `api.ts` devuelve los datos de ejemplo; si no, llama al backend. Así no
  dependes de nadie para empezar.
- **Hecho cuando:** `npm run dev` enseña la portada con datos de ejemplo.

### 2. Portada (1 hora)

- Cifra grande: gasto público total del año, con selector de año.
- **Mapa de áreas** (treemap de Recharts) con los 10 ámbitos: el tamaño es el importe;
  los ámbitos con avisos llevan una marca. Clic → página del ámbito.
- Franja de "Avisos destacados" con los tres más graves.
- Etiqueta "dato provisional" cuando `provisional` sea verdadero.

### 3. Página de ámbito (1 hora)

- Cabecera: importe, % del total, % del PIB, variación anual.
- Evolución por años (líneas) y desglose en subámbitos (barras).
- **Tarjetas de aviso**: título, frase, las dos cifras de `evidence` enfrentadas en una
  barra comparativa (cuota de gasto frente a cuota de uso), nota del analista y enlace
  a la fuente. Es la pantalla que más se va a enseñar en la demo: cuídala.
- Bloque "Marco legal" con el enlace a la ley en el BOE.

### 4. Comparar países (45 minutos)

- Barras horizontales ordenadas, España resaltada, línea de la mediana de la UE.
- Selector de ámbito y de año.

### 5. Avisos y Fuentes (30 minutos)

- `/avisos`: lista filtrable por severidad y tipo.
- `/fuentes`: tabla de `/sources` con enlaces. Es un entregable obligatorio.

### 6. Integración y pulido

- En cuanto Pedro tenga el backend, pon `VITE_API_URL=http://localhost:8000/api`.
- Estados de carga, de error y de "sin datos" en todas las páginas.
- Que se vea bien en móvil (el jurado puntúa que sea responsive).

## Criterios de diseño

- Tono: sobrio, institucional pero no aburrido; el dato es el protagonista.
- Lenguaje llano: "Sanidad", no "GF07". Importes legibles: "84.500 M€", "680 mil millones".
- Severidad con color **y** icono o texto, nunca solo con color.
- Los avisos informan, no acusan. Nada de rojos alarmistas para un `info`.
- Formato numérico español (`Intl.NumberFormat('es-ES')`).

## Reglas de tu área

- Si te falta un campo, pídeselo a Pedro; no inventes datos en el frontend ni calcules
  avisos en el cliente.
- Merge a `main` al terminar cada tarea.
