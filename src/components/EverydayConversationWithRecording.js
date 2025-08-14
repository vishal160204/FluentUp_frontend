
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import murfTTS from '../services/murfTTS';
import { videoRecorder } from '../services/videoRecorder';
import apiService from '../services/api';
import './EverydayConversation.css';

const EverydayConversationWithRecording = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [stream, setStream] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isListening, setIsListening] = useState(true); // Always-on listening
const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  // Track recognition running state to avoid InvalidStateError
  const recognitionRunningRef = useRef(false);
  // Refs for TTS state to avoid stale closure issues
  const isSpeakingRef = useRef(false);
  const currentAudioRef = useRef(null);
  
  // Voice Analysis Recording State
  const [isRecordingForAnalysis, setIsRecordingForAnalysis] = useState(false);
  const [analysisRecorder, setAnalysisRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [analysisId, setAnalysisId] = useState(null);
  const analysisRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  
  // Unified Session Management
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  
  // Smart Recording State
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isUploadingSession, setIsUploadingSession] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Generate unified session ID for both video and audio
  const generateSessionId = () => {
    const newSessionId = `conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    sessionIdRef.current = newSessionId;
    console.log('🆔 Generated unified session ID:', newSessionId);
    return newSessionId;
  };

  // Voice Analysis Recording Functions
  const startAnalysisRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Try to use WAV format, fallback to supported formats
      let mimeType = 'audio/wav';
      if (!MediaRecorder.isTypeSupported('audio/wav')) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = ''; // Let browser choose
        }
      }
      
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      recordedChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.start(1000); // Collect data every 1 second
      setAnalysisRecorder(recorder);
      analysisRecorderRef.current = recorder;
      setIsRecordingForAnalysis(true);
      
      console.log('🎙️ Voice analysis recording started');
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.warn('⚠️ Voice analysis recording permission denied - continuing without recording');
        setIsRecordingForAnalysis(false);
        // Don't show error to user, just continue without voice analysis
      } else {
        console.error('❌ Error starting analysis recording:', error);
        setIsRecordingForAnalysis(false);
      }
    }
  };
  
  const pauseAnalysisRecording = () => {
    if (analysisRecorderRef.current && analysisRecorderRef.current.state === 'recording') {
      try {
        analysisRecorderRef.current.pause();
        setIsRecordingPaused(true);
        console.log('⏸️ Audio recording paused for TTS');
      } catch (error) {
        console.warn('⚠️ Could not pause recording:', error);
      }
    }
  };
  
  const resumeAnalysisRecording = () => {
    if (analysisRecorderRef.current && analysisRecorderRef.current.state === 'paused') {
      try {
        analysisRecorderRef.current.resume();
        setIsRecordingPaused(false);
        console.log('▶️ Audio recording resumed after TTS');
      } catch (error) {
        console.warn('⚠️ Could not resume recording:', error);
      }
    }
  };
  
  const stopAnalysisRecording = async () => {
    return new Promise((resolve) => {
      if (analysisRecorderRef.current && analysisRecorderRef.current.state !== 'inactive') {
        analysisRecorderRef.current.onstop = () => {
          console.log('🛑 Voice analysis recording stopped');
          setIsRecordingForAnalysis(false);
          resolve();
        };
        analysisRecorderRef.current.stop();
        
        // Stop all tracks
        if (analysisRecorderRef.current.stream) {
          analysisRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      } else {
        resolve();
      }
    });
  };
  
  const sendAnalysisRecording = async () => {
    if (recordedChunksRef.current.length === 0) {
      console.warn('⚠️ No audio recorded for analysis');
      return null;
    }
    
    try {
      // Create blob with appropriate MIME type
      let mimeType = 'audio/wav';
      let fileExtension = 'wav';
      
      // Check what format was actually recorded
      if (analysisRecorderRef.current && analysisRecorderRef.current.mimeType) {
        const recordedMimeType = analysisRecorderRef.current.mimeType;
        if (recordedMimeType.includes('webm')) {
          mimeType = 'audio/webm';
          fileExtension = 'ogg'; // Convert webm to ogg for backend compatibility
        } else if (recordedMimeType.includes('mp4')) {
          mimeType = 'audio/mp4';
          fileExtension = 'm4a';
        }
      }
      
      const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
      const formData = new FormData();
      
      // Use unified session ID for consistent session tracking
      const currentSessionId = sessionIdRef.current || sessionId || `conversation-${Date.now()}`;
      formData.append('file', audioBlob, `${currentSessionId}.${fileExtension}`);
      formData.append('session_id', currentSessionId);
      
      console.log('🎤 Uploading audio with session ID:', currentSessionId);
      
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/interview/analyze-audio/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnalysisId(result.analysis_id);
        console.log('✅ Voice analysis submitted:', result.analysis_id);
        return result.analysis_id;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to submit voice analysis:', response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error sending analysis recording:', error);
      return null;
    }
  };

  // Always-on listening effect
  useEffect(() => {
    if (recognition && !isListening) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        // Already started
      }
    }
  }, [recognition, isListening]);

  // Auto-pause/resume video logic
  const toggleVideoPause = () => {
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length) {
      if (isVideoPaused) {
        videoTracks.forEach(track => track.enabled = true);
        setIsVideoPaused(false);
      } else {
        videoTracks.forEach(track => track.enabled = false);
        setIsVideoPaused(true);
      }
    }
  };

  // TTS Control Function
  const toggleTTSPause = () => {
    const currentAudio = currentAudioRef.current;
    if (!currentAudio || !isSpeaking) {
      console.warn('⚠️ No TTS audio currently playing');
      return;
    }

    try {
      if (isTTSPaused) {
        currentAudio.resume();
        setIsTTSPaused(false);
        console.log('▶️ TTS resumed by user');
      } else {
        currentAudio.pause();
        setIsTTSPaused(true);
        console.log('⏸️ TTS paused by user');
      }
    } catch (error) {
      console.error('❌ Error controlling TTS:', error);
    }
  };

  // End session logic with loading state and audio upload
  const stopVideoAndEndSession = async () => {
    try {
      // Start loading state
      setIsUploadingSession(true);
      setUploadProgress('Ending session...');
      
      // Stop and submit voice analysis recording
      if (isRecordingForAnalysis && recordedChunksRef.current.length > 0) {
        console.log('🎤 Stopping voice analysis recording...');
        setUploadProgress('Stopping audio recording...');
        await stopAnalysisRecording();
        
        console.log('📊 Submitting complete audio session for analysis...');
        setUploadProgress('Uploading audio for analysis...');
        const analysisId = await sendAnalysisRecording();
        
        if (analysisId) {
          setUploadProgress('Analysis submitted successfully!');
          console.log('✅ Session audio uploaded and analysis started:', analysisId);
          
          // Brief success message before navigation
          setTimeout(() => {
            setUploadProgress('Redirecting to dashboard...');
            setTimeout(() => {
              navigate('/dashboard');
            }, 1000);
          }, 1500);
        } else {
          setUploadProgress('Upload failed. Redirecting...');
          console.error('❌ Audio upload failed');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } else {
        // No recording or no audio recorded
        console.log('📊 No voice analysis to submit (recording not active or no audio)');
        setUploadProgress('No audio to upload. Ending session...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
      
      // Stop video recording
      await stopVideo();
      
    } catch (error) {
      console.error('❌ Error during session end:', error);
      setUploadProgress('Error ending session. Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  };

  useEffect(() => {
    // Disable browser speech synthesis to prevent conflicts
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('🔇 Browser speech synthesis disabled');
    }
    
    console.log('🎯 EVERYDAY CONVERSATION COMPONENT MOUNTING...');
    console.log('📍 Current pathname:', window.location.pathname);
    console.log('👤 User object:', user);
    
    const initAll = async () => {
      console.log('🚀 Initializing all components...');
      
      try {
        // Generate unified session ID for this conversation session
        const currentSessionId = generateSessionId();
        
        // Initialize camera first
        await initCamera();
        
        // Start voice analysis recording (hidden from user)
        await startAnalysisRecording();
        
        // Start hidden video recording with unified session ID
        try {
          await videoRecorder.startRecording(currentSessionId);
          console.log('🎥 Hidden video recording started with session ID:', currentSessionId);
        } catch (error) {
          console.error('❌ Failed to start hidden video recording:', error);
        }
        
        console.log('✅ All components initialized successfully with session ID:', currentSessionId);
        console.log('🔌 WebSocket connection will be handled by useEffect hook');
      } catch (error) {
        console.error('❌ Failed to initialize components:', error);
        setError('Failed to initialize session components. Please refresh and try again.');
      }
    };

    initAll();
  }, []);
    
  // WebSocket connection with bulletproof single connection
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  
  useEffect(() => {
    // Bulletproof guard: prevent any new connections
    if (connectionAttempted || socketRef.current) {
      console.log('🛡️ WebSocket connection already attempted/processing');
      return;
    }
    
    setConnectionAttempted(true);

    // Guard: Check for token
    const token = apiService.getToken();
    if (!token) {
      console.log('❌ No JWT token found, cannot connect WebSocket');
      setError('Authentication required');
      setConnectionAttempted(false);
      return;
    }

    console.log('🔄 Creating single WebSocket connection...');
    const wsUrl = `ws://localhost:8000/ws/chat?token=${token}`;
    console.log('🔗 WebSocket URL:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setSocket(ws);
    
    ws.onopen = () => {
      console.log('✅ WebSocket CONNECTED!');
      setIsConnected(true);
      setError(null);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received WebSocket message:', data);

        // Handle all message types with bulletproof TTS control
        if (data.type === 'connection') {
          // Global guard to prevent duplicate TTS
          if (window._welcomeTTSCompleted) {
            console.log('🛡️ Welcome TTS already completed globally');
            return;
          }
          
          const welcomeMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: data.message || 'Hello! I\'m here to help you improve your communication skills. How can I assist you today?',
            timestamp: new Date().toLocaleTimeString()
          };
          
          // Check if message already exists
          setMessages(prev => {
            const hasWelcome = prev.some(msg => 
              msg.type === 'ai' && 
              (msg.content.toLowerCase().includes('hello') || msg.content.toLowerCase().includes('welcome'))
            );
            
            if (hasWelcome) {
              console.log('🔄 Welcome message already displayed');
              return prev;
            }
            
            // Global TTS lock
            if (!window._welcomeTTSCompleted) {
              console.log('🔊 Speaking welcome message (global lock)...');
              speakText(welcomeMessage.content);
              window._welcomeTTSCompleted = true;
            }
            return [...prev, welcomeMessage];
          });
          return;
        }
        
        // Handle AI responses (including text_message and any other types)
        if (data.type === 'text_message' || data.type === 'message' || data.type === 'response') {
          const content = data.message || data.content || data.text;
          if (!content) {
            console.log('⚠️ Empty message content received');
            return;
          }
          
          // Stop any ongoing TTS before playing new message (using refs to avoid stale closure)
          if (isSpeakingRef.current && currentAudioRef.current) {
            console.log('🛑 Stopping previous TTS for new message...');
            try {
              speechSynthesis.cancel();
              if (currentAudioRef.current.stop) {
                currentAudioRef.current.stop();
              }
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              setCurrentAudio(null);
              currentAudioRef.current = null;
              setIsTTSPaused(false);
              console.log('✅ Previous TTS stopped for new message');
            } catch (e) {
              console.warn('⚠️ Could not stop previous TTS:', e);
            }
          }
          
          const aiMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: content,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setIsTyping(false);
          
          console.log('🔊 Speaking AI response...');
          speakText(aiMessage.content);
          return;
        }
        
        // Handle typing indicators
        if (data.type === 'typing_start') {
          setIsTyping(true);
          return;
        }
        
        if (data.type === 'typing_stop') {
          setIsTyping(false);
          return;
        }
        
        console.log('📋 Unknown message type:', data.type, data);
        
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error);
      }
    };
    
    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      socketRef.current = null;
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('Connection error. Please refresh the page.');
    };

    return () => {
      console.log('🧹 Cleaning up WebSocket connection and TTS...');
      
      // Stop any ongoing TTS immediately
      if (currentAudioRef.current) {
        try {
          console.log('🔇 Stopping TTS on component unmount');
          if (currentAudioRef.current.stop) {
            currentAudioRef.current.stop();
          }
          if (currentAudioRef.current.pause) {
            currentAudioRef.current.pause();
          }
          currentAudioRef.current = null;
        } catch (error) {
          console.warn('⚠️ Error stopping TTS on unmount:', error);
        }
      }
      
      // Also stop browser speech synthesis as fallback
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          console.log('🔇 Browser speech synthesis cancelled');
        } catch (error) {
          console.warn('⚠️ Error cancelling speech synthesis:', error);
        }
      }
      
      // Reset TTS state
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setCurrentAudio(null);
      setIsTTSPaused(false);
      
      // Close WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, 'Component unmounting');
      }
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionAttempted(false);
      
      // Clean up global TTS flag
      if (window._welcomeTTSCompleted) {
        delete window._welcomeTTSCompleted;
      }
      
      console.log('✅ Component cleanup completed - TTS and WebSocket stopped');
    };
  }, []);

  const initCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsVideoEnabled(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      setError('Camera access denied or not available');
    }
  };

  const stopVideo = async () => {
    console.log('🛑 Stopping session and uploading video...');
    
    // Stop and upload video first
    try {
      const videoBlob = await videoRecorder.stopRecording();
      if (videoBlob) {
        console.log('📤 Uploading hidden video for analysis...');
        const result = await videoRecorder.uploadVideo(videoBlob);
        console.log('✅ Video uploaded successfully for analysis:', result);
      }
    } catch (error) {
      console.error('❌ Failed to upload video:', error);
    }
    
    // Then stop other resources
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsVideoEnabled(false);
    }
    
    if (socket) {
      socket.close();
    }
    if (isListening) {
      stopListening();
    }
    
    navigate('/dashboard');
  };

  // Speech recognition setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('❌ Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      recognitionRunningRef.current = true;
      setIsListening(true);
      console.log('🎤 Speech recognition started');
    };

    recognitionInstance.onresult = (event) => {
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

      // --- USER INTERRUPTION: Allow interruption when user actually speaks ---
      if (finalTranscript || interimTranscript.trim()) {
        console.log('🛑 Speech detected:', { finalTranscript, interimTranscript, isSpeaking });
        
        // Allow user to interrupt TTS if they are actually speaking
        // Use finalTranscript (completed speech) as primary indicator of user intent
        if (finalTranscript && isSpeaking && currentAudio) {
          console.log('🛑 User speech completed - interrupting TTS...');
          try {
            // Stop TTS immediately
            speechSynthesis.cancel();
            
            if (currentAudio && currentAudio.stop) {
              currentAudio.stop();
            }
            
            // Clear TTS state
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setCurrentAudio(null);
            currentAudioRef.current = null;
            setIsTTSPaused(false);
            
            // Resume STT for continued listening
            if (recognition && !recognitionRunningRef.current) {
              try {
                recognition.start();
                recognitionRunningRef.current = true;
                setIsListening(true);
                console.log('🎤 Resumed STT after user interruption');
              } catch (e) {
                console.warn('⚠️ Could not resume STT:', e);
              }
            }
            
            console.log('✅ TTS interrupted by user speech');
          } catch (e) {
            console.warn('⚠️ Error stopping TTS:', e);
          }
        }
      }

      if (finalTranscript) {
        setInputMessage(finalTranscript);
        setTranscript('');
        setIsListening(false);
        
        // Use setTimeout to ensure we get the latest socket reference
        setTimeout(() => {
          const currentSocket = socketRef.current;
          if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            const userMessage = {
              id: `user-${Date.now()}`,
              type: 'user',
              content: finalTranscript,
              timestamp: new Date().toLocaleTimeString()
            };
            
            // Add to messages
            setMessages(prev => [...prev, userMessage]);
            
            // Send to WebSocket
            console.log('📤 Sending to WebSocket:', { type: 'message', content: finalTranscript });
            currentSocket.send(JSON.stringify({
              type: 'message',
              content: finalTranscript
            }));
            
            console.log('✅ Auto-sent transcribed speech:', finalTranscript);
            setInputMessage(''); // Clear input after sending
          } else {
            console.log('❌ WebSocket not ready:', currentSocket?.readyState);
          }
        }, 0);
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognitionInstance.onerror = (event) => {
      recognitionRunningRef.current = false;
      console.error('❌ Speech recognition error:', event.error);
      setIsListening(false);
      
      // Don't auto-restart on permission errors to prevent infinite loop
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        console.warn('⚠️ Speech recognition permission denied - stopping auto-restart');
        setError('Microphone permission denied. Please enable microphone access to use voice features.');
        return;
      }
      
      // Don't auto-restart on network errors
      if (event.error === 'network') {
        console.warn('⚠️ Speech recognition network error - stopping auto-restart');
        setError('Network error with speech recognition. Please check your connection.');
        return;
      }
      
      // Only auto-restart for recoverable errors
      if (event.error === 'aborted' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (!recognitionRunningRef.current) {
            try {
              recognitionInstance.start();
            } catch (e) {
              console.warn('Speech recognition auto-restart failed:', e);
            }
          }
        }, 1000);
      }
    };

    recognitionInstance.onend = () => {
      recognitionRunningRef.current = false;
      setIsListening(false);
      // Auto-restart for continuous listening
      setTimeout(() => {
        if (!recognitionRunningRef.current) {
          try {
            recognitionInstance.start();
            // recognitionRunningRef.current will be set in onstart
          } catch (e) {
            console.warn('Speech recognition auto-restart failed:', e);
          }
        }
      }, 400);
    };

    setRecognition(recognitionInstance);
    // Start recognition automatically for always-on listening
    if (!recognitionRunningRef.current) {
      try {
        recognitionInstance.start();
        // recognitionRunningRef.current will be set in onstart
        console.log('🎤 Speech recognition started (auto mode)');
      } catch (e) {
        console.warn('Speech recognition could not be started automatically:', e);
      }
    }
  }, []);

  

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      try {
        console.log('🛑 Attempting to stop speech recognition...');
        recognition.stop();
        setIsListening(false);
        console.log('✅ Speech recognition stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping speech recognition:', error);
        setIsListening(false);
      }
    }
  }, [recognition, isListening]);

  // Text-to-speech function
  const speakText = async (text) => {
  if (isSpeaking) {
    return;
  }

  setIsSpeaking(true);
  isSpeakingRef.current = true;
  setIsTTSPaused(false);

  // --- PAUSE STT before TTS playback ---
  if (recognition && recognitionRunningRef.current) {
    try {
      console.log('🛑 Pausing STT for TTS playback...');
      recognition.stop();
      recognitionRunningRef.current = false;
      setIsListening(false);
    } catch (e) {
      console.warn('⚠️ Could not pause STT before TTS:', e);
    }
  }
  
  // --- PAUSE ANALYSIS RECORDING during TTS ---
  if (isRecordingForAnalysis) {
    pauseAnalysisRecording();
  }

  try {
    console.log('🎯 Using Murf AI TTS...');
    const ttsController = await murfTTS.generateSpeech(text, {
      voiceId: 'en-US-terrell',
      speed: 0.9,
      pitch: 0
    });
    console.log('✅ TTS controller created');
    setCurrentAudio(ttsController);
    currentAudioRef.current = ttsController;

    return new Promise((resolve) => {
      ttsController.onended = () => {
        console.log('TTS playback completed');
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setCurrentAudio(null);
        currentAudioRef.current = null;
        // --- RESUME STT after TTS playback ---
        if (recognition && !recognitionRunningRef.current) {
          try {
            recognition.start();
            recognitionRunningRef.current = true;
            setIsListening(true);
            console.log('🎤 Resumed STT after TTS playback');
          } catch (e) {
            console.warn('⚠️ Could not resume STT after TTS:', e);
          }
        }
        
        // --- RESUME ANALYSIS RECORDING after TTS ---
        if (isRecordingForAnalysis) {
          resumeAnalysisRecording();
        }
        resolve();
      };
      ttsController.onpause = () => {
        console.log('TTS paused');
        setIsTTSPaused(true);
      };
      ttsController.onresume = () => {
        console.log('TTS resumed');
        setIsTTSPaused(false);
      };
      ttsController.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setCurrentAudio(null);
        currentAudioRef.current = null;
        // Attempt to resume STT even on error
        if (recognition && !recognitionRunningRef.current) {
          try {
            recognition.start();
            recognitionRunningRef.current = true;
            setIsListening(true);
            console.log('🎤 Resumed STT after TTS error');
          } catch (e) {
            console.warn('⚠️ Could not resume STT after TTS error:', e);
          }
        }
      };
      ttsController.play();
    });
  } catch (error) {
    console.error('❌ TTS error:', error);
    setIsSpeaking(false);
    // Attempt to resume STT if TTS fails
    if (recognition && !recognitionRunningRef.current) {
      try {
        recognition.start();
        recognitionRunningRef.current = true;
        setIsListening(true);
        console.log('🎤 Resumed STT after TTS failure');
      } catch (e) {
        console.warn('⚠️ Could not resume STT after TTS failure:', e);
      }
    }
  }
};



  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || !socket || !isConnected) return;

    // Stop any ongoing TTS when user sends a message
    if (isSpeaking && currentAudio) {
      console.log('🛑 Stopping TTS due to user message send...');
      try {
        if (currentAudio.stop) {
          currentAudio.stop();
        } else {
          speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setCurrentAudio(null);
        currentAudioRef.current = null;
        setIsTTSPaused(false);
        console.log('✅ TTS stopped for user message');
      } catch (e) {
        console.warn('⚠️ Could not stop TTS:', e);
      }
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    
    socket.send(JSON.stringify({
      type: 'message',
      content: inputMessage.trim()
    }));

    setInputMessage('');
    setTranscript('');
  }, [inputMessage, socket, isConnected]);

  
  const requestAudioPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Audio permissions granted');
    } catch (error) {
      console.warn('⚠️ Audio permissions denied:', error);
    }
  };

  return (
    <div className="everyday-conversation">
      <div className="conversation-container">
        <div className="video-section">
          <div className="video-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="video-feed"
              style={{ display: isVideoEnabled ? 'block' : 'none' }}
            />
            {!isVideoEnabled && (
              <div className="video-placeholder">
                <div className="placeholder-icon">📹</div>
                <p>Camera initializing...</p>
              </div>
            )}
          </div>

          {/* Combined horizontal button controls */}
          <div className="video-controls-container">
            {isVideoEnabled && (
              <button
                onClick={toggleVideoPause}
                className="pause-camera-btn"
                title={isVideoPaused ? "Resume Video" : "Pause Video"}
              >
                {isVideoPaused ? (
                  <span>▶️ Resume</span>
                ) : (
                  <span>⏸️ Pause</span>
                )}
              </button>
            )}
            
            {/* TTS Control Button */}
            <button
              onClick={toggleTTSPause}
              className="tts-control-btn"
              title={isTTSPaused ? "Resume AI Speech" : "Pause AI Speech"}
              disabled={!isSpeaking}
            >
              {isTTSPaused ? (
                <span>🔊 Resume</span>
              ) : (
                <span>🔇 Pause</span>
              )}
            </button>
            
            <button
              onClick={stopVideoAndEndSession}
              className="end-session-btn"
              title="End session"
            >
              ✖️ End Session
            </button>
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

          <div className="input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                // Stop TTS when user starts typing
                if (e.target.value && isSpeaking && currentAudio) {
                  console.log('🛑 User typing detected - stopping TTS...');
                  try {
                    if (currentAudio.stop) {
                      currentAudio.stop();
                    } else {
                      speechSynthesis.cancel();
                    }
                    setIsSpeaking(false);
                    isSpeakingRef.current = false;
                    setCurrentAudio(null);
                    currentAudioRef.current = null;
                    setIsTTSPaused(false);
                    console.log('✅ TTS stopped due to typing');
                  } catch (e) {
                    console.warn('⚠️ Could not stop TTS on typing:', e);
                  }
                }
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="chat-input"
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
      
      {/* Loading overlay for session upload */}
      {isUploadingSession && (
        <div className="upload-overlay">
          <div className="upload-modal">
            <div className="upload-spinner"></div>
            <h3>Processing Session</h3>
            <p>{uploadProgress}</p>
            <div className="upload-details">
              <small>Please wait while we upload and analyze your audio...</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EverydayConversationWithRecording;

