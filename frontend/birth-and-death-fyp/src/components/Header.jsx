import {
  Bell,
  BellOff,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Moon,
  Phone,
  Settings,
  Shield,
  Sun,
  User,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearApiCache, notificationsApi } from '../api/client';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSnackbar } from '../context/SnackbarContext';
import { useTheme } from '../context/ThemeContext';
import './Header.css';
import LanguageSwitcher from './LanguageSwitcher';

const PROTECTED_PATHS = [
  '/register/birth',
  '/register/death',
  '/services/verification',
  '/services/statistics',
  '/dashboard',
  '/profile',
  '/track',
  '/payment',
];

function isProtectedPath(path) {
  return PROTECTED_PATHS.some(p => path === p || path.startsWith(`${p}/`));
}

function DropdownMenu({ items, onClose }) {
  return (
    <div className="nav-dropdown" role="menu">
      <div className="nav-dropdown-head">
        <button type="button" className="nav-dropdown-close" onClick={onClose} aria-label="Close menu">
          <X size={14} />
        </button>
      </div>
      {items.map(item => (
        <Link key={item.label} to={item.to} className="dropdown-item" onClick={onClose} role="menuitem">
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function NavItem({ item }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!item.children) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/home'}
        className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
      >
        {item.label}
      </NavLink>
    );
  }

  return (
    <div ref={ref} className={`nav-item-wrap ${open ? 'nav-item-open' : ''}`}>
      <button
        className="nav-link nav-link-btn"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {item.label}
        <ChevronDown size={13} className="nav-chevron" />
      </button>
      {open && <DropdownMenu items={item.children} onClose={() => setOpen(false)} />}
    </div>
  );
}

function MobileAccordion({ item, onClose }) {
  const [open, setOpen] = useState(false);

  if (!item.children) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/home'}
        className={({ isActive }) => `mob-link${isActive ? ' mob-link-active' : ''}`}
        onClick={onClose}
      >
        {item.label}
      </NavLink>
    );
  }

  return (
    <div className="mob-accordion">
      <button className={`mob-link mob-link-parent ${open ? 'open' : ''}`} onClick={() => setOpen(v => !v)}>
        {item.label}
        <ChevronDown size={14} className={`mob-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="mob-children">
          {item.children.map(child => (
            <Link key={child.label} to={child.to} className="mob-child-link" onClick={onClose}>
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const { success } = useSnackbar();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const userMenuRef = useRef(null);
  const notifPanelRef = useRef(null);
  const unreadFetchInFlightRef = useRef(false);
  const listFetchInFlightRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    if (unreadFetchInFlightRef.current) return;
    unreadFetchInFlightRef.current = true;
    try {
      const data = await notificationsApi.unreadCount();
      setUnreadCount(data?.unread_count || 0);
    } catch {
      // Ignore transient notification fetch failures.
    } finally {
      unreadFetchInFlightRef.current = false;
    }
  }, []);

  const fetchNotificationList = useCallback(async () => {
    if (listFetchInFlightRef.current) return;
    listFetchInFlightRef.current = true;
    try {
      const listData = await notificationsApi.list('page_size=20');
      const list = Array.isArray(listData) ? listData : (listData?.items || []);
      setNotifications(list);
    } catch {
      // Ignore transient notification fetch failures.
    } finally {
      listFetchInFlightRef.current = false;
    }
  }, []);

  const navItems = useMemo(() => [
    { label: t('home'), to: '/home' },
    {
      label: t('about'),
      children: [
        { label: t('about_bdr'), to: '/about' },
        { label: t('bdr_purpose'), to: '/about#purpose' },
        { label: t('registrar'), to: '/about#leadership' },
        { label: t('rti'), to: '/about#rti' },
      ],
    },
    {
      label: t('services'),
      children: [
        { label: t('birth_reg_nav'), to: '/register/birth' },
        { label: t('death_reg_nav'), to: '/register/death' },
        { label: t('extracts'), to: '/services/extracts' },
        { label: t('adoptions'), to: '/services/adoptions' },
        { label: t('verification'), to: '/services/verification' },
        { label: t('statistics_req'), to: '/services/statistics' },
      ],
    },
    { label: t('offices'), to: '/offices' },
    { label: t('faq'), to: '/faq' },
    { label: t('contact'), to: '/contact' },
    {
      label: t('media'),
      children: [
        { label: t('news_ann'), to: '/media/news' },
        { label: t('charter'), to: '/media/charter' },
        { label: t('downloads'), to: '/media/downloads' },
        { label: t('photo_gallery'), to: '/media/gallery' },
      ],
    },
  ], [t]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = e => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = e => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      setNotifOpen(false);
      return;
    }

    fetchUnreadCount();
    const timerId = window.setInterval(fetchUnreadCount, 60000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleIncoming = (event) => {
      const notification = event.detail;
      if (!notification || !notification.id) return;

      setUnreadCount((count) => count + (notification.status !== 'read' ? 1 : 0));
      setNotifications((prev) => {
        const merged = [notification, ...prev.filter((item) => item.id !== notification.id)];
        return merged.slice(0, 20);
      });
    };

    const handleSyncRequest = () => {
      fetchUnreadCount();
      if (notifOpen) {
        fetchNotificationList();
      }
    };

    window.addEventListener('bdr:notification-created', handleIncoming);
    window.addEventListener('bdr:ws-connected', handleSyncRequest);

    return () => {
      window.removeEventListener('bdr:notification-created', handleIncoming);
      window.removeEventListener('bdr:ws-connected', handleSyncRequest);
    };
  }, [isAuthenticated, fetchNotificationList, fetchUnreadCount, notifOpen]);

  const handleNotificationToggle = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (!opening) return;

    clearApiCache();
    await Promise.all([fetchNotificationList(), fetchUnreadCount()]);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(item => ({ ...item, status: 'read' })));
    } catch {
      // Ignore transient notification update failures.
    }
  };

  const getNotificationRoute = (notification) => {
    const type = notification.notification_type || '';
    const data = notification.data || {};
    const ref = data.ref || '';
    const appId = notification.application_id || data.application_id || '';

    if (type === 'payment_required') {
      return appId ? `/payment?application_id=${appId}` : '/payment';
    }
    if (type === 'account_verified' || type === 'password_reset') {
      return '/profile';
    }
    if (type === 'system_announcement') {
      return '/dashboard';
    }
    if (ref) {
      return `/track?ref=${encodeURIComponent(ref)}`;
    }
    if (appId) {
      return `/track?application_id=${appId}`;
    }
    return '/dashboard';
  };

  const handleNotificationClick = (notification) => {
    if (notification.status !== 'read') {
      notificationsApi.markRead(notification.id).then(() => {
        setNotifications(prev => prev.map(item =>
          item.id === notification.id ? { ...item, status: 'read' } : item
        ));
        setUnreadCount(count => Math.max(0, count - 1));
      }).catch(() => {});
    }
    setNotifOpen(false);
    const route = getNotificationRoute(notification);
    navigate(route);
  };

  const handleLogout = () => {
    logout();
    success('You have been signed out successfully.');
    navigate('/');
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : 'U';

  const visibleNavItems = navItems
    .map(item => {
      if (!item.children) {
        if (!isAuthenticated && item.to && isProtectedPath(item.to)) return null;
        return item;
      }
      const filteredChildren = item.children.filter(child => isAuthenticated || !isProtectedPath(child.to));
      if (!filteredChildren.length) return null;
      return { ...item, children: filteredChildren };
    })
    .filter(Boolean);

  return (
    <>
      {/* Main header */}
      <header className={`header ${scrolled ? 'header-scrolled' : ''}`} role="banner">
        <div className="container header-inner">

          {/* Logo */}
          <Link to="/home" className="header-logo" aria-label="Ghana BDR Home">
            <div className="header-crest">
              <img src={logo} alt="Ghana Births and Deaths Registry" className="header-logo-img" />
            </div>
            <div className="header-logo-text">
              <span className="header-logo-main">Births &amp; Deaths</span>
              <span className="header-logo-sub">Registry, Ghana</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="header-nav" aria-label="Main navigation">
            {visibleNavItems.map(item => (
              <NavItem key={item.label} item={item} />
            ))}
          </nav>

          {/* Right controls */}
          <div className="header-controls">
            <LanguageSwitcher />

            <button
              className="icon-btn icon-btn-theme"
              onClick={cycleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : theme === 'dark' ? 'Switch to system theme' : 'Switch to light mode'}
              title={theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System theme'}
            >
              {theme === 'light' ? <Sun size={17} /> : theme === 'dark' ? <Moon size={17} /> : <Monitor size={17} />}
            </button>

            {isAuthenticated && (
              <div className="header-notif-wrap" ref={notifPanelRef}>
                <button
                  className="icon-btn header-notif-btn"
                  onClick={handleNotificationToggle}
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span className="header-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div className="header-notif-panel">
                    <div className="header-notif-panel-head">
                      <span>Notifications</span>
                      <div className="header-notif-panel-actions">
                        <button className="header-notif-mark-all" onClick={handleMarkAllRead}>
                          Mark all read
                        </button>
                        <button
                          type="button"
                          className="header-notif-close"
                          onClick={() => setNotifOpen(false)}
                          aria-label="Close notifications"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="header-notif-empty">
                        <BellOff size={22} />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      <div className="header-notif-list">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            className={`header-notif-item ${notification.status !== 'read' ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                            title="Click to view details"
                          >
                            <div className="header-notif-item-dot" />
                            <div className="header-notif-item-body">
                              <p className="header-notif-item-title">{notification.title}</p>
                              <p className="header-notif-item-message">{notification.message}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <p className="header-notif-item-time" style={{ margin: 0 }}>
                                  {notification.created_at
                                    ? new Date(notification.created_at).toLocaleString('en-GH')
                                    : ''}
                                </p>
                                <span style={{ fontSize: 10, color: 'var(--primary, #006B3C)', fontWeight: 600, opacity: 0.8 }}>
                                  View →
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isAuthenticated ? (
              <div ref={userMenuRef} className="user-menu-wrap">
                <button
                  className={`user-avatar-btn ${userMenuOpen ? 'open' : ''}`}
                  onClick={() => setUserMenuOpen(v => !v)}
                  aria-expanded={userMenuOpen}
                  aria-label="User menu"
                >
                  {user?.profile_photo
                    ? <img src={user.profile_photo} alt={user.first_name} className="user-avatar-photo" />
                    : <span className="user-avatar-initials">{initials}</span>
                  }
                  <span className="user-avatar-name">{user?.first_name}</span>
                  <ChevronDown size={13} />
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown" role="menu">
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-main">
                        <div className="user-dd-avatar">
                          {user?.profile_photo
                            ? <img src={user.profile_photo} alt={user.first_name} className="user-dd-avatar-img" />
                            : initials
                          }
                        </div>
                        <div>
                          <div className="user-dd-name">{user?.first_name} {user?.last_name}</div>
                          <div className="user-dd-email">{user?.email}</div>
                          <span className="badge badge-primary" style={{ fontSize: '.65rem', marginTop: 4 }}>
                            {user?.role || 'citizen'}
                          </span>
                        </div>
                      </div>
                      <button type="button" className="user-dd-close" onClick={() => setUserMenuOpen(false)} aria-label="Close user menu">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="user-dd-divider" />
                    <Link to="/dashboard" className="user-dd-item" onClick={() => setUserMenuOpen(false)}>
                      <LayoutDashboard size={15} /> {t('dashboard')}
                    </Link>
                    <Link to="/profile" className="user-dd-item" onClick={() => setUserMenuOpen(false)}>
                      <User size={15} /> {t('profile')}
                    </Link>
                    <Link to="/dashboard" className="user-dd-item" onClick={() => setUserMenuOpen(false)}>
                      <FileText size={15} /> {t('track')}
                    </Link>
                    <Link to="/profile?tab=settings" className="user-dd-item" onClick={() => setUserMenuOpen(false)}>
                      <Settings size={15} /> Settings
                    </Link>
                    {user?.role === 'super_admin' && (
                      <>
                        <div className="user-dd-divider" />
                        <Link to="/admin" className="user-dd-item user-dd-admin" onClick={() => setUserMenuOpen(false)}>
                          <Shield size={15} /> Admin Panel
                        </Link>
                      </>
                    )}
                    <div className="user-dd-divider" />
                    <button className="user-dd-item user-dd-logout" onClick={handleLogout}>
                      <LogOut size={15} /> {t('sign_out')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="header-auth-btns">
                <Link to="/signin" className="btn btn-outline btn-sm">{t('sign_in')}</Link>
                <Link to="/register" className="btn btn-primary btn-sm">{t('create_account')}</Link>
              </div>
            )}

            <button
              className="hamburger"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="mobile-overlay">
          <div className="mobile-panel">
            <div className="mobile-panel-header">
              <span className="mobile-panel-title">Navigation</span>
              <button className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <nav className="mobile-nav">
              {visibleNavItems.map(item => (
                <MobileAccordion key={item.label} item={item} onClose={() => setMobileOpen(false)} />
              ))}
            </nav>
            <div className="mobile-panel-footer">
              {isAuthenticated ? (
                <>
                  <div className="mobile-user-info">
                    <div className="mobile-user-avatar">
                      {user?.profile_photo
                        ? <img src={user.profile_photo} alt={user.first_name} className="mobile-user-avatar-img" />
                        : initials
                      }
                    </div>
                    <div>
                      <div className="mobile-user-name">{user?.first_name} {user?.last_name}</div>
                      <div className="mobile-user-role">{user?.role || 'citizen'}</div>
                    </div>
                  </div>
                  <Link to="/dashboard" className="btn btn-primary btn-block" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard size={15} /> {t('dashboard')}
                  </Link>
                  <button className="btn btn-outline btn-block" style={{ justifyContent: 'center' }} onClick={handleLogout}>
                    <LogOut size={15} /> {t('sign_out')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/signin" className="btn btn-outline btn-block" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>{t('sign_in')}</Link>
                  <Link to="/register" className="btn btn-primary btn-block" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>{t('create_account')}</Link>
                </>
              )}
              <div className="mobile-contact-links">
                <a href="mailto:info@bdregistry.gov.gh" className="mobile-contact-link">
                  <Mail size={14} /> Email Support
                </a>
                <a href="tel:+233302665125" className="mobile-contact-link">
                  <Phone size={14} /> Call Support
                </a>
              </div>
            </div>
          </div>
          <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        </div>
      )}
    </>
  );
}
