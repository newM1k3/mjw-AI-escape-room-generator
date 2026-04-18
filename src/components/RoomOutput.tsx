import { useState } from 'react';
import {
  BookOpen, Layers, AlertTriangle, Save, Download, ChevronDown, ChevronUp,
  Lightbulb, Package, Eye, Key, ArrowRight, CheckCircle, Loader2
} from 'lucide-react';
import type { RoomContent } from '../types';

interface RoomOutputProps {
  room: RoomContent;
  onSave?: () => Promise<void>;
  onExport?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  showActions?: boolean;
}

export default function RoomOutput({ room, onSave, onExport, isSaving, isSaved, showActions = true }: RoomOutputProps) {
  const [expandedPuzzles, setExpandedPuzzles] = useState<Set<number>>(new Set([0]));

  const togglePuzzle = (index: number) => {
    setExpandedPuzzles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-2">Generated Room</p>
            <h1 className="text-3xl font-bold text-white">{room.title}</h1>
          </div>
          {showActions && (
            <div className="flex items-center gap-3">
              {onSave && (
                <button
                  onClick={onSave}
                  disabled={isSaving || isSaved}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors border border-slate-600"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isSaved ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <Save size={14} />
                  )}
                  {isSaved ? 'Saved' : 'Save Room'}
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Download size={14} />
                  Export PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700">
          <BookOpen size={18} className="text-cyan-400" />
          <h2 className="text-white font-semibold">The Narrative Arc</h2>
        </div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700">
          {[
            { label: 'Introduction', content: room.narrative.intro, color: 'text-blue-400' },
            { label: 'Climax', content: room.narrative.climax, color: 'text-amber-400' },
            { label: 'Resolution', content: room.narrative.outro, color: 'text-green-400' },
          ].map(({ label, content, color }) => (
            <div key={label} className="px-6 py-5">
              <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${color}`}>{label}</p>
              <p className="text-slate-300 text-sm leading-relaxed">{content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 mb-4">
          <Layers size={18} className="text-cyan-400" />
          <h2 className="text-white font-semibold text-lg">The Puzzle Flow</h2>
          <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{room.puzzles.length} puzzles</span>
        </div>

        {room.puzzles.map((puzzle, index) => {
          const isExpanded = expandedPuzzles.has(index);
          return (
            <div key={index} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => togglePuzzle(index)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-750 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-cyan-400 text-sm font-bold">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold">{puzzle.name}</h3>
                  {!isExpanded && (
                    <p className="text-slate-500 text-sm mt-0.5 truncate">{puzzle.setup}</p>
                  )}
                </div>
                {index < room.puzzles.length - 1 && (
                  <ArrowRight size={14} className="text-cyan-500/50 hidden sm:block" />
                )}
                {isExpanded ? (
                  <ChevronUp size={16} className="text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-slate-500 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-700 grid md:grid-cols-2 gap-px bg-slate-700">
                  <div className="bg-slate-800 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package size={13} className="text-amber-400" />
                      <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Required Props</p>
                    </div>
                    <ul className="space-y-1.5">
                      {puzzle.props.map((prop, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0" />
                          {prop}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-800 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye size={13} className="text-blue-400" />
                      <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">The Setup</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{puzzle.setup}</p>
                  </div>
                  <div className="bg-slate-800 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb size={13} className="text-green-400" />
                      <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">The Solution</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{puzzle.solution}</p>
                  </div>
                  <div className="bg-slate-800 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Key size={13} className="text-cyan-400" />
                      <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">The Output</p>
                    </div>
                    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-3 py-2">
                      <p className="text-sm text-cyan-300 font-medium">{puzzle.output}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700">
          <AlertTriangle size={18} className="text-red-400" />
          <h2 className="text-white font-semibold">Red Herrings & Distractions</h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          {room.redHerrings.map((herring, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-500/10 border border-red-500/20 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-red-400 text-xs font-bold">{index + 1}</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{herring}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
