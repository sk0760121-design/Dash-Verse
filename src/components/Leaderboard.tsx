import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, User, Edit2, Check, Globe, RefreshCw, Zap, Flame, Award, ChevronUp } from 'lucide-react';
import { sound } from '../utils/sound';

interface LeaderboardProps {
  userHighScore: number;
  onClose: () => void;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isUser?: boolean;
  avatarColor: string;
  activeCharacter: string;
}

// Initial seed players representing competitive global ranks
const DEFAULT_GLOBAL_LEADERBOARD = [
  { rank: 1, name: 'SudoBash', score: 9450, avatarColor: '#f43f5e', activeCharacter: 'Cyber Sphere' },
  { rank: 2, name: 'NeonDino_60', score: 7820, avatarColor: '#00f2ff', activeCharacter: 'Emerald Dino' },
  { rank: 3, name: 'CyberDASH', score: 6100, avatarColor: '#a855f7', activeCharacter: 'Phantom Fox' },
  { rank: 4, name: 'MatrixSpin', score: 4950, avatarColor: '#10b981', activeCharacter: 'Chrono Dino' },
  { rank: 5, name: 'PixelDancer', score: 3500, avatarColor: '#fbbf24', activeCharacter: 'Crimson Robot' },
  { rank: 6, name: 'RetroRacer', score: 2280, avatarColor: '#ec4899', activeCharacter: 'Golden Robot' },
  { rank: 7, name: 'ChronoRun', score: 1420, avatarColor: '#6366f1', activeCharacter: 'Classic Dino' },
  { rank: 8, name: 'SphereDucker', score: 850, avatarColor: '#84cc16', activeCharacter: 'Classic Dino' },
];

