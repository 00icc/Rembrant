import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'path'
import { BridgeService } from './bridge-service.ts'
import * as fs from 'fs-extra'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let bridgeService: BridgeService | null = null
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Rembrant - AE to Resolve Bridge',
    icon: process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, 'vite.svg') : undefined,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
    },
  })

  // Wait for Vite dev server to be ready
  if (VITE_DEV_SERVER_URL) {
    const waitForVite = async () => {
      try {
        const response = await fetch(VITE_DEV_SERVER_URL)
        if (response.ok) {
          // Check if win is not null before loading URL
          if (win) {
            await win.loadURL(VITE_DEV_SERVER_URL)
          } else {
            throw new Error('Window was closed')
          }
        } else {
          setTimeout(waitForVite, 1000)
        }
      } catch (error) {
        // Add error logging and continue retry
        console.error('Failed to connect to Vite dev server:', error)
        setTimeout(waitForVite, 1000)
      }
    }
    waitForVite()
  } else {
    // Ensure DIST environment variable exists and is a string before loading file
    if (process.env.DIST) {
      win.loadFile(path.join(process.env.DIST, 'index.html')).catch(err => {
        console.error('Failed to load index.html:', err);
      });
    } else {
      console.error('DIST environment variable is not defined');
    }
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // This section is redundant since we already handle URL loading in the waitForVite function
  // Removing this duplicate code block as it could cause race conditions
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.whenReady().then(() => {
  createWindow()
  
  // Initialize the bridge service with the main window
  if (win) {
    bridgeService = new BridgeService(win);
    bridgeService.initializeListeners();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})