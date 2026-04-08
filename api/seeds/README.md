# Carga inicial del MVP

La carga inicial del backend se ejecuta con:

```bash
npm run seed:initial --workspace api
```

Por defecto el script lee:

```text
seeds/initial-load.json
```

Ese path es relativo a la carpeta `api/`.

Puedes usar otro archivo con:

```bash
$env:INITIAL_LOAD_FILE="seeds/otro-archivo.json"
npm run seed:initial --workspace api
```

## Estructura del archivo

```json
{
  "institutionSettings": {
    "schoolName": "Colegio Paraiso Florido 3082",
    "activeSchoolYear": 2026,
    "initialStudentPassword": "Cambiar123",
    "enabledTurns": ["morning", "afternoon"],
    "enabledGrades": [1, 2],
    "sectionsByGrade": {
      "1": ["A"],
      "2": ["B"]
    }
  },
  "adminUsers": [
    {
      "username": "director",
      "displayName": "Director General",
      "role": "director",
      "password": "Director123",
      "isActive": true
    }
  ],
  "students": [
    {
      "code": "u20260001",
      "firstName": "Ana",
      "lastName": "Lopez",
      "document": "74561234",
      "grade": 1,
      "section": "A",
      "shift": "morning",
      "schoolYear": 2026,
      "isActive": true
    }
  ]
}
```

## Reglas

- `institutionSettings` permite dejar lista la configuracion institucional del colegio.
- `schoolName`, `activeSchoolYear`, `enabledTurns`, `enabledGrades` y `sectionsByGrade` preparan la operacion del anio.
- `initialStudentPassword` define la contrasena inicial general y se guarda con hash.
- `director`, `secretary` y `auxiliary` se crean o actualizan desde `adminUsers`.
- Los estudiantes se crean o actualizan desde `students`.
- El `username` del estudiante siempre sera su `code`.
- Los estudiantes nuevos reciben la contrasena inicial general vigente.
- Los estudiantes nuevos quedan con `mustChangePassword = true`.
- Si un estudiante ya existe, el script actualiza sus datos permanentes y crea o actualiza su asignacion del anio indicado.
- Si un usuario administrativo ya existe, el script actualiza nombre, rol y estado, pero no le pisa la contrasena.
- El historico anual del estudiante se conserva; el seed ya no depende de borrar tablas para abrir un nuevo anio.

## Orden recomendado

1. Ejecutar migraciones.
2. Revisar `api/seeds/initial-load.json`.
3. Ejecutar el seed inicial.
4. Iniciar la API y probar login y asistencia.
