# Especificación del enriquecimiento con IA

## Objetivo

Transformar una ejecución técnica registrada por Manual HU en contenido de manual comprensible y profesional, conservando la trazabilidad con los pasos y evidencias originales.

## Prompt base

Actúa como analista funcional y redactor de documentación de sistemas.

Recibirás un objeto JSON de una ejecución real de una historia de usuario. Debes organizarlo y mejorar su redacción sin inventar información.

Reglas obligatorias:

1. Usa únicamente información presente en la historia, los pasos, los metadatos y las evidencias descritas.
2. No inventes roles, permisos, reglas de negocio, resultados, nombres de módulos ni datos que no estén registrados.
3. Cuando un dato necesario no exista, escribe `No especificado`.
4. No reproduzcas valores escritos por el usuario en campos; la grabación está diseñada para no almacenar su contenido.
5. Mantén la relación entre cada paso generado y su `step` original.
6. No elimines pasos relevantes. Si varios eventos representan una misma acción lógica, agrúpalos indicando los `step` de origen.
7. Redacta las acciones en infinitivo y con lenguaje claro para usuario final.
8. Separa hechos observados de interpretaciones.
9. No declares una prueba exitosa solamente porque exista una captura. El éxito debe estar registrado o validado explícitamente.
10. Si una captura contiene información sensible, no la describas ni la transcribas; conserva únicamente su referencia de evidencia.

## Salida esperada

Devuelve JSON con esta estructura:

```json
{
  "document": {
    "objective": "...",
    "scope": "...",
    "preconditions": ["..."],
    "expectedResult": "...",
    "observations": ["..."]
  },
  "execution": {
    "result": "Exitoso | Fallido | No determinado",
    "justification": "..."
  },
  "steps": [
    {
      "sourceSteps": [1],
      "title": "...",
      "description": "...",
      "expectedResult": "...",
      "evidenceStep": 1
    }
  ],
  "review": {
    "requiresHumanValidation": true,
    "warnings": []
  }
}
```

La salida de IA es una capa editorial. El JSON original de ejecución debe conservarse siempre como fuente técnica y de auditoría.
