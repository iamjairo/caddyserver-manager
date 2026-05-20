import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Globe,
  Server,
  Activity,
  Shield,
  ShieldAlert,
  Play,
  Pause,
  RefreshCw,
  Plus,
  FileCode,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Save,
  Terminal,
  Search,
  Check,
  Package,
  Cpu,
  Copy,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Edit3,
  X,
  Layers,
  Box,
  Zap,
  LogOut,
  User,
  Book,
  Github,
  ArrowUp,
  Cable,
  Cog,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import clsx from 'clsx';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';

// ... (keep Prism details if needed, but for brevity in replace check lines)

// Custom Caddyfile Syntax for Prism
languages.caddyfile = {
  'comment': /#.*/,
  'string': {
    pattern: /"(?:\\.|[^"\\\r\n])*"/,
    greedy: true
  },
  'directive': {
    pattern: /(^|\s)(reverse_proxy|root|file_server|php_fastcgi|redir|rewrite|handle|handle_errors|route|try_files|import|abort|error|log|encode|tls|header|request_header|response_header|basicauth|forward_auth|skip_log|handle_path|push|request_body|templates|vars|tracing|map)(\s|$)/,
    lookbehind: true,
    alias: 'keyword'
  },
  'matcher': {
    pattern: /(@[\w.-]+|\/\*|\/[\w\/*.-]+)/,
    alias: 'class-name'
  },
  'placeholder': {
    pattern: /\{[\w.-]+\}/,
    alias: 'variable'
  },
  'number': /\b\d+\b/,
  'boolean': /\b(on|off|true|false)\b/
};

import WebTerminal from './components/WebTerminal';
import Login from './components/Login';
import SettingsPage from './components/Settings';
import Documentation from './components/Documentation';
import Domains from './components/Domains';
import CaddyLogo from './components/CaddyLogo';
import NodeIdentity from './components/NodeIdentity';
import api from './api';
import { useEmbedMode } from './hooks/useEmbedMode';

function App() {
  const { isEmbedded } = useEmbedMode();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // mediamtxNeon is the new default; falls back to whatever the user has
  // explicitly picked via the theme switcher (prism/flat/horizon/terminal/manager).
  const [theme, setTheme] = useState(localStorage.getItem('caddy-theme') || 'mediamtxNeon');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState({});

  // Fetch Settings (Branding)
  useEffect(() => {
    // Only call /settings if authenticated, otherwise use /settings/public
    const endpoint = isAuthenticated ? '/settings' : '/settings/public';
    api.get(endpoint)
      .then(res => setGlobalSettings(res.data || {}))
      .catch(e => console.error('Failed to load settings', e));
  }, [activeTab, isAuthenticated]); // Refresh on tab change or auth status change

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('caddy-token');
    const storedUser = localStorage.getItem('caddy-user');

    if (token && storedUser) {
      // Verify token is still valid
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setIsAuthenticated(true);
            setUser(JSON.parse(storedUser));
          } else {
            localStorage.removeItem('caddy-token');
            localStorage.removeItem('caddy-user');
          }
        })
        .catch(() => {
          localStorage.removeItem('caddy-token');
          localStorage.removeItem('caddy-user');
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('caddy-theme', theme);
  }, [theme]);

  const handleLogin = (userData, token) => {
    localStorage.setItem('caddy-token', token);
    localStorage.setItem('caddy-user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('caddy-token');
    localStorage.removeItem('caddy-user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const themes = [
    { id: 'mediamtxNeon', name: 'MediaMTX Neon', icon: Zap, desc: 'Slate-900 + cyan-400, matches IoT Dashboard' },
    { id: 'prism', name: 'Prism Command', icon: CaddyLogo, desc: 'High-contrast dark neon (original)' },
    { id: 'flat', name: 'Flat Professional', icon: LayoutDashboard, desc: 'Clean light mode' },
    { id: 'horizon', name: 'Aura Horizon', icon: Globe, desc: 'Premium space sunset' },
    { id: 'terminal', name: 'Matrix Terminal', icon: Terminal, desc: 'Retro utility monochrome' },
    { id: 'manager', name: 'Caddy Manager', icon: Shield, desc: 'Professional sidebar layout' }
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'architecture', label: 'Engine Configuration', icon: Cpu },
    { id: 'domains', label: 'Sites & Domains', icon: Server },
    { id: 'streams', label: 'Port Forwarding', icon: Cable },
    { id: 'caddyfile', label: 'Code Editor', icon: FileCode },
    { id: 'explorer', label: 'Visual Config', icon: Globe },
    { id: 'modules', label: 'Plugins', icon: Package },
    { id: 'pki', label: 'Security', icon: Shield },
    { id: 'files', label: 'Files & Folders', icon: FileCode },
    { id: 'logs', label: 'Server Vitals', icon: Activity },

    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'monetization', label: 'Monetization', icon: Activity },
    { id: 'github', label: 'GitHub Nexus', icon: Github },
    { id: 'settings', label: 'System Settings', icon: Cog },
    { id: 'docs', label: 'Documentation', icon: Book },
  ];

  const filteredNavItems = useMemo(() => {
    if (!user || !user.permissions) return [];
    if (user.permissions.includes('all')) return navItems;
    return navItems.filter(item => !['monetization', 'github'].includes(item.id));
  }, [user, navItems]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} globalSettings={globalSettings} theme={theme} />;
  }


  return (
    <div className={clsx(
      "h-screen font-sans selection:bg-pink-500/30 overflow-hidden relative transition-all duration-700",
      `theme-${theme}`,
      theme === 'flat' ? "bg-[#f8f9fa] text-[#2c3e50]" : "bg-[var(--base-bg)] text-[var(--base-text)]"
    )}>
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {theme === 'prism' && (
          <>
            <div className="absolute inset-0 bg-dot-matrix opacity-20" />
            <div className="absolute inset-x-0 h-64 bg-gradient-to-b from-transparent via-pink-500/5 to-transparent animate-scan z-0" />
          </>
        )}
        {theme === 'horizon' && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0d17] via-[#1a1b2a] to-[#0b0d17]">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, -30, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-orange-500/5 blur-[120px] rounded-full"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                x: [0, -50, 0],
                y: [0, 30, 0]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-pink-500/5 blur-[120px] rounded-full"
            />
          </div>
        )}
        {theme === 'terminal' && (
          <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        )}
        {theme === 'flat' && (
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        )}
      </div>

      <div className="flex h-full relative z-10 overflow-hidden flex-col md:flex-row">
        {/* Mobile Header */}
        <div className={clsx(
          "md:hidden flex items-center justify-between p-4 border-b z-50 shrink-0",
          theme === 'manager' || theme === 'flat' ? "bg-white border-slate-200 text-slate-800" : "bg-black/50 border-white/10 text-white"
        )}>
          <div className="flex items-center gap-3">
            {globalSettings.app_logo && <img src={globalSettings.app_logo} className="h-6 w-6 object-contain" alt="Logo" />}
            <h1 className="text-sm font-black tracking-tight">{globalSettings.app_title || 'Caddy Manager'}</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-white/10">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Backdrop */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Manager Sidebar */}
        {theme === 'manager' && (
          <aside className={clsx(
            "w-64 manager-sidebar flex flex-col h-full z-[100] shrink-0 transition-transform duration-300",
            "fixed inset-y-0 left-0 md:relative md:translate-x-0",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="p-8 pb-12 flex items-center gap-3">
              {globalSettings.app_logo && <img src={globalSettings.app_logo} className="h-8 w-8 object-contain" alt="Logo" />}
              <h1 className="text-xl font-black text-white tracking-tight">{globalSettings.app_title || 'Caddy Manager'}</h1>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto sidebar-scroll">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={clsx(
                    "w-full flex items-center gap-4 px-8 py-4 text-sm font-bold manager-nav-item transition-all",
                    activeTab === item.id && "active"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-8 mt-auto border-t border-white/5 relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={clsx(
                  "w-full flex items-center gap-4 transition-all text-sm font-bold group",
                  theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)]" : "text-slate-400 hover:text-white"
                )}
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                Settings
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-24 left-4 right-4 prism-card bg-[#0f172a] p-4 shadow-2xl border-white/10 z-50"
                  >
                    {themes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id); setIsSettingsOpen(false); }}
                        className={clsx(
                          "w-full flex items-center gap-3 p-2 rounded-lg text-left group transition-all mb-1 last:mb-0",
                          theme === t.id ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : (theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)] hover:bg-[var(--surface-bg)]" : "text-slate-400 hover:text-white hover:bg-white/5")
                        )}
                      >
                        <t.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User Info & Logout */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className={clsx("flex items-center gap-2 text-xs mb-2", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>
                  <User className="w-4 h-4" />
                  <span>{user?.username || 'admin'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 transition-all text-sm font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Existing Navigation (Prism, Flat, Horizon, Terminal) */}
        {theme !== 'manager' && (
          <aside className={clsx(
            "w-20 transition-all duration-500 flex flex-col items-center py-8 z-[100] shrink-0 border-r",
            "fixed inset-y-0 left-0 md:relative md:translate-x-0",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
            theme === 'prism' ? "bg-black/95 md:bg-black/40 border-white/5" :
              theme === 'horizon' ? "bg-[#0b0d17] md:bg-white/5 border-white/10 backdrop-blur-2xl" :
                theme === 'terminal' ? "bg-black border-emerald-500/50 border-double" :
                  "bg-white border-slate-200"
          )}>
            <div className="mb-12 group cursor-pointer">
              <div className={clsx(
                "w-12 h-12 flex items-center justify-center transition-all duration-500",
                theme === 'prism' ? "prism-card prism-border-pink prism-glow" :
                  theme === 'horizon' ? "bg-gradient-to-br from-orange-500 to-pink-500 rounded-full shadow-lg" :
                    theme === 'terminal' ? "border-2 border-emerald-500 text-emerald-500" :
                      "bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20"
              )}>
                <CaddyLogo className="w-6 h-6" src={globalSettings.app_logo} />

              </div>
            </div>

            <nav className="flex-1 space-y-4 px-2 overflow-y-auto sidebar-scroll">
              {filteredNavItems.map((item) => (
                <div key={item.id} className="relative group flex items-center justify-center">
                  <button
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative overflow-hidden",
                      activeTab === item.id
                        ? (theme === 'prism' ? "text-cyan-400 bg-cyan-400/10 border border-cyan-400/30" :
                          theme === 'horizon' ? "bg-white/10 text-white shadow-inner" :
                            theme === 'terminal' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/50" :
                              "bg-blue-50 text-blue-600 shadow-sm")
                        : (theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)]" : "text-slate-400 hover:text-white")
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {activeTab === item.id && (
                      <motion.div
                        layoutId="navGlow"
                        className={clsx(
                          "absolute inset-0 z-[-1]",
                          theme === 'prism' ? "bg-cyan-500/5" :
                            theme === 'terminal' ? "bg-emerald-500/5" : ""
                        )}
                      />
                    )}
                  </button>

                  {/* Tactical Tooltip */}
                  <div className={clsx(
                    "absolute left-full ml-4 px-3 py-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-[100] whitespace-nowrap",
                    theme === 'manager' ? "hidden" : "block",
                    theme === 'prism' ? "bg-black border border-pink-500/30 text-[10px] uppercase font-black tracking-widest text-[var(--accent-primary)]" :
                      theme === 'terminal' ? "bg-black border border-emerald-500 text-[10px] font-mono text-emerald-500" :
                        "bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-md"
                  )}>
                    {item.label}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-auto space-y-4 flex flex-col items-center pb-4">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={clsx(
                  "w-10 h-10 flex items-center justify-center transition-all",
                  theme === 'terminal' ? "text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/10" :
                    theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)]" : "text-slate-400 hover:text-white"
                )}
              >
                <Settings className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    className={clsx(
                      "fixed left-24 bottom-8 w-64 p-4 shadow-2xl z-50",
                      theme === 'prism' ? "prism-card bg-[var(--base-bg)] border-pink-500/20" :
                        theme === 'horizon' ? "bg-black/60 backdrop-blur-3xl rounded-[32px] border border-white/10" :
                          theme === 'terminal' ? "bg-black border-emerald-500 border-2 rounded-none" :
                            "bg-white border text-slate-900 rounded-2xl"
                    )}
                  >
                    <div className="space-y-6 pt-10">
                      <p className={clsx("text-[10px] font-black uppercase tracking-widest px-2 mb-4", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>Interface Core</p>
                      {themes.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setTheme(t.id); setIsSettingsOpen(false); }}
                          className={clsx(
                            "w-full flex items-center gap-3 p-3 transition-all text-left group mb-1 last:mb-0",
                            theme === t.id ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : (theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)] hover:bg-[var(--surface-bg)]" : "text-slate-400 hover:text-white hover:bg-white/5"),
                            theme === 'terminal' ? "rounded-none" : "rounded-lg"
                          )}
                        >
                          <t.icon className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={clsx(
                "w-2 h-2 rounded-full mb-4",
                theme === 'prism' ? "bg-cyan-500 shadow-[0_0_10px_var(--accent-secondary)]" :
                  theme === 'terminal' ? "bg-emerald-500" :
                    "bg-emerald-500 shadow-sm"
              )} />

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={clsx(
                  "w-12 h-12 flex items-center justify-center transition-all",
                  theme === 'prism' ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg" :
                    theme === 'terminal' ? "text-red-500 hover:bg-red-500/20 border border-transparent hover:border-red-500" :
                      theme === 'horizon' ? "text-red-400 hover:text-red-300 rounded-full hover:bg-red-500/10" :
                        "text-red-500 hover:bg-red-50 rounded-lg"
                )}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={clsx(
          "flex-1 overflow-y-auto custom-scrollbar transition-all duration-700",
          theme === 'horizon' ? "p-4 sm:p-8 lg:p-12" : "p-4 md:p-12",
          theme === 'manager' && "bg-[#f1f5f9]"
        )}>
          <div className={clsx(
            "mx-auto space-y-12 transition-all duration-700",
            theme === 'horizon' ? "max-w-6xl bg-white/[0.02] backdrop-blur-3xl p-12 rounded-[48px] border border-white/5 shadow-2xl" : "max-w-7xl",
            theme === 'manager' && "space-y-6"
          )}>
            {/* Header (Different styling for manager) */}
            <header className={clsx(
              "flex items-end justify-between pb-8",
              theme === 'manager' ? "border-none" : "border-b pb-8",
              theme === 'flat' ? "border-slate-200" : "border-white/5"
            )}>
              <div>
                {theme !== 'manager' && <p className={clsx("text-[10px] font-black uppercase tracking-[0.4em] mb-2 px-1", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>Global Management</p>}
                <h2 className={clsx(
                  "font-black uppercase tracking-tighter",
                  theme === 'manager' || theme === 'flat' ? "text-4xl text-[var(--base-text)]" : "text-4xl text-white"
                )}>
                  {activeTab === 'dashboard' ? 'Overview' : navItems.find(n => n.id === activeTab)?.label}
                </h2>
                {globalSettings.under_attack === 'true' && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-2 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full w-fit"
                  >
                    <ShieldAlert className="w-3 h-3 text-rose-500 animate-pulse" />
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Under Attack Mode Active</span>
                  </motion.div>
                )}
              </div>
              <div className="text-right">
                <p className={clsx("text-[10px] font-black uppercase tracking-widest", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>Active System ID</p>
                <div className="flex items-center gap-2 justify-end">
                  <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", theme === 'terminal' ? "bg-emerald-500" : "bg-emerald-400")} />
                  <p className={clsx(
                    "text-xs font-bold font-mono tracking-tighter",
                    theme === 'terminal' ? "text-[var(--accent-primary)]" : (theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] font-black" : "text-slate-400 font-bold"),
                    theme === 'prism' && "text-pink-500/80"
                  )}>PRISM STABLE</p>
                </div>
              </div>
            </header>

            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && <Dashboard key="dash" theme={theme} onNavigate={setActiveTab} />}
              {activeTab === 'architecture' && <ArchitectureOverview key="arch" theme={theme} />}
              {activeTab === 'domains' && <Domains key="domains" theme={theme} onNavigate={setActiveTab} />}
              {activeTab === 'streams' && <Streams key="streams" theme={theme} />}
              {activeTab === 'caddyfile' && <CaddyfileEditor key="caddyfile" theme={theme} />}
              {activeTab === 'explorer' && <ConfigExplorer key="explorer" theme={theme} />}
              {activeTab === 'modules' && <ModuleExplorer key="modules" theme={theme} />}
              {activeTab === 'upstreams' && <Upstreams key="upstreams" theme={theme} />}
              {activeTab === 'pki' && <TLSManager key="pki" theme={theme} />}
              {activeTab === 'files' && <StaticFileManager key="files" theme={theme} />}
              {activeTab === 'logs' && <Logs key="logs" theme={theme} />}
              {activeTab === 'terminal' && <WebTerminal key="terminal" theme={theme} />}
              {activeTab === 'monetization' && <SettingsPage key="monetization" theme={theme} initialTab="ads" />}
              {activeTab === 'github' && <SettingsPage key="github" theme={theme} initialTab="github" />}
              {activeTab === 'settings' && <SettingsPage key="settings" theme={theme} />}
              {activeTab === 'docs' && <Documentation key="docs" theme={theme} />}
            </AnimatePresence>

            {/* Global Footer */}
            <footer className="mt-20 pt-8 border-t border-slate-500/10 text-center pb-8 flex flex-col items-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
              {globalSettings.app_logo && (
                <img src={globalSettings.app_logo} className="w-6 h-6 object-contain grayscale opacity-50" alt="Footer Logo" />
              )}
              {globalSettings.show_github && globalSettings.github_url && (
                <div className="flex items-center gap-4">
                  <a href={globalSettings.github_url} target="_blank" rel="noopener noreferrer" className={clsx("p-2 rounded-full transition-colors", theme === 'manager' || theme === 'flat' ? "hover:bg-[var(--surface-bg)]" : "hover:bg-white/5")}>
                    <Github className={clsx("w-5 h-5", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)]" : "text-white/40 hover:text-white")} />
                  </a>
                  <p className={clsx("text-[9px] font-black uppercase tracking-widest", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-white/40")}>v2.0.4 Build</p>
                </div>
              )}
              <p className={clsx(
                "text-[10px] uppercase tracking-widest font-bold",
                theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-white/40"
              )}>
                {globalSettings.footer_text || "© 2026 Caddyserver WebUI. All rights reserved."}
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}


// --- Components ---

// Header component removed in favor of integrated page headers inside main content area.

const ArchitectureOverview = ({ theme }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await api.get('/caddy/info');
        setData(res.data);
      } catch (e) {
        console.error("Failed to fetch architecture info", e);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-64">
      <RefreshCw className="w-12 h-12 text-[var(--accent-primary)] animate-spin opacity-20" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-32">
      {/* Top Banner: Core Concepts */}
      <div className={clsx(
        "p-12 relative overflow-hidden group",
        theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
      )}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
          <div className={clsx(
            "p-8 transition-all shrink-0",
            theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)] rounded-2xl" : "bg-white/5 text-[var(--accent-primary)] rounded-none"
          )}>
            <Layers className="w-16 h-16" />
          </div>
          <div className="flex-1 space-y-4">
            <h3 className={clsx("text-4xl font-black uppercase tracking-tighter italic", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>Caddy Orchestration</h3>
            <p className={clsx("text-sm font-bold uppercase tracking-[0.2em] leading-relaxed max-w-2xl", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>
              Caddy core merely manages configuration. It loads, provisions, uses, and cleans up <span className="text-[var(--accent-secondary)] italic">Modules</span>.
              Apps are opaque to the core—treated as isolated units that satisfy a Start/Stop interface.
            </p>
            <div className="flex flex-wrap gap-6 pt-4 items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                <span className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest font-mono">Engine: ONLINE</span>
              </div>
              <div className="h-4 w-px bg-slate-500/20" />
              <button
                onClick={async () => {
                  if (confirm('Reload Caddy Configuration?')) {
                    try { await api.post('/caddy/control/reload'); alert('Reload Signal Sent'); } catch (e) { alert('Reload Failed'); }
                  }
                }}
                className="text-[10px] font-black text-[var(--accent-secondary)] uppercase tracking-widest hover:text-white transition-colors"
              >
                [ RELOAD STARBOARD ]
              </button>
              <button
                onClick={async () => {
                  if (confirm('CRITICAL: STOP Caddy Engine?')) {
                    try { await api.post('/caddy/control/stop'); alert('Stop Signal Sent'); } catch (e) { alert('Stop Failed'); }
                  }
                }}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors"
              >
                [ SCUTTLE SHIP ]
              </button>
              <div className="h-4 w-px bg-slate-500/20" />
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={clsx(
                  "text-[10px] font-black uppercase tracking-widest transition-colors",
                  showConfig ? "text-[var(--accent-primary)]" : "text-[var(--muted-text)] hover:text-white"
                )}
              >
                {showConfig ? '[ HIDE LIVE CONFIG ]' : '[ VIEW LIVE CONFIG ]'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={clsx(
              "p-8 font-mono text-sm relative",
              theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] text-[var(--base-text)]" : "bg-black/80 border border-white/10 text-cyan-400"
            )}>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Operational Configuration Snapshot (JSON)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(data.config, null, 2));
                    alert('Configuration copied to clipboard');
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <pre className="overflow-x-auto custom-scrollbar p-6 bg-black/20 rounded-xl leading-relaxed">
                {JSON.stringify(data.config, null, 4)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={clsx(
        "px-12 py-8 relative overflow-hidden group",
        theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card border-emerald-500/10 bg-emerald-500/5"
      )}>
        <div className="flex gap-10 items-start relative z-10">
          <div className={clsx(
            "p-4 transition-all shrink-0",
            theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] text-emerald-500 rounded-lg shadow-sm" : "prism-card border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          )}>
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em] italic">Engine Control: The Smart Container Ship</p>
            <p className={clsx("text-[12px] leading-relaxed font-medium tracking-wide", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>
              Think of Caddy as a <span className={clsx("font-bold", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>Smart Container Ship</span>. The ship (the Core) provides the deck space and power plugs, but it doesn't know what's inside the cargo. Each <span className="text-emerald-400 italic">Module</span> is a shipping container—as long as it follows the standard "plug" (start/stop interface), the ship can carry it and sail.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Apps: The Opaque Blocks */}
        <div className="lg:col-span-2 space-y-6">
          <h5 className="px-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em] flex items-center gap-3">
            <Box className="w-3 h-3" /> Configured Guest Apps
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.apps.map(app => (
              <div key={app} className={clsx(
                "p-8 transition-all group hover:scale-[1.02]",
                theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card bg-black/20"
              )}>
                <div className="flex justify-between items-start mb-6">
                  <div className={clsx(
                    "p-3 rounded-lg",
                    theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)]" : "bg-white/5 text-[var(--accent-secondary)]"
                  )}>
                    <Cpu className="w-5 h-5 transition-transform group-hover:rotate-12" />
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Active</span>
                </div>
                <h4 className={clsx("text-2xl font-black uppercase tracking-tighter italic mb-2 text-[var(--base-text)]")}>{app}</h4>
                <p className="text-[10px] text-[var(--muted-text)] font-bold uppercase tracking-widest">App Module Interface</p>
                <div className="mt-8 flex gap-2">
                  <div className="h-1 flex-1 bg-emerald-500/20 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500" />
                  </div>
                </div>
                <p className="text-[8px] text-[var(--muted-text)] font-mono mt-2 uppercase">LIFECYCLE: USE_PHASE</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle Visualizer */}
        <div className="space-y-6">
          <h5 className="px-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em] flex items-center gap-3">
            <Zap className="w-3 h-3" /> Module Lifecycle
          </h5>
          <div className={clsx(
            "p-8 space-y-10 relative overflow-hidden",
            theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card bg-black/40"
          )}>
            {[
              { id: 'LOAD', desc: 'JSON Deserialization', active: true },
              { id: 'PROVISION', desc: 'Setup & Validations', active: true },
              { id: 'USE', desc: 'Operational Execution', active: true, current: true },
              { id: 'CLEANUP', desc: 'Resource Deallocation', active: false }
            ].map((step, idx) => (
              <div key={step.id} className="relative flex items-start gap-6">
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black z-10 transition-all",
                    step.current ? "bg-[var(--accent-primary)] text-white scale-125" :
                      step.active ? "bg-emerald-500/20 text-emerald-500" : (theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)]" : "bg-slate-800 text-slate-400")
                  )}>
                    {idx + 1}
                  </div>
                  {idx < 3 && <div className={clsx("w-0.5 h-16 mt-2", step.active ? "bg-emerald-500/20" : (theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)]" : "bg-slate-800"))} />}
                </div>
                <div>
                  <h6 className={clsx("text-xs font-black uppercase tracking-[0.2em]", step.current ? "text-[var(--accent-primary)]" : "text-[var(--muted-text)]")}>{step.id}</h6>
                  <p className="text-[10px] text-[var(--muted-text)] font-bold uppercase tracking-widest mt-1">{step.desc}</p>
                </div>
                {step.current && <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute -left-12 top-0 text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest -rotate-90 origin-bottom-right">CURRENT</motion.div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <h5 className="px-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em] flex items-center gap-3">
        <Activity className="w-3 h-3" /> Runtime Intelligence
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className={clsx(
          "p-8 group",
          theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
        )}>
          <p className="text-[10px] text-[var(--muted-text)] font-bold uppercase tracking-[0.3em] mb-4">Core Version</p>
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[var(--accent-secondary)]" />
            <p className={clsx("text-xl font-black font-mono tracking-tighter text-[var(--base-text)]")}>{data?.version.split(' ')[0]}</p>
          </div>
        </div>
        <div className={clsx(
          "p-8",
          theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
        )}>
          <p className="text-[10px] text-[var(--muted-text)] font-bold uppercase tracking-[0.3em] mb-4">Uptime Signature</p>
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <p className={clsx("text-xl font-black font-mono tracking-tighter text-[var(--accent-primary)]")}>{Math.floor(data?.env.uptime / 3600)}h {Math.floor((data?.env.uptime % 3600) / 60)}m</p>
          </div>
        </div>
        <div className={clsx(
          "p-8",
          theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
        )}>
          <p className="text-[10px] text-[var(--muted-text)] font-bold uppercase tracking-[0.3em] mb-4">Process Mem</p>
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <p className={clsx("text-xl font-black font-mono tracking-tighter text-[var(--muted-text)] text-sm")}>
              {Math.round(data?.env.memory.rss / 1024 / 1024)}MB RSS
            </p>
          </div>
        </div>
        <div className={clsx(
          "p-8",
          theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
        )}>
          <p className="text-[10px] text-[var(--muted-text)] font-bold uppercase tracking-[0.3em] mb-4">Architecture</p>
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-500" />
            <p className={clsx("text-xl font-black font-mono tracking-tighter text-[var(--muted-text)]")}>{data?.env.platform}_{data?.env.arch}</p>
          </div>
        </div>
      </div>

      {/* New Extended Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={clsx(
          "p-8 space-y-4",
          theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
        )}>
          <h4 className="text-[12px] font-black uppercase tracking-widest text-[var(--muted-text)] mb-2 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> System CPU Load
          </h4>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-black font-mono">{data?.env.loadavg?.[0]?.toFixed(2) || '0.00'}</span>
            <span className="text-[10px] uppercase font-bold text-[var(--muted-text)]">1 min avg / {data?.env.cpus || 1} Cores</span>
          </div>
          {/* Load Bar */}
          <div className="h-2 w-full bg-slate-500/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(((data?.env.loadavg?.[0] || 0) / (data?.env.cpus || 1)) * 100, 100)}%` }}
              className={clsx("h-full", ((data?.env.loadavg?.[0] || 0) / (data?.env.cpus || 1)) > 0.8 ? "bg-red-500" : "bg-purple-500")}
            />
          </div>
          <div className="flex gap-4 text-[10px] font-mono text-[var(--muted-text)]">
            <span>5m: {data?.env.loadavg?.[1]?.toFixed(2)}</span>
            <span>15m: {data?.env.loadavg?.[2]?.toFixed(2)}</span>
          </div>
        </div>

        <div className={clsx(
          "p-8 space-y-4",
          theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
        )}>
          <h4 className="text-[12px] font-black uppercase tracking-widest text-[var(--muted-text)] mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> System Memory
          </h4>
          <div className="flex justify-between items-end">
            <span className="text-3xl font-black font-mono">{((data?.env.total_mem - data?.env.free_mem) / 1024 / 1024 / 1024).toFixed(2)} GB</span>
            <span className="text-[10px] uppercase font-bold text-[var(--muted-text)]">Used / {((data?.env.total_mem || 0) / 1024 / 1024 / 1024).toFixed(2)} GB Total</span>
          </div>
          {/* Mem Bar */}
          <div className="h-2 w-full bg-slate-500/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(1 - (data?.env.free_mem / data?.env.total_mem)) * 100}%` }}
              className="h-full bg-amber-500"
            />
          </div>
          <div className="flex gap-4 text-[10px] font-mono text-[var(--muted-text)]">
            <span>Process RSS: {Math.round(data?.env.memory.rss / 1024 / 1024)} MB</span>
            <span>Heap: {Math.round(data?.env.memory.heapUsed / 1024 / 1024)} MB</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ModuleExplorer = ({ theme }) => {
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [pluginInput, setPluginInput] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState([]);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await api.get('/caddy/modules');
        setModules(res.data);
      } catch (e) {
        console.error("Failed to fetch modules", e);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  const startBuild = async () => {
    if (!pluginInput.trim()) return;

    setBuilding(true);
    setBuildLog(['🚀 Starting build process...']);

    try {
      const response = await fetch('/api/caddy/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('caddy-token')}`
        },
        body: JSON.stringify({ modules: pluginInput.split(',').map(m => m.trim()) })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);

        lines.forEach(line => {
          try {
            const data = JSON.parse(line);
            setBuildLog(prev => [...prev, `${data.status.toUpperCase()}: ${data.message}`]);
          } catch (e) {
            setBuildLog(prev => [...prev, line]);
          }
        });
      }

      setBuildLog(prev => [...prev, '✅ Build completed! Refreshing in 3 seconds...']);
      setTimeout(() => window.location.reload(), 3000);
    } catch (e) {
      setBuildLog(prev => [...prev, `❌ Build failed: ${e.message}`]);
    } finally {
      setBuilding(false);
    }
  };

  const filtered = modules.filter(m =>
    m.id.toLowerCase().includes(search.toLowerCase()) ||
    m.package.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, m) => {
    const namespace = m.id.includes('.') ? m.id.substring(0, m.id.lastIndexOf('.')) : 'core';
    if (!acc[namespace]) acc[namespace] = [];
    acc[namespace].push(m);
    return acc;
  }, {});

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const generateTemplate = (mId) => {
    const parts = mId.split('.');
    const name = parts.pop();
    return JSON.stringify({
      handler: name,
      ...(mId.includes('http.handlers') ? { "...": "config" } : {})
    }, null, 2);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-64">
      <RefreshCw className="w-12 h-12 text-[var(--accent-primary)] animate-spin opacity-20" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-32">
      <div className={clsx(
        "flex justify-between items-center p-8 relative overflow-hidden group",
        theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card"
      )}>
        <div className="flex items-center gap-6 relative z-10">
          <div className={clsx(
            "p-4 transition-all",
            theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)] rounded-lg" : "bg-white/5 text-[var(--accent-secondary)]"
          )}>
            <Package className="w-8 h-8" />
          </div>
        </div>
        <div className="relative w-96 z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-text)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search internal modules..."
            className={clsx(
              "w-full pl-12 pr-4 py-3 text-xs font-bold uppercase tracking-widest outline-none transition-all",
              theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] text-[var(--base-text)] focus:border-[var(--accent-primary)] rounded-lg" : "bg-white/5 border border-white/5 text-[var(--base-text)] focus:border-[var(--accent-secondary)]"
            )}
          />
        </div>
      </div>

      {/* Interactive Plugin Builder */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={clsx(
          "p-8 relative overflow-hidden group transition-all",
          theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)]" : "prism-card border-rose-500/20 bg-rose-500/5"
        )}
      >
        <div className="flex items-start gap-8 relative z-10">
          <div className={clsx(
            "p-4 border transition-all shrink-0",
            theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border-[var(--glass-border)] text-rose-500 rounded-lg shadow-sm" : "prism-card border-rose-500/30 text-rose-400 bg-rose-500/10"
          )}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className={clsx("text-[10px] font-black uppercase tracking-[0.4em] mb-1.5", theme === 'manager' || theme === 'flat' ? "text-rose-600" : "text-rose-400")}>The Upgrade Shop: One-Click Plugin Install</p>
              <p className={clsx("text-[12px] font-medium tracking-wide leading-relaxed", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>
                Need a plugin like <span className="text-[var(--accent-secondary)] font-bold italic">Cloudflare DNS</span> or <span className="text-[var(--accent-secondary)] font-bold italic">Rate Limiting</span>? Enter the module name below and click <span className={clsx("font-bold", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>Build & Install</span>. The system will automatically compile a custom Caddy binary and deploy it for you.
              </p>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--muted-text)] mb-2">Plugin Module (e.g., github.com/caddy-dns/cloudflare)</label>
                <input
                  value={pluginInput}
                  onChange={(e) => setPluginInput(e.target.value)}
                  placeholder="github.com/caddy-dns/cloudflare"
                  className={clsx(
                    "w-full px-4 py-2 border rounded text-xs font-mono outline-none focus:border-rose-500 transition-all",
                    theme === 'manager' || theme === 'flat' ? "bg-white border-slate-200 text-slate-900" : "bg-white/10 border-white/10 text-white"
                  )}
                />
              </div>
              <button
                onClick={() => setBuildModalOpen(true)}
                disabled={!pluginInput.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-[9px] font-black uppercase tracking-widest rounded transition-all shadow-lg shadow-rose-600/20"
              >
                <Zap className="w-3 h-3" /> Build & Install
              </button>
            </div>
            <div className="flex items-center gap-3 text-[8px] text-[var(--muted-text)] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Auto-Build
              </div>
              <div className="h-3 w-px bg-slate-200/20" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Auto-Deploy
              </div>
              <div className="h-3 w-px bg-slate-200/20" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Auto-Restart
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Package className="w-32 h-32 rotate-12" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([ns, mods]) => (
          <div key={ns} className="space-y-4">
            <h5 className="px-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em] flex items-center gap-3">
              <Cpu className="w-3 h-3" /> {ns}
            </h5>
            <div className="space-y-3">
              {mods.map(m => (
                <div key={m.id} className={clsx(
                  "p-5 transition-all group hover:scale-[1.02] flex flex-col",
                  theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card bg-black/20"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={clsx("text-xs font-black tracking-tight text-[var(--base-text)]")}>
                      {m.id.split('.').pop()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-[var(--muted-text)] uppercase font-mono bg-black/5 px-2 py-0.5 rounded">
                        {m.version}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-[var(--muted-text)] font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity mb-4">
                    {m.package}
                  </p>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all mt-auto pt-2 border-t border-[var(--glass-border)]">
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(m.id)}
                        className={clsx(
                          "flex-1 flex items-center justify-center gap-2 py-2 text-[9px] font-black uppercase tracking-widest transition-colors rounded",
                          theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] hover:bg-slate-200 text-[var(--muted-text)]" : "bg-white/5 hover:bg-white/10 text-slate-400"
                        )}
                      >
                        <Copy className="w-3 h-3" /> ID
                      </button>
                      <button
                        onClick={() => setViewingTemplate(m.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-[9px] font-black uppercase tracking-widest bg-slate-50 hover:bg-slate-100 text-slate-400 transition-colors rounded"
                      >
                        <Terminal className="w-3 h-3" /> View
                      </button>
                    </div>
                    <a
                      href={`https://caddyserver.com/docs/modules/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 text-[9px] font-black uppercase tracking-widest bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors rounded"
                    >
                      <ExternalLink className="w-3 h-3" /> Documentation
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {viewingTemplate && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingTemplate(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div className={clsx(
              "relative w-full max-w-lg p-10 shadow-2xl",
              theme === 'manager' ? "bg-white rounded-[12px] border border-slate-200" : "prism-card bg-[#050507]"
            )}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className={clsx("text-2xl font-black tracking-tighter uppercase italic", theme === 'manager' ? "text-slate-900" : "text-white")}>Module Blueprint</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{viewingTemplate}</p>
                </div>
                <button onClick={() => setViewingTemplate(null)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="bg-slate-900 rounded-lg p-6 font-mono text-xs text-pink-300 leading-relaxed overflow-x-auto">
                <pre>{generateTemplate(viewingTemplate)}</pre>
              </div>
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => { copyToClipboard(generateTemplate(viewingTemplate)); setViewingTemplate(null); }}
                  className="flex-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded hover:bg-rose-700 transition-colors"
                >
                  Copy JSON Blueprint
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buildModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !building && setBuildModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={clsx(
                "relative w-full max-w-2xl p-10 shadow-2xl",
                theme === 'manager' ? "bg-white rounded-[12px] border border-slate-200" : "prism-card bg-[#050507]"
              )}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className={clsx("text-2xl font-black tracking-tighter uppercase italic", theme === 'manager' ? "text-slate-900" : "text-white")}>Plugin Builder</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Automated xcaddy Build</p>
                </div>
                <button onClick={() => !building && setBuildModalOpen(false)} disabled={building} className="text-slate-400 hover:text-white transition-colors disabled:opacity-30"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Module(s) to Install</label>
                  <input
                    value={pluginInput}
                    onChange={(e) => setPluginInput(e.target.value)}
                    disabled={building}
                    placeholder="github.com/caddy-dns/cloudflare, github.com/..."
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded text-sm font-mono text-white outline-none focus:border-rose-500 transition-all disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">Separate multiple modules with commas. Layer4 is always included.</p>
                </div>

                {buildLog.length > 0 && (
                  <div className="bg-black rounded-lg p-6 font-mono text-xs text-emerald-400 leading-relaxed max-h-64 overflow-y-auto border border-emerald-500/20">
                    {buildLog.map((log, i) => (
                      <div key={i} className="mb-1">{log}</div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={startBuild}
                    disabled={building || !pluginInput.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest py-4 rounded transition-colors"
                  >
                    {building ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Building...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Start Build
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Header component removed in favor of integrated page headers inside main content area.

const Dashboard = ({ theme, onNavigate }) => {
  const [stats, setStats] = useState({ domains: 0, servers: 0, activeDomains: 0, streams: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [dRes, sRes, stRes] = await Promise.all([
          api.get('/domains'),
          api.get('/servers'),
          api.get('/streams')
        ]);
        setStats({
          domains: dRes.data.length,
          activeDomains: dRes.data.filter(d => d.status === 'active').length,
          servers: sRes.data.length,
          streams: stRes.data.length
        });
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Total Domains"
          value={stats.domains}
          icon={Globe}
          color="text-indigo-400"
          trend="+12% this month"
          theme={theme}
        />
        <StatCard
          title="Active Routes"
          value={stats.activeDomains}
          icon={CaddyLogo}
          color="text-emerald-400"
          trend="All systems go"
          theme={theme}
        />
        <StatCard
          title="Layer 4 Streams"
          value={stats.streams}
          icon={Cable}
          color="text-cyan-400"
          trend="Active tunnels"
          theme={theme}
        />
        <StatCard
          title="Managed Servers"
          value={stats.servers}
          icon={Server}
          color="text-amber-400"
          trend="Stable connection"
          theme={theme}
        />
      </motion.div>

      <QuickActions theme={theme} onNavigate={onNavigate} />
    </div>
  );
};

const QuickActions = ({ theme, onNavigate }) => {
  const actions = [
    { label: 'Add Domain', icon: Plus, color: 'hover:border-indigo-500/50', action: () => onNavigate('domains') },
    { label: 'Add Stream', icon: Cable, color: 'hover:border-cyan-500/50', action: () => onNavigate('streams') },
    {
      label: 'Reload Caddy', icon: RefreshCw, color: 'hover:border-emerald-500/50', action: async () => {
        if (confirm('Reload Caddy Config?')) {
          try { await api.post('/caddy/control/reload'); alert('Reload Success'); } catch (e) { alert('Reload Failed'); }
        }
      }
    },
    { label: 'Open Terminal', icon: Terminal, color: 'hover:border-amber-500/50', action: () => onNavigate('terminal') },
    { label: 'View Logs', icon: Activity, color: 'hover:border-rose-500/50', action: () => onNavigate('logs') },
    { label: 'Settings', icon: Cog, color: 'hover:border-slate-500/50', action: () => onNavigate('settings') },
  ];

  return (
    <section className="space-y-6">
      <h5 className="px-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em] flex items-center gap-3">
        <Zap className="w-3 h-3" /> Tactical Shortcuts
      </h5>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((act) => (
          <button
            key={act.label}
            onClick={act.action}
            className={clsx(
              "p-6 flex flex-col items-center justify-center gap-4 transition-all group",
              theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)]" : "prism-card bg-black/20",
              act.color
            )}
          >
            <div className={clsx(
              "p-3 rounded-lg transition-transform group-hover:scale-110",
              theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)] group-hover:text-[var(--base-text)]" : "bg-white/5 text-slate-400 group-hover:text-white"
            )}>
              <act.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-text)] group-hover:text-[var(--base-text)]">
              {act.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

const StatCard = ({ title, value, icon: Icon, color, trend, theme }) => (
  <div className={clsx(
    "p-8 relative overflow-hidden transition-all duration-500",
    theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] shadow-sm rounded-[var(--rounding)]" : "prism-card",
    theme === 'horizon' ? "rounded-3xl" : ""
  )}>
    <div className="flex items-center justify-between mb-6">
      <div className={clsx(
        "p-4 transition-all duration-500",
        theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)] group-hover:text-[var(--accent-primary)] rounded-lg" : "bg-white/5",
        theme === 'horizon' ? "rounded-2xl" : theme === 'flat' ? "rounded-xl" : "rounded-none"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <div className={clsx(
        "text-[10px] font-black uppercase tracking-widest",
        theme === 'manager' ? "text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md" : (theme === 'terminal' ? "text-[var(--accent-primary)] font-mono" : color)
      )}>
        {trend}
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-[var(--muted-text)]">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className={clsx(
          "text-4xl font-black tracking-tighter text-[var(--base-text)]"
        )}>
          {theme === 'terminal' && "> "}{value}
        </h3>
      </div>
    </div>

    {/* Manager/Flat-specific "View Details" style button */}
    {(theme === 'manager' || theme === 'flat') && (
      <button className="mt-8 w-full py-2 bg-[var(--base-bg)] hover:bg-[var(--surface-bg)] text-[var(--muted-text)] text-[10px] font-bold uppercase tracking-widest rounded-lg border border-[var(--glass-border)] transition-all">
        View Details
      </button>
    )}
  </div>
);
// --- Node Identity Helper ---

const STREAM_BLUEPRINTS = [
  {
    id: 'relay',
    name: 'The Pipeline',
    subtitle: 'TCP Stream',
    icon: Cable,
    description: 'High-performance TCP relay for SSH, Databases (MySQL/PG), and custom binaries.',
    default_proto: 'tcp'
  },
  {
    id: 'broadcast',
    name: 'The Signal',
    subtitle: 'UDP Stream',
    icon: Activity,
    description: 'Specialized UDP packet forwarding for game servers, real-time media, and DNS nodes.',
    default_proto: 'udp'
  },
  {
    id: 'vector',
    name: 'The Multi-Vector',
    subtitle: 'Dual Channel',
    icon: Zap,
    description: 'Advanced dual-stack TCP/UDP proxying for complex tunneling and VPN protocols.',
    default_proto: 'tcp,udp'
  }
];

// STREAMS COMPONENT - Insert this before the Domains component in App.jsx

const Streams = ({ theme }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [editingStream, setEditingStream] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    template: 'relay',
    listen_port: '',
    protocol: 'tcp',
    upstream_host: '',
    upstream_port: '',
    status: 'active',
    allowed_ips: '',
    blocked_ips: ''
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const fetchStreams = async () => {
    try {
      const res = await api.get('/streams');
      setStreams(res.data);
    } catch (e) {
      console.error("Error fetching streams", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const handleAdd = () => {
    setEditingStream(null);
    setActiveTab('general');
    setFormData({
      name: '',
      template: 'relay',
      listen_port: '',
      protocol: 'tcp',
      upstream_host: '',
      upstream_port: '',
      status: 'active',
      allowed_ips: '',
      blocked_ips: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (stream) => {
    setEditingStream(stream);
    setActiveTab('general');
    setFormData({
      ...stream,
      template: stream.template || 'relay',
      allowed_ips: stream.allowed_ips || '',
      blocked_ips: stream.blocked_ips || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingStream) {
        await api.put(`/streams/${editingStream.id}`, formData);
      } else {
        await api.post('/streams', formData);
      }
      fetchStreams();
      setIsModalOpen(false);
    } catch (e) {
      console.error("Save failed", e);
      const errorMsg = e.response?.data?.error || "Failed to save stream.";
      const details = e.response?.data?.details;
      const fullMessage = details
        ? `${errorMsg}\n\nTechnical Details: ${typeof details === 'object' ? JSON.stringify(details, null, 2) : details}`
        : errorMsg;
      alert(fullMessage);
    }
  };

  const handleDelete = (stream) => {
    setStreamToDelete(stream);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (streamToDelete) {
      try {
        await api.delete(`/streams/${streamToDelete.id}`);
        fetchStreams();
        setDeleteConfirmOpen(false);
        setStreamToDelete(null);
      } catch (e) {
        console.error("Delete failed", e);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-12 space-y-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* Internal title removed to prevent duplication with global header */}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={clsx(
              "px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all italic font-mono flex items-center gap-2",
              theme === 'manager' || theme === 'flat'
                ? "bg-[var(--surface-bg)] text-[var(--muted-text)] hover:text-[var(--base-text)] rounded-lg shadow-sm"
                : "prism-card border-white/10 bg-white/5 text-slate-400 hover:text-white"
            )}
          >
            <Book className="w-4 h-4" />
            {showHelp ? 'Hide Docs' : 'Documentation'}
          </button>
          <button
            onClick={handleAdd}
            className={clsx(
              "px-10 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              theme === 'manager' || theme === 'flat'
                ? "bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-lg shadow-lg shadow-[var(--glow-color)]"
                : "bg-[var(--accent-primary)] hover:opacity-90 text-white prism-glow shadow-lg shadow-pink-500/20"
            )}
          >
            <Zap className="w-4 h-4" /> Assign Port
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={clsx(
              "p-8 rounded-[12px] border mb-8",
              theme === 'manager' ? "bg-slate-50 border-slate-200" : "prism-card bg-white/5 border-white/10"
            )}>
              <div className="prose prose-sm max-w-none">
                <h3 className={clsx("text-lg font-bold uppercase mb-4", theme === 'manager' ? "text-slate-900" : "text-white")}>
                  How to setup Port Forwarding
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold mb-2 text-[var(--accent-primary)]">1. Install Layer4 Module</h4>
                    <p className="mb-4 text-slate-400">
                      Standard Caddy does not support TCP/UDP streams. You must replace your `caddy` binary with one built using `xcaddy`.
                    </p>
                    <div className="bg-black/80 rounded p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                      <div className="opacity-50 mb-2"># 1. Install Go</div>
                      <div className="mb-2">sudo apt install golang-go</div>
                      <div className="opacity-50 mb-2"># 2. Install xcaddy</div>
                      <div className="mb-2">go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest</div>
                      <div className="opacity-50 mb-2"># 3. Build Caddy with Layer4</div>
                      <div className="mb-2">~/go/bin/xcaddy build --with github.com/mholt/caddy-l4</div>
                      <div className="opacity-50 mb-2"># 4. Replace binary</div>
                      <div className="mb-2">sudo mv caddy /usr/bin/caddy</div>
                      <div className="mb-2">sudo setcap cap_net_bind_service=+ep /usr/bin/caddy</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2 text-[var(--accent-primary)]">2. Create a Stream</h4>
                    <ul className="text-slate-400 space-y-2 list-disc pl-4">
                      <li><strong>Listen Port:</strong> The port on this server to accept connections (e.g., 2222).</li>
                      <li><strong>Upstream:</strong> The destination server IP and port (e.g., 10.0.0.5:22).</li>
                      <li><strong>Protocol:</strong> TCP (SSH, HTTP, MySQL) or UDP (Games, DNS).</li>
                    </ul>
                    <div className="mt-4 p-4 rounded bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
                      <p className="text-xs font-mono text-[var(--accent-primary)]">
                        <strong>Example (SSH):</strong> Listen 2222 → Forward to 127.0.0.1:22<br />
                        Usage: <code>ssh -p 2222 user@yourdomain.com</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streams List */}
      <div className="grid gap-8">
        {streams.length === 0 ? (
          <div className={clsx(
            "text-center py-20",
            theme === 'manager' ? "bg-white rounded-xl border border-slate-200" : "prism-card"
          )}>
            <Layers className="w-16 h-16 mx-auto mb-4 text-[var(--muted-text)] opacity-40" />
            <p className="text-[var(--muted-text)] font-mono text-sm">No port forwards configured</p>
          </div>
        ) : (
          streams.map(stream => (
            <div key={stream.id} className={clsx(
              "flex flex-col md:flex-row md:items-center justify-between group transition-all duration-700 space-y-6 md:space-y-0",
              theme === 'manager' ? "bg-white border border-slate-200 p-8 rounded-[12px] shadow-sm" : "prism-card p-10 bg-black/20"
            )}>
              <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                <div className={clsx(
                  "p-6 transition-all w-fit",
                  theme === 'manager' ? "bg-slate-50 rounded-2xl" : "bg-white/5 rounded-none"
                )}>
                  <Layers className="w-8 h-8 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h3 className={clsx(
                    "text-2xl font-black tracking-tighter font-mono uppercase italic",
                    theme === 'manager' ? "text-slate-900" : "text-white"
                  )}>
                    {stream.name}
                  </h3>
                  <div className="flex flex-col md:flex-row gap-2 md:gap-8 mt-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Listen: <span className="font-bold text-[var(--accent-primary)]">{stream.protocol.toUpperCase()}:{stream.listen_port}</span>
                    </span>
                    <span className="opacity-50 hidden md:inline">→</span>
                    <span className="text-slate-400">
                      Forward to: <span className="font-bold text-white">{stream.upstream_host}:{stream.upstream_port}</span>
                    </span>
                  </div>
                  <div className="flex gap-6 mt-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-2 h-2",
                        theme === 'manager' ? "rounded-full" : "rounded-none",
                        stream.status === 'active' ? "bg-[var(--accent-secondary)] shadow-[0_0_10px_var(--accent-secondary)]" : "bg-slate-900"
                      )} />
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.25em] font-mono">
                        {stream.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 md:opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handleEdit(stream)}
                  className={clsx(
                    "px-6 py-3 text-[9px] font-black uppercase tracking-widest transition-all italic font-mono",
                    theme === 'manager' || theme === 'flat'
                      ? "bg-[var(--surface-bg)] text-[var(--muted-text)] hover:text-[var(--base-text)] rounded-lg shadow-sm"
                      : "prism-card border-white/10 bg-white/5 text-slate-400 hover:text-white"
                  )}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(stream)}
                  className={clsx(
                    "px-6 py-3 text-[9px] font-black uppercase tracking-widest transition-all italic font-mono",
                    theme === 'manager' || theme === 'flat'
                      ? "bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg"
                      : "prism-card border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={clsx(
                "relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all duration-300",
                theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)]/95 backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl" : "prism-card bg-black/80 rounded-xl border border-white/10"
              )}
            >
              {/* Header */}
              <div className={clsx("flex justify-between items-center p-8 border-b z-10 relative", theme === 'manager' || theme === 'flat' ? "border-[var(--glass-border)]" : "border-white/5")}>
                <div>
                  <h3 className={clsx("text-2xl font-black tracking-tighter italic uppercase", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>
                    {editingStream ? 'Edit Port' : 'Assign Port'}
                  </h3>
                  <p className={clsx("text-xs font-mono mt-1 opacity-60", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>Configure your network orchestration settings.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className={clsx("p-2 rounded-full transition-colors", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)] hover:bg-[var(--base-bg)]" : "text-slate-400 hover:text-white")}><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {/* Tab Navigation */}
                <div className={clsx("flex items-center gap-2 p-1 rounded-xl mb-8 w-fit", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)]" : "bg-white/5 border border-white/5")}>
                  <button
                    onClick={() => setActiveTab('general')}
                    className={clsx(
                      "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
                      activeTab === 'general'
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : (theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)]" : "text-slate-500 hover:text-white")
                    )}
                  >
                    Vector Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={clsx(
                      "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
                      activeTab === 'security'
                        ? "bg-rose-500/20 text-rose-400 shadow-sm"
                        : (theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-rose-500" : "text-slate-500 hover:text-rose-400")
                    )}
                  >
                    Access Rules
                  </button>
                </div>

                <form className="space-y-8">
                  {activeTab === 'general' && (
                    <>
                      {/* Blueprint Selector */}
                      <div className="mb-10">
                        <label className={clsx("text-[10px] font-black uppercase tracking-[0.2em] block opacity-50 mb-4", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>Choose Stream Blueprint</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {STREAM_BLUEPRINTS.map((bp) => (
                            <button
                              key={bp.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, template: bp.id, protocol: bp.default_proto })}
                              className={clsx(
                                "p-4 text-left transition-all duration-300 group relative overflow-hidden flex flex-col justify-between h-28",
                                formData.template === bp.id
                                  ? "bg-white/10 border-[var(--accent-primary)] border-2 shadow-[0_0_20px_rgba(var(--accent-primary-rgb),0.2)]"
                                  : "bg-black/40 border-white/5 hover:border-white/20",
                                theme === 'manager' || theme === 'flat' ? "rounded-xl border" : "rounded-sm border"
                              )}
                            >
                              <div className="flex items-start justify-between relative z-10 w-full">
                                <div className={clsx(
                                  "p-2 rounded-lg transition-colors",
                                  formData.template === bp.id ? "bg-[var(--accent-primary)] text-white" : "bg-white/5 text-slate-500"
                                )}>
                                  <bp.icon className="w-5 h-5" />
                                </div>
                                {formData.template === bp.id && <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />}
                              </div>
                              <div className="relative z-10 mt-auto">
                                <p className={clsx("text-[8px] font-black tracking-widest uppercase mb-1", formData.template === bp.id ? "text-[var(--accent-primary)]" : "text-slate-500")}>{bp.subtitle}</p>
                                <p className={clsx("text-sm font-black tracking-tight", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>{bp.name}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <p className="mt-4 text-[10px] text-slate-500 font-mono italic">
                          {STREAM_BLUEPRINTS.find(b => b.id === formData.template)?.description}
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-text)]">Vector Handle (Name)</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={clsx(
                              "w-full px-6 py-4 font-mono text-sm outline-none transition-all",
                              theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-xl focus:border-[var(--accent-primary)] text-[var(--base-text)]" : "bg-black/40 border-white/10 text-white focus:border-[var(--accent-primary)]"
                            )}
                            placeholder="e.g. SSH Jumpbox"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-text)]">Listen Port</label>
                            <input
                              type="number"
                              value={formData.listen_port}
                              onChange={(e) => setFormData({ ...formData, listen_port: e.target.value })}
                              className={clsx(
                                "w-full px-6 py-4 font-mono text-sm outline-none transition-all",
                                theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-xl focus:border-[var(--accent-primary)] text-[var(--base-text)]" : "bg-black/40 border-white/10 text-white focus:border-[var(--accent-primary)]"
                              )}
                              placeholder="2222"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-text)]">Protocol</label>
                            <div className="flex gap-2">
                              {['tcp', 'udp'].map((p) => {
                                const protocols = formData.protocol.split(',');
                                const isActive = protocols.includes(p);
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => {
                                      let newProtocols;
                                      if (isActive) {
                                        if (protocols.length > 1) newProtocols = protocols.filter(v => v !== p);
                                        else return;
                                      } else {
                                        newProtocols = [...protocols, p];
                                      }
                                      setFormData({ ...formData, protocol: newProtocols.join(',') });
                                    }}
                                    className={clsx(
                                      "flex-1 py-4 font-mono text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                                      isActive ? "bg-[var(--accent-primary)] text-white shadow-lg" : "bg-white/5 text-slate-500"
                                    )}
                                  >
                                    {p}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-text)]">Upstream Host</label>
                            <input
                              type="text"
                              value={formData.upstream_host}
                              onChange={(e) => setFormData({ ...formData, upstream_host: e.target.value })}
                              className={clsx(
                                "w-full px-6 py-4 font-mono text-sm outline-none transition-all",
                                theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-xl focus:border-[var(--accent-secondary)] text-[var(--base-text)]" : "bg-black/40 border-white/10 text-white focus:border-[var(--accent-secondary)]"
                              )}
                              placeholder="127.0.0.1"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-text)]">Upstream Port</label>
                            <input
                              type="number"
                              value={formData.upstream_port}
                              onChange={(e) => setFormData({ ...formData, upstream_port: e.target.value })}
                              className={clsx(
                                "w-full px-6 py-4 font-mono text-sm outline-none transition-all",
                                theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-xl focus:border-[var(--accent-secondary)] text-[var(--base-text)]" : "bg-black/40 border-white/10 text-white focus:border-[var(--accent-secondary)]"
                              )}
                              placeholder="22"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-8">
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-5 h-5 text-rose-500" />
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Access Control</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed italic">
                          Blocked addresses will be rejected at the Layer 4 level. Whitelisting will drop all unlisted traffic.
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-text)]">Whitelist (Allowed) IP Addresses</label>
                          <textarea
                            placeholder="e.g. 192.168.1.0/24, 10.0.0.5"
                            rows={3}
                            value={formData.allowed_ips}
                            onChange={(e) => setFormData({ ...formData, allowed_ips: e.target.value })}
                            className={clsx(
                              "w-full px-6 py-4 font-mono text-xs outline-none transition-all",
                              theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-xl focus:border-[var(--accent-secondary)] text-[var(--base-text)]" : "bg-black/40 border-white/10 text-white focus:border-[var(--accent-secondary)]"
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-rose-500/60">Blacklist (Blocked) IP Addresses</label>
                          <textarea
                            placeholder="e.g. 1.1.1.1, 8.8.8.8"
                            rows={3}
                            value={formData.blocked_ips}
                            onChange={(e) => setFormData({ ...formData, blocked_ips: e.target.value })}
                            className={clsx(
                              "w-full px-6 py-4 font-mono text-xs outline-none transition-all",
                              theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-xl focus:border-rose-500/50 text-[var(--base-text)]" : "bg-black/40 border-white/10 text-white focus:border-rose-500/50"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className={clsx(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                        theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] text-[var(--muted-text)]" : "bg-white/5 text-slate-400"
                      )}
                    >
                      Cancel Vector
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className={clsx(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                        theme === 'manager' || theme === 'flat' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "bg-[var(--accent-primary)] text-white prism-glow shadow-lg shadow-pink-500/20"
                      )}
                    >
                      {editingStream ? 'Commit Vector' : 'Initialize Vector'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmOpen && streamToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={clsx(
                "relative w-full max-w-md p-10 shadow-2xl",
                theme === 'manager' ? "bg-white rounded-[12px]" : "prism-card bg-[#050507]"
              )}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={clsx(
                  "p-5 rounded-full",
                  theme === 'manager' ? "bg-rose-50" : "bg-[var(--accent-primary)]/10"
                )}>
                  <AlertTriangle className={clsx(
                    "w-12 h-12",
                    theme === 'manager' ? "text-rose-600" : "text-[var(--accent-primary)]"
                  )} />
                </div>
                <div className="space-y-3">
                  <h3 className={clsx(
                    "text-2xl font-black tracking-tighter italic uppercase",
                    theme === 'manager' ? "text-slate-900" : "text-white"
                  )}>
                    Delete Stream?
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Delete port forward <span className="font-bold text-white">{streamToDelete.name}</span>?
                  </p>
                </div>
                <div className="flex gap-4 w-full pt-4">
                  <button
                    onClick={() => setDeleteConfirmOpen(false)}
                    className={clsx(
                      "flex-1 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all italic font-mono",
                      theme === 'manager'
                        ? "bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-lg"
                        : "prism-card border-white/10 bg-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className={clsx(
                      "flex-1 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all italic font-mono",
                      theme === 'manager'
                        ? "bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-lg"
                        : "prism-card border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20"
                    )}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div >
  );
};

const Servers = () => {
  return (
    <div className="text-center py-32 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[3rem] group hover:border-indigo-500/20 transition-all duration-700">
      <div className="w-24 h-24 bg-indigo-500/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all">
        <Server className="w-10 h-10 text-indigo-500 opacity-40 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic opacity-40 group-hover:opacity-100 transition-opacity">WebUI Nodes</h3>
      <p className="text-slate-400 mt-3 text-xs font-bold uppercase tracking-[0.2em] max-w-xs mx-auto">Clustering and multi-node orchestration is Coming Soon to the Caddyserver WebUI</p>
    </div>
  )
}

const CaddyfileEditor = ({ theme }) => {
  const templates = {
    'default': ':8080 {\n\treverse_proxy localhost:4000\n}',
    'load_balancer': ':8080 {\n\treverse_proxy /service/* {\n\t\tto 10.0.1.1:80 10.0.1.2:80 10.0.1.3:80\n\t\tlb_policy least_conn\n\t\tlb_try_duration 10s\n\t\tfail_duration 5s\n\t}\n}',
    'php_fastcgi': ':8080 {\n\troot * /var/www/wordpress\n\tphp_fastcgi localhost:9000\n\tfile_server\n}',
    'static_site': ':8080 {\n\troot * /var/www\n\tencode zstd gzip\n\tfile_server browse\n}',
    'custom_pki': '{\n\tadmin localhost:2019\n\tauto_https off\n}\n\n:8080 {\n\trespond "PKI Example - Configure in production"\n}',
    'security_headers': ':80 {\n\theader {\n\t\t# disable FLoC tracking\n\t\tPermissions-Policy interest-cohort=()\n\t\t# enable HSTS\n\t\tStrict-Transport-Security "max-age=31536000; includeSubDomains; preload"\n\t\t# disable clients from sniffing the media type\n\t\tX-Content-Type-Options nosniff\n\t\t# clickjacking protection\n\t\tX-Frame-Options DENY\n\t\t# keep referrer info if same-origin\n\t\tReferrer-Policy no-referrer-when-downgrade\n\t}\n\treverse_proxy localhost:8080\n}',
    'cors_proxy': ':80 {\n\t@origin header Origin http://example.com\n\theader @origin Access-Control-Allow-Origin "http://example.com"\n\theader @origin Access-Control-Allow-Methods "GET, POST, OPTIONS"\n\t\n\treverse_proxy localhost:8080\n}',
    'wildcard_ssl': '*.example.com {\n\ttls admin@example.com {\n\t\tdns cloudflare {env.CLOUDFLARE_API_TOKEN}\n\t}\n\t\n\t@sub1 host sub1.example.com\n\treverse_proxy @sub1 localhost:8081\n\t\n\t@sub2 host sub2.example.com\n\treverse_proxy @sub2 localhost:8082\n}'
  };
  const [code, setCode] = useState('');
  const [json, setJson] = useState(null);
  const [runningJson, setRunningJson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Load saved Caddyfile on mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const res = await api.get('/caddy/caddyfile');
        if (res.data.content && res.data.content.trim()) {
          setCode(res.data.content);
        } else {
          setCode(templates.default);
        }
      } catch (e) {
        console.log('No saved Caddyfile found, using default');
        setCode(templates.default);
      } finally {
        setInitialLoading(false);
      }
    };
    loadSaved();
  }, [api]);

  const adapt = async () => {
    setLoading(true);
    try {
      const res = await api.post('/caddy/adapt', { caddyfile: code });
      setJson(res.data);
      setMessage('✓ Translated successfully');
    } catch (e) {
      setMessage('✗ Translation failed: ' + (e.response?.data?.details || e.message));
    } finally {
      setLoading(false);
    }
  };

  const format = async () => {
    setLoading(true);
    try {
      const res = await api.post('/caddy/format', { caddyfile: code });
      setCode(res.data.formatted);
      setMessage('✨ Formatted correctly');
    } catch (e) {
      setMessage('✗ Format failed: ' + (e.response?.data?.details || e.message));
    } finally {
      setLoading(false);
    }
  };

  const validate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/caddy/validate', { caddyfile: code });
      if (res.data.valid) {
        setMessage('✅ Caddyfile is valid');
      } else {
        setMessage('❌ Invalid: ' + res.data.details);
      }
    } catch (e) {
      setMessage('✗ Validation failed: ' + (e.response?.data?.details || e.message));
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!json) return;
    setLoading(true);
    try {
      const config = json.result || json;
      await api.post('/caddy/load', { config });
      setMessage('🚀 Applied successfully!');
    } catch (e) {
      setMessage('✗ Applied failed: ' + (e.response?.data?.details || e.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchRunningConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/caddy/config');
      setRunningJson(res.data);
      if (!showDiff) setJson(res.data);
      setMessage('📋 Loaded running configuration');
    } catch (e) {
      setMessage('✗ Failed to fetch running config');
    } finally {
      setLoading(false);
    }
  };

  const clearCode = () => {
    if (window.confirm('Clear all code in the editor?')) {
      setCode('');
      setJson(null);
    }
  };

  const saveToDisk = async () => {
    setLoading(true);
    try {
      await api.post('/caddy/save', { caddyfile: code });
      setMessage('💾 Saved to disk! Changes will persist across restarts.');
    } catch (e) {
      setMessage('✗ Save failed: ' + (e.response?.data?.details || e.message));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  const editorLayout = (
    <div className={clsx(
      "grid grid-cols-1 gap-10 items-start flex-1",
      isFullScreen ? "h-[calc(100vh-200px)]" : "h-[700px]",
      !showDiff ? "lg:grid-cols-2" : "lg:grid-cols-3"
    )}>
      {/* Editor Panel */}
      <div className="flex flex-col prism-card h-full relative overflow-hidden bg-[var(--base-bg)]/40">
        <div className={clsx("p-6 border-b flex justify-between items-center relative z-10", theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border-[var(--glass-border)]" : "bg-white/5 border-white/5")}>
          <div className="flex items-center gap-3">
            <div className={clsx("p-2 border", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border-[var(--accent-primary)]/30 text-[var(--accent-primary)]" : "prism-card border-[var(--accent-primary)]/30 text-[var(--accent-primary)] bg-[var(--accent-primary)]/5")}>
              <Terminal className="w-5 h-5" />
            </div>
            <span className={clsx("text-xs font-bold uppercase tracking-widest", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>Source Script</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={clsx(
                "p-2 rounded-lg transition-all",
                isFullScreen
                  ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                  : (theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)]" : "text-slate-400 hover:text-white")
              )}
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <X className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
            </button>
            <div className="w-px h-3 bg-white/10 mx-1" />
            <button
              onClick={fetchRunningConfig}
              className={clsx("text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--accent-secondary)]" : "text-slate-400 hover:text-[var(--accent-secondary)]")}
              title="Pull currently running JSON config into the preview panel"
            >
              <RefreshCw className="w-3 h-3" />
              Pull Running
            </button>
            <div className={clsx("w-px h-3 mx-1", theme === 'manager' || theme === 'flat' ? "bg-slate-200" : "bg-white/10")} />
            <button
              onClick={clearCode}
              className={clsx("text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-red-500" : "text-slate-400 hover:text-red-400")}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-[var(--base-bg)]">
          <Editor
            value={code}
            onValueChange={code => setCode(code)}
            highlight={code => highlight(code, languages.caddyfile)}
            padding={20}
            style={{
              fontFamily: '"Fira Code", monospace',
              fontSize: 14,
              lineHeight: 1.6,
              minHeight: '100%'
            }}
            className="outline-none text-[var(--base-text)] caret-[var(--accent-primary)]"
          />
        </div>
        <div className={clsx("p-6 border-t flex items-center justify-between", theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border-[var(--glass-border)]" : "bg-white/5 border-white/5")}>
          <span className={clsx("text-[10px] font-bold uppercase tracking-widest", message.includes('✗') ? "text-red-500" : (theme === 'manager' || theme === 'flat' ? "text-[var(--accent-primary)]" : "text-[var(--accent-secondary)]"))}>
            {message || 'Ready for processing...'}
          </span>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <button
              disabled={loading}
              onClick={format}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all rounded"
            >
              <Zap className="w-3.5 h-3.5" />
              Format
            </button>
            <button
              disabled={loading}
              onClick={validate}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all rounded"
            >
              <Shield className="w-3.5 h-3.5" />
              Validate
            </button>
            <button
              disabled={loading}
              onClick={saveToDisk}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all rounded"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              disabled={loading}
              onClick={adapt}
              className="bg-[var(--accent-secondary)] hover:opacity-90 text-[var(--base-bg)] px-5 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all rounded"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Translate
            </button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex flex-col prism-card h-full relative overflow-hidden bg-[var(--base-bg)]/40">
        <div className={clsx("p-6 border-b flex justify-between items-center relative z-10", theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border-[var(--glass-border)]" : "bg-white/5 border-white/5")}>
          <div className="flex items-center gap-3">
            <div className={clsx("p-2 border", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)]" : "prism-card border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/5")}>
              <FileCode className="w-5 h-5" />
            </div>
            <span className={clsx("text-xs font-bold uppercase tracking-widest", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>JSON Result</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!runningJson) fetchRunningConfig();
                setShowDiff(!showDiff);
              }}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                showDiff
                  ? "bg-cyan-500 text-white border-cyan-500"
                  : (theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)] border-[var(--glass-border)] hover:border-cyan-500/30" : "bg-white/5 text-slate-400 border-white/10 hover:border-cyan-500/30")
              )}
            >
              {showDiff ? "Hide Comparison" : "Compare with Running"}
            </button>
            {json && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(json, null, 2));
                  setMessage('📋 JSON copied to clipboard');
                }}
                className={clsx("p-2 rounded-lg transition-all border", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--muted-text)] border-[var(--glass-border)] hover:text-[var(--base-text)]" : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/5")}
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button
              disabled={!json || loading}
              onClick={apply}
              className="bg-[var(--accent-secondary)] hover:opacity-90 px-6 py-2.5 flex items-center gap-3 shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:shadow-none text-[var(--base-bg)] text-[10px] font-black uppercase tracking-widest transition-all rounded-lg"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Apply Config
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 bg-[var(--base-bg)] font-mono text-xs custom-scrollbar">
          {json ? (
            <pre className="text-[var(--accent-secondary)] whitespace-pre-wrap leading-relaxed">{JSON.stringify(json, null, 2)}</pre>
          ) : (
            <div className={clsx("h-full flex flex-col items-center justify-center gap-6", theme === 'manager' || theme === 'flat' ? "text-slate-300" : "text-slate-700")}>
              <Terminal className="w-16 h-16 opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting adaptation signal...</p>
            </div>
          )}
        </div>
      </div>

      {/* Running Config Panel (Only in Diff Mode) */}
      {showDiff && (
        <div className={clsx("flex flex-col prism-card h-full relative overflow-hidden border-l-2", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border-[var(--accent-primary)]/30" : "bg-black/40 border-cyan-500/30")}>
          <div className={clsx("p-6 border-b flex flex-col items-center relative z-10", theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border-[var(--glass-border)]" : "bg-white/5 border-white/5")}>
            <div className="flex items-center gap-3 w-full">
              <div className={clsx("p-2 border", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border-slate-500/30 text-[var(--muted-text)]" : "prism-card border-slate-500/30 text-slate-400 bg-white/5")}>
                <Cpu className="w-5 h-5" />
              </div>
              <span className={clsx("text-xs font-bold uppercase tracking-widest italic", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400 italic")}>Running Config (Live)</span>
            </div>
          </div>
          <div className={clsx("flex-1 overflow-auto p-8 font-mono text-xs custom-scrollbar", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)]" : "bg-black/60")}>
            {runningJson ? (
              <pre className={clsx("whitespace-pre-wrap leading-relaxed", theme === 'manager' || theme === 'flat' ? "text-slate-500" : "text-slate-500")}>{JSON.stringify(runningJson, null, 2)}</pre>
            ) : (
              <div className={clsx("h-full flex flex-col items-center justify-center gap-6", theme === 'manager' || theme === 'flat' ? "text-slate-300" : "text-slate-800")}>
                <RefreshCw className="w-12 h-12 opacity-10 animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Syncing with engine...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-[var(--base-bg)] p-8 flex flex-col gap-6"
          >
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-lg">
                  <FileCode className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Full Screen Editor</h3>
              </div>
              <button
                onClick={() => setIsFullScreen(false)}
                className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {editorLayout}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isFullScreen && (
        <>
          <div className="flex items-center gap-6 mb-2">
            <div className={clsx("p-4 rounded-xl", theme === 'manager' ? "bg-cyan-50 text-cyan-600" : "bg-[var(--accent-primary)]/5 text-[var(--accent-primary)]")}>
              <FileCode className="w-8 h-8" />
            </div>
            <div>
              <h3 className={clsx("text-3xl font-black uppercase tracking-tighter", theme === 'manager' ? "text-slate-900" : "text-white")}>Caddyfile Engine</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Protocol Translation & Configuration Sync</p>
            </div>
          </div>
          <div className="px-10 py-8 prism-card border-cyan-500/10 bg-cyan-500/5 relative overflow-hidden group">
            <div className="flex gap-10 items-start relative z-10">
              <div className="p-4 prism-card border-cyan-500/30 text-cyan-400 bg-cyan-500/10 shrink-0">
                <FileCode className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] italic">Code Translation: The Blueprint & Inspector</p>
                <p className="text-[12px] text-slate-400 leading-relaxed font-medium tracking-wide">
                  Think of the Caddyfile as your <span className="text-white">Ship's Blueprint</span>. You write down exactly how the deck should be laid out. The "Validator" acts as a <span className="text-cyan-400">Safety Inspector</span>—it checks your blueprint for mistakes before you're allowed to start the construction.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 p-1 sidebar-scroll">
            {Object.entries(templates).map(([name, content]) => (
              <button
                key={name}
                onClick={() => setCode(content)}
                className={clsx(
                  "px-5 py-3 rounded-xl text-[10px] uppercase font-black tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-3 group relative overflow-hidden",
                  code === content ? "bg-[var(--accent-primary)] text-[var(--base-bg)] shadow-[0_0_20px_rgba(255,0,127,0.3)]" : "bg-white/5 text-slate-400 border border-white/5 hover:border-[var(--accent-primary)]/30 hover:text-white"
                )}
              >
                <span>{name.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
          {editorLayout}
          <div className="prism-card border-yellow-500/20 bg-yellow-500/5 p-8 flex gap-8 items-center">
            <div className="p-4 prism-card border-yellow-500/30 text-[var(--accent-tertiary)] bg-yellow-500/10">
              <ShieldAlert className="w-6 h-6 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-[var(--accent-tertiary)] uppercase tracking-[0.3em] mb-2">State Replacement Protocol</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em] leading-relaxed max-w-3xl">
                Applying this configuration will hyper-replace the current runtime engine state. Ensure all Administrative PKI paths remain valid or local endpoint severance may occur.
              </p>
            </div>
          </div>

          {message.toUpperCase().includes('MISSING CADDY MODULE') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="prism-card border-cyan-500/20 bg-cyan-500/5 p-8 flex gap-8 items-start relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-32 h-32 text-cyan-500 rotate-12" />
              </div>
              <div className="p-4 prism-card border-cyan-500/30 text-cyan-400 bg-cyan-500/10 relative z-10">
                <Zap className="w-6 h-6 shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              </div>
              <div className="flex-1 relative z-10">
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-4">Caddy Module Installation Guide</p>
                <div className="space-y-4 max-w-3xl">
                  <p className="text-[11px] text-slate-300 font-medium uppercase tracking-[0.15em] leading-relaxed">
                    The current Caddy binary lacks requested modules. Follow these steps to resolve:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-cyan-500/50 uppercase tracking-widest">Step 01</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest">
                        Go to <a href="https://caddyserver.com/download" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">caddyserver.com/download</a>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-cyan-500/50 uppercase tracking-widest">Step 02</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest">
                        Search and select <span className="text-white font-bold">dns.providers.cloudflare</span> (or other missing module)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-cyan-500/50 uppercase tracking-widest">Step 03</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest">
                        Download and replace <code className="text-violet-400 px-1 bg-white/5 rounded">/usr/bin/caddy</code> using <code className="text-violet-400 px-1 bg-white/5 rounded">sudo cp</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};
;

const ConfigExplorer = ({ theme }) => {
  const [config, setConfig] = useState(null);
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchConfig = async (subPath = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/caddy/config/${subPath}`);
      setConfig(res.data);
      setPath(subPath);
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleUpdate = async (fullPath, value) => {
    try {
      // Caddy PATCH expects the value directly or an object.
      // For leaf nodes, we can use POST/PUT/PATCH depending on the path.
      // Generic approach: PATCH the path with new value.
      let finalValue = value;
      try { finalValue = JSON.parse(value); } catch (e) { } // Try to parse if it's JSON

      await api({
        method: 'PATCH',
        url: `/caddy/config/${fullPath}`,
        data: finalValue
      });
      fetchConfig(path);
    } catch (e) {
      console.error("Update failed", e);
      alert("PATCH failed: " + (e.response?.data?.details || e.message));
    }
  };

  const handleDelete = async (fullPath) => {
    if (window.confirm(`SEVER STATE: Delete node at ${fullPath}?`)) {
      try {
        await api.delete(`/caddy/config/${fullPath}`);
        fetchConfig(path);
      } catch (e) {
        console.error("Delete failed", e);
        alert("DELETE failed: " + (e.response?.data?.details || e.message));
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className={clsx("prism-card overflow-hidden", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border-[var(--glass-border)]" : "bg-[var(--base-bg)]/40")}>
        <div className={clsx("p-8 border-b flex items-center gap-10", theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border-[var(--glass-border)]" : "bg-white/5 border-white/5")}>
          <div className="flex items-center gap-6 flex-1">
            <p className={clsx("text-xs font-bold uppercase tracking-widest whitespace-nowrap", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>Config Path:</p>
            <div className={clsx("flex-1 flex items-center border rounded-lg px-6 py-3 transition-all", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border-[var(--glass-border)] focus-within:border-[var(--accent-primary)]" : "bg-black/40 border-white/10 focus-within:border-[var(--accent-secondary)]")}>
              {path && (
                <button
                  onClick={() => {
                    const parts = path.split('/').filter(Boolean);
                    parts.pop();
                    const newPath = parts.join('/');
                    fetchConfig(newPath);
                  }}
                  className={clsx("mr-3 p-1.5 rounded transition-all", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] hover:text-[var(--base-text)] hover:bg-[var(--surface-bg)]" : "text-slate-400 hover:text-white hover:bg-white/5")}
                  title="Go up one level"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
              <span className={clsx("font-mono text-xs mr-2 select-none", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>/config/</span>
              <input
                value={path}
                onChange={e => setPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchConfig(path)}
                className={clsx("bg-transparent text-sm font-mono flex-1 outline-none", theme === 'manager' || theme === 'flat' ? "text-[var(--accent-primary)]" : "text-[var(--accent-secondary)]")}
                placeholder="apps/http/servers/srv0..."
              />
              <button onClick={() => fetchConfig(path)} className={clsx("ml-4 p-2 rounded-full transition-all", theme === 'manager' || theme === 'flat' ? "text-[var(--accent-primary)] hover:bg-[var(--surface-bg)]" : "text-[var(--accent-secondary)] hover:bg-white/5")}>
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-10 min-h-[500px]">
          {loading ? (
            <div className="py-32 flex justify-center">
              <RefreshCw className="w-12 h-12 animate-spin text-[var(--accent-secondary)] opacity-20" />
            </div>
          ) : (
            <JsonTree
              data={config}
              onNavigate={fetchConfig}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              currentPath={path}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

const JsonTree = ({ data, onNavigate, onDelete, onUpdate, currentPath = '', level = 0 }) => {
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');

  if (data === null || typeof data !== 'object') {
    const isEditing = editingKey === '___value___';
    return (
      <div className="flex items-center gap-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdate(currentPath, editValue); setEditingKey(null); }
                if (e.key === 'Escape') setEditingKey(null);
              }}
              className="bg-[var(--base-bg)] border-2 border-[var(--accent-secondary)] text-[var(--accent-secondary)] px-2 py-0.5 outline-none font-mono text-xs rounded"
            />
            <button onClick={() => { onUpdate(currentPath, editValue); setEditingKey(null); }} className="text-emerald-500 p-1">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-[var(--accent-secondary)] font-mono text-sm py-0.5 opacity-80">{JSON.stringify(data)}</span>
            <button
              onClick={() => { setEditingKey('___value___'); setEditValue(String(data)); }}
              className="opacity-0 group-hover/node:opacity-100 p-1 text-[var(--accent-secondary)] transition-opacity"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  const isArray = Array.isArray(data);

  return (
    <div className={clsx("space-y-2 font-mono text-xs", level > 0 && "pl-8 border-l-2 border-white/5 ml-2 pb-1 mt-2")}>
      {Object.entries(data).map(([key, value]) => {
        const isExpandable = value !== null && typeof value === 'object';
        const nodePath = currentPath ? `${currentPath}/${key}` : key;
        return (
          <div key={key} className="group/node">
            <div className="flex items-center gap-4 py-1.5 px-3 rounded-md hover:bg-white/5 transition-all">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider w-32 shrink-0">
                {isArray ? `[${key}]` : key}
              </span>

              <div className="flex-1 min-w-0">
                {!isExpandable ? (
                  <JsonTree data={value} onUpdate={onUpdate} currentPath={nodePath} />
                ) : (
                  <button
                    onClick={() => onNavigate(nodePath)}
                    className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 px-3 py-1 rounded border border-[var(--accent-secondary)]/20 flex items-center gap-2"
                  >
                    Explore Node <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isExpandable && (
                <button
                  onClick={() => onDelete(nodePath)}
                  className="opacity-0 group-hover/node:opacity-100 p-1.5 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {isExpandable && (
              <JsonTree
                data={value}
                level={level + 1}
                onNavigate={onNavigate}
                onUpdate={onUpdate}
                onDelete={onDelete}
                currentPath={nodePath}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};;

const Upstreams = ({ theme }) => {
  const [upstreams, setUpstreams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUpstreams = async () => {
    try {
      const res = await api.get('/caddy/upstreams');
      const formatted = res.data.map((u, i) => ({
        url: u.address,
        requests: u.num_requests,
        fails: u.fails,
        p95: 'N/A'
      }));
      setUpstreams(formatted);
    } catch (e) {
      console.error("Upstream fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpstreams();
    const interval = setInterval(fetchUpstreams, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <div className={clsx("p-4 rounded-xl", theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] text-[var(--accent-secondary)]" : "bg-white/5 text-[var(--accent-secondary)]")}>
            <CaddyLogo className="w-8 h-8" glow={theme === 'prism'} />
          </div>
          <div>
            <h3 className={clsx("text-3xl font-black uppercase tracking-tighter", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>Backbone Monitor</h3>
            <p className={clsx("text-sm font-bold uppercase tracking-widest", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>Real-time Traffic Vector Analysis</p>
          </div>
        </div>

        {upstreams.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-700/30 rounded-2xl">
            <CaddyLogo className="w-12 h-12 mx-auto mb-4 opacity-50 grayscale" />
            <p className="text-slate-400 font-bold uppercase tracking-widest">No Active Upstreams Detected</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upstreams.map((up, i) => (
              <div key={i} className={clsx(
                "p-6 relative overflow-hidden group transition-all",
                theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card bg-black/40"
              )}>
                <div className="flex justify-between items-start mb-6">
                  <span className={clsx("text-xs font-black uppercase px-2 py-1 rounded", theme === 'manager' ? "bg-slate-100 text-slate-400" : "bg-white/10 text-slate-400")}>
                    TCP/IP
                  </span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                <h4 className={clsx("text-xl font-black font-mono truncate mb-8", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>
                  {up.url}
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className={clsx("p-4 rounded-lg", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)]" : "bg-white/5")}>
                    <div className="text-[10px] font-black uppercase text-[var(--muted-text)] mb-1">Active Flows</div>
                    <div className={clsx("text-2xl font-black tabular-nums", theme === 'manager' || theme === 'flat' ? "text-[var(--accent-primary)]" : "text-[var(--accent-secondary)]")}>
                      {up.requests}
                    </div>
                  </div>
                  <div className={clsx("p-4 rounded-lg", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)]" : "bg-white/5")}>
                    <div className="text-[10px] font-black uppercase text-[var(--muted-text)] mb-1">Failed Handshakes</div>
                    <div className={clsx("text-2xl font-black tabular-nums", theme === 'manager' || theme === 'flat' ? "text-rose-500" : "text-[var(--accent-primary)]")}>
                      {up.fails}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};



const TLSManager = ({ theme }) => {
  const [authorities, setAuthorities] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCA, setViewingCA] = useState(null);
  const [editingCA, setEditingCA] = useState(null);
  const [newCA, setNewCA] = useState({ id: '', name: '' });

  const fetchPKI = async () => {
    try {
      const res = await api.get('/caddy/pki/ca');
      setAuthorities(res.data || {});
    } catch (e) {
      console.error("PKI fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPKI();
  }, []);

  const handleOpenModal = (ca = null) => {
    if (ca) {
      setEditingCA(ca);
      setNewCA({ id: ca.id, name: ca.root_common_name || ca.name || '' });
    } else {
      setEditingCA(null);
      setNewCA({ id: '', name: '' });
    }
    setIsModalOpen(true);
  };

  const handleInitCA = async (e) => {
    e.preventDefault();
    try {
      if (editingCA) {
        await api.patch(`/caddy/config/apps/pki/certificate_authorities/${newCA.id}/root_common_name`, newCA.name, {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        await api.post(`/caddy/config/apps/pki/certificate_authorities/${newCA.id}`, { root_common_name: newCA.name });
      }
      fetchPKI();
      setIsModalOpen(false);
      setNewCA({ id: '', name: '' });
      setEditingCA(null);
    } catch (e) {
      console.error("CA Init failed", e);
      alert("Failed to manage CA: " + (e.response?.data?.details || e.message));
    }
  };

  const handleDeleteCA = async (id) => {
    if (window.confirm(`Delete Security Authority [${id}]? This might stop security for some of your sites.`)) {
      try {
        await api.delete(`/caddy/config/apps/pki/certificate_authorities/${id}`);
        fetchPKI();
      } catch (e) {
        console.error("CA Delete failed", e);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <div className="prism-card relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent pointer-events-none" />
        <div className="p-10 bg-white/5 border-b border-white/5 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-6">
            <div className="p-4 prism-card border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 text-[var(--accent-primary)]">
              <Shield className="w-8 h-8 shadow-[0_0_15px_var(--accent-primary)]" />
            </div>
            <div>
              {/* Internal title removed to prevent duplication with global header */}
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className={clsx(
              "px-10 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
              theme === 'manager' || theme === 'flat' ? "bg-[var(--accent-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--glow-color)]" : "bg-[var(--accent-primary)] hover:opacity-90 text-white prism-glow shadow-lg shadow-pink-500/20"
            )}
          >
            Initialize CA
          </button>
        </div>

        {/* Security Nucleus Guide */}
        <div className="px-10 py-6 border-b border-white/5 bg-indigo-500/5">
          <div className="flex gap-6 items-start">
            <div className="p-3 prism-card border-indigo-500/30 text-indigo-400 bg-indigo-500/10 shrink-0">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] italic">Trust Headquarters: Passport Control</p>
              <p className="text-[12px] text-slate-400 leading-relaxed font-medium tracking-wide">
                Think of the Security Nucleus as <span className="text-white">Passport Control</span>. For internal sites (like <code className="text-pink-400">site.local</code>), Caddy acts as the government, issuing digital "passports" (Certificates) so your browser knows the destination is safe and verified.
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 relative z-10">
          {Object.keys(authorities).length > 0 ? (
            <div className="grid gap-6">
              {Object.entries(authorities).map(([id, data]) => (
                <div key={id} className={clsx(
                  "p-8 transition-all duration-500 flex items-center justify-between group",
                  theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card border-white/5 bg-black/20"
                )}>
                  <div className="flex items-center gap-10">
                    <div className={clsx(
                      "w-20 h-20 flex items-center justify-center text-2xl font-black uppercase transition-transform italic",
                      theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] text-[var(--muted-text)] rounded-lg" : "prism-card border-white/10 bg-white/5 text-[var(--accent-primary)] group-hover:scale-105"
                    )}>{id.charAt(0)}</div>
                    <div>
                      <h5 className="text-2xl font-black tracking-tight italic uppercase text-[var(--base-text)]">{data.root_common_name || data.name || id}</h5>
                      <div className="flex items-center gap-6 mt-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] font-mono">NODE_ID: {id}</span>
                        <div className="w-1.5 h-1.5 bg-pink-500/20" />
                        <span className="text-[10px] text-[var(--accent-secondary)] uppercase font-black tracking-[0.2em] font-mono italic">CRYPT_SIGNED_X509</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => setViewingCA({ id, ...data })}
                      className={clsx(
                        "px-6 py-2 text-[9px] font-black uppercase tracking-widest transition-all font-mono",
                        theme === 'manager' ? "bg-slate-50 text-slate-400 hover:bg-slate-100 rounded" : "prism-card border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      VIEW_CERT
                    </button>
                    <button
                      onClick={() => handleOpenModal({ id, ...data })}
                      className={clsx(
                        "px-6 py-2 text-[9px] font-black uppercase tracking-widest transition-all font-mono",
                        theme === 'manager' ? "bg-slate-100 text-slate-400 hover:bg-slate-200 rounded" : "prism-card border-white/10 text-slate-400 hover:text-[var(--accent-secondary)]"
                      )}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDeleteCA(id)}
                      className={clsx(
                        "p-3 transition-all",
                        theme === 'manager' ? "bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg" : "prism-card border-white/5 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 text-slate-700 hover:text-[var(--accent-primary)]"
                      )}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-black/40 prism-card border-dashed border-white/10">
              <ShieldAlert className="w-20 h-20 mx-auto text-pink-500 opacity-10 mb-8 animate-pulse" />
              <p className="text-slate-700 font-black uppercase tracking-[0.4em] text-xs font-mono">No active cryptographic authorities detected</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={theme === 'horizon' ? { y: 100, opacity: 0 } : { scale: 0.9, opacity: 0 }}
              animate={theme === 'horizon' ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={theme === 'horizon' ? { y: 100, opacity: 0 } : { scale: 0.9, opacity: 0 }}
              className={clsx(
                "relative w-full max-w-lg p-10 shadow-2xl transition-all duration-500",
                theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] rounded-[var(--rounding)] border border-[var(--glass-border)]" : "prism-card bg-[#050507]"
              )}
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className={clsx(
                  "text-2xl font-black tracking-tighter italic uppercase",
                  theme === 'manager' ? "text-[var(--base-text)]" : "text-[var(--base-text)]"
                )}>{editingCA ? 'Edit Security Authority' : 'Add Security Authority'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleInitCA} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em]">Authority ID (Unique)</label>
                  <input
                    required
                    disabled={!!editingCA}
                    value={newCA.id}
                    onChange={e => setNewCA({ ...newCA, id: e.target.value })}
                    placeholder="e.g. local_root"
                    className={clsx(
                      "w-full p-4 font-mono outline-none transition-all",
                      theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] text-[var(--base-text)] focus:border-[var(--accent-primary)] rounded-lg" : "bg-black/40 border border-white/10 text-[var(--base-text)] focus:border-[var(--accent-primary)]",
                      editingCA && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em]">Public Label</label>
                  <input
                    required
                    value={newCA.name}
                    onChange={e => setNewCA({ ...newCA, name: e.target.value })}
                    placeholder="e.g. My Organization CA"
                    className={clsx(
                      "w-full p-4 font-mono outline-none transition-all",
                      theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] text-[var(--base-text)] focus:border-[var(--accent-primary)] rounded-lg" : "bg-black/40 border border-white/10 text-[var(--base-text)] focus:border-[var(--accent-secondary)]"
                    )}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className={clsx(
                      "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg",
                      theme === 'manager' || theme === 'flat' ? "bg-[var(--accent-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--glow-color)]" : "bg-[var(--accent-primary)] hover:opacity-90 text-white prism-glow shadow-lg shadow-pink-500/20"
                    )}
                  >
                    {editingCA ? 'Save Changes' : 'Start Security'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={clsx(
                      "px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                      theme === 'manager' ? "bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-lg" : "bg-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {viewingCA && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingCA(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div className={clsx(
              "relative w-full max-w-2xl p-10 shadow-2xl overflow-hidden",
              theme === 'manager' ? "bg-white rounded-[12px] border border-slate-200" : "prism-card bg-[#050507]"
            )}>
              <div className="flex justify-between items-center mb-10 border-b border-black/5 pb-6">
                <div>
                  <h3 className={clsx("text-2xl font-black tracking-tighter uppercase italic", theme === 'manager' ? "text-slate-900" : "text-white")}>Certificate Metadata</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authority ID: {viewingCA.id}</p>
                </div>
                <button onClick={() => setViewingCA(null)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-8 h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Root Common Name</h4>
                  <div className="p-4 bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded font-mono text-[11px] text-[var(--base-text)]">{viewingCA.root_common_name}</div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Root Certificate (PEM)</h4>
                  <pre className="p-4 bg-[var(--base-bg)] border border-[var(--glass-border)] rounded font-mono text-[10px] text-[var(--base-text)] overflow-x-auto whitespace-pre-wrap leading-relaxed">{viewingCA.root_certificate}</pre>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Intermediate Common Name</h4>
                  <div className="p-4 bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded font-mono text-[11px] text-[var(--base-text)]">{viewingCA.intermediate_common_name}</div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Intermediate Certificate (PEM)</h4>
                  <pre className="p-4 bg-[var(--base-bg)] border border-[var(--glass-border)] rounded font-mono text-[10px] text-[var(--base-text)] overflow-x-auto whitespace-pre-wrap leading-relaxed">{viewingCA.intermediate_certificate}</pre>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="prism-card p-10 relative group hover:prism-border-cyan transition-all overflow-hidden bg-black/20">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            <Globe className="w-48 h-48 text-[var(--accent-secondary)]" />
          </div>
          <h4 className="text-xl font-black text-white mb-6 flex items-center gap-4 italic">
            <div className="p-3 prism-card border-cyan-500/30 bg-cyan-500/5 text-[var(--accent-secondary)]">
              <Globe className="w-6 h-6 shadow-[0_0_10px_var(--accent-secondary)]" />
            </div>
            Automatic HTTPS Control
          </h4>
          <p className="text-[10px] text-slate-400 font-black leading-relaxed uppercase tracking-[0.2em] opacity-80 mb-8 max-w-lg italic font-mono">
            Engine employs Caddy's world-class automated certificate suite, provisioning SSL/TLS natively through ZeroSSL or Cloudflare without interaction.
          </p>
          <div className="flex gap-4">
            <span className="px-5 py-2 prism-card border-cyan-500/20 bg-cyan-500/5 text-[var(--accent-secondary)] text-[10px] font-black uppercase tracking-widest prism-glow font-mono">OCSP_STAPLED</span>
            <span className="px-5 py-2 prism-card border-cyan-500/20 bg-cyan-500/5 text-[var(--accent-secondary)] text-[10px] font-black uppercase tracking-widest prism-glow font-mono">AUTO_RENEW</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Logs = ({ theme }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/caddy/logs');
        setLogs(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={clsx(
      "flex flex-col h-[750px] relative overflow-hidden group",
      theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "bg-black/60 prism-card"
    )}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/30 to-transparent z-20" />
      <div className="p-8 bg-white/5 border-b border-white/5 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-5">
          <div className="p-3 prism-card border-white/10 bg-white/5 text-[var(--accent-primary)]">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em] font-mono italic">Live Stream</h4>
            <p className={clsx("text-sm mt-1 font-black uppercase tracking-[0.2em] italic tabular-nums", theme === 'manager' || theme === 'flat' ? "text-[var(--accent-primary)]" : "text-pink-100")}>Engine Output Signal • Tactical Stream</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 bg-[var(--accent-primary)]/5 px-6 py-2 prism-card border-[var(--accent-primary)]/20">
            <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] animate-pulse shadow-[0_0_10px_var(--accent-primary)]" />
            <span className="text-[10px] text-pink-200 font-black uppercase tracking-0.3em font-mono italic">Live_Sync</span>
          </div>
        </div>
      </div>

      {/* Health Monitor Guide */}
      <div className="px-12 py-6 border-b border-rose-500/10 bg-rose-500/5">
        <div className="flex gap-8 items-start">
          <div className="p-3 prism-card border-rose-500/30 text-rose-400 bg-rose-500/10 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black text-rose-400 uppercase tracking-[0.4em] italic">Health Status: The Heartbeat Monitor</p>
            <p className={clsx("text-[12px] leading-relaxed font-medium tracking-wide", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-400")}>
              Think of the Health Monitor as your ship's <span className={clsx("font-bold", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-white")}>Live Vitals</span>. It listens to every groan and hum of the engine, showing you exactly what the ship is doing in real-time so you can spot problems (anomalies) before they cause a breakdown.
            </p>
          </div>
        </div>
      </div>
      <div className={clsx(
        "p-10 font-mono text-xs overflow-auto custom-scrollbar transition-all",
        theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)]" : "bg-black/40 prism-card min-h-[500px]"
      )}>
        {logs.map((log, i) => (
          <div key={i} className={clsx(
            "group flex gap-6 p-4 border-b transition-colors",
            theme === 'manager' || theme === 'flat' ? "border-[var(--glass-border)] hover:bg-[var(--surface-bg)]" : "border-white/5 hover:bg-white/5"
          )}>
            <span className={clsx("shrink-0 select-none font-bold tracking-tighter transition-opacity font-mono", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)]" : "text-slate-800 opacity-40 group-hover:opacity-100")}>[{new Date(log.ts * 1000).toLocaleTimeString()}]</span>
            <span className={clsx(
              "px-3 py-1 font-black text-[9px] rounded uppercase flex items-center justify-center shrink-0 min-w-[70px]",
              log.level === 'error' ? "bg-rose-500/20 text-rose-500 border border-rose-500/30" : (theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] text-[var(--muted-text)] border border-[var(--glass-border)]" : "bg-white/5 text-slate-500 border-white/5")
            )}>
              {log.level}
            </span>
            <span className={clsx("transition-colors break-all italic tracking-tight", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-slate-400 group-hover:text-slate-200")}>{log.msg || log.message}</span>
          </div>
        ))}
        {logs.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center space-y-8 py-48">
            <Terminal className="w-20 h-20 text-[var(--accent-primary)] opacity-10 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--muted-text)] italic">Awaiting Server Connection</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};;


const StaticFileManager = ({ theme }) => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState(null);
  const [newMatrix, setNewMatrix] = useState({ root: '', browse: true, host: '' });
  const [domains, setDomains] = useState([]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/caddy/config/apps/http/servers/srv0/routes');
      const found = [];
      const routes = Array.isArray(res.data) ? res.data : [];
      routes.forEach((route, rIdx) => {
        route.handle?.forEach((h, hIdx) => {
          if (h.handler === 'file_server') {
            found.push({
              id: `${rIdx}-${hIdx}`,
              root: h.root || '/*',
              browse: h.browse !== undefined,
              host: route.match?.[0]?.host?.[0],
              rIdx,
              hIdx
            });
          }
        });
      });
      setConfigs(found);
    } catch (e) {
      console.error("Asset fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const res = await api.get('/domains');
      console.log('Fetched domains:', res.data);
      setDomains(res.data || []);
    } catch (e) {
      console.error("Failed to fetch domains", e);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchDomains();
  }, []);

  const handleOpenModal = (matrix = null) => {
    if (matrix) {
      setEditingMatrix(matrix);
      setNewMatrix({ root: matrix.root, browse: matrix.browse, host: matrix.host || '' });
    } else {
      setEditingMatrix(null);
      setNewMatrix({ root: '', browse: true, host: '' });
    }
    setIsModalOpen(true);
  };

  const handleMapMatrix = async (e) => {
    e.preventDefault();
    try {
      // Add a new file_server route to the main server
      const res = await api.get('/caddy/config/apps/http/servers/srv0/routes');
      if (editingMatrix) {
        // Find existing route and update
        const targetRouteIndex = res.data.findIndex((r, idx) => idx === editingMatrix.rIdx);
        if (targetRouteIndex !== -1) {
          const updatedRoute = { ...res.data[targetRouteIndex] };
          updatedRoute.handle[0].root = newMatrix.root;
          if (newMatrix.browse) {
            updatedRoute.handle[0].browse = {};
          } else {
            delete updatedRoute.handle[0].browse;
          }
          await api.put(`/caddy/config/apps/http/servers/srv0/routes/${editingMatrix.rIdx}`, updatedRoute);
        }
      } else {
        const matchCriteria = {
          path: ["/*"]
        };

        // Add host matcher if specified
        if (newMatrix.host) {
          matchCriteria.host = [newMatrix.host];
        }

        const newRoute = {
          match: [matchCriteria],
          handle: [{
            handler: "file_server",
            root: newMatrix.root,
            browse: newMatrix.browse ? {} : undefined
          }],
          terminal: true
        }

        // Append the new route using POST with /- suffix (Caddy's array append syntax)
        await api.post(`/caddy/config/apps/http/servers/srv0/routes/-`, newRoute);
      }

      fetchAssets();
      setIsModalOpen(false);
      setNewMatrix({ root: '', browse: true });
      setEditingMatrix(null);
    } catch (e) {
      console.error("Mapping failed", e);
      alert("Failed to map matrix: " + (e.response?.data?.details || e.message));
    }
  };

  const handleDecommission = async (rIdx) => {
    if (window.confirm("Remove this file mapping? Files in this folder will no longer be served.")) {
      try {
        await api.delete(`/caddy/config/apps/http/servers/srv0/routes/${rIdx}`);
        fetchAssets();
      } catch (e) {
        console.error("Decommission failed", e);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <div className="flex justify-between items-center prism-card p-10 bg-transparent border-x-0 border-t-0 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--accent-secondary)]/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-8 relative z-10">
          <div className="p-5 prism-card border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/5 text-[var(--accent-secondary)]">
            <Server className="w-10 h-10 shadow-[0_0_15px_var(--accent-secondary)]" />
          </div>
          <div>
            {/* Internal title removed to prevent duplication with global header */}
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className={clsx(
            "px-12 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative z-10",
            theme === 'manager' || theme === 'flat' ? "bg-[var(--accent-secondary)] hover:opacity-90 text-white rounded-[var(--rounding)] shadow-lg shadow-[var(--glow-color)]" : "bg-[var(--accent-secondary)] hover:opacity-90 text-[var(--base-bg)] shadow-[0_0_20_var(--glow-color)]"
          )}
        >
          Map Hub Node
        </button>
      </div>

      {/* Asset Matrix Guide */}
      <div className="px-10 py-8 prism-card border-cyan-500/10 bg-cyan-500/5 relative overflow-hidden group">
        <div className="flex gap-8 items-start relative z-10">
          <div className="p-4 prism-card border-cyan-500/30 text-cyan-400 bg-cyan-500/10 shrink-0">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] italic">File Sharing: The Warehouse Manager</p>
            <p className="text-[12px] text-slate-400 leading-relaxed font-medium tracking-wide">
              Think of an Asset Matrix as your ship's <span className="text-white">Warehouse Manager</span>. It maps your internal storage crates (folders) to the outside world, allowing users to directly request files (images, PDFs) from your local filesystem.
            </p>
            <div className="flex gap-4 pt-2">
              <div className={clsx("px-3 py-1 rounded text-[9px] font-mono uppercase tracking-widest", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] text-[var(--muted-text)]" : "bg-white/5 border border-white/10 text-slate-400")}>Handler: file_server</div>
              <div className={clsx("px-3 py-1 rounded text-[9px] font-mono uppercase tracking-widest", theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] text-[var(--muted-text)]" : "bg-white/5 border border-white/10 text-slate-400")}>Type: File Sharing</div>
            </div>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Box className="w-32 h-32 rotate-12" />
        </div>
      </div>

      <div className="grid gap-8">
        {configs.map(cfg => (
          <div key={cfg.id} className={clsx(
            "p-10 flex items-center justify-between group transition-all duration-700 relative",
            theme === 'manager' || theme === 'flat' ? "bg-[var(--surface-bg)] border border-[var(--glass-border)] rounded-[var(--rounding)] shadow-sm" : "prism-card bg-black/20"
          )}>
            <div className="flex items-center gap-10">
              <div className={clsx(
                "w-24 h-24 flex items-center justify-center text-2xl font-black uppercase transition-transform italic",
                theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] text-[var(--muted-text)] rounded-lg" : "prism-card border-white/10 bg-white/5 text-slate-700 group-hover:text-[var(--accent-secondary)]/60 transition-all font-mono italic"
              )}>
                0X{cfg.id}
              </div>
              <div>
                <h5 className={clsx("text-2xl font-black tracking-tighter font-mono group-hover:text-cyan-100 transition-colors uppercase italic", theme === 'manager' || theme === 'flat' ? "text-[var(--base-text)]" : "text-[var(--base-text)]")}>{cfg.root}</h5>
                <div className="flex gap-10 mt-5">
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-2 h-2 rounded-none transition-all", cfg.browse ? "bg-[var(--accent-secondary)] shadow-[0_0_10px_var(--accent-secondary)]" : "bg-slate-900")} />
                    <span className={clsx("text-[10px] uppercase font-black tracking-[0.25em] transition-colors italic font-mono", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] group-hover:text-[var(--base-text)]" : "text-slate-400 group-hover:text-slate-400")}>DIR_NAVIGATION</span>
                  </div>
                  {cfg.host && (
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-none bg-emerald-500 shadow-[0_0_10px_emerald-500] transition-all" />
                      <span className={clsx("text-[10px] uppercase font-black tracking-[0.25em] transition-colors italic font-mono", theme === 'manager' || theme === 'flat' ? "text-[var(--muted-text)] group-hover:text-[var(--base-text)]" : "text-slate-400 group-hover:text-emerald-400")}>HOST: {cfg.host}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
              {cfg.host && (
                <button
                  onClick={() => window.open(`//${cfg.host}`, '_blank')}
                  className={clsx(
                    "px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all italic font-mono",
                    theme === 'manager' ? "bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-lg" : "prism-card border-white/10 bg-white/5 text-slate-700 hover:text-emerald-400 hover:bg-emerald-500/10"
                  )}
                >
                  OPEN
                </button>
              )}
              <button
                onClick={() => handleOpenModal(cfg)}
                className={clsx(
                  "px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all italic font-mono",
                  theme === 'manager' ? "bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-lg" : "prism-card border-white/10 bg-white/5 text-slate-700 hover:text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10"
                )}
              >
                EDIT
              </button>
              <button
                onClick={() => handleDecommission(cfg.rIdx)}
                className={clsx(
                  "px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all italic font-mono",
                  theme === 'manager' ? "bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg" : "prism-card border-white/10 bg-white/5 text-slate-700 hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
                )}
              >
                DELETE
              </button>
            </div>
          </div>
        ))}
        {configs.length === 0 && !loading && (
          <div className={clsx("text-center py-32 prism-card border-dashed", theme === 'manager' ? "bg-white/5 border-slate-200" : "bg-black/10 border-white/5")}>
            <Server className={clsx("w-20 h-20 mx-auto mb-8", theme === 'manager' ? "text-slate-400" : "text-slate-800")} />
            <p className={clsx("font-black uppercase tracking-[0.4em] text-xs font-mono", theme === 'manager' ? "text-slate-400" : "text-slate-800")}>No Static Matrices Propagated</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={clsx(
                "relative w-full max-w-lg p-10 shadow-2xl transition-all duration-500",
                theme === 'manager' ? "bg-white rounded-[12px] border border-slate-200" : "prism-card bg-[var(--base-bg)] border-[var(--accent-secondary)]/30"
              )}
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className={clsx(
                  "text-2xl font-black tracking-tighter italic uppercase",
                  theme === 'manager' ? "text-slate-900" : "text-[var(--base-text)]"
                )}>{editingMatrix ? 'Edit File Mapping' : 'Add File Mapping'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleMapMatrix} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em]">Root Path on Disk</label>
                  <input
                    required
                    value={newMatrix.root}
                    onChange={e => setNewMatrix({ ...newMatrix, root: e.target.value })}
                    placeholder="e.g. /var/www/html"
                    className={clsx(
                      "w-full p-4 font-mono outline-none transition-all",
                      theme === 'manager' ? "bg-slate-50 border border-slate-200 text-slate-900 focus:border-rose-500 rounded-lg" : "bg-black/40 border border-white/10 text-[var(--base-text)] focus:border-[var(--accent-secondary)]"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.4em]">Domain (Optional)</label>
                  <select
                    value={newMatrix.host}
                    onChange={e => setNewMatrix({ ...newMatrix, host: e.target.value })}
                    className={clsx(
                      "w-full p-4 font-mono outline-none transition-all",
                      theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] border border-[var(--glass-border)] text-[var(--base-text)] focus:border-[var(--accent-primary)]" : "bg-black/40 border-white/10 text-white focus:border-[var(--accent-primary)]",
                      theme === 'horizon' ? "rounded-2xl" : theme === 'terminal' ? "rounded-none" : "rounded-sm",
                      (theme === 'manager' || theme === 'flat') && "rounded-lg"
                    )}
                  >
                    <option value="" className={clsx(theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--base-text)]" : "bg-slate-900 text-white")}>All Domains (Default)</option>
                    {domains.map(d => (
                      <option key={d.id} value={d.host} className={clsx(theme === 'manager' || theme === 'flat' ? "bg-[var(--base-bg)] text-[var(--base-text)]" : "bg-slate-900 text-white")}>{d.host}</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-400 italic">Leave empty to serve files on all domains, or select a specific domain.</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-black/5 rounded-lg border border-white/5 cursor-pointer" onClick={() => setNewMatrix({ ...newMatrix, browse: !newMatrix.browse })}>
                  <span className={clsx(
                    "text-[10px] font-bold uppercase tracking-widest",
                    theme === 'manager' ? "text-slate-400" : "text-slate-400"
                  )}>Enable Directory Navigation</span>
                  <div className={clsx(
                    "w-12 h-6 transition-all relative",
                    theme === 'manager' ? (newMatrix.browse ? "bg-rose-500" : "bg-slate-200") : (newMatrix.browse ? "bg-[var(--accent-secondary)]" : "bg-slate-800"),
                    theme === 'manager' || theme === 'horizon' ? "rounded-full" : "rounded-none"
                  )}>
                    <div className={clsx(
                      "absolute top-1 w-4 h-4 transition-all bg-white shadow-sm",
                      newMatrix.browse ? "left-7" : "left-1",
                      theme === 'manager' || theme === 'horizon' ? "rounded-full" : "rounded-none"
                    )} />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className={clsx(
                      "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                      theme === 'manager' ? "bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-lg shadow-rose-200" : "bg-[var(--accent-secondary)] hover:opacity-90 text-[var(--base-bg)]"
                    )}
                  >
                    {editingMatrix ? 'Save Changes' : 'Start Mapping'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={clsx(
                      "px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                      theme === 'manager' ? "bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-lg" : "bg-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};



export default App;
