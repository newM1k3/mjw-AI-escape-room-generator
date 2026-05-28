import { AlertCircle, Loader2, Zap } from 'lucide-react';
import RoomOutput from '../components/RoomOutput';
import { DEMO_ROOM } from '../lib/demoRoom';

interface DemoPageProps {
  onUpgrade: () => void;
  isUpgradeLoading?: boolean;
  checkoutError?: string;
}

export default function DemoPage({ onUpgrade, isUpgradeLoading = false, checkoutError = '' }: DemoPageProps) {
  return (
    <div>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Demo Room — Free Preview
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Demo Room</h1>
        <p className="text-slate-400">This is an example of the full output you receive when generating a room. Every field is AI-crafted based on your inputs.</p>
      </div>

      <RoomOutput room={DEMO_ROOM} showActions={false} />

      <div className="sticky bottom-0 mt-8 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white font-semibold">Want to generate your own custom room?</p>
            <p className="text-slate-400 text-sm">Unlimited generations, save to library, PDF export.</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={onUpgrade}
              disabled={isUpgradeLoading}
              className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {isUpgradeLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Opening Stripe...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Upgrade to Pro — $97 One-Time
                </>
              )}
            </button>
            {checkoutError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 max-w-xs">
                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{checkoutError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
