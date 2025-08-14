import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaPlay, FaChartBar, FaHistory } from 'react-icons/fa';
import DashboardHeader from './DashboardHeader';
import apiService from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [latestSession, setLatestSession] = useState(null);
  const [quickPractice, setQuickPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for audio upload
  const [audioFile, setAudioFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all dashboard data in parallel
        const [analyticsResponse, latestSessionResponse, quickPracticeResponse] = await Promise.all([
          apiService.makeRequest('/interview/dashboard/analytics'),
          apiService.makeRequest('/interview/dashboard/latest-session'),
          apiService.makeRequest('/interview/dashboard/quick-practice')
        ]);
        
        setDashboardData(analyticsResponse);
        setLatestSession(latestSessionResponse);
        setQuickPractice(quickPracticeResponse);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Audio upload handlers
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'audio/mp3', 'audio/mpeg', 'audio/mpeg3', 'audio/x-mpeg-3',
        'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
        'audio/webm', 'audio/ogg'
      ];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['mp3', 'wav', 'm4a', 'webm', 'aac', 'ogg'];
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        setUploadError('Please select a valid audio file (MP3, WAV, M4A, AAC, WebM, or OGG)');
        return;
      }
      
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setUploadError('File size must be less than 50MB');
        return;
      }
      
      setAudioFile(file);
      setUploadError(null);
      setUploadSuccess(false);
    }
  };

  const handleAudioUpload = async () => {
    if (!audioFile) {
      setUploadError('Please select an audio file first');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      
      // Create FormData for file upload (matching working format)
      const formData = new FormData();
      const sessionId = `audio-upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      formData.append('file', audioFile, audioFile.name);
      formData.append('session_id', sessionId);
      
      console.log('🎤 Uploading audio file:', audioFile.name, 'with session ID:', sessionId);
      
      // Use direct fetch like the working audio upload
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
        console.log('✅ Audio uploaded successfully:', result.analysis_id);
        
        setUploadSuccess(true);
        setAudioFile(null);
        // Reset file input
        const fileInput = document.getElementById('audio-upload-input');
        if (fileInput) fileInput.value = '';
        
        // Show success message for 3 seconds
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
        
        // Refresh dashboard data to show new analysis
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to upload audio:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (err) {
      console.error('Error uploading audio:', err);
      setUploadError(err.message || 'Failed to upload audio file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const clearAudioFile = () => {
    setAudioFile(null);
    setUploadError(null);
    setUploadSuccess(false);
    const fileInput = document.getElementById('audio-upload-input');
    if (fileInput) fileInput.value = '';
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  // Helper function to get practice type icon
  const getPracticeIcon = (type) => {
    const iconMap = {
      'job_interview': '💼',
      'presentation': '📊',
      'voice_clarity': '🎤',
      'conversation': '💬',
      'default': '🎯'
    };
    return iconMap[type] || iconMap.default;
  };

  // Loading state
  if (loading) {
    return (
      <div className="dashboard">
        <DashboardHeader />
        <main className="dashboard-main">
          <div className="container">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard">
        <DashboardHeader />
        <main className="dashboard-main">
          <div className="container">
            <div className="error-state">
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="retry-btn">
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Extract data with fallbacks
  const stats = {
    confidenceScore: dashboardData?.confidence_score || 0,
    confidenceChange: dashboardData?.confidence_change || '+0%',
    totalSessions: dashboardData?.total_sessions || 0,
    sessionsChange: dashboardData?.sessions_change || 'This month',
    practiceTime: dashboardData?.practice_time || '0h',
    practiceChange: dashboardData?.practice_change || '+0 this week',
    achievements: dashboardData?.achievements || 0,
    achievementsChange: dashboardData?.achievements_change || 'Badges earned'
  };

  const skillsData = dashboardData?.skills_breakdown ? [
    { skill: 'Voice Clarity', percentage: dashboardData.skills_breakdown.voice_clarity },
    { skill: 'Body Language', percentage: dashboardData.skills_breakdown.body_language },
    { skill: 'Content Flow', percentage: dashboardData.skills_breakdown.content_flow },
    { skill: 'Eye Contact', percentage: dashboardData.skills_breakdown.eye_contact },
    { skill: 'Pace Control', percentage: dashboardData.skills_breakdown.pace_control }
  ] : [];

  const progressData = dashboardData?.progress_data || [];
  const recentSessions = dashboardData?.recent_sessions || [];
  const quickPracticeOptions = quickPractice?.practice_options || [];

  return (
    <div className="dashboard">
      <DashboardHeader />
      {/* Dashboard Content */}
      <main className="dashboard-main">
        <div className="container">
          {/* Welcome Section */}
          <div className="welcome-section">
            <div className="welcome-content">
              <h1 className="welcome-title">Welcome back, {dashboardData?.user_info?.name || user?.first_name || 'User'}! 👋</h1>
              <p className="welcome-subtitle">
                Ready to continue your communication journey? Your confidence score has improved by {stats.confidenceChange} this week!
              </p>
            </div>
            <Link to="/practice" className="start-practice-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="5,3 19,12 5,21" fill="currentColor"/>
              </svg>
              Start Practice Session
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Confidence Score</div>
                <div className="stat-value">{stats.confidenceScore}%</div>
                <div className="stat-change positive">{stats.confidenceChange}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Sessions</div>
                <div className="stat-value">{stats.totalSessions}</div>
                <div className="stat-change neutral">{stats.sessionsChange}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Practice Time</div>
                <div className="stat-value">{stats.practiceTime}</div>
                <div className="stat-change positive">{stats.practiceChange}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Achievements</div>
                <div className="stat-value">{stats.achievements}</div>
                <div className="stat-change neutral">{stats.achievementsChange}</div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            {/* Confidence Progress Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">📈 Confidence Score Progress</h3>
              </div>
              <div className="chart-container">
                {progressData && progressData.length > 0 ? (
                  <div className="line-chart">
                    <svg width="100%" height="200" viewBox="0 0 500 200">
                      <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="1"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      <g stroke="#e2e8f0" strokeWidth="1">
                        <line x1="50" y1="20" x2="50" y2="160"/>
                        <line x1="50" y1="160" x2="450" y2="160"/>
                        <line x1="50" y1="120" x2="450" y2="120" strokeDasharray="2,2"/>
                        <line x1="50" y1="80" x2="450" y2="80" strokeDasharray="2,2"/>
                        <line x1="50" y1="40" x2="450" y2="40" strokeDasharray="2,2"/>
                      </g>
                      
                      {/* Y-axis labels */}
                      <g fill="#4a5568" fontSize="12" textAnchor="end">
                        <text x="45" y="165">0</text>
                        <text x="45" y="125">25</text>
                        <text x="45" y="85">50</text>
                        <text x="45" y="45">75</text>
                        <text x="45" y="25">100</text>
                      </g>
                      
                      {/* Progress line and points */}
                      {progressData.map((point, index) => {
                        const x = 50 + (index / Math.max(progressData.length - 1, 1)) * 400;
                        const y = 160 - (point.confidence / 100) * 140;
                        return (
                          <g key={index}>
                            <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                            {index > 0 && (
                              <line
                                x1={50 + ((index - 1) / Math.max(progressData.length - 1, 1)) * 400}
                                y1={160 - (progressData[index - 1].confidence / 100) * 140}
                                x2={x}
                                y2={y}
                                stroke="#3b82f6"
                                strokeWidth="2"
                              />
                            )}
                            <text x={x} y="180" textAnchor="middle" fontSize="10" fill="#6b7280">
                              {point.week}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <div className="empty-chart-state">
                    <div className="empty-chart-icon">
                      📈
                    </div>
                    <h4 className="empty-chart-title">Start Your Progress Journey</h4>
                    <p className="empty-chart-description">
                      Complete practice sessions to see your confidence progress over time
                    </p>
                    <div className="empty-chart-placeholder">
                      <svg width="100%" height="120" viewBox="0 0 400 120">
                        {/* Placeholder grid */}
                        <g stroke="#e5e7eb" strokeWidth="1">
                          <line x1="30" y1="10" x2="30" y2="90"/>
                          <line x1="30" y1="90" x2="370" y2="90"/>
                          <line x1="30" y1="70" x2="370" y2="70" strokeDasharray="2,2"/>
                          <line x1="30" y1="50" x2="370" y2="50" strokeDasharray="2,2"/>
                          <line x1="30" y1="30" x2="370" y2="30" strokeDasharray="2,2"/>
                        </g>
                        
                        {/* Placeholder growth line */}
                        <path
                          d="M 50 80 Q 120 70 200 50 T 350 20"
                          stroke="#d1d5db"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="5,5"
                        />
                        
                        {/* Placeholder points */}
                        <circle cx="50" cy="80" r="3" fill="#d1d5db" />
                        <circle cx="120" cy="65" r="3" fill="#d1d5db" />
                        <circle cx="200" cy="45" r="3" fill="#d1d5db" />
                        <circle cx="280" cy="30" r="3" fill="#d1d5db" />
                        <circle cx="350" cy="20" r="3" fill="#d1d5db" />
                        
                        {/* Week labels */}
                        <g fill="#9ca3af" fontSize="10" textAnchor="middle">
                          <text x="50" y="105">Week 1</text>
                          <text x="120" y="105">Week 2</text>
                          <text x="200" y="105">Week 3</text>
                          <text x="280" y="105">Week 4</text>
                          <text x="350" y="105">Week 5</text>
                        </g>
                      </svg>
                    </div>
                    <button className="start-practice-small" onClick={() => navigate('/practice')}>
                      Start First Session
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Breakdown */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Skills Breakdown</h3>
              </div>
              <div className="skills-chart">
                {skillsData.map((skill, index) => (
                  <div key={index} className="skill-item">
                    <div className="skill-info">
                      <span className="skill-name">{skill.skill}</span>
                      <span className="skill-percentage">{skill.percentage}%</span>
                    </div>
                    <div className="skill-bar">
                      <div 
                        className="skill-progress" 
                        style={{ width: `${skill.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Dashboard Sections */}
          <div className="additional-sections">
            {/* Recent Practice Sessions */}
            <div className="section-card">
              <div className="section-header">
                <h3 className="section-title">Recent Practice Sessions</h3>
              </div>
              <div className="sessions-list">
                {recentSessions.length > 0 ? recentSessions.map((session, index) => (
                  <div key={index} className="session-item">
                    <div className="session-icon">{getPracticeIcon(session.type?.toLowerCase().replace(' ', '_'))}</div>
                    <div className="session-content">
                      <div className="session-type">{session.type}</div>
                      <div className="session-meta">
                        <span className="session-time">{session.time_ago}</span>
                        <span className="session-duration">• {session.duration}</span>
                      </div>
                    </div>
                    <div className="session-score">
                      <div className="score-value">{session.confidence_score}%</div>
                      <div className="score-improvement">Analysis ID: {session.analysis_id?.substring(0, 8)}</div>
                    </div>
                  </div>
                )) : (
                  <div className="no-sessions">
                    <p>No recent sessions found. Start practicing to see your progress!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Practice & Today's Goal */}
            <div className="right-sections">
              {/* Quick Practice */}
              <div className="section-card">
                <div className="section-header">
                  <h3 className="section-title">Quick Practice</h3>
                </div>
                <div className="quick-practice-list">
                  {quickPracticeOptions.length > 0 ? quickPracticeOptions.map((option, index) => (
                    <div key={index} className="practice-option">
                      <div className="practice-icon" style={{backgroundColor: `#3b82f620`, color: '#3b82f6'}}>
                        {option.icon || getPracticeIcon(option.id)}
                      </div>
                      <div className="practice-content">
                        <div className="practice-type">
                          {option.title}
                          {option.recommended && <span className="recommended-badge">Recommended</span>}
                        </div>
                        <div className="practice-description">{option.description}</div>
                        <div className="practice-meta">
                          <span className="practice-time">{option.estimated_time}</span>
                          <span className="practice-difficulty">• {option.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="no-practice-options">
                      <p>Loading practice recommendations...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Level Info */}
              <div className="section-card">
                <div className="section-header">
                  <h3 className="section-title">Your Progress</h3>
                </div>
                <div className="goal-content">
                  <div className="goal-description">
                    Level: {quickPractice?.user_level || 'Beginner'}
                  </div>
                  <div className="goal-text">
                    Total Practice Sessions: {quickPractice?.total_practice_sessions || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Audio Upload Section */}
          <div className="audio-upload-section">
            <div className="upload-card">
              <div className="upload-header">
                <div className="upload-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="upload-content">
                  <h3 className="upload-title">Upload Audio for Analysis</h3>
                  <p className="upload-description">Upload a pre-recorded audio file to get AI-powered analysis and feedback</p>
                </div>
              </div>
              
              <div className="upload-body">
                {!audioFile ? (
                  <div className="file-drop-zone">
                    <input
                      type="file"
                      id="audio-upload-input"
                      accept="audio/*,.mp3,.wav,.m4a,.webm"
                      onChange={handleFileSelect}
                      className="file-input"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="audio-upload-input" className="file-drop-label">
                      <div className="drop-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="drop-text">
                        <span className="drop-main">Click to select audio file</span>
                        <span className="drop-sub">or drag and drop here</span>
                        <span className="drop-formats">Supports MP3, WAV, M4A, WebM (max 50MB)</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="file-selected">
                    <div className="file-info">
                      <div className="file-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </div>
                      <div className="file-details">
                        <div className="file-name">{audioFile.name}</div>
                        <div className="file-size">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                      <button onClick={clearAudioFile} className="file-remove" title="Remove file">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    <button 
                      onClick={handleAudioUpload} 
                      disabled={uploading}
                      className={`upload-btn ${uploading ? 'uploading' : ''}`}
                    >
                      {uploading ? (
                        <>
                          <div className="spinner"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Upload & Analyze
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {uploadError && (
                  <div className="upload-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {uploadError}
                  </div>
                )}
                
                {uploadSuccess && (
                  <div className="upload-success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Audio uploaded successfully! Analysis will appear in your history.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
