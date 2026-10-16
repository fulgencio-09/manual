# Probar Manual HU en Chrome — MVP 0.7

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

La terminal debe quedar abierta. El servicio local atiende en `http://127.0.0.1:8787` y expone `POST /generate-pdf`.

## 3. Grabar una historia de usuario

1. Abre el sistema HTTP/HTTPS que deseas documentar.
2. Pulsa el icono **Manual HU**.
3. Escribe el ID y título de la historia.
4. En **Datos del manual**, registra cuando se conozcan: sistema de información, módulo/ruta, proceso, dependencia responsable y clasificación.
5. Pulsa **Iniciar grabación**.
6. Ejecuta normalmente la historia de usuario.
7. La barra **Manual HU** registra las acciones y captura evidencias visibles.
8. Al terminar, pulsa **Finalizar y generar PDF**.

## 4. Plantilla institucional

El PDF utiliza una estructura basada en el modelo institucional suministrado: portada, control de cambios, contenido, objetivo y alcance, usuarios y permisos, acceso al sistema, ingreso, salida, pantalla principal, funcionalidades, pasos, campos del formulario, glosario y elaboración/revisión/aprobación.

Los datos que no provengan de la ejecución o que no sean suministrados en los metadatos se presentan como **No especificado**, **No determinado** o equivalentes. La generación no debe inventar roles, permisos, reglas de negocio ni resultados.

## 5. Resultado esperado

El resultado final es directamente:

```text
HU-001-manual.pdf
```

No se entrega al usuario un JSON o HTML como salida final. La ejecución JSON permanece como estructura interna enviada al servidor local para construir el documento.

## 6. Si no aparece el PDF

- Verifica que `npm run server` siga ejecutándose.
- Verifica que aparezca `Manual HU PDF server activo en http://127.0.0.1:8787` en la terminal.
- En `chrome://extensions` revisa **Errores** y el **service worker** de Manual HU.
- Recarga la página después de actualizar la extensión.
- Prueba primero con datos ficticios.

## Datos y privacidad

El grabador no almacena el contenido digitado en los campos y excluye campos sensibles reconocidos. Las evidencias son capturas visibles de la pestaña y pueden contener información que aparezca en pantalla. Esta versión debe utilizarse en ambientes autorizados y preferiblemente con datos ficticios durante las pruebas.
