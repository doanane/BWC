import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useSnackbar } from '../context/SnackbarContext';
import AuthTopBar from '../components/AuthTopBar';
import logo from '../assets/logo.png';
import './Auth.css';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const { error: showError } = useSnackbar();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

          {sent ? (
            <div className="fp-success">
              <div className="fp-success-icon">
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h2 className="fp-title">Check your email</h2>
              <p className="fp-desc">
                If <strong>{email}</strong> is registered, you will receive a password reset
                link shortly. Please also check your spam or junk folder.
              </p>
              <p className="fp-desc" style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
                The link expires in 1 hour.
              </p>
              <button
                className="btn btn-outline btn-block"
                style={{ marginTop: 24 }}
                onClick={() => { setSent(false); setEmail(''); }}
              >
                Send to a different email
              </button>
              <Link to="/signin" className="fp-back-link">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="fp-icon-wrap">
                <Mail size={28} />
              </div>
              <h2 className="fp-title">Forgot your password?</h2>
              <p className="fp-desc">
                Enter the email address linked to your account and we will send you a
                secure link to reset your password.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" htmlFor="fp-email">
                    Email address <span className="required">*</span>
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    className="form-input"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={loading || !email.trim()}
                >
                  {loading ? <><span className="spinner" />Sending reset link...</> : 'Send Reset Link'}
                </button>
              </form>

              <Link to="/signin" className="fp-back-link">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
