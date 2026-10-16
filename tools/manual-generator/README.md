# Generador de Manual HU

Convierte una ejecución `*-ejecucion.json` en un documento profesional y, opcionalmente, incorpora una salida editorial `manual-ia.json` producida por la capa de IA.

## Salidas

- HTML A4 para revisión e impresión.
- DOCX editable.
- PDF A4.

## Instalación

Desde `tools/manual-generator`:

```bash
npm install
npx playwright install chromium
```

## Uso directo

```bash
npm run generate -- ../../HU-001-ejecucion.json ../../HU-001-manual.html
npm run docx -- ../../HU-001-ejecucion.json ../../HU-001-manual.docx
npm run pdf -- ../../HU-001-ejecucion.json ../../HU-001-manual.pdf
npm run all -- ../../HU-001-ejecucion.json HU-001-manual
```

## Uso con IA editorial

Primero generar la salida estructurada de IA:

```bash
npm run ai -- ../../HU-001-ia-input.json ../../HU-001-manual-ia.json
```

Luego generar las tres salidas finales conservando la ejecución original como fuente de evidencia:

```bash
npm run all -- ../../HU-001-ejecucion.json HU-001-manual ../../HU-001-manual-ia.json
```

También puede pasarse el archivo `manual-ia.json` como cuarto argumento a `generate.mjs`, `export-docx.mjs` o `export-pdf.mjs`.

## Trazabilidad y seguridad documental

La capa editorial puede mejorar títulos, descripciones, objetivo, alcance, resultados y observaciones, pero las evidencias y los pasos fuente provienen de la ejecución original. Cada paso editorial conserva `sourceSteps` y `evidenceStep` para mantener trazabilidad.

No se deben inventar roles, permisos, reglas de negocio, resultados ni valores digitados. Los datos ausentes se presentan como `No especificado` o `No determinado`. Si la IA no puede justificar el resultado de la ejecución, este permanece como `No determinado` y el documento queda sujeto a validación humana.

La clave o token del proveedor de IA no se almacena en la extensión de Chrome; la integración usa variables de entorno del proceso servidor/CLI (`MANUAL_AI_ENDPOINT` y opcionalmente `MANUAL_AI_TOKEN`).

La aprobación final del documento corresponde al responsable funcional.
