# Uso de IA

Somos Mario, Pedro y Dersu (equipo Leather and Lies). Hemos usado Claude Code, de
Anthropic, cada uno en su terminal. La aplicación no llama a ningún modelo: lo que se ve
en pantalla son cifras oficiales y cuentas que se pueden leer en el código.

## Cómo la hemos usado

Para nosotros la IA ha sido una herramienta más, que nos ha servido para ir más rápido
en las pocas horas del hackatón. El proyecto no dependía de ella. La hemos tratado como a
un programador júnior: le encargábamos el código con instrucciones concretas en cada
momento, y lo revisábamos. Es código que sabemos escribir nosotros, así que podemos
explicar cualquier archivo.

La arquitectura, el stack y el estilo gráfico los decidimos los tres. Elegimos a
propósito el stack más habitual y con menos dependencias: Python con `requests`, FastAPI
con Pydantic, y React con Vite y Recharts. Son librerías conocidas y probadas. El mapa,
los diagramas de flujo y los iconos no necesitaban ninguna, así que son SVG y CSS
normales.

Las reglas que le pusimos están en `CLAUDE.md`, en el repositorio:

1. No se inventa ningún dato. Cada cifra sale de una fuente oficial y lleva su URL, y lo
   provisional va marcado como tal. La IA no ha generado ni estimado ninguna cifra.
2. Primero el diseño. Discutimos y aprobamos la arquitectura y el contrato de la API
   (`docs/`) antes de programar, y la IA ha trabajado siempre contra ese contrato.
3. No se añaden dependencias sin acordarlo. No hay base de datos, gestor de estado ni
   librerías de mapas o de iconos, para que cualquiera de los tres pueda explicar
   cualquier archivo.
4. Nada está hecho hasta que se comprueba: se ejecuta el script, pasan los tests y se
   abre la página en el navegador.
5. Cada decisión que no sea obvia se anota con su porqué en `docs/ARCHITECTURE.md`
   («Decisiones de implementación»). Es lo que hemos estudiado para la defensa.

## Lo que hemos decidido nosotros

- La idea de cruzar cuánto se gasta con el uso real, y avisar cuando no cuadran o cuando
  España se aleja de otros países.
- La arquitectura. Datos, backend y frontend van separados y se unen por un único
  `dataset.json` y un contrato de API que fijamos antes de programar. No hay base de
  datos porque son pocas filas y solo se leen.
- El stack, y la regla de no añadir dependencias ni capas sin hablarlo entre los tres.
- El estilo gráfico: el nombre, los colores, la tipografía, el modo oscuro y el aspecto
  de cada pantalla.
- Las fuentes. Eurostat (COFOG, sector S13) da las cifras comparables entre países y
  Hacienda los PGE partida a partida. El BOE es el ancla legal, y la OCDE solo una
  referencia orientativa para países de fuera de la UE.
- Las reglas de los avisos: qué se compara con qué, el umbral de cada cruce y el uso de
  la mediana en lugar de la media. Descartamos los cruces de sanidad y transporte porque
  no encontramos un indicador de uso que pudiéramos defender.
- Lo que no hacemos. No sumamos importes por partido político ni mezclamos el presupuesto
  del Estado con el gasto ejecutado de todas las administraciones. 2020 se queda sin
  rellenar porque no tuvo documento presupuestario propio, y no hemos tocado los umbrales
  para que salten más avisos.
- La interfaz: qué va en la portada, qué se quita y cómo se ven los avisos, los iconos y
  los diagramas. Varias pantallas las rehicimos enteras porque no nos convencían.

## Para qué la ha usado cada uno

Cada uno tiene su carpeta, pero el proyecto lo hemos hecho entre los tres. Las decisiones
se han tomado en común y todos hemos tocado y revisado el trabajo de los demás.

### Mario (datos, `data/`)

- Localizar las APIs de Eurostat y del BOE y los CSV de los PGE, comprobándolas con
  llamadas reales (`docs/DATA_SOURCES.md`).
- Escribir `fetch.py` y `build.py`, que descargan los datos, aplanan el JSON-stat y leen
  los CSV. La salida se ejecutó y se revisó en cada paso.
- Proponer comprobaciones de calidad (sumas, duplicados, negativos) y analizar los casos
  que fallaban. Así aparecieron los huecos de la serie: la Seguridad Social en las
  prórrogas y el año 2020.
- Calcular las cuotas de los cruces de gasto y uso, y verificar en el BOE los
  nombramientos de los Gobiernos. El criterio y el umbral de cada cruce los decidió Mario.
- Tests (`data/test_build.py`) y documentación de los datos.

### Pedro (backend, contrato y entrega: `backend/`, `docs/`, `README.md`)

- Pasar a limpio la arquitectura y el contrato que habíamos acordado.
- Escribir la API con FastAPI, las dos reglas de aviso y sus tests. Después vinieron las
  rutas de los PGE, el buscador de partidas y los fondos europeos (contrato v1.1 a v1.3).
- Tests de los casos límite de las reglas, uno por endpoint, y comprobaciones de sumas
  contra el dataset real.
- Revisión final: probar todas las rutas con entradas válidas y hostiles, buscar secretos
  en el historial y repasar las páginas en el navegador. Cada fallo encontrado se
  corrigió con su test.
- Cambios en la interfaz, coordinados con Dersu: el mapa de comparación (generado desde
  Natural Earth, sin librería), los diagramas de flujo interactivos, la página de avisos,
  el buscador de la cabecera y la portada.
- El `README.md` y el material de estudio para la defensa, que no forma parte del código.

### Dersu (frontend, `frontend/`)

- Escribir las páginas y componentes de React contra el contrato de la API: ámbitos,
  comparación, presupuestos, calculadora de impuestos y gasto frente a inflación.
- Estilos en CSS normal, modo oscuro y adaptación a móvil, comprobados en el navegador.
- Anotar cada cambio de interfaz y su motivo en `frontend/CAMBIOS.md`.

## Cómo hemos comprobado lo que generaba

- Hay 49 tests del backend y 6 del pipeline de datos. Comprueban, entre otras cosas, que
  las políticas suman el total del año y que los tipos de gasto suman el importe de cada
  ámbito.
- Las cifras de los PGE se guardan en miles de euros, sin convertir, para poder cotejarlas
  tal cual con el documento de Hacienda.
- Hemos abierto cada pantalla en el navegador contra el backend real, a ancho de
  escritorio y de móvil.
- Al revisar descartamos o corregimos varias cosas que había escrito la IA. Por ejemplo,
  una búsqueda vacía devolvía todos los programas, y un presupuesto de 2015 aparecía como
  vigente en 2020.

## Límites

Las fuentes y los umbrales los hemos elegido nosotros. La IA tampoco ha producido datos
ni interviene cuando la aplicación está en marcha.
