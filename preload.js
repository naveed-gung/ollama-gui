const { contextBridge, ipcRenderer, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  sendMessageStream: (message) => ipcRenderer.send('send-message-stream', message),
  onStreamChunk: (callback) => ipcRenderer.on('message-stream-chunk', (event, chunk) => callback(chunk)),
  onStreamDone: (callback) => ipcRenderer.on('message-stream-done', () => callback()),
  onStreamError: (callback) => ipcRenderer.on('message-stream-error', (event, error) => callback(error)),
  checkOllama: () => ipcRenderer.invoke('check-ollama'),

  // File system APIs
  readFile: (filePath) => fs.promises.readFile(filePath, 'utf8'),
  writeFile: (filePath, content) => fs.promises.writeFile(filePath, content, 'utf8'),
  readdir: (dirPath) => fs.promises.readdir(dirPath, { withFileTypes: true }),
  stat: (filePath) => fs.promises.stat(filePath),
  mkdir: (dirPath) => fs.promises.mkdir(dirPath, { recursive: true }),
  exists: (filePath) => fs.existsSync(filePath),

  // Path utilities
  path: {
    basename: (p) => path.basename(p),
    extname: (p) => path.extname(p),
    join: (...args) => path.join(...args)
  },

  // Dialog APIs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // Terminal execution
  execCommand: (command) => ipcRenderer.invoke('exec-command', command)
});