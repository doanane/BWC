import { useState } from 'react';
import { ArrowUpRight, Calendar, ChevronRight, Newspaper, Search, Tag, X } from 'lucide-react';
import './MediaNews.css';

const NEWS_ITEMS = [
  {
    id: 1,
    category: 'Announcement',
    date: 'March 22, 2023',
    title: 'Births and Deaths Registry Launches Community Population Register',
    excerpt: 'The Ghana BDR has launched the Community Population Register to decentralise vital registration, deploying officers across the Eastern, Bono East, and Ahafo regions to engage chiefs, assembly members, and community leaders.',
    image: 'https://bdr.gov.gh/storage/2023/03/Births-and-Deaths-Community-register-750x375-1.webp',
    imageAlt: 'Community Population Register launch — Ghana Births and Deaths Registry',
    sourceUrl: 'https://bdr.gov.gh/births-and-deaths-registry-launches-community-population-register/',
    sourceLabel: 'bdr.gov.gh',
    author: 'Michael Nkansah — BDR Communications',
    paragraphs: [
      'The Births and Deaths Registry (BDR) of Ghana has officially launched the Community Population Register, fulfilling the mandate of Section 12 of the Registration of Births and Deaths Act 2020 (Act 1027). The initiative aims to decentralise vital registration services by enabling communities to maintain local records of births, deaths, and all residents.',
      'The Community Population Register functions as a community asset — a reference document maintained by local leaders and used by BDR officers when conducting official registrations. The initiative is funded by the Harmonising and Improving Statistics in West Africa (HISWA) programme.',
      'In its initial phase, BDR officers were deployed to the Eastern, Bono East, and Ahafo regions. Communities visited in the Ahafo Region included Ankaase, Ada Subriso, Abuom, Tetekwah, Siso, Fianko, Kwarpretey, and Awewoho. In the Bono East Region, officers engaged communities in Lala, Dadetoklo, Kabonya, Dromankese, Senya, Tailorkrom, Appesika, and Agyina.',
      'Officers engaged chiefs, district assembly members, and community residents in hard-to-reach areas, educating them on how to use the register. The goal is to ensure every birth and death event, even in the most remote communities, is captured and entered into the national register.',
    ],
  },
  {
    id: 2,
    category: 'Training',
    date: 'August 10, 2023',
    title: 'BDR Trains Community Population Register Implementation Team — Phase 2',
    excerpt: 'The Births and Deaths Registry conducted Phase 2 training for its Community Population Register implementation team in Ejisu, Ashanti. The programme took place between 12th and 21st August 2023 and equips field officers to deploy community-level registration nationwide.',
    image: 'https://bdr.gov.gh/storage/2023/08/WhatsApp-Image-2023-08-09-at-23.07.47.jpg',
    imageAlt: 'BDR staff training session for the Community Population Register Phase 2 in Ejisu, Ashanti',
    sourceUrl: 'https://bdr.gov.gh/bdr-trains-community-population-register-implementation-team-in-its-second-phase/',
    sourceLabel: 'bdr.gov.gh',
    author: 'Michael Nkansah — BDR Communications',
    paragraphs: [
      'The Births and Deaths Registry (BDR) has concluded the second phase of training for its Community Population Register (CPR) Implementation Team. The training was held in Ejisu in the Ashanti Region between 12th and 21st August 2023.',
      'The programme fulfils the legal obligation provided in Section 12 of the Registration of Births and Deaths Act 2020 (Act 1027), which mandates community-level documentation of vital events. The initiative is designed to bring birth and death registration to the grassroots, significantly improving national coverage.',
      'During the training, implementation team members were equipped with the knowledge and tools to deploy and manage community-level registers effectively. Field teams will subsequently be sent to communities across all 16 regions to roll out the registers and train local volunteers on their use and maintenance.',
      'The Community Population Register initiative forms part of BDR\'s broader digitalisation agenda, linking community-level data with national databases to improve the accuracy of vital statistics for national planning, resource allocation, and social policy.',
    ],
  },
  {
    id: 3,
    category: 'Statistics',
    date: 'February 3, 2024',
    title: 'BDR Records 663,223 Births and 53,671 Deaths in 2023',
    excerpt: 'The Ghana Births and Deaths Registry documented 663,223 birth registrations and 53,671 death registrations across all 16 regions between January and December 2023, maintaining national birth coverage above 70%.',
    image: 'https://www.myjoyonline.com/wp-content/uploads/2022/06/Bawumia-at-Births-and-Deaths-Registry2-740x424.jpeg',
    imageAlt: 'Ghana Births and Deaths Registry office — annual statistics announcement 2023',
    sourceUrl: 'https://www.myjoyonline.com/births-and-deaths-registry-records-663223-births-in-2023/',
    sourceLabel: 'MyJoyOnline / Ghana News Agency',
    author: 'Ghana News Agency (GNA)',
    paragraphs: [
      'The Ghana Births and Deaths Registry has released its annual vital statistics for 2023, recording 663,223 birth registrations and 53,671 death registrations between January and December of that year.',
      'According to the Public Relations Officer of the Registry, national birth registration coverage has consistently remained above 70% in recent years. The decline in 2020 is attributed to the disruption caused by the COVID-19 pandemic, which limited access to both hospital and community registration services.',
      'The registry has actively deployed mobile registration units to hospitals, community health centres, and weighing stations, with a particular focus on encouraging early registration of newborns. Birth registration within the first 12 months of life is entirely free of charge.',
      'Death registration coverage remains below 40%, a persistent challenge that the registry is addressing through engagement with religious leaders and community organisations. Officials also confirmed that improvements to the digital system have largely resolved earlier issues with duplicate birth certificate registrations.',
    ],
  },
  {
    id: 4,
    category: 'Service Update',
    date: 'August 16, 2024',
    title: 'Community Population Register Now Active in 25 Communities Across Ghana',
    excerpt: 'Registrar Henrietta Lamptey announced at a media engagement workshop in Accra that the Community Population Register has been piloted in 25 communities. Mobile mass registration is simultaneously being deployed to reach children under one year old.',
    image: 'https://bdr.gov.gh/storage/2023/03/Births-and-Deaths-Community-register-750x375-1.webp',
    imageAlt: 'Community Population Register pilot — 25 communities nationwide rollout',
    sourceUrl: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Births-and-Deaths-Registry-rolls-out-community-population-register-1945938',
    sourceLabel: 'GhanaWeb / Ghana News Agency',
    author: 'Ghana News Agency (GNA)',
    paragraphs: [
      'The Births and Deaths Registry\'s Community Population Register has moved beyond its pilot phase and is now active in 25 communities across Ghana. Registrar Henrietta Lamptey made the announcement at a media engagement workshop in Accra, where journalists were trained on registration procedures, documentary requirements, and the challenges facing the registry.',
      'The register currently operates with the active support of local chiefs, opinion leaders, and district assemblies. Community focal persons manage the registers and report new birth and death events to BDR officers for formal entry into the national system.',
      'Alongside the Community Population Register, the registry has rolled out a mobile mass registration programme designed to bring services directly to citizens. The programme targets children under one year old, as early registration is free and provides the essential legal foundation for a child\'s access to education, healthcare, and other public services.',
      'The Registrar emphasised the critical role of the media in raising public awareness, noting that improved registration rates directly support national planning, resource allocation, and the compilation of accurate vital statistics for Ghana\'s development agenda.',
    ],
  },
  {
    id: 5,
    category: 'Policy Update',
    date: 'June 23, 2022',
    title: 'BDR Head Office Relocated to NALAG House, Shiashie, Accra',
    excerpt: 'The Births and Deaths Registry has officially moved its head office to the 3rd floor of NALAG House on Gulf Street, Shiashie, South Legon. All citizens seeking head office services are directed to the new address.',
    image: 'https://www.myjoyonline.com/wp-content/uploads/2022/06/Bawumia-at-Births-and-Deaths-Registry2-740x424.jpeg',
    imageAlt: 'Ghana Births and Deaths Registry — relocation to NALAG House, Shiashie, Accra',
    sourceUrl: 'https://www.myjoyonline.com/births-and-deaths-registry-head-office-relocated-to-shiashie-in-accra/',
    sourceLabel: 'MyJoyOnline',
    author: 'MyJoyOnline Staff',
    paragraphs: [
      'The Births and Deaths Registry (BDR) has officially relocated its head office to the 3rd floor of NALAG House on Gulf Street, Shiashie, in the Ayawaso West Municipality of Greater Accra. The Registry issued a public notice directing all citizens seeking head-office services to the new premises.',
      '"All official business of the Head Office of the Births and Deaths Registry shall henceforth be conducted in the NALAG House office building," the Registry stated in its official communiqué dated June 21, 2022.',
      'The Registry, originally established by Act 301 of 1965 and now governed by the Registration of Births and Deaths Act 2020 (Act 1027), operates under the supervision of the Ministry of Local Government and Rural Development. It manages birth and death registration across Ghana\'s 16 regions and 261 district offices.',
      'The relocation forms part of the BDR\'s ongoing effort to improve service delivery. The new premises offer enhanced facilities for staff and members of the public seeking registration services, certified extracts, name corrections, and other vital records services.',
    ],
  },
  {
    id: 6,
    category: 'Digitalisation',
    date: 'October 2025',
    title: 'BDR Digitalisation: Lost Birth Certificates No Longer Require Re-registration',
    excerpt: 'Registrar Samuel Adom Botchway has confirmed that persons who lose their birth certificates can obtain a replacement extract without re-registering. The digital system prevents duplicate registrations and ensures records are permanently stored.',
    image: 'https://bdr.gov.gh/storage/2023/08/WhatsApp-Image-2023-08-09-at-23.07.47.jpg',
    imageAlt: 'BDR digital records system — Ghana Births and Deaths Registry digitalisation initiative',
    sourceUrl: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Here-is-how-to-replace-lost-birth-certificate-2004939',
    sourceLabel: 'GhanaWeb',
    author: 'GhanaWeb Staff',
    paragraphs: [
      'The Registrar of the Births and Deaths Registry, Samuel Adom Botchway, has confirmed that persons who lose their birth certificates do not need to undergo a fresh registration process. Under the registry\'s digitalised system, a certified extract or true copy can be obtained from any district office.',
      '"The current digital system used by the Registry prevents multiple registrations for the same individual, eliminating the risk of duplicate birth certificates," Botchway stated, adding that the move to a digital infrastructure has significantly improved both the efficiency and the integrity of Ghana\'s vital registration system.',
      'The digitalisation represents a fundamental shift from the old manual ledger system, which was vulnerable to physical damage, loss, and manipulation. The digital platform ensures that all registered births and deaths are permanently stored and accessible from any BDR district office across Ghana.',
      'Citizens who need a replacement certificate can visit any BDR district office or use the online portal to apply for a certified extract. Processing typically takes two to five business days, and a prescribed fee of GH₵ 15.00 applies for an extract or true copy.',
    ],
  },
];

