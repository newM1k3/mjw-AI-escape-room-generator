import { useState } from 'react';
import {
  BookOpen, Layers, AlertTriangle, Save, Download, ChevronDown, ChevronUp,
  Lightbulb, Package, Eye, Key, ArrowRight, CheckCircle, Loader2, ClipboardList,
  ShoppingCart, Users, Accessibility, Wrench
} from 'lucide-react';
import type { RoomContent, RoomPuzzle } from '../types';

interface RoomOutputProps {
  room: RoomContent;
  onSave?: () => Promise<void>;
  onExport?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  showActions?: boolean;
}

function asList(value: string[] | string | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getPuzzles(room: RoomContent): RoomPuzzle[] {
  if (room.puzzle_flow?.length) return room.puzzle_flow;

  return (room.puzzles || []).map((puzzle, index) => ({
    title: puzzle.name,
    role_in_flow: index === 0 ? 'Opening puzzle' : 'Linked puzzle',
    estimated_time: 'Not specified',
    required_props: puzzle.props,
    setup: puzzle.setup,
    player_facing_clue: 'See setup notes.',
    hint_ladder: [],
    solution: puzzle.solution,
    output: puzzle.output,
    reset_notes: 'Reset according to operator notes.',
    safety_or_ops_notes: 'No additional notes supplied.',
  }));
}

function getStoryCards(room: RoomContent) {
  if (room.story) {
    return [
      { label: 'Introduction', content: room.story.introduction, color: 'text-blue-400' },
      { label: 'Midpoint', content: room.story.midpoint, color: 'text-violet-400' },
      { label: 'Climax', content: room.story.climax, color: 'text-amber-400' },
      { label: 'Resolution', content: room.story.resolution, color: 'text-green-400' },
    ];
  }

  return [
    { label: 'Introduction', content: room.narrative?.intro || '', color: 'text-blue-400' },
    { label: 'Climax', content: room.narrative?.climax || '', color: 'text-amber-400' },
    { label: 'Resolution', content: room.narrative?.outro || '', color: 'text-green-400' },
  ].filter((card) => card.content);
}

function DetailList({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700">
        {icon}
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-2.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-6 h-6 bg-slate-700 border border-slate-600 rounded-md flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-slate-300 text-xs font-bold">{index + 1}</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoomOutput({ room, onSave, onExport, isSaving, isSaved, showActions = true }: RoomOutputProps) {
  const [expandedPuzzles, setExpandedPuzzles] = useState<Set<number>>(new Set([0]));
  const puzzles = getPuzzles(room);
  const redHerrings = room.red_herrings || room.redHerrings || [];
  const storyCards = getStoryCards(room);

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
            {room.tagline && <p className="text-slate-300 mt-2 italic">{room.tagline}</p>}
            {(room.difficulty || room.players || room.duration || room.format) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {[room.difficulty, room.players, room.duration, room.format].filter(Boolean).map((item) => (
                  <span key={item} className="text-xs font-semibold px-2 py-1 rounded border border-slate-600 bg-slate-700 text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
            )}
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
        {room.operator_summary && (
          <div className="mt-5 bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Operator Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">{room.operator_summary}</p>
          </div>
        )}
      </div>

      {storyCards.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700">
            <BookOpen size={18} className="text-cyan-400" />
            <h2 className="text-white font-semibold">The Narrative Arc</h2>
          </div>
          <div className={`grid ${storyCards.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} divide-y md:divide-y-0 md:divide-x divide-slate-700`}>
            {storyCards.map(({ label, content, color }) => (
              <div key={label} className="px-6 py-5">
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${color}`}>{label}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3 mb-4">
          <Layers size={18} className="text-cyan-400" />
          <h2 className="text-white font-semibold text-lg">The Puzzle Flow</h2>
          <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">{puzzles.length} puzzles</span>
        </div>

        {puzzles.map((puzzle, index) => {
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
                  <h3 className="text-white font-semibold">{puzzle.title}</h3>
                  {!isExpanded && (
                    <p className="text-slate-500 text-sm mt-0.5 truncate">{puzzle.role_in_flow || puzzle.setup}</p>
                  )}
                </div>
                {index < puzzles.length - 1 && (
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
                      {puzzle.required_props.map((prop, i) => (
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
                      <ClipboardList size={13} className="text-violet-400" />
                      <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider">Player-Facing Clue</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{puzzle.player_facing_clue}</p>
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
                  <div className="bg-slate-800 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench size={13} className="text-slate-400" />
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Reset & Ops</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3"><strong>Time:</strong> {puzzle.estimated_time}</p>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3"><strong>Reset:</strong> {puzzle.reset_notes}</p>
                    <p className="text-sm text-slate-300 leading-relaxed"><strong>Safety/Ops:</strong> {puzzle.safety_or_ops_notes}</p>
                  </div>
                  {puzzle.hint_ladder.length > 0 && (
                    <div className="md:col-span-2 bg-slate-800 px-5 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={13} className="text-yellow-400" />
                        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Hint Ladder</p>
                      </div>
                      <ol className="space-y-1.5 list-decimal list-inside text-sm text-slate-300">
                        {puzzle.hint_ladder.map((hint, i) => <li key={i}>{hint}</li>)}
                      </ol>
                    </div>
                  )}
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
          {redHerrings.map((herring, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-500/10 border border-red-500/20 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-red-400 text-xs font-bold">{index + 1}</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{herring}</p>
            </div>
          ))}
        </div>
      </div>

      <DetailList title="Production Notes" icon={<Wrench size={18} className="text-amber-400" />} items={asList(room.production_notes)} />
      <DetailList title="Shopping List" icon={<ShoppingCart size={18} className="text-cyan-400" />} items={asList(room.shopping_list)} />
      <DetailList title="Reset Checklist" icon={<ClipboardList size={18} className="text-green-400" />} items={asList(room.reset_checklist)} />
      <DetailList title="Accessibility Notes" icon={<Accessibility size={18} className="text-violet-400" />} items={asList(room.accessibility_notes)} />
      <DetailList title="Staffing Notes" icon={<Users size={18} className="text-blue-400" />} items={asList(room.staffing_notes)} />
    </div>
  );
}
