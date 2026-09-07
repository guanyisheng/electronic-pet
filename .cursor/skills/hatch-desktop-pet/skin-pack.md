# Electronic Pet skin pack

Skill output that this app can import.

## Folder layout

```text
<skin-id>/
  pet.json
  spritesheet.webp   # exactly 1536×2288
  tray.png           # small square tray icon
```

Optional zip of that folder is also accepted by the importer.

## `pet.json` schema

```json
{
  "format": "electronic-pet-skin",
  "formatVersion": 1,
  "id": "my-pet",
  "displayName": "My Pet",
  "description": "One sentence.",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp",
  "trayPath": "tray.png"
}
```

Rules:

- `format` must be `electronic-pet-skin`
- `formatVersion` currently `1`
- `spriteVersionNumber` must be `2` (Codex v2 atlas)
- spritesheet cells are `192×208`, grid `8×11` → `1536×2288`
- relative paths stay inside the skin folder

## Where skins live

- Bundled: `assets/skins/<id>/`
- User imports: `<userData>/skins/<id>/` (app data directory)

The hatch skill must write this exact pack. The app validates and copies it into user skins.
