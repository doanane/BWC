import { useState } from 'react';
import { Image, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './MediaGallery.css';

const GALLERY = [
  {
    id: 1,
    src: 'https://hbdrp.bdr.gov.gh/assets/images/login/birth-registration.jpeg',
    title: 'Birth Registration Service',
    category: 'Services',
    caption: 'Parents completing birth registration at a BDR district office.',
  },
  {
    id: 2,
    src: 'https://hbdrp.bdr.gov.gh/assets/images/login/late-birth.jpeg',
    title: 'Late Birth Registration Drive',
    category: 'Outreach',
    caption: 'BDR staff conducting late birth registration in a rural community.',
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&q=80',
    title: 'Healthcare & Registration Partnership',
    category: 'Partnership',
    caption: 'BDR collaborates with hospitals to register births at the point of care.',
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?w=800&q=80',
    title: 'Community Outreach Programme',
    category: 'Outreach',
    caption: 'Mobile registration units reaching remote communities across Ghana.',
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
    title: 'Vital Records Management',
    category: 'Operations',
    caption: 'BDR staff managing vital records in a modern records facility.',
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
    title: 'Digital Transformation Initiative',
    category: 'Technology',
    caption: 'BDR staff training on the new digital registration system.',
  },
  {
    id: 7,
    src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
    title: 'Regional Head Office — Accra',
    category: 'Facilities',
    caption: 'The Greater Accra Regional BDR Office at the Ministries, Accra.',
  },
  {
    id: 8,
    src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
    title: 'Staff Training Workshop',
    category: 'Training',
    caption: 'BDR officers participating in a capacity-building workshop in Kumasi.',
  },
  {
    id: 9,
    src: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80',
    title: 'Citizen Assistance Centre',
    category: 'Services',
    caption: 'Citizens receiving assistance at the BDR help desk.',
  },
];

const CATEGORIES = ['All', 'Services', 'Outreach', 'Partnership', 'Operations', 'Technology', 'Facilities', 'Training'];

export default function MediaGallery() {
  const [category, setCategory] = useState('All');
  const [lightbox, setLightbox] = useState(null);

  const filtered = GALLERY.filter(g => category === 'All' || g.category === category);

  const openLightbox = (img) => setLightbox(img);
  const closeLightbox = () => setLightbox(null);

  const navigate = (dir) => {
    if (!lightbox) return;
    const idx = filtered.findIndex(g => g.id === lightbox.id);
    const next = (idx + dir + filtered.length) % filtered.length;
    setLightbox(filtered[next]);
  };

  return (
    <div className="gallery-page">
      <section className="gallery-hero">
        <div className="container">
          <div className="gallery-hero-inner">
            <span className="gallery-hero-label">Media</span>
            <h1 className="gallery-hero-title">Photo Gallery</h1>
            <p className="gallery-hero-subtitle">
              Explore images from our registration programmes, community outreach
              activities, and facilities across Ghana.
            </p>
          </div>
        </div>
      </section>

      <section className="section gallery-section">
        <div className="container">
          <div className="gallery-cat-tabs">
            {CATEGORIES.map(c => (
              <button
                key={c}
                className={`gallery-cat-tab${category === c ? ' active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="gallery-empty">
              <Image size={40} />
              <p>No images in this category.</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {filtered.map(img => (
                <button
                  key={img.id}
                  className="gallery-item"
                  onClick={() => openLightbox(img)}
                  aria-label={`View ${img.title}`}
                >
                  <img src={img.src} alt={img.title} className="gallery-img" loading="lazy" />
                  <div className="gallery-item-overlay">
                    <span className="gallery-item-cat">{img.category}</span>
                    <p className="gallery-item-title">{img.title}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {lightbox && (
        <div className="gallery-lightbox" onClick={closeLightbox}>
          <button className="gallery-lightbox-close" onClick={closeLightbox} aria-label="Close">
            <X size={22} />
          </button>
          <button className="gallery-lightbox-nav gallery-lightbox-prev" onClick={e => { e.stopPropagation(); navigate(-1); }} aria-label="Previous">
            <ChevronLeft size={28} />
          </button>
          <div className="gallery-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.title} className="gallery-lightbox-img" />
            <div className="gallery-lightbox-caption">
              <span className="gallery-item-cat">{lightbox.category}</span>
              <p>{lightbox.caption}</p>
            </div>
          </div>
          <button className="gallery-lightbox-nav gallery-lightbox-next" onClick={e => { e.stopPropagation(); navigate(1); }} aria-label="Next">
            <ChevronRight size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
