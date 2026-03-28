import {
  ArrowRight,
  Award,
  Baby,
  CheckCircle,
  ChevronRight,
  Clock,
  FileSearch,
  Heart,
  LayoutDashboard,
  MapPin,
  Newspaper,
  Phone,
  Search,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Carousel from '../components/Carousel';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

const SERVICES = [
  {
    icon: <Baby size={32} strokeWidth={1.5} />,
    titleKey: 'birth_registration',
    descKey: 'home_service_birth_desc',
    to: '/register/birth',
    ctaKey: 'register_birth',
    color: 'green',
    requiresAuth: true,
  },
  {
    icon: <Heart size={32} strokeWidth={1.5} />,
    titleKey: 'death_registration',
    descKey: 'home_service_death_desc',
    to: '/register/death',
    ctaKey: 'register_death',
    color: 'red',
    requiresAuth: true,
  },
  {
    icon: <FileSearch size={32} strokeWidth={1.5} />,
    titleKey: 'track_application',
    descKey: 'home_service_track_desc',
    to: '/track',
    ctaKey: 'track_application',
    color: 'blue',
    requiresAuth: true,
  },
];

const STATS = [
  { icon: <Baby size={24} strokeWidth={1.5} />, value: '12M+', labelKey: 'births_registered' },
  { icon: <Heart size={24} strokeWidth={1.5} />, value: '4.2M+', labelKey: 'deaths_recorded' },
  { icon: <MapPin size={24} strokeWidth={1.5} />, value: '260+', labelKey: 'district_offices' },
  { icon: <Award size={24} strokeWidth={1.5} />, value: '136', labelKey: 'years_of_service' },
];

const STEPS = [
  { num: '01', icon: <Users size={22} strokeWidth={1.5} />, titleKey: 'step_create_account_title', descKey: 'step_create_account_desc' },
  { num: '02', icon: <Baby size={22} strokeWidth={1.5} />, titleKey: 'step_submit_application_title', descKey: 'step_submit_application_desc' },
  { num: '03', icon: <Clock size={22} strokeWidth={1.5} />, titleKey: 'step_under_review_title', descKey: 'step_under_review_desc' },
  { num: '04', icon: <CheckCircle size={22} strokeWidth={1.5} />, titleKey: 'step_collect_certificate_title', descKey: 'step_collect_certificate_desc' },
];

const NEWS = [
  {
    date: 'January 15, 2025',
    category: 'Announcement',
    title: 'BDR Launches Community Population Register Phase II',
    excerpt: 'The Births and Deaths Registry has commenced the second phase of its Community Population Register initiative, targeting underserved rural communities in all 16 regions.',
  },
  {
    date: 'December 8, 2024',
    category: 'Service Update',
    title: 'Online Birth Registration Now Available Nationwide',
    excerpt: 'Citizens across all 16 regions can now register births online without visiting a district office. The new system reduces processing time by 60%.',
  },
  {
    date: 'November 22, 2024',
    category: 'Press Release',
    title: 'Ghana BDR Trains 500 Community Registration Agents',
    excerpt: 'Over 500 community health workers and local leaders have been trained as volunteer birth registration agents to improve coverage in remote areas.',
  },
];

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
  'Bono East', 'Ahafo', 'Oti', 'Savannah', 'North East', 'Western North',
];

export default function Home() {
  const [trackRef, setTrackRef] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t, tf } = useLanguage();

  const handleServiceClick = (e, to) => {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate('/signin', { state: { from: { pathname: to } } });
    }
  };

  const handleTrack = e => {
    e.preventDefault();
    if (trackRef.trim()) navigate(`/track?ref=${encodeURIComponent(trackRef.trim())}`);
    else navigate('/track');
  };

  return (
    <div className="home-page">

      {/* Hero Carousel */}
      <Carousel />

      {/* Quick Track Bar */}
      <div className="home-track-bar">
        <div className="container home-track-inner">
          <div className="home-track-label">
            <FileSearch size={18} />
            <span>{t('track_your_application')}</span>
          </div>
          <form className="home-track-form" onSubmit={handleTrack}>
            <div className="home-track-input-wrap">
              <Search size={16} className="home-track-search-icon" />
              <input
                type="text"
                className="home-track-input"
                placeholder={t('enter_reference')}
                value={trackRef}
                onChange={e => setTrackRef(e.target.value)}
                aria-label={t('application_reference_number')}
              />
            </div>
            <button type="submit" className="btn btn-primary home-track-btn">
              {t('track')} <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Services */}
      <section className="section home-services-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">{t('our_services')}</div>
            <h2 className="section-title">{t('what_we_offer')}</h2>
            <p className="section-sub">
              {t('home_services_sub')}
            </p>
          </div>
          <div className="home-services-grid">
            {SERVICES.map(s => (
              <div key={s.titleKey} className={`home-service-card svc-${s.color}`}>
                <div className="home-service-icon">{s.icon}</div>
                <h3 className="home-service-title">{t(s.titleKey)}</h3>
                <p className="home-service-desc">{t(s.descKey)}</p>
                <Link
                  to={s.to}
                  className="home-service-link"
                  onClick={s.requiresAuth ? e => handleServiceClick(e, s.to) : undefined}
                >
                  {t(s.ctaKey)} <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="home-stats-section">
        <div className="container home-stats-grid">
          {STATS.map(s => (
            <div key={s.labelKey} className="home-stat-item">
              <div className="home-stat-icon">{s.icon}</div>
              <div className="home-stat-value">{s.value}</div>
              <div className="home-stat-label">{t(s.labelKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">{t('process')}</div>
            <h2 className="section-title">{t('how_it_works')}</h2>
            <p className="section-sub">{t('home_process_sub')}</p>
          </div>
          <div className="home-steps-grid">
            {STEPS.map((step, i) => (
              <div key={step.num} className="home-step-card">
                <div className="home-step-num">{step.num}</div>
                <div className="home-step-icon">{step.icon}</div>
                <h4 className="home-step-title">{t(step.titleKey)}</h4>
                <p className="home-step-desc">{t(step.descKey)}</p>
                {i < STEPS.length - 1 && <div className="home-step-connector" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="section home-news-section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'left' }}>
            <div className="section-eyebrow">{t('latest')}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>{t('news_ann')}</h2>
              <Link to="/media/news" className="btn btn-outline btn-sm">
                {t('view_all')} <ChevronRight size={15} />
              </Link>
            </div>
          </div>
          <div className="home-news-grid">
            {NEWS.map(n => (
              <article key={n.title} className="home-news-card">
                <div className="home-news-category">{n.category}</div>
                <div className="home-news-date">
                  <Newspaper size={13} /> {n.date}
                </div>
                <h4 className="home-news-title">{n.title}</h4>
                <p className="home-news-excerpt">{n.excerpt}</p>
                <a href="#" className="home-news-read-more">
                  {t('read_more')} <ArrowRight size={13} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose BDR */}
      <section className="section home-why-section">
        <div className="container home-why-inner">
          <div className="home-why-text">
            <div className="section-eyebrow">{t('why_bdr')}</div>
            <h2 className="section-title" style={{ textAlign: 'left' }}>
              {t('trusted_authority_title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              {t('trusted_authority_desc')}
            </p>
            <ul className="home-why-list">
              <li><CheckCircle size={17} className="why-check" /> {t('why_bullet_free_birth')}</li>
              <li><CheckCircle size={17} className="why-check" /> {t('why_bullet_260_offices')}</li>
              <li><CheckCircle size={17} className="why-check" /> {t('why_bullet_realtime_tracking')}</li>
              <li><CheckCircle size={17} className="why-check" /> {t('why_bullet_international_cert')}</li>
              <li><CheckCircle size={17} className="why-check" /> {t('why_bullet_secure_platform')}</li>
            </ul>
            <Link to="/about" className="btn btn-primary" style={{ marginTop: 8 }}>
              {t('learn_more_about_bdr')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="home-why-stats-col">
            <img
              src="https://i.pinimg.com/474x/24/1d/8a/241d8a77ff3f8c547092c0b9e87daadc.jpg"
              alt="Ghana BDR registration services"
              className="home-why-image"
              loading="lazy"
              decoding="async"
            />
            <div className="home-why-badge">
              <Shield size={20} />
              <span>{t('government_certified')}</span>
            </div>
            <div className="home-why-stat-card">
              <TrendingUp size={22} className="wsc-icon" />
              <div className="wsc-value">99.2%</div>
              <div className="wsc-label">{t('application_success_rate')}</div>
            </div>
            <div className="home-why-stat-card">
              <Clock size={22} className="wsc-icon" />
              <div className="wsc-value">5–10</div>
              <div className="wsc-label">{t('business_days_processing')}</div>
            </div>
            <div className="home-why-stat-card">
              <Users size={22} className="wsc-icon" />
              <div className="wsc-value">3M+</div>
              <div className="wsc-label">{t('annual_registrations')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Regions */}
      <section className="section home-regions-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">{t('coverage')}</div>
            <h2 className="section-title">{t('all_16_regions')}</h2>
            <p className="section-sub">{t('regions_sub')}</p>
          </div>
          <div className="home-regions-grid">
            {REGIONS.map(r => (
              <Link key={r} to={`/offices#${r.toLowerCase().replace(/ /g, '-')}`} className="home-region-chip">
                <MapPin size={13} />
                {r} {t('region_suffix')}
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/offices" className="btn btn-outline">
              {t('view_all_offices')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="home-cta-section">
        <div className="container home-cta-inner">
          <div className="home-cta-text">
            {isAuthenticated ? (
              <>
                <h2>
                  {user?.full_name
                    ? tf('welcome_back_name', { name: user.full_name.split(' ')[0] })
                    : t('welcome_back')}
                </h2>
                <p>{t('dashboard_cta_desc')}</p>
              </>
            ) : (
              <>
                <h2>{t('ready_to_register')}</h2>
                <p>{t('register_cta_desc')}</p>
              </>
            )}
          </div>
          <div className="home-cta-actions">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="btn btn-accent btn-lg">
                  <LayoutDashboard size={18} /> {t('go_to_dashboard')}
                </Link>
                <Link to="/contact" className="btn home-cta-outline btn-lg">
                  <Phone size={17} /> {t('contact_us')}
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-accent btn-lg">
                  {t('create_free_account')} <ArrowRight size={18} />
                </Link>
                <Link to="/contact" className="btn home-cta-outline btn-lg">
                  <Phone size={17} /> {t('contact_us')}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
