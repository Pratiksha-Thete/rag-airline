import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalDocuments: 0,
    totalTickets: 0,
    userSatisfaction: 4.5
  });

  const [conversationData, setConversationData] = useState([
    { day: 'Mon', conversations: 0 },
    { day: 'Tue', conversations: 0 },
    { day: 'Wed', conversations: 0 },
    { day: 'Thu', conversations: 0 },
    { day: 'Fri', conversations: 0 },
    { day: 'Sat', conversations: 0 },
    { day: 'Sun', conversations: 0 }
  ]);

  const [pieChartData, setPieChartData] = useState([
    { name: 'Conversations', value: 0, color: '#3b82f6' },
    { name: 'Documents', value: 0, color: '#10b981' }
  ]);

  const [ticketPriorityData, setTicketPriorityData] = useState([
    { name: 'High Priority', value: 0, color: '#ef4444' },
    { name: 'Medium Priority', value: 0, color: '#f59e0b' },
    { name: 'Low Priority', value: 0, color: '#10b981' }
  ]);

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserDashboardData();
    }
  }, [user]);

  const fetchUserDashboardData = async () => {
    try {
      setLoading(true);
      
      const userEmail = user?.email;
      const userId = user?.id;
      
      // Fetch conversations
      let conversationsQuery = supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        conversationsQuery = conversationsQuery.eq('user_id', userId);
      } else if (userEmail) {
        conversationsQuery = conversationsQuery.ilike('session_id', `%${userEmail.split('@')[0]}%`);
      }
      
      // Fetch documents
      const documentsQuery = supabase
        .from('documents')
        .select('*')
        .eq('uploaded_by', userEmail || userId)
        .order('uploaded_at', { ascending: false });
      
      // Fetch tickets
      const ticketsQuery = supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      const [conversationsResult, documentsResult, ticketsResult] = await Promise.all([
        conversationsQuery.limit(500),
        documentsQuery.limit(500),
        ticketsQuery.limit(500)
      ]);

      const conversations = conversationsResult.data || [];
      const documents = documentsResult.data || [];
      const tickets = ticketsResult.data || [];

      // Calculate ticket priorities
      const highPriority = tickets.filter(t => t.priority === 'high').length;
      const mediumPriority = tickets.filter(t => t.priority === 'medium').length;
      const lowPriority = tickets.filter(t => t.priority === 'low').length;

      // Update stats
      setStats({
        totalConversations: conversations.length,
        totalDocuments: documents.length,
        totalTickets: tickets.length,
        userSatisfaction: calculateUserSatisfaction(conversations)
      });

      // Update pie chart data
      setPieChartData([
        { name: 'Conversations', value: conversations.length, color: '#3b82f6' },
        { name: 'Documents', value: documents.length, color: '#10b981' }
      ]);

      // Update ticket priority pie chart
      setTicketPriorityData([
        { name: 'High Priority', value: highPriority, color: '#ef4444' },
        { name: 'Medium Priority', value: mediumPriority, color: '#f59e0b' },
        { name: 'Low Priority', value: lowPriority, color: '#10b981' }
      ]);

      // Process weekly user conversation data
      const weeklyData = processUserWeeklyData(conversations);
      setConversationData(weeklyData);

      // Process user's recent activity
      const activity = processUserRecentActivity(conversations, documents, tickets);
      setRecentActivity(activity);

    } catch (error) {
      console.error('Error fetching user dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserSatisfaction = (conversations) => {
    if (!conversations.length) return 4.5;
    const avgConfidence = conversations.reduce((sum, conv) => {
      const confidence = parseFloat(conv.confidence) || 0.8;
      return sum + confidence;
    }, 0) / conversations.length;
    return Math.round((avgConfidence * 4 + 1) * 10) / 10;
  };

  const processUserWeeklyData = (conversations) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = {};
    days.forEach(day => { weekData[day] = 0; });
    
    conversations.forEach(conv => {
      if (conv.created_at) {
        const dayName = days[new Date(conv.created_at).getDay()];
        if (weekData[dayName] !== undefined) weekData[dayName]++;
      }
    });
    
    return days.map(day => ({ day, conversations: weekData[day] }));
  };

  const processUserRecentActivity = (conversations, documents, tickets) => {
    const activities = [];
    
    // Add user's conversations
    conversations.slice(0, 2).forEach(conv => {
      activities.push({
        id: conv.id,
        type: 'conversation',
        user: 'You',
        action: 'had a conversation',
        preview: conv.user_message?.substring(0, 50) + (conv.user_message?.length > 50 ? '...' : ''),
        time: formatTime(conv.created_at)
      });
    });
    
    // Add user's documents
    documents.slice(0, 2).forEach(doc => {
      activities.push({
        id: doc.id,
        type: 'document',
        user: 'You',
        action: 'uploaded document',
        fileName: doc.filename,
        fileSize: formatFileSize(doc.file_size),
        time: formatTime(doc.uploaded_at)
      });
    });
    
    // Add user's tickets
    tickets.slice(0, 2).forEach(ticket => {
      const priorityIcon = ticket.priority === 'high' ? '🔴' : ticket.priority === 'medium' ? '🟡' : '🟢';
      activities.push({
        id: ticket.id,
        type: 'ticket',
        user: 'You',
        action: `${priorityIcon} ${ticket.status === 'open' ? 'created' : ticket.status} ticket`,
        ticketNumber: ticket.ticket_number,
        priority: ticket.priority,
        time: formatTime(ticket.created_at)
      });
    });
    
    return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Simple Pie Chart Component
  const SimplePieChart = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return (
        <div className="empty-chart">
          <p>No data available</p>
        </div>
      );
    }
    
    let accumulatedAngle = 0;
    
    return (
      <div className="simple-pie-chart">
        <div className="pie-chart-container">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {data.map((item, index) => {
              if (item.value === 0) return null;
              const percentage = (item.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const x1 = 100 + 80 * Math.cos(accumulatedAngle * Math.PI / 180);
              const y1 = 100 + 80 * Math.sin(accumulatedAngle * Math.PI / 180);
              
              accumulatedAngle += angle;
              
              const x2 = 100 + 80 * Math.cos(accumulatedAngle * Math.PI / 180);
              const y2 = 100 + 80 * Math.sin(accumulatedAngle * Math.PI / 180);
              
              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  stroke="white"
                  strokeWidth="2"
                  className="pie-slice"
                />
              );
            })}
            <circle cx="100" cy="100" r="40" fill="white" />
            <text x="100" y="95" textAnchor="middle" fontSize="14" fontWeight="600">
              {total}
            </text>
            <text x="100" y="115" textAnchor="middle" fontSize="12" fill="#666">
              Total
            </text>
          </svg>
        </div>
        <div className="pie-legend">
          {data.map((item, index) => (
            <div key={index} className="pie-legend-item">
              <span className="pie-legend-color" style={{ backgroundColor: item.color }}></span>
              <span className="pie-legend-label">{item.name}</span>
              <span className="pie-legend-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simple Bar Chart Component for Weekly Conversations
  const SimpleBarChart = ({ data }) => {
    const maxValue = Math.max(...data.map(item => item.conversations), 1);
    
    return (
      <div className="simple-bar-chart">
        <div className="chart-bars">
          {data.map((item, index) => (
            <div key={index} className="chart-bar-group">
              <div className="bar-container">
                <div 
                  className="bar bar-conversations" 
                  style={{ height: `${(item.conversations / maxValue) * 100}%` }}
                  title={`You had ${item.conversations} conversation(s) on ${item.day}`}
                >
                  <span className="bar-value">{item.conversations}</span>
                </div>
              </div>
              <div className="bar-label">{item.day}</div>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color conversations"></span>
            <span>Your Conversations</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error loading your data: {error}</p>
        <button onClick={fetchUserDashboardData}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>My Analytics Dashboard</h1>
          <p className="welcome-message">
            Welcome back, {profile?.name || user?.email?.split('@')[0] || 'User'}!
            {stats.totalConversations === 0 && stats.totalDocuments === 0 && stats.totalTickets === 0 && 
              " Start chatting, upload documents, or create tickets to see your activity!"}
          </p>
        </div>
      </div>

      {/* Stats Cards - User Specific */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon conversations">💬</div>
          <div className="stat-content">
            <h3>{stats.totalConversations}</h3>
            <p>Your Conversations</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon documents">📄</div>
          <div className="stat-content">
            <h3>{stats.totalDocuments}</h3>
            <p>Your Documents</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon tickets">🎫</div>
          <div className="stat-content">
            <h3>{stats.totalTickets}</h3>
            <p>Your Support Tickets</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon satisfaction">⭐</div>
          <div className="stat-content">
            <h3>{stats.userSatisfaction}/5</h3>
            <p>Your Satisfaction Score</p>
          </div>
        </div>
      </div>

      {/* Charts Section - User Specific */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Your Weekly Activity</h3>
          <div className="chart-container">
            <SimpleBarChart data={conversationData} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Your Activity Overview</h3>
          <div className="chart-container">
            <SimplePieChart data={pieChartData} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Tickets by Priority</h3>
          <div className="chart-container">
            <SimplePieChart data={ticketPriorityData} />
          </div>
        </div>
      </div>

      {/* Recent Activity - User Specific */}
      <div className="activity-section">
        <h3>Your Recent Activity</h3>
        <div className="activity-list">
          {recentActivity.length === 0 ? (
            <div className="no-activity">
              <p>No recent activity yet.</p>
              <p className="activity-hint">Start a conversation, upload a document, or create a ticket to see your activity here!</p>
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'document' ? '📄' : 
                   activity.type === 'ticket' ? '🎫' : '💬'}
                </div>
                <div className="activity-content">
                  <p>
                    <strong>{activity.user}</strong> {activity.action}
                    {activity.fileName && <span> <strong>{activity.fileName}</strong> {activity.fileSize && `(${activity.fileSize})`}</span>}
                    {activity.ticketNumber && <span> <strong>#{activity.ticketNumber}</strong></span>}
                    {activity.preview && <span className="activity-preview"> - {activity.preview}</span>}
                  </p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;