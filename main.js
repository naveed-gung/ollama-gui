const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle chat messages from renderer
ipcMain.handle('send-message', async (event, message) => {
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'gpt-oss',
      prompt: message,
      stream: false
    }, {
      timeout: 120000 // 2 minute timeout
    });

    return {
      success: true,
      response: response.data.response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Handle streaming messages (optional advanced feature)
ipcMain.on('send-message-stream', async (event, message) => {
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'gpt-oss',
      prompt: message,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 120000
    });

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            event.reply('message-stream-chunk', parsed.response);
          }
          if (parsed.done) {
            event.reply('message-stream-done');
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
    });

  } catch (error) {
    event.reply('message-stream-error', error.message);
  }
});

// Check Ollama connection
ipcMain.handle('check-ollama', async () => {
  try {
    await axios.get('http://localhost:11434/api/tags');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle file dialogs
ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

// Handle terminal commands
ipcMain.handle('exec-command', async (event, command) => {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
});