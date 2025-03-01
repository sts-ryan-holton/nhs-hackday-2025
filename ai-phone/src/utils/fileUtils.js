/**
 * File utility functions for the AI Phone application
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// File paths
const RECORDING_PATH = './recording.wav';
const TEMP_RECORDING_PATH = './temp_recording.wav';
const RAW_AUDIO_PATH = './raw_audio.pcm';
const TTS_OUTPUT_PATH = './tts_output.wav';
const MIC_START_SOUND_PATH = './public/sounds/mic_start.wav';
const MIC_STOP_SOUND_PATH = './public/sounds/mic_stop.wav';

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Converts a WAV file to raw PCM format for better compatibility
 * @param {string} wavFilePath - Path to the WAV file
 * @param {string} outputPath - Path to save the PCM file
 * @returns {Buffer} - The raw PCM data buffer
 */
function convertWavToPcm(wavFilePath, outputPath = RAW_AUDIO_PATH) {
  try {
    // Use ffmpeg to convert WAV to raw PCM
    execSync(`ffmpeg -y -i ${wavFilePath} -f s16le -acodec pcm_s16le -ar 16000 -ac 1 ${outputPath} 2>/dev/null`);
    
    // Read the raw PCM data
    return fs.readFileSync(outputPath);
  } catch (error) {
    console.error('Error converting WAV to PCM:', error);
    throw error;
  }
}

/**
 * Normalizes a WAV file to ensure proper format for transcription
 * @param {string} inputPath - Path to the input WAV file
 * @param {string} outputPath - Path to save the normalized WAV file
 */
function normalizeWavFile(inputPath, outputPath = TEMP_RECORDING_PATH) {
  try {
    // Use ffmpeg with explicit options to convert the recording to a properly formatted WAV file
    execSync(`ffmpeg -y -f wav -i ${inputPath} -acodec pcm_s16le -ar 16000 -ac 1 -f wav ${outputPath} 2>/dev/null`);
    return true;
  } catch (error) {
    console.error('Error normalizing WAV file:', error);
    throw error;
  }
}

/**
 * Converts raw PCM data to a Float32Array for the Whisper model
 * @param {Buffer} rawBuffer - Raw PCM data buffer
 * @returns {Float32Array} - Normalized float array
 */
function convertPcmToFloat32(rawBuffer) {
  // Convert the raw PCM data to float32 array
  const pcmData = new Int16Array(rawBuffer.buffer);
  const floatArray = new Float32Array(pcmData.length);
  
  // Normalize the audio data
  const INT16_MAX = 32767;
  for (let i = 0; i < pcmData.length; i++) {
    floatArray[i] = pcmData[i] / INT16_MAX;
  }
  
  return floatArray;
}

module.exports = {
  RECORDING_PATH,
  TEMP_RECORDING_PATH,
  RAW_AUDIO_PATH,
  TTS_OUTPUT_PATH,
  MIC_START_SOUND_PATH,
  MIC_STOP_SOUND_PATH,
  ensureDirectoryExists,
  convertWavToPcm,
  normalizeWavFile,
  convertPcmToFloat32
};
