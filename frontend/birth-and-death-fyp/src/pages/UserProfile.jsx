import {
  AlertTriangle,
  Baby,
  Bell,
  Camera,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit3,
  Eye, EyeOff,
  FileText,
  Heart,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Trash2,
  User,
  XCircle
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { appsApi, clearApiCache, usersApi } from '../api/client';
import BackIcon from '../components/BackIcon';
import { SkeletonTableRow } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import './UserProfile.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <User size={16} /> },
  { id: 'apps', label: 'Applications', icon: <FileText size={16} /> },
  { id: 'edit', label: 'Edit Profile', icon: <Edit3 size={16} /> },
  { id: 'password', label: 'Change Password', icon: <Lock size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'danger', label: 'Account Settings', icon: <AlertTriangle size={16} /> },
];

const STATUS_COLOR = {
  SUBMITTED: 'badge-info',
  UNDER_REVIEW: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-error',
  PENDING_DOCUMENTS: 'badge-warning',
  CERTIFICATE_READY: 'badge-success',
  COLLECTED: 'badge-primary',
};

function formatGhanaCard(raw) {
  if (!raw) return '—';
  const clean = raw.replace(/[\s\-]/g, '').toUpperCase();
  if (clean.length <= 3) return clean;
  if (clean.length <= 12) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 12)}-${clean.slice(12, 13)}`;
}

function KycBadge({ status }) {
  if (status === 'VERIFIED') {
    return (
      <span className="badge badge-success">
        <CheckCircle size={11} /> KYC Verified
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="badge badge-warning">
        <Clock size={11} /> KYC Pending
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="badge badge-error">
        <XCircle size={11} /> KYC Rejected
      </span>
    );
  }
  return (
    <span className="badge badge-secondary">
      <Shield size={11} /> KYC Not Started
    </span>
  );
}

function AccountTypeBadge({ accountType }) {
  const label = accountType
    ? accountType.charAt(0).toUpperCase() + accountType.slice(1).toLowerCase()
    : 'Citizen';
  return <span className="badge badge-primary">{label}</span>;
}

function IdRows({ user }) {
  const type = String(user?.account_type || '').toUpperCase();
  const rows = [];

  if (user?.date_of_birth) {
    rows.push(
      <div key="dob" className="pic-row">
        <span>Date of Birth</span>
        <strong>{new Date(user.date_of_birth).toLocaleDateString('en-GB')}</strong>
      </div>
    );
  }

  if (type === 'CITIZEN' && user?.ghana_card_number) {
    rows.push(
      <div key="ghana-card" className="pic-row pic-row-id">
        <span>Ghana Card</span>
        <strong>{formatGhanaCard(user.ghana_card_number)}</strong>
      </div>
    );
  } else if (type === 'RESIDENT') {
    if (user?.passport_number) rows.push(
      <div key="passport" className="pic-row pic-row-id">
        <span>Passport</span><strong>{user.passport_number}</strong>
      </div>
    );
    if (user?.permit_type) rows.push(
      <div key="permit-type" className="pic-row">
        <span>Permit Type</span><strong>{user.permit_type}</strong>
      </div>
    );
    if (user?.permit_number) rows.push(
      <div key="permit-no" className="pic-row pic-row-id">
        <span>Permit No.</span><strong>{user.permit_number}</strong>
      </div>
    );
  } else if (type === 'REFUGEE') {
    if (user?.unhcr_number) rows.push(
      <div key="unhcr" className="pic-row pic-row-id">
        <span>UNHCR Number</span><strong>{user.unhcr_number}</strong>
      </div>
    );
  } else if (type === 'DIPLOMAT') {
    if (user?.diplomatic_id) rows.push(
      <div key="diplomatic-id" className="pic-row pic-row-id">
        <span>Diplomatic ID</span><strong>{user.diplomatic_id}</strong>
      </div>
    );
    if (user?.embassy_mission) rows.push(
      <div key="embassy" className="pic-row">
        <span>Embassy/Mission</span><strong>{user.embassy_mission}</strong>
      </div>
    );
  } else if (type === 'FOREIGNER') {
    if (user?.passport_number) rows.push(
      <div key="passport" className="pic-row pic-row-id">
        <span>Passport</span><strong>{user.passport_number}</strong>
      </div>
    );
    if (user?.visa_type) rows.push(
      <div key="visa" className="pic-row">
        <span>Visa Type</span><strong>{user.visa_type}</strong>
      </div>
    );
  }

  return <>{rows}</>;
}

export default function UserProfile() {
  const { user, updateUser, refreshUser, logout } = useAuth();
  const { success, error: showError } = useSnackbar();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const photoInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [apps, setApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    other_names: user?.other_names || '',
    phone_number: user?.phone_number || '',
    ghana_card_number: user?.ghana_card_number || '',
    region: user?.region || '',
    district: user?.district || '',
    address: user?.address || '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);

  const [notif, setNotif] = useState({
    notification_email: user?.notification_email ?? true,
    notification_sms: user?.notification_sms ?? true,
    notification_push: user?.notification_push ?? true,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setEditForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      other_names: user?.other_names || '',
      phone_number: user?.phone_number || '',
      ghana_card_number: user?.ghana_card_number || '',
      region: user?.region || '',
      district: user?.district || '',
      address: user?.address || '',
    });
  }, [user]);

  useEffect(() => {
    if (tab === 'apps') {
      setLoadingApps(true);
      appsApi.mine().then(data => {
        setApps(Array.isArray(data) ? data : (data?.items ?? []));
      }).catch(() => setApps([])).finally(() => setLoadingApps(false));
    }
  }, [tab]);

  const handlePhotoSelect = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showError('Only JPEG and PNG images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB.');
      e.target.value = '';
      return;
    }

    e.target.value = '';
    setPhotoUploading(true);
    try {
      const updatedUser = await usersApi.uploadPhoto(file);
      if (updatedUser) updateUser(updatedUser);
      try {
        await refreshUser();
      } catch (_) {
        // Keep immediate UI update from upload response if refresh fails.
      }
      success('Profile photo updated.');
    } catch (err) {
      showError(err.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const payload = { ...editForm };
      const isCitizen = String(user?.account_type || '').toUpperCase() === 'CITIZEN';
      if (!isCitizen || !payload.ghana_card_number?.trim()) {
        delete payload.ghana_card_number;
      }

      const updatedUser = await usersApi.update(payload);
      if (updatedUser) updateUser(updatedUser);
      success('Profile updated successfully.');
    } catch (err) {
      showError(err.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePwSubmit = async e => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.old_password) errs.old_password = 'Required';
    if (pwForm.new_password.length < 8) errs.new_password = 'Minimum 8 characters';
    if (!/[A-Z]/.test(pwForm.new_password)) errs.new_password = 'Must contain uppercase letter';
    if (!/\d/.test(pwForm.new_password)) errs.new_password = 'Must contain a number';
    if (pwForm.new_password !== pwForm.confirm) errs.confirm = 'Passwords do not match';
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPwLoading(true);
    try {
      await usersApi.changePassword({
        current_password: pwForm.old_password,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirm,
      });
      success('Password changed successfully.');
      setPwForm({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      showError(err.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const profilePhotoSrc = typeof user?.profile_photo === 'string' ? user.profile_photo.trim() : '';

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="container profile-hero-inner">
          <BackIcon />

          <div className="profile-hero-avatar-wrap">
            <div className="profile-hero-avatar">
              {profilePhotoSrc
                ? <img src={profilePhotoSrc} alt="Profile photo" />
                : initials
              }
            </div>
            <button
              type="button"
              className="profile-avatar-upload-btn"
              onClick={() => photoInputRef.current?.click()}
              aria-label="Upload profile photo"
              title="Upload photo (JPEG or PNG, max 5MB)"
            >
              <Camera size={13} />
            </button>
            {photoUploading && (
              <div className="profile-avatar-spinner">
                <span className="spinner" style={{ width: 22, height: 22, borderWidth: 3 }} />
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
          </div>

          <div className="profile-hero-info">
            <h1 className="profile-hero-name">{user?.first_name} {user?.last_name}</h1>
            <div className="profile-hero-meta">
              <span><Mail size={14} /> {user?.email}</span>
              {user?.phone_number && <span><Phone size={14} /> {user?.phone_number}</span>}
              {user?.region && <span><MapPin size={14} /> {user?.region}</span>}
            </div>
            <div className="profile-hero-badges">
              <KycBadge status={user?.kyc_status} />
              <AccountTypeBadge accountType={user?.account_type} />
            </div>
          </div>

        </div>
      </div>

      <div className="container profile-body">
        <div className="profile-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`profile-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="profile-content">

          {tab === 'overview' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Account Overview</h2>
              <div className="profile-overview-grid">
                <div className="profile-info-card">
                  <h3 className="pic-title">Personal Information</h3>
                  <div className="pic-rows">
                    <div className="pic-row"><span>First Name</span><strong>{user?.first_name || '—'}</strong></div>
                    <div className="pic-row"><span>Last Name</span><strong>{user?.last_name || '—'}</strong></div>
                    <div className="pic-row"><span>Other Names</span><strong>{user?.other_names || '—'}</strong></div>
                    <div className="pic-row"><span>Email</span><strong>{user?.email || '—'}</strong></div>
                    <div className="pic-row"><span>Phone</span><strong>{user?.phone_number || '—'}</strong></div>
                  </div>
                </div>
                <div className="profile-info-card">
                  <h3 className="pic-title">Location</h3>
                  <div className="pic-rows">
                    <div className="pic-row"><span>Region</span><strong>{user?.region || '—'}</strong></div>
                    <div className="pic-row"><span>District</span><strong>{user?.district || '—'}</strong></div>
                    <div className="pic-row"><span>Address</span><strong>{user?.address || '—'}</strong></div>
                  </div>
                </div>
                <div className="profile-info-card">
                  <h3 className="pic-title">Account Details</h3>
                  <div className="pic-rows">
                    <div className="pic-row">
                      <span>Account Type</span>
                      <strong className="text-capitalize">{user?.account_type || '—'}</strong>
                    </div>
                    <div className="pic-row">
                      <span>Status</span>
                      <strong><span className="badge badge-success">Active</span></strong>
                    </div>
                    <div className="pic-row">
                      <span>Member Since</span>
                      <strong>{user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()}</strong>
                    </div>
                    <IdRows user={user} />
                  </div>
                </div>
              </div>
              <div className="profile-quick-actions">
                <Link to="/dashboard" className="pqa-btn">
                  <LayoutDashboard size={18} /> Dashboard <ChevronRight size={14} />
                </Link>
                <Link to="/register/birth" className="pqa-btn">
                  <Baby size={18} /> Register Birth <ChevronRight size={14} />
                </Link>
                <Link to="/register/death" className="pqa-btn">
                  <Heart size={18} /> Register Death <ChevronRight size={14} />
                </Link>
                <Link to="/track" className="pqa-btn">
                  <Clock size={18} /> Track Application <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {tab === 'apps' && (
            <div className="profile-section">
              <h2 className="profile-section-title">My Applications</h2>
              <div className="profile-table-wrap">
                <table className="profile-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Type</th>
                      <th>Applicant</th>
                      <th>Submitted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingApps ? (
                      Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)
                    ) : apps.length === 0 ? (
                      <tr><td colSpan={5} className="profile-empty">
                        <FileText size={32} strokeWidth={1.5} />
                        <p>No applications yet.</p>
                        <Link to="/register/birth" className="btn btn-primary btn-sm">Register a Birth</Link>
                      </td></tr>
                    ) : apps.map(app => {
                      const extra = app.extra_data || {};
                      const appType = (extra.application_type || app.application_type || 'BIRTH').toUpperCase();
                      return (
                        <tr key={app.id}>
                          <td className="ref-cell">{app.application_number || '—'}</td>
                          <td>
                            <span className={`badge ${appType === 'BIRTH' ? 'badge-success' : 'badge-error'}`}>
                              {appType}
                            </span>
                          </td>
                          <td>{[app.child_first_name, app.child_last_name].filter(Boolean).join(' ') || '—'}</td>
                          <td>{app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '—'}</td>
                          <td>
                            <span className={`badge ${STATUS_COLOR[app.status] ?? 'badge-primary'}`}>
                              {app.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'edit' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Edit Profile</h2>
              <form className="profile-form" onSubmit={handleEditSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={editForm.first_name}
                      onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={editForm.last_name}
                      onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Other Names</label>
                  <input className="form-input" value={editForm.other_names}
                    onChange={e => setEditForm(f => ({ ...f, other_names: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Phone Number <span className="profile-locked-badge"><Lock size={11} /> Locked</span>
                  </label>
                  <input className="form-input profile-locked-field" value={editForm.phone_number} readOnly
                    title="Phone number cannot be changed after account creation. Contact support if needed." />
                </div>
                {String(user?.account_type || '').toUpperCase() === 'CITIZEN' && (
                  <div className="form-group">
                    <label className="form-label">
                      Ghana Card Number <span className="profile-locked-badge"><Lock size={11} /> Locked</span>
                    </label>
                    <input className="form-input profile-locked-field" value={editForm.ghana_card_number} readOnly
                      title="Ghana Card number cannot be changed after account creation. Contact support if needed." />
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <input className="form-input" value={editForm.region}
                      onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">District</label>
                    <input className="form-input" value={editForm.district}
                      onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={editForm.address}
                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="profile-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={editLoading}>
                    {editLoading ? <><span className="spinner" />Saving…</> : <><CheckCircle size={15} /> Save Changes</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'password' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Change Password</h2>
              <form className="profile-form" style={{ maxWidth: 460 }} onSubmit={handlePwSubmit}>
                {[
                  { key: 'old_password', label: 'Current Password', placeholder: 'Enter current password', showKey: 'old' },
                  { key: 'new_password', label: 'New Password', placeholder: 'Min 8 chars, 1 uppercase, 1 number', showKey: 'new' },
                  { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password', showKey: 'confirm' },
                ].map(f => (
                  <div className="form-group" key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <div className="pw-wrapper">
                      <input
                        name={f.key}
                        type={showPw[f.showKey] ? 'text' : 'password'}
                        className={`form-input ${pwErrors[f.key] ? 'input-error' : ''}`}
                        value={pwForm[f.key]}
                        onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                      />
                      <button type="button" className="pw-toggle"
                        onClick={() => setShowPw(s => ({ ...s, [f.showKey]: !s[f.showKey] }))}
                        aria-label="Toggle password visibility">
                        {showPw[f.showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {pwErrors[f.key] && <span className="form-error">{pwErrors[f.key]}</span>}
                  </div>
                ))}
                <div className="profile-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                    {pwLoading ? <><span className="spinner" />Changing…</> : <><Lock size={15} /> Change Password</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Notification Preferences</h2>
              <div className="profile-notif-list">
                {[
                  { key: 'notification_email', label: 'Email Updates', desc: 'Receive status updates on your applications via email.' },
                  { key: 'notification_sms', label: 'SMS Alerts', desc: 'Get SMS notifications when your application status changes.' },
                  { key: 'notification_push', label: 'Push Notifications', desc: 'Enable in-app push notifications for real-time updates.' },
                ].map(item => (
                  <div key={item.key} className="profile-notif-item">
                    <div>
                      <div className="pni-label">{item.label}</div>
                      <div className="pni-desc">{item.desc}</div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notif[item.key]}
                        onChange={() => setNotif(n => ({ ...n, [item.key]: !n[item.key] }))}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="profile-form-actions" style={{ marginTop: 24 }}>
                <button
                  className="btn btn-primary"
                  disabled={notifLoading}
                  onClick={async () => {
                    setNotifLoading(true);
                    try {
                      const updated = await usersApi.update({
                        notification_email: notif.notification_email,
                        notification_sms: notif.notification_sms,
                        notification_push: notif.notification_push,
                      });
                      if (updated) updateUser(updated);
                      clearApiCache();
                      success('Notification preferences saved.');
                    } catch (err) {
                      showError(err.message || 'Failed to save preferences.');
                    } finally {
                      setNotifLoading(false);
                    }
                  }}
                >
                  {notifLoading ? <><span className="spinner" />Saving…</> : <><CheckCircle size={15} /> Save Preferences</>}
                </button>
              </div>
            </div>
          )}

          {tab === 'danger' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Account Settings</h2>

              <div className="profile-danger-zone">
                <div className="profile-danger-header">
                  <Trash2 size={20} />
                  <div>
                    <h3>Delete Account</h3>
                    <p>Permanently remove your account and all associated data from the system. This action cannot be undone.</p>
                  </div>
                </div>

                <div className="profile-danger-warning">
                  <AlertTriangle size={15} />
                  <span>All your applications, profile data, and documents will be permanently deleted. Active certificates will remain with the Registry.</span>
                </div>

                <div className="form-group" style={{ maxWidth: 460 }}>
                  <label className="form-label">
                    Type <strong>{user?.email}</strong> to confirm deletion
                  </label>
                  <input
                    className="form-input"
                    placeholder={user?.email}
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                  />
                </div>

                <button
                  className="btn profile-delete-btn"
                  disabled={deleteConfirm !== user?.email || deleteLoading}
                  onClick={async () => {
                    setDeleteLoading(true);
                    try {
                      await usersApi.deleteAccount();
                      logout();
                      navigate('/');
                    } catch (err) {
                      showError(err.message || 'Failed to delete account.');
                      setDeleteLoading(false);
                    }
                  }}
                >
                  {deleteLoading ? <><span className="spinner" />Deleting…</> : <><Trash2 size={15} /> Permanently Delete Account</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
