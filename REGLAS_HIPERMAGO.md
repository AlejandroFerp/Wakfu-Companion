# Hipermago: reglas basadas en eventos observados

Estas reglas describen lo que aparece en el registro de combate en español. Un valor mostrado es la última observación, no una consulta del estado interno del juego.

| Señal | Tratamiento provisional | Límite |
| --- | --- | --- |
| `Personaje: Abundancia (+50 niv.)` | Guardar 50 como último nivel anunciado, sin sumar al anterior. | El usuario confirmó que los eventos de 20 y 30 coincidían con el valor visible en el juego. Comprobar aún consumos, reinicios y cambios sin línea de nivel. |
| `Personaje: Consume Abundancia` | Marcar Abundancia como desconocida hasta el siguiente evento. | No asumir que queda a cero ni cuándo se regenera. |
| `Personaje: Brisa Cuadramental Almacenada (+500 niv.)` | Mostrar 500 como último nivel anunciado. | No asumir que ese valor equivale al saldo de BC o que sigue activo tras otro evento no interpretado. |
| `[Personaje] Fuego fatuo: Guardado Acua'runa` | Mostrar la última runa indicada como guardada. | No equivale necesariamente a todas las runas activas ni a la última generada. |
| `Personaje: 25 BC (Runa generada)` | Mostrar 25 como último número asociado a un evento de BC. | No es necesariamente el saldo actual; no se suma. |
| `Personaje lanza el hechizo Ciclo Elemental.` | Tras marcar manualmente el inicio del turno, contar cinco lanzamientos como máximo con costes 0, 50, 100, 150 y 200 BC. | El contador es desconocido hasta marcar el inicio. El registro revisado no identifica inequívocamente el turno activo; no se reinicia solo al recibir «segundos devueltos». |
| `Personaje: 0 BC (Runa generada)`, `(Runas consumidas)` o `(Generación Natural)` | Señal de BC lleno según la explicación del usuario. | Se presenta como última señal, no como saldo consultado. Una acción posterior puede cambiarlo. |
| `Objetivo: Luminiscencia (Niv. 1) (Runas consumidas)` | Marcar Luminiscencia observada en ese objetivo. | Sin `Runas consumidas` no se confirma la activación. La línea no identifica al autor. |
| `Objetivo: Debilidad ... (Niv. 1)` | Marcar Debilidad observada en ese objetivo. | La línea no identifica al autor. Al avanzar manualmente el turno se pide comprobar la duración; no se afirma que haya caducado. |

Al conectar el archivo o cambiar el personaje, todos los valores empiezan como «sin observar». El historial anterior a la conexión no se recupera. La identificación corresponde al nombre exacto del personaje indicado por el usuario. Los reinicios, el fin del combate y los cambios de estado que no estén explícitamente cubiertos aún necesitan validación adicional.

Según el usuario, la Abundancia parte de 0 y llega hasta 100, y la BC parte de 500. No se inicializan automáticamente al conectar a mitad de combate, porque no se ha identificado una señal fiable de inicio de combate en estos registros.

