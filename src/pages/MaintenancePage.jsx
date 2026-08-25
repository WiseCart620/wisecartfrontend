// src/pages/MaintenancePage.jsx
import React from 'react';

const MaintenancePage = () => {
  const [time, setTime] = React.useState(() => new Date().toLocaleTimeString());

  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={styles.page}>
      <style>{keyframes}</style>

      <header style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logoMark} />
          <span style={styles.logoText}>WiseCart</span>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <svg viewBox="0 0 24 24" style={styles.icon}>
              <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
              <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
            </svg>
          </div>

          <span style={styles.pill}>
            <span style={styles.pillDot} />
            Scheduled maintenance
          </span>

          <h1 style={styles.h1}>We'll be right back</h1>
          <p style={styles.sub}>
            WiseCart is currently undergoing scheduled maintenance to improve your experience.
            We expect to be back online shortly thanks for your patience.
          </p>

          <div style={styles.divider} />

          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Current time</span>
            <span style={styles.metaValue}>{time}</span>
          </div>
        </div>

        <p style={styles.footNote}>
          Need help right away? Contact your system administrator.
        </p>
      </main>
    </div>
  );
};

const keyframes = `
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(15, 118, 236, 0.0); }
    50% { box-shadow: 0 0 0 8px rgba(15, 118, 236, 0.08); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const colors = {
  bg: '#ffffff',
  surface: '#f7f9fb',
  iconBg: '#eaf1fd',
  line: '#e7ebf0',
  text: '#1a2430',
  muted: '#6b7684',
  accent: '#0f76ec',
  accentDeep: '#0b5bc0',
};

const styles = {
  page: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg,
    color: colors.text,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif',
    boxSizing: 'border-box',
  },
  header: {
    padding: '28px 40px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
  },
  logoMark: {
    width: '9px',
    height: '9px',
    borderRadius: '3px',
    background: colors.accent,
    display: 'inline-block',
  },
  logoText: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: colors.text,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    background: colors.bg,
    border: `1px solid ${colors.line}`,
    borderRadius: '16px',
    padding: '44px 36px 32px',
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06)',
  },
  iconWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: colors.iconBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    animation: 'pulse 2.4s ease-in-out infinite',
  },
  icon: {
    width: '28px',
    height: '28px',
    stroke: colors.accentDeep,
    fill: 'none',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    animation: 'spin 4s linear infinite',
    transformOrigin: '50% 50%',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.accentDeep,
    background: colors.iconBg,
    padding: '5px 12px',
    borderRadius: '999px',
    marginBottom: '18px',
  },
  pillDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: colors.accent,
    display: 'inline-block',
  },
  h1: {
    fontSize: '23px',
    fontWeight: 700,
    letterSpacing: '-0.015em',
    margin: '0 0 12px',
    color: colors.text,
  },
  sub: {
    fontSize: '14.5px',
    lineHeight: 1.6,
    color: colors.muted,
    margin: '0 auto',
    maxWidth: '340px',
  },
  divider: {
    height: '1px',
    background: colors.line,
    margin: '28px 0 20px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  metaLabel: {
    color: colors.muted,
    fontWeight: 500,
  },
  metaValue: {
    color: colors.text,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  footNote: {
    fontSize: '13px',
    color: colors.muted,
    marginTop: '24px',
  },
};

export default MaintenancePage;