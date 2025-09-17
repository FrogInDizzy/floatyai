// FLOATY MVP - TICKET-000: Proof of Concept
// Speed hack: Hardcoded API key for POC only
const OPENAI_API_KEY = "YOUR_API_KEY_HERE"; // TODO: Replace with your actual key

console.log("Floaty POC: Content script loaded");

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
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