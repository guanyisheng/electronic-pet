const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petBridge", {
  getState: () => ipcRenderer.invoke("get-state"),
  movePet: (x, y) => ipcRenderer.invoke("move-pet", { x, y }),
  beginDrag: () => ipcRenderer.invoke("begin-drag"),
  endDrag: (x, y) => ipcRenderer.invoke("end-drag", { x, y }),
  showMenu: () => ipcRenderer.send("show-menu"),
  onSetMode: (handler) => ipcRenderer.on("set-mode", (_event, mode) => handler(mode)),
  onPlayAction: (handler) => ipcRenderer.on("play-action", (_event, action) => handler(action)),
  onSetScale: (handler) => ipcRenderer.on("set-scale", (_event, scale) => handler(scale)),
});
