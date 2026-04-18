import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import GeneratorPage from './pages/GeneratorPage';
import SavedRoomsPage from './pages/SavedRoomsPage';
import DemoPage from './pages/DemoPage';

type Page = 'generator' | 'saved' | 'demo';

function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('generator');
  const { user } = useAuth();

  const handleUpgrade = async () => {
    if (!user) {
      setCurrentPage('demo');
      return;
    }
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onUpgrade={handleUpgrade}
      />

      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8 pt-16 lg:pt-8">
          {currentPage === 'generator' && (
            <GeneratorPage onUpgrade={handleUpgrade} />
          )}
          {currentPage === 'saved' && (
            <SavedRoomsPage onUpgrade={handleUpgrade} />
          )}
          {currentPage === 'demo' && (
            <DemoPage onUpgrade={handleUpgrade} />
          )}
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
