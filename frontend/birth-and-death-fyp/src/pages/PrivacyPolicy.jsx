import {
  Calendar,
  Database,
  Eye,
  FileText,
  Globe,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Legal.css';

const SECTIONS = [
  { id: 'overview', title: 'Overview & Scope', icon: Shield },
  { id: 'collection', title: 'Data We Collect', icon: Database },
  { id: 'use', title: 'How We Use Your Data', icon: Eye },
  { id: 'sharing', title: 'Data Sharing', icon: Users },
  { id: 'security', title: 'Data Security', icon: Lock },
  { id: 'retention', title: 'Data Retention', icon: Calendar },
  { id: 'rights', title: 'Your Rights', icon: FileText },
  { id: 'cookies', title: 'Cookies & Tracking', icon: Globe },
  { id: 'changes', title: 'Policy Changes', icon: RefreshCw },
  { id: 'contact', title: 'Contact Us', icon: Mail },
];

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="container legal-hero-inner">
          <div className="legal-hero-badge">
            <Shield size={14} />
            Legal Document
          </div>
          <h1 className="legal-hero-title">Privacy Policy</h1>
          <p className="legal-hero-subtitle">
            This Privacy Policy explains how the Ghana Births and Deaths Registry (BDR)
            collects, uses, protects, and discloses personal information through this
            online portal.
          </p>
          <div className="legal-hero-meta">
            <span className="legal-hero-meta-item">
              <Calendar size={13} /> Effective Date: 1 January 2024
            </span>
            <span className="legal-hero-meta-item">
              <RefreshCw size={13} /> Last Updated: 1 March 2025
            </span>
            <span className="legal-hero-meta-item">
              <Globe size={13} /> Governed by Ghana Data Protection Act, 2012 (Act 843)
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container legal-layout">
          <aside className="legal-toc">
            <div className="legal-toc-header">Table of Contents</div>
            <nav className="legal-toc-nav">
              {SECTIONS.map((s, i) => (
                <a key={s.id} href={`#${s.id}`} className="legal-toc-link">
                  <span className="legal-toc-link-num">{i + 1}</span>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="legal-content">

            <div className="legal-section" id="overview">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Shield size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 1</div>
                  <h2 className="legal-section-title">Overview &amp; Scope</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  The Ghana Births and Deaths Registry (BDR), operating under the Ministry of
                  Local Government, Decentralisation and Rural Development, is committed to
                  protecting the privacy and security of all personal information entrusted to us.
                  This policy applies to all users of the BDR online portal at
                  <strong> bdregistry.gov.gh</strong>.
                </p>
                <div className="legal-highlight">
                  <p>
                    This Privacy Policy is issued in accordance with the <strong>Data Protection
                    Act, 2012 (Act 843)</strong> of Ghana, the Electronic Transactions Act, 2008
                    (Act 772), and all applicable regulations of the Data Protection Commission
                    of Ghana.
                  </p>
                </div>
                <p>
                  By accessing or using this portal, you consent to the collection, use, and
                  disclosure of your personal information as described in this policy. If you
                  do not agree to these terms, please do not use this portal.
                </p>
                <p>
                  This policy covers:
                </p>
                <ul>
                  <li>The BDR online registration portal (bdregistry.gov.gh)</li>
                  <li>All mobile or responsive interfaces of this portal</li>
                  <li>Email and SMS communications sent by BDR</li>
                  <li>Any other BDR digital services that link to this policy</li>
                </ul>
              </div>
            </div>

            <div className="legal-section" id="collection">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Database size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 2</div>
                  <h2 className="legal-section-title">Data We Collect</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  We collect personal information necessary to perform our statutory functions
                  under the Births and Deaths (Registration) Act, 2020 (Act 1027). The categories
                  of information we collect include:
                </p>
                <h4>2.1 Account &amp; Identity Information</h4>
                <ul>
                  <li>Full legal name, date of birth, gender, nationality</li>
                  <li>Ghana Card number (National Identification Number)</li>
                  <li>Email address and phone number</li>
                  <li>Residential address</li>
                  <li>Username and encrypted password</li>
                </ul>
                <h4>2.2 Registration Event Data</h4>
                <ul>
                  <li>Details of the registered person (birth or death event)</li>
                  <li>Parent/guardian information for birth registrations</li>
                  <li>Hospital or medical certificate information</li>
                  <li>Witness and informant details</li>
                </ul>
                <h4>2.3 Biometric &amp; Document Data</h4>
                <ul>
                  <li>Ghana Card image (front and back scan)</li>
                  <li>Selfie photograph for identity verification (liveness check)</li>
                  <li>Uploaded supporting documents (medical certificates, court orders, etc.)</li>
                </ul>
                <h4>2.4 Usage &amp; Technical Data</h4>
                <ul>
                  <li>IP address and browser type</li>
                  <li>Pages visited, session duration, and interaction logs</li>
                  <li>Device type and operating system</li>
                  <li>Error logs and performance metrics</li>
                </ul>
                <h4>2.5 Payment Data</h4>
                <ul>
                  <li>Transaction reference numbers and payment status</li>
                  <li>Mobile money account details (processed by Paystack; not stored by BDR)</li>
                </ul>
                <div className="legal-warning">
                  <p>
                    <strong>We do not store raw payment card details.</strong> All payment
                    transactions are processed by Paystack, a PCI-DSS compliant payment gateway.
                    BDR only retains transaction reference numbers and status.
                  </p>
                </div>
              </div>
            </div>

            <div className="legal-section" id="use">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Eye size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 3</div>
                  <h2 className="legal-section-title">How We Use Your Data</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>We use personal information for the following lawful purposes:</p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Purpose</th>
                        <th>Legal Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Processing birth and death registrations</td>
                        <td>Statutory obligation (Act 1027)</td>
                      </tr>
                      <tr>
                        <td>Issuing certificates and certified true copies</td>
                        <td>Statutory obligation</td>
                      </tr>
                      <tr>
                        <td>Identity verification using Ghana Card / NIA</td>
                        <td>Consent + Statutory obligation</td>
                      </tr>
                      <tr>
                        <td>Application status notifications (SMS/email)</td>
                        <td>Consent</td>
                      </tr>
                      <tr>
                        <td>Payment processing</td>
                        <td>Contractual necessity</td>
                      </tr>
                      <tr>
                        <td>Portal security and fraud prevention</td>
                        <td>Legitimate interest</td>
                      </tr>
                      <tr>
                        <td>Statistical reporting and national vital statistics</td>
                        <td>Statutory obligation (anonymised)</td>
                      </tr>
                      <tr>
                        <td>Newsletter and service update emails</td>
                        <td>Consent (opt-in only)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  We do not use your personal data for automated decision-making or profiling
                  that produces legal or similarly significant effects without human oversight.
                </p>
              </div>
            </div>

            <div className="legal-section" id="sharing">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Users size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 4</div>
                  <h2 className="legal-section-title">Data Sharing</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  BDR may share personal information only in the following limited circumstances:
                </p>
                <h4>4.1 Government Agencies</h4>
                <p>
                  Registration data may be shared with authorized government agencies under
                  statutory authority, including:
                </p>
                <ul>
                  <li>National Identification Authority (NIA) — identity cross-verification</li>
                  <li>Electoral Commission — voter registration reconciliation</li>
                  <li>Ghana Health Service — public health and vital statistics</li>
                  <li>Ghana Statistical Service — national demographic statistics (anonymised)</li>
                  <li>Courts and Law Enforcement — pursuant to a valid court order</li>
                </ul>
                <h4>4.2 Third-Party Service Providers</h4>
                <p>
                  We engage trusted third-party providers who process data solely on our
                  instructions under data processing agreements:
                </p>
                <ul>
                  <li><strong>Paystack Ghana Limited</strong> — payment processing</li>
                  <li><strong>Cloud hosting provider</strong> — secure server infrastructure</li>
                  <li><strong>SMS/email delivery services</strong> — notification delivery only</li>
                </ul>
                <div className="legal-highlight">
                  <p>
                    BDR does <strong>not</strong> sell, rent, or trade personal data to commercial
                    third parties for marketing or any other purpose.
                  </p>
                </div>
                <h4>4.3 International Transfers</h4>
                <p>
                  Where data is transferred outside Ghana (e.g., to cloud infrastructure), BDR
                  ensures adequate safeguards are in place, including data processing agreements
                  with equivalent protection standards.
                </p>
              </div>
            </div>

            <div className="legal-section" id="security">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Lock size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 5</div>
                  <h2 className="legal-section-title">Data Security</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  BDR implements appropriate technical and organisational measures to protect
                  your personal information against unauthorised access, disclosure, alteration,
                  or destruction.
                </p>
                <h4>Technical Measures</h4>
                <ul>
                  <li>256-bit TLS/SSL encryption for all data in transit</li>
                  <li>AES-256 encryption for sensitive data at rest</li>
                  <li>Password hashing using PBKDF2-SHA256 with salting</li>
                  <li>JWT-based authentication with short-lived access tokens</li>
                  <li>Role-based access control (RBAC) for all portal functions</li>
                  <li>Automatic session timeout after 15 minutes of inactivity</li>
                  <li>Regular security audits and penetration testing</li>
                </ul>
                <h4>Organisational Measures</h4>
                <ul>
                  <li>Staff access restricted on a need-to-know basis</li>
                  <li>Data protection training for all staff handling personal data</li>
                  <li>Data breach response plan and notification procedures</li>
                  <li>Appointed Data Protection Officer (DPO)</li>
                </ul>
                <div className="legal-warning">
                  <p>
                    <strong>Security incident reporting:</strong> If you believe your account has
                    been compromised, contact us immediately at
                    <a href="mailto:security@bdregistry.gov.gh"> security@bdregistry.gov.gh</a>.
                  </p>
                </div>
              </div>
            </div>

            <div className="legal-section" id="retention">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Calendar size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 6</div>
                  <h2 className="legal-section-title">Data Retention</h2>
                </div>
              </div>
              <div className="legal-body">
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Data Category</th>
                        <th>Retention Period</th>
                        <th>Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Birth and death registration records</td>
                        <td>Permanent</td>
                        <td>Statutory — Act 1027</td>
                      </tr>
                      <tr>
                        <td>User account data</td>
                        <td>Duration of account + 7 years</td>
                        <td>Legal obligation</td>
                      </tr>
                      <tr>
                        <td>Payment transaction records</td>
                        <td>7 years</td>
                        <td>Financial regulation</td>
                      </tr>
                      <tr>
                        <td>Biometric verification data (selfies)</td>
                        <td>90 days post-verification</td>
                        <td>Minimisation principle</td>
                      </tr>
                      <tr>
                        <td>Application logs and audit trails</td>
                        <td>5 years</td>
                        <td>Security and compliance</td>
                      </tr>
                      <tr>
                        <td>Newsletter subscription data</td>
                        <td>Until unsubscription + 30 days</td>
                        <td>Consent</td>
                      </tr>
                      <tr>
                        <td>Web analytics (anonymised)</td>
                        <td>24 months</td>
                        <td>Legitimate interest</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  Upon expiry of the applicable retention period, personal data is securely
                  deleted or anonymised in accordance with our data disposal procedures.
                </p>
              </div>
            </div>

            <div className="legal-section" id="rights">
              <div className="legal-section-header">
                <div className="legal-section-icon"><FileText size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 7</div>
                  <h2 className="legal-section-title">Your Rights</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  Under the Data Protection Act, 2012 (Act 843) and applicable regulations,
                  you have the following rights with respect to your personal data:
                </p>
                <ul>
                  <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
                  <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete personal data.</li>
                  <li><strong>Right to Erasure:</strong> Request deletion of personal data where retention is no longer necessary or lawful (subject to statutory record-keeping obligations).</li>
                  <li><strong>Right to Restrict Processing:</strong> Request that we restrict how we use your data in certain circumstances.</li>
                  <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                  <li><strong>Right to Object:</strong> Object to processing based on legitimate interest or for direct marketing purposes.</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is consent-based (e.g., newsletters).</li>
                </ul>
                <div className="legal-highlight">
                  <p>
                    To exercise any of these rights, submit a written request to our Data
                    Protection Officer at <a href="mailto:dpo@bdregistry.gov.gh">dpo@bdregistry.gov.gh</a>.
                    We will respond within <strong>21 working days</strong>. Identity verification
                    will be required before processing your request.
                  </p>
                </div>
                <p>
                  You also have the right to lodge a complaint with the
                  <strong> Data Protection Commission of Ghana</strong> at
                  <a href="mailto:info@dataprotection.org.gh"> info@dataprotection.org.gh</a>.
                </p>
              </div>
            </div>

            <div className="legal-section" id="cookies">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Globe size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 8</div>
                  <h2 className="legal-section-title">Cookies &amp; Tracking</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  This portal uses cookies and similar technologies to enhance your
                  experience. We use only essential and functional cookies — we do not use
                  third-party advertising or tracking cookies.
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Cookie Type</th>
                        <th>Purpose</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Session (auth)</td>
                        <td>Maintain authenticated session</td>
                        <td>15 minutes inactivity / session end</td>
                      </tr>
                      <tr>
                        <td>Theme preference</td>
                        <td>Remember light/dark mode preference</td>
                        <td>1 year</td>
                      </tr>
                      <tr>
                        <td>Language preference</td>
                        <td>Remember selected language</td>
                        <td>1 year</td>
                      </tr>
                      <tr>
                        <td>CSRF token</td>
                        <td>Cross-site request forgery protection</td>
                        <td>Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  You can manage cookies through your browser settings. Blocking essential
                  cookies may impair portal functionality.
                </p>
              </div>
            </div>

            <div className="legal-section" id="changes">
              <div className="legal-section-header">
                <div className="legal-section-icon"><RefreshCw size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 9</div>
                  <h2 className="legal-section-title">Policy Changes</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in
                  legal requirements, technology, or our practices. When we make significant
                  changes, we will:
                </p>
                <ul>
                  <li>Post the updated policy on this page with the revised effective date</li>
                  <li>Send email notification to registered users where changes are material</li>
                  <li>Display a prominent banner on the portal for 30 days following updates</li>
                </ul>
                <p>
                  Continued use of the portal after the effective date of any update constitutes
                  acceptance of the revised policy. We recommend reviewing this page periodically.
                </p>
              </div>
            </div>

            <div className="legal-section" id="contact">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Mail size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 10</div>
                  <h2 className="legal-section-title">Contact Us</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  For privacy-related enquiries, data subject requests, or to report a
                  concern, please contact our Data Protection Officer:
                </p>
              </div>
              <div className="legal-contact-card">
                <div className="legal-contact-icon"><Mail size={24} /></div>
                <div className="legal-contact-body">
                  <h4>Data Protection Officer — Ghana BDR</h4>
                  <p>Email: <a href="mailto:dpo@bdregistry.gov.gh">dpo@bdregistry.gov.gh</a></p>
                  <p>Phone: <a href="tel:+233302665125">+233 302 665 125</a></p>
                  <p>Address: P.O. Box M.48, Ministries, Accra, Ghana</p>
                  <p>Response time: Within 21 working days</p>
                </div>
              </div>
              <div className="legal-body" style={{ marginTop: 16 }}>
                <p>
                  You may also use our <Link to="/contact">Contact page</Link> or visit any
                  <Link to="/offices"> regional BDR office</Link> for in-person assistance.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
