// frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Use your Supabase credentials from your .env file
const supabaseUrl = 'https://calruixhpowkluqxykva.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbHJ1aXhocG93a2x1cXh5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDQ3MzksImV4cCI6MjA4MjIyMDczOX0.GqDyhvwvkuaSvpBRelvnepwn8mMWYvatWyvSarOjuJ4';

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
});

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('airline_documents')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return { success: false, error };
    }

    console.log('✅ Supabase connected successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return { success: false, error };
  }
};

// Helper functions for chat sessions
export const chatSessions = {
  // Get all chat sessions for current user
  getChatSessions: async (userId, limit = 20) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return { success: false, error, data: [] };
    }
  },

  // Create a new chat session
  createChatSession: async (userId, title = 'New Conversation') => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: userId,
          title,
          metadata: { source: 'frontend' }
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating chat session:', error);
      return { success: false, error };
    }
  },

  // Update chat session title
  updateChatSession: async (chatId, title) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({ 
          title,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating chat session:', error);
      return { success: false, error };
    }
  },

  // Delete chat session
  deleteChatSession: async (chatId) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting chat session:', error);
      return { success: false, error };
    }
  },

  // Get messages for a chat session
  getChatMessages: async (chatSessionId) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', chatSessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return { success: false, error, data: [] };
    }
  }
};

// Auth helper functions
export const auth = {
  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Sign in with email/password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign up with email/password
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Initialize connection on import
testConnection().then(result => {
  if (result.success) {
    console.log('🎯 Supabase client initialized successfully');
  } else {
    console.warn('⚠️ Supabase connection issue, some features may not work');
  }
});

export default supabase;