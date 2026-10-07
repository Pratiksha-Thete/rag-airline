import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { 
  FiSend, FiPaperclip, FiRefreshCw, FiTrash2, FiUser, FiCpu, 
  FiFile, FiFileText, FiDownload, FiEye, FiX, FiCheckCircle,
  FiAlertCircle, FiInfo
} from 'react-icons/fi';
import './ChatPage.css';

const ChatPage = () => {
  const { user } = useAuth();
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  
  const { 
    conversations, 
    currentSessionId,
    messages,
    isLoading,
    sendMessage,
    loadMessages,
    startNewConversation,
    deleteConversation
  } = useChat();
  
  const [inputMessage, setInputMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [showDocList, setShowDocList] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [ragStats, setRagStats] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load RAG documents on mount
  useEffect(() => {
    loadRAGDocuments();
    loadRAGStats();
  }, []);

  // Handle URL parameter
  useEffect(() => {
    console.log('ChatPage URL sessionId:', urlSessionId);
    
    if (urlSessionId === 'new') {
      startNewConversation();
    } else if (urlSessionId && urlSessionId !== currentSessionId) {
      loadMessages(urlSessionId);
    }
  }, [urlSessionId, currentSessionId]);

  // Load RAG documents
  const loadRAGDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/rag-documents');
      if (response.ok) {
        const data = await response.json();
        setUploadedDocs(data);
      }
    } catch (error) {
      console.error('Error loading RAG documents:', error);
    }
  };

  // Load RAG stats
  const loadRAGStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/rag-stats');
      if (response.ok) {
        const data = await response.json();
        setRagStats(data);
      }
    } catch (error) {
      console.error('Error loading RAG stats:', error);
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    
    const messageToSend = inputMessage.trim();
    setInputMessage('');
    
    try {
      const response = await sendMessage(messageToSend);
      
      // Check if response has sources from documents
      if (response.sources && response.sources.length > 0) {
        // Refresh document list in case new docs were referenced
        loadRAGDocuments();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showNotification('Failed to send message. Please try again.', 'error');
      setInputMessage(messageToSend);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file upload with progress
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      showNotification('Only PDF, DOCX, and TXT files are allowed', 'error');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('File size must be less than 10MB', 'error');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);
    showNotification(`Uploading ${file.name}...`, 'info');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('process_content', 'true');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const data = await response.json();
        
        showNotification(`✅ Document uploaded: ${data.filename}`, 'success');
        
        // Refresh document list
        await loadRAGDocuments();
        await loadRAGStats();
        
        // If document was processed, show summary
        if (data.summary) {
          // Add a system message about the upload
          const uploadMessage = `📄 I've uploaded "${data.filename}" and processed it for analysis. ${data.summary || ''}`;
          await sendMessage(uploadMessage);
        }
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(`Failed to upload: ${error.message}`, 'error');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clear all RAG documents
  const handleClearRAGDocuments = async () => {
    if (window.confirm('Are you sure you want to clear all uploaded documents from memory?')) {
      try {
        const response = await fetch('http://localhost:8000/api/rag-clear', {
          method: 'POST'
        });
        
        if (response.ok) {
          showNotification('All documents cleared from RAG memory', 'success');
          setUploadedDocs([]);
          loadRAGStats();
        }
      } catch (error) {
        console.error('Error clearing RAG documents:', error);
        showNotification('Failed to clear documents', 'error');
      }
    }
  };

  // Clear current conversation
  const handleClearChat = async () => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        await deleteConversation(currentSessionId);
        showNotification('Conversation deleted', 'success');
        navigate('/chat/new');
      } catch (error) {
        console.error('Error deleting conversation:', error);
        showNotification('Failed to delete conversation', 'error');
      }
    }
  };

  // Refresh knowledge base
  const refreshKnowledgeBase = async () => {
    try {
      showNotification('Refreshing knowledge base...', 'info');
      const response = await fetch('http://localhost:8000/api/refresh', {
        method: 'POST'
      });
      if (response.ok) {
        showNotification('Knowledge base refreshed', 'success');
      } else {
        throw new Error('Refresh failed');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      showNotification('Failed to refresh knowledge base', 'error');
    }
  };

  // View document preview
  const handleViewDocument = (doc) => {
    setSelectedDoc(doc);
    setShowDocPreview(true);
  };

  // Download document
  const handleDownloadDocument = (url, filename) => {
    window.open(url, '_blank');
  };

  // Ask about document
  const handleAskAboutDocument = (doc) => {
    setInputMessage(`Tell me about the document "${doc.filename}"`);
    setShowDocPreview(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format confidence
  const formatConfidence = (confidence) => {
    if (!confidence) return null;
    const num = parseFloat(confidence);
    if (isNaN(num)) return null;
    const percent = (num * 100).toFixed(0);
    return `${percent}% confidence`;
  };

  // Get current conversation title
  const getCurrentConversationTitle = () => {
    const conv = conversations.find(c => c.session_id === currentSessionId);
    return conv?.title || 'New Conversation';
  };

  // Suggested questions
  const suggestedQuestions = [
    'How can I book a flight?',
    'What is your baggage policy?',
    'How do I check in online?',
    'Can I change my flight date?',
    'What are the cabin class options?',
    'Is there WiFi on board?',
    'What documents have I uploaded?',
    'Summarize my uploaded documents'
  ];

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  return (
    <div className="chat-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'error' && <FiAlertCircle />}
          {notification.type === 'success' && <FiCheckCircle />}
          {notification.type === 'info' && <FiInfo />}
          {notification.message}
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadingFile && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <span className="progress-text">Uploading... {uploadProgress}%</span>
        </div>
      )}

      <div className="chat-header">
        <div className="header-left">
          <div className="current-chat-header">
            CURRENT CHAT
            <span className="message-count">{messages.length} messages</span>
          </div>
          <h1>{getCurrentConversationTitle()}</h1>
          <p>Ask me anything about flights, baggage, or your uploaded documents</p>
        </div>
        <div className="header-right">
          <button 
            className="btn-secondary"
            onClick={() => navigate('/chat/new')}
            disabled={isLoading}
            title="Start new chat"
          >
            New Chat
          </button>
          <button 
            className="btn-secondary"
            onClick={handleClearChat}
            disabled={messages.length === 0 || isLoading}
            title="Delete conversation"
          >
            <FiTrash2 /> Delete Chat
          </button>
          <button 
            className="btn-secondary"
            onClick={refreshKnowledgeBase}
            disabled={uploadingFile || isLoading}
            title="Refresh knowledge base"
          >
            <FiRefreshCw /> Refresh
          </button>
          <label className="btn-secondary upload-btn" title="Upload document">
            <FiPaperclip />
            Upload
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={uploadingFile || isLoading}
            />
          </label>
          <button 
            className={`btn-secondary ${uploadedDocs.length > 0 ? 'has-docs' : ''}`}
            onClick={() => setShowDocList(!showDocList)}
            title="View uploaded documents"
          >
            <FiFileText /> Docs ({uploadedDocs.length})
          </button>
        </div>
      </div>

      {/* RAG Stats Bar */}
      {ragStats && ragStats.documents > 0 && (
        <div className="rag-stats-bar">
          <div className="stats-item">
            <span className="stats-label">📚 Documents in memory:</span>
            <span className="stats-value">{ragStats.documents}</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">📄 Chunks:</span>
            <span className="stats-value">{ragStats.chunks}</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">🤖 Model:</span>
            <span className="stats-value">{ragStats.groq_model}</span>
          </div>
          <button 
            className="stats-clear-btn"
            onClick={handleClearRAGDocuments}
            title="Clear all documents"
          >
            <FiTrash2 /> Clear All
          </button>
        </div>
      )}

      {/* Document List Sidebar */}
      {showDocList && (
        <div className="doc-sidebar">
          <div className="doc-sidebar-header">
            <h3>Uploaded Documents</h3>
            <button className="close-btn" onClick={() => setShowDocList(false)}>
              <FiX />
            </button>
          </div>
          <div className="doc-sidebar-content">
            {uploadedDocs.length === 0 ? (
              <div className="no-docs">
                <FiFile size={48} />
                <p>No documents uploaded yet</p>
                <p className="no-docs-hint">Upload PDF, DOCX, or TXT files</p>
              </div>
            ) : (
              uploadedDocs.map((doc, index) => (
                <div key={index} className="doc-item">
                  <div className="doc-icon">
                    {doc.source_type === 'PDF Document' ? '📄' : 
                     doc.source_type === 'Word Document' ? '📝' : '📃'}
                  </div>
                  <div className="doc-info">
                    <div className="doc-name">{doc.filename}</div>
                    <div className="doc-meta">
                      <span>{doc.chunks} chunks</span>
                      <span>•</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="doc-actions">
                    <button 
                      className="doc-action-btn"
                      onClick={() => handleAskAboutDocument(doc)}
                      title="Ask about this document"
                    >
                      💬
                    </button>
                    <button 
                      className="doc-action-btn"
                      onClick={() => handleViewDocument(doc)}
                      title="Preview"
                    >
                      <FiEye />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocPreview && selectedDoc && (
        <div className="modal-overlay" onClick={() => setShowDocPreview(false)}>
          <div className="doc-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDoc.filename}</h3>
              <button className="close-btn" onClick={() => setShowDocPreview(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="doc-preview-info">
                <p><strong>Type:</strong> {selectedDoc.source_type || 'Document'}</p>
                <p><strong>Chunks:</strong> {selectedDoc.chunks}</p>
                <p><strong>Uploaded:</strong> {new Date(selectedDoc.uploaded_at).toLocaleString()}</p>
              </div>
              <div className="doc-preview-content">
                <h4>Preview:</h4>
                <div className="preview-text">
                  {selectedDoc.preview || 'No preview available'}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => handleAskAboutDocument(selectedDoc)}
              >
                Ask about this document
              </button>
              <button 
                className="btn-primary"
                onClick={() => setInputMessage(`Summarize the document "${selectedDoc.filename}"`)}
              >
                Summarize
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="welcome-message">
              <h3>👋 Welcome to SkyJet AI Assistant!</h3>
              <p>I'm here to help you with airline-related questions. You can:</p>
              <ul className="welcome-features">
                <li>💬 Ask about flights, baggage, and policies</li>
                <li>📄 Upload documents for analysis</li>
                <li>🔍 Get answers from your uploaded files</li>
                <li>📊 View document statistics</li>
              </ul>
              <div className="suggestions">
                {suggestedQuestions.map((question, index) => (
                  <button 
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="suggestion-btn"
                    disabled={isLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === 'user';
            const content = message.content || message.user_message || message.bot_response || '';
            const time = formatTime(message.created_at);
            const hasDocuments = message.has_documents;
            
            return (
              <div 
                key={message.id || index}
                className={`message ${isUser ? 'user' : 'assistant'} ${hasDocuments ? 'has-docs' : ''}`}
              >
                <div className="message-avatar">
                  {isUser ? <FiUser /> : hasDocuments ? <FiFileText /> : <FiCpu />}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-sender">
                      {isUser ? (user?.name || 'You') : hasDocuments ? 'SkyJet AI (with documents)' : 'SkyJet AI'}
                    </span>
                    <span className="message-time">{time}</span>
                  </div>
                  <div className="message-text">
                    {content.split('\n').map((line, i) => (
                      <p key={i}>{line || <br />}</p>
                    ))}
                  </div>
                  {!isUser && message.sources && message.sources.length > 0 && (
                    <div className="message-sources">
                      <small>📚 Sources: {message.sources.join(', ')}</small>
                    </div>
                  )}
                  {!isUser && message.confidence && (
                    <div className="message-confidence">
                      {formatConfidence(message.confidence)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <span className="typing-text">AI is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <button 
            className="attach-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || isLoading}
            title="Attach file"
          >
            {uploadingFile ? <FiRefreshCw className="spin" /> : <FiPaperclip />}
          </button>
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about flights, policies, or your uploaded documents..."
            disabled={isLoading || uploadingFile}
            rows="1"
          />
          <button
            className="send-btn"
            type="submit"
            disabled={!inputMessage.trim() || isLoading || uploadingFile}
            title="Send message"
          >
            {isLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              <FiSend />
            )}
          </button>
        </div>
        <div className="input-hint">
          <span>Press Enter to send • Shift+Enter for new line</span>
          {uploadingFile && <span className="uploading-text"> • Uploading... {uploadProgress}%</span>}
          {uploadedDocs.length > 0 && (
            <span className="doc-hint"> • {uploadedDocs.length} document(s) in memory</span>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatPage;