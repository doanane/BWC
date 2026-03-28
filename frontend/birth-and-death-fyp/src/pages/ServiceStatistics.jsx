import {
  Activity,
  BarChart2,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Globe, GraduationCap,
  Loader,
  MapPin,
  Send,
  Table,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { statisticsApi } from '../api/client';
import './ServiceStatistics.css';

const DATASETS = [
  { icon: TrendingUp, title: 'National Birth & Death Trends', desc: 'Year-by-year national totals for registered births and deaths, covering all 16 regions of Ghana.' },
  { icon: MapPin, title: 'Regional Disaggregation', desc: 'Data broken down by region, district, and municipality to support targeted planning and resource allocation.' },
  { icon: Activity, title: 'Cause-of-Death Data', desc: 'Aggregated and anonymised data on leading causes of death, supporting public health research and policy.' },
  { icon: Users, title: 'Age & Sex Distribution', desc: 'Demographic breakdowns of registered vital events by age group and sex across all years on record.' },
  { icon: BookOpen, title: 'Annual Statistical Bulletins', desc: 'Published official bulletins summarising vital statistics for each calendar year since 1990.' },
];

const WHO_CAN = [
  { icon: GraduationCap, label: 'Academic Institutions', desc: 'Universities, research institutes, and postgraduate students conducting demographic studies.' },
  { icon: Building2, label: 'Government Agencies', desc: 'Ministries, departments, and agencies requiring official vital statistics for national planning.' },
  { icon: Globe, label: 'International Organisations', desc: 'UN agencies, WHO, World Bank, and other multilateral bodies reporting on Ghana\'s vital statistics.' },
  { icon: Briefcase, label: 'NGOs & Think Tanks', desc: 'Non-governmental organisations and policy research institutions working on development issues.' },
  { icon: FileText, label: 'Independent Researchers', desc: 'Professional researchers and consultants with a defined and legitimate research purpose.' },
];

const FEE_SCHEDULE = [
  { category: 'Government Agencies', fee: 'Free', note: 'All MDAs and state institutions', highlight: 'success' },
  { category: 'Academic & NGO', fee: 'GH\u20b5 50.00', note: 'Per dataset or bulletin', highlight: '' },
  { category: 'Commercial Use', fee: 'GH\u20b5 200.00', note: 'Per dataset for commercial purposes', highlight: '' },
];

const DATA_TYPES = [
  { id: 'national', label: 'National birth & death trends' },
  { id: 'regional', label: 'Regional breakdown' },
  { id: 'cause', label: 'Cause-of-death data' },
  { id: 'agesex', label: 'Age & sex distribution' },
  { id: 'bulletins', label: 'Annual statistical bulletins' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF Report' },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV' },
];

const ORG_TYPES = [
  { value: '', label: 'Select organisation type...' },
  { value: 'government', label: 'Government Agency (Free)' },
  { value: 'academic', label: 'Academic / Research Institution (GH\u20b5 50)' },
  { value: 'ngo', label: 'NGO / Think Tank (GH\u20b5 50)' },
  { value: 'commercial', label: 'Commercial Entity (GH\u20b5 200)' },
];

const INITIAL_FORM = {
  orgName: '',
  orgType: '',
  contactPerson: '',
  email: '',
  purpose: '',
  dataTypes: [],
  periodFrom: '',
  periodTo: '',
  format: 'pdf',
};

export default function ServiceStatistics() {
  const location = useLocation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState('');

  const [paymentRef, setPaymentRef] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    const payResult = params.get('payment');
    if (ref && ref.startsWith('STAT-') && payResult === 'success') {
      setPaymentRef(ref);
      statisticsApi.getStatus(ref)
        .then(s => setPaymentStatus(s))
        .catch(() => setPaymentStatus({ payment_status: 'paid', reference: ref }));
    }
  }, [location.search]);

  const handleDownload = async () => {
    if (!paymentRef) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const { blob, filename } = await statisticsApi.downloadFile(paymentRef);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err.message || 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCheckbox = (id) => {
    setForm((prev) => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(id)
        ? prev.dataTypes.filter((t) => t !== id)
        : [...prev.dataTypes, id],
    }));
    if (errors.dataTypes) setErrors((prev) => ({ ...prev, dataTypes: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.orgName.trim()) errs.orgName = 'Organisation name is required.';
    if (!form.orgType) errs.orgType = 'Please select your organisation type.';
    if (!form.contactPerson.trim()) errs.contactPerson = 'Contact person name is required.';
    if (!form.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!form.purpose.trim() || form.purpose.trim().length < 30) {
      errs.purpose = 'Please describe your purpose in at least 30 characters.';
    }
    if (form.dataTypes.length === 0) errs.dataTypes = 'Please select at least one data type.';
    if (!form.periodFrom) errs.periodFrom = 'Start year is required.';
    if (!form.periodTo) errs.periodTo = 'End year is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setApiError('');
    try {
      const result = await statisticsApi.submitRequest({
        org_name: form.orgName,
        org_type: form.orgType,
        contact_person: form.contactPerson,
        email: form.email,
        purpose: form.purpose,
        data_types: form.dataTypes,
        period_from: form.periodFrom,
        period_to: form.periodTo,
        format: form.format,
      });
      setApiResult(result);
      setSubmitted(true);
      if (result.requires_payment && result.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (err) {
      setApiError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (paymentRef) {
    return (
      <div className="stats-page">
        <div className="container" style={{ maxWidth: 600, padding: '80px 24px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '40px 36px', textAlign: 'center' }}>
            <CheckCircle size={52} color="#006B3C" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Payment Confirmed
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: '.95rem' }}>
              Reference: <strong>{paymentRef}</strong>
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '.9rem', lineHeight: 1.6 }}>
              Your payment has been received. Your data file has been emailed to you and is ready to download now.
            </p>
            <button
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1rem', padding: '12px 28px' }}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? <Loader size={18} style={{ animation: 'spin .7s linear infinite' }} /> : <Download size={18} />}
              {downloading ? 'Preparing file…' : 'Download Your Data'}
            </button>
            {downloadError && (
              <p style={{ color: '#dc2626', marginTop: 12, fontSize: '.85rem' }}>{downloadError}</p>
            )}
            <p style={{ color: 'var(--text-muted)', marginTop: 20, fontSize: '.8rem' }}>
              If you have any issues, contact us at data@bdregistry.gov.gh with your reference number.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">

      <section className="stats-hero">
        <div className="container">
          <div className="stats-hero-inner">
            <span className="stats-hero-label">Data &amp; Research</span>
            <h1 className="stats-hero-title">Statistics Data Request</h1>
            <p className="stats-hero-subtitle">
              Access vital statistics from the national register for research, policy planning,
              public health analysis, and development work. Data is provided in aggregated and
              anonymised form in compliance with Ghana's Data Protection Act 2012.
            </p>
          </div>
        </div>
      </section>

      <section className="section stats-datasets-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Available Data</div>
            <h2 className="section-title">Available Datasets</h2>
            <p className="section-subtitle">
              The following categories of vital statistics data are available for request from the Ghana BDR.
            </p>
          </div>
          <div className="stats-datasets-grid">
            {DATASETS.map((ds) => {
              const Icon = ds.icon;
              return (
                <div key={ds.title} className="stats-dataset-card">
                  <div className="stats-dataset-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="stats-dataset-title">{ds.title}</h3>
                  <p className="stats-dataset-desc">{ds.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section stats-who-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Eligibility</div>
            <h2 className="section-title">Who Can Request Statistics?</h2>
            <p className="section-subtitle">
              Statistical data is available to the following categories of applicants with a legitimate purpose.
            </p>
          </div>
          <div className="stats-who-grid">
            {WHO_CAN.map((who) => {
              const Icon = who.icon;
              return (
                <div key={who.label} className="stats-who-card">
                  <div className="stats-who-icon">
                    <Icon size={20} />
                  </div>
                  <div className="stats-who-body">
                    <h4 className="stats-who-label">{who.label}</h4>
                    <p className="stats-who-desc">{who.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section stats-fees-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Pricing</div>
            <h2 className="section-title">Fee Schedule</h2>
            <p className="section-subtitle">
              Fees vary by applicant category. All data requests are subject to approval by the Registrar-General.
            </p>
          </div>
          <div className="stats-fees-grid">
            {FEE_SCHEDULE.map((row) => (
              <div key={row.category} className={`stats-fee-card${row.highlight === 'success' ? ' stats-fee-card--free' : ''}`}>
                <div className={`stats-fee-amount${row.highlight === 'success' ? ' stats-fee-amount--free' : ''}`}>
                  {row.fee}
                </div>
                <h4 className="stats-fee-category">{row.category}</h4>
                <p className="stats-fee-note">{row.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section stats-form-section">
        <div className="container">
          <div className="stats-form-layout">
            <div className="stats-form-col">
              <div className="stats-form-card">
                <div className="stats-form-card-header">
                  <BarChart2 size={20} />
                  <h2 className="stats-form-card-title">Data Request Form</h2>
                </div>

                {submitted && apiResult ? (
                  <div className="stats-success-state">
                    <div className="stats-success-icon">
                      <CheckCircle size={40} />
                    </div>
                    <h3>{apiResult.requires_payment ? 'Request Received — Payment Required' : 'Request Submitted Successfully'}</h3>
                    <p>{apiResult.message}</p>
                    <p className="stats-success-ref">Reference: <strong>{apiResult.reference}</strong></p>
                    {apiResult.requires_payment && !apiResult.authorization_url && (
                      <p>Our team will contact you at the email provided with payment instructions.</p>
                    )}
                    {apiResult.requires_payment && apiResult.authorization_url && (
                      <a className="btn btn-primary" href={apiResult.authorization_url}>
                        <CreditCard size={16} style={{ marginRight: 6 }} />
                        Pay GH&#8373; {(+(apiResult.amount_ghs || 0)).toFixed(2)} Now
                      </a>
                    )}
                    <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => { setSubmitted(false); setApiResult(null); setForm(INITIAL_FORM); }}>
                      Submit Another Request
                    </button>
                  </div>
                ) : (
                  <form className="stats-form" onSubmit={handleSubmit} noValidate>
                    {apiError && <p className="form-error" style={{ marginBottom: 12 }}>{apiError}</p>}

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="sf-org">
                          Organisation Name <span className="required">*</span>
                        </label>
                        <input
                          id="sf-org"
                          name="orgName"
                          type="text"
                          className={`form-input${errors.orgName ? ' input-error' : ''}`}
                          placeholder="e.g. University of Ghana"
                          value={form.orgName}
                          onChange={handleChange}
                        />
                        {errors.orgName && <span className="form-error">{errors.orgName}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="sf-orgtype">
                          Organisation Type <span className="required">*</span>
                        </label>
                        <select
                          id="sf-orgtype"
                          name="orgType"
                          className={`form-input${errors.orgType ? ' input-error' : ''}`}
                          value={form.orgType}
                          onChange={handleChange}
                        >
                          {ORG_TYPES.map(o => (
                            <option key={o.value} value={o.value} disabled={!o.value}>{o.label}</option>
                          ))}
                        </select>
                        {errors.orgType && <span className="form-error">{errors.orgType}</span>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="sf-contact">
                          Contact Person <span className="required">*</span>
                        </label>
                        <input
                          id="sf-contact"
                          name="contactPerson"
                          type="text"
                          className={`form-input${errors.contactPerson ? ' input-error' : ''}`}
                          placeholder="Full name of primary contact"
                          value={form.contactPerson}
                          onChange={handleChange}
                        />
                        {errors.contactPerson && <span className="form-error">{errors.contactPerson}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sf-email">
                        Email Address <span className="required">*</span>
                      </label>
                      <input
                        id="sf-email"
                        name="email"
                        type="email"
                        className={`form-input${errors.email ? ' input-error' : ''}`}
                        placeholder="official@organisation.org"
                        value={form.email}
                        onChange={handleChange}
                      />
                      {errors.email && <span className="form-error">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sf-purpose">
                        Purpose of Request <span className="required">*</span>
                      </label>
                      <textarea
                        id="sf-purpose"
                        name="purpose"
                        className={`form-textarea${errors.purpose ? ' input-error' : ''}`}
                        placeholder="Describe the research or planning purpose for which this data will be used..."
                        rows={4}
                        value={form.purpose}
                        onChange={handleChange}
                      />
                      <span className="form-hint">{form.purpose.trim().length} / 30 minimum characters</span>
                      {errors.purpose && <span className="form-error">{errors.purpose}</span>}
                    </div>

                    <div className="form-group">
                      <span className="form-label">
                        Type of Data Required <span className="required">*</span>
                      </span>
                      <div className="stats-checkboxes">
                        {DATA_TYPES.map((dt) => (
                          <label key={dt.id} className="stats-checkbox-label">
                            <input
                              type="checkbox"
                              className="stats-checkbox-input"
                              checked={form.dataTypes.includes(dt.id)}
                              onChange={() => handleCheckbox(dt.id)}
                            />
                            <span className="stats-checkbox-box" />
                            <span>{dt.label}</span>
                          </label>
                        ))}
                      </div>
                      {errors.dataTypes && <span className="form-error">{errors.dataTypes}</span>}
                    </div>

                    <div className="form-group">
                      <span className="form-label">
                        Time Period <span className="required">*</span>
                      </span>
                      <div className="stats-period-row">
                        <div className="form-group">
                          <label className="form-label stats-period-label" htmlFor="sf-from">From</label>
                          <input
                            id="sf-from"
                            name="periodFrom"
                            type="date"
                            className={`form-input${errors.periodFrom ? ' input-error' : ''}`}
                            value={form.periodFrom}
                            onChange={handleChange}
                          />
                          {errors.periodFrom && <span className="form-error">{errors.periodFrom}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label stats-period-label" htmlFor="sf-to">To</label>
                          <input
                            id="sf-to"
                            name="periodTo"
                            type="date"
                            className={`form-input${errors.periodTo ? ' input-error' : ''}`}
                            value={form.periodTo}
                            onChange={handleChange}
                          />
                          {errors.periodTo && <span className="form-error">{errors.periodTo}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <span className="form-label">Preferred Data Format</span>
                      <div className="stats-format-radios">
                        {FORMATS.map((fmt) => (
                          <label key={fmt.value} className="stats-radio-label">
                            <input
                              type="radio"
                              name="format"
                              value={fmt.value}
                              checked={form.format === fmt.value}
                              onChange={handleChange}
                              className="stats-radio-input"
                            />
                            <span className="stats-radio-box" />
                            <span className="stats-radio-text">
                              {fmt.value === 'pdf' && <FileText size={14} />}
                              {fmt.value === 'excel' && <Table size={14} />}
                              {fmt.value === 'csv' && <FileSpreadsheet size={14} />}
                              {fmt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-lg btn-block"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <><span className="spinner" aria-hidden="true" /> Submitting Request...</>
                      ) : (
                        <><Send size={17} /> Submit Data Request</>
                      )}
                    </button>

                    <p className="stats-form-note">
                      By submitting this form you confirm that the data will be used solely for
                      the stated purpose. Misuse of BDR statistical data is a violation of the
                      Statistical Service Act and the Data Protection Act 2012.
                    </p>

                  </form>
                )}
              </div>
            </div>

            <div className="stats-sidebar-col">
              <div className="stats-sidebar-card">
                <div className="stats-sidebar-header">
                  <BarChart2 size={18} />
                  <h3>Data Policy</h3>
                </div>
                <div className="stats-sidebar-body">
                  <div className="stats-policy-item">
                    <CheckCircle size={15} />
                    <span>All data is provided in aggregated, anonymised form only. Individual records are never disclosed.</span>
                  </div>
                  <div className="stats-policy-item">
                    <CheckCircle size={15} />
                    <span>Requests are reviewed within 5\u20137 business days by the Research &amp; Statistics Unit.</span>
                  </div>
                  <div className="stats-policy-item">
                    <CheckCircle size={15} />
                    <span>Applicants must provide a letter of authorisation on official letterhead for institutional requests.</span>
                  </div>
                  <div className="stats-policy-item">
                    <CheckCircle size={15} />
                    <span>Data provided under this service may be cited as: "Ghana Births &amp; Deaths Registry, [Year]".</span>
                  </div>
                  <div className="stats-policy-item">
                    <CheckCircle size={15} />
                    <span>Commercial redistribution or resale of BDR statistical data without written consent is prohibited.</span>
                  </div>
                </div>
              </div>

              <div className="stats-contact-card">
                <h4>Research Unit Contact</h4>
                <p>For queries about available data or to discuss your research requirements:</p>
                <div className="stats-contact-line">
                  <strong>Email:</strong>
                  <a href="mailto:statistics@bdregistry.gov.gh">statistics@bdregistry.gov.gh</a>
                </div>
                <div className="stats-contact-line">
                  <strong>Phone:</strong>
                  <span>+233 302 665 125 Ext. 204</span>
                </div>
                <div className="stats-contact-line">
                  <strong>Hours:</strong>
                  <span>Monday to Friday, 8:00 AM to 5:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
