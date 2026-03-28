import {
  Baby,
  BookOpen,
  CheckCircle,
  ChevronDown,
  CreditCard,
  FileSearch,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  Settings,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Documentation.css';

const CATEGORIES = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: BookOpen,
    articles: [
      {
        id: 'intro',
        title: 'Introduction to the BDR Portal',
        content: (
          <div className="doc-body">
            <p>
              The Ghana Births and Deaths Registry (BDR) online portal provides citizens
              with secure, convenient access to vital registration services from anywhere
              in Ghana or abroad.
            </p>
            <h4>What You Can Do on This Portal</h4>
            <ul>
              <li>Register a birth or death online</li>
              <li>Request certified true copies (extracts) of registration certificates</li>
              <li>Track the status of any application using a reference number</li>
              <li>Pay statutory fees securely online</li>
              <li>Verify the authenticity of a certificate</li>
              <li>Request anonymised vital statistics data</li>
            </ul>
            <div className="doc-callout doc-callout--info">
              <Globe size={18} />
              <p>
                Some services require creating a free account. Tracking and verification
                can be done without an account using your reference number.
              </p>
            </div>
            <h4>Service Hours</h4>
            <p>
              The portal is available 24/7. However, applications are processed during
              official working hours: <strong>Monday to Friday, 8:00 AM – 5:00 PM GMT</strong>.
              Applications submitted outside working hours will be processed on the
              next working day.
            </p>
          </div>
        ),
      },
      {
        id: 'create-account',
        title: 'Creating an Account',
        content: (
          <div className="doc-body">
            <p>
              Creating an account gives you access to birth and death registration,
              application history, certificate requests, and more.
            </p>
            <div className="doc-steps">
              <div className="doc-step">
                <div className="doc-step-num">1</div>
                <div>
                  <h4>Go to Sign Up</h4>
                  <p>Visit <Link to="/register">/register</Link> or click "Create Account" in the navigation bar.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">2</div>
                <div>
                  <h4>Enter Your Details</h4>
                  <p>Provide your full legal name, date of birth, email address, phone number, and Ghana Card number.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">3</div>
                <div>
                  <h4>Verify Your Identity</h4>
                  <p>Upload a photo of your Ghana Card and take a live selfie for identity verification via the National Identification Authority (NIA).</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">4</div>
                <div>
                  <h4>Verify Your Email</h4>
                  <p>Check your email for a verification link and click it to activate your account.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">5</div>
                <div>
                  <h4>Sign In</h4>
                  <p>Once verified, sign in at <Link to="/signin">/signin</Link> to access all services.</p>
                </div>
              </div>
            </div>
            <div className="doc-callout doc-callout--warning">
              <Shield size={18} />
              <p>
                Ensure the name and date of birth on your Ghana Card exactly match what
                you enter during registration. Mismatches will cause verification failure.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'signin',
        title: 'Signing In & Account Security',
        content: (
          <div className="doc-body">
            <p>Sign in at <Link to="/signin">/signin</Link> using your registered email and password.</p>
            <h4>Security Best Practices</h4>
            <ul>
              <li>Use a strong, unique password (minimum 8 characters, mixed case, numbers, symbols)</li>
              <li>Never share your password with anyone — BDR staff will never ask for your password</li>
              <li>Your session will automatically log out after 15 minutes of inactivity</li>
              <li>Always sign out when using shared or public computers</li>
            </ul>
            <h4>Forgot Your Password?</h4>
            <p>
              Click "Forgot Password" on the sign-in page or visit{' '}
              <Link to="/forgot-password">/forgot-password</Link>. A reset link will be
              sent to your registered email address and expires after 1 hour.
            </p>
            <div className="doc-callout doc-callout--danger">
              <Shield size={18} />
              <p>
                If you suspect your account has been compromised, contact us immediately
                at <a href="mailto:security@bdregistry.gov.gh">security@bdregistry.gov.gh</a>.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'birth-registration',
    label: 'Birth Registration',
    icon: Baby,
    articles: [
      {
        id: 'birth-overview',
        title: 'Birth Registration Overview',
        content: (
          <div className="doc-body">
            <p>
              Birth registration is the official recording of a child's birth by the
              state. In Ghana, birth registration is governed by the
              <strong> Births and Deaths (Registration) Act, 2020 (Act 1027)</strong>.
            </p>
            <h4>Who Must Register</h4>
            <p>
              All births occurring in Ghana must be registered. This includes live births
              at hospitals, clinics, and home births, as well as births of Ghanaian
              children abroad (at the nearest Ghana Embassy).
            </p>
            <h4>Time Limits</h4>
            <div className="doc-info-grid">
              <div className="doc-info-card doc-info-card--green">
                <h5>Free Registration</h5>
                <p>Within 12 months of birth</p>
              </div>
              <div className="doc-info-card doc-info-card--yellow">
                <h5>Late Registration Fee</h5>
                <p>After 12 months — fees apply</p>
              </div>
            </div>
            <h4>Who Can Register</h4>
            <ul>
              <li>The mother or father of the child</li>
              <li>The legal guardian</li>
              <li>The owner or occupier of the premises where the birth occurred</li>
              <li>The attending medical officer or midwife</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'birth-documents',
        title: 'Required Documents',
        content: (
          <div className="doc-body">
            <p>
              Before starting an online birth registration, ensure you have the
              following documents ready to upload:
            </p>
            <div className="doc-checklist">
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Hospital Birth Notification</strong>
                  <p>The official birth notification issued by the hospital, clinic, or birth attendant</p>
                </div>
              </div>
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Parents' Ghana Cards</strong>
                  <p>Valid Ghana Card (National ID) of both parents, or passport for foreign nationals</p>
                </div>
              </div>
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Marriage Certificate (if applicable)</strong>
                  <p>Required for joint registration by married parents</p>
                </div>
              </div>
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Statutory Declaration (for late registration)</strong>
                  <p>A sworn affidavit required if registering more than 12 months after birth</p>
                </div>
              </div>
            </div>
            <h4>Accepted File Formats</h4>
            <p>Documents must be uploaded as JPEG, PNG, or PDF. Maximum file size: 5MB per document.</p>
          </div>
        ),
      },
      {
        id: 'birth-process',
        title: 'Online Registration Process',
        content: (
          <div className="doc-body">
            <div className="doc-steps">
              <div className="doc-step">
                <div className="doc-step-num">1</div>
                <div>
                  <h4>Sign In to Your Account</h4>
                  <p>You must be signed in to submit a birth registration application.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">2</div>
                <div>
                  <h4>Start New Application</h4>
                  <p>Navigate to Services &gt; Birth Registration or visit <Link to="/register/birth">/register/birth</Link>.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">3</div>
                <div>
                  <h4>Enter Child's Information</h4>
                  <p>Provide the child's full name, date and place of birth, gender, and nationality.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">4</div>
                <div>
                  <h4>Enter Parent/Guardian Details</h4>
                  <p>Provide information for both parents or the legal guardian, including their National ID numbers.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">5</div>
                <div>
                  <h4>Upload Supporting Documents</h4>
                  <p>Upload all required documents. Ensure images are clear and legible.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">6</div>
                <div>
                  <h4>Select Collection Office</h4>
                  <p>Choose any BDR district office across Ghana for certificate collection.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">7</div>
                <div>
                  <h4>Pay the Fee (if applicable)</h4>
                  <p>Pay any applicable late registration fees via Paystack (mobile money or card).</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">8</div>
                <div>
                  <h4>Receive Reference Number</h4>
                  <p>After submission, you will receive a unique reference number via email and SMS. Use this to track your application.</p>
                </div>
              </div>
            </div>
            <h4>Processing Time</h4>
            <p>Standard processing: <strong>5–10 working days</strong>. Express service: <strong>2–3 working days</strong> (additional fee applies).</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'death-registration',
    label: 'Death Registration',
    icon: Heart,
    articles: [
      {
        id: 'death-overview',
        title: 'Death Registration Overview',
        content: (
          <div className="doc-body">
            <p>
              Death registration is the legal recording of a person's death. It is
              required before a burial permit can be issued. Under Act 1027, deaths
              are to be registered promptly, with a standard window of <strong>10 days</strong>
              from occurrence; later registration may require late fees and additional
              approval steps.
            </p>
            <h4>Who Must Register</h4>
            <ul>
              <li>Any adult family member of the deceased</li>
              <li>The attending physician or hospital</li>
              <li>The person in charge of the premises where death occurred</li>
              <li>Any person present at the time of death</li>
            </ul>
            <h4>Required Information</h4>
            <ul>
              <li>Full name, date of birth, and nationality of the deceased</li>
              <li>Date, time, and place of death</li>
              <li>Medical cause of death</li>
              <li>Informant's personal details and relationship to the deceased</li>
            </ul>
            <div className="doc-callout doc-callout--warning">
              <Heart size={18} />
              <p>
                For deaths from unknown, suspicious, or violent causes, a post-mortem
                report from a certified pathologist is required before registration can
                be completed.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'death-documents',
        title: 'Required Documents',
        content: (
          <div className="doc-body">
            <div className="doc-checklist">
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Medical Certificate of Cause of Death</strong>
                  <p>Issued by the attending physician, hospital, or coroner</p>
                </div>
              </div>
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Deceased's Identification</strong>
                  <p>Ghana Card, passport, or other valid government-issued ID of the deceased</p>
                </div>
              </div>
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Informant's Ghana Card</strong>
                  <p>Valid national ID of the person reporting the death</p>
                </div>
              </div>
              <div className="doc-check-item">
                <CheckCircle size={16} className="doc-check-icon" />
                <div>
                  <strong>Post-Mortem Report (if applicable)</strong>
                  <p>Required for unnatural, suspicious, or unknown causes of death</p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'legal-framework',
    label: 'Legal Framework (Act 1027)',
    icon: Shield,
    articles: [
      {
        id: 'act-1027-reference',
        title: 'Official Legal Reference',
        content: (
          <div className="doc-body">
            <p>
              Birth and death registration services on this portal are governed by the
              <strong> Registration of Births and Deaths Act, 2020 (Act 1027)</strong>.
            </p>
            <p>
              Official citation: <strong>Act 1027 of 2020</strong>, assented to and commenced
              on <strong>6 October 2020</strong>.
            </p>
            <p>
              Primary reference source:{' '}
              <a
                href="https://ghalii.org/akn/gh/act/2020/1027/eng@2020-10-06"
                target="_blank"
                rel="noopener noreferrer"
              >
                GhaLII - Registration of Birth and Deaths Act, 2020
              </a>
            </p>
            <div className="doc-callout doc-callout--info">
              <Shield size={18} />
              <p>
                This portal provides operational guidance only. Where there is any conflict,
                the text of Act 1027 and any valid court order will prevail.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'act-1027-user-obligations',
        title: 'What Users Must Do Under the Act',
        content: (
          <div className="doc-body">
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>User Requirement</th>
                    <th>How the Portal Supports You</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Section 16</td>
                    <td>Birth notifications should be made within 7 days by authorised notifiers.</td>
                    <td>Birth form captures required event details for district-level processing.</td>
                  </tr>
                  <tr>
                    <td>Section 17</td>
                    <td>Birth registration is free within 12 months; late registration requires fee and reasons.</td>
                    <td>Birth workflow supports required details and late-case review by officers.</td>
                  </tr>
                  <tr>
                    <td>Sections 23-31</td>
                    <td>Deaths must be notified and registered with required certification and records.</td>
                    <td>Death workflow collects informant and event details and supports document upload.</td>
                  </tr>
                  <tr>
                    <td>Section 37</td>
                    <td>Corrections require written application and supporting declaration/affidavit.</td>
                    <td>Users can file correction requests through Contact and tracked support channels.</td>
                  </tr>
                  <tr>
                    <td>Section 39</td>
                    <td>Search reports must state only whether record exists and registration number.</td>
                    <td>Record search service limits output to registration confirmation + registration number.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        id: 'act-1027-service-map',
        title: 'Portal Services Mapped to Act 1027',
        content: (
          <div className="doc-body">
            <ul>
              <li><Link to="/register/birth">Birth Registration</Link> - Sections 16, 17, 19, 20, 21</li>
              <li><Link to="/register/death">Death Registration</Link> - Sections 23 through 31</li>
              <li><Link to="/services/verification">Record Search & Verification</Link> - Section 39</li>
              <li><Link to="/services/extracts">Certified Copy / Extract Services</Link> - Sections 40 and 41</li>
              <li><Link to="/legal/privacy">Data Protection & Access Controls</Link> - Sections 15 and 44</li>
              <li><Link to="/track">Application Tracking</Link> - Supports procedural transparency for applicants</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: 'certificates',
    label: 'Certificates & Extracts',
    icon: FileText,
    articles: [
      {
        id: 'extracts-overview',
        title: 'Requesting a Certified True Copy',
        content: (
          <div className="doc-body">
            <p>
              A Certified True Copy (Extract) is an official copy of an existing birth
              or death registration record, certified by the BDR. It has the same legal
              validity as the original certificate.
            </p>
            <h4>When You Need an Extract</h4>
            <ul>
              <li>The original certificate has been lost or damaged</li>
              <li>Multiple copies are needed (e.g., for passports, school enrolment)</li>
              <li>An international authority requires an apostilled copy</li>
            </ul>
            <h4>How to Apply</h4>
            <p>
              Visit <Link to="/services/extracts">Services &gt; Extracts</Link>, provide
              your application reference number or registration details, and complete the
              request form. Payment is required before processing.
            </p>
            <h4>International Use</h4>
            <p>
              For use abroad, BDR certificates may need to be apostilled at the
              <strong> Ministry of Foreign Affairs and Regional Integration</strong> of Ghana.
              Contact the Ministry for current apostille fees and processing times.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'tracking',
    label: 'Tracking Applications',
    icon: FileSearch,
    articles: [
      {
        id: 'track-overview',
        title: 'How to Track Your Application',
        content: (
          <div className="doc-body">
            <p>
              All applications submitted through this portal are assigned a unique
              reference number. You can use this number to track your application
              status at any time — no account required.
            </p>
            <div className="doc-steps">
              <div className="doc-step">
                <div className="doc-step-num">1</div>
                <div>
                  <h4>Find Your Reference Number</h4>
                  <p>Your reference number was sent to your email and SMS after submission. It is also visible in your dashboard under "My Applications".</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">2</div>
                <div>
                  <h4>Visit Track Application</h4>
                  <p>Navigate to <Link to="/track">/track</Link> and enter your reference number.</p>
                </div>
              </div>
              <div className="doc-step">
                <div className="doc-step-num">3</div>
                <div>
                  <h4>View Status</h4>
                  <p>Your application status will be displayed. Statuses include: Submitted, Under Review, Approved, Ready for Collection, and Collected.</p>
                </div>
              </div>
            </div>
            <h4>Application Status Meanings</h4>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Submitted</td><td>Application received and payment confirmed</td></tr>
                  <tr><td>Under Review</td><td>Being reviewed by BDR staff</td></tr>
                  <tr><td>Pending Documents</td><td>Additional documents required — check email</td></tr>
                  <tr><td>Approved</td><td>Application approved, certificate being prepared</td></tr>
                  <tr><td>Ready for Collection</td><td>Certificate is ready at your selected office</td></tr>
                  <tr><td>Collected</td><td>Certificate has been collected</td></tr>
                  <tr><td>Rejected</td><td>Application rejected — see reason in email</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'payments',
    label: 'Fees & Payments',
    icon: CreditCard,
    articles: [
      {
        id: 'payment-overview',
        title: 'Payment Methods & Fee Schedule',
        content: (
          <div className="doc-body">
            <p>
              All statutory fees are payable online via <strong>Paystack</strong>, which
              supports mobile money (MTN, Vodafone, AirtelTigo) and debit/credit cards.
            </p>
            <h4>Current Fee Schedule</h4>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Standard Fee (GHS)</th>
                    <th>Express Fee (GHS)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Birth Registration (within 12 months)</td><td>Free</td><td>N/A</td></tr>
                  <tr><td>Birth Registration (late — 1–5 years)</td><td>10.00</td><td>20.00</td></tr>
                  <tr><td>Birth Registration (late — over 5 years)</td><td>25.00</td><td>50.00</td></tr>
                  <tr><td>Death Registration (within 10 days)</td><td>Prescribed fee</td><td>N/A</td></tr>
                  <tr><td>Death Registration (late)</td><td>Prescribed late fee</td><td>N/A</td></tr>
                  <tr><td>Certified True Copy — Birth</td><td>20.00</td><td>40.00</td></tr>
                  <tr><td>Certified True Copy — Death</td><td>20.00</td><td>40.00</td></tr>
                  <tr><td>Adoption Registration</td><td>50.00</td><td>100.00</td></tr>
                </tbody>
              </table>
            </div>
            <div className="doc-callout doc-callout--info">
              <CreditCard size={18} />
              <p>
                Fee schedule is subject to change by government order. Always confirm
                current fees at the time of application. Fees are non-refundable once
                processing has commenced.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'account-management',
    label: 'Account Management',
    icon: Settings,
    articles: [
      {
        id: 'profile',
        title: 'Managing Your Profile',
        content: (
          <div className="doc-body">
            <p>
              Access your profile at <Link to="/profile">/profile</Link> after signing in.
              From your profile, you can:
            </p>
            <ul>
              <li>Update your phone number and email address</li>
              <li>Change your password</li>
              <li>View your application history</li>
              <li>Manage notification preferences</li>
              <li>Manage newsletter subscription preferences</li>
              <li>Download submitted documents</li>
            </ul>
            <div className="doc-callout doc-callout--warning">
              <Settings size={18} />
              <p>
                Changes to your legal name or date of birth require in-person verification
                at a BDR district office with valid identification.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'delete-account',
        title: 'Account Deletion',
        content: (
          <div className="doc-body">
            <p>
              You may request deletion of your portal account at any time. Please note:
            </p>
            <ul>
              <li>Registration records (birth/death certificates) are statutory records retained permanently by BDR and cannot be deleted</li>
              <li>Your account profile, login credentials, and personal contact data will be deleted</li>
              <li>In-progress applications will be cancelled upon account deletion</li>
              <li>You will lose access to application history and previously requested documents</li>
            </ul>
            <p>
              To request account deletion, email <a href="mailto:support@bdregistry.gov.gh">support@bdregistry.gov.gh</a> from your registered email address with the subject line "Account Deletion Request".
            </p>
          </div>
        ),
      },
    ],
  },
];

function ArticleAccordion({ article }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`doc-article${open ? ' doc-article--open' : ''}`}>
      <button className="doc-article-toggle" onClick={() => setOpen(!open)}>
        <span className="doc-article-title">{article.title}</span>
        <ChevronDown size={16} className="doc-article-chevron" />
      </button>
      <div className="doc-article-body">
        {article.content}
      </div>
    </div>
  );
}

export default function Documentation() {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const active = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="doc-page">
      <section className="doc-hero">
        <div className="container doc-hero-inner">
          <div className="doc-hero-badge">
            <BookOpen size={14} />
            Documentation
          </div>
          <h1 className="doc-hero-title">Portal Documentation</h1>
          <p className="doc-hero-subtitle">
            Complete guides and reference material for using the Ghana Births and Deaths
            Registry online portal. Find step-by-step instructions for every service.
          </p>
          <div className="doc-hero-stats">
            <div className="doc-hero-stat">
              <strong>{CATEGORIES.length}</strong>
              <span>Categories</span>
            </div>
            <div className="doc-hero-stat">
              <strong>{CATEGORIES.reduce((s, c) => s + c.articles.length, 0)}</strong>
              <span>Articles</span>
            </div>
            <div className="doc-hero-stat">
              <strong>Updated</strong>
              <span>March 2026</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container doc-layout">
          <aside className="doc-sidebar">
            <div className="doc-sidebar-inner">
              <div className="doc-sidebar-title">Categories</div>
              <nav className="doc-sidebar-nav">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      className={`doc-sidebar-link${activeCategory === cat.id ? ' doc-sidebar-link--active' : ''}`}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <Icon size={16} />
                      <span>{cat.label}</span>
                      <span className="doc-sidebar-badge">{cat.articles.length}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="doc-sidebar-help">
              <HelpCircle size={22} />
              <h4>Need more help?</h4>
              <p>Contact our support team or visit a regional office.</p>
              <Link to="/contact" className="btn btn-primary btn-sm" style={{ textAlign: 'center', display: 'block', marginTop: 10 }}>
                Contact Support
              </Link>
              <Link to="/faq" className="btn btn-outline btn-sm" style={{ textAlign: 'center', display: 'block', marginTop: 8 }}>
                View FAQ
              </Link>
            </div>
          </aside>

          <main className="doc-main">
            {active && (
              <>
                <div className="doc-main-header">
                  <div className="doc-main-icon">
                    {(() => { const Icon = active.icon; return <Icon size={22} />; })()}
                  </div>
                  <div>
                    <h2 className="doc-main-title">{active.label}</h2>
                    <p className="doc-main-count">
                      {active.articles.length} article{active.articles.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="doc-articles">
                  {active.articles.map(article => (
                    <ArticleAccordion key={article.id} article={article} />
                  ))}
                </div>
              </>
            )}

            <div className="doc-cta">
              <div className="doc-cta-inner">
                <HelpCircle size={28} />
                <div>
                  <h3>Cannot find what you are looking for?</h3>
                  <p>Our FAQ covers the most common questions, or contact support directly.</p>
                </div>
                <div className="doc-cta-actions">
                  <Link to="/faq" className="btn btn-primary">Browse FAQ</Link>
                  <Link to="/contact" className="btn btn-outline">Contact Us</Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
