import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardHeader from './DashboardHeader';
import './History.css';

const History = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:8000/interview/analyses/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.analyses || []);
        setError(null);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch analyses:', response.status, errorData);
        setError('Failed to fetch analysis reports');
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
      setError('Network error while fetching analysis reports');
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = (analysis) => {
    // Navigate to the dedicated report page
    navigate(`/report/${analysis.analysis_id}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnalysisTypeIcon = (type) => {
    return type === 'video' ? '🎥' : '🎤';
  };

  const getAnalysisTypeLabel = (type) => {
    return type === 'video' ? 'Video Analysis' : 'Audio Analysis';
  };

  const getSessionType = (analysis) => {
    // Determine session type based on analysis data or filename patterns
    if (analysis.original_filename && analysis.original_filename.includes('interview')) {
      return 'Job Interview Practice';
    } else if (analysis.original_filename && analysis.original_filename.includes('conversation')) {
      return 'Everyday Conversation';
    } else {
      // Default based on analysis type
      return analysis.analysis_type === 'video' ? 'Video Session' : 'Audio Session';
    }
  };

  const formatDuration = (analysis) => {
    // If duration is available in analysis results, use it
    if (analysis.analysis_results && analysis.analysis_results.duration) {
      const duration = analysis.analysis_results.duration;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    // Otherwise, estimate based on file size or default
    return 'N/A';
  };

  // Group analyses by session ID
  const groupAnalysesBySession = (analyses) => {
    const sessions = {};
    
    analyses.forEach(analysis => {
      // Extract session ID from filename or use analysis_id as fallback
      let sessionId = analysis.analysis_id;
      
      // Try to extract session ID from filename
      if (analysis.original_filename) {
        const filenameMatch = analysis.original_filename.match(/^(conversation-\d+-\w+|session-\d+-\w+)/);
        if (filenameMatch) {
          sessionId = filenameMatch[1];
        }
      }
      
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          sessionId,
          analyses: [],
          sessionType: getSessionType(analysis),
          uploadDate: analysis.uploaded_at,
          status: analysis.status,
          hasAudio: false,
          hasVideo: false
        };
      }
      
      sessions[sessionId].analyses.push(analysis);
      
      // Track what types of analysis this session has
      if (analysis.analysis_type === 'audio') {
        sessions[sessionId].hasAudio = true;
      } else if (analysis.analysis_type === 'video') {
        sessions[sessionId].hasVideo = true;
      }
      
      // Use the most recent upload date
      if (new Date(analysis.uploaded_at) > new Date(sessions[sessionId].uploadDate)) {
        sessions[sessionId].uploadDate = analysis.uploaded_at;
      }
      
      // Update status to completed if any analysis is completed
      if (analysis.status === 'completed') {
        sessions[sessionId].status = 'completed';
      }
    });
    
    return Object.values(sessions).sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  };

  // Get session icon based on what types of analysis it contains
  const getSessionIcon = (session) => {
    if (session.hasAudio && session.hasVideo) {
      return '🎬'; // Both audio and video
    } else if (session.hasVideo) {
      return '🎥'; // Video only
    } else if (session.hasAudio) {
      return '🎤'; // Audio only
    }
    return '📊'; // Fallback
  };

  // Get combined duration from all analyses in session
  const getSessionDuration = (session) => {
    const durations = session.analyses
      .map(analysis => {
        if (analysis.analysis_results && analysis.analysis_results.duration) {
          return analysis.analysis_results.duration;
        }
        return 0;
      })
      .filter(duration => duration > 0);
    
    if (durations.length > 0) {
      // Use the longest duration (in case of audio+video, they should be similar)
      const maxDuration = Math.max(...durations);
      const minutes = Math.floor(maxDuration / 60);
      const seconds = Math.floor(maxDuration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return 'N/A';
  };

  // Get best analysis for report generation (prefer video, fallback to audio)
  const getBestAnalysisForReport = (session) => {
    const videoAnalysis = session.analyses.find(a => a.analysis_type === 'video' && a.status === 'completed');
    if (videoAnalysis) return videoAnalysis;
    
    const audioAnalysis = session.analyses.find(a => a.analysis_type === 'audio' && a.status === 'completed');
    if (audioAnalysis) return audioAnalysis;
    
    // Fallback to any completed analysis
    return session.analyses.find(a => a.status === 'completed') || session.analyses[0];
  };

  // Get combined score from all analyses in session
  const getSessionScore = (session) => {
    const scores = session.analyses
      .map(analysis => {
        if (analysis.analysis_results && analysis.analysis_results.overall_score) {
          return analysis.analysis_results.overall_score;
        }
        return null;
      })
      .filter(score => score !== null);
    
    if (scores.length > 0) {
      // Return average score
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return Math.round(avgScore);
    }
    
    return 'N/A';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <div className="history-container loading">Loading analysis reports...</div>;
  }

  if (error) {
    return (
      <div className="history-container error">
        <div className="error-message">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
          <button onClick={fetchAnalyses} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader />
      <div className="history-container">
        <h1>Analysis Reports</h1>
        <p className="history-subtitle">View your past interview sessions and reports</p>
        
        {analyses.length === 0 ? (
          <div className="empty-state">
            <h3>📊 No analysis reports found</h3>
            <p>Complete a conversation session or interview practice to see your analysis reports here!</p>
          </div>
        ) : (
          <div className="analyses-grid">
            {groupAnalysesBySession(analyses).map((session) => {
              const bestAnalysis = getBestAnalysisForReport(session);
              return (
                <div key={session.sessionId} className="analysis-card session-card">
                  <div className="analysis-header">
                    <div className="analysis-type">
                      <span className="type-icon">{getSessionIcon(session)}</span>
                      <h3>{session.sessionType}</h3>
                      {session.hasAudio && session.hasVideo && (
                        <span className="session-badge">Audio + Video</span>
                      )}
                    </div>
                    <span 
                      className="status" 
                      style={{ backgroundColor: getStatusColor(session.status) }}
                    >
                      {session.status}
                    </span>
                  </div>
                  <div className="analysis-details">
                    <p><strong>📅 Date:</strong> {formatDate(session.uploadDate)}</p>
                    <p><strong>🎯 Session Type:</strong> {session.sessionType}</p>
                    {session.analyses.length > 1 && (
                      <p><strong>📊 Components:</strong> {session.analyses.length} analyses ({session.hasAudio ? 'Audio' : ''}{session.hasAudio && session.hasVideo ? ' + ' : ''}{session.hasVideo ? 'Video' : ''})</p>
                    )}
                  </div>
                  <div className="analysis-actions">
                    <button 
                      className="view-report-btn" 
                      onClick={() => viewReport(bestAnalysis)}
                      disabled={session.status !== 'completed'}
                    >
                      {session.status === 'completed' ? '📋 View Report' : '⏳ Processing...'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default History;
