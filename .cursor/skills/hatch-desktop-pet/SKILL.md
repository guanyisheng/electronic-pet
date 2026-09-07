---
name: hatch-desktop-pet
description: >-
  Skin maker for Electronic Pet (电子宠物). Creates electronic-pet-skin packs
  (pet.json + 1536x2288 spritesheet.webp + tray.png) that the Win/Mac app can
  import. Use when hatching a pet skin, Codex v2 atlas, or desktop-pet mascot.
---

# Hatch Desktop Pet (skin maker)

This skill is the **skin generator**. The Electron app is the **player**.

Always read [atlas.md](atlas.md) and [skin-pack.md](skin-pack.md).

## Output contract (what the app imports)

Write a folder the app recognizes:

```text
skins/<skin-id>/
  pet.json              # format: electronic-pet-skin
  spritesheet.webp      # 1536×2288, spriteVersionNumber 2
  tray.png
```

`pet.json` must include:

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

Users import that folder in the app: tray → 皮肤 → 导入皮肤文件夹…

## Paths

**A. Existing Codex pet**

```bash
OUT="skins/<skin-id>"
mkdir -p "$OUT"
cp ~/.codex/pets/<id>/spritesheet.webp "$OUT/spritesheet.webp"
# write pet.json with format electronic-pet-skin
# make tray.png from idle cell
```

**B. Codex `hatch-pet`** (best art)

Follow `$HOME/.codex/skills/hatch-pet/SKILL.md`, then package into the skin folder above.

**C. Cursor / compose fallback**

```bash
OUT="skins/<skin-id>"
mkdir -p "$OUT"
python3 .cursor/skills/hatch-desktop-pet/scripts/compose_atlas.py \
  --frames-root runs/<skin-id>/frames \
  --output "$OUT/spritesheet.webp" \
  --chroma-key "#00FF00" \
  --tray-output "$OUT/tray.png" \
  --pet-json "$OUT/pet.json" \
  --pet-id "<skin-id>" \
  --display-name "<Name>" \
  --description "<one sentence>"
```

After compose, ensure `pet.json` has `format` / `formatVersion` (edit if the script only wrote Codex fields). Prefer running with the updated compose script that stamps the electronic-pet-skin format.

Requires Pillow: `python3 -m pip install pillow`

## Prompt kernel

```text
Full-body desktop-pet sprite of <identity>. Same face, colors, props as the reference.
Centered, feet near the bottom. Flat chroma-key background, no scenery, no shadow,
no glow, no text, no UI, no motion lines. <this pose only>.
```

Product branding stays 「电子宠物」. Character `displayName` can be whatever the user asks for that skin.