const CATEGORIES = ['All', 'Announcement', 'Training', 'Statistics', 'Service Update', 'Policy Update', 'Digitalisation'];

export default function MediaNews() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [imgErrors, setImgErrors] = useState({});

  const filtered = NEWS_ITEMS.filter(n => {
    const matchCat = category === 'All' || n.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const openArticle = (item) => {
    setSelectedArticle(item);
    document.body.style.overflow = 'hidden';
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    document.body.style.overflow = '';
  };

  return (
    <div className="media-news-page">
      <section className="media-news-hero">
        <div className="container">
          <div className="media-news-hero-inner">
            <span className="media-news-hero-label">Latest Updates</span>
            <h1 className="media-news-hero-title">News &amp; Announcements</h1>
            <p className="media-news-hero-subtitle">
              Stay informed with verified news, press releases, and official announcements
              from the Ghana Births and Deaths Registry.
            </p>
          </div>
        </div>
      </section>

      <section className="section media-news-section">
        <div className="container">
          <div className="media-news-controls">
            <div className="media-news-search-wrap">
              <Search size={16} className="media-news-search-icon" />
              <input
                type="text"
                className="media-news-search"
                placeholder="Search news..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="media-news-cat-tabs">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`media-news-cat-tab${category === c ? ' active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="media-news-empty">
              <Newspaper size={40} />
              <p>No articles found for your search.</p>
              <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setCategory('All'); }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="media-news-grid">
              {filtered.map(item => (
                <article key={item.id} className="media-news-card" onClick={() => openArticle(item)}>
                  {item.image && !imgErrors[item.id] ? (
                    <div className="media-news-card-img-wrap">
                      <img
                        src={item.image}
                        alt={item.imageAlt}
                        className="media-news-card-img"
                        onError={() => setImgErrors(prev => ({ ...prev, [item.id]: true }))}
                      />
                    </div>
                  ) : (
                    <div className="media-news-card-img-placeholder">
                      <Newspaper size={32} />
                    </div>
                  )}
                  <div className="media-news-card-content">
                    <div className="media-news-card-meta">
                      <span className="media-news-cat-badge">
                        <Tag size={11} /> {item.category}
                      </span>
                      <span className="media-news-date">
                        <Calendar size={12} /> {item.date}
                      </span>
                    </div>
                    <h2 className="media-news-card-title">{item.title}</h2>
                    <p className="media-news-card-excerpt">{item.excerpt}</p>
                    <span className="media-news-read-more">
                      Read Full Story <ChevronRight size={14} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedArticle && (
        <div className="mn-modal-overlay" onClick={closeArticle}>
          <div className="mn-modal" onClick={e => e.stopPropagation()}>
            <button className="mn-modal-close" onClick={closeArticle} aria-label="Close article">
              <X size={20} />
            </button>

            {selectedArticle.image && !imgErrors[selectedArticle.id] ? (
              <div className="mn-modal-img-wrap">
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.imageAlt}
                  className="mn-modal-img"
                  onError={() => setImgErrors(prev => ({ ...prev, [selectedArticle.id]: true }))}
                />
                <div className="mn-modal-img-caption">{selectedArticle.imageAlt}</div>
              </div>
            ) : null}

            <div className="mn-modal-body">
              <div className="mn-modal-meta">
                <span className="media-news-cat-badge">
                  <Tag size={11} /> {selectedArticle.category}
                </span>
                <span className="media-news-date">
                  <Calendar size={12} /> {selectedArticle.date}
                </span>
              </div>

              <h2 className="mn-modal-title">{selectedArticle.title}</h2>
              <p className="mn-modal-author">{selectedArticle.author}</p>

              <div className="mn-modal-content">
                {selectedArticle.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="mn-modal-footer">
                <span className="mn-modal-source-label">Source:</span>
                <a
                  href={selectedArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mn-modal-source-link"
                >
                  {selectedArticle.sourceLabel} <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
