import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApi } from '../api/client';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes in ms
const LAST_ACTIVITY_KEY = 'last_activity';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

function stampActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

function isSessionIdleExpired() {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!stored) return false; // no stamp yet — fresh login, allow through
  return Date.now() - Number(stored) > IDLE_TIMEOUT;
}

function clearSessionData() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

const AuthContext = createContext(null);

function readStoredAccessToken() {
  const token = localStorage.getItem('access_token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => readStoredAccessToken());
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef(null);
  const logoutRef = useRef(null);

  const persistUser = useCallback((userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  /* Restore cached user quickly, then always refresh from backend */
  useEffect(() => {
    let isMounted = true;

    const hydrateAuth = async () => {
      const storedToken = readStoredAccessToken();
      if (!storedToken) {
        if (!isMounted) return;
        setToken(null);
        persistUser(null);
        setLoading(false);
        return;
      }

      /* If the user was idle longer than IDLE_TIMEOUT since their last recorded
         activity (persists across tab closes / browser restarts), clear the
         session immediately so they must log in again. */
      if (isSessionIdleExpired()) {
        clearSessionData();
        if (!isMounted) return;
        setToken(null);
        persistUser(null);
        setLoading(false);
        return;
      }

      if (storedToken !== token) setToken(storedToken);

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          if (isMounted) setUser(JSON.parse(storedUser));
        } catch (_) {
          localStorage.removeItem('user');
        }
      }

      if (isMounted) setLoading(true);
      try {
        const freshUser = await authApi.me();
        if (!isMounted) return;
        persistUser(freshUser);
      } catch (err) {
        if (!isMounted) return;
        if (err?.status === 401) {
          logoutRef.current?.();
          return;
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    hydrateAuth();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((userData, accessToken, refreshToken) => {
    const safeToken = (accessToken && accessToken !== 'null' && accessToken !== 'undefined')
      ? accessToken
      : readStoredAccessToken();

    persistUser(userData);
    setToken(safeToken);

    if (safeToken) {
      localStorage.setItem('access_token', safeToken);
    } else {
      localStorage.removeItem('access_token');
    }

    if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') {
      localStorage.setItem('refresh_token', refreshToken);
    }

    // Stamp activity on login so the idle window starts from now
    stampActivity();
  }, [persistUser]);

  const updateUser = useCallback((userData) => {
    persistUser(userData);
  }, [persistUser]);

  const refreshUser = useCallback(async () => {
    const storedToken = readStoredAccessToken();
    if (!storedToken) {
      logoutRef.current?.();
      return null;
    }

    const freshUser = await authApi.me();
    persistUser(freshUser);
    return freshUser;
  }, [persistUser]);

  const logout = useCallback(() => {
    persistUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  }, [persistUser]);

  logoutRef.current = logout;

  const isAuthenticated = Boolean(token && user);

  /* Idle logout: reset in-memory timer on activity AND persist timestamp so
     the session is also invalidated when the user returns after closing the tab. */
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeout(idleTimerRef.current);
      return;
    }

    const reset = () => {
      stampActivity();
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => logoutRef.current?.(), IDLE_TIMEOUT);
    };

    reset();
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));

    return () => {
      clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [isAuthenticated]);

  /* Listen for token expiry events dispatched by the API client */
  useEffect(() => {
    const handler = () => logoutRef.current?.();
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
