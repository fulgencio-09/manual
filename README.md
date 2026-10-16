# Manuales por Historia de Usuario — MVP

Herramienta para registrar la ejecución manual de historias de usuario en sitios web y producir pasos reproducibles con evidencias.

## MVP 0.1

- Extensión Chrome Manifest V3.
- Inicio/pausa/finalización manual de grabación.
- Registro de clics y cambios de campos de texto.
- Exclusión de contraseñas y campos sensibles.
- Exportación de pasos en JSON desde el popup.
- La extensión no envía datos a ningún servidor en esta etapa.

## Estructura prevista

```
extension/
  manifest.json
  popup.html
  popup.css
  popup.js
  content.js
docs/
  arquitectura.md
  instalacion.md
```

## Probar la extensión

1. Descarga o clona el repositorio.
2. Abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Selecciona **Cargar descomprimida** y elige la carpeta `extension`.
5. Abre una página web de prueba, pulsa el icono de la extensión e inicia la grabación.
6. Realiza clics y completa campos no sensibles.
7. Pulsa **Finalizar y exportar JSON**.

## Seguridad y limitaciones

- No registrar contraseñas, campos de pago ni campos marcados como sensibles.
- Esta versión no automatiza clics ni ejecuta acciones por el usuario: solamente registra interacciones observadas.
- Las capturas de pantalla se incorporarán en una siguiente iteración con consentimiento explícito.
- No usar inicialmente con datos personales, clínicos, financieros o de producción.
- La comunicación con Laravel, autenticación, persistencia y generación PDF/DOCX quedan para la siguiente fase.

## Tecnología

Chrome Extension Manifest V3. Backend previsto: Laravel API; interfaz prevista: Vue 3. La base de datos y autenticación se decidirán al integrar la app.
