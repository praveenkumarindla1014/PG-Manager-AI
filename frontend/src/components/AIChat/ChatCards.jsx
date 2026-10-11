import React from 'react';
import { BedDouble, MessageCircle, ListChecks, Wallet, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui';
import { inr, formatDate, titleCase } from '../../utils/format';

/**
 * Structured results returned by the assistant, rendered as compact cards.
 */
export default function ChatCards({ cards = [] }) {
  return cards.map((card, i) => <ChatCard key={i} card={card} />);
}

function ChatCard({ card }) {
  const navigate = useNavigate();
  const { type, data } = card;

  if (type === 'reminders' && Array.isArray(data) && data.length) {
    return (
      <div className="ai-card">
        <div className="tiny bold faint row-sm"><MessageCircle size={13} />WhatsApp reminders</div>
        {data.map((r, i) => (
          <div key={i} className="ai-card-row">
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="bold ellipsis">{r.tenant} <span className="faint">· Room {r.room}</span></div>
              <div className="tiny muted">{inr(r.amount)} · <Badge status={r.status} /></div>
            </div>
            {r.whatsappLink
              ? <a className="btn btn-whatsapp btn-xs" href={r.whatsappLink} target="_blank" rel="noreferrer">Send</a>
              : <span className="tiny faint">No phone</span>}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'rooms') {
    const rooms = Array.isArray(data) ? data : data ? [data] : [];
    if (!rooms.length) return null;
    return (
      <div className="ai-card">
        <div className="tiny bold faint row-sm"><BedDouble size={13} />Rooms</div>
        {rooms.slice(0, 6).map((r, i) => (
          <div key={i} className="ai-card-row">
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="bold">Room {r.roomNumber} <span className="faint capitalize">· {r.type}</span></div>
              <div className="tiny muted ellipsis">{(r.features || []).slice(0, 4).join(' · ') || `Floor ${r.floor}`}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="bold">{inr(r.rent)}</div>
              <div className="tiny text-success bold">{r.freeBeds} bed{r.freeBeds === 1 ? '' : 's'} free</div>
            </div>
          </div>
        ))}
        <button className="btn btn-ghost btn-xs" onClick={() => navigate('/rooms')}>Open rooms →</button>
      </div>
    );
  }

  if (type === 'payments') {
    const rows = Array.isArray(data) ? data : data?.history;
    if (!rows?.length) return null;
    return (
      <div className="ai-card">
        <div className="tiny bold faint row-sm"><Wallet size={13} />Payments</div>
        {rows.slice(0, 6).map((p, i) => (
          <div key={i} className="ai-card-row">
            <div className="grow">
              <div className="bold">{p.tenant || p.month}</div>
              {p.room && <div className="tiny muted">Room {p.room}{p.daysOverdue ? ` · ${p.daysOverdue} days overdue` : ''}</div>}
              {p.paidDate && <div className="tiny muted">Paid {formatDate(p.paidDate)}</div>}
            </div>
            <span className="bold">{inr(p.amount)}</span>
            <Badge status={p.status} />
          </div>
        ))}
        <button className="btn btn-ghost btn-xs" onClick={() => navigate('/payments')}>Open payments →</button>
      </div>
    );
  }

  if (type === 'todo' && Array.isArray(data) && data.length) {
    return (
      <div className="ai-card">
        <div className="tiny bold faint row-sm"><ListChecks size={13} />Today's to-do</div>
        {data.slice(0, 8).map((t, i) => (
          <button key={i} className="ai-card-row" style={{ border: 'none', textAlign: 'left', cursor: t.link ? 'pointer' : 'default' }} onClick={() => t.link && navigate(t.link)}>
            <Badge status={t.priority} />
            <span className="grow">{t.task}</span>
          </button>
        ))}
      </div>
    );
  }

  if (type === 'complaints' && Array.isArray(data) && data.length) {
    return (
      <div className="ai-card">
        <div className="tiny bold faint row-sm"><Wrench size={13} />Complaints</div>
        {data.slice(0, 5).map((c, i) => (
          <div key={i} className="ai-card-row">
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="bold ellipsis">{c.issue}</div>
              <div className="tiny muted">{c.room ? `Room ${c.room} · ` : ''}{titleCase(c.category || '')}</div>
            </div>
            <Badge status={c.status} />
          </div>
        ))}
        <button className="btn btn-ghost btn-xs" onClick={() => navigate('/complaints')}>Open complaints →</button>
      </div>
    );
  }

  return null;
}
