import { Mail, ShieldCheck, User, Zap, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { publicConfig } from '../config';

interface AccountPageProps {
  onSignOut: () => void;
  onUpgrade: () => void;
  isUpgradeLoading: boolean;
}

export default function AccountPage({ onSignOut, onUpgrade, isUpgradeLoading }: AccountPageProps) {
  const { user, isPro, refreshUser } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setMessage('');
    setError('');
    setIsRefreshing(true);
    try {
      await refreshUser();
      setMessage('Account status refreshed.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not refresh account status.';
      setError(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-3">Account</h1>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-slate-300">Sign in to view your profile, tier, and purchase status.</p>
        </div>
      </div>
    );
  }

  const purchaseStatus = isPro
    ? 'Pro Lifetime Access active'
    : user.stripe_customer_id
      ? 'Stripe customer found, but Pro access is not active yet'
      : 'No Pro purchase recorded';
  const purchasedAt = user.pro_purchased_at ? new Date(user.pro_purchased_at).toLocaleString() : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Account</h1>
        <p className="text-slate-400">Review your PuzzleFlow AI profile, tier, and purchase status.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center">
            <User size={22} className="text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white truncate">{user.name || 'PuzzleFlow User'}</h2>
            <p className="text-sm text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Mail size={15} /> Email
            </div>
            <p className="text-white font-medium break-all">{user.email}</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Zap size={15} /> Tier
            </div>
            <p className={isPro ? 'text-cyan-400 font-semibold' : 'text-slate-200 font-semibold'}>
              {isPro ? 'Pro' : 'Free'}
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <ShieldCheck size={15} /> Purchase Status
            </div>
            <p className="text-white font-medium">{purchaseStatus}</p>
            {purchasedAt && <p className="text-sm text-slate-300 mt-2">Purchased: {purchasedAt}</p>}
            {user.stripe_checkout_session_id && (
              <p className="text-xs text-slate-500 mt-2 break-all">Stripe checkout session: {user.stripe_checkout_session_id}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Pro status is read from your PocketBase user record. Browser local storage is used only to hold the PocketBase auth session.
            </p>
          </div>
        </div>

        {(message || error) && (
          <div className="px-6 pb-4">
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 ${error ? 'bg-red-500/10 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
              <AlertCircle size={15} className={`${error ? 'text-red-400' : 'text-emerald-400'} mt-0.5 shrink-0`} />
              <p className={`text-sm ${error ? 'text-red-300' : 'text-emerald-300'}`}>{error || message}</p>
            </div>
          </div>
        )}

        <div className="px-6 py-5 border-t border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-sm text-slate-400">
            Need account help? Contact{' '}
            <a href={`mailto:${publicConfig.supportEmail}`} className="text-cyan-400 hover:text-cyan-300">
              {publicConfig.supportEmail}
            </a>
            .
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-slate-100 font-medium px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
            </button>
            {!isPro && (
              <button
                onClick={onUpgrade}
                disabled={isUpgradeLoading}
                className="inline-flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-60 border border-amber-500/30 text-amber-400 font-semibold px-3 py-2 rounded-lg text-sm transition-all"
              >
                <Zap size={14} />
                {isUpgradeLoading ? 'Starting checkout...' : 'Upgrade to Pro'}
              </button>
            )}
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-medium px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
