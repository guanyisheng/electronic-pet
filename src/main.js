const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  dialog,
  protocol,
} = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const {
  listSkins,
  importSkinFromFolder,
  loadSettings,
  saveSettings,
  resolveActiveSkin,
} = require("./skins");

const CELL_W = 192;
const CELL_H = 208;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "epet",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

let win = null;
let tray = null;
let scale = 1;
let hidden = false;
let overlay = false;
let lastPetBounds = null;
let activeSkin = null;

function petSize() {
  return {
    width: Math.round(CELL_W * scale),
    height: Math.round(CELL_H * scale),
  };
}

function displayForPoint(x, y) {
  return screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) });
}

function clampPet(x, y) {
  const size = petSize();
  const area = displayForPoint(x + size.width / 2, y + size.height / 2).workArea;
  return {
    x: Math.min(Math.max(Math.round(x), area.x), area.x + area.width - size.width),
    y: Math.min(Math.max(Math.round(y), area.y), area.y + area.height - size.height),
    workArea: area,
  };
}

function applyPetBounds(x, y) {
  const next = clampPet(x, y);
  const size = petSize();
  lastPetBounds = { x: next.x, y: next.y, width: size.width, height: size.height };
  if (!overlay && win && !win.isDestroyed()) {
    win.setBounds(lastPetBounds);
  }
  return { ...lastPetBounds, workArea: next.workArea };
}

function sheetUrlFor(skin) {
  if (!skin) return "";
  return `epet://skin/${encodeURIComponent(skin.id)}/spritesheet.webp?t=${Date.now()}`;
}

function persistActive(id) {
  const settings = loadSettings();
  settings.activeSkinId = id;
  settings.scale = scale;
  saveSettings(settings);
}

function setActiveSkin(skin, { notify = true } = {}) {
  if (!skin) return;
  activeSkin = skin;
  persistActive(skin.id);
  if (tray && !tray.isDestroyed()) {
    const icon = nativeImage.createFromPath(skin.trayPath);
    if (!icon.isEmpty()) tray.setImage(icon.resize({ width: 18, height: 18 }));
    tray.setToolTip(`电子宠物 · ${skin.displayName}`);
  }
  rebuildTray();
  if (notify && win && !win.isDestroyed()) {
    win.webContents.send("set-skin", {
      id: skin.id,
      displayName: skin.displayName,
      sheetUrl: sheetUrlFor(skin),
    });
  }
}

function createWindow() {
  const size = petSize();
  const area = screen.getPrimaryDisplay().workArea;
  lastPetBounds = {
    x: area.x + Math.round(area.width * 0.72),
    y: area.y + area.height - size.height,
    width: size.width,
    height: size.height,
  };

  win = new BrowserWindow({
    ...lastPetBounds,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    roundedCorners: false,
    enableLargerThanScreen: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.platform === "darwin") {
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    win.setAlwaysOnTop(true, "screen-saver");
  }
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

async function chooseAndImportSkin() {
  const picked = await dialog.showOpenDialog({
    title: "选择 skill 生成的皮肤文件夹（含 pet.json）",
    properties: ["openDirectory"],
  });
  if (picked.canceled || !picked.filePaths[0]) return;
  const result = importSkinFromFolder(picked.filePaths[0]);
  if (!result.ok) {
    dialog.showErrorBox("导入失败", result.error);
    return;
  }
  setActiveSkin(result.skin);
  dialog.showMessageBox({
    type: "info",
    title: "导入成功",
    message: `已导入皮肤：${result.skin.displayName}`,
    detail: "该皮肤由 hatch-desktop-pet skill 生成的 electronic-pet-skin 包识别。",
  });
}

function createTray() {
  const iconPath = activeSkin?.trayPath || path.join(__dirname, "..", "assets", "tray.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip(activeSkin ? `电子宠物 · ${activeSkin.displayName}` : "电子宠物");
  rebuildTray();
}

function rebuildTray() {
  if (!tray) return;
  const skins = listSkins();
  const skinItems = skins.map((skin) => ({
    label: skin.displayName,
    type: "radio",
    checked: activeSkin?.id === skin.id,
    click: () => setActiveSkin(skin),
  }));

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: activeSkin ? `电子宠物 · ${activeSkin.displayName}` : "电子宠物", enabled: false },
      { type: "separator" },
      {
        label: hidden ? "显示" : "隐藏",
        click: () => {
          hidden = !hidden;
          if (!win) return;
          if (hidden) win.hide();
          else win.show();
          rebuildTray();
        },
      },
      {
        label: "皮肤",
        submenu: [
          ...skinItems,
          { type: "separator" },
          { label: "导入皮肤文件夹…", click: () => chooseAndImportSkin() },
        ],
      },
      {
        label: "模式",
        submenu: [
          { label: "自己散步", click: () => win?.webContents.send("set-mode", "wander") },
          { label: "跟着鼠标", click: () => win?.webContents.send("set-mode", "follow") },
          { label: "待在原地", click: () => win?.webContents.send("set-mode", "stay") },
        ],
      },
      {
        label: "动作",
        submenu: [
          { label: "挥手", click: () => win?.webContents.send("play-action", "waving") },
          { label: "跳跃", click: () => win?.webContents.send("play-action", "jumping") },
          { label: "等待", click: () => win?.webContents.send("play-action", "waiting") },
          { label: "思考", click: () => win?.webContents.send("play-action", "working") },
          { label: "委屈一下", click: () => win?.webContents.send("play-action", "failed") },
        ],
      },
      {
        label: "大小",
        submenu: [
          { label: "小", type: "radio", checked: scale === 0.75, click: () => setScale(0.75) },
          { label: "中", type: "radio", checked: scale === 1, click: () => setScale(1) },
          { label: "大", type: "radio", checked: scale === 1.5, click: () => setScale(1.5) },
        ],
      },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]),
  );
}

