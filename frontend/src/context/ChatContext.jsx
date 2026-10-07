// context/ChatContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `chat_${timestamp}_${random}`;
  }, []);

  // In ChatContext.jsx, update the loadConversations function:
const loadConversations = useCallback(async () => {
  if (!user) return;

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      // Group by session_id for sidebar
      const sessionsMap = new Map();
      
      data.forEach(conv => {
        if (!sessionsMap.has(conv.session_id)) {
          // Try to get a meaningful title from the first user message
          let title = 'New Chat';
          if (conv.user_message && conv.user_message.trim()) {
            // Use first user message as title (limited to 30 chars)
            title = conv.user_message.length > 30 
              ? conv.user_message.substring(0, 30) + '...' 
              : conv.user_message;
          } else if (conv.bot_response && conv.bot_response.trim()) {
            // If no user message, use bot response
            title = conv.bot_response.length > 30 
              ? conv.bot_response.substring(0, 30) + '...' 
              : conv.bot_response;
          }
          
          // Get preview from bot response
          let preview = '';
          if (conv.bot_response && conv.bot_response.trim()) {
            preview = conv.bot_response.length > 50 
              ? conv.bot_response.substring(0, 50) + '...' 
              : conv.bot_response;
          }
          
          sessionsMap.set(conv.session_id, {
            session_id: conv.session_id,
            title: title,
            preview: preview,
            created_at: conv.created_at,
            updated_at: conv.created_at,
            message_count: 1,
            first_user_message: conv.user_message,
            last_bot_response: conv.bot_response
          });
        } else {
          const session = sessionsMap.get(conv.session_id);
          session.message_count++;
          
          // Update if this message is newer
          if (new Date(conv.created_at) > new Date(session.updated_at)) {
            session.updated_at = conv.created_at;
            
            // Update title if we have a user message
            if (conv.user_message && conv.user_message.trim()) {
              session.title = conv.user_message.length > 30 
                ? conv.user_message.substring(0, 30) + '...' 
                : conv.user_message;
            }
            
            // Update preview with latest bot response
            if (conv.bot_response && conv.bot_response.trim()) {
              session.preview = conv.bot_response.length > 50 
                ? conv.bot_response.substring(0, 50) + '...' 
                : conv.bot_response;
              session.last_bot_response = conv.bot_response;
            }
          }
          
          // Keep track of first user message for title
          if (!session.first_user_message && conv.user_message && conv.user_message.trim()) {
            session.first_user_message = conv.user_message;
            session.title = conv.user_message.length > 30 
              ? conv.user_message.substring(0, 30) + '...' 
              : conv.user_message;
          }
        }
      });

      // Convert map to array and sort by updated_at (most recent first)
      const sessionsArray = Array.from(sessionsMap.values())
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      console.log('Loaded conversations:', sessionsArray);
      setConversations(sessionsArray);
      
      // If no current session, set the most recent one
      if (!currentSessionId && sessionsArray.length > 0) {
        setCurrentSessionId(sessionsArray[0].session_id);
      }
    } else {
      setConversations([]);
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
    setConversations([]);
  }
}, [user, currentSessionId]);

  // Load messages for a specific chat session
  const loadMessages = useCallback(async (sessionId) => {
    if (!user || !sessionId) return;

    try {
      setIsLoading(true);
      setCurrentSessionId(sessionId); // Set the current session
      
      console.log(`Loading messages for session: ${sessionId}`);

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Format messages for display
        const formattedMessages = data.flatMap(msg => {
          const messages = [];
          
          // Add user message
          if (msg.user_message && msg.user_message.trim()) {
            messages.push({
              id: msg.id,
              role: 'user',
              content: msg.user_message,
              user_message: msg.user_message,
              created_at: msg.created_at
            });
          }
          
          // Add bot response
          if (msg.bot_response && msg.bot_response.trim()) {
            messages.push({
              id: `${msg.id}_bot`,
              role: 'assistant',
              content: msg.bot_response,
              bot_response: msg.bot_response,
              confidence: msg.confidence,
              sources: msg.sources || [],
              created_at: msg.created_at
            });
          }
          
          return messages;
        });

        setMessages(formattedMessages);
        console.log(`Loaded ${formattedMessages.length} messages for session ${sessionId}`);
      } else {
        setMessages([]);
        console.log(`No messages found for session ${sessionId}`);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update startNewConversation function:
const startNewConversation = useCallback(async () => {
  const sessionId = generateSessionId();
  console.log(`Starting new conversation with ID: ${sessionId}`);
  
  setCurrentSessionId(sessionId);
  setMessages([]);
  
  // Add to conversations list
  const newConversation = {
    session_id: sessionId,
    title: 'New Chat', // Changed from 'New Conversation' to 'New Chat'
    preview: 'Start a conversation...',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: 0
  };
  
  setConversations(prev => [newConversation, ...prev]);
  
  return sessionId;
}, [generateSessionId]);

  // Send a message
  const sendMessage = useCallback(async (message) => {
    if (!user || !currentSessionId) {
      throw new Error('Please create a new chat first');
    }

    setIsLoading(true);
    
    try {
      console.log(`Sending message to session: ${currentSessionId}`);
      
      // 1. Save user message
      const userMessageData = {
        session_id: currentSessionId,
        user_id: user.id,
        user_message: message,
        bot_response: '',
        created_at: new Date().toISOString()
      };
      
      const { data: savedUserMessage, error: userError } = await supabase
        .from('conversations')
        .insert([userMessageData])
        .select()
        .single();
      
      if (userError) throw userError;

      // Add to local state
      const newUserMessage = {
        id: savedUserMessage.id,
        role: 'user',
        content: message,
        user_message: message,
        created_at: savedUserMessage.created_at
      };
      
      setMessages(prev => [...prev, newUserMessage]);

      // 2. Get AI response
      let aiResponse;
      try {
        const response = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            message: message,
            session_id: currentSessionId,
            user_id: user.id
          })
        });

        if (!response.ok) {
          throw new Error(`AI service error: ${response.status}`);
        }

        aiResponse = await response.json();
      } catch (aiError) {
        console.error('AI response error:', aiError);
        aiResponse = {
          response: "I'm currently unable to process your request. Please try again later.",
          confidence: 0,
          sources: []
        };
      }

      // 3. Save bot response
      const botMessageData = {
        session_id: currentSessionId,
        user_id: user.id,
        user_message: '',
        bot_response: aiResponse.response || aiResponse.message || 'I apologize, but I cannot process your request.',
        confidence: aiResponse.confidence?.toString() || '0.8',
        sources: aiResponse.sources || [],
        created_at: new Date().toISOString()
      };
      
      const { data: savedBotMessage, error: botError } = await supabase
        .from('conversations')
        .insert([botMessageData])
        .select()
        .single();
      
      if (botError) throw botError;

      // Add to local state
      const newBotMessage = {
        id: `${savedBotMessage.id}_bot`,
        role: 'assistant',
        content: botMessageData.bot_response,
        bot_response: botMessageData.bot_response,
        confidence: botMessageData.confidence,
        sources: botMessageData.sources,
        created_at: savedBotMessage.created_at
      };
      
      setMessages(prev => [...prev, newBotMessage]);

// In the sendMessage function, update the part where we update conversation title:
// 4. Update conversation in sidebar
if (messages.length === 0) {
  // First message, set title
  const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
  
  setConversations(prev => 
    prev.map(conv => 
      conv.session_id === currentSessionId 
        ? { 
            ...conv, 
            title: title,
            preview: aiResponse.response?.substring(0, 50) + '...' || 'Conversation started...',
            updated_at: new Date().toISOString(),
            message_count: (conv.message_count || 0) + 2,
            first_user_message: message
          }
        : conv
    )
  );
} else {
  // Update preview with latest bot response
  const preview = aiResponse.response 
    ? (aiResponse.response.length > 50 
        ? aiResponse.response.substring(0, 50) + '...' 
        : aiResponse.response)
    : conv.preview;
    
  setConversations(prev => 
    prev.map(conv => 
      conv.session_id === currentSessionId 
        ? { 
            ...conv, 
            preview: preview,
            updated_at: new Date().toISOString(),
            message_count: (conv.message_count || 0) + 2,
            last_bot_response: aiResponse.response
          }
        : conv
    )
  );
}

      // Refresh conversations list
      await loadConversations();
      
      return newBotMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentSessionId, messages, loadConversations]);

  // Delete conversation
  const deleteConversation = useCallback(async (sessionId) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
      
      if (error) throw error;

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.session_id !== sessionId));
      
      // If deleting current conversation, create new one
      if (currentSessionId === sessionId) {
        await startNewConversation();
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }, [user, currentSessionId, startNewConversation]);

  // Update conversation title
  const updateConversationTitle = useCallback((sessionId, newTitle) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.session_id === sessionId 
          ? { ...conv, title: newTitle }
          : conv
      )
    );
  }, []);

  // Initialize
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  const value = {
    // State
    conversations,
    currentSessionId,
    messages,
    isLoading,
    
    // Actions
    loadConversations,
    loadMessages,
    startNewConversation,
    sendMessage,
    deleteConversation,
    updateConversationTitle
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};