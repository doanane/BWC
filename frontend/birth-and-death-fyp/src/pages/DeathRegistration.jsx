import { Bot, Check, ChevronLeft, ChevronRight, FileText, HeartHandshake, Mic, MicOff, Sparkles, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appsApi, aiApi } from '../api/client';
import BackIcon from '../components/BackIcon';
import RadioGroup from '../components/RadioGroup';
import { useSnackbar } from '../context/SnackbarContext';
import './FormPage.css';

const HAS_SPEECH = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

const REGIONS = [
    'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern',
    'Upper East', 'Upper West', 'Volta', 'Bono', 'Bono East', 'Ahafo',
    'Oti', 'Savannah', 'North East', 'Western North',
];

const SECTIONS = ['Deceased Information', 'Informant Details', 'Service & Delivery'];

const INITIAL_FORM = {
    deceased_first_name: '',
    deceased_last_name: '',
    deceased_other_names: '',
    deceased_dob: '',
    date_of_death: '',
    place_of_death: '',
    cause_of_death: '',
    death_type: 'NATURAL',
    gender: 'male',
    nationality: 'Ghanaian',
    occupation: '',

    informant_name: '',
    informant_relation: '',
    informant_phone: '',
    informant_address: '',
    registrant_ghana_card: '',

    region: '',
    district: '',
    service_plan: 'normal',
    delivery_method: 'PICKUP',
    delivery_address: '',
    delivery_region: '',
    delivery_district: '',
    delivery_digital_address: '',
    notes: '',
};

