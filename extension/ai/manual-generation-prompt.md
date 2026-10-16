# Motor IA — generación de manual profesional

## Objetivo

Convertir una ejecución registrada por **Manual HU Chrome Recorder** en un manual de usuario profesional, trazable y listo para revisión institucional.

## Fuente de verdad

El archivo `*-ejecucion.json` es la fuente de verdad de la ejecución.

La IA puede:

- reorganizar pasos;
- mejorar redacción;
- agrupar acciones repetitivas;
- redactar objetivo y alcance cuando existan datos suficientes;
- identificar precondiciones únicamente cuando estén sustentadas;
- redactar resultados esperados a partir de criterios de aceptación suministrados;
- construir títulos, subtítulos, tablas y numeración;
- señalar vacíos de información.

La IA **no debe inventar** permisos, reglas de negocio, resultados, nombres de módulos, responsables, datos clínicos, fechas ni criterios de aceptación que no estén presentes en las fuentes.

## Regla de trazabilidad

Cada afirmación funcional del documento debe poder relacionarse con al menos una de estas fuentes:

1. Historia de usuario.
2. Criterios de aceptación.
3. Ejecución registrada.
4. Evidencia de pantalla.
5. Información institucional suministrada por el usuario.

Cuando una información no esté disponible, escribir **"No especificado en la información suministrada."**

## Estructura de salida

1. Portada.
2. Identificación de la historia de usuario.
3. Objetivo.
4. Alcance.
5. Precondiciones.
6. Roles y permisos, solamente si están documentados.
7. Datos de entrada, solamente si están documentados.
8. Procedimiento paso a paso.
9. Evidencia asociada a cada paso.
10. Resultado esperado.
11. Resultado de la ejecución.
12. Observaciones y restricciones.
13. Control de cambios.
14. Aprobación/revisión.

## Estilo

- Español profesional y claro.
- Tono institucional.
- Frases cortas.
- No usar lenguaje de programación para describir acciones destinadas al usuario final.
- Mantener los nombres reales de campos, botones y opciones cuando sean conocidos.
- No incluir valores digitados por el usuario si la fuente indica que fueron excluidos por privacidad.
- No exponer tokens, contraseñas, documentos, historias clínicas u otros datos sensibles.

## Conversión de acciones

Ejemplos:

- `click` + `Guardar` → **Hacer clic en el botón "Guardar".**
- `change` + `Etapa de la actuación` → **Seleccionar la etapa de la actuación.**
- `change` + `País` → **Seleccionar el país correspondiente.**
- `change` + `checkbox` → **Marcar la opción correspondiente.**
- Campo de texto → **Completar el campo indicado.**

No mostrar selectores CSS ni detalles técnicos al usuario final, salvo que se solicite un manual técnico.

## Resultado

La IA debe distinguir entre:

- **Registrado:** la extensión capturó la acción.
- **Exitoso:** existe evidencia o criterio de aceptación que demuestra el resultado.
- **Fallido:** existe evidencia explícita de error o incumplimiento.
- **Requiere validación:** la ejecución terminó, pero no existe información suficiente para confirmar el resultado funcional.

Nunca convertir automáticamente "registrado" en "exitoso".

## Salidas previstas

- `manual.html`: versión navegable.
- `manual.docx`: documento editable.
- `manual.pdf`: versión final para entrega.
- `ejecucion.json`: evidencia técnica original y trazable.
