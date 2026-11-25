const redirect = sessionStorage.redirect;
delete sessionStorage.redirect;
if (redirect && redirect !== location.pathname) {
  history.replaceState(null, null, redirect);
}


import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import MaintenanceGate from './components/MaintenanceGate.jsx';
import { Toaster } from 'react-hot-toast';
import './index.css';
import './styles/table-fit.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MaintenanceGate>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{ duration: 4000 }}
      />
    </MaintenanceGate>
  </React.StrictMode>
);

// After a deploy, old tabs ask for chunk files that no longer exist.
// Reload once to pick up the new build; the flag prevents a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    const last = Number(sessionStorage.getItem('chunk-reload-at') || 0);
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem('chunk-reload-at', String(Date.now()));
  } catch { /* storage blocked: still reload once below */ }
  window.location.reload();
});