import React from 'react';
import { Achievement } from '../types';
import { ArrowLeft, Award, Trophy, ShieldCheck, Zap, Coins, CircleCheck } from 'lucide-react';

interface AchievementsListProps {
  achievements: Achievement[];
  onClose: () => void;
}

export const AchievementsList: React.FC<AchievementsListProps> = ({ achievements, onClose }) => {
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // Custom icon map referencing clean lucide structures
  const getIcon = (id: string, unlocked: boolean) => {
    const col = unlocked ? 'text-amber-400' : 'text-slate-600';
    switch (id) {
      case 'first-jump':
        return <Zap className={col} size={24} />;
      case 'first-coin':
        return <Coins className={col} size={24} />;
      case 'score-100':
        return <Trophy className={col} size={24} />;
      case 'score-500':
        return <Award className={col} size={24} />;
      case 'score-1000':
        return <Trophy className={col} size={24} />;
      case 'score-5000':
        return <Trophy className={col} size={24} />;
      case 'coin-collector':
        return <Coins className={col} size={24} />;
      case 'perfect-runner':
        return <ShieldCheck className={col} size={24} />;
      default:
        return <Award className={col} size={24} />;
    }
  };

  return (
    <div id="achievements-root" className="glass-panel text-slate-100 p-4 sm:p-6 rounded-2xl max-w-4xl mx-auto shadow-2xl z-10 relative">
      {/* Header Panel */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 glass-panel hover:bg-white/10 border-white/10 hover:border-cyan-500/30 rounded-xl transition cursor-pointer flex items-center justify-center text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-widest uppercase text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.25)]">🏆 ACHIEVEMENTS</h1>
            <p className="text-[10px] text-slate-450 font-mono uppercase tracking-wider">Completed milestones in your endless electronic sprint</p>
          </div>
        </div>

        {/* Counter */}
        <div className="glass-panel border-indigo-500/20 px-4 py-2 rounded-xl text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
          🏆 <span className="score-font text-white">{unlockedCount} / {achievements.length}</span> UNLOCKED
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {achievements.map(ach => (
          <div
            key={ach.id}
            className={`flex items-center gap-4 p-4 rounded-xl glass-panel transition duration-200 ${
              ach.unlocked
                ? 'border-indigo-400/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 shadow-md shadow-indigo-500/2'
                : 'border-white/5 opacity-40 hover:opacity-50'
            }`}
          >
            {/* Visual Icon Container */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                ach.unlocked
                  ? 'bg-indigo-500/10 border-indigo-500/35 text-[#00f2ff]'
                  : 'bg-white/2 border-white/5 text-slate-600'
              }`}
            >
              {getIcon(ach.id, ach.unlocked)}
            </div>

            {/* Achievement details */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <span className={`font-bold tracking-wide text-sm ${ach.unlocked ? 'text-slate-100' : 'text-slate-500 line-through'}`}>
                  {ach.title}
                </span>
                {ach.unlocked && <CircleCheck size={14} className="text-emerald-400 inline" />}
              </div>
              <p className="text-[11px] text-slate-450 font-mono mt-0.5 leading-tight">{ach.description}</p>
              {ach.unlocked && ach.unlockedAt && (
                <span className="block text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-wider">
                  Unlocked: {new Date(ach.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
