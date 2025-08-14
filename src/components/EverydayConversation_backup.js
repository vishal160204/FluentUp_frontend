import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const [recognition, setRecognition] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    if (!user?.token) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/chat?token=${user.token}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        if (data.type === 'message') {
          const aiMessage = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setIsTyping(false);
          
          // Automatically speak the AI response
          speakText(data.content);
        } else if (data.type === 'connection') {
          const systemMessage = {
            id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'system',
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, systemMessage]);
        } else if (data.type === 'ack') {
          setIsTyping(true);
        } else if (data.type === 'error') {
          setError(data.content);
          setIsTyping(false);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please refresh the page.');
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user?.token]);

  // Auto-start video
  useEffect(() => {
    const autoStartVideo = async () => {
      try {
        const permission = await navigator.permissions?.query({ name: 'camera' });
        if (permission?.state === 'granted') {
          await startVideo();
        }
      } catch (err) {
        console.log('Waiting for user action');
      }
    };
    autoStartVideo();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startVideo = async () => {
    setIsVideoLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsVideoEnabled(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    } finally {
      setIsVideoLoading(false);
    }
  };

  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsVideoEnabled(false);
    }
  };

  // Speech-to-text setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          
          // Auto-send final transcript
          if (socket && socket.readyState === WebSocket.OPEN) {
            const newMessage = {
              id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'user',
              content: finalTranscript.trim(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            setMessages(prev => [...prev, newMessage]);
            setTranscript('');
            
            socket.send(JSON.stringify({
              type: 'message',
              content: finalTranscript.trim()
            }));
          }
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech recognition not supported');
    }
  }, [socket]);

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
      setIsListening(true);
      setTranscript('');
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  // Text-to-speech function
  const speakText = async (text) => {
    if (!text || isSpeaking) {
      console.log('TTS skipped:', { text, isSpeaking });
      return;
    }
    
    console.log('Starting TTS for:', text);
    setIsSpeaking(true);
    
    try {
      // Check and request audio permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Audio permissions available');
        } catch (err) {
          console.warn('Audio permissions may be restricted:', err);
        }
      }

      // Use browser speech synthesis for immediate feedback
      if ('speechSynthesis' in window) {
        console.log('Using browser TTS');
        
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
          console.log('TTS started speaking');
        };
        
        utterance.onend = () => {
          console.log('TTS finished speaking');
          setIsSpeaking(false);
        };
        
        utterance.onerror = (event) => {
          console.error('TTS error:', event);
          setIsSpeaking(false);
        };
        
        speechSynthesis.speak(utterance);
      } else {
        console.warn('Speech synthesis not available');
        setIsSpeaking(false);
      }
      
    } catch (error) {
      console.error('TTS error:', error);
      setError('Could not play audio: ' + error.message);
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
    if (inputMessage.trim() && socket && socket.readyState === WebSocket.OPEN) {
      const newMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: inputMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      
      socket.send(JSON.stringify({
        type: 'message',
        content: inputMessage.trim()
      }));
    }
  };

  return (
    <div className="everyday-conversation">
      <div className="conversation-header">
        <h1>Everyday Conversation Practice</h1>
        <Link to="/dashboard" className="back-button">← Back to Dashboard</Link>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="conversation-layout">
        <div className="video-section">
          <div className="video-container">
            {!isVideoEnabled ? (
              <div className="video-placeholder">
                <div className="placeholder-icon">📹</div>
                <h3>Enable Camera</h3>
                <p>Start your camera to practice face-to-face communication</p>
                <button className="start-video-btn" onClick={startVideo}>
                  {isVideoLoading ? 'Starting...' : 'Start Camera'}
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="camera-feed"
                />
                {transcript && (
                  <div className="transcript-display">
                    <div className="transcript-label">Listening:</div>
                    <div className="transcript-text">{transcript}</div>
                  </div>
                )}
                {isSpeaking && (
                  <div className="speaking-indicator">
                    <div className="speaking-wave"></div>
                    <div className="speaking-wave"></div>
                    <div className="speaking-wave"></div>
                    <span>AI is speaking...</span>
                  </div>
                )}
                <div className="video-controls">
                  <button className="video-btn stop-btn" onClick={stopVideo}>
                    Stop Camera
                  </button>
                  <button 
                    className={`voice-btn ${isListening ? 'listening' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                    disabled={!isConnected}
                  >
                    {isListening ? 'Stop Listening' : 'Start Listening'}
                  </button>
                  <button 
                    className="video-btn" 
                    onClick={requestAudioPermissions}
                    style={{ backgroundColor: '#4CAF50', color: 'white' }}
                  >
                    Enable Audio
                  </button>
                </div>
              </>
            )}
          </div>
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

          <div className="chat-input-container">
            <div className="connection-status">
              {isConnected ? (
                <span className="status-connected">● Connected</span>
              ) : (
                <span className="status-disconnected">● Connecting...</span>
              )}
            </div>
            
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
                className="send-button"
                disabled={!isConnected || !inputMessage.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EverydayConversation;

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
  const [recognition, setRecognition] = useState(null);
  const [assemblyAIKey] = useState('dbe9ad8d414d4bc3bddc632a0b792274');
  const [murfAIKey] = useState('ap2_9ea9855c-f7d2-496c-963a-a09330dd2a9b');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-start video on component mount
  useEffect(() => {
    // Only auto-start if permissions are likely to be granted
    const autoStartVideo = async () => {
      try {
        // Check if permissions have been granted before
        const permission = await navigator.permissions?.query({ name: 'camera' });
        if (permission?.state === 'granted') {
          console.log('Camera permission already granted, auto-starting...');
          await startVideo();
        } else {
          console.log('Camera permission not yet granted, waiting for user action');
        }
      } catch (err) {
        console.log('Permissions API not supported, waiting for user action');
      }
    };
    
    autoStartVideo();
    
    return () => {
      // Cleanup video stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // WebSocket connection setup
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }

    const wsUrl = `ws://localhost:8000/ws/chat?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to Groq LLM backend');
      setIsConnected(true);
      setError(null);
      
      // Add welcome message from AI
      const welcomeMessage = {
        id: `welcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'ai',
        content: "Hello! I'm your AI communication coach. How can I help you improve your everyday conversation skills today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([welcomeMessage]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'response') {
          const aiMessage = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, aiMessage]);
          setIsTyping(false);
        } else if (data.type === 'message') {
          const aiMessage = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, aiMessage]);
          setIsTyping(false);
          // Automatically speak the AI response using Murf AI TTS
          speakText(data.content);
        } else if (data.type === 'connection') {
          const systemMessage = {
            id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'system',
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, systemMessage]);
        } else if (data.type === 'ack') {
          setIsTyping(true);
        } else if (data.type === 'error') {
          setError(data.content);
          setIsTyping(false);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      setIsTyping(false);
      
      if (!event.wasClean) {
        setError('Connection lost. Attempting to reconnect...');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please check if the backend is running.');
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Video camera setup
  const startVideo = async () => {
    try {
      setIsVideoLoading(true);
      console.log('Starting video...');
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      const constraints = { 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      };
      
      console.log('Requesting media with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Stream obtained:', mediaStream);
      console.log('Stream tracks:', mediaStream.getVideoTracks());
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        console.log('Setting video srcObject...');
        videoRef.current.srcObject = mediaStream;
        
        // Set up event listeners
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          
          videoRef.current.play().then(() => {
            console.log('Video playing successfully');
            setIsVideoLoading(false);
          }).catch(err => {
            console.error('Error playing video:', err);
            setError('Could not play video stream: ' + err.message);
            setIsVideoLoading(false);
          });
        };
        
        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
          setError('Video playback error occurred');
          setIsVideoLoading(false);
        };
        
        videoRef.current.onloadeddata = () => {
          console.log('Video data loaded');
        };
        
      } else {
        console.error('Video ref not available');
        setError('Video element not found');
        setIsVideoLoading(false);
      }
      
      setIsVideoEnabled(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsVideoLoading(false);
      
      let errorMessage = 'Could not access camera: ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Camera access denied. Please allow camera permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please ensure a camera is connected.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    }
  };

  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsVideoEnabled(false);
    }
  };

  // AssemblyAI Speech-to-Text setup
  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      setError('Speech recognition not supported in this browser');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
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

      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
        setTranscript(finalTranscript);
        
        // Send to chat via WebSocket
        sendMessageToChat(finalTranscript);
        
        // Reset transcript
        setTranscript('');
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError('Speech recognition error: ' + event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      setTranscript('');
    };

    return recognition;
  };

  const startListening = () => {
    if (!recognition) {
      const newRecognition = setupSpeechRecognition();
      if (newRecognition) {
        setRecognition(newRecognition);
        newRecognition.start();
      }
    } else {
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  const sendMessageToChat = (message) => {
    if (message.trim() && socket && socket.readyState === WebSocket.OPEN) {
      const newMessage = {
        id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: message.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Send to WebSocket
      socket.send(JSON.stringify({
        type: 'message',
        content: message.trim()
      }));
      
      setIsTyping(true);
    } else if (!isConnected) {
      setError('Not connected to AI. Please wait for connection or refresh the page.');
    }
  };

  // Enhanced TTS implementation with debugging
  const speakText = async (text) => {
    if (!text || isSpeaking) {
      console.log('TTS skipped - no text or already speaking:', { text, isSpeaking });
      return;
    }
    
    console.log('Starting TTS for text:', text);
    setIsSpeaking(true);
    
    try {
      // Check if user has granted audio permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Audio permissions granted');
        } catch (err) {
          console.warn('Audio permissions may not be granted:', err);
        }
      }

      // First, try browser speech synthesis as a quick test
      if ('speechSynthesis' in window) {
        console.log('Using browser speech synthesis for immediate feedback');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
          console.log('Browser TTS started');
        };
        
        utterance.onend = () => {
          console.log('Browser TTS finished');
          setIsSpeaking(false);
        };
        
        utterance.onerror = (event) => {
          console.error('Browser TTS error:', event);
          setIsSpeaking(false);
        };
        
        speechSynthesis.speak(utterance);
        return; // Skip Murf AI for now to ensure basic functionality
      }
      
      console.warn('Browser speech synthesis not available');
      setIsSpeaking(false);
      
    } catch (error) {
      console.error('TTS error:', error);
      setError('Could not play audio response: ' + error.message);
      setIsSpeaking(false);
    }
  };

  // Enhanced WebSocket message handler to include TTS
  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      
      if (data.type === 'message' && data.content) {
        const aiMessage = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'ai',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
        
        // Automatically speak the AI response
        speakText(data.content);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Request audio permissions
  const requestAudioPermissions = async () => {
    try {
      console.log('Requesting audio permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Audio permissions granted successfully');
      
      // Immediately stop the stream as we just need permission
      stream.getTracks().forEach(track => track.stop());
      
      // Test TTS with a simple message
      const testUtterance = new SpeechSynthesisUtterance('Audio permissions granted. Ready to speak!');
      speechSynthesis.speak(testUtterance);
      
    } catch (error) {
      console.error('Failed to get audio permissions:', error);
      setError('Please allow microphone access for audio playback. Click "Enable Audio" to grant permission.');
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && socket && socket.readyState === WebSocket.OPEN) {
      const newMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: inputMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      
      socket.send(JSON.stringify({
        type: 'message',
        content: inputMessage.trim()
      }));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="everyday-conversation">
      <header className="conversation-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="conversation-title">Everyday Conversation</h1>
            <div className="connection-status">
              <div className="status-indicator">
                <div className={`status-dot ${isConnected ? 'pulse' : 'disconnected'}`}></div>
              </div>
              <span className="status-text">
                {isConnected ? 'Connected to AI' : 'Connecting...'}
              </span>
            </div>
          </div>
          <Link to="/dashboard" className="back-btn">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        </div>
      )}

      <div className="conversation-container">
        <div className="layout-container">
          <div className="video-section">
            {!isVideoEnabled ? (
                </button>
                <button 
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={!isConnected}
                >
                  {isListening ? 'Stop Listening' : 'Start Listening'}
                </button>
                <button 
                  className="video-btn" 
                  onClick={requestAudioPermissions}
                  style={{ backgroundColor: '#4CAF50', color: 'white' }}
                >
                  Enable Audio
                </button>
              </div>
            </>
          )}
        </div>
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

        <div className="chat-input-container">
          <div className="connection-status">
            {isConnected ? (
              <span className="status-connected">● Connected</span>
            ) : (
              <span className="status-disconnected">● Connecting...</span>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EverydayConversation;
