import {
  AlertTriangle,
  AtSign,
  CheckCircle,
  Clock,
  Globe,
  Mail, MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { contactApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import './Contact.css';

const CONTACT_CARDS = [
  {
    icon: Phone,
    title: 'Phone',
    lines: [
      { text: '+233 302 665 125', href: 'tel:+233302665125' },
      { text: '+233 302 665 126', href: 'tel:+233302665126' },
    ],
    note: 'Monday to Friday, 8:00 AM to 5:00 PM',
  },
  {
    icon: Mail,
    title: 'Email',
    lines: [
      { text: 'info@bdregistry.gov.gh', href: 'mailto:info@bdregistry.gov.gh' },
      { text: 'support@bdregistry.gov.gh', href: 'mailto:support@bdregistry.gov.gh' },
    ],
    note: 'Response within 24 hours',
  },
  {
    icon: MapPin,
    title: 'Head Office',
    lines: [
      { text: 'Adabraka, near Kwame Nkrumah Circle' },
      { text: 'Accra, Ghana' },
      { text: 'P.O. Box M.48' },
    ],
    note: 'Greater Accra Region',
  },
  {
    icon: Clock,
    title: 'Office Hours',
    lines: [
      { text: 'Monday to Friday, 8:00 AM to 5:00 PM' },
      { text: 'Saturday: 9:00 AM \u2013 12:00 PM' },
      { text: 'Sunday: Closed' },
    ],
    note: 'Public holidays may vary',
  },
];

const REGIONAL_CONTACTS = [
  { region: 'Greater Accra', phone: '+233 302 665 125', address: 'Ministries, Accra' },
  { region: 'Ashanti', phone: '+233 032 202 4040', address: 'Harper Road, Kumasi' },
  { region: 'Western', phone: '+233 031 202 2000', address: 'Liberation Road, Sekondi' },
  { region: 'Eastern', phone: '+233 034 202 2018', address: 'Koforidua' },
  { region: 'Central', phone: '+233 033 213 2000', address: 'Cape Coast' },
  { region: 'Northern', phone: '+233 037 202 4000', address: 'Tamale' },
];

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Birth Registration',
  'Death Registration',
  'Certificate Request',
  'Technical Support',
  'Complaint',
  'Other',
];

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const BLANK_FORM = {
  submission_type: 'GENERAL',
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  rating: 0,
};

export default function Contact() {
  const { success } = useSnackbar();
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState(BLANK_FORM);
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      setForm((prev) => ({
        ...prev,
        name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [isAuthenticated, user]);

  const isFeedback = form.submission_type === 'FEEDBACK';

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required.';
    if (!form.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!isFeedback && !form.subject) errs.subject = 'Please select a subject.';
    if (!form.message.trim()) {
      errs.message = 'Message is required.';
    } else if (form.message.trim().length < 20) {
      errs.message = 'Please provide at least 20 characters.';
    }
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const handleTypeChange = (type) => {
    setForm((prev) => ({ ...prev, submission_type: type, subject: '', rating: 0 }));
    setErrors({});
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setApiError('');
    try {
      let data;
      if (isFeedback) {
        data = await contactApi.submitFeedback({
          name: form.name,
          email: form.email,
          message: form.message,
          rating: form.rating > 0 ? form.rating : null,
        });
      } else {
        data = await contactApi.submit({
          submission_type: form.submission_type,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          subject: form.subject,
          message: form.message,
        });
      }
      setReference(data.reference || '');
      setSubmitted(true);
      setForm((prev) => ({
        ...BLANK_FORM,
        name: isAuthenticated && user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : '',
        email: isAuthenticated && user ? (user.email || '') : '',
      }));
      success('Your submission has been received. We will respond within 24 hours.', 6000);
    } catch (err) {
      setApiError(err.message || 'Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setErrors({});
    setReference('');
    setApiError('');
  };

  const displayRating = hoverRating || form.rating;

  const submitLabel = isFeedback ? 'Submit Feedback' : form.submission_type === 'COMPLAINT' ? 'File Complaint' : 'Send Message';

  return (
    <div className="contact-page">

      <section className="contact-hero">
        <div className="container">
          <div className="contact-hero-split">
            <div className="contact-hero-inner">
              <div className="contact-hero-icon-wrap">
                <MessageSquare size={32} />
              </div>
              <h1 className="contact-hero-title">Get in Touch</h1>
              <p className="contact-hero-subtitle">
                Our team is ready to assist you with questions about registration,
                certificates, and any other vital events services. Reach us through
                any of the channels below.
              </p>
              <div className="contact-hero-badges">
                <span className="contact-hero-badge"><Phone size={13} /> 24hr Helpline</span>
                <span className="contact-hero-badge"><MessageSquare size={13} /> Live Chat</span>
                <span className="contact-hero-badge"><MapPin size={13} /> 260+ Offices</span>
              </div>
            </div>
            <div className="contact-hero-image-wrap">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzFE9SqpiFDHyh__rVhEcSIoxC0ojPROQCVg&s"
                alt="Ghana Births and Deaths Registry staff assisting a citizen"
                className="contact-hero-img"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section contact-info-section">
        <div className="container">
          <div className="contact-cards-grid">
            {CONTACT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="contact-info-card">
                  <div className="contact-info-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="contact-info-title">{card.title}</h3>
                  <ul className="contact-info-lines">
                    {card.lines.map((line, i) => (
                      <li key={i}>
                        {line.href
                          ? <a href={line.href} className="contact-info-link">{line.text}</a>
                          : line.text}
                      </li>
                    ))}
                  </ul>
                  <span className="contact-info-note">{card.note}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section contact-main-section">
        <div className="container">
          <div className="contact-two-col">

            <div className="contact-form-col">
              <div className="contact-form-card">
                <div className="contact-form-card-header">
                  <Send size={20} />
                  <h2 className="contact-form-card-title">
                    {isFeedback ? 'Share Your Feedback' : form.submission_type === 'COMPLAINT' ? 'File a Complaint' : 'Send Us a Message'}
                  </h2>
                </div>

                {submitted ? (
                  <div className="contact-success-state">
                    <div className="contact-success-icon">
                      <CheckCircle size={40} />
                    </div>
                    <h3>{isFeedback ? 'Thank You for Your Feedback!' : 'Submission Received'}</h3>
                    {reference && (
                      <div className="contact-reference-box">
                        <span className="contact-reference-label">Your Reference Number</span>
                        <strong className="contact-reference-code">{reference}</strong>
                        <span className="contact-reference-hint">Keep this reference to follow up on your submission.</span>
                      </div>
                    )}
                    <p>
                      {isFeedback
                        ? 'Your feedback helps us improve our services for all Ghanaians. We appreciate you taking the time.'
                        : 'A member of our team will review your message and respond within 24 business hours.'}
                    </p>
                    <button className="btn btn-outline" onClick={handleReset}>
                      Submit Another
                    </button>
                  </div>
                ) : (
                  <form className="contact-form" onSubmit={handleSubmit} noValidate>
                    {apiError && (
                      <div className="contact-api-error">
                        <AlertTriangle size={15} />
                        {apiError}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">I want to</label>
                      <div className="contact-type-tabs">
                        {[
                          { value: 'GENERAL', label: 'Make an Inquiry' },
                          { value: 'COMPLAINT', label: 'File a Complaint' },
                          { value: 'FEEDBACK', label: 'Give Feedback' },
                        ].map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            className={`contact-type-tab${form.submission_type === t.value ? ' active' : ''}`}
                            onClick={() => handleTypeChange(t.value)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isAuthenticated && user && (
                      <div className="contact-prefill-notice">
                        <CheckCircle size={14} />
                        Your name and email have been filled in from your account.
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label" htmlFor="cf-name">
                        <User size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Full Name <span className="required">*</span>
                      </label>
                      <input
                        id="cf-name"
                        name="name"
                        type="text"
                        className={`form-input${errors.name ? ' input-error' : ''}`}
                        placeholder="Enter your full name"
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                        readOnly={isAuthenticated && !!user?.first_name}
                      />
                      {errors.name && <span className="form-error">{errors.name}</span>}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="cf-email">
                          <AtSign size={14} style={{ display: 'inline', marginRight: 4 }} />
                          Email Address <span className="required">*</span>
                        </label>
                        <input
                          id="cf-email"
                          name="email"
                          type="email"
                          className={`form-input${errors.email ? ' input-error' : ''}`}
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={handleChange}
                          autoComplete="email"
                          readOnly={isAuthenticated && !!user?.email}
                        />
                        {errors.email && <span className="form-error">{errors.email}</span>}
                      </div>

                      {!isFeedback && (
                        <div className="form-group">
                          <label className="form-label" htmlFor="cf-phone">
                            <Phone size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Phone Number <span className="contact-optional">(Optional)</span>
                          </label>
                          <input
                            id="cf-phone"
                            name="phone"
                            type="tel"
                            className="form-input"
                            placeholder="+233 XX XXX XXXX"
                            value={form.phone}
                            onChange={handleChange}
                            autoComplete="tel"
                          />
                        </div>
                      )}
                    </div>

                    {isFeedback ? (
                      <div className="form-group">
                        <label className="form-label">Rate Your Experience <span className="contact-optional">(Optional)</span></label>
                        <div
                          className="contact-stars"
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`contact-star-btn${displayRating >= n ? ' filled' : ''}`}
                              onMouseEnter={() => setHoverRating(n)}
                              onClick={() => setForm((prev) => ({ ...prev, rating: n }))}
                              aria-label={`${n} star${n > 1 ? 's' : ''}`}
                            >
                              <Star size={26} />
                            </button>
                          ))}
                          {displayRating > 0 && (
                            <span className="contact-stars-label">{RATING_LABELS[displayRating]}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="form-label" htmlFor="cf-subject">
                          Subject <span className="required">*</span>
                        </label>
                        <select
                          id="cf-subject"
                          name="subject"
                          className={`form-select${errors.subject ? ' input-error' : ''}`}
                          value={form.subject}
                          onChange={handleChange}
                        >
                          <option value="">Select a subject...</option>
                          {SUBJECT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        {errors.subject && <span className="form-error">{errors.subject}</span>}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label" htmlFor="cf-message">
                        {isFeedback ? 'Your Feedback' : 'Message'} <span className="required">*</span>
                      </label>
                      <textarea
                        id="cf-message"
                        name="message"
                        className={`form-textarea${errors.message ? ' input-error' : ''}`}
                        placeholder={isFeedback ? 'Tell us about your experience and how we can improve...' : 'Describe your inquiry in detail...'}
                        rows={6}
                        value={form.message}
                        onChange={handleChange}
                      />
                      <span className="form-hint">
                        {form.message.trim().length} characters (minimum 20)
                      </span>
                      {errors.message && <span className="form-error">{errors.message}</span>}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-lg btn-block"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner" aria-hidden="true" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={17} />
                          {submitLabel}
                        </>
                      )}
                    </button>

                    <p className="contact-form-privacy">
                      Your information is protected under Ghana&apos;s Data Protection
                      Act 2012 and will not be shared with third parties.
                    </p>
                  </form>
                )}
              </div>
            </div>

            <div className="contact-regional-col">
              <div className="contact-regional-header">
                <Globe size={20} />
                <h2 className="contact-regional-title">Regional Office Contacts</h2>
              </div>
              <p className="contact-regional-desc">
                For region-specific matters, contact the relevant regional office directly.
              </p>
              <div className="contact-regional-list">
                {REGIONAL_CONTACTS.map((r) => (
                  <div key={r.region} className="contact-regional-item">
                    <div className="contact-regional-item-icon">
                      <MapPin size={16} />
                    </div>
                    <div className="contact-regional-item-body">
                      <h4 className="contact-regional-region">{r.region} Region</h4>
                      <p className="contact-regional-address">{r.address}</p>
                      <a
                        href={`tel:${r.phone.replace(/\s/g, '')}`}
                        className="contact-regional-phone"
                      >
                        <Phone size={13} />
                        {r.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/offices" className="btn btn-outline btn-block contact-all-offices-btn">
                View All 16 Regional Offices
              </a>
            </div>

          </div>
        </div>
      </section>

      <div className="contact-emergency-banner">
        <div className="container">
          <div className="contact-emergency-inner">
            <div className="contact-emergency-icon">
              <Phone size={22} />
            </div>
            <div className="contact-emergency-text">
              <strong>Emergency &amp; Urgent Assistance</strong>
              <span>
                For urgent assistance, call our 24-hour emergency line:{' '}
                <strong>0800-BDR-REG (0800-237-734)</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
