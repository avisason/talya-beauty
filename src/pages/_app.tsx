import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#FDF8F5',
            color: '#3D352F',
            fontFamily: 'Poppins, sans-serif',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(183, 110, 121, 0.15)',
            border: '1px solid rgba(183, 110, 121, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#7CB69D',
              secondary: '#FDF8F5',
            },
          },
          error: {
            iconTheme: {
              primary: '#D97373',
              secondary: '#FDF8F5',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

