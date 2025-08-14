import React from 'react';
import { Link } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import './Practice.css';

function Practice() {
  const practiceScenarios = [
    // Working options first
    {
      id: 1,
      title: 'Job Interview Practice',
      description: 'Practice common interview questions and improve your responses',
      duration: '15-20 min',
      level: 'Intermediate',
      category: 'Professional',
      icon: '💼',
      levelColor: '#f59e0b',
      categoryColor: '#3b82f6',
      enabled: true,
      path: '/job-interview-practice'
    },
    {
      id: 3,
      title: 'Everyday Conversation',
      description: 'Build confidence in casual and social interactions',
      duration: '10-15 min',
      level: 'Beginner',
      category: 'Social',
      icon: '💬',
      levelColor: '#10b981',
      categoryColor: '#8b5cf6',
      enabled: true,
      path: '/everyday-conversation'
    },
    // Coming soon options
    {
      id: 2,
      title: 'Presentation Skills',
      description: 'Master public speaking and presentation delivery',
      duration: '20-25 min',
      level: 'Advanced',
      category: 'Professional',
      icon: '📊',
      levelColor: '#ef4444',
      categoryColor: '#3b82f6',
      enabled: false,
      comingSoon: true
    },
    {
      id: 4,
      title: 'Sales Presentation',
      description: 'Perfect your sales pitch and persuasion skills',
      duration: '15-20 min',
      level: 'Advanced',
      category: 'Professional',
      icon: '📈',
      levelColor: '#ef4444',
      categoryColor: '#3b82f6',
      enabled: false,
      comingSoon: true
    },
    {
      id: 5,
      title: 'Academic Presentation',
      description: 'Practice thesis defense and academic presentations',
      duration: '20-30 min',
      level: 'Intermediate',
      category: 'Academic',
      icon: '🎓',
      levelColor: '#f59e0b',
      categoryColor: '#06b6d4',
      enabled: false,
      comingSoon: true
    },
    {
      id: 6,
      title: 'AI Coaching Session',
      description: 'Personalized coaching based on your weaknesses',
      duration: '10-15 min',
      level: 'Beginner',
      category: 'Coaching',
      icon: '🤖',
      levelColor: '#10b981',
      categoryColor: '#ec4899',
      enabled: false,
      comingSoon: true
    }
  ];

  return (
    <div className="practice-page">
      <DashboardHeader />

      {/* Practice Content */}
      <main className="practice-main">
        <div className="container">
          {/* Page Title */}
          <div className="practice-title-section">
            <h1 className="practice-title">Choose Your AI Practice Session</h1>
            <p className="practice-subtitle">
              Select a scenario powered by FluentUp. Each session adapts to your skill level and provides personalized, real-time feedback.
            </p>
          </div>

          {/* Practice Scenarios Grid */}
          <div className="scenarios-grid">
            {practiceScenarios.map((scenario) => (
              <div key={scenario.id} className="scenario-card">
                <div className="scenario-header">
                  <div className="scenario-icon">{scenario.icon}</div>
                  <div className="scenario-badges">
                    <span 
                      className="level-badge" 
                      style={{ backgroundColor: scenario.levelColor }}
                    >
                      {scenario.level}
                    </span>
                  </div>
                </div>
                
                <div className="scenario-content">
                  <h3 className="scenario-title">{scenario.title}</h3>
                  <p className="scenario-description">{scenario.description}</p>
                  
                  <div className="scenario-meta">
                    <div className="scenario-duration">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {scenario.duration}
                    </div>
                    <div className="scenario-category">
                      <span 
                        className="category-badge"
                        style={{ color: scenario.categoryColor }}
                      >
                        {scenario.category}
                      </span>
                    </div>
                  </div>
                </div>

                {scenario.enabled ? (
                  <Link to={scenario.path} className="start-session-btn">
                    Start AI Session
                  </Link>
                ) : (
                  <button className="start-session-btn coming-soon" disabled>
                    Coming Soon
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Practice;
