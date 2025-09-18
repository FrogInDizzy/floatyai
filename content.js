// FLOATY MVP - TICKET-004: Minimal Floating UI
console.log("Floaty: Content script loaded");

// Debouncing for keyboard shortcuts
let debounceTimer = null;
let currentOverlay = null;

// Listen for keyboard shortcut: Ctrl+Shift+F
document.addEventListener('keydown', async (event) => {
  // Check for Ctrl+Shift+F
  if (event.ctrlKey && event.shiftKey && event.key === 'F') {
    event.preventDefault(); // Prevent browser's find dialog

    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce the trigger (300ms)
    debounceTimer = setTimeout(async () => {
      await handleSelection();
    }, 300);
  }
});

async function handleSelection() {
  const selectedText = getSelectedText();

  if (!selectedText) {
    console.log("No text selected");
    return;
  }

  if (!isValidSelection(selectedText)) {
    console.log("Selection too short (minimum 10 characters)");
    return;
  }

  console.log("Processing selected text:", selectedText.substring(0, 50) + "...");
  console.log("🚀 Floaty triggered! Processing with AI...");

  // Show loading overlay
  showLoadingOverlay();

  try {
    const response = await callOpenAI(selectedText);
    showResponseOverlay(response);
  } catch (error) {
    console.error("❌ OpenAI call failed:", error);
    showErrorOverlay("Failed to get AI response. Check your API key and try again.");
  }
}

function getSelectedText() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const selectedText = selection.toString().trim();
  return selectedText.length > 0 ? selectedText : null;
}

function isValidSelection(text) {
  // Basic validation: minimum 10 characters
  if (text.length < 10) {
    return false;
  }

  // TODO: Add more validation (e.g., not just whitespace, reasonable max length)
  return true;
}

// Prompt templates
const PROMPT_TEMPLATES = {
  summarize: (text) => `Summarize this text in 2-3 sentences:\n\n${text}`,
  explain: (text) => `Explain this text in simple terms:\n\n${text}`,
  translate: (text) => `Translate this text to English if it's in another language, or improve the grammar if it's already in English:\n\n${text}`
};

async function callOpenAI(text, retryCount = 0) {
  console.log(`Calling OpenAI API... (attempt ${retryCount + 1})`);

  // Get API key from storage
  const result = await chrome.storage.local.get(['openai_api_key']);
  const apiKey = result.openai_api_key;

  if (!apiKey) {
    const error = "No API key found. Please set it in the extension popup.";
    console.error(error);
    throw new Error(error);
  }

  // Basic API key validation
  if (!apiKey.startsWith('sk-')) {
    const error = "Invalid API key format. Should start with 'sk-'";
    console.error(error);
    throw new Error(error);
  }

  console.log("API key found, making request...");

  try {
    // Create timeout controller (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: PROMPT_TEMPLATES.summarize(text)
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log("Response status:", response.status);

    // Handle rate limiting with retry
    if (response.status === 429 && retryCount === 0) {
      console.log("Rate limited, retrying in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return callOpenAI(text, retryCount + 1);
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorData = await response.json();
        console.error("API Error Details:", errorData);

        if (response.status === 401) {
          errorMessage = "Invalid API key. Please check your OpenAI API key in the extension popup.";
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again in a few minutes.";
        } else if (response.status === 402) {
          errorMessage = "Insufficient credits. Please add credits to your OpenAI account.";
        } else if (response.status === 503) {
          errorMessage = "OpenAI service temporarily unavailable. Please try again later.";
        } else if (errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        console.error("Could not parse error response");
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from OpenAI");
    }

    const summary = data.choices[0].message.content;
    console.log("AI Response:", summary);
    return summary;

  } catch (error) {
    console.error("Fetch error:", error);

    // Handle timeout
    if (error.name === 'AbortError') {
      throw new Error("Request timed out after 30 seconds. Please try again.");
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Network error. Check your internet connection and try again.");
    }

    // Retry once for network/timeout errors
    if (retryCount === 0 && (error.name === 'TypeError' || error.name === 'AbortError')) {
      console.log("Retrying request in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return callOpenAI(text, retryCount + 1);
    }

    throw error;
  }
}

// UI Functions
function createOverlay() {
  removeCurrentOverlay();

  const overlay = document.createElement('div');
  overlay.className = 'floaty-overlay';

  // Add CSS styles directly
  overlay.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 16px;
    max-width: 300px;
    z-index: 9999;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    top: 20px;
    right: 20px;
  `;

  document.body.appendChild(overlay);
  currentOverlay = overlay;

  // Click outside to dismiss
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
  }, 100);

  return overlay;
}

function removeCurrentOverlay() {
  if (currentOverlay) {
    document.removeEventListener('click', handleOutsideClick, true);
    currentOverlay.remove();
    currentOverlay = null;
  }
}

function handleOutsideClick(event) {
  if (currentOverlay && !currentOverlay.contains(event.target)) {
    removeCurrentOverlay();
  }
}

function showLoadingOverlay() {
  const overlay = createOverlay();
  overlay.innerHTML = `
    <div style="text-align: center;">
      <div style="margin-bottom: 8px;">🤖 Floaty AI</div>
      <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007cba; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <div style="margin-top: 8px; color: #666;">Processing...</div>
    </div>
  `;

  // Add spin animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function showResponseOverlay(response) {
  const overlay = createOverlay();
  overlay.innerHTML = `
    <div>
      <div style="margin-bottom: 12px; font-weight: bold; color: #007cba;">🤖 Floaty AI</div>
      <div style="margin-bottom: 12px; color: #333;">${response}</div>
      <button id="floaty-copy" style="
        background: #007cba;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Copy</button>
      <button id="floaty-close" style="
        background: #f5f5f5;
        color: #666;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 8px;
      ">Close</button>
    </div>
  `;

  // Add button event listeners
  const copyBtn = overlay.querySelector('#floaty-copy');
  const closeBtn = overlay.querySelector('#floaty-close');

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(response).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1000);
    });
  });

  closeBtn.addEventListener('click', () => {
    removeCurrentOverlay();
  });
}

function showErrorOverlay(errorMessage) {
  const overlay = createOverlay();
  overlay.innerHTML = `
    <div>
      <div style="margin-bottom: 12px; font-weight: bold; color: #dc3545;">❌ Error</div>
      <div style="margin-bottom: 12px; color: #666;">${errorMessage}</div>
      <button id="floaty-close" style="
        background: #dc3545;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Close</button>
    </div>
  `;

  const closeBtn = overlay.querySelector('#floaty-close');
  closeBtn.addEventListener('click', () => {
    removeCurrentOverlay();
  });
}