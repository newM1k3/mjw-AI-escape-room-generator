import { useState, useEffect } from 'react';
import { BookOpen, Trash2, Calendar, Users, ChevronRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import TierGate from '../components/TierGate';
import RoomOutput from '../components/RoomOutput';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pocketbase';
import type { GeneratedRoom } from '../types';

interface SavedRoomsPageProps {
  onUpgrade: () => void;
}

export default function SavedRoomsPage({ onUpgrade }: SavedRoomsPageProps) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<GeneratedRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<GeneratedRoom | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadRooms = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const records = await pb.collection('generated_rooms').getFullList<GeneratedRoom>({
        filter: `user = "${user.id}"`,
        sort: '-created',
      });
      setRooms(records);
    } catch (err) {
      setError('Failed to load saved rooms.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await pb.collection('generated_rooms').delete(id);
      setRooms((prev) => prev.filter((r) => r.id !== id));
      if (selectedRoom?.id === id) setSelectedRoom(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Rooms</h1>
        <p className="text-slate-400">Your saved escape room puzzle flows.</p>
      </div>

      <TierGate requiredTier="pro" onUpgrade={onUpgrade}>
        {selectedRoom ? (
          <div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm"
            >
              <ArrowLeft size={15} />
              Back to My Rooms
            </button>
            <RoomOutput room={selectedRoom.content} showActions={false} />
          </div>
        ) : (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={24} className="animate-spin text-cyan-500" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4">
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center mb-5">
                  <BookOpen size={22} className="text-slate-500" />
                </div>
                <p className="text-slate-400 font-medium mb-1">No saved rooms yet</p>
                <p className="text-slate-600 text-sm">Generate a room and save it to see it here.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
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
                          {room.title}
                        </h3>
                        <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                        {room.theme}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${difficultyColor[room.difficulty] || 'text-slate-400 bg-slate-700 border-slate-600'}`}>
                          {room.difficulty}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <Calendar size={11} />
                          {formatDate(room.created)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <Users size={11} />
                          {room.content?.puzzles?.length || 0} puzzles
                        </span>
                      </div>
                    </button>
                    <div className="border-t border-slate-700 px-5 py-3 flex justify-end">
                      <button
                        onClick={() => handleDelete(room.id)}
                        disabled={deletingId === room.id}
                        className="flex items-center gap-1.5 text-slate-600 hover:text-red-400 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        {deletingId === room.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </TierGate>
    </div>
  );
}
