"use strict";
const electron = require("electron");
const path = require("path");
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
function createWindow() {
  win = new electron.BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(process.env.VITE_PUBLIC, "vite.svg"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    const waitForVite = async () => {
      try {
        const response = await fetch(VITE_DEV_SERVER_URL);
        if (response.ok) {
          win.loadURL(VITE_DEV_SERVER_URL);
        } else {
          setTimeout(waitForVite, 1e3);
        }
      } catch {
        setTimeout(waitForVite, 1e3);
      }
    };
    waitForVite();
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