function setScale(next) {
  if (!win || overlay) return;
  scale = next;
  persistActive(activeSkin?.id);
  const size = petSize();
  applyPetBounds(lastPetBounds.x, lastPetBounds.y + lastPetBounds.height - size.height);
  win.webContents.send("set-scale", scale);
  rebuildTray();
}

function currentWorkArea() {
  const point = lastPetBounds
    ? { x: lastPetBounds.x + lastPetBounds.width / 2, y: lastPetBounds.y + lastPetBounds.height / 2 }
    : screen.getCursorScreenPoint();
  return displayForPoint(point.x, point.y).workArea;
}

function registerProtocol() {
  const { net } = require("electron");
  protocol.handle("epet", (request) => {
    try {
      const url = new URL(request.url);
      const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
      // epet://skin/<id>/spritesheet.webp
      if (url.hostname !== "skin" || parts.length < 2) {
        return new Response("Not Found", { status: 404 });
      }
      const skinId = decodeURIComponent(parts[0]);
      const fileName = decodeURIComponent(parts.slice(1).join("/"));
      const skin = listSkins().find((item) => item.id === skinId);
      if (!skin) return new Response("Skin Not Found", { status: 404 });
      const target =
        fileName === "spritesheet.webp" || fileName === path.basename(skin.sheetPath)
          ? skin.sheetPath
          : fileName === "tray.png" || fileName === path.basename(skin.trayPath)
            ? skin.trayPath
            : null;
      if (!target) return new Response("File Not Found", { status: 404 });
      return net.fetch(pathToFileURL(target).href);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }
  });
}

function registerIpc() {
  ipcMain.handle("get-state", () => ({
    bounds: lastPetBounds || win.getBounds(),
    cursor: screen.getCursorScreenPoint(),
    workArea: currentWorkArea(),
    scale,
    overlay,
    skin: activeSkin
      ? {
          id: activeSkin.id,
          displayName: activeSkin.displayName,
          sheetUrl: sheetUrlFor(activeSkin),
        }
      : null,
  }));

  ipcMain.handle("move-pet", (_event, payload) => applyPetBounds(payload.x, payload.y));

  ipcMain.handle("begin-drag", () => {
    if (!win) return null;
    overlay = true;
    const area = currentWorkArea();
    win.setBounds(area);
    return {
      bounds: lastPetBounds,
      cursor: screen.getCursorScreenPoint(),
      workArea: area,
      scale,
      overlay,
      skin: activeSkin
        ? {
            id: activeSkin.id,
            displayName: activeSkin.displayName,
            sheetUrl: sheetUrlFor(activeSkin),
          }
        : null,
    };
  });

  ipcMain.handle("end-drag", (_event, payload) => {
    overlay = false;
    return applyPetBounds(payload.x, payload.y);
  });

  ipcMain.handle("list-skins", () =>
    listSkins().map((skin) => ({
      id: skin.id,
      displayName: skin.displayName,
      source: skin.source,
      active: activeSkin?.id === skin.id,
    })),
  );

  ipcMain.handle("import-skin", async () => {
    await chooseAndImportSkin();
    return { ok: true, activeSkinId: activeSkin?.id };
  });

  ipcMain.on("show-menu", () => {
    if (overlay) return;
    Menu.buildFromTemplate([
      { label: "自己散步", click: () => win?.webContents.send("set-mode", "wander") },
      { label: "跟着鼠标", click: () => win?.webContents.send("set-mode", "follow") },
      { label: "待在原地", click: () => win?.webContents.send("set-mode", "stay") },
      { type: "separator" },
      { label: "挥手", click: () => win?.webContents.send("play-action", "waving") },
      { label: "跳跃", click: () => win?.webContents.send("play-action", "jumping") },
      { type: "separator" },
      { label: "导入皮肤…", click: () => chooseAndImportSkin() },
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]).popup({ window: win });
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    hidden = false;
    win.show();
    rebuildTray();
  });

  app.whenReady().then(() => {
    if (process.platform === "darwin") {
      app.dock.hide();
    }
    registerProtocol();
    const settings = loadSettings();
    if (typeof settings.scale === "number") scale = settings.scale;
    activeSkin = resolveActiveSkin(settings.activeSkinId);
    registerIpc();
    createWindow();
    createTray();
    if (activeSkin) setActiveSkin(activeSkin, { notify: false });
  });
}

app.on("window-all-closed", () => {
  app.quit();
});
