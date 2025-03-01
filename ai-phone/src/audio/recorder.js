/**
 * Audio recorder module for the AI Phone application
 */
const fs = require('fs');
const AudioRecorder = require('node-audiorecorder');
const { quietLogger } = require('../utils/logger');
const { RECORDING_PATH } = require('../utils/fileUtils');

/**
 * Creates and configures an audio recorder
 * @param {Object} options - Override default recorder options
 * @param {Object} logger - Logger to use
 * @returns {AudioRecorder} - Configured audio recorder instance
 */
function createAudioRecorder(options = {}, logger = quietLogger) {
  const defaultOptions = {
    program: 'sox', // Using sox on macOS
    silence: 0, // No silence detection (record until manually stopped)
    device: null, // Default recording device
    bits: 16, // Sample size
    channels: 1, // Mono
    encoding: 'signed-integer', // PCM format
    format: 'wav', // WAV format
    rate: 16000, // 16kHz sample rate
    type: 'wav', // File type
    // Additional options to ensure clean WAV headers
    additionalOptions: [
      '-b', '16', // Explicitly set bit depth
      '-c', '1',  // Explicitly set channels
      '-r', '16000', // Explicitly set sample rate
      '-e', 'signed-integer', // Explicitly set encoding
    ]
  };

  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return new AudioRecorder(mergedOptions, logger);
}

/**
 * Creates an audio recorder with voice activity detection
 * @param {number} silenceDuration - Duration of silence in seconds before stopping
 * @param {number} thresholdStart - Silence threshold to start recording (0.0-1.0)
 * @param {number} thresholdStop - Silence threshold to stop recording (0.0-1.0)
 * @param {boolean} keepSilence - Whether to keep silence in the recording
 * @param {Object} logger - Logger to use
 * @returns {AudioRecorder} - Configured audio recorder instance with VAD
 */
function createVADRecorder(
  silenceDuration = 2,
  thresholdStart = 0.1,
  thresholdStop = 0.1,
  keepSilence = true,
  logger = quietLogger
) {
  // Ensure the threshold values are within a reasonable range (0.0-1.0)
  // Lower values are more sensitive (will detect quieter sounds as non-silence)
  // Higher values are less sensitive (will only detect louder sounds as non-silence)
  
  // IMPORTANT: We need to work around an issue in node-audiorecorder
  // The package uses toFixed(1) on the threshold values, which rounds to 1 decimal place
  // For example, 0.02 becomes "0.0%" which is too low (effectively 0%)
  
  // To fix this, we'll use higher values that will round to the desired percentage
  // For example, if we want 2%, we need to pass 0.15-0.24 to get "0.2%"
  
  // Adjust thresholds to ensure they round to appropriate values
  // We'll use a minimum of 0.15 (rounds to 0.2%) to ensure silence detection works
  const adjustedThresholdStart = Math.max(0.15, thresholdStart);
  const adjustedThresholdStop = Math.max(0.15, thresholdStop);
  
  return createAudioRecorder({
    program: 'sox',
    silence: silenceDuration,
    thresholdStart: adjustedThresholdStart,
    thresholdStop: adjustedThresholdStop,
    keepSilence: keepSilence,
    device: null,
    bits: 16,
    channels: 1,
    encoding: 'signed-integer',
    format: 'wav',
    rate: 16000,
    type: 'wav'
  }, logger);
}

/**
 * Starts recording audio to a file
 * @param {string} filePath - Path to save the recording
 * @param {AudioRecorder} recorder - Audio recorder instance
 * @returns {Object} - Object containing the recorder and file stream
 */
function startRecording(filePath = RECORDING_PATH, recorder = createAudioRecorder()) {
  // Create a file stream to save the recording
  const fileStream = fs.createWriteStream(filePath, { encoding: 'binary' });
  
  // Start the recording
  recorder.start().stream().pipe(fileStream);
  
  // Set up error handling
  recorder.stream().on('error', function(err) {
    console.error('Recording error:', err);
  });
  
  return {
    recorder,
    fileStream
  };
}

