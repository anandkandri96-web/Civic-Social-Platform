import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './core/App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/variables.css';
import './styles/theme.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/utilities.css';
import './styles/components.css';
import './styles/overlays.css';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ModalProvider>
              <App />
            </ModalProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
