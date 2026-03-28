import {
  AlertCircle,
  Camera,
  CheckCircle,
  CreditCard,
  Info,
  Loader,
  RefreshCw,
  ShieldCheck,
  Upload,
  User,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { niaApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import './GhanaCardVerification.css';

const WRONG_DOC_KEYWORDS = ['passport', 'driver', 'driving', 'license', 'licence', 'nhis', 'voter', 'id-card', 'selfie', 'photo'];
const FACE_API_ENABLED = import.meta.env.VITE_FACE_API_ENABLED === 'true';
const NIA_API_URL = import.meta.env.VITE_NIA_API_URL || '';
const NIA_API_KEY = import.meta.env.VITE_NIA_API_KEY || '';

async function compareFaces(docImageBase64, liveImageBase64) {
  if (!FACE_API_ENABLED) return { match: true, confidence: 1 };
  if (!NIA_API_KEY || !NIA_API_URL) return { match: true, confidence: 1 };
  try {
    const res = await fetch(`${NIA_API_URL}/face-compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': NIA_API_KEY },
      body: JSON.stringify({ document_image: docImageBase64, live_image: liveImageBase64 }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });
}

export default function GhanaCardVerification({ onVerified, onSkip }) {
  const { t } = useLanguage();
  const [cardNumber, setCardNumber] = useState('');
  const [dob, setDob] = useState('');
  const [cardImageFile, setCardImageFile] = useState(null);
  const [cardImagePreview, setCardImagePreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [step, setStep] = useState('card');
  const [verifying, setVerifying] = useState(false);
  const [cardError, setCardError] = useState('');
  const [faceError, setFaceError] = useState('');
  const [verifiedData, setVerifiedData] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cardInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  const [cardWarn, setCardWarn] = useState('');

  const handleCardImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    const mightBeWrong = WRONG_DOC_KEYWORDS.some(kw => nameLower.includes(kw));
    setCardWarn(mightBeWrong
      ? t('the_file_may_not_be_ghana_card')
      : '');
    setCardImageFile(file);
    setCardImagePreview(URL.createObjectURL(file));
  };

  const formatCardNumber = (val) => {
    const clean = val.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    return clean;
  };

  const handleCardNumberChange = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
    setCardError('');
  };

  const validateCard = () => {
    if (!cardNumber.trim()) { setCardError(t('card_number_required')); return false; }
    const pattern = /^GHA-\d{9}-\d$/;
    if (!pattern.test(cardNumber)) {
      setCardError(t('card_number_invalid'));
      return false;
    }
    if (!dob) { setCardError(t('dob_required_verification')); return false; }
    if (!cardImageFile) { setCardError(t('card_photo_required')); return false; }
    return true;
  };

  const handleCardStep = async (e) => {
    e.preventDefault();
    if (!validateCard()) return;
    setVerifying(true);
    setCardError('');

    try {
      const result = await niaApi.verify(cardNumber, dob);
      setVerifiedData(result);
      setVerifying(false);
      setStep('selfie');
    } catch (err) {
      setCardError(err.message || t('card_verify_failed'));
      setVerifying(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setFaceError(t('camera_access_denied'));
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleSelfieFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
    stopCamera();
  };

  const handleFaceStep = async (e) => {
    e.preventDefault();
    if (!selfieFile) { setFaceError(t('selfie_required')); return; }
    setVerifying(true);
    setFaceError('');

    if (FACE_API_ENABLED && cardImageFile) {
      const [docBase64, liveBase64] = await Promise.all([
        fileToBase64(cardImageFile),
        fileToBase64(selfieFile),
      ]);
      const result = await compareFaces(docBase64, liveBase64);
      if (result && result.match === false) {
        setFaceError(t('face_comparison_failed'));
        setVerifying(false);
        return;
      }
    }

    setVerifying(false);
    setStep('done');
    onVerified({
      cardNumber,
      dateOfBirth: dob,
      fullName: verifiedData?.full_name || '',
      firstName: verifiedData?.first_name || '',
      lastName: verifiedData?.last_name || '',
      gender: verifiedData?.gender || '',
      nationality: verifiedData?.nationality || 'Ghanaian',
      region: verifiedData?.region || '',
    });
  };

  return (
    <div className="gcv-root">
      <div className="gcv-header">
        <div className="gcv-header-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h2 className="gcv-title">{t('identity_verification')}</h2>
          <p className="gcv-subtitle">{t('verify_ghanaian_identity')}</p>
        </div>
      </div>

      <div className="gcv-steps-bar">
        {['card', 'selfie', 'done'].map((s, i) => (
          <div key={s} className={`gcv-step-item${step === s ? ' active' : ''}${['selfie', 'done'].slice(i).length < (step === 'done' ? 0 : step === 'selfie' ? 1 : 2) ? ' done' : ''}`}>
            <div className="gcv-step-dot">
              {(s === 'card' && (step === 'selfie' || step === 'done')) ||
                (s === 'selfie' && step === 'done') ? (
                <CheckCircle size={14} />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <span className="gcv-step-label">
              {s === 'card' ? t('ghana_card_step') : s === 'selfie' ? t('liveness_photo_step') : t('verified_short')}
            </span>
          </div>
        ))}
      </div>

      {step === 'card' && (
        <form className="gcv-form" onSubmit={handleCardStep} noValidate>
          <div className="gcv-section-title">
            <CreditCard size={16} />
            {t('step_ghana_card_details')}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gcv-card-no">
              {t('ghana_card_number')} <span className="required">*</span>
            </label>
            <input
              id="gcv-card-no"
              type="text"
              className={`form-input${cardError && !dob ? ' input-error' : ''}`}
              placeholder="GHA-XXXXXXXXX-X"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={15}
              autoComplete="off"
            />
            <span className="form-hint">Format: GHA-000000000-0</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gcv-dob">
              {t('date_of_birth')} <span className="required">*</span>
            </label>
            <input
              id="gcv-dob"
              type="date"
              className="form-input"
              value={dob}
              onChange={e => { setDob(e.target.value); setCardError(''); }}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('ghana_card_photo')} <span className="required">*</span>
            </label>
            <div
              className={`gcv-upload-zone${cardImagePreview ? ' has-image' : ''}`}
              onClick={() => cardInputRef.current?.click()}
            >
              {cardImagePreview ? (
                <>
                  <img src={cardImagePreview} alt="Ghana Card" className="gcv-preview-img" />
                  <button
                    type="button"
                    className="gcv-remove-btn"
                    onClick={e => { e.stopPropagation(); setCardImageFile(null); setCardImagePreview(null); }}
                    aria-label={t('remove_card_image')}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <div className="gcv-upload-placeholder">
                  <Upload size={28} />
                  <p>{t('upload_ghana_card_photo')}</p>
                  <span>{t('image_format_hint')}</span>
                </div>
              )}
            </div>
            <input
              ref={cardInputRef}
              type="file"
              accept="image/*"
              className="gcv-hidden-input"
              onChange={handleCardImageChange}
            />
          </div>

          {cardWarn && (
            <div className="gcv-warn-box">
              <AlertCircle size={16} />
              <span>{cardWarn}</span>
            </div>
          )}

          {cardError && (
            <div className="gcv-error-box">
              <AlertCircle size={16} />
              <span>{cardError}</span>
            </div>
          )}

          <div className="gcv-info-note">
            <Info size={14} />
            <p>{t('your_data_encrypted_note')}</p>
          </div>

          <div className="gcv-actions">
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={verifying}
            >
              {verifying ? (
                <><Loader size={17} className="gcv-spin" /> {t('verifying')}</>
              ) : (
                <><ShieldCheck size={17} /> {t('verify_ghana_card_btn')}</>
              )}
            </button>
            {onSkip && (
              <button type="button" className="gcv-skip-btn" onClick={onSkip}>
                {t('skip_testing_only')}
              </button>
            )}
          </div>
        </form>
      )}

      {step === 'selfie' && (
        <form className="gcv-form" onSubmit={handleFaceStep} noValidate>
          <div className="gcv-section-title">
            <Camera size={16} />
            {t('step_liveness_photo')}
          </div>

          <div className="gcv-verified-badge">
            <CheckCircle size={16} />
            {t('ghana_card_verified_badge')} &bull; <strong>{verifiedData?.full_name || verifiedData?.nationality || t('ghana_card')}</strong>
          </div>

          <p className="gcv-selfie-instructions">
            {t('selfie_instruction')}
          </p>

          {cameraActive ? (
            <div className="gcv-camera-wrap">
              <video ref={videoRef} autoPlay playsInline muted className="gcv-camera-video" />
              <div className="gcv-camera-overlay-ring" />
              <div className="gcv-camera-actions">
                <button type="button" className="gcv-capture-btn" onClick={capturePhoto}>
                  <Camera size={22} />
                  {t('capture_photo')}
                </button>
                <button type="button" className="gcv-camera-cancel" onClick={stopCamera}>
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : selfiePreview ? (
            <div className="gcv-selfie-preview-wrap">
              <img src={selfiePreview} alt="Selfie" className="gcv-selfie-preview" />
              <button
                type="button"
                className="btn btn-outline btn-sm gcv-retake-btn"
                onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
              >
                <RefreshCw size={14} /> {t('retake')}
              </button>
            </div>
          ) : (
            <div className="gcv-selfie-options">
              <button type="button" className="gcv-selfie-option-btn" onClick={startCamera}>
                <Camera size={24} />
                <span>{t('use_camera')}</span>
              </button>
              <div className="gcv-selfie-or">{t('or')}</div>
              <button
                type="button"
                className="gcv-selfie-option-btn"
                onClick={() => selfieInputRef.current?.click()}
              >
                <Upload size={24} />
                <span>{t('upload_photo')}</span>
              </button>
            </div>
          )}

          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="gcv-hidden-input"
            onChange={handleSelfieFileChange}
          />

          {faceError && (
            <div className="gcv-error-box">
              <AlertCircle size={16} />
              <span>{faceError}</span>
            </div>
          )}

          <div className="gcv-actions">
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={verifying || !selfieFile}
            >
              {verifying ? (
                <><Loader size={17} className="gcv-spin" /> {t('comparing_faces')}</>
              ) : (
                <><CheckCircle size={17} /> {t('confirm_identity')}</>
              )}
            </button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="gcv-done-state">
          <div className="gcv-done-icon">
            <CheckCircle size={40} />
          </div>
          <h3>{t('identity_verified')}</h3>
          <p>{t('identity_verified_desc')}</p>
          <div className="gcv-done-info">
            <div className="gcv-done-row">
              <User size={14} />
              <span>{verifiedData?.full_name || t('verified_user')}</span>
            </div>
            <div className="gcv-done-row">
              <CreditCard size={14} />
              <span>{cardNumber}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
