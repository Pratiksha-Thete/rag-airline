import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ fullScreen = false }) {
  return (
    <div className={`loading-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

export default LoadingSpinner;