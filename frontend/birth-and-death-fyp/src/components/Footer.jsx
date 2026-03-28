import {
  ArrowUp,
  Bell,
  CheckCircle,
  Clock,
  Facebook,
  Linkedin,
  Mail, MapPin,
  Phone,
  Send,
  Twitter, Youtube,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';

const SERVICES = [
  { labelKey: 'birth_reg_nav', to: '/register/birth' },
  { labelKey: 'death_reg_nav', to: '/register/death' },
  { labelKey: 'extracts', to: '/services/extracts' },
  { labelKey: 'adoptions', to: '/services/adoptions' },
  { labelKey: 'verification', to: '/services/verification' },
  { labelKey: 'statistics_request', to: '/services/statistics' },
];

const RESOURCES = [
  { labelKey: 'about_bdr', to: '/about' },
  { labelKey: 'charter', to: '/media/charter' },
  { labelKey: 'rti', to: '/about#rti' },
  { labelKey: 'downloads', to: '/media/downloads' },
  { labelKey: 'faq', to: '/faq' },
  { labelKey: 'news_ann', to: '/media/news' },
  { labelKey: 'photo_gallery', to: '/media/gallery' },
];

const QUICK_LINKS = [
  { labelKey: 'track_application', to: '/track' },
  { labelKey: 'regional_offices', to: '/offices' },
  { labelKey: 'contact_us', to: '/contact' },
  { labelKey: 'sign_in', to: '/signin' },
  { labelKey: 'create_account', to: '/register' },
];

function NewsletterStripe() {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const [guestEmail, setGuestEmail] = useState('');

  const email = isAuthenticated ? (user?.email || '') : guestEmail;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { inputRef.current?.focus(); return; }
    setLoading(true);
    setStatus(null);
    try {
      await new Promise(res => setTimeout(res, 1000));
      setStatus('success');
      if (!isAuthenticated) setGuestEmail('');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="footer-newsletter-bar">
      <div className="container footer-newsletter-inner">
        <div className="footer-newsletter-text">
          <div className="footer-newsletter-icon"><Bell size={20} /></div>
          <div>
            <h4 className="footer-newsletter-title">Stay Updated</h4>
            <p className="footer-newsletter-sub">Get the latest BDR news and service updates delivered to your inbox.</p>
          </div>
        </div>
        {status === 'success' ? (
          <div className="footer-newsletter-success">
            <CheckCircle size={18} />
            <span>Subscribed! Check your email to confirm.</span>
          </div>
        ) : isAuthenticated ? (
          <form className="footer-newsletter-form footer-newsletter-form--authed" onSubmit={handleSubmit} noValidate>
            <span className="footer-newsletter-authed-email">{user?.email}</span>
            <button type="submit" className="footer-newsletter-btn" disabled={loading} aria-label="Subscribe">
              {loading ? <span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff', width: 16, height: 16 }} /> : <Send size={15} />}
              <span>Subscribe</span>
            </button>
          </form>
        ) : (
          <form className="footer-newsletter-form" onSubmit={handleSubmit} noValidate>
            <input
              ref={inputRef}
              type="email"
              className="footer-newsletter-input"
              placeholder="Enter your email address"
              value={guestEmail}
              onChange={e => setGuestEmail(e.target.value)}
              aria-label="Email address for newsletter"
              disabled={loading}
            />
            <button type="submit" className="footer-newsletter-btn" disabled={loading} aria-label="Subscribe">
              {loading ? <span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff', width: 16, height: 16 }} /> : <Send size={15} />}
              <span>Subscribe</span>
            </button>
          </form>
        )}
        <Link to="/newsletter" className="footer-newsletter-manage">
          Manage preferences
        </Link>
      </div>
    </div>
  );
}

export default function Footer() {
  const [showTop, setShowTop] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handler = () => setShowTop(window.scrollY > 300);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <>
      <NewsletterStripe />
      <footer className="footer" role="contentinfo">
        {/* Ministry stripe */}
        <div className="footer-ministry-bar">
          <div className="container footer-ministry-inner">
            <span>{t('ministry_name')}</span>
            <span className="footer-ministry-sep">|</span>
            <span>{t('republic_of_ghana')}</span>
          </div>
        </div>

        <div className="footer-main">
          <div className="container footer-grid">

            {/* Brand column */}
            <div className="footer-brand">
              <Link to="/" className="footer-logo-link">
                <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
                  <circle cx="24" cy="24" r="22" fill="#FCD116" stroke="#fff" strokeWidth="2" />
                  <text x="24" y="30" textAnchor="middle" fontSize="18" fontWeight="900"
                    fill="#006B3C" fontFamily="Poppins,sans-serif">G</text>
                </svg>
                <div>
                  <div className="footer-logo-main">Births &amp; Deaths</div>
                  <div className="footer-logo-sub">Registry, Ghana</div>
                </div>
              </Link>
              <p className="footer-desc">
                {t('footer_desc')}
              </p>
              <div className="footer-social">
                <a href="#" aria-label="Facebook" className="footer-social-btn"><Facebook size={16} /></a>
                <a href="#" aria-label="Twitter" className="footer-social-btn"><Twitter size={16} /></a>
                <a href="#" aria-label="YouTube" className="footer-social-btn"><Youtube size={16} /></a>
                <a href="#" aria-label="LinkedIn" className="footer-social-btn"><Linkedin size={16} /></a>
              </div>
            </div>

            {/* Services */}
            <div className="footer-col">
              <h4 className="footer-col-title">{t('our_services')}</h4>
              <ul className="footer-link-list">
                {SERVICES.map(s => (
                  <li key={s.labelKey}><Link to={s.to} className="footer-link">{t(s.labelKey)}</Link></li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="footer-col">
              <h4 className="footer-col-title">{t('resources')}</h4>
              <ul className="footer-link-list">
                {RESOURCES.map(r => (
                  <li key={r.labelKey}><Link to={r.to} className="footer-link">{t(r.labelKey)}</Link></li>
                ))}
              </ul>
            </div>

            {/* Quick Links */}
            <div className="footer-col">
              <h4 className="footer-col-title">{t('quick_links')}</h4>
              <ul className="footer-link-list">
                {QUICK_LINKS.map(l => (
                  <li key={l.labelKey}><Link to={l.to} className="footer-link">{t(l.labelKey)}</Link></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-col">
              <h4 className="footer-col-title">{t('contact_us')}</h4>
              <ul className="footer-contact-list">
                <li>
                  <MapPin size={14} className="footer-contact-icon" />
                  <span>P.O. Box M.48, Accra, Ghana</span>
                </li>
                <li>
                  <Phone size={14} className="footer-contact-icon" />
                  <a href="tel:+233302665125" className="footer-link">+233 302 665 125</a>
                </li>
                <li>
                  <Mail size={14} className="footer-contact-icon" />
                  <a href="mailto:info@bdregistry.gov.gh" className="footer-link">info@bdregistry.gov.gh</a>
                </li>
                <li>
                  <Clock size={14} className="footer-contact-icon" />
                  <span>{t('office_hours')}</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <p className="footer-copyright">
              &copy; {new Date().getFullYear()} Ghana Births &amp; Deaths Registry. {t('all_rights_reserved')}
            </p>
            <div className="footer-legal-links">
              <Link to="/legal/privacy" className="footer-legal-link">{t('privacy_policy')}</Link>
              <Link to="/legal/terms" className="footer-legal-link">{t('terms_of_service')}</Link>
              <Link to="/legal/accessibility" className="footer-legal-link">{t('accessibility_statement')}</Link>
              <Link to="/docs" className="footer-legal-link">Documentation</Link>
              <Link to="/contact" className="footer-legal-link">{t('report_issue')}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Go to Top button */}
      <button
        className={`go-to-top ${showTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label={t('go_to_top')}
        title={t('back_to_top')}
      >
        <ArrowUp size={20} />
      </button>
    </>
  );
}
