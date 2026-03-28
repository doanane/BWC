import { AlertCircle, Baby, Bot, Check, ChevronLeft, ChevronRight, Mic, MicOff, Sparkles, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import BackIcon from '../components/BackIcon';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, appsApi, aiApi } from '../api/client';
import RadioGroup from '../components/RadioGroup';
import { useSnackbar } from '../context/SnackbarContext';
import './FormPage.css';

const HAS_SPEECH = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

const REGIONS = [
    'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern',
    'Upper East', 'Upper West', 'Volta', 'Bono', 'Bono East', 'Ahafo',
    'Oti', 'Savannah', 'North East', 'Western North',
];

const SECTIONS = ['Child Information', 'Parents Details', 'Service & Delivery', 'Supporting Documents'];

const GHANA_CARD_RE = /^GHA-\d{9}-\d$/;
const PHONE_RE = /^(\+233|0)[0-9]{9}$/;
const ALPHA_RE = /^[A-Za-z\s\-']+$/;

const INITIAL_FORM = {
    child_first_name: '', child_last_name: '', child_other_names: '',
    child_date_of_birth: '', child_gender: 'male', child_place_of_birth: '',
    child_region_of_birth: '', child_district_of_birth: '', child_nationality: 'Ghanaian',

    father_first_name: '', father_last_name: '', father_other_names: '',
    father_nationality: 'Ghanaian', father_date_of_birth: '',
    father_ghana_card: '', father_occupation: '', father_phone: '', father_address: '',

    mother_first_name: '', mother_last_name: '', mother_other_names: '',
    mother_nationality: 'Ghanaian', mother_date_of_birth: '',
    mother_ghana_card: '', mother_occupation: '', mother_phone: '', mother_address: '',

    informant_name: '', informant_relationship: '', informant_phone: '', informant_address: '',
    hospital_name: '', hospital_address: '', attending_physician: '',

    service_plan: 'normal', delivery_method: 'PICKUP',
    delivery_address: '', delivery_region: '', delivery_district: '',
    delivery_digital_address: '', delivery_notes: '',
};

function formatGhanaCard(raw = '') {
    const clean = raw.replace(/[\s\-]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 12) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return `${clean.slice(0, 3)}-${clean.slice(3, 12)}-${clean.slice(12, 13)}`;
}

function onlyAlpha(e) {
    if (e.key.length === 1 && !/[A-Za-z\s\-']/.test(e.key)) e.preventDefault();
}

function onlyDigitsAndPlus(e) {
    if (e.key.length === 1 && !/[0-9+]/.test(e.key)) e.preventDefault();
}

function Field({ label, required, error, hint, children }) {
    return (
        <div className={`form-group${error ? ' has-error' : ''}`}>
            <label className="form-label">
                {label} {required && <span className="required">*</span>}
            </label>
            {children}
            {hint && !error && <span className="form-hint">{hint}</span>}
            {error && (
                <span className="form-error">
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {error}
                </span>
            )}
        </div>
    );
}

function DocUpload({ label, required, file, error, onChange, onRemove }) {
    return (
        <div className={`form-group${error ? ' has-error' : ''}`}>
            <label className="form-label">{label} {required && <span className="required">*</span>}</label>
            {file ? (
                <div className="br-file-preview">
                    <span className="br-file-name">{file.name}</span>
                    <button type="button" className="br-file-remove" onClick={onRemove} aria-label="Remove"><X size={14} /></button>
                </div>
            ) : (
                <label className="br-upload-label">
                    <Upload size={18} />
                    <span>Click to attach (JPEG, PNG, or PDF — max 10 MB)</span>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        style={{ display: 'none' }}
                        onChange={e => { if (e.target.files[0]) onChange(e.target.files[0]); }}
                    />
                </label>
            )}
            {error && (
                <span className="form-error">
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {error}
                </span>
            )}
        </div>
    );
}

export default function BirthRegistration() {
    const navigate = useNavigate();
    const { success, error: showError } = useSnackbar();

    const [section, setSection] = useState(0);
    const [completed, setCompleted] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [docs, setDocs] = useState({ hospital_notification: null, mother_ghana_card_doc: null, father_ghana_card_doc: null });
    const [docErrors, setDocErrors] = useState({});

    const [aiText, setAiText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRecording, setAiRecording] = useState(false);
    const [aiMsg, setAiMsg] = useState('');
    const [scanFile, setScanFile] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);
    const aiRecogRef = useRef(null);

    const set = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    };

    const runAiFill = async () => {
        if (!aiText.trim() || aiLoading) return;
        setAiLoading(true);
        setAiMsg('');
        try {
            const res = await aiApi.formFill(aiText.trim(), 'birth');
            const f = res.fields || {};
            const providers = Array.isArray(res.providers_used) ? res.providers_used : [];
            const providerLabel = res.powered_by || 'Gemini + Anthropic';
            const updates = {};
            const fieldMap = {
                child_first_name: f.child_first_name,
                child_last_name: f.child_last_name,
                child_other_names: f.child_other_names,
                child_date_of_birth: f.child_date_of_birth,
                child_gender: f.child_gender,
                child_place_of_birth: f.child_place_of_birth,
                child_region_of_birth: f.child_region_of_birth,
                child_district_of_birth: f.child_district_of_birth,
                mother_first_name: f.mother_first_name,
                mother_last_name: f.mother_last_name,
                mother_other_names: f.mother_other_names,
                mother_nationality: f.mother_nationality,
                mother_phone: f.mother_phone,
                father_first_name: f.father_first_name,
                father_last_name: f.father_last_name,
                father_nationality: f.father_nationality,
                father_phone: f.father_phone,
                hospital_name: f.hospital_name,
                attending_physician: f.attending_physician,
            };
            let filled = 0;
            for (const [k, v] of Object.entries(fieldMap)) {
                if (v && v !== 'null') { updates[k] = String(v); filled++; }
            }
            if (filled > 0) {
                setForm(prev => ({ ...prev, ...updates }));
                const used = providers.length ? ` (${providers.join(' + ')})` : '';
                setAiMsg(`${filled} field${filled > 1 ? 's' : ''} filled. Review and correct any details below. Powered by ${providerLabel}${used}.`);
            } else {
                setAiMsg('Could not extract details. Try describing with names, date, place, and hospital.');
            }
        } catch {
            setAiMsg('AI fill unavailable. Please fill the form manually.');
        } finally {
            setAiLoading(false);
        }
    };

    const runDocumentScan = () => {
        if (!scanFile || scanLoading) return;
        setScanLoading(true);
        setAiMsg('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];
            const mime = scanFile.type || 'image/jpeg';
            try {
                const res = await aiApi.documentVision(base64, mime, 'birth');
                const f = res.fields || {};
                const fieldMap = {
                    child_first_name: f.child_first_name, child_last_name: f.child_last_name,
                    child_other_names: f.child_other_names, child_date_of_birth: f.child_date_of_birth,
                    child_gender: f.child_gender, child_place_of_birth: f.child_place_of_birth,
                    child_region_of_birth: f.child_region_of_birth, child_district_of_birth: f.child_district_of_birth,
                    mother_first_name: f.mother_first_name, mother_last_name: f.mother_last_name,
                    mother_nationality: f.mother_nationality, mother_phone: f.mother_phone,
                    father_first_name: f.father_first_name, father_last_name: f.father_last_name,
                    father_nationality: f.father_nationality, father_phone: f.father_phone,
                    hospital_name: f.hospital_name, attending_physician: f.attending_physician,
                };
                const updates = {};
                let filled = 0;
                for (const [k, v] of Object.entries(fieldMap)) {
                    if (v && v !== 'null') { updates[k] = String(v); filled++; }
                }
                if (filled > 0) {
                    setForm(prev => ({ ...prev, ...updates }));
                    setAiMsg(`${filled} field${filled > 1 ? 's' : ''} extracted from document scan. Powered by ${res.powered_by || 'AI'}. Review all details carefully.`);
                } else {
                    setAiMsg('Could not extract fields from this image. Try a clearer photo of the birth record.');
                }
            } catch {
                setAiMsg('Document scan unavailable. Please fill the form manually.');
            } finally {
                setScanLoading(false);
            }
        };
        reader.onerror = () => { setAiMsg('Could not read the file.'); setScanLoading(false); };
        reader.readAsDataURL(scanFile);
    };

    const toggleAiRecording = () => {
        if (!HAS_SPEECH) return;
        if (aiRecording) {
            if (aiRecogRef.current) aiRecogRef.current.stop();
            setAiRecording(false);
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = 'en-GH';
        rec.continuous = false;
        rec.interimResults = false;
        rec.onresult = e => { setAiText(e.results[0][0].transcript); setAiRecording(false); };
        rec.onerror = () => setAiRecording(false);
        rec.onend = () => setAiRecording(false);
        aiRecogRef.current = rec;
        rec.start();
        setAiRecording(true);
    };

    const onInput = e => set(e.target.name, e.target.value);

    const onAlphaInput = e => set(e.target.name, e.target.value.replace(/[^A-Za-z\s\-']/g, ''));

    const onPhoneInput = e => set(e.target.name, e.target.value.replace(/[^0-9+]/g, ''));

    const onGhanaCardInput = name => e => set(name, formatGhanaCard(e.target.value));

    const setDoc = (key, file) => {
        setDocs(prev => ({ ...prev, [key]: file }));
        if (docErrors[key]) setDocErrors(prev => ({ ...prev, [key]: '' }));
    };

    const validate = (sec) => {
        const errs = {};

        if (sec === 0) {
            if (!form.child_first_name.trim()) errs.child_first_name = 'First name is required';
            else if (!ALPHA_RE.test(form.child_first_name)) errs.child_first_name = 'Letters only';

            if (!form.child_last_name.trim()) errs.child_last_name = 'Last name is required';
            else if (!ALPHA_RE.test(form.child_last_name)) errs.child_last_name = 'Letters only';

            if (form.child_other_names && !ALPHA_RE.test(form.child_other_names))
                errs.child_other_names = 'Letters only';

            if (!form.child_date_of_birth) errs.child_date_of_birth = 'Date of birth is required';
            else if (new Date(form.child_date_of_birth) > new Date()) errs.child_date_of_birth = 'Cannot be a future date';

            if (!form.child_place_of_birth.trim()) errs.child_place_of_birth = 'Place of birth is required';
            if (!form.child_region_of_birth) errs.child_region_of_birth = 'Region of birth is required';
            if (!form.child_district_of_birth.trim()) errs.child_district_of_birth = 'District of birth is required';

            if (form.attending_physician && !ALPHA_RE.test(form.attending_physician))
                errs.attending_physician = 'Letters only';
        }

        if (sec === 1) {
            if (!form.mother_first_name.trim()) errs.mother_first_name = "Mother's first name is required";
            else if (!ALPHA_RE.test(form.mother_first_name)) errs.mother_first_name = 'Letters only';

            if (!form.mother_last_name.trim()) errs.mother_last_name = "Mother's last name is required";
            else if (!ALPHA_RE.test(form.mother_last_name)) errs.mother_last_name = 'Letters only';

            if (form.mother_other_names && !ALPHA_RE.test(form.mother_other_names)) errs.mother_other_names = 'Letters only';
            if (form.mother_date_of_birth && new Date(form.mother_date_of_birth) > new Date()) errs.mother_date_of_birth = 'Cannot be a future date';
            if (form.mother_phone && !PHONE_RE.test(form.mother_phone)) errs.mother_phone = 'Use +233XXXXXXXXX or 0XXXXXXXXX';
            if (form.mother_ghana_card && !GHANA_CARD_RE.test(form.mother_ghana_card)) errs.mother_ghana_card = 'Format must be GHA-XXXXXXXXX-X';

            if (form.father_first_name && !ALPHA_RE.test(form.father_first_name)) errs.father_first_name = 'Letters only';
            if (form.father_last_name && !ALPHA_RE.test(form.father_last_name)) errs.father_last_name = 'Letters only';
            if (form.father_date_of_birth && new Date(form.father_date_of_birth) > new Date()) errs.father_date_of_birth = 'Cannot be a future date';
            if (form.father_phone && !PHONE_RE.test(form.father_phone)) errs.father_phone = 'Use +233XXXXXXXXX or 0XXXXXXXXX';
            if (form.father_ghana_card && !GHANA_CARD_RE.test(form.father_ghana_card)) errs.father_ghana_card = 'Format must be GHA-XXXXXXXXX-X';

            if (form.informant_name && !ALPHA_RE.test(form.informant_name)) errs.informant_name = 'Letters only';
            if (form.informant_phone && !PHONE_RE.test(form.informant_phone)) errs.informant_phone = 'Use +233XXXXXXXXX or 0XXXXXXXXX';
        }

        if (sec === 2) {
            if (form.delivery_method === 'DELIVERY') {
                if (!form.delivery_region) errs.delivery_region = 'Delivery region is required';
                if (!form.delivery_district.trim()) errs.delivery_district = 'Delivery district is required';
                if (!form.delivery_address.trim()) errs.delivery_address = 'Delivery address is required';
            }
        }

        if (sec === 3) {
            const docErrs = {};
            if (!docs.hospital_notification) docErrs.hospital_notification = 'Hospital birth notification is required';
            if (!docs.mother_ghana_card_doc) docErrs.mother_ghana_card_doc = "Mother's Ghana Card document is required";
            setDocErrors(docErrs);
            if (Object.keys(docErrs).length) return { _docError: true };
        }

        return errs;
    };

    const next = () => {
        const errs = validate(section);
        if (errs._docError || Object.keys(errs).length > 0) {
            if (!errs._docError) setErrors(prev => ({ ...prev, ...errs }));
            showError('Please complete all required fields before continuing.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setErrors({});
        setCompleted(prev => new Set([...prev, section]));
        setSection(prev => Math.min(prev + 1, SECTIONS.length - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const back = () => { setErrors({}); setSection(prev => Math.max(prev - 1, 0)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    const buildPayload = () => ({
        child_first_name: form.child_first_name.trim(), child_last_name: form.child_last_name.trim(),
        child_other_names: form.child_other_names.trim() || null, child_date_of_birth: form.child_date_of_birth,
        child_gender: form.child_gender, child_place_of_birth: form.child_place_of_birth.trim(),
        child_region_of_birth: form.child_region_of_birth, child_district_of_birth: form.child_district_of_birth.trim(),
        child_nationality: 'Ghanaian',
        father_first_name: form.father_first_name.trim() || null, father_last_name: form.father_last_name.trim() || null,
        father_other_names: form.father_other_names.trim() || null, father_nationality: form.father_nationality.trim() || null,
        father_date_of_birth: form.father_date_of_birth || null, father_ghana_card: form.father_ghana_card.trim() || null,
        father_occupation: form.father_occupation.trim() || null, father_phone: form.father_phone.trim() || null,
        father_address: form.father_address.trim() || null,
        mother_first_name: form.mother_first_name.trim(), mother_last_name: form.mother_last_name.trim(),
        mother_other_names: form.mother_other_names.trim() || null, mother_nationality: form.mother_nationality.trim() || null,
        mother_date_of_birth: form.mother_date_of_birth || null, mother_ghana_card: form.mother_ghana_card.trim() || null,
        mother_occupation: form.mother_occupation.trim() || null, mother_phone: form.mother_phone.trim() || null,
        mother_address: form.mother_address.trim() || null,
        informant_name: form.informant_name.trim() || null, informant_relationship: form.informant_relationship.trim() || null,
        informant_phone: form.informant_phone.trim() || null, informant_address: form.informant_address.trim() || null,
        hospital_name: form.hospital_name.trim() || null, hospital_address: form.hospital_address.trim() || null,
        attending_physician: form.attending_physician.trim() || null,
        service_plan: form.service_plan, delivery_method: form.delivery_method,
        delivery_address: form.delivery_method === 'DELIVERY' ? form.delivery_address.trim() || null : null,
        delivery_region: form.delivery_method === 'DELIVERY' ? form.delivery_region || null : null,
        delivery_district: form.delivery_method === 'DELIVERY' ? form.delivery_district.trim() || null : null,
        delivery_digital_address: form.delivery_method === 'DELIVERY' ? form.delivery_digital_address.trim() || null : null,
        delivery_notes: form.delivery_notes.trim() || null,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate(section);
        if (errs._docError || Object.keys(errs).length > 0) {
            showError('Please attach all required documents before submitting.');
            return;
        }
        setLoading(true);
        try {
            const created = await appsApi.createBirth(buildPayload());
            const uploadDoc = async (file, docType) => {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('application_id', String(created.id));
                fd.append('document_type', docType);
                const token = localStorage.getItem('access_token');
                await fetch(`${API_BASE_URL}/documents/upload`, {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: fd,
                });
            };
            if (docs.hospital_notification) await uploadDoc(docs.hospital_notification, 'birth_notification');
            if (docs.mother_ghana_card_doc) await uploadDoc(docs.mother_ghana_card_doc, 'parent_ghana_card');
            if (docs.father_ghana_card_doc) await uploadDoc(docs.father_ghana_card_doc, 'parent_ghana_card');
            await appsApi.submit(created.id);
            success('Birth registration submitted successfully. Proceed to payment.');
            navigate(`/payment?appId=${created.id}`);
        } catch (err) {
            showError(err.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-page">
            <div className="form-page-hero">
                <div className="container form-hero-header">
                    <BackIcon />
                    <div>
                        <span className="form-page-eyebrow"><Baby size={14} /> Birth Registration</span>
                        <h1 className="form-page-title">Register a New Birth</h1>
                        <p className="form-page-sub">
                            Complete all four sections to submit a valid Ghana birth registration.
                            Required fields must be filled before moving to the next section.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container form-body">
                <div className="form-tabs">
                    {SECTIONS.map((label, index) => (
                        <div
                            key={label}
                            className={`form-tab${section === index ? ' active' : ''}${completed.has(index) ? ' done' : ''}`}
                        >
                            <span className="form-tab-num">
                                {completed.has(index) ? <Check size={14} /> : index + 1}
                            </span>
                            {label}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="form-card" noValidate>

                    {section === 0 && (
                        <div className="form-section">
                            <h2 className="form-section-title">Child Information</h2>
                            <p className="form-section-desc">
                                Enter the child's details as they should appear on the birth certificate.
                                Name fields accept letters, hyphens, and apostrophes only — no numbers or special characters.
                            </p>

                            <div className="ai-assist-panel">
                                <div className="ai-assist-header">
                                    <Bot size={16} />
                                    <span>AI Assist — Describe the birth or scan a document to fill the form (Claude + Gemini)</span>
                                </div>
                                <div className="ai-assist-input-row">
                                    <textarea
                                        className="ai-assist-textarea"
                                        value={aiText}
                                        onChange={e => setAiText(e.target.value)}
                                        placeholder='e.g. "My daughter Ama Boateng was born on March 10 2026 at Komfo Anokye Hospital in Kumasi. Her mother is Abena Boateng and father is Kofi Boateng."'
                                        rows={3}
                                        disabled={aiLoading || aiRecording}
                                    />
                                </div>
                                <div className="ai-assist-input-row">
                                    {scanFile ? (
                                        <div className="br-file-preview">
                                            <span className="br-file-name">{scanFile.name}</span>
                                            <button type="button" className="br-file-remove" onClick={() => setScanFile(null)} aria-label="Remove">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="br-upload-label">
                                            <Upload size={16} />
                                            <span>Or upload a photo of the birth record to scan with AI</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                style={{ display: 'none' }}
                                                onChange={(e) => { if (e.target.files[0]) setScanFile(e.target.files[0]); }}
                                            />
                                        </label>
                                    )}
                                </div>
                                <div className="ai-assist-actions">
                                    {HAS_SPEECH && (
                                        <button type="button" className={`ai-mic-btn${aiRecording ? ' recording' : ''}`} onClick={toggleAiRecording} title="Speak to describe the birth">
                                            {aiRecording ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Speak</>}
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-primary ai-fill-btn" onClick={runAiFill} disabled={!aiText.trim() || aiLoading}>
                                        {aiLoading ? <><span className="spinner" /> Filling...</> : <><Sparkles size={14} /> Fill with AI</>}
                                    </button>
                                    <button type="button" className="btn btn-outline ai-fill-btn" onClick={runDocumentScan} disabled={!scanFile || scanLoading || aiLoading}>
                                        {scanLoading ? <><span className="spinner" /> Scanning...</> : <><Upload size={14} /> Scan Document</>}
                                    </button>
                                </div>
                                {aiMsg && (
                                    <div className={`ai-assist-msg${/unavailable|could not|unsupported|failed|required|too large/i.test(aiMsg) ? ' error' : ' success'}`}>
                                        {aiMsg}
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <Field label="First Name" required error={errors.child_first_name}>
                                    <input
                                        name="child_first_name"
                                        className={`form-input${errors.child_first_name ? ' input-error' : ''}`}
                                        value={form.child_first_name}
                                        onChange={onAlphaInput}
                                        onKeyDown={onlyAlpha}
                                        placeholder="e.g. Kofi"
                                        autoComplete="given-name"
                                    />
                                </Field>
                                <Field label="Other Names" error={errors.child_other_names}>
                                    <input
                                        name="child_other_names"
                                        className={`form-input${errors.child_other_names ? ' input-error' : ''}`}
                                        value={form.child_other_names}
                                        onChange={onAlphaInput}
                                        onKeyDown={onlyAlpha}
                                        placeholder="Middle name(s)"
                                    />
                                </Field>
                                <Field label="Last Name" required error={errors.child_last_name}>
                                    <input
                                        name="child_last_name"
                                        className={`form-input${errors.child_last_name ? ' input-error' : ''}`}
                                        value={form.child_last_name}
                                        onChange={onAlphaInput}
                                        onKeyDown={onlyAlpha}
                                        placeholder="e.g. Mensah"
                                        autoComplete="family-name"
                                    />
                                </Field>
                            </div>

                            <div className="form-row">
                                <Field label="Date of Birth" required error={errors.child_date_of_birth}>
                                    <input
                                        name="child_date_of_birth"
                                        type="date"
                                        className={`form-input${errors.child_date_of_birth ? ' input-error' : ''}`}
                                        value={form.child_date_of_birth}
                                        onChange={onInput}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </Field>
                                <Field label="Place of Birth" required error={errors.child_place_of_birth} hint="Name of hospital, clinic, or home address">
                                    <input
                                        name="child_place_of_birth"
                                        className={`form-input${errors.child_place_of_birth ? ' input-error' : ''}`}
                                        value={form.child_place_of_birth}
                                        onChange={onInput}
                                        placeholder="e.g. Korle-Bu Teaching Hospital, Accra"
                                    />
                                </Field>
                                <Field label="Nationality">
                                    <input className="form-input" value="Ghanaian" readOnly disabled style={{ opacity: 0.65, cursor: 'not-allowed' }} />
                                </Field>
                            </div>

                            <RadioGroup
                                name="child_gender"
                                label="Sex of Child"
                                required
                                value={form.child_gender}
                                onChange={v => set('child_gender', v)}
                                layout="horizontal"
                                options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
                            />

                            <div className="form-row">
                                <Field label="Region of Birth" required error={errors.child_region_of_birth}>
                                    <select
                                        name="child_region_of_birth"
                                        className={`form-select${errors.child_region_of_birth ? ' input-error' : ''}`}
                                        value={form.child_region_of_birth}
                                        onChange={onInput}
                                    >
                                        <option value="">Select Region</option>
                                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </Field>
                                <Field label="District of Birth" required error={errors.child_district_of_birth}>
                                    <input
                                        name="child_district_of_birth"
                                        className={`form-input${errors.child_district_of_birth ? ' input-error' : ''}`}
                                        value={form.child_district_of_birth}
                                        onChange={onInput}
                                        placeholder="e.g. Accra Metropolitan"
                                    />
                                </Field>
                            </div>

                            <div className="form-section-divider" />
                            <h3 className="form-subsection-title">Hospital / Facility Details <span className="form-optional-label">(if applicable)</span></h3>
                            <div className="form-row">
                                <Field label="Hospital / Facility Name">
                                    <input
                                        name="hospital_name"
                                        className="form-input"
                                        value={form.hospital_name}
                                        onChange={onInput}
                                        placeholder="e.g. Korle-Bu Teaching Hospital"
                                    />
                                </Field>
                                <Field label="Attending Physician / Midwife" error={errors.attending_physician}>
                                    <input
                                        name="attending_physician"
                                        className={`form-input${errors.attending_physician ? ' input-error' : ''}`}
                                        value={form.attending_physician}
                                        onChange={onAlphaInput}
                                        onKeyDown={onlyAlpha}
                                        placeholder="Full name"
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {section === 1 && (
                        <div className="form-section">
                            <h2 className="form-section-title">Parents Details</h2>
                            <p className="form-section-desc">
                                Mother's details are required. Father's details are optional.
                                Name fields accept letters only. Phone fields accept digits and + only. Ghana Card must follow the format GHA-XXXXXXXXX-X.
                            </p>

                            <div className="form-subsection-block">
                                <h3 className="form-subsection-title">Mother <span className="required">*</span></h3>
                                <div className="form-row">
                                    <Field label="First Name" required error={errors.mother_first_name}>
                                        <input name="mother_first_name" className={`form-input${errors.mother_first_name ? ' input-error' : ''}`}
                                            value={form.mother_first_name} onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="e.g. Ama" />
                                    </Field>
                                    <Field label="Other Names" error={errors.mother_other_names}>
                                        <input name="mother_other_names" className={`form-input${errors.mother_other_names ? ' input-error' : ''}`}
                                            value={form.mother_other_names} onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="Middle name(s)" />
                                    </Field>
                                    <Field label="Last Name" required error={errors.mother_last_name}>
                                        <input name="mother_last_name" className={`form-input${errors.mother_last_name ? ' input-error' : ''}`}
                                            value={form.mother_last_name} onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="e.g. Asante" />
                                    </Field>
                                </div>
                                <div className="form-row">
                                    <Field label="Date of Birth" error={errors.mother_date_of_birth}>
                                        <input name="mother_date_of_birth" type="date" className={`form-input${errors.mother_date_of_birth ? ' input-error' : ''}`}
                                            value={form.mother_date_of_birth} onChange={onInput} max={new Date().toISOString().split('T')[0]} />
                                    </Field>
                                    <Field label="Nationality">
                                        <input name="mother_nationality" className="form-input" value={form.mother_nationality}
                                            onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="e.g. Ghanaian" />
                                    </Field>
                                    <Field label="Occupation">
                                        <input name="mother_occupation" className="form-input" value={form.mother_occupation}
                                            onChange={onInput} placeholder="e.g. Nurse" />
                                    </Field>
                                </div>
                                <div className="form-row">
                                    <Field label="Ghana Card Number" error={errors.mother_ghana_card} hint="Format: GHA-000000000-0">
                                        <input name="mother_ghana_card" className={`form-input${errors.mother_ghana_card ? ' input-error' : ''}`}
                                            value={form.mother_ghana_card} onChange={onGhanaCardInput('mother_ghana_card')}
                                            placeholder="GHA-XXXXXXXXX-X" maxLength={15} autoComplete="off" spellCheck={false} />
                                    </Field>
                                    <Field label="Phone Number" error={errors.mother_phone}>
                                        <input name="mother_phone" type="tel" className={`form-input${errors.mother_phone ? ' input-error' : ''}`}
                                            value={form.mother_phone} onChange={onPhoneInput} onKeyDown={onlyDigitsAndPlus}
                                            placeholder="+233XXXXXXXXX or 0XXXXXXXXX" />
                                    </Field>
                                </div>
                            </div>

                            <div className="form-section-divider" />

                            <div className="form-subsection-block">
                                <h3 className="form-subsection-title">Father <span className="form-optional-label">(Optional)</span></h3>
                                <div className="form-row">
                                    <Field label="First Name" error={errors.father_first_name}>
                                        <input name="father_first_name" className={`form-input${errors.father_first_name ? ' input-error' : ''}`}
                                            value={form.father_first_name} onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="e.g. Kwame" />
                                    </Field>
                                    <Field label="Other Names">
                                        <input name="father_other_names" className="form-input" value={form.father_other_names}
                                            onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="Middle name(s)" />
                                    </Field>
                                    <Field label="Last Name" error={errors.father_last_name}>
                                        <input name="father_last_name" className={`form-input${errors.father_last_name ? ' input-error' : ''}`}
                                            value={form.father_last_name} onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="e.g. Boateng" />
                                    </Field>
                                </div>
                                <div className="form-row">
                                    <Field label="Date of Birth" error={errors.father_date_of_birth}>
                                        <input name="father_date_of_birth" type="date" className={`form-input${errors.father_date_of_birth ? ' input-error' : ''}`}
                                            value={form.father_date_of_birth} onChange={onInput} max={new Date().toISOString().split('T')[0]} />
                                    </Field>
                                    <Field label="Nationality">
                                        <input name="father_nationality" className="form-input" value={form.father_nationality}
                                            onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="e.g. Ghanaian" />
                                    </Field>
                                    <Field label="Occupation">
                                        <input name="father_occupation" className="form-input" value={form.father_occupation}
                                            onChange={onInput} placeholder="e.g. Engineer" />
                                    </Field>
                                </div>
                                <div className="form-row">
                                    <Field label="Ghana Card Number" error={errors.father_ghana_card} hint="Format: GHA-000000000-0">
                                        <input name="father_ghana_card" className={`form-input${errors.father_ghana_card ? ' input-error' : ''}`}
                                            value={form.father_ghana_card} onChange={onGhanaCardInput('father_ghana_card')}
                                            placeholder="GHA-XXXXXXXXX-X" maxLength={15} autoComplete="off" spellCheck={false} />
                                    </Field>
                                    <Field label="Phone Number" error={errors.father_phone}>
                                        <input name="father_phone" type="tel" className={`form-input${errors.father_phone ? ' input-error' : ''}`}
                                            value={form.father_phone} onChange={onPhoneInput} onKeyDown={onlyDigitsAndPlus}
                                            placeholder="+233XXXXXXXXX or 0XXXXXXXXX" />
                                    </Field>
                                </div>
                            </div>

                            <div className="form-section-divider" />

                            <div className="form-subsection-block">
                                <h3 className="form-subsection-title">Informant <span className="form-optional-label">(Person reporting the birth)</span></h3>
                                <div className="form-row">
                                    <Field label="Full Name" error={errors.informant_name}>
                                        <input name="informant_name" className={`form-input${errors.informant_name ? ' input-error' : ''}`}
                                            value={form.informant_name} onChange={onAlphaInput} onKeyDown={onlyAlpha} placeholder="Full name" />
                                    </Field>
                                    <Field label="Relationship to Child">
                                        <select name="informant_relationship" className="form-select" value={form.informant_relationship} onChange={onInput}>
                                            <option value="">Select relationship</option>
                                            <option>Mother</option>
                                            <option>Father</option>
                                            <option>Grandparent</option>
                                            <option>Guardian</option>
                                            <option>Medical Officer</option>
                                            <option>Other</option>
                                        </select>
                                    </Field>
                                    <Field label="Phone Number" error={errors.informant_phone}>
                                        <input name="informant_phone" type="tel" className={`form-input${errors.informant_phone ? ' input-error' : ''}`}
                                            value={form.informant_phone} onChange={onPhoneInput} onKeyDown={onlyDigitsAndPlus}
                                            placeholder="+233XXXXXXXXX or 0XXXXXXXXX" />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    )}

                    {section === 2 && (
                        <div className="form-section">
                            <h2 className="form-section-title">Service &amp; Delivery</h2>
                            <p className="form-section-desc">
                                Select your preferred processing speed and how you would like to receive the birth certificate.
                            </p>

                            <RadioGroup
                                name="service_plan"
                                label="Processing Plan"
                                required
                                value={form.service_plan}
                                onChange={v => set('service_plan', v)}
                                layout="card"
                                options={[
                                    { value: 'normal', label: 'Standard Processing', description: 'Up to 30 working days — no additional charge' },
                                    { value: 'express', label: 'Express Processing', description: 'Up to 7 working days — additional fee applies' },
                                ]}
                            />

                            <RadioGroup
                                name="delivery_method"
                                label="Certificate Collection Method"
                                required
                                value={form.delivery_method}
                                onChange={v => set('delivery_method', v)}
                                layout="card"
                                options={[
                                    { value: 'PICKUP', label: 'Office Pickup', description: 'Collect from your nearest district Registry office — no delivery fee' },
                                    { value: 'DELIVERY', label: 'Home Delivery', description: 'Delivered to your specified address — delivery fee applies' },
                                ]}
                            />

                            {form.delivery_method === 'DELIVERY' && (
                                <div className="form-delivery-block">
                                    <h3 className="form-subsection-title">Delivery Address</h3>
                                    <div className="form-row">
                                        <Field label="Delivery Region" required error={errors.delivery_region}>
                                            <select name="delivery_region" className={`form-select${errors.delivery_region ? ' input-error' : ''}`}
                                                value={form.delivery_region} onChange={onInput}>
                                                <option value="">Select Region</option>
                                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Delivery District" required error={errors.delivery_district}>
                                            <input name="delivery_district" className={`form-input${errors.delivery_district ? ' input-error' : ''}`}
                                                value={form.delivery_district} onChange={onInput} placeholder="e.g. Accra Metropolitan" />
                                        </Field>
                                    </div>
                                    <Field label="Street / House Address" required error={errors.delivery_address}>
                                        <textarea name="delivery_address" className={`form-textarea${errors.delivery_address ? ' input-error' : ''}`}
                                            value={form.delivery_address} onChange={onInput} rows={3}
                                            placeholder="Full delivery address including house number, street name, and a landmark" />
                                    </Field>
                                    <Field label="Ghana Post GPS Digital Address">
                                        <input name="delivery_digital_address" className="form-input" value={form.delivery_digital_address}
                                            onChange={onInput} placeholder="e.g. GA-123-4567" />
                                    </Field>
                                </div>
                            )}

                            <Field label="Additional Notes">
                                <textarea name="delivery_notes" className="form-textarea" value={form.delivery_notes}
                                    onChange={onInput} rows={3} placeholder="Any special instructions for delivery or pickup" />
                            </Field>
                        </div>
                    )}

                    {section === 3 && (
                        <div className="form-section">
                            <h2 className="form-section-title">Supporting Documents</h2>
                            <p className="form-section-desc">
                                Attach clear scans or photos of the required documents. Accepted formats: JPEG, PNG, PDF (max 10 MB each).
                            </p>

                            <div className="form-doc-requirements">
                                <h3 className="form-subsection-title">Document Requirements</h3>
                                <ul className="form-doc-list">
                                    <li><strong><span className="required">*</span> Hospital birth notification</strong> — the official letter or form issued by the hospital confirming the birth</li>
                                    <li><strong><span className="required">*</span> Mother's Ghana Card</strong> — both front and back scanned into one file</li>
                                    <li><strong>Father's Ghana Card</strong> — optional, but required if father's details were provided above</li>
                                </ul>
                            </div>

                            <DocUpload
                                label="Hospital Birth Notification / Birth Announcement"
                                required
                                file={docs.hospital_notification}
                                error={docErrors.hospital_notification}
                                onChange={f => setDoc('hospital_notification', f)}
                                onRemove={() => setDoc('hospital_notification', null)}
                            />

                            <DocUpload
                                label="Mother's Ghana Card — front and back in one file"
                                required
                                file={docs.mother_ghana_card_doc}
                                error={docErrors.mother_ghana_card_doc}
                                onChange={f => setDoc('mother_ghana_card_doc', f)}
                                onRemove={() => setDoc('mother_ghana_card_doc', null)}
                            />

                            <DocUpload
                                label="Father's Ghana Card — front and back in one file (optional)"
                                file={docs.father_ghana_card_doc}
                                onChange={f => setDoc('father_ghana_card_doc', f)}
                                onRemove={() => setDoc('father_ghana_card_doc', null)}
                            />

                            <div className="form-submit-note">
                                By submitting this application you confirm that all information provided is accurate and true.
                                Providing false information is a criminal offence under Ghana law.
                            </div>
                        </div>
                    )}

                    <div className="form-nav">
                        {section > 0 && (
                            <button type="button" className="btn btn-outline" onClick={back}>
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}
                        {section < SECTIONS.length - 1 ? (
                            <button type="button" className="btn btn-primary" onClick={next} style={{ marginLeft: 'auto' }}>
                                Save &amp; Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginLeft: 'auto' }}>
                                {loading ? <><span className="spinner" /> Submitting…</> : <><Check size={16} /> Submit Application &amp; Proceed to Payment</>}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
