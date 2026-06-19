import { ReactNode, useEffect, useRef, useState } from 'react';
import { Zap, LogIn, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

interface TierGateProps {
  children: ReactNode;
  requiredTier: 'pro';
  onUpgrade?: () => void;
  isUpgradeLoading?: boolean;
  checkoutError?: string;
  onNavigateLegal?: (page: 'terms' | 'privacy') => void;
}

export default function TierGate({ children, requiredTier, onUpgrade, isUpgradeLoading = false, checkoutError = '', onNavigateLegal }: TierGateProps) {
  const { user, isPro, isLoading, isEntitlementLoading, entitlementStatus, refreshUser } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const refreshedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || requiredTier !== 'pro' || refreshedForUserId.current === user.id) return;

    refreshedForUserId.current = user.id;
    setRefreshError('');
    refreshUser().catch((err) => {
      console.error('Entitlement refresh failed for protected route', err);
      setRefreshError('ImmersiveKit could not confirm your Pro access yet. Please refresh or try again shortly.');
    });
  }, [refreshUser, requiredTier, user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Checking your sign-in session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mb-6">
            <LogIn size={28} className="text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Sign In Required</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            You need to be signed in to access this feature. Create a free account to get started.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Sign In or Create Account
          </button>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onNavigateLegal={onNavigateLegal} />}
      </>
    );
  }

  if (requiredTier === 'pro' && (isEntitlementLoading || entitlementStatus === 'unknown')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mb-6">
          <Loader2 size={28} className="text-cyan-300 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Checking Pro Access</h2>
        <p className="text-slate-400 leading-relaxed">
          ImmersiveKit is refreshing your PocketBase account before showing protected Pro features.
        </p>
      </div>
    );
  }

  if (requiredTier === 'pro' && !isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-6">
          <Lock size={28} className="text-amber-400" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <Zap size={11} />
          PRO FEATURE
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Unlock Unlimited Generation</h2>
        <p className="text-slate-400 mb-2 leading-relaxed">
          Generating custom puzzle flows requires a Pro license. Get lifetime access with a single payment.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          No subscriptions. No recurring fees. Yours forever.
        </p>
        {(checkoutError || refreshError) && (
          <div className="w-full max-w-sm mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-left">
            <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{checkoutError || refreshError}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            onClick={onUpgrade}
            disabled={isUpgradeLoading}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isUpgradeLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Opening Stripe...
              </>
            ) : (
              <>
                <Zap size={16} />
                Unlock for $97 — One-Time
              </>
            )}
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-600">Secure payment via Stripe. Instant access after webhook confirmation.</p>
      </div>
    );
  }

  return (
    <>
      <div className="sr-only" aria-live="polite">
        <ShieldCheck size={1} /> Pro entitlement confirmed.
      </div>
      {children}
    </>
  );
}
