import {
  Briefcase, CheckCircle, ChevronLeft,
  Eye, EyeOff, Flag, Globe, Heart, Home,
  Loader, ShieldCheck, UserCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, kycApi } from '../api/client';
import logo from '../assets/logo.png';
import AuthTopBar from '../components/AuthTopBar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSnackbar } from '../context/SnackbarContext';
import './Auth.css';

const METAMAP_CLIENT_ID = import.meta.env.VITE_METAMAP_CLIENT_ID || '';
const METAMAP_FLOW_ID   = import.meta.env.VITE_METAMAP_FLOW_ID   || '';

const ACCOUNT_TYPES = [
  { value: 'citizen',   label: 'Citizen',    desc: 'For Ghana Citizens',           Icon: Flag      },
  { value: 'resident',  label: 'Resident',   desc: 'For Foreign Residents',         Icon: Home      },
  { value: 'refugee',   label: 'Refugee',    desc: 'For Refugees',                  Icon: Heart     },
  { value: 'diplomat',  label: 'Diplomat',   desc: 'For Diplomats within Ghana',    Icon: Briefcase },
  { value: 'foreigner', label: 'Foreigner',  desc: 'For Visitors to Ghana',         Icon: Globe     },
];

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern',
  'Upper East', 'Upper West', 'Volta', 'Brong-Ahafo', 'Oti', 'Savannah',
  'North East', 'Western North', 'Ahafo', 'Bono',
];

const PERMIT_TYPES = ['Work Permit', 'Study Permit', 'Family Reunification', 'Investor Permit', 'Other'];
const VISA_TYPES   = ['Tourist', 'Business', 'Transit', 'Student', 'Work', 'Other'];

const STEPS         = ['Personal Info', 'Contact & Location', 'Security'];
const CITIZEN_STEPS = ['Personal Info', 'Contact & Location', 'Security', 'Identity Verification'];

