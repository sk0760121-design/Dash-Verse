import React from 'react';
import { GameState, GameStats, GameSettings } from '../types';
import { Pause, Play, RotateCcw, Home, Settings, Coins, Trophy, Award, Maximize2, Minimize2 } from 'lucide-react';

interface HUDProps {
  gameState: GameState;
  stats: GameStats;
  settings: GameSettings;
  onPauseToggle: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onOpenSettings: () => void;
  onJumpStart: () => void;
  onDuckStart: (active: boolean) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  gameState,
  stats,
  settings,
  onPauseToggle,
  onRestart,
  onMainMenu,
  onOpenSettings,
  onJumpStart,
  onDuckStart,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  return (
    <div id="game-hud-overlay" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 select-none">
      
      {/* Top indicators row */}
      <div className="flex justify-between items-start w-full pointer-events-auto">
        {/* Score & Coins indicators */}
        <div className="flex flex-wrap gap-2.5 sm:gap-4 items-center">
          <div className="glass-panel rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 flex flex-col justify-center min-w-[100px] sm:min-w-[130px] shadow-lg border-cyan-500/30">
            <span className="text-[9px] uppercase tracking-widest text-cyan-400 font-black leading-none mb-1">SCORE / DIST</span>
            <span id="hud-score-val" className="text-xl sm:text-2xl font-bold score-font text-slate-100">
              {String(gameState.score).padStart(6, '0')}<span className="text-xs text-white/40 ml-0.5">m</span>
            </span>
          </div>

          <div className="glass-panel rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 flex flex-col justify-center shadow-lg border-pink-500/30">
            <span className="text-[9px] uppercase tracking-widest text-[#f43f5e] font-black leading-none mb-1">COINS</span>
            <div className="flex items-center gap-2">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] animate-pulse"></div>
              <span id="hud-coins-val" className="text-lg sm:text-xl font-bold score-font text-amber-300">
                {gameState.coinsCollectedThisRun}
              </span>
            </div>
          </div>

