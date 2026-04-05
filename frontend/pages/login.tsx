import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, []);

  const handleEmail = async () => {
    setError(''); setMsg('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Check your email to confirm your account.');
      }
    } catch (e: any) {
      setError(e.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070d1a',
      backgroundImage: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(0,100,200,0.1) 0%, transparent 70%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'fixed', top: '20%', left: '10%',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '20%', right: '10%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 400,
        background: '#0d1525',
        border: '1px solid #1a2f4a',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 32px 24px',
          borderBottom: '1px solid #1a2f4a',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⬡</div>
          <h1 style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 700,
            fontSize: 22,
            color: '#fff',
            letterSpacing: '0.12em',
            marginBottom: 4,
          }}>
            KORI
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.06em' }}>
            AML INTELLIGENCE PLATFORM
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              padding: '10px 12px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
              fontSize: 13, color: '#ef4444',
            }}>
              {error}
            </div>
          )}
          {msg && (
            <div style={{
              padding: '10px 12px', background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6,
              fontSize: 13, color: '#10b981',
            }}>
              {msg}
            </div>
          )}

          <div>
            <label style={{ fontSize: 10, letterSpacing: '0.1em', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              placeholder="analyst@institution.ng"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              style={{
                width: '100%', padding: '10px 14px',
                background: '#070d1a', border: '1px solid #1a2f4a',
                borderRadius: 6, color: '#e2e8f0', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, letterSpacing: '0.1em', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              style={{
                width: '100%', padding: '10px 14px',
                background: '#070d1a', border: '1px solid #1a2f4a',
                borderRadius: 6, color: '#e2e8f0', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={handleEmail}
            disabled={loading}
            style={{
              width: '100%', padding: '11px 0',
              background: loading ? 'rgba(0,212,255,0.4)' : '#00d4ff',
              border: 'none', borderRadius: 6,
              color: '#000', fontWeight: 600, fontSize: 14,
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'Sora, sans-serif',
              letterSpacing: '0.06em',
            }}
          >
            {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#1a2f4a' }} />
            <span style={{ fontSize: 11, color: '#334155' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#1a2f4a' }} />
          </div>

          <button
            onClick={handleGoogle}
            style={{
              width: '100%', padding: '10px 0',
              background: 'transparent', border: '1px solid #1a2f4a',
              borderRadius: 6, color: '#e2e8f0', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ textAlign: 'center', fontSize: 12 }}>
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              style={{ color: '#00d4ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
            >
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <div style={{ padding: '12px 32px', borderTop: '1px solid #1a2f4a', textAlign: 'center', fontSize: 10, color: '#334155', letterSpacing: '0.06em' }}>
          PROTECTED BY CBN COMPLIANCE FRAMEWORK · KORI v1.0
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap');
        input:focus { border-color: #00d4ff !important; box-shadow: 0 0 0 2px rgba(0,212,255,0.15) !important; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}