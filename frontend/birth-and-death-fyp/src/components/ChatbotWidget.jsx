import { Bot, MessageCircle, Mic, MicOff, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { chatbotApi } from '../api/client';
import MarkdownText from './MarkdownText';
import { useSnackbar } from '../context/SnackbarContext';
import './ChatbotWidget.css';

const LANGUAGES = [
    { code: 'English', label: 'English', speechLang: 'en-GH' },
    { code: 'Twi', label: 'Twi (Akan)', speechLang: 'ak-GH' },
    { code: 'Ga', label: 'Ga', speechLang: 'gaa-GH' },
    { code: 'Ewe', label: 'Ewe', speechLang: 'ee-GH' },
    { code: 'Hausa', label: 'Hausa', speechLang: 'ha-NG' },
    { code: 'Fante', label: 'Fante', speechLang: 'ak-GH' },
    { code: 'Dagbani', label: 'Dagbani', speechLang: 'en-GH' },
];

const SUGGESTED = [
    'What documents do I need for birth registration?',
    'How do I track my application?',
    'What are the registration fees?',
    'How long does registration take?',
];

const HAS_SPEECH = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export default function ChatbotWidget() {
    const { error: showError } = useSnackbar();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [language, setLanguage] = useState('English');
    const [recording, setRecording] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Hello! I am the Ghana BDR Assistant. Ask me anything about birth or death registration, certificates, fees, or office locations. You can also speak to me in your language.',
        },
    ]);

    const bodyRef = useRef(null);
    const recognizerRef = useRef(null);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const send = async (content) => {
        const text = (content || message).trim();
        if (!text || loading) return;

        const history = messages.slice(-10);
        setMessages(prev => [...prev, { role: 'user', text }]);
        setMessage('');
        setLoading(true);

        try {
            const response = await chatbotApi.ask(text, history, language);
            setMessages(prev => [...prev, { role: 'bot', text: response.answer }]);
        } catch (err) {
            showError(err.message || 'Assistant is unavailable right now.');
        } finally {
            setLoading(false);
        }
    };

    const startRecording = () => {
        if (!HAS_SPEECH) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SpeechRecognition();
        const lang = LANGUAGES.find(l => l.code === language);
        rec.lang = lang?.speechLang || 'en-GH';
        rec.continuous = false;
        rec.interimResults = false;

        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            setRecording(false);
            send(transcript);
        };
        rec.onerror = () => {
            setRecording(false);
        };
        rec.onend = () => {
            setRecording(false);
        };

        recognizerRef.current = rec;
        rec.start();
        setRecording(true);
    };

    const stopRecording = () => {
        if (recognizerRef.current) {
            recognizerRef.current.stop();
        }
        setRecording(false);
    };

    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const showSuggestions = messages.length === 1;

    return (
        <div className="chatbot-root">
            {open && (
                <div className="chatbot-panel">
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <Bot size={18} />
                            <div>
                                <div className="chatbot-header-title">BDR Assistant</div>
                                <div className="chatbot-header-sub">Powered by Gemini + Anthropic</div>
                            </div>
                        </div>
                        <div className="chatbot-header-right">
                            <select
                                className="chatbot-lang-select"
                                value={language}
                                onChange={e => setLanguage(e.target.value)}
                                title="Select language"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.code} value={l.code}>{l.label}</option>
                                ))}
                            </select>
                            <button type="button" className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close assistant">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="chatbot-body" ref={bodyRef}>
                        {messages.map((item, idx) => (
                            <div key={`${item.role}-${idx}`} className={`chatbot-msg ${item.role === 'user' ? 'user' : 'bot'}`}>
                                {item.role === 'bot'
                                    ? <MarkdownText text={item.text} style={{ fontSize: 'inherit', color: 'inherit' }} />
                                    : item.text
                                }
                            </div>
                        ))}
                        {showSuggestions && (
                            <div className="chatbot-suggestions">
                                {SUGGESTED.map(s => (
                                    <button key={s} className="chatbot-suggest-btn" onClick={() => send(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                        {loading && (
                            <div className="chatbot-msg bot chatbot-thinking">
                                <span /><span /><span />
                            </div>
                        )}
                    </div>

                    {recording && (
                        <div className="chatbot-recording-bar">
                            <span className="chatbot-rec-dot" />
                            Recording... speak now. Will auto-send when you stop.
                        </div>
                    )}
                    <div className="chatbot-input-row">
                        {HAS_SPEECH && (
                            <button
                                type="button"
                                className={`chatbot-mic${recording ? ' recording' : ''}`}
                                onClick={toggleRecording}
                                title={recording ? 'Stop recording' : `Speak in ${language}`}
                                aria-label={recording ? 'Stop recording' : 'Start voice input'}
                            >
                                {recording ? <MicOff size={14} /> : <Mic size={14} />}
                            </button>
                        )}
                        <input
                            className="chatbot-input"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder={recording ? 'Speak now — auto-sends when done' : `Type in ${language} and press Enter or Send`}
                            disabled={loading || recording}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
                        />
                        <button type="button" className="chatbot-send" onClick={() => send()} disabled={loading || !message.trim()}>
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            )}

            <button type="button" className="chatbot-toggle" onClick={() => setOpen(prev => !prev)}>
                <MessageCircle size={18} />
                <span>Assistant</span>
            </button>
        </div>
    );
}
