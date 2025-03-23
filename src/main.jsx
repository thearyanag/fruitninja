import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { inject } from '@vercel/analytics';
import { PrivyProvider } from '@privy-io/react-auth';

// Initialize Vercel Analytics
inject();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider
      appId="cm8lra7fo00g31304btj43paj"
      config={{
        appearance: {
          loginMethods: ['email', 'wallet'],
          theme: 'light',
          accentColor: '#676FFF',
          logo: '/assets/logo.png'
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets'
        }
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
); 