/**
 * Speech synthesis module for the AI Phone application
 */
const { KokoroTTS } = require('kokoro-js');
const { TTS_OUTPUT_PATH } = require('../utils/fileUtils');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let tts;
// Cache for storing generated speech
const speechCache = new Map();
// Directory for caching speech files
const CACHE_DIR = path.join(__dirname, '../../.tts_cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Detects if a compatible GPU is available
 * @returns {string} - 'cuda' for NVIDIA GPUs, 'cpu' otherwise
 */
function detectGPU() {
  try {
    // Check for NVIDIA GPU (CUDA)
    if (process.platform === 'linux' || process.platform === 'win32') {
      try {
        // Try to execute nvidia-smi to check for NVIDIA GPU
        require('child_process').execSync('nvidia-smi', { stdio: 'ignore' });
        console.log('NVIDIA GPU detected, using CUDA');
        return 'cuda';
      } catch (e) {
        // nvidia-smi failed, no NVIDIA GPU
      }
    }
    
    // Check for Apple Silicon (MPS) - but we'll use CPU for now since MPS is not supported
    if (process.platform === 'darwin') {
      const os = require('os');
      // Check if running on Apple Silicon
      if (os.cpus()[0].model.includes('Apple')) {
        console.log('Apple Silicon detected, but using CPU (MPS not supported)');
        return 'cpu';
      }
    }
    
    // Default to CPU
    console.log('No compatible GPU detected, using CPU');
    return 'cpu';
  } catch (error) {
    console.warn('Error detecting GPU, falling back to CPU:', error.message);
    return 'cpu';
  }
}

// Global configuration for TTS
let ttsConfig = {
  model: "onnx-community/Kokoro-82M-v1.0-ONNX",
  dtype: "q4"
};

/**
 * Sets the TTS configuration
 * @param {string} model - The model to use
 * @param {string} dtype - The quantization level to use
 */
function setTTSConfig(model, dtype) {
  if (model) {
    ttsConfig.model = model;
  }
  
  if (dtype) {
    const validQuantizations = ["fp32", "fp16", "q8", "q4", "q4f16"];
    if (validQuantizations.includes(dtype)) {
      ttsConfig.dtype = dtype;
    }
  }
  
  // If TTS is already initialized, we need to reinitialize it
  if (tts) {
    tts = null;
  }
}

/**
 * Initializes the TTS model
 * @param {string} model - Optional model to use, overrides ttsConfig
 * @param {string} dtype - Optional quantization level to use, overrides ttsConfig
 * @returns {Promise} - Promise that resolves when the model is loaded
 */
async function initializeTTS(model, dtype) {
  // Update config if parameters are provided
  if (model || dtype) {
    setTTSConfig(model, dtype);
  }
  
  if (tts) {
    console.log('TTS model already initialized, reusing existing model');
    return tts;
  }

  try {
    console.log('Loading TTS model...');
    
    // Detect if a compatible GPU is available
    console.log('Detecting GPU...');
    const device = detectGPU();
    
    console.log(`Using device: ${device}, model: ${ttsConfig.model}, dtype: ${ttsConfig.dtype}`);
    
    console.log('Starting model download and initialization...');
    console.log('This may take some time, please be patient...');
    
    try {
      tts = await KokoroTTS.from_pretrained(ttsConfig.model, {
        dtype: ttsConfig.dtype,
        device: device,
      });
      console.log('TTS model loaded successfully');
      return tts;
    } catch (initError) {
      console.error('Error during TTS model initialization:', initError);
      throw initError;
    }
  } catch (error) {
    console.error('Error loading TTS model:', error);
    // If there was an error with GPU, fall back to CPU
    if (error.message && (error.message.includes('CUDA') || error.message.includes('MPS'))) {
      console.log('Error with GPU acceleration, falling back to CPU');
      try {
        console.log('Attempting to load model with CPU...');
        tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
          dtype: "q4",
          device: "cpu",
        });
        console.log('TTS model loaded successfully with CPU fallback');
        return tts;
      } catch (cpuError) {
        console.error('Error loading TTS model with CPU fallback:', cpuError);
        throw cpuError;
      }
    }
    throw error;
  }
}

/**
 * Generates a hash for the text and voice to use as a cache key
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice to use for synthesis
 * @returns {string} - Hash string
 */
function generateCacheKey(text, voice) {
  return crypto.createHash('md5').update(`${text}_${voice}`).digest('hex');
}

/**
 * Generates speech from text
 * @param {string} text - Text to convert to speech
 * @param {string} outputPath - Path to save the generated audio
 * @param {string} voice - Voice to use for synthesis
 * @returns {Promise} - Promise that resolves when speech generation is complete
 */
async function generateSpeech(text, outputPath = TTS_OUTPUT_PATH, voice = 'bf_emma') {
  try {
    // Generate a cache key based on the text and voice
    const cacheKey = generateCacheKey(text, voice);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.wav`);
    
    // Check if we have a cached version
    if (fs.existsSync(cachePath)) {
      console.log(`Using cached speech for: "${text}"`);
      
      // Copy the cached file to the output path
      fs.copyFileSync(cachePath, outputPath);
      return outputPath;
    }
    
    // Make sure the TTS model is initialized
    if (!tts) {
      await initializeTTS();
    }
    
    console.log(`Generating speech from text: "${text}"`);
    
    // Generate speech from the text
    const audio = await tts.generate(text, {
      voice: voice, // Using a specific voice
    });
    
    // Save the audio to the output path
    audio.save(outputPath);
    
    // Also save to cache
    audio.save(cachePath);
    
    console.log(`TTS output saved to ${outputPath} and cached`);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}

/**
 * Preloads common phrases into the cache
 * @param {string} voice - Voice to use for synthesis
 * @returns {Promise} - Promise that resolves when all phrases are cached
 */
async function preloadCommonPhrases(voice = 'bf_emma') {
  const commonPhrases = [
    "Hello! How can I help you today?",
    "I'm sorry, I didn't understand that.",
    "Could you please repeat that?",
    "Thank you for your question.",
    "Is there anything else you'd like to know?",
    "I'll help you with that.",
    "Let me think about that.",
    "I'm processing your request.",
    "I'm sorry, I can't help with that.",
    "Goodbye, have a nice day!"
  ];
  
  console.log('Preloading common phrases to TTS cache...');
  
  try {
    // Make sure the TTS model is initialized
    if (!tts) {
      await initializeTTS();
    }
    
    // Generate and cache each phrase
    for (const phrase of commonPhrases) {
      const cacheKey = generateCacheKey(phrase, voice);
      const cachePath = path.join(CACHE_DIR, `${cacheKey}.wav`);
      
      // Skip if already cached
      if (fs.existsSync(cachePath)) {
        console.log(`Phrase already cached: "${phrase}"`);
        continue;
      }
      
      console.log(`Caching phrase: "${phrase}"`);
      
      // Generate speech from the phrase
      const audio = await tts.generate(phrase, {
        voice: voice,
      });
      
      // Save to cache
      audio.save(cachePath);
    }
    
    console.log('Preloading complete');
    return true;
  } catch (error) {
    console.error('Error preloading common phrases:', error);
    return false;
  }
}

module.exports = {
  initializeTTS,
  generateSpeech,
  preloadCommonPhrases,
  setTTSConfig
};
