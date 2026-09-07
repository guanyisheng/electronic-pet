const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require("electron");
const path = require("path");

const CELL_W = 192;
const CELL_H = 208;

let win = null;
let tray = null;
let scale = 1;
let hidden = false;
let overlay = false;
let lastPetBounds = null;

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
  if (!overlay) {
    win.setBounds(lastPetBounds);
  }
  return { ...lastPetBounds, workArea: next.workArea };
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

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function createTray() {
  const iconPath = path.join(__dirname, "..", "assets", "tray.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip("星澜桌宠");
  rebuildTray();
}

function rebuildTray() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "星澜", enabled: false },
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

function registerIpc() {
  ipcMain.handle("get-state", () => ({
    bounds: lastPetBounds || win.getBounds(),
    cursor: screen.getCursorScreenPoint(),
    workArea: currentWorkArea(),
    scale,
    overlay,
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
    };
  });

  ipcMain.handle("end-drag", (_event, payload) => {
    overlay = false;
    return applyPetBounds(payload.x, payload.y);
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
    registerIpc();
    createWindow();
    createTray();
  });
}

app.on("window-all-closed", () => {
  app.quit();
});
