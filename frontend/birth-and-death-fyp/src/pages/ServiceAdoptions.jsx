import { Link } from 'react-router-dom';
import {
  Heart, Scale, FileCheck, CheckCircle, AlertTriangle,
  ArrowRight, User, Users, Baby, ClipboardList, Gavel,
} from 'lucide-react';
import './ServiceAdoptions.css';

const REQUIREMENTS = [
  { icon: Gavel, text: 'Certified court adoption order issued by a competent Ghanaian court under the Children\'s Act 560' },
  { icon: User, text: 'Valid identification documents of both adoptive parents (Ghana Card, passport, or driving licence)' },
  { icon: Baby, text: 'Original birth certificate of the adopted child (if previously registered)' },
  { icon: ClipboardList, text: 'Completed adoption registration application form (available at any BDR regional office)' },
  { icon: FileCheck, text: 'Two recent passport-sized photographs of the child (white background)' },
];

const PROCESS_STEPS = [
  {
    step: 1,
    icon: Gavel,
    title: 'File for Court Adoption Order',
    desc: 'Petition the appropriate Ghanaian court with jurisdiction over family matters to obtain a legal adoption order. This must be done before approaching the BDR.',
  },
  {
    step: 2,
    icon: ClipboardList,
    title: 'Submit Documents to BDR',
    desc: 'Present the certified court adoption order together with all supporting documents at the nearest BDR regional office. Staff will verify completeness before acceptance.',
  },
  {
    step: 3,
    icon: FileCheck,
    title: 'BDR Review and Verification',
    desc: 'The Registry reviews all submitted documents, verifies the court order with the issuing court where necessary, and conducts an internal assessment of the application.',
  },
  {
    step: 4,
    icon: Baby,
    title: 'New Birth Certificate Issued',
    desc: 'Upon approval, a new birth certificate is issued in the name of the adoptive parents. The child\'s original birth entry is sealed and remains confidential in the archive.',
  },
  {
    step: 5,
    icon: CheckCircle,
    title: 'Collection',
    desc: 'The adoptive parents are notified to collect the new birth certificate from the district office. Bring your reference number and a valid ID for collection.',
  },
];

const NOTICES = [
  {
    type: 'error',
    icon: AlertTriangle,
    title: 'Court Order is Mandatory',
    text: 'The BDR cannot register an adoption without a valid, certified court adoption order. Informal or traditional adoptions are not recognised under Ghanaian law.',
  },
  {
    type: 'warning',
    icon: AlertTriangle,
    title: 'Processing Time: 10\u201315 Business Days',
    text: 'Due to the legal verification involved, adoption registrations take between 10 and 15 business days from the date of acceptance of a complete application.',
  },
  {
    type: 'info',
    icon: Scale,
    title: 'Original Birth Entry is Sealed',
    text: 'Once adoption is registered, the child\'s original birth entry is sealed by law and is not accessible to the public. Only a court order can authorise access to the sealed record.',
  },
];

