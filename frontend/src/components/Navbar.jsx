import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar({ onToggleSidebar }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button 
          className="sidebar-toggle" 
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span className="hamburger"></span>
          <span className="hamburger"></span>
          <span className="hamburger"></span>
        </button>
        <div className="navbar-brand">
          <h1>✈️ SkyJet</h1>
        </div>
      </div>
      
      <div className="navbar-right">
        <div 
          className="user-info" 
          onClick={handleProfileClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleProfileClick();
            }
          }}
          aria-label="View profile"
        >
          <div className="user-avatar">
            {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">
              {profile?.name || user?.email || 'User'}
            </span>
            {profile?.role && (
              <span className={`user-role ${profile.role}`}>
                {profile.role.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="logout-btn"
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar