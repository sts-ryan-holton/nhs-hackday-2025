# AI Phone - Speech to Text and Text to Speech Converter

A simple Node.js application that records audio from your microphone, converts it to text using a locally running Whisper model, and then converts the text back to speech using the kokoro-js TTS library. This application runs entirely on your device without sending data to external APIs.

## Prerequisites

- Node.js installed on your system
- SoX audio tool (required for audio recording)
  - On macOS: Install with `brew install sox`
  - On Linux: Install with `sudo apt-get install sox libsox-fmt-all`
  - On Windows: Download from [the SoX website](https://sourceforge.net/projects/sox/files/sox/)
- A media player that can play audio (for TTS output)

## Installation

1. Clone this repository or download the files
2. Install the required dependencies:

```bash
npm install
```

3. (Optional) Configure the Whisper model in the `.env` file:

```
# Options: Xenova/whisper-tiny, Xenova/whisper-base, Xenova/whisper-small, Xenova/whisper-medium
WHISPER_MODEL=Xenova/whisper-small
LANGUAGE=english
```

Note: The first time you run the application, it will download the selected Whisper model and the kokoro-js TTS model, which may take some time depending on your internet connection and the model sizes.

### Whisper Model Options

You can choose from different model sizes based on your needs:

- `Xenova/whisper-tiny` (~150MB): Fastest but least accurate
- `Xenova/whisper-base` (~290MB): Good balance for basic transcription
- `Xenova/whisper-small` (~970MB): Better accuracy, default option
- `Xenova/whisper-medium` (~3GB): Most accurate but requires more memory and processing power

The model will be downloaded automatically on first run and cached for future use.


## Usage

### Command-line Interface

1. Make sure SoX is installed on your system (see Prerequisites)

2. Start the application:

```bash
npm start
# or
node src/app.js
```

3. The application will start with a welcome message: "Hello! How can I help you today?"
4. Speak into your microphone
5. The application will automatically stop recording after detecting silence (2 seconds by default)
6. The application will transcribe your speech and display the text
7. The application will then convert the transcribed text back to speech using kokoro-js
8. The TTS output will be saved to a file and played through your speakers
9. The application will loop back to step 4 and continue until you say nothing (or the recording is too short)
10. You can press Ctrl+C at any time to exit the application

You can adjust the voice activity detection settings using command-line arguments:

```bash
# Adjust the threshold (0.0-1.0, higher values are less sensitive)
# Default is 0.01 which works well in most environments
npm start -- --threshold 0.03

# Change the silence duration in seconds (how long to wait before stopping)
npm start -- --silence 3

# Change the maximum recording duration in seconds (default: 10)
npm start -- --max-duration 15

# Disable the automatic timeout
npm start -- --no-timeout

# Disable debug logging
npm start -- --no-debug

# Combine multiple options
npm start -- --threshold 0.03 --silence 2.5 --max-duration 20 --no-debug
```

### TTS Performance Options

The application includes several optimizations to speed up the text-to-speech generation:

```bash
# Change the TTS quantization level (default: q4)
# Options: fp32, fp16, q8, q4, q4f16
# Lower precision (q4, q4f16) is faster but may have slightly lower quality
# Higher precision (fp32, fp16) is slower but may have better quality
npm start -- --tts-quantization q4f16

# Change the TTS model (default: onnx-community/Kokoro-82M-v1.0-ONNX)
# You can specify a different model if available
npm start -- --tts-model "your-model-name"

# Skip model initialization for faster startup
# This option skips the initial model loading, which can be useful for testing
# Note: The models will still be loaded when needed for speech generation
npm start -- --skip-model-init
```

The application also includes the following optimizations:

1. **GPU Acceleration**: Automatically detects and uses NVIDIA GPUs (CUDA) if available
2. **Speech Caching**: Common phrases and responses are cached to avoid regenerating the same speech multiple times
3. **Optimized Quantization**: Uses q4 quantization by default for a good balance of speed and quality
4. **Preloading Common Phrases**: Frequently used phrases are preloaded during initialization to eliminate generation delays
5. **Timeout Protection**: Model initialization has timeouts to prevent hanging if there are issues

The application will display the current audio levels to help you determine the appropriate threshold:
- If recording stops too quickly: Try a higher threshold (e.g., 0.03-0.05)
- If recording doesn't stop automatically: Try a lower threshold (e.g., 0.01-0.02)
- The threshold is converted to a percentage for SoX (e.g., 0.02 becomes 2%)

If voice activity detection doesn't work reliably in your environment, the application will automatically stop recording after the maximum duration (default: 10 seconds) to ensure it doesn't run indefinitely.

To use the legacy version (without the welcome message and infinite loop):

```bash
npm run start:legacy
# or
node index.js
```

### Troubleshooting

If you encounter the error `Error: spawn sox ENOENT`, it means SoX is not installed or not in your PATH. Make sure to install SoX as described in the Prerequisites section.

If you encounter audio processing errors, try modifying the audio settings in `index.js`:
```javascript
const audioRecorder = new AudioRecorder({
  program: 'sox', // Try 'rec' or 'arecord' depending on your system
  silence: 1.0,
  device: null, // You can specify a device if needed
  bits: 16,
  channels: 1,
  encoding: 'signed-integer',
  format: 'wav',
  rate: 16000,
  type: 'wav',
}, console);
```

Also make sure your microphone is properly connected and has the necessary permissions.

### Web Interface (Placeholder)

The application also includes a simple web interface. Note that this is currently a placeholder and doesn't yet implement the actual speech-to-text functionality.

1. Start the web server:

```bash
npm run web
# or
node server.js
```

2. Open your browser and navigate to http://localhost:3000

The web interface is designed to be extended in the future to provide a more user-friendly way to interact with the speech-to-text functionality.

## Claude API Integration

The application can optionally use the Claude API to process the transcribed text and generate more intelligent responses. To use this feature:

1. Sign up for an API key from Anthropic (https://www.anthropic.com/)
2. Add your API key to the `.env` file:
   ```
   CLAUDE_API_KEY=your_api_key_here
   ```
3. Customize the system prompt by editing the `prompt.txt` file in the root directory:
   ```
   You are a helpful AI assistant. Respond to the user's message in a concise and helpful manner.
   Your response will be spoken aloud, so keep it brief and clear.
   Always respond with a JSON object containing a 'response' field with your message.
   ```

You can enable or disable the Claude API integration using command-line arguments:
```bash
# Disable Claude API (use direct transcription-to-speech)
npm start -- --no-claude

# Enable Claude API (default)
npm start -- --use-claude
```

When Claude API is enabled, the application will:
1. Send the transcribed text to Claude as a JSON object
2. Claude will process the text and return a response
3. The response will be converted to speech and played back

If Claude API is disabled or encounters an error, the application will fall back to directly converting the transcription to speech.

## Conversation Context

The application now maintains conversation context between interactions, allowing Claude to remember previous exchanges in the conversation. This enables more natural and coherent multi-turn conversations.

### How It Works

1. The initial welcome message ("Hello! How can I help you today?") is included as the first assistant message in the conversation history.
2. Each user message and Claude's response is added to the conversation history.
3. When a new message is sent to Claude, the entire conversation history is included, allowing Claude to reference previous exchanges.

### Configuration

You can enable or disable the conversation context feature using command-line arguments:

```bash
# Disable conversation context (each interaction is independent)
npm start -- --no-context

# Enable conversation context (default)
npm start -- --use-context
```

When conversation context is enabled:
- Claude will remember previous exchanges and can refer back to them
- The conversation will feel more natural and coherent
- Claude can build on previous information provided by the user

When conversation context is disabled:
- Each interaction is treated as independent
- Claude will not remember previous exchanges
- This may be useful for stateless applications or when privacy is a concern

The conversation context is maintained only for the duration of the application's execution. When the application is restarted, a new conversation begins.

## How It Works

This application uses several key technologies:

1. **node-audiorecorder**: Records audio from your microphone using SoX
2. **node-wav**: Processes WAV audio files
3. **@xenova/transformers**: Runs the Whisper model locally in Node.js
4. **kokoro-js**: High-quality text-to-speech library for generating speech
5. **play-sound**: Plays audio files through your system's speakers
6. **axios**: Makes HTTP requests to the Claude API
7. **dotenv**: Manages environment variables for configuration

The audio processing pipeline:
1. Record audio from the microphone using SoX
2. Save the audio as a WAV file
3. Read and decode the WAV file
4. Convert the audio data to the format expected by the Whisper model
5. Transcribe the audio using the local Whisper model
6. Display the transcription
7. (Optional) Send the transcription to Claude API for processing
8. Generate speech from the transcription or Claude's response using kokoro-js
9. Save the generated speech to a file
10. Play the generated speech through your speakers


## License

ISC