export default function DeathRegistration() {
    const navigate = useNavigate();
    const { success, error: showError } = useSnackbar();

    const [section, setSection] = useState(0);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);

    const [aiText, setAiText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRecording, setAiRecording] = useState(false);
    const [aiMsg, setAiMsg] = useState('');
    const [observationFile, setObservationFile] = useState(null);
    const [observationLoading, setObservationLoading] = useState(false);
    const [scanFile, setScanFile] = useState(null);
    const [scanLoading, setScanLoading] = useState(false);
    const aiRecogRef = useRef(null);

    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const onInput = (e) => set(e.target.name, e.target.value);

    const applyAiFields = (res) => {
        const f = res.fields || {};
        const providers = Array.isArray(res.providers_used) ? res.providers_used : [];
        const providerLabel = res.powered_by || 'Gemini + Anthropic';
        const updates = {};
        const fieldMap = {
            deceased_first_name: f.deceased_first_name,
            deceased_last_name: f.deceased_last_name,
            deceased_other_names: f.deceased_other_names,
            date_of_death: f.date_of_death,
            deceased_dob: f.deceased_dob,
            gender: f.gender,
            place_of_death: f.place_of_death,
            cause_of_death: f.cause_of_death,
            death_type: f.death_type,
            nationality: f.nationality,
            occupation: f.occupation,
            informant_name: f.informant_name,
            informant_relation: f.informant_relation,
            informant_phone: f.informant_phone,
        };

        let filled = 0;
        for (const [k, v] of Object.entries(fieldMap)) {
            if (v && v !== 'null') {
                updates[k] = String(v);
                filled++;
            }
        }

        if (filled > 0) {
            setForm(prev => ({ ...prev, ...updates }));
            const used = providers.length ? ` (${providers.join(' + ')})` : '';
            setAiMsg(`${filled} field${filled > 1 ? 's' : ''} filled. Please review all details carefully. Powered by ${providerLabel}${used}.`);
            return;
        }

        setAiMsg('Could not extract details. Try including the name, date, place, and cause of death.');
    };

    const runAiFill = async () => {
        if (!aiText.trim() || aiLoading) return;
        setAiLoading(true);
        setAiMsg('');
        try {
            const res = await aiApi.formFill(aiText.trim(), 'death');
            applyAiFields(res);
        } catch (err) {
            setAiMsg(err.message || 'AI fill unavailable. Please fill the form manually.');
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
                const res = await aiApi.documentVision(base64, mime, 'death');
                applyAiFields(res);
                if (!res.fields || Object.keys(res.fields).length === 0) {
                    setAiMsg('Could not extract fields. Try a clearer image of the death record.');
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

    const runObservationFill = async () => {
        if (!observationFile || observationLoading) return;
        setObservationLoading(true);
        setAiMsg('');
        try {
            const res = await aiApi.formFillFromObservation(observationFile, 'death', aiText.trim());
            applyAiFields(res);
        } catch (err) {
            setAiMsg(err.message || 'Observation upload could not be processed. Please upload a clear poster image or notes file and try again.');
        } finally {
            setObservationLoading(false);
        }
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

    const validateSection = () => {
        if (section === 0) {
            if (!form.deceased_first_name || !form.deceased_last_name || !form.date_of_death) {
                showError('Please complete required deceased details.');
                return false;
            }
        }

        if (section === 1) {
            if (!form.informant_name || !form.informant_phone) {
                showError('Informant name and phone are required.');
                return false;
            }
            if (!form.registrant_ghana_card) {
                showError('Registrant Ghana Card number is required.');
                return false;
            }
        }

        if (section === 2) {
            if (!form.region || !form.district) {
                showError('Region and district are required.');
                return false;
            }
            if (
                form.delivery_method === 'DELIVERY' &&
                (!form.delivery_address || !form.delivery_region || !form.delivery_district)
            ) {
                showError('Delivery address, region and district are required for delivery.');
                return false;
            }
        }

        return true;
    };

    const next = () => {
        if (!validateSection()) return;
        setSection((prev) => Math.min(prev + 1, SECTIONS.length - 1));
    };

    const back = () => setSection((prev) => Math.max(prev - 1, 0));

    const buildPayload = () => ({
        deceased_first_name: form.deceased_first_name.trim(),
        deceased_last_name: form.deceased_last_name.trim(),
        deceased_other_names: form.deceased_other_names.trim() || null,
        deceased_dob: form.deceased_dob || null,
        date_of_death: form.date_of_death,
        place_of_death: form.place_of_death.trim() || null,
        cause_of_death: form.cause_of_death.trim() || null,
        death_type: form.death_type,
        gender: form.gender,
        nationality: form.nationality.trim() || null,
        occupation: form.occupation.trim() || null,

        informant_name: form.informant_name.trim(),
        informant_relation: form.informant_relation.trim() || null,
        informant_phone: form.informant_phone.trim(),
        informant_address: form.informant_address.trim() || null,
        registrant_ghana_card: form.registrant_ghana_card.trim() || null,

        region: form.region,
        district: form.district.trim(),
        service_plan: form.service_plan,
        delivery_method: form.delivery_method,
        delivery_address: form.delivery_method === 'DELIVERY' ? form.delivery_address.trim() || null : null,
        delivery_region: form.delivery_method === 'DELIVERY' ? form.delivery_region || null : null,
        delivery_district: form.delivery_method === 'DELIVERY' ? form.delivery_district.trim() || null : null,
        delivery_digital_address: form.delivery_method === 'DELIVERY' ? form.delivery_digital_address.trim() || null : null,
        notes: form.notes.trim() || null,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateSection()) return;

        setLoading(true);
        try {
            const created = await appsApi.createDeath(buildPayload());
            await appsApi.submit(created.id);
            success('Death registration submitted successfully. Proceed to payment.');
            navigate(`/payment?appId=${created.id}`);
        } catch (err) {
            showError(err.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-page">
            <div className="form-page-hero form-page-hero-gray">
                <div className="container form-hero-header">
                    <BackIcon />
                    <div>
                        <span className="form-page-eyebrow"><FileText size={14} /> Death Registration</span>
                        <h1 className="form-page-title">Register a Death</h1>
                        <p className="form-page-sub">Complete all sections to submit a death registration application.</p>
                    </div>
                </div>
            </div>

            <div className="container form-body">
                <div className="form-tabs">
                    {SECTIONS.map((label, index) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => setSection(index)}
                            className={`form-tab ${section === index ? 'active' : ''} ${index < section ? 'done' : ''}`}
                        >
                            <span className="form-tab-num">{index < section ? <Check size={14} /> : index + 1}</span> {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="form-card">
                    {section === 0 && (
                        <div className="form-section">
                            <h2 className="form-section-title">Deceased Person Information</h2>

                            <div className="grief-support-panel">
                                <div className="grief-support-icon"><HeartHandshake size={18} /></div>
                                <div>
                                    <div className="grief-support-title">We are here to help you through this</div>
                                    <div className="grief-support-text">
                                        We understand this is a difficult time. Complete this form at your own pace.
                                        You can use the AI assistant below to describe what happened and we will fill in the details for you.
                                        Our support line is available at <strong>0800-423-734</strong> if you need assistance.
                                    </div>
                                </div>
                            </div>

                            <div className="ai-assist-panel">
                                <div className="ai-assist-header">
                                    <Bot size={16} />
                                    <span>AI Assist — Describe the death or upload a one-week observation poster/photo (Powered by Gemini + Anthropic)</span>
                                </div>
                                <div className="ai-assist-input-row">
                                    <textarea
                                        className="ai-assist-textarea"
                                        value={aiText}
                                        onChange={e => setAiText(e.target.value)}
                                        placeholder='e.g. "My father Kofi Mensah passed away on March 15 2026 at Korle Bu Hospital in Accra. He was 72 years old. The cause was heart failure."'
                                        rows={3}
                                        disabled={aiLoading || aiRecording}
                                    />
                                </div>
                                <div className="ai-assist-input-row">
                                    {observationFile ? (
                                        <div className="br-file-preview">
                                            <span className="br-file-name">{observationFile.name}</span>
                                            <button type="button" className="br-file-remove" onClick={() => setObservationFile(null)} aria-label="Remove observation file">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="br-upload-label">
                                            <Upload size={16} />
                                            <span>Upload one-week observation poster/photo or notes</span>
                                            <input
                                                type="file"
                                                accept="image/*,.txt,.md,.json,text/plain,text/markdown,application/json"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    const file = e.target.files && e.target.files[0];
                                                    if (file) setObservationFile(file);
                                                }}
                                            />
                                        </label>
                                    )}
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
                                            <span>Or upload a photo of the death certificate/record to scan with AI</span>
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
                                        <button type="button" className={`ai-mic-btn${aiRecording ? ' recording' : ''}`} onClick={toggleAiRecording} title="Speak to describe">
                                            {aiRecording ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Speak</>}
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-primary ai-fill-btn" onClick={runAiFill} disabled={!aiText.trim() || aiLoading}>
                                        {aiLoading ? <><span className="spinner" /> Filling...</> : <><Sparkles size={14} /> Fill with AI</>}
                                    </button>
                                    <button type="button" className="btn btn-outline ai-fill-btn" onClick={runDocumentScan} disabled={!scanFile || scanLoading || aiLoading}>
                                        {scanLoading ? <><span className="spinner" /> Scanning...</> : <><Upload size={14} /> Scan Document</>}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline ai-fill-btn"
                                        onClick={runObservationFill}
                                        disabled={!observationFile || observationLoading || aiLoading}
                                    >
                                        {observationLoading ? <><span className="spinner" /> Extracting...</> : <><Upload size={14} /> Extract from Observation Upload</>}
                                    </button>
                                </div>
                                {aiMsg && (
                                    <div className={`ai-assist-msg${/unavailable|could not|unsupported|failed|required|too large|empty/i.test(aiMsg) ? ' error' : ' success'}`}>
                                        {aiMsg}
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name <span className="required">*</span></label>
                                    <input name="deceased_first_name" className="form-input" value={form.deceased_first_name} onChange={onInput} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Other Names</label>
                                    <input name="deceased_other_names" className="form-input" value={form.deceased_other_names} onChange={onInput} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name <span className="required">*</span></label>
                                    <input name="deceased_last_name" className="form-input" value={form.deceased_last_name} onChange={onInput} required />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input name="deceased_dob" type="date" className="form-input" value={form.deceased_dob} onChange={onInput} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date of Death <span className="required">*</span></label>
                                    <input
                                        name="date_of_death"
                                        type="date"
                                        className="form-input"
                                        value={form.date_of_death}
                                        onChange={onInput}
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nationality</label>
                                    <input name="nationality" className="form-input" value={form.nationality} onChange={onInput} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Place of Death</label>
                                    <input name="place_of_death" className="form-input" value={form.place_of_death} onChange={onInput} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Occupation</label>
                                    <input name="occupation" className="form-input" value={form.occupation} onChange={onInput} />
                                </div>
                            </div>

                            <RadioGroup
                                name="gender"
                                label="Gender"
                                required
                                value={form.gender}
                                onChange={(value) => set('gender', value)}
                                layout="horizontal"
                                options={[
                                    { value: 'male', label: 'Male' },
                                    { value: 'female', label: 'Female' },
                                ]}
                            />

                            <RadioGroup
                                name="death_type"
                                label="Cause Category"
                                required
                                value={form.death_type}
                                onChange={(value) => set('death_type', value)}
                                layout="card"
                                options={[
                                    { value: 'NATURAL', label: 'Natural', description: 'Illness or old age' },
                                    { value: 'ACCIDENT', label: 'Accident', description: 'Road or workplace accident' },
                                    { value: 'HOMICIDE', label: 'Homicide', description: 'Unlawful killing' },
                                    { value: 'STILLBIRTH', label: 'Stillbirth', description: 'Death around delivery' },
                                ]}
                            />

                            <div className="form-group">
                                <label className="form-label">Cause of Death</label>
                                <input name="cause_of_death" className="form-input" value={form.cause_of_death} onChange={onInput} />
                            </div>
                        </div>
                    )}

                    {section === 1 && (
                        <div className="form-section">
                            <h2 className="form-section-title">Informant Details</h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Informant Name <span className="required">*</span></label>
                                    <input name="informant_name" className="form-input" value={form.informant_name} onChange={onInput} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Relationship</label>
                                    <input name="informant_relation" className="form-input" value={form.informant_relation} onChange={onInput} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone <span className="required">*</span></label>
                                    <input name="informant_phone" className="form-input" value={form.informant_phone} onChange={onInput} required placeholder="+233XXXXXXXXX" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <input name="informant_address" className="form-input" value={form.informant_address} onChange={onInput} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Registrant Ghana Card Number <span className="required">*</span></label>
                                    <input name="registrant_ghana_card" className="form-input" value={form.registrant_ghana_card} onChange={onInput} placeholder="GHA-XXXXXXXXX-X" required />
                                    <span className="form-hint">Ghana Card of the person registering this death. Required for identity verification.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {section === 2 && (
                        <div className="form-section">
                            <h2 className="form-section-title">Service & Delivery</h2>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Region <span className="required">*</span></label>
                                    <select name="region" className="form-select" value={form.region} onChange={onInput} required>
                                        <option value="">Select Region</option>
                                        {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">District <span className="required">*</span></label>
                                    <input name="district" className="form-input" value={form.district} onChange={onInput} required />
                                </div>
                            </div>

                            <RadioGroup
                                name="service_plan"
                                label="Service Plan"
                                required
                                value={form.service_plan}
                                onChange={(value) => set('service_plan', value)}
                                layout="card"
                                options={[
                                    { value: 'normal', label: 'Normal', description: 'Standard processing time' },
                                    { value: 'express', label: 'Express', description: 'Faster processing with additional fee' },
                                ]}
                            />

                            <RadioGroup
                                name="delivery_method"
                                label="Collection Method"
                                required
                                value={form.delivery_method}
                                onChange={(value) => set('delivery_method', value)}
                                layout="card"
                                options={[
                                    { value: 'PICKUP', label: 'Office Pickup', description: 'Collect at district office' },
                                    { value: 'DELIVERY', label: 'Home Delivery', description: 'Deliver to your address' },
                                ]}
                            />

                            {form.delivery_method === 'DELIVERY' && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Delivery Region <span className="required">*</span></label>
                                            <select name="delivery_region" className="form-select" value={form.delivery_region} onChange={onInput} required>
                                                <option value="">Select Region</option>
                                                {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Delivery District <span className="required">*</span></label>
                                            <input name="delivery_district" className="form-input" value={form.delivery_district} onChange={onInput} required />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Delivery Address <span className="required">*</span></label>
                                        <textarea name="delivery_address" className="form-textarea" value={form.delivery_address} onChange={onInput} rows={3} required />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Additional Notes</label>
                                <textarea name="notes" className="form-textarea" value={form.notes} onChange={onInput} rows={3} />
                            </div>
                        </div>
                    )}

                    <div className="form-nav">
                        {section > 0 && (
                            <button type="button" className="btn btn-outline" onClick={back}><ChevronLeft size={16} /> Back</button>
                        )}

                        {section < SECTIONS.length - 1 ? (
                            <button type="button" className="btn btn-primary" onClick={next} style={{ marginLeft: 'auto' }}>
                                Continue <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginLeft: 'auto' }}>
                                {loading ? <><span className="spinner" />Submitting…</> : <><Check size={16} /> Submit and Proceed to Payment</>}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
