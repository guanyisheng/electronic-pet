const fs = require("fs");
const path = require("path");
const { app, nativeImage } = require("electron");

const ATLAS_W = 1536;
const ATLAS_H = 2288;
const FORMAT = "electronic-pet-skin";

function bundledSkinsRoot() {
  return path.join(__dirname, "..", "assets", "skins");
}

function userSkinsRoot() {
  return path.join(app.getPath("userData"), "skins");
}

function ensureUserSkinsRoot() {
  const root = userSkinsRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function safeId(raw) {
  const id = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "skin";
}

function validateSkinDir(dir) {
  const metaPath = path.join(dir, "pet.json");
  if (!fs.existsSync(metaPath)) {
    return { ok: false, error: "缺少 pet.json" };
  }
  let meta;
  try {
    meta = readJson(metaPath);
  } catch {
    return { ok: false, error: "pet.json 无法解析" };
  }
  if (meta.format !== FORMAT) {
    return { ok: false, error: `format 必须是 ${FORMAT}` };
  }
  if (Number(meta.formatVersion) !== 1) {
    return { ok: false, error: "formatVersion 必须是 1" };
  }
  if (Number(meta.spriteVersionNumber) !== 2) {
    return { ok: false, error: "spriteVersionNumber 必须是 2" };
  }
  const sheetRel = meta.spritesheetPath || "spritesheet.webp";
  const trayRel = meta.trayPath || "tray.png";
  const sheetPath = path.join(dir, sheetRel);
  const trayPath = path.join(dir, trayRel);
  if (!fs.existsSync(sheetPath)) {
    return { ok: false, error: `缺少 ${sheetRel}` };
  }
  if (!fs.existsSync(trayPath)) {
    return { ok: false, error: `缺少 ${trayRel}` };
  }
  const img = nativeImage.createFromPath(sheetPath);
  if (img.isEmpty()) {
    return { ok: false, error: "spritesheet 无法读取" };
  }
  const size = img.getSize();
  if (size.width !== ATLAS_W || size.height !== ATLAS_H) {
    return {
      ok: false,
      error: `spritesheet 必须是 ${ATLAS_W}x${ATLAS_H}，当前 ${size.width}x${size.height}`,
    };
  }
  const id = safeId(meta.id || path.basename(dir));
  return {
    ok: true,
    skin: {
      id,
      displayName: meta.displayName || id,
      description: meta.description || "",
      dir,
      sheetPath,
      trayPath,
      meta,
      source: dir.startsWith(bundledSkinsRoot()) ? "bundled" : "user",
    },
  };
}

function listSkinDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name));
}

function listSkins() {
  const byId = new Map();
  for (const dir of [...listSkinDirs(bundledSkinsRoot()), ...listSkinDirs(userSkinsRoot())]) {
    const result = validateSkinDir(dir);
    if (!result.ok) continue;
    byId.set(result.skin.id, result.skin);
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "zh"));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function importSkinFromFolder(sourceDir) {
  const checked = validateSkinDir(sourceDir);
  if (!checked.ok) return checked;
  ensureUserSkinsRoot();
  const id = checked.skin.id;
  const dest = path.join(userSkinsRoot(), id);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  copyDir(sourceDir, dest);
  const installed = validateSkinDir(dest);
  if (!installed.ok) return installed;
  installed.skin.source = "user";
  return installed;
}

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    return readJson(settingsPath());
  } catch {
    return {};
  }
}

function saveSettings(next) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2) + "\n", "utf8");
}

function resolveActiveSkin(preferredId) {
  const skins = listSkins();
  if (!skins.length) return null;
  if (preferredId) {
    const hit = skins.find((skin) => skin.id === preferredId);
    if (hit) return hit;
  }
  return skins.find((skin) => skin.id === "sample-basic") || skins[0];
}

module.exports = {
  FORMAT,
  ATLAS_W,
  ATLAS_H,
  bundledSkinsRoot,
  userSkinsRoot,
  validateSkinDir,
  listSkins,
  importSkinFromFolder,
  loadSettings,
  saveSettings,
  resolveActiveSkin,
};
