import { Building2, ChevronRight, Clock, Mail, Map, MapPin, Phone, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Offices.css';

function buildPlaceDirectionsUrl(place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
}

function buildCoordinateDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function buildCoordinateMapUrl(lat, lng, zoom = 16) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

function extractCoordinatesFromMapUrl(mapUrl = '') {
  const matched = mapUrl.match(/#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (!matched) return null;

  return {
    lat: Number(matched[1]),
    lng: Number(matched[2]),
  };
}

function getRegionCoordinates(region) {
  if (region.coordinates?.lat != null && region.coordinates?.lng != null) {
    return region.coordinates;
  }
  return extractCoordinatesFromMapUrl(region.mapUrl);
}

function getRegionDirectionsHref(region) {
  const coordinates = getRegionCoordinates(region);
  if (coordinates) {
    return buildCoordinateDirectionsUrl(coordinates.lat, coordinates.lng);
  }
  return buildPlaceDirectionsUrl(`${region.name} Regional Birth and Death Registry office, Ghana`);
}

function getDistrictDirectionsHref(region, districtName) {
  const districtCoordinates = region.districtCoordinates?.[districtName];
  if (districtCoordinates?.lat != null && districtCoordinates?.lng != null) {
    return buildCoordinateDirectionsUrl(districtCoordinates.lat, districtCoordinates.lng);
  }

  const regionCoordinates = getRegionCoordinates(region);
  if (regionCoordinates) {
    return buildCoordinateDirectionsUrl(regionCoordinates.lat, regionCoordinates.lng);
  }

  return buildPlaceDirectionsUrl(`${districtName}, ${region.name}, Ghana Birth and Death Registry office`);
}

function getRegionMapHref(region) {
  const coordinates = getRegionCoordinates(region);
  if (coordinates) {
    return buildCoordinateMapUrl(coordinates.lat, coordinates.lng);
  }
  return region.mapUrl;
}

const REGIONS = [
  {
    id: 'greater-accra',
    name: 'Greater Accra',
    headOffice: 'Ministries, Accra',
    address: 'P.O. Box M149, Ministries, Accra, Ghana',
    phone: '+233 302 665 125',
    email: 'accra@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Ministries%2C+Accra%2C+Ghana#map=14/5.5600/-0.1969',
    districts: [
      'Accra Metropolitan', 'Tema Metropolitan', 'Ga East', 'Ga West',
      'Ga South', 'Ga Central', 'Adentan', 'Ayawaso East', 'Ayawaso North',
      'Ayawaso West', 'Ayawaso Central', 'La Dade-Kotopon',
      'La-Nkwantanang Madina', 'Ledzokuku', 'Krowor', 'Ashaiman',
      'Shai Osudoku', 'Ningo Prampram', 'Kpone Katamanso',
    ],
  },
  {
    id: 'ashanti',
    name: 'Ashanti',
    headOffice: 'Harper Road, Kumasi',
    address: 'Harper Road, Adum, Kumasi, Ashanti Region',
    phone: '+233 032 202 4040',
    email: 'ashanti@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Adum%2C+Kumasi%2C+Ghana#map=14/6.6884/-1.6244',
    districts: [
      'Kumasi Metropolitan', 'Obuasi Municipal', 'Asante Akyem North',
      'Asante Akyem South', 'Asante Akyem Central', 'Kwabre East', 'Ejisu',
      'Ejura Sekyedumase', 'Afigya Kwabre North', 'Afigya Kwabre South',
      'Amansie Central', 'Amansie South', 'Amansie West', 'Bekwai',
      'Bosome Freho', 'Juaben', 'Kumawu', 'Mampong', 'Sekyere Central',
      'Sekyere East', 'Sekyere South', 'Adansi Asokwa', 'Adansi North',
      'Adansi South', 'Asokore Mampong', 'Offinso North', 'Offinso South',
      'Bosomtwe', 'Ahafo Ano North', 'Ahafo Ano South East',
      'Ahafo Ano South West', 'Sekyere Afram Plains', 'Sekyere Kumawu',
      'Atwima Kwanwoma', 'Atwima Mponua', 'Atwima Nwabiagya North',
      'Atwima Nwabiagya South', 'Afigya Kwabre', 'Old Tafo', 'Suame',
      'Manhyia North', 'Manhyia South',
    ],
  },
  {
    id: 'western',
    name: 'Western',
    headOffice: 'Liberation Road, Sekondi',
    address: 'Liberation Road, Sekondi, Western Region, Ghana',
    phone: '+233 031 202 2000',
    email: 'western@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Sekondi%2C+Ghana#map=14/4.9373/-1.7073',
    districts: [
      'Sekondi-Takoradi Metropolitan', 'Ahanta West', 'Effia Kwesimintsim',
      'Ellembelle', 'Jomoro', 'Mpohor', 'Nzema East', 'Prestea Huni Valley',
      'Shama', 'Tarkwa Nsuaem', 'Wassa Amenfi Central', 'Wassa Amenfi East',
      'Wassa Amenfi West', 'Wassa East',
    ],
  },
  {
    id: 'eastern',
    name: 'Eastern',
    headOffice: 'Victoria Park Road, Koforidua',
    address: 'Victoria Park Road, Koforidua, Eastern Region, Ghana',
    phone: '+233 034 202 2018',
    email: 'eastern@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Koforidua%2C+Ghana#map=14/6.0941/-0.2633',
    districts: [
      'New Juaben South', 'New Juaben North', 'Kwahu East', 'Kwahu West',
      'Kwahu South', 'Kwahu Afram Plains North', 'Kwahu Afram Plains South',
      'Birim Central', 'Birim North', 'Birim South', 'Atiwa East', 'Atiwa West',
      'Abuakwa North', 'Abuakwa South', 'Asene Manso Akroso', 'Ayensuano',
      'Denkyembuor', 'Fanteakwa North', 'Fanteakwa South', 'Nsawam Adoagyiri',
      'Suhum', 'Upper Manya Krobo', 'Lower Manya Krobo', 'Yilo Krobo',
      'Akuapem North', 'Akuapem South',
    ],
  },
  {
    id: 'central',
    name: 'Central',
    headOffice: 'Coastal Highway, Cape Coast',
    address: 'Coastal Highway, Cape Coast, Central Region, Ghana',
    phone: '+233 033 213 2000',
    email: 'central@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Cape+Coast%2C+Ghana#map=14/5.1057/-1.2466',
    districts: [
      'Cape Coast Metropolitan', 'Komenda Edina Eguafo Abrem', 'Mfantsiman',
      'Asikuma Odoben Brakwa', 'Assin Fosu', 'Assin North', 'Assin South',
      'Awutu Senya East', 'Awutu Senya West', 'Effutu', 'Ekumfi',
      'Gomoa Central', 'Gomoa East', 'Gomoa West', 'Hemang Lower Denkyira',
      'Upper Denkyira East', 'Upper Denkyira West', 'Twifo Ati-Morkwa',
      'Ajumako Enyan Esiam', 'Abura Asebu Kwamankese', 'Agona East', 'Agona West',
    ],
  },
  {
    id: 'northern',
    name: 'Northern',
    headOffice: 'Dakpema, Tamale',
    address: 'Dakpema, Tamale, Northern Region, Ghana',
    phone: '+233 037 202 4000',
    email: 'northern@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Tamale%2C+Ghana#map=14/9.4008/-0.8393',
    districts: [
      'Tamale Metropolitan', 'Sagnarigu', 'Tolon', 'Kumbungu', 'Nanton',
      'Savelugu', 'Karaga', 'Zabzugu', 'Tatale Sanguli', 'Nanumba North',
      'Nanumba South', 'Bimbilla', 'Gushegu', 'Kpandai', 'East Gonja',
      'West Gonja', 'Central Gonja', 'North Gonja', 'Mion',
    ],
  },
  {
    id: 'upper-east',
    name: 'Upper East',
    headOffice: 'Hospital Road, Bolgatanga',
    address: 'Hospital Road, Bolgatanga, Upper East Region, Ghana',
    phone: '+233 038 202 1000',
    email: 'uppereast@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Bolgatanga%2C+Ghana#map=14/10.7860/-0.8514',
    districts: [
      'Bolgatanga Municipal', 'Bawku Municipal', 'Binduri', 'Bolgatanga East',
      'Bongo', 'Builsa North', 'Builsa South', 'Garu', 'Kassena Nankana East',
      'Kassena Nankana West', 'Nabdam', 'Pusiga', 'Talensi', 'Tempane',
      'Bawku West',
    ],
  },
  {
    id: 'upper-west',
    name: 'Upper West',
    headOffice: 'Wa Town Centre, Wa',
    address: 'Wa Town Centre, Wa, Upper West Region, Ghana',
    phone: '+233 039 202 1000',
    email: 'upperwest@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Wa%2C+Upper+West%2C+Ghana#map=14/10.0601/-2.5099',
    districts: [
      'Wa Municipal', 'Jirapa', 'Lambussie Karni', 'Lawra', 'Nandom',
      'Nadowli Kaleo', 'Daffiama Bussie Issa', 'Sissala East', 'Sissala West',
      'Wa East', 'Wa West',
    ],
  },
  {
    id: 'volta',
    name: 'Volta',
    headOffice: 'Ho Municipal Hospital Road, Ho',
    address: 'Ho Municipal Hospital Road, Ho, Volta Region, Ghana',
    phone: '+233 036 202 1000',
    email: 'volta@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Ho%2C+Volta+Region%2C+Ghana#map=14/6.6012/0.4712',
    districts: [
      'Ho Municipal', 'Keta Municipal', 'Hohoe Municipal', 'Kpando',
      'Akatsi North', 'Akatsi South', 'Afadjato South', 'Ave Lodzokuku',
      'Biakoye', 'Kadjebi', 'Krachi East', 'Krachi Nchumuru', 'Krachi West',
      'North Dayi', 'North Tongu', 'South Dayi', 'South Tongu', 'Anloga',
    ],
  },
  {
    id: 'bono',
    name: 'Bono',
    headOffice: 'Atronie Road, Sunyani',
    address: 'Atronie Road, Sunyani, Bono Region, Ghana',
    phone: '+233 035 202 2000',
    email: 'bono@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Sunyani%2C+Ghana#map=14/7.3349/-2.3320',
    districts: [
      'Sunyani Municipal', 'Berekum East', 'Berekum West', 'Dormaa Central',
      'Dormaa East', 'Dormaa West', 'Jaman North', 'Jaman South', 'Tain', 'Wenchi',
    ],
  },
  {
    id: 'bono-east',
    name: 'Bono East',
    headOffice: 'Market Circle, Techiman',
    address: 'Market Circle, Techiman, Bono East Region, Ghana',
    phone: '+233 035 209 1000',
    email: 'bonoeast@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Techiman%2C+Ghana#map=14/7.5920/-1.9339',
    districts: [
      'Techiman Municipal', 'Atebubu Amantin', 'Kintampo North', 'Kintampo South',
      'Nkoranza North', 'Nkoranza South', 'Pru East', 'Pru West',
      'Sene East', 'Sene West', 'Techiman North',
    ],
  },
  {
    id: 'ahafo',
    name: 'Ahafo',
    headOffice: 'Goaso Town Centre, Goaso',
    address: 'Goaso Town Centre, Goaso, Ahafo Region, Ghana',
    phone: '+233 035 210 1000',
    email: 'ahafo@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Goaso%2C+Ghana#map=14/6.8009/-2.5144',
    districts: [
      'Asunafo North', 'Asunafo South', 'Asutifi North', 'Asutifi South',
      'Tano North', 'Tano South', 'Goaso',
    ],
  },
  {
    id: 'oti',
    name: 'Oti',
    headOffice: 'Dambai Town Centre, Dambai',
    address: 'Dambai Town Centre, Dambai, Oti Region, Ghana',
    phone: '+233 036 210 1000',
    email: 'oti@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Dambai%2C+Ghana#map=14/7.7717/0.1736',
    districts: [
      'Dambai', 'Nkwanta North', 'Nkwanta South', 'Guan', 'Jasikan',
      'Kadjebi', 'Biakoye',
    ],
  },
  {
    id: 'savannah',
    name: 'Savannah',
    headOffice: 'Damongo Road, Damongo',
    address: 'Damongo Road, Damongo, Savannah Region, Ghana',
    phone: '+233 037 210 1000',
    email: 'savannah@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Damongo%2C+Ghana#map=14/9.0806/-1.8239',
    districts: [
      'East Gonja', 'North East Gonja', 'West Gonja', 'Central Gonja',
      'North Gonja', 'Bole', 'Sawla-Tuna-Kalba',
    ],
  },
  {
    id: 'north-east',
    name: 'North East',
    headOffice: 'Nalerigu Road, Nalerigu',
    address: 'Nalerigu Road, Nalerigu, North East Region, Ghana',
    phone: '+233 037 220 1000',
    email: 'northeast@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Nalerigu%2C+Ghana#map=14/10.5310/-0.3635',
    districts: [
      'Nalerigu-Gambaga', 'Chereponi', 'East Mamprusi',
      'Mamprugu Moaduri', 'West Mamprusi', 'Yunyoo-Nasuan',
    ],
  },
  {
    id: 'western-north',
    name: 'Western North',
    headOffice: 'Wiawso Road, Sefwi Wiawso',
    address: 'Wiawso Road, Sefwi Wiawso, Western North Region, Ghana',
    phone: '+233 031 210 1000',
    email: 'westernnorth@bdregistry.gov.gh',
    openingHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
    mapUrl: 'https://www.openstreetmap.org/search?query=Sefwi+Wiawso%2C+Ghana#map=14/6.2069/-2.4858',
    districts: [
      'Bibiani Anhwiaso Bekwai', 'Bodi', 'Bia East', 'Bia West',
      'Sefwi Akontombra', 'Suaman', 'Sefwi Wiawso', 'Aowin',
    ],
  },
];

export default function Offices() {
  const { regionId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(regionId || 'all');

  useEffect(() => {
    if (regionId) {
      const region = REGIONS.find(r => r.id === regionId);
      if (region) {
        setActiveTab(regionId);
        setTimeout(() => scrollToRegion(regionId), 100);
      } else {
        navigate('/offices', { replace: true });
      }
    }
  }, [regionId, navigate]);

  const filteredRegions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return REGIONS.map((region) => {
      const matchingDistricts = q
        ? region.districts.filter((d) => d.toLowerCase().includes(q))
        : region.districts;
      return { ...region, matchingDistricts };
    }).filter((region) => {
      if (activeTab !== 'all' && region.id !== activeTab) return false;
      if (q) {
        return (
          region.name.toLowerCase().includes(q) ||
          region.headOffice.toLowerCase().includes(q) ||
          region.address.toLowerCase().includes(q) ||
          region.matchingDistricts.length > 0
        );
      }
      return true;
    });
  }, [searchQuery, activeTab]);

  const scrollToRegion = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTabClick = (id) => {
    if (id === 'all') {
      navigate('/offices');
      setActiveTab('all');
    } else {
      navigate(`/offices/${id}`);
      setActiveTab(id);
      setTimeout(() => scrollToRegion(id), 100);
    }
  };

  return (
    <div className="offices-page">

      <section className="offices-hero">
        <div className="container">
          <div className="offices-hero-inner">
            <span className="offices-hero-label">Nationwide Coverage</span>
            <h1 className="offices-hero-title">Regional Offices</h1>
            <p className="offices-hero-subtitle">
              The Ghana Births and Deaths Registry operates across all 16 regions
              with district offices in every part of the country. Locate the
              nearest office to register vital events or collect certificates.
            </p>
            <div className="offices-hero-stats">
              <div className="offices-stat">
                <strong>16</strong>
                <span>Regions</span>
              </div>
              <div className="offices-stat">
                <strong>260+</strong>
                <span>Districts</span>
              </div>
              <div className="offices-stat">
                <strong>Nationwide</strong>
                <span>Coverage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="offices-controls-bar">
        <div className="container">
          <div className="offices-search-wrap">
            <Search size={18} className="offices-search-icon" />
            <input
              type="text"
              className="offices-search-input"
              placeholder="Search by region, district, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="offices-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="offices-tabs-bar">
        <div className="container">
          <div className="offices-tabs-scroll">
            <button
              className={`offices-tab${activeTab === 'all' ? ' offices-tab--active' : ''}`}
              onClick={() => handleTabClick('all')}
            >
              All Regions
            </button>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                className={`offices-tab${activeTab === r.id ? ' offices-tab--active' : ''}`}
                onClick={() => handleTabClick(r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="offices-list section">
        <div className="container">
          {filteredRegions.length === 0 ? (
            <div className="offices-empty">
              <Search size={40} />
              <p>No offices found matching &ldquo;{searchQuery}&rdquo;.</p>
              <button className="btn btn-outline btn-sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            </div>
          ) : (
            filteredRegions.map((region) => (
              <div key={region.id} id={region.id} className="offices-region-section">

                <div className="offices-region-header">
                  <div className="offices-region-title-row">
                    <div className="offices-region-icon">
                      <Building2 size={22} />
                    </div>
                    <h2 className="offices-region-name">{region.name} Region</h2>
                  </div>
                  <div className="offices-region-header-actions">
                    <span className="offices-district-count">
                      {region.matchingDistricts.length} district{region.matchingDistricts.length !== 1 ? 's' : ''}
                    </span>
                    <a
                      href={getRegionDirectionsHref(region)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="offices-map-btn"
                      aria-label={`Get directions to ${region.name} Regional Office`}
                    >
                      <Map size={14} />
                      Get Directions
                    </a>
                    {region.mapUrl && (
                      <a
                        href={getRegionMapHref(region)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="offices-map-btn"
                        aria-label={`View ${region.name} Region on map`}
                      >
                        <Map size={14} />
                        View on Map
                      </a>
                    )}
                  </div>
                </div>

                <div className="offices-contact-bar">
                  <div className="offices-contact-item">
                    <MapPin size={16} className="offices-contact-icon" />
                    <div className="offices-contact-body">
                      <span className="offices-contact-label">Address</span>
                      <span className="offices-contact-value">{region.address}</span>
                    </div>
                  </div>
                  <div className="offices-contact-item">
                    <Phone size={16} className="offices-contact-icon" />
                    <div className="offices-contact-body">
                      <span className="offices-contact-label">Phone</span>
                      <a
                        href={`tel:${region.phone.replace(/\s/g, '')}`}
                        className="offices-contact-value offices-contact-link"
                      >
                        {region.phone}
                      </a>
                    </div>
                  </div>
                  <div className="offices-contact-item">
                    <Mail size={16} className="offices-contact-icon" />
                    <div className="offices-contact-body">
                      <span className="offices-contact-label">Email</span>
                      <a
                        href={`mailto:${region.email}`}
                        className="offices-contact-value offices-contact-link"
                      >
                        {region.email}
                      </a>
                    </div>
                  </div>
                  <div className="offices-contact-item">
                    <Clock size={16} className="offices-contact-icon" />
                    <div className="offices-contact-body">
                      <span className="offices-contact-label">Office Hours</span>
                      <span className="offices-contact-value">{region.openingHours}</span>
                    </div>
                  </div>
                </div>

                <div className="offices-district-grid">
                  {region.matchingDistricts.map((district) => (
                    <a
                      key={district}
                      className="offices-district-card"
                      href={getDistrictDirectionsHref(region, district)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Get directions to ${district} office in ${region.name}`}
                    >
                      <div className="offices-district-card-inner">
                        <MapPin size={14} className="offices-district-icon" />
                        <span className="offices-district-name">{district}</span>
                      </div>
                      <ChevronRight size={13} className="offices-district-arrow" />
                    </a>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
