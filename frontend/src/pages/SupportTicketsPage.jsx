import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  FiSearch, 
  FiFilter, 
  FiPlus, 
  FiEdit, 
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';
import './SupportTicketsPage.css';

const SupportTicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'general',
    description: '',
    priority: 'medium'
  });

  const statusOptions = [
    { value: 'all', label: 'All Status', color: '#6b7280' },
    { value: 'open', label: 'Open', color: '#ef4444', icon: <FiAlertCircle /> },
    { value: 'in_progress', label: 'In Progress', color: '#f59e0b', icon: <FiClock /> },
    { value: 'resolved', label: 'Resolved', color: '#10b981', icon: <FiCheckCircle /> },
    { value: 'closed', label: 'Closed', color: '#6b7280', icon: <FiCheckCircle /> }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'high', label: 'High', color: '#ef4444' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'low', label: 'Low', color: '#10b981' }
  ];

  const categories = [
    'general', 'baggage', 'booking', 'flight', 'refund', 'special'
  ];

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      alert('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.ticket_number?.toLowerCase().includes(query) ||
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([
          {
            subject: newTicket.subject,
            category: newTicket.category,
            description: newTicket.description,
            priority: newTicket.priority,
            status: 'open',
            user_id: user.id
          }
        ])
        .select();

      if (error) throw error;

      setTickets(prev => [data[0], ...prev]);
      setShowCreateModal(false);
      setNewTicket({
        subject: '',
        category: 'general',
        description: '',
        priority: 'medium'
      });
      alert('Ticket created successfully!');
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    setSubmitting(true);
    try {
      const updates = {
        status: selectedTicket.status,
        priority: selectedTicket.priority,
        updated_at: new Date().toISOString()
      };

      if (selectedTicket.status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      if (selectedTicket.status === 'closed') {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setTickets(prev => prev.map(ticket => 
        ticket.id === selectedTicket.id ? { ...ticket, ...updates } : ticket
      ));
      setShowEditModal(false);
      setSelectedTicket(null);
      alert('Ticket updated successfully!');
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Failed to update ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setTickets(prev => prev.filter(ticket => ticket.id !== selectedTicket.id));
      setShowDeleteModal(false);
      setSelectedTicket(null);
      alert('Ticket deleted successfully!');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.icon || <FiClock />;
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option?.color || '#6b7280';
  };

  if (loading) {
    return (
      <div className="tickets-loading">
        <div className="loading-spinner"></div>
        <p>Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <div>
          <h1>Support Tickets</h1>
          <p>Manage and track your support requests</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={fetchTickets}
            title="Refresh tickets"
          >
            <FiRefreshCw /> Refresh
          </button>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> Create Ticket
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="tickets-stats">
        <div className="stat-card-mini">
          <span className="stat-label">Total</span>
          <span className="stat-number">{tickets.length}</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-label">Open</span>
          <span className="stat-number">{tickets.filter(t => t.status === 'open').length}</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-label">In Progress</span>
          <span className="stat-number">{tickets.filter(t => t.status === 'in_progress').length}</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-label">Resolved</span>
          <span className="stat-number">{tickets.filter(t => t.status === 'resolved').length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="tickets-filters">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by ticket number, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="filter">
            <FiFilter />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter">
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="tickets-list">
        {filteredTickets.length === 0 ? (
          <div className="empty-state">
            <p>No tickets found</p>
            <button 
              className="btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="tickets-grid">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <div className="ticket-id">
                    #{ticket.ticket_number}
                  </div>
                  <div className="ticket-actions">
                    <button 
                      className="icon-btn"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowEditModal(true);
                      }}
                      title="Edit ticket"
                    >
                      <FiEdit />
                    </button>
                    <button 
                      className="icon-btn"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowDeleteModal(true);
                      }}
                      title="Delete ticket"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="ticket-content">
                  <h3>{ticket.subject}</h3>
                  <p className="ticket-description">{ticket.description}</p>
                  
                  <div className="ticket-meta">
                    <div className="meta-item">
                      <span className="meta-label">Category:</span>
                      <span className="meta-value">{ticket.category}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Created:</span>
                      <span className="meta-value">{formatDate(ticket.created_at)}</span>
                    </div>
                    {ticket.resolved_at && (
                      <div className="meta-item">
                        <span className="meta-label">Resolved:</span>
                        <span className="meta-value">{formatDate(ticket.resolved_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ticket-footer">
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(ticket.status) }}
                  >
                    {getStatusIcon(ticket.status)}
                    <span>{statusOptions.find(opt => opt.value === ticket.status)?.label || ticket.status}</span>
                  </div>
                  <div 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                  >
                    {ticket.priority}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Ticket</h2>
            
            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                placeholder="Brief summary of your issue"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                >
                  {priorityOptions.slice(1).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                rows="5"
                placeholder="Describe your issue in detail..."
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateTicket}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Ticket #{selectedTicket.ticket_number}</h2>
            
            <div className="form-group">
              <label>Status</label>
              <select
                value={selectedTicket.status}
                onChange={(e) => setSelectedTicket({...selectedTicket, status: e.target.value})}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={selectedTicket.priority}
                onChange={(e) => setSelectedTicket({...selectedTicket, priority: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowEditModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleUpdateTicket}
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Update Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <h2>Delete Ticket</h2>
            <p>Are you sure you want to delete ticket #{selectedTicket.ticket_number}?</p>
            <p className="warning-text">This action cannot be undone.</p>
            
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={handleDeleteTicket}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsPage;