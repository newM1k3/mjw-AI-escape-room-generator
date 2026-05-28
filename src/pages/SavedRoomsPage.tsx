import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Trash2, Calendar, Users, ChevronRight, Loader2, ArrowLeft,
  AlertCircle, Search, Copy, RefreshCw, Layers
} from 'lucide-react';
import TierGate from '../components/TierGate';
import RoomOutput from '../components/RoomOutput';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pocketbase';
import type { GeneratedRoom } from '../types';
import { getRoomPuzzles } from '../lib/roomExports';

interface SavedRoomsPageProps {
  onUpgrade: () => void;
  isUpgradeLoading?: boolean;
  checkoutError?: string;
  onNavigateLegal?: (page: 'terms' | 'privacy') => void;
}

const ALL = 'All';

export default function SavedRoomsPage({ onUpgrade, isUpgradeLoading = false, checkoutError = '', onNavigateLegal }: SavedRoomsPageProps) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<GeneratedRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<GeneratedRoom | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState(ALL);
  const [formatFilter, setFormatFilter] = useState(ALL);

  const loadRooms = useCallback(async () => {
    if (!user) {
      setRooms([]);
      setSelectedRoom(null);
      setError('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const records = await pb.collection('generated_rooms').getFullList<GeneratedRoom>({
        filter: `user = "${user.id}"`,
        sort: '-created',
      });
      setRooms(records);
      setSelectedRoom((current) => (current ? records.find((room) => room.id === current.id) || null : null));
    } catch (err) {
      setError('Failed to load saved rooms. Confirm the generated_rooms collection exists and your account still has access.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const difficultyOptions = useMemo(() => {
    const values = new Set(rooms.map((room) => room.difficulty || room.content?.difficulty).filter(Boolean));
    return [ALL, ...Array.from(values).sort()];
  }, [rooms]);

  const formatOptions = useMemo(() => {
    const values = new Set(rooms.map((room) => room.format || room.content?.format).filter(Boolean));
    return [ALL, ...Array.from(values).sort()];
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return rooms.filter((room) => {
      const roomDifficulty = room.difficulty || room.content?.difficulty || '';
      const roomFormat = room.format || room.content?.format || '';
      const title = room.title || room.content?.title || '';
      const theme = room.theme || room.content?.theme || '';
      const matchesSearch = !normalizedSearch || `${title} ${theme}`.toLowerCase().includes(normalizedSearch);
      const matchesDifficulty = difficultyFilter === ALL || roomDifficulty === difficultyFilter;
      const matchesFormat = formatFilter === ALL || roomFormat === formatFilter;
      return matchesSearch && matchesDifficulty && matchesFormat;
    });
  }, [rooms, searchTerm, difficultyFilter, formatFilter]);

  const handleDelete = async (room: GeneratedRoom) => {
    const confirmed = window.confirm(`Delete "${room.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(room.id);
    setError('');
    setNotice('');
    try {
      await pb.collection('generated_rooms').delete(room.id);
      setRooms((prev) => prev.filter((savedRoom) => savedRoom.id !== room.id));
      if (selectedRoom?.id === room.id) setSelectedRoom(null);
      setNotice('Room deleted.');
    } catch (err) {
      setError('Failed to delete saved room. You can delete only rooms owned by your account.');
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (room: GeneratedRoom) => {
    if (!user) return;
    setDuplicatingId(room.id);
    setError('');
    setNotice('');
    try {
      const copyTitle = `Copy of ${room.title}`;
      const copyContent = {
        ...room.content,
        title: copyTitle,
      };
      const duplicated = await pb.collection('generated_rooms').create<GeneratedRoom>({
        user: user.id,
        title: copyTitle,
        theme: room.theme || room.content?.theme || '',
        difficulty: room.difficulty || room.content?.difficulty || '',
        format: room.format || room.content?.format || '',
        duration: room.duration || room.content?.duration || '',
        content: copyContent,
      });
      setRooms((prev) => [duplicated, ...prev]);
      setNotice(`Duplicated "${room.title}" as "${copyTitle}".`);
    } catch (err) {
      setError('Failed to duplicate saved room. Please try again.');
      console.error('Duplicate failed', err);
    } finally {
      setDuplicatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const difficultyColor: Record<string, string> = {
    Beginner: 'text-green-400 bg-green-500/10 border-green-500/20',
    Intermediate: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Expert: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Enthusiast-Only': 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const renderStatus = () => (
    <>
      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 no-print">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 no-print">
          <BookOpen size={18} className="text-emerald-300 shrink-0" />
          <p className="text-emerald-200 text-sm">{notice}</p>
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="mb-8 no-print">
        <h1 className="text-3xl font-bold text-white mb-2">My Rooms</h1>
        <p className="text-slate-400">Search, manage, export, duplicate, and delete your saved escape room plans.</p>
      </div>

      <TierGate requiredTier="pro" onUpgrade={onUpgrade} isUpgradeLoading={isUpgradeLoading} checkoutError={checkoutError} onNavigateLegal={onNavigateLegal}>
        {selectedRoom ? (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6 no-print">
              <button
                onClick={() => setSelectedRoom(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft size={15} />
                Back to My Rooms
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleDuplicate(selectedRoom)}
                  disabled={duplicatingId === selectedRoom.id}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm disabled:opacity-60"
                >
                  {duplicatingId === selectedRoom.id ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                  Duplicate
                </button>
                <button
                  onClick={() => void handleDelete(selectedRoom)}
                  disabled={deletingId === selectedRoom.id}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 px-3 py-2 rounded-lg text-sm disabled:opacity-60"
                >
                  {deletingId === selectedRoom.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete
                </button>
              </div>
            </div>
            {renderStatus()}
            <RoomOutput room={selectedRoom.content} />
          </div>
        ) : (
          <>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-5 no-print">
              <div className="grid md:grid-cols-4 gap-3">
                <div className="md:col-span-2 relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search title or theme..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={difficultyFilter}
                  onChange={(event) => setDifficultyFilter(event.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {difficultyOptions.map((option) => <option key={option} value={option}>{option === ALL ? 'All difficulties' : option}</option>)}
                </select>
                <select
                  value={formatFilter}
                  onChange={(event) => setFormatFilter(event.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {formatOptions.map((option) => <option key={option} value={option}>{option === ALL ? 'All formats' : option}</option>)}
                </select>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{filteredRooms.length} of {rooms.length} rooms shown</span>
                <button onClick={() => void loadRooms()} className="flex items-center gap-1.5 hover:text-cyan-300">
                  <RefreshCw size={12} />
                  Refresh library
                </button>
              </div>
            </div>

            {renderStatus()}

            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={24} className="animate-spin text-cyan-500" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-800/40 border border-slate-700 border-dashed rounded-2xl">
                <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center mb-5">
                  <BookOpen size={22} className="text-slate-500" />
                </div>
                <p className="text-slate-300 font-medium mb-1">No saved rooms yet</p>
                <p className="text-slate-500 text-sm max-w-md">Generate a room, click Save Room, then refresh or return here to manage and export the operator plan.</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-800/40 border border-slate-700 border-dashed rounded-2xl">
                <Search size={24} className="text-slate-500 mb-4" />
                <p className="text-slate-300 font-medium mb-1">No rooms match your filters</p>
                <p className="text-slate-500 text-sm">Try a different search term, difficulty, or format.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => {
                  const roomDifficulty = room.difficulty || room.content?.difficulty || '';
                  const roomFormat = room.format || room.content?.format || '';
                  const roomDuration = room.duration || room.content?.duration || '';
                  const puzzleCount = getRoomPuzzles(room.content).length;
                  return (
                    <div
                      key={room.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors group"
                    >
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className="w-full text-left px-5 py-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="text-white font-semibold leading-snug group-hover:text-cyan-400 transition-colors">
                            {room.title || room.content?.title}
                          </h3>
                          <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 shrink-0 mt-0.5 transition-colors" />
                        </div>
                        <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                          {room.theme || room.content?.theme || 'No theme saved.'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {roomDifficulty && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${difficultyColor[roomDifficulty] || 'text-slate-400 bg-slate-700 border-slate-600'}`}>
                              {roomDifficulty}
                            </span>
                          )}
                          {roomFormat && (
                            <span className="flex items-center gap-1 text-slate-400 text-xs bg-slate-700/70 border border-slate-600 rounded px-2 py-0.5">
                              <Layers size={11} />
                              {roomFormat}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-500 text-xs">
                            <Calendar size={11} />
                            {formatDate(room.created)}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500 text-xs">
                            <Users size={11} />
                            {puzzleCount} puzzles{roomDuration ? ` · ${roomDuration}` : ''}
                          </span>
                        </div>
                      </button>
                      <div className="border-t border-slate-700 px-5 py-3 flex justify-between gap-3">
                        <button
                          onClick={() => void handleDuplicate(room)}
                          disabled={duplicatingId === room.id}
                          className="flex items-center gap-1.5 text-slate-500 hover:text-cyan-300 transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          {duplicatingId === room.id ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                          Duplicate
                        </button>
                        <button
                          onClick={() => void handleDelete(room)}
                          disabled={deletingId === room.id}
                          className="flex items-center gap-1.5 text-slate-500 hover:text-red-400 transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          {deletingId === room.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </TierGate>
    </div>
  );
}
