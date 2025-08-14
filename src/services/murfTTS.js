// Murf AI TTS Service
class MurfTTSService {
  constructor() {
    this.apiKey = process.env.REACT_APP_MURF_API_KEY || '';
    this.baseUrl = 'https://api.murf.ai/v1';
    this.audioContext = null;
  }

  // Set API key
  setApiKey(key) {
    this.apiKey = key;
  }

  // Generate speech from text using browser speech synthesis (since Murf has CORS issues)
  async generateSpeech(text, options = {}) {
    if (!this.apiKey || this.apiKey === 'YOUR_MURF_API_KEY_HERE') {
      console.warn('⚠️ Murf API key not configured, using browser TTS');
    }

    // Always use browser TTS due to Murf CORS restrictions
    return this.generateBrowserTTS(text, options);
  }

  // Browser TTS implementation
  async generateBrowserTTS(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.speed || 0.9;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = 1.0;

      // Try to find a good English voice
      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Google')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      // Return a controller object instead of fake URL
      resolve({
        play: () => speechSynthesis.speak(utterance),
        pause: () => speechSynthesis.pause(),
        resume: () => speechSynthesis.resume(),
        stop: () => speechSynthesis.cancel(),
        onended: null,
        onpause: null,
        onplay: null,
        onerror: null
      });
    });
  }

  // Play audio from URL
  async playAudio(audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play();
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  }

  // Get available voices
  async getVoices() {
    if (!this.apiKey) {
      throw new Error('Murf API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Murf API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      throw error;
    }
  }
}

export default new MurfTTSService();
