/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GameSettings, GameStats, GameState, Character, Trail, GameTheme, Mission, Achievement } from './types';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { Shop } from './components/Shop';
import { AchievementsList } from './components/AchievementsList';
import { MissionsPanel } from './components/MissionsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { DailyLoginBonus } from './components/DailyLoginBonus';
import { Leaderboard } from './components/Leaderboard';
import { sound } from './utils/sound';
import { Sparkles, X, Heart, Award } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { INITIAL_CHARACTERS, INITIAL_TRAILS, INITIAL_THEMES, INITIAL_MISSIONS } from './data/gameContent';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-jump', title: 'Skyward Bound', description: 'Perform your first jump into the horizon.', icon: 'zap', unlocked: false },
  { id: 'first-coin', title: 'Golden Touch', description: 'Gather a spinning golden coin.', icon: 'coins', unlocked: false },
  { id: 'score-100', title: 'Sprinter Spirit', description: 'Exceed 100 score points.', icon: 'trophy', unlocked: false },
  { id: 'score-500', title: 'Daylight Wanderer', description: 'Exceed 500 score points in a single run.', icon: 'award', unlocked: false },
  { id: 'score-1000', title: 'Horizon Pioneer', description: 'Exceed 1000 score points in a single run.', icon: 'trophy', unlocked: false },
  { id: 'score-5000', title: 'Elite Marathoner', description: 'Exceed 5000 score points in a single run.', icon: 'trophy', unlocked: false },
  { id: 'coin-collector', title: 'Gold Hoarder', description: 'Amass 100 total lifetime coins.', icon: 'coins', unlocked: false },
  { id: 'perfect-runner', title: 'Untouchable Stride', description: 'Avoid 100 total obstacles successfully.', icon: 'shield-check', unlocked: false },
];

const DEFAULT_STATS: GameStats = {
  highScore: 0,
  coins: 0,
  totalCoinsCollected: 0,
  totalDistanceRun: 0,
  totalJumps: 0,
  totalDucks: 0,
  totalPlays: 0,
  obstaclesAvoided: 0,
};

const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: true,
  soundEnabled: true,
  volume: 0.5,
  difficulty: 'normal',
  darkMode: false,
  reduceMotion: false,
};

const DEFAULT_GAME_STATE: GameState = {
  score: 0,
  coinsCollectedThisRun: 0,
  distance: 0,
  speed: 6.5,
  isPaused: false,
  isGameOver: false,
  isCountingDown: false,
  countdown: 3,
  activeCharacterId: 'classic_dino',
  activeTrailId: 'trail_none',
  activeThemeId: 'theme_classic',
  multiplier: 1,
  consecutivePerfectJumps: 0,
};