export const Leaderboard: React.FC<LeaderboardProps> = ({ userHighScore, onClose }) => {
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [gamerTag, setGamerTag] = useState<string>('Guest_Runner');
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [tagNameInput, setTagNameInput] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [seasonCountdown, setSeasonCountdown] = useState<string>('');

  // 1. Initialize Leaderboard & retrieve saved username/custom board details
  useEffect(() => {
    try {
      // Get or set gamer tag
      const savedGamerTag = localStorage.getItem('horizon_runner_gamertag') || 'Guest_Runner';
      setGamerTag(savedGamerTag);
      setTagNameInput(savedGamerTag);

      // Setup or load current custom records list
      const savedBoardStr = localStorage.getItem('horizon_runner_global_leaderboard');
      let currentBoard: any[] = [];
      
      if (savedBoardStr) {
        try {
          const parsed = JSON.parse(savedBoardStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentBoard = parsed;
          } else {
            currentBoard = [...DEFAULT_GLOBAL_LEADERBOARD];
          }
        } catch {
          currentBoard = [...DEFAULT_GLOBAL_LEADERBOARD];
        }
      } else {
        currentBoard = [...DEFAULT_GLOBAL_LEADERBOARD];
      }

      // Check if user's score exists, or if we need to insert/update the user's rank
      // Let's filter out any existing user record to replace it. Also filter out duplicate name matches.
      const filteredBoard = currentBoard.filter(item => !item.isUser && item.name !== savedGamerTag);
      
      // Inject user's live profile
      filteredBoard.push({
        name: savedGamerTag,
        score: typeof userHighScore === 'number' && !isNaN(userHighScore) ? userHighScore : 0,
        avatarColor: '#f59e0b', // Amber user glow color
        activeCharacter: localStorage.getItem('horizon_runner_active_char_name') || 'Your Runner',
        isUser: true,
      });

      // Sort descending by score
      filteredBoard.sort((a, b) => b.score - a.score);

      // Re-assign ranks
      const finalBoard: LeaderboardEntry[] = filteredBoard.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));

      setBoard(finalBoard);
      localStorage.setItem('horizon_runner_global_leaderboard', JSON.stringify(finalBoard));
    } catch (e) {
      console.error('Failed to parse global leaderboard records:', e);
      // Fallback
      setBoard(DEFAULT_GLOBAL_LEADERBOARD);
    }
  }, [userHighScore]);

  // 2. Track season timer ending countdown
  useEffect(() => {
    const updateSeasonTimer = () => {
      const now = new Date();
      // Emulate Season Reset occurring at end of the week (Sunday UTC midnight)
      const nextReset = new Date();
      nextReset.setUTCDate(now.getUTCDate() + (7 - now.getUTCDay()));
      nextReset.setUTCHours(23, 59, 59, 999);

      const diffMs = nextReset.getTime() - now.getTime();
      if (diffMs <= 0) {
        setSeasonCountdown('Resetting...');
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setSeasonCountdown(`${days}d ${hrs}h ${mins}m ${secs}s`);
    };

    updateSeasonTimer();
    const interval = setInterval(updateSeasonTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Submit new Gamer Tag updates
  const handleSaveGamerTag = () => {
    const freshTag = tagNameInput.trim().substring(0, 15);
    if (!freshTag) return;
    
    sound.playAchievement();
    setGamerTag(freshTag);
    setIsEditingTag(false);

    try {
      localStorage.setItem('horizon_runner_gamertag', freshTag);
      // Update global boards array
      const updatedBoard = board.map(item => {
        if (item.isUser) {
          return { ...item, name: freshTag };
        }
        return item;
      });
      setBoard(updatedBoard);
      localStorage.setItem('horizon_runner_global_leaderboard', JSON.stringify(updatedBoard));
    } catch (e) {
      console.error('Failed to save updated user profile name tag', e);
    }
  };

  const handleRefreshBoard = () => {
    setIsRefreshing(true);
    sound.playJump();
    setTimeout(() => {
      setIsRefreshing(false);
      // Randomly adjust one of the top scores slightly to simulate live rival activity
      setBoard(prev => {
        const nextBoard = prev.map(item => {
          if (!item.isUser && Math.random() > 0.65) {
            const addedScore = Math.floor(Math.random() * 25) * 10;
            return { ...item, score: item.score + addedScore };
          }
          return item;
        });
        nextBoard.sort((a, b) => b.score - a.score);
        const final = nextBoard.map((item, idx) => ({ ...item, rank: idx + 1 }));
        localStorage.setItem('horizon_runner_global_leaderboard', JSON.stringify(final));
        return final;
      });
    }, 1100);
  };

  // Resolve user percentile standing
  const userRankIndex = board.findIndex(item => item.isUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : board.length;
  const totalCompetitors = board.length || 1;
  const percentile = userRank === 1 
    ? 1 
    : Math.max(2, Math.min(99, Math.round(((userRank - 0.5) / totalCompetitors) * 100)));

  return (
    <div id="leaderboard-panel-root" className="w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/35 rounded-3xl p-4 sm:p-6 md:p-8 shadow-[0_0_60px_rgba(6,182,212,0.18)] relative overflow-hidden text-slate-100 mx-auto">
      {/* Decorative Cybernetic lights */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -z-10" />

      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[9px] uppercase font-mono text-cyan-400 font-bold tracking-widest mb-1.5">
            <Globe size={11} className="animate-spin" /> Live Sector League
          </div>
          <h1 className="text-2xl font-black tracking-tight leading-none uppercase">
            GLOBAL LEADERBOARD
          </h1>
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-1">
            Tournament Reset: <span className="text-pink-400 font-extrabold">{seasonCountdown}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={handleRefreshBoard}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition duration-150 disabled:opacity-40 cursor-pointer"
            title="Refresh database entries"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-mono font-bold uppercase rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
          >
            Close Board
          </button>
        </div>
      </div>

      {/* Profile & Gamer Tag Quick Editor */}
      <div className="bg-slate-900/60 border border-white/5 hover:border-cyan-500/20 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition duration-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <User size={20} />
          </div>
          <div>
            <span className="block text-[8px] font-mono uppercase text-slate-450 tracking-widest font-black">YOUR PILOT ALIAS</span>
            
            <AnimatePresence mode="wait">
              {!isEditingTag ? (
                <motion.div 
                  key="view-tag"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 mt-0.5"
                >
                  <span className="text-sm font-black text-amber-300 tracking-wider">
                    {gamerTag}
                  </span>
                  <button 
                    onClick={() => {
                      sound.playJump();
                      setIsEditingTag(true);
                    }}
                    className="p-1 text-slate-450 hover:text-amber-300 transition cursor-pointer"
                    title="Edit gamer tag"
                  >
                    <Edit2 size={11} />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="edit-tag"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 mt-0.5"
                >
                  <input
                    type="text"
                    value={tagNameInput}
                    onChange={(e) => setTagNameInput(e.target.value.replace(/[^a-zA-Z0-9_ -]/g, ''))}
                    className="bg-slate-950 border border-amber-500/50 rounded px-2 py-0.5 text-xs text-white uppercase focus:outline-none focus:border-amber-400 font-mono max-w-[150px]"
                    placeholder="ENTER TAG"
                    maxLength={15}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGamerTag();
                      if (e.key === 'Escape') setIsEditingTag(false);
                    }}
                  />
                  <button
                    onClick={handleSaveGamerTag}
                    className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
                    title="Confirm Name Tag"
                  >
                    <Check size={11} className="stroke-[3]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Competitive Stats */}
        <div className="flex gap-4 border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-5 self-stretch justify-between font-mono text-[10px]">
          <div>
            <span className="block text-slate-500 font-bold uppercase tracking-wide text-[8px]">YOUR BEST</span>
            <span className="score-font text-sm font-bold text-slate-200">{String(userHighScore).padStart(5, '0')}</span>
          </div>
          <div>
            <span className="block text-slate-500 font-bold uppercase tracking-wide text-[8px]">LEAGUE RANK</span>
            <span className="text-sm font-black text-cyan-400">#{userRank}</span>
          </div>
          <div>
            <span className="block text-slate-500 font-bold uppercase tracking-wide text-[8px]">RELATIVE RATE</span>
            <span className="text-sm font-black text-pink-400">TOP {percentile}%</span>
          </div>
        </div>
      </div>

      {/* Competitors List Grid */}
      <h2 className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
        Top Tournament Standings
      </h2>

      <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
        {board.map((item) => {
          let rankColorClass = 'text-slate-400';
          let borderGlow = 'border-white/5 bg-slate-950/20';
          
          if (item.rank === 1) {
            rankColorClass = 'text-yellow-400';
            borderGlow = 'border-yellow-500/25 bg-yellow-500/5 shadow-[0_0_12px_rgba(234,179,8,0.06)]';
          } else if (item.rank === 2) {
            rankColorClass = 'text-slate-350';
            borderGlow = 'border-slate-300/20 bg-slate-300/5';
          } else if (item.rank === 3) {
            rankColorClass = 'text-amber-600';
            borderGlow = 'border-amber-600/20 bg-amber-600/5';
          }

          if (item.isUser) {
            borderGlow = 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20';
          }

          return (
            <div
              key={`${item.name}-${item.rank}`}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${borderGlow}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank Digit */}
                <div className="w-6 text-center">
                  {item.rank <= 3 ? (
                    <Trophy size={16} className={`mx-auto ${rankColorClass}`} />
                  ) : (
                    <span className="text-xs font-mono font-bold text-slate-500">#{item.rank}</span>
                  )}
                </div>

                {/* Avatar dot */}
                <div 
                  className="w-3.5 h-3.5 rounded-full" 
                  style={{ backgroundColor: item.avatarColor }}
                />

                {/* Competitor Name */}
                <div className="text-left">
                  <span className={`text-xs font-bold font-sans flex items-center gap-1.5 ${
                    item.isUser ? 'text-amber-300 font-extrabold text-sm' : 'text-slate-200'
                  }`}>
                    {item.name}
                    {item.isUser && (
                      <span className="text-[7px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-black border border-amber-500/30">
                        YOU
                      </span>
                    )}
                  </span>
                  <span className="block text-[8px] font-mono text-slate-450 uppercase mt-0.5 leading-none">
                    Runner: {item.activeCharacter}
                  </span>
                </div>
              </div>

              {/* High Score figure */}
              <div className="text-right">
                <span className={`block text-xs font-extrabold font-mono score-font ${
                  item.isUser ? 'text-amber-300 text-sm' : 'text-slate-100'
                }`}>
                  {String(item.score).padStart(5, '0')}
                </span>
                <span className="block text-[8px] font-mono uppercase text-slate-500 mt-0.5 leading-none">
                  Sector Distance
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <p className="text-[9px] text-slate-550 font-mono text-center uppercase tracking-wider mt-5">
        ⚡ Climb ranks by breaking record multipliers during active run cycles!
      </p>
    </div>
  );
};
