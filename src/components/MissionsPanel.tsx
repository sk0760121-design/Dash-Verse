import React, { useState } from 'react';
import { Mission, GameStats } from '../types';
import { ArrowLeft, Target, Coins, ShieldCheck, Dumbbell, Sparkles, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { sound } from '../utils/sound';

interface MissionsPanelProps {
  stats: GameStats;
  missions: Mission[];
  onClaimReward: (missionId: string, rewardValue: number) => void;
  onClose: () => void;
}

type StatusFilter = 'all' | 'active' | 'completed' | 'claimed';
type CategoryFilter = 'all' | 'jumps' | 'coins' | 'score' | 'obstacles' | 'other';

export const MissionsPanel: React.FC<MissionsPanelProps> = ({
  stats,
  missions,
  onClaimReward,
  onClose,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  const handleClaim = (m: Mission) => {
    if (m.completed && !m.claimed) {
      onClaimReward(m.id, m.reward);
      sound.playAchievement();
    }
  };

  const getPercent = (current: number, target: number) => {
    return Math.min(100, Math.floor((current / target) * 100));
  };

  const getMissionIcon = (id: string) => {
    if (id.includes('jumps')) return <Dumbbell size={16} />;
    if (id.includes('coins') || id.includes('coin-bank')) return <Coins size={16} />;
    if (id.includes('score')) return <Sparkles size={16} />;
    if (id.includes('obstacles')) return <ShieldCheck size={16} />;
    return <Target size={16} />;
  };

  // Filter logic
  const filteredMissions = missions.filter(m => {
    // 1. Status pass
    if (statusFilter === 'active' && (m.completed || m.claimed)) return false;
    if (statusFilter === 'completed' && (!m.completed || m.claimed)) return false;
    if (statusFilter === 'claimed' && !m.claimed) return false;

    // 2. Category pass
    if (categoryFilter === 'jumps' && !m.id.includes('jumps')) return false;
    if (categoryFilter === 'coins' && !m.id.includes('coins') && !m.id.includes('coin-bank')) return false;
    if (categoryFilter === 'score' && !m.id.includes('score')) return false;
    if (categoryFilter === 'obstacles' && !m.id.includes('obstacles')) return false;
    if (categoryFilter === 'other' && (m.id.includes('jumps') || m.id.includes('coins') || m.id.includes('coin-bank') || m.id.includes('score') || m.id.includes('obstacles'))) return false;

    return true;
  });

  // Reset page when filters change to avoid out-of-bounds pages
  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
    sound.playJump();
  };

  const handleCategoryFilterChange = (filter: CategoryFilter) => {
    setCategoryFilter(filter);
    setCurrentPage(1);
    sound.playJump();
  };

  // Pagination calculation
  const totalItems = filteredMissions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedMissions = filteredMissions.slice(startIndex, startIndex + itemsPerPage);

  const nextPage = () => {
    if (activePage < totalPages) {
      setCurrentPage(activePage + 1);
      sound.playJump();
    }
  };

  const prevPage = () => {
    if (activePage > 1) {
      setCurrentPage(activePage - 1);
      sound.playJump();
    }
  };

  return (
    <div id="missions-root" className="glass-panel text-slate-100 p-4 md:p-6 rounded-2xl max-w-4xl mx-auto shadow-2xl z-10 relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 glass-panel hover:bg-white/10 border-white/10 hover:border-cyan-500/30 rounded-xl transition cursor-pointer flex items-center justify-center text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <h1 className="text-xl md:text-2xl font-black tracking-widest uppercase text-pink-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.25)]">🎯 DAILY CHALLENGES</h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Complete parameters to unlock premium cosmetic resources ({totalItems} Quest{totalItems !== 1 ? 's' : ''})</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 font-mono text-xs uppercase tracking-widest text-[#f43f5e] font-black">
          <span className="opacity-60">Wallet:</span>
          <span className="text-white score-font px-3 py-1.5 glass-panel border-[#f43f5e]/30 rounded-xl">{stats.coins} 🪙</span>
        </div>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="flex flex-col gap-3 mb-6 bg-black/20 p-3 rounded-xl border border-white/5 text-left">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-mono text-slate-450 uppercase mr-1.5 font-bold tracking-wider">Status:</span>
          {(['all', 'active', 'completed', 'claimed'] as StatusFilter[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleStatusFilterChange(tab)}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest rounded-lg cursor-pointer transition border border-transparent ${
                statusFilter === tab
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-slate-350 hover:text-white border-white/5'
              }`}
            >
              {tab === 'active' ? 'in progress' : tab}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-mono text-slate-450 uppercase mr-1.5 font-bold tracking-wider">Category:</span>
          {(['all', 'jumps', 'coins', 'score', 'obstacles', 'other'] as CategoryFilter[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleCategoryFilterChange(tab)}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest rounded-lg cursor-pointer transition border border-transparent ${
                categoryFilter === tab
                  ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]/40 shadow-inner'
                  : 'bg-white/5 hover:bg-white/10 text-slate-350 hover:text-white border-white/5'
              }`}
            >
              {tab === 'obstacles' ? 'evasion' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Quests Container */}
      <div className="space-y-3 min-h-[360px]">
        {paginatedMissions.length > 0 ? (
          paginatedMissions.map(m => {
            const percent = getPercent(m.current, m.target);
            return (
              <div
                key={m.id}
                className={`p-4 glass-panel rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition duration-200 text-left ${
                  m.claimed
                    ? 'bg-black/30 border-white/5 opacity-55'
                    : 'bg-white/2 border-white/10 hover:border-cyan-400/20'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-start gap-2.5">
                    <span className="p-2 bg-pink-500/10 border border-pink-500/25 text-pink-400 rounded-lg shrink-0 mt-0.5">
                      {getMissionIcon(m.id)}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-150 tracking-wide text-xs sm:text-sm">{m.title}</span>
                      <span className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5 leading-tight">{m.description}</span>
                    </div>
                  </div>

                  {/* Progress bar scale */}
                  <div className="mt-3.5 flex items-center gap-3">
                    <div className="flex-1 bg-white/5 border border-white/5 h-2 rounded-full overflow-hidden relative">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-cyan-400 h-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-300 min-w-[55px] text-right score-font">
                      {m.current.toLocaleString()} / {m.target.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Status control button */}
                <div className="flex items-center justify-end sm:pl-3 shrink-0">
                  {m.claimed ? (
                    <div className="text-[10px] font-mono text-slate-500 bg-white/2 px-2.5 py-1.5 rounded-lg border border-white/5 uppercase tracking-wide">
                      ✓ Claimed
                    </div>
                  ) : m.completed ? (
                    <button
                      onClick={() => handleClaim(m)}
                      className="flex items-center gap-1 px-3.5 py-2 bg-gradient-to-r from-cyan-400 to-[#00f2ff] hover:from-cyan-300 hover:to-cyan-400 text-slate-950 text-[10px] sm:text-xs font-black uppercase rounded-lg shadow-[0_0_15px_rgba(0,242,255,0.4)] hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] hover:-translate-y-0.5 cursor-pointer transition duration-155 active:translate-y-0"
                    >
                      <Coins size={12} /> Claim +🪙{m.reward}
                    </button>
                  ) : (
                    <div className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg leading-tight uppercase tracking-wide">
                      {percent}% Complete
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 border border-dashed border-white/10 rounded-xl bg-white/2">
            <Filter size={32} className="opacity-45 mb-2.5 text-pink-500/60" />
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">No challenges meet criteria</p>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">Adjust status or category filters above</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs font-mono select-none">
          <button
            onClick={prevPage}
            disabled={activePage === 1}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition ${
              activePage === 1
                ? 'opacity-30 border-white/5 text-slate-500 cursor-not-allowed'
                : 'border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ChevronLeft size={14} /> Prev
          </button>

          <span className="text-slate-450 uppercase tracking-widest font-black text-[10px]">
            Page <span className="text-pink-500 font-bold">{activePage}</span> of <span className="text-slate-300">{totalPages}</span>
          </span>

          <button
            onClick={nextPage}
            disabled={activePage === totalPages}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition ${
              activePage === totalPages
                ? 'opacity-30 border-white/5 text-slate-500 cursor-not-allowed'
                : 'border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
