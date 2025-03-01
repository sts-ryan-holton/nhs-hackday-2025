/**
 * Main application file for the AI Phone
 */
require('dotenv').config();
const { initializeTranscriber, transcribeAudio } = require('./speech/transcriber');
const { initializeTTS, generateSpeech, preloadCommonPhrases, setTTSConfig } = require('./speech/synthesizer');
const { createAudioRecorder, startRecordingWithVAD, validateRecording } = require('./audio/recorder');
const { playAudio } = require('./audio/player');
const { RECORDING_PATH, MIC_START_SOUND_PATH, MIC_STOP_SOUND_PATH } = require('./utils/fileUtils');
const { sendMessageToClaude, addWelcomeMessage, clearConversationHistory } = require('./api/claude');
const { CallStatus, startCall, updateCallStatus, completeCallWithData, clearCurrentCallId } = require('./api/callApi');

// Flag to prevent multiple SIGINT handler executions
let isProcessing = false;

// Handle SIGINT (Ctrl+C) to gracefully exit and update call status
process.on('SIGINT', async () => {
  // Prevent multiple executions of this handler
  if (isProcessing) return;
  isProcessing = true;
  
  console.log('\nReceived SIGINT (Ctrl+C). Exiting gracefully...');
  
  // Update call status to COMPLETED
  try {
    await updateCallStatus(CallStatus.COMPLETED);
    console.log('Call marked as completed due to user termination');
  } catch (error) {
    console.error('Error updating call status:', error.message);
  }
  
  // Clear the current call ID
  clearCurrentCallId();
  
  // Exit with success code
  process.exit(0);
});

/**
 * Initializes all required models
 * @param {Object} args - Command line arguments
 */
async function initialize(args) {
  try {
    // Set TTS configuration from command line arguments
    console.log('Setting TTS configuration...');
    setTTSConfig(args.ttsModel, args.ttsQuantization);
    
    // Initialize models sequentially with a timeout
    console.log('Initializing models sequentially...');
    
    // Flag to skip model initialization if it's taking too long
    const skipModelInit = args.skipModelInit || false;
    
    if (skipModelInit) {
      console.log('Skipping model initialization (--skip-model-init flag set)');
    } else {
      try {
        // Initialize the TTS model first
        console.log('Initializing TTS model...');
        const ttsTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TTS model initialization timed out after 30 seconds')), 30000);
        });
        
        try {
          await Promise.race([initializeTTS(), ttsTimeout]);
          console.log('TTS model initialized successfully');
        } catch (ttsError) {
          console.error('Error initializing TTS model:', ttsError.message);
          console.log('Continuing without TTS model initialization');
        }
        
        // Initialize the transcriber model
        console.log('Initializing transcriber model...');
        const transcriberTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Transcriber model initialization timed out after 30 seconds')), 30000);
        });
        
        try {
          await Promise.race([initializeTranscriber(), transcriberTimeout]);
          console.log('Transcriber model initialized successfully');
        } catch (transcriberError) {
          console.error('Error initializing transcriber model:', transcriberError.message);
          console.log('Continuing without transcriber model initialization');
        }
      } catch (error) {
        console.error('Error during model initialization:', error.message);
        console.log('Continuing without model initialization');
      }
    }
    
    try {
      // Preload common phrases for TTS
      console.log('Preloading common phrases for TTS...');
      await preloadCommonPhrases();
      console.log('Preloading completed successfully');
    } catch (error) {
      console.error('Error during preloading common phrases:', error);
      // Continue even if preloading fails
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing models:', error);
    return false;
  }
}

/**
 * Speaks a welcome message and adds it to the conversation history
 */
