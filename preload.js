const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  sendMessageStream: (message) => ipcRenderer.send('send-message-stream', message),
  onStreamChunk: (callback) => ipcRenderer.on('message-stream-chunk', (event, chunk) => callback(chunk)),
  onStreamDone: (callback) => ipcRenderer.on('message-stream-done', () => callback()),
  onStreamError: (callback) => ipcRenderer.on('message-stream-error', (event, error) => callback(error)),
  checkOllama: () => ipcRenderer.invoke('check-ollama')
});