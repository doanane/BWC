import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import { useSnackbar } from '../context/SnackbarContext';
import AuthTopBar from '../components/AuthTopBar';
import logo from '../assets/logo.png';
import './Auth.css';
import './ForgotPassword.css';
import './ResetPassword.css';

function PwCheck({ ok, label }) {
  return (
    <span className="pw-check" style={{ color: ok ? 'var(--success)' : 'var(--text-muted)' }}>
      {ok ? <CheckCircle size={12} /> : <span className="pw-check-empty" />}
      {label}
    </span>
  );
}

export default function ResetPassword() {
  const { success, error: showError } = useSnackbar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      showError('Invalid or missing reset link. Please request a new one.');
    }
  }, [token]);

  const pw = form.password;
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
  };
  const pwValid = Object.values(checks).every(Boolean);
  const match = pw === form.confirm && form.confirm.length > 0;

  const handleSubmit = async e => {
    e.preventDefault();
    if (!pwValid || !match || !token) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, pw);
      setDone(true);
      success('Password reset successfully!');
      setTimeout(() => navigate('/signin', { replace: true }), 3000);
    } catch (err) {
      showError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <AuthTopBar />
        <div className="fp-root">
          <div className="fp-card" style={{ textAlign: 'center' }}>
            <div className="fp-success-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)', margin: '0 auto 20px' }}>
              <XCircle size={48} strokeWidth={1.5} />
            </div>
            <h2 className="fp-title">Invalid Reset Link</h2>
            <p className="fp-desc">This password reset link is invalid or has already been used.</p>
            <Link to="/forgot-password" className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
              Request a New Link
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (done) {
    return (
      <>
        <AuthTopBar />
        <div className="fp-root">
          <div className="fp-card" style={{ textAlign: 'center' }}>
            <div className="fp-success-icon" style={{ margin: '0 auto 20px' }}>
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h2 className="fp-title">Password Reset!</h2>
            <p className="fp-desc">
              Your password has been updated successfully. You are being redirected to
              the sign-in page to log in with your new password.
            </p>
            <div className="rp-redirect-bar">
              <div className="rp-redirect-fill" />
            </div>
            <Link to="/signin" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
              Sign In Now
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthTopBar />
      <div className="fp-root">
        <div className="fp-card">
          <div className="fp-brand">
            <img src={logo} alt="BDR" className="fp-logo" />
            <div>
              <div className="fp-brand-title">Births and Deaths Registry</div>
              <div className="fp-brand-sub">Ministry of Interior, Ghana</div>
            </div>
          </div>

          <h2 className="fp-title">Set a new password</h2>
          <p className="fp-desc">
            Choose a strong password for your account. You will be redirected to sign in
            immediately after resetting.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" htmlFor="rp-password">
                New password <span className="required">*</span>
              </label>
              <div className="pw-wrapper">
                <input
                  id="rp-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter new password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="pw-toggle pw-toggle-labeled"
                  onClick={() => setShowPw(v => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPw ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              {pw.length > 0 && (
                <div className="pw-strength" style={{ marginTop: 8 }}>
                  <PwCheck ok={checks.length} label="8+ characters" />
                  <PwCheck ok={checks.upper} label="Uppercase" />
                  <PwCheck ok={checks.lower} label="Lowercase" />
                  <PwCheck ok={checks.number} label="Number" />
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" htmlFor="rp-confirm">
                Confirm new password <span className="required">*</span>
              </label>
              <div className="pw-wrapper">
                <input
                  id="rp-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className={`form-input ${form.confirm && !match ? 'input-error' : ''}`}
                  placeholder="Confirm new password"
                  value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pw-toggle pw-toggle-labeled"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showConfirm ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              {form.confirm && !match && (
                <p className="form-error">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading || !pwValid || !match}
            >
              {loading ? <><span className="spinner" />Resetting password...</> : 'Reset Password'}
            </button>
          </form>

          <Link to="/forgot-password" className="fp-back-link" style={{ marginTop: 20 }}>
            Request a different reset link
          </Link>
        </div>
      </div>
    </>
  );
}
