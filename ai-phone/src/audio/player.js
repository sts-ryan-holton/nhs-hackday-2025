/**
 * Audio player module for the AI Phone application
 */
const player = require('play-sound')(opts = {});
const { TTS_OUTPUT_PATH } = require('../utils/fileUtils');

/**
 * Plays an audio file through the system speakers
 * @param {string} audioPath - Path to the audio file to play
 * @returns {Promise} - Promise that resolves when playback is complete
 */
function playAudio(audioPath = TTS_OUTPUT_PATH) {
  return new Promise((resolve, reject) => {
    console.log(`Playing audio from ${audioPath}...`);
    
    player.play(audioPath, (err) => {
      if (err) {
        console.error('Error playing audio:', err);
        reject(err);
      } else {
        console.log('Audio playback completed');
        resolve();
      }
    });
  });
}

module.exports = {
  playAudio
};
