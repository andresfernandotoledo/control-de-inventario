const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const { join, dirname } = require('path')
const { existsSync } = require('fs')

const isDev = !app.isPackaged
let serverProcess = null

function startServer() {
  return new Promise((resolve, reject) => {
    let resolved = false
    let cmd, args, cwd

    if (isDev) {
      cwd = join(__dirname, '..', 'server')
      cmd = 'npx'
      args = ['tsx', 'src/index.ts']
    } else {
      cwd = dirname(process.execPath)
      const bundlePath = join(__dirname, '..', 'dist', 'inventario-server.cjs')
      cmd = process.execPath
      args = [bundlePath]
    }

    serverProcess = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '3000' },
    })

    serverProcess.stdout.on('data', (data) => {
      const text = data.toString()
      console.log('[server]', text.trim())
      if (!resolved && text.includes('Servidor corriendo')) {
        resolved = true
        resolve()
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.error('[server:err]', data.toString().trim())
    })

    serverProcess.on('error', (err) => {
      console.error('[server] error:', err)
      if (!resolved) { resolved = true; reject(err) }
    })

    serverProcess.on('exit', (code) => {
      console.log(`[server] exited with code ${code}`)
      if (!resolved) { resolved = true; reject(new Error(`Server exited with code ${code}`)) }
    })

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        console.log('[server] timeout, forcing window open')
        resolve()
      }
    }, 15000)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: join(__dirname, '..', 'client', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadURL('http://localhost:3000')
  }

  return win
}

app.whenReady().then(async () => {
  try {
    await startServer()
    const win = createWindow()
    win.on('closed', () => {
      if (serverProcess) { serverProcess.kill(); serverProcess = null }
    })
  } catch (err) {
    console.error('Failed to start:', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
})
