import { Eye, EyeOff, LogIn, ScanFace } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import logo from '../assets/logo.png';
import AuthTopBar from '../components/AuthTopBar';
import MetaMapButton from '../components/MetaMapButton';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSnackbar } from '../context/SnackbarContext';
import './Auth.css';
// Note: The digital ID login flow assumes the MetaMapButton will return an object containing at least a `verificationId` property upon successful biometric verification. 
function formatGhanaCard(raw) {
  const clean = raw.replace(/[\s\-]/g, '').toUpperCase();
  if (clean.length <= 3) return clean;
  if (clean.length <= 12) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 12)}-${clean.slice(12, 13)}`;
}

export default function SignIn() {
  const { login } = useAuth();
  const { success, error: showError } = useSnackbar();
  const { t, tf } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  function resolveRedirect(user) {
    const role = user?.role;
    if (role === 'admin' || role === 'super_admin') return '/admin';
    if (role === 'staff') return '/staff';
    return from || '/home';
  }
  const defaultTab = location.state?.defaultTab === 'digital' ? 'digital' : 'password';
  const defaultIdType = location.state?.prefillIdType === 'passport' ? 'passport' : 'ghana_card';
  const defaultId = location.state?.prefillIdNumber || '';

  const [tab, setTab] = useState(defaultTab);
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [idType, setIdType] = useState(defaultIdType);
  const [idNumber, setIdNumber] = useState(defaultIdType === 'ghana_card' ? formatGhanaCard(defaultId) : defaultId);

  useEffect(() => {
    if (!location.state) return;

    const shouldConsumeState = Boolean(
      location.state.defaultTab || location.state.prefillIdType || location.state.prefillIdNumber || location.state.infoMessage
    );
    if (!shouldConsumeState) return;

    if (location.state.defaultTab === 'digital') {
      setTab('digital');
    }
    if (location.state.prefillIdType) {
      setIdType(location.state.prefillIdType);
    }
    if (location.state.prefillIdNumber) {
      setIdNumber(
        location.state.prefillIdType === 'ghana_card'
          ? formatGhanaCard(location.state.prefillIdNumber)
          : location.state.prefillIdNumber
      );
    }
    if (location.state.infoMessage) {
      success(location.state.infoMessage);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, success]);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    if (!form.email.includes('@')) {
      showError(t('err_use_registered_email'));
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login({ ...form, remember_me: remember });
      login(data.user, data.access_token, data.refresh_token);
      success(tf('welcome_back_user', { name: data.user.first_name }));
      navigate(resolveRedirect(data.user), { replace: true });
    } catch (err) {
      showError(err.message || t('err_invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleDigitalLogin = async (detail) => {
    const verificationId = detail?.verificationId || detail?.identityId || detail?.identity || detail?._id || '';
    setLoading(true);
    try {
      const body = {};
      if (verificationId) {
        body.verification_id = verificationId;
      }
      if (idType === 'ghana_card' && idNumber.length >= 4) {
        body.ghana_card_number = idNumber.replace(/-/g, '');
      } else if (idType === 'passport' && idNumber.trim()) {
        body.passport_number = idNumber.trim();
      }
      if (!verificationId && !body.ghana_card_number && !body.passport_number) {
        showError(t('err_enter_id_number'));
        setLoading(false);
        return;
      }
      const data = await authApi.digitalIdLogin(body);
      login(data.user, data.access_token, data.refresh_token);
      success(tf('welcome_identity_verified', { name: data.user.first_name }));
      navigate(resolveRedirect(data.user), { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not found')) {
        showError(t('err_no_account_id'));
      } else if (msg.toLowerCase().includes('inactive')) {
        showError(t('err_account_deactivated'));
      } else {
        showError(msg || t('err_identity_verification_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthTopBar />
      <div className="signin-root">
        <div className="signin-left">
          <div className="signin-card">
            <div className="signin-brand">
              <img src={logo} alt="BDR" className="signin-brand-logo" />
              <div>
                <div className="signin-brand-title">{t('one_login')}</div>
                <div className="signin-brand-sub">{t('all_government_services')}</div>
              </div>
            </div>

            <div className="signin-tabs">
              <button
                className={`signin-tab ${tab === 'password' ? 'active' : ''}`}
                onClick={() => setTab('password')}
              >
                <LogIn size={15} /> {t('sign_in_with_password')}
              </button>
              <button
                className={`signin-tab ${tab === 'digital' ? 'active' : ''}`}
                onClick={() => setTab('digital')}
              >
                <ScanFace size={15} /> {t('sign_in_with_digital_id')}
              </button>
            </div>

            {tab === 'password' && (
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="si-email">
                    {t('email_address')} <span className="required">*</span>
                  </label>
                  <input
                    id="si-email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder={t('enter_registered_email')}
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="si-password">
                    {t('password')} <span className="required">*</span>
                  </label>
                  <div className="pw-wrapper">
                    <input
                      id="si-password"
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      className="form-input"
                      placeholder={t('password')}
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="pw-toggle pw-toggle-labeled"
                      onClick={() => setShowPw(p => !p)}
                      aria-label={t('toggle_password_visibility')}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      <span>{showPw ? t('hide_password') : t('show_password')}</span>
                    </button>
                  </div>
                </div>

                <div className="auth-row">
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span>{t('remember_30_days')}</span>
                  </label>
                  <Link to="/forgot-password" className="auth-forgot">{t('forgot_password')}</Link>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={loading}
                >
                  {loading ? <><span className="spinner" />{t('signing_in')}</> : t('sign_in')}
                </button>
              </form>
            )}

            {tab === 'digital' && (
              <div className="signin-digital">
                <div className="signin-digital-icon">
                  <ScanFace size={36} />
                </div>
                <h3 className="signin-digital-title">{t('digital_id_title')}</h3>
                <p className="signin-digital-desc">
                  {t('digital_id_desc')}
                </p>

                <div className="form-group" style={{ textAlign: 'left', marginBottom: 12 }}>
                  <label className="form-label">{t('id_type')} <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={idType}
                    onChange={e => { setIdType(e.target.value); setIdNumber(''); }}
                  >
                    <option value="ghana_card">{t('ghana_card')}</option>
                    <option value="passport">{t('passport_number')}</option>
                  </select>
                </div>

                <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
                  <label className="form-label">
                    {idType === 'ghana_card' ? t('ghana_card_number') : t('passport_number')}
                    {import.meta.env.VITE_METAMAP_CLIENT_ID
                      ? <span className="form-hint" style={{ marginLeft: 6, fontWeight: 400 }}>({t('optional_metamap_scan')})</span>
                      : <span className="required"> *</span>}
                  </label>
                  <input
                    className="form-input"
                    value={idNumber}
                    onChange={e =>
                      setIdNumber(idType === 'ghana_card' ? formatGhanaCard(e.target.value) : e.target.value)
                    }
                    placeholder={idType === 'ghana_card' ? 'GHA-XXXXXXXXX-X' : t('enter_passport_number')}
                    maxLength={idType === 'ghana_card' ? 15 : 20}
                  />
                </div>

                {(import.meta.env.VITE_METAMAP_CLIENT_ID || idNumber.length >= 4) ? (
                  <>
                    {import.meta.env.VITE_METAMAP_CLIENT_ID ? (
                      <>
                        <MetaMapButton
                          userId={null}
                          onComplete={handleDigitalLogin}
                          onExit={() => { }}
                          label={t('scan_id_sign_in')}
                        />
                        <p className="form-hint" style={{ textAlign: 'center', marginTop: 6 }}>
                          {t('metamap_auto_verify')}
                        </p>
                      </>
                    ) : null}
                    {idNumber.length >= 4 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-block btn-lg"
                        style={{ marginTop: import.meta.env.VITE_METAMAP_CLIENT_ID ? 10 : 0 }}
                        disabled={loading}
                        onClick={() => handleDigitalLogin({})}
                      >
                        {loading
                          ? <><span className="spinner" />{t('verifying_identity')}</>
                          : import.meta.env.VITE_METAMAP_CLIENT_ID
                            ? t('sign_in_without_biometric')
                            : t('sign_in_with_digital_id_btn')}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="form-hint" style={{ textAlign: 'center', marginTop: 8 }}>
                    {t('enter_id_to_sign_in')}
                  </p>
                )}

                {loading && (
                  <p className="form-hint" style={{ textAlign: 'center', marginTop: 12 }}>
                    {t('verifying_identity')}
                  </p>
                )}
              </div>
            )}

            <div className="divider">{t('or')}</div>
            <p className="auth-switch">
              {t('no_account_prompt')}{' '}
              <Link to="/register" className="auth-switch-link">{t('sign_up')}</Link>
            </p>
          </div>
        </div>

        <div className="signin-right">
          <div className="signin-right-glass">
            <p className="signin-right-glass-text">
              {t('easy_access_services')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
