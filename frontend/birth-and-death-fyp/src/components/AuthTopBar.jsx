import { ChevronDown, Monitor, Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import './AuthTopBar.css';

const FONT_STEP = 2;
const FONT_MIN = 12;
const FONT_MAX = 24;
const BASE_FONT = 16;

function applyAcc(mode) {
  document.documentElement.setAttribute('data-acc', mode || '');
}

function applyFontSize(px) {
  document.documentElement.style.fontSize = px + 'px';
}

function useClickOutside(ref, cb) {
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}

export default function AuthTopBar() {
  const { theme, setTheme } = useTheme();
  const { lang, changeLang, languages, t } = useLanguage();

  const [accMode, setAccMode] = useState(() => localStorage.getItem('auth-acc') || '');
  const [fontSize, setFontSize] = useState(() => {
    const s = parseInt(localStorage.getItem('auth-fontsize'), 10);
    return Number.isFinite(s) ? s : BASE_FONT;
  });

  const [accOpen, setAccOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const accRef = useRef(null);
  const themeRef = useRef(null);

  useClickOutside(accRef, () => setAccOpen(false));
  useClickOutside(themeRef, () => setThemeOpen(false));

  useEffect(() => { applyAcc(accMode); }, [accMode]);
  useEffect(() => { applyFontSize(fontSize); }, [fontSize]);

  const handleLangChange = e => {
    changeLang(e.target.value);
  };

  const setAcc = mode => {
    const next = accMode === mode ? '' : mode;
    setAccMode(next);
    localStorage.setItem('auth-acc', next);
    setAccOpen(false);
  };

  const changeFont = delta => {
    setFontSize(prev => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, prev + delta));
      localStorage.setItem('auth-fontsize', String(next));
      return next;
    });
  };

  const pickTheme = val => {
    setTheme(val);
    setThemeOpen(false);
  };

  const themeIcon = theme === 'dark' ? <Moon size={13} /> : theme === 'system' ? <Monitor size={13} /> : <Sun size={13} />;
  const themeLabel = theme === 'dark' ? t('dark') : theme === 'system' ? t('system') : t('light');
  const accActive = accMode !== '';

  return (
    <div className="auth-topbar" role="toolbar" aria-label={t('accessibility_and_preferences')}>
      <div className="auth-topbar-inner">

        <div className="atb-left">
          <div className="atb-dropdown-wrap" ref={accRef}>
            <button
              className={`atb-trigger ${accActive ? 'acc-on' : ''}`}
              onClick={() => { setAccOpen(o => !o); setThemeOpen(false); }}
              aria-expanded={accOpen}
              aria-haspopup="menu"
            >
              <span className="atb-trigger-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="4" r="2" /><path d="M10.3 7.7L4 20M13.7 7.7L20 20M5.9 14h12.2" />
                </svg>
              </span>
              <span>{accActive ? t('accessibility_on') : t('accessibility')}</span>
              <ChevronDown size={11} className={`atb-chevron${accOpen ? ' open' : ''}`} />
            </button>

            {accOpen && (
              <div className="atb-dropdown" role="menu">
                <div className="atb-dd-head">
                  <span>{t('accessibility')}</span>
                  <button type="button" className="atb-dd-close" onClick={() => setAccOpen(false)} aria-label="Close accessibility menu">
                    <X size={14} />
                  </button>
                </div>
                <div className="atb-dd-section-label">{t('visual')}</div>

                <button className={`atb-dd-item${accMode === 'high-contrast' ? ' active' : ''}`} onClick={() => setAcc('high-contrast')} role="menuitemcheckbox" aria-checked={accMode === 'high-contrast'}>
                  <span className="atb-dd-swatch hc" />
                  {t('high_contrast')}
                  {accMode === 'high-contrast' && <span className="atb-dd-badge">{t('on')}</span>}
                </button>

                <button className={`atb-dd-item${accMode === 'negative' ? ' active' : ''}`} onClick={() => setAcc('negative')} role="menuitemcheckbox" aria-checked={accMode === 'negative'}>
                  <span className="atb-dd-swatch nc" />
                  {t('negative_contrast')}
                  {accMode === 'negative' && <span className="atb-dd-badge">{t('on')}</span>}
                </button>

                <button className={`atb-dd-item${accMode === 'grayscale' ? ' active' : ''}`} onClick={() => setAcc('grayscale')} role="menuitemcheckbox" aria-checked={accMode === 'grayscale'}>
                  <span className="atb-dd-swatch gs" />
                  {t('grayscale')}
                  {accMode === 'grayscale' && <span className="atb-dd-badge">{t('on')}</span>}
                </button>

                <div className="atb-dd-divider" />
                <div className="atb-dd-section-label">{t('text_size')}</div>

                <div className="atb-dd-font-row">
                  <button className="atb-font-btn" onClick={() => changeFont(-FONT_STEP)} disabled={fontSize <= FONT_MIN} aria-label={t('decrease_text')}>
                    A<sup style={{ fontSize: '0.55em' }}>-</sup>
                  </button>
                  <span className="atb-font-val">{fontSize}px</span>
                  <button className="atb-font-btn" onClick={() => changeFont(FONT_STEP)} disabled={fontSize >= FONT_MAX} aria-label={t('increase_text')}>
                    A<sup style={{ fontSize: '0.55em' }}>+</sup>
                  </button>
                </div>

                {accActive && (
                  <>
                    <div className="atb-dd-divider" />
                    <button className="atb-dd-item atb-dd-reset" onClick={() => setAcc('')}>
                      {t('reset_default')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="atb-right">
          <div className="atb-lang-wrap">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <select className="atb-lang-select" value={lang} onChange={handleLangChange} aria-label={t('select_language')}>
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.native}</option>
              ))}
            </select>
          </div>

          <div className="atb-dropdown-wrap" ref={themeRef}>
            <button
              className="atb-trigger"
              onClick={() => { setThemeOpen(o => !o); setAccOpen(false); }}
              aria-expanded={themeOpen}
              aria-haspopup="menu"
            >
              <span className="atb-trigger-icon">{themeIcon}</span>
              <span>{themeLabel}</span>
              <ChevronDown size={11} className={`atb-chevron${themeOpen ? ' open' : ''}`} />
            </button>

            {themeOpen && (
              <div className="atb-dropdown atb-dropdown-right" role="menu">
                <div className="atb-dd-head">
                  <span>Theme</span>
                  <button type="button" className="atb-dd-close" onClick={() => setThemeOpen(false)} aria-label="Close theme menu">
                    <X size={14} />
                  </button>
                </div>
                <button className={`atb-dd-item${theme === 'light' ? ' active' : ''}`} onClick={() => pickTheme('light')} role="menuitemradio" aria-checked={theme === 'light'}>
                  <Sun size={13} /> {t('light')}
                  {theme === 'light' && <span className="atb-dd-badge">{t('active')}</span>}
                </button>
                <button className={`atb-dd-item${theme === 'dark' ? ' active' : ''}`} onClick={() => pickTheme('dark')} role="menuitemradio" aria-checked={theme === 'dark'}>
                  <Moon size={13} /> {t('dark')}
                  {theme === 'dark' && <span className="atb-dd-badge">{t('active')}</span>}
                </button>
                <button className={`atb-dd-item${theme === 'system' ? ' active' : ''}`} onClick={() => pickTheme('system')} role="menuitemradio" aria-checked={theme === 'system'}>
                  <Monitor size={13} /> {t('system')}
                  {theme === 'system' && <span className="atb-dd-badge">{t('active')}</span>}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
