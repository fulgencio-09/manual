# Generador de manual profesional

Convierte un archivo `*-ejecucion.json` generado por la extensión Manual HU en un HTML institucional listo para revisión y para imprimir/guardar como PDF.

## Uso

```bash
cd tools/manual-generator
node generate.mjs ../../HU-001-ejecucion.json HU-001-manual.html
```

El HTML incluye:

- portada;
- código y título de la historia;
- fechas de ejecución;
- resumen de pasos y evidencias;
- objetivo y precondiciones;
- procedimiento numerado;
- evidencias asociadas a cada paso;
- resultado de ejecución;
- control de cambios;
- formato A4 preparado para impresión/PDF.

## Regla de fidelidad

El generador no inventa datos funcionales. Si una información no está presente en el JSON, se presenta como `No especificado` o `No determinado`.

## IA

La IA se incorporará como una etapa previa al generador para enriquecer la redacción del objetivo, precondiciones, descripción de pasos y resultado esperado. La salida de IA deberá conservar la trazabilidad hacia los pasos y evidencias originales.

La ejecución original debe mantenerse como evidencia técnica y no debe ser reemplazada por el texto generado por IA.
