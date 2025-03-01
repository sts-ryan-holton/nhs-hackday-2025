/**
 * Call API integration module for the AI Phone application
 */
const axios = require('axios');
require('dotenv').config();

// Call status stages
const CallStatus = {
  INITIATED: 'initiated',
  GREETING: 'greeting',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  RESPONDING: 'responding',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Store the current call ID
let currentCallId = null;

/**
 * Starts a new call and stores the call ID
 * @returns {Promise<number>} - Promise that resolves with the call ID
 */
async function startCall() {
  try {
    const apiBaseUrl = process.env.API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL is not defined in environment variables');
    }

    const response = await axios.post(`${apiBaseUrl}/api/call`, null, {
      params: {
        status: CallStatus.INITIATED
      }
    });

    // Store the call ID for later use
    currentCallId = response.data.id;
    console.log(`Call started with ID: ${currentCallId}`);
    
    return currentCallId;
  } catch (error) {
    console.error('Error starting call:', error.message);
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    throw new Error(`Failed to start call: ${error.message}`);
  }
}

/**
 * Updates the status of the current call
 * @param {string} status - The new status of the call
 * @returns {Promise<Object>} - Promise that resolves with the updated call data
 */
async function updateCallStatus(status) {
  if (!currentCallId) {
    console.warn('No active call ID found. Call may not have been started.');
    return null;
  }

  try {
    const apiBaseUrl = process.env.API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL is not defined in environment variables');
    }

    const response = await axios.patch(`${apiBaseUrl}/api/call/${currentCallId}`, null, {
      params: {
        status: status
      }
    });

    console.log(`Call ${currentCallId} status updated to: ${status}`);
    return response.data;
  } catch (error) {
    console.error(`Error updating call status to ${status}:`, error.message);
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    throw new Error(`Failed to update call status: ${error.message}`);
  }
}

/**
 * Completes the current call with the provided data
 * @param {Object} data - The data to send as the PATCH body
 * @returns {Promise<Object>} - Promise that resolves with the updated call data
 */
async function completeCallWithData(data) {
  if (!currentCallId) {
    console.warn('No active call ID found. Call may not have been started.');
    return null;
  }

  try {
    const apiBaseUrl = process.env.API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL is not defined in environment variables');
    }

    // Send the data as the PATCH body, with status=COMPLETED as a query parameter
    const response = await axios.patch(`${apiBaseUrl}/api/call/${currentCallId}`, 
      {
        ai_response: data
      },
      {
        params: {
          status: CallStatus.COMPLETED,
        }
      }
    );

    console.log(`Call ${currentCallId} completed with data`);
    return response.data;
  } catch (error) {
    console.error('Error completing call with data:', error.message);
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    throw new Error(`Failed to complete call with data: ${error.message}`);
  }
}

/**
 * Gets the current call ID
 * @returns {number|null} - The current call ID or null if no call is active
 */
function getCurrentCallId() {
  return currentCallId;
}

/**
 * Clears the current call ID
 */
function clearCurrentCallId() {
  currentCallId = null;
  console.log('Current call ID cleared');
}

module.exports = {
  CallStatus,
  startCall,
  updateCallStatus,
  completeCallWithData,
  getCurrentCallId,
  clearCurrentCallId
};
