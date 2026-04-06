import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import '../styles/globals.css';

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/', '/login', '/legal/privacy-policy', '/legal/terms-of-service'];
// Note: .html static files bypass _app.tsx entirely, this is just a safety guard

// After login, go here
const DEFAULT_AUTH_ROUTE = '/dashboard';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      const isPublic = PUBLIC_ROUTES.includes(router.pathname);

      if (!session && !isPublic) {
        // Not logged in, trying to access protected route → send to login
        router.replace('/login');
      } else if (session && router.pathname === '/login') {
        // Already logged in, trying to visit login → send to dashboard
        router.replace(DEFAULT_AUTH_ROUTE);
      }
      setChecking(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const isPublic = PUBLIC_ROUTES.includes(router.pathname);
      if (!session && !isPublic) {
        router.replace('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router.pathname]);

  // Show spinner while checking auth on protected routes
  if (checking && !PUBLIC_ROUTES.includes(router.pathname)) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#070d1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#00d4ff',
        fontSize: 13,
        letterSpacing: '0.1em',
      }}>
        KORI ⬡ INITIALISING…
      </div>
    );
  }

  return <Component {...pageProps} />;
}