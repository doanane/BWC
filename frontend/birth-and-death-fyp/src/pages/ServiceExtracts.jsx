import {
  ArrowRight,
  Building2,
  CheckCircle,
  ClipboardList,
  Clock, CreditCard,
  FileText,
  IdCard,
  Monitor,
  Receipt,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ServiceExtracts.css';

const INFO_CARDS = [
  {
    icon: FileText,
    title: 'What is an Extract?',
    body: 'An extract is an official certified copy of an entry in the vital register. Unlike a photocopy, it is printed on security paper, bears the registrar\'s signature and official seal, and is legally admissible as evidence in court and for official purposes.',
  },
  {
    icon: Users,
    title: 'Who Can Request?',
    body: 'Any person named in the record, a parent or legal guardian, a legal representative with written authority, or a court-appointed official may request an extract of a birth or death entry.',
  },
  {
    icon: Clock,
    title: 'Processing Time',
    body: 'Standard extract requests are fulfilled within 2 business days of submission of a complete application and confirmed payment. Express processing may be available at select offices.',
  },
  {
    icon: CreditCard,
    title: 'Official Fee',
    body: 'The government-prescribed fee for an extract or certified true copy is GH\u20b5 15.00 per document. Payment is accepted at any BDR district office or via the approved payment platform.',
  },
];

const REQUIREMENTS = [
  { icon: IdCard, text: 'Valid National ID card, Ghana Card, or passport (original and photocopy)' },
  { icon: Receipt, text: 'Official payment receipt for the extract fee of GH\u20b5 15.00' },
  { icon: ClipboardList, text: 'Completed extract application form (available at any district office or downloadable below)' },
  { icon: UserCheck, text: 'Proof of relationship or written authority if requesting on behalf of another person' },
];

const ONLINE_STEPS = [
  { step: 1, icon: Monitor, title: 'Create or Log In', desc: 'Register for an account on this portal or sign in to your existing account.' },
  { step: 2, icon: ClipboardList, title: 'Complete Application', desc: 'Fill in the extract application form with the correct registration details of the record.' },
  { step: 3, icon: CreditCard, title: 'Make Payment', desc: 'Pay the GH\u20b5 15.00 fee via mobile money or card through the secure payment gateway.' },
  { step: 4, icon: CheckCircle, title: 'Collect Document', desc: 'Receive a reference number and collect your certified extract from your chosen district office.' },
];

const INPERSON_STEPS = [
  { step: 1, title: 'Visit a District Office', desc: 'Go to the nearest BDR district or regional office during working hours (Monday to Friday, 8:00 AM to 5:00 PM).' },
  { step: 2, title: 'Submit Documents', desc: 'Present your valid ID, completed application form, and relationship proof if applicable to the counter officer.' },
  { step: 3, title: 'Pay and Collect', desc: 'Pay the official fee at the cashier and receive your certified extract, usually within 2 business days.' },
];

export default function ServiceExtracts() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="extracts-page">

      <section className="extracts-hero">
        <div className="container">
          <div className="extracts-hero-inner">
            <span className="extracts-hero-label">Certified Documents</span>
            <h1 className="extracts-hero-title">Extracts &amp; True Copies</h1>
            <p className="extracts-hero-subtitle">
              Obtain officially certified copies of birth and death registration entries
              from the national vital register. Accepted by courts, embassies, employers,
              and government institutions across Ghana and internationally.
            </p>
          </div>
        </div>
      </section>

      <section className="section extracts-info-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Service Overview</div>
            <h2 className="section-title">About This Service</h2>
            <p className="section-subtitle">
              Everything you need to know before applying for a certified extract.
            </p>
          </div>
          <div className="extracts-info-grid">
            {INFO_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="extracts-info-card">
                  <div className="extracts-info-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="extracts-info-title">{card.title}</h3>
                  <p className="extracts-info-body">{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section extracts-requirements-section">
        <div className="container">
          <div className="extracts-requirements-layout">
            <div className="extracts-requirements-text">
              <div className="section-eyebrow">Documents Needed</div>
              <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 12 }}>
                Requirements
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 28 }}>
                Ensure you have all required documents ready before applying. Incomplete
                applications will not be processed and may be returned, causing delays.
              </p>
              <ul className="extracts-req-list">
                {REQUIREMENTS.map((req) => {
                  const Icon = req.icon;
                  return (
                    <li key={req.text} className="extracts-req-item">
                      <div className="extracts-req-icon">
                        <Icon size={18} />
                      </div>
                      <span>{req.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="extracts-requirements-notice">
              <div className="extracts-notice-card">
                <CheckCircle size={24} className="extracts-notice-check" />
                <h4>Important Note</h4>
                <p>
                  An extract is only issued for records that already exist in the national
                  register. If the birth or death was never registered, you must first complete
                  the registration process before requesting an extract.
                </p>
                <a href="/faq" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
                  View Registration FAQs
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section extracts-how-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Application Methods</div>
            <h2 className="section-title">How to Apply</h2>
            <p className="section-subtitle">
              You may apply for an extract online through this portal or in person at any BDR district office.
            </p>
          </div>

          <div className="extracts-methods-grid">
            <div className="extracts-method-card extracts-method-online">
              <div className="extracts-method-header">
                <div className="extracts-method-header-icon">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="extracts-method-title">Online Application</h3>
                  <span className="extracts-method-badge">Recommended</span>
                </div>
              </div>
              <ol className="extracts-online-steps">
                {ONLINE_STEPS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.step} className="extracts-online-step">
                      <div className="extracts-step-number">{s.step}</div>
                      <div className="extracts-step-icon">
                        <Icon size={16} />
                      </div>
                      <div className="extracts-step-body">
                        <strong>{s.title}</strong>
                        <span>{s.desc}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Link to="/register" className="btn btn-primary btn-lg btn-block extracts-method-cta">
                Apply Online <ArrowRight size={16} />
              </Link>
            </div>

            <div className="extracts-method-card extracts-method-inperson">
              <div className="extracts-method-header">
                <div className="extracts-method-header-icon extracts-method-header-icon--secondary">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="extracts-method-title">In-Person Application</h3>
                  <span className="extracts-method-badge extracts-method-badge--secondary">At Any Office</span>
                </div>
              </div>
              <ol className="extracts-inperson-steps">
                {INPERSON_STEPS.map((s) => (
                  <li key={s.step} className="extracts-inperson-step">
                    <div className="extracts-step-number extracts-step-number--secondary">{s.step}</div>
                    <div className="extracts-step-body">
                      <strong>{s.title}</strong>
                      <span>{s.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to="/offices" className="btn btn-outline btn-lg btn-block extracts-method-cta">
                Find Nearest Office <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="extracts-cta-section">
        <div className="container">
          <div className="extracts-cta-inner">
            <div className="extracts-cta-text">
              <h2>Ready to Request Your Certified Extract?</h2>
              <p>
                Create an account to begin your online application. The process takes
                less than 10 minutes and you can track your request in real time.
              </p>
            </div>
            <div className="extracts-cta-actions">
              {!isAuthenticated && (
                <Link to="/register" className="btn btn-accent btn-lg">
                  Create Account &amp; Apply <ArrowRight size={16} />
                </Link>
              )}
              <Link to="/contact" className="btn btn-outline extracts-cta-outline">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
