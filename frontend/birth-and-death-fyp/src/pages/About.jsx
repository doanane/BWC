import {
  Accessibility,
  BarChart3,
  Building2,
  Eye,
  Globe2,
  Landmark,
  Lock,
  Mail,
  PhoneCall,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './About.css';

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Brong-Ahafo',
  'Oti', 'Savannah', 'North East', 'Western North', 'Ahafo', 'Bono',
];

const TIMELINE = [
  { year: '1888', event: 'Births and Deaths Registration Ordinance enacted under British colonial rule.' },
  { year: '1957', event: 'Ghana gains independence. Registry retained as a national institution.' },
  { year: '1965', event: 'Births and Deaths Registration Act formalized in Ghanaian law.' },
  { year: '1992', event: 'Constitutional mandate to register all vital events across all 16 regions.' },
  { year: '2012', event: 'Launch of computerized registration and national identity linkage.' },
  { year: '2020', event: 'COVID-19 accelerates digital services for remote certificate requests.' },
  { year: '2024', event: 'GBD Registry online portal launched — apply, track, and collect anywhere.' },
];

const VALUES = [
  { icon: Lock, title: 'Integrity', desc: 'Every registration is verified, secure, and tamper-proof.' },
  { icon: Zap, title: 'Efficiency', desc: 'Streamlined processes reduce wait times from weeks to days.' },
  { icon: Accessibility, title: 'Accessibility', desc: 'Services available in all 16 regions and online nationwide.' },
  { icon: ShieldCheck, title: 'Security', desc: 'Government-grade encryption protects every application.' },
  { icon: Globe2, title: 'Inclusivity', desc: 'Every Ghanaian, regardless of location, deserves registration.' },
  { icon: BarChart3, title: 'Transparency', desc: 'Real-time tracking keeps applicants informed at every step.' },
];

const LEADERSHIP = [
  { name: 'Dr. Kwame Asante', role: 'Registrar-General', region: 'Head Office, Accra' },
  { name: 'Mrs. Abena Owusu', role: 'Director, Digital Services', region: 'Greater Accra Region' },
  { name: 'Mr. Kofi Mensah', role: 'Regional Director', region: 'Ashanti Region' },
  { name: 'Ms. Akosua Frimpong', role: 'Regional Director', region: 'Western Region' },
];

