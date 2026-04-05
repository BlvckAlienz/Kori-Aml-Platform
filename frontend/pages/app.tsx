import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const PUBLIC_ROUTES = ['/login'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session && !PUBLIC_ROUTES.includes(router.pathname)) {
        router.replace('/login');
      }
      setChecking(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session && !PUBLIC_ROUTES.includes(router.pathname)) {
        router.replace('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router.pathname]);

  // Show nothing while checking auth (prevents flash of protected content)
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