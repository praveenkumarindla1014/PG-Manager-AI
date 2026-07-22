import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Smartphone, 
  Cloud, 
  Globe, 
  Users, 
  UserCheck, 
  TrendingUp, 
  IndianRupee, 
  FileText, 
  BarChart3, 
  Bot, 
  ChevronRight, 
  LogIn, 
  UserPlus, 
  ShieldCheck, 
  CheckCircle,
  Sparkles,
  Home
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Top Header Navigation (PG Manager Style) */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.85rem 3rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo using build_icon.png */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="/build_icon.png" alt="PG Manager Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            PG Manager<sup style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>TM</sup>
          </span>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>
          <a href="#home" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Home</a>
          <a href="#services" style={{ color: 'inherit', textDecoration: 'none' }}>Our Services</a>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
          <a href="#gallery" style={{ color: 'inherit', textDecoration: 'none' }}>Property Gallery</a>
          <a href="#ai-portal" style={{ color: 'inherit', textDecoration: 'none' }}>AI Portal</a>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
            <UserPlus size={16} /> Register
          </Link>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem', borderColor: '#d0124e', color: '#d0124e' }}>
            <LogIn size={16} /> Login
          </Link>
        </div>
      </header>

      {/* Hero Section with Parallax Background */}
      <section id="home" className="hero-parallax-bg" style={{
        position: 'relative',
        padding: '5.5rem 2rem',
        background: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url("/images/pg_1.webp")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#ffffff',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '520px'
      }}>
        <div style={{ maxWidth: '850px' }}>
          <span className="badge badge-primary" style={{ background: 'rgba(208, 18, 78, 0.25)', color: '#ffffff', padding: '0.4rem 1rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.3)' }}>
            <Sparkles size={14} /> AI-Powered Paying Guest Management Software
          </span>

          <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)', lineHeight: '1.2' }}>
            You think your PG is well managed? <br />
            <span style={{ color: '#f43f5e', textDecoration: 'underline' }}>Think again!</span>
          </h1>

          <p style={{ fontSize: '1.1rem', color: '#e2e8f0', maxWidth: '680px', margin: '0 auto 2.25rem auto', lineHeight: '1.6' }}>
            About 87% of PG owners still follow manual bookkeeping to manage their PGs. SmartPG AI automates occupancy, rent collection, inmate check-ins, and complaint resolution 24/7.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem', background: '#d0124e', borderColor: '#d0124e' }}>
              <ChevronRight size={18} /> LEARN MORE & DEMO
            </Link>
            <Link to="/register" className="btn btn-secondary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
              GET STARTED FREE
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" style={{ padding: '4.5rem 3rem', background: '#ffffff', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
          OUR <span style={{ color: 'var(--primary)', fontWeight: '300' }}>SERVICES</span>
        </h2>
        <div style={{ width: '50px', height: '4px', background: 'var(--primary)', margin: '0.75rem auto 1rem auto', borderRadius: '2px' }}></div>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
          We provide a better and efficient way to manage your PGs remotely. With both web and automated mobile applications, PG Manager™ is the best application.
        </p>

        <div className="grid-3" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div className="icon-box-crimson" style={{ margin: '0 auto 1.25rem auto' }}>
              <Smartphone size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.5rem' }}>Android Application</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Manage your PG with fingertips anywhere, anytime with our native mobile application support.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div className="icon-box-crimson" style={{ margin: '0 auto 1.25rem auto' }}>
              <Globe size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.5rem' }}>Web Application</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Not a smartphone junkie? No worries, manage your PG from desktop on site with our rich web application.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div className="icon-box-crimson" style={{ margin: '0 auto 1.25rem auto' }}>
              <Cloud size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.5rem' }}>Cloud Support</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Everything you save is on our cloud. So you need not worry about losing your data, ever again!
            </p>
          </div>
        </div>
      </section>

      {/* Features Showcase Section */}
      <section id="features" style={{ padding: '4.5rem 3rem', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Checkout what you can do with PG Manager™. Here are a few of the features, download our android app or signup to find out more.
          </p>
          <div style={{ width: '50px', height: '4px', background: 'var(--primary)', margin: '0.75rem auto 0 auto', borderRadius: '2px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px 1fr', gap: '2.5rem', maxWidth: '1200px', margin: '0 auto', alignItems: 'center' }}>
          {/* Left Column Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', textAlign: 'right' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>Manage PGs, Hostels and Apartments</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Whether you run your PG in rooms, hostel or apartments, we've got you covered.
                </p>
              </div>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <Building2 size={26} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', textAlign: 'right' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>Manage Inmates & OCR</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Check In and Check Out inmates with cloud support! Auto-fill registration forms using AI Aadhaar scanner.
                </p>
              </div>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <Users size={26} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', textAlign: 'right' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>Manage Staff & Repairs</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Add/Remove PG staff or managers to manage your PGs for you! AI predicts maintenance tasks automatically.
                </p>
              </div>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <UserCheck size={26} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', textAlign: 'right' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>Room Availability Monitor</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Track room availability efficiently across all floors in real time.
                </p>
              </div>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <Home size={26} />
              </div>
            </div>
          </div>

          {/* Center Phone Mockup Frame */}
          <div className="phone-mockup-frame floating-img">
            <img src="/images/pg_1.webp" alt="Mobile App UI" />
          </div>

          {/* Right Column Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <TrendingUp size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>Expense Management</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Add and track your PG expenses to visualize profitability and growth predictions.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <IndianRupee size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>Smart Rent Collection</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Collect rent on your preferred day of the month, which can also be configured for each inmate/tenant.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <FileText size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>Rent Receipts</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Why waste paper when you can mail rent receipts to inmates. Go green!
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div className="icon-box-crimson" style={{ flexShrink: 0 }}>
                <BarChart3 size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.35rem' }}>AI Analytics & Reports</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  Generate comprehensive financial, occupancy, and complaint analytics automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property Showcase Gallery */}
      <section id="gallery" style={{ padding: '4.5rem 3rem', background: '#ffffff', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
          PREMIUM LIVING <span style={{ color: 'var(--primary)', fontWeight: '300' }}>EXPERIENCE</span>
        </h2>
        <div style={{ width: '50px', height: '4px', background: 'var(--primary)', margin: '0.75rem auto 1rem auto', borderRadius: '2px' }}></div>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
          Designed for maximum inmate comfort, clean hygiene, luxury room furnishing, and 24/7 security.
        </p>

        <div className="grid-3" style={{ maxWidth: '1150px', margin: '0 auto' }}>
          {/* Card 1: pg_2.avif */}
          <div className="glass-card image-card-frame floating-img" style={{ height: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            <img src="/images/pg_2.avif" alt="Modern Room Living" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'left', background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.9))', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span className="badge badge-primary" style={{ background: '#d0124e', color: 'white', marginBottom: '0.5rem' }}>Luxury Furnished Rooms</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>Fully Equipped Bedrooms</h3>
              <p style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '0.2rem' }}>AC, Cupboard, Study Desk, and Attached Bathroom.</p>
            </div>
          </div>

          {/* Card 2: pg_3.avif */}
          <div className="glass-card image-card-frame floating-img-slow" style={{ height: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            <img src="/images/pg_3.avif" alt="Building Architecture" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'left', background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.9))', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span className="badge badge-cyan" style={{ background: '#0284c7', color: 'white', marginBottom: '0.5rem' }}>Building Infrastructure</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>Multi-Floor Premises</h3>
              <p style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '0.2rem' }}>24/7 CCTV Security, Power Backup & Dedicated Parking.</p>
            </div>
          </div>

          {/* Card 3: pg_4.webp */}
          <div className="glass-card image-card-frame floating-img" style={{ height: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            <img src="/images/pg_4.webp" alt="Dining & Food Facility" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'left', background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.9))', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span className="badge badge-success" style={{ background: '#059669', color: 'white', marginBottom: '0.5rem' }}>Hygienic Dining & Kitchen</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>Nutritious Daily Meals</h3>
              <p style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '0.2rem' }}>AI Meal Planning, Calories & Protein tracking for residents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Portal Banner */}
      <section id="ai-portal" style={{ padding: '4rem 3rem', background: '#0f172a', color: 'white', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', marginBottom: '1rem', background: 'rgba(208, 18, 78, 0.25)', color: 'white' }}>
            <Sparkles size={14} /> Virtual PG Manager AI
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '1rem', color: '#ffffff' }}>
            Ready to experience an AI-First PG System?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            Log in to access real-time vacancy searches, automated complaint analysis, food menu nutrition recommendations, and daily business insights.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem', background: '#d0124e' }}>
              <Bot size={20} /> Open Owner & Tenant Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem 3rem', background: '#090d16', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', borderTop: '1px solid #1e293b' }}>
        <p>© 2026 PG Manager™ AI System. All rights reserved. Built for modern Paying Guest & Hostel management.</p>
      </footer>
    </div>
  );
}
