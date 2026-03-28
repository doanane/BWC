import { Link } from 'react-router-dom';
import { FileText, CheckCircle, Clock, Users, Shield, Star, ArrowRight, Download } from 'lucide-react';
import './MediaCharter.css';

const COMMITMENTS = [
  {
    icon: Clock,
    title: 'Timely Service Delivery',
    items: [
      'Birth certificate issued within 5 business days of complete submission',
      'Death certificate issued within 3 business days of complete submission',
      'Late registration processed within 10 business days',
      'Extract/true copy requests fulfilled within 2 business days',
    ],
  },
  {
    icon: Users,
    title: 'Professional &amp; Courteous Service',
    items: [
      'All staff wear identification badges and are professionally dressed',
      'Citizens are greeted courteously and treated with dignity and respect',
      'Staff provide clear explanations of procedures and requirements',
      'Service in local languages available at district offices',
    ],
  },
  {
    icon: Shield,
    title: 'Integrity &amp; Accountability',
    items: [
      'No unofficial fees charged beyond prescribed government fees',
      'All official fees are displayed prominently at every office',
      'Receipts issued for every payment made',
      'Complaints resolved within 5 business days of receipt',
    ],
  },
  {
    icon: Star,
    title: 'Quality &amp; Accessibility',
    items: [
      'Digital services available 24/7 via the online portal',
      'Physical offices open Monday to Friday, 8:00 AM – 5:00 PM',
      'Wheelchair-accessible facilities at all regional offices',
      'Mobile registration units deployed to remote communities quarterly',
    ],
  },
];

const FEES = [
  { service: 'Birth Registration (within 12 months)', fee: 'Free', note: 'No charge for timely registration' },
  { service: 'Late Birth Registration (1–5 years)', fee: 'GH₵ 10.00', note: 'Per application' },
  { service: 'Late Birth Registration (above 5 years)', fee: 'GH₵ 20.00', note: 'Per application' },
  { service: 'Death Registration', fee: 'Free', note: 'No charge for timely registration' },
  { service: 'Death Certificate (first copy)', fee: 'GH₵ 5.00', note: '' },
  { service: 'Additional Certificate Copies', fee: 'GH₵ 5.00', note: 'Per copy' },
  { service: 'Extract / True Copy', fee: 'GH₵ 15.00', note: 'Certified extract' },
  { service: 'Name Correction', fee: 'GH₵ 10.00', note: 'Supported by affidavit' },
  { service: 'Verification of Records', fee: 'GH₵ 20.00', note: 'Official verification letter' },
];

export default function MediaCharter() {
  return (
    <div className="charter-page">
      <section className="charter-hero">
        <div className="container">
          <div className="charter-hero-inner">
            <span className="charter-hero-label">Official Document</span>
            <h1 className="charter-hero-title">Client Service Charter</h1>
            <p className="charter-hero-subtitle">
              The Ghana Births and Deaths Registry is committed to providing
              high-quality, efficient, and transparent services to all Ghanaians.
              This charter outlines our commitments to you as our valued client.
            </p>
            <a
              href="#charter-content"
              className="btn charter-cta-btn btn-lg"
            >
              <FileText size={17} /> View Charter
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="charter-content">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Our Pledge</div>
            <h2 className="section-title">Service Commitments</h2>
            <p className="section-sub">
              We pledge to deliver all vital registration services in a professional,
              transparent, and timely manner.
            </p>
          </div>

          <div className="charter-commitments-grid">
            {COMMITMENTS.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="charter-commitment-card">
                  <div className="charter-commitment-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="charter-commitment-title" dangerouslySetInnerHTML={{ __html: c.title }} />
                  <ul className="charter-commitment-list">
                    {c.items.map((item, i) => (
                      <li key={i}>
                        <CheckCircle size={14} className="charter-check" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section charter-fees-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Transparent Pricing</div>
            <h2 className="section-title">Official Fee Schedule</h2>
            <p className="section-sub">
              All fees below are the official government-prescribed charges.
              No additional payments should be made to any officer.
            </p>
          </div>

          <div className="charter-fees-table-wrap">
            <table className="charter-fees-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Fee</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {FEES.map((row, i) => (
                  <tr key={i}>
                    <td>{row.service}</td>
                    <td className={row.fee === 'Free' ? 'charter-fee-free' : 'charter-fee-amount'}>{row.fee}</td>
                    <td className="charter-fee-note">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="charter-fees-disclaimer">
            Fees are set by the Ghana Government and are subject to change. Last updated: January 2025.
          </p>
        </div>
      </section>

      <section className="section charter-complaint-section">
        <div className="container charter-complaint-inner">
          <div className="charter-complaint-text">
            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 12 }}>How to Make a Complaint</h2>
            <p>
              If we fail to meet the commitments in this charter, you have the right to report your
              experience. We take all complaints seriously and commit to investigating and resolving them promptly.
            </p>
            <ul className="charter-complaint-channels">
              <li><CheckCircle size={15} /> Visit any regional BDR office and request a complaints form</li>
              <li><CheckCircle size={15} /> Call our hotline: <strong>0800-BDR-REG (0800-237-734)</strong></li>
              <li><CheckCircle size={15} /> Email: <a href="mailto:complaints@bdregistry.gov.gh">complaints@bdregistry.gov.gh</a></li>
              <li><CheckCircle size={15} /> Use the online contact form on this portal</li>
            </ul>
          </div>
          <div className="charter-complaint-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">
              File a Complaint <ArrowRight size={16} />
            </Link>
            <a
              href="https://bdr.gov.gh/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-lg"
            >
              <Download size={16} /> Charter on bdr.gov.gh
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
