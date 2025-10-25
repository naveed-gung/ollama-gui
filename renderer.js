let editor;
let currentProjectPath = null;
let currentFilePath = null;

// DOM Elements
const newProjectBtn = document.getElementById('new-project-btn');
const openProjectBtn = document.getElementById('open-project-btn');
const uploadFilesBtn = document.getElementById('upload-files-btn');
const saveFileBtn = document.getElementById('save-file-btn');
const projectTree = document.getElementById('project-tree');
const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');
const outputContent = document.getElementById('output-content');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor-container'), {
    value: '// Welcome to Ollama IDE Studio\n// Start coding here...',
    language: 'javascript',
    theme: 'vs-dark',
    fontSize: 14,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true
  });

  // Listen for editor changes
  editor.onDidChangeModelContent(() => {
    updateStatus('Unsaved changes');
  });
});

// Event Listeners
newProjectBtn.addEventListener('click', createNewProject);
openProjectBtn.addEventListener('click', openProject);
uploadFilesBtn.addEventListener('click', uploadFiles);
saveFileBtn.addEventListener('click', saveCurrentFile);

terminalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    executeCommand(terminalInput.value);
    terminalInput.value = '';
  }
});

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + '-panel').classList.add('active');
  });
});

// Functions
async function createNewProject() {
  const result = await window.electronAPI.showSaveDialog({
    title: 'Create New Project',
    properties: ['createDirectory']
  });

  if (!result.canceled) {
    currentProjectPath = result.filePath;
    await window.electronAPI.mkdir(currentProjectPath);
    loadProjectTree();
    updateStatus('New project created');
  }
}

async function openProject() {
  const result = await window.electronAPI.showOpenDialog({
    title: 'Open Project',
    properties: ['openDirectory']
  });

  if (!result.canceled) {
    currentProjectPath = result.filePaths[0];
    loadProjectTree();
    updateStatus('Project opened');
  }
}

async function uploadFiles() {
  const result = await window.electronAPI.showOpenDialog({
    title: 'Upload Files',
    properties: ['openFile', 'multiSelections']
  });

  if (!result.canceled && currentProjectPath) {
    for (const filePath of result.filePaths) {
      const fileName = window.electronAPI.path.basename(filePath);
      const destPath = window.electronAPI.path.join(currentProjectPath, fileName);
      const content = await window.electronAPI.readFile(filePath);
      await window.electronAPI.writeFile(destPath, content);
    }
    loadProjectTree();
    updateStatus('Files uploaded');
  }
}

async function saveCurrentFile() {
  if (currentFilePath && editor) {
    const content = editor.getValue();
    await window.electronAPI.writeFile(currentFilePath, content);
    updateStatus('File saved');
  }
}

async function loadProjectTree() {
  if (!currentProjectPath) return;

  projectTree.innerHTML = '';

  async function buildTree(dirPath, parentElement) {
    try {
      const items = await window.electronAPI.readdir(dirPath);
      for (const item of items) {
        const itemPath = window.electronAPI.path.join(dirPath, item.name);
        const li = document.createElement('li');
        li.textContent = item.name;
        li.dataset.path = itemPath;

        if (item.isDirectory()) {
          li.classList.add('folder');
          li.addEventListener('click', () => {
            li.classList.toggle('expanded');
            const subUl = li.querySelector('ul');
            if (subUl) {
              subUl.style.display = subUl.style.display === 'none' ? 'block' : 'none';
            } else {
              const ul = document.createElement('ul');
              li.appendChild(ul);
              buildTree(itemPath, ul);
            }
          });
        } else {
          li.classList.add('file');
          li.addEventListener('click', () => openFile(itemPath));
        }

        parentElement.appendChild(li);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
    }
  }

  const rootUl = document.createElement('ul');
  projectTree.appendChild(rootUl);
  await buildTree(currentProjectPath, rootUl);
}

async function openFile(filePath) {
  try {
    const content = await window.electronAPI.readFile(filePath);
    currentFilePath = filePath;
    const ext = window.electronAPI.path.extname(filePath).toLowerCase();
    let language = 'plaintext';

    switch (ext) {
      case '.js': language = 'javascript'; break;
      case '.ts': language = 'typescript'; break;
      case '.py': language = 'python'; break;
      case '.html': language = 'html'; break;
      case '.css': language = 'css'; break;
      case '.json': language = 'json'; break;
      case '.md': language = 'markdown'; break;
    }

    const model = monaco.editor.createModel(content, language);
    editor.setModel(model);
    updateStatus(`Opened ${window.electronAPI.path.basename(filePath)}`);
  } catch (error) {
    updateStatus('Error opening file');
  }
}

async function executeCommand(command) {
  appendToTerminal(`> ${command}\n`);
  const result = await window.electronAPI.execCommand(command);
  if (result.success) {
    appendToTerminal(result.stdout);
    if (result.stderr) appendToTerminal(result.stderr);
  } else {
    appendToTerminal(`Error: ${result.error}\n`);
  }
}

function appendToTerminal(text) {
  terminalOutput.textContent += text;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function updateStatus(message) {
  statusText.textContent = message;
}

// Initialize
updateStatus('Ready');