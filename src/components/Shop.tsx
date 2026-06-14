import React, { useState } from 'react';
import { Character, Trail, GameTheme, GameStats } from '../types';
import { ArrowLeft, Coins, Check, Lock, Sparkles, User, Palette } from 'lucide-react';
import { sound } from '../utils/sound';

interface ShopProps {
  stats: GameStats;
  characters: Character[];
  trails: Trail[];
  themes: GameTheme[];
  activeCharacterId: string;
  activeTrailId: string;
  activeThemeId: string;
  onSelectItem: (type: 'character' | 'trail' | 'theme', id: string) => void;
  onPurchaseItem: (type: 'character' | 'trail' | 'theme', id: string, cost: number) => void;
  onClose: () => void;
}

export const Shop: React.FC<ShopProps> = ({
  stats,
  characters,
  trails,
  themes,
  activeCharacterId,
  activeTrailId,
  activeThemeId,
  onSelectItem,
  onPurchaseItem,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'trails' | 'themes'>('characters');

  const handlePurchase = (type: 'character' | 'trail' | 'theme', id: string, cost: number) => {
    if (stats.coins >= cost) {
      onPurchaseItem(type, id, cost);
      sound.playCoin();
    } else {
      // play negative buzzer buzz
      sound.playHit();
    }
  };

  const handleSelect = (type: 'character' | 'trail' | 'theme', id: string) => {
    onSelectItem(type, id);
    sound.playJump();
  };

  return (
    <div id="shop-container" className="glass-panel text-slate-100 p-6 rounded-2xl max-w-4xl mx-auto shadow-2xl z-10 relative">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 glass-panel hover:bg-white/10 border-white/10 hover:border-cyan-500/30 rounded-xl transition cursor-pointer flex items-center justify-center text-slate-350 hover:text-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-widest flex items-center gap-2 uppercase text-cyan-400 drop-shadow-[0_0_10px_rgba(0,242,255,0.2)]">
              🛒 COSMIC CATALOG
            </h1>
            <p className="text-[10px] text-slate-450 font-mono uppercase tracking-wider">Unlock premium cosmetics and parallax presets</p>
          </div>
        </div>

        {/* Dynamic coin wallet display */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#f43f5e]/5 border border-[#f43f5e]/20 rounded-xl shadow-inner shadow-black animate-pulse">
          <Coins className="text-[#f43f5e] animate-bounce" size={18} />
          <span className="font-mono text-[10px] uppercase font-black text-rose-450 tracking-wider">COINS BANK:</span>
          <span id="shop-wallet-val" className="font-mono text-base font-extrabold text-amber-400 score-font">🪙{stats.coins}</span>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-white/5 mb-6 font-sans text-xs tracking-wider uppercase font-bold">
        <button
          onClick={() => setActiveTab('characters')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition cursor-pointer ${
            activeTab === 'characters'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User size={14} /> Runners
        </button>
        <button
          onClick={() => setActiveTab('trails')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition cursor-pointer ${
            activeTab === 'trails'
              ? 'border-pink-500 text-pink-400 bg-pink-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={14} /> Trails
        </button>
        <button
          onClick={() => setActiveTab('themes')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition cursor-pointer ${
            activeTab === 'themes'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette size={14} /> Sky Themes
        </button>
      </div>

      {/* Dynamic Item Cards Grid */}
      {activeTab === 'characters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map(char => {
            const isEquipped = activeCharacterId === char.id;
            const canAfford = stats.coins >= char.cost;
            return (
              <div
                key={char.id}
                className={`relative flex items-center justify-between p-4 glass-panel rounded-xl transition duration-200 ${
                  isEquipped ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/10 hover:border-cyan-400/30 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Procedural Canvas thumbnail simulation */}
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center border shadow-inner transition-transform"
                    style={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: isEquipped ? char.color : '#1e293b' 
                    }}
                  >
                    {/* Render minimal simulated block style */}
                    <div 
                      className={`w-8 h-8 rounded ${char.runnerType === 'sphere' ? 'rounded-full scale-95' : ''}`}
                      style={{ backgroundColor: char.color }}
                    />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-slate-100 text-base">{char.name}</span>
                    <span className="block text-xs font-mono text-slate-400 mb-1">{char.description}</span>
                    {char.runnerType === 'classic_dino' && (
                      <span className="inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                        No Double Jump
                      </span>
                    )}
                    {char.runnerType !== 'classic_dino' && (
                      <span className="inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 bg-sky-500/10 text-sky-400 rounded">
                        Double Jump OK
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {char.unlocked ? (
                    isEquipped ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-amber-950 rounded-lg text-xs font-bold uppercase">
                        <Check size={14} strokeWidth={3} /> Active
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelect('character', char.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                      >
                        Equip
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handlePurchase('character', char.id, char.cost)}
                      disabled={!canAfford}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                        canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Lock size={12} /> 🪙 {char.cost}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'trails' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trails.map(tr => {
            const isEquipped = activeTrailId === tr.id;
            const canAfford = stats.coins >= tr.cost;
            return (
              <div
                key={tr.id}
                className={`relative flex items-center justify-between p-4 glass-panel rounded-xl transition duration-200 ${
                  isEquipped ? 'border-pink-500 bg-pink-500/5' : 'border-white/10 hover:border-pink-400/30 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center border shadow-inner font-mono text-xl"
                    style={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: isEquipped ? tr.color : '#1e293b' 
                    }}
                  >
                    ✨
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-slate-100 text-base">{tr.name}</span>
                    <span className="block text-xs font-mono text-slate-400">Visual runner trail overlay</span>
                  </div>
                </div>

                <div>
                  {tr.unlocked ? (
                    isEquipped ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-sky-950 rounded-lg text-xs font-bold uppercase">
                        <Check size={14} strokeWidth={3} /> Active
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelect('trail', tr.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                      >
                        Equip
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handlePurchase('trail', tr.id, tr.cost)}
                      disabled={!canAfford}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                        canAfford
                          ? 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                          : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Lock size={12} /> 🪙 {tr.cost}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'themes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map(thm => {
            const isEquipped = activeThemeId === thm.id;
            const canAfford = stats.coins >= thm.cost;
            return (
              <div
                key={thm.id}
                className={`relative flex items-center justify-between p-4 glass-panel rounded-xl transition duration-200 ${
                  isEquipped ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-400/30 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Dynamic Color Palette Preview block */}
                  <div 
                    className="w-14 h-11 rounded border overflow-hidden flex flex-col shadow"
                    style={{ borderColor: isEquipped ? '#10b981' : '#1e293b' }}
                  >
                    <div className="h-2/3 w-full" style={{ backgroundColor: thm.skyColor }} />
                    <div className="h-1/3 w-full" style={{ backgroundColor: thm.groundColor }} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-slate-100 text-base">{thm.name}</span>
                    <span className="block text-xs font-mono text-slate-400">Parallax palette preset</span>
                  </div>
                </div>

                <div>
                  {thm.unlocked ? (
                    isEquipped ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-550 bg-emerald-500 text-emerald-950 rounded-lg text-xs font-bold uppercase">
                        <Check size={14} strokeWidth={3} /> Active
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelect('theme', thm.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                      >
                        Equip
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handlePurchase('theme', thm.id, thm.cost)}
                      disabled={!canAfford}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                        canAfford
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                          : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Lock size={12} /> 🪙 {thm.cost}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
