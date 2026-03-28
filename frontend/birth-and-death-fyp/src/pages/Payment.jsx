import {
    ArrowLeft, CheckCircle, CreditCard, Info, Lock, ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../api/client';
import { useSnackbar } from '../context/SnackbarContext';
import './Payment.css';

export default function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { success, error: showError } = useSnackbar();

    const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const appId = query.get('appId');
    const callbackReference = query.get('reference');

    const [step, setStep] = useState('review');
    const [loading, setLoading] = useState(false);
    const [paymentRef, setPaymentRef] = useState('');
    const [pricing, setPricing] = useState(null);

    const [channel, setChannel] = useState('card');
    const [mobileNumber, setMobileNumber] = useState('');
    const [mobileProvider, setMobileProvider] = useState('mtn');

    useEffect(() => {
        paymentsApi.pricing().then(setPricing).catch(() => null);
    }, []);

    useEffect(() => {
        if (!callbackReference) return;

        const verifyAfterCallback = async () => {
            setLoading(true);
            try {
                const verified = await paymentsApi.verify(callbackReference);
                if (verified.status === 'COMPLETED') {
                    setPaymentRef(verified.reference || callbackReference);
                    setStep('success');
                    success('Payment verified successfully.');
                } else {
                    showError(`Payment status: ${verified.status}`);
                }
            } catch (err) {
                showError(err.message || 'Could not verify payment callback.');
            } finally {
                setLoading(false);
            }
        };

        verifyAfterCallback();
    }, [callbackReference, success, showError]);

    const totalFee = pricing?.normal?.fee || 0;

    const handleProceed = () => {
        if (!appId) {
            showError('Missing application id for payment.');
            return;
        }
        if (channel === 'mobile_money' && !mobileNumber.trim()) {
            showError('Mobile number is required for mobile money payment.');
            return;
        }
        setStep('pay');
    };

    const handlePay = async () => {
        if (!appId) {
            showError('Missing application id for payment.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                application_id: Number(appId),
                payment_type: 'application_fee',
                channel,
                mobile_number: channel === 'mobile_money' ? mobileNumber : null,
                mobile_money_provider: channel === 'mobile_money' ? mobileProvider : null,
                callback_url: `${window.location.origin}/payment?appId=${appId}`,
            };

            const initiated = await paymentsApi.initiate(payload);
            setPaymentRef(initiated.reference);

            if (initiated.authorization_url) {
                window.location.href = initiated.authorization_url;
                return;
            }

            const verified = await paymentsApi.verify(initiated.reference);
            if (verified.status === 'COMPLETED') {
                setStep('success');
                success('Payment completed successfully.');
            } else {
                showError(`Payment created with status: ${verified.status}`);
            }
        } catch (err) {
            showError(err.message || 'Unable to process payment right now.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="payment-page">
            <section className="payment-hero">
                <div className="container">
                    <Link to="/dashboard" className="payment-back-link">
                        <ArrowLeft size={16} /> Back
                    </Link>
                    <div className="payment-hero-inner">
                        <div className="payment-hero-icon"><CreditCard size={28} /></div>
                        <h1 className="payment-hero-title">Payment Portal</h1>
                        <p className="payment-hero-subtitle">
                            Complete your secure payment to continue application processing.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section payment-main">
                <div className="container">
                    <div className="payment-layout">
                        <div className="payment-form-col">
                            {step === 'success' ? (
                                <div className="payment-success-card">
                                    <div className="payment-success-icon"><CheckCircle size={44} /></div>
                                    <h2 className="payment-success-title">Payment Successful</h2>
                                    <p className="payment-success-sub">Your payment has been verified and recorded.</p>
                                    <div className="payment-ref-box">
                                        <span className="payment-ref-label">Payment Reference</span>
                                        <span className="payment-ref-value">{paymentRef}</span>
                                    </div>
                                    <div className="payment-success-actions">
                                        <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</Link>
                                        <Link to="/track" className="btn btn-outline btn-lg">Track Application</Link>
                                    </div>
                                </div>
                            ) : step === 'pay' ? (
                                <div className="payment-pay-card">
                                    <div className="payment-card-header">
                                        <Lock size={18} />
                                        <h2>Confirm &amp; Pay</h2>
                                    </div>

                                    <div className="payment-summary-box">
                                        <div className="payment-summary-row"><span>Application ID</span><strong>{appId || '—'}</strong></div>
                                        <div className="payment-summary-row"><span>Payment Channel</span><strong>{channel}</strong></div>
                                        <div className="payment-summary-divider" />
                                        <div className="payment-summary-total">
                                            <span>Estimated Total</span>
                                            <strong className="payment-total-amount">GH₵ {totalFee}.00</strong>
                                        </div>
                                    </div>

                                    <div className="payment-secure-note">
                                        <ShieldCheck size={16} />
                                        <span>Transaction is processed through verified gateway integration.</span>
                                    </div>

                                    <button className="btn btn-primary btn-lg btn-block payment-pay-btn" onClick={handlePay} disabled={loading}>
                                        {loading ? <><span className="spinner" /> Processing...</> : <><Lock size={17} /> Pay Securely</>}
                                    </button>

                                    <button className="payment-back-btn" onClick={() => setStep('review')}>
                                        <ArrowLeft size={14} /> Change Details
                                    </button>
                                </div>
                            ) : (
                                <div className="payment-review-card">
                                    <div className="payment-card-header">
                                        <CreditCard size={18} />
                                        <h2>Payment Details</h2>
                                    </div>

                                    {!appId && (
                                        <div className="payment-info-box" style={{ marginBottom: 16 }}>
                                            <Info size={16} />
                                            <p>Open this page with a valid application id: <strong>/payment?appId=123</strong>.</p>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="form-label">Payment Channel</label>
                                        <select className="form-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
                                            <option value="card">Card</option>
                                            <option value="mobile_money">Mobile Money</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                        </select>
                                    </div>

                                    {channel === 'mobile_money' && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label">Mobile Number</label>
                                                <input
                                                    className="form-input"
                                                    value={mobileNumber}
                                                    onChange={(e) => setMobileNumber(e.target.value)}
                                                    placeholder="+233XXXXXXXXX"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Provider</label>
                                                <select className="form-select" value={mobileProvider} onChange={(e) => setMobileProvider(e.target.value)}>
                                                    <option value="mtn">MTN</option>
                                                    <option value="vodafone">Vodafone</option>
                                                    <option value="airteltigo">AirtelTigo</option>
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    <div className="payment-info-box">
                                        <Info size={16} />
                                        <p>After clicking proceed, you will be redirected to complete payment and then returned for verification.</p>
                                    </div>

                                    <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleProceed}>
                                        Review &amp; Proceed
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="payment-sidebar">
                            <div className="payment-fee-card">
                                <div className="payment-fee-card-header">
                                    <CreditCard size={18} />
                                    <h3>Summary</h3>
                                </div>
                                <div className="payment-fee-service">
                                    <span className="payment-fee-service-label">Application ID</span>
                                    <p className="payment-fee-service-name">{appId || 'N/A'}</p>
                                </div>
                                <div className="payment-fee-total">
                                    <span>Estimated Total</span>
                                    <strong>GH₵ {totalFee}.00</strong>
                                </div>
                            </div>

                            <div className="payment-security-card">
                                <ShieldCheck size={20} className="payment-security-icon" />
                                <h4>Secure Payment</h4>
                                <ul className="payment-security-list">
                                    <li><CheckCircle size={13} /> Authenticated user required</li>
                                    <li><CheckCircle size={13} /> Backend verification enabled</li>
                                    <li><CheckCircle size={13} /> Realtime status updates</li>
                                    <li><CheckCircle size={13} /> Receipt generated on success</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
