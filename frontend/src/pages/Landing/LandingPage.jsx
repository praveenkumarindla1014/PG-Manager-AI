import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Sparkles, Wallet, MessageSquareWarning, UtensilsCrossed, DoorOpen, BarChart3, Megaphone,
  Languages, Mic, ShieldAlert, ArrowRight, Check, Star, BedDouble, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/AppContext';

const FEATURES = [
  { icon: Sparkles, title: 'An AI manager that actually does things', text: 'Ask "who hasn\'t paid?" and it lists them — then sends polite WhatsApp reminders when you say so.', tone: 'brand' },
  { icon: Wallet, title: 'Rent on autopilot', text: 'Monthly dues are created automatically, late fees calculated, UPI payments confirmed in one tap.', tone: 'success' },
  { icon: MessageSquareWarning, title: 'Complaints sorted in seconds', text: 'Every issue is categorised, prioritised and routed — duplicates grouped, emergencies escalated instantly.', tone: 'warning' },
  { icon: UtensilsCrossed, title: 'Menus residents love', text: 'Weekly menu with nutrition, plus personal diet tips for gym-goers, students and everyone between.', tone: 'teal' },
  { icon: DoorOpen, title: 'Visitor gate log', text: 'Residents pre-register guests; you approve at the gate. Everyone knows who\'s in the building.', tone: 'info' },
  { icon: BarChart3, title: 'Know your numbers', text: 'Live occupancy, collections, expenses and profit — with a one-click monthly PDF report.', tone: 'violet' }
];

const CHAT = [
  { from: 'user', text: 'naa room lo fan pani cheyatledu 😓' },
  { from: 'ai', text: 'అయ్యో! Room 102 fan complaint register చేశాను ✅ Electrician 4 గంటల్లో వస్తారు.' },
  { from: 'user', text: "Who hasn't paid rent this month?" },
  { from: 'ai', text: '3 residents — ₹15,000 pending. Rahul (102), Suresh (104) and Meera (304). Want me to send WhatsApp reminders?' }
];

