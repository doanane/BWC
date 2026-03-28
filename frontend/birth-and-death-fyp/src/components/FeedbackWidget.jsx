import { useState } from 'react';
import { MessageSquarePlus, X, Star, Send, CheckCircle } from 'lucide-react';
import { contactApi } from '../api/client';
import './FeedbackWidget.css';

const INITIAL = { name: '', email: '', message: '', rating: 0 };

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState('');
  const [apiError, setApiError] = useState('');

  const toggle = () => {
    setOpen((v) => !v);
    if (done) {
      setDone(false);
      setForm(INITIAL);
      setReference('');
      setApiError('');
      setErrors({});
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const setRating = (r) => setForm((prev) => ({ ...prev, rating: r }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.email.trim()) {
      errs.email = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email';
    }
    if (!form.message.trim()) errs.message = 'Required';
    return errs;
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
      const data = await contactApi.submitFeedback({
        name: form.name,
        email: form.email,
        message: form.message,
        rating: form.rating > 0 ? form.rating : null,
      });
      setReference(data.reference || '');
      setDone(true);
    } catch (err) {
      setApiError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || form.rating;

  return (
    <div className="fbw-root">
      {open && (
        <div className="fbw-panel">
          <div className="fbw-header">
            <div className="fbw-header-left">
              <MessageSquarePlus size={18} />
              <span>Share Feedback</span>
            </div>
            <button className="fbw-close" onClick={toggle} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {done ? (
            <div className="fbw-done">
              <div className="fbw-done-icon">
                <CheckCircle size={36} />
              </div>
              <h4>Thank You!</h4>
              <p>Your feedback helps us improve our services for all Ghanaians.</p>
              {reference && (
                <div className="fbw-reference">
                  <span className="fbw-ref-label">Reference</span>
                  <strong className="fbw-ref-code">{reference}</strong>
                </div>
              )}
              <button className="fbw-submit-btn" onClick={toggle}>Close</button>
            </div>
          ) : (
            <form className="fbw-form" onSubmit={handleSubmit} noValidate>
              {apiError && <p className="fbw-api-error">{apiError}</p>}

              <div className="fbw-stars-wrap">
                <span className="fbw-stars-label">How would you rate your experience?</span>
                <div
                  className="fbw-stars"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`fbw-star${displayRating >= n ? ' filled' : ''}`}
                      onMouseEnter={() => setHoverRating(n)}
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      <Star size={22} />
                    </button>
                  ))}
                </div>
                {form.rating > 0 && (
                  <span className="fbw-stars-text">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][form.rating]}
                  </span>
                )}
              </div>

              <div className="fbw-field">
                <input
                  name="name"
                  type="text"
                  className={`fbw-input${errors.name ? ' err' : ''}`}
                  placeholder="Your full name *"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
                {errors.name && <span className="fbw-err">{errors.name}</span>}
              </div>

              <div className="fbw-field">
                <input
                  name="email"
                  type="email"
                  className={`fbw-input${errors.email ? ' err' : ''}`}
                  placeholder="Email address *"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <span className="fbw-err">{errors.email}</span>}
              </div>

              <div className="fbw-field">
                <textarea
                  name="message"
                  className={`fbw-textarea${errors.message ? ' err' : ''}`}
                  placeholder="Tell us about your experience..."
                  rows={3}
                  value={form.message}
                  onChange={handleChange}
                />
                {errors.message && <span className="fbw-err">{errors.message}</span>}
              </div>

              <button type="submit" className="fbw-submit-btn" disabled={submitting}>
                {submitting ? (
                  <span className="spinner" aria-hidden="true" />
                ) : (
                  <>
                    <Send size={14} />
                    Submit Feedback
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        className={`fbw-fab${open ? ' open' : ''}`}
        onClick={toggle}
        aria-label={open ? 'Close feedback' : 'Share feedback'}
      >
        {open ? <X size={20} /> : <MessageSquarePlus size={20} />}
        {!open && <span>Feedback</span>}
      </button>
    </div>
  );
}
