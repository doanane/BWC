import { Component, Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AccessibilityWidget from './components/AccessibilityWidget';
import ChatbotWidget from './components/ChatbotWidget';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import RealtimeNotifications from './components/RealtimeNotifications';
import Snackbar from './components/Snackbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SnackbarProvider } from './context/SnackbarContext';
import { ThemeProvider } from './context/ThemeContext';

function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => importFn())
  );
}

const Home = lazyWithRetry(() => import('./pages/Home'));
const About = lazyWithRetry(() => import('./pages/About'));
const SignIn = lazyWithRetry(() => import('./pages/SignIn'));
const SignUp = lazyWithRetry(() => import('./pages/SignUp'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const BirthRegistration = lazyWithRetry(() => import('./pages/BirthRegistration'));
const DeathRegistration = lazyWithRetry(() => import('./pages/DeathRegistration'));
const TrackApplication = lazyWithRetry(() => import('./pages/TrackApplication'));
const UserProfile = lazyWithRetry(() => import('./pages/UserProfile'));
const Offices = lazyWithRetry(() => import('./pages/Offices'));
const FAQ = lazyWithRetry(() => import('./pages/FAQ'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const Payment = lazyWithRetry(() => import('./pages/Payment'));

const MediaNews = lazyWithRetry(() => import('./pages/MediaNews'));
const MediaCharter = lazyWithRetry(() => import('./pages/MediaCharter'));
const MediaDownloads = lazyWithRetry(() => import('./pages/MediaDownloads'));
const MediaGallery = lazyWithRetry(() => import('./pages/MediaGallery'));

const ServiceExtracts = lazyWithRetry(() => import('./pages/ServiceExtracts'));
const ServiceAdoptions = lazyWithRetry(() => import('./pages/ServiceAdoptions'));
const ServiceVerification = lazyWithRetry(() => import('./pages/ServiceVerification'));
const ServiceStatistics = lazyWithRetry(() => import('./pages/ServiceStatistics'));
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/SuperAdminDashboard'));
const StaffDashboard = lazyWithRetry(() => import('./pages/StaffDashboard'));
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const CertificateVerify = lazyWithRetry(() => import('./pages/CertificateVerify'));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const AccessibilityStatement = lazyWithRetry(() => import('./pages/AccessibilityStatement'));
const Documentation = lazyWithRetry(() => import('./pages/Documentation'));
const Newsletter = lazyWithRetry(() => import('./pages/Newsletter'));

function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner spinner-dark" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    </div>
  );
}

function NotFound() {
  const { t } = useLanguage();
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--primary-100)', fontFamily: 'Poppins,sans-serif' }}>
        404
      </div>
      <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
        {t('page_not_found') || 'Page Not Found'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
        {t('page_not_found_desc') || 'The page you are looking for does not exist.'}
      </p>
      <a href="/" className="btn btn-primary">{t('return_home') || 'Return Home'}</a>
    </div>
  );
}

const ADMIN_ROLES = ['admin', 'super_admin'];

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const hash = location.hash;
      const id = decodeURIComponent(hash.slice(1));
      requestAnimationFrame(() => {
        try {
          const target = document.getElementById(id) || document.querySelector(hash);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        } catch (_) {}
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return null;
}

function RootRoute() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (isAuthenticated) {
    if (ADMIN_ROLES.includes(user?.role)) return <Navigate to="/admin" replace />;
    if (user?.role === 'staff') return <Navigate to="/staff" replace />;
    return <Navigate to="/home" replace />;
  }
  return <LandingPage />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (user?.role === 'staff') return <Navigate to="/staff" replace />;
  if (!ADMIN_ROLES.includes(user?.role)) return <Navigate to="/home" replace />;
  return children;
}

function StaffRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (ADMIN_ROLES.includes(user?.role)) return <Navigate to="/admin" replace />;
  if (user?.role !== 'staff') return <Navigate to="/home" replace />;
  return children;
}

function CitizenOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (ADMIN_ROLES.includes(user?.role)) return <Navigate to="/admin" replace />;
  if (user?.role === 'staff') return <Navigate to="/staff" replace />;
  return children;
}

class SilentBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(err) {
    console.error('[SilentBoundary]', err?.message);
  }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

function Layout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isAuthPage = ['/signin', '/register', '/forgot-password', '/reset-password'].some(p => location.pathname.startsWith(p));
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff');
  const isLandingPage = location.pathname === '/' && !isAuthenticated;
  const isHomePage = location.pathname === '/home';
  const hideChrome = isAuthPage || isAdminPage || isLandingPage;

  return (
    <>
      <ScrollManager />

      <SilentBoundary>
        {!hideChrome && <Header />}
      </SilentBoundary>

      <main>
        <ErrorBoundary key={location.key}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/about" element={<About />} />
              <Route path="/offices" element={<Offices />} />
              <Route path="/offices/:regionId" element={<Offices />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/register" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/media/news" element={<MediaNews />} />
              <Route path="/media/charter" element={<MediaCharter />} />
              <Route path="/media/downloads" element={<MediaDownloads />} />
              <Route path="/media/gallery" element={<MediaGallery />} />

              <Route path="/services/extracts" element={<ServiceExtracts />} />
              <Route path="/services/adoptions" element={<ServiceAdoptions />} />
              <Route path="/services/verification" element={<ProtectedRoute><ServiceVerification /></ProtectedRoute>} />
              <Route path="/services/statistics" element={<ProtectedRoute><ServiceStatistics /></ProtectedRoute>} />

              <Route path="/track" element={<CitizenOnlyRoute><TrackApplication /></CitizenOnlyRoute>} />
              <Route path="/payment" element={<CitizenOnlyRoute><Payment /></CitizenOnlyRoute>} />
              <Route path="/dashboard" element={<CitizenOnlyRoute><Dashboard /></CitizenOnlyRoute>} />
              <Route path="/profile" element={<CitizenOnlyRoute><UserProfile /></CitizenOnlyRoute>} />
              <Route path="/register/birth" element={<CitizenOnlyRoute><BirthRegistration /></CitizenOnlyRoute>} />
              <Route path="/register/death" element={<CitizenOnlyRoute><DeathRegistration /></CitizenOnlyRoute>} />

              <Route path="/admin" element={<AdminRoute><SuperAdminDashboard /></AdminRoute>} />
              <Route path="/staff" element={<StaffRoute><StaffDashboard /></StaffRoute>} />

              <Route path="/certificates/verify" element={<CertificateVerify />} />
              <Route path="/certificates/verify/:certNo" element={<CertificateVerify />} />

              <Route path="/legal/privacy" element={<PrivacyPolicy />} />
              <Route path="/legal/terms" element={<TermsOfService />} />
              <Route path="/legal/accessibility" element={<AccessibilityStatement />} />
              <Route path="/docs" element={<Documentation />} />
              <Route path="/newsletter" element={<Newsletter />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <SilentBoundary>
        {!hideChrome && <Footer />}
      </SilentBoundary>

      <SilentBoundary>
        {isHomePage && <AccessibilityWidget />}
      </SilentBoundary>

      <SilentBoundary>
        {isHomePage && <ChatbotWidget />}
      </SilentBoundary>

      <SilentBoundary>
        <RealtimeNotifications />
      </SilentBoundary>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SnackbarProvider>
            <Layout />
            <Snackbar />
          </SnackbarProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
