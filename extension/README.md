# Probar Manual HU en Chrome — MVP 0.5

1. Descarga el repositorio desde https://github.com/fulgencio-09/manual/tree/mvp/chrome-recorder (Code → Download ZIP) o clónalo con Git.
2. Descomprime el repositorio y localiza la carpeta `extension`.
3. Abre Google Chrome y navega a `chrome://extensions`.
4. Activa **Modo de desarrollador**.
5. Pulsa **Cargar descomprimida** y selecciona la carpeta `extension`.
6. Abre una página HTTP/HTTPS de prueba y recárgala después de instalar o actualizar la extensión.
7. Pulsa el icono Manual HU. Escribe un ID como `HU-001` y un título como `Registrar actuación`.
8. Pulsa **Iniciar grabación**. La ventana emergente puede cerrarse; la barra **Manual HU** queda dentro de la página.
9. Realiza acciones con datos ficticios. La barra puede moverse arrastrando la zona **Manual HU**.
10. La versión 0.5 captura una evidencia después de cada paso registrado y oculta temporalmente la barra para que no aparezca en la captura.
11. Los campos de texto se consolidan como una acción lógica al cambiar el campo; no se almacenan los valores digitados.
12. Pulsa **Finalizar y exportar** desde la barra.
13. Deben generarse dos archivos: `HU-001-ejecucion.json` y `HU-001-manual.html`.

## Qué valida la versión 0.5

- El JSON usa `schemaVersion: 1.3`.
- `story.id` y `story.title` tienen valores de respaldo si no fueron suministrados.
- El JSON incluye `document`, `execution` y `privacy` para preparar la generación asistida por IA.
- Los pasos de texto duplicados por eventos `input`/`change` se reducen a una acción lógica.
- Los botones sin texto intentan obtener un nombre desde `aria-label`, `title`, datos de prueba o contexto visual cercano.
- La barra de grabación no debe aparecer en las evidencias capturadas.
- El HTML incluye portada, identificación, resumen, objetivo, precondiciones, procedimiento, resultado y control de cambios.

## Preparación para IA

La especificación de generación está en `extension/ai/manual-generation-prompt.md`.

La IA deberá mejorar la redacción y organización sin inventar reglas de negocio, permisos, resultados o datos que no estén respaldados por la historia de usuario, criterios de aceptación, ejecución o evidencias.

## Salidas previstas

- `*-ejecucion.json`: fuente técnica y trazable.
- `*-manual.html`: documento navegable y revisable.
- Próxima fase: `*.docx` editable y `*.pdf` final para entrega.

## Si no registra nada

- Confirma que seleccionaste la carpeta `extension`, no la raíz del repositorio.
- Recarga la página web después de instalar o actualizar la extensión.
- Prueba en una página web común; Chrome no permite insertar scripts en páginas internas `chrome://`.
- Revisa `chrome://extensions` → Manual HU → **Errores**.
- Si las evidencias no aparecen, revisa los errores del service worker desde `chrome://extensions` → Manual HU → **service worker** → Inspeccionar.

## Datos y privacidad

El prototipo no guarda el contenido escrito en los campos y excluye campos sensibles reconocidos. Las evidencias son capturas de pantalla de la pestaña durante la ejecución y pueden contener información visible en ella. Por eso esta versión debe probarse únicamente con datos ficticios o un entorno autorizado. No se recomienda usarla todavía con historias clínicas, credenciales, datos personales o información productiva.

Las evidencias se almacenan temporalmente en `chrome.storage.local` hasta finalizar la ejecución y se eliminan después de generar los archivos. El límite del prototipo es de 40 evidencias por ejecución.
