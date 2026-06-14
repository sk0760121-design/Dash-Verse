export interface GameSettings {
  musicEnabled: boolean;
  soundEnabled: boolean;
  volume: number; // 0 to 1
  difficulty: 'easy' | 'normal' | 'hard';
  darkMode: boolean;
  reduceMotion: boolean;
}

export interface Character {
  id: string;
  name: string;
  cost: number;
  unlocked: boolean;
  description: string;
  color: string;
  accentColor: string;
  runnerType: 'dino' | 'robot' | 'fox' | 'sphere';
}

export interface Trail {
  id: string;
  name: string;
  cost: number;
  unlocked: boolean;
  type: 'none' | 'fire' | 'rainbow' | 'electric' | 'shadow';
  color: string;
}

export interface GameTheme {
  id: string;
  name: string;
  cost: number;
  unlocked: boolean;
  skyColor: string;
  groundColor: string;
  mountainColor: string;
  treeColor: string;
  skyNightColor: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface GameStats {
  highScore: number;
  coins: number;
  totalCoinsCollected: number;
  totalDistanceRun: number;
  totalJumps: number;
  totalDucks: number;
  totalPlays: number;
  obstaclesAvoided: number;
}

export interface GameState {
  score: number;
  coinsCollectedThisRun: number;
  distance: number;
  speed: number;
  isPaused: boolean;
  isGameOver: boolean;
  isCountingDown: boolean;
  countdown: number;
  activeCharacterId: string;
  activeTrailId: string;
  activeThemeId: string;
  multiplier?: number;
  consecutivePerfectJumps?: number;
}
