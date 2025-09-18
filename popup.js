// FLOATY MVP - TICKET-002: API Key Storage
document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('save');
  const clearButton = document.getElementById('clear');
  const statusDiv = document.getElementById('status');

  // Load existing API key
  try {
    const result = await chrome.storage.local.get(['openai_api_key']);
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
      showStatus('API key loaded', 'success');
    }
  } catch (error) {
    showStatus('Error loading API key', 'error');
  }

  // Save API key
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    // Basic validation
    if (!apiKey.startsWith('sk-')) {
      showStatus('API key should start with "sk-"', 'error');
      return;
    }

    try {
      await chrome.storage.local.set({ openai_api_key: apiKey });
      showStatus('API key saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving API key', 'error');
    }
  });

  // Clear API key
  clearButton.addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove(['openai_api_key']);
      apiKeyInput.value = '';
      showStatus('API key cleared', 'success');
    } catch (error) {
      showStatus('Error clearing API key', 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    // Clear status after 3 seconds
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
});