export default function About() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="about-page">

      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-orb about-hero-orb-one" aria-hidden="true" />
        <div className="about-hero-orb about-hero-orb-two" aria-hidden="true" />
        <div className="container">
          <div className="form-page-eyebrow">
            <Landmark size={15} className="about-inline-icon" /> About GBD Registry
          </div>
          <h1 className="about-hero-title">Ghana Births &amp; Deaths Registry</h1>
          <p className="about-hero-sub">
            The official authority for vital registration in Ghana — recording every birth and death,
            preserving national identity, and enabling citizens to access their legal rights.
          </p>
          <div className="about-hero-stats">
            <div className="about-stat"><strong>16</strong><span>Regions Covered</span></div>
            <div className="about-stat"><strong>260+</strong><span>District Offices</span></div>
            <div className="about-stat"><strong>3M+</strong><span>Registrations Annually</span></div>
            <div className="about-stat"><strong>136</strong><span>Years of Service</span></div>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="section about-mv">
        <div className="container">
          <div className="about-mv-grid">
            <div className="about-mv-card">
              <div className="about-mv-icon"><Target size={24} /></div>
              <h3>Our Mission</h3>
              <p>
                To provide efficient, accurate, and accessible vital registration services to all Ghanaians,
                ensuring that every birth and death is captured in the national registry, linking citizens to
                identity documents, healthcare, education, and social protection systems.
              </p>
            </div>
            <div className="about-mv-card about-mv-card--vision">
              <div className="about-mv-icon"><Eye size={24} /></div>
              <h3>Our Vision</h3>
              <p>
                To be a world-class vital registration authority, achieving universal civil registration
                across Ghana by 2030 — where every citizen has a verified identity from birth,
                empowering inclusion in national development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section about-values-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">What We Stand For</div>
            <h2 className="section-title">Our Core Values</h2>
            <p className="section-sub">Principles that guide every decision we make at GBD Registry.</p>
          </div>
          <div className="about-values-grid">
            {VALUES.map(v => {
              const ValueIcon = v.icon;
              return (
                <div key={v.title} className="about-value-card">
                  <div className="about-value-icon"><ValueIcon size={22} strokeWidth={2.2} /></div>
                  <h4>{v.title}</h4>
                  <p>{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* History Timeline */}
      <section className="section about-history">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Our Story</div>
            <h2 className="section-title">A Legacy of Over 130 Years</h2>
            <p className="section-sub">From colonial ordinances to digital services — the evolution of Ghana's vital registry.</p>
          </div>
          <div className="about-timeline">
            {TIMELINE.map((item, i) => (
              <div key={item.year} className={`about-tl-item ${i % 2 === 0 ? 'tl-left' : 'tl-right'}`}>
                <div className="about-tl-content">
                  <div className="about-tl-year">{item.year}</div>
                  <p className="about-tl-event">{item.event}</p>
                </div>
                <div className="about-tl-dot" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">What We Offer</div>
            <h2 className="section-title">Our Services</h2>
          </div>
          <div className="about-services-grid">
            <div className="about-service-card">
              <div className="about-service-badge birth">BIRTH</div>
              <h4>Birth Registration</h4>
              <ul>
                <li>Free within 12 months of birth</li>
                <li>Hospital, home, and abroad registrations</li>
                <li>Online application for parents</li>
                <li>Ghana Births Certificate issuance</li>
              </ul>
              <Link to="/register/birth" className="btn btn-primary" style={{ marginTop: 'auto' }}>Register Birth →</Link>
            </div>
            <div className="about-service-card">
              <div className="about-service-badge death">DEATH</div>
              <h4>Death Registration</h4>
              <ul>
                <li>Mandatory registration for all deaths</li>
                <li>Natural, accidental, and stillbirth</li>
                <li>Burial permit processing</li>
                <li>Ghana Death Certificate issuance</li>
              </ul>
              <Link to="/register/death" className="btn btn-outline" style={{ marginTop: 'auto' }}>Register Death →</Link>
            </div>
            <div className="about-service-card">
              <div className="about-service-badge track">TRACK</div>
              <h4>Application Tracking</h4>
              <ul>
                <li>Real-time status updates</li>
                <li>Email &amp; SMS notifications</li>
                <li>No account required to track</li>
                <li>Downloadable application summary</li>
              </ul>
              <Link to="/track" className="btn btn-outline" style={{ marginTop: 'auto' }}>Track Application →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Regions */}
      <section className="section about-regions-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">National Coverage</div>
            <h2 className="section-title">Regional Offices</h2>
            <p className="section-sub">GBD Registry operates in all 16 regions of Ghana with district-level offices.</p>
          </div>
          <div className="about-regions-grid">
            {REGIONS.map(r => (
              <div key={r} className="about-region-chip">
                <span className="about-region-dot" />{r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Management</div>
            <h2 className="section-title">Leadership</h2>
          </div>
          <div className="about-leadership-grid">
            {LEADERSHIP.map(l => (
              <div key={l.name} className="about-leader-card">
                <div className="about-leader-avatar">
                  {l.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="about-leader-name">{l.name}</div>
                <div className="about-leader-role">{l.role}</div>
                <div className="about-leader-region">{l.region}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="about-cta">
        <div className="container">
          <h2>Need Help or Have Questions?</h2>
          <p>Our support team is available Monday to Friday, 8:00 AM to 5:00 PM across all regional offices.</p>
          <div className="about-cta-contacts">
            <div className="about-contact-item">
              <PhoneCall size={20} className="about-contact-icon" />
              <div><strong>Toll-Free Hotline</strong><span>0800-GBD-REG (0800-423-734)</span></div>
            </div>
            <div className="about-contact-item">
              <Mail size={20} className="about-contact-icon" />
              <div><strong>Email Support</strong><span>support@gbd.gov.gh</span></div>
            </div>
            <div className="about-contact-item">
              <Building2 size={20} className="about-contact-icon" />
              <div><strong>Head Office</strong><span>P.O. Box MB 51, Accra, Ghana</span></div>
            </div>
          </div>
          {!isAuthenticated && (
            <Link to="/register" className="btn btn-accent" style={{ marginTop: 24 }}>
              Create Account &amp; Get Started
            </Link>
          )}
        </div>
      </section>

    </div>
  );
}
