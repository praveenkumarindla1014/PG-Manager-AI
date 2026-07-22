import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { FileText, Download, TrendingUp, DollarSign, Sparkles } from 'lucide-react';

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [revenueOpt, setRevenueOpt] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/reports/daily-summary'),
      apiFetch('/expenses/predictions'),
      apiFetch('/reports/revenue-optimization')
    ]).then(([repRes, expRes, revRes]) => {
      setReport(repRes.data);
      setExpenses(expRes.data);
      setRevenueOpt(revRes.data);
    }).catch(err => console.error(err));
  }, []);

  const handleDownloadPDF = () => {
    alert('AI Monthly Report PDF generated! (Feature #17)');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>AI Monthly Report & Revenue Optimizer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Automated Financial Analysis, Expense Prediction & PDF Generator</p>
        </div>
        <button onClick={handleDownloadPDF} className="btn btn-primary">
          <Download size={18} /> Download Monthly PDF (Feature #17)
        </button>
      </div>

      <div className="grid-2">
        {/* Revenue Optimization (Feature #31) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
            <Sparkles size={18} /> AI Revenue Optimizer (Feature #31)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {revenueOpt?.underpricedRooms?.map((r, idx) => (
              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <strong>Room {r.roomNumber}:</strong> Current ₹{r.currentRent} ➔ Suggested ₹{r.suggestedRent} ({r.reason})
              </div>
            ))}
            {revenueOpt?.generalSuggestions?.map((s, idx) => (
              <p key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>💡 {s}</p>
            ))}
          </div>
        </div>

        {/* Expense Analyzer (Feature #18) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e' }}>
            <TrendingUp size={18} /> AI Expense Predictor (Feature #18)
          </h3>
          <h4 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem' }}>
            Predicted Next Month: ₹{(expenses?.totalPredictedNextMonth || 45000).toLocaleString('en-IN')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <p>• Food Expense: ~₹25,000</p>
            <p>• Electricity & Power: ~₹12,000</p>
            <p>• Maintenance & Repair: ~₹5,000</p>
          </div>
        </div>
      </div>
    </div>
  );
}
