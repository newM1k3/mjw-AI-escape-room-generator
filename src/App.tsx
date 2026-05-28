import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import GeneratorPage from './pages/GeneratorPage';
import SavedRoomsPage from './pages/SavedRoomsPage';
import DemoPage from './pages/DemoPage';
import AccountPage from './pages/AccountPage';
import LegalPage from './pages/LegalPage';

export type Page = 'generator' | 'saved' | 'demo' | 'account' | 'terms' | 'privacy';

function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('generator');
  const [checkoutError, setCheckoutError] = useState('');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const { user, logout, authToken, refreshUser } = useAuth();

  const navigateTo = (page: Page) => {
    setCheckoutError('');
    setCurrentPage(page);
  };

  const handleSafeSignOut = () => {
    logout();
    setCheckoutError('');
    setIsCheckoutLoading(false);
    setCurrentPage('demo');
  };

  const handleUpgrade = async () => {
    setCheckoutError('');

    if (!user || !authToken) {
      setCurrentPage('demo');
      setCheckoutError('Please sign in or create an account before upgrading to Pro.');
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
      setCheckoutError(message);
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
      setCheckoutError('Payment received. Refreshing your account so Pro access appears as soon as Stripe confirms the purchase.');
      refreshUser().catch((err) => {
        console.error('Account refresh after checkout failed', err);
      });
    }

    if (checkoutStatus === 'cancelled') {
      setCheckoutError('Checkout was cancelled. You can restart the Pro upgrade whenever you are ready.');
    }

    params.delete('checkout');
    params.delete('session_id');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [refreshUser]);

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
          {checkoutError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-red-300">{checkoutError}</p>
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
