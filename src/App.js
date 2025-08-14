import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import OTPVerification from './components/OTPVerification';
import Dashboard from './components/Dashboard';
import Practice from './components/Practice';
import Analytics from './components/Analytics';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import EverydayConversationWithRecording from './components/EverydayConversationWithRecording';
import JobInterviewPractice from './components/JobInterviewPractice';
import History from './components/History';
import ReportPage from './components/ReportPage';

function Header() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/verify-otp';
  const isDashboardPage = location.pathname === '/dashboard';
  const isPracticePage = location.pathname === '/practice';
  const isAnalyticsPage = location.pathname === '/analytics';
  const isHistoryPage = location.pathname === '/history';
  const isJobInterviewPage = location.pathname === '/job-interview-practice';
  const isConversationPage = location.pathname === '/everyday-conversation';
  const isReportPage = location.pathname.startsWith('/report/');
  const isHomePage = location.pathname === '/';
  
  // Don't show header on protected pages, auth pages, or homepage when user is authenticated
  if (isAuthPage || isDashboardPage || isPracticePage || isAnalyticsPage || isHistoryPage || isJobInterviewPage || isConversationPage || isReportPage || (isHomePage && isAuthenticated)) {
    return null;
  }

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <img src="/fluentup-logo.png" alt="FluentUp Logo" className="logo-image" style={{height: '30px', width: 'auto', marginRight: '10px'}} />
          <span className="logo-text">FluentUp</span>
        </Link>
        <nav className="nav">
          <Link to="/login" className="btn-secondary">Sign In</Link>
          <Link to="/register" className="btn-primary">Get Started</Link>
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<OTPVerification />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/job-interview-practice" element={
              <ProtectedRoute>
                <JobInterviewPractice />
              </ProtectedRoute>
            } />
            <Route path="/everyday-conversation" element={<EverydayConversationWithRecording />} />
            <Route path="/report/:analysisId" element={
              <ProtectedRoute>
                <ReportPage />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
