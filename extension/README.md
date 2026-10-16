# Probar Manual HU en Chrome — MVP 0.4

1. Descarga el repositorio desde https://github.com/fulgencio-09/manual/tree/mvp/chrome-recorder (Code → Download ZIP) o clónalo con Git.
2. Descomprime el repositorio y localiza la carpeta `extension`.
3. Abre Google Chrome y navega a `chrome://extensions`.
4. Activa **Modo de desarrollador**.
5. Pulsa **Cargar descomprimida** y selecciona la carpeta `extension`.
6. Abre una página HTTP/HTTPS de prueba y recárgala después de instalar o actualizar la extensión.
7. Pulsa el icono Manual HU. Escribe un ID como `HU-001` y un título como `Probar registro de pasos`.
8. Pulsa **Iniciar grabación**. La ventana emergente puede cerrarse; la barra **Manual HU** queda dentro de la página.
9. Realiza acciones con datos ficticios. La barra puede moverse arrastrando la zona **Manual HU**.
10. La versión 0.4 intenta capturar una evidencia de pantalla después de cada paso registrado.
11. Pulsa **Finalizar y exportar** desde la barra.
12. Deben generarse dos archivos: `HU-001-ejecucion.json` y `HU-001-manual.html`.

## Qué validar

- El JSON debe tener `schemaVersion: 1.2`, `story`, `steps` y `evidences`.
- Cada paso debe tener `humanAction` en lenguaje entendible.
- No deberían aparecer pasos genéricos sobre `html` o `body`.
- El HTML debe mostrar el procedimiento y, cuando la captura fue posible, una imagen de evidencia debajo del paso.
- Si una captura no pudo realizarse, el paso sigue apareciendo sin imagen.

## Si no registra nada

- Confirma que seleccionaste la carpeta `extension`, no la raíz del repositorio.
- Recarga la página web después de instalar o actualizar la extensión.
- Prueba en una página web común; Chrome no permite insertar scripts en páginas internas `chrome://`.
- Revisa `chrome://extensions` → Manual HU → **Errores**.
- Si las evidencias no aparecen, revisa los errores del service worker desde `chrome://extensions` → Manual HU → **service worker** → Inspeccionar.

## Datos y privacidad

El prototipo no guarda el contenido escrito en los campos y excluye campos sensibles reconocidos. Las evidencias son capturas de pantalla de la pestaña durante la ejecución y pueden contener información visible en ella. Por eso esta versión debe probarse únicamente con datos ficticios o un entorno autorizado. No se recomienda usarla todavía con historias clínicas, credenciales, datos personales o información productiva.

Las evidencias se almacenan temporalmente en `chrome.storage.local` hasta finalizar la ejecución y se eliminan después de generar los archivos. El límite del prototipo es de 40 evidencias por ejecución.
