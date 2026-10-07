import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiMessageSquare, 
  FiBarChart2, 
  FiUsers, 
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiTrash2,
  FiFolder,
  FiSearch,
  FiPlus,
  FiEdit2,
  FiMoreVertical,
  FiCheck,
  FiX,
  FiMessageCircle
} from 'react-icons/fi';
import './Sidebar.css';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    conversations, 
    currentSessionId,
    isLoading,
    loadMessages,
    startNewConversation,
    deleteConversation,
    updateConversationTitle
  } = useChat();
  
  const [showChats, setShowChats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showActions, setShowActions] = useState(null);

  // Format time for sidebar
  const formatSidebarTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  };

  // Group conversations by time
  const groupedConversations = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      week: [],
      month: [],
      older: []
    };
    
    const now = new Date();
    
    conversations.forEach(conv => {
      const convDate = new Date(conv.updated_at);
      const diffMs = now - convDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) groups.today.push(conv);
      else if (diffDays === 1) groups.yesterday.push(conv);
      else if (diffDays < 7) groups.week.push(conv);
      else if (diffDays < 30) groups.month.push(conv);
      else groups.older.push(conv);
    });
    
    return groups;
  }, [conversations]);

  // Filter conversations
  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    
    const searchLower = searchTerm.toLowerCase();
    return conversations.filter(chat => 
      chat.title?.toLowerCase().includes(searchLower) ||
      chat.preview?.toLowerCase().includes(searchLower)
    );
  }, [conversations, searchTerm]);

  const handleChatSelect = async (sessionId) => {
    if (sessionId === currentSessionId) return;
    
    try {
      await loadMessages(sessionId);
      navigate(`/chat/${sessionId}`);
    } catch (error) {
      console.error('Error selecting chat:', error);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const newSessionId = await startNewConversation();
      navigate(`/chat/${newSessionId}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  // Handle delete chat
  const handleDeleteChat = async (sessionId, e) => {
    e?.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(sessionId);
      setShowActions(null);
    }
  };

  // Handle rename chat
  const handleRenameChat = (sessionId, newTitle) => {
    if (newTitle.trim()) {
      updateConversationTitle(sessionId, newTitle.trim());
    }
    setEditingTitle(null);
    setEditTitleValue('');
    setShowActions(null);
  };

  // Start editing title
  const startEditingTitle = (sessionId, currentTitle, e) => {
    e?.stopPropagation();
    setEditingTitle(sessionId);
    setEditTitleValue(currentTitle);
    setShowActions(null);
  };

  // Menu items - removed admin and analytics, changed dashboard path to /dashboard
  const menuItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      icon: <FiHome />,
      label: 'Dashboard',
      exact: true
    },
    {
      id: 'new-chat',
      path: '/chat',
      icon: <FiMessageSquare />,
      label: 'New Chat',
      exact: true,
      onClick: handleCreateNewChat
    },
    {
      id: 'tickets',
      path: '/tickets',
      icon: <FiUsers />,
      label: 'Support Tickets'
    }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Get conversation title
  const getConversationTitle = (conv) => {
    if (editingTitle === conv.session_id) {
      return (
        <input
          type="text"
          value={editTitleValue}
          onChange={(e) => setEditTitleValue(e.target.value)}
          onBlur={() => handleRenameChat(conv.session_id, editTitleValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleRenameChat(conv.session_id, editTitleValue);
            } else if (e.key === 'Escape') {
              setEditingTitle(null);
              setEditTitleValue('');
            }
          }}
          autoFocus
          className="title-edit-input"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    return conv.title || 'New Chat';
  };

  // Close actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showActions) {
        setShowActions(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showActions]);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="header-content">
          {isOpen && (
            <div className="sidebar-brand">
              <FiMessageCircle className="brand-icon" />
              <span className="brand-name">Chat Assistant</span>
            </div>
          )}
          <button 
            className="sidebar-toggle"
            onClick={onToggle}
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <FiChevronLeft /> : <FiChevronRight />}
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
            title={item.label}
            onClick={item.onClick}
            aria-label={item.label}
          >
            <span className="nav-icon">
              {item.icon}
            </span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Chat History Section */}
      {isOpen && (
        <div className="chat-history-section">
          <div className="history-header">
            <div className="history-title">
              <FiFolder />
              <span>Chat History</span>
              <span className="history-count">{conversations.length}</span>
            </div>
            <div className="history-actions">
              <button 
                className="new-chat-btn"
                onClick={handleCreateNewChat}
                title="New chat"
                aria-label="New chat"
              >
                <FiPlus />
              </button>
              <button 
                className="history-toggle-btn"
                onClick={() => setShowChats(!showChats)}
                title={showChats ? "Collapse" : "Expand"}
                aria-label={showChats ? "Collapse chat history" : "Expand chat history"}
                aria-expanded={showChats}
              >
                {showChats ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            </div>
          </div>

          {showChats && (
            <div className="history-content">
              {/* Search Bar */}
              <div className="history-search">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  aria-label="Search conversations"
                />
                {searchTerm && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => setSearchTerm('')}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              <div className="history-list">
                {isLoading ? (
                  <div className="history-loading" aria-label="Loading conversations">
                    <div className="loading-spinner"></div>
                    <span>Loading conversations...</span>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="history-empty">
                    <FiMessageSquare size={24} />
                    <span>{searchTerm ? 'No conversations found' : 'No conversations yet'}</span>
                    {!searchTerm && (
                      <button 
                        className="start-chat-btn"
                        onClick={handleCreateNewChat}
                        aria-label="Start new chat"
                      >
                        Start New Chat
                      </button>
                    )}
                  </div>
                ) : (
                  // Grouped conversations
                  <>
                    {searchTerm ? (
                      // When searching, show all results flat
                      filteredChats.map((chat) => (
                        <ConversationItem
                          key={chat.session_id}
                          chat={chat}
                          isActive={currentSessionId === chat.session_id}
                          onSelect={handleChatSelect}
                          onDelete={handleDeleteChat}
                          onRename={startEditingTitle}
                          showActions={showActions}
                          setShowActions={setShowActions}
                          editingTitle={editingTitle}
                          editTitleValue={editTitleValue}
                          setEditTitleValue={setEditTitleValue}
                          onSaveEdit={handleRenameChat}
                          formatTime={formatSidebarTime}
                          getTitle={getConversationTitle}
                        />
                      ))
                    ) : (
                      // When not searching, show grouped
                      <>
                        {groupedConversations.today.length > 0 && (
                          <div className="history-section">
                            <div className="section-title">Today</div>
                            {groupedConversations.today.map((chat) => (
                              <ConversationItem
                                key={chat.session_id}
                                chat={chat}
                                isActive={currentSessionId === chat.session_id}
                                onSelect={handleChatSelect}
                                onDelete={handleDeleteChat}
                                onRename={startEditingTitle}
                                showActions={showActions}
                                setShowActions={setShowActions}
                                editingTitle={editingTitle}
                                editTitleValue={editTitleValue}
                                setEditTitleValue={setEditTitleValue}
                                onSaveEdit={handleRenameChat}
                                formatTime={formatSidebarTime}
                                getTitle={getConversationTitle}
                              />
                            ))}
                          </div>
                        )}
                        
                        {groupedConversations.yesterday.length > 0 && (
                          <div className="history-section">
                            <div className="section-title">Yesterday</div>
                            {groupedConversations.yesterday.map((chat) => (
                              <ConversationItem
                                key={chat.session_id}
                                chat={chat}
                                isActive={currentSessionId === chat.session_id}
                                onSelect={handleChatSelect}
                                onDelete={handleDeleteChat}
                                onRename={startEditingTitle}
                                showActions={showActions}
                                setShowActions={setShowActions}
                                editingTitle={editingTitle}
                                editTitleValue={editTitleValue}
                                setEditTitleValue={setEditTitleValue}
                                onSaveEdit={handleRenameChat}
                                formatTime={formatSidebarTime}
                                getTitle={getConversationTitle}
                              />
                            ))}
                          </div>
                        )}
                        
                        {groupedConversations.week.length > 0 && (
                          <div className="history-section">
                            <div className="section-title">Last 7 days</div>
                            {groupedConversations.week.map((chat) => (
                              <ConversationItem
                                key={chat.session_id}
                                chat={chat}
                                isActive={currentSessionId === chat.session_id}
                                onSelect={handleChatSelect}
                                onDelete={handleDeleteChat}
                                onRename={startEditingTitle}
                                showActions={showActions}
                                setShowActions={setShowActions}
                                editingTitle={editingTitle}
                                editTitleValue={editTitleValue}
                                setEditTitleValue={setEditTitleValue}
                                onSaveEdit={handleRenameChat}
                                formatTime={formatSidebarTime}
                                getTitle={getConversationTitle}
                              />
                            ))}
                          </div>
                        )}
                        
                        {groupedConversations.month.length > 0 && (
                          <div className="history-section">
                            <div className="section-title">Last 30 days</div>
                            {groupedConversations.month.map((chat) => (
                              <ConversationItem
                                key={chat.session_id}
                                chat={chat}
                                isActive={currentSessionId === chat.session_id}
                                onSelect={handleChatSelect}
                                onDelete={handleDeleteChat}
                                onRename={startEditingTitle}
                                showActions={showActions}
                                setShowActions={setShowActions}
                                editingTitle={editingTitle}
                                editTitleValue={editTitleValue}
                                setEditTitleValue={setEditTitleValue}
                                onSaveEdit={handleRenameChat}
                                formatTime={formatSidebarTime}
                                getTitle={getConversationTitle}
                              />
                            ))}
                          </div>
                        )}
                        
                        {groupedConversations.older.length > 0 && (
                          <div className="history-section">
                            <div className="section-title">Older</div>
                            {groupedConversations.older.map((chat) => (
                              <ConversationItem
                                key={chat.session_id}
                                chat={chat}
                                isActive={currentSessionId === chat.session_id}
                                onSelect={handleChatSelect}
                                onDelete={handleDeleteChat}
                                onRename={startEditingTitle}
                                showActions={showActions}
                                setShowActions={setShowActions}
                                editingTitle={editingTitle}
                                editTitleValue={editTitleValue}
                                setEditTitleValue={setEditTitleValue}
                                onSaveEdit={handleRenameChat}
                                formatTime={formatSidebarTime}
                                getTitle={getConversationTitle}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Removed User Info section - It's in the navbar */}
    </aside>
  );
};

// Conversation Item Component
const ConversationItem = ({ 
  chat, 
  isActive, 
  onSelect, 
  onDelete, 
  onRename,
  showActions,
  setShowActions,
  editingTitle,
  editTitleValue,
  setEditTitleValue,
  onSaveEdit,
  formatTime,
  getTitle
}) => {
  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowActions(showActions === chat.session_id ? null : chat.session_id);
  };

  const handleCancelEdit = () => {
    setShowActions(null);
  };

  return (
    <div
      className={`history-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(chat.session_id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(chat.session_id);
        }
      }}
      aria-label={`Select chat: ${chat.title || 'New Chat'}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="history-item-icon">
        <FiMessageSquare />
      </div>
      <div className="history-item-content">
        <div className="history-item-header">
          <div className="history-item-title">
            {getTitle(chat)}
          </div>
          {!editingTitle && (
            <button 
              className="history-item-menu"
              onClick={handleMenuClick}
              title="More options"
              aria-label="More options"
            >
              <FiMoreVertical size={14} />
            </button>
          )}
        </div>
        
        {chat.preview && (
          <div className="history-item-preview">
            {chat.preview}
          </div>
        )}
        
        <div className="history-item-meta">
          <div className="history-item-time">
            <FiClock size={10} />
            {formatTime(chat.updated_at)}
          </div>
          {chat.message_count > 1 && (
            <div className="message-count">
              {chat.message_count} messages
            </div>
          )}
        </div>

        {/* Actions Dropdown */}
        {showActions === chat.session_id && !editingTitle && (
          <div className="history-item-actions-dropdown">
            <button
              className="dropdown-action rename"
              onClick={(e) => onRename(chat.session_id, chat.title, e)}
              aria-label="Rename conversation"
            >
              <FiEdit2 size={12} />
              Rename
            </button>
            <button
              className="dropdown-action delete"
              onClick={(e) => onDelete(chat.session_id, e)}
              aria-label="Delete conversation"
            >
              <FiTrash2 size={12} />
              Delete
            </button>
          </div>
        )}

        {/* Edit Mode */}
        {editingTitle === chat.session_id && (
          <div className="edit-actions">
            <button
              className="edit-action save"
              onClick={() => onSaveEdit(chat.session_id, editTitleValue)}
              title="Save"
              aria-label="Save changes"
            >
              <FiCheck />
            </button>
            <button
              className="edit-action cancel"
              onClick={handleCancelEdit}
              title="Cancel"
              aria-label="Cancel editing"
            >
              <FiX />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 