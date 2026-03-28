import {
  Activity, AlertCircle, AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2, Bell, BellOff,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronLeft, ChevronRight,
  ClipboardList,
  Clock,
  Database, Download,
  ExternalLink,
  Eye, FileText, Filter, Globe, Home,
  LogOut, Mail, Menu,
  Monitor, Moon,
  Printer,
  RefreshCw, Search,
  Send,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  UserCheck, UserMinus, UserPlus, Users, X,
  XCircle,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis,
} from 'recharts';
import { API_BASE_URL, adminApi, aiAdminApi, aiApi, authApi, kycApi, notificationsApi, statisticsApi } from '../api/client';
import logo from '../assets/logo.png';
import LanguageSwitcher from '../components/LanguageSwitcher';
import MarkdownText from '../components/MarkdownText';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { useTheme } from '../context/ThemeContext';
import './SuperAdminDashboard.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_COLORS = {
  DRAFT: '#94a3b8', SUBMITTED: '#3b82f6', UNDER_REVIEW: '#f59e0b',
  APPROVED: '#22c55e', REJECTED: '#ef4444', PAYMENT_PENDING: '#f97316',
  PAYMENT_COMPLETED: '#06b6d4', PROCESSING: '#8b5cf6', READY: '#10b981',
  COLLECTED: '#006B3C', DELIVERED: '#006B3C', CANCELLED: '#64748b',
};
const STATUS_LABELS = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved', REJECTED: 'Rejected', PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_COMPLETED: 'Payment Completed', PROCESSING: 'Processing',
  READY: 'Ready', COLLECTED: 'Collected', DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const PIE_COLORS = ['#006B3C', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#10b981', '#64748b', '#22c55e', '#FCD116', '#94a3b8'];

const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Home, group: 'main' },
  { id: 'applications', label: 'Applications', icon: FileText, group: 'main', badge: 'applications' },
  { id: 'users', label: 'Users', icon: Users, group: 'main', badge: 'users' },
  { id: 'staff', label: 'Staff', icon: UserCheck, group: 'main' },
  { id: 'kyc', label: 'KYC Review', icon: Shield, group: 'main', badge: 'kyc' },
  { id: 'data-requests', label: 'Data Requests', icon: BookOpen, group: 'main' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, group: 'insights' },
  { id: 'revenue', label: 'Revenue Report', icon: TrendingUp, group: 'insights' },
  { id: 'audit', label: 'Audit Logs', icon: Database, group: 'insights' },
  { id: 'reports', label: 'Reports', icon: Download, group: 'insights' },
  { id: 'system', label: 'System Health', icon: Activity, group: 'insights' },
  { id: 'ai-intelligence', label: 'AI Intelligence', icon: Sparkles, group: 'insights' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtCurrency(v) {
  return `GHS ${parseFloat(v || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}
function initials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase() || '?';
}

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status?.replace(/_/g, ' ') || '—';
  return (
    <span className={`sa-status-badge sa-status-${status || 'DRAFT'}`}>
      {label}
    </span>
  );
}

function RoleBadge({ role }) {
  const configs = {
    citizen: { label: 'Citizen', bg: '#e0f2fe', color: '#0369a1' },
    staff: { label: 'Staff', bg: '#dcfce7', color: '#166534' },
    admin: { label: 'Admin', bg: '#fef3c7', color: '#92400e' },
    super_admin: { label: 'Super Admin', bg: '#f3e8ff', color: '#7e22ce' },
  };
  const c = configs[role?.toLowerCase()] || { label: role, bg: '#f3f4f6', color: '#374151' };
  return (
    <span className="sa-role-badge" style={{ background: c.bg, color: c.color }}>{c.label}</span>
  );
}

function StatCard({ label, value, sub, icon: Icon, trend, color = 'green', loading }) {
  if (loading) return <div className="sa-stat-card sa-stat-loading"><div className="sa-skel" style={{ height: 80 }} /></div>;
  const isUp = trend > 0;
  return (
    <div className={`sa-stat-card sa-stat-${color}`}>
      <div className="sa-stat-top">
        <div className="sa-stat-icon"><Icon size={20} /></div>
        <div className="sa-stat-trend">
          {trend !== undefined && (
            isUp
              ? <><ArrowUpRight size={13} /><span>{Math.abs(trend)}%</span></>
              : <><ArrowDownRight size={13} /><span>{Math.abs(trend)}%</span></>
          )}
        </div>
      </div>
      <div className="sa-stat-val">{value}</div>
      <div className="sa-stat-label">{label}</div>
      {sub && <div className="sa-stat-sub">{sub}</div>}
    </div>
  );
}

function Avatar({ first, last, photo, size = 36 }) {
  if (photo) return <img src={photo} alt="" className="sa-avatar" style={{ width: size, height: size }} />;
  return (
    <div className="sa-avatar sa-avatar-text" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(first, last)}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
  return (
    <div className="sa-pagination">
      <button className="sa-pg-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
      {pages[0] > 1 && <><button className="sa-pg-btn" onClick={() => onPage(1)}>1</button><span className="sa-pg-ellipsis">…</span></>}
      {pages.map(p => (
        <button key={p} className={`sa-pg-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      {pages[pages.length - 1] < totalPages && <><span className="sa-pg-ellipsis">…</span><button className="sa-pg-btn" onClick={() => onPage(totalPages)}>{totalPages}</button></>}
      <button className="sa-pg-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight size={14} /></button>
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, title, sub }) {
  return (
    <div className="sa-empty">
      <div className="sa-empty-icon"><Icon size={32} strokeWidth={1.5} /></div>
      <p className="sa-empty-title">{title}</p>
      {sub && <p className="sa-empty-sub">{sub}</p>}
    </div>
  );
}

