import {
  AlertTriangle,
  Award,
  Bell,
  Bot,
  Check,
  CheckCircle,
  ChevronLeft,
  CreditCard,
  FileText,
  Printer,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { appsApi, aiApi } from '../api/client';
import logo from '../assets/logo.png';
import './TrackApplication.css';

const STATUS_STEPS = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'PAYMENT_PENDING',
  'PAYMENT_COMPLETED',
  'PROCESSING',
  'CERTIFICATE_READY',
  'COLLECTED',
];

const STATUS_META = {
  SUBMITTED: { label: 'Submitted', Icon: FileText, color: 'blue' },
  UNDER_REVIEW: { label: 'Under Review', Icon: Search, color: 'yellow' },
  APPROVED: { label: 'Approved', Icon: CheckCircle, color: 'green' },
  PAYMENT_PENDING: { label: 'Payment Pending', Icon: CreditCard, color: 'orange' },
  PAYMENT_COMPLETED: { label: 'Payment Completed', Icon: CheckCircle, color: 'green' },
  PROCESSING: { label: 'Processing', Icon: Settings, color: 'blue' },
  REJECTED: { label: 'Rejected', Icon: XCircle, color: 'red' },
  PENDING_DOCUMENTS: { label: 'Pending Documents', Icon: FileText, color: 'orange' },
  CERTIFICATE_READY: { label: 'Certificate Ready', Icon: Award, color: 'green' },
  COLLECTED: { label: 'Collected', Icon: Bell, color: 'green' },
};

const INFO_CARDS = [
  {
    title: 'Submit Application',
    description: 'Fill out the birth or death registration form online and receive your reference number immediately.',
    Icon: FileText,
  },
  {
    title: 'Track Status',
    description: 'Use your reference number here to track real-time status updates as your application is processed.',
    Icon: Search,
  },
  {
    title: 'Collect Certificate',
    description: 'Once approved, visit any district office with your ID and reference number to collect your certificate.',
    Icon: Award,
  },
  {
    title: 'SMS and Email Alerts',
    description: 'Receive automatic notifications via SMS and email at every stage of your application process.',
    Icon: Bell,
  },
];

function TimelineStep({ step, status, done, active }) {
  const meta = STATUS_META[step] ?? { label: step, Icon: FileText, color: 'blue' };
  const Icon = meta.Icon ?? FileText;
  return (
    <div className={`tl-step ${done ? 'tl-done' : ''} ${active ? 'tl-active' : ''}`}>
      <div className="tl-icon">{done ? <Check size={16} /> : <Icon size={16} />}</div>
      <div className="tl-label">{meta.label}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="track-detail-row">
      <span className="track-detail-label">{label}</span>
      <span className="track-detail-value">{value}</span>
    </div>
  );
}

