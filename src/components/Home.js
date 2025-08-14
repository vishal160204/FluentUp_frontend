import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Home() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Debug authentication state
  console.log('Home component - Authentication state:', {
    isAuthenticated,
    user,
    hasToken: !!localStorage.getItem('access_token')
  });
  
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-left">
              <div className="hero-badge">
                <span className="badge-icon">✅</span>
                AI-Powered Communication Intelligence
              </div>
              <h1 className="hero-title">
                Transform Your Speaking Skills with AI Intelligence
              </h1>
              <p className="hero-description">
                Master communication with SpeakSense AI's personalized coaching platform. Practice presentations, interviews, and conversations with real-time AI feedback that adapts to your unique speaking style.
              </p>
              <div className="hero-buttons">
                {isAuthenticated ? (
                  <>
                    <button 
                      className="btn-primary btn-large"
                      onClick={() => navigate('/dashboard')}
                    >
                      <span>Go to Dashboard</span>
                      <span className="btn-arrow">▶</span>
                    </button>
                    <button 
                      className="btn-secondary btn-large"
                      onClick={() => navigate('/practice')}
                    >
                      <span>Start Practice</span>
                      <span className="btn-icon">🎯</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn-primary btn-large"
                      onClick={() => navigate('/register')}
                    >
                      <span>Start Free Trial</span>
                      <span className="btn-arrow">▶</span>
                    </button>
                    <button className="btn-secondary btn-large">
                      <span>Watch Demo</span>
                      <span className="btn-icon">🎥</span>
                    </button>
                  </>
                )}
              </div>
              <div className="hero-features">
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>No credit card required</span>
                </div>
                <div className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>
            <div className="hero-right">
              <div className="practice-card">
                <div className="card-header">
                  <span className="card-title">Practice Session</span>
                  <span className="live-indicator">Live</span>
                </div>
                <div className="voice-analysis">
                  <div className="voice-icon">🎤</div>
                  <div className="voice-info">
                    <div className="voice-title">Voice Analysis</div>
                    <div className="voice-clarity">Clarity: 89%</div>
                  </div>
                </div>
                <div className="feedback-text">
                  "Great pacing! Try to reduce filler words for even better impact."
                </div>
                <div className="confidence-score">
                  <span className="score-label">Confidence Score</span>
                  <div className="score-bar">
                    <div className="score-fill" style={{width: '78%'}}></div>
                  </div>
                  <span className="score-value">78%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligent Features Section */}
      <section className="intelligent-features">
        <div className="container">
          <div className="intelligent-features-header">
            <h2 className="intelligent-features-title">Intelligent Features for Every Speaker</h2>
            <p className="intelligent-features-description">
              FluentUp combines advanced machine learning with proven communication science
            </p>
          </div>
          <div className="intelligent-features-grid">
            <div className="intelligent-feature-card">
              <div className="intelligent-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C13.1 2 14 2.9 14 4V11C14 12.1 13.1 13 12 13C10.9 13 10 12.1 10 11V4C10 2.9 10.9 2 12 2ZM19 11C19 14.53 16.39 17.44 13 17.93V21H11V17.93C7.61 17.44 5 14.53 5 11H7C7 13.76 9.24 16 12 16S17 13.76 17 11H19Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="intelligent-feature-title">Voice Intelligence</h3>
              <p className="intelligent-feature-description">
                Advanced AI analysis of pace, tone, clarity, and speech patterns with instant, personalized feedback
              </p>
            </div>
            <div className="intelligent-feature-card">
              <div className="intelligent-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 10.5V7C17 4.24 14.76 2 12 2S7 4.24 7 7V10.5C4.03 11.26 2 13.96 2 17H22C22 13.96 19.97 11.26 17 10.5Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="intelligent-feature-title">Presence Analysis</h3>
              <p className="intelligent-feature-description">
                Computer vision technology analyzes posture, gestures, and eye contact for complete communication mastery
              </p>
            </div>
            <div className="intelligent-feature-card">
              <div className="intelligent-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.4 5H12C6.48 5 2 9.48 2 15C2 20.52 6.48 25 12 25S22 20.52 22 15V9H21Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="intelligent-feature-title">Adaptive AI Coach</h3>
              <p className="intelligent-feature-description">
                Personalized coaching that learns from your progress and adapts recommendations to your unique style
              </p>
            </div>
            <div className="intelligent-feature-card">
              <div className="intelligent-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="intelligent-feature-title">Smart Scenarios</h3>
              <p className="intelligent-feature-description">
                AI-generated scenarios for interviews, presentations, sales calls, and conversations that adapt to your skill level
              </p>
            </div>
            <div className="intelligent-feature-card">
              <div className="intelligent-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="intelligent-feature-title">Progress Intelligence</h3>
              <p className="intelligent-feature-description">
                Advanced analytics and confidence scoring track your improvement with predictive insights
              </p>
            </div>
            <div className="intelligent-feature-card">
              <div className="intelligent-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4C18.21 4 20 5.79 20 8C20 10.21 18.21 12 16 12C13.79 12 12 10.21 12 8C12 5.79 13.79 4 16 4ZM8 6C9.66 6 11 7.34 11 9C11 10.66 9.66 12 8 12C6.34 12 5 10.66 5 9C5 7.34 6.34 6 8 6ZM8 13C10.67 13 16 14.34 16 17V20H0V17C0 14.34 5.33 13 8 13ZM16 13C16.67 13 17.33 13.1 18 13.29C19.6 14.29 21 15.7 21 17V20H18V17.5C18 16.17 17.43 14.97 16.5 14.1C16.33 14.04 16.17 14 16 14V13Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="intelligent-feature-title">Collaborative Learning</h3>
              <p className="intelligent-feature-description">
                Share insights with coaches, mentors, or team members for comprehensive skill development
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
