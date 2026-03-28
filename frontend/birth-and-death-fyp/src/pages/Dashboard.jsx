import {
  ArrowRight,
  Baby,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { appsApi, clearApiCache } from '../api/client';
import { SkeletonStatsCard, SkeletonTableRow } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const STATUS_BADGE = {
  DRAFT: 'badge-info',
  SUBMITTED: 'badge-info',
  UNDER_REVIEW: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-error',
  PAYMENT_PENDING: 'badge-warning',
  PAYMENT_COMPLETED: 'badge-info',
  PROCESSING: 'badge-warning',
  READY: 'badge-success',
  COLLECTED: 'badge-primary',
  DELIVERED: 'badge-primary',
  CANCELLED: 'badge-error',
};

const STAT_ICONS = [
  <FileText size={20} strokeWidth={1.5} />,
  <Baby size={20} strokeWidth={1.5} />,
  <Heart size={20} strokeWidth={1.5} />,
  <Clock size={20} strokeWidth={1.5} />,
];

const MOCK_STATS = [
  { label: 'Total Applications', value: '—', color: 'green', sub: 'All time' },
  { label: 'Birth Registrations', value: '—', color: 'blue', sub: 'This year' },
  { label: 'Death Records', value: '—', color: 'gray', sub: 'This year' },
  { label: 'Pending Review', value: '—', color: 'yellow', sub: 'Awaiting action' },
];

const QUICK_ACTIONS = [
  { icon: <Baby size={18} />, label: 'Register Birth', to: '/register/birth', color: 'green' },
  { icon: <Heart size={18} />, label: 'Register Death', to: '/register/death', color: 'teal' },
  { icon: <FileText size={18} />, label: 'My Applications', to: '/profile?tab=apps', color: 'blue' },
  { icon: <Search size={18} />, label: 'Track Application', to: '/track', color: 'gold' },
];

const STATUS_COLORS = {
  DRAFT: '#94a3b8', SUBMITTED: '#3b82f6', UNDER_REVIEW: '#f59e0b',
  APPROVED: '#22c55e', REJECTED: '#ef4444', PAYMENT_PENDING: '#f97316',
  PAYMENT_COMPLETED: '#06b6d4', PROCESSING: '#8b5cf6', READY: '#10b981',
  COLLECTED: '#006B3C', DELIVERED: '#006B3C', CANCELLED: '#64748b',
};

function AppDrawer({ app, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app) return;
    setLoading(true);
    appsApi.history(app.id)
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [app]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const open = Boolean(app);

  return (
    <>
      <div className={`dash-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`dash-drawer ${open ? 'open' : ''}`}>
        {app && (
          <>
            <div className="dash-drawer-hdr">
              <div>
                <h3 className="dash-drawer-title">{app.application_number || app.reference_number}</h3>
                <span className={`badge ${STATUS_BADGE[app.status] || 'badge-info'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                  {app.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <button className="dash-drawer-close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="dash-drawer-body">
              <div className="dash-drawer-info">
                <div className="dash-info-row"><span>Type</span><span>{(app.application_type || 'BIRTH').toUpperCase()}</span></div>
                <div className="dash-info-row"><span>Subject</span><span>{app.child_first_name || app.deceased_first_name || '—'} {app.child_last_name || app.deceased_last_name || ''}</span></div>
                <div className="dash-info-row"><span>Service Plan</span><span>{app.service_plan || '—'}</span></div>
                <div className="dash-info-row"><span>Submitted</span><span>{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GH') : '—'}</span></div>
                <div className="dash-info-row"><span>Expected Ready</span><span>{app.expected_ready_date ? new Date(app.expected_ready_date).toLocaleDateString('en-GH') : '—'}</span></div>
                <div className="dash-info-row"><span>Total Fee</span><span>GHS {parseFloat(app.total_fee || 0).toFixed(2)}</span></div>
              </div>

              <h4 className="dash-drawer-section-title">Status History</h4>
              {loading ? (
                <div style={{ padding: '20px 0' }}><span className="spinner spinner-dark" /></div>
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>No status history yet.</p>
              ) : (
                <div className="dash-timeline">
                  {history.map((h, i) => {
                    const st = h.to_status?.value || h.to_status;
                    const color = STATUS_COLORS[st] || '#94a3b8';
                    return (
                      <div key={i} className="dash-tl-item">
                        <div className="dash-tl-dot" style={{ background: color }} />
                        <div className="dash-tl-content">
                          <span className={`badge ${STATUS_BADGE[st] || 'badge-info'}`}>{st?.replace(/_/g, ' ')}</span>
                          {h.reason && <p className="dash-tl-reason">{h.reason}</p>}
                          <p className="dash-tl-time">{h.created_at ? new Date(h.created_at).toLocaleString('en-GH') : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <Link
                  to={`/track?ref=${app.application_number || app.reference_number}`}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={onClose}
                >
                  <Search size={15} /> Track Application
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingApps, setLoadingApps] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    let active = true;

    const loadApplications = async () => {
      clearApiCache();
      try {
        const firstPageData = await appsApi.mine('page=1&page_size=100');
        let list = Array.isArray(firstPageData) ? firstPageData : (firstPageData?.items || []);

        if (!Array.isArray(firstPageData)) {
          const totalPages = Number(firstPageData?.total_pages || 1);
          const pageSize = Number(firstPageData?.page_size || 100);
          if (totalPages > 1) {
            const pageRequests = [];
            for (let page = 2; page <= totalPages; page += 1) {
              pageRequests.push(appsApi.mine(`page=${page}&page_size=${pageSize}`));
            }
            const pageResponses = await Promise.all(pageRequests);
            pageResponses.forEach((response) => {
              const pageItems = Array.isArray(response) ? response : (response?.items || []);
              list = list.concat(pageItems);
            });
          }
        }

        const uniqueApps = Array.from(new Map(list.map(item => [item.id, item])).values());
        if (!active) return;

        setApps(uniqueApps);
        setStats([
          { ...MOCK_STATS[0], value: String(uniqueApps.length) },
          { ...MOCK_STATS[1], value: String(uniqueApps.filter(a => (a.application_type || '').toUpperCase() === 'BIRTH').length) },
          { ...MOCK_STATS[2], value: String(uniqueApps.filter(a => (a.application_type || '').toUpperCase() === 'DEATH').length) },
          { ...MOCK_STATS[3], value: String(uniqueApps.filter(a => ['SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).length) },
        ]);
      } catch {
        if (!active) return;
        setApps([]);
        setStats(MOCK_STATS.map(s => ({ ...s, value: '0' })));
      } finally {
        if (active) setLoadingApps(false);
      }
    };

    loadApplications();
    return () => {
      active = false;
    };
  }, []);

  const filtered = filter === 'ALL' ? apps : apps.filter(a => a.application_type === filter);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard">
      <div className="dash-banner">
        <div className="dash-banner-gold-bar" />
        <div className="container dash-banner-inner">
          <div className="dash-banner-left">
            <div className="dash-avatar-wrap">
              <div className="dash-banner-avatar">
                {`${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()}
              </div>
              <span className="dash-avatar-online" />
            </div>
            <div className="dash-banner-info">
              <p className="dash-greeting">{greeting()}</p>
              <h1 className="dash-name">{user?.first_name} {user?.last_name}</h1>
              <div className="dash-banner-meta">
                <span className="dash-role-pill">Citizen Account</span>
                {user?.email && <span className="dash-meta-email">{user.email}</span>}
              </div>
            </div>
          </div>
          <div className="dash-banner-actions">
            <Link to="/register/birth" className="btn btn-accent">
              <Plus size={16} /> New Birth
            </Link>
            <Link to="/register/death" className="btn btn-outline-white">
              <Plus size={16} /> New Death
            </Link>
            <Link to="/profile" className="btn btn-outline-white">
              <User size={16} /> My Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="container dash-body">
        <section className="dash-stats">
          {loadingApps
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatsCard key={i} />)
            : (stats || MOCK_STATS).map((s, i) => (
              <div key={s.label} className={`stat-card stat-card-${s.color}`}>
                <div className="stat-card-top">
                  <div>
                    <p className="stat-card-label">{s.label}</p>
                    <p className="stat-card-value">{s.value}</p>
                  </div>
                  <div className="stat-card-icon">{STAT_ICONS[i]}</div>
                </div>
                <p className="stat-card-sub">{s.sub}</p>
              </div>
            ))
          }
        </section>

        <div className="dash-main">
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">My Applications</h2>
              <div className="dash-filter">
                {['ALL', 'BIRTH', 'DEATH'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`filter-btn ${filter === f ? 'active' : ''}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="apps-table-wrap">
              <div className="apps-table-head">
                <span>Ref #</span>
                <span>Type</span>
                <span>Subject</span>
                <span>Date</span>
                <span>Status</span>
                <span></span>
              </div>

              {loadingApps
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} />)
                : filtered.length === 0
                  ? (
                    <div className="apps-empty">
                      <FileText size={40} strokeWidth={1.5} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
                      <p>No applications found.</p>
                      <Link to="/register/birth" className="btn btn-primary btn-sm">
                        <Plus size={14} /> Start a New Application
                      </Link>
                    </div>
                  )
                  : filtered.map(app => (
                    <div key={app.id} className="app-row app-row-clickable" onClick={() => setSelectedApp(app)}>
                      <span className="app-ref">{app.application_number || app.reference_number || `APP-${app.id}`}</span>
                      <span>
                        <span className={`badge ${(app.application_type || '').toUpperCase() === 'BIRTH' ? 'badge-success' : 'badge-error'}`}>
                          {(app.application_type || 'BIRTH').toUpperCase()}
                        </span>
                      </span>
                      <span className="app-name">{app.child_first_name || app.deceased_first_name || '—'}</span>
                      <span className="app-date">{new Date(app.created_at).toLocaleDateString('en-GH')}</span>
                      <span>
                        <span className={`badge ${STATUS_BADGE[app.status] || 'badge-info'}`}>
                          {app.status?.replace(/_/g, ' ')}
                        </span>
                      </span>
                      <span className="app-view-btn">
                        <CheckCircle size={13} style={{ marginRight: 4 }} /> Details
                      </span>
                    </div>
                  ))
              }
            </div>
          </section>

          <aside className="dash-aside">
            <h3 className="dash-section-title">Quick Actions</h3>
            <div className="quick-actions">
              {QUICK_ACTIONS.map(a => (
                <Link key={a.label} to={a.to} className={`quick-action quick-action-${a.color}`}>
                  <span className="quick-action-icon">{a.icon}</span>
                  <span className="quick-action-label">{a.label}</span>
                  <ArrowRight size={14} className="quick-action-arrow" />
                </Link>
              ))}
            </div>

            <div className="status-legend">
              <h4 className="legend-title">Status Guide</h4>
              {[
                { label: 'Submitted', cls: 'badge-info', desc: 'Awaiting review' },
                { label: 'Under Review', cls: 'badge-warning', desc: 'Being processed' },
                { label: 'Approved', cls: 'badge-success', desc: 'Approved for certificate' },
                { label: 'Ready', cls: 'badge-success', desc: 'Certificate ready' },
                { label: 'Rejected', cls: 'badge-error', desc: 'Application rejected' },
              ].map(s => (
                <div key={s.label} className="legend-item">
                  <span className={`badge ${s.cls}`}>{s.label}</span>
                  <span className="legend-desc">{s.desc}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <AppDrawer app={selectedApp} onClose={() => setSelectedApp(null)} />
    </div>
  );
}