const toneColor = {
  brand: ['var(--brand-50)', 'var(--brand)'], success: ['var(--success-bg)', 'var(--success)'], warning: ['var(--warning-bg)', 'var(--warning)'],
  teal: ['var(--teal-bg)', 'var(--teal)'], info: ['var(--info-bg)', 'var(--info)'], violet: ['var(--violet-bg)', 'var(--violet)']
};

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const appLink = user ? (user.role === 'owner' ? '/owner-dashboard' : '/tenant-dashboard') : '/login';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        .lp-wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .lp-hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 48px; align-items: center; padding: 56px 0 72px; }
        .lp-h1 { font-family: var(--font-display); font-size: clamp(2.4rem, 5vw, 3.9rem); line-height: 1.04; letter-spacing: -0.035em; font-weight: 600; }
        .lp-h2 { font-family: var(--font-display); font-size: clamp(1.8rem, 3.4vw, 2.6rem); line-height: 1.1; letter-spacing: -0.03em; font-weight: 600; }
        .lp-collage { position: relative; height: 520px; }
        .lp-collage img { position: absolute; object-fit: cover; border-radius: 22px; box-shadow: var(--shadow-lg); }
        .lp-section { padding: 72px 0; }
        .lp-nav-links a { color: var(--ink-2); font-weight: 600; font-size: 0.9rem; }
        .lp-nav-links a:hover { color: var(--ink); text-decoration: none; }
        @media (max-width: 920px) {
          .lp-hero { grid-template-columns: 1fr; padding-top: 32px; }
          .lp-collage { height: 380px; }
          .lp-nav-links { display: none !important; }
        }
      `}</style>

      {/* Nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'color-mix(in srgb, var(--bg) 85%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap row lp-nav" style={{ height: 68 }}>
          <Link to="/" className="row" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="brand-mark"><Building2 size={20} /></span>
            <span className="brand-name">PG Manager</span>
          </Link>
          <nav className="row lp-nav-links" style={{ gap: 28, marginLeft: 40 }}>
            <a href="#features">Features</a>
            <a href="#assistant">AI assistant</a>
            <a href="#rooms">Rooms</a>
            <a href="#faq">Why us</a>
          </nav>
          <div className="row right">
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            {user ? (
              <Link to={appLink} className="btn btn-primary">Open dashboard <ArrowRight size={16} /></Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                <Link to="/register" className="btn btn-primary">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-wrap lp-hero">
        <div className="stack-lg">
          <span className="badge tone-brand" style={{ alignSelf: 'flex-start', height: 30, padding: '0 14px', fontSize: '0.78rem' }}>
            <Sparkles size={14} /> Your PG, managed by AI — in 5 Indian languages
          </span>
          <h1 className="lp-h1">
            The calm way to run a <span style={{ color: 'var(--brand)', fontStyle: 'italic' }}>paying guest</span> home.
          </h1>
          <p className="muted" style={{ fontSize: '1.12rem', maxWidth: 540 }}>
            Rent, rooms, complaints, menus and visitors in one warm, simple app — with an assistant that chases payments, fixes problems and answers residents at 2 AM so you don't have to.
          </p>
          <div className="row wrap">
            <Link to={appLink} className="btn btn-primary btn-lg">{user ? 'Go to my dashboard' : 'Try the live demo'} <ArrowRight size={18} /></Link>
            {!user && <Link to="/register" className="btn btn-secondary btn-lg">I'm a resident</Link>}
          </div>
          <div className="row wrap small muted" style={{ gap: 18 }}>
            {['No spreadsheets', 'WhatsApp reminders', 'Works on any phone'].map(t => (
              <span key={t} className="row-sm bold"><Check size={16} className="text-success" />{t}</span>
            ))}
          </div>
        </div>

        <div className="lp-collage">
          <img src="/images/pg_2.avif" alt="Bright twin-sharing room" style={{ width: '62%', height: '64%', right: 0, top: 0, animation: 'float 7s ease-in-out infinite' }} />
          <img src="/images/pg_3.avif" alt="Common area" style={{ width: '48%', height: '46%', left: 0, bottom: 20, animation: 'float 8s ease-in-out infinite 0.8s' }} />
          <div className="card" style={{ position: 'absolute', left: '6%', top: '8%', width: 250, padding: 14, boxShadow: 'var(--shadow-lg)', animation: 'float 6s ease-in-out infinite 0.4s' }}>
            <div className="row-sm tiny bold faint"><Sparkles size={13} className="text-brand" />PG Buddy · just now</div>
            <p className="small mt-2" style={{ fontWeight: 600 }}>Good morning Rajesh ☀️ ₹54,500 collected this month. 3 rents pending — shall I remind them?</p>
          </div>
          <div className="card row" style={{ position: 'absolute', right: '4%', bottom: '4%', padding: '12px 16px', boxShadow: 'var(--shadow-lg)', gap: 12 }}>
            <span className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><BedDouble size={18} /></span>
            <span>
              <span className="bold" style={{ display: 'block' }}>87% occupied</span>
              <span className="tiny faint">13 beds free · 3 floors</span>
            </span>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="lp-wrap grid-4" style={{ padding: '28px 24px' }}>
          {[['35+', 'AI features built in'], ['5', 'languages understood'], ['< 5s', 'to log a complaint'], ['24/7', 'resident help desk']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div className="display" style={{ fontSize: '2rem', color: 'var(--brand)' }}>{v}</div>
              <div className="small muted bold">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="lp-wrap lp-section stack-lg">
        <div style={{ maxWidth: 640 }}>
          <div className="small bold text-brand">EVERYTHING IN ONE PLACE</div>
          <h2 className="lp-h2 mt-2">Less chasing. More living.</h2>
          <p className="muted mt-3" style={{ fontSize: '1.02rem' }}>Built with PG owners in Bengaluru, Hyderabad and Chennai — the boring work is automatic, the important things reach you instantly.</p>
        </div>
        <div className="grid-3">
          {FEATURES.map(f => (
            <div key={f.title} className="card card-pad card-hover stack">
              <span className="stat-icon" style={{ width: 44, height: 44, borderRadius: 14, background: toneColor[f.tone][0], color: toneColor[f.tone][1] }}><f.icon size={21} /></span>
              <h3 style={{ fontSize: '1.05rem' }}>{f.title}</h3>
              <p className="muted small" style={{ lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Assistant demo */}
      <section id="assistant" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-wrap lp-section lp-hero" style={{ padding: '72px 24px' }}>
          <div className="stack-lg">
            <div className="small bold text-brand">MEET PG BUDDY</div>
            <h2 className="lp-h2">An assistant that speaks like a person — and your residents' language.</h2>
            <p className="muted" style={{ fontSize: '1.02rem' }}>Type or talk in English, Hindi, Telugu, Tamil or Kannada. PG Buddy looks up real data, takes action, and replies warmly — never with made-up numbers.</p>
            <div className="stack">
              {[
                [Languages, 'Understands mixed language like "naa room lo fan pani cheyatledu"'],
                [Mic, 'Voice input and read-aloud replies, hands-free'],
                [ShieldAlert, 'Fire, gas leak or medical? Owner gets a siren alert instantly'],
                [Megaphone, '"Water cut tomorrow 10–2" becomes a polished notice in 5 languages']
              ].map(([I, t]) => (
                <div key={t} className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand)' }}><I size={17} /></span>
                  <span className="bold" style={{ paddingTop: 6 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-lg)', borderRadius: 24 }}>
            <div className="chat-head">
              <div className="chat-avatar"><Sparkles size={20} /></div>
              <div><div className="bold">PG Buddy</div><div className="tiny" style={{ opacity: 0.9 }}>Online · replies instantly</div></div>
            </div>
            <div className="chat-body" style={{ minHeight: 340 }}>
              {CHAT.map((m, i) => (
                <div key={i} className={`msg ${m.from === 'user' ? 'msg-user' : 'msg-ai'}`} style={{ animationDelay: `${i * 0.15}s` }}>
                  <div className="bubble">{m.text}</div>
                </div>
              ))}
              <div className="msg msg-ai"><div className="bubble" style={{ padding: 0 }}><div className="typing"><span /><span /><span /></div></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Rooms gallery */}
      <section id="rooms" className="lp-wrap lp-section stack-lg">
        <div className="row between wrap">
          <div>
            <div className="small bold text-brand">STAY WITH US</div>
            <h2 className="lp-h2 mt-2">Rooms that feel like home</h2>
          </div>
          <Link to={appLink} className="btn btn-secondary">See live availability <ArrowRight size={16} /></Link>
        </div>
        <div className="grid-4">
          {[['pg_1.webp', 'Single rooms', 'from ₹8,000'], ['pg_2.avif', 'Twin sharing', 'from ₹6,000'], ['pg_3.avif', 'Triple sharing', 'from ₹4,500'], ['pg_4.webp', 'AC rooms', 'from ₹7,500']].map(([img, t, p]) => (
            <div key={t} className="card card-hover" style={{ overflow: 'hidden' }}>
              <div className="room-img" style={{ height: 200 }}><img src={`/images/${img}`} alt={t} loading="lazy" /></div>
              <div className="card-pad" style={{ padding: 16 }}>
                <div className="bold">{t}</div>
                <div className="small muted">{p} / month · meals included</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="faq" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="lp-wrap lp-section grid-3">
          {[
            ['"I used to spend the first week of every month calling people for rent. Now I tap one button."', 'Rajesh K.', 'PG owner, Koramangala'],
            ['"I told it in Telugu that my geyser wasn\'t working. Fixed the same evening."', 'Sneha R.', 'Resident, 2 years'],
            ['"The monthly PDF report is what I send my CA. Done in a click."', 'Lakshmi I.', 'Hostel owner, Chennai']
          ].map(([q, n, r]) => (
            <figure key={n} className="card card-pad stack">
              <div className="row-sm" style={{ color: '#f59e0b' }}>{[1, 2, 3, 4, 5].map(i => <Star key={i} size={15} fill="currentColor" />)}</div>
              <blockquote style={{ fontWeight: 600, lineHeight: 1.6 }}>{q}</blockquote>
              <figcaption className="small muted"><span className="bold" style={{ color: 'var(--ink)' }}>{n}</span> · {r}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-wrap lp-section">
        <div className="hero-card" style={{ padding: '48px 40px', textAlign: 'center' }}>
          <h2 className="lp-h2" style={{ color: '#fff' }}>See it with real data in 10 seconds.</h2>
          <p style={{ opacity: 0.9, marginTop: 10, fontSize: '1.05rem' }}>The demo PG has 15 rooms, 14 residents and six months of history.</p>
          <div className="row wrap" style={{ justifyContent: 'center', marginTop: 24, position: 'relative', zIndex: 1 }}>
            <Link to={appLink} className="btn btn-white btn-lg">{user ? 'Open dashboard' : 'Open the demo'} <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <div className="lp-wrap row between wrap small muted" style={{ padding: '24px' }}>
          <span className="row-sm"><Building2 size={16} className="text-brand" /> PG Manager · made for Indian PGs & hostels</span>
          <span>© {new Date().getFullYear()} PG Manager</span>
        </div>
      </footer>
    </div>
  );
}
