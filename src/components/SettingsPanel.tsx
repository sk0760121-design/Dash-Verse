import React from 'react';
import { GameSettings } from '../types';
import { ArrowLeft, Volume2, ShieldAlert, BadgeInfo, RefreshCw, Moon, Eye } from 'lucide-react';
import { sound } from '../utils/sound';

interface SettingsPanelProps {
  settings: GameSettings;
  onUpdateSettings: (updater: (prev: GameSettings) => GameSettings) => void;
  onResetHighScore: () => void;
  onResetAllData: () => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetHighScore,
  onResetAllData,
  onClose,
}) => {

  const toggleOption = (key: keyof GameSettings) => {
    onUpdateSettings((prev: GameSettings) => {
      const val = !prev[key];
      const updated = { ...prev, [key]: val };
      sound.playJump();
      return updated;
    });
  };

  const handleDifficulty = (diff: GameSettings['difficulty']) => {
    onUpdateSettings((prev: GameSettings) => {
      const updated = { ...prev, difficulty: diff };
      sound.playJump();
      return updated;
    });
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    onUpdateSettings((prev: GameSettings) => ({ ...prev, volume: vol }));
  };

  const executeResetHighScore = () => {
    if (confirm('Are you absolutely sure you want to clear your high score? This cannot be undone.')) {
      onResetHighScore();
      sound.playHit();
    }
  };

  const executeResetAllData = () => {
    if (confirm('Are you absolutely sure you want to clear ALL character unlocks, collected skins, quests, and scores? The game will factory reset.')) {
      onResetAllData();
      sound.playHit();
    }
  };

  return (
    <div id="settings-root" className="glass-panel text-slate-100 p-6 rounded-2xl max-w-2xl mx-auto shadow-2xl z-10 relative">
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
            <h1 className="text-2xl font-black tracking-widest uppercase text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.25)]">🔧 CALIBRATION HUB</h1>
            <p className="text-[10px] text-slate-450 font-mono uppercase tracking-wider">Personalize acoustics, pacing loops, and system profiles</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-left">
        {/* Core Audio Panel */}
        <div className="glass-panel bg-white/2 border-white/5 p-4 rounded-xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#00f2ff] mb-4 flex items-center gap-2">
            <Volume2 size={16} /> SOUND SYSTEMS &amp; ACOUSTICS
          </h2>
          
          <div className="space-y-4">
            {/* Audio Toggle Checks */}
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex-1 flex items-center justify-between p-3 glass-panel bg-white/1 border-white/5 rounded-lg cursor-pointer hover:border-[#00f2ff]/30 select-none transition">
                <div>
                  <span className="block text-sm font-semibold text-slate-200">Musics Loop</span>
                  <span className="block text-[11px] text-slate-400 font-mono">Procedural chiptune engine</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.musicEnabled}
                  onChange={() => toggleOption('musicEnabled')}
                  className="accent-cyan-400 h-4 w-4 rounded cursor-pointer"
                />
              </label>

              <label className="flex-1 flex items-center justify-between p-3 glass-panel bg-white/1 border-white/5 rounded-lg cursor-pointer hover:border-[#00f2ff]/30 select-none transition">
                <div>
                  <span className="block text-sm font-semibold text-slate-200">Acoustic Effects</span>
                  <span className="block text-[11px] text-slate-400 font-mono">Jump, Coin &amp; Hit synthesis</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={() => toggleOption('soundEnabled')}
                  className="accent-cyan-400 h-4 w-4 rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Master slider */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 tracking-wider mb-2">
                <span>MASTER GAIN VOLUMES:</span>
                <span className="score-font text-white">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={settings.volume}
                onChange={handleVolume}
                className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Pace & Difficulty Setup */}
        <div className="glass-panel bg-white/2 border-white/5 p-4 rounded-xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#00f2ff] mb-4 flex items-center gap-2">
            <RefreshCw size={16} /> REFRESH PACING DIFFICULTY
          </h2>
          
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => handleDifficulty(diff)}
                className={`py-2 px-3 border rounded-xl text-xs font-mono font-black uppercase transition duration-150 cursor-pointer capitalize ${
                  settings.difficulty === diff
                    ? 'bg-cyan-400 border-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                    : 'bg-white/2 border-white/5 text-slate-400 hover:text-slate-100 hover:border-slate-705'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 font-mono mt-2.5 uppercase tracking-wide">
            * Easy limits speed to 11.0 &bull; Hard forces starting speed at 8.0 up to 16.5 max.
          </p>
        </div>

        {/* Accessible parameters */}
        <div className="glass-panel bg-white/2 border-white/5 p-4 rounded-xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#00f2ff] mb-4 flex items-center gap-2">
            <Eye size={16} /> ACCESSIBILITY MODES
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Reduce Motion */}
            <label className="flex-1 flex items-center justify-between p-3 glass-panel bg-white/1 border-white/5 rounded-lg cursor-pointer hover:border-[#00f2ff]/30 select-none transition">
              <div>
                <span className="block text-sm font-semibold text-slate-200">Reduce Motion</span>
                <span className="block text-[11px] text-slate-400 font-mono">Skip dust and sparkles</span>
              </div>
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={() => toggleOption('reduceMotion')}
                className="accent-cyan-400 h-4 w-4 rounded cursor-pointer"
              />
            </label>

            {/* Contrast Preset Mode */}
            <label className="flex-1 flex items-center justify-between p-3 glass-panel bg-white/1 border-white/5 rounded-lg cursor-pointer hover:border-[#00f2ff]/30 select-none transition">
              <div>
                <span className="block text-sm font-semibold text-slate-200">Static Day Theme</span>
                <span className="block text-[11px] text-slate-400 font-mono">Disable real-time lighting changes</span>
              </div>
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={() => toggleOption('darkMode')}
                className="accent-cyan-400 h-4 w-4 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Reset Database triggers */}
        <div className="glass-panel bg-rose-950/5 border-rose-500/20 p-4 rounded-xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#f43f5e]/80 mb-4 flex items-center gap-2">
            <ShieldAlert size={16} /> DANGEROUS RECOVERY OPERATIONS
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={executeResetHighScore}
              className="flex-1 py-1.5 px-4 rounded-xl bg-transparent border-dashed border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/10 text-rose-300 font-mono text-xs uppercase font-extrabold cursor-pointer transition active:translate-y-0.5"
            >
              Reset High Score
            </button>
            <button
              onClick={executeResetAllData}
              className="flex-1 py-1.5 px-4 rounded-xl bg-transparent border-dashed border border-rose-500/40 hover:border-rose-500 hover:bg-rose-500/15 text-rose-450 hover:text-rose-400 font-mono text-xs uppercase font-black cursor-pointer transition active:translate-y-0.5"
            >
              Master Factory Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
