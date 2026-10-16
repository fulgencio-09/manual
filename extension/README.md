# Probar Manual HU en Chrome

1. Descarga el repositorio desde https://github.com/fulgencio-09/manual/tree/mvp/chrome-recorder (Code → Download ZIP) o clónalo con Git.
2. Descomprime el repositorio y localiza la carpeta `extension`.
3. Abre Google Chrome y navega a `chrome://extensions`.
4. Activa **Modo de desarrollador**.
5. Pulsa **Cargar descomprimida** y selecciona la carpeta `extension`.
6. Abre una página HTTP/HTTPS sencilla de prueba y recárgala para que el content script se instale.
7. Pulsa el icono Manual HU. Escribe un ID como `HU-001` y un título como `Probar registro de pasos`.
8. Pulsa **Iniciar grabación**. En la página realiza un clic y cambia un campo de prueba no sensible. No uses datos reales ni información clínica.
9. Abre de nuevo el popup y verifica que aumente el contador. La grabación sigue en la pestaña original.
10. Pulsa **Finalizar y exportar JSON**. Abre el archivo descargado y verifica que tenga `story`, `startedAt`, `finishedAt` y `steps`.

## Si no registra nada

- Confirma que seleccionaste la carpeta `extension`, no la raíz del repositorio.
- Recarga la página web después de instalar la extensión.
- Prueba en una página web común; Chrome no permite insertar scripts en las páginas internas `chrome://`.
- Revisa los errores en `chrome://extensions` → Manual HU → **Errores**.
- Este MVP no captura pantallas ni se conecta aún con una API Laravel.

## Datos y privacidad

Los pasos quedan en memoria del content script hasta finalizar. Se registra la URL de origen y ruta, título de la página y etiqueta aproximada de controles, pero no el query string ni el fragmento de la URL. No se guarda el texto escrito en los campos. Usa un entorno de prueba con datos ficticios.
