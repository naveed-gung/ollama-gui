let isStreaming = false;
let streamingEnabled = false;
let currentStreamMessage = null;

// DOM Elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const streamToggle = document.getElementById('stream-toggle');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

// Check Ollama connection on startup
async function checkConnection() {
  const result = await window.electronAPI.checkOllama();
  if (result.success) {
    statusIndicator.classList.add('connected');
    statusText.textContent = 'Connected to Ollama';
  } else {
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Ollama not connected';
    addMessage('assistant', 'Error: Cannot connect to Ollama. Make sure Ollama is running on localhost:11434');
  }
}

// Add message to chat
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = `<strong>${role === 'user' ? 'You' : 'Assistant'}:</strong> ${content}`;
  
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;
  
  return messageDiv;
}

// Send message (non-streaming)
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isStreaming) return;

  // Add user message
  addMessage('user', message);
  userInput.value = '';

  // Disable send button and show loading
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="loading"></span>';

  if (streamingEnabled) {
    // Use streaming
    isStreaming = true;
    currentStreamMessage = addMessage('assistant', '');
    const contentDiv = currentStreamMessage.querySelector('.message-content');
    let fullResponse = '';

    window.electronAPI.sendMessageStream(message);

    window.electronAPI.onStreamChunk((chunk) => {
      fullResponse += chunk;
      contentDiv.innerHTML = `<strong>Assistant:</strong> ${fullResponse}`;
      messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;
    });

    window.electronAPI.onStreamDone(() => {
      isStreaming = false;
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>Send</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    });

    window.electronAPI.onStreamError((error) => {
      isStreaming = false;
      addMessage('assistant', `Error: ${error}`);
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>Send</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    });

  } else {
    // Use non-streaming
    const result = await window.electronAPI.sendMessage(message);

    if (result.success) {
      addMessage('assistant', result.response);
    } else {
      addMessage('assistant', `Error: ${result.error}`);
    }

    // Re-enable send button
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<span>Send</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
  }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    sendMessage();
  }
});

clearBtn.addEventListener('click', () => {
  messagesContainer.innerHTML = '';
  addMessage('assistant', 'Chat cleared. How can I help you?');
});

streamToggle.addEventListener('click', () => {
  streamingEnabled = !streamingEnabled;
  streamToggle.textContent = `Streaming: ${streamingEnabled ? 'ON' : 'OFF'}`;
});

// Initialize
checkConnection();
userInput.focus();