import {
  ArrowRight,
  Briefcase,
  Building2, CheckCircle,
  Clock,
  Code2,
  FileSearch,
  Globe,
  GraduationCap,
  Mail, Printer,
  Scale,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useState } from 'react';
import BackIcon from '../components/BackIcon';
import { recordsApi } from '../api/client';
import './ServiceVerification.css';

const VERIFICATION_TYPES = [
  { icon: FileSearch, label: 'Birth Record Verification', desc: 'Confirm that a birth registration entry exists and is authentic within the national register.' },
  { icon: FileSearch, label: 'Death Record Verification', desc: 'Verify the accuracy and authenticity of a death registration including date, cause, and registered information.' },
  { icon: ShieldCheck, label: 'Certificate Authenticity', desc: 'Confirm that a physical birth or death certificate was issued by the BDR and has not been tampered with.' },
  { icon: User, label: 'Identity Confirmation', desc: 'Validate that a person\'s registered identity details match the information held in the vital register.' },
];

const WHO_NEEDS = [
  { icon: Briefcase, label: 'Employers', desc: 'Verifying job applicants\' identity and background documents before employment.' },
  { icon: GraduationCap, label: 'Universities & Schools', desc: 'Confirming the authenticity of certificates submitted during admissions processes.' },
  { icon: Globe, label: 'Immigration Offices', desc: 'Authenticating vital documents submitted in support of visa and residency applications.' },
  { icon: Building2, label: 'Insurance Companies', desc: 'Verifying death and birth records for claims processing and policy eligibility checks.' },
  { icon: Scale, label: 'Courts & Legal Firms', desc: 'Obtaining official verification letters for use as evidence in legal proceedings.' },
];

const HOW_STEPS = [
  {
    step: 1,
    icon: FileSearch,
    title: 'Complete the Request Form',
    desc: 'Fill in the online verification request form below with the certificate number, type of record, and date of issue.',
  },
  {
    step: 2,
    icon: Send,
    title: 'Run Search (Section 39)',
    desc: 'Submit your reference. The report states whether the record is registered and, if found, provides only the registration number.',
  },
  {
    step: 3,
    icon: CheckCircle,
    title: 'Proceed to Formal Service if Needed',
    desc: 'For certified copies or formal verification letters, continue to the Extracts service and complete the prescribed application process.',
  },
];

const INITIAL_FORM = { certNumber: '', recordType: '', dateOfIssue: '' };

