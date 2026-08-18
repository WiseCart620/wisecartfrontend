// src/pages/MaintenancePage.jsx
import React from 'react';

const MaintenancePage = () => {
  const [time, setTime] = React.useState(() => new Date().toLocaleTimeString());

  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={styles.wrap}>
      <style>{keyframes}</style>

      <div style={styles.badge}>
        <svg viewBox="0 0 24 24" style={styles.icon}>
          <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4L14.7 6.3z" />
        </svg>
      </div>

      <p style={styles.eyebrow}>System status</p>
      <h1 style={styles.h1}>Under maintenance</h1>
      <p style={styles.sub}>We're making some updates behind the scenes. This won't take long.</p>

      <div style={styles.divider} />

      <p style={styles.meta}>{time}</p>
    </div>
  );
};

const keyframes = `
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(91, 140, 255, 0.0); }
    50% { box-shadow: 0 0 0 10px rgba(91, 140, 255, 0.06); }
  }
`;

const colors = {
  bg: '#0b0f14',
  bg2: '#10161d',
  line: '#232b34',
  text: '#e7ecf1',
  muted: '#7c8b9b',
  accent: '#5b8cff',
};

const styles = {
  wrap: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '32px',
    background: colors.bg,
    color: colors.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  badge: {
    width: '84px',
    height: '84px',
    borderRadius: '20px',
    background: colors.bg2,
    border: `1px solid ${colors.line}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px',
    animation: 'pulse 2.6s ease-in-out infinite',
  },
  icon: {
    width: '36px',
    height: '36px',
    stroke: colors.accent,
    fill: 'none',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  eyebrow: {
    fontSize: '12px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: colors.muted,
    margin: '0 0 14px',
    fontWeight: 600,
  },
  h1: {
    fontSize: 'clamp(22px, 4vw, 30px)',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    margin: '0 0 12px',
  },
  sub: {
    fontSize: '15px',
    lineHeight: 1.5,
    color: colors.muted,
    maxWidth: '380px',
    margin: 0,
  },
  divider: {
    width: '32px',
    height: '1px',
    background: colors.line,
    margin: '28px 0',
  },
  meta: {
    fontSize: '12px',
    color: colors.muted,
    fontVariantNumeric: 'tabular-nums',
  },
};

export default MaintenancePage;