async function speakWelcome() {
  const welcomeMessage = "Hello! How can I help you today?";
  console.log(`\nWelcome message: "${welcomeMessage}"`);
  
  try {
    // Update call status to GREETING
    console.log('Updating call status to GREETING...');
    await updateCallStatus(CallStatus.GREETING);
    
    // Generate and play welcome message
    console.log('Generating welcome message speech...');
    const outputPath = await generateSpeech(welcomeMessage);
    console.log(`Speech generated successfully, saved to ${outputPath}`);
    
    console.log('Playing welcome message...');
    await playAudio(outputPath);
    console.log('Welcome message played successfully');
    
    // Add welcome message to conversation history
    console.log('Adding welcome message to conversation history...');
    addWelcomeMessage(welcomeMessage);
    console.log('Welcome message added to conversation history');
  } catch (error) {
    console.error('Error speaking welcome message:', error);
    // Update call status to ERROR if there's an issue
    try {
      await updateCallStatus(CallStatus.ERROR);
    } catch (statusError) {
      console.error('Error updating call status:', statusError.message);
    }
  }
}

/**
 * Records audio, transcribes it, and speaks the transcription
 * @returns {Promise<boolean>} - Promise that resolves to true if should continue, false if should exit
 */
async function recordAndRepeat() {
  console.log('\n--- New Recording Session ---');
  console.log('Recording... Speak into the microphone. (Recording will stop after silence)');
  console.log('Press Ctrl+C at any time to exit the application');
  
  try {
    // Start recording with voice activity detection
    // Parameters: filePath, silenceDuration, thresholdStart, thresholdStop, debug
    // Using higher threshold values (0.3) to be less sensitive to background noise
    await startRecordingWithVAD(RECORDING_PATH, 2, 0.3, 0.3, true);
    
    // If we get here, the recording has stopped due to silence detection
    // Check if the recording is valid (this is redundant as startRecordingWithVAD already checks)
    if (!validateRecording(RECORDING_PATH)) {
      console.log('No speech detected or recording was too short.');
      // If no speech, exit the loop
      return false;
    }
    
    // Transcribe the audio
    const transcriptionText = await transcribeAudio(RECORDING_PATH);
    
    if (transcriptionText) {
      console.log('\nTranscription result:');
      console.log(transcriptionText);
      
      // Generate speech from the transcription
      console.log('\nGenerating speech from transcription...');
      const outputPath = await generateSpeech(transcriptionText);
      
      // Play the audio through the speakers
      await playAudio(outputPath);
      
      // Continue the loop
      return true;
    } else {
      console.log('No transcription text returned');
      // Continue the loop even if no transcription
      return true;
    }
  } catch (error) {
    if (error.message === 'Invalid or empty recording') {
      console.log('No speech detected or recording was too short.');
      // If no speech, exit the loop
      return false;
    } else {
      console.error('Error during recording process:', error);
      // Continue the loop even if there was an error
      return true;
    }
  }
}

