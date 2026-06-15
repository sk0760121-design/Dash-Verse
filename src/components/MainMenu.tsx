import React from 'react';
import { GameStats, Mission, GameSettings } from '../types';
import { Play, Sparkles, ShoppingBag, Award, Settings, Info, Dumbbell, Flame, Maximize2, Minimize2, Gift, Trophy } from 'lucide-react';

interface MainMenuProps {
  stats: GameStats;
  missions: Mission[];
  settings: GameSettings;
  onPlay: () => void;
  onOpenSection: (section: 'shop' | 'achievements' | 'missions' | 'settings' | 'credits' | 'daily-bonus' | 'leaderboard') => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  stats,
  missions,
  settings,
  onPlay,
  onOpenSection,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const activeMissionsCount = missions.filter(m => m.completed && !m.claimed).length;

  return (
    <div id="main-menu-root" className="flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 text-slate-100 max-w-4xl mx-auto z-10 relative w-full">
      {/* Fullscreen Button in main lobby */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute -top-1 md:-top-4 right-1 flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-white/10 hover:border-cyan-500/30 rounded-full text-[10px] uppercase font-mono text-slate-350 hover:text-white transition duration-200 active:scale-95 shadow-md cursor-pointer"
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
        </button>
      )}
      {/* Title Header Screen */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[10px] uppercase font-mono text-cyan-400 font-bold tracking-widest mb-3 animate-pulse">
          <Flame size={12} className="animate-bounce" /> IMMErSIVE HORIZON v1.2
        </div>
        <h1 
          id="main-title" 
          className="text-3xl sm:text-6xl md:text-8xl font-sans font-black tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 uppercase filter drop-shadow-[0_0_15px_rgba(0,242,255,0.3)]"
        >
          DASH VERSE
        </h1>
        <p className="text-xs md:text-sm text-slate-400 font-mono mt-2 uppercase tracking-[0.4em] text-cyan-400/80">
          Endless running through the digital skyline
        </p>
      </div>

      {/* Grid of Key Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full mb-4">
        {/* Play Hero Button (Large Call To Action with glass details & neon border) */}
        <button
          id="btn-main-play"
          onClick={onPlay}
          className="md:col-span-2 group relative flex flex-col justify-between items-start overflow-hidden bg-gradient-to-br from-[#00f2ff]/20 to-pink-500/10 border-2 border-cyan-400/50 hover:border-cyan-400 text-slate-100 font-sans p-6 rounded-2xl shadow-[0_0_20px_rgba(0,242,255,0.2)] hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer min-h-[190px]"
        >
          <div className="absolute right-[-40px] top-[-40px] opacity-10 text-cyan-400 transform rotate-12 transition-transform duration-700 group-hover:rotate-45 group-hover:scale-125">
            <Play size={180} />
          </div>
          <div className="flex justify-between items-center w-full z-10">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-cyan-400 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded">
              SYSTEM ONLINE
            </span>
            <div className="w-8 h-8 rounded-full bg-cyan-400/10 border border-cyan-500/20 flex items-center justify-center font-mono text-xs text-cyan-300">
              60S
            </div>
          </div>
          
          <div className="z-10 mt-6 text-left">
            <span className="block text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-200">RUN DINO</span>
            <span className="block text-[10px] font-mono opacity-60 mt-1 uppercase tracking-wider">
              Keyboard Space &bull; Swipe gestures enabled
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-cyan-300 border-b border-b-cyan-500/30 pb-0.5 mt-2 group-hover:translate-x-1.5 transition-transform z-10">
            Click to start <Play size={12} className="fill-current inline ml-1 text-cyan-300" />
          </div>
        </button>

        {/* High Score / Stats Summary Widget */}
        <div 
          onClick={() => onOpenSection('leaderboard')}
          className="glass-panel border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-400/40 transition-all duration-300 cursor-pointer shadow-xl min-h-[190px] group"
        >
          <div className="flex justify-between items-start text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-bold">
            <span>HIGH RECORD</span>
            <Trophy size={16} className="text-cyan-400 group-hover:animate-bounce" />
          </div>
          <div className="my-3 text-left">
            <span className="text-3xl font-mono font-bold text-slate-100 score-font tracking-widest">
              {String(stats.highScore).padStart(5, '0')}
            </span>
            <span className="block text-[10px] font-mono text-slate-450 mt-1.5 uppercase tracking-wider">Distance: {Math.floor(stats.highScore / 10)}m</span>
          </div>
          <div className="text-xs text-cyan-350 font-mono flex items-center gap-1 group-hover:translate-x-1.5 transition-transform uppercase tracking-wider">
            Leaderboard →
          </div>
        </div>

        {/* Bank Funds Widget */}
        <div 
          onClick={() => onOpenSection('shop')}
          className="glass-panel border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-pink-500/40 transition-all duration-300 cursor-pointer shadow-xl min-h-[190px] group"
        >
          <div className="flex justify-between items-start text-[10px] uppercase tracking-widest font-mono text-pink-500 font-bold">
            <span>COINS BANK</span>
            <ShoppingBag size={16} className="text-pink-400 group-hover:animate-bounce" />
          </div>
          <div className="my-3 text-left">
            <span id="main-menu-coins-val" className="text-4xl font-mono font-extrabold text-amber-300 flex items-center gap-1.5 justify-start score-font">
              🪙{stats.coins}
            </span>
            <span className="block text-[10px] font-mono text-slate-450 mt-1.5 uppercase tracking-wider">SAVINGS ACTIVE</span>
          </div>
          <div className="text-xs text-pink-400 font-mono flex items-center gap-1 group-hover:translate-x-1.5 transition-transform uppercase tracking-wider">
            Go to Shop →
          </div>
        </div>
      </div>

      {/* Primary Panels Drawer */}
      <h2 className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-[0.3em] text-left w-full mt-10 mb-5 border-b border-white/5 pb-2">
        Sub-Systems &amp; Database Configs
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 w-full">
        {/* Shop Button */}
        <button
          onClick={() => onOpenSection('shop')}
          className="flex items-center gap-3 glass-panel hover:bg-white/5 border-white/15 hover:border-cyan-500/30 transition-all duration-200 p-4 rounded-xl text-left font-sans cursor-pointer group"
        >
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 group-hover:bg-amber-500 group-hover:text-amber-950 transition-colors">
            <ShoppingBag size={18} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Catalog Shop</span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Players &amp; Trails</span>
          </div>
        </button>

        {/* Achievements Page */}
        <button
          onClick={() => onOpenSection('achievements')}
          className="flex items-center gap-3 glass-panel hover:bg-white/5 border-white/15 hover:border-cyan-500/30 transition-all duration-200 p-4 rounded-xl text-left font-sans cursor-pointer group"
        >
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400 group-hover:bg-sky-500 group-hover:text-sky-950 transition-colors">
            <Award size={18} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Achievements</span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Rewards unlocked</span>
          </div>
        </button>

        {/* Global Leaderboard Button */}
        <button
          onClick={() => onOpenSection('leaderboard')}
          className="flex items-center gap-3 glass-panel hover:bg-white/5 border-white/15 hover:border-cyan-500/30 transition-all duration-200 p-4 rounded-xl text-left font-sans cursor-pointer group"
        >
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 group-hover:bg-cyan-500 group-hover:text-cyan-950 transition-colors">
            <Trophy size={18} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Global Ranks</span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Live Sector DB</span>
          </div>
        </button>

        {/* Daily Missions */}
        <button
          onClick={() => onOpenSection('missions')}
          className="relative flex items-center gap-3 glass-panel hover:bg-white/5 border-white/15 hover:border-cyan-500/30 transition-all duration-200 p-4 rounded-xl text-left font-sans cursor-pointer group"
        >
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 group-hover:bg-rose-500 group-hover:text-rose-950 transition-colors">
            <Dumbbell size={18} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Daily Quests</span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Complete &amp; Claim</span>
          </div>
          {activeMissionsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-[10px] text-white font-mono font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-[0_0_10px_#ef4444]">
              {activeMissionsCount}
            </span>
          )}
        </button>

        {/* Daily Bonus Portal */}
        <button
          onClick={() => onOpenSection('daily-bonus')}
          className="flex items-center gap-3 glass-panel hover:bg-white/5 border-white/15 hover:border-cyan-500/30 transition-all duration-200 p-4 rounded-xl text-left font-sans cursor-pointer group"
        >
          <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 group-hover:bg-yellow-500 group-hover:text-yellow-950 transition-colors">
            <Gift size={18} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Daily Bonus</span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Claim Loyalty</span>
          </div>
        </button>

        {/* Core Game Settings */}
        <button
          onClick={() => onOpenSection('settings')}
          className="flex items-center gap-3 glass-panel hover:bg-white/5 border-white/15 hover:border-cyan-500/30 transition-all duration-200 p-4 rounded-xl text-left font-sans cursor-pointer group"
        >
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 group-hover:bg-emerald-500 group-hover:text-emerald-950 transition-colors">
            <Settings size={18} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Settings DB</span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Sound, Diff, Reset</span>
          </div>
        </button>

        {/* Credits Page */}
        <button
          onClick={() => onOpenSection('credits')}
          className="flex items-center gap-3 glass-panel hover:bg-white/5 border-white/15 hover:border-cyan-500/30 transition-all duration-200 p-4 rounded-xl text-left font-sans cursor-pointer group"
        >
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 group-hover:bg-purple-500 group-hover:text-purple-950 transition-colors">
            <Info size={18} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-200">Credits Info</span>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Acoustic Synth</span>
          </div>
        </button>
      </div>

      {/* Accessible Help Footer Guide info */}
      <div className="mt-8 text-center text-xs text-slate-500 font-mono flex flex-col md:flex-row justify-center items-center gap-4 border-t border-slate-900 pt-6">
        <span>⌨️ DESKTOP: [Space/W/Up] Jump &bull; [S/Down] Duck &bull; [P] Pause</span>
        <span className="hidden md:inline text-slate-700">|</span>
        <span>📱 MOBILE: Tap Buttons or Up/Down Swipes</span>
      </div>
    </div>
  );
};