          {gameState.multiplier && gameState.multiplier > 1 && (
            <div className="glass-panel rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 flex flex-col justify-center shadow-lg border-[#00f2ff]/40 bg-[#00f2ff]/10 animate-pulse transition-all duration-300">
              <span className="text-[9px] uppercase tracking-widest text-[#00f2ff] font-black leading-none mb-1 font-mono">COMBO MULTIPLIER</span>
              <div className="flex items-center gap-2">
                <span id="hud-multiplier-val" className="text-lg sm:text-xl font-black score-font text-cyan-300 drop-shadow-[0_0_10px_rgba(0,242,255,0.4)]">
                  {gameState.multiplier}x
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                  ({gameState.consecutivePerfectJumps} PERFECT!)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* High Score & Controls row */}
        <div className="flex gap-3 items-center">
          <div className="hidden sm:flex glass-panel px-5 py-2.5 rounded-xl flex-col justify-center shadow-lg border-white/10">
            <span className="text-[9px] uppercase tracking-widest text-white/50 font-black leading-none mb-1 font-mono">BEST RECORD</span>
            <span className="text-lg font-bold score-font text-white/80">
              {String(stats.highScore).padStart(6, '0')}
            </span>
          </div>

          {/* Fullscreen Trigger */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="w-12 h-12 glass-panel rounded-full flex items-center justify-center cursor-pointer border-cyan-500/30 text-white hover:bg-white/15 transition duration-200 active:scale-95 shadow-[0_0_15px_rgba(0,242,255,0.15)] bg-slate-900/40"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Pause Trigger - Circle Button matching the Immersive theme */}
          {!gameState.isGameOver && !gameState.isCountingDown && (
            <button
              onClick={onPauseToggle}
              className="w-12 h-12 glass-panel rounded-full flex items-center justify-center cursor-pointer border-cyan-500/30 text-white hover:bg-white/15 transition duration-200 active:scale-95 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
            >
              {gameState.isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
            </button>
          )}

          {/* Quick Settings overlay */}
          {(gameState.isPaused || gameState.isGameOver) && (
            <button
              onClick={onOpenSettings}
              className="w-12 h-12 glass-panel rounded-full flex items-center justify-center cursor-pointer border-white/10 text-slate-350 hover:text-white transition duration-200 active:scale-95"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Center overlays: Countdown, Pause screen, Game Over portal */}
      <div className={`flex-1 flex items-center justify-center ${(gameState.isPaused || gameState.isGameOver) ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        
        {/* 1. Interactive countdown overlay */}
        {gameState.isCountingDown && (
          <div className="animate-ping flex flex-col items-center justify-center">
            <span className="text-7xl font-mono font-black text-amber-400 drop-shadow-md">
              {gameState.countdown === 0 ? 'GO!' : gameState.countdown}
            </span>
          </div>
        )}

        {/* 2. Paused Screen Backdrop Overlay */}
        {gameState.isPaused && (
          <div className="glass-panel text-slate-100 p-6 rounded-2xl flex flex-col items-center w-full max-w-xs shadow-2xl border-cyan-500/30 neon-border space-y-4">
            <h2 className="text-xl font-sans font-black uppercase text-cyan-400 tracking-wider animate-pulse">GAME PAUSED</h2>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              Current distance: <span className="text-slate-100 font-bold">{gameState.distance}m</span>
            </div>
            
            <button
              id="btn-hud-resume"
              onClick={onPauseToggle}
              className="w-full py-2.5 bg-[#00f2ff] hover:bg-[#3bf9ff] text-slate-950 font-sans font-extrabold pb-3 pt-2 text-md uppercase rounded-xl transition duration-200 shadow-[0_0_15px_rgba(0,242,255,0.4)] hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] cursor-pointer"
            >
              Resume Game
            </button>
            
            <button
              onClick={onRestart}
              className="w-full py-2.5 glass-panel bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-sans font-semibold uppercase rounded-xl transition cursor-pointer"
            >
              Restart Run
            </button>
            <button
              onClick={onMainMenu}
              className="w-full py-2 bg-transparent hover:bg-white/5 border border-white/5 text-slate-400 hover:text-slate-150 font-sans font-medium text-xs uppercase rounded-xl transition cursor-pointer"
            >
              Back to Lobby
            </button>
          </div>
        )}

        {/* 3. Game Over Screen Overlay Panel */}
        {gameState.isGameOver && (
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-center w-full max-w-sm shadow-2xl border-[#f43f5e]/30 space-y-6">
            <div className="text-center">
              <span className="inline-block text-[9px] uppercase font-mono tracking-widest text-[#f43f5e] font-black px-2.5 py-1 bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-full animate-bounce mb-2">
                RUN COMPLETED
              </span>
              <h2 id="hud-game-over-title" className="text-4xl font-sans font-black text-[#f43f5e] uppercase tracking-tight filter drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">GAME OVER</h2>
            </div>

            {/* Score Grid indicators */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="glass-panel p-3 rounded-xl border-white/5 text-center bg-white/2">
                <span className="block text-[9px] leading-tight font-mono text-slate-450 uppercase tracking-wider mb-1">SCORE</span>
                <span id="game-over-score-val" className="text-2xl font-mono font-bold text-slate-100 score-font">{gameState.score}</span>
              </div>
              <div className="glass-panel p-3 rounded-xl border-white/5 text-center bg-white/2">
                <span className="block text-[9px] leading-tight font-mono text-slate-450 uppercase tracking-wider mb-1">HIGH RECORD</span>
                <span id="game-over-best-val" className="text-2xl font-mono font-bold text-amber-400 score-font">{stats.highScore}</span>
              </div>
              <div className="col-span-2 glass-panel bg-gradient-to-r from-amber-500/5 to-amber-500/10 p-3 rounded-xl border-amber-500/15 text-center flex items-center justify-center gap-3">
                <Coins className="text-amber-400 animate-pulse" size={20} />
                <div className="text-left">
                  <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">COINS EARNED</span>
                  <span id="game-over-coins-val" className="text-lg font-mono font-black text-amber-300 score-font">+{gameState.coinsCollectedThisRun}</span>
                </div>
              </div>
            </div>

            {/* Game Over Actions Row */}
            <div className="w-full space-y-3 font-sans">
              <button
                id="btn-hud-restart"
                onClick={onRestart}
                className="w-full py-3 bg-[#f43f5e] hover:bg-[#ff5573] text-slate-950 font-black uppercase rounded-xl transition duration-200 shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:shadow-[0_0_20px_rgba(244,63,94,0.6)] cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Play Again
              </button>
              
              <button
                _id="btn-hud-menu"
                onClick={onMainMenu}
                className="w-full py-2.5 glass-panel bg-white/5 hover:bg-white/10 text-slate-350 hover:text-slate-100 font-semibold uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Home size={16} /> Return To Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Virtual Controls for Mobile layout accessibility */}
      {!gameState.isPaused && !gameState.isGameOver && !gameState.isCountingDown && (
        <div id="hud-virtual-buttons" className="flex justify-between items-center w-full pointer-events-auto gap-3 pt-2 pb-1">
          {/* Jump Controller */}
          <button
            onTouchStart={onJumpStart}
            onClick={onJumpStart}
            className="flex-1 active:scale-95 h-12 bg-slate-900/65 active:bg-cyan-500/20 backdrop-blur-xs border border-slate-800 active:border-cyan-500/50 rounded-xl select-none flex flex-col justify-center items-center font-sans font-black text-cyan-400/80 cursor-pointer transition shadow-md lg:hidden"
          >
            <span className="text-sm font-bold tracking-tight uppercase">JUMP</span>
            <span className="text-[8px] font-mono text-slate-500 uppercase">TAP SCREEN / SWIPE UP</span>
          </button>

          {/* Duck Controller */}
          <button
            onTouchStart={() => onDuckStart(true)}
            onTouchEnd={() => onDuckStart(false)}
            onMouseDown={() => onDuckStart(true)}
            onMouseUp={() => onDuckStart(false)}
            onMouseLeave={() => onDuckStart(false)}
            className="flex-1 active:scale-95 h-12 bg-slate-900/65 active:bg-orange-500/20 backdrop-blur-xs border border-slate-800 active:border-orange-500/50 rounded-xl select-none flex flex-col justify-center items-center font-sans font-black text-orange-400/80 cursor-pointer transition shadow-md lg:hidden"
          >
            <span className="text-sm font-bold tracking-tight uppercase">DUCK</span>
            <span className="text-[8px] font-mono text-slate-500 uppercase">HOLD / SWIPE DOWN</span>
          </button>
        </div>
      )}
    </div>
  );
};
