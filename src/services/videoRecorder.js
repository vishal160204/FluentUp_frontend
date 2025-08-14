// Video Recording Service for Interview Documentation
class VideoRecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.sessionId = null;
  }

  // Start hidden video recording with optional session ID
  async startRecording(providedSessionId = null) {
    try {
      console.log('🎥 Starting hidden video recording...');
      
      // Get camera stream without showing to user
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });

      this.recordedChunks = [];
      
      // Create MediaRecorder with optimal settings
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      };

      // Fallback for unsupported codecs
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('✅ Hidden recording started');
        this.isRecording = true;
      };

      this.mediaRecorder.onstop = () => {
        console.log('🛑 Hidden recording stopped');
        this.isRecording = false;
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every 1 second
      
      // Use provided session ID or generate new one
      if (providedSessionId) {
        this.sessionId = providedSessionId;
        console.log('🆔 Using provided session ID:', providedSessionId);
      } else {
        this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('🆔 Generated new session ID:', this.sessionId);
      }
      
      return this.sessionId;

    } catch (error) {
      console.error('❌ Failed to start hidden recording:', error);
      throw error;
    }
  }

  // Pause recording
  pauseRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
      console.log('⏸️ Recording paused');
    }
  }

  // Resume recording
  resumeRecording() {
    if (this.mediaRecorder && !this.isRecording) {
      this.mediaRecorder.resume();
      console.log('▶️ Recording resumed');
    }
  }

  // Stop recording and return blob
  stopRecording() {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { 
            type: 'video/webm' 
          });
          console.log(`📹 Recording completed: ${blob.size} bytes`);
          
          // Clean up stream
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
          }
          
          resolve(blob);
        };
        
        this.mediaRecorder.stop();
      } else {
        resolve(null);
      }
    });
  }

  // Upload video to interview analysis endpoint
  async uploadVideo(blob) {
    if (!blob || blob.size === 0) {
      console.warn('⚠️ No video data to upload');
      return null;
    }

    try {
      // Import apiService here to avoid circular dependencies
      const apiService = (await import('./api')).default;
      const token = apiService.getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('📤 Starting video upload process...');
      console.log('📊 Video blob size:', blob.size, 'bytes');
      console.log('🔑 Token present:', !!token);
      console.log('🆔 Session ID:', this.sessionId);

      const formData = new FormData();
      formData.append('file', blob, `interview-${this.sessionId}.webm`);
      
      console.log('📦 FormData created with file:', `interview-${this.sessionId}.webm`);

      const response = await fetch('http://localhost:8000/interview/analyze-video/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📡 Upload response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed details:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Video uploaded successfully:', result);
      console.log('🎯 Analysis ID:', result.analysis_id);
      return result;

    } catch (error) {
      console.error('❌ Video upload failed:', error);
      console.error('🔍 Error details:', error.message);
      throw error;
    }
  }

  // Check if recording is active
  isRecordingActive() {
    return this.isRecording;
  }

  // Get current session ID
  getSessionId() {
    return this.sessionId;
  }
}

// Export singleton instance
export const videoRecorder = new VideoRecorderService();
export default VideoRecorderService;
