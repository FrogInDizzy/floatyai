// FLOATY MVP - TICKET-003: Selection & Trigger
console.log("Floaty: Content script loaded");

// Debouncing for keyboard shortcuts
let debounceTimer = null;

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

  try {
    await callOpenAI(selectedText);
  } catch (error) {
    console.error("❌ OpenAI call failed:", error);
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

async function callOpenAI(text) {
  console.log("Calling OpenAI API...");

  // Get API key from storage
  const result = await chrome.storage.local.get(['openai_api_key']);
  const apiKey = result.openai_api_key;

  if (!apiKey) {
    console.error("No API key found. Please set it in the extension popup.");
    return;
  }

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
          content: `Summarize this text: ${text}`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const summary = data.choices[0].message.content;

  console.log("AI Response:", summary);

  // TODO: Replace console.log with actual UI
  return summary;
}