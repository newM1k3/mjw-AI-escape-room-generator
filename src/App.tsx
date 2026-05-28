import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import GeneratorPage from './pages/GeneratorPage';
import SavedRoomsPage from './pages/SavedRoomsPage';
import DemoPage from './pages/DemoPage';
import AccountPage from './pages/AccountPage';
import LegalPage from './pages/LegalPage';
import { describeEntitlementDelay } from './lib/entitlements';

export type Page = 'generator' | 'saved' | 'demo' | 'account' | 'terms' | 'privacy';

type CheckoutBanner = {
  type: 'error' | 'info' | 'success';
  text: string;
};

function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('generator');
  const [checkoutBanner, setCheckoutBanner] = useState<CheckoutBanner | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isUnlockingPro, setIsUnlockingPro] = useState(false);
  const { user, logout, authToken, refreshUser, isPro } = useAuth();

  const checkoutError = checkoutBanner?.type === 'error' ? checkoutBanner.text : '';

  const navigateTo = (page: Page) => {
    setCheckoutBanner(null);
    setCurrentPage(page);
  };

  const handleSafeSignOut = () => {
    logout();
    setCheckoutBanner(null);
    setIsCheckoutLoading(false);
    setIsUnlockingPro(false);
    setCurrentPage('demo');
  };

  const refreshEntitlementAfterCheckout = useCallback(async () => {
    setIsUnlockingPro(true);
    setCheckoutBanner({
      type: 'info',
      text: 'Payment received. Unlocking your Pro access...',
    });

    try {
      const refreshedUser = await refreshUser();
      const hasUnlocked = refreshedUser?.role === 'pro' || refreshedUser?.is_pro === true || refreshedUser?.tier === 'pro';

      if (hasUnlocked) {
        setCheckoutBanner({
          type: 'success',
          text: 'Pro access is active. You can now generate and save unlimited escape room puzzle flows.',
        });
        setIsUnlockingPro(false);
        return;
      }

      setCheckoutBanner({
        type: 'info',
        text: `${describeEntitlementDelay()} Use Refresh Pro Access below, or contact support with your Stripe receipt if this does not resolve shortly.`,
      });
    } catch (err) {
      console.error('Account refresh after checkout failed', err);
      setCheckoutBanner({
        type: 'error',
        text: 'Payment was received, but PuzzleFlow AI could not refresh your account yet. Use Refresh Pro Access below, or contact support if this continues.',
      });
    } finally {
      setIsUnlockingPro(false);
    }
  }, [refreshUser]);

  const handleUpgrade = async () => {
    setCheckoutBanner(null);

    if (!user || !authToken) {
      setCurrentPage('demo');
      setCheckoutBanner({ type: 'error', text: 'Please sign in or create an account before upgrading to Pro.' });
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Checkout could not be started. Please try again.');
      }

      if (!data.url || typeof data.url !== 'string') {
        throw new Error('Checkout did not return a valid Stripe URL. Please contact support.');
      }

      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout could not be started. Please try again.';
      setCheckoutBanner({ type: 'error', text: message });
      console.error('Checkout error', err);
      setIsCheckoutLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');

    if (!checkoutStatus) return;

    if (checkoutStatus === 'success') {
      setCurrentPage('account');
      refreshEntitlementAfterCheckout();
    }

    if (checkoutStatus === 'cancelled') {
      setCheckoutBanner({ type: 'info', text: 'Checkout was cancelled. You can restart the Pro upgrade whenever you are ready.' });
    }

    params.delete('checkout');
    params.delete('session_id');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [refreshEntitlementAfterCheckout]);

  useEffect(() => {
    if (isPro && checkoutBanner?.text.includes('Unlocking your Pro access')) {
      setCheckoutBanner({
        type: 'success',
        text: 'Pro access is active. You can now generate and save unlimited escape room puzzle flows.',
      });
      setIsUnlockingPro(false);
    }
  }, [isPro, checkoutBanner?.text]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onUpgrade={handleUpgrade}
        onSignOut={handleSafeSignOut}
      />

      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8 pt-16 lg:pt-8">
          {checkoutBanner && (
            <div className={`mb-6 rounded-xl px-4 py-3 border ${checkoutBanner.type === 'error' ? 'bg-red-500/10 border-red-500/30' : checkoutBanner.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
              <div className="flex items-start gap-3">
                {checkoutBanner.type === 'error' ? (
                  <AlertCircle size={18} className="text-red-300 mt-0.5 shrink-0" />
                ) : checkoutBanner.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-300 mt-0.5 shrink-0" />
                ) : isUnlockingPro ? (
                  <Loader2 size={18} className="text-cyan-300 mt-0.5 shrink-0 animate-spin" />
                ) : (
                  <AlertCircle size={18} className="text-cyan-300 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${checkoutBanner.type === 'error' ? 'text-red-300' : checkoutBanner.type === 'success' ? 'text-emerald-300' : 'text-cyan-200'}`}>
                    {checkoutBanner.text}
                  </p>
                  {checkoutBanner.type !== 'success' && checkoutBanner.text.includes('PocketBase has not reflected Pro access') && (
                    <button
                      onClick={refreshEntitlementAfterCheckout}
                      disabled={isUnlockingPro}
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-200 hover:text-white disabled:opacity-60"
                    >
                      {isUnlockingPro ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Refresh Pro Access
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentPage === 'generator' && (
            <GeneratorPage
              onUpgrade={handleUpgrade}
              isUpgradeLoading={isCheckoutLoading}
              checkoutError={checkoutError}
              onNavigateLegal={navigateTo}
            />
          )}
          {currentPage === 'saved' && (
            <SavedRoomsPage
              onUpgrade={handleUpgrade}
              isUpgradeLoading={isCheckoutLoading}
              checkoutError={checkoutError}
              onNavigateLegal={navigateTo}
            />
          )}
          {currentPage === 'demo' && (
            <DemoPage onUpgrade={handleUpgrade} isUpgradeLoading={isCheckoutLoading} checkoutError={checkoutError} />
          )}
          {currentPage === 'account' && (
            <AccountPage onSignOut={handleSafeSignOut} onUpgrade={handleUpgrade} isUpgradeLoading={isCheckoutLoading} />
          )}
          {currentPage === 'terms' && <LegalPage type="terms" />}
          {currentPage === 'privacy' && <LegalPage type="privacy" />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
