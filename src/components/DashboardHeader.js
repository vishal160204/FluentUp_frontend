import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardHeader.css';

function DashboardHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogoClick = () => {
    // If user is authenticated, go to dashboard instead of homepage
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName) return 'U';
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="dashboard-header">
      <div className="container">
        <div className="dashboard-brand">
          <div className="dashboard-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <img 
              src="/fluentup-logo.png" 
              alt="FluentUp Logo" 
              className="logo-image" 
              style={{height: '40px', width: 'auto', marginRight: '10px'}} 
            />
            <span className="dashboard-logo-text">FluentUp</span>
          </div>
          <nav className="dashboard-menu centered">
            <Link 
              to="/dashboard" 
              className={`menu-item ${isActiveRoute('/dashboard') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/practice" 
              className={`menu-item ${isActiveRoute('/practice') ? 'active' : ''}`}
            >
              Practice
            </Link>
            <Link 
              to="/analytics" 
              className={`menu-item ${isActiveRoute('/analytics') ? 'active' : ''}`}
            >
              Analytics
            </Link>
            <Link 
              to="/history" 
              className={`menu-item ${isActiveRoute('/history') ? 'active' : ''}`}
            >
              History
            </Link>
          </nav>
          <div className="dashboard-user">
            <div className="user-profile">
              <span className="user-initials">
                {getInitials(user?.first_name, user?.last_name)}
              </span>
              <div className="user-dropdown">
                <button className="dropdown-item" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
