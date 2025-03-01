 /**
 * Claude API integration module for the AI Phone application
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Read system prompt from prompt.txt file
let systemPrompt;
try {
  systemPrompt = fs.readFileSync(path.join(process.cwd(), 'prompt.txt'), 'utf8');
  console.log('System prompt loaded from prompt.txt');
} catch (error) {
  console.warn('Could not read prompt.txt, using default system prompt:', error.message);
  systemPrompt = `You are a helpful AI assistant. 
Respond to the user's message in a concise and helpful manner.
Your response will be spoken aloud, so keep it brief and clear.`;
}

// Store conversation history
let conversationHistory = [];

/**
 * Adds the initial welcome message to the conversation history
 * @param {string} welcomeMessage - The welcome message spoken by the assistant
 */
function addWelcomeMessage(welcomeMessage) {
  // Add the welcome message as the first assistant message in the conversation
  conversationHistory.push({
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: welcomeMessage
      }
    ]
  });
  
  console.log('Added welcome message to conversation history');
}

/**
 * Sends a message to the Claude API and returns the response
 * @param {string} message - The user's message to send to Claude
 * @param {string} customSystemPrompt - Custom system prompt to override the default (optional)
 * @returns {Promise<string>} - Promise that resolves with Claude's response
 */
async function sendMessageToClaude(
  message,
  customSystemPrompt = null
) {
  // Use custom system prompt if provided, otherwise use the one from prompt.txt
  const promptToUse = customSystemPrompt || systemPrompt;
  
  const apiKey = process.env.CLAUDE_API_KEY;
  const apiUrl = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages';
  const model = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';
  
  if (!apiKey) {
    throw new Error('Claude API key is required. Set the CLAUDE_API_KEY environment variable.');
  }

  // Add the user message to conversation history
  conversationHistory.push({
    role: 'user',
    content: [
      {
        type: 'text',
        text: JSON.stringify({ transcription: message })
      }
    ]
  });
  
  // Log the current conversation history for debugging
  console.log('\nCurrent conversation history:');
  console.log(JSON.stringify(conversationHistory, null, 2));

  try {
    // Create the request payload with the full conversation history
    const payload = {
      model: model,
      max_tokens: 1024,
      messages: conversationHistory,
      system: promptToUse
    };

    // Set up the request headers
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };

    // Send the request to Claude API
    const response = await axios.post(apiUrl, payload, { headers });

    // Extract the response text
    const responseText = response.data.content[0].text;
    
    // Add the assistant response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    });
    
    console.log('\nUpdated conversation history with assistant response:');
    console.log(JSON.stringify(conversationHistory, null, 2));
    
    // Try to parse the response as JSON
    try {
      const responseJson = JSON.parse(responseText);
      return responseJson;
    } catch (parseError) {
      // If the response is not valid JSON, wrap it in a JSON structure
      console.warn('Claude response is not valid JSON, wrapping in JSON structure');
      return {
        response: responseText,
        send_triage: false,
        end_call: false
      };
    }
  } catch (error) {
    console.error('Error sending message to Claude:', error.message);
    if (error.response) {
      console.error('Claude API error details:', error.response.data);
    }
    throw new Error(`Failed to get response from Claude: ${error.message}`);
  }
}

/**
 * Clears the conversation history
 */
function clearConversationHistory() {
  conversationHistory = [];
  console.log('Conversation history cleared');
}

/**
 * Gets the current conversation history
 * @returns {Array} - The current conversation history
 */
function getConversationHistory() {
  return conversationHistory;
}

module.exports = {
  systemPrompt,
  sendMessageToClaude,
  addWelcomeMessage,
  clearConversationHistory,
  getConversationHistory
};
