import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSnackbar } from '../context/SnackbarContext';
import './Snackbar.css';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function SnackItem({ snack, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const Icon = ICONS[snack.type] || Info;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(snack.id), 380);
    }, snack.duration);
    return () => clearTimeout(t);
  }, [snack, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(snack.id), 380);
  };

  return (
    <div
      className={`snack snack-${snack.type} ${visible ? 'snack-enter' : ''} ${exiting ? 'snack-exit' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="snack-icon"><Icon size={14} /></span>
      <span className="snack-msg">{snack.message}</span>
      <button className="snack-close" onClick={handleDismiss} aria-label="Dismiss"><X size={14} /></button>
      <div
        className="snack-progress"
        style={{ animationDuration: `${snack.duration}ms` }}
      />
    </div>
  );
}

export default function Snackbar() {
  const { snacks, dismiss } = useSnackbar();
  return (
    <div className="snackbar-container" aria-live="polite">
      {snacks.map(snack => (
        <SnackItem key={snack.id} snack={snack} onDismiss={dismiss} />
      ))}
    </div>
  );
}