/**
 * Parse command line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    threshold: 0.045, // Default threshold for silence detection (0.0-1.0)
    silenceDuration: 1, // Default silence duration in seconds (reduced for faster response)
    debug: true, // Default debug mode
    maxDuration: 15, // Default maximum recording duration in seconds
    useClaudeApi: true, // Default to using Claude API
    useConversationContext: true, // Default to using conversation context
    ttsModel: "onnx-community/Kokoro-82M-v1.0-ONNX", // Default TTS model
    ttsQuantization: "q4", // Default quantization level
    skipModelInit: false // Default to not skipping model initialization
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold' && i + 1 < args.length) {
      const value = parseFloat(args[i + 1]);
      if (!isNaN(value) && value >= 0 && value <= 1) {
        result.threshold = value;
      }
      i++; // Skip the next argument
    } else if (args[i] === '--silence' && i + 1 < args.length) {
      const value = parseFloat(args[i + 1]);
      if (!isNaN(value) && value > 0) {
        result.silenceDuration = value;
      }
      i++; // Skip the next argument
    } else if (args[i] === '--max-duration' && i + 1 < args.length) {
      const value = parseFloat(args[i + 1]);
      if (!isNaN(value) && value > 0) {
        result.maxDuration = value;
      }
      i++; // Skip the next argument
    } else if (args[i] === '--no-debug') {
      result.debug = false;
    } else if (args[i] === '--no-timeout') {
      result.maxDuration = 0; // Disable timeout
    } else if (args[i] === '--no-claude') {
      result.useClaudeApi = false; // Disable Claude API
    } else if (args[i] === '--use-claude') {
      result.useClaudeApi = true; // Enable Claude API
    } else if (args[i] === '--no-context') {
      result.useConversationContext = false; // Disable conversation context
    } else if (args[i] === '--use-context') {
      result.useConversationContext = true; // Enable conversation context
    } else if (args[i] === '--tts-model' && i + 1 < args.length) {
      result.ttsModel = args[i + 1];
      i++; // Skip the next argument
    } else if (args[i] === '--tts-quantization' && i + 1 < args.length) {
      const validQuantizations = ["fp32", "fp16", "q8", "q4", "q4f16"];
      if (validQuantizations.includes(args[i + 1])) {
        result.ttsQuantization = args[i + 1];
      }
      i++; // Skip the next argument
    } else if (args[i] === '--skip-model-init') {
      result.skipModelInit = true;
    }
  }
  
  return result;
}

/**
 * Main application function
 */
