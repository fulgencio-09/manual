# Arquitectura inicial

## MVP 0.1 — grabación local

La extensión Chrome usa Manifest V3 y un content script para observar eventos de interacción en la pestaña actual. El popup coordina inicio, pausa, cierre y descarga de un archivo JSON.

## Datos producidos

Cada paso incluye número, fecha/hora, tipo de acción, título de pantalla, URL sin query ni fragmento, etiqueta estimada del elemento, tipo de elemento, selector de referencia y una descripción breve. No se guarda el texto escrito en entradas de texto.

## Iteraciones siguientes

1. Capturas de pantalla explícitas y consentimiento.
2. Backend Laravel: proyectos, historias, criterios, ejecuciones, pasos y evidencias.
3. Autenticación y API con validación, límites de tamaño y control de acceso.
4. Interfaz Vue para gestionar historias y revisar ejecuciones.
5. Generación de manuales DOCX/PDF y matriz de pruebas.

## Seguridad

No registrar contraseñas, información clínica, pagos ni otros datos sensibles. El prototipo solo funciona como registrador, no ejecuta acciones automáticas sobre el sistema inspeccionado. Debe validarse en un entorno de prueba y con datos ficticios.