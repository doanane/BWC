import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Carousel.css';

const PROTECTED_PATHS = ['/register/birth', '/register/death', '/track', '/dashboard'];

const SLIDES = [
  {
    id: 1,
    theme: 'green-dark',
    eyebrowKey: 'carousel_eyebrow_official',
    titleKey: 'carousel_title_main',
    subtitleKey: 'carousel_sub_main',
    cta: { labelKey: 'get_started', to: '/register' },
    cta2: { labelKey: 'learn_more', to: '/about' },
    image: 'https://i.pinimg.com/1200x/f7/83/11/f78311dbe4df55680e969f43277da6ba.jpg',
  },
  {
    id: 2,
    theme: 'green-mid',
    eyebrowKey: 'carousel_eyebrow_birth',
    titleKey: 'carousel_title_birth',
    subtitleKey: 'carousel_sub_birth',
    cta: { labelKey: 'register_birth', to: '/register/birth' },
    cta2: { labelKey: 'how_it_works', to: '/about#how' },
    image: 'https://i.pinimg.com/1200x/35/d8/ca/35d8ca3e10c92034d068b6cd50d8e2cc.jpg?w=1400&q=80&auto=format&fit=crop',
  },
  {
    id: 3,
    theme: 'green-light',
    eyebrowKey: 'carousel_eyebrow_death',
    titleKey: 'carousel_title_death',
    subtitleKey: 'carousel_sub_death',
    cta: { labelKey: 'register_death', to: '/register/death' },
    cta2: { labelKey: 'requirements', to: '/about#requirements' },
    image: 'https://i.pinimg.com/736x/71/4b/98/714b9871e5c9c9f0f4e31d3eaa63ba45.jpg',
  },
  {
    id: 4,
    theme: 'gold',
    eyebrowKey: 'carousel_eyebrow_track',
    titleKey: 'carousel_title_track',
    subtitleKey: 'carousel_sub_track',
    cta: { labelKey: 'track_application', to: '/track' },
    cta2: { labelKey: 'view_dashboard', to: '/dashboard', authLabelKey: 'sign_in', authTo: '/signin' },
    image: 'https://i.pinimg.com/1200x/06/e3/34/06e33459e49a6ef4cf13becea2962e45.jpg',
  },
];

export default function Carousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animDir, setAnimDir] = useState('right');
  const { isAuthenticated } = useAuth();
  const { t, tf } = useLanguage();
  const navigate = useNavigate();

  const go = useCallback((idx, dir = 'right') => {
    setAnimDir(dir);
    setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    go((current + 1) % SLIDES.length, 'right');
  }, [current, go]);

  const prev = useCallback(() => {
    go((current - 1 + SLIDES.length) % SLIDES.length, 'left');
  }, [current, go]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [paused, next]);

  useEffect(() => {
    try {
      const nextIdx = (current + 1) % SLIDES.length;
      const img = new window.Image();
      img.src = SLIDES[nextIdx]?.image || '';
    } catch (_) {}
  }, [current]);

  const slide = SLIDES[current];

  const handleProtectedClick = (e, to) => {
    if (!isAuthenticated && PROTECTED_PATHS.includes(to)) {
      e.preventDefault();
      navigate('/signin', { state: { from: { pathname: to } } });
    }
  };

  const ctaTo = (slide.cta.to === '/register' && isAuthenticated) ? '/dashboard' : slide.cta.to;
  const ctaLabel = (slide.cta.to === '/register' && isAuthenticated) ? t('go_to_dashboard') : t(slide.cta.labelKey);

  const cta2To = slide.cta2.authTo
    ? (isAuthenticated ? slide.cta2.to : slide.cta2.authTo)
    : slide.cta2.to;
  const cta2Label = slide.cta2.authLabelKey
    ? (isAuthenticated ? t(slide.cta2.labelKey) : t(slide.cta2.authLabelKey))
    : t(slide.cta2.labelKey);

  return (
    <div
      className={`carousel carousel-${slide.theme}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="carousel-bg-image"
        style={{ backgroundImage: `url(${slide.image})` }}
      />
      <div className={`carousel-overlay carousel-overlay-${slide.theme}`} />

      <div className={`carousel-content anim-${animDir}`} key={current}>
        <div className="container">
          <div className="carousel-inner">
            <span className="carousel-eyebrow">{t(slide.eyebrowKey)}</span>
            <h1 className="carousel-title">{t(slide.titleKey)}</h1>
            <p className="carousel-subtitle">{t(slide.subtitleKey)}</p>
            <div className="carousel-actions">
              <Link
                to={ctaTo}
                className="btn btn-accent btn-lg"
                onClick={e => handleProtectedClick(e, ctaTo)}
              >
                {ctaLabel}
              </Link>
              <Link
                to={cta2To}
                className="btn btn-outline-white btn-lg"
                onClick={e => handleProtectedClick(e, cta2To)}
              >
                {cta2Label}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="carousel-nav">
        <button className="carousel-arrow-btn" onClick={prev} aria-label={t('previous_slide')}>
          <ChevronLeft size={20} />
        </button>
        <div className="carousel-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === current ? 'active' : ''}`}
              onClick={() => go(i, i > current ? 'right' : 'left')}
              aria-label={tf('slide_n', { n: i + 1 })}
            />
          ))}
        </div>
        <button className="carousel-arrow-btn" onClick={next} aria-label={t('next_slide')}>
          <ChevronRight size={20} />
        </button>
      </div>

    </div>
  );
}
