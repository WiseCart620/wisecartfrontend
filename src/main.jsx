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