function Drawer({ open, onClose, title, children, width = 560 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <div className={`sa-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`sa-drawer ${open ? 'open' : ''}`} style={{ width }}>
        <div className="sa-drawer-header">
          <h3 className="sa-drawer-title">{title}</h3>
          <button className="sa-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sa-drawer-body">{children}</div>
      </div>
    </>
  );
}

function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="sa-overlay open" onClick={onClose} />
      <div className="sa-modal" style={{ maxWidth: width }}>
        <div className="sa-modal-header">
          <h3 className="sa-modal-title">{title}</h3>
          <button className="sa-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sa-modal-body">{children}</div>
      </div>
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="sa-info-row">
      <span className="sa-info-label">{label}</span>
      <span className="sa-info-value">{value || '—'}</span>
    </div>
  );
}

function StatusTimeline({ history }) {
  if (!history?.length) return <p className="sa-text-muted" style={{ fontSize: 13 }}>No status history available.</p>;
  return (
    <div className="sa-timeline">
      {history.map((h, i) => {
        const toStatus = h.to_status?.value || h.to_status;
        const fromStatus = h.from_status?.value || h.from_status;
        return (
          <div key={i} className="sa-timeline-item">
            <div className="sa-timeline-dot" style={{ background: STATUS_COLORS[toStatus] || '#94a3b8' }} />
            <div className="sa-timeline-content">
              <div className="sa-timeline-status">
                {fromStatus && <><StatusBadge status={fromStatus} /><ChevronRight size={12} style={{ color: '#94a3b8', margin: '0 4px' }} /></>}
                <StatusBadge status={toStatus} />
              </div>
              {h.reason && <p className="sa-timeline-reason">{h.reason}</p>}
              <p className="sa-timeline-time">{fmtDateTime(h.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotificationBell({ count, onClick }) {
  return (
    <button className="sa-bell-btn" onClick={onClick}>
      <Bell size={20} />
      {count > 0 && <span className="sa-bell-badge">{count > 99 ? '99+' : count}</span>}
    </button>
  );
}

function OverviewSection({ overview, trends, statusDist, revenueData, revDays, setRevDays, loading, onAppClick }) {
  const now = new Date();
  const apps = overview?.applications || {};
  const users = overview?.users || {};
  const revenue = overview?.revenue || {};
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    try {
      const stats = {
        total_applications: apps.total || 0,
        pending: apps.pending_review || 0,
        approved: apps.approved || 0,
        rejected: apps.rejected || 0,
        staff_count: users.staff || 0,
        revenue: parseFloat(revenue.total_ghs || 0),
      };
      const result = await aiAdminApi.dailyBriefing(stats);
      setBriefing(result);
    } catch (e) {
      setBriefing({ error: e.message || 'Failed to generate briefing' });
    } finally {
      setBriefingLoading(false);
    }
  };

  const pendingCount = apps.pending_review || 0;
  const approvalRate = apps.total > 0
    ? Math.round(((apps.total - pendingCount) / apps.total) * 100)
    : 0;

  const statCards = [
    { label: 'Total Applications', value: (apps.total || 0).toLocaleString(), icon: FileText, color: 'blue', sub: `${apps.this_month || 0} this month` },
    { label: 'Pending Review', value: (pendingCount).toLocaleString(), icon: Clock, color: 'yellow', sub: 'Requires action', trend: pendingCount > 5 ? 8 : -2 },
    { label: 'Total Revenue', value: fmtCurrency(revenue.total_ghs), icon: TrendingUp, color: 'green', sub: fmtCurrency(revenue.this_month_ghs) + ' this month' },
    { label: 'Registered Citizens', value: (users.total || 0).toLocaleString(), icon: Users, color: 'purple', sub: `${users.active || 0} active` },
  ];

  const trendData = (overview?.monthly_trend || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' }),
    Applications: d.count,
  }));

  const pieData = statusDist.map(s => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#94a3b8',
  }));

  const revChartData = (revenueData?.daily_breakdown || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' }),
    Revenue: parseFloat(d.amount || 0),
    Transactions: d.transactions || 0,
  }));

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Overview</h2>
          <p className="sa-section-sub">{now.toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="sa-stats-grid">
        {statCards.map(c => <StatCard key={c.label} {...c} loading={loading} />)}
      </div>

      <div className="sa-ai-briefing-card">
        <div className="sa-ai-briefing-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: '#FCD116' }} />
            <span className="sa-ai-briefing-title">Daily AI Briefing</span>
            <span className="sa-ai-briefing-date">{now.toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={handleGenerateBriefing} disabled={briefingLoading}>
            <Sparkles size={12} />{briefingLoading ? 'Generating...' : 'Generate Briefing'}
          </button>
        </div>
        {!briefing && !briefingLoading && (
          <p className="sa-ai-briefing-prompt">Click "Generate Briefing" to get an AI-powered daily summary of registry activity, alerts, and recommendations.</p>
        )}
        {briefingLoading && (
          <div className="sa-ai-briefing-loading">
            <div className="sa-skel" style={{ height: 16, width: '60%', marginBottom: 8 }} />
            <div className="sa-skel" style={{ height: 16, width: '80%', marginBottom: 8 }} />
            <div className="sa-skel" style={{ height: 16, width: '50%' }} />
          </div>
        )}
        {briefing && !briefingLoading && (
          briefing.error ? (
            <span style={{ fontSize: 13, color: '#b91c1c' }}>{briefing.error}</span>
          ) : (
            <div className="sa-ai-briefing-body">
              {(briefing.briefing || briefing.summary) && <p className="sa-ai-briefing-summary">{briefing.briefing || briefing.summary}</p>}
              {Array.isArray(briefing.highlights) && briefing.highlights.length > 0 && (
                <div className="sa-ai-briefing-section">
                  <p className="sa-ai-briefing-section-label">Highlights</p>
                  <ul className="sa-ai-briefing-list">
                    {briefing.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(briefing.alerts) && briefing.alerts.length > 0 && (
                <div className="sa-ai-briefing-section">
                  <p className="sa-ai-briefing-section-label sa-ai-briefing-alerts-label">Alerts</p>
                  <ul className="sa-ai-briefing-list sa-ai-briefing-alerts-list">
                    {briefing.alerts.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(briefing.recommendations) && briefing.recommendations.length > 0 && (
                <div className="sa-ai-briefing-section">
                  <p className="sa-ai-briefing-section-label">Recommendations</p>
                  <ul className="sa-ai-briefing-list">
                    {briefing.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <div className="sa-charts-row">
        <div className="sa-chart-card">
          <div className="sa-chart-header">
            <h3 className="sa-chart-title">Application Trend (30 Days)</h3>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006B3C" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#006B3C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="Applications" stroke="#006B3C" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart2} title="No trend data yet" sub="Data will appear as applications are submitted" />
          )}
        </div>

        <div className="sa-chart-card">
          <div className="sa-chart-header">
            <h3 className="sa-chart-title">Status Distribution</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(val, name) => [val.toLocaleString(), name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart2} title="No data yet" />
          )}
        </div>
      </div>

      <div className="sa-chart-card" style={{ marginTop: 16 }}>
        <div className="sa-chart-header">
          <h3 className="sa-chart-title">Revenue</h3>
          <div className="sa-chart-controls">
            {[30, 60, 90, 365].map(d => (
              <button key={d} className={`sa-ctrl-btn ${revDays === d ? 'active' : ''}`} onClick={() => setRevDays(d)}>
                {d === 365 ? '1Y' : `${d}D`}
              </button>
            ))}
          </div>
        </div>
        {revChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v, n) => [n === 'Revenue' ? fmtCurrency(v) : v, n]} />
              <Bar dataKey="Revenue" fill="#006B3C" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={TrendingUp} title="No revenue data for this period" sub="Revenue will appear once payments are processed" />
        )}
      </div>

      <div className="sa-chart-card" style={{ marginTop: 16 }}>
        <div className="sa-chart-header">
          <h3 className="sa-chart-title">Recent Registrations</h3>
        </div>
        {(overview?.recent_registrations || []).length === 0 ? (
          <EmptyState icon={Users} title="No recent registrations" />
        ) : (
          <div className="sa-table">
            <div className="sa-table-head">
              <span>Name</span><span>Email</span><span>Joined</span>
            </div>
            {(overview?.recent_registrations || []).map(u => (
              <div key={u.id} className="sa-table-row">
                <span className="sa-table-main">{u.name || '—'}</span>
                <span className="sa-table-muted">{u.email}</span>
                <span className="sa-table-muted">{fmtDate(u.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationsSection({ onBadgeClear }) {
  const { showSnackbar } = useSnackbar();
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [history, setHistory] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [drawerTab, setDrawerTab] = useState('details');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [fraudResult, setFraudResult] = useState(null);
  const [fraudLoading, setFraudLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, page_size: 15 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminApi.listApplications(params.toString());
      setApps(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(p);
      onBadgeClear?.('applications');
    } catch {
      showSnackbar('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showSnackbar, onBadgeClear]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    adminApi.listStaffMembers().then(d => setStaffList(Array.isArray(d) ? d : [])).catch(() => { });
  }, []);

  const handleFraudCheck = async () => {
    if (!selectedApp) return;
    setFraudLoading(true);
    try {
      const result = await aiAdminApi.fraudCheck(selectedApp.id);
      setFraudResult(result);
    } catch (e) {
      setFraudResult({ error: e.message || 'Fraud check failed' });
    } finally {
      setFraudLoading(false);
    }
  };

  const openApp = async (app) => {
    setDrawerOpen(true);
    setDrawerTab('details');
    setSelectedApp(app);
    setNewStatus(app.status);
    setReason('');
    setNotes('');
    setAssignStaffId(app.assigned_to_id ? String(app.assigned_to_id) : '');
    setAssignNote('');
    setChatMessages([]);
    setChatInput('');
    setFraudResult(null);
    try {
      const full = await adminApi.getApplication(app.id);
      setSelectedApp(full || app);
      setNewStatus(full?.status || app.status);
      setAssignStaffId(full?.assigned_to_id ? String(full.assigned_to_id) : '');
    } catch {
      setSelectedApp(app);
    }
    try {
      const h = await adminApi.getApplicationHistory(app.id);
      setHistory(Array.isArray(h) ? h : []);
    } catch { setHistory([]); }
    try {
      const msgs = await adminApi.getApplicationChat(app.id);
      setChatMessages(Array.isArray(msgs) ? msgs : []);
    } catch { setChatMessages([]); }
  };

  const handleAssign = async () => {
    if (!selectedApp) return;
    setAssigning(true);
    try {
      if (assignStaffId) {
        await adminApi.assignApplication(selectedApp.id, parseInt(assignStaffId), assignNote);
        showSnackbar('Application assigned to staff', 'success');
      } else {
        await adminApi.unassignApplication(selectedApp.id);
        showSnackbar('Assignment removed', 'success');
      }
      const full = await adminApi.getApplication(selectedApp.id);
      setSelectedApp(full);
    } catch (e) {
      showSnackbar(e.message || 'Assignment failed', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedApp) return;
    setSendingChat(true);
    try {
      const msg = await adminApi.sendApplicationChat(selectedApp.id, chatInput.trim());
      setChatMessages(prev => [...prev, msg]);
      setChatInput('');
    } catch (e) {
      showSnackbar(e.message || 'Failed to send', 'error');
    } finally {
      setSendingChat(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !selectedApp) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateApplicationStatus(selectedApp.id, { status: newStatus, reason, staff_notes: notes });
      showSnackbar('Application status updated', 'success');
      setDrawerOpen(false);
      load(page);
    } catch (e) {
      showSnackbar(e.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusOptions = Object.keys(STATUS_LABELS).filter(s => !['DRAFT', 'COLLECTED', 'DELIVERED'].includes(s));

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Applications</h2>
          <p className="sa-section-sub">{total.toLocaleString()} total records</p>
        </div>
        <button className="sa-btn sa-btn-outline" onClick={() => load(1)}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="sa-filters">
        <div className="sa-search-wrap">
          <Search size={14} className="sa-search-icon" />
          <input className="sa-search" placeholder="Search by reference, name…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)} />
        </div>
        <select className="sa-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="sa-btn sa-btn-primary" onClick={() => load(1)}><Filter size={14} /> Apply</button>
      </div>

      {loading ? (
        <div className="sa-table-skeleton">
          {[...Array(8)].map((_, i) => <div key={i} className="sa-skel sa-skel-row" />)}
        </div>
      ) : apps.length === 0 ? (
        <EmptyState icon={FileText} title="No applications found" sub="Try adjusting your filters" />
      ) : (
        <>
          <div className="sa-table">
            <div className="sa-table-head sa-apps-cols">
              <span>Reference</span><span>Type</span><span>Subject</span>
              <span>Applicant</span><span>Date</span><span>Status</span><span></span>
            </div>
            {apps.map(app => {
              const extra = app.extra_data || {};
              const appType = (extra.application_type || app.application_type || 'BIRTH').toUpperCase();
              return (
                <div key={app.id} className="sa-table-row sa-apps-cols" onClick={() => openApp(app)}>
                  <span className="sa-table-ref">{app.application_number}</span>
                  <span><span className={`sa-type-badge sa-type-${appType.toLowerCase()}`}>{appType}</span></span>
                  <span className="sa-table-main">{app.child_first_name} {app.child_last_name}</span>
                  <span className="sa-table-muted">{app.applicant?.email || '—'}</span>
                  <span className="sa-table-muted">{fmtDate(app.created_at)}</span>
                  <span><StatusBadge status={app.status} /></span>
                  <span className="sa-table-action"><Eye size={14} /></span>
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />
        </>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedApp?.application_number || 'Application Detail'} width={660}>
        {selectedApp && (
          <>
            <div className="sa-drawer-tabs">
              {[['details', 'Details'], ['assign', 'Assign'], ['chat', 'Chat']].map(([key, label]) => (
                <button key={key} className={`sa-drawer-tab${drawerTab === key ? ' active' : ''}`} onClick={() => setDrawerTab(key)}>{label}</button>
              ))}
            </div>

            {drawerTab === 'details' && (
              <>
                <div className="sa-drawer-section">
                  <h4 className="sa-drawer-section-title">Current Status</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <StatusBadge status={selectedApp.status} />
                    <span className="sa-text-muted" style={{ fontSize: 12 }}>Updated {fmtDate(selectedApp.updated_at)}</span>
                    {selectedApp.assigned_to_name && (
                      <span className="sa-assign-badge"><UserCheck size={11} /> {selectedApp.assigned_to_name}</span>
                    )}
                    <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={handleFraudCheck} disabled={fraudLoading}>
                      <Zap size={12} />{fraudLoading ? 'Checking...' : 'AI Fraud Check'}
                    </button>
                  </div>
                  {fraudResult && (
                    <div className="sa-fraud-result">
                      {fraudResult.error ? (
                        <span style={{ color: '#b91c1c', fontSize: 12 }}>{fraudResult.error}</span>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>Risk Level:</span>
                            <span className={`sa-fraud-risk sa-fraud-risk-${(fraudResult.risk_level || 'unknown').toLowerCase()}`}>
                              {fraudResult.risk_level || 'Unknown'}
                            </span>
                          </div>
                          {fraudResult.score !== undefined && (
                            <div style={{ fontSize: 12, color: 'var(--sa-text-muted)', marginBottom: 4 }}>
                              Score: {fraudResult.score}
                            </div>
                          )}
                          {Array.isArray(fraudResult.indicators) && fraudResult.indicators.length > 0 && (
                            <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: 'var(--sa-text-secondary)' }}>
                              {fraudResult.indicators.map((ind, i) => <li key={i}>{ind}</li>)}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="sa-drawer-section">
                  <h4 className="sa-drawer-section-title">Subject Information</h4>
                  <InfoRow label="Full Name" value={`${selectedApp.child_first_name || ''} ${selectedApp.child_other_names || ''} ${selectedApp.child_last_name || ''}`.trim()} />
                  <InfoRow label="Date of Birth" value={selectedApp.child_date_of_birth} />
                  <InfoRow label="Gender" value={selectedApp.child_gender} />
                  <InfoRow label="Region of Birth" value={selectedApp.child_region_of_birth} />
                  <InfoRow label="District" value={selectedApp.child_district_of_birth} />
                  <InfoRow label="Place of Birth" value={selectedApp.child_place_of_birth} />
                </div>

                {selectedApp.mother_first_name && (
                  <div className="sa-drawer-section">
                    <h4 className="sa-drawer-section-title">Mother</h4>
                    <InfoRow label="Name" value={`${selectedApp.mother_first_name} ${selectedApp.mother_last_name || ''}`.trim()} />
                    <InfoRow label="Ghana Card" value={selectedApp.mother_ghana_card} />
                    <InfoRow label="Phone" value={selectedApp.mother_phone} />
                  </div>
                )}

                {selectedApp.father_first_name && (
                  <div className="sa-drawer-section">
                    <h4 className="sa-drawer-section-title">Father</h4>
                    <InfoRow label="Name" value={`${selectedApp.father_first_name} ${selectedApp.father_last_name || ''}`.trim()} />
                    <InfoRow label="Ghana Card" value={selectedApp.father_ghana_card} />
                    <InfoRow label="Phone" value={selectedApp.father_phone} />
                  </div>
                )}

                <div className="sa-drawer-section">
                  <h4 className="sa-drawer-section-title">Service Details</h4>
                  <InfoRow label="Service Plan" value={selectedApp.service_plan} />
                  <InfoRow label="Delivery Method" value={selectedApp.delivery_method} />
                  <InfoRow label="Processing Fee" value={fmtCurrency(selectedApp.processing_fee)} />
                  <InfoRow label="Delivery Fee" value={fmtCurrency(selectedApp.delivery_fee)} />
                  <InfoRow label="Total Fee" value={fmtCurrency(selectedApp.total_fee)} />
                  <InfoRow label="Expected Ready" value={fmtDate(selectedApp.expected_ready_date)} />
                </div>

                <div className="sa-drawer-section">
                  <h4 className="sa-drawer-section-title">Update Status</h4>
                  <div className="sa-form-group">
                    <label className="sa-label">New Status</label>
                    <select className="sa-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      {statusOptions.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div className="sa-form-group">
                    <label className="sa-label">Reason / Decision Notes</label>
                    <textarea className="sa-textarea" rows={3} placeholder="Reason for this status change (sent to applicant via email & SMS)…"
                      value={reason} onChange={e => setReason(e.target.value)} />
                  </div>
                  <div className="sa-form-group">
                    <label className="sa-label">Internal Staff Notes</label>
                    <textarea className="sa-textarea" rows={2} placeholder="Internal notes (not sent to applicant)…"
                      value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <button className="sa-btn sa-btn-primary" onClick={handleStatusUpdate} disabled={updatingStatus}>
                    {updatingStatus ? <><span className="sa-spinner" /> Updating…</> : 'Update Status & Notify Applicant'}
                  </button>
                </div>

                <div className="sa-drawer-section">
                  <h4 className="sa-drawer-section-title">Status History</h4>
                  <StatusTimeline history={history} />
                </div>
              </>
            )}

            {drawerTab === 'assign' && (
              <div className="sa-drawer-section">
                <h4 className="sa-drawer-section-title">Assign to Staff Member</h4>
                {selectedApp.assigned_to_name ? (
                  <div className="sa-assign-current">
                    <UserCheck size={14} />
                    <span>Currently assigned to <strong>{selectedApp.assigned_to_name}</strong></span>
                  </div>
                ) : (
                  <p className="sa-text-muted" style={{ fontSize: 13, marginBottom: 16 }}>No staff member assigned yet. Assign one below so they can work on this application.</p>
                )}
                <div className="sa-form-group">
                  <label className="sa-label">Staff Member</label>
                  <select className="sa-select" value={assignStaffId} onChange={e => setAssignStaffId(e.target.value)}>
                    <option value="">— Unassign / Remove Assignment —</option>
                    {staffList.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div className="sa-form-group">
                  <label className="sa-label">Assignment Note (optional)</label>
                  <textarea className="sa-textarea" rows={2} placeholder="Instructions or context for the assigned staff member…"
                    value={assignNote} onChange={e => setAssignNote(e.target.value)} />
                </div>
                <button className="sa-btn sa-btn-primary" onClick={handleAssign} disabled={assigning}>
                  {assigning ? <><span className="sa-spinner" /> Saving…</> : <><UserCheck size={14} /> {assignStaffId ? 'Assign Application' : 'Remove Assignment'}</>}
                </button>
              </div>
            )}

            {drawerTab === 'chat' && (
              <div className="sa-drawer-section sa-chat-section">
                <h4 className="sa-drawer-section-title">Admin–Staff Chat</h4>
                <div className="sa-chat-messages">
                  {chatMessages.length === 0 ? (
                    <p className="sa-text-muted" style={{ fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No messages yet. Start a conversation with the assigned staff member.</p>
                  ) : chatMessages.map((m, i) => (
                    <div key={i} className={`sa-chat-msg ${m.sender_role === 'super_admin' || m.sender_role === 'admin' ? 'sa-chat-msg-right' : 'sa-chat-msg-left'}`}>
                      <span className="sa-chat-sender">{m.sender_name} <span className="sa-chat-time">{fmtDate(m.created_at)}</span></span>
                      <div className="sa-chat-bubble">{m.message}</div>
                    </div>
                  ))}
                </div>
                <div className="sa-chat-input-row">
                  <input className="sa-input" placeholder="Type a message…" value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()} />
                  <button className="sa-btn sa-btn-primary" onClick={handleSendChat} disabled={sendingChat || !chatInput.trim()}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}

function UsersSection({ onBadgeClear }) {
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, page_size: 15 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminApi.listUsers(params.toString());
      setUsers(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(p);
      onBadgeClear?.('users');
    } catch {
      showSnackbar('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, showSnackbar, onBadgeClear]);

  useEffect(() => { load(1); }, [load]);

  const openUser = async (user) => {
    try {
      const full = await adminApi.getUser(user.id);
      setSelectedUser(full);
    } catch {
      setSelectedUser(user);
    }
    setDrawerOpen(true);
  };

  const updateUser = async (body) => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      await adminApi.updateUser(selectedUser.id, body);
      showSnackbar('User updated successfully', 'success');
      load(page);
      const updated = await adminApi.getUser(selectedUser.id);
      setSelectedUser(updated);
    } catch (e) {
      showSnackbar(e.message || 'Update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(selectedUser.id);
      showSnackbar(`${selectedUser.first_name} ${selectedUser.last_name} has been deleted`, 'success');
      setDrawerOpen(false);
      setSelectedUser(null);
      setConfirmDelete(false);
      load(page);
    } catch (e) {
      showSnackbar(e.message || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Users</h2>
          <p className="sa-section-sub">{total.toLocaleString()} registered users</p>
        </div>
        <button className="sa-btn sa-btn-outline" onClick={() => load(1)}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="sa-filters">
        <div className="sa-search-wrap">
          <Search size={14} className="sa-search-icon" />
          <input className="sa-search" placeholder="Search by name, email…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)} />
        </div>
        <select className="sa-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="citizen">Citizen</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select className="sa-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="pending_verification">Pending Verification</option>
        </select>
        <button className="sa-btn sa-btn-primary" onClick={() => load(1)}><Filter size={14} /> Apply</button>
      </div>

      {loading ? (
        <div className="sa-table-skeleton">{[...Array(8)].map((_, i) => <div key={i} className="sa-skel sa-skel-row" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" sub="Try adjusting your search or filters" />
      ) : (
        <>
          <div className="sa-table">
            <div className="sa-table-head sa-users-cols">
              <span>User</span><span>Email</span><span>Role</span>
              <span>KYC</span><span>Joined</span><span></span>
            </div>
            {users.map(u => (
              <div key={u.id} className="sa-table-row sa-users-cols" onClick={() => openUser(u)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar first={u.first_name} last={u.last_name} photo={u.profile_photo} size={32} />
                  <span className="sa-table-main">{u.first_name} {u.last_name}</span>
                </span>
                <span className="sa-table-muted">{u.email}</span>
                <span><RoleBadge role={u.role} /></span>
                <span>
                  <span className={`sa-kyc-badge sa-kyc-${(u.kyc_status || 'not_started').toLowerCase()}`}>
                    {(u.kyc_status || 'Not Started').replace(/_/g, ' ')}
                  </span>
                </span>
                <span className="sa-table-muted">{fmtDate(u.created_at)}</span>
                <span className="sa-table-action"><Eye size={14} /></span>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />
        </>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="User Profile" width={520}>
        {selectedUser && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Avatar first={selectedUser.first_name} last={selectedUser.last_name} photo={selectedUser.profile_photo} size={56} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#111827', margin: 0 }}>{selectedUser.first_name} {selectedUser.last_name}</p>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 6px' }}>{selectedUser.email}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <RoleBadge role={selectedUser.role} />
                  <span className={`sa-kyc-badge sa-kyc-${(selectedUser.kyc_status || 'not_started').toLowerCase()}`}>
                    KYC: {(selectedUser.kyc_status || 'Not Started').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="sa-drawer-section">
              <h4 className="sa-drawer-section-title">Account Details</h4>
              <InfoRow label="Phone" value={selectedUser.phone_number} />
              <InfoRow label="Region" value={selectedUser.region} />
              <InfoRow label="Account Type" value={selectedUser.account_type} />
              <InfoRow label="Ghana Card" value={selectedUser.ghana_card_number} />
              <InfoRow label="Status" value={selectedUser.status} />
              <InfoRow label="Member Since" value={fmtDate(selectedUser.created_at)} />
            </div>

            <div className="sa-drawer-section">
              <h4 className="sa-drawer-section-title">Actions</h4>
              <div className="sa-action-grid">
                {selectedUser.status !== 'suspended' ? (
                  <button className="sa-action-btn sa-action-danger" onClick={() => updateUser({ status: 'suspended' })} disabled={updating}>
                    <UserMinus size={14} /> Suspend User
                  </button>
                ) : (
                  <button className="sa-action-btn sa-action-success" onClick={() => updateUser({ status: 'active' })} disabled={updating}>
                    <UserCheck size={14} /> Activate User
                  </button>
                )}
                {selectedUser.role === 'citizen' && (
                  <button className="sa-action-btn sa-action-primary" onClick={() => updateUser({ role: 'staff' })} disabled={updating}>
                    <UserPlus size={14} /> Promote to Staff
                  </button>
                )}
                {selectedUser.role === 'staff' && (
                  <button className="sa-action-btn sa-action-warning" onClick={() => updateUser({ role: 'admin' })} disabled={updating}>
                    <Shield size={14} /> Make Admin
                  </button>
                )}
                {['staff', 'admin'].includes(selectedUser.role) && (
                  <button className="sa-action-btn sa-action-muted" onClick={() => updateUser({ role: 'citizen' })} disabled={updating}>
                    <UserMinus size={14} /> Revoke Staff Role
                  </button>
                )}
              </div>
            </div>

            <div className="sa-drawer-section">
              <h4 className="sa-drawer-section-title" style={{ color: '#ef4444' }}>Danger Zone</h4>
              {!confirmDelete ? (
                <button className="sa-action-btn sa-action-danger" style={{ width: '100%' }} onClick={() => setConfirmDelete(true)}>
                  <XCircle size={14} /> Delete Account Permanently
                </button>
              ) : (
                <div className="sa-delete-confirm">
                  <p className="sa-delete-confirm-msg">
                    This will permanently delete <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> and all associated data. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="sa-action-btn sa-action-danger" onClick={handleDeleteUser} disabled={deleting} style={{ flex: 1 }}>
                      {deleting ? 'Deleting…' : 'Yes, Delete Permanently'}
                    </button>
                    <button className="sa-action-btn sa-action-muted" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

function StaffSection() {
  const { showSnackbar } = useSnackbar();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'staff', department: '', designation: '' });
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [productivity, setProductivity] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [aiWorkloadResult, setAiWorkloadResult] = useState(null);
  const [aiWorkloadLoading, setAiWorkloadLoading] = useState(false);
  const [aiWorkloadOpen, setAiWorkloadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers('role=staff&page_size=50');
      const data2 = await adminApi.listUsers('role=admin&page_size=50');
      setStaff([...(data.items || []), ...(data2.items || [])]);
    } catch {
      showSnackbar('Failed to load staff', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const loadProductivity = useCallback(async () => {
    setProdLoading(true);
    try {
      const data = await adminApi.staffProductivity();
      setProductivity(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('Failed to load productivity data', 'error');
    } finally {
      setProdLoading(false);
    }
  }, [showSnackbar]);

  const handleAiOptimize = async () => {
    setAiWorkloadLoading(true);
    setAiWorkloadOpen(true);
    try {
      const appsData = await adminApi.listApplications('status=SUBMITTED&page_size=50');
      const result = await aiAdminApi.workloadSuggestion(appsData.items || [], productivity);
      setAiWorkloadResult(result);
    } catch (e) {
      setAiWorkloadResult({ error: e.message || 'AI optimization failed' });
    } finally {
      setAiWorkloadLoading(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    setDeletingId(id);
    try {
      await adminApi.deleteUser(id);
      showSnackbar('Staff account deleted', 'success');
      setConfirmDeleteId(null);
      load();
    } catch (e) {
      showSnackbar(e.message || 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === 'productivity') loadProductivity(); }, [activeTab, loadProductivity]);

  const handleCreate = async () => {
    setFormErr('');
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setFormErr('All required fields must be filled');
      return;
    }
    if (form.password.length < 8) {
      setFormErr('Password must be at least 8 characters');
      return;
    }
    setCreating(true);
    try {
      await adminApi.createStaff(form);
      showSnackbar('Staff account created. Login credentials sent by email.', 'success');
      setModalOpen(false);
      setForm({ first_name: '', last_name: '', email: '', password: '', role: 'staff', department: '', designation: '' });
      load();
    } catch (e) {
      setFormErr(e.message || 'Failed to create staff account');
    } finally {
      setCreating(false);
    }
  };

  const PERMISSIONS = [
    { icon: ClipboardList, title: 'Review Applications', desc: 'View submitted applications, request additional info, and update statuses from Submitted → Under Review → Approved/Rejected → Ready' },
    { icon: Shield, title: 'Verify Documents', desc: 'Review uploaded supporting documents (birth notifications, Ghana Cards, hospital records) and mark them as verified or rejected' },
    { icon: Printer, title: 'Certificate Management', desc: 'Generate and mark birth/death certificates as printed once applications are approved and payment is confirmed' },
    { icon: Briefcase, title: 'Delivery Management', desc: 'Assign delivery agents, update delivery status and track certificate delivery for applicants who choose home delivery' },
  ];

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Staff Management</h2>
          <p className="sa-section-sub">Manage BDR staff accounts and track productivity</p>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => setModalOpen(true)}>
          <UserPlus size={14} /> Create Staff Account
        </button>
      </div>

      <div className="sa-section-tabs">
        <button className={`sa-section-tab${activeTab === 'accounts' ? ' active' : ''}`} onClick={() => setActiveTab('accounts')}>
          <Users size={13} /> Accounts
        </button>
        <button className={`sa-section-tab${activeTab === 'productivity' ? ' active' : ''}`} onClick={() => setActiveTab('productivity')}>
          <BarChart2 size={13} /> Productivity
        </button>
        <button className={`sa-section-tab${activeTab === 'permissions' ? ' active' : ''}`} onClick={() => setActiveTab('permissions')}>
          <Shield size={13} /> Permissions
        </button>
      </div>

      {activeTab === 'accounts' && (
        <div className="sa-chart-card" style={{ marginTop: 0 }}>
          <div className="sa-chart-header">
            <h3 className="sa-chart-title">Active Staff ({staff.length})</h3>
            <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={load}><RefreshCw size={12} /></button>
          </div>
          {loading ? (
            <div className="sa-table-skeleton">{[...Array(4)].map((_, i) => <div key={i} className="sa-skel sa-skel-row" />)}</div>
          ) : staff.length === 0 ? (
            <EmptyState icon={Users} title="No staff accounts yet" sub='Click "Create Staff Account" to add your first staff member' />
          ) : (
            <div className="sa-table">
              <div className="sa-table-head sa-staff-cols">
                <span>Staff Member</span><span>Email</span><span>Role</span><span>Joined</span><span></span>
              </div>
              {staff.map(s => (
                <div key={s.id} className="sa-table-row sa-staff-cols">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar first={s.first_name} last={s.last_name} size={32} />
                    <span className="sa-table-main">{s.first_name} {s.last_name}</span>
                  </span>
                  <span className="sa-table-muted">{s.email}</span>
                  <span><RoleBadge role={s.role} /></span>
                  <span className="sa-table-muted">{fmtDate(s.created_at)}</span>
                  <span onClick={e => e.stopPropagation()}>
                    {confirmDeleteId === s.id ? (
                      <span style={{ display: 'flex', gap: 4 }}>
                        <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => handleDeleteStaff(s.id)} disabled={deletingId === s.id}>
                          {deletingId === s.id ? '…' : 'Confirm'}
                        </button>
                        <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="sa-btn sa-btn-ghost sa-btn-sm" style={{ color: '#ef4444' }} onClick={() => setConfirmDeleteId(s.id)}>
                        <XCircle size={14} /> Delete
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'productivity' && (
        <div className="sa-chart-card" style={{ marginTop: 0 }}>
          <div className="sa-chart-header">
            <h3 className="sa-chart-title">Staff Productivity</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={handleAiOptimize} disabled={aiWorkloadLoading}>
                <Sparkles size={12} />{aiWorkloadLoading ? 'Analyzing...' : 'AI Optimize Assignments'}
              </button>
              <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={loadProductivity}><RefreshCw size={12} /></button>
            </div>
          </div>
          {aiWorkloadOpen && (
            <div className="sa-ai-workload-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={13} style={{ color: '#FCD116' }} /> AI Workload Suggestions
                </span>
                <button className="sa-icon-btn" onClick={() => setAiWorkloadOpen(false)}><X size={14} /></button>
              </div>
              {aiWorkloadLoading ? (
                <div>
                  <div className="sa-skel" style={{ height: 14, width: '70%', marginBottom: 6 }} />
                  <div className="sa-skel" style={{ height: 14, width: '50%' }} />
                </div>
              ) : aiWorkloadResult ? (
                aiWorkloadResult.error ? (
                  <span style={{ fontSize: 12, color: '#b91c1c' }}>{aiWorkloadResult.error}</span>
                ) : (
                  <div>
                    {aiWorkloadResult.summary && <p style={{ fontSize: 13, margin: '0 0 10px', color: 'var(--sa-text-secondary)', lineHeight: 1.5 }}>{aiWorkloadResult.summary}</p>}
                    {Array.isArray(aiWorkloadResult.suggestions) && aiWorkloadResult.suggestions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {aiWorkloadResult.suggestions.map((s, i) => (
                          <div key={i} style={{ background: 'var(--sa-content-bg)', border: '1px solid var(--sa-border)', borderRadius: 6, padding: '8px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sa-text)' }}>{s.application_number || `Application ${i + 1}`}</span>
                              {s.suggested_staff_name && (
                                <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                  {s.suggested_staff_name}
                                </span>
                              )}
                            </div>
                            {s.reason && <p style={{ margin: 0, fontSize: 12, color: 'var(--sa-text-secondary)', lineHeight: 1.5 }}>{s.reason}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : null}
            </div>
          )}
          {prodLoading ? (
            <div className="sa-table-skeleton">{[...Array(4)].map((_, i) => <div key={i} className="sa-skel sa-skel-row" />)}</div>
          ) : productivity.length === 0 ? (
            <EmptyState icon={BarChart2} title="No productivity data" sub="Assign applications to staff to track their progress" />
          ) : (
            <div className="sa-prod-table">
              <div className="sa-prod-head">
                <span>Staff Member</span>
                <span>Assigned</span>
                <span>In Progress</span>
                <span>Completed</span>
                <span>Rate</span>
                <span>Progress</span>
              </div>
              {productivity.map(p => (
                <div key={p.id} className="sa-prod-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar first={p.name.split(' ')[0]} last={p.name.split(' ')[1]} size={28} />
                    <div>
                      <div className="sa-table-main" style={{ fontSize: 13 }}>{p.name}</div>
                      <div className="sa-table-muted" style={{ fontSize: 11 }}>{p.role}</div>
                    </div>
                  </span>
                  <span className="sa-prod-num">{p.assigned_total}</span>
                  <span className="sa-prod-num sa-prod-inprog">{p.in_progress}</span>
                  <span className="sa-prod-num sa-prod-done">{p.completed}</span>
                  <span className="sa-prod-rate">{p.completion_rate}%</span>
                  <span className="sa-prod-bar-wrap">
                    <div className="sa-prod-bar">
                      <div className="sa-prod-bar-fill" style={{ width: `${p.completion_rate}%` }} />
                    </div>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'permissions' && (
        <>
          <div className="sa-info-banner" style={{ marginTop: 0 }}>
            <Shield size={16} />
            <div>
              <strong>About Staff Accounts</strong>
              <p>Staff accounts are created by administrators and are for BDR employees. Staff can process applications and manage certificates but cannot access user management, system settings, or financial reports. Admins have full operational access.</p>
            </div>
          </div>
          <div className="sa-permissions-grid">
            {PERMISSIONS.map(p => (
              <div key={p.title} className="sa-perm-card">
                <div className="sa-perm-icon"><p.icon size={18} /></div>
                <div>
                  <p className="sa-perm-title">{p.title}</p>
                  <p className="sa-perm-desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Staff Account" width={500}>
        {formErr && <div className="sa-form-error"><AlertCircle size={14} />{formErr}</div>}
        <div className="sa-form-row">
          <div className="sa-form-group">
            <label className="sa-label">First Name *</label>
            <input className="sa-input" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
          </div>
          <div className="sa-form-group">
            <label className="sa-label">Last Name *</label>
            <input className="sa-input" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
          </div>
        </div>
        <div className="sa-form-group">
          <label className="sa-label">Email Address *</label>
          <input className="sa-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="staff@bdr.gov.gh" />
        </div>
        <div className="sa-form-group">
          <label className="sa-label">Temporary Password *</label>
          <input className="sa-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" />
        </div>
        <div className="sa-form-row">
          <div className="sa-form-group">
            <label className="sa-label">Role *</label>
            <select className="sa-select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sa-form-group">
            <label className="sa-label">Department</label>
            <input className="sa-input" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Registrations" />
          </div>
        </div>
        <div className="sa-form-group">
          <label className="sa-label">Designation / Title</label>
          <input className="sa-input" value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} placeholder="e.g. Registration Officer" />
        </div>
        <div className="sa-modal-footer">
          <button className="sa-btn sa-btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="sa-btn sa-btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? <><span className="sa-spinner" /> Creating…</> : <><UserPlus size={14} /> Create Account</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function KYCSection({ onBadgeClear }) {
  const { showSnackbar } = useSnackbar();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [msgModal, setMsgModal] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers('kyc_status=pending&page_size=50');
      setRequests(data.items || []);
      onBadgeClear?.('kyc');
    } catch {
      showSnackbar('Failed to load KYC requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, onBadgeClear]);

  useEffect(() => { load(); }, [load]);

  const openKyc = async (user) => {
    try {
      const full = await adminApi.getUser(user.id);
      setSelectedKyc(full);
    } catch {
      setSelectedKyc(user);
    }
    setDrawerOpen(true);
  };

  const approve = async () => {
    try {
      await adminApi.updateUser(selectedKyc.id, { kyc_status: 'verified' });
      showSnackbar('KYC verified successfully', 'success');
      setDrawerOpen(false);
      load();
    } catch (e) {
      showSnackbar(e.message || 'Failed to verify KYC', 'error');
    }
  };

  const reject = async () => {
    try {
      await adminApi.updateUser(selectedKyc.id, { kyc_status: 'rejected' });
      showSnackbar('KYC rejected', 'success');
      setDrawerOpen(false);
      load();
    } catch (e) {
      showSnackbar(e.message || 'Failed to reject KYC', 'error');
    }
  };

  const requestDocs = async () => {
    setSending(true);
    try {
      await kycApi.requestDocuments(selectedKyc.id, customMsg || 'Please upload your Ghana Card (front and back) and a recent selfie for identity verification.');
      showSnackbar('Document request sent to user', 'success');
      setMsgModal(false);
    } catch (e) {
      showSnackbar(e.message || 'Failed to send request', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">KYC Review</h2>
          <p className="sa-section-sub">{requests.length} pending verification{requests.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="sa-btn sa-btn-outline" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>

      {loading ? (
        <div className="sa-table-skeleton">{[...Array(5)].map((_, i) => <div key={i} className="sa-skel sa-skel-row" />)}</div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Shield} title="No pending KYC reviews" sub="All identity verifications are up to date" />
      ) : (
        <div className="sa-table">
          <div className="sa-table-head sa-kyc-cols">
            <span>User</span><span>Email</span><span>KYC Status</span><span>Joined</span><span></span>
          </div>
          {requests.map(u => (
            <div key={u.id} className="sa-table-row sa-kyc-cols" onClick={() => openKyc(u)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar first={u.first_name} last={u.last_name} size={32} />
                <span className="sa-table-main">{u.first_name} {u.last_name}</span>
              </span>
              <span className="sa-table-muted">{u.email}</span>
              <span>
                <span className={`sa-kyc-badge sa-kyc-${(u.kyc_status || 'not_started').toLowerCase()}`}>
                  {(u.kyc_status || 'Not Started').replace(/_/g, ' ')}
                </span>
              </span>
              <span className="sa-table-muted">{fmtDate(u.created_at)}</span>
              <span className="sa-table-action"><Eye size={14} /></span>
            </div>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="KYC Review" width={520}>
        {selectedKyc && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Avatar first={selectedKyc.first_name} last={selectedKyc.last_name} size={52} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{selectedKyc.first_name} {selectedKyc.last_name}</p>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0' }}>{selectedKyc.email}</p>
              </div>
            </div>
            <div className="sa-drawer-section">
              <h4 className="sa-drawer-section-title">Identity Documents</h4>
              {selectedKyc.kyc_document_front ? (
                <div className="sa-doc-grid">
                  <div className="sa-doc-item">
                    <p className="sa-doc-label">Front</p>
                    <img src={selectedKyc.kyc_document_front} alt="Ghana Card Front" className="sa-doc-img" />
                  </div>
                  {selectedKyc.kyc_document_back && (
                    <div className="sa-doc-item">
                      <p className="sa-doc-label">Back</p>
                      <img src={selectedKyc.kyc_document_back} alt="Ghana Card Back" className="sa-doc-img" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="sa-info-banner">
                  <AlertCircle size={16} />
                  <span>No documents uploaded yet. Request documents from the user.</span>
                </div>
              )}
            </div>
            <div className="sa-action-grid">
              {selectedKyc.kyc_document_front && (
                <>
                  <button className="sa-action-btn sa-action-success" onClick={approve}><CheckCircle size={14} /> Approve KYC</button>
                  <button className="sa-action-btn sa-action-danger" onClick={reject}><XCircle size={14} /> Reject KYC</button>
                </>
              )}
              <button className="sa-action-btn sa-action-primary" onClick={() => setMsgModal(true)}><Mail size={14} /> Request Documents</button>
            </div>
          </>
        )}
      </Drawer>

      <Modal open={msgModal} onClose={() => setMsgModal(false)} title="Request KYC Documents" width={480}>
        <div className="sa-form-group">
          <label className="sa-label">Message to User</label>
          <textarea className="sa-textarea" rows={4} value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            placeholder="Explain what documents are required and why…" />
        </div>
        <div className="sa-modal-footer">
          <button className="sa-btn sa-btn-outline" onClick={() => setMsgModal(false)}>Cancel</button>
          <button className="sa-btn sa-btn-primary" onClick={requestDocs} disabled={sending}>
            {sending ? <><span className="sa-spinner" />Sending…</> : <><Mail size={14} /> Send Request</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function AnalyticsSection() {
  const { showSnackbar } = useSnackbar();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [monthly, setMonthly] = useState(null);
  const [statusDist, setStatusDist] = useState([]);
  const [regional, setRegional] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [m, sd, reg] = await Promise.all([
          adminApi.monthly(year, month),
          adminApi.statusDistribution(),
          adminApi.regional(),
        ]);
        setMonthly(m);
        setStatusDist(sd || []);
        setRegional(reg || []);
      } catch {
        showSnackbar('Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [year, month, showSnackbar]);

  const dailyData = (monthly?.daily_applications || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }),
    Applications: d.count,
  }));

  const revenueData = (monthly?.daily_revenue || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }),
    Revenue: parseFloat(d.amount || 0),
  }));

  const regionData = regional.slice(0, 10).map(r => ({
    name: r.region?.replace(' Region', '') || 'Unknown',
    Total: r.total,
    Approved: r.approved,
  }));

  const pieData = statusDist.map(s => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#94a3b8',
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Analytics</h2>
          <p className="sa-section-sub">Performance metrics and data insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="sa-select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {FULL_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="sa-select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {monthly?.summary && (
        <div className="sa-stats-grid">
          {[
            { label: 'Total Applications', value: (monthly.summary.total_applications || 0).toLocaleString(), icon: FileText, color: 'blue' },
            { label: 'Approved', value: (monthly.summary.approved || 0).toLocaleString(), icon: CheckCircle, color: 'green' },
            { label: 'Rejected', value: (monthly.summary.rejected || 0).toLocaleString(), icon: XCircle, color: 'red' },
            { label: 'Revenue (GHS)', value: fmtCurrency(monthly.summary.revenue_ghs), icon: TrendingUp, color: 'gold' },
          ].map(c => <StatCard key={c.label} {...c} loading={loading} />)}
        </div>
      )}

      <div className="sa-charts-row">
        <div className="sa-chart-card">
          <div className="sa-chart-header"><h3 className="sa-chart-title">Daily Applications — {FULL_MONTHS[month - 1]} {year}</h3></div>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Bar dataKey="Applications" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart2} title="No applications this period" />}
        </div>

        <div className="sa-chart-card">
          <div className="sa-chart-header"><h3 className="sa-chart-title">Status Distribution (All Time)</h3></div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [val.toLocaleString(), name]} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart2} title="No data" />}
        </div>
      </div>

      {revenueData.length > 0 && (
        <div className="sa-chart-card" style={{ marginTop: 16 }}>
          <div className="sa-chart-header"><h3 className="sa-chart-title">Daily Revenue — {FULL_MONTHS[month - 1]} {year}</h3></div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FCD116" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FCD116" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Area type="monotone" dataKey="Revenue" stroke="#FCD116" strokeWidth={2} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {regionData.length > 0 && (
        <div className="sa-chart-card" style={{ marginTop: 16 }}>
          <div className="sa-chart-header"><h3 className="sa-chart-title">Applications by Region</h3></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={regionData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#374151' }} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="Total" fill="#006B3C" radius={[0, 3, 3, 0]} />
              <Bar dataKey="Approved" fill="#22c55e" radius={[0, 3, 3, 0]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function RevenueReportSection() {
  const { error: showError } = useSnackbar();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const load = useCallback(async (y = year) => {
    setLoading(true);
    try {
      const res = await adminApi.yearlyRevenue(y);
      setData(res);
    } catch (e) {
      showError(e.message || 'Failed to load revenue report');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(year); }, [year]);

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=650');
    const rows = (data?.months || []).map(m => `
      <tr>
        <td>${m.month_name}</td>
        <td class="num">GH₵ ${m.payment_revenue.toFixed(2)}</td>
        <td class="num">GH₵ ${m.statistics_revenue.toFixed(2)}</td>
        <td class="num"><strong>GH₵ ${m.total.toFixed(2)}</strong></td>
        <td class="num">${m.transactions}</td>
      </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Revenue Report ${year} — Births and Deaths Registry Ghana</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111827;padding:40px}
      .header{background:#006B3C;color:#fff;padding:24px 32px;border-radius:10px 10px 0 0;margin-bottom:0}
      .gold-bar{height:4px;background:#FCD116;margin-bottom:24px}
      h1{font-size:20px;font-weight:700;color:#FCD116;margin-bottom:4px}
      .sub{font-size:12px;color:rgba(255,255,255,.7);letter-spacing:.05em;text-transform:uppercase}
      .meta{font-size:12px;color:#6b7280;margin-bottom:24px;display:flex;gap:24px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      thead tr{background:#f3f4f6}
      th{padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;border-bottom:2px solid #e5e7eb}
      td{padding:10px 14px;border-bottom:1px solid #e5e7eb}
      .num{text-align:right}
      .total-row{background:#f0fdf4;font-weight:700;font-size:14px}
      .total-row td{border-top:2px solid #006B3C;padding:12px 14px}
      .alltime{margin-top:20px;background:#006B3C;color:#fff;padding:16px 20px;border-radius:8px;display:flex;justify-content:space-between;align-items:center}
      .alltime-label{font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.05em}
      .alltime-val{font-size:22px;font-weight:700;color:#FCD116}
      .confidential{margin-top:28px;background:#fef9c3;border:1px solid #fde047;padding:12px 16px;border-radius:6px;font-size:11px;color:#78350f;line-height:1.6}
      .footer{margin-top:32px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:14px}
      @media print{body{padding:20px}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}.gold-bar{-webkit-print-color-adjust:exact}.alltime{-webkit-print-color-adjust:exact}}
    </style></head><body>
    <div class="header">
      <h1>Revenue Report — ${year}</h1>
      <div class="sub">Births and Deaths Registry Ghana &mdash; Ministry of Interior</div>
    </div>
    <div class="gold-bar"></div>
    <div class="meta">
      <span>Period: January ${year} &mdash; December ${year}</span>
      <span>Generated: ${new Date().toLocaleDateString('en-GH', { dateStyle: 'long' })}</span>
      <span>Year Total: GH₵ ${(data?.year_total || 0).toFixed(2)}</span>
    </div>
    <table>
      <thead><tr>
        <th>Month</th><th class="num">Application Fees</th><th class="num">Data Request Fees</th>
        <th class="num">Month Total</th><th class="num">Transactions</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row">
        <td>TOTAL — ${year}</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">GH₵ ${(data?.year_total || 0).toFixed(2)}</td>
        <td class="num">—</td>
      </tr></tfoot>
    </table>
    <div class="alltime">
      <div><div class="alltime-label">All-Time Cumulative Revenue</div><div class="alltime-val">GH₵ ${(data?.all_time_total || 0).toFixed(2)}</div></div>
      <div style="font-size:11px;opacity:.7;text-align:right">Includes all application fees<br>and paid data request fees</div>
    </div>
    <div class="confidential">
      <strong>CONFIDENTIAL — OFFICIAL USE ONLY:</strong> This revenue report is generated from the Births and Deaths Registry
      management system and is intended solely for authorised internal use. Unauthorised disclosure is prohibited.
    </div>
    <div class="footer">
      Ghana Births and Deaths Registry &bull; Ministry of Interior, Republic of Ghana<br>
      P.O. Box M239, Ministries, Accra &bull; This document was auto-generated on ${new Date().toISOString()}
    </div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Revenue Report</h2>
          <p className="sa-section-sub">Monthly and cumulative revenue from application fees and data request fees</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="sa-select" value={year} onChange={e => { const y = parseInt(e.target.value); setYear(y); load(y); }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="sa-btn sa-btn-ghost" onClick={() => load(year)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'sa-spin' : ''} />
          </button>
          <button className="sa-btn sa-btn-primary" onClick={handlePrint} disabled={!data || loading}>
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="rev-summary-row">
            <div className="rev-total-card">
              <span className="rev-total-label">Year Total — {year}</span>
              <span className="rev-total-num">{fmtCurrency(data.year_total)}</span>
            </div>
            <div className="rev-total-card rev-alltime">
              <span className="rev-total-label">All-Time Cumulative</span>
              <span className="rev-total-num">{fmtCurrency(data.all_time_total)}</span>
            </div>
          </div>

          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Application Fees</th>
                  <th style={{ textAlign: 'right' }}>Data Request Fees</th>
                  <th style={{ textAlign: 'right' }}>Month Total</th>
                  <th style={{ textAlign: 'right' }}>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--sa-text-muted)' }}>Loading...</td></tr>
                ) : data.months.map(m => (
                  <tr key={m.month} className={m.total > 0 ? 'rev-row-active' : ''}>
                    <td style={{ fontWeight: 600 }}>{m.month_name}</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-text-muted)', fontSize: '.88rem' }}>{fmtCurrency(m.payment_revenue)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-text-muted)', fontSize: '.88rem' }}>{fmtCurrency(m.statistics_revenue)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: m.total > 0 ? 'var(--sa-primary)' : 'var(--sa-text-muted)' }}>{fmtCurrency(m.total)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-text-muted)', fontSize: '.88rem' }}>{m.transactions}</td>
                  </tr>
                ))}
                {!loading && (
                  <tr style={{ background: 'var(--sa-primary-light)', fontWeight: 700 }}>
                    <td style={{ color: 'var(--sa-primary)' }}>TOTAL</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-text-muted)' }}>—</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-text-muted)' }}>—</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-primary)', fontSize: '1rem' }}>{fmtCurrency(data.year_total)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--sa-text-muted)' }}>—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rev-chart-row">
            <div className="sa-chart-card" style={{ flex: 1 }}>
              <div className="sa-chart-header"><h3 className="sa-chart-title">Monthly Revenue — {year}</h3></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month_name" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.slice(0, 3)} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v, n) => [fmtCurrency(v), n === 'payment_revenue' ? 'Application Fees' : n === 'statistics_revenue' ? 'Data Request Fees' : 'Total']}
                    contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Bar dataKey="payment_revenue" name="payment_revenue" fill="#006B3C" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="statistics_revenue" name="statistics_revenue" fill="#FCD116" radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: 'var(--sa-text-muted)', marginTop: 6 }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#006B3C', borderRadius: 2, marginRight: 4 }} />Application Fees</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#FCD116', borderRadius: 2, marginRight: 4 }} />Data Request Fees</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AuditSection() {
  const { showSnackbar } = useSnackbar();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, page_size: 20 });
      if (actionFilter) params.set('action', actionFilter);
      const data = await adminApi.auditLogs(params.toString());
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(p);
    } catch {
      showSnackbar('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, showSnackbar]);

  useEffect(() => { load(1); }, [load]);

  const actionColors = {
    LOGIN: '#3b82f6', LOGOUT: '#6b7280', STATUS_CHANGED: '#f59e0b',
    CREATE: '#22c55e', UPDATE: '#8b5cf6', DELETE: '#ef4444',
    LOGIN_FAILED: '#ef4444', DOCUMENT_UPLOADED: '#06b6d4',
    DOCUMENT_VERIFIED: '#22c55e', DOCUMENT_REJECTED: '#ef4444',
    APPLICATION_APPROVED: '#22c55e', APPLICATION_REJECTED: '#ef4444',
    APPLICATION_SUBMITTED: '#3b82f6',
  };

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Audit Logs</h2>
          <p className="sa-section-sub">{total.toLocaleString()} recorded events</p>
        </div>
        <button className="sa-btn sa-btn-outline" onClick={() => load(1)}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="sa-filters">
        <select className="sa-select" value={actionFilter} onChange={e => { setActionFilter(e.target.value); }}>
          <option value="">All Actions</option>
          {['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'STATUS_CHANGED', 'CREATE', 'UPDATE', 'DELETE',
            'DOCUMENT_UPLOADED', 'DOCUMENT_VERIFIED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED'].map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
        </select>
        <button className="sa-btn sa-btn-primary" onClick={() => load(1)}><Filter size={14} /> Apply</button>
      </div>

      {loading ? (
        <div className="sa-table-skeleton">{[...Array(8)].map((_, i) => <div key={i} className="sa-skel sa-skel-row" />)}</div>
      ) : logs.length === 0 ? (
        <EmptyState icon={Database} title="No audit logs found" sub="System activity will appear here" />
      ) : (
        <>
          <div className="sa-table">
            <div className="sa-table-head sa-audit-cols">
              <span>Action</span><span>Resource</span><span>User</span><span>IP</span><span>Time</span>
            </div>
            {logs.map((log, i) => {
              const actionKey = (log.action?.value || log.action || '').toUpperCase().replace(/ /g, '_');
              const color = actionColors[actionKey] || '#64748b';
              return (
                <div key={i} className="sa-table-row sa-audit-cols">
                  <span>
                    <span className="sa-audit-action" style={{ color, background: `${color}18` }}>
                      {actionKey.replace(/_/g, ' ')}
                    </span>
                  </span>
                  <span className="sa-table-muted">{log.resource_type || '—'} {log.resource_id ? `#${log.resource_id}` : ''}</span>
                  <span className="sa-table-muted">{log.user_id ? `User #${log.user_id}` : 'System'}</span>
                  <span className="sa-table-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.ip_address || '—'}</span>
                  <span className="sa-table-muted">{fmtDateTime(log.created_at)}</span>
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />
        </>
      )}
    </div>
  );
}

function ReportsSection() {
  const { showSnackbar } = useSnackbar();
  const [downloading, setDownloading] = useState(null);
  const [days, setDays] = useState(30);

  const downloadReport = async (type, extraParams = '') => {
    setDownloading(type);
    try {
      const token = localStorage.getItem('access_token');
      const url = `${API_BASE_URL}/reports/${type}?days=${days}${extraParams}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Report generation failed (${res.status})`);
      const blob = await res.blob();
      const label = type.replace(/_/g, '-').toUpperCase();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `BDR_${label}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      showSnackbar('Report downloaded successfully', 'success');
    } catch (e) {
      showSnackbar(e.message || 'Failed to generate report', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const REPORTS = [
    {
      id: 'overview',
      title: 'System Overview Report',
      desc: 'Comprehensive summary of all applications, citizens, revenue, status breakdown, and recent registrations. Includes official BDR letterhead and logo watermark. Suitable for management and board review.',
      icon: FileText,
      badge: 'Management',
      badgeColor: '#006B3C',
    },
    {
      id: 'applications',
      title: 'Applications Report',
      desc: 'Detailed breakdown of applications submitted during the selected period with status distribution, approval rates, regional data, and processing times. For operational review.',
      icon: ClipboardList,
      badge: 'Operational',
      badgeColor: '#3b82f6',
    },
    {
      id: 'revenue',
      title: 'Revenue & Payments Report',
      desc: 'Financial summary showing total payments collected, daily revenue trends, service plan distribution, and outstanding fees. Ideal for finance and accounting purposes.',
      icon: TrendingUp,
      badge: 'Financial',
      badgeColor: '#f59e0b',
    },
  ];

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Reports</h2>
          <p className="sa-section-sub">Generate official PDF reports with BDR letterhead and watermark</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="sa-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Period:</label>
          <select className="sa-select" value={days} onChange={e => setDays(parseInt(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
          </select>
        </div>
      </div>

      <div className="sa-info-banner" style={{ marginBottom: 20 }}>
        <Shield size={16} />
        <span>All reports are generated in PDF format with the official Ghana BDR letterhead and confidential watermark. Reports contain sensitive government data and must be handled securely.</span>
      </div>

      <div className="sa-reports-grid">
        {REPORTS.map(r => {
          const Icon = r.icon;
          const isDownloading = downloading === r.id;
          return (
            <div key={r.id} className="sa-report-card">
              <div className="sa-report-card-top">
                <div className="sa-report-icon"><Icon size={24} /></div>
                <span className="sa-report-badge" style={{ background: `${r.badgeColor}18`, color: r.badgeColor, border: `1px solid ${r.badgeColor}30` }}>
                  {r.badge}
                </span>
              </div>
              <h3 className="sa-report-title">{r.title}</h3>
              <p className="sa-report-desc">{r.desc}</p>
              <div className="sa-report-footer">
                <div className="sa-report-meta">
                  <span className="sa-meta-item"><Globe size={11} />PDF</span>
                  <span className="sa-meta-item"><Calendar size={11} />{days === 365 ? 'Last 12 months' : `Last ${days} days`}</span>
                </div>
                <button className="sa-btn sa-btn-primary" onClick={() => downloadReport(r.id)} disabled={isDownloading}>
                  {isDownloading ? <><span className="sa-spinner" />Generating…</> : <><Download size={14} />Download</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SystemSection() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const results = [];
    const start = Date.now();

    const check = async (name, fn) => {
      const t = Date.now();
      try {
        await fn();
        results.push({ name, status: 'ok', ms: Date.now() - t });
      } catch (e) {
        results.push({ name, status: 'error', ms: Date.now() - t, detail: e.message });
      }
    };

    await check('Database / API', async () => {
      const res = await fetch(`${API_BASE_URL}/misc/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });

    await check('Auth Endpoint', async () => {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!res.ok && res.status !== 401) throw new Error(`HTTP ${res.status}`);
    });

    await check('Static Assets', async () => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = '/vite.svg';
        setTimeout(rej, 3000);
      });
    });

    const totalMs = Date.now() - start;
    results.push({ name: 'Round-trip latency', status: totalMs < 1000 ? 'ok' : totalMs < 3000 ? 'warn' : 'error', ms: totalMs });

    setChecks(results);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const overall = checks.every(c => c.status === 'ok') ? 'ok'
    : checks.some(c => c.status === 'error') ? 'error' : 'warn';

  const ENV_KEYS = [
    { key: 'VITE_API_URL', val: import.meta.env.VITE_API_URL },
    { key: 'VITE_PAYSTACK_PUBLIC_KEY', val: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ? '***set***' : undefined },
    { key: 'VITE_NIA_API_URL', val: import.meta.env.VITE_NIA_API_URL },
    { key: 'VITE_FACE_API_ENABLED', val: import.meta.env.VITE_FACE_API_ENABLED },
  ];

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">System Health</h2>
          <p className="sa-section-sub">
            {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString('en-GH')}` : 'Running checks…'}
          </p>
        </div>
        <button className="sa-btn sa-btn-outline" onClick={runChecks} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'sa-spin' : ''} /> Recheck
        </button>
      </div>

      <div className={`sa-health-overall sa-health-${overall}`}>
        <div className="sa-health-dot" />
        <span>{overall === 'ok' ? 'All systems operational' : overall === 'warn' ? 'Degraded performance detected' : 'System issues detected'}</span>
      </div>

      <div className="sa-health-grid">
        {loading ? [...Array(4)].map((_, i) => <div key={i} className="sa-skel" style={{ height: 72, borderRadius: 8 }} />) :
          checks.map(c => (
            <div key={c.name} className={`sa-health-card sa-health-card-${c.status}`}>
              <div className={`sa-health-status-dot sa-dot-${c.status}`} />
              <div className="sa-health-card-body">
                <p className="sa-health-card-name">{c.name}</p>
                <p className="sa-health-card-detail">
                  {c.status === 'ok' ? `OK — ${c.ms}ms` : c.status === 'warn' ? `Slow — ${c.ms}ms` : `Failed${c.detail ? `: ${c.detail}` : ''}`}
                </p>
              </div>
              {c.status === 'ok' ? <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                : c.status === 'warn' ? <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  : <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />}
            </div>
          ))
        }
      </div>

      <div className="sa-chart-card" style={{ marginTop: 20 }}>
        <div className="sa-chart-header"><h3 className="sa-chart-title">Environment Configuration</h3></div>
        <div className="sa-table">
          <div className="sa-table-head" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <span>Variable</span><span>Value</span>
          </div>
          {ENV_KEYS.map(e => (
            <div key={e.key} className="sa-table-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151' }}>{e.key}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {e.val
                  ? <span style={{ color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>{e.val}</span>
                  : <span style={{ color: '#991b1b', background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>NOT SET</span>
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const APPROVAL_COLORS = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
  fulfilled: '#006B3C',
};
const PAYMENT_COLORS = {
  free: '#94a3b8',
  pending: '#f97316',
  pending_manual: '#f59e0b',
  paid: '#22c55e',
};

function DataRequestsSection() {
  const { error: showError, success } = useSnackbar();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, fulfilled: 0, rejected: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ org_type: '', payment_status: '', approval_status: '' });
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const PER_PAGE = 15;

  const load = useCallback(async (p = page, f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, per_page: PER_PAGE });
      if (f.org_type) params.set('org_type', f.org_type);
      if (f.payment_status) params.set('payment_status', f.payment_status);
      if (f.approval_status) params.set('approval_status', f.approval_status);
      const data = await statisticsApi.adminList(params.toString());
      setItems(data.items || []);
      setTotal(data.total || 0);

      if (!f.org_type && !f.payment_status && !f.approval_status) {
        const all = data.items || [];
        const c = { pending: 0, approved: 0, fulfilled: 0, rejected: 0 };
        all.forEach(r => { if (c[r.approval_status] !== undefined) c[r.approval_status]++; });
        setCounts(c);
      }
    } catch (e) {
      showError(e.message || 'Failed to load data requests');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(1, filters); }, []);

  const applyFilter = (key, val) => {
    const f = { ...filters, [key]: val };
    setFilters(f);
    setPage(1);
    load(1, f);
  };

  const openDetail = async (ref) => {
    setDetailLoading(true);
    try {
      const data = await statisticsApi.adminGet(ref);
      setSelected(data);
      setNoteInput('');
    } catch (e) {
      showError(e.message || 'Failed to load request detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (approval_status) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await statisticsApi.adminUpdateStatus(selected.reference, { approval_status, note: noteInput });
      success(`Request ${approval_status}`);
      setSelected(s => ({ ...s, approval_status }));
      load(page, filters);
    } catch (e) {
      showError(e.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const markPaid = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await statisticsApi.adminMarkPaid(selected.reference);
      success('Marked as paid');
      setSelected(s => ({ ...s, payment_status: 'paid' }));
      load(page, filters);
    } catch (e) {
      showError(e.message || 'Failed to mark paid');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const fmtFee = (v) => v === 0 ? 'Free' : `GH\u20b5 ${parseFloat(v).toFixed(2)}`;

  const ORG_TYPE_COLOR = {
    government: { bg: '#dcfce7', color: '#15803d' },
    academic: { bg: '#e0f2fe', color: '#0369a1' },
    ngo: { bg: '#fef9c3', color: '#854d0e' },
    commercial: { bg: '#fce7f3', color: '#9d174d' },
  };

  const STAT_ICONS = {
    total: Briefcase,
    pending: AlertCircle,
    approved: CheckCircle,
    fulfilled: Download,
  };

  return (
    <div className="sa-section">
      {/* Header */}
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">Data Requests</h2>
          <p className="sa-section-sub">Manage academic, research, and commercial data requests</p>
        </div>
        <button className="sa-btn sa-btn-outline" onClick={() => load(page, filters)} disabled={loading} title="Refresh data">
          <RefreshCw size={15} className={loading ? 'sa-spin' : ''} />
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { key: 'total', label: 'Total Requests', color: '#6b7280', value: total, Icon: STAT_ICONS.total },
          { key: 'pending', label: 'Pending Review', color: '#f59e0b', value: counts.pending, Icon: STAT_ICONS.pending },
          { key: 'approved', label: 'Approved', color: '#22c55e', value: counts.approved, Icon: STAT_ICONS.approved },
          { key: 'fulfilled', label: 'Fulfilled', color: '#006B3C', value: counts.fulfilled, Icon: STAT_ICONS.fulfilled },
        ].map(stat => {
          const Icon = stat.Icon;
          return (
            <div key={stat.key} className="sa-chart-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--sa-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 8 }}>
                    {stat.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--sa-text)' }}>
                    {stat.value}
                  </p>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={stat.color} />
                </div>
              </div>
              <div style={{ height: 2, background: `${stat.color}30`, borderRadius: 1, marginTop: 12 }} />
            </div>
          );
        })}
      </div>

      {/* Filters Section */}
      <div className="sa-chart-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="sa-label" style={{ display: 'block', marginBottom: 8 }}>Organisation Type</label>
            <select className="sa-filter-select" value={filters.org_type} onChange={e => applyFilter('org_type', e.target.value)} style={{ width: '100%' }}>
              <option value="">All Organisations</option>
              <option value="government">Government</option>
              <option value="academic">Academic</option>
              <option value="ngo">Non-Governmental (NGO)</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="sa-label" style={{ display: 'block', marginBottom: 8 }}>Payment Status</label>
            <select className="sa-filter-select" value={filters.payment_status} onChange={e => applyFilter('payment_status', e.target.value)} style={{ width: '100%' }}>
              <option value="">All Payment Statuses</option>
              <option value="free">Free Request</option>
              <option value="pending">Pending Payment</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="sa-label" style={{ display: 'block', marginBottom: 8 }}>Approval Status</label>
            <select className="sa-filter-select" value={filters.approval_status} onChange={e => applyFilter('approval_status', e.target.value)} style={{ width: '100%' }}>
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button className="sa-btn sa-btn-outline" style={{ whiteSpace: 'nowrap' }} onClick={() => { setFilters({ org_type: '', payment_status: '', approval_status: '' }); setPage(1); load(1, { org_type: '', payment_status: '', approval_status: '' }); }}>
            <X size={14} /> Clear
          </button>
        </div>
        {(filters.org_type || filters.payment_status || filters.approval_status) && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--sa-border)', fontSize: 12, color: 'var(--sa-text-muted)' }}>
            Showing {items.length} of {total} requests with active filters
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="sa-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="dr-grid-table">
          {/* Header */}
          <div className="dr-grid-head">
            <div className="dr-gc dr-gc-ref">Reference</div>
            <div className="dr-gc dr-gc-org">Organisation</div>
            <div className="dr-gc dr-gc-contact">Contact</div>
            <div className="dr-gc dr-gc-period">Period</div>
            <div className="dr-gc dr-gc-fee">Fee</div>
            <div className="dr-gc dr-gc-pay">Payment</div>
            <div className="dr-gc dr-gc-status">Status</div>
            <div className="dr-gc dr-gc-date">Submitted</div>
            <div className="dr-gc dr-gc-action" />
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--sa-text-muted)', fontSize: 13 }}>
              Loading data requests...
            </div>
          )}

          {/* Empty */}
          {!loading && items.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <BookOpen size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--sa-text-muted)', opacity: 0.4 }} />
              <p style={{ margin: '0 0 4px', color: 'var(--sa-text-muted)', fontWeight: 600, fontSize: 14 }}>No data requests found</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--sa-text-muted)' }}>Try adjusting your filters</p>
            </div>
          )}

          {/* Rows */}
          {items.map(r => {
            const otc = ORG_TYPE_COLOR[r.org_type] || { bg: '#f1f5f9', color: '#64748b' };
            const payColor = PAYMENT_COLORS[r.payment_status] || '#94a3b8';
            const appColor = APPROVAL_COLORS[r.approval_status] || '#94a3b8';
            return (
              <div key={r.id} className="dr-grid-row">
                <div className="dr-gc dr-gc-ref">
                  <span className="dr-ref-badge">{r.reference}</span>
                </div>
                <div className="dr-gc dr-gc-org">
                  <span className="dr-org-name" title={r.org_name}>{r.org_name}</span>
                  <span className="dr-org-type" style={{ background: otc.bg, color: otc.color }}>{r.org_type}</span>
                </div>
                <div className="dr-gc dr-gc-contact dr-cell-text">{r.contact_person}</div>
                <div className="dr-gc dr-gc-period dr-cell-muted">{r.period_from} &ndash; {r.period_to}</div>
                <div className="dr-gc dr-gc-fee dr-cell-bold">{fmtFee(r.fee_amount)}</div>
                <div className="dr-gc dr-gc-pay">
                  <span className="dr-pill" style={{ background: payColor + '18', color: payColor }}>{r.payment_status.replace(/_/g, ' ')}</span>
                </div>
                <div className="dr-gc dr-gc-status">
                  <span className="dr-pill" style={{ background: appColor + '18', color: appColor }}>{r.approval_status}</span>
                </div>
                <div className="dr-gc dr-gc-date dr-cell-muted">{fmtDate(r.created_at)}</div>
                <div className="dr-gc dr-gc-action">
                  <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => openDetail(r.reference)} disabled={detailLoading} title="View details">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--sa-border)', background: 'var(--sa-card-bg)' }}>
            <button className="sa-page-btn" disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1, filters); }} title="Previous page">
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--sa-text-muted)', minWidth: 120, textAlign: 'center' }}>
              Page <strong style={{ color: 'var(--sa-text)' }}>{page}</strong> of <strong style={{ color: 'var(--sa-text)' }}>{totalPages}</strong>
            </span>
            <button className="sa-page-btn" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); load(page + 1, filters); }} title="Next page">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="sa-modal-overlay" onClick={() => setSelected(null)}>
          <div className="sa-modal dr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            {/* Modal Header with Status */}
            <div className="sa-modal-header" style={{ background: 'var(--sa-card-bg)', borderBottom: '1px solid var(--sa-border)', paddingBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--sa-text)', marginBottom: 8 }}>Data Request</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="sa-mono" style={{ fontSize: 11, color: 'var(--sa-text-muted)', background: 'var(--sa-primary-light)', padding: '4px 8px', borderRadius: 4, fontWeight: 600 }}>
                    {selected.reference}
                  </span>
                  <span className="sa-status-badge" style={{ background: (APPROVAL_COLORS[selected.approval_status] || '#94a3b8') + '18', color: APPROVAL_COLORS[selected.approval_status] || '#94a3b8', textTransform: 'capitalize', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4 }}>
                    {selected.approval_status}
                  </span>
                  <span className="sa-status-badge" style={{ background: (PAYMENT_COLORS[selected.payment_status] || '#94a3b8') + '18', color: PAYMENT_COLORS[selected.payment_status] || '#94a3b8', textTransform: 'capitalize', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4 }}>
                    {selected.payment_status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <button className="sa-modal-close" onClick={() => setSelected(null)} title="Close" style={{ position: 'absolute', top: 16, right: 16 }}>
                <X size={18} />
              </button>
            </div>

            <div className="sa-modal-body" style={{ padding: 24 }}>
              {/* Organisation Section */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--sa-text-muted)' }}>
                  Organisation Information
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Name</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--sa-text)', fontWeight: 500 }}>{selected.org_name}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Type</p>
                    <div style={{ fontSize: 14, color: 'var(--sa-text)' }}>
                      <span className="sa-badge" style={{ background: ORG_TYPE_COLOR[selected.org_type]?.bg || '#f1f5f9', color: ORG_TYPE_COLOR[selected.org_type]?.color || '#64748b', textTransform: 'capitalize', fontSize: 12, padding: '4px 8px', borderRadius: 4, fontWeight: 600 }}>
                        {selected.org_type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Contact Person</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--sa-text)', fontWeight: 500 }}>{selected.contact_person}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Email</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--sa-primary)', wordBreak: 'break-all' }}>{selected.email}</p>
                  </div>
                </div>
              </div>

              {/* Request Details Section */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--sa-text-muted)' }}>
                  Request Details
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Data Period</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--sa-text)', fontWeight: 500 }}>{selected.period_from} — {selected.period_to}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Output Format</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--sa-text)', fontWeight: 500 }}>{selected.format?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Fee Amount</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--sa-text)', fontWeight: 700 }}>{fmtFee(selected.fee_amount)}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--sa-text-muted)' }}>Submitted Date</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--sa-text)', fontWeight: 500 }}>{fmtDate(selected.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Data Types Section */}
              {selected.data_types && selected.data_types.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--sa-text-muted)' }}>
                    Data Types Requested
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.data_types.map(t => (
                      <span key={t} style={{ background: 'var(--sa-primary-light)', color: 'var(--sa-primary)', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Purpose Section */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--sa-text-muted)' }}>
                  Research Purpose
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--sa-text)', lineHeight: 1.6, padding: 12, background: 'var(--sa-primary-light)', borderRadius: 6, borderLeft: '3px solid var(--sa-primary)' }}>
                  {selected.purpose}
                </p>
              </div>

              {/* Admin Actions Section */}
              <div style={{ paddingTop: 20, borderTop: '1px solid var(--sa-border)' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--sa-text-muted)' }}>
                  Admin Actions
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label className="sa-label" style={{ display: 'block', marginBottom: 8 }}>Note to Requester (optional)</label>
                  <textarea
                    className="sa-note-input"
                    rows={3}
                    placeholder="Add a note that will be sent to the requester..."
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    style={{ width: '100%', padding: 10, border: '1px solid var(--sa-border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, color: 'var(--sa-text)', background: 'var(--sa-card-bg)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                  {selected.fee_amount > 0 && selected.payment_status !== 'paid' && (
                    <button className="sa-btn sa-btn-outline" onClick={markPaid} disabled={actionLoading}>
                      <CheckCircle size={14} /> Mark Paid
                    </button>
                  )}
                  {selected.approval_status !== 'approved' && selected.approval_status !== 'fulfilled' && selected.approval_status !== 'rejected' && (
                    <button className="sa-btn sa-btn-primary" onClick={() => updateStatus('approved')} disabled={actionLoading}>
                      <CheckCircle size={14} /> Approve
                    </button>
                  )}
                  {selected.approval_status === 'approved' && (
                    <button className="sa-btn sa-btn-primary" onClick={() => updateStatus('fulfilled')} disabled={actionLoading}>
                      <Download size={14} /> Fulfill
                    </button>
                  )}
                  {selected.approval_status !== 'rejected' && selected.approval_status !== 'fulfilled' && (
                    <button className="sa-btn sa-btn-danger" onClick={() => updateStatus('rejected')} disabled={actionLoading}>
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AIIntelligenceSection() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [snapLoading, setSnapLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const { showSnackbar } = useSnackbar();

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await aiApi.health();
      setHealth(data);
    } catch {
      showSnackbar('Could not reach AI health endpoint', 'error');
    } finally {
      setHealthLoading(false);
    }
  };

  const loadSnapshot = async () => {
    setSnapLoading(true);
    try {
      const data = await aiApi.publicHealthSnapshot();
      setSnapshot(data);
    } catch (e) {
      showSnackbar(e.message || 'Public health snapshot failed', 'error');
    } finally {
      setSnapLoading(false);
    }
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const data = await aiApi.ask(q);
      setChatHistory(prev => [...prev, { role: 'ai', text: data.answer, powered_by: data.powered_by }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'The AI assistant is unavailable at this time. Please try again shortly.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  useEffect(() => { loadHealth(); }, []);

  const ALERT_COLOR = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444' };

  const SUGGESTED = [
    'What documents are required to register a birth in Ghana?',
    'How long does it take to process a birth certificate?',
    'What is the process for registering a death?',
    'What happens if a birth is registered late?',
  ];

  return (
    <div className="sa-section">
      <div className="sa-section-header">
        <div>
          <h2 className="sa-section-title">AI Intelligence</h2>
          <p className="sa-section-sub">AI-powered registry assistant, provider health monitoring, and public health analytics</p>
        </div>
        <button className="sa-btn sa-btn-outline" onClick={loadHealth} disabled={healthLoading}>
          <RefreshCw size={14} className={healthLoading ? 'spin' : ''} /> Refresh Status
        </button>
      </div>

      {/* Provider Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {['claude', 'gemini'].map(provider => {
          const info = health?.[provider];
          const ok = info?.available;
          return (
            <div key={provider} className="sa-stat-card" style={{ borderLeft: `4px solid ${ok ? '#22c55e' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {provider === 'claude' ? 'Claude AI (Anthropic)' : 'Gemini AI (Google)'}
                </span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  color: ok ? '#22c55e' : '#ef4444',
                  background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  padding: '2px 10px', borderRadius: 20,
                }}>
                  {healthLoading ? 'Checking' : ok ? 'Online' : 'Offline'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {healthLoading ? 'Connecting...' : info?.error ? `Unavailable: ${info.error}` : info?.model || 'Ready'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Registry AI Assistant */}
      <div className="sa-card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#6366f1" /> Registry AI Assistant
        </h3>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Ask any question about Ghana's birth and death registration regulations, procedures, timelines, and requirements.
        </p>

        {chatHistory.length === 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Suggested Questions
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setChatInput(q)}
                  style={{
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    borderRadius: 20, padding: '6px 14px', fontSize: '0.8rem',
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.length > 0 && (
          <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#006B3C' : 'var(--input-bg)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: msg.role === 'ai' ? '1px solid var(--border)' : 'none',
                }}>
                  {msg.role === 'ai' ? (
                    <>
                      <MarkdownText text={msg.text} />
                      {msg.powered_by && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '6px 0 0', textAlign: 'right' }}>
                          {msg.powered_by}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6 }}>{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#006B3C', opacity: 0.6, animation: 'pulse 1s infinite' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#006B3C', opacity: 0.6, animation: 'pulse 1s infinite 0.2s' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#006B3C', opacity: 0.6, animation: 'pulse 1s infinite 0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="sa-search"
            style={{ flex: 1 }}
            placeholder="Ask about registration requirements, procedures, timelines..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            disabled={chatLoading}
          />
          <button className="sa-btn sa-btn-primary" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Public Health Snapshot */}
      <div className="sa-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} /> Public Health Snapshot
            </h3>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0 }}>
              AI analysis of the last 90 days of death registrations for disease patterns and outbreak signals.
            </p>
          </div>
          <button className="sa-btn sa-btn-primary" onClick={loadSnapshot} disabled={snapLoading} style={{ flexShrink: 0 }}>
            {snapLoading ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
            {snapshot ? 'Refresh' : 'Run Analysis'}
          </button>
        </div>

        {snapshot && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.78rem', fontWeight: 700, padding: '3px 14px', borderRadius: 20,
                background: (ALERT_COLOR[snapshot.alert_level] || '#94a3b8') + '22',
                color: ALERT_COLOR[snapshot.alert_level] || '#94a3b8',
              }}>
                {snapshot.alert_level} Alert
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {snapshot.records_analyzed} records analysed
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Powered by {snapshot.powered_by}
              </span>
            </div>

            <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <MarkdownText text={snapshot.briefing} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Top Causes', items: snapshot.top_causes, color: '#ef4444' },
                { label: 'Anomalies', items: snapshot.anomalies, color: '#f59e0b' },
                { label: 'High-Risk Regions', items: snapshot.high_risk_regions, color: '#8b5cf6' },
                { label: 'Recommendations', items: snapshot.recommendations, color: '#006B3C' },
              ].filter(({ items }) => items?.length > 0).map(({ label, items, color }) => (
                <div key={label} style={{ background: 'var(--input-bg)', borderRadius: 8, padding: 14, borderTop: `3px solid ${color}` }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                    {items.map((item, i) => (
                      <li key={i} style={{ fontSize: '0.83rem', marginBottom: 5, lineHeight: 1.55, color: 'var(--text-primary)' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {!snapshot && !snapLoading && (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Click "Run Analysis" to analyse death registration patterns for public health signals.
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const notifWrapRef = useRef(null);
  const [section, setSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [overview, setOverview] = useState(null);
  const [statusDist, setStatusDist] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [revDays, setRevDays] = useState(30);
  const [trends, setTrends] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sectionBadges, setSectionBadges] = useState({ applications: 0, users: 0, kyc: 0 });
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unreadFetchInFlightRef = useRef(false);
  const listFetchInFlightRef = useRef(false);

  const fetchOverview = useCallback(async () => {
    try {
      const [ov, sd, rev] = await Promise.all([
        adminApi.overview(),
        adminApi.statusDistribution(),
        adminApi.revenueHistory(revDays),
      ]);
      setOverview(ov);
      setStatusDist(sd || []);
      setRevenueData(rev);
      const pending = ov?.applications?.pending_review || 0;
      const prevApps = parseInt(localStorage.getItem('bdr_last_apps_count') || '0');
      if (pending > prevApps) {
        setSectionBadges(p => ({ ...p, applications: pending - prevApps }));
      }
      localStorage.setItem('bdr_last_apps_count', String(pending));
    } catch {
      /* silently ignore to avoid spam */
    } finally {
      setOverviewLoading(false);
    }
  }, [revDays]);

  const fetchUnread = useCallback(async () => {
    if (unreadFetchInFlightRef.current) return;
    unreadFetchInFlightRef.current = true;
    try {
      const data = await notificationsApi.unreadCount();
      setUnreadCount(data.unread_count || 0);
    } catch { /* ignore */ }
    finally { unreadFetchInFlightRef.current = false; }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (listFetchInFlightRef.current) return;
    listFetchInFlightRef.current = true;
    try {
      const data = await notificationsApi.list('page_size=10');
      setNotifications(data.items || []);
    } catch { /* ignore */ }
    finally { listFetchInFlightRef.current = false; }
  }, []);

  useEffect(() => {
    fetchOverview();
    const autoRefresh = setInterval(fetchOverview, 60000);
    return () => clearInterval(autoRefresh);
  }, [fetchOverview]);

  useEffect(() => {
    fetchUnread();
    const poll = setInterval(fetchUnread, 60000);
    return () => clearInterval(poll);
  }, [fetchUnread]);

  useEffect(() => {
    const handleSyncRequest = () => {
      fetchUnread();
      if (notifOpen) {
        fetchNotifications();
      }
    };

    window.addEventListener('bdr:ws-connected', handleSyncRequest);

    return () => {
      window.removeEventListener('bdr:ws-connected', handleSyncRequest);
    };
  }, [fetchNotifications, fetchUnread, notifOpen]);

  useEffect(() => {
    const handleIncoming = (event) => {
      const notification = event.detail;
      if (!notification || !notification.id) return;

      setUnreadCount((count) => count + (notification.status !== 'read' ? 1 : 0));
      setNotifications((prev) => {
        const next = [notification, ...prev.filter((item) => item.id !== notification.id)];
        return next.slice(0, 20);
      });
    };

    window.addEventListener('bdr:notification-created', handleIncoming);
    return () => window.removeEventListener('bdr:notification-created', handleIncoming);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;

    const onPointerDown = (event) => {
      if (notifWrapRef.current && !notifWrapRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [notifOpen]);

  const navigateTo = useCallback((id) => {
    setSection(id);
    setSectionBadges(p => ({ ...p, [id]: 0 }));
    localStorage.setItem(`bdr_section_seen_${id}`, String(Date.now()));
    if (typeof window !== 'undefined' && window.innerWidth <= 768) setSidebarOpen(false);
  }, []);

  const handleBadgeClear = useCallback((id) => {
    setSectionBadges(p => ({ ...p, [id]: 0 }));
  }, []);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/signin', { replace: true });
  };

  const handleBell = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      await Promise.all([fetchNotifications(), fetchUnread()]);
    }
  };

  const markNotifRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(p => p.map(n => n.id === id ? { ...n, status: 'read' } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const resolveNotifSection = (n) => {
    const d = n.data || {};
    if (d.section === 'data-requests' || (d.reference || '').startsWith('STAT-')) return 'data-requests';
    const t = (n.notification_type || '').toLowerCase();
    if (t.includes('payment')) return 'analytics';
    if (t.includes('kyc') || t.includes('document')) return 'kyc';
    if (t.includes('application') || d.application_id) return 'applications';
    return null;
  };

  const handleNotifClick = async (n) => {
    await markNotifRead(n.id);
    const target = resolveNotifSection(n);
    if (target) {
      setSection(target);
      setNotifOpen(false);
    }
  };

  const totalBadge = Object.values(sectionBadges).reduce((a, b) => a + b, 0);

  const role = user?.role || 'super_admin';
  const canSeeSection = (id) => {
    if (['overview', 'applications', 'analytics', 'audit', 'reports', 'system', 'ai-intelligence'].includes(id)) return true;
    if (['revenue'].includes(id) && ['admin', 'super_admin'].includes(role)) return true;
    if (['users', 'staff', 'kyc', 'data-requests'].includes(id) && ['admin', 'super_admin'].includes(role)) return true;
    return false;
  };

  const mainNav = NAV_SECTIONS.filter(n => n.group === 'main' && canSeeSection(n.id));
  const insightsNav = NAV_SECTIONS.filter(n => n.group === 'insights' && canSeeSection(n.id));

  return (
    <div className="sa-layout">
      {sidebarOpen && <div className="sa-mobile-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sa-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sa-sidebar-top">
          <div className="sa-logo-wrap">
            <img src={logo} alt="BDR Logo" className="sa-logo" />
            {sidebarOpen && (
              <div className="sa-logo-text">
                <span className="sa-logo-name">BDR Ghana</span>
                <span className="sa-logo-role">{role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              </div>
            )}
          </div>
          <button className="sa-collapse-btn" onClick={() => setSidebarOpen(p => !p)}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="sa-nav">
          {sidebarOpen && <p className="sa-nav-group-label">MAIN</p>}
          {mainNav.map(item => {
            const Icon = item.icon;
            const badge = item.badge ? (sectionBadges[item.badge] || 0) : 0;
            return (
              <button key={item.id}
                className={`sa-nav-item ${section === item.id ? 'active' : ''}`}
                onClick={() => navigateTo(item.id)}
                title={!sidebarOpen ? item.label : undefined}>
                <Icon size={18} />
                {sidebarOpen && <span className="sa-nav-label">{item.label}</span>}
                {badge > 0 && <span className="sa-nav-badge">{badge}</span>}
              </button>
            );
          })}

          {sidebarOpen && <p className="sa-nav-group-label" style={{ marginTop: 16 }}>INSIGHTS</p>}
          {!sidebarOpen && <div className="sa-nav-divider" />}
          {insightsNav.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id}
                className={`sa-nav-item ${section === item.id ? 'active' : ''}`}
                onClick={() => navigateTo(item.id)}
                title={!sidebarOpen ? item.label : undefined}>
                <Icon size={18} />
                {sidebarOpen && <span className="sa-nav-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sa-sidebar-footer">
          {sidebarOpen && (
            <div className="sa-user-info">
              <Avatar first={user?.first_name} last={user?.last_name} photo={user?.profile_photo} size={36} />
              <div className="sa-user-text">
                <p className="sa-user-name">{user?.first_name} {user?.last_name}</p>
                <p className="sa-user-email">{user?.email}</p>
              </div>
            </div>
          )}
          <button className="sa-logout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className="sa-main">
        <header className="sa-topbar">
          <div className="sa-topbar-left">
            <button className="sa-mobile-menu-btn" onClick={() => setSidebarOpen(p => !p)} aria-label="Toggle menu">
              <Menu size={20} />
            </button>
            <h1 className="sa-topbar-title">
              {NAV_SECTIONS.find(n => n.id === section)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="sa-topbar-right">
            <div className="sa-topbar-tools">
              <button className="sa-icon-btn" onClick={fetchOverview} title="Refresh data" aria-label="Refresh data">
                <RefreshCw size={16} />
              </button>
              <LanguageSwitcher />
              <button
                className="sa-icon-btn"
                onClick={cycleTheme}
                aria-label={theme === 'light' ? 'Switch to dark mode' : theme === 'dark' ? 'Switch to system theme' : 'Switch to light mode'}
                title={theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System theme'}
              >
                {theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />}
              </button>
            </div>
            <div ref={notifWrapRef} className="sa-notif-wrap">
              <NotificationBell count={unreadCount + totalBadge} onClick={handleBell} />
              {notifOpen && (
                <div className="sa-notif-panel">
                  <div className="sa-notif-header">
                    <span>Notifications</span>
                    <div className="sa-notif-actions">
                      <button className="sa-text-btn" onClick={async () => {
                        await notificationsApi.markAllRead();
                        setUnreadCount(0);
                        setNotifications(p => p.map(n => ({ ...n, status: 'read' })));
                      }}>Mark all read</button>
                      <button type="button" className="sa-notif-close-btn" onClick={() => setNotifOpen(false)} aria-label="Close notifications">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="sa-notif-empty"><BellOff size={24} /><p>No notifications</p></div>
                  ) : notifications.map(n => {
                    const targetSection = resolveNotifSection(n);
                    return (
                      <div key={n.id}
                        className={`sa-notif-item ${n.status !== 'read' ? 'unread' : ''} ${targetSection ? 'sa-notif-clickable' : ''}`}
                        onClick={() => handleNotifClick(n)}
                        title={targetSection ? `Go to ${targetSection}` : undefined}
                      >
                        <div className="sa-notif-dot" style={{ opacity: n.status !== 'read' ? 1 : 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="sa-notif-title">{n.title}</p>
                          <p className="sa-notif-msg">{n.message}</p>
                          <p className="sa-notif-time">{fmtDateTime(n.created_at)}</p>
                        </div>
                        {targetSection && <ExternalLink size={12} style={{ opacity: 0.4, flexShrink: 0, marginLeft: 6 }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sa-topbar-user">
              <Avatar first={user?.first_name} last={user?.last_name} photo={user?.profile_photo} size={32} />
              <span className="sa-topbar-name">{user?.first_name}</span>
            </div>
          </div>
        </header>

        <main className="sa-content">
          {section === 'overview' && (
            <OverviewSection
              overview={overview} trends={trends} statusDist={statusDist}
              revenueData={revenueData} revDays={revDays} setRevDays={setRevDays}
              loading={overviewLoading} />
          )}
          {section === 'applications' && <ApplicationsSection onBadgeClear={handleBadgeClear} />}
          {section === 'users' && <UsersSection onBadgeClear={handleBadgeClear} />}
          {section === 'staff' && <StaffSection />}
          {section === 'kyc' && <KYCSection onBadgeClear={handleBadgeClear} />}
          {section === 'data-requests' && <DataRequestsSection />}
          {section === 'analytics' && <AnalyticsSection />}
          {section === 'revenue' && <RevenueReportSection />}
          {section === 'audit' && <AuditSection />}
          {section === 'reports' && <ReportsSection />}
          {section === 'system' && <SystemSection />}
          {section === 'ai-intelligence' && <AIIntelligenceSection />}
        </main>
      </div>
    </div>
  );
}
