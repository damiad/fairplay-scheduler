
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-dark-surface dark:text-dark-text',
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
);