import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && router.pathname !== '/login') {
        router.push('/login');
      } else {
        setAuthenticated(true);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && router.pathname !== '/login') {
        router.push('/login');
      } else if (session) {
        setAuthenticated(true);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [router.pathname]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!authenticated && router.pathname !== '/login') return null;
  return <Component {...pageProps} />;
}

export default MyApp;