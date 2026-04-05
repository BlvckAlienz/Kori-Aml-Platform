/**
 * frontend/pages/login.tsx
 *
 * Fixes from v1:
 * 1. Input contrast: white text on #0f172a background — clearly readable
 * 2. After login → redirects to /dashboard (not / which is now the landing page)
 * 3. Google OAuth redirectTo uses window.location.origin for correct production URL
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
      if (session) router.replace('/dashboard');
    });
  }, []);

  const handleEmail = async () => {
    setError('');
    setMsg('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMsg('Account created. Check your email to confirm — or sign in directly if email confirmation is disabled.');
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
        // Uses the current domain — works on both localhost and production
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard`
          : undefined,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <>
      <Head>
        <title>Sign In — Kori AML Platform</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="login-root">
        {/* Back to landing */}
        <a href="/" className="back-link">← Back to kori.seamount.io</a>

        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="login-hex">⬡</div>
            <h1 className="login-title">KORI</h1>
            <p className="login-sub">AML INTELLIGENCE PLATFORM</p>
          </div>

          {/* Form */}
          <div className="login-body">
            {/* Mode toggle */}
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => { setMode('signin'); setError(''); setMsg(''); }}
              >
                Sign In
              </button>
              <button
                className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); setError(''); setMsg(''); }}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠</span> {error}
              </div>
            )}
            {msg && (
              <div className="alert alert-success">
                <span className="alert-icon">✓</span> {msg}
              </div>
            )}

            <div className="field">
              <label className="field-label">Email address</label>
              <input
                className="field-input"
                type="email"
                placeholder="analyst@institution.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              className="submit-btn"
              onClick={handleEmail}
              disabled={loading}
            >
              {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="divider">
              <span className="divider-line" />
              <span className="divider-text">or</span>
              <span className="divider-line" />
            </div>

            <button className="google-btn" onClick={handleGoogle}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="login-footer">
            PROTECTED BY CBN COMPLIANCE FRAMEWORK · KORI v1.0
          </div>
        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          min-height: 100vh;
          background: #070d1a;
          font-family: 'DM Sans', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>

      <style jsx>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #070d1a;
          background-image: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,100,200,0.12) 0%, transparent 70%);
        }

        .back-link {
          position: fixed; top: 24px; left: 24px;
          color: #64748b; text-decoration: none; font-size: 13px;
          transition: color 0.15s;
        }
        .back-link:hover { color: #00d4ff; }

        .login-card {
          width: 100%; max-width: 420px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        }

        .login-header {
          padding: 36px 32px 28px;
          border-bottom: 1px solid #1e293b;
          text-align: center;
          background: #0a1628;
        }
        .login-hex { font-size: 36px; color: #00d4ff; filter: drop-shadow(0 0 10px rgba(0,212,255,0.5)); margin-bottom: 10px; }
        .login-title {
          font-family: 'Sora', sans-serif; font-weight: 700;
          font-size: 24px; letter-spacing: 0.14em; color: #f1f5f9;
          margin-bottom: 4px;
        }
        .login-sub { font-size: 10px; letter-spacing: 0.1em; color: #475569; }

        .login-body { padding: 28px 32px; display: flex; flex-direction: column; gap: 16px; }

        /* Mode toggle */
        .mode-toggle {
          display: flex; background: #070d1a; border: 1px solid #1e293b;
          border-radius: 8px; padding: 3px; gap: 3px;
        }
        .mode-btn {
          flex: 1; padding: 8px; border: none; border-radius: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.15s;
          background: transparent; color: #64748b;
        }
        .mode-btn.active { background: #1e293b; color: #f1f5f9; }

        /* Alerts */
        .alert {
          padding: 10px 14px; border-radius: 8px;
          font-size: 13px; display: flex; align-items: flex-start; gap: 8px;
          line-height: 1.5;
        }
        .alert-error { background: rgba(239,68,68,0.12); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
        .alert-success { background: rgba(16,185,129,0.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
        .alert-icon { flex-shrink: 0; font-weight: 700; }

        /* Fields — HIGH CONTRAST */
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-size: 12px; font-weight: 500; letter-spacing: 0.06em;
          color: #94a3b8; text-transform: uppercase;
        }
        .field-input {
          width: 100%; padding: 12px 14px;
          /* Light background so text is clearly visible */
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;           /* Bright white text */
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          caret-color: #00d4ff;
        }
        .field-input:focus {
          border-color: #00d4ff;
          box-shadow: 0 0 0 3px rgba(0,212,255,0.12);
        }
        .field-input::placeholder { color: #475569; }

        /* Submit */
        .submit-btn {
          width: 100%; padding: 13px;
          background: #00d4ff; color: #000;
          border: none; border-radius: 8px;
          font-family: 'Sora', sans-serif; font-weight: 700;
          font-size: 15px; letter-spacing: 0.06em;
          cursor: pointer; transition: all 0.15s;
          margin-top: 4px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #33ddff;
          box-shadow: 0 0 24px rgba(0,212,255,0.35);
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Divider */
        .divider { display: flex; align-items: center; gap: 12px; }
        .divider-line { flex: 1; height: 1px; background: #1e293b; }
        .divider-text { font-size: 12px; color: #334155; }

        /* Google */
        .google-btn {
          width: 100%; padding: 12px;
          background: transparent; border: 1px solid #334155;
          border-radius: 8px; color: #cbd5e1;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .google-btn:hover { border-color: #00d4ff; color: #f1f5f9; background: rgba(0,212,255,0.04); }

        .login-footer {
          padding: 14px 32px; border-top: 1px solid #1e293b;
          text-align: center; font-size: 10px; letter-spacing: 0.08em;
          color: #1e293b; background: #0a1628;
        }
      `}</style>
    </>
  );
}