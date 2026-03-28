import { useEffect, useRef, useState } from 'react';

const SDK_URL = 'https://web-button.metamap.com/button.js';

export default function MetaMapButton({ userId, onComplete, onExit, label = 'Verify Identity' }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (document.querySelector(`script[src="${SDK_URL}"]`)) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const btn = containerRef.current.querySelector('metamap-button');
    if (!btn) return;
    const handleComplete = (e) => onComplete?.(e.detail);
    const handleExit = (e) => onExit?.(e.detail);
    btn.addEventListener('metamap:userFinishedSdk', handleComplete);
    btn.addEventListener('metamap:exitedSdk', handleExit);
    return () => {
      btn.removeEventListener('metamap:userFinishedSdk', handleComplete);
      btn.removeEventListener('metamap:exitedSdk', handleExit);
    };
  }, [ready, onComplete, onExit]);

  const metadata = JSON.stringify({ internal_user_id: userId ?? '' });

  if (!ready) {
    return (
      <button className="btn btn-primary btn-block" disabled>
        <span className="spinner" /> Loading verification SDK…
      </button>
    );
  }

  return (
    <div ref={containerRef} className="metamap-wrapper">
      <metamap-button
        clientid={import.meta.env.VITE_METAMAP_CLIENT_ID}
        flowid={import.meta.env.VITE_METAMAP_FLOW_ID}
        metadata={metadata}
      />
    </div>
  );
}
