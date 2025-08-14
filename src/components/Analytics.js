import React from 'react';
import { Link } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import './Analytics.css';

function Analytics() {
  const analyticsStats = {
    confidenceScore: 84,
    confidenceImprovement: 12,
    strongestSkill: 'Voice Clarity',
    skillMastery: 94,
    weeklySessions: 9,
    totalHours: 3.2,
    achievements: 15,
    weeklyAchievements: 4
  };

  const recentAchievements = [
    {
      id: 1,
      title: 'Clarity Master',
      description: 'Achieved 95%+ voice clarity in 7 consecutive sessions',
      icon: '🎯',
      color: '#10b981',
      type: 'mastery'
    },
    {
      id: 2,
      title: 'Interview Expert',
      description: 'Completed 15 AI-powered interview practice sessions',
      icon: '🏆',
      color: '#3b82f6',
      type: 'completion'
    },
    {
      id: 3,
      title: 'Rapid Learner',
      description: 'Improved overall score by 25% this month',
      icon: '⚡',
      color: '#8b5cf6',
      type: 'improvement'
    }
  ];

  const focusAreas = [
    {
      skill: 'Eye Contact',
      score: 72,
      recommendation: 'AI suggests: Practice 3-second eye contact intervals',
      color: '#f59e0b'
    },
    {
      skill: 'Filler Words',
      score: 78,
      recommendation: 'AI suggests: Use pause exercises to replace "um" and "uh"',
      color: '#f59e0b'
    },
    {
      skill: 'Pacing Control',
      score: 81,
      recommendation: 'AI suggests: Practice with metronome exercises',
      color: '#3b82f6'
    }
  ];

  return (
    <div className="analytics-page">
      <DashboardHeader />

      {/* Analytics Content */}
      <main className="analytics-main">
        <div className="container">
          {/* Page Title */}
          <div className="analytics-title-section">
            <h1 className="analytics-title">Performance Analytics</h1>
            <p className="analytics-subtitle">
              Deep dive into your communication progress with AI-powered insights and recommendations
            </p>
          </div>

          {/* Analytics Stats Grid */}
          <div className="analytics-stats-grid">
            <div className="analytics-stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">AI Confidence Score</div>
                <div className="stat-value">{analyticsStats.confidenceScore}%</div>
                <div className="stat-change positive">+{analyticsStats.confidenceImprovement}% this month</div>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C13.1 2 14 2.9 14 4V11C14 12.1 13.1 13 12 13C10.9 13 10 12.1 10 11V4C10 2.9 10.9 2 12 2ZM19 11C19 14.53 16.39 17.44 13 17.93V21H11V17.93C7.61 17.44 5 14.53 5 11H7C7 13.76 9.24 16 12 16S17 13.76 17 11H19Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Strongest Skill</div>
                <div className="stat-value">{analyticsStats.strongestSkill}</div>
                <div className="stat-period">{analyticsStats.skillMastery}% mastery</div>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">Weekly Sessions</div>
                <div className="stat-value">{analyticsStats.weeklySessions}</div>
                <div className="stat-period">{analyticsStats.totalHours} hours total</div>
              </div>
            </div>

            <div className="analytics-stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">AI Achievements</div>
                <div className="stat-value">{analyticsStats.achievements}</div>
                <div className="stat-change positive">+{analyticsStats.weeklyAchievements} this week</div>
              </div>
            </div>
          </div>

          {/* Analytics Content Sections */}
          <div className="analytics-content-sections">
            {/* Recent AI Achievements */}
            <div className="analytics-section-card">
              <div className="section-header">
                <h3 className="section-title">Recent AI Achievements</h3>
              </div>
              <div className="achievements-list">
                {recentAchievements.map((achievement) => (
                  <div key={achievement.id} className="achievement-item">
                    <div 
                      className="achievement-icon"
                      style={{ backgroundColor: `${achievement.color}20`, color: achievement.color }}
                    >
                      {achievement.icon}
                    </div>
                    <div className="achievement-content">
                      <div className="achievement-title">{achievement.title}</div>
                      <div className="achievement-description">{achievement.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI-Recommended Focus Areas */}
            <div className="analytics-section-card">
              <div className="section-header">
                <h3 className="section-title">AI-Recommended Focus Areas</h3>
              </div>
              <div className="focus-areas-list">
                {focusAreas.map((area, index) => (
                  <div key={index} className="focus-area-item">
                    <div className="focus-area-header">
                      <span className="focus-area-skill">{area.skill}</span>
                      <span className="focus-area-score">{area.score}%</span>
                    </div>
                    <div className="focus-area-bar">
                      <div 
                        className="focus-area-progress" 
                        style={{ 
                          width: `${area.score}%`,
                          backgroundColor: area.color
                        }}
                      ></div>
                    </div>
                    <div className="focus-area-recommendation">{area.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Analytics;
