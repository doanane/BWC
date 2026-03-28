import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldX, Search, Loader, ExternalLink, Calendar, MapPin, User, Hash, FileText } from 'lucide-react';
import { certificatesApi } from '../api/client';
import './CertificateVerify.css';

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="cv-info-row">
      <div className="cv-info-icon"><Icon size={15} /></div>
      <div className="cv-info-content">
        <span className="cv-info-label">{label}</span>
        <span className="cv-info-value">{value}</span>
      </div>
    </div>
  );
}

export default function CertificateVerify() {
  const { certNo } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(certNo || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const verify = async (num) => {
    const clean = (num || input).trim().toUpperCase();
    if (!clean) { setError('Please enter a certificate number.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);
    try {
      const data = await certificatesApi.verify(clean);
      setResult(data);
      if (certNo !== clean) {
        navigate(`/certificates/verify/${clean}`, { replace: true });
      }
    } catch (e) {
      setError(e.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certNo) verify(certNo);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    verify(input);
  };

  const fmtDate = (iso) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString('en-GH', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return iso; }
  };

  return (
    <div className="cv-page">
      <div className="cv-hero">
        <div className="cv-hero-inner">
          <div className="cv-hero-badge">
            <ShieldCheck size={18} />
            <span>Secure Certificate Verification</span>
          </div>
          <h1 className="cv-hero-title">Verify Certificate Authenticity</h1>
          <p className="cv-hero-sub">
            Instantly verify any certificate issued by the Ghana Births and Deaths Registry.
            Enter the certificate number printed on the document or scan the QR code.
          </p>

          <form className="cv-search-form" onSubmit={handleSubmit}>
            <div className="cv-search-wrap">
              <Search size={17} className="cv-search-icon" />
              <input
                className="cv-search-input"
                type="text"
                placeholder="e.g. BDR-2026-A1B2C3D4"
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
                spellCheck={false}
              />
            </div>
            <button className="cv-search-btn" type="submit" disabled={loading}>
              {loading ? <Loader size={16} className="cv-spin" /> : <Search size={16} />}
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </button>
          </form>

          {error && (
            <p className="cv-error">{error}</p>
          )}
        </div>
      </div>

      <div className="cv-body">
        {loading && (
          <div className="cv-loading">
            <Loader size={36} className="cv-spin" />
            <p>Checking the registry...</p>
          </div>
        )}

        {!loading && result && result.valid && (
          <div className="cv-card cv-card-valid">
            <div className="cv-card-header cv-card-header-valid">
              <div className="cv-status-icon cv-status-icon-valid">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 className="cv-status-title">Certificate Verified</h2>
                <p className="cv-status-sub">This certificate is authentic and was issued by the Births and Deaths Registry</p>
              </div>
            </div>

            <div className="cv-card-body">
              <div className="cv-section">
                <h3 className="cv-section-title">Certificate Details</h3>
                <div className="cv-info-grid">
                  <InfoRow icon={Hash} label="Certificate Number" value={result.certificate_number} />
                  <InfoRow icon={FileText} label="Application Reference" value={result.application_number} />
                  <InfoRow icon={Calendar} label="Date Issued" value={fmtDate(result.issued_date)} />
                  <InfoRow icon={ShieldCheck} label="Status" value={result.certificate_status?.replace(/_/g, ' ')} />
                </div>
              </div>

              <div className="cv-divider" />

              <div className="cv-section">
                <h3 className="cv-section-title">Subject Information</h3>
                <div className="cv-info-grid">
                  <InfoRow icon={User} label="Full Name" value={result.child_name} />
                  <InfoRow icon={Calendar} label="Date of Birth" value={fmtDate(result.date_of_birth)} />
                  <InfoRow icon={MapPin} label="Place of Birth" value={result.place_of_birth} />
                  <InfoRow icon={MapPin} label="Region" value={result.region} />
                  <InfoRow icon={User} label="Nationality" value={result.nationality} />
                </div>
              </div>

              <div className="cv-divider" />

              <div className="cv-legal-notice">
                <p>
                  <strong>Registry:</strong> {result.registry_name}
                </p>
                <p>
                  <strong>Issued under:</strong> {result.issued_under}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && result && !result.valid && (
          <div className="cv-card cv-card-invalid">
            <div className="cv-card-header cv-card-header-invalid">
              <div className="cv-status-icon cv-status-icon-invalid">
                <ShieldX size={28} />
              </div>
              <div>
                <h2 className="cv-status-title">Verification Failed</h2>
                <p className="cv-status-sub">{result.reason || 'This certificate could not be verified.'}</p>
              </div>
            </div>

            {result.revocation_reason && (
              <div className="cv-card-body">
                <div className="cv-revoke-notice">
                  <p><strong>Revocation Reason:</strong> {result.revocation_reason}</p>
                  {result.revoked_at && (
                    <p><strong>Revoked On:</strong> {fmtDate(result.revoked_at)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && searched && !result && !error && (
          <div className="cv-card cv-card-invalid">
            <div className="cv-card-header cv-card-header-invalid">
              <div className="cv-status-icon cv-status-icon-invalid">
                <ShieldX size={28} />
              </div>
              <div>
                <h2 className="cv-status-title">Certificate Not Found</h2>
                <p className="cv-status-sub">No certificate matching that number exists in the registry.</p>
              </div>
            </div>
          </div>
        )}

        <div className="cv-help-section">
          <h3>How to find your certificate number</h3>
          <div className="cv-help-grid">
            <div className="cv-help-card">
              <div className="cv-help-icon">
                <ExternalLink size={20} />
              </div>
              <h4>Scan QR Code</h4>
              <p>Every certificate issued by BDR contains a QR code. Scan it with any smartphone camera to open this verification page automatically.</p>
            </div>
            <div className="cv-help-card">
              <div className="cv-help-icon">
                <FileText size={20} />
              </div>
              <h4>Certificate Number</h4>
              <p>Look for the certificate number printed near the bottom of your certificate. It starts with <strong>BDR-</strong> followed by the year and an 8-character code.</p>
            </div>
            <div className="cv-help-card">
              <div className="cv-help-icon">
                <ShieldCheck size={20} />
              </div>
              <h4>Why Verify?</h4>
              <p>Verification confirms the certificate is genuine and has not been altered. Institutions accepting BDR certificates can verify here at no cost.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
