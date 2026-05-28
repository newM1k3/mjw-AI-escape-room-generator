import { useState } from 'react';
import { Wand2, Loader2, ChevronDown } from 'lucide-react';
import TierGate from '../components/TierGate';
import RoomOutput from '../components/RoomOutput';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pocketbase';
import type { GeneratorFormData, RoomContent } from '../types';

interface GeneratorPageProps {
  onUpgrade: () => void;
  isUpgradeLoading?: boolean;
  checkoutError?: string;
  onNavigateLegal?: (page: 'terms' | 'privacy') => void;
}

const defaultForm: GeneratorFormData = {
  theme: '',
  difficulty: 'Intermediate',
  players: '4-6',
  format: 'Single Room',
  duration: '60 mins',
};

export default function GeneratorPage({ onUpgrade, isUpgradeLoading = false, checkoutError = '', onNavigateLegal }: GeneratorPageProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<GeneratorFormData>(defaultForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoom, setGeneratedRoom] = useState<RoomContent | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGeneratedRoom(null);
    setIsSaved(false);
    setSaveError('');
    setIsGenerating(true);

    try {
      const res = await fetch('/.netlify/functions/generate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed. Please try again.');
      }

      const data = await res.json();
      setGeneratedRoom(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedRoom || !user) return;
    setSaveError('');
    setIsSaving(true);
    try {
      await pb.collection('generated_rooms').create({
        user: user.id,
        title: generatedRoom.title,
        theme: form.theme,
        difficulty: form.difficulty,
        content: generatedRoom,
      });
      setIsSaved(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed. Please try again.';
      setSaveError(message);
      console.error('Save failed', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  const SelectField = ({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors pr-9"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">New Room</h1>
        <p className="text-slate-400">Configure your escape room parameters and generate a complete puzzle flow.</p>
      </div>

      <TierGate requiredTier="pro" onUpgrade={onUpgrade} isUpgradeLoading={isUpgradeLoading} checkoutError={checkoutError} onNavigateLegal={onNavigateLegal}>
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleGenerate} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-5 sticky top-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Theme / Story
                </label>
                <textarea
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  placeholder="e.g. 1920s bank heist — the vault is rigged to explode. Players are rival thieves who must cooperate to escape."
                  required
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors resize-none"
                />
              </div>

              <SelectField
                label="Difficulty"
                value={form.difficulty}
                onChange={(v) => setForm({ ...form, difficulty: v as GeneratorFormData['difficulty'] })}
                options={['Beginner', 'Intermediate', 'Expert', 'Enthusiast-Only']}
              />

              <SelectField
                label="Number of Players"
                value={form.players}
                onChange={(v) => setForm({ ...form, players: v as GeneratorFormData['players'] })}
                options={['2-4', '4-6', '6-8', '8+']}
              />

              <SelectField
                label="Room Format"
                value={form.format}
                onChange={(v) => setForm({ ...form, format: v as GeneratorFormData['format'] })}
                options={['Single Room', 'Multi-Room', 'Linear', 'Non-Linear']}
              />

              <SelectField
                label="Target Duration"
                value={form.duration}
                onChange={(v) => setForm({ ...form, duration: v as GeneratorFormData['duration'] })}
                options={['45 mins', '60 mins', '90 mins']}
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !form.theme.trim()}
                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Generate Puzzle Flow
                  </>
                )}
              </button>

              {isGenerating && (
                <p className="text-center text-slate-500 text-xs">
                  AI is designing your room... this takes ~15 seconds
                </p>
              )}
            </form>
          </div>

          <div className="lg:col-span-3">
            {generatedRoom ? (
              <>
                {saveError && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-300">{saveError}</p>
                  </div>
                )}
                <RoomOutput
                  room={generatedRoom}
                  onSave={handleSave}
                  onExport={handleExport}
                  isSaving={isSaving}
                  isSaved={isSaved}
                />
              </>
            ) : (
              <div className="bg-slate-800 border border-slate-700 border-dashed rounded-2xl flex flex-col items-center justify-center py-24 px-6 text-center h-full min-h-80">
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center mb-5">
                  <Wand2 size={24} className="text-slate-500" />
                </div>
                <p className="text-slate-400 font-medium mb-2">Your generated room will appear here</p>
                <p className="text-slate-600 text-sm">Fill in the form and click "Generate Puzzle Flow"</p>
              </div>
            )}
          </div>
        </div>
      </TierGate>
    </div>
  );
}
