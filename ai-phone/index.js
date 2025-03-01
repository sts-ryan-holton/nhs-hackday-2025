require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pipeline } = require('@xenova/transformers');
const AudioRecorder = require('node-audiorecorder');
const { KokoroTTS } = require('kokoro-js');
const player = require('play-sound')(opts = {});

// Load the node-wav package for WAV file processing
const wav = require('node-wav');

// File to save the recording
const FILE_PATH = './recording.wav';

// Initial setup message

// Suppress console output except for errors
const quietLogger = {
  debug: () => {},
  log: () => {},
  info: () => {},
  warn: () => {},
  error: console.error
};

// Create a new instance of AudioRecorder with different settings
const audioRecorder = new AudioRecorder({
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
}, quietLogger);

// Suppress console output from transformers
process.env.TF_CPP_MIN_LOG_LEVEL = '3'; // Suppress TensorFlow logs
process.env.TRANSFORMERS_VERBOSITY = 'error'; // Only show errors from transformers

// Initialize the transcriber and TTS (this will download the models on first run)
let transcriber;
let tts;
const initializeModels = async () => {
  try {
    // Load the Whisper model from environment variable or default to small
    const modelName = process.env.WHISPER_MODEL || 'Xenova/whisper-small';
    
    // Redirect stdout/stderr during pipeline creation to suppress warnings
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;
    process.stdout.write = () => true;
    process.stderr.write = () => true;
    
    transcriber = await pipeline('automatic-speech-recognition', modelName);
    
    // Initialize the TTS model
    console.log('Loading TTS model...');
    tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
      device: "cpu", // Using CPU for Node.js environment
    });
    
    // Restore stdout/stderr
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  } catch (error) {
    console.error('Error loading models:', error);
    process.exit(1);
  }
};

// Start the initialization process
initializeModels().then(() => {
  console.log('Press Ctrl+C to stop recording');
  
  // Start recording
  console.log('Recording... Speak into the microphone.');
  
  // Create a file stream to save the recording
  const fileStream = fs.createWriteStream(FILE_PATH, { encoding: 'binary' });
  
  // Start the recording
  audioRecorder.start().stream().pipe(fileStream);
  
// Monitor the recording stream
audioRecorder.stream().on('data', function(chunk) {
  // Recording in progress (no logging)
});
  
  // Log recording errors
  audioRecorder.stream().on('error', function(err) {
    console.error('Recording error:', err);
  });
  
  // Flag to prevent multiple SIGINT handler executions
  let isProcessing = false;
  
  // Handle stopping the recording
  process.on('SIGINT', async () => {
    // Prevent multiple executions
    if (isProcessing) return;
    isProcessing = true;
    
    console.log('\nStopping recording...');
    audioRecorder.stop();
    
    try {
      // Wait a moment for the file to be fully written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if the file exists and has content
      if (!fs.existsSync(FILE_PATH)) {
        console.error('Error: Recording file does not exist');
        process.exit(1);
      }
      
      const fileStats = fs.statSync(FILE_PATH);
      if (fileStats.size === 0) {
        console.error('Error: Recording file is empty');
        process.exit(1);
      }
      
      // Create a temporary file with proper WAV headers
      const tempFilePath = './temp_recording.wav';
      
      try {
        // Use ffmpeg with more explicit options to convert the recording to a properly formatted WAV file
        // Redirect output to /dev/null to suppress ffmpeg logs
        const { execSync } = require('child_process');
        execSync(`ffmpeg -y -f wav -i ${FILE_PATH} -acodec pcm_s16le -ar 16000 -ac 1 -f wav ${tempFilePath} 2>/dev/null`);
        
        // Create a raw PCM file for better compatibility
        const rawPcmFilePath = './raw_audio.pcm';
        execSync(`ffmpeg -y -i ${tempFilePath} -f s16le -acodec pcm_s16le -ar 16000 -ac 1 ${rawPcmFilePath} 2>/dev/null`);
        
        // Read the raw PCM data
        const rawBuffer = fs.readFileSync(rawPcmFilePath);
        
        // Convert the raw PCM data to float32 array
        const pcmData = new Int16Array(rawBuffer.buffer);
        const floatArray = new Float32Array(pcmData.length);
        
        // Normalize the audio data
        const INT16_MAX = 32767;
        for (let i = 0; i < pcmData.length; i++) {
          floatArray[i] = pcmData[i] / INT16_MAX;
        }
        
        // Transcribe the audio
        const transcription = await transcriber(floatArray, {
          language: process.env.LANGUAGE || 'english',
          task: 'transcribe',
          sampling_rate: 16000 // Specify the sampling rate in the options
        });
      
        if (transcription && transcription.text) {
          const transcriptionText = transcription.text;
          console.log('\nTranscription result:');
          console.log(transcriptionText);
          
          // Generate speech from the transcription
          console.log('\nGenerating speech from transcription...');
          try {
            // Use a specific voice (af_heart is recommended in the documentation)
            const audio = await tts.generate(transcriptionText, {
              voice: 'af_heart', // Using a specific voice
            });
            
            // Save the audio to a file
            const ttsOutputPath = './tts_output.wav';
            audio.save(ttsOutputPath);
            console.log(`TTS output saved to ${ttsOutputPath}`);
            
            // Play the audio through the speakers
            console.log('Playing TTS output through speakers...');
            player.play(ttsOutputPath, (err) => {
              if (err) {
                console.error('Error playing audio:', err);
              } else {
                console.log('Audio playback completed');
              }
              // Exit after playback is complete
              process.exit(0);
            });
            
            // Don't exit immediately, wait for audio playback
            return;
            
          } catch (error) {
            console.error('Error generating speech:', error);
          }
        } else {
          console.log('No transcription text returned');
        }
      } catch (error) {
        console.error('Error during transcription process:', error);
      }
      
    } catch (error) {
      console.error('Error during transcription process:', error);
      if (fs.existsSync(FILE_PATH)) {
        console.log('Problematic recording file saved for inspection');
      }
    }
    
    // Note: We don't exit here anymore, we exit after audio playback
    // The exit is handled in the audio playback callback
  });
});
