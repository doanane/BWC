import { createContext, useCallback, useContext, useState } from 'react';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [snacks, setSnacks] = useState([]);

  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setSnacks(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setSnacks(prev => prev.filter(s => s.id !== id));
    }, duration + 400); /* extra time for exit animation */
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setSnacks(prev => prev.filter(s => s.id !== id));
  }, []);

  const success = useCallback((msg, d) => show(msg, 'success', d), [show]);
  const error = useCallback((msg, d) => show(msg, 'error', d), [show]);
  const warning = useCallback((msg, d) => show(msg, 'warning', d), [show]);
  const info = useCallback((msg, d) => show(msg, 'info', d), [show]);
  const showSnackbar = useCallback((message, type = 'info', duration = 4000) => {
    return show(message, type, duration);
  }, [show]);

  return (
    <SnackbarContext.Provider value={{ show, showSnackbar, dismiss, success, error, warning, info, snacks }}>
      {children}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used inside SnackbarProvider');
  return ctx;
}
