// FLOATY MVP - TICKET-002: API Key Storage
console.log("Floaty: Content script loaded");

// Listen for text selection
document.addEventListener('mouseup', async () => {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length > 0) {
    console.log("Selected text:", selectedText);

    try {
      // TODO: Add validation for minimum text length
      await callOpenAI(selectedText);
    } catch (error) {
      console.error("OpenAI call failed:", error);
    }
  }
});

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