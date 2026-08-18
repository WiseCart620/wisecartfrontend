// src/pages/MaintenancePage.jsx
import React from 'react';

const MESSAGES = [
  "Our hamsters are re-wiring the backend. Please hold.",
  "The server had one job. We're reminding it now.",
  "Delivery trucks are stuck behind a semicolon.",
  "Patching a leak in the code pipes. Bring wellies.",
  "Teaching the database to count past 'undefined'.",
];

const MaintenancePage = () => {
  const message = React.useMemo(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    []
  );

  return (
    <div style={styles.wrapper}>
      <style>{keyframes}</style>

      <div style={styles.truckLane}>
        <div style={styles.truck}>🚚</div>
        <div style={styles.cone}>🚧</div>
        <div style={styles.cone}>🚧</div>
        <div style={styles.cone}>🚧</div>
      </div>

      <h1 style={styles.title}>
        <span style={styles.wrench}>🔧</span> Under Maintenance
      </h1>

      <p style={styles.subtitle}>{message}</p>

      <div style={styles.gearRow}>
        <span style={{ ...styles.gear, animationDuration: '3s' }}>⚙️</span>
        <span style={{ ...styles.gear, animationDuration: '2s', animationDirection: 'reverse' }}>⚙️</span>
        <span style={{ ...styles.gear, animationDuration: '4s' }}>⚙️</span>
      </div>

      <p style={styles.footer}>
        We'll be back before you finish your coffee. Probably.
      </p>
    </div>
  );
};

const keyframes = `
  @keyframes driveAcross {
    0%   { transform: translateX(-10vw); }
    100% { transform: translateX(110vw); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }
`;

const styles = {
  wrapper: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    padding: '24px',
    overflow: 'hidden',
    position: 'relative',
  },
  truckLane: {
    position: 'absolute',
    top: '18%',
    left: 0,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '40vw',
    animation: 'driveAcross 6s linear infinite',
    fontSize: '48px',
    whiteSpace: 'nowrap',
  },
  truck: { animation: 'bob 0.6s ease-in-out infinite' },
  cone: { fontSize: '32px', opacity: 0.7 },
  title: {
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: 800,
    margin: '80px 0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  wrench: {
    display: 'inline-block',
    animation: 'bob 1.2s ease-in-out infinite',
  },
  subtitle: {
    fontSize: 'clamp(15px, 2.5vw, 20px)',
    color: '#94a3b8',
    maxWidth: '480px',
    margin: '0 0 32px',
  },
  gearRow: {
    display: 'flex',
    gap: '20px',
    fontSize: '36px',
    marginBottom: '32px',
  },
  gear: {
    display: 'inline-block',
    animation: 'spin linear infinite',
  },
  footer: {
    fontSize: '13px',
    color: '#64748b',
  },
};

export default MaintenancePage;