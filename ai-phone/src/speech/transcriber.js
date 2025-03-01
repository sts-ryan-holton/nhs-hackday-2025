/**
 * Speech transcription module for the AI Phone application
 */
const { pipeline } = require('@xenova/transformers');
const {
  convertWavToPcm,
  normalizeWavFile,
  convertPcmToFloat32,
  RECORDING_PATH,
  TEMP_RECORDING_PATH
} = require('../utils/fileUtils');

// Suppress console output from transformers
process.env.TF_CPP_MIN_LOG_LEVEL = '3'; // Suppress TensorFlow logs
process.env.TRANSFORMERS_VERBOSITY = 'error'; // Only show errors from transformers

let transcriber;

/**
 * Initializes the Whisper transcription model
 * @returns {Promise} - Promise that resolves when the model is loaded
 */
async function initializeTranscriber() {
  if (transcriber) {
    console.log('Transcriber already initialized, reusing existing model');
    return transcriber;
  }

  try {
    // Load the Whisper model from environment variable or default to small
    const modelName = process.env.WHISPER_MODEL || 'Xenova/whisper-small';
    
    console.log(`Loading Whisper model: ${modelName}...`);
    console.log('This may take some time, please be patient...');
    
    // Redirect stdout/stderr during pipeline creation to suppress warnings
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;
    process.stdout.write = () => true;
    process.stderr.write = () => true;
    
    try {
      console.log('Starting Whisper model download and initialization...');
      transcriber = await pipeline('automatic-speech-recognition', modelName);
      
      // Restore stdout/stderr
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
      
      console.log('Whisper model loaded successfully');
      return transcriber;
    } catch (pipelineError) {
      // Restore stdout/stderr
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
      
      console.error('Error creating Whisper pipeline:', pipelineError);
      throw pipelineError;
    }
  } catch (error) {
    console.error('Error loading Whisper model:', error);
    throw error;
  }
}

/**
 * Transcribes audio from a file
 * @param {string} recordingPath - Path to the recording file
 * @returns {Promise<string>} - Promise that resolves with the transcription text
 */
async function transcribeAudio(recordingPath = RECORDING_PATH) {
  try {
    // Make sure the transcriber is initialized
    if (!transcriber) {
      await initializeTranscriber();
    }
    
    // Normalize the WAV file
    normalizeWavFile(recordingPath, TEMP_RECORDING_PATH);
    
    // Convert to PCM and get the raw buffer
    const rawBuffer = convertWavToPcm(TEMP_RECORDING_PATH);
    
    // Convert to float32 array for the model
    const floatArray = convertPcmToFloat32(rawBuffer);
    
    // Transcribe the audio
    const transcription = await transcriber(floatArray, {
      language: process.env.LANGUAGE || 'english',
      task: 'transcribe',
      sampling_rate: 16000 // Specify the sampling rate in the options
    });
    
    if (transcription && transcription.text) {
      return transcription.text.trim();
    } else {
      console.log('No transcription text returned');
      return '';
    }
  } catch (error) {
    console.error('Error during transcription process:', error);
    throw error;
  }
}

module.exports = {
  initializeTranscriber,
  transcribeAudio
};
