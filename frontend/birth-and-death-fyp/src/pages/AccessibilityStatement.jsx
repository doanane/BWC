import {
  Calendar,
  CheckCircle,
  Eye,
  Globe,
  Mail,
  MessageCircle,
  Monitor,
  RefreshCw,
  Zap
} from 'lucide-react';
import './Legal.css';

const SECTIONS = [
  { id: 'commitment', title: 'Our Commitment', icon: CheckCircle },
  { id: 'standards', title: 'Conformance Standards', icon: Globe },
  { id: 'features', title: 'Accessibility Features', icon: Zap },
  { id: 'technical', title: 'Technical Specifications', icon: Monitor },
  { id: 'limitations', title: 'Known Limitations', icon: Eye },
  { id: 'assessment', title: 'Assessment Approach', icon: RefreshCw },
  { id: 'feedback', title: 'Feedback & Contact', icon: Mail },
];

export default function AccessibilityStatement() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="container legal-hero-inner">
          <div className="legal-hero-badge">
            <Globe size={14} />
            Accessibility
          </div>
          <h1 className="legal-hero-title">Accessibility Statement</h1>
          <p className="legal-hero-subtitle">
            The Ghana Births and Deaths Registry is committed to ensuring that this portal
            is accessible to all users, including persons with disabilities. We strive to
            meet international accessibility standards.
          </p>
          <div className="legal-hero-meta">
            <span className="legal-hero-meta-item">
              <Calendar size={13} /> Statement Date: 1 January 2024
            </span>
            <span className="legal-hero-meta-item">
              <RefreshCw size={13} /> Last Review: 1 March 2025
            </span>
            <span className="legal-hero-meta-item">
              <Globe size={13} /> Target: WCAG 2.1 Level AA
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

            <div className="legal-section" id="commitment">
              <div className="legal-section-header">
                <div className="legal-section-icon"><CheckCircle size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 1</div>
                  <h2 className="legal-section-title">Our Commitment</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  The Ghana Births and Deaths Registry (BDR) is committed to providing a
                  digital service that is accessible and usable by all citizens of Ghana,
                  including persons with visual, auditory, motor, cognitive, and other
                  disabilities.
                </p>
                <div className="legal-highlight">
                  <p>
                    We believe that access to vital registration services — birth and death
                    registration — is a fundamental right. Our portal is designed and
                    maintained to remove barriers and ensure that every Ghanaian citizen
                    can access these services with dignity and independence.
                  </p>
                </div>
                <p>
                  This statement applies to the BDR online portal at
                  <strong> bdregistry.gov.gh</strong> and all associated web interfaces.
                  It has been prepared in line with the Web Content Accessibility Guidelines
                  (WCAG) 2.1.
                </p>
              </div>
            </div>

            <div className="legal-section" id="standards">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Globe size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 2</div>
                  <h2 className="legal-section-title">Conformance Standards</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  We aim to conform to the <strong>Web Content Accessibility Guidelines
                    (WCAG) 2.1 Level AA</strong> published by the World Wide Web Consortium (W3C).
                  These guidelines explain how to make web content more accessible to people
                  with disabilities. Conformance with these guidelines helps make the web more
                  user-friendly for everyone.
                </p>
                <p>
                  WCAG 2.1 is organised around four principles — content must be:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Principle</th>
                        <th>Description</th>
                        <th>Our Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Perceivable</strong></td>
                        <td>Information and UI components must be presentable to users in ways they can perceive</td>
                        <td>Partially compliant</td>
                      </tr>
                      <tr>
                        <td><strong>Operable</strong></td>
                        <td>UI components and navigation must be operable</td>
                        <td>Partially compliant</td>
                      </tr>
                      <tr>
                        <td><strong>Understandable</strong></td>
                        <td>Information and UI operation must be understandable</td>
                        <td>Partially compliant</td>
                      </tr>
                      <tr>
                        <td><strong>Robust</strong></td>
                        <td>Content must be robust enough to be interpreted by assistive technologies</td>
                        <td>Partially compliant</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  We are <strong>partially compliant</strong> with WCAG 2.1 Level AA. Known
                  limitations are described in Section 5. We are actively working to achieve
                  full compliance.
                </p>
              </div>
            </div>

            <div className="legal-section" id="features">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Zap size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 3</div>
                  <h2 className="legal-section-title">Accessibility Features</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  The following accessibility features have been implemented across
                  this portal:
                </p>
                <h4>Visual Accessibility</h4>
                <ul>
                  <li>High-contrast colour scheme (dark green #006B3C on white achieves WCAG AA contrast ratio)</li>
                  <li>Dark mode support — reduces eye strain and benefits users with photosensitivity</li>
                  <li>Adjustable font size via the Accessibility Widget (bottom-left corner)</li>
                  <li>High contrast mode toggle in the Accessibility Widget</li>
                  <li>All images have descriptive alt text or are marked as decorative</li>
                  <li>Text does not render as images</li>
                </ul>
                <h4>Keyboard Navigation</h4>
                <ul>
                  <li>All interactive elements are keyboard accessible</li>
                  <li>Logical tab order maintained throughout all pages</li>
                  <li>Visible focus indicators on all focusable elements</li>
                  <li>Skip navigation link available (press Tab on page load)</li>
                  <li>Modal dialogs trap focus appropriately</li>
                </ul>
                <h4>Screen Reader Support</h4>
                <ul>
                  <li>Semantic HTML5 landmark regions (header, main, nav, footer, aside)</li>
                  <li>ARIA labels on all icon-only buttons and navigation controls</li>
                  <li>ARIA live regions for dynamic content updates (form errors, notifications)</li>
                  <li>Form fields have associated labels and descriptive error messages</li>
                  <li>Tables include proper headers and captions</li>
                </ul>
                <h4>Cognitive Accessibility</h4>
                <ul>
                  <li>Plain, clear language throughout the portal</li>
                  <li>Consistent navigation layout across all pages</li>
                  <li>Progress indicators on multi-step forms</li>
                  <li>Error messages are specific and actionable</li>
                  <li>Session timeout warnings with option to extend</li>
                </ul>
                <h4>Built-in Accessibility Widget</h4>
                <p>
                  The portal includes a built-in Accessibility Widget (blue button, bottom-left)
                  that provides:
                </p>
                <ul>
                  <li>Text size adjustment (small, normal, large, extra large)</li>
                  <li>High contrast mode toggle</li>
                  <li>Reduced motion toggle (for users with vestibular disorders)</li>
                  <li>Dyslexia-friendly font option</li>
                  <li>Line spacing adjustment</li>
                </ul>
              </div>
            </div>

            <div className="legal-section" id="technical">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Monitor size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 4</div>
                  <h2 className="legal-section-title">Technical Specifications</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  The portal relies on the following technologies for accessibility:
                </p>
                <ul>
                  <li>HTML5 semantic markup</li>
                  <li>CSS3 with CSS custom properties (design tokens)</li>
                  <li>WAI-ARIA 1.1 roles, states, and properties</li>
                  <li>JavaScript (React 19) — progressive enhancement approach</li>
                </ul>
                <h4>Compatible Assistive Technologies</h4>
                <p>
                  This portal has been tested with:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Assistive Technology</th>
                        <th>Browser</th>
                        <th>Platform</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>NVDA (latest)</td>
                        <td>Chrome, Firefox</td>
                        <td>Windows</td>
                      </tr>
                      <tr>
                        <td>JAWS 2024</td>
                        <td>Chrome, Edge</td>
                        <td>Windows</td>
                      </tr>
                      <tr>
                        <td>VoiceOver (latest)</td>
                        <td>Safari</td>
                        <td>macOS / iOS</td>
                      </tr>
                      <tr>
                        <td>TalkBack (latest)</td>
                        <td>Chrome</td>
                        <td>Android</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <h4>Supported Browsers</h4>
                <p>
                  The portal supports all major modern browsers including Chrome 110+,
                  Firefox 110+, Safari 16+, and Edge 110+. Internet Explorer is not supported.
                </p>
              </div>
            </div>

            <div className="legal-section" id="limitations">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Eye size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 5</div>
                  <h2 className="legal-section-title">Known Limitations</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  Despite our efforts, some content may not yet fully meet WCAG 2.1 Level AA.
                  Known limitations are listed below along with our plans to address them:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Issue</th>
                        <th>Affected Area</th>
                        <th>Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>PDF documents may not be fully accessible to screen readers</td>
                        <td>Downloads section</td>
                        <td>Converting to tagged PDF — Q3 2025</td>
                      </tr>
                      <tr>
                        <td>Image carousel auto-play may affect users with vestibular conditions</td>
                        <td>Homepage carousel</td>
                        <td>Adding pause controls — Q2 2025</td>
                      </tr>
                      <tr>
                        <td>Some chart components lack text alternatives</td>
                        <td>Statistics page</td>
                        <td>Adding data tables as alternatives — Q3 2025</td>
                      </tr>
                      <tr>
                        <td>Video content lacks captions</td>
                        <td>Media gallery</td>
                        <td>Captioning all video content — Q4 2025</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  If you encounter an accessibility barrier not listed above, please
                  contact us using the details in Section 7.
                </p>
              </div>
            </div>

            <div className="legal-section" id="assessment">
              <div className="legal-section-header">
                <div className="legal-section-icon"><RefreshCw size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 6</div>
                  <h2 className="legal-section-title">Assessment Approach</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  BDR assesses the accessibility of this portal using the following approaches:
                </p>
                <ul>
                  <li><strong>Self-evaluation:</strong> Regular audits by our development team using automated tools (axe, Lighthouse) and manual testing</li>
                  <li><strong>External audit:</strong> Annual third-party accessibility audit against WCAG 2.1 AA criteria</li>
                  <li><strong>User feedback:</strong> Continuous incorporation of accessibility feedback from users with disabilities</li>
                  <li><strong>Assistive technology testing:</strong> Testing with screen readers and other assistive technologies as described in Section 4</li>
                </ul>
                <p>
                  This statement is reviewed annually and updated following each accessibility
                  audit or whenever significant changes are made to the portal.
                </p>
              </div>
            </div>

            <div className="legal-section" id="feedback">
              <div className="legal-section-header">
                <div className="legal-section-icon"><Mail size={22} /></div>
                <div>
                  <div className="legal-section-num">Section 7</div>
                  <h2 className="legal-section-title">Feedback &amp; Contact</h2>
                </div>
              </div>
              <div className="legal-body">
                <p>
                  We welcome feedback on the accessibility of this portal. If you experience
                  any barriers, have suggestions for improvement, or need content provided
                  in an alternative format, please contact us:
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
                <div className="legal-contact-card" style={{ margin: 0 }}>
                  <div className="legal-contact-icon"><Mail size={20} /></div>
                  <div className="legal-contact-body">
                    <h4>Email</h4>
                    <p><a href="mailto:accessibility@bdregistry.gov.gh">accessibility@bdregistry.gov.gh</a></p>
                    <p>Response within 5 working days</p>
                  </div>
                </div>
                <div className="legal-contact-card" style={{ margin: 0 }}>
                  <div className="legal-contact-icon"><MessageCircle size={20} /></div>
                  <div className="legal-contact-body">
                    <h4>Phone</h4>
                    <p><a href="tel:+233302665125">+233 302 665 125</a></p>
                    <p>Monday to Friday, 8:00 AM to 5:00 PM</p>
                  </div>
                </div>
              </div>

              <div className="legal-body" style={{ marginTop: 20 }}>
                <h4>Formal Complaints</h4>
                <p>
                  If you are not satisfied with our response, you may escalate your
                  complaint to the <strong>National Commission for Civic Education (NCCE)</strong>
                  or the <strong>Commission on Human Rights and Administrative Justice (CHRAJ)</strong>
                  of Ghana.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
