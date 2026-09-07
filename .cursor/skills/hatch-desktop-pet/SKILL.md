---
name: hatch-desktop-pet
description: >-
  Hatch or import Codex v2 desktop pets (192x208 cells, 8x11 atlas, spriteVersionNumber 2)
  for this Electronic Pet app. Use when the user wants a new desktop pet, custom mascot,
  Codex pet, spritesheet pet, or to replace assets/spritesheet.webp.
---

# Hatch Desktop Pet

Turn a character idea, photos, or an existing Codex pet into assets for **电子宠物**.

Always read [atlas.md](atlas.md) before generating or installing art.

## Paths

**A. Existing Codex pet**

```bash
cp ~/.codex/pets/<id>/spritesheet.webp assets/spritesheet.webp
# update assets/pet.json displayName / description
# make a small tray.png from idle cell if needed
```

**B. Codex `hatch-pet` skill** (best quality)

If `$HOME/.codex/skills/hatch-pet/SKILL.md` exists, follow it fully, then copy the packaged `spritesheet.webp` + `pet.json` into `assets/`.

**C. Cursor fallback**

Generate per-cell PNGs under `runs/<pet-id>/frames/<row>/00.png` … then:

```bash
python3 .cursor/skills/hatch-desktop-pet/scripts/compose_atlas.py \
  --frames-root runs/<pet-id>/frames \
  --output assets/spritesheet.webp \
  --chroma-key "#00FF00" \
  --tray-output assets/tray.png \
  --pet-json assets/pet.json \
  --pet-id sample-basic \
  --display-name "示例宠物" \
  --description "one sentence"
```

Requires Pillow: `python3 -m pip install pillow`

## Prompt kernel

```text
Full-body desktop-pet sprite of <identity>. Same face, colors, props as the reference.
Centered, feet near the bottom. Flat chroma-key background, no scenery, no shadow,
no glow, no text, no UI, no motion lines. <this pose only>.
```

Do not put personal names into default product branding. Pet `displayName` may be whatever the user asks for a specific character.
