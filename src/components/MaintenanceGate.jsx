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
      background: '#0b0f14',
      color: '#e7ecf1',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif',
      textAlign: 'center',
      padding: 32,
    }}>
      <div style={{
        width: 84, height: 84, borderRadius: 20,
        background: '#10161d', border: '1px solid #232b34',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
      }}>
        <svg viewBox="0 0 24 24" width="36" height="36"
             stroke="#5b8cff" fill="none" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      </div>
      <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: '#7c8b9b', margin: '0 0 14px', fontWeight: 600 }}>
        WiseCart ERP
      </p>
      <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 600,
                   letterSpacing: '-0.01em', margin: '0 0 12px' }}>
        Under maintenance
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: '#7c8b9b',
                  maxWidth: 380, margin: 0 }}>
        We're performing scheduled maintenance and will be back shortly. Please check again in a few minutes.
      </p>
      <div style={{ width: 32, height: 1, background: '#232b34', margin: '28px 0' }} />
      <p style={{ fontSize: 12, color: '#7c8b9b' }}>
        {new Date().toLocaleString()}
      </p>
    </div>
  );
}