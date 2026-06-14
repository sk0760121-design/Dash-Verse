import React from 'react';
import { Mission, GameStats } from '../types';
import { ArrowLeft, Target, Coins, ShieldCheck, Dumbbell, Sparkles } from 'lucide-react';
import { sound } from '../utils/sound';

interface MissionsPanelProps {
  stats: GameStats;
  missions: Mission[];
  onClaimReward: (missionId: string, rewardValue: number) => void;
  onClose: () => void;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({
  stats,
  missions,
  onClaimReward,
  onClose,
}) => {
  const handleClaim = (m: Mission) => {
    if (m.completed && !m.claimed) {
      onClaimReward(m.id, m.reward);
      sound.playAchievement();
    }
  };

  // Convert raw target percentages
  const getPercent = (current: number, target: number) => {
    return Math.min(100, Math.floor((current / target) * 100));
  };

  return (
    <div id="missions-root" className="glass-panel text-slate-100 p-6 rounded-2xl max-w-4xl mx-auto shadow-2xl z-10 relative">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 glass-panel hover:bg-white/10 border-white/10 hover:border-cyan-500/30 rounded-xl transition cursor-pointer flex items-center justify-center text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-widest uppercase text-pink-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.25)]">🎯 DAILY CHALLENGES</h1>
            <p className="text-[10px] text-slate-450 font-mono uppercase tracking-wider">Complete parameters to unlock premium cosmetic resources</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 glass-panel border-[#f43f5e]/30 rounded-xl font-mono text-xs uppercase tracking-widest text-[#f43f5e] font-black">
          Wallet: <span className="text-white score-font">{stats.coins}</span>
        </div>
      </div>

      {/* Quests Container */}
      <div className="space-y-4">
        {missions.map(m => {
          const percent = getPercent(m.current, m.target);
          return (
            <div
              key={m.id}
              className={`p-5 glass-panel rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition duration-200 text-left ${
                m.claimed
                  ? 'bg-black/40 border-white/5 opacity-40'
                  : 'bg-white/2 border-white/10 hover:border-cyan-400/20'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-pink-500/10 border border-pink-500/25 text-pink-400 rounded-xl">
                    {m.id === 'mission-jumps' ? <Dumbbell size={16} /> : <Target size={16} />}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-100 tracking-wide text-sm">{m.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5">{m.description}</span>
                  </div>
                </div>

                {/* Progress bar scale */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 bg-white/5 border border-white/5 h-2.5 rounded-full overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-cyan-400 h-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-150 min-w-[55px] text-right score-font">
                    {m.current} / {m.target}
                  </span>
                </div>
              </div>

              {/* Status control button */}
              <div className="flex items-center justify-end">
                {m.claimed ? (
                  <div className="text-[10px] font-mono text-slate-550 bg-white/2 px-3 py-2 rounded-lg border border-white/5 uppercase tracking-wide">
                    ✓ Claimed
                  </div>
                ) : m.completed ? (
                  <button
                    onClick={() => handleClaim(m)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-[#00f2ff] hover:from-cyan-300 hover:to-cyan-400 text-slate-950 text-xs font-black uppercase rounded-lg shadow-[0_0_15px_rgba(0,242,255,0.4)] hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] hover:-translate-y-0.5 cursor-pointer transition duration-155 active:translate-y-0"
                  >
                    <Coins size={14} /> Claim +🪙{m.reward}
                  </button>
                ) : (
                  <div className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/5 px-3 py-2 rounded-lg leading-tight uppercase tracking-wide">
                    {percent}% Complete
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
