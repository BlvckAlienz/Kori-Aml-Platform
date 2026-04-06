import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
}

// ─── NAV ITEMS ──────────────────────────────────────────────────────────────
// CHANGE 1 from original: Dashboard href is '/dashboard' not '/'
// because '/' is now the public landing page.
const navItems = [
  { href: '/dashboard', label: 'Dashboard',      icon: '⬡' },
  { href: '/transactions', label: 'Transactions', icon: '⇄' },
  { href: '/alerts',    label: 'Alerts',          icon: '◈' },
  { href: '/blocklist', label: 'Blocklist',       icon: '⊘' },
  { href: '/reports',   label: 'Reports',         icon: '▦' },
  { href: '/audit',     label: 'Audit Log',       icon: '◎' },
  { href: '/api-keys',  label: 'API Keys',        icon: '⌘' },
  { href: '/pricing',   label: 'Pricing & Plans', icon: '₦' },
];

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // CHANGE 2: Two timezone clocks instead of one
  const [lagosTime, setLagosTime]     = useState('');
  const [nairobiTime, setNairobiTime] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const tick = () => {
      const now = new Date();
      setLagosTime(
        now.toLocaleTimeString('en-NG', {
          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
          timeZone: 'Africa/Lagos',      // WAT = UTC+1
        })
      );
      setNairobiTime(
        now.toLocaleTimeString('en-KE', {
          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
          timeZone: 'Africa/Nairobi',    // EAT = UTC+3
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="kori-root">
      {/* ── SIDEBAR ── */}
      <aside className={`kori-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <span className="brand-hex">⬡</span>
          </div>
          {sidebarOpen && (
            <div className="brand-text">
              <span className="brand-name">KORI</span>
              <span className="brand-sub">AML Intelligence</span>
            </div>
          )}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◁' : '▷'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            // CHANGE 3: active check uses '/dashboard' guard, not '/'
            const active =
              router.pathname === item.href ||
              (item.href !== '/dashboard' && router.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
                {active && <span className="nav-pip" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="status-badge">
              <span className="status-dot" />
              <span className="status-text">SYSTEM LIVE</span>
            </div>
          )}
          {user && sidebarOpen && (
            <div className="user-block">
              <div className="user-avatar">{user.email?.[0]?.toUpperCase()}</div>
              <div className="user-info">
                <span className="user-email">{user.email}</span>
                <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="kori-main">
        <header className="kori-topbar">
          <div className="topbar-left">
            <h1 className="page-title">
              {navItems.find((i) =>
                i.href === '/dashboard'
                  ? router.pathname === '/dashboard'
                  : router.pathname.startsWith(i.href)
              )?.label ?? 'Dashboard'}
            </h1>
            <span className="page-breadcrumb">
              Nigerian &amp; Kenyan AML/CFT/CPF Intelligence Platform
            </span>
          </div>

          {/* CHANGE 4: Dual clocks — Lagos (WAT) + Nairobi (EAT) */}
          <div className="topbar-right">
            <div className="topbar-clocks">
              <div className="clock-block">
                <span className="clock-city">Lagos</span>
                <span className="clock-tz">WAT</span>
                <span className="clock-time">{lagosTime}</span>
              </div>
              <div className="clock-divider" />
              <div className="clock-block">
                <span className="clock-city">Nairobi</span>
                <span className="clock-tz">EAT</span>
                <span className="clock-time clock-nairobi">{nairobiTime}</span>
              </div>
            </div>
            <div className="topbar-flag">🇳🇬🇰🇪 CBN · CBK Aligned</div>
          </div>
        </header>

        <div className="kori-content">{children}</div>
      </main>

      {/* ── ALL CSS: 100% original preserved + new clock styles appended ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --bg: #070d1a;
          --surface: #0d1525;
          --card: #111d30;
          --card-hover: #162035;
          --border: #1a2f4a;
          --border-bright: #1e4080;
          --cyan: #00d4ff;
          --cyan-dim: rgba(0,212,255,0.15);
          --cyan-glow: rgba(0,212,255,0.3);
          --amber: #f59e0b;
          --red: #ef4444;
          --red-dim: rgba(239,68,68,0.15);
          --green: #10b981;
          --green-dim: rgba(16,185,129,0.15);
          --purple: #8b5cf6;
          --text: #e2e8f0;
          --text-dim: #94a3b8;
          --text-muted: #64748b;
          --sidebar-w: 220px;
          --sidebar-w-collapsed: 64px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        .kori-root {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 80% 80% at 50% -20%, rgba(0,100,200,0.08) 0%, transparent 70%);
        }

        /* ── SIDEBAR ─────────────────────────────────────────────── */
        .kori-sidebar {
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          width: var(--sidebar-w);
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width 0.25s ease;
          overflow: hidden;
        }
        .kori-sidebar.collapsed { width: var(--sidebar-w-collapsed); }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-bottom: 1px solid var(--border);
          min-height: 70px;
        }

        .brand-mark {
          flex-shrink: 0;
          width: 32px; height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-hex {
          font-size: 28px;
          color: var(--cyan);
          filter: drop-shadow(0 0 8px var(--cyan-glow));
          line-height: 1;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .brand-name {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: 0.12em;
          color: #fff;
          line-height: 1.1;
        }

        .brand-sub {
          font-size: 9px;
          letter-spacing: 0.08em;
          color: var(--text-dim);
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sidebar-toggle {
          margin-left: auto;
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          width: 24px; height: 24px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          flex-shrink: 0;
        }
        .sidebar-toggle:hover { border-color: var(--cyan); color: var(--cyan); }

        .sidebar-nav {
          flex: 1;
          padding: 12px 0;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          color: var(--text-dim);
          text-decoration: none;
          transition: all 0.15s ease;
          font-size: 13px;
          font-weight: 400;
          white-space: nowrap;
        }
        .nav-item:hover { color: var(--text); background: rgba(255,255,255,0.03); }
        .nav-item.active { color: var(--cyan); background: var(--cyan-dim); }
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: var(--cyan);
          box-shadow: 0 0 8px var(--cyan-glow);
        }

        .nav-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .nav-pip {
          position: absolute;
          right: 12px;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--cyan);
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--green-dim);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 6px;
        }

        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px var(--green);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .status-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          color: var(--green);
        }

        .user-block { display: flex; align-items: center; gap: 8px; }

        .user-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--cyan-dim);
          border: 1px solid var(--cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: var(--cyan);
          font-weight: 600;
          flex-shrink: 0;
        }

        .user-info { display: flex; flex-direction: column; overflow: hidden; }

        .user-email {
          font-size: 11px;
          color: var(--text-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .signout-btn {
          background: none; border: none;
          font-size: 10px;
          color: var(--red);
          cursor: pointer;
          padding: 0;
          text-align: left;
        }
        .signout-btn:hover { text-decoration: underline; }

        /* ── MAIN ────────────────────────────────────────────────── */
        .kori-main {
          margin-left: var(--sidebar-w);
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          transition: margin-left 0.25s ease;
        }

        .kori-topbar {
          height: 70px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          background: var(--surface);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-left { display: flex; flex-direction: column; gap: 2px; }

        .page-title {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }

        .page-breadcrumb {
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 0.04em;
        }

        .topbar-right { display: flex; align-items: center; gap: 20px; }

        /* ORIGINAL single clock kept for fallback — overridden by dual clock below */
        .topbar-clock { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
        .clock-label  { font-size: 9px; letter-spacing: 0.1em; color: var(--text-dim); }
        .clock-time   {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          color: var(--cyan);
          letter-spacing: 0.05em;
        }

        .topbar-flag {
          font-size: 11px;
          color: var(--text-dim);
          padding: 4px 10px;
          border: 1px solid var(--border);
          border-radius: 20px;
          letter-spacing: 0.04em;
        }

        .kori-content {
          flex: 1;
          padding: 28px 32px;
          overflow-x: hidden;
        }

        /* ── CARDS ───────────────────────────────────────────────── */
        .kori-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .kori-card:hover { border-color: var(--border-bright); }

        .card-header {
          padding: 16px 20px 12px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-title {
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .card-body { padding: 20px; }

        /* ── STAT CARDS ──────────────────────────────────────────── */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .stat-card:hover { border-color: var(--border-bright); }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }
        .stat-card.cyan::before  { background: var(--cyan); }
        .stat-card.amber::before { background: var(--amber); }
        .stat-card.red::before   { background: var(--red); }
        .stat-card.green::before { background: var(--green); }

        .stat-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-dim);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .stat-value {
          font-family: 'Sora', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-change { font-size: 11px; color: var(--text-dim); }
        .stat-change.up   { color: var(--green); }
        .stat-change.down { color: var(--red); }

        /* ── TABLES ──────────────────────────────────────────────── */
        .kori-table { width: 100%; border-collapse: collapse; }

        .kori-table th {
          padding: 10px 16px;
          text-align: left;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          font-weight: 500;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.02);
        }

        .kori-table td {
          padding: 12px 16px;
          font-size: 13px;
          color: var(--text);
          border-bottom: 1px solid rgba(26,47,74,0.5);
          vertical-align: middle;
        }

        .kori-table tr:hover td { background: rgba(255,255,255,0.02); }
        .kori-table tr:last-child td { border-bottom: none; }

        .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

        /* ── BADGES ──────────────────────────────────────────────── */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.05em;
        }
        .badge-red   { background: var(--red-dim);             color: var(--red);      border: 1px solid rgba(239,68,68,0.3);  }
        .badge-amber { background: rgba(245,158,11,0.15);      color: var(--amber);    border: 1px solid rgba(245,158,11,0.3); }
        .badge-green { background: var(--green-dim);            color: var(--green);    border: 1px solid rgba(16,185,129,0.3); }
        .badge-cyan  { background: var(--cyan-dim);             color: var(--cyan);     border: 1px solid rgba(0,212,255,0.3);  }
        .badge-gray  { background: rgba(100,116,139,0.15);     color: var(--text-dim); border: 1px solid var(--border);        }

        /* ── RISK BAR ────────────────────────────────────────────── */
        .risk-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .risk-bar-track {
          flex: 1;
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
        }
        .risk-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        .risk-pct {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          min-width: 32px;
          text-align: right;
        }

        /* ── BUTTONS ─────────────────────────────────────────────── */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary { background: var(--cyan); color: #000; }
        .btn-primary:hover { background: #33ddff; box-shadow: 0 0 16px var(--cyan-glow); }
        .btn-outline { background: transparent; border-color: var(--border); color: var(--text-dim); }
        .btn-outline:hover { border-color: var(--cyan); color: var(--cyan); }
        .btn-danger { background: var(--red-dim); border-color: rgba(239,68,68,0.4); color: var(--red); }
        .btn-danger:hover { background: rgba(239,68,68,0.25); }
        .btn-sm { padding: 4px 10px; font-size: 11px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── INPUTS ──────────────────────────────────────────────── */
        .kori-input {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          padding: 8px 12px;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          outline: none;
          transition: border-color 0.15s;
        }
        .kori-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px var(--cyan-dim); }
        .kori-input::placeholder { color: var(--text-muted); }

        .kori-select {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          outline: none;
        }
        .kori-select:focus { border-color: var(--cyan); }

        /* ── GRID HELPERS ────────────────────────────────────────── */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .gap-4 { gap: 16px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .text-dim  { color: var(--text-dim); }
        .text-sm   { font-size: 12px; }
        .text-xs   { font-size: 11px; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }

        /* ── EMPTY STATE ─────────────────────────────────────────── */
        .empty-state {
          padding: 48px 24px;
          text-align: center;
          color: var(--text-dim);
        }
        .empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.3; }
        .empty-text { font-size: 13px; }

        /* ── SKELETON LOADER ─────────────────────────────────────── */
        .skeleton {
          background: linear-gradient(90deg, var(--card) 25%, var(--card-hover) 50%, var(--card) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── SCROLLBAR ───────────────────────────────────────────── */
        ::-webkit-scrollbar            { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track      { background: transparent; }
        ::-webkit-scrollbar-thumb      { background: var(--border); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--border-bright); }

        /* ── TOAST ───────────────────────────────────────────────── */
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1000;
        }
        .toast {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          border: 1px solid;
          animation: slideIn 0.2s ease;
          max-width: 340px;
        }
        .toast-success { background: var(--green-dim); border-color: rgba(16,185,129,0.4); color: var(--green); }
        .toast-error   { background: var(--red-dim);   border-color: rgba(239,68,68,0.4);  color: var(--red);   }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }

        /* ── RESPONSIVE ──────────────────────────────────────────── */
        @media (max-width: 768px) {
          .kori-sidebar { display: none; }
          .kori-main    { margin-left: 0; }
          .stat-grid    { grid-template-columns: 1fr 1fr; }
          .kori-content { padding: 16px; }
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
        }

        /* ── DUAL CLOCK (new — added below original CSS, no conflicts) ── */
        .topbar-clocks {
          display: flex;
          align-items: center;
          gap: 0;
        }
        .clock-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
        }
        .clock-city {
          font-size: 8px;
          letter-spacing: 0.12em;
          color: var(--text-dim);
          text-transform: uppercase;
          line-height: 1;
        }
        .clock-tz {
          font-size: 8px;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          line-height: 1;
        }
        /* .clock-time already defined above — reused here */
        .clock-nairobi {
          color: #34d399; /* distinct EAT green vs Lagos cyan */
        }
        .clock-divider {
          width: 1px;
          height: 28px;
          background: var(--border);
          margin: 0 14px;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .topbar-clocks { display: none; }
        }
      `}</style>
    </div>
  );
}