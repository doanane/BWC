import {
  AlignJustify, AlignLeft,
  BookOpen,
  ChevronDown,
  Eye,
  Keyboard,
  Minus,
  MousePointer,
  Navigation2,
  Palette,
  Pause, Play,
  Plus,
  RotateCcw,
  Settings,
  Square,
  Sun,
  Type,
  Underline,
  Volume2,
  X,
  ZapOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { accessibilityApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './AccessibilityWidget.css';

const DEFAULT_SETTINGS = {
  fontSize: 0,
  contrast: 'default',
  colorBlind: 'none',
  grayscale: false,
  underlineLinks: false,
  dyslexiaFont: false,
  highlightFocus: false,
  readingGuide: false,
  lineHeight: 0,
  letterSpacing: 0,
  wordSpacing: 0,
  stopAnimations: false,
  largeCursor: false,
  keyboardNav: false,
  ttsSpeed: 1.0,
  ttsVoice: '',
  dimmer: 0,
  textAlign: 'default',
  saturation: 0,
  zoom: 0,
  hideImages: false,
  boldText: false,
  highlightLinks: false,
};

const CONTRAST_OPTIONS = [
  { key: 'default', label: 'Default', bg: '#ffffff', fg: '#111827' },
  { key: 'high', label: 'High', bg: '#000000', fg: '#ffffff' },
  { key: 'dark', label: 'Dark', bg: '#0f172a', fg: '#f1f5f9' },
  { key: 'yellow', label: 'Yellow', bg: '#000000', fg: '#ffff00' },
  { key: 'sepia', label: 'Sepia', bg: '#f4e4c1', fg: '#5c3d11' },
];

const COLORBLIND_OPTIONS = [
  { key: 'none', label: 'None' },
  { key: 'deuteranopia', label: 'Deuter.' },
  { key: 'protanopia', label: 'Protan.' },
  { key: 'tritanopia', label: 'Tritan.' },
];

function applySettings(s) {
  const root = document.documentElement;
  root.setAttribute('data-a11y-font-size', s.fontSize.toString());
  root.setAttribute('data-a11y-contrast', s.contrast);
  root.setAttribute('data-a11y-underline', s.underlineLinks ? '1' : '0');
  root.setAttribute('data-a11y-dyslexia', s.dyslexiaFont ? '1' : '0');
  root.setAttribute('data-a11y-focus', s.highlightFocus ? '1' : '0');
  root.setAttribute('data-a11y-line-height', s.lineHeight.toString());
  root.setAttribute('data-a11y-letter-spacing', s.letterSpacing.toString());
  root.setAttribute('data-a11y-word-spacing', s.wordSpacing.toString());
  root.setAttribute('data-a11y-stop-animations', s.stopAnimations ? '1' : '0');
  root.setAttribute('data-a11y-large-cursor', s.largeCursor ? '1' : '0');
  root.setAttribute('data-a11y-keyboard-nav', s.keyboardNav ? '1' : '0');
  root.setAttribute('data-a11y-reading-guide', s.readingGuide ? '1' : '0');
  root.setAttribute('data-a11y-text-align', s.textAlign);
  root.setAttribute('data-a11y-zoom', s.zoom.toString());
  root.setAttribute('data-a11y-hide-images', s.hideImages ? '1' : '0');
  root.setAttribute('data-a11y-bold-text', s.boldText ? '1' : '0');
  root.setAttribute('data-a11y-highlight-links', s.highlightLinks ? '1' : '0');
  const filterParts = [];
  if (s.colorBlind === 'deuteranopia') filterParts.push("url('#a11y-deuteranopia')");
  else if (s.colorBlind === 'protanopia') filterParts.push("url('#a11y-protanopia')");
  else if (s.colorBlind === 'tritanopia') filterParts.push("url('#a11y-tritanopia')");
  if (s.grayscale) filterParts.push('grayscale(100%)');
  if (s.saturation === 1) filterParts.push('saturate(0.5)');
  else if (s.saturation === 2) filterParts.push('saturate(0.2)');
  root.style.filter = filterParts.length ? filterParts.join(' ') : '';
}

function loadSettings() {
  try {
    const stored = localStorage.getItem('a11y_settings');
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (_) { }
  return { ...DEFAULT_SETTINGS };
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [openSection, setOpenSection] = useState('vision');
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsStatus, setTtsStatus] = useState('');
  const [voices, setVoices] = useState([]);

  const panelRef = useRef(null);
  const debounceRef = useRef(null);
  const readingGuideCleanRef = useRef(null);
  const ttsElementsRef = useRef([]);
  const ttsIndexRef = useRef(0);
  const ttsLastElRef = useRef(null);
  const ttsStoppedRef = useRef(false);

  const { isAuthenticated } = useAuth();
  const { bcp47, t, speechLangCandidates } = useLanguage();

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    if (!isAuthenticated) return;
    accessibilityApi.get()
      .then(p => { if (p && Object.keys(p).length > 0) setSettings(prev => ({ ...prev, ...p })); })
      .catch(() => { });
  }, [isAuthenticated]);

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem('a11y_settings', JSON.stringify(settings));

    let dimEl = document.getElementById('a11y-dimmer');
    if (settings.dimmer > 0) {
      if (!dimEl) {
        dimEl = document.createElement('div');
        dimEl.id = 'a11y-dimmer';
        document.body.appendChild(dimEl);
      }
      dimEl.style.opacity = (settings.dimmer / 100).toString();
    } else {
      dimEl?.remove();
    }

    if (settings.readingGuide) {
      let guideEl = document.getElementById('a11y-reading-guide');
      if (!guideEl) {
        guideEl = document.createElement('div');
        guideEl.id = 'a11y-reading-guide';
        document.body.appendChild(guideEl);
      }
      const move = e => { guideEl.style.top = e.clientY + 'px'; };
      document.addEventListener('mousemove', move);
      readingGuideCleanRef.current = () => {
        document.removeEventListener('mousemove', move);
        document.getElementById('a11y-reading-guide')?.remove();
      };
    } else {
      readingGuideCleanRef.current?.();
      readingGuideCleanRef.current = null;
    }

    if (settings.keyboardNav) {
      if (!document.getElementById('a11y-skip-link')) {
        const link = document.createElement('a');
        link.id = 'a11y-skip-link';
        link.href = '#main-content';
        link.textContent = t('skip_main_content');
        document.body.insertBefore(link, document.body.firstChild);
      }
    } else {
      document.getElementById('a11y-skip-link')?.remove();
    }

    if (!isAuthenticated) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => accessibilityApi.put(settings).catch(() => { }), 500);
    return () => clearTimeout(debounceRef.current);
  }, [settings, isAuthenticated, t]);

  useEffect(() => {
    if (!open) return;
    const handleClick = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  const changeStepper = (key, delta, min, max) =>
    setSettings(prev => ({ ...prev, [key]: Math.max(min, Math.min(max, prev[key] + delta)) }));

  const reset = () => { stopReading(); setSettings({ ...DEFAULT_SETTINGS }); };

  const toggleSection = key => {
    setOpenSection(prev => {
      const next = prev === key ? null : key;
      if (next) {
        setTimeout(() => {
          const el = panelRef.current?.querySelector(`[data-section="${next}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }
      return next;
    });
  };

  const fontSizeLabel = ['−2', '−1', 'Default', '+1', '+2', '+3', '+4'][settings.fontSize + 2];
  const lineHeightLabel = ['Compact', 'Default', '+1', '+2', '+3'][settings.lineHeight + 1];
  const letterLabel = ['Default', '+1', '+2', '+3', '+4'][settings.letterSpacing];
  const wordLabel = ['Default', '+1', '+2', '+3'][settings.wordSpacing];
  const ttsSpeedLabel = settings.ttsSpeed.toFixed(1) + '×';
  const dimmerLabel = settings.dimmer === 0 ? 'Off' : `${settings.dimmer}%`;
  const satLabel = ['Default', 'Reduced', 'Minimal'][settings.saturation];
  const zoomLabel = ['Default', '+15%', '+30%', '+50%'][settings.zoom];

  function clearTtsOutline() {
    if (ttsLastElRef.current) {
      ttsLastElRef.current.style.outline = '';
      ttsLastElRef.current.style.outlineOffset = '';
      ttsLastElRef.current = null;
    }
  }

  function stopReading() {
    ttsStoppedRef.current = true;
    window.speechSynthesis?.cancel();
    clearTtsOutline();
    ttsElementsRef.current.forEach(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
    setTtsActive(false);
    setTtsPaused(false);
    setTtsStatus('');
  }

  function readNext() {
    if (ttsStoppedRef.current) return;
    const els = ttsElementsRef.current;
    const idx = ttsIndexRef.current;
    if (idx >= els.length) { stopReading(); return; }
    clearTtsOutline();
    const el = els[idx];
    el.style.outline = '3px solid #FCD116';
    el.style.outlineOffset = '2px';
    ttsLastElRef.current = el;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const text = el.innerText?.trim();
    if (!text) { ttsIndexRef.current++; readNext(); return; }
    setTtsStatus(el.tagName.toLowerCase() + ': ' + text.slice(0, 50) + (text.length > 50 ? '…' : ''));
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = settings.ttsSpeed;
    const preferredVoice = settings.ttsVoice
      ? voices.find(voice => voice.name === settings.ttsVoice)
      : voices.find((v) =>
        speechLangCandidates.some((candidate) =>
          v.lang === candidate || v.lang.toLowerCase().startsWith(candidate.toLowerCase().split('-')[0])
        )
      );
    if (preferredVoice) {
      utt.voice = preferredVoice;
      utt.lang = preferredVoice.lang;
    } else {
      utt.lang = speechLangCandidates[0] || bcp47;
    }
    utt.onend = () => {
      if (ttsStoppedRef.current) return;
      ttsIndexRef.current++;
      readNext();
    };
    utt.onerror = (e) => {
      if (ttsStoppedRef.current || e.error === 'canceled' || e.error === 'interrupted') return;
      ttsIndexRef.current++;
      readNext();
    };
    window.speechSynthesis.speak(utt);
    setTtsActive(true);
    setTtsPaused(false);
  }

  function startReading() {
    if (!window.speechSynthesis) return;
    ttsStoppedRef.current = false;
    stopReading();
    ttsStoppedRef.current = false;
    const main = document.querySelector('main') || document.body;
    const nodes = main.querySelectorAll('h1,h2,h3,h4,p,li,th,td,label');
    ttsElementsRef.current = Array.from(nodes).filter(el => el.innerText?.trim());
    ttsIndexRef.current = 0;
    readNext();
  }

  function readSelection() {
    if (!window.speechSynthesis) return;
    const sel = window.getSelection()?.toString().trim();
    if (!sel) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(sel);
    utt.rate = settings.ttsSpeed;
    const preferredVoice = settings.ttsVoice
      ? voices.find(voice => voice.name === settings.ttsVoice)
      : voices.find((v) =>
        speechLangCandidates.some((candidate) =>
          v.lang === candidate || v.lang.toLowerCase().startsWith(candidate.toLowerCase().split('-')[0])
        )
      );
    if (preferredVoice) {
      utt.voice = preferredVoice;
      utt.lang = preferredVoice.lang;
    } else {
      utt.lang = speechLangCandidates[0] || bcp47;
    }
    utt.onend = () => { setTtsActive(false); setTtsStatus(''); };
    window.speechSynthesis.speak(utt);
    setTtsActive(true);
    setTtsPaused(false);
    setTtsStatus('Reading selection…');
  }

  return (
    <div className="a11y-widget-root" ref={panelRef}>
      <button
        className="a11y-fab"
        aria-label={t('open_accessibility_settings')}
        title={t('accessibility')}
        onClick={() => setOpen(v => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="22" height="22">
          <circle cx="12" cy="5" r="2" fill="currentColor" />
          <path d="M12 7c-2.5 0-6 1-6 3.5L7.5 16l1.5-4h6l1.5 4 1.5-5.5C18 8 14.5 7 12 7z" fill="currentColor" />
          <path d="M9.5 16L8 21h1.5l2.5-4 2.5 4H16l-1.5-5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="a11y-panel" role="dialog" aria-label={t('accessibility_settings')}>
          <div className="a11y-panel-header">
            <div className="a11y-panel-title-row">
              <Settings size={16} />
              <span>{t('accessibility')}</span>
            </div>
            <button className="a11y-close-btn" onClick={() => setOpen(false)} aria-label={t('close_accessibility_panel')}>
              <X size={16} />
            </button>
          </div>

          <div className="a11y-panel-body">

            {/* Vision */}
            <div className="a11y-section-group" data-section="vision">
              <button className="a11y-section-header-btn" onClick={() => toggleSection('vision')}>
                <Eye size={14} /><span>{t('vision')}</span>
                <ChevronDown size={12} className={`a11y-chevron${openSection === 'vision' ? ' rotated' : ''}`} />
              </button>
              {openSection === 'vision' && (
                <div className="a11y-section-content">
                  <div className="a11y-section">
                    <div className="a11y-section-label"><Type size={14} />Text Size</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('fontSize', -1, -2, 4)} aria-label="Decrease text size"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{fontSizeLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('fontSize', 1, -2, 4)} aria-label="Increase text size"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><Sun size={14} />Color Contrast</div>
                    <div className="a11y-contrast-grid">
                      {CONTRAST_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          className={`a11y-contrast-btn${settings.contrast === opt.key ? ' active' : ''}`}
                          style={{ background: opt.bg, color: opt.fg }}
                          onClick={() => update('contrast', opt.key)}
                          aria-pressed={settings.contrast === opt.key}
                          title={opt.label}
                        >
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><Palette size={14} />Color Blind</div>
                    <div className="a11y-colorblind-row">
                      {COLORBLIND_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          className={`a11y-colorblind-btn${settings.colorBlind === opt.key ? ' active' : ''}`}
                          onClick={() => update('colorBlind', opt.key)}
                          aria-pressed={settings.colorBlind === opt.key}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <label className="a11y-toggle-row">
                    <div className="a11y-toggle-info"><Sun size={14} /><span>Grayscale</span></div>
                    <button className={`a11y-toggle${settings.grayscale ? ' on' : ''}`} onClick={() => update('grayscale', !settings.grayscale)} aria-pressed={settings.grayscale} role="switch"><span className="a11y-toggle-thumb" /></button>
                  </label>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><Palette size={14} />Saturation</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('saturation', -1, 0, 2)} aria-label="Decrease saturation"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{satLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('saturation', 1, 0, 2)} aria-label="Increase saturation"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><Sun size={14} />Page Dimmer</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('dimmer', -10, 0, 80)} aria-label="Decrease dimmer"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{dimmerLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('dimmer', 10, 0, 80)} aria-label="Increase dimmer"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><Eye size={14} />Page Zoom</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('zoom', -1, 0, 3)} aria-label="Decrease zoom"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{zoomLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('zoom', 1, 0, 3)} aria-label="Increase zoom"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="a11y-toggles">
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><Eye size={14} /><span>Hide Images</span></div>
                      <button className={`a11y-toggle${settings.hideImages ? ' on' : ''}`} onClick={() => update('hideImages', !settings.hideImages)} aria-pressed={settings.hideImages} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><Type size={14} /><span>Bold Text</span></div>
                      <button className={`a11y-toggle${settings.boldText ? ' on' : ''}`} onClick={() => update('boldText', !settings.boldText)} aria-pressed={settings.boldText} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><Underline size={14} /><span>Highlight Links</span></div>
                      <button className={`a11y-toggle${settings.highlightLinks ? ' on' : ''}`} onClick={() => update('highlightLinks', !settings.highlightLinks)} aria-pressed={settings.highlightLinks} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Reading */}
            <div className="a11y-section-group" data-section="reading">
              <button className="a11y-section-header-btn" onClick={() => toggleSection('reading')}>
                <BookOpen size={14} /><span>{t('reading')}</span>
                <ChevronDown size={12} className={`a11y-chevron${openSection === 'reading' ? ' rotated' : ''}`} />
              </button>
              {openSection === 'reading' && (
                <div className="a11y-section-content">
                  <div className="a11y-section">
                    <div className="a11y-section-label"><AlignJustify size={14} />Line Spacing</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('lineHeight', -1, -1, 3)} aria-label="Decrease line spacing"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{lineHeightLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('lineHeight', 1, -1, 3)} aria-label="Increase line spacing"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><Type size={14} />Letter Spacing</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('letterSpacing', -1, 0, 4)} aria-label="Decrease letter spacing"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{letterLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('letterSpacing', 1, 0, 4)} aria-label="Increase letter spacing"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><AlignJustify size={14} />Word Spacing</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('wordSpacing', -1, 0, 3)} aria-label="Decrease word spacing"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{wordLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('wordSpacing', 1, 0, 3)} aria-label="Increase word spacing"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="a11y-section">
                    <div className="a11y-section-label"><AlignLeft size={14} />Text Alignment</div>
                    <div className="a11y-align-row">
                      {[
                        { key: 'default', label: 'Auto' },
                        { key: 'left', label: 'Left' },
                        { key: 'center', label: 'Center' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          className={`a11y-align-btn${settings.textAlign === opt.key ? ' active' : ''}`}
                          onClick={() => update('textAlign', opt.key)}
                          aria-pressed={settings.textAlign === opt.key}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="a11y-toggles">
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><Type size={14} /><span>Dyslexia-friendly Font</span></div>
                      <button className={`a11y-toggle${settings.dyslexiaFont ? ' on' : ''}`} onClick={() => update('dyslexiaFont', !settings.dyslexiaFont)} aria-pressed={settings.dyslexiaFont} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><Underline size={14} /><span>Underline Links</span></div>
                      <button className={`a11y-toggle${settings.underlineLinks ? ' on' : ''}`} onClick={() => update('underlineLinks', !settings.underlineLinks)} aria-pressed={settings.underlineLinks} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><Eye size={14} /><span>Reading Guide Line</span></div>
                      <button className={`a11y-toggle${settings.readingGuide ? ' on' : ''}`} onClick={() => update('readingGuide', !settings.readingGuide)} aria-pressed={settings.readingGuide} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="a11y-section-group" data-section="nav">
              <button className="a11y-section-header-btn" onClick={() => toggleSection('nav')}>
                <Navigation2 size={14} /><span>{t('navigation')}</span>
                <ChevronDown size={12} className={`a11y-chevron${openSection === 'nav' ? ' rotated' : ''}`} />
              </button>
              {openSection === 'nav' && (
                <div className="a11y-section-content">
                  <div className="a11y-toggles">
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><ZapOff size={14} /><span>Stop Animations</span></div>
                      <button className={`a11y-toggle${settings.stopAnimations ? ' on' : ''}`} onClick={() => update('stopAnimations', !settings.stopAnimations)} aria-pressed={settings.stopAnimations} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><MousePointer size={14} /><span>Large Cursor</span></div>
                      <button className={`a11y-toggle${settings.largeCursor ? ' on' : ''}`} onClick={() => update('largeCursor', !settings.largeCursor)} aria-pressed={settings.largeCursor} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><MousePointer size={14} /><span>Highlight Focus</span></div>
                      <button className={`a11y-toggle${settings.highlightFocus ? ' on' : ''}`} onClick={() => update('highlightFocus', !settings.highlightFocus)} aria-pressed={settings.highlightFocus} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                    <label className="a11y-toggle-row">
                      <div className="a11y-toggle-info"><Keyboard size={14} /><span>Keyboard Navigation</span></div>
                      <button className={`a11y-toggle${settings.keyboardNav ? ' on' : ''}`} onClick={() => update('keyboardNav', !settings.keyboardNav)} aria-pressed={settings.keyboardNav} role="switch"><span className="a11y-toggle-thumb" /></button>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Screen Reader */}
            <div className="a11y-section-group" data-section="tts">
              <button className="a11y-section-header-btn" onClick={() => toggleSection('tts')}>
                <Volume2 size={14} /><span>{t('screen_reader')}</span>
                <ChevronDown size={12} className={`a11y-chevron${openSection === 'tts' ? ' rotated' : ''}`} />
              </button>
              {openSection === 'tts' && (
                <div className="a11y-section-content">
                  {!ttsActive ? (
                    <button className="a11y-tts-read-btn" onClick={startReading} disabled={!window.speechSynthesis}>
                      <Volume2 size={16} />
                      {window.speechSynthesis ? t('read_page') : t('not_supported')}
                    </button>
                  ) : (
                    <div className="a11y-tts-controls">
                      {ttsPaused ? (
                        <button className="a11y-tts-ctrl-btn" onClick={() => { window.speechSynthesis.resume(); setTtsPaused(false); }}>
                          <Play size={14} />{t('resume')}
                        </button>
                      ) : (
                        <button className="a11y-tts-ctrl-btn" onClick={() => { window.speechSynthesis.pause(); setTtsPaused(true); }}>
                          <Pause size={14} />{t('pause')}
                        </button>
                      )}
                      <button className="a11y-tts-ctrl-btn a11y-tts-stop" onClick={stopReading}>
                        <Square size={14} />{t('stop')}
                      </button>
                    </div>
                  )}

                  <button className="a11y-tts-sel-btn" onClick={readSelection} disabled={!window.speechSynthesis}>
                    {t('read_selection')}
                  </button>

                  {ttsStatus && <p className="a11y-tts-status">{ttsStatus}</p>}
                  {speechLangCandidates[0] !== 'en-GH' && !voices.some(v => speechLangCandidates.some((candidate) => v.lang === candidate || v.lang.toLowerCase().startsWith(candidate.toLowerCase().split('-')[0]))) && voices.length > 0 && (
                    <p className="a11y-tts-lang-hint">{t('no_voice_lang')}</p>
                  )}

                  <div className="a11y-section">
                    <div className="a11y-section-label"><Volume2 size={14} />{t('speed')}</div>
                    <div className="a11y-stepper">
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('ttsSpeed', -0.25, 0.5, 2.0)} aria-label="Decrease speed"><Minus size={14} /></button>
                      <span className="a11y-stepper-val">{ttsSpeedLabel}</span>
                      <button className="a11y-stepper-btn" onClick={() => changeStepper('ttsSpeed', 0.25, 0.5, 2.0)} aria-label="Increase speed"><Plus size={14} /></button>
                    </div>
                  </div>

                  {voices.length > 0 && (
                    <div className="a11y-section">
                      <div className="a11y-section-label"><Volume2 size={14} />{t('voice')}</div>
                      <select
                        className="a11y-tts-voice-select"
                        value={settings.ttsVoice}
                        onChange={e => update('ttsVoice', e.target.value)}
                        aria-label={t('select_voice')}
                      >
                        <option value="">{t('default_voice')}</option>
                        {voices.map(v => (
                          <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="a11y-reset-btn" onClick={reset}>
              <RotateCcw size={13} />
              {t('reset_default')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
