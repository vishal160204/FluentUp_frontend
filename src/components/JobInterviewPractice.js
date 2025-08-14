import React, { useState, useEffect, useRef } from 'react';
import { videoRecorder } from '../services/videoRecorder';
import './JobInterviewPractice.css';
import { FaPlay, FaStop, FaClock, FaUser, FaRobot } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import DashboardHeader from './DashboardHeader';

const JobInterviewPractice = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isCameraOn && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOn]);

  // Session timer effect
  useEffect(() => {
    if (isSessionActive && sessionStartTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now - sessionStartTime) / 1000);
        setSessionDuration(duration);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSessionActive, sessionStartTime]);

  // Format session duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      streamRef.current = stream;
      setIsCameraOn(true);

      if (!videoRecorder.isRecordingActive()) {
        await videoRecorder.startRecording();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert('Could not access the camera. Please ensure you have granted the necessary permissions in your browser settings.');
    }
  };

  const stopCameraAndRecording = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);

    if (videoRecorder.isRecordingActive()) {
      return await videoRecorder.stopRecording();
    }
    return null;
  };

  const endInterview = async () => {
    setIsUploading(true);
    
    // Always use REST API to end session
    try {
      await apiService.makeRequest('/interview-practice/end-session/', {
        method: 'POST',
        body: JSON.stringify({}) // No body required as per API guide
      });
    } catch (error) {
      console.error('REST API error ending session:', error);
    }
    
    try {
      const blob = await stopCameraAndRecording();
      if (blob) {
        await videoRecorder.uploadVideo(blob);
        alert('Interview session ended. Your video has been successfully uploaded for analysis.');
      } else {
        alert('Interview session ended. No video was recorded.');
      }
    } catch (error) {
      console.error('Failed to upload video:', error);
      alert('Interview session ended, but the video upload failed. Please check the console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    const currentAnswer = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      console.log('📤 Sending answer:', currentAnswer);
      const response = await apiService.makeRequest('/interview-practice/answer/', {
        method: 'POST',
        body: JSON.stringify({
          answer: currentAnswer
        })
      });

      console.log('✅ Received next question:', response.next_question);
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1,
        text: response.next_question, 
        sender: 'ai', 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      setQuestionCount(prev => prev + 1);
    } catch (error) {
      console.error('❌ REST API error:', error);
      const errorMessage = error.message || 'Failed to get next question';
      setError(errorMessage);
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1,
        text: `Sorry, I encountered an error: ${errorMessage}. Please try again.`, 
        sender: 'ai', 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const startInterview = async () => {
    const token = apiService.getToken();
    console.log('Token found:', token ? 'Yes' : 'No');
    
    if (!token) {
      alert('Please login first');
      return;
    }

    // Use REST API exclusively - no WebSocket
    console.log('Using REST API for interview practice...');
    startInterviewSession();
  };

  const startInterviewSession = async () => {
    console.log('🚀 Starting interview session...');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📤 Making POST request to /interview-practice/start-session/');
      const response = await apiService.makeRequest('/interview-practice/start-session/', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      console.log('✅ API response received:', response);

      setIsSessionActive(true);
      setSessionStartTime(new Date());
      setQuestionCount(1);
      setMessages([
        { 
          id: Date.now(),
          text: response.current_question, 
          sender: 'ai', 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      
      // Start camera after successful session start
      await startCamera();
    } catch (error) {
      console.error('❌ REST API error:', error);
      const errorMessage = error.message || 'Failed to start interview session';
      setError(errorMessage);
      
      setMessages([{ 
        id: Date.now(),
        text: `Cannot start interview. Error: ${errorMessage}. Please check your connection and try again.`, 
        sender: 'ai', 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    setIsLoading(true);
    
    try {
      await endInterview();
      setIsSessionActive(false);
      setSessionStartTime(null);
      setSessionDuration(0);
      setQuestionCount(0);
      
      // Show success message before navigating
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error ending session:', error);
      setError('Failed to end session properly');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="job-interview-page">
      <DashboardHeader />
      
      <div className="interview-content">
        {/* Session stats removed per user request */}

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}

        <div className={`practice-session-container ${isSessionActive ? 'session-active' : ''}`}>
          <div className="practice-session-main">
            <div className="video-chat-container">
              <div className="video-container-large">
                {isCameraOn ? (
                  <video ref={videoRef} className="video-feed-large" autoPlay playsInline muted />
                ) : (
                  <div className="video-placeholder-large">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15.6 11.6L22 7v10l-6.4-4.6"/>
                      <path d="M2 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>
                    </svg>
                    <p>{isSessionActive ? 'Your Interview Session' : 'Ready to Start Interview'}</p>
                    {videoRecorder.isRecordingActive() && <span className="recording-indicator">🔴 Recording</span>}
                  </div>
                )}
              </div>
              <div className="controls-container">
                {!isSessionActive ? (
                  <button 
                    className={`start-session-btn ${isLoading ? 'loading' : ''}`} 
                    onClick={startInterview}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        <FaPlay />
                        Start Interview
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    className={`end-session-btn ${isLoading ? 'loading' : ''}`} 
                    onClick={handleEndSession}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner"></div>
                        Ending...
                      </>
                    ) : (
                      <>
                        <FaStop />
                        End Interview
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="chat-section-right">
            <div className="chat-header">
              <h2>
                <FaRobot className="chat-icon" />
                Interview Assistant
              </h2>
              {isSessionActive && (
                <div className="chat-status">
                  <span className="status-dot active"></span>
                  Active Session
                </div>
              )}
            </div>
            
            <div className="chat-messages-right">
              {messages.length === 0 && !isSessionActive && (
                <div className="chat-welcome">
                  <FaRobot className="welcome-icon" />
                  <h3>Welcome to Job Interview Practice</h3>
                  <p>Start your session to begin practicing with AI-powered interview questions.</p>
                </div>
              )}
              
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.sender}`}>
                  <div className="message-avatar">
                    {msg.sender === 'user' ? <FaUser /> : <FaRobot />}
                  </div>
                  <div className="message-content">
                    <span className="message-text">{msg.text}</span>
                    <span className="timestamp">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message ai">
                  <div className="message-avatar">
                    <FaRobot />
                  </div>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="chat-input-right">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={isSessionActive ? "Type your answer..." : "Start session to begin"}
                disabled={!isSessionActive || isLoading}
              />
              <button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || !isSessionActive || isLoading} 
                title="Send Answer"
                className={isLoading ? 'loading' : ''}
              >
                {isLoading ? (
                  <div className="spinner-small"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobInterviewPractice;