import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import murfTTS from '../services/murfTTS';
import './EverydayConversation.css';

const EverydayConversation = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [stream, setStream] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Debug messages state changes
  useEffect(() => {
    console.log('🔄 Messages state updated:', {
      count: messages.length,
      messages: messages.map(m => ({ type: m.type, content: m.content.substring(0, 50) + '...' }))
    });
  }, [messages]);

  // WebSocket connection with token from localStorage
  useEffect(() => {
    console.log('🚀 EVERYDAY CONVERSATION COMPONENT MOUNTED');
    
    // Get token directly from localStorage since AuthContext might not have it
    const token = localStorage.getItem('access_token') || user?.token;
    
    console.log('🔍 Token check:', { 
      fromUser: user?.token?.substring(0, 10) + '...', 
      fromLocalStorage: token?.substring(0, 10) + '...',
      finalToken: token?.substring(0, 10) + '...' 
    });
    
    if (!token) {
      console.warn('❌ WebSocket BLOCKED: No token found');
      setError('Please log in to start chatting');
      return;
    }

    console.log('✅ Token found, initiating WebSocket connection...');
    console.log('🌐 Creating WebSocket connection...');
    
    const wsUrl = `ws://localhost:8000/ws/chat?token=${token}`;
    console.log('🔗 WebSocket URL:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    console.log('🔄 WebSocket object created:', ws);
    
    ws.onopen = () => {
      console.log('✅ WebSocket CONNECTED!');
      console.log('✅ WebSocket CONNECTED successfully!');
      setIsConnected(true);
      setError(null);
      
      // Don't add local welcome message - wait for backend welcome
      console.log('⏳ Waiting for backend welcome message...');
      
      // Send a greeting to trigger backend welcome
      ws.send(JSON.stringify({
        type: 'message',
        content: 'Hello'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received WebSocket message:', data);
        console.log('📊 Message type:', data.type);
        console.log('📝 Message content:', data.content);
        console.log('🔍 Complete message object:', JSON.stringify(data, null, 2));

        // Handle all possible message types from backend
        if (data.type === 'message' || data.type === 'response' || data.type === 'message') {
          console.log('💬 Processing AI response...');
          const aiMessage = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            content: data.content || data.text || data.message || 'No content received',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          console.log('🎯 Adding AI message to state:', aiMessage);
          setMessages(prev => {
            console.log('📊 Previous messages count:', prev.length);
            const newMessages = [...prev, aiMessage];
            console.log('📊 New messages count:', newMessages.length);
            return newMessages;
          });
          setIsTyping(false);
          
          // Automatically speak the AI response using Murf TTS only
          speakText(data.content || data.text || data.message);
        } else if (data.type === 'connection' || data.type === 'welcome') {
          console.log('🔗 Skipping connection message display (filtered)...');
          // Skip displaying connection/welcome messages to avoid duplicates
        } else if (data.type === 'ack' || data.type === 'typing') {
          console.log('⏳ Setting typing indicator...');
          setIsTyping(true);
        } else if (data.type === 'error') {
          console.error('❌ Processing server error:', data.content);
          setError(data.content || 'An error occurred');
          setIsTyping(false);
        } else {
          console.warn('⚠️ Unknown message type received:', data.type);
          // Try to display any content we can find
          if (data.content || data.text || data.message) {
            const unknownMessage = {
              id: `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'ai',
              content: data.content || data.text || data.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            console.log('🎯 Adding unknown message to state:', unknownMessage);
            setMessages(prev => [...prev, unknownMessage]);
            setIsTyping(false);
          }
        }
      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err);
        console.error('📄 Raw message data:', event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket DISCONNECTED:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      setIsConnected(false);
      
      console.log('🔄 Reconnection attempt scheduled...');
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket ERROR:', error);
      console.error('❌ Error type:', error.type);
      console.error('❌ Error target:', error.target);
      setError(`Connection error: ${error.type || 'Unknown error'}. Please check if the backend is running.`);
      setIsConnected(false);
    };

    console.log('🔄 Setting socket state...');
    setSocket(ws);
    console.log('✅ WebSocket setup complete');

    return () => {
      console.log('🧹 Cleaning up WebSocket connection...');
      if (ws) {
        ws.close();
        console.log('✅ WebSocket connection closed');
      }
    };
  }, [user, navigate]); // Only run on mount/unmount and when user changes

  // Initialize camera when component mounts
  useEffect(() => {
    initCamera();
    connectWebSocket();
    requestAudioPermissions();
    
    // Start hidden video recording
    startHiddenRecording();

    return () => {
      // Cleanup on unmount - upload video and stop recording
      stopHiddenRecordingAndUpload();
      if (socket) {
        socket.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());

        setError(null);
        setIsVideoLoading(true);
        
        console.log('📹 === CAMERA DEBUG START ===');
        console.log('📍 Current URL:', window.location.href);
        console.log('📍 Video ref exists:', !!videoRef.current);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported in this browser');
        }

        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: true
        };
        
        console.log('📋 Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('✅ Camera access granted');

        if (streamRef.current) {
          console.log('🧹 Cleaning up previous stream...');
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        streamRef.current = stream;
        setStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          try {
            await videoRef.current.play();
            console.log('▶️ Video playback started');
          } catch (playError) {
            console.error('❌ Video play error:', playError);
          }

          videoRef.current.onloadedmetadata = () => {
            console.log('🎬 Video ready - dimensions:', 
              videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          };
        }

        setIsVideoEnabled(true);
        console.log('🎉 Camera setup complete!');
        
      } catch (error) {
        console.error('❌ Camera setup failed:', error);
        
        let errorMessage = error.message;
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Camera permission denied. Please allow access in browser settings.';
            break;
          case 'NotFoundError':
            errorMessage = 'No camera found. Please check your device.';
            break;
          case 'NotReadableError':
            errorMessage = 'Camera is already in use by another app.';
            break;
          default:
            errorMessage = error.message;
        }
        
        setError(errorMessage);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      } finally {
        setIsVideoLoading(false);
      }
    };

    startVideo();

    return () => {
      if (streamRef.current) {
        console.log('🧹 Cleaning up camera on unmount...');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [user, isVideoEnabled, isVideoLoading]);

  const stopVideo = () => {
    console.log('🛑 Stopping video and audio...');
    
    if (isListening) {
      console.log('🎤 Stopping speech recognition...');
      stopListening();
    }
    
    if (stream) {
      console.log('🎬 Stopping video stream...');
      stream.getTracks().forEach(track => {
        console.log('🎬 Stopping track:', track.kind);
        track.stop();
      });
      setStream(null);
      setIsVideoEnabled(false);
      setTranscript(''); 
      console.log('✅ Video and audio stopped');
    } else {
      console.log('⚠️ No stream to stop');
    }
    
    navigate('/dashboard');
  };

  useEffect(() => {
    console.log('🎤 Setting up speech recognition...');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('❌ Speech recognition not supported in this browser');
      setError('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      console.log('🎤 Speech recognition started');
    };

    recognitionInstance.onresult = (event) => {
      console.log('🎤 Speech recognition result:', event);
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      console.log('📝 Final transcript:', finalTranscript);
      console.log('📝 Interim transcript:', interimTranscript);
      
      if (finalTranscript) {
        setTranscript(''); // Clear interim
        
        // Auto-send final transcript
        if (socket && socket.readyState === WebSocket.OPEN) {
          const newMessage = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'user',
            content: finalTranscript.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          setMessages(prev => [...prev, newMessage]);
          
          console.log('📤 Sending transcript to WebSocket:', finalTranscript.trim());
          socket.send(JSON.stringify({
            type: 'message',
            content: finalTranscript.trim()
          }));
        } else {
          console.warn('⚠️ WebSocket not ready for transcript:', socket?.readyState);
        }
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      
      let errorMessage = '';
      switch(event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Ready for your next input...';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not found or not working. Please check your microphone settings.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
          break;
        case 'network':
          errorMessage = 'Network error with speech recognition. Please check your connection.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
      
      // Don't auto-restart - let user control manually
      console.log('🔇 Speech recognition stopped - manual control available');
    };

    recognitionInstance.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
    console.log('✅ Speech recognition setup complete');
  }, [socket]);

  const startListening = async () => {
    console.log('🎤 Starting speech recognition...', { recognition, isListening });
    
    if (recognition && !isListening) {
      try {
        // Check microphone permissions first
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Release immediately
        
        // Check if already started to prevent race condition
        if (recognition.state === 'listening') {
          console.log('⚠️ Speech recognition already running');
          setIsListening(true);
          return;
        }
        
        recognition.start();
        setIsListening(true);
        setTranscript('');
        console.log('✅ Speech recognition started');
      } catch (err) {
        console.error('❌ Error starting speech recognition:', err);
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please check your device.');
        } else if (err.message.includes('already started')) {
          console.log('⚠️ Speech recognition already started, updating state');
          setIsListening(true);
        } else {
          setError(`Could not start speech recognition: ${err.message}`);
        }
      }
    } else {
      console.warn('⚠️ Cannot start speech recognition:', { hasRecognition: !!recognition, isListening });
    }
  };

  const stopListening = () => {
    console.log('🛑 Stopping speech recognition...');
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      console.log('✅ Speech recognition stopped');
    } else {
      console.log('⚠️ No active speech recognition to stop');
    }
  };

  // Text-to-speech function using Murf AI with pause/resume
  const speakText = async (text) => {
    if (!text || (isSpeaking && !isTTSPaused)) {
      console.log('TTS skipped:', { text, isSpeaking, isTTSPaused });
      return;
    }
    
    console.log('Starting auto TTS for:', text);
    setIsSpeaking(true);
    setIsTTSPaused(false);
    
    try {
      // Use browser speech synthesis (since Murf has CORS issues)
      console.log('🎯 Using browser speech synthesis with Murf-like configuration...');
      
      const ttsController = await murfTTS.generateSpeech(text, {
        voiceId: 'en-US-terrell',
        speed: 0.9,
        pitch: 0
      });
      
      console.log('✅ TTS controller created');
      const audio = ttsController;
      
      setCurrentAudio(audio);
      
      return new Promise((resolve, reject) => {
        // Set up event handlers for the TTS controller
        audio.onended = () => {
          console.log('TTS playback completed');
          setIsSpeaking(false);
          setCurrentAudio(null);
          resolve();
        };
        
        audio.onpause = () => {
          console.log('TTS paused');
          setIsTTSPaused(true);
        };
        
        audio.onplay = () => {
          console.log('TTS resumed');
          setIsTTSPaused(false);
        };
        
        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          setIsSpeaking(false);
          setCurrentAudio(null);
          reject(error);
        };
        
        // Start speech synthesis
        audio.play();
      });
      
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      setCurrentAudio(null);
      
      // Fallback to browser TTS
      await speakWithBrowserTTS(text);
    }
  };

  // Pause/Resume TTS
  const toggleTTSPause = () => {
    if (currentAudio) {
      if (isTTSPaused) {
        currentAudio.resume();
        setIsTTSPaused(false);
      } else {
        currentAudio.pause();
        setIsTTSPaused(true);
      }
    }
  };

  // Create browser TTS audio element
  const createBrowserTTSAudio = (text) => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Google')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      // Create a dummy audio element for pause/resume simulation
      const dummyAudio = {
        play: () => speechSynthesis.speak(utterance),
        pause: () => speechSynthesis.pause(),
        onended: null,
        onpause: null,
        onplay: null,
        onerror: null
      };

      utterance.onend = () => dummyAudio.onended && dummyAudio.onended();
      utterance.onpause = () => dummyAudio.onpause && dummyAudio.onpause();
      utterance.onresume = () => dummyAudio.onplay && dummyAudio.onplay();
      utterance.onerror = (event) => dummyAudio.onerror && dummyAudio.onerror(event);

      resolve(dummyAudio);
    });
  };

  // Browser TTS fallback
  const speakWithBrowserTTS = async (text) => {
    try {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Browser TTS fallback error:', error);
      setIsSpeaking(false);
    }
  };

  // Request audio permissions
  const requestAudioPermissions = async () => {
    try {
      console.log('Requesting audio permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Audio permissions granted');
      
      // Stop the stream immediately as we just need permission
      stream.getTracks().forEach(track => track.stop());
      
      // Test TTS
      const testUtterance = new SpeechSynthesisUtterance('Audio enabled! Ready to speak.');
      speechSynthesis.speak(testUtterance);
      
    } catch (error) {
      console.error('Failed to get audio permissions:', error);
      setError('Please allow microphone access for audio playback.');
    }
  };

  const handleSendMessage = () => {
    console.log('📤 Attempting to send message:', { inputMessage, socketReadyState: socket?.readyState });
    
    if (!inputMessage.trim()) {
      console.log('⚠️ Empty message, not sending');
      return;
    }
    
    if (!socket) {
      console.error('❌ No WebSocket connection');
      setError('No connection to server. Please refresh the page.');
      return;
    }
    
    if (socket.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not open:', socket.readyState);
      setError('Connection not ready. Please wait...');
      return;
    }
    
    const newMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    console.log('📤 Sending message:', newMessage);
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    
    try {
      socket.send(JSON.stringify({
        type: 'message',
        content: inputMessage.trim()
      }));
      console.log('✅ Message sent successfully');
    } catch (err) {
      console.error('❌ Error sending message:', err);
      setError(`Failed to send message: ${err.message}`);
    }
  };

  return (
    <div className="everyday-conversation">
      <div className="conversation-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="conversation-title">Everyday Conversation Practice</h1>
            <div className="connection-status">
              <div className="status-indicator">
                <div className={`status-dot ${isConnected ? '' : 'disconnected'} ${isConnected ? 'pulse' : ''}`}></div>
                <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
            </div>
          </div>
          <Link to="/dashboard" className="back-btn">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="layout-container">
        <div className="video-section">
          {/* Video element always exists in DOM for ref attachment */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="camera-feed enlarged"
            style={{ 
              display: isVideoEnabled ? 'block' : 'none',
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          
          {/* Placeholder overlay when video is not enabled */}
          {!isVideoEnabled && (
            <div className="video-placeholder">
              <div className="video-icon">📹</div>
              <h3>{isVideoLoading ? 'Starting Your Session...' : error ? 'Camera Error' : 'Camera Ready'}</h3>
              <p>
                {isVideoLoading 
                  ? 'Initializing camera and audio for your practice session'
                  : error || 'Camera ready - click to start'
                }
              </p>
              {isVideoLoading && (
                <div className="loading-container">
                  <div className="loading-spinner large"></div>
                  <p>Connecting...</p>
                </div>
              )}
              <button 
                className="retry-btn"
                onClick={startVideo}
                disabled={isVideoLoading}
              >
                {isVideoLoading ? 'Connecting...' : 'Start Camera'}
              </button>
              {!isVideoLoading && error && (
                <div style={{marginTop: '20px', fontSize: '12px', opacity: 0.7}}>
                  <p><strong>Debug Info:</strong></p>
                  <p>• URL: {window.location.href}</p>
                  <p>• HTTPS: {window.location.protocol === 'https:' ? 'Yes' : 'No (localhost OK)'}</p>
                  <p>• Browser: {navigator.userAgent}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Active video controls - only shown when video is enabled */}
          {isVideoEnabled && (
            <>
              {transcript && (
                <div className="transcript-display">
                  <div className="transcript-label">🎤 Listening:</div>
                  <div className="transcript-text">{transcript}</div>
                </div>
              )}
              <div className="video-controls">
                <button 
                  onClick={isListening ? stopListening : startListening} 
                  className={`control-btn ${isListening ? 'listening' : ''}`}
                  disabled={!isConnected}
                  title={isListening ? "Stop listening" : "Start listening"}
                >
                  {isListening ? '🛑 Stop' : '🎤 Listen'}
                </button>
                
                <button 
                  onClick={toggleTTSPause} 
                  className={`control-btn ${isSpeaking ? 'active' : ''} ${isTTSPaused ? 'paused' : ''}`}
                  title={isTTSPaused ? "Resume audio" : "Pause audio"}
                  style={{
                    display: isSpeaking || isTTSPaused ? 'flex' : 'none',
                    minWidth: '120px'
                  }}
                >
                  {isTTSPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                
                <button 
                  onClick={stopVideo} 
                  className="control-btn stop-btn"
                  title="End session"
                >
                  ✖️ End Session
                </button>
              </div>
            </>
          )}
        </div>

        <div className="chat-section">
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
                <div className="welcome-icon">💬</div>
                <h3>Start Chatting</h3>
                <p>Ask me anything about improving your communication!</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className={`avatar ${message.type}-avatar`}>
                  {message.type === 'user' ? '👤' : message.type === 'ai' ? '🤖' : 'ℹ️'}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">{message.timestamp}</div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message ai">
                <div className="avatar ai-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <div className="chat-input">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="message-input"
                disabled={!isConnected}
              />
              <button 
                onClick={handleSendMessage} 
                className="send-button enhanced"
                disabled={!isConnected || !inputMessage.trim()}
                title="Send message"
              >
                <span className="send-icon">📤</span>
                <span className="send-text">Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EverydayConversation;
