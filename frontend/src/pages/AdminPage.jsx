import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiSettings, 
  FiDatabase, 
  FiShield, 
  FiBell,
  FiActivity,
  FiCloud,
  FiKey
} from 'react-icons/fi';
import './AdminPage.css';

const AdminPage = () => {
  const [systemStats, setSystemStats] = useState({
    activeUsers: 0,
    totalConversations: 0,
    apiCalls: 0,
    storageUsed: 0
  });

  const [settings, setSettings] = useState({
    aiModel: 'llama-3.3-70b-versatile',
    responseTimeout: 30,
    maxTokens: 500,
    temperature: 0.7,
    enableAnalytics: true,
    enableLogging: true,
    maintenanceMode: false
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Simulate API calls - replace with actual API calls
      setTimeout(() => {
        setSystemStats({
          activeUsers: 42,
          totalConversations: 1247,
          apiCalls: 8923,
          storageUsed: 1.8
        });

        setRecentLogs([
          { id: 1, type: 'info', message: 'System backup completed', timestamp: new Date().toLocaleString() },
          { id: 2, type: 'warning', message: 'API rate limit approaching', timestamp: new Date().toLocaleString() },
          { id: 3, type: 'error', message: 'Database connection timeout', timestamp: new Date().toLocaleString() },
          { id: 4, type: 'info', message: 'User session created', timestamp: new Date().toLocaleString() },
          { id: 5, type: 'info', message: 'Model training completed', timestamp: new Date().toLocaleString() }
        ]);

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetStatistics = () => {
    if (window.confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
      setSystemStats({
        activeUsers: 0,
        totalConversations: 0,
        apiCalls: 0,
        storageUsed: 0
      });
      alert('Statistics reset successfully');
    }
  };

  const getLogTypeColor = (type) => {
    switch(type) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>System configuration and monitoring</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f6' }}>
            <FiUsers />
          </div>
          <div className="stat-content">
            <h3>{systemStats.activeUsers}</h3>
            <p>Active Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}>
            <FiActivity />
          </div>
          <div className="stat-content">
            <h3>{systemStats.totalConversations.toLocaleString()}</h3>
            <p>Total Conversations</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8b5cf6' }}>
            <FiCloud />
          </div>
          <div className="stat-content">
            <h3>{systemStats.apiCalls.toLocaleString()}</h3>
            <p>API Calls</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}>
            <FiDatabase />
          </div>
          <div className="stat-content">
            <h3>{systemStats.storageUsed} GB</h3>
            <p>Storage Used</p>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="settings-section">
        <h2><FiSettings /> System Settings</h2>
        
        <div className="settings-grid">
          <div className="setting-group">
            <label>AI Model</label>
            <select
              value={settings.aiModel}
              onChange={(e) => setSettings({...settings, aiModel: e.target.value})}
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
              <option value="gemini-pro">Gemini Pro</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Response Timeout (seconds)</label>
            <input
              type="number"
              value={settings.responseTimeout}
              onChange={(e) => setSettings({...settings, responseTimeout: parseInt(e.target.value) || 30})}
              min="10"
              max="120"
            />
          </div>

          <div className="setting-group">
            <label>Max Tokens</label>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) => setSettings({...settings, maxTokens: parseInt(e.target.value) || 500})}
              min="100"
              max="2000"
            />
          </div>

          <div className="setting-group">
            <label>Temperature</label>
            <div className="range-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
              />
              <span className="range-value">{settings.temperature.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="toggle-settings">
          <div className="toggle-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enableAnalytics}
                onChange={(e) => setSettings({...settings, enableAnalytics: e.target.checked})}
              />
              <span>Enable Analytics</span>
            </label>
          </div>

          <div className="toggle-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enableLogging}
                onChange={(e) => setSettings({...settings, enableLogging: e.target.checked})}
              />
              <span>Enable Logging</span>
            </label>
          </div>

          <div className="toggle-group">
            <label>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
              />
              <span>Maintenance Mode</span>
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button 
            className="btn-secondary"
            onClick={handleResetStatistics}
          >
            Reset Statistics
          </button>
          <button 
            className="btn-primary"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* System Logs */}
      <div className="logs-section">
        <h2><FiBell /> System Logs</h2>
        <div className="logs-container">
          {recentLogs.map((log) => (
            <div key={log.id} className="log-item">
              <div 
                className="log-type"
                style={{ backgroundColor: getLogTypeColor(log.type) }}
              >
                {log.type.toUpperCase()}
              </div>
              <div className="log-message">{log.message}</div>
              <div className="log-time">{log.timestamp}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <div className="security-section">
        <h2><FiShield /> Security</h2>
        <div className="security-actions">
          <button className="btn-secondary">
            <FiKey /> Rotate API Keys
          </button>
          <button className="btn-secondary">
            Clear Cache
          </button>
          <button className="btn-secondary">
            Backup Database
          </button>
          <button className="btn-danger">
            Emergency Shutdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;