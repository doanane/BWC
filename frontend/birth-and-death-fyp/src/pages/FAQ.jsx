import { Baby, ChevronDown, FileText, Globe, Heart, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import './FAQ.css';

const FAQ_CATEGORIES = [
  {
    id: 'birth',
    label: 'Birth Registration',
    icon: Baby,
    questions: [
      {
        q: 'What documents are needed to register a birth?',
        a: 'You need a hospital birth notification, parents\u2019 IDs, marriage certificate (if applicable), and your Ghana Card or passport.',
      },
      {
        q: 'How long do I have to register a birth?',
        a: 'You have 12 months from the date of birth to register for free. After 12 months, a late registration fee applies.',
      },
      {
        q: 'Can I register a birth online?',
        a: 'Yes. Create an account on this portal, complete the birth registration form, and submit. You will receive a reference number to track your application.',
      },
      {
        q: 'What is the cost of birth registration?',
        a: 'Birth registration is free within 12 months. Late registration (after 12 months) attracts a fee depending on how late the registration is.',
      },
      {
        q: 'Can I register a birth for a child born abroad?',
        a: 'Yes. Ghanaian children born abroad can be registered at any BDR regional office or through the Ghana Embassy in the respective country.',
      },
      {
        q: 'What is a certified true copy?',
        a: 'A certified true copy is an official copy of an existing birth or death registration, certified by the BDR. It is used when the original certificate is lost.',
      },
      {
        q: 'How do I get a birth certificate?',
        a: 'Once your application is approved, you will be notified to collect your certificate from your chosen district office. Bring your reference number and a valid ID.',
      },
      {
        q: 'Can I register twins or multiple births?',
        a: 'Yes. Each child must be registered separately with their individual details. Multiple births can be submitted in one visit.',
      },
    ],
  },
  {
    id: 'death',
    label: 'Death Registration',
    icon: Heart,
    questions: [
      {
        q: 'Who can register a death?',
        a: 'Any adult family member, the attending physician, or a registrar can register a death. The informant must provide a valid ID.',
      },
      {
        q: 'What documents are needed to register a death?',
        a: 'You need a medical certificate of cause of death (from a doctor or hospital), deceased\u2019s Ghana Card or ID, informant\u2019s ID, and burial permit request.',
      },
      {
        q: 'How long do I have to register a death?',
        a: 'Deaths should be registered within 3 months. Late registration attracts fees and may require additional documentation.',
      },
      {
        q: 'What is a burial permit?',
        a: 'A burial permit is an official document issued after death registration that authorizes the burial or cremation of the deceased. It is legally required.',
      },
      {
        q: 'What if the cause of death is unknown or suspicious?',
        a: 'Deaths with unknown or suspicious causes must be referred to a medical examiner or coroner before registration. A post-mortem report may be required.',
      },
      {
        q: 'Can a stillbirth be registered?',
        a: 'Yes. Stillbirths after 28 weeks of gestation must be registered as a death. A medical certificate from the attending physician is required.',
      },
    ],
  },
  {
    id: 'certificates',
    label: 'Certificates & Documents',
    icon: FileText,
    questions: [
      {
        q: 'How long does it take to get a certificate?',
        a: 'Standard processing takes 5\u201310 business days. Express service (additional fee) takes 2\u20133 business days.',
      },
      {
        q: 'What should I do if I lose my certificate?',
        a: 'Visit any BDR district office or apply online to request a certified true copy. Bring your reference number and a valid ID.',
      },
      {
        q: 'Can I collect my certificate from a different district?',
        a: 'Yes. During registration, you can specify any district office in Ghana for collection, regardless of where the event occurred.',
      },
      {
        q: 'Are BDR certificates accepted internationally?',
        a: 'Yes. Ghana BDR certificates are legally recognized documents. For international use, they may need to be apostilled at the Ministry of Foreign Affairs.',
      },
      {
        q: 'What is the fee for a certified true copy?',
        a: 'Fees vary by certificate type and urgency. Visit the fees page or contact any district office for the current fee schedule.',
      },
    ],
  },
  {
    id: 'portal',
    label: 'Online Portal',
    icon: Globe,
    questions: [
      {
        q: 'Do I need an account to track my application?',
        a: 'No. You can track any application using your reference number without creating an account.',
      },
      {
        q: 'Is my personal data safe on this portal?',
        a: 'Yes. This portal uses government-grade SSL encryption and follows Ghana\u2019s Data Protection Act 2012. Your data is never shared without consent.',
      },
      {
        q: 'What browsers are supported?',
        a: 'The portal supports all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.',
      },
      {
        q: 'How do I report a technical issue?',
        a: 'Use the Contact Us page to report technical issues, or email support@bdregistry.gov.gh with a description and screenshot of the problem.',
      },
    ],
  },
];

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className={`faq-item${isOpen ? ' faq-item--open' : ''}`}>
      <button className="faq-question" onClick={onToggle} aria-expanded={isOpen}>
        <span>{question}</span>
        <ChevronDown size={18} className="faq-chevron" />
      </button>
      <div className="faq-answer-wrap">
        <div className="faq-answer">
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState('birth');
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (categoryId, index) => {
    const key = `${categoryId}-${index}`;
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeData = FAQ_CATEGORIES.find((c) => c.id === activeCategory);

  const totalQuestions = FAQ_CATEGORIES.reduce((sum, c) => sum + c.questions.length, 0);

  return (
    <div className="faq-page">

      {/* Hero */}
      <section className="faq-hero">
        <div className="container">
          <div className="faq-hero-inner">
            <div className="faq-hero-icon-wrap">
              <HelpCircle size={36} />
            </div>
            <h1 className="faq-hero-title">Frequently Asked Questions</h1>
            <p className="faq-hero-subtitle">
              Find answers to the most common questions about birth and death
              registration, certificates, and the online portal.
            </p>
            <div className="faq-hero-meta">
              <span>{totalQuestions} questions across {FAQ_CATEGORIES.length} categories</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="faq-category-bar">
        <div className="container">
          <div className="faq-category-grid">
            {FAQ_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className={`faq-category-btn${activeCategory === cat.id ? ' faq-category-btn--active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <Icon size={20} />
                  <span>{cat.label}</span>
                  <span className="faq-category-count">{cat.questions.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <section className="section faq-content-section">
        <div className="container">
          <div className="faq-content-layout">

            {/* Sidebar */}
            <aside className="faq-sidebar">
              <div className="faq-sidebar-card">
                <h3 className="faq-sidebar-title">Categories</h3>
                <nav className="faq-sidebar-nav">
                  {FAQ_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        className={`faq-sidebar-link${activeCategory === cat.id ? ' faq-sidebar-link--active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                      >
                        <Icon size={16} />
                        <span>{cat.label}</span>
                        <span className="faq-sidebar-badge">{cat.questions.length}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="faq-sidebar-help">
                <HelpCircle size={24} />
                <h4>Still have questions?</h4>
                <p>Our support team is available Monday to Friday, 8:00 AM to 5:00 PM.</p>
                <a href="/contact" className="btn btn-primary btn-sm btn-block">
                  Contact Support
                </a>
              </div>
            </aside>

            {/* Accordion */}
            <main className="faq-main">
              {activeData && (
                <>
                  <div className="faq-section-header">
                    {(() => {
                      const Icon = activeData.icon;
                      return (
                        <div className="faq-section-heading">
                          <div className="faq-section-icon">
                            <Icon size={20} />
                          </div>
                          <div>
                            <h2 className="faq-section-title">{activeData.label}</h2>
                            <p className="faq-section-count">
                              {activeData.questions.length} question{activeData.questions.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="faq-accordion">
                    {activeData.questions.map((item, i) => (
                      <AccordionItem
                        key={i}
                        question={item.q}
                        answer={item.a}
                        isOpen={!!openItems[`${activeData.id}-${i}`]}
                        onToggle={() => toggleItem(activeData.id, i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="faq-cta-section">
        <div className="container">
          <div className="faq-cta-inner">
            <HelpCircle size={28} />
            <div>
              <h3>Cannot find what you are looking for?</h3>
              <p>Contact our offices directly or visit a district office near you.</p>
            </div>
            <div className="faq-cta-actions">
              <a href="/contact" className="btn btn-primary">Contact Us</a>
              <a href="/offices" className="btn btn-outline">Find an Office</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