// Create a debug logger that shows all messages
const debugLogger = {
  debug: (...args) => console.debug('[DEBUG]', ...args),
  log: (...args) => console.log('[LOG]', ...args),
  info: (...args) => console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

/**
 * Starts recording audio with voice activity detection
 * @param {string} filePath - Path to save the recording
 * @param {number} silenceDuration - Duration of silence in seconds before stopping
 * @param {number} thresholdStart - Silence threshold to start recording (0.0-1.0)
 * @param {number} thresholdStop - Silence threshold to stop recording (0.0-1.0)
 * @param {boolean} debug - Whether to enable debug logging
 * @param {number} maxDuration - Maximum recording duration in seconds (0 = no limit)
 * @returns {Promise<Object>} - Promise that resolves with recording data when silence is detected
 */
function startRecordingWithVAD(
  filePath = RECORDING_PATH,
  silenceDuration = 2,
  thresholdStart = 0.1,
  thresholdStop = 0.1,
  debug = true,
  maxDuration = 10 // Default to 10 seconds max recording time
) {
  console.log(`Starting recording with VAD settings:
  - Silence Duration: ${silenceDuration} seconds
  - Threshold Start: ${thresholdStart} (lower = more sensitive to start)
  - Threshold Stop: ${thresholdStop} (lower = more sensitive to stop)
  
  Note: Thresholds range from 0.0 (most sensitive) to 1.0 (least sensitive)
  If recording stops too quickly: Increase thresholds (e.g., 0.3-0.5)
  If recording doesn't stop: Decrease thresholds (e.g., 0.05-0.1)
  `);
  
  // Reset the audio levels array at the start of each recording session
  startRecordingWithVAD.audioLevels = null;
  
  // Create a recorder with voice activity detection
  const recorder = createVADRecorder(
    silenceDuration, 
    thresholdStart, 
    thresholdStop, 
    true, // keepSilence
    debug ? debugLogger : quietLogger
  );
  
  // Log the actual SoX command that will be used
  if (debug) {
    // Calculate the adjusted thresholds that will be used
    const adjustedStart = Math.max(0.15, thresholdStart);
    const adjustedStop = Math.max(0.15, thresholdStop);
    
    console.log('Using SoX for voice activity detection with the following parameters:');
    console.log(`- Silence duration: ${silenceDuration} seconds`);
    console.log(`- Original threshold start: ${thresholdStart}, adjusted to: ${adjustedStart.toFixed(2)} (will be formatted as ${(adjustedStart * 100).toFixed(1)}%)`);
    console.log(`- Original threshold stop: ${thresholdStop}, adjusted to: ${adjustedStop.toFixed(2)} (will be formatted as ${(adjustedStop * 100).toFixed(1)}%)`);
    console.log('Note: SoX will stop recording after detecting silence for the specified duration');
  }
  
  // Create a file stream to save the recording
  const fileStream = fs.createWriteStream(filePath, { encoding: 'binary' });
  
  // Start the recording
  recorder.start().stream().pipe(fileStream);
  
  // Set up a timeout to stop recording after maxDuration seconds
  let timeoutId = null;
  if (maxDuration > 0) {
    timeoutId = setTimeout(() => {
      console.log(`Recording stopped after reaching maximum duration (${maxDuration} seconds)`);
      recorder.stop();
    }, maxDuration * 1000);
  }
  
  // Set up data monitoring to log audio levels and detect silence
  let dataCount = 0;
  let silenceStartTime = null;
  let isSilent = false;
  let lastLevel = 0;
  
  recorder.stream().on('data', function(chunk) {
    // Calculate average amplitude of the chunk as a rough indicator of volume
    const buffer = Buffer.from(chunk);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) {
      // Convert 16-bit PCM samples to amplitude values
      if (i + 1 < buffer.length) {
        const sample = buffer.readInt16LE(i);
        sum += Math.abs(sample);
      }
    }
    const avgAmplitude = sum / (buffer.length / 2);
    const normalizedLevel = avgAmplitude / 32768; // Normalize to 0-1 range
    lastLevel = normalizedLevel;
    
    // Only log every 10th chunk to avoid flooding the console
    if (debug && dataCount % 10 === 0) {
      console.log(`Audio level: ${normalizedLevel.toFixed(4)} (${avgAmplitude.toFixed(0)}/${32768})`);
    }
    dataCount++;
    
    // Keep track of audio levels to detect when user stops talking
    // We'll use a rolling average to smooth out the audio levels
    const rollingWindowSize = 5;
    
    // Initialize audioLevels as a static variable on the function
    if (!startRecordingWithVAD.audioLevels) {
      startRecordingWithVAD.audioLevels = Array(rollingWindowSize).fill(normalizedLevel);
    } else {
      // Add the new level to the array and remove the oldest one
      startRecordingWithVAD.audioLevels.push(normalizedLevel);
      if (startRecordingWithVAD.audioLevels.length > rollingWindowSize) {
        startRecordingWithVAD.audioLevels.shift();
      }
    }
    
    // Calculate the average level over the rolling window
    const avgLevel = startRecordingWithVAD.audioLevels.reduce((sum, level) => sum + level, 0) / 
                     startRecordingWithVAD.audioLevels.length;
    
    // Detect when the user stops talking
    // We consider it silence if the average level is below the threshold
    // This helps filter out background noise
    if (avgLevel < thresholdStop) {
      if (!isSilent) {
        // Start of silence
        isSilent = true;
        silenceStartTime = Date.now();
        if (debug) {
          console.log(`Silence detected (avg level: ${avgLevel.toFixed(4)}, threshold: ${thresholdStop})`);
        }
      } else if (silenceStartTime) {
        // Check if silence has lasted for the specified duration
        const silenceDurationMs = Date.now() - silenceStartTime;
        // Use a shorter silence duration (1 second) to end recording more quickly
        const endSilenceDuration = Math.min(1, silenceDuration);
        if (silenceDurationMs > endSilenceDuration * 1000) {
          // Silence has lasted for the specified duration
          if (debug) {
            console.log(`Silence lasted for ${(silenceDurationMs / 1000).toFixed(1)} seconds, stopping recording`);
          }
          // Stop the recording
          recorder.stop();
          // Clear any timeout to prevent double-stopping
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      }
    } else {
      // Not silent
      if (isSilent && debug) {
        console.log(`Silence ended (avg level: ${avgLevel.toFixed(4)}, threshold: ${thresholdStop})`);
      }
      isSilent = false;
      silenceStartTime = null;
    }
  });
  
  if (maxDuration > 0) {
    console.log(`Maximum recording duration: ${maxDuration} seconds`);
  }
  
  return new Promise((resolve, reject) => {
    // Set up error handling
    recorder.stream().on('error', function(err) {
      console.error('Recording error:', err);
      reject(err);
    });
    
    // Set up close handling (triggered when silence is detected)
    recorder.stream().on('close', function() {
      console.log('Recording stopped due to silence detection');
      
      // Wait a moment for the file to be fully written
      setTimeout(() => {
        // Check if the recording is valid
        if (validateRecording(filePath)) {
          resolve({ filePath });
        } else {
          reject(new Error('Invalid or empty recording'));
        }
      }, 1000);
    });
    
    // Set up end handling (alternative event that might be triggered)
    recorder.stream().on('end', function() {
      console.log('Recording ended');
      
      // Wait a moment for the file to be fully written
      setTimeout(() => {
        // Check if the recording is valid
        if (validateRecording(filePath)) {
          resolve({ filePath });
        } else {
          reject(new Error('Invalid or empty recording'));
        }
      }, 1000);
    });
    
    // Clear the timeout if the recording stops naturally
    recorder.stream().on('close', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });
    
    recorder.stream().on('end', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });
  });
}

/**
 * Stops recording audio
 * @param {AudioRecorder} recorder - Audio recorder instance
 * @returns {Promise} - Promise that resolves when recording is stopped
 */
function stopRecording(recorder) {
  return new Promise((resolve) => {
    recorder.stop();
    // Wait a moment for the file to be fully written
    setTimeout(() => resolve(), 1000);
  });
}

/**
 * Checks if a recording file exists and has content
 * @param {string} filePath - Path to the recording file
 * @returns {boolean} - True if the file exists and has content
 */
function validateRecording(filePath = RECORDING_PATH) {
  if (!fs.existsSync(filePath)) {
    console.error('Error: Recording file does not exist');
    return false;
  }
  
  const fileStats = fs.statSync(filePath);
  if (fileStats.size === 0) {
    console.error('Error: Recording file is empty');
    return false;
  }
  
  return true;
}

module.exports = {
  createAudioRecorder,
  createVADRecorder,
  startRecording,
  startRecordingWithVAD,
  stopRecording,
  validateRecording
};
