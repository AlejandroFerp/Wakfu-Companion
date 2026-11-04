# Plan: registro de combate en español

## Objetivo y alcance

Mostrar una cronología legible de cada combate, conservando los medidores agregados y el rastreador. El archivo `wakfu_chat.log` será la fuente principal: contiene los eventos de combate con hora y en orden. `wakfu.log` contiene también mensajes técnicos y duplicados de eventos; no se combinarán ambas fuentes sin una identificación fiable de duplicados.

## Principios

- Conservar el texto original de cada evento y no inventar responsables, efectos ni valores que el registro no indique.
- Procesar los registros localmente; no subirlos ni incluir nombres o conversaciones reales en el repositorio.
- Mantener la experiencia funcional y desplegable tras cada paso. Cada cambio tendrá una comprobación con ejemplos sintéticos, una prueba en navegador y una revisión del despliegue cuando sea posible.
- Limitar la memoria de la cronología y mantener el orden, incluso ante líneas incompletas o repetidas.
- Tratar los detalles de hechizos e iconos como información opcional: solo mostrarlos cuando exista una fuente fiable que corresponda al nombre y versión del juego.

## Secuencia de entregas

1. Documentar este plan y comprobar el despliegue existente.
2. Incorporar una cronología en español alimentada por los eventos de combate, conservando cada línea y su hora; retirar el panel de chat y traducción de la vista.
3. Identificar visualmente lanzamientos, daños, curas, armadura y estados, manteniendo un formato seguro para eventos desconocidos.
4. Mostrar ganancias y pérdidas de PA, PM, PW y otros recursos, desplazamientos, invocaciones y efectos; añadir pruebas con ejemplos sintéticos basados en formatos observados.
5. Añadir filtros por personaje y tipo de evento, búsqueda, pausa de desplazamiento y limpieza explícita de la vista.
6. Mejorar límites de combate, lectura incremental y conservación del orden; comprobar dos peleas consecutivas y líneas divididas entre lecturas.
7. Revisar clasificación de aliados, enemigos e invocaciones, atribución y cifras agregadas, sin asumir que todo nombre desconocido es un enemigo.
8. Añadir indicadores de crítico, espalda y otros calificadores cuando consten en el texto; no deducirlos si no aparecen.
9. Investigar datos de hechizos y versiones disponibles para iconos y descripciones; incorporar tooltips solo cuando los datos estén verificados y exista un comportamiento claro si faltan.
10. Traducir progresivamente el resto de la interfaz y comprobar usabilidad, móvil, accesibilidad y rendimiento con combates largos.

Cada número puede dividirse en varios commits pequeños. Las pruebas con el juego abierto requieren una pelea real y confirmar el resultado visual; las pruebas automáticas no sustituyen esa verificación. Si una fase no puede validarse, se dejará documentada sin afirmar que está terminada.
