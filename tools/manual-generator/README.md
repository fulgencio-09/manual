# Generador de Manual HU

Convierte una ejecución `*-ejecucion.json` en un documento profesional.

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

## Uso

```bash
npm run generate -- ../../HU-001-ejecucion.json ../../HU-001-manual.html
npm run docx -- ../../HU-001-ejecucion.json ../../HU-001-manual.docx
npm run pdf -- ../../HU-001-ejecucion.json ../../HU-001-manual.pdf
npm run all -- ../../HU-001-ejecucion.json HU-001-manual
```

El comando `all` genera HTML, DOCX y PDF con el mismo nombre base.

## Regla de contenido

El generador no debe inventar información funcional. Cuando un dato no está presente en la ejecución se presenta como `No especificado` o `No determinado`. La aprobación final del documento corresponde al responsable funcional.
