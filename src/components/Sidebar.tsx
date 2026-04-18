import { useState } from 'react';
import { Wand2, BookOpen, FlaskConical, Zap, LogOut, User, ChevronRight, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

type Page = 'generator' | 'saved' | 'demo';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onUpgrade: () => void;
}

export default function Sidebar({ currentPage, onNavigate, onUpgrade }: SidebarProps) {
  const { user, isPro, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'generator', label: 'New Room', icon: <Wand2 size={17} /> },
    { id: 'saved', label: 'My Rooms', icon: <BookOpen size={17} /> },
    { id: 'demo', label: 'Demo Room', icon: <FlaskConical size={17} /> },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center shrink-0">
            <Wand2 size={18} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">PuzzleFlow AI</h1>
            <p className="text-slate-500 text-xs">Escape Room Generator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentPage === item.id
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {item.icon}
            {item.label}
            {currentPage === item.id && (
              <ChevronRight size={14} className="ml-auto text-cyan-500" />
            )}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-4 space-y-3 border-t border-slate-800 pt-4">
        {!isPro && (
          <button
            onClick={onUpgrade}
            className="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold px-3 py-2.5 rounded-lg text-sm transition-all"
          >
            <Zap size={14} />
            Upgrade to Pro — $97
          </button>
        )}

        {user ? (
          <div className="bg-slate-800 rounded-lg px-3 py-2.5 flex items-center gap-3">
            <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
              <User size={13} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.name || user.email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPro ? (
                  <span className="inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-1.5 py-0.5 rounded">
                    <Zap size={9} /> PRO
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs">Free tier</span>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium px-3 py-2.5 rounded-lg text-sm transition-colors"
          >
            <User size={14} />
            Sign In
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-40 bg-slate-800 border border-slate-700 text-white p-2 rounded-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full w-60 bg-slate-900 border-r border-slate-800 z-40 transition-transform lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </aside>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
