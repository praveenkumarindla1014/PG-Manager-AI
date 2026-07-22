import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Plus, Sparkles, Layers, ShieldAlert, CheckCircle2, Clock, Wrench } from 'lucide-react';

export default function ComplaintsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [complaints, setComplaints] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchComplaints();
  }, [filterCategory]);

  const fetchComplaints = () => {
    let url = '/complaints';
    if (filterCategory !== 'all') {
      url += `?category=${filterCategory}`;
    }
    apiFetch(url).then(res => setComplaints(res.data || [])).catch(err => console.error(err));
  };

  const handleRaiseComplaint = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);

    try {
      const res = await apiFetch('/complaints', {
        method: 'POST',
        body: JSON.stringify({ description })
      });
      setDescription('');
      setShowModal(false);
      // Immediately add the new complaint to state
      if (res.data) {
        setComplaints(prev => [res.data, ...prev]);
      }
      fetchComplaints();
    } catch (err) {
      alert('Error raising complaint: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await apiFetch(`/complaints/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setComplaints(prev => prev.map(c => c._id === id ? res.data : c));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
            {isOwner ? 'Resident Complaint Box & Management' : 'My Complaints & Issues'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {isOwner ? 'Auto-categorized complaints, repair estimates & status tracking' : 'Raise and track maintenance or cleaning issues'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> File New Complaint
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="glass-card" style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
        {['all', 'cleaning', 'plumbing', 'electrical', 'wifi-internet', 'ac-cooling', 'pest-control', 'other'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`btn ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', textTransform: 'capitalize' }}
          >
            {cat.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Complaints Feed */}
      {complaints.length === 0 ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No complaints reported in this view.
        </div>
      ) : (
        <div className="grid-2">
          {complaints.map(c => (
            <div key={c._id} className={`glass-card ${c.isEmergency ? 'emergency-active' : ''}`} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>{c.sentimentEmoji || '😐'}</span>
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: '700', textTransform: 'capitalize' }}>
                      Room {c.room?.roomNumber || 'Gen'}: {c.aiCategory || 'General'}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      By: {c.tenant?.name || 'Resident'} ({new Date(c.createdAt).toLocaleDateString()})
                    </p>
                  </div>
                </div>
                <span className={`badge badge-${c.aiPriority === 'emergency' || c.aiPriority === 'high' ? 'danger' : 'warning'}`}>
                  {c.aiPriority}
                </span>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                "{c.description}"
              </p>

              {/* Resolution Info */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}>
                <div style={{ color: '#60a5fa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={12} /> Resolution Details:
                </div>
                <p>⏱️ <strong>Est. Repair Time:</strong> {c.aiEstimatedTime || '4 Hours'}</p>
                <p>🛠️ <strong>Assigned Staff:</strong> {c.aiSuggestedStaff || 'Cleaning Staff'}</p>
                {c.isDuplicate && (
                  <p style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Layers size={12} /> <strong>Duplicate Grouped:</strong> Linked to Master Ticket
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)' }}>
                {isOwner ? (
                  <select
                    className="form-select"
                    value={c.status}
                    onChange={(e) => handleStatusChange(c._id, e.target.value)}
                    style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="open">Status: Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved ✓</option>
                    <option value="closed">Closed</option>
                  </select>
                ) : (
                  <span className={`badge badge-${c.status === 'resolved' ? 'success' : 'primary'}`}>
                    Status: {c.status}
                  </span>
                )}

                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  Urgency Score: {c.urgencyScore || 5}/10
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Complaint Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card" style={{ width: '480px', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.85rem' }}>Report a Complaint / Issue</h3>
            <form onSubmit={handleRaiseComplaint}>
              <div className="form-group">
                <label className="form-label">Describe your issue (e.g. "bathroom not cleaning"):</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="e.g., 'bathroom not cleaning' or 'AC not working properly'"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting & Analyzing...' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
