import { useState } from 'react';
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
  const { user, logout } = useAuth();

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

    if (!user) {
      setCurrentPage('demo');
      setCheckoutError('Please sign in or create an account before upgrading to Pro.');
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
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
    } finally {
      setIsCheckoutLoading(false);
    }
  };

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
