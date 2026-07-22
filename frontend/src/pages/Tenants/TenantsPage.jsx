import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { Users, FileText, Camera, ShieldCheck, Heart, UserPlus, Sparkles } from 'lucide-react';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    apiFetch('/tenants').then(res => setTenants(res.data || [])).catch(err => console.error(err));
  }, []);

  const handleOcrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const res = await apiFetch('/tenants/ocr', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64 })
        });
        setOcrData(res.data);
      } catch (err) {
        alert('OCR Failed: ' + err.message);
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Tenant Directory & Verification</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Resident Verification, Document Scanning & Roommate Matching</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('list')}
          >
            <Users size={16} /> Resident Directory
          </button>
          <button 
            className={`btn ${activeTab === 'ocr' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('ocr')}
          >
            <FileText size={16} /> Scan Document (Aadhaar)
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="grid-3">
          {tenants.map(t => (
            <div key={t._id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  {t.name[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>{t.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Room {t.roomId?.roomNumber || 'Unassigned'}</p>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <p>📞 Phone: {t.phone}</p>
                <p>✉️ Email: {t.email}</p>
                <p>💼 Occupation: {t.preferences?.occupation || 'Not specified'}</p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  <ShieldCheck size={10} /> Verified Resident
                </span>
                <span style={{ fontSize: '0.75rem', color: t.violationScore > 20 ? '#fb7185' : '#34d399' }}>
                  Risk Index: {t.violationScore || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'ocr' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary)" /> Smart Aadhaar Scanner & Auto-Fill
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Upload an Aadhaar card image to automatically extract resident details and auto-fill registration form.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={handleOcrUpload}
            className="form-input"
            style={{ marginBottom: '1.5rem' }}
          />

          {ocrLoading && <div style={{ textAlign: 'center', color: 'var(--accent-cyan)' }}>Scanning Aadhaar document...</div>}

          {ocrData && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid var(--primary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              fontSize: '0.88rem'
            }}>
              <h4 style={{ color: '#34d399', fontSize: '0.95rem' }}>✅ Document Processed Successfully</h4>
              <p><strong>Name:</strong> {ocrData.name || 'Not detected'}</p>
              <p><strong>Aadhaar ID:</strong> {ocrData.idNumber || 'Not detected'}</p>
              <p><strong>Date of Birth:</strong> {ocrData.dob || 'Not detected'}</p>
              <p><strong>Gender:</strong> {ocrData.gender || 'Not detected'}</p>
              <p><strong>Address:</strong> {ocrData.address || 'Not detected'}</p>
              <button className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Auto-Fill Form</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
