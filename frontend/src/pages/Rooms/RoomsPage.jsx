import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { Search, Sparkles, Home, Shield, Zap, Filter } from 'lucide-react';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [naturalQuery, setNaturalQuery] = useState('');
  const [searchExplanation, setSearchExplanation] = useState('');
  const [loading, setLoading] = useState(true);

  const roomImages = [
    '/images/pg_2.avif',
    '/images/pg_3.avif',
    '/images/pg_1.webp',
    '/images/pg_4.webp'
  ];

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/rooms');
      setRooms(res.data || []);
      setSearchExplanation('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartSearch = async (e) => {
    e.preventDefault();
    if (!naturalQuery.trim()) return fetchRooms();
    setLoading(true);
    try {
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: `Search rooms: ${naturalQuery}` })
      });
      if (res.data) {
        setRooms(res.data);
      }
      setSearchExplanation(res.response);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Smart Room & Vacancy Finder</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ask in natural language e.g. "I need AC room under ₹7000"</p>
        </div>
        <span className="badge badge-cyan" style={{ padding: '0.35rem 0.75rem' }}>
          <Sparkles size={12} /> Natural Search
        </span>
      </div>

      {/* Natural Language Search Bar */}
      <form onSubmit={handleSmartSearch} className="glass-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Search size={18} color="var(--primary)" />
        <input
          type="text"
          className="form-input"
          placeholder="Try: 'Show rooms on second floor' or 'Triple sharing under ₹5000'..."
          value={naturalQuery}
          onChange={(e) => setNaturalQuery(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent' }}
        />
        <button type="submit" className="btn btn-primary">
          <Sparkles size={16} /> Search Rooms
        </button>
        {naturalQuery && (
          <button type="button" onClick={fetchRooms} className="btn btn-secondary">
            Reset
          </button>
        )}
      </form>

      {searchExplanation && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(208, 18, 78, 0.08)',
          border: '1px solid rgba(208, 18, 78, 0.25)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem'
        }}>
          💡 <strong>Search Insight:</strong> {searchExplanation}
        </div>
      )}

      {/* Rooms Grid with Image Cards */}
      <div className="grid-3">
        {rooms.map((room, idx) => (
          <div key={room._id} className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="image-card-frame" style={{ height: '180px', width: '100%', borderRadius: '0' }}>
              <img src={roomImages[idx % roomImages.length]} alt={`Room ${room.roomNumber}`} />
              <span className={`badge badge-${room.status === 'available' ? 'success' : room.status === 'occupied' ? 'danger' : 'warning'}`} style={{ position: 'absolute', top: '12px', right: '12px', background: room.status === 'available' ? '#059669' : '#dc2626', color: 'white' }}>
                {room.status}
              </span>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>Room {room.roomNumber}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Floor {room.floor} | {room.type} sharing</p>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                  ₹{room.rent.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {room.hasAC && <span className="badge badge-primary">AC</span>}
                {room.hasAttachedBathroom && <span className="badge badge-cyan">Attached Bath</span>}
                {room.hasParking && <span className="badge badge-warning">Parking</span>}
                {room.hasWifi && <span className="badge badge-primary">WiFi</span>}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)' }}>
                Occupancy: {room.currentOccupants?.length || 0} / {room.maxOccupants} occupants
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
