import { Globe, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
  const { lang, changeLang, languages, t, tf } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const current = languages.find(l => l.code === lang) || languages[0];

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        className="lang-btn"
        onClick={() => setOpen(p => !p)}
        aria-label={t('change_language')}
        title={t('change_language')}
      >
        <Globe size={15} />
        <span className="lang-btn-label">{current.native}</span>
      </button>

      {open && (
        <div className="lang-dropdown">
          <div className="lang-dropdown-header">
            <span>{t('change_language')}</span>
            <button type="button" className="lang-dropdown-close" onClick={() => setOpen(false)} aria-label="Close language menu">
              <X size={14} />
            </button>
          </div>
          {languages.map(l => (
            <button
              key={l.code}
              className={`lang-option ${l.code === lang ? 'active' : ''}`}
              onClick={() => { changeLang(l.code); setOpen(false); }}
            >
              <span className="lang-option-main">
                <span className="lang-option-native">{l.native}</span>
                {l.code !== 'en' && <span className="lang-option-en">{l.label}</span>}
                <span className="lang-option-region">{tf('spoken_in_regions', { regions: l.regions })}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
