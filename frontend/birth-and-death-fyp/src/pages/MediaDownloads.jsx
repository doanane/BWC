import { useState } from 'react';
import { Download, ExternalLink, File, FileText, Search, Tag } from 'lucide-react';
import './MediaDownloads.css';

const DOWNLOADS = [
  { id: 1, category: 'Forms', title: 'Birth Registration Form (BDR 1)', desc: 'Standard form for registering a birth within 12 months of occurrence.', size: '245 KB', type: 'PDF', href: 'https://bdr.gov.gh/birth-registration/' },
  { id: 2, category: 'Forms', title: 'Late Birth Registration Form (BDR 2)', desc: 'Form for registering a birth more than 12 months after occurrence.', size: '260 KB', type: 'PDF', href: 'https://bdr.gov.gh/births-registration/' },
  { id: 3, category: 'Forms', title: 'Death Registration Form (BDR 3)', desc: 'Standard form for registering a death event.', size: '230 KB', type: 'PDF', href: 'https://bdr.gov.gh/' },
  { id: 4, category: 'Forms', title: 'Name Correction Application Form', desc: 'Form to apply for correction of name on an existing certificate.', size: '198 KB', type: 'PDF', href: 'https://bdr.gov.gh/' },
  { id: 5, category: 'Forms', title: 'Extract / True Copy Request Form', desc: 'Form to request a certified extract or true copy of a registered record.', size: '185 KB', type: 'PDF', href: 'https://bdr.gov.gh/' },
  { id: 6, category: 'Guides', title: 'Birth Registration Guide for Parents', desc: 'Step-by-step guide explaining the birth registration process and required documents.', size: '1.2 MB', type: 'PDF', href: 'https://bdr.gov.gh/births-registration/' },
  { id: 7, category: 'Guides', title: 'Death Registration Guide', desc: 'Comprehensive guide for families on registering a death and obtaining a death certificate.', size: '980 KB', type: 'PDF', href: 'https://bdr.gov.gh/' },
  { id: 8, category: 'Guides', title: 'Online Portal User Manual', desc: 'User manual for navigating and submitting applications through the BDR online portal.', size: '2.4 MB', type: 'PDF', href: 'https://hbdrp.bdr.gov.gh/' },
  { id: 9, category: 'Policy', title: 'Births and Deaths Registration Act, 2020', desc: 'Official Act of Parliament governing vital registration in Ghana (Act 1027).', size: '3.8 MB', type: 'PDF', href: 'https://bdr.gov.gh/bdr-purpose/' },
  { id: 10, category: 'Policy', title: 'Client Service Charter 2024', desc: 'Official service standards, commitments, and fee schedule of the BDR.', size: '560 KB', type: 'PDF', href: 'https://bdr.gov.gh/' },
  { id: 11, category: 'Reports', title: 'Annual Report 2023', desc: 'Comprehensive annual report on BDR operations, statistics, and achievements.', size: '8.2 MB', type: 'PDF', href: 'https://bdr.gov.gh/' },
  { id: 12, category: 'Reports', title: 'Mid-Year Statistical Bulletin 2024', desc: 'Statistical data on birth and death registrations for H1 2024 across all 16 regions.', size: '2.1 MB', type: 'PDF', href: 'https://bdr.gov.gh/' },
];

const CATEGORIES = ['All', 'Forms', 'Guides', 'Policy', 'Reports'];

export default function MediaDownloads() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = DOWNLOADS.filter(d => {
    const matchCat = category === 'All' || d.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="downloads-page">
      <section className="downloads-hero">
        <div className="container">
          <div className="downloads-hero-inner">
            <span className="downloads-hero-label">Resources</span>
            <h1 className="downloads-hero-title">Downloads</h1>
            <p className="downloads-hero-subtitle">
              Access official forms, guides, policy documents, and reports from
              the Ghana Births and Deaths Registry. All documents are in PDF format.
            </p>
          </div>
        </div>
      </section>

      <section className="section downloads-section">
        <div className="container">
          <div className="downloads-notice">
            <FileText size={16} />
            Official forms and documents are hosted on the Ghana Births and Deaths Registry website.
            Clicking <strong>Get Document</strong> will open the relevant page on{' '}
            <a href="https://bdr.gov.gh" target="_blank" rel="noopener noreferrer">bdr.gov.gh</a>.
          </div>

          <div className="downloads-controls">
            <div className="downloads-search-wrap">
              <Search size={16} className="downloads-search-icon" />
              <input
                type="text"
                className="downloads-search"
                placeholder="Search documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="downloads-cat-tabs">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`downloads-cat-tab${category === c ? ' active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="downloads-empty">
              <File size={40} />
              <p>No documents found.</p>
              <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setCategory('All'); }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="downloads-grid">
              {filtered.map(doc => (
                <div key={doc.id} className="downloads-card">
                  <div className="downloads-card-icon">
                    <FileText size={22} />
                  </div>
                  <div className="downloads-card-body">
                    <div className="downloads-card-meta">
                      <span className="downloads-cat-badge">
                        <Tag size={10} /> {doc.category}
                      </span>
                      <span className="downloads-file-info">{doc.type} &bull; {doc.size}</span>
                    </div>
                    <h3 className="downloads-card-title">{doc.title}</h3>
                    <p className="downloads-card-desc">{doc.desc}</p>
                  </div>
                  <a
                    className="downloads-btn"
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Get ${doc.title} from BDR official website`}
                  >
                    <Download size={15} />
                    Get Document <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
