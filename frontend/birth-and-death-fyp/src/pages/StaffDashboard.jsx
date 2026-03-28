import {
  Award, Bell, BellOff, Bot,
  Briefcase,
  CheckCircle, ChevronLeft,
  ChevronRight, ClipboardList, CreditCard, Download, ExternalLink, Eye, FileText,
  LogOut, Menu, MessageCircle, Monitor, Moon, Printer, RefreshCw, Search, Send, Shield, Sparkles, Sun,
  TrendingUp,
  UserCheck,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi, aiApi, aiStaffApi, authApi, certificatesApi, notificationsApi } from '../api/client';
import logo from '../assets/logo.png';
import MarkdownText from '../components/MarkdownText';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { useTheme } from '../context/ThemeContext';
import './StaffDashboard.css';

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

const QUICK_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'PAYMENT_PENDING'],
  APPROVED: ['PROCESSING', 'PAYMENT_PENDING'],
  PAYMENT_COMPLETED: ['PROCESSING'],
  PROCESSING: ['READY'],
  READY: ['COLLECTED', 'DELIVERED'],
};

const NAV = [
  { id: 'queue', label: 'Application Queue', icon: ClipboardList },
  { id: 'review', label: 'Under Review', icon: Eye },
  { id: 'payment', label: 'Pending Payment', icon: CreditCard },
  { id: 'certificates', label: 'Certificate Management', icon: Award },
  { id: 'ready', label: 'Ready for Collection', icon: CheckCircle },
  { id: 'overview', label: 'My Performance', icon: TrendingUp },
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

function Avatar({ first, last, size = 36 }) {
  return (
    <div className="sd-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(first, last)}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
  return (
    <div className="sd-pagination">
      <button className="sd-pg-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft size={13} /></button>
      {pages[0] > 1 && <><button className="sd-pg-btn" onClick={() => onPage(1)}>1</button><span className="sd-pg-ellipsis">…</span></>}
      {pages.map(p => (
        <button key={p} className={`sd-pg-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      {pages[pages.length - 1] < totalPages && <><span className="sd-pg-ellipsis">…</span><button className="sd-pg-btn" onClick={() => onPage(totalPages)}>{totalPages}</button></>}
      <button className="sd-pg-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight size={13} /></button>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status?.replace(/_/g, ' ') || '—';
  return (
    <span className={`sd-status-badge sd-status-${status || 'DRAFT'}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color = 'green', sub }) {
  return (
    <div className={`sd-stat-card sd-stat-${color}`}>
      <div className="sd-stat-icon"><Icon size={20} /></div>
      <div className="sd-stat-val">{value}</div>
      <div className="sd-stat-label">{label}</div>
      {sub && <div className="sd-stat-sub">{sub}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, title, sub }) {
  return (
    <div className="sd-empty">
      <div className="sd-empty-icon"><Icon size={28} strokeWidth={1.5} /></div>
      <p className="sd-empty-title">{title}</p>
      {sub && <p className="sd-empty-sub">{sub}</p>}
    </div>
  );
}

function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <>
      <div className={`sd-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`sd-drawer ${open ? 'open' : ''}`}>
        <div className="sd-drawer-header">
          <h3 className="sd-drawer-title">{title}</h3>
          <button className="sd-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sd-drawer-body">{children}</div>
      </div>
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="sd-info-row">
      <span className="sd-info-label">{label}</span>
      <span className="sd-info-value">{value || '—'}</span>
    </div>
  );
}

function StatusTimeline({ history }) {
  if (!history?.length) return <p style={{ color: '#6b7280', fontSize: 13 }}>No history available.</p>;
  return (
    <div className="sd-timeline">
      {history.map((h, i) => {
        const toStatus = h.to_status?.value || h.to_status;
        return (
          <div key={i} className="sd-timeline-item">
            <div className="sd-timeline-dot" style={{ background: STATUS_COLORS[toStatus] || '#94a3b8' }} />
            <div>
              <StatusBadge status={toStatus} />
              {h.reason && <p className="sd-timeline-reason">{h.reason}</p>}
              <p className="sd-timeline-time">{fmtDateTime(h.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationsTable({ statusFilter, label }) {
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState(statusFilter || '');
  const [selectedApp, setSelectedApp] = useState(null);
  const [history, setHistory] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [chatTab, setChatTab] = useState('details');
  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftDecision, setDraftDecision] = useState('APPROVE');
  const [draftReason, setDraftReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [sendingDraft, setSendingDraft] = useState(false);
  const [citizenGuidance, setCitizenGuidance] = useState(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, page_size: 15 });
      if (statusF) params.set('status', statusF);
      if (search) params.set('search', search);
      const data = await adminApi.listApplications(params.toString());
      setApps(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(p);
    } catch {
      showSnackbar('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusF, search, showSnackbar]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    const h = () => load(1);
    window.addEventListener('bdr:refresh-queue', h);
    return () => window.removeEventListener('bdr:refresh-queue', h);
  }, [load]);

  const openApp = async (app) => {
    setDrawerOpen(true);
    setSelectedApp(app);
    setReason('');
    setNotes('');
    setChatMsgs([]);
    setAiReview(null);
    setAiDraft(null);
    setCitizenGuidance(null);
    setChatTab('details');
    const transitions = QUICK_TRANSITIONS[app.status] || [];
    setNewStatus(transitions[0] || app.status);
    try {
      const full = await adminApi.getApplication(app.id);
      if (full) {
        setSelectedApp({ ...app, ...full });
        const t2 = QUICK_TRANSITIONS[full.status || app.status] || [];
        setNewStatus(t2[0] || full.status || app.status);
      }
    } catch { setSelectedApp(app); }
    try {
      const h = await adminApi.getApplicationHistory(app.id);
      setHistory(Array.isArray(h) ? h : []);
    } catch { setHistory([]); }
  };

  const loadChat = async (appId) => {
    setChatLoading(true);
    try {
      const msgs = await adminApi.getApplicationChat(appId);
      setChatMsgs(Array.isArray(msgs) ? msgs : []);
    } catch { setChatMsgs([]); }
    finally { setChatLoading(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !selectedApp) return;
    setSendingChat(true);
    try {
      const msg = await adminApi.sendApplicationChat(selectedApp.id, chatInput.trim());
      setChatMsgs(prev => [...prev, msg]);
      setChatInput('');
    } catch (e) {
      showSnackbar(e.message || 'Failed to send', 'error');
    } finally { setSendingChat(false); }
  };

  const claimApp = async (app, e) => {
    e.stopPropagation();
    if (app.assigned_to_id && app.assigned_to_id !== user?.id) {
      showSnackbar('This application is already claimed by another staff member', 'warning');
      return;
    }
    setClaiming(app.id);
    try {
      await adminApi.claimApplication(app.id);
      showSnackbar(`You claimed ${app.application_number}`, 'success');
      load(page);
    } catch (err) {
      showSnackbar(err.message || 'Failed to claim', 'error');
    } finally { setClaiming(null); }
  };

  const runAiReview = async () => {
    if (!selectedApp) return;
    setAiLoading(true);
    try {
      const result = await aiStaffApi.reviewApplication(selectedApp.id);
      setAiReview(result.review);
    } catch (e) {
      showSnackbar(e.message || 'AI review failed', 'error');
    } finally { setAiLoading(false); }
  };

  const runAiDraft = async () => {
    if (!selectedApp) return;
    setDraftLoading(true);
    try {
      const result = await aiStaffApi.draftResponse(selectedApp.id, draftDecision, draftReason);
      setAiDraft(result.letter);
      setAdminNote('');
    } catch (e) {
      showSnackbar(e.message || 'Draft failed', 'error');
    } finally { setDraftLoading(false); }
  };

  const DECISION_STATUS_MAP = { APPROVE: 'APPROVED', REJECT: 'REJECTED', REQUEST_MORE_INFO: 'UNDER_REVIEW' };

  const useThisDraft = () => {
    if (!aiDraft) return;
    setReason(aiDraft);
    setNotes(draftReason || '');
    const mapped = DECISION_STATUS_MAP[draftDecision];
    if (mapped) setNewStatus(mapped);
    setChatTab('details');
  };

  const sendDraftToApplicant = async () => {
    if (!aiDraft || !selectedApp) return;
    if (draftDecision === 'REQUEST_MORE_INFO' && !adminNote.trim()) {
      showSnackbar('Please add a brief note to the admin explaining why you are requesting more info.', 'warning');
      return;
    }
    setSendingDraft(true);
    try {
      if (draftDecision === 'REQUEST_MORE_INFO') {
        await adminApi.requestMoreInfo(selectedApp.id, aiDraft, adminNote.trim());
        showSnackbar('Letter sent to applicant. Admin has been notified.', 'success');
      } else {
        const mapped = DECISION_STATUS_MAP[draftDecision] || newStatus;
        await adminApi.updateApplicationStatus(selectedApp.id, { status: mapped, reason: aiDraft, staff_notes: draftReason || '' });
        showSnackbar('Decision applied and applicant notified.', 'success');
        setDrawerOpen(false);
        load(page);
      }
      setAiDraft(null);
      setAdminNote('');
    } catch (e) {
      showSnackbar(e.message || 'Failed to send', 'error');
    } finally { setSendingDraft(false); }
  };

  const runCitizenGuidance = async () => {
    if (!selectedApp || guidanceLoading) return;
    setGuidanceLoading(true);
    try {
      const res = await aiApi.citizenGuidance(selectedApp.id);
      setCitizenGuidance(res.guidance || res.message || 'No guidance available at this time.');
    } catch {
      setCitizenGuidance('Could not generate guidance at this time. Please try again.');
    } finally {
      setGuidanceLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!newStatus || !selectedApp) return;
    setUpdating(true);
    try {
      await adminApi.updateApplicationStatus(selectedApp.id, { status: newStatus, reason, staff_notes: notes });
      showSnackbar('Application updated. Applicant has been notified.', 'success');
      setDrawerOpen(false);
      load(page);
    } catch (e) {
      showSnackbar(e.message || 'Update failed', 'error');
    } finally { setUpdating(false); }
  };

  const availableTransitions = (() => {
    if (!selectedApp) return [];
    const base = QUICK_TRANSITIONS[selectedApp.status]
      || Object.keys(STATUS_LABELS).filter(s => !['DRAFT', 'COLLECTED', 'DELIVERED'].includes(s));
    if (aiDraft && draftDecision) {
      const mapped = DECISION_STATUS_MAP[draftDecision];
      if (mapped && !base.includes(mapped)) return [...base, mapped];
    }
    return base;
  })();

  const REVIEW_COLORS = { APPROVE: '#22c55e', REJECT: '#ef4444', REQUEST_MORE_INFO: '#f59e0b' };

  return (
    <div>
      <div className="sd-filters">
        <div className="sd-search-wrap">
          <Search size={14} className="sd-search-icon" />
          <input className="sd-search" placeholder="Search by reference, name…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)} />
        </div>
        <select className="sd-select" value={statusF} onChange={e => { setStatusF(e.target.value); }}>
          <option value="">All Active</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="PAYMENT_COMPLETED">Payment Completed</option>
        </select>
        <button className="sd-btn sd-btn-outline" onClick={() => load(1)}><RefreshCw size={14} /></button>
      </div>

      <div className="sd-count-line">{total.toLocaleString()} {label}</div>

      {loading ? (
        <div className="sd-skeleton">{[...Array(6)].map((_, i) => <div key={i} className="sd-skel-row" />)}</div>
      ) : apps.length === 0 ? (
        <EmptyState icon={ClipboardList} title={`No ${label.toLowerCase()} at this time`} sub="Refresh to check for new items" />
      ) : (
        <div className="sd-table">
          <div className="sd-table-head sd-app-cols">
            <span>Reference</span><span>Subject</span><span>Type</span>
            <span>Assigned To</span><span>Date</span><span>Status</span><span>Actions</span>
          </div>
          {apps.map(app => {
            const extra = app.extra_data || {};
            const appType = (extra.application_type || app.application_type || 'BIRTH').toUpperCase();
            const isMyApp = app.assigned_to_id === user?.id;
            const isOthersClaimed = app.assigned_to_id && !isMyApp;
            const isUnclaimed = !app.assigned_to_id;
            const isClaiming = claiming === app.id;
            const isDone = ['COLLECTED', 'DELIVERED', 'CANCELLED'].includes(app.status);
            return (
              <div key={app.id} className={`sd-table-row sd-app-cols ${isDone ? 'sd-row-done' : ''}`}
                style={{ opacity: isDone ? 0.6 : 1 }}
                onClick={() => openApp(app)}>
                <span className="sd-table-ref">{app.application_number}</span>
                <span className="sd-table-main">{app.child_first_name} {app.child_last_name}</span>
                <span><span className={`sd-type-badge sd-type-${appType.toLowerCase()}`}>{appType}</span></span>
                <span>
                  {isMyApp && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#d1fae5', color: '#065f46', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                      <UserCheck size={10} /> You
                    </span>
                  )}
                  {isOthersClaimed && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }} title={app.assigned_to_name}>
                      <UserCheck size={10} /> {app.assigned_to_name?.split(' ')[0] || 'Staff'}
                    </span>
                  )}
                  {isUnclaimed && !isDone && (
                    <button className="sd-cert-btn sd-cert-btn-outline" onClick={e => claimApp(app, e)} disabled={isClaiming} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {isClaiming ? <span className="sd-spinner" /> : 'Claim'}
                    </button>
                  )}
                  {isDone && <span style={{ fontSize: 10, color: '#9ca3af' }}>Done</span>}
                </span>
                <span className="sd-table-muted">{fmtDate(app.created_at)}</span>
                <span><StatusBadge status={app.status} /></span>
                <span className="sd-cert-actions" onClick={e => e.stopPropagation()}>
                  <button className="sd-cert-btn sd-cert-btn-blue" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => openApp(app)}>
                    <Eye size={11} /> Review
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />

      {/* Application Drawer */}
      {drawerOpen && selectedApp && (
        <div className="sd-overlay open" onClick={() => setDrawerOpen(false)}>
          <div className="sd-drawer open" onClick={e => e.stopPropagation()}>
            <div className="sd-drawer-header">
              <div>
                <h3 className="sd-drawer-title">{selectedApp.application_number}</h3>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <StatusBadge status={selectedApp.status} />
                  {selectedApp.assigned_to_name && (
                    <span style={{ background: 'var(--sd-badge-assign-bg)', color: 'var(--sd-badge-assign-color)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                      Assigned: {selectedApp.assigned_to_name.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
              <button className="sd-drawer-close" onClick={() => setDrawerOpen(false)}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--sd-border, #e5e7eb)', marginBottom: 16 }}>
              {[
                { id: 'details', label: 'Details', icon: FileText },
                { id: 'chat', label: 'Chat', icon: MessageCircle },
                { id: 'ai', label: 'AI Assist', icon: Sparkles },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => {
                  setChatTab(id);
                  if (id === 'chat') loadChat(selectedApp.id);
                }} style={{
                  flex: 1, padding: '10px 0', background: 'none', border: 'none',
                  borderBottom: chatTab === id ? '2px solid #006B3C' : '2px solid transparent',
                  color: chatTab === id ? '#006B3C' : 'var(--sd-text-muted, #6b7280)',
                  fontWeight: chatTab === id ? 700 : 500, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 16px' }}>
              {chatTab === 'details' && (
                <>
                  <div className="sd-app-detail-row">
                    <span>Subject</span>
                    <strong>{selectedApp.child_first_name} {selectedApp.child_other_names} {selectedApp.child_last_name}</strong>
                  </div>
                  <div className="sd-app-detail-row"><span>Date of Birth</span><strong>{selectedApp.child_date_of_birth || '—'}</strong></div>
                  <div className="sd-app-detail-row"><span>Gender</span><strong>{selectedApp.child_gender || '—'}</strong></div>
                  <div className="sd-app-detail-row"><span>Place of Birth</span><strong>{selectedApp.child_place_of_birth || '—'}</strong></div>
                  <div className="sd-app-detail-row"><span>Region</span><strong>{selectedApp.child_region_of_birth || '—'}</strong></div>
                  <div className="sd-app-detail-row"><span>Mother</span><strong>{selectedApp.mother_first_name} {selectedApp.mother_last_name}</strong></div>
                  <div className="sd-app-detail-row"><span>Father</span><strong>{selectedApp.father_first_name} {selectedApp.father_last_name}</strong></div>
                  <div className="sd-app-detail-row"><span>Hospital</span><strong>{selectedApp.hospital_name || '—'}</strong></div>
                  <div className="sd-app-detail-row"><span>Service Plan</span><strong>{selectedApp.service_plan || '—'}</strong></div>

                  {history.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--sd-text-muted, #6b7280)', letterSpacing: '.05em', margin: '0 0 8px' }}>Status History</p>
                      {history.slice(0, 5).map((h, i) => (
                        <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--sd-border)', color: 'var(--sd-text)' }}>
                          <span style={{ color: 'var(--sd-text-muted, #6b7280)' }}>{h.from_status} → </span>
                          <strong>{h.to_status}</strong>
                          {h.reason && <span style={{ color: 'var(--sd-text-muted, #6b7280)' }}> — {h.reason.length > 80 ? h.reason.slice(0, 80) + '…' : h.reason}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 20, borderTop: '1px solid var(--sd-border, #e5e7eb)', paddingTop: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--sd-text-muted, #6b7280)', letterSpacing: '.05em', margin: '0 0 10px' }}>Update Status</p>
                    <select className="sd-select" style={{ width: '100%', marginBottom: 8 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      {availableTransitions.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                      ))}
                    </select>
                    <input className="sd-search" placeholder="Reason (required for rejections)…" value={reason}
                      onChange={e => setReason(e.target.value)} style={{ marginBottom: 8 }} />
                    <textarea className="sd-search" placeholder="Staff notes (internal)…" value={notes}
                      onChange={e => setNotes(e.target.value)} rows={2}
                      style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
                    <button className="sd-btn sd-btn-primary" style={{ width: '100%' }} onClick={handleUpdate} disabled={updating}>
                      {updating ? 'Updating…' : 'Update Application'}
                    </button>
                  </div>
                </>
              )}

              {chatTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 380 }}>
                  <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
                    {chatLoading && <p style={{ textAlign: 'center', color: 'var(--sd-text-muted,#6b7280)', fontSize: 13 }}>Loading…</p>}
                    {!chatLoading && chatMsgs.length === 0 && (
                      <p style={{ textAlign: 'center', color: 'var(--sd-text-muted,#6b7280)', fontSize: 13, marginTop: 40 }}>No messages yet. Start the conversation.</p>
                    )}
                    {chatMsgs.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '75%', padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isMe ? '#006B3C' : 'var(--sd-content-bg)',
                            color: isMe ? '#fff' : 'var(--sd-text)',
                            fontSize: 13,
                          }}>
                            {!isMe && <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: '#006B3C', textTransform: 'capitalize' }}>{msg.sender_name?.split(' ')[0]} ({msg.sender_role})</p>}
                            <p style={{ margin: 0 }}>{msg.message}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.7, textAlign: 'right' }}>
                              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--sd-border, #e5e7eb)', paddingTop: 8 }}>
                    <input className="sd-search" style={{ flex: 1 }} placeholder="Type a message…" value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} />
                    <button className="sd-btn sd-btn-primary" onClick={sendChat} disabled={sendingChat || !chatInput.trim()}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}

              {chatTab === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* AI Review */}
                  <div style={{ border: '1px solid var(--sd-border,#e5e7eb)', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--sd-text,#111)' }}>
                        <Sparkles size={13} style={{ marginRight: 6, color: '#6366f1' }} />
                        AI Application Review
                      </p>
                      <button className="sd-cert-btn sd-cert-btn-blue" onClick={runAiReview} disabled={aiLoading} style={{ fontSize: 11 }}>
                        {aiLoading ? <span className="sd-spinner" /> : <Bot size={11} />}
                        {aiLoading ? 'Analyzing…' : 'Analyze'}
                      </button>
                    </div>
                    {aiReview && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <span style={{
                            background: (REVIEW_COLORS[aiReview.recommendation] || '#94a3b8') + '20',
                            color: REVIEW_COLORS[aiReview.recommendation] || '#94a3b8',
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
                          }}>{aiReview.recommendation?.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 12, color: 'var(--sd-text-muted,#6b7280)' }}>
                            Confidence: <strong style={{ color: 'var(--sd-text,#111)' }}>{aiReview.confidence}%</strong>
                          </span>
                        </div>
                        <MarkdownText text={aiReview.summary} style={{ fontSize: 13, marginBottom: 10 }} />
                        {aiReview.flags?.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--sd-flag-color)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Flags</p>
                            {aiReview.flags.map((f, i) => <p key={i} style={{ fontSize: 12, color: 'var(--sd-text)', margin: '2px 0', paddingLeft: 10 }}>• {f}</p>)}
                          </div>
                        )}
                        {aiReview.strengths?.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--sd-strength-color)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Strengths</p>
                            {aiReview.strengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: 'var(--sd-text)', margin: '2px 0', paddingLeft: 10 }}>• {s}</p>)}
                          </div>
                        )}
                        {aiReview.action_notes && (
                          <div style={{ background: 'var(--sd-warn-bg)', border: '1px solid var(--sd-warn-border)', borderRadius: 6, padding: '8px 10px' }}>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--sd-warn-color)' }}>{aiReview.action_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {!aiReview && !aiLoading && (
                      <p style={{ fontSize: 12, color: 'var(--sd-text-muted,#6b7280)', margin: 0 }}>
                        Click Analyze to get an AI-powered review of this application including flags, completeness check, and a recommendation.
                      </p>
                    )}
                  </div>

                  {/* AI Draft Response */}
                  <div style={{ border: '1px solid var(--sd-border,#e5e7eb)', borderRadius: 8, padding: 14 }}>
                    <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: 'var(--sd-text,#111)' }}>
                      <FileText size={13} style={{ marginRight: 6, color: '#0369a1' }} />
                      AI Draft Response Letter
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <select className="sd-select" style={{ flex: 1 }} value={draftDecision} onChange={e => setDraftDecision(e.target.value)}>
                        <option value="APPROVE">Approve</option>
                        <option value="REJECT">Reject</option>
                        <option value="REQUEST_MORE_INFO">Request More Info</option>
                      </select>
                      <button className="sd-cert-btn sd-cert-btn-blue" onClick={runAiDraft} disabled={draftLoading} style={{ fontSize: 11 }}>
                        {draftLoading ? <span className="sd-spinner" /> : <Sparkles size={11} />}
                        {draftLoading ? 'Drafting…' : 'Draft'}
                      </button>
                    </div>
                    <input className="sd-search" placeholder="Additional context for the AI (optional)…" value={draftReason}
                      onChange={e => setDraftReason(e.target.value)} style={{ marginBottom: 8 }} />
                    {aiDraft && (
                      <div>
                        <div style={{ background: 'var(--sd-content-bg)', border: '1px solid var(--sd-border)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12, color: 'var(--sd-text)', margin: 0, lineHeight: 1.7 }}>{aiDraft}</pre>
                        </div>

                        {draftDecision === 'REQUEST_MORE_INFO' && (
                          <div style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#b45309', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                              Staff Note to Admin (required)
                            </p>
                            <textarea
                              className="sd-search"
                              placeholder="Briefly explain to the admin why you are requesting more information from the applicant…"
                              value={adminNote}
                              onChange={e => setAdminNote(e.target.value)}
                              rows={3}
                              style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 0 }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="sd-cert-btn sd-cert-btn-outline"
                            onClick={useThisDraft}
                            style={{ flex: 1, fontSize: 11 }}
                            title="Copy this letter to the status update form in the Details tab"
                          >
                            <FileText size={11} /> Use This Draft
                          </button>
                          <button
                            className="sd-cert-btn sd-cert-btn-blue"
                            onClick={sendDraftToApplicant}
                            disabled={sendingDraft}
                            style={{ flex: 1, fontSize: 11 }}
                          >
                            {sendingDraft ? <span className="sd-spinner" /> : <Send size={11} />}
                            {sendingDraft ? 'Sending…' : 'Send to Applicant'}
                          </button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--sd-text-muted,#6b7280)', margin: '6px 0 0', lineHeight: 1.5 }}>
                          {draftDecision === 'REQUEST_MORE_INFO'
                            ? 'Sends this letter to the applicant by email and notifies the admin with your note.'
                            : 'Applies the decision and sends this letter to the applicant by email.'}
                        </p>
                      </div>
                    )}
                    {!aiDraft && !draftLoading && (
                      <p style={{ fontSize: 12, color: 'var(--sd-text-muted,#6b7280)', margin: 0 }}>
                        Generate a professional response letter for this application using AI.
                      </p>
                    )}
                  </div>

                  {/* Citizen Guidance */}
                  <div style={{ border: '1px solid var(--sd-border,#e5e7eb)', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--sd-text,#111)' }}>
                        <Bot size={13} style={{ marginRight: 6, color: '#059669' }} />
                        Citizen Next-Step Guidance
                      </p>
                      <button className="sd-cert-btn sd-cert-btn-blue" onClick={runCitizenGuidance} disabled={guidanceLoading} style={{ fontSize: 11 }}>
                        {guidanceLoading ? <span className="sd-spinner" /> : <Sparkles size={11} />}
                        {guidanceLoading ? 'Generating…' : 'Generate'}
                      </button>
                    </div>
                    {citizenGuidance ? (
                      <div>
                        <div style={{ background: 'var(--sd-content-bg)', border: '1px solid var(--sd-border)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                          <MarkdownText text={citizenGuidance} style={{ fontSize: 13 }} />
                        </div>
                        <button
                          className="sd-cert-btn sd-cert-btn-blue"
                          style={{ width: '100%', fontSize: 11 }}
                          disabled={sendingDraft}
                          onClick={async () => {
                            if (!selectedApp) return;
                            setSendingDraft(true);
                            try {
                              await adminApi.requestMoreInfo(selectedApp.id, citizenGuidance, 'AI-generated citizen guidance sent to applicant.');
                              showSnackbar('Guidance sent to applicant by email.', 'success');
                              setCitizenGuidance(null);
                            } catch {
                              showSnackbar('Could not send guidance. Try again.', 'error');
                            } finally {
                              setSendingDraft(false);
                            }
                          }}
                        >
                          {sendingDraft ? <span className="sd-spinner" /> : <Send size={11} />}
                          {sendingDraft ? 'Sending…' : 'Send Guidance to Applicant by Email'}
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--sd-text-muted,#6b7280)', margin: 0 }}>
                        Generate personalised next-step guidance for the citizen based on their application status and details.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatesSection() {
  const { showSnackbar } = useSnackbar();
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PAYMENT_COMPLETED');
  const [updating, setUpdating] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [certMap, setCertMap] = useState({});

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, page_size: 15 });
      params.set('status', statusFilter);
      if (search) params.set('search', search);
      const data = await adminApi.listApplications(params.toString());
      setApps(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(p);
    } catch {
      showSnackbar('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, showSnackbar]);

  useEffect(() => { load(1); }, [load]);

  const markReady = async (app) => {
    setUpdating(app.id);
    try {
      await adminApi.updateApplicationStatus(app.id, {
        status: 'READY',
        reason: 'Certificate has been printed and is ready for collection.',
        staff_notes: 'Certificate printed by staff.',
      });
      showSnackbar(`${app.application_number} marked as Ready for Collection. Applicant notified.`, 'success');
      load(page);
    } catch (e) {
      showSnackbar(e.message || 'Failed to update status', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const markProcessing = async (app) => {
    setUpdating(app.id);
    try {
      await adminApi.updateApplicationStatus(app.id, {
        status: 'PROCESSING',
        reason: 'Certificate printing has commenced.',
        staff_notes: 'Certificate sent to printer.',
      });
      showSnackbar(`${app.application_number} moved to Processing.`, 'success');
      load(page);
    } catch (e) {
      showSnackbar(e.message || 'Failed to update', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const generateCertificate = async (app) => {
    setGenerating(app.id);
    try {
      const result = await certificatesApi.generate(app.id);
      setCertMap(prev => ({ ...prev, [app.id]: result }));
      showSnackbar(
        `Certificate ${result.certificate_number} generated for ${app.application_number}`,
        'success',
      );
      load(page);
    } catch (e) {
      showSnackbar(e.message || 'Failed to generate certificate', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const downloadCert = async (certNumber, appNumber) => {
    try {
      const blob = await certificatesApi.download(certNumber);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appNumber}-certificate.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showSnackbar(e.message || 'Download failed', 'error');
    }
  };

  return (
    <div>
      <div className="sd-cert-banner">
        <div className="sd-cert-banner-icon"><Award size={20} /></div>
        <div>
          <p className="sd-cert-banner-title">Certificate Issuance</p>
          <p className="sd-cert-banner-sub">
            Generate official PDF certificates with embedded QR codes for approved and paid applications.
            Workflow: <strong>Payment Confirmed</strong> &rarr; <strong>Generate Certificate</strong> &rarr; <strong>Processing</strong> &rarr; <strong>Ready for Collection</strong>
          </p>
        </div>
      </div>

      <div className="sd-filters">
        <div className="sd-search-wrap">
          <Search size={14} className="sd-search-icon" />
          <input className="sd-search" placeholder="Search by reference or name…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(1)} />
        </div>
        <select className="sd-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="PAYMENT_COMPLETED">Payment Confirmed</option>
          <option value="PROCESSING">Printing in Progress</option>
          <option value="READY">Ready for Collection</option>
        </select>
        <button className="sd-btn sd-btn-outline" onClick={() => load(1)}><RefreshCw size={14} /></button>
      </div>

      <div className="sd-count-line">{total.toLocaleString()} applications</div>

      {loading ? (
        <div className="sd-skeleton">{[...Array(5)].map((_, i) => <div key={i} className="sd-skel-row" />)}</div>
      ) : apps.length === 0 ? (
        <EmptyState icon={Award} title="No applications in this stage" sub="Applications appear here once payment is confirmed" />
      ) : (
        <div className="sd-table">
          <div className="sd-table-head sd-cert-cols">
            <span>Reference</span><span>Subject</span><span>Type</span>
            <span>Updated</span><span>Status</span><span>Actions</span>
          </div>
          {apps.map(app => {
            const extra = app.extra_data || {};
            const appType = (extra.application_type || app.application_type || 'BIRTH').toUpperCase();
            const isUpdating = updating === app.id;
            const isGenerating = generating === app.id;
            const newCert = certMap[app.id];
            return (
              <div key={app.id} className="sd-table-row sd-cert-cols">
                <span className="sd-table-ref">{app.application_number}</span>
                <span className="sd-table-main">{app.child_first_name} {app.child_last_name}</span>
                <span><span className={`sd-type-badge sd-type-${appType.toLowerCase()}`}>{appType}</span></span>
                <span className="sd-table-muted">{fmtDate(app.updated_at)}</span>
                <span><StatusBadge status={app.status} /></span>
                <span className="sd-cert-actions">
                  {app.status === 'PAYMENT_COMPLETED' && !newCert && (
                    <button className="sd-cert-btn sd-cert-btn-gold" onClick={() => generateCertificate(app)} disabled={isGenerating}>
                      {isGenerating ? <span className="sd-spinner" /> : <Award size={12} />}
                      Generate Certificate
                    </button>
                  )}
                  {(app.status === 'PAYMENT_COMPLETED' && newCert) && (
                    <>
                      <button className="sd-cert-btn sd-cert-btn-blue" onClick={() => markProcessing(app)} disabled={isUpdating}>
                        {isUpdating ? <span className="sd-spinner" /> : <Printer size={12} />}
                        Start Printing
                      </button>
                      <button className="sd-cert-btn sd-cert-btn-outline" onClick={() => downloadCert(newCert.certificate_number, app.application_number)}>
                        <Download size={12} /> PDF
                      </button>
                    </>
                  )}
                  {app.status === 'PROCESSING' && (
                    <button className="sd-cert-btn sd-cert-btn-green" onClick={() => markReady(app)} disabled={isUpdating}>
                      {isUpdating ? <span className="sd-spinner" /> : <CheckCircle size={12} />}
                      Mark Ready
                    </button>
                  )}
                  {app.status === 'READY' && (
                    <span className="sd-cert-done"><CheckCircle size={12} /> Ready for Collection</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={p => load(p)} />
    </div>
  );
}

function OverviewSection({ user }) {
  const { showSnackbar } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const result = await adminApi.staffOverview();
        setData(result);
      } catch {
        showSnackbar('Could not load performance data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [showSnackbar]);

  const queue = data?.queue || {};
  const daily = data?.daily_processed || [];

  const chartData = daily.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }),
    Processed: d.count,
  }));

  const stats = [
    { label: 'Submitted (Awaiting)', value: (queue.submitted || 0).toLocaleString(), icon: ClipboardList, color: 'blue', sub: 'Needs first review' },
    { label: 'Under Review', value: (queue.under_review || 0).toLocaleString(), icon: Eye, color: 'yellow', sub: 'Being processed' },
    { label: 'Approved Today', value: (queue.approved_today || 0).toLocaleString(), icon: CheckCircle, color: 'green', sub: 'Today\'s output' },
    { label: 'Ready for Collection', value: (queue.ready_for_collection || 0).toLocaleString(), icon: Briefcase, color: 'purple', sub: 'Awaiting pickup' },
  ];

  return (
    <div>
      <div className="sd-stats-grid">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="sd-chart-card">
        <div className="sd-chart-header">
          <h3 className="sd-chart-title">Applications Processed (Last 7 Days)</h3>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="Processed" fill="#006B3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={TrendingUp} title="No processing data for this period" sub="Data appears as applications are processed" />
        )}
      </div>

      <div className="sd-info-card">
        <div className="sd-info-card-icon"><Shield size={20} /></div>
        <div>
          <h4 className="sd-info-card-title">Your Staff Responsibilities</h4>
          <ul className="sd-info-card-list">
            <li>Review submitted applications and move them through the workflow</li>
            <li>Verify supporting documents (birth notifications, Ghana Cards, hospital records)</li>
            <li>Generate and confirm certificate printing once applications are approved and paid</li>
            <li>Manage delivery assignments and track certificate dispatch</li>
            <li>Contact your supervisor for applications requiring escalation or special handling</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const notifWrapRef = useRef(null);
  const [section, setSection] = useState('queue');
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [newAppBadge, setNewAppBadge] = useState(0);
  const unreadFetchInFlightRef = useRef(false);
  const listFetchInFlightRef = useRef(false);

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
      if (notification.data?.event === 'application_submitted') {
        window.dispatchEvent(new CustomEvent('bdr:refresh-queue'));
      }
    };

    window.addEventListener('bdr:notification-created', handleIncoming);
    return () => window.removeEventListener('bdr:notification-created', handleIncoming);
  }, []);

  useEffect(() => {
    const handler = () => {
      setNewAppBadge(p => p + 1);
    };
    window.addEventListener('bdr:application-submitted', handler);
    window.addEventListener('bdr:refresh-queue', handler);
    return () => {
      window.removeEventListener('bdr:application-submitted', handler);
      window.removeEventListener('bdr:refresh-queue', handler);
    };
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
      setNotifications((prev) => prev.map((item) => (
        item.id === id ? { ...item, status: 'read' } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      /* ignore */
    }
  };

  const resolveNotifSection = (n) => {
    const d = n.data || {};
    if (d.section === 'data-requests' || (d.reference || '').startsWith('STAT-')) return null;
    const t = (n.notification_type || '').toLowerCase();
    if (t.includes('application') || d.application_id) return 'queue';
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

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/signin', { replace: true });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="sd-layout">
      {sidebarOpen && <div className="sd-mobile-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sd-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sd-sidebar-top">
          <div className="sd-logo-wrap">
            <img src={logo} alt="BDR" className="sd-logo" />
            {sidebarOpen && (
              <div>
                <p className="sd-logo-name">BDR Ghana</p>
                <p className="sd-logo-role">Staff Portal</p>
              </div>
            )}
          </div>
          <button className="sd-collapse-btn" onClick={() => setSidebarOpen(p => !p)}>
            {sidebarOpen ? <ChevronLeft size={15} /> : <Menu size={15} />}
          </button>
        </div>

        <nav className="sd-nav">
          {sidebarOpen && <p className="sd-nav-group">WORK QUEUE</p>}
          {NAV.map(item => {
            const Icon = item.icon;
            const isQueue = item.id === 'queue';
            const showBadge = isQueue && newAppBadge > 0;
            return (
              <button key={item.id}
                className={`sd-nav-item ${section === item.id ? 'active' : ''}`}
                onClick={() => {
                  setSection(item.id);
                  if (isQueue) setNewAppBadge(0);
                  if (window.innerWidth <= 768) setSidebarOpen(false);
                }}
                title={!sidebarOpen ? item.label : undefined}>
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icon size={17} />
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: -5, right: -7,
                      background: '#e53e3e', color: '#fff', borderRadius: '50%',
                      fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1, padding: '0 2px',
                    }}>
                      {newAppBadge > 9 ? '9+' : newAppBadge}
                    </span>
                  )}
                </span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sd-sidebar-footer">
          {sidebarOpen && (
            <div className="sd-user-info">
              <Avatar first={user?.first_name} last={user?.last_name} size={34} />
              <div>
                <p className="sd-user-name">{user?.first_name} {user?.last_name}</p>
                <p className="sd-user-email">{user?.email}</p>
              </div>
            </div>
          )}
          <button className="sd-logout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={15} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className="sd-main">
        <header className="sd-topbar">
          <div className="sd-topbar-left">
            <button className="sd-mobile-menu-btn" onClick={() => setSidebarOpen(p => !p)} aria-label="Toggle menu">
              <Menu size={20} />
            </button>
            <h1 className="sd-topbar-title">{NAV.find(n => n.id === section)?.label || 'Staff Dashboard'}</h1>
          </div>
          <div className="sd-topbar-right">
            <div className="sd-topbar-tools">
              <LanguageSwitcher />
              <button
                className="sd-icon-btn"
                onClick={cycleTheme}
                aria-label={theme === 'light' ? 'Switch to dark mode' : theme === 'dark' ? 'Switch to system theme' : 'Switch to light mode'}
                title={theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System theme'}
              >
                {theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />}
              </button>
            </div>
            <div ref={notifWrapRef} className="sd-notif-wrap">
              <button className="sd-bell-btn" onClick={handleBell}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="sd-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="sd-notif-panel">
                  <div className="sd-notif-hdr">
                    <span>Notifications</span>
                    <div className="sd-notif-actions">
                      <button className="sd-text-btn" onClick={async () => {
                        await notificationsApi.markAllRead();
                        setUnreadCount(0);
                        setNotifications((prev) => prev.map((item) => ({ ...item, status: 'read' })));
                      }}>Mark all read</button>
                      <button type="button" className="sd-notif-close-btn" onClick={() => setNotifOpen(false)} aria-label="Close notifications">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="sd-notif-empty"><BellOff size={22} /><p>No notifications</p></div>
                  ) : notifications.map(n => {
                    const target = resolveNotifSection(n);
                    return (
                      <div key={n.id}
                        className={`sd-notif-item ${n.status !== 'read' ? 'unread' : ''}`}
                        style={{ cursor: target ? 'pointer' : 'default' }}
                        onClick={() => handleNotifClick(n)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                          <p className="sd-notif-title" style={{ flex: 1 }}>{n.title}</p>
                          {target && <ExternalLink size={11} style={{ opacity: 0.4, flexShrink: 0, marginTop: 2 }} />}
                        </div>
                        <p className="sd-notif-msg">{n.message}</p>
                        <p className="sd-notif-time">{fmtDateTime(n.created_at)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sd-topbar-user">
              <Avatar first={user?.first_name} last={user?.last_name} size={30} />
              <span className="sd-topbar-greeting">{greeting()}, {user?.first_name}</span>
            </div>
          </div>
        </header>

        <main className="sd-content">
          {section === 'queue' && <ApplicationsTable statusFilter="" label="Active Applications" />}
          {section === 'review' && <ApplicationsTable statusFilter="UNDER_REVIEW" label="Applications Under Review" />}
          {section === 'payment' && <ApplicationsTable statusFilter="PAYMENT_PENDING" label="Pending Payment" />}
          {section === 'certificates' && <CertificatesSection />}
          {section === 'ready' && <ApplicationsTable statusFilter="READY" label="Applications Ready for Collection" />}
          {section === 'overview' && <OverviewSection user={user} />}
        </main>
      </div>
    </div>
  );
}
