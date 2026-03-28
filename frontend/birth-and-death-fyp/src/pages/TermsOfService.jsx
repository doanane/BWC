import {
  AlertTriangle,
  Ban,
  BookOpen,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  Gavel,
  Mail,
  RefreshCw,
  Scale,
  Shield,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Legal.css';

const SECTIONS = [
  { id: 'acceptance', title: 'Acceptance of Terms', icon: CheckCircle },
  { id: 'eligibility', title: 'User Eligibility', icon: User },
  { id: 'account', title: 'Account Registration', icon: Shield },
  { id: 'services', title: 'Portal Services', icon: BookOpen },
  { id: 'permitted', title: 'Permitted Use', icon: CheckCircle },
  { id: 'prohibited', title: 'Prohibited Activities', icon: Ban },
  { id: 'fees', title: 'Fees & Payments', icon: CreditCard },
  { id: 'accuracy', title: 'Accuracy of Information', icon: AlertTriangle },
  { id: 'ip', title: 'Intellectual Property', icon: FileText },
  { id: 'liability', title: 'Limitation of Liability', icon: Scale },
  { id: 'termination', title: 'Account Termination', icon: Ban },
  { id: 'governing', title: 'Governing Law', icon: Gavel },
  { id: 'changes', title: 'Amendments', icon: RefreshCw },
  { id: 'contact', title: 'Contact', icon: Mail },
];

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="container legal-hero-inner">
          <div className="legal-hero-badge">
            <FileText size={14} />
            Legal Document
          </div>
          <h1 className="legal-hero-title">Terms of Service</h1>
          <p className="legal-hero-subtitle">
            These Terms of Service govern your access to and use of the Ghana Births and
            Deaths Registry online portal. Please read them carefully before using this
            service.
          </p>
          <div className="legal-hero-meta">
            <span className="legal-hero-meta-item">
              <Calendar size={13} /> Effective Date: 1 January 2024
            </span>
            <span className="legal-hero-meta-item">
              <RefreshCw size={13} /> Last Updated: 1 March 2025
            </span>
            <span className="legal-hero-meta-item">
              <Gavel size={13} /> Governed by the Laws of Ghana
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

            <div className="legal-section" id="acceptance">
              <div className="legal-section-header">
                <div className="legal-section-icon"><CheckCircle size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 1</div>
                  <h2 className="legal-section-title">Acceptance of Terms</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  By accessing, browsing, or using the Ghana Births and Deaths Registry
                  (BDR) online portal (bdregistry.gov.gh), you acknowledge that you have
                  read, understood, and agree to be bound by these Terms of Service
                  ("Terms"), along with our <Link to="/legal/privacy">Privacy Policy</Link> and
                  any additional terms applicable to specific services.
                </p>
                <div className="legal-highlight">
                  <p>
                    These Terms constitute a legally binding agreement between you and the
                    Ghana Births and Deaths Registry, operating under the authority of the
                    <strong> Births and Deaths (Registration) Act, 2020 (Act 1027)</strong>.
                  </p>
                </div>
                <p>
                  If you are using this portal on behalf of an organisation, you represent
                  that you have the authority to bind that organisation to these Terms, and
                  all references to "you" shall apply to both you and the organisation.
                </p>
              </div>
            </div>

            <div className="legal-section" id="eligibility">
              <div className="legal-section-header">
                <div className="legal-section-icon"><User size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 2</div>
                  <h2 className="legal-section-title">User Eligibility</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>To use this portal, you must:</p>
                <ul>
                  <li>Be at least 18 years of age, or the legal guardian of a minor on whose behalf you are acting</li>
                  <li>Be a Ghanaian citizen, permanent resident, or a foreign national with a legitimate need to access BDR services</li>
                  <li>Hold a valid Ghana Card (National ID) or other accepted form of identification</li>
                  <li>Provide truthful, accurate, and complete information during registration</li>
                  <li>Not have been previously suspended or banned from using this portal</li>
                </ul>
                <p>
                  Persons under the age of 18 may not create an account. Birth or death
                  registration on behalf of a minor must be completed by a parent, legal
                  guardian, or designated informant.
                </p>
              </div>
            </div>

            <div className="legal-section" id="account">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Shield size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 3</div>
                  <h2 className="legal-section-title">Account Registration</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  To access protected services (birth/death registration, application
                  tracking, certificate requests), you must register for an account. You agree to:
                </p>
                <ul>
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and promptly update your account information to keep it accurate</li>
                  <li>Keep your password confidential and not share it with any third party</li>
                  <li>Be responsible for all activity that occurs under your account</li>
                  <li>Notify us immediately of any unauthorised access or security breach at <a href="mailto:security@bdregistry.gov.gh">security@bdregistry.gov.gh</a></li>
                </ul>
                <div className="legal-warning">
                  <p>
                    <strong>One account per person:</strong> You may maintain only one
                    active account. Creating multiple accounts for the same individual is
                    prohibited and may result in all associated accounts being suspended.
                  </p>
                </div>
                <p>
                  BDR reserves the right to verify your identity at any time and to suspend
                  accounts where verification fails or fraud is suspected.
                </p>
              </div>
            </div>

            <div className="legal-section" id="services">
              <div className="legal-section-header">
                <div className="legal-section-icon"><BookOpen size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 4</div>
                  <h2 className="legal-section-title">Portal Services</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>This portal provides the following services:</p>
                <ul>
                  <li><strong>Birth Registration:</strong> Online submission of birth registration applications for Ghanaian citizens</li>
                  <li><strong>Death Registration:</strong> Online submission of death registration applications with required documentation</li>
                  <li><strong>Certified True Copies (Extracts):</strong> Request for official copies of existing birth or death records</li>
                  <li><strong>Adoption Registration:</strong> Submission of adoption documentation for registration</li>
                  <li><strong>Identity Verification:</strong> Verification of registration status using reference numbers</li>
                  <li><strong>Application Tracking:</strong> Real-time status tracking using application reference numbers</li>
                  <li><strong>Statistical Data Requests:</strong> Requests for anonymised vital statistics data</li>
                  <li><strong>Online Payment:</strong> Payment of statutory fees via Paystack</li>
                </ul>
                <p>
                  Service availability is subject to scheduled maintenance, force majeure, or
                  operational requirements. BDR will endeavour to provide advance notice of
                  planned downtime.
                </p>
              </div>
            </div>

            <div className="legal-section" id="permitted">
              <div className="legal-section-header">
                <div className="legal-section-icon"><CheckCircle size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 5</div>
                  <h2 className="legal-section-title">Permitted Use</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>You may use this portal solely for the following lawful purposes:</p>
                <ul>
                  <li>Registering births and deaths for yourself, your family members, or in your capacity as an authorised informant</li>
                  <li>Requesting official certificates and documents to which you are legally entitled</li>
                  <li>Tracking the status of your own applications</li>
                  <li>Making payments for applicable statutory fees</li>
                  <li>Accessing publicly available information about BDR services</li>
                </ul>
              </div>
            </div>

            <div className="legal-section" id="prohibited">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Ban size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 6</div>
                  <h2 className="legal-section-title">Prohibited Activities</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>You agree not to engage in any of the following prohibited activities:</p>
                <ul>
                  <li>Submitting false, fraudulent, or misleading information in any application</li>
                  <li>Attempting to register a person under a false identity</li>
                  <li>Impersonating another individual, government official, or entity</li>
                  <li>Attempting to gain unauthorised access to other users' accounts or administrative systems</li>
                  <li>Using automated bots, scrapers, or scripts to access or extract data from the portal</li>
                  <li>Uploading malicious code, viruses, or any harmful software</li>
                  <li>Tampering with, defacing, or disrupting portal operations</li>
                  <li>Using the portal for commercial purposes without written authorisation from BDR</li>
                  <li>Engaging in any activity that violates Ghana's Computer Systems Act, 2008 or any applicable law</li>
                </ul>
                <div className="legal-warning">
                  <p>
                    <strong>Fraudulent submissions are a criminal offence</strong> under the
                    Births and Deaths (Registration) Act, 2020 (Act 1027) and may result in
                    criminal prosecution, fines, and imprisonment.
                  </p>
                </div>
              </div>
            </div>

            <div className="legal-section" id="fees">
              <div className="legal-section-header">
                <div className="legal-section-icon"><CreditCard size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 7</div>
                  <h2 className="legal-section-title">Fees &amp; Payments</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  Certain services attract statutory fees as prescribed by law. By submitting
                  a payment, you agree to the following:
                </p>
                <ul>
                  <li>All fees are non-refundable once an application has been submitted and processing commenced</li>
                  <li>Fees are payable in Ghana Cedis (GHS) via the approved payment gateway (Paystack)</li>
                  <li>Current fee schedules are published on the portal and subject to change by government order</li>
                  <li>BDR is not responsible for charges imposed by your financial institution</li>
                  <li>Payment failures do not reserve any application slot; you must re-submit</li>
                </ul>
                <h4>Refund Policy</h4>
                <p>
                  Refunds may be considered only where a technical error caused a duplicate
                  payment or where BDR is unable to process an application for reasons within
                  its control. Refund requests must be submitted in writing within 30 days of
                  the transaction. Contact <a href="mailto:finance@bdregistry.gov.gh">finance@bdregistry.gov.gh</a>.
                </p>
              </div>
            </div>

            <div className="legal-section" id="accuracy">
              <div className="legal-section-header">
                <div className="legal-section-icon"><AlertTriangle size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 8</div>
                  <h2 className="legal-section-title">Accuracy of Information</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  You are solely responsible for the accuracy and completeness of all
                  information submitted through the portal. BDR will process applications
                  based on the information provided. Errors or omissions in submitted data
                  may result in:
                </p>
                <ul>
                  <li>Delays in processing</li>
                  <li>Rejection of your application</li>
                  <li>Requirement to resubmit with correct information and applicable re-submission fees</li>
                  <li>Legal consequences where false information is knowingly submitted</li>
                </ul>
                <p>
                  Once a certificate has been issued, corrections to registration records
                  require formal application through a district BDR office and may require a
                  court order depending on the nature of the correction.
                </p>
              </div>
            </div>

            <div className="legal-section" id="ip">
              <div className="legal-section-header">
                <div className="legal-section-icon"><FileText size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 9</div>
                  <h2 className="legal-section-title">Intellectual Property</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  All content on this portal, including but not limited to text, graphics,
                  logos, icons, images, software, and design elements, is the property of the
                  Ghana Births and Deaths Registry or the Government of Ghana, and is protected
                  by the Copyright Act, 2005 (Act 690) and other applicable intellectual
                  property laws.
                </p>
                <p>
                  You may not reproduce, distribute, modify, or create derivative works from
                  any portal content without prior written permission from BDR, except as
                  expressly permitted for personal, non-commercial use.
                </p>
              </div>
            </div>

            <div className="legal-section" id="liability">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Scale size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 10</div>
                  <h2 className="legal-section-title">Limitation of Liability</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  To the maximum extent permitted by applicable law, the Ghana Births and
                  Deaths Registry shall not be liable for:
                </p>
                <ul>
                  <li>Any indirect, incidental, special, or consequential damages arising from your use of the portal</li>
                  <li>Loss of data resulting from delays, delivery failures, or service interruptions beyond our control</li>
                  <li>Damages resulting from fraudulent submissions made using your credentials</li>
                  <li>Third-party content, services, or websites linked from this portal</li>
                  <li>Errors arising from information you provided incorrectly</li>
                </ul>
                <p>
                  BDR's total liability to you for any claim arising from these Terms or
                  your use of the portal shall not exceed the amount of fees paid by you
                  for the specific service that gave rise to the claim.
                </p>
              </div>
            </div>

            <div className="legal-section" id="termination">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Ban size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 11</div>
                  <h2 className="legal-section-title">Account Termination</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  BDR reserves the right to suspend or permanently terminate your account
                  without prior notice if:
                </p>
                <ul>
                  <li>You violate any provision of these Terms</li>
                  <li>Fraudulent activity is detected or suspected</li>
                  <li>Your account is used in a manner that harms the portal or other users</li>
                  <li>Required by law, court order, or regulatory authority</li>
                </ul>
                <p>
                  You may request account deletion at any time by contacting
                  <a href="mailto:support@bdregistry.gov.gh"> support@bdregistry.gov.gh</a>.
                  Note that statutory registration records are retained permanently as required
                  by law, even after account deletion.
                </p>
              </div>
            </div>

            <div className="legal-section" id="governing">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Gavel size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 12</div>
                  <h2 className="legal-section-title">Governing Law</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws
                  of the Republic of Ghana. Any dispute arising from or related to these Terms
                  shall be subject to the exclusive jurisdiction of the courts of Ghana.
                </p>
                <p>
                  The following legislation is particularly relevant to the operation of this
                  portal and your use thereof:
                </p>
                <ul>
                  <li>Births and Deaths (Registration) Act, 2020 (Act 1027)</li>
                  <li>Data Protection Act, 2012 (Act 843)</li>
                  <li>Electronic Transactions Act, 2008 (Act 772)</li>
                  <li>Computer Systems Act, 2008 (Act 722)</li>
                  <li>Copyright Act, 2005 (Act 690)</li>
                </ul>
              </div>
            </div>

            <div className="legal-section" id="changes">
              <div className="legal-section-header">
                <div className="legal-section-icon"><RefreshCw size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 13</div>
                  <h2 className="legal-section-title">Amendments</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  BDR may revise these Terms at any time. Material changes will be communicated
                  by posting the updated Terms on this page and, where appropriate, by email
                  notification to registered users. The "Last Updated" date at the top of this
                  page indicates when the most recent changes were made.
                </p>
                <p>
                  Continued use of the portal after the effective date of any changes
                  constitutes your acceptance of the revised Terms. If you do not agree to
                  the revised Terms, you must discontinue use of the portal.
                </p>
              </div>
            </div>

            <div className="legal-section" id="contact">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Mail size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 14</div>
                  <h2 className="legal-section-title">Contact</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  For questions or concerns regarding these Terms of Service, please contact:
                </p>
              </div>
              <div className="legal-contact-card">
                <div className="legal-contact-icon"><Gavel size={24} /></div>
                <div className="legal-contact-body">
                  <h4>Legal &amp; Compliance — Ghana BDR</h4>
                  <p>Email: <a href="mailto:legal@bdregistry.gov.gh">legal@bdregistry.gov.gh</a></p>
                  <p>Phone: <a href="tel:+233302665125">+233 302 665 125</a></p>
                  <p>Address: P.O. Box M.48, Ministries, Accra, Ghana</p>
                  <p>Office Hours: Monday to Friday, 8:00 AM to 5:00 PM GMT</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
