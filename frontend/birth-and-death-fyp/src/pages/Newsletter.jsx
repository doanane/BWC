import {
  Baby,
  Bell,
  BellOff,
  CheckCircle,
  FileText,
  Globe,
  Heart,
  Info,
  Lock,
  LogIn,
  Mail,
  Send,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Newsletter.css';

const TOPICS = [
  { id: 'birth_updates', label: 'Birth Registration Updates', icon: Baby, desc: 'News and changes to birth registration processes' },
  { id: 'death_updates', label: 'Death Registration Updates', icon: Heart, desc: 'News and changes to death registration processes' },
  { id: 'portal_updates', label: 'Portal & System Updates', icon: Globe, desc: 'New features, maintenance windows, and portal improvements' },
  { id: 'legal_changes', label: 'Legal & Policy Changes', icon: FileText, desc: 'Updates to BDR regulations, fees, and government policy' },
  { id: 'announcements', label: 'General Announcements', icon: Bell, desc: 'Press releases, events, and news from the BDR' },
];

function SubscribeTab() {
  const { user, isAuthenticated } = useAuth();
  const [topics, setTopics] = useState(['announcements', 'portal_updates']);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleTopic = (id) => {
    setTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (topics.length === 0) {
      setStatus({ type: 'error', message: 'Please select at least one topic.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await new Promise(res => setTimeout(res, 1200));
      setStatus({ type: 'success', message: `Thank you, ${user.first_name}! A confirmation email has been sent to ${user.email}. Please check your inbox to confirm your subscription.` });
    } catch {
      setStatus({ type: 'error', message: 'An error occurred. Please try again or contact us at info@bdregistry.gov.gh.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="nl-auth-gate">
        <div className="nl-auth-gate-icon"><LogIn size={32} /></div>
        <h3>Sign in to subscribe</h3>
        <p>
          Your name and email are taken from your account — no need to type them again.
          Sign in to manage your newsletter preferences.
        </p>
        <div className="nl-auth-gate-actions">
          <Link to="/signin" className="btn btn-primary">Sign In</Link>
          <Link to="/register" className="btn btn-outline">Create Account</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="nl-form" onSubmit={handleSubmit} noValidate>
      <div className="nl-prefilled-banner">
        <Lock size={14} />
        <span>Your name and email are pulled from your account and cannot be changed here.</span>
      </div>

      <div className="nl-form-row">
        <div className="nl-field">
          <label className="nl-label" htmlFor="firstName">First Name</label>
          <input
            id="firstName" type="text" className="nl-input nl-input--readonly"
            value={user.first_name || ''}
            readOnly
            tabIndex={-1}
          />
        </div>
        <div className="nl-field">
          <label className="nl-label" htmlFor="lastName">Last Name</label>
          <input
            id="lastName" type="text" className="nl-input nl-input--readonly"
            value={user.last_name || ''}
            readOnly
            tabIndex={-1}
          />
        </div>
      </div>

      <div className="nl-field">
        <label className="nl-label" htmlFor="email">Email Address</label>
        <div className="nl-input-icon-wrap">
          <input
            id="email" type="email" className="nl-input nl-input--readonly"
            value={user.email || ''}
            readOnly
            tabIndex={-1}
          />
          <Lock size={14} className="nl-input-lock" />
        </div>
        <p className="nl-field-hint">
          To change your email address, update it in your <Link to="/profile">profile settings</Link>.
        </p>
      </div>

      <div className="nl-field">
        <label className="nl-label">Topics of Interest <span className="nl-required">*</span></label>
        <p className="nl-field-hint">Select the topics you would like to receive updates about.</p>
        <div className="nl-topics">
          {TOPICS.map(t => {
            const Icon = t.icon;
            const checked = topics.includes(t.id);
            return (
              <label key={t.id} className={`nl-topic${checked ? ' nl-topic--checked' : ''}`}>
                <input type="checkbox" hidden checked={checked} onChange={() => toggleTopic(t.id)} />
                <div className="nl-topic-icon"><Icon size={18} /></div>
                <div className="nl-topic-body">
                  <span className="nl-topic-label">{t.label}</span>
                  <span className="nl-topic-desc">{t.desc}</span>
                </div>
                <div className="nl-topic-check">
                  {checked && <CheckCircle size={16} />}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="nl-consent">
        <Info size={14} />
        <p>
          By subscribing, you agree to receive email communications from the Ghana Births
          and Deaths Registry. You can unsubscribe at any time. We will never share your
          email with third parties. See our <Link to="/legal/privacy">Privacy Policy</Link>.
        </p>
      </div>

      {status && (
        <div className={`nl-status nl-status--${status.type}`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
          <p>{status.message}</p>
        </div>
      )}

      <button type="submit" className="btn btn-primary nl-submit" disabled={loading}>
        {loading ? (
          <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Subscribing...</>
        ) : (
          <><Send size={16} /> Subscribe to Newsletter</>
        )}
      </button>
    </form>
  );
}

function UnsubscribeTab({ onSwitchToSubscribe }) {
  const { user, isAuthenticated } = useAuth();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await new Promise(res => setTimeout(res, 1000));
      setStatus({ type: 'success', message: `You have been unsubscribed from all BDR newsletters. If you did not initiate this request, please contact us at info@bdregistry.gov.gh.` });
      setReason('');
    } catch {
      setStatus({ type: 'error', message: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="nl-auth-gate">
        <div className="nl-auth-gate-icon"><LogIn size={32} /></div>
        <h3>Sign in to unsubscribe</h3>
        <p>
          Sign in to your account so we can identify your subscription and remove it instantly.
          No need to type your email manually.
        </p>
        <div className="nl-auth-gate-actions">
          <Link to="/signin" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="nl-form" onSubmit={handleSubmit} noValidate>
      <div className="nl-unsub-notice">
        <BellOff size={20} />
        <div>
          <h4>Unsubscribe from BDR Newsletter</h4>
          <p>
            You are unsubscribing the email address linked to your account.
            This action takes effect immediately.
          </p>
        </div>
      </div>

      <div className="nl-prefilled-banner">
        <Lock size={14} />
        <span>Unsubscribing email address taken from your account.</span>
      </div>

      <div className="nl-field">
        <label className="nl-label" htmlFor="unsub-email">Email Address</label>
        <div className="nl-input-icon-wrap">
          <input
            id="unsub-email" type="email" className="nl-input nl-input--readonly"
            value={user.email || ''}
            readOnly
            tabIndex={-1}
          />
          <Lock size={14} className="nl-input-lock" />
        </div>
      </div>

      <div className="nl-field">
        <label className="nl-label" htmlFor="reason">Reason for Unsubscribing (optional)</label>
        <select
          id="reason" className="nl-input"
          value={reason} onChange={e => setReason(e.target.value)}
        >
          <option value="">Please select a reason</option>
          <option value="too_frequent">Emails are too frequent</option>
          <option value="not_relevant">Content is not relevant to me</option>
          <option value="no_longer_needed">I no longer need this service</option>
          <option value="prefer_other">I prefer another communication method</option>
          <option value="privacy">Privacy concerns</option>
          <option value="other">Other</option>
        </select>
        <p className="nl-field-hint">Your feedback helps us improve our communications.</p>
      </div>

      {status && (
        <div className={`nl-status nl-status--${status.type}`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
          <p>{status.message}</p>
        </div>
      )}

      <button type="submit" className="btn nl-submit nl-submit--unsub" disabled={loading}>
        {loading ? (
          <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Processing...</>
        ) : (
          <><UserMinus size={16} /> Unsubscribe</>
        )}
      </button>

      <p className="nl-unsub-note">
        Changed your mind? <button type="button" className="nl-unsub-note-link" onClick={onSwitchToSubscribe}>Switch to Subscribe</button>
      </p>
    </form>
  );
}

export default function Newsletter() {
  const [tab, setTab] = useState('subscribe');

  return (
    <div className="nl-page">
      <section className="nl-hero">
        <div className="container nl-hero-inner">
          <div className="nl-hero-badge">
            <Mail size={14} />
            Stay Informed
          </div>
          <h1 className="nl-hero-title">BDR Newsletter</h1>
          <p className="nl-hero-subtitle">
            Subscribe to receive important updates about birth and death registration
            services, portal improvements, legal changes, and official announcements
            from the Ghana Births and Deaths Registry.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container nl-layout">
          <div className="nl-main">
            <div className="nl-tabs">
              <button
                className={`nl-tab${tab === 'subscribe' ? ' nl-tab--active' : ''}`}
                onClick={() => setTab('subscribe')}
              >
                <UserPlus size={16} />
                Subscribe
              </button>
              <button
                className={`nl-tab${tab === 'unsubscribe' ? ' nl-tab--active' : ''}`}
                onClick={() => setTab('unsubscribe')}
              >
                <UserMinus size={16} />
                Unsubscribe
              </button>
            </div>

            <div className="nl-card">
              {tab === 'subscribe' ? <SubscribeTab /> : <UnsubscribeTab onSwitchToSubscribe={() => setTab('subscribe')} />}
            </div>
          </div>

          <aside className="nl-sidebar">
            <div className="nl-sidebar-card">
              <div className="nl-sidebar-header">
                <Bell size={20} />
                <h3>What to Expect</h3>
              </div>
              <ul className="nl-sidebar-list">
                <li><CheckCircle size={14} /><span>Service updates and new features</span></li>
                <li><CheckCircle size={14} /><span>Changes to registration processes</span></li>
                <li><CheckCircle size={14} /><span>Fee schedule announcements</span></li>
                <li><CheckCircle size={14} /><span>Legal and regulatory updates</span></li>
                <li><CheckCircle size={14} /><span>Office closures and holidays</span></li>
                <li><CheckCircle size={14} /><span>Press releases and official statements</span></li>
              </ul>
            </div>

            <div className="nl-sidebar-card">
              <div className="nl-sidebar-header">
                <Mail size={20} />
                <h3>Frequency</h3>
              </div>
              <p className="nl-sidebar-text">
                We send newsletters only when there is meaningful news to share —
                typically <strong>2–4 emails per month</strong>. We do not send
                promotional or commercial content.
              </p>
            </div>

            <div className="nl-sidebar-card nl-sidebar-card--privacy">
              <div className="nl-sidebar-header">
                <Info size={20} />
                <h3>Your Privacy</h3>
              </div>
              <p className="nl-sidebar-text">
                Your email address is used solely for newsletter delivery and will
                never be sold, rented, or shared with third parties. You can
                unsubscribe at any time. See our full{' '}
                <a href="/legal/privacy">Privacy Policy</a>.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