export default function ServiceVerification() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [searchResult, setSearchResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.certNumber.trim()) errs.certNumber = 'Certificate number is required.';
    if (!form.recordType) errs.recordType = 'Please select a record type.';
    if (!form.dateOfIssue) errs.dateOfIssue = 'Date of issue is required.';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setApiError('');
    setSubmitting(true);

    recordsApi.searchRecords(form.recordType.toUpperCase(), form.certNumber.trim())
      .then((result) => {
        setSearchResult(result);
      })
      .catch((err) => {
        setApiError(err.message || 'Could not complete record search. Please try again.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="verify-page">

      <section className="verify-hero">
        <div className="container">
          <div className="verify-hero-inner">
            <BackIcon />
            <span className="verify-hero-label">Authentication Services</span>
            <h1 className="verify-hero-title">Record Verification</h1>
            <p className="verify-hero-subtitle">
              Official verification of birth and death records for employment, immigration,
              education, insurance, and legal purposes. Trusted by institutions across Ghana
              and internationally recognised.
            </p>
          </div>
        </div>
      </section>

      <section className="section verify-types-section">
        <div className="container">
          <div className="verify-two-col">
            <div className="verify-types-left">
              <div className="section-eyebrow">What We Verify</div>
              <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 14 }}>
                Verification Types
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: 28 }}>
                The Ghana BDR provides official verification for four categories of record.
                All results are issued on official letterhead bearing the Registrar-General's signature.
              </p>
              <div className="verify-types-list">
                {VERIFICATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.label} className="verify-type-item">
                      <div className="verify-type-icon">
                        <Icon size={18} />
                      </div>
                      <div className="verify-type-body">
                        <h4 className="verify-type-label">{type.label}</h4>
                        <p className="verify-type-desc">{type.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="verify-process-card">
              <div className="verify-process-card-header">
                <ShieldCheck size={22} />
                <h3>The Official Verification Process</h3>
              </div>
              <div className="verify-process-body">
                <p>
                  Every verification request is handled directly by a trained BDR officer
                  who cross-references the submitted details against the original entry in
                  the national vital register.
                </p>
                <div className="verify-process-steps">
                  <div className="verify-process-step">
                    <CheckCircle size={15} />
                    <span>Details checked against the national vital register</span>
                  </div>
                  <div className="verify-process-step">
                    <CheckCircle size={15} />
                    <span>Certificate security features physically inspected where applicable</span>
                  </div>
                  <div className="verify-process-step">
                    <CheckCircle size={15} />
                    <span>Official verification letter issued on government letterhead</span>
                  </div>
                  <div className="verify-process-step">
                    <CheckCircle size={15} />
                    <span>Verification reference number provided for future reference</span>
                  </div>
                  <div className="verify-process-step">
                    <CheckCircle size={15} />
                    <span>Digital copy emailed and/or printed copy available for collection</span>
                  </div>
                </div>
                <div className="verify-seal-badge">
                  <ShieldCheck size={16} />
                  <span>Results bear the official seal of the Ghana BDR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section verify-who-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Institutional Use</div>
            <h2 className="section-title">Who Needs Verification?</h2>
            <p className="section-subtitle">
              Verification is commonly requested by the following types of organisations and institutions.
            </p>
          </div>
          <div className="verify-who-grid">
            {WHO_NEEDS.map((who) => {
              const Icon = who.icon;
              return (
                <div key={who.label} className="verify-who-card">
                  <div className="verify-who-icon">
                    <Icon size={22} />
                  </div>
                  <h4 className="verify-who-label">{who.label}</h4>
                  <p className="verify-who-desc">{who.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section verify-how-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">How to Get Started</div>
            <h2 className="section-title">How to Request Verification</h2>
          </div>
          <div className="verify-how-steps">
            {HOW_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="verify-how-step">
                  <div className="verify-how-step-num">{s.step}</div>
                  <div className="verify-how-step-icon">
                    <Icon size={20} />
                  </div>
                  <h4 className="verify-how-step-title">{s.title}</h4>
                  <p className="verify-how-step-desc">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section verify-form-section">
        <div className="container">
          <div className="verify-form-layout">
            <div className="verify-form-col">
              <div className="verify-form-card">
                <div className="verify-form-card-header">
                  <FileSearch size={20} />
                  <h2 className="verify-form-card-title">Online Search of Records (Act 1027, Section 39)</h2>
                </div>

                {searchResult ? (
                  <div className="verify-success-state">
                    <div className="verify-success-icon">
                      <CheckCircle size={40} />
                    </div>
                    <h3>{searchResult.registered ? 'Record Located' : 'No Registered Record Found'}</h3>
                    <p>
                      {searchResult.report}
                    </p>
                    {searchResult.registration_number && (
                      <p>
                        <strong>Registration Number:</strong> {searchResult.registration_number}
                      </p>
                    )}
                    <p className="verify-form-note" style={{ marginTop: 8 }}>
                      Legal basis: {searchResult.legal_basis || 'Act 1027 section 39'}
                    </p>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setSearchResult(null);
                        setApiError('');
                      }}
                    >
                      Run Another Search
                    </button>
                  </div>
                ) : (
                  <form className="verify-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                      <label className="form-label" htmlFor="vf-cert">
                        Certificate Number <span className="required">*</span>
                      </label>
                      <input
                        id="vf-cert"
                        name="certNumber"
                        type="text"
                        className={`form-input${errors.certNumber ? ' input-error' : ''}`}
                        placeholder="e.g. GH-2020-BR-00012345"
                        value={form.certNumber}
                        onChange={handleChange}
                      />
                      {errors.certNumber && <span className="form-error">{errors.certNumber}</span>}
                      <span className="form-hint">Found at the top or bottom of the certificate.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="vf-type">
                        Type of Record <span className="required">*</span>
                      </label>
                      <select
                        id="vf-type"
                        name="recordType"
                        className={`form-select${errors.recordType ? ' input-error' : ''}`}
                        value={form.recordType}
                        onChange={handleChange}
                      >
                        <option value="">Select record type...</option>
                        <option value="birth">Birth Record</option>
                        <option value="death">Death Record</option>
                      </select>
                      {errors.recordType && <span className="form-error">{errors.recordType}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="vf-date">
                        Date of Issue <span className="required">*</span>
                      </label>
                      <input
                        id="vf-date"
                        name="dateOfIssue"
                        type="date"
                        className={`form-input${errors.dateOfIssue ? ' input-error' : ''}`}
                        value={form.dateOfIssue}
                        onChange={handleChange}
                      />
                      {errors.dateOfIssue && <span className="form-error">{errors.dateOfIssue}</span>}
                      <span className="form-hint">The date printed on the certificate you wish to verify.</span>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-lg btn-block"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <><span className="spinner" aria-hidden="true" /> Processing...</>
                      ) : (
                        <><Send size={17} /> Run Record Search</>
                      )}
                    </button>

                    {apiError && <span className="form-error">{apiError}</span>}

                    <p className="verify-form-note">
                      This search result follows Act 1027 section 39 and returns only whether
                      the record is registered and the registration number (if found).
                      For certified copies or formal letters, apply through the official extracts/verification process.
                    </p>
                  </form>
                )}
              </div>
            </div>

            <div className="verify-response-col">
              <div className="verify-response-card">
                <div className="verify-response-header">
                  <Clock size={18} />
                  <h3>Response Time &amp; Delivery</h3>
                </div>
                <div className="verify-response-body">
                  <div className="verify-response-item">
                    <div className="verify-response-item-icon verify-response-item-icon--primary">
                      <Clock size={16} />
                    </div>
                    <div>
                      <strong>1\u20133 Business Days</strong>
                      <p>Standard verification requests are processed and results issued within 1 to 3 business days of payment confirmation.</p>
                    </div>
                  </div>
                  <div className="verify-response-item">
                    <div className="verify-response-item-icon">
                      <Mail size={16} />
                    </div>
                    <div>
                      <strong>Email Delivery</strong>
                      <p>A digital verification letter is sent to the email address provided at the time of request.</p>
                    </div>
                  </div>
                  <div className="verify-response-item">
                    <div className="verify-response-item-icon">
                      <Printer size={16} />
                    </div>
                    <div>
                      <strong>Printed Copy</strong>
                      <p>A printed official verification letter on government letterhead is available for collection at your specified BDR office.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="verify-api-card">
                <div className="verify-api-header">
                  <Code2 size={18} />
                  <h3>Institutional &amp; API Access</h3>
                </div>
                <p>
                  Organisations requiring bulk or automated verification (such as large employers,
                  banks, or government agencies) may apply for institutional access to the BDR
                  Verification API.
                </p>
                <ul className="verify-api-features">
                  <li><CheckCircle size={13} /> Automated batch verification</li>
                  <li><CheckCircle size={13} /> Dedicated institutional account</li>
                  <li><CheckCircle size={13} /> Monthly invoicing available</li>
                  <li><CheckCircle size={13} /> Secure API key access with rate limits</li>
                </ul>
                <a href="/contact" className="btn btn-outline btn-sm btn-block" style={{ marginTop: 12 }}>
                  Apply for Institutional Access <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
