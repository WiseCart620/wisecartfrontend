import { useEffect, useState } from 'react';

const HEALTH_URL = 'https://backend.wisecart.ph/actuator/health';
const POLL_MS = 30000;

export default function MaintenanceGate({ children }) {
  const [state, setState] = useState('checking'); // 'checking' | 'up' | 'down'

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(HEALTH_URL, { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        const up = res.ok && ct.includes('json');
        if (!cancelled) setState(up ? 'up' : 'down');
      } catch {
        if (!cancelled) setState('down');
      }
    };

    check();
    const id = setInterval(check, POLL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (state === 'checking') return null;
  if (state === 'down') return <MaintenancePage />;
  return children;
}

function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      color: '#21201c',
      fontFamily: '"Avenir Next", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
      textAlign: 'center',
      padding: '48px 24px',
    }}>
      {/* Brand mark */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 48,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#0077c5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18"
               fill="none" stroke="#ffffff" strokeWidth="2.2"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l3 10 3-7 3 7 3-10" />
          </svg>
        </div>
        <span style={{
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#21201c',
        }}>
          WiseCart<span style={{ color: '#0077c5' }}> ERP</span>
        </span>
      </div>

      {/* Icon */}
      <div style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        background: '#f4f5f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
      }}>
        <svg viewBox="0 0 24 24" width="44" height="44"
             fill="none" stroke="#0077c5" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </div>

      <h1 style={{
        fontSize: 'clamp(24px, 3.5vw, 32px)',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#21201c',
        margin: '0 0 12px',
      }}>
        We'll be right back
      </h1>

      <p style={{
        fontSize: 16,
        lineHeight: 1.6,
        color: '#6b6b6b',
        maxWidth: 440,
        margin: '0 0 40px',
      }}>
        WiseCart ERP is currently undergoing scheduled maintenance.
        We're working to get things back up as quickly as possible.
      </p>

      {/* Progress indicator */}
      <div style={{
        width: 240,
        height: 4,
        borderRadius: 2,
        background: '#eef0f4',
        overflow: 'hidden',
        marginBottom: 32,
      }}>
        <div style={{
          width: '40%',
          height: '100%',
          borderRadius: 2,
          background: '#0077c5',
          animation: 'wisecart-progress 1.8s ease-in-out infinite',
        }} />
      </div>

      <p style={{
        fontSize: 13,
        color: '#8c8c8c',
        margin: 0,
      }}>
        Please check back in a few minutes.
      </p>

      <p style={{
        fontSize: 12,
        color: '#b0b0b0',
        margin: '32px 0 0',
      }}>
        {new Date().toLocaleString()}
      </p>

      <style>{`
        @keyframes wisecart-progress {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}