# Instalación local de la extensión

1. Clona el repositorio y abre la carpeta `extension`.
2. En Chrome navega a `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta `extension`.
5. Fija el icono **Manual HU - Grabador** en la barra del navegador.
6. En una aplicación web de prueba, recarga la página después de instalar la extensión.
7. Abre el icono, introduce un identificador y título de HU, e inicia la grabación.
8. Haz clic en controles y completa campos con datos ficticios.
9. Finaliza y guarda el JSON generado.

## Límites conocidos

- Chrome no permite inyectar content scripts en páginas internas como `chrome://extensions`, Chrome Web Store ni algunas páginas privilegiadas.
- Para observar una pestaña ya abierta tras instalar o actualizar la extensión puede ser necesario recargarla.
- Esta versión guarda los pasos en memoria de la pestaña mientras se graba; no hay backend ni recuperación de pasos si se cierra la pestaña.
- El detalle de botones y campos se infiere desde el DOM; aplicaciones con componentes personalizados pueden requerir ajustes.