const TYPE_PANEL = {
  default:  { img: 'https://i.pinimg.com/1200x/7b/c4/7b/7bc47b8b56ad285ecda4a0e85bb2ec4a.jpg',                                               text: "Register for Ghana's official vital records system." },
  citizen:  { img: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200',                     text: 'Register your birth, death, and vital events as a Ghana citizen.' },
  resident: { img: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200',                     text: 'Access government registry services as a legal resident of Ghana.' },
  refugee:  { img: 'https://images.pexels.com/photos/1459505/pexels-photo-1459505.jpeg?auto=compress&cs=tinysrgb&w=1200',                     text: 'Register and access humanitarian civil services through the BDR.' },
  diplomat: { img: 'https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200',                     text: 'Official registry services for diplomatic personnel accredited in Ghana.' },
  foreigner:{ img: 'https://images.pexels.com/photos/2026324/pexels-photo-2026324.jpeg?auto=compress&cs=tinysrgb&w=1200',                     text: 'Register vital events during your time in Ghana.' },
};

function formatGhanaCard(raw = '') {
  const clean = raw.replace(/[\s\-]/g, '').toUpperCase();
  if (clean.length <= 3)  return clean;
  if (clean.length <= 12) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 12)}-${clean.slice(12, 13)}`;
}

function PasswordStrength({ password, t }) {
  const checks = [
    { label: t('pw_length_8'),  ok: password.length >= 8 },
    { label: t('pw_uppercase'), ok: /[A-Z]/.test(password) },
    { label: t('pw_lowercase'), ok: /[a-z]/.test(password) },
    { label: t('pw_number'),    ok: /\d/.test(password) },
  ];
  return (
    <div className="pw-strength">
      {checks.map(({ label, ok }) => (
        <span key={label} className={`pw-check ${ok ? 'ok' : ''}`}>
          {ok ? <CheckCircle size={12} /> : <span className="pw-check-empty" />} {label}
        </span>
      ))}
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export default function SignUp() {
  const { success, error: showError } = useSnackbar();
  const { login, user } = useAuth();
  const { t, tf } = useLanguage();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState(null);
  const [step, setStep]               = useState(0);
  const [loading, setLoading]         = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const [errors, setErrors]           = useState({});
  const [termsChecked, setTermsChecked] = useState(false);

  const [metamapStatus, setMetamapStatus]               = useState('idle');
  const [metamapVerificationId, setMetamapVerificationId] = useState('');
  const [metamapStarted, setMetamapStarted]             = useState(false);
  const attachedBtnRef = useRef(null);

  const accountTypeLabels = {
    citizen:   t('citizen'),
    resident:  t('resident'),
    refugee:   t('refugee'),
    diplomat:  t('diplomat'),
    foreigner: t('foreigner'),
  };

  const accountTypeDescs = {
    citizen:   t('account_type_citizen_desc'),
    resident:  t('account_type_resident_desc'),
    refugee:   t('account_type_refugee_desc'),
    diplomat:  t('account_type_diplomat_desc'),
    foreigner: t('account_type_foreigner_desc'),
  };

  useEffect(() => {
    if (step !== 3 || accountType !== 'citizen') return;

    if (!document.querySelector('script[src*="getmati"]')) {
      const script = document.createElement('script');
      script.src   = 'https://web-button.getmati.com/button.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const handleFinish = async (e) => {
      const detail = e?.detail || {};
      const vid    = detail.verificationId || detail.flowId || detail.identityId || detail.id || '';
      setMetamapVerificationId(vid);
      setMetamapStatus('submitting');
      try {
        await kycApi.submitMetamap(vid || 'sdk_completed', detail);
      } catch (_) {}
      setMetamapStatus('done');
      setTimeout(() => {
        success(t('identity_verification_submitted'));
        navigate('/dashboard');
      }, 2500);
    };

    const handleExit = () => {
      setMetamapStarted(true);
      setMetamapStatus(prev => (prev === 'idle' || prev === 'started') ? 'exited' : prev);
    };

    document.addEventListener('metamap:userFinishedSdk', handleFinish);
    document.addEventListener('mati:userFinishedSdk',    handleFinish);
    document.addEventListener('metamap:exitedSdk',       handleExit);
    document.addEventListener('mati:exitedSdk',          handleExit);

    const attachToButton = () => {
      const el = document.querySelector('metamap-button');
      if (el && el !== attachedBtnRef.current) {
        attachedBtnRef.current = el;
        el.addEventListener('metamap:userFinishedSdk', handleFinish);
        el.addEventListener('mati:userFinishedSdk',    handleFinish);
        el.addEventListener('click', () => setMetamapStarted(true));
      }
    };
    const pollTimer = setInterval(attachToButton, 400);
    attachToButton();

    return () => {
      clearInterval(pollTimer);
      document.removeEventListener('metamap:userFinishedSdk', handleFinish);
      document.removeEventListener('mati:userFinishedSdk',    handleFinish);
      document.removeEventListener('metamap:exitedSdk',       handleExit);
      document.removeEventListener('mati:exitedSdk',          handleExit);
    };
  }, [step, accountType, navigate, success, t]);

  const [form, setForm] = useState({
    first_name: '', last_name: '', other_names: '',
    date_of_birth: '',
    ghana_card_number: '',
    nationality: '',
    passport_number: '',
    permit_number: '', permit_type: '',
    unhcr_number: '',
    diplomatic_id: '', embassy_mission: '', designation: '',
    visa_type: '',
    email: '', phone_number: '',
    region: '', district: '', address: '',
    password: '', confirm_password: '',
  });

  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const onInput = e => set(e.target.name, e.target.value);

  const onGhanaCardInput = e => {
    set('ghana_card_number', formatGhanaCard(e.target.value));
    if (errors.ghana_card_number) setErrors(prev => ({ ...prev, ghana_card_number: '' }));
  };

  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.first_name.trim()) errs.first_name = t('required_field');
      if (!form.last_name.trim())  errs.last_name  = t('required_field');
      if (accountType === 'citizen') {
        if (!form.date_of_birth) errs.date_of_birth = t('required_field');
        if (!form.ghana_card_number.trim()) {
          errs.ghana_card_number = t('ghana_card_required');
        } else if (!/^GHA-\d{9}-\d$/.test(form.ghana_card_number)) {
          errs.ghana_card_number = t('ghana_card_invalid_format');
        }
      }
      if (accountType === 'resident') {
        if (!form.nationality.trim())   errs.nationality   = t('required_field');
        if (!form.passport_number.trim()) errs.passport_number = t('required_field');
        if (!form.permit_number.trim()) errs.permit_number = t('required_field');
        if (!form.permit_type)          errs.permit_type   = t('required_field');
      }
      if (accountType === 'refugee') {
        if (!form.nationality.trim())  errs.nationality  = t('required_field');
        if (!form.date_of_birth)       errs.date_of_birth = t('required_field');
        if (!form.unhcr_number.trim()) errs.unhcr_number = t('required_field');
      }
      if (accountType === 'diplomat') {
        if (!form.nationality.trim())    errs.nationality    = t('required_field');
        if (!form.diplomatic_id.trim())  errs.diplomatic_id  = t('required_field');
        if (!form.embassy_mission.trim()) errs.embassy_mission = t('required_field');
      }
      if (accountType === 'foreigner') {
        if (!form.nationality.trim())    errs.nationality    = t('required_field');
        if (!form.passport_number.trim()) errs.passport_number = t('required_field');
        if (!form.visa_type)             errs.visa_type      = t('required_field');
      }
    }
    if (step === 1) {
      if (!form.email.includes('@')) errs.email = t('valid_email_required');
      if (accountType === 'citizen' && form.phone_number) {
        if (!/^(\+233|0)[0-9]{9}$/.test(form.phone_number))
          errs.phone_number = t('phone_format_gh');
      }
    }
    if (step === 2) {
      const allChecks =
        form.password.length >= 8 &&
        /[A-Z]/.test(form.password) &&
        /[a-z]/.test(form.password) &&
        /\d/.test(form.password);
      if (!allChecks) errs.password = t('password_requirements');
      if (form.password !== form.confirm_password) errs.confirm_password = t('passwords_no_match');
      if (!termsChecked) errs.terms = 'You must agree to the Terms of Service to continue.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const stepNames = {
    'Personal Info':        t('step_personal_info'),
    'Contact & Location':   t('step_contact_location'),
    'Security':             t('step_security'),
    'Identity Verification':t('step_identity_verification'),
  };
  const steps = (accountType === 'citizen' ? CITIZEN_STEPS : STEPS).map(s => stepNames[s] || s);

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => { setErrors({}); setStep(s => s - 1); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (accountType === 'citizen' && step === 2) {
        await authApi.register({ ...form, account_type: accountType });
        const session = await authApi.login({ email: form.email.trim(), password: form.password });
        login(session.user, session.access_token, session.refresh_token);
        success(t('account_created_complete_verification'));
        setStep(3);
        setLoading(false);
        return;
      }
      await authApi.register({ ...form, account_type: accountType });
      success(t('account_created_sign_in'));
      navigate('/signin');
    } catch (err) {
      const msg = err.message || t('registration_failed_try_again');
      if (accountType === 'citizen' && /ghana card number already registered/i.test(msg)) {
        showError(t('ghana_card_registered_continue_digital'));
        navigate('/signin', {
          replace: true,
          state: {
            defaultTab:     'digital',
            prefillIdType:  'ghana_card',
            prefillIdNumber: formatGhanaCard(form.ghana_card_number),
            infoMessage:    t('ghana_card_registered_verify_signin'),
          },
        });
        return;
      }
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualContinue = async () => {
    setMetamapStatus('submitting');
    try {
      const kycStatusRes = await kycApi.status();
      if (
        kycStatusRes?.metamap_verification_id ||
        kycStatusRes?.kyc_status === 'pending'  ||
        kycStatusRes?.kyc_status === 'verified'
      ) {
        setMetamapStatus('done');
        setTimeout(() => {
          success(t('identity_verification_submitted'));
          navigate('/dashboard');
        }, 2000);
        return;
      }
      await kycApi.submitMetamap(metamapVerificationId || '', { manual_confirm: true });
      setMetamapStatus('done');
      setTimeout(() => {
        success(t('identity_verification_submitted'));
        navigate('/dashboard');
      }, 2000);
    } catch (_) {
      setMetamapStatus('exited');
    }
  };

  const handleGoToDashboard = () => {
    success(t('identity_verification_submitted'));
    navigate('/dashboard');
  };

  const internalUserId = String(user?.id || Date.now());

  if (!accountType) {
    const panel = TYPE_PANEL.default;
    return (
      <div className="signup-root">
        <div className="signup-left">
          <div className="signup-mobile-banner" style={{ backgroundImage: `url(${panel.img})` }}>
            <div className="signup-right-overlay" />
            <p className="signup-mobile-banner-text">{panel.text}</p>
          </div>

          <div className="signup-type-card">
            <div className="signin-brand" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <img src={logo} alt="BDR" className="signin-brand-logo" />
              <div>
                <div className="signin-brand-title">{t('ghana_bdr')}</div>
                <div className="signin-brand-sub">{t('births_deaths_registry')}</div>
              </div>
            </div>

            <h1 className="signup-type-title">{t('create_account')}</h1>
            <p className="signup-type-sub">{t('select_account_type')}</p>

            <div className="signup-type-grid">
              {ACCOUNT_TYPES.map(({ value, Icon }) => (
                <button key={value} className="signup-type-item" onClick={() => setAccountType(value)}>
                  <div className="signup-type-icon"><Icon size={24} /></div>
                  <div className="signup-type-label">{accountTypeLabels[value]}</div>
                  <div className="signup-type-desc">{accountTypeDescs[value]}</div>
                </button>
              ))}
            </div>

            <p className="auth-switch" style={{ marginTop: 28 }}>
              {t('already_have_account')}{' '}
              <Link to="/signin" className="auth-switch-link">{t('sign_in')}</Link>
            </p>
          </div>
        </div>

        <div className="signup-right" style={{ backgroundImage: `url(${panel.img})` }}>
          <div className="signup-right-overlay" />
          <div className="signup-right-glass">
            <p className="signup-right-glass-text">{panel.text}</p>
          </div>
        </div>
      </div>
    );
  }

  const typeLabel = accountTypeLabels[accountType] || '';
  const panel     = TYPE_PANEL[accountType] || TYPE_PANEL.default;

  return (
    <>
      <AuthTopBar />
      <div className="signup-root">
        <div className="signup-left">
          <div className="signup-mobile-banner" style={{ backgroundImage: `url(${panel.img})` }}>
            <div className="signup-right-overlay" />
            <p className="signup-mobile-banner-text">{panel.text}</p>
          </div>

          <div className="signup-form-panel">
            <div className="auth-card auth-card-wide">
              <div className="signin-brand">
                <img src={logo} alt="BDR" className="signin-brand-logo" />
                <div>
                  <div className="signin-brand-title">{t('ghana_bdr')}</div>
                  <div className="signin-brand-sub">{t('births_deaths_registry')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <button
                  type="button"
                  className="signup-back-type"
                  onClick={() => { setAccountType(null); setStep(0); setErrors({}); }}
                >
                  <ChevronLeft size={15} /> {t('change_type')}
                </button>
                <span className="signup-type-badge">{typeLabel}</span>
              </div>

              <h1 className="auth-title">{t('create_account')}</h1>
              <p className="auth-subtitle">
                {tf('step_of', { current: step + 1, total: steps.length, name: steps[step] })}
              </p>

              <div className="step-progress">
                {steps.map((s, i) => (
                  <div key={s} className={`step-dot ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                    <span>{i < step ? <CheckCircle size={14} /> : i + 1}</span>
                    <small>{s}</small>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} noValidate>

                {step === 0 && (
                  <div className="auth-form">
                    <div className="form-row">
                      <Field label={t('first_name')} required error={errors.first_name}>
                        <input
                          name="first_name"
                          className={`form-input ${errors.first_name ? 'input-error' : ''}`}
                          value={form.first_name}
                          onChange={onInput}
                          placeholder="e.g. Kofi"
                        />
                      </Field>
                      <Field label={t('last_name')} required error={errors.last_name}>
                        <input
                          name="last_name"
                          className={`form-input ${errors.last_name ? 'input-error' : ''}`}
                          value={form.last_name}
                          onChange={onInput}
                          placeholder="e.g. Mensah"
                        />
                      </Field>
                    </div>

                    <Field label={t('other_names')}>
                      <input
                        name="other_names"
                        className="form-input"
                        value={form.other_names}
                        onChange={onInput}
                        placeholder="Middle name(s)"
                      />
                    </Field>

                    {accountType === 'citizen' && (
                      <>
                        <Field label={t('date_of_birth')} required error={errors.date_of_birth}>
                          <input
                            name="date_of_birth"
                            type="date"
                            className={`form-input ${errors.date_of_birth ? 'input-error' : ''}`}
                            value={form.date_of_birth}
                            onChange={onInput}
                          />
                        </Field>
                        <Field label={t('ghana_card_number')} required error={errors.ghana_card_number}>
                          <input
                            name="ghana_card_number"
                            className={`form-input ${errors.ghana_card_number ? 'input-error' : ''}`}
                            value={form.ghana_card_number}
                            onChange={onGhanaCardInput}
                            placeholder="GHA-XXXXXXXXX-X"
                            maxLength={15}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <span className="form-hint">Format: GHA-000000000-0 &mdash; exactly 13 characters</span>
                        </Field>
                      </>
                    )}

                    {accountType === 'resident' && (
                      <>
                        <Field label={t('nationality')} required error={errors.nationality}>
                          <input name="nationality" className={`form-input ${errors.nationality ? 'input-error' : ''}`}
                            value={form.nationality} onChange={onInput} placeholder="e.g. Nigerian" />
                        </Field>
                        <Field label={t('passport_number')} required error={errors.passport_number}>
                          <input name="passport_number" className={`form-input ${errors.passport_number ? 'input-error' : ''}`}
                            value={form.passport_number} onChange={onInput} placeholder="e.g. A12345678" />
                        </Field>
                        <div className="form-row">
                          <Field label={t('permit_type')} required error={errors.permit_type}>
                            <select name="permit_type" className={`form-select ${errors.permit_type ? 'input-error' : ''}`}
                              value={form.permit_type} onChange={onInput}>
                              <option value="">{t('select_type')}</option>
                              {PERMIT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                            </select>
                          </Field>
                          <Field label={t('permit_number')} required error={errors.permit_number}>
                            <input name="permit_number" className={`form-input ${errors.permit_number ? 'input-error' : ''}`}
                              value={form.permit_number} onChange={onInput} placeholder="Permit / Quota No." />
                          </Field>
                        </div>
                      </>
                    )}

                    {accountType === 'refugee' && (
                      <>
                        <Field label={t('nationality')} required error={errors.nationality}>
                          <input name="nationality" className={`form-input ${errors.nationality ? 'input-error' : ''}`}
                            value={form.nationality} onChange={onInput} placeholder="Country of origin" />
                        </Field>
                        <Field label={t('date_of_birth')} required error={errors.date_of_birth}>
                          <input name="date_of_birth" type="date" className={`form-input ${errors.date_of_birth ? 'input-error' : ''}`}
                            value={form.date_of_birth} onChange={onInput} />
                        </Field>
                        <Field label="UNHCR / Refugee ID Number" required error={errors.unhcr_number}>
                          <input name="unhcr_number" className={`form-input ${errors.unhcr_number ? 'input-error' : ''}`}
                            value={form.unhcr_number} onChange={onInput} placeholder="e.g. GHA-00123456" />
                        </Field>
                      </>
                    )}

                    {accountType === 'diplomat' && (
                      <>
                        <Field label={t('nationality')} required error={errors.nationality}>
                          <input name="nationality" className={`form-input ${errors.nationality ? 'input-error' : ''}`}
                            value={form.nationality} onChange={onInput} placeholder="Country of representation" />
                        </Field>
                        <Field label="Diplomatic ID / Passport No." required error={errors.diplomatic_id}>
                          <input name="diplomatic_id" className={`form-input ${errors.diplomatic_id ? 'input-error' : ''}`}
                            value={form.diplomatic_id} onChange={onInput} placeholder="Diplomatic ID number" />
                        </Field>
                        <Field label="Embassy / Mission Name" required error={errors.embassy_mission}>
                          <input name="embassy_mission" className={`form-input ${errors.embassy_mission ? 'input-error' : ''}`}
                            value={form.embassy_mission} onChange={onInput} placeholder="e.g. Embassy of France" />
                        </Field>
                        <Field label="Designation / Title">
                          <input name="designation" className="form-input" value={form.designation}
                            onChange={onInput} placeholder="e.g. First Secretary" />
                        </Field>
                      </>
                    )}

                    {accountType === 'foreigner' && (
                      <>
                        <Field label={t('nationality')} required error={errors.nationality}>
                          <input name="nationality" className={`form-input ${errors.nationality ? 'input-error' : ''}`}
                            value={form.nationality} onChange={onInput} placeholder="Your nationality" />
                        </Field>
                        <Field label={t('passport_number')} required error={errors.passport_number}>
                          <input name="passport_number" className={`form-input ${errors.passport_number ? 'input-error' : ''}`}
                            value={form.passport_number} onChange={onInput} placeholder="e.g. A12345678" />
                        </Field>
                        <Field label={t('visa_type')} required error={errors.visa_type}>
                          <select name="visa_type" className={`form-select ${errors.visa_type ? 'input-error' : ''}`}
                            value={form.visa_type} onChange={onInput}>
                            <option value="">{t('select_visa_type')}</option>
                            {VISA_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                          </select>
                        </Field>
                      </>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div className="auth-form">
                    <Field label={t('email_address')} required error={errors.email}>
                      <input
                        name="email"
                        type="email"
                        className={`form-input ${errors.email ? 'input-error' : ''}`}
                        value={form.email}
                        onChange={onInput}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </Field>

                    <Field label={t('phone_number')} error={errors.phone_number}>
                      <input
                        name="phone_number"
                        type="tel"
                        className={`form-input ${errors.phone_number ? 'input-error' : ''}`}
                        value={form.phone_number}
                        onChange={onInput}
                        placeholder={accountType === 'citizen' ? '+233XXXXXXXXX or 0XXXXXXXXX' : '+XXXXXXXXXXX'}
                      />
                    </Field>

                    {(accountType === 'citizen' || accountType === 'resident') && (
                      <div className="form-row">
                        <Field label={t('region')}>
                          <select name="region" className="form-select" value={form.region} onChange={onInput}>
                            <option value="">{t('select_region')}</option>
                            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </Field>
                        <Field label={t('district')}>
                          <input name="district" className="form-input" value={form.district}
                            onChange={onInput} placeholder="District name" />
                        </Field>
                      </div>
                    )}

                    <Field label={t('address')}>
                      <input name="address" className="form-input" value={form.address}
                        onChange={onInput} placeholder="House / street address" />
                    </Field>
                  </div>
                )}

                {step === 2 && (
                  <div className="auth-form">
                    <Field label={t('create_password')} required error={errors.password}>
                      <div className="pw-wrapper">
                        <input
                          name="password"
                          type={showPw ? 'text' : 'password'}
                          className={`form-input ${errors.password ? 'input-error' : ''}`}
                          value={form.password}
                          onChange={e => { onInput(e); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
                          placeholder="Min 8 chars, uppercase &amp; number"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="pw-toggle"
                          onClick={() => setShowPw(p => !p)}
                          aria-label={t('toggle_password_visibility')}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <PasswordStrength password={form.password} t={t} />
                    </Field>

                    <Field label={t('confirm_password')} required error={errors.confirm_password}>
                      <input
                        name="confirm_password"
                        type="password"
                        className={`form-input ${errors.confirm_password ? 'input-error' : ''}`}
                        value={form.confirm_password}
                        onChange={e => { onInput(e); if (errors.confirm_password) setErrors(p => ({ ...p, confirm_password: '' })); }}
                        placeholder={t('repeat_password')}
                        autoComplete="new-password"
                      />
                    </Field>

                    <label className="auth-check" style={{ marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={termsChecked}
                        onChange={e => { setTermsChecked(e.target.checked); if (errors.terms) setErrors(p => ({ ...p, terms: '' })); }}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '.85rem' }}>{t('terms_prompt')}</span>
                    </label>
                    {errors.terms && <span className="form-error" style={{ marginTop: 4 }}>{errors.terms}</span>}

                    <div className="kyc-notice">
                      <UserCheck size={16} />
                      <span>{t('identity_notice_after_register')}</span>
                    </div>
                  </div>
                )}

                {step === 3 && accountType === 'citizen' && (
                  <div className="auth-form">
                    {metamapStatus === 'done' ? (
                      <div className="kyc-metamap-success">
                        <ShieldCheck size={48} strokeWidth={1.5} className="kyc-metamap-success-icon" />
                        <h3>{t('identity_verification_complete')}</h3>
                        <p>{t('identity_verification_complete_desc')}</p>
                        <p className="kyc-metamap-redirecting">Redirecting to your dashboard in a moment...</p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ marginTop: 8 }}
                          onClick={handleGoToDashboard}
                        >
                          {t('go_to_dashboard')}
                        </button>
                      </div>
                    ) : metamapStatus === 'submitting' ? (
                      <div className="kyc-metamap-loading">
                        <Loader size={36} className="kyc-spin" />
                        <p>{t('submitting_verification_data')}</p>
                        <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Please wait while we confirm your verification...
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="kyc-notice" style={{ marginBottom: 16 }}>
                          <UserCheck size={16} />
                          <span>{t('verify_identity_instruction')}</span>
                        </div>

                        {metamapStatus === 'exited' && (
                          <div className="kyc-exited-banner">
                            <p>{t('exited_verification_prompt')}</p>
                            <p style={{ fontSize: '.8rem', marginTop: 4 }}>
                              If you completed all steps inside MetaMap, click the confirmation button below.
                              Otherwise, click Verify me again to restart.
                            </p>
                          </div>
                        )}

                        <div className="kyc-metamap-wrap">
                          {METAMAP_CLIENT_ID ? (
                            <metamap-button
                              clientid={METAMAP_CLIENT_ID}
                              flowid={METAMAP_FLOW_ID}
                              metadata={JSON.stringify({ internal_user_id: internalUserId })}
                              style={{ display: 'block', width: '100%' }}
                            />
                          ) : (
                            <div className="kyc-metamap-unavailable">
                              {t('identity_service_unavailable')}
                            </div>
                          )}
                        </div>

                        {(metamapStarted || metamapStatus === 'exited') && (
                          <div className="kyc-manual-done">
                            <p className="kyc-manual-done-hint">
                              Completed all steps in MetaMap including document scan and liveness check?
                              Click the button below to confirm and proceed to your dashboard.
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary btn-block"
                              style={{ justifyContent: 'center' }}
                              onClick={handleManualContinue}
                            >
                              <ShieldCheck size={16} />
                              I have completed all verification steps
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="auth-nav">
                  {step > 0 && step !== 3 && metamapStatus !== 'done' && metamapStatus !== 'submitting' && (
                    <button type="button" className="btn btn-outline" onClick={back}>
                      <ChevronLeft size={16} /> {t('back')}
                    </button>
                  )}

                  {step === 3 && accountType === 'citizen' ? (
                    metamapStatus === 'done' ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ marginLeft: 'auto' }}
                        onClick={handleGoToDashboard}
                      >
                        {t('go_to_dashboard')}
                      </button>
                    ) : null
                  ) : step < steps.length - 1 && step !== 2 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={next}
                      style={{ marginLeft: 'auto' }}
                    >
                      {t('continue')}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                      style={{ marginLeft: 'auto' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner" />
                          {step === 2 && accountType === 'citizen' ? t('creating_account') : t('processing')}
                        </>
                      ) : step === 2 && accountType === 'citizen' ? (
                        t('create_account_continue')
                      ) : (
                        t('create_account')
                      )}
                    </button>
                  )}
                </div>
              </form>

              <p className="auth-switch">
                {t('already_have_account')}{' '}
                <Link to="/signin" className="auth-switch-link">{t('sign_in')}</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="signup-right" style={{ backgroundImage: `url(${panel.img})` }}>
          <div className="signup-right-overlay" />
          <div className="signup-right-glass">
            <p className="signup-right-glass-text">{panel.text}</p>
          </div>
        </div>
      </div>
    </>
  );
}
