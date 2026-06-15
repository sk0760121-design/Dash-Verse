import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Flame, Sparkles, X, Check, Lock, Gift, Award } from 'lucide-react';
import { sound } from '../utils/sound';

interface DailyLoginBonusProps {
  currentStreak: number;
  onClaim: (bonusAmount: number) => void;
  onClose: () => void;
  hasClaimedToday: boolean;
}

export const DAILY_REWARDS = [100, 150, 200, 250, 350, 500, 1000];

export const DailyLoginBonus: React.FC<DailyLoginBonusProps> = ({
  currentStreak,
  onClaim,
  onClose,
  hasClaimedToday,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimCompleted, setClaimCompleted] = useState(false);
  const [timeToNext, setTimeToNext] = useState<string>('');

  // Daily reward amount for current streak
  const currentRewardAmount = DAILY_REWARDS[(currentStreak - 1) % 7];

  // Live countdown timer to next daily reward (next UTC midnight or next day)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(24, 0, 0, 0); // Next UTC day midnight
      
      const diffMs = nextMidnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeToNext('00:00:00');
        return;
      }
      
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      const format = (num: number) => String(num).padStart(2, '0');
      setTimeToNext(`${format(hrs)}:${format(mins)}:${format(secs)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimClick = () => {
    if (hasClaimedToday || isClaiming || claimCompleted) return;
    setIsClaiming(true);
    sound.playAchievement();
    
    // Simulate interactive coin burst collection effect
    setTimeout(() => {
      onClaim(currentRewardAmount);
      setIsClaiming(false);
      setClaimCompleted(true);
    }, 1200);
  };

  return (
    <div id="daily-bonus-root" className="fixed inset-0 z-50 flex justify-center items-start sm:items-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-4 sm:p-6 md:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden text-slate-100 my-auto"
      >
        {/* Glow backdrop effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -z-10" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/35 rounded-full text-[10px] uppercase font-mono text-cyan-400 font-bold tracking-widest mb-3">
            <Sparkles size={12} className="animate-pulse" />
            <span>Daily Portal Bonus</span>
          </div>
          <h1 className="text-3xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-500 mb-1">
            DAILY LOGIN REWARDS
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Log in daily to scale your reward multiplier and keep your run active under premium custom dino skins!
          </p>
        </div>

        {/* Streak Flame Tracker */}
        <div className="flex justify-center items-center gap-3 mb-6 bg-slate-900/60 border border-white/5 py-3 px-4 rounded-2xl w-fit mx-auto">
          <div className="p-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg animate-pulse">
            <Flame size={18} className="fill-current" />
          </div>
          <div className="text-left font-mono text-xs">
            <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Current Loyalty Streak</span>
            <span className="text-white text-sm font-black">
              Day <span className="text-cyan-400 font-black text-base">{currentStreak}</span> of 7
            </span>
          </div>
        </div>

        {/* 7-Day Rewards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-8">
          {DAILY_REWARDS.map((reward, i) => {
            const dayNum = i + 1;
            const isCompleted = dayNum < currentStreak;
            // Active is current streak - but only if we haven't claimed today yet
            const isActive = dayNum === currentStreak;
            const isUpcoming = dayNum > currentStreak;

            return (
              <div
                key={dayNum}
                className={`relative flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all text-center ${
                  isActive
                    ? hasClaimedToday
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] scale-105 z-10'
                    : isCompleted
                    ? 'bg-slate-950/40 border-white/5 text-slate-500'
                    : 'bg-slate-900/30 border-white/10 text-slate-400 opacity-60'
                }`}
              >
                {/* Day Badge */}
                <span className={`text-[9px] uppercase font-mono tracking-widest font-black mb-2 ${
                  isActive ? 'text-cyan-400 font-extrabold' : 'text-slate-450'
                }`}>
                  Day {dayNum}
                </span>

                {/* Main Action visual */}
                <div className="my-2 relative flex items-center justify-center">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                      <Check size={16} />
                    </div>
                  ) : isActive ? (
                    hasClaimedToday ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                        <Check size={16} />
                      </div>
                    ) : (
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-11 h-11 rounded-full bg-cyan-400/10 border-2 border-cyan-400 flex items-center justify-center text-cyan-400"
                      >
                        {dayNum === 7 ? <Award size={20} className="text-pink-400 animate-spin" /> : <Coins size={18} className="animate-pulse" />}
                      </motion.div>
                    )
                  ) : dayNum === 7 ? (
                    <div className="w-10 h-10 rounded-full bg-pink-500/5 border border-pink-500/20 flex items-center justify-center text-pink-500/50">
                      <Gift size={16} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                      <Lock size={14} />
                    </div>
                  )}

                  {/* Streak-7 spark flare */}
                  {dayNum === 7 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                    </span>
                  )}
                </div>

                {/* Coin Reward value */}
                <div className="mt-2 text-center">
                  <span className={`block text-xs font-black score-font leading-none ${
                    isActive ? 'text-white text-sm' : isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'
                  }`}>
                    +{reward}
                  </span>
                  <span className="text-[8px] font-mono uppercase tracking-lighter text-slate-500 leading-none">Coins</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Claim Buttons / Action states */}
        <div className="flex flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            {!hasClaimedToday && !claimCompleted ? (
              <motion.button
                key="btn-claim"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={handleClaimClick}
                disabled={isClaiming}
                className="w-full sm:w-80 py-4 px-6 bg-gradient-to-r from-cyan-400 via-sky-400 to-[#00f2ff] hover:from-cyan-300 hover:to-cyan-400 text-slate-950 text-sm font-black uppercase rounded-2xl shadow-[0_0_25px_rgba(0,242,255,0.45)] hover:shadow-[0_0_35px_rgba(0,242,255,0.6)] cursor-pointer hover:-translate-y-0.5 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 tracking-widest relative"
              >
                {isClaiming ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full"
                    />
                    <span>TRANSFERRING COINS...</span>
                  </>
                ) : (
                  <>
                    <Coins size={18} className="animate-bounce" />
                    <span>CLAIM WEEKLY DAY {currentStreak} BONUS</span>
                  </>
                )}

                {/* Coin burst animation frames */}
                {isClaiming && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 2], opacity: [1, 0] }}
                      transition={{ duration: 1 }}
                      className="absolute w-20 h-20 border-2 border-cyan-400 rounded-full"
                    />
                  </div>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="alert-claimed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col items-center gap-3"
              >
                <div className="w-full sm:w-80 py-3.5 px-6 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-black uppercase rounded-2xl flex items-center justify-center gap-2">
                  <Check size={16} />
                  <span>COINS COLLECTED SUCCESSFUL!</span>
                </div>
                
                {/* Countdown display to next UTC Midnight reset */}
                <div className="text-center font-mono text-[11px] text-slate-450 uppercase mt-1">
                  Next Loyalty Portal opens in: <span className="text-pink-400 font-bold score-font ml-1 text-xs tracking-wider">{timeToNext}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick instructions / Info message */}
          <p className="text-[10px] text-slate-500 font-mono text-center uppercase tracking-wider">
            Daily logs reset daily at UTC Midnight. Break your streak and you will restart on Day 1!
          </p>
        </div>
      </motion.div>
    </div>
  );
};
