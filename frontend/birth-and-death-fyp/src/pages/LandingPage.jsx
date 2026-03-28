import {
  Baby,
  FileSearch,
  FileText,
  Heart,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const HERO_IMAGE = 'https://i.pinimg.com/1200x/35/d8/ca/35d8ca3e10c92034d068b6cd50d8e2cc.jpg';

const SERVICES = [
  {
    icon: <Baby size={28} />,
    title: 'Birth Registration — Countrywide',
    description:
      'Register a birth that occurred anywhere across all 16 regions of Ghana. Receive a certified birth certificate issued by the Births and Deaths Registry.',
    to: '/register/birth',
    color: 'green',
  },
  {
    icon: <Baby size={28} />,
    title: 'Late Birth Registration',
    description:
      'Register a birth that occurred more than 12 months ago. A late registration fee applies. Supporting documents from a medical facility are required.',
    to: '/register/birth',
    color: 'teal',
  },
  {
    icon: <Heart size={28} />,
    title: 'Death Registration — Countrywide',
    description:
      'Register the death of a Ghanaian citizen or resident. Obtain an official death certificate for legal, insurance, and estate purposes.',
    to: '/register/death',
    color: 'red',
  },
  {
    icon: <FileText size={28} />,
    title: 'Certificate Replacement',
    description:
      'Apply for a replacement or certified true copy of a lost, damaged, or destroyed birth or death certificate. Original records are preserved in our national registry.',
    to: '/services/extracts',
    color: 'blue',
  },
  {
    icon: <ShieldCheck size={28} />,
    title: 'Certificate Authentication',
    description:
      'Verify the authenticity of a birth or death certificate issued by the Ghana Births and Deaths Registry for academic, employment, or international use.',
    to: '/services/verification',
    color: 'gold',
  },
  {
    icon: <Search size={28} />,
    title: 'Track Your Application',
    description:
      'Monitor the real-time status of any submitted application using your reference number. Get notified instantly when your certificate is ready.',
    to: '/track',
    color: 'purple',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleApply = (to) => {
    if (isAuthenticated) {
      navigate(to);
    } else {
      navigate('/signin', { state: { from: { pathname: to } } });
    }
  };

  return (
    <div className="lp-root">
      {/* ── Top bar ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-logo">
            <img src={logo} alt="Ghana BDR" className="lp-logo-img" />
            <div className="lp-logo-text">
              <span className="lp-logo-main">Births &amp; Deaths Registry</span>
              <span className="lp-logo-sub">Republic of Ghana</span>
            </div>
          </div>
          <div className="lp-header-actions">
            <button className="lp-btn-outline" onClick={() => navigate('/signin')}>
              Sign In
            </button>
            <button className="lp-btn-primary" onClick={() => navigate('/register')}>
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* ── Welcome text ── */}
      <section className="lp-welcome">
        <img src={logo} alt="Ghana Births and Deaths Registry" className="lp-welcome-logo" />
        <p className="lp-welcome-lead">
          You can now access
        </p>
        <h1 className="lp-welcome-title">
          Ghana Births &amp; Deaths Registry
        </h1>
        <p className="lp-welcome-sub">
          using your BDR digital account.
        </p>
        <p className="lp-welcome-desc">
          Welcome to the Ghana Births and Deaths Registry — Civil Registration Department
        </p>
        <div className="lp-welcome-actions">
          <button className="lp-btn-outline" onClick={() => navigate('/signin')}>
            Sign In
          </button>
          <button className="lp-btn-primary" onClick={() => navigate('/register')}>
            Sign Up
          </button>
        </div>
      </section>

      {/* ── Raw hero image — no overlay ── */}
      <section className="lp-hero">
        <img
          src={HERO_IMAGE}
          alt="Ghana Births and Deaths Registry"
          className="lp-hero-img"
        />
      </section>

      {/* ── Services intro ── */}
      <section className="lp-services-intro">
        <h2 className="lp-services-heading">Our Online Services</h2>
        <p className="lp-services-subheading">
          Apply for civil registration certificates online. Select a service below — you
          will be asked to sign in or create an account before your application is opened.
        </p>
        <div className="lp-divider" />
      </section>

      {/* ── Service cards ── */}
      <section className="lp-services">
        <div className="lp-services-grid">
          {SERVICES.map((svc, i) => (
            <div key={i} className={`lp-card lp-card-${svc.color}`}>
              <div className="lp-card-icon">{svc.icon}</div>
              <h3 className="lp-card-title">{svc.title}</h3>
              <p className="lp-card-desc">{svc.description}</p>
              <div className="lp-card-actions">
                <button
                  className="lp-card-learn"
                  onClick={() => navigate('/about')}
                >
                  Learn more
                </button>
                <button
                  className="lp-card-apply"
                  onClick={() => handleApply(svc.to)}
                >
                  Apply Now
                  <span className="lp-card-arrow">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Info strip ── */}
      <section className="lp-info-strip">
        <div className="lp-info-inner">
          <div className="lp-info-item">
            <FileSearch size={22} />
            <div>
              <strong>What you need</strong>
              <span>Ghana Card (NIA), hospital/medical records, and a valid email address</span>
            </div>
          </div>
          <div className="lp-info-item">
            <RefreshCw size={22} />
            <div>
              <strong>Processing time</strong>
              <span>Normal — 5 working days. Express — 48 hours</span>
            </div>
          </div>
          <div className="lp-info-item">
            <ShieldCheck size={22} />
            <div>
              <strong>Data protection</strong>
              <span>Compliant with Ghana Data Protection Act 2012 (Act 843)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span>
            &copy; {new Date().getFullYear()} Ghana Births and Deaths Registry. All rights reserved.
          </span>
          <div className="lp-footer-links">
            <button onClick={() => navigate('/about')}>About</button>
            <button onClick={() => navigate('/faq')}>FAQs</button>
            <button onClick={() => navigate('/contact')}>Contact</button>
            <button onClick={() => navigate('/offices')}>Offices</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
