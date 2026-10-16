# Probar Manual HU en Chrome — MVP 0.6

## 1. Instalar la extensión

1. Usa la rama `mvp/doc-output` del repositorio.
2. Abre Google Chrome y navega a `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta `extension`.
5. Después de actualizar la extensión, recarga la página web donde realizarás la prueba.

## 2. Activar el generador PDF

Desde `tools/manual-generator` ejecuta una vez:

```bash
npm install
npx playwright install chromium
npm run server
```

La terminal debe quedar abierta. El servicio local atiende en `http://127.0.0.1:8787`.

## 3. Grabar una historia de usuario

1. Abre el sistema HTTP/HTTPS que deseas documentar.
2. Pulsa el icono **Manual HU**.
3. Escribe el ID de la historia, por ejemplo `HU-001`, y su título.
4. Pulsa **Iniciar grabación**.
5. Ejecuta normalmente la historia de usuario.
6. La barra **Manual HU** registra los pasos y captura evidencias de pantalla.
7. Al terminar, pulsa **Finalizar y exportar**.

### Resultado esperado

El resultado final debe ser un archivo:

```text
HU-001-manual.pdf
```

Chrome abrirá el selector de ubicación de descarga porque la extensión usa el permiso de descargas con `saveAs: true`.

## 4. Si no aparece el PDF

- Verifica que `npm run server` siga ejecutándose.
- Verifica que aparezca `Manual HU PDF server activo en http://127.0.0.1:8787` en la terminal.
- En `chrome://extensions` revisa **Errores** y el **service worker** de Manual HU.
- Recarga la página después de actualizar la extensión.
- Prueba primero con datos ficticios.

## Datos y privacidad

El grabador no almacena el contenido digitado en los campos y excluye campos sensibles reconocidos. Las evidencias son capturas visibles de la pestaña y pueden contener información que aparezca en pantalla. Esta versión debe utilizarse en ambientes autorizados y preferiblemente con datos ficticios durante las pruebas.