async function main() {
  console.log('Starting AI Phone application...');
  
  // Parse command line arguments
  const args = parseArgs();
  
  // Clear any existing conversation history
  if (args.useConversationContext) {
    clearConversationHistory();
  }
  
  // Start a new call and get the call ID
  try {
    await startCall();
    console.log('Call started successfully');
  } catch (error) {
    console.error('Failed to start call:', error.message);
    console.log('Continuing without call tracking...');
    // Continue without call tracking if the API call fails
  }
  
  console.log(`Using settings:
  - Threshold: ${args.threshold} (0.0 = most sensitive, 1.0 = least sensitive)
  - Silence Duration: ${args.silenceDuration} seconds
  - Maximum Recording Duration: ${args.maxDuration > 0 ? args.maxDuration + ' seconds' : 'Disabled'}
  - Debug Mode: ${args.debug ? 'Enabled' : 'Disabled'}
  - Claude API: ${args.useClaudeApi ? 'Enabled' : 'Disabled'}
  - Conversation Context: ${args.useConversationContext ? 'Enabled' : 'Disabled'}
  - TTS Model: ${args.ttsModel}
  - TTS Quantization: ${args.ttsQuantization}
  - Skip Model Init: ${args.skipModelInit ? 'Enabled' : 'Disabled'}
  
  Tip: Adjust settings with:
  --threshold 0.5                (Change threshold, range 0.0-1.0)
  --silence 3                    (Change silence duration in seconds)
  --max-duration 15              (Change maximum recording duration in seconds)
  --no-timeout                   (Disable automatic timeout)
  --no-debug                     (Disable debug logging)
  --no-claude                    (Disable Claude API)
  --use-claude                   (Enable Claude API)
  --no-context                   (Disable conversation context)
  --use-context                  (Enable conversation context)
  --tts-model <model>            (Change TTS model)
  --tts-quantization <level>     (Change quantization level: fp32, fp16, q8, q4, q4f16)
  --skip-model-init              (Skip model initialization for faster startup)
  `);
  
  // Initialize models
  console.log('About to initialize models...');
  const initialized = await initialize(args);
  if (!initialized) {
    console.error('Failed to initialize models. Exiting...');
    process.exit(1);
  }
  
  // Speak welcome message
  await speakWelcome();
  
  console.log('\n=== Starting main recording loop ===');
  
  // Main loop
  let continueLoop = true;
  while (continueLoop) {
    // Use the parsed arguments for recording
    try {
      // Start recording with voice activity detection
      console.log('\n--- New Recording Session ---');
      console.log('Recording... Speak into the microphone. (Recording will stop after silence)');
      console.log('Press Ctrl+C at any time to exit the application');
      
      // Update call status to LISTENING
      try {
        await updateCallStatus(CallStatus.LISTENING);
      } catch (error) {
        console.error('Error updating call status to LISTENING:', error.message);
        console.log('Continuing without call tracking...');
      }
      
      // Play the microphone start sound
      await playAudio(MIC_START_SOUND_PATH);
      
      // Parameters: filePath, silenceDuration, thresholdStart, thresholdStop, debug, maxDuration
      console.log('Starting recording with VAD...');
      try {
        await startRecordingWithVAD(
          RECORDING_PATH, 
          args.silenceDuration, 
          args.threshold, 
          args.threshold, 
          true, // Force debug to true
          args.maxDuration
        );
        console.log('Recording completed successfully');
      } catch (recordingError) {
        console.error('Error in startRecordingWithVAD:', recordingError);
        throw recordingError;
      }
      
      // Play the microphone stop sound
      await playAudio(MIC_STOP_SOUND_PATH);
      
      // If we get here, the recording has stopped due to silence detection
      // Check if the recording is valid
      if (!validateRecording(RECORDING_PATH)) {
        console.log('No speech detected or recording was too short.');
        // If no speech, exit the loop
        continueLoop = false;
        continue;
      }
      
      // Update call status to PROCESSING
      try {
        await updateCallStatus(CallStatus.PROCESSING);
      } catch (error) {
        console.error('Error updating call status to PROCESSING:', error.message);
        console.log('Continuing without call tracking...');
      }
      
      // Transcribe the audio
      const transcriptionText = await transcribeAudio(RECORDING_PATH);
      
      if (transcriptionText) {
        console.log('\nTranscription result:');
        console.log(transcriptionText);
        
        if (args.useClaudeApi) {
          // Check if Claude API key is available
          if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY === 'your_api_key_here') {
            console.warn('\nClaude API key not found or not set. Please add your API key to the .env file.');
            console.log('Falling back to direct TTS of transcription...');
            const outputPath = await generateSpeech(transcriptionText);
            await playAudio(outputPath);
          } else {
            try {
              // Send the transcription to Claude
              console.log('\nSending to Claude API...');
              
              // Only add welcome message to conversation history if using context
              if (!args.useConversationContext) {
                // If not using conversation context, clear history before each message
                clearConversationHistory();
                
                // Re-add welcome message if needed for the first message
                if (args.useConversationContext === false) {
                  addWelcomeMessage("Hello! How can I help you today?");
                }
              }
              
              const claudeResponse = await sendMessageToClaude(transcriptionText);
              console.log('Claude response:');
              console.log(claudeResponse);
              
              // The claudeResponse should now always be a JSON object with response, send_triage, and end_call fields
              // Extract the response text from the JSON object
              let responseText = claudeResponse.response || claudeResponse;
              
              // Update call status to RESPONDING
              try {
                await updateCallStatus(CallStatus.RESPONDING);
              } catch (error) {
                console.error('Error updating call status to RESPONDING:', error.message);
                console.log('Continuing without call tracking...');
              }
              
              // Generate speech from Claude's response text
              console.log('\nGenerating speech from Claude response...');
              const outputPath = await generateSpeech(responseText);
              
              // Play the audio through the speakers
              await playAudio(outputPath);
              
              // Check if we should end the call based on the end_call flag
              if (claudeResponse.end_call === true) {
                console.log('\nAI indicated to end the call (end_call: true)');
                
                // If send_triage is also true, prepare and send the final JSON object
                if (claudeResponse.send_triage === true) {
                  // Import the getConversationHistory function
                  const { getConversationHistory } = require('./api/claude');
                  
                  // Get the full conversation history
                  const fullHistory = getConversationHistory();
                  
                  // Transform the conversation history to only include AI messages and transcriptions
                  const simplifiedConversation = fullHistory.map(entry => {
                    if (entry.role === 'user') {
                      try {
                        // Extract just the transcription from the user message
                        const contentObj = JSON.parse(entry.content[0].text);
                        return {
                          role: 'user',
                          text: contentObj.transcription
                        };
                      } catch (e) {
                        // Fallback if parsing fails
                        return {
                          role: 'user',
                          text: entry.content[0].text
                        };
                      }
                    } else if (entry.role === 'assistant') {
                      // Extract just the response field from the assistant message if it's a JSON object
                      try {
                        const jsonResponse = JSON.parse(entry.content[0].text);
                        if (jsonResponse && jsonResponse.response) {
                          return {
                            role: 'assistant',
                            text: jsonResponse.response
                          };
                        }
                      } catch (e) {
                        // If it's not a valid JSON or doesn't have a response field, use the full text
                      }
                      
                      // Fallback to using the full text
                      return {
                        role: 'assistant',
                        text: entry.content[0].text
                      };
                    }
                    return null;
                  }).filter(Boolean); // Remove any null entries
                  
                  // Add the simplified conversation history to the claudeResponse
                  claudeResponse.conversation = simplifiedConversation;
                  
                  console.log('\n=== TRIAGE INFORMATION ===');
                  console.log(JSON.stringify(claudeResponse, null, 2));
                  console.log('=== END TRIAGE INFORMATION ===');
                  
                  // Send the completed JSON object to the API
                  try {
                    // Import the completeCallWithData function
                    const { completeCallWithData } = require('./api/callApi');
                    
                    // Send the claudeResponse as the PATCH body
                    await completeCallWithData(claudeResponse);
                    console.log('Triage information sent to API successfully');
                  } catch (error) {
                    console.error('Error sending triage information to API:', error.message);
                    
                    // Fall back to updating just the status if sending the data fails
                    await updateCallStatus(CallStatus.COMPLETED);
                  }
                } else {
                  // If no triage data to send, just update the call status to COMPLETED
                  await updateCallStatus(CallStatus.COMPLETED);
                }
                
                // Exit the loop to end the call
                continueLoop = false;
              }
            } catch (error) {
              console.error('Error processing with Claude:', error.message);
              
              // Update call status to ERROR
              await updateCallStatus(CallStatus.ERROR);
              
              // Fallback to direct TTS if Claude fails
              console.log('Falling back to direct TTS of transcription...');
              const outputPath = await generateSpeech(transcriptionText);
              await playAudio(outputPath);
            }
          }
        } else {
          // Direct TTS without Claude
          console.log('\nGenerating speech from transcription...');
          const outputPath = await generateSpeech(transcriptionText);
          await playAudio(outputPath);
        }
      } else {
        console.log('No transcription text returned');
      }
    } catch (error) {
      if (error.message === 'Invalid or empty recording') {
        console.log('No speech detected or recording was too short.');
        // If no speech, exit the loop
        continueLoop = false;
      } else {
        console.error('Error during recording process:', error);
      }
    }
  }
  
  // Update call status to COMPLETED if not already set
  /*try {
    await updateCallStatus(CallStatus.COMPLETED);
    console.log('Call marked as completed');
  } catch (error) {
    console.error('Error updating call status:', error.message);
  }*/
  
  // Clear the current call ID
  clearCurrentCallId();
  
  console.log('Exiting AI Phone application...');
  process.exit(0);
}

// Start the application
main().catch(async error => {
  console.error('Unhandled error in main application:', error);
  
  // Update call status to ERROR
  try {
    await updateCallStatus(CallStatus.ERROR);
    console.log('Call marked as error due to unhandled exception');
  } catch (statusError) {
    console.error('Error updating call status:', statusError.message);
  }
  
  // Clear the current call ID
  clearCurrentCallId();
  
  process.exit(1);
});
