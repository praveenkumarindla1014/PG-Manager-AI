import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Utensils, HeartPulse, Sparkles, Calendar, Plus, Edit3, Save, X } from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

export default function MenuPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [selectedDay, setSelectedDay] = useState('monday');
  const [menu, setMenu] = useState(null);
  const [dietaryNeed, setDietaryNeed] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit form state for owner
  const [editMenuForm, setEditMenuForm] = useState({
    breakfastText: '',
    lunchText: '',
    snacksText: '',
    dinnerText: ''
  });

  useEffect(() => {
    fetchMenuForDay(selectedDay);
  }, [selectedDay]);

  const fetchMenuForDay = (dayKey) => {
    setLoading(true);
    apiFetch(`/menu?day=${dayKey}`)
      .then(res => {
        setMenu(res.data);
        if (res.data) {
          setEditMenuForm({
            breakfastText: res.data.breakfast?.items?.map(i => i.name).join(', ') || '',
            lunchText: res.data.lunch?.items?.map(i => i.name).join(', ') || '',
            snacksText: res.data.snacks?.items?.map(i => i.name).join(', ') || '',
            dinnerText: res.data.dinner?.items?.map(i => i.name).join(', ') || ''
          });
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleGetRecommendation = async (e) => {
    e.preventDefault();
    if (!dietaryNeed.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/menu/recommend', {
        method: 'POST',
        body: JSON.stringify({ dietaryNeed })
      });
      setRecommendation(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    setLoading(true);

    const parseItems = (str) => {
      if (!str) return [];
      return str.split(',').map(name => ({ name: name.trim(), isVeg: !name.toLowerCase().includes('chicken') && !name.toLowerCase().includes('egg') })).filter(i => i.name);
    };

    const payload = {
      dayOfWeek: selectedDay,
      breakfast: { items: parseItems(editMenuForm.breakfastText), timing: '7:30 AM - 9:30 AM' },
      lunch: { items: parseItems(editMenuForm.lunchText), timing: '12:30 PM - 2:30 PM' },
      snacks: { items: parseItems(editMenuForm.snacksText), timing: '4:30 PM - 5:30 PM' },
      dinner: { items: parseItems(editMenuForm.dinnerText), timing: '7:30 PM - 9:30 PM' }
    };

    try {
      const res = await apiFetch('/menu', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setMenu(res.data);
      setShowEditModal(false);
    } catch (err) {
      alert('Error updating menu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Weekly Food Menu & Nutrition</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select any day (Monday - Sunday) to view or update nutritional meals</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem' }}>
            <HeartPulse size={12} /> Nutrition Insights
          </span>
          {isOwner && (
            <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
              <Edit3 size={16} /> Edit {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Menu
            </button>
          )}
        </div>
      </div>

      {/* Day of Week Selector Tabs (Clean English) */}
      <div className="glass-card" style={{ padding: '0.4rem 0.6rem', display: 'flex', gap: '0.35rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {DAYS_OF_WEEK.map(day => (
          <button
            key={day.key}
            onClick={() => setSelectedDay(day.key)}
            className={`btn ${selectedDay === day.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.5rem 1.1rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: selectedDay === day.key ? '600' : '500'
            }}
          >
            <Calendar size={14} /> {day.label}
          </button>
        ))}
      </div>

      {/* AI Dietary Recommendation Input */}
      <form onSubmit={handleGetRecommendation} className="glass-card" style={{ padding: '1.1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Ask meal suggestions e.g. 'Need high protein diet' or 'Low carb dinner'..."
          value={dietaryNeed}
          onChange={(e) => setDietaryNeed(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Sparkles size={16} /> Get Dietary Advice
        </button>
      </form>

      {recommendation && (
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-emerald)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem', color: '#34d399' }}>
            🥑 Personal Dietary Advice
          </h3>
          <p style={{ fontSize: '0.86rem', marginBottom: '0.75rem' }}>{recommendation.generalAdvice}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {recommendation.recommendations?.map((r, idx) => (
              <div key={idx} style={{ fontSize: '0.82rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                <strong style={{ textTransform: 'capitalize' }}>{r.meal}:</strong> {r.recommended_items?.join(', ')} — <em>{r.reason}</em>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Day's Menu Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading menu for {selectedDay}...</div>
      ) : menu ? (
        <div className="grid-2">
          {['breakfast', 'lunch', 'snacks', 'dinner'].map(meal => (
            <div key={meal} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'capitalize' }}>
                  {meal} ({selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)})
                </h3>
                <span className="badge badge-primary">{menu[meal]?.timing || 'Scheduled'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {menu[meal]?.items && menu[meal].items.length > 0 ? (
                  menu[meal].items.map((item, idx) => (
                    <div key={idx} style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '0.88rem' }}>
                        <span>{item.name} {item.isVeg ? '🟢' : '🔴'}</span>
                        <span style={{ color: 'var(--accent-amber)', fontSize: '0.8rem' }}>
                          {item.nutrition?.calories || 200} Cal
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        <span>Protein: {item.nutrition?.protein || 6}g</span>
                        <span>Carbs: {item.nutrition?.carbs || 30}g</span>
                        <span>Fat: {item.nutrition?.fat || 5}g</span>
                      </div>
                      {item.healthierAlternative && (
                        <div style={{ fontSize: '0.74rem', color: '#34d399', marginTop: '0.3rem' }}>
                          💡 Healthier Option: {item.healthierAlternative}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No items listed for {meal}.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No menu created for {selectedDay} yet. Click "Edit Menu" to add food items.
        </div>
      )}

      {/* Edit Menu Modal for Owner */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card" style={{ width: '540px', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                Edit Menu for {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="btn btn-secondary btn-icon" style={{ width: '30px', height: '30px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMenu}>
              <div className="form-group">
                <label className="form-label">Breakfast (Comma separated):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Idli Sambar, Poha, Tea"
                  value={editMenuForm.breakfastText}
                  onChange={e => setEditMenuForm({ ...editMenuForm, breakfastText: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lunch (Comma separated):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rice, Dal Tadka, Aloo Gobi, Roti"
                  value={editMenuForm.lunchText}
                  onChange={e => setEditMenuForm({ ...editMenuForm, lunchText: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Snacks (Comma separated):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Samosa, Chai"
                  value={editMenuForm.snacksText}
                  onChange={e => setEditMenuForm({ ...editMenuForm, snacksText: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dinner (Comma separated):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Paneer Butter Masala, Roti, Salad"
                  value={editMenuForm.dinnerText}
                  onChange={e => setEditMenuForm({ ...editMenuForm, dinnerText: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : 'Save & Calculate Nutrition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