export default function TrackApplication() {
  const location = useLocation();
  const [ref, setRef] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const summaryFetchedRef = useRef('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialRef = params.get('ref');
    if (!initialRef) return;
    setRef(initialRef);
  }, [location.search]);

  useEffect(() => {
    if (!ref) return;
    const params = new URLSearchParams(location.search);
    const initialRef = params.get('ref');
    if (!initialRef || initialRef !== ref) return;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await appsApi.track(initialRef);
        setResult(data);
      } catch (err) {
        setError(err.message || 'Application not found.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [location.search, ref]);

  const handleTrack = async e => {
    e.preventDefault();
    const trimmed = ref.trim();
    if (!trimmed) { setError('Please enter a reference number.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await appsApi.track(trimmed);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Application not found. Check the reference number and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result) return;
    const key = `${result.reference_number}-${result.status}`;
    if (summaryFetchedRef.current === key) return;
    summaryFetchedRef.current = key;
    setAiSummary('');
    aiApi.statusSummary(
      result.status,
      result.application_type || '',
      result.reference_number || '',
      result.rejection_reason || '',
    ).then(r => { if (r?.summary) setAiSummary(r.summary); }).catch(() => { });
  }, [result]);

  const currentStatus = result?.status ?? '';
  const stepIndex = STATUS_STEPS.indexOf(currentStatus);
  const isRejected = currentStatus === 'REJECTED';
  const isPendingDocs = currentStatus === 'PENDING_DOCUMENTS';
  const CurrentStatusIcon = STATUS_META[currentStatus]?.Icon ?? FileText;

  const printDate = result
    ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';
  const eventDate = result?.date_of_event
    ? new Date(result.date_of_event).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const submittedDate = result?.created_at
    ? new Date(result.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const updatedDate = result?.updated_at
    ? new Date(result.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const applicantName = [result?.applicant_first_name, result?.applicant_last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="track-page">
      {result && (
        <div className="print-doc" aria-hidden="true">
          <div className="print-watermark">
            <img src={logo} alt="" />
          </div>
          <div className="print-header">
            <div className="print-header-left">
              <img src={logo} className="print-logo" alt="Ghana BDR Logo" />
            </div>
            <div className="print-header-center">
              <div className="print-republic">Republic of Ghana</div>
              <div className="print-orgname">Ghana Births and Deaths Registry</div>
              <div className="print-ministry">Ministry of Local Government and Rural Development</div>
              <div className="print-doctitle">Official Application Status Summary</div>
            </div>
            <div className="print-header-right">
              <div className={`print-type-badge print-type-${result.application_type}`}>
                {result.application_type}
              </div>
            </div>
          </div>
          <div className="print-gold-bar" />

          <div className="print-status-row">
            <div className="print-status-label">Current Status</div>
            <div className={`print-status-value print-status-color-${STATUS_META[currentStatus]?.color ?? 'blue'}`}>
              {STATUS_META[currentStatus]?.label ?? currentStatus}
            </div>
          </div>

          <div className="print-section-title">Application Details</div>
          <table className="print-table">
            <tbody>
              <tr>
                <td className="print-td-label">Reference Number</td>
                <td className="print-td-value print-ref">{result.reference_number}</td>
                <td className="print-td-label">Application Type</td>
                <td className="print-td-value">{result.application_type}</td>
              </tr>
              <tr>
                <td className="print-td-label">Applicant Name</td>
                <td className="print-td-value">{applicantName}</td>
                <td className="print-td-label">Date of Event</td>
                <td className="print-td-value">{eventDate}</td>
              </tr>
              <tr>
                <td className="print-td-label">Region</td>
                <td className="print-td-value">{result.region || '—'}</td>
                <td className="print-td-label">District</td>
                <td className="print-td-value">{result.district || '—'}</td>
              </tr>
              <tr>
                <td className="print-td-label">Date Submitted</td>
                <td className="print-td-value">{submittedDate}</td>
                <td className="print-td-label">Last Updated</td>
                <td className="print-td-value">{updatedDate}</td>
              </tr>
            </tbody>
          </table>

          {isRejected && result.rejection_reason && (
            <div className="print-reason-box">
              <div className="print-reason-label">Rejection Reason</div>
              <div className="print-reason-text">{result.rejection_reason}</div>
            </div>
          )}

          {currentStatus === 'CERTIFICATE_READY' && (
            <div className="print-notice">
              Your certificate is ready for collection. Please visit your designated Births and Deaths
              Registry district office with a valid national ID card and this reference number.
            </div>
          )}

          <div className="print-footer">
            <div className="print-footer-auth">
              This document is an official application status summary issued by the Ghana Births and
              Deaths Registry. To verify the authenticity of this document, visit{' '}
              <strong>bdregistry.gov.gh</strong> and enter the reference number above.
            </div>
            <div className="print-footer-meta">
              <span>Printed: {printDate}</span>
              <span>Portal: bdregistry.gov.gh</span>
              <span>Helpline: +233 302 665 125</span>
            </div>
          </div>
        </div>
      )}
      {/* Hero */}
      <div className="track-hero">
        <div className="container">
          <div className="form-page-eyebrow">
            <Search size={14} /> Application Tracker
          </div>
          <h1 className="form-page-title">Track Your Application</h1>
          <p className="form-page-sub">Enter your reference number to check the current status of your birth or death registration.</p>
        </div>
      </div>

      <div className="container track-body">
        {/* Search box */}
        <div className="track-search-card">
          <form onSubmit={handleTrack} className="track-form">
            <div className="track-input-wrap">
              <span className="track-input-icon"><Search size={16} /></span>
              <input
                className="track-input"
                type="text"
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder="e.g. BDR-2024-000123"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary track-btn" disabled={loading}>
              {loading ? <><span className="spinner" />Searching…</> : 'Track'}
            </button>
          </form>
          {error && <p className="track-error"><AlertTriangle size={14} /> {error}</p>}
          <p className="track-hint">
            Your reference number was sent to your email after you submitted an application.
            It starts with <strong>BDR-</strong>.
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className="track-result">
            {/* Status banner */}
            <div className={`track-status-banner track-status-${(STATUS_META[currentStatus]?.color) ?? 'blue'}`}>
              <span className="track-status-icon"><CurrentStatusIcon size={28} /></span>
              <div>
                <div className="track-status-title">{STATUS_META[currentStatus]?.label ?? currentStatus}</div>
                <div className="track-status-ref">Ref: {result.reference_number}</div>
              </div>
              <span className={`badge badge-${result.application_type === 'BIRTH' ? 'success' : 'danger'}`} style={{ marginLeft: 'auto' }}>
                {result.application_type}
              </span>
            </div>

            {/* AI plain-language summary */}
            {aiSummary && (
              <div className="track-ai-summary">
                <div className="track-ai-summary-label">
                  <Bot size={14} /> What this means for you
                  <span className="track-ai-powered">Powered by Gemini + Anthropic</span>
                </div>
                <p>{aiSummary}</p>
              </div>
            )}

            {/* Progress timeline (hide for rejected / pending docs) */}
            {!isRejected && !isPendingDocs && (
              <div className="track-timeline">
                {STATUS_STEPS.map((step, i) => (
                  <TimelineStep
                    key={step}
                    step={step}
                    status={currentStatus}
                    done={i < stepIndex}
                    active={i === stepIndex}
                  />
                ))}
                {/* Connector lines */}
              </div>
            )}

            {isRejected && (
              <div className="track-alert track-alert-red">
                <strong>Application Rejected</strong>
                <p>Your application was rejected. Please contact your nearest district office for more information or resubmit with the required documents.</p>
              </div>
            )}

            {isPendingDocs && (
              <div className="track-alert track-alert-orange">
                <strong>Additional Documents Required</strong>
                <p>Your application is on hold pending additional documents. Check your email for details on what to provide.</p>
              </div>
            )}

            {currentStatus === 'CERTIFICATE_READY' && (
              <div className="track-alert track-alert-green">
                <strong>Certificate Ready for Collection!</strong>
                <p>Your certificate is ready. Visit your selected district office with a valid ID and your reference number to collect it.</p>
              </div>
            )}

            {currentStatus === 'COLLECTED' && (
              <div className="track-alert track-alert-green">
                <strong>Certificate Collected</strong>
                <p>This application is complete. Your certificate has been successfully collected. Thank you for using GBD Registry.</p>
              </div>
            )}

            {/* Details grid */}
            <div className="track-details">
              <h3 className="track-details-title">Application Details</h3>
              <div className="track-details-grid">
                <DetailRow label="Reference Number" value={result.reference_number} />
                <DetailRow label="Application Type" value={result.application_type} />
                <DetailRow label="Applicant Name"
                  value={[result.applicant_first_name, result.applicant_last_name].filter(Boolean).join(' ')} />
                <DetailRow label="Date of Birth / Death" value={result.date_of_event} />
                <DetailRow label="Region" value={result.region} />
                <DetailRow label="District" value={result.district} />
                <DetailRow label="Submitted On" value={result.created_at ? new Date(result.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                <DetailRow label="Last Updated" value={result.updated_at ? new Date(result.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
              </div>
            </div>

            {/* Actions */}
            <div className="track-actions">
              <button className="btn btn-outline" onClick={() => { setResult(null); setRef(''); }}>
                <ChevronLeft size={16} /> Track Another
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print Summary
              </button>
            </div>
          </div>
        )}

        {/* Info cards (shown before search result) */}
        {!result && !loading && (
          <div className="track-info-grid">
            {INFO_CARDS.map(({ title, description, Icon }) => (
              <div key={title} className="track-info-card">
                <div className="track-info-icon"><Icon size={26} /></div>
                <h4>{title}</h4>
                <p>{description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
