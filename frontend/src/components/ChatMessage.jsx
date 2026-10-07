import React, { useState } from 'react';
import './ChatMessage.css'; // Create this CSS file

const ChatMessage = ({ message }) => {
  const [feedback, setFeedback] = useState(null);
  const isUser = message.sender === 'user' || message.role === 'user';
  const isError = message.isError;
  const isBot = !isUser && !isError;

  const handleFeedback = (rating) => {
    setFeedback(rating);
    console.log(`User gave ${rating} rating for message`);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const parseContent = (content) => {
    if (typeof content !== 'string') return content;
    
    let parsed = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: parsed }} />;
  };

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'} ${isError ? 'error-message' : ''}`}>
      <div className="message-header">
        <div className={`message-avatar ${isUser ? 'user-avatar' : isError ? 'error-avatar' : 'bot-avatar'}`}>
          {isUser ? '👤' : isError ? '⚠️' : '🤖'}
        </div>
        <div className="message-info">
          <span className="message-role">
            {isUser ? 'You' : isError ? 'Error' : 'SkyJet Assistant'}
          </span>
          {message.timestamp && (
            <span className="message-time">{formatTime(message.timestamp)}</span>
          )}
        </div>
      </div>
      
      <div className="message-content">
        {parseContent(message.text || message.content)}
      </div>
      
      {isBot && (
        <div className="message-feedback">
          <p>Was this helpful?</p>
          <div className="feedback-buttons">
            <button 
              className={`feedback-btn ${feedback === 'good' ? 'active' : ''}`}
              onClick={() => handleFeedback('good')}
              title="Helpful"
            >
              👍 Helpful
            </button>
            <button 
              className={`feedback-btn ${feedback === 'bad' ? 'active' : ''}`}
              onClick={() => handleFeedback('bad')}
              title="Not helpful"
            >
              👎 Not helpful
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;