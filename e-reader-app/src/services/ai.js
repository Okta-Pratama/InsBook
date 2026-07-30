// API key provided by the user
const AI_API_KEY = 'sb_publishable_bIA3PtpncZv9ksIMrxALNQ_3ylwiIYm';

/**
 * Summarizes the given text using an AI API.
 * Since the specific AI provider was not specified, this function simulates the network request 
 * and returns a mock summary. You can replace the fetch call with your actual provider (e.g., OpenAI, Gemini).
 */
export async function summarizeText(text) {
  try {
    // Example implementation for OpenAI:
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: `Summarize this text: ${text}` }]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
    */

    // Simulated network delay for the MVP
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!text || text.trim() === '') {
      return 'No text provided to summarize.';
    }

    // Mock summary response
    return `*** AI Summary ***\n\nThis is an AI-generated summary of the current page. \n\nExtracted content preview: "${text.substring(0, 100).replace(/\n/g, ' ')}..."\n\n(Replace the ai.js fetch call to connect to your specific AI provider).`;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return 'An error occurred while generating the summary.';
  }
}