export default function App() {
  // Screen routing states: 'menu' | 'playing' | 'shop' | 'achievements' | 'missions' | 'settings' | 'credits' | 'leaderboard'
  const [screen, setScreen] = useState<'menu' | 'playing' | 'shop' | 'achievements' | 'missions' | 'settings' | 'credits' | 'leaderboard'>('menu');

  // Daily portal rewards state hooks
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [loginStreak, setLoginStreak] = useState(1);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);

  // Persistence hooks
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem('horizon_runner_settings');
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const stored = localStorage.getItem('horizon_runner_stats');
      return stored ? JSON.parse(stored) : DEFAULT_STATS;
    } catch {
      return DEFAULT_STATS;
    }
  });

  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
      const stored = localStorage.getItem('horizon_runner_chars');
      if (stored) {
        const parsed = JSON.parse(stored) as Character[];
        if (parsed.length < INITIAL_CHARACTERS.length) {
          const parsedIds = new Set(parsed.map(c => c.id));
          const newItems = INITIAL_CHARACTERS.filter(c => !parsedIds.has(c.id));
          return [...parsed, ...newItems];
        }
        return parsed;
      }
      return INITIAL_CHARACTERS;
    } catch {
      return INITIAL_CHARACTERS;
    }
  });

  const [trails, setTrails] = useState<Trail[]>(() => {
    try {
      const stored = localStorage.getItem('horizon_runner_trails');
      if (stored) {
        const parsed = JSON.parse(stored) as Trail[];
        if (parsed.length < INITIAL_TRAILS.length) {
          const parsedIds = new Set(parsed.map(t => t.id));
          const newItems = INITIAL_TRAILS.filter(t => !parsedIds.has(t.id));
          return [...parsed, ...newItems];
        }
        return parsed;
      }
      return INITIAL_TRAILS;
    } catch {
      return INITIAL_TRAILS;
    }
  });

  const [themes, setThemes] = useState<GameTheme[]>(() => {
    try {
      const stored = localStorage.getItem('horizon_runner_themes');
      if (stored) {
        const parsed = JSON.parse(stored) as GameTheme[];
        if (parsed.length < INITIAL_THEMES.length) {
          const parsedIds = new Set(parsed.map(t => t.id));
          const newItems = INITIAL_THEMES.filter(t => !parsedIds.has(t.id));
          return [...parsed, ...newItems];
        }
        return parsed;
      }
      return INITIAL_THEMES;
    } catch {
      return INITIAL_THEMES;
    }
  });

  const [missions, setMissions] = useState<Mission[]>(() => {
    try {
      const stored = localStorage.getItem('horizon_runner_missions');
      if (stored) {
        const parsed = JSON.parse(stored) as Mission[];
        if (parsed.length < INITIAL_MISSIONS.length) {
          // Merge missions by keeping state for identical ones and adding the new ones
          const existingMap = new Map(parsed.map(m => [m.id, m]));
          return INITIAL_MISSIONS.map(m => {
            const ex = existingMap.get(m.id);
            return ex ? { ...m, current: ex.current, completed: ex.completed, claimed: ex.claimed } : m;
          });
        }
        return parsed;
      }
      return INITIAL_MISSIONS;
    } catch {
      return INITIAL_MISSIONS;
    }
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const stored = localStorage.getItem('horizon_runner_achievements');
      return stored ? JSON.parse(stored) : INITIAL_ACHIEVEMENTS;
    } catch {
      return INITIAL_ACHIEVEMENTS;
    }
  });
  
  // Active run state
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const activeChar = localStorage.getItem('horizon_runner_active_char') || 'classic_dino';
      const activeTrail = localStorage.getItem('horizon_runner_active_trail') || 'trail_none';
      const activeTheme = localStorage.getItem('horizon_runner_active_theme') || 'theme_classic';
      return {
        ...DEFAULT_GAME_STATE,
        activeCharacterId: activeChar,
        activeTrailId: activeTrail,
        activeThemeId: activeTheme,
      };
    } catch {
      return DEFAULT_GAME_STATE;
    }
  });

   // Floating notifications banner system
  const [activeNotifier, setActiveNotifier] = useState<Achievement | null>(null);

  // Landscape/Portrait orientation detection
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Determine if width is less than height to prompt rotation
      setIsPortrait(window.innerWidth < window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Attempt native layout orientation lock for landscape if supported
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {
      // Ignore fallback failures safely
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Fullscreen view mechanics
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    const container = gameContainerRef.current;
    if (!container) {
      const rootElem = document.documentElement;
      if (!isFullscreen) {
        if (rootElem.requestFullscreen) {
          rootElem.requestFullscreen().catch(() => {});
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
      return;
    }

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(err => {
          console.log("Browser fullscreen blocked/unsupported in sandboxed preview:", err);
        });
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      const isNativeFs = !!document.fullscreenElement;
      if (isNativeFs !== isFullscreen) {
        setIsFullscreen(isNativeFs);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [isFullscreen]);

  // Setup sound levels when configuration volume adjusts
  useEffect(() => {
    sound.setVolume(settings.volume);
  }, [settings.volume]);

  // Trigger check for Daily Login Bonus on game boot
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastLoginStr = localStorage.getItem('horizon_runner_last_login_date');
      const storedStreak = localStorage.getItem('horizon_runner_login_streak');
      
      let streak = storedStreak ? parseInt(storedStreak, 10) : 0;
      
      if (!lastLoginStr) {
        // First login ever or cleared cache
        setLoginStreak(1);
        setHasClaimedToday(false);
        const t = setTimeout(() => setShowDailyBonus(true), 1200);
        return () => clearTimeout(t);
      } else if (lastLoginStr === todayStr) {
        // Already claimed today
        setLoginStreak(streak || 1);
        setHasClaimedToday(true);
      } else {
        // It's a new day!
        const lastLoginDate = new Date(lastLoginStr);
        const todayDate = new Date(todayStr);
        
        // Zero out time details to calculate pure calendar day difference
        lastLoginDate.setHours(0,0,0,0);
        todayDate.setHours(0,0,0,0);
        
        const diffTime = Math.abs(todayDate.getTime() - lastLoginDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        let nextStreak = 1;
        if (diffDays === 1) {
          // Consecutive daily login!
          nextStreak = (streak % 7) + 1;
        } else {
          // Missed a day, resets to 1
          nextStreak = 1;
        }
        
        setLoginStreak(nextStreak);
        setHasClaimedToday(false);
        const t = setTimeout(() => setShowDailyBonus(true), 1200);
        return () => clearTimeout(t);
      }
    } catch (e) {
      console.error('Error calculating daily login bonus eligibility:', e);
    }
  }, []);

  const handleClaimDailyBonus = (bonusAmount: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Award coins and increment total coins collected
    setStats(prev => ({
      ...prev,
      coins: prev.coins + bonusAmount,
      totalCoinsCollected: prev.totalCoinsCollected + bonusAmount,
    }));
    
    setHasClaimedToday(true);
    
    try {
      localStorage.setItem('horizon_runner_last_login_date', todayStr);
      localStorage.setItem('horizon_runner_login_streak', String(loginStreak));
    } catch (e) {
      console.error('Failed to save daily bonus claim:', e);
    }
  };

  // Saving variables safely when modified
  useEffect(() => {
    localStorage.setItem('horizon_runner_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('horizon_runner_stats', JSON.stringify(stats));
  }, [stats]);

  // Synchronize global leaderboard immediately upon hitting a high score or switching runners
  useEffect(() => {
    try {
      const savedBoardStr = localStorage.getItem('horizon_runner_global_leaderboard');
      let currentBoard: any[] = [];
      const defaultCompetitors = [
        { rank: 1, name: 'SudoBash', score: 9450, avatarColor: '#f43f5e', activeCharacter: 'Cyber Sphere' },
        { rank: 2, name: 'NeonDino_60', score: 7820, avatarColor: '#00f2ff', activeCharacter: 'Emerald Dino' },
        { rank: 3, name: 'CyberDASH', score: 6100, avatarColor: '#a855f7', activeCharacter: 'Phantom Fox' },
        { rank: 4, name: 'MatrixSpin', score: 4950, avatarColor: '#10b981', activeCharacter: 'Chrono Dino' },
        { rank: 5, name: 'PixelDancer', score: 3500, avatarColor: '#fbbf24', activeCharacter: 'Crimson Robot' },
        { rank: 6, name: 'RetroRacer', score: 2280, avatarColor: '#ec4899', activeCharacter: 'Golden Robot' },
        { rank: 7, name: 'ChronoRun', score: 1420, avatarColor: '#6366f1', activeCharacter: 'Classic Dino' },
        { rank: 8, name: 'SphereDucker', score: 850, avatarColor: '#84cc16', activeCharacter: 'Classic Dino' },
      ];

      if (savedBoardStr) {
        try {
          const parsed = JSON.parse(savedBoardStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentBoard = parsed;
          } else {
            currentBoard = [...defaultCompetitors];
          }
        } catch {
          currentBoard = [...defaultCompetitors];
        }
      } else {
        currentBoard = [...defaultCompetitors];
      }

      const savedGamerTag = localStorage.getItem('horizon_runner_gamertag') || 'Guest_Runner';
      // Filter out old user entries to avoid duplicates
      const filteredBoard = currentBoard.filter(item => !item.isUser && item.name !== savedGamerTag);
      
      const activeCharObj = characters.find(c => c.id === gameState.activeCharacterId);
      const activeCharName = activeCharObj ? activeCharObj.name : 'Your Runner';

      filteredBoard.push({
        name: savedGamerTag,
        score: typeof stats.highScore === 'number' && !isNaN(stats.highScore) ? stats.highScore : 0,
        avatarColor: '#f59e0b', // Amber user glow color
        activeCharacter: activeCharName,
        isUser: true,
      });

      // Sort descending
      filteredBoard.sort((a, b) => b.score - a.score);

      // Re-assign ranks
      const finalBoard = filteredBoard.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));

      localStorage.setItem('horizon_runner_global_leaderboard', JSON.stringify(finalBoard));
    } catch (e) {
      console.error('Failed to auto-sync leaderboard:', e);
    }
  }, [stats.highScore, gameState.activeCharacterId, characters]);

  useEffect(() => {
    localStorage.setItem('horizon_runner_chars', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('horizon_runner_trails', JSON.stringify(trails));
  }, [trails]);

  useEffect(() => {
    localStorage.setItem('horizon_runner_themes', JSON.stringify(themes));
  }, [themes]);

  useEffect(() => {
    localStorage.setItem('horizon_runner_achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('horizon_runner_missions', JSON.stringify(missions));
  }, [missions]);

  // Save selected custom runners, trails, or visual theme skins upon selection
  useEffect(() => {
    try {
      localStorage.setItem('horizon_runner_active_char', gameState.activeCharacterId);
      localStorage.setItem('horizon_runner_active_trail', gameState.activeTrailId);
      localStorage.setItem('horizon_runner_active_theme', gameState.activeThemeId);
      
      const charNameObj = characters.find(c => c.id === gameState.activeCharacterId);
      if (charNameObj) {
        localStorage.setItem('horizon_runner_active_char_name', charNameObj.name);
      }
    } catch (e) {
      console.error('Failed to save active equipment state:', e);
    }
  }, [gameState.activeCharacterId, gameState.activeTrailId, gameState.activeThemeId, characters]);

  // Synchronize dynamic Quest/Mission updates in reaction to Stats progress changes!
  useEffect(() => {
    setMissions(prev => {
      const updated = prev.map(m => {
        let current = 0;
        if (m.id.includes('jumps') || m.id === 'mission-jumps') {
          current = stats.totalJumps;
        } else if (m.id.includes('coin-bank') || m.id === 'mission-coins') {
          current = stats.coins;
        } else if (m.id.includes('lifetime-coins')) {
          current = stats.totalCoinsCollected;
        } else if (m.id.includes('score') || m.id.includes('highscore') || m.id === 'mission-score-500' || m.id === 'mission-score-1000') {
          current = stats.highScore;
        } else if (m.id.includes('obstacles') || m.id === 'mission-obstacles') {
          current = stats.obstaclesAvoided;
        } else if (m.id.includes('plays')) {
          current = stats.totalPlays;
        } else if (m.id.includes('distance')) {
          current = stats.totalDistanceRun;
        } else if (m.id.includes('ducks')) {
          current = stats.totalDucks;
        }

        const completed = current >= m.target;
        return {
          ...m,
          current,
          completed,
        };
      });
      return updated;
    });
  }, [stats]);

  // Incremental Helper for HUD callback counters
  const incrementStats = (key: keyof Omit<GameStats, 'highScore' | 'coins'>, amount = 1) => {
    setStats(prev => ({
      ...prev,
      [key]: prev[key] + amount,
    }));
  };

  // Achievement unlock trigger logic
  const triggerAchievement = (id: string) => {
    let newlyUnlocked: Achievement | null = null;

    setAchievements(prev => {
      const updated = prev.map(a => {
        if (a.id === id && !a.unlocked) {
          sound.playAchievement();
          newlyUnlocked = {
            ...a,
            unlocked: true,
            unlockedAt: new Date().toISOString(),
          };
          return newlyUnlocked;
        }
        return a;
      });
      return updated;
    });

    if (newlyUnlocked) {
      // Fire banner alert animation on top of viewport
      setActiveNotifier(newlyUnlocked);
      // Automatically pop notification out after 4 seconds
      setTimeout(() => {
        setActiveNotifier(null);
      }, 4200);
    }
  };

  // Claim Quest coin payouts
  const handleClaimReward = (missionId: string, rewardValue: number) => {
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
    setStats(prev => ({
      ...prev,
      coins: prev.coins + rewardValue,
    }));
  };

  // Shop equip commands
  const handleSelectItem = (type: 'character' | 'trail' | 'theme', id: string) => {
    setGameState(prev => {
      if (type === 'character') return { ...prev, activeCharacterId: id };
      if (type === 'trail') return { ...prev, activeTrailId: id };
      return { ...prev, activeThemeId: id };
    });
  };

  // Shop purchase payouts
  const handlePurchaseItem = (type: 'character' | 'trail' | 'theme', id: string, cost: number) => {
    setStats(prev => ({ ...prev, coins: prev.coins - cost }));
    if (type === 'character') {
      setCharacters(prev => prev.map(c => c.id === id ? { ...c, unlocked: true } : c));
    } else if (type === 'trail') {
      setTrails(prev => prev.map(t => t.id === id ? { ...t, unlocked: true } : t));
    } else if (type === 'theme') {
      setThemes(prev => prev.map(th => th.id === id ? { ...th, unlocked: true } : th));
    }
  };

  // Setup start countdown timer sequence
  const handleStartRun = () => {
    sound.playJump();
    setScreen('playing');
    setGameState(prev => ({
      ...DEFAULT_GAME_STATE,
      activeCharacterId: prev.activeCharacterId,
      activeTrailId: prev.activeTrailId,
      activeThemeId: prev.activeThemeId,
      isCountingDown: true,
      countdown: 3,
    }));

    // Trigger sequential counting interval ticks
    let countVal = 3;
    const interval = setInterval(() => {
      countVal--;
      if (countVal < 0) {
        clearInterval(interval);
        setGameState(prev => ({ ...prev, isCountingDown: false }));
      } else {
        sound.playJump();
        setGameState(prev => ({ ...prev, countdown: countVal }));
      }
    }, 900);
  };

  // Exit Playing back to lobby Menu
  const handleMainMenu = () => {
    sound.playJump();
    setScreen('menu');
    setGameState(DEFAULT_GAME_STATE);
  };

  // Play Pause Toggle
  const handlePauseToggle = () => {
    setGameState(prev => {
      const nState = !prev.isPaused;
      sound.playJump();
      return { ...prev, isPaused: nState };
    });
  };

  // Final Run Termination mapping
  const handleGameOver = (finalScore: number, finalCoins: number) => {
    setGameState(prev => ({
      ...prev,
      isGameOver: true,
    }));

    // Save score calculations
    setStats(prev => {
      const topRecord = Math.max(prev.highScore, finalScore);
      const pocketedBankValue = prev.coins + finalCoins;
      const lifetimeCollectedVal = prev.totalCoinsCollected + finalCoins;
      const updatedDistance = prev.totalDistanceRun + Math.floor(finalScore / 10);

      return {
        ...prev,
        highScore: topRecord,
        coins: pocketedBankValue,
        totalCoinsCollected: lifetimeCollectedVal,
        totalDistanceRun: updatedDistance,
      };
    });
  };

  // Safe data wiping triggers
  const handleResetHighScore = () => {
    setStats(prev => ({ ...prev, highScore: 0 }));
  };

  const handleResetAllData = () => {
    setSettings(DEFAULT_SETTINGS);
    setStats(DEFAULT_STATS);
    setCharacters(INITIAL_CHARACTERS);
    setTrails(INITIAL_TRAILS);
    setThemes(INITIAL_THEMES);
    setMissions(INITIAL_MISSIONS);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setGameState(DEFAULT_GAME_STATE);
    setScreen('menu');
    localStorage.clear();
  };

  // Gather currently selected items to render
  const selectedChar = characters.find(c => c.id === gameState.activeCharacterId) || INITIAL_CHARACTERS[0];
  const selectedTrail = trails.find(t => t.id === gameState.activeTrailId) || INITIAL_TRAILS[0];
  const selectedTheme = themes.find(th => th.id === gameState.activeThemeId) || INITIAL_THEMES[0];

  return (
    <div className={`min-h-screen ${settings.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'} font-sans flex flex-col justify-between align-middle selection:bg-amber-500 selection:text-slate-950`}>
      
      {/* 🏆 High-Polished Float Achievement Notification Banner */}
      {activeNotifier && (
        <div 
          id="achievement-notification-banner"
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-950 border-2 border-amber-500 p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-55 animate-bounce select-none pointer-events-auto min-w-[280px] max-w-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-400">
            <Award size={20} className="animate-spin" />
          </div>
          <div className="text-left flex-1">
            <span className="block text-[9px] uppercase font-mono tracking-widest text-amber-400 font-bold">ACHIEVEMENT EARNED!</span>
            <span className="block text-sm font-extrabold text-slate-100 leading-tight">{activeNotifier.title}</span>
            <span className="block text-[11px] text-slate-400 font-mono mt-0.5 leading-tight">{activeNotifier.description}</span>
          </div>
          <button 
            onClick={() => setActiveNotifier(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Container viewport */}
      <main className={`flex-1 flex flex-col items-center justify-center ${isFullscreen ? 'p-0 w-full h-full' : 'p-4'}`}>
        {screen === 'menu' && (
          <MainMenu
            stats={stats}
            missions={missions}
            settings={settings}
            onPlay={handleStartRun}
            onOpenSection={(sect) => {
              sound.playJump();
              if (sect === 'daily-bonus') {
                setShowDailyBonus(true);
              } else {
                setScreen(sect);
              }
            }}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        )}

        {screen === 'playing' && (
          <div className={isFullscreen ? "w-screen h-screen flex flex-col justify-between" : "w-full max-w-4xl mx-auto flex flex-col gap-4"}>
            {/* Embedded Active Frame container with HUD & Canvas overlays */}
            <div 
              ref={gameContainerRef}
              className={isFullscreen 
                ? "fixed inset-0 w-screen h-screen z-50 bg-slate-950 overflow-hidden flex flex-col justify-between" 
                : "relative rounded-2xl overflow-hidden shadow-2xl w-full"
              }
            >
              <GameCanvas
                settings={settings}
                stats={stats}
                character={selectedChar}
                trail={selectedTrail}
                theme={selectedTheme}
                gameState={gameState}
                setGameState={setGameState}
                setStats={setStats}
                onGameOver={handleGameOver}
                triggerAchievement={triggerAchievement}
                incrementStats={incrementStats}
                isFullscreen={isFullscreen}
              />
              
              {/* HUD elements rendered directly on top of running actions */}
              <HUD
                gameState={gameState}
                stats={stats}
                settings={settings}
                onPauseToggle={handlePauseToggle}
                onRestart={handleStartRun}
                onMainMenu={handleMainMenu}
                onOpenSettings={() => {
                  sound.playJump();
                  setScreen('settings');
                }}
                onJumpStart={() => {
                  // Direct bypass hook simulation to canvas
                  const btn = document.getElementById('runner-game-canvas');
                  if (btn) {
                    const ke = new KeyboardEvent('keydown', { key: 'ArrowUp' });
                    window.dispatchEvent(ke);
                  }
                }}
                onDuckStart={(active) => {
                  const ke = new KeyboardEvent(active ? 'keydown' : 'keyup', { key: 'ArrowDown' });
                  window.dispatchEvent(ke);
                }}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            </div>
            
            {/* Horizontal helper row */}
            {!isFullscreen && (
              <div className="flex justify-between items-center text-xs text-slate-500 font-mono px-2">
                <span>Runner selected: <b className="text-slate-350">{selectedChar.name}</b></span>
                <span>Trail: <b className="text-slate-350">{selectedTrail.name}</b></span>
              </div>
            )}
          </div>
        )}

        {screen === 'shop' && (
          <Shop
            stats={stats}
            characters={characters}
            trails={trails}
            themes={themes}
            activeCharacterId={gameState.activeCharacterId}
            activeTrailId={gameState.activeTrailId}
            activeThemeId={gameState.activeThemeId}
            onSelectItem={handleSelectItem}
            onPurchaseItem={handlePurchaseItem}
            onClose={() => {
              sound.playJump();
              setScreen('menu');
            }}
          />
        )}

        {screen === 'achievements' && (
          <AchievementsList
            achievements={achievements}
            onClose={() => {
              sound.playJump();
              setScreen('menu');
            }}
          />
        )}

        {screen === 'leaderboard' && (
          <Leaderboard
            userHighScore={stats.highScore}
            onClose={() => {
              sound.playJump();
              setScreen('menu');
            }}
          />
        )}

        {screen === 'missions' && (
          <MissionsPanel
            stats={stats}
            missions={missions}
            onClaimReward={handleClaimReward}
            onClose={() => {
              sound.playJump();
              setScreen('menu');
            }}
          />
        )}

        {screen === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={setSettings}
            onResetHighScore={handleResetHighScore}
            onResetAllData={handleResetAllData}
            onClose={() => {
              sound.playJump();
              setScreen(gameState.isPaused ? 'playing' : 'menu');
            }}
          />
        )}

        {screen === 'credits' && (
          <div className="bg-slate-950 text-slate-100 p-6 rounded-2xl border border-slate-800 max-w-xl text-left w-full mx-auto shadow-2xl relative overflow-hidden">
            <h1 className="text-2xl font-black tracking-tight mb-2 uppercase">📝 CREDITS &amp; INFO</h1>
            <p className="text-xs text-slate-400 font-mono mb-4 uppercase">Horizon Endless Runner Engine Details</p>

            <div className="space-y-4 text-xs font-mono leading-relaxed text-slate-300">
              <p>
                <b>DESIGN CONCEPTS:</b><br />
                Inspired by modern minimalist platformers and classical games. Engineered cleanly using Vanilla scaling systems to translate high-fidelity arcade feelings.
              </p>
              <p>
                <b>AUDIO &amp; SOUND EFFECTS:</b><br />
                All 8-bit jump acoustics, double flips, golden collection sweeps, explosions, and backbeat themes are synthesized dynamically on boot using the HTML5 <b>Web Audio API</b> engine. No external files or loading limits required!
              </p>
              <p>
                <b>PERFORMANCE STATS:</b><br />
                Uses <b>requestAnimationFrame()</b>. Handles objects dynamically under strict garbage cleanup. Maintained consistently at 60 FPS under minimal DOM node footprint.
              </p>
              <p className="border-t border-slate-850 pt-4 flex items-center justify-between">
                <span>Created cleanly by Anthropic Code Studio &bull; v1.2</span>
                <Heart size={14} className="text-rose-500 fill-current animate-pulse" />
              </p>
            </div>

            <button
              onClick={() => {
                sound.playJump();
                setScreen('menu');
              }}
              className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-sans font-bold uppercase rounded-xl transition cursor-pointer"
            >
              Return to Lobby
            </button>
          </div>
        )}
      </main>

      {/* 🔮 Beautiful interactive 7-day loyalty daily rewards portal */}
      <AnimatePresence>
        {showDailyBonus && (
          <DailyLoginBonus
            currentStreak={loginStreak}
            hasClaimedToday={hasClaimedToday}
            onClaim={handleClaimDailyBonus}
            onClose={() => {
              sound.playJump();
              setShowDailyBonus(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Accessible Footer with branding details */}
      <footer className="py-4 text-center text-xs text-slate-500 font-mono uppercase bg-slate-950/20 border-t border-slate-905">
        <span>© 2026 HORIZON RUNNER &bull; FULLY OFFLINE ACCESS</span>
      </footer>

      {/* 🔄 Landscape Mode Required Immersive Overlay */}
      <AnimatePresence>
        {isPortrait && (
          <motion.div
            id="landscape-lock-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center p-6 text-center text-white"
          >
            <div className="absolute inset-0 atmosphere opacity-35 pointer-events-none" />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="glass-panel p-8 rounded-3xl max-w-sm border-pink-500/30 shadow-[0_0_50px_rgba(244,63,94,0.18)] flex flex-col items-center"
            >
              {/* Rotating Phone Visual Animation */}
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, -90, -90, 0, 0] }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    ease: "easeInOut"
                  }}
                  className="w-10 h-16 border-4 border-cyan-400 rounded-xl relative flex items-center justify-center bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  <div className="absolute bottom-1 w-2 h-2 rounded-full bg-cyan-400/50" />
                  <div className="absolute top-1 w-4 h-1 rounded-full bg-cyan-400/50" />
                </motion.div>
                
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-dashed border-cyan-500/25 rounded-full"
                />
              </div>

              <h2 className="text-xl font-black font-sans tracking-widest text-[#f43f5e] uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                🔄 LANDSCAPE REQUIRED
              </h2>
              <p className="text-sm font-bold text-slate-100 tracking-wide mt-2">
                APNE DEVICE KO ROTATE KAREN
              </p>
              <p className="text-xs text-slate-450 font-mono uppercase mt-4 leading-relaxed">
                Better gaming experience & wide visibility ke liye please phone ko rotate karke Landscape mode mein rakhein.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