export default function ServiceAdoptions() {
  return (
    <div className="adoptions-page">

      <section className="adoptions-hero">
        <div className="container">
          <div className="adoptions-hero-inner">
            <span className="adoptions-hero-label">Family Services</span>
            <h1 className="adoptions-hero-title">Adoption Registration</h1>
            <p className="adoptions-hero-subtitle">
              Register a legal adoption with the Ghana Births and Deaths Registry to obtain
              a new birth certificate for the adopted child, securing their identity and
              full legal recognition under Ghanaian law.
            </p>
          </div>
        </div>
      </section>

      <section className="section adoptions-framework-section">
        <div className="container">
          <div className="adoptions-framework-layout">
            <div className="adoptions-framework-text">
              <div className="section-eyebrow">Legal Framework</div>
              <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 12 }}>
                What is Adoption Registration?
              </h2>
              <p>
                Adoption registration is the process by which a legal adoption, granted by a
                court under the <strong>Children's Act 560</strong> of Ghana, is formally recorded
                in the national vital register. Upon registration, the BDR issues a new birth
                certificate for the child in the names of the adoptive parents, replacing all
                references to the biological parents on the public record.
              </p>
              <p>
                The Ghana Births and Deaths Registry plays a crucial role in safeguarding the
                rights and identity of adopted children. All adoption registrations must be
                backed by a court order and are subject to strict legal verification to prevent
                fraudulent alterations to vital records.
              </p>
            </div>
            <div className="adoptions-framework-card">
              <div className="adoptions-framework-card-icon">
                <Scale size={28} />
              </div>
              <h4>Children's Act 560</h4>
              <p>
                Ghana's Children's Act 560 (1998) governs all adoption matters, including
                eligibility criteria for adoptive parents, the rights of the child, and
                the procedures for obtaining a court adoption order. The BDR operates
                within this legal framework to ensure every registered adoption is lawful
                and fully compliant.
              </p>
              <div className="adoptions-framework-divider" />
              <div className="adoptions-framework-stat">
                <Heart size={16} />
                <span>All adoptions must be sanctioned by a Ghanaian court before BDR registration</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section adoptions-requirements-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Documents Required</div>
            <h2 className="section-title">Requirements</h2>
            <p className="section-subtitle">
              All documents must be originals or certified copies. Photocopies will not be accepted.
            </p>
          </div>
          <div className="adoptions-req-grid">
            {REQUIREMENTS.map((req) => {
              const Icon = req.icon;
              return (
                <div key={req.text} className="adoptions-req-card">
                  <div className="adoptions-req-icon">
                    <Icon size={20} />
                  </div>
                  <p className="adoptions-req-text">{req.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section adoptions-process-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Application Procedure</div>
            <h2 className="section-title">The Registration Process</h2>
            <p className="section-subtitle">
              Follow these five steps to complete your adoption registration with the Ghana BDR.
            </p>
          </div>
          <div className="adoptions-steps">
            {PROCESS_STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="adoptions-step">
                  <div className="adoptions-step-left">
                    <div className="adoptions-step-num">{s.step}</div>
                    {i < PROCESS_STEPS.length - 1 && <div className="adoptions-step-line" />}
                  </div>
                  <div className="adoptions-step-content">
                    <div className="adoptions-step-icon">
                      <Icon size={18} />
                    </div>
                    <div className="adoptions-step-body">
                      <h4 className="adoptions-step-title">{s.title}</h4>
                      <p className="adoptions-step-desc">{s.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section adoptions-notices-section">
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">Before You Apply</div>
            <h2 className="section-title">Important Notices</h2>
          </div>
          <div className="adoptions-notices-list">
            {NOTICES.map((notice) => {
              const Icon = notice.icon;
              return (
                <div key={notice.title} className={`adoptions-notice adoptions-notice--${notice.type}`}>
                  <div className="adoptions-notice-icon">
                    <Icon size={20} />
                  </div>
                  <div className="adoptions-notice-body">
                    <h4 className="adoptions-notice-title">{notice.title}</h4>
                    <p className="adoptions-notice-text">{notice.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="adoptions-cta-section">
        <div className="container">
          <div className="adoptions-cta-inner">
            <div className="adoptions-cta-icon">
              <Users size={30} />
            </div>
            <div className="adoptions-cta-text">
              <h2>Need Assistance with Adoption Registration?</h2>
              <p>
                Our team at any BDR regional office is ready to guide you through the
                adoption registration process. Contact us before visiting to confirm
                your documents are complete.
              </p>
            </div>
            <div className="adoptions-cta-actions">
              <Link to="/contact" className="btn btn-accent btn-lg">
                Contact BDR <ArrowRight size={16} />
              </Link>
              <Link to="/offices" className="btn btn-outline adoptions-cta-outline">
                Find an Office
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
