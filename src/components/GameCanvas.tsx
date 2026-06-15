import React, { useEffect, useRef, useState } from 'react';
import { Character, Trail, GameTheme, GameSettings, GameStats, GameState } from '../types';
import { sound } from '../utils/sound';
import { Shield, Magnet, Sparkles } from 'lucide-react';

const isMobileClient = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

interface GameCanvasProps {
  settings: GameSettings;
  stats: GameStats;
  character: Character;
  trail: Trail;
  theme: GameTheme;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setStats: React.Dispatch<React.SetStateAction<GameStats>>;
  onGameOver: (finalScore: number, finalCoins: number) => void;
  triggerAchievement: (id: string) => void;
  incrementStats: (key: keyof Omit<GameStats, 'highScore' | 'coins'>, amount?: number) => void;
  isFullscreen?: boolean;
}

// Coordinate spaces
const VIRTUAL_WIDTH = 1000;
const VIRTUAL_HEIGHT = 400;
const GROUND_Y = 320;

// Game physics parameters
const JUMP_FORCE = -11.5;
const DOUBLE_JUMP_FORCE = -10.0;
const GRAVITY = 0.5;
const BASE_SPEED = 6.5;
const MAX_SPEED = 14.0;
const SPEED_INCREMENTAL = 0.35;

interface GameObstacle {
  id: string;
  type: 'rock_small' | 'rock_large' | 'stump' | 'barrel' | 'bird' | 'robot_bird';
  x: number;
  y: number;
  width: number;
  height: number;
  cleared: boolean;
  wingPhase: number;
  speedMultiplier: number;
}

interface GameCoin {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  rotationPhase: number;
}

interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'square' | 'spark';
}

interface WeatherParticle {
  type: 'rain' | 'cyber' | 'ash' | 'ember' | 'petal' | 'pollen' | 'splash';
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  length?: number;
  color: string;
  alpha: number;
  angle?: number;
  spin?: number;
  life?: number;
  maxLife?: number;
}

interface TextFloat {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
}

interface GamePowerUp {
  id: string;
  type: 'shield' | 'magnet' | 'multiplier';
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  pulsePhase: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  settings,
  stats,
  character,
  trail,
  theme,
  gameState,
  setGameState,
  setStats,
  onGameOver,
  triggerAchievement,
  incrementStats,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard controls reference
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Game internal state ref to escape React closure staleness in active runAnimationFrame loop
  const engineRef = useRef({
    // Running variables
    isPlaying: false,
    scrollX: 0,
    speed: BASE_SPEED,
    score: 0,
    coinsInRun: 0,
    distance: 0,
    multiplier: 1,
    consecutivePerfectJumps: 0,
    multiplierTimer: 0,
    scoreAccumulator: 0,
    
    // Player movement
    playerY: GROUND_Y - 55,
    playerX: 120,
    playerWidth: 48,
    playerHeight: 55,
    playerVY: 0,
    isJumping: false,
    isDoubleJumping: false,
    isDucking: false,
    duckTimer: 0,
    legPhase: 0,
    landingSquish: 0,
    isDead: false,
    jumpCount: 0,

    // Entities
    obstacles: [] as GameObstacle[],
    coins: [] as GameCoin[],
    powerUps: [] as GamePowerUp[],
    particles: [] as VisualParticle[],
    floats: [] as TextFloat[],
    weatherParticles: [] as WeatherParticle[],
    
    // Spawning controls
    minDistanceBetweenObstacles: 280,
    nextObstacleTimer: 100,
    nextCoinTimer: 40,
    nextPowerUpTimer: 250,
    lastObstacleType: '',

    // Active power-up timers (frames)
    shieldActiveTimer: 0,
    magnetActiveTimer: 0,
    multiplierActiveTimer: 0,
    
    // Day cycle
    dayProgress: 0, // 0 to 1 scaling, day/night cycles every 3000 score points
    
    // Render support
    screenShake: 0,
    screenFlash: 0,
    time: 0,
    
    // Current presets
    selectedCharacter: character,
    selectedTrail: trail,
    selectedTheme: theme,
    activeDifficulty: settings.difficulty,
  });

  // Sync external props to the engineRef immediately
  useEffect(() => {
    engineRef.current.selectedCharacter = character;
    engineRef.current.selectedTrail = trail;
    engineRef.current.selectedTheme = theme;
    engineRef.current.activeDifficulty = settings.difficulty;
  }, [character, trail, theme, settings.difficulty]);

  // Restart trigger
  useEffect(() => {
    if (!gameState.isGameOver && !gameState.isPaused && !gameState.isCountingDown) {
      if (!engineRef.current.isPlaying) {
        initGameEngine();
        engineRef.current.isPlaying = true;
        if (settings.musicEnabled) {
          sound.startMusic();
        }
      }
    } else {
      if (gameState.isPaused || gameState.isGameOver) {
        engineRef.current.isPlaying = false;
        sound.stopMusic();
      }
    }
  }, [gameState.isGameOver, gameState.isPaused, gameState.isCountingDown]);

  // Handle Mute/Volume Changes
  useEffect(() => {
    sound.setVolume(settings.volume);
    if (!settings.musicEnabled || gameState.isPaused || gameState.isGameOver || gameState.isCountingDown) {
      sound.stopMusic();
    } else if (settings.musicEnabled && engineRef.current.isPlaying) {
      sound.startMusic();
    }
  }, [settings.musicEnabled, settings.volume, gameState.isPaused, gameState.isGameOver, gameState.isCountingDown]);

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      sound.stopMusic();
    };
  }, []);

  // Set up resize handler to scale high DPI canvas properly
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const dpr = isMobile
        ? Math.min(1.2, window.devicePixelRatio || 1)
        : Math.min(2.0, window.devicePixelRatio || 1);
      
      // Calculate scaled heights
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false; // Retro crisp pixels
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Game Engine Initialization
  const initGameEngine = () => {
    const engine = engineRef.current;
    
    // Difficulty modifier base speeds
    let startSpeed = BASE_SPEED;
    if (engine.activeDifficulty === 'easy') startSpeed = 5.5;
    if (engine.activeDifficulty === 'hard') startSpeed = 8.0;

    engine.speed = startSpeed;
    engine.score = 0;
    engine.coinsInRun = 0;
    engine.distance = 0;
    engine.scrollX = 0;
    engine.multiplier = 1;
    engine.consecutivePerfectJumps = 0;
    engine.multiplierTimer = 0;
    engine.scoreAccumulator = 0;
    
    // Reset player
    engine.playerY = GROUND_Y - 55;
    engine.playerVY = 0;
    engine.isJumping = false;
    engine.isDoubleJumping = false;
    engine.isDucking = false;
    engine.legPhase = 0;
    engine.isDead = false;
    engine.jumpCount = 0;

    // Clear lists
    engine.obstacles = [];
    engine.coins = [];
    engine.powerUps = [];
    engine.particles = [];
    engine.floats = [];
    engine.weatherParticles = [];
    engine.nextObstacleTimer = 60;
    engine.nextCoinTimer = 100;
    engine.nextPowerUpTimer = 350 + Math.random() * 300;
    engine.shieldActiveTimer = 0;
    engine.magnetActiveTimer = 0;
    engine.multiplierActiveTimer = 0;
    engine.screenShake = 0;
    engine.screenFlash = 0;
    engine.dayProgress = 0;

    // Trigger daily login stats
    incrementStats('totalPlays', 1);
  };

  // Keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[e.key] = true;

      if (gameState.isGameOver || gameState.isCountingDown) return;

      // Escape or P triggers Pause
      if (key === 'p' || e.key === 'Escape') {
        e.preventDefault();
        setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
        return;
      }

      if (gameState.isPaused) {
        if (key === 'p' || e.key === 'Escape') {
          setGameState(prev => ({ ...prev, isPaused: false }));
        }
        return;
      }

      // Action: Jump
      if (key === ' ' || key === 'arrowup' || key === 'w') {
        e.preventDefault();
        triggerJump();
      }

      // Action: Duck
      if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        triggerDuck(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      const key = e.key.toLowerCase();

      if (key === 'arrowdown' || key === 's') {
        triggerDuck(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.isPaused, gameState.isGameOver, gameState.isCountingDown]);

  // Expose global bypass functions to allow mobile widgets to bypass browser Event-simulation sandbox restrictions
  useEffect(() => {
    (window as any).triggerGameJump = () => {
      triggerJump();
    };
    (window as any).triggerGameDuck = (active: boolean) => {
      triggerDuck(active);
    };
    return () => {
      delete (window as any).triggerGameJump;
      delete (window as any).triggerGameDuck;
    };
  }, [gameState.isPaused, gameState.isGameOver, gameState.isCountingDown]);

  // Touch triggers (called directly from HUD buttons overlay or gestures)
  const triggerJump = () => {
    const engine = engineRef.current;
    if (engine.isDead || gameState.isPaused) return;

    if (!engine.isJumping) {
      // First Jump
      engine.isJumping = true;
      engine.playerVY = JUMP_FORCE;
      engine.jumpCount = 1;
      sound.playJump();
      spawnJumpParticles();
      incrementStats('totalJumps', 1);
      triggerAchievement('first-jump');
    } else if (!engine.isDoubleJumping && engine.selectedCharacter.id !== 'classic_dino') {
      // Double Jump supported for non-classic dino
      engine.isDoubleJumping = true;
      engine.playerVY = DOUBLE_JUMP_FORCE;
      engine.jumpCount = 2;
      sound.playDoubleJump();
      spawnDoubleJumpParticles();
      incrementStats('totalJumps', 1);
    } else if (engine.jumpCount === 2 && engine.selectedCharacter.hasTripleJump) {
      // Triple Jump supported for special cosmic runners
      engine.playerVY = DOUBLE_JUMP_FORCE * 1.05;
      engine.jumpCount = 3;
      sound.playJump();
      spawnTripleJumpParticles();
      incrementStats('totalJumps', 1);
    }
  };

  const triggerDuck = (isDuckActive: boolean) => {
    const engine = engineRef.current;
    if (engine.isDead || gameState.isPaused) return;

    if (isDuckActive) {
      engine.isDucking = true;
      if (!engine.isJumping) {
        engine.playerHeight = 32;
        engine.playerY = GROUND_Y - 32;
        incrementStats('totalDucks', 1);
      }
    } else {
      engine.isDucking = false;
      engine.playerHeight = 55;
      if (!engine.isJumping) {
        engine.playerY = GROUND_Y - 55;
      }
    }
  };

  // Particle Generators
  const spawnJumpParticles = () => {
    const engine = engineRef.current;
    if (settings.reduceMotion) return;
    const count = isMobileClient ? 3 : 8;
    for (let i = 0; i < count; i++) {
      engine.particles.push({
        x: engine.playerX + 15,
        y: GROUND_Y,
        vx: -2 - Math.random() * 3,
        vy: -Math.random() * 2,
        size: 3 + Math.random() * 4,
        color: '#d1d5db',
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        shape: 'square',
      });
    }
  };

  const spawnDoubleJumpParticles = () => {
    const engine = engineRef.current;
    if (settings.reduceMotion) return;
    const color = engine.selectedCharacter.color;
    const count = isMobileClient ? 6 : 15;
    for (let i = 0; i < count; i++) {
      engine.particles.push({
        x: engine.playerX + engine.playerWidth / 2,
        y: engine.playerY + engine.playerHeight / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        size: 2 + Math.random() * 3,
        color: color,
        alpha: 1,
        life: 0,
        maxLife: 25 + Math.random() * 15,
        shape: 'spark',
      });
    }
  };

  const spawnTripleJumpParticles = () => {
    const engine = engineRef.current;
    if (settings.reduceMotion) return;
    const color = '#38bdf8'; // Sky-cyan cosmic stellar energy
    const count = isMobileClient ? 10 : 25;
    for (let i = 0; i < count; i++) {
      engine.particles.push({
        x: engine.playerX + engine.playerWidth / 2,
        y: engine.playerY + engine.playerHeight / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: 2.5 + Math.random() * 4,
        color: color,
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        shape: 'spark',
      });
    }
  };

  const spawnLandingParticles = () => {
    const engine = engineRef.current;
    if (settings.reduceMotion) return;
    const count = isMobileClient ? 4 : 10;
    for (let i = 0; i < count; i++) {
      engine.particles.push({
        x: engine.playerX + engine.playerWidth / 2 + (Math.random() - 0.5) * 30,
        y: GROUND_Y,
        vx: (Math.random() - 0.5) * 6,
        vy: -0.5 - Math.random() * 1.5,
        size: 3 + Math.random() * 4,
        color: '#e5e7eb',
        alpha: 1,
        life: 0,
        maxLife: 15 + Math.random() * 10,
        shape: 'square',
      });
    }
  };

  const spawnDustParticle = () => {
    const engine = engineRef.current;
    const spawnThreshold = isMobileClient ? 0.15 : 0.45;
    if (settings.reduceMotion || engine.isJumping || Math.random() > spawnThreshold) return;
    engine.particles.push({
      x: engine.playerX + 5,
      y: GROUND_Y - 2,
      vx: -1.5 - Math.random() * 2.5,
      vy: -0.2 - Math.random() * 0.8,
      size: 2 + Math.random() * 4,
      color: 'rgba(224, 224, 224, 0.75)',
      alpha: 0.8,
      life: 0,
      maxLife: 15 + Math.random() * 10,
      shape: 'circle',
    });
  };

  const spawnTrailParticles = () => {
    const engine = engineRef.current;
    if (settings.reduceMotion || engine.selectedTrail.type === 'none') return;
    
    // limit trails more aggressively on mobile devices
    const skipTrailFraction = isMobileClient ? (engine.time % 3 !== 0) : (engine.time % 2 !== 0);
    if (skipTrailFraction) return; 

    const trailType = engine.selectedTrail.type;
    const trailColor = engine.selectedTrail.color;
    const px = engine.playerX + engine.playerWidth / 4;
    const py = engine.playerY + engine.playerHeight / 2;

    if (trailType === 'fire') {
      engine.particles.push({
        x: px,
        y: py + (Math.random() - 0.5) * 20,
        vx: -3 - Math.random() * 2,
        vy: -0.5 - Math.random() * 1.5,
        size: 4 + Math.random() * 5,
        color: Math.random() > 0.4 ? '#ef4444' : '#f97316',
        alpha: 0.9,
        life: 0,
        maxLife: 20 + Math.random() * 10,
        shape: 'square',
      });
    } else if (trailType === 'rainbow') {
      const colors = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
      const pickColor = colors[engine.time % colors.length];
      engine.particles.push({
        x: px,
        y: py + (Math.random() - 0.5) * 15,
        vx: -4,
        vy: 0,
        size: 5,
        color: pickColor,
        alpha: 0.85,
        life: 0,
        maxLife: 18,
        shape: 'circle',
      });
    } else if (trailType === 'electric') {
      if (Math.random() > 0.4) {
        engine.particles.push({
          x: px + (Math.random() - 0.5) * 15,
          y: py + (Math.random() - 0.5) * 25,
          vx: -1,
          vy: (Math.random() - 0.5) * 3,
          size: 2,
          color: '#22d3ee',
          alpha: 1,
          life: 0,
          maxLife: 10,
          shape: 'spark',
        });
      }
    } else if (trailType === 'shadow') {
      engine.particles.push({
        x: engine.playerX,
        y: engine.playerY,
        vx: -1.5,
        vy: 0,
        size: engine.playerHeight, // triggers silhouette drawing size
        color: 'rgba(0, 0, 0, 0.15)',
        alpha: 0.4,
        life: 0,
        maxLife: 15,
        shape: 'circle', // handle specifically
      });
    }
  };

  const spawnCoinCollectionParticles = (cx: number, cy: number) => {
    const engine = engineRef.current;
    if (settings.reduceMotion) return;
    for (let i = 0; i < 12; i++) {
      engine.particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: 2 + Math.random() * 4,
        color: '#fbbf24',
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        shape: 'circle',
      });
    }
  };

  const spawnDeathExplosion = () => {
    const engine = engineRef.current;
    if (settings.reduceMotion) return;
    const col = engine.selectedCharacter.color;
    for (let i = 0; i < 40; i++) {
      engine.particles.push({
        x: engine.playerX + engine.playerWidth / 2,
        y: engine.playerY + engine.playerHeight / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -2 - Math.random() * 8,
        size: 3 + Math.random() * 6,
        color: Math.random() > 0.4 ? col : '#f87171',
        alpha: 1,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
      });
    }
  };

  // Main game physics update loop
  const updatePhysics = () => {
    const engine = engineRef.current;

    // Time cycle advancement
    engine.time++;

    // Power-up timers decay
    if (engine.shieldActiveTimer > 0) engine.shieldActiveTimer--;
    if (engine.magnetActiveTimer > 0) engine.magnetActiveTimer--;
    if (engine.multiplierActiveTimer > 0) engine.multiplierActiveTimer--;

    // Multiplier timer decay
    if (engine.multiplierTimer > 0) {
      engine.multiplierTimer--;
      if (engine.multiplierTimer === 0) {
        engine.consecutivePerfectJumps = 0;
        engine.multiplier = 1;
        setGameState(prev => ({
          ...prev,
          multiplier: 1,
          consecutivePerfectJumps: 0,
        }));
      }
    }

    const deltaDistance = engine.speed / 60; // 60 FPS scale
    engine.distance += deltaDistance;

    // Accurate fractional score accumulator based on active multiplier & power-up multiplier (2x)
    const activeMultiplierScale = engine.multiplierActiveTimer > 0 ? 2 : 1;
    const scoreToAdd = deltaDistance * 10 * engine.multiplier * activeMultiplierScale;
    engine.scoreAccumulator = (engine.scoreAccumulator || 0) + scoreToAdd;
    if (engine.scoreAccumulator >= 1) {
      const wholePoints = Math.floor(engine.scoreAccumulator);
      engine.score += wholePoints;
      engine.scoreAccumulator -= wholePoints;
    }
    
    // Day cycle progress mapping: full loop every 3000 score points
    // Let's loop between 0 and 1 represent the full 3000 score stretch
    engine.dayProgress = (engine.score % 3000) / 3000;

    // Difficulty score achievements tracking
    if (engine.score >= 100) triggerAchievement('score-100');
    if (engine.score >= 500) triggerAchievement('score-500');
    if (engine.score >= 1000) triggerAchievement('score-1000');
    if (engine.score >= 5000) triggerAchievement('score-5000');

    // Gradually increase speed
    let speedMax = MAX_SPEED;
    if (engine.activeDifficulty === 'easy') speedMax = 11.0;
    if (engine.activeDifficulty === 'hard') speedMax = 16.5;

    const targetSpeed = BASE_SPEED + (engine.score / 150) * SPEED_INCREMENTAL;
    engine.speed = Math.min(targetSpeed, speedMax);

    // Sync state values to HUD periodically
    if (engine.time % 10 === 0) {
      setGameState(prev => ({
        ...prev,
        score: engine.score,
        coinsCollectedThisRun: engine.coinsInRun,
        speed: engine.speed,
        distance: Math.floor(engine.distance),
        multiplier: engine.multiplier,
        consecutivePerfectJumps: engine.consecutivePerfectJumps,
        shieldTimer: engine.shieldActiveTimer,
        magnetTimer: engine.magnetActiveTimer,
        powerMultiplierTimer: engine.multiplierActiveTimer,
      }));
    }

    // Scroll parallax background
    engine.scrollX += engine.speed;

    // Player Physics
    if (engine.isJumping) {
      engine.playerVY += GRAVITY;
      engine.playerY += engine.playerVY;

      // Check collision with virtual ground
      if (engine.playerY >= (engine.isDucking ? GROUND_Y - 32 : GROUND_Y - 55)) {
        engine.playerY = engine.isDucking ? GROUND_Y - 32 : GROUND_Y - 55;
        engine.playerVY = 0;
        engine.isJumping = false;
        engine.isDoubleJumping = false;
        engine.jumpCount = 0;
        engine.landingSquish = 8; // trigger squash visual animation
        sound.playJump(); // optional thud or skip
        spawnLandingParticles();
      }
    } else {
      // Running legs cycle
      engine.legPhase += engine.speed * 0.15;
      spawnDustParticle();
    }

    // Landing squash decay
    if (engine.landingSquish > 0) {
      engine.landingSquish -= 0.5;
    }

    // Active screen shake decay
    if (engine.screenShake > 0) {
      engine.screenShake -= 0.6;
    }

    // Active screen flash decay
    if (engine.screenFlash > 0) {
      engine.screenFlash -= 0.04;
    }

    // Spawn character trail effects
    spawnTrailParticles();

    // Spawn management: smart pacing
    engine.nextObstacleTimer -= 1;
    if (engine.nextObstacleTimer <= 0) {
      spawnObstacle();
    }

    engine.nextCoinTimer -= 1;
    if (engine.nextCoinTimer <= 0) {
      spawnCoinTrack();
    }

    engine.nextPowerUpTimer -= 1;
    if (engine.nextPowerUpTimer <= 0) {
      spawnPowerUp();
    }

    // Physics update: Obstacles
    for (let i = engine.obstacles.length - 1; i >= 0; i--) {
      const obs = engine.obstacles[i];
      obs.x -= engine.speed * obs.speedMultiplier;
      obs.wingPhase += 0.22; // wing flapping animation

      // Check if player successfully clears obstacle
      if (!obs.cleared && obs.x + obs.width < engine.playerX) {
        obs.cleared = true;
        incrementStats('obstaclesAvoided', 1);
        if (stats.obstaclesAvoided + 1 >= 100) {
          triggerAchievement('perfect-runner');
        }

        // PERFECT JUMP DETECTION
        if (engine.isJumping) {
          const bottomPlayer = engine.playerY + engine.playerHeight;
          const topObstacle = obs.y;
          const verticalGap = topObstacle - bottomPlayer;

          // If the player cleared it narrowly (e.g. within 38 pixels of collision top)
          if (verticalGap >= 0 && verticalGap <= 38) {
            engine.consecutivePerfectJumps++;
            
            // Scaled multiplier caps at 5x
            engine.multiplier = Math.min(5, engine.consecutivePerfectJumps + 1);
            engine.multiplierTimer = 360; // 6 seconds to keep/refill multiplier

            // Trigger acoustic feedback sound
            if (settings.soundEnabled) {
              sound.playPerfectJump(engine.multiplier);
            }

            // Screen punch/shake
            engine.screenShake = Math.min(6, engine.screenShake + 4);

            // Spawn floating text
            engine.floats.push({
              x: engine.playerX + engine.playerWidth / 2,
              y: engine.playerY - 20,
              text: `PERFECT! ${engine.multiplier}x`,
              color: engine.multiplier === 5 ? '#f43f5e' : '#00f2ff',
              alpha: 1,
              life: 0,
            });

            // Spark particles
            if (!settings.reduceMotion) {
              const particleColor = engine.multiplier === 5 ? '#e11d48' : '#06b6d4';
              for (let j = 0; j < 12; j++) {
                engine.particles.push({
                  x: engine.playerX + engine.playerWidth / 2,
                  y: engine.playerY + engine.playerHeight / 2,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  size: 3 + Math.random() * 4,
                  color: particleColor,
                  alpha: 1,
                  life: 0,
                  maxLife: 30 + Math.random() * 20,
                  shape: 'spark',
                });
              }
            }

            // Update React state immediately
            setGameState(prev => ({
              ...prev,
              multiplier: engine.multiplier,
              consecutivePerfectJumps: engine.consecutivePerfectJumps,
            }));
          }
        }
      }

      // Check collision
      if (checkCollision(engine.playerX, engine.playerY, engine.playerWidth, engine.playerHeight, obs.x, obs.y, obs.width, obs.height)) {
        if (engine.shieldActiveTimer > 0) {
          // Block collision with active Shield
          engine.shieldActiveTimer = 0;
          engine.screenFlash = 0.8;
          engine.screenShake = 12;

          // Push visual spark bubbles
          for (let pIdx = 0; pIdx < 20; pIdx++) {
            engine.particles.push({
              x: engine.playerX + engine.playerWidth / 2,
              y: engine.playerY + engine.playerHeight / 2,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              size: 4 + Math.random() * 5,
              color: '#3b82f6',
              alpha: 1,
              life: 0,
              maxLife: 35 + Math.random() * 20,
              shape: 'circle',
            });
          }

          engine.floats.push({
            x: engine.playerX + engine.playerWidth / 2,
            y: engine.playerY - 20,
            text: 'SHIELD BROKEN!',
            color: '#3b82f6',
            alpha: 1,
            life: 0,
          });

          // Play happy sound for recovery
          sound.playAchievement();

          engine.obstacles.splice(i, 1);
          continue;
        } else {
          triggerGameOver();
          return;
        }
      }

      // Cleanup off-screen
      if (obs.x < -150) {
        engine.obstacles.splice(i, 1);
      }
    }

    // Physics update: Coins
    for (let i = engine.coins.length - 1; i >= 0; i--) {
      const coin = engine.coins[i];

      // Magnet pull calculation
      if (engine.magnetActiveTimer > 0) {
        const px = engine.playerX + engine.playerWidth / 2;
        const py = engine.playerY + engine.playerHeight / 2;
        const cx = coin.x + coin.width / 2;
        const cy = coin.y + coin.height / 2;
        const dist = Math.hypot(px - cx, py - cy);

        if (dist < 260) {
          // Accelerating magnetic vacuum pull towards player
          const pullIntensity = Math.min(14, (260 - dist) * 0.1);
          coin.x += ((px - cx) / dist) * pullIntensity;
          coin.y += ((py - cy) / dist) * pullIntensity;
        } else {
          coin.x -= engine.speed;
        }
      } else {
        coin.x -= engine.speed;
      }

      coin.rotationPhase += 0.15;

      // Check collision (highly generous circle/rect mapping)
      if (checkCollision(engine.playerX, engine.playerY, engine.playerWidth, engine.playerHeight, coin.x, coin.y, coin.width, coin.height)) {
        // Collect coin!
        coin.collected = true;
        engine.coinsInRun += 1;
        
        // Update direct persistence stats
        setStats(prev => {
          const updatedCoins = prev.coins + 1;
          const updatedTotal = prev.totalCoinsCollected + 1;
          
          if (updatedTotal >= 1) triggerAchievement('first-coin');
          if (updatedTotal >= 100) triggerAchievement('coin-collector');

          return {
            ...prev,
            coins: updatedCoins,
            totalCoinsCollected: updatedTotal
          };
        });

        sound.playCoin();
        spawnCoinCollectionParticles(coin.x + coin.width/2, coin.y + coin.height/2);
        
        // Floating point indicator
        engine.floats.push({
          x: coin.x,
          y: coin.y - 10,
          text: '+1',
          color: '#f59e0b',
          alpha: 1,
          life: 0,
        });

        engine.coins.splice(i, 1);
        continue;
      }

      // Cleanup
      if (coin.x < -100) {
        engine.coins.splice(i, 1);
      }
    }

    // Physics update: Power-Ups
    for (let i = engine.powerUps.length - 1; i >= 0; i--) {
      const pu = engine.powerUps[i];
      pu.x -= engine.speed;
      pu.pulsePhase += 0.08;

      // check collision
      if (checkCollision(engine.playerX, engine.playerY, engine.playerWidth, engine.playerHeight, pu.x, pu.y, pu.width, pu.height)) {
        pu.collected = true;
        
        let pColor = '#38bdf8'; // shield
        let pText = 'SHIELD PROTECT!';
        if (pu.type === 'magnet') {
          pColor = '#ec4899'; // pink magnet
          pText = 'COIN MAGNET!';
          engine.magnetActiveTimer = 480; // 8 seconds of coin pulling
        } else if (pu.type === 'multiplier') {
          pColor = '#eab308'; // gold score multiplier
          pText = 'DOUBLE POINTS! x2';
          engine.multiplierActiveTimer = 360; // 6 seconds of x2 score multiplier
        } else {
          engine.shieldActiveTimer = 600; // 10 seconds of shield protection
        }

        for (let j = 0; j < 15; j++) {
          engine.particles.push({
            x: pu.x + pu.width / 2,
            y: pu.y + pu.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: 3 + Math.random() * 4,
            color: pColor,
            alpha: 1,
            life: 0,
            maxLife: 30 + Math.random() * 20,
            shape: 'circle',
          });
        }

        engine.floats.push({
          x: pu.x,
          y: pu.y - 15,
          text: pText,
          color: pColor,
          alpha: 1,
          life: 0,
        });

        sound.playAchievement();

        engine.powerUps.splice(i, 1);
        continue;
      }

      // Cleanup
      if (pu.x < -100) {
        engine.powerUps.splice(i, 1);
      }
    }

    // Physics update: Particles
    for (let i = engine.particles.length - 1; i >= 0; i--) {
      const p = engine.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1 - (p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        engine.particles.splice(i, 1);
      }
    }

    // Physics update: Floats
    for (let i = engine.floats.length - 1; i >= 0; i--) {
      const f = engine.floats[i];
      f.life++;
      f.y -= 1.2;
      f.alpha = 1 - (f.life / 40);

      if (f.life >= 40) {
        engine.floats.splice(i, 1);
      }
    }
  };

  // Dynamic Weather overlay particles simulator (rain, snow, ash/embers, and dandelions/blossoms)
  const updateWeatherPhysics = () => {
    const engine = engineRef.current;
    
    // Safety check for accessibility motion sensitivity
    if (settings.reduceMotion) {
      if (engine.weatherParticles.length > 0) {
        engine.weatherParticles = [];
      }
      return;
    }

    const activeThemeId = engine.selectedTheme?.id || 'theme_classic';
    let weatherStyle = 'classic';
    if (activeThemeId === 'theme_cyber' || activeThemeId.includes('synth') || activeThemeId.includes('noir') || activeThemeId.includes('neon')) {
      weatherStyle = 'cyber';
    } else if (activeThemeId === 'theme_volcanic' || activeThemeId.includes('desert') || activeThemeId.includes('magma') || activeThemeId.includes('ash')) {
      weatherStyle = 'volcanic';
    } else if (activeThemeId === 'theme_valley' || activeThemeId.includes('cherry') || activeThemeId.includes('sakura')) {
      weatherStyle = 'valley';
    }

    const maxParticles = weatherStyle === 'classic' ? 120 
                        : weatherStyle === 'cyber' ? 80 
                        : weatherStyle === 'volcanic' ? 110 
                        : 80;

    // 1. Spawning controls
    if (engine.weatherParticles.length < maxParticles) {
      const spawnChance = 0.65;
      if (Math.random() < spawnChance) {
        if (weatherStyle === 'classic') {
          // Classic theme: Beautiful slant-dripping azure rain drops
          const onRightSide = Math.random() > 0.75;
          engine.weatherParticles.push({
            type: 'rain',
            x: onRightSide ? 1010 : Math.random() * 1100 - 100,
            y: onRightSide ? Math.random() * 300 - 10 : -15,
            vx: -3.5 - (engine.isPlaying ? engine.speed * 0.35 : 0),
            vy: 9.0 + Math.random() * 3.5,
            size: 1.2 + Math.random() * 1.0,
            length: 12 + Math.random() * 10,
            color: 'rgba(14, 165, 233, 0.45)',
            alpha: 0.4 + Math.random() * 0.3,
          });
        } else if (weatherStyle === 'cyber') {
          // Cyber Sunset theme: Neon digital matrix rain (cyan, magenta, purple)
          const choice = Math.random();
          const color = choice > 0.7 ? '#f43f5e' : (choice > 0.35 ? '#00f2ff' : '#a855f7');
          engine.weatherParticles.push({
            type: 'cyber',
            x: Math.random() * VIRTUAL_WIDTH,
            y: -20,
            vx: -1.5 - (engine.isPlaying ? engine.speed * 0.2 : 0),
            vy: 11.0 + Math.random() * 4.5,
            size: 1.5 + Math.random() * 1.5,
            length: 16 + Math.random() * 14,
            color: color,
            alpha: 0.6 + Math.random() * 0.4,
          });
        } else if (weatherStyle === 'volcanic') {
          // Volcanic: Ash flakes combined with rising magma embers
          if (Math.random() < 0.65) {
            // Dark gray ash drifting down-left
            const onRightSide = Math.random() > 0.7;
            engine.weatherParticles.push({
              type: 'ash',
              x: onRightSide ? 1010 : Math.random() * 1100 - 100,
              y: onRightSide ? Math.random() * 300 - 10 : -15,
              vx: -3.0 - (engine.isPlaying ? engine.speed * 0.45 : 0),
              vy: 2.0 + Math.random() * 2.5,
              size: 2.2 + Math.random() * 3.0,
              color: Math.random() > 0.5 ? 'rgba(75, 85, 99, 0.45)' : 'rgba(55, 65, 81, 0.55)',
              alpha: 0.4 + Math.random() * 0.3,
            });
          }
          if (Math.random() < 0.35) {
            // Glowing lava embers rising upward with sinuous heat drafts
            const choice = Math.random();
            const color = choice > 0.66 ? '#ff4d00' : (choice > 0.33 ? '#ffaa00' : '#ff003c');
            engine.weatherParticles.push({
              type: 'ember',
              x: Math.random() * VIRTUAL_WIDTH,
              y: GROUND_Y + Math.random() * 80,
              vx: -1.0 - (engine.isPlaying ? engine.speed * 0.15 : 0),
              vy: -1.2 - Math.random() * 1.8,
              size: 1.8 + Math.random() * 2.2,
              color: color,
              alpha: 0.8 + Math.random() * 0.2,
              life: 0,
              maxLife: 90 + Math.floor(Math.random() * 90),
            });
          }
        } else if (weatherStyle === 'valley') {
          // Emerald Valley: Spinning cherry blossom petals and floating emerald/golden pollen
          if (Math.random() < 0.5) {
            // Pink blossom petal drifting down
            const onRightSide = Math.random() > 0.7;
            engine.weatherParticles.push({
              type: 'petal',
              x: onRightSide ? 1010 : Math.random() * 1100 - 100,
              y: onRightSide ? Math.random() * 300 - 10 : -15,
              vx: -1.8 - (engine.isPlaying ? engine.speed * 0.2 : 0),
              vy: 0.9 + Math.random() * 1.1,
              size: 4.5 + Math.random() * 4.0,
              color: 'rgba(244, 63, 94, 0.65)',
              alpha: 0.55 + Math.random() * 0.35,
              angle: Math.random() * Math.PI * 2,
              spin: (Math.random() - 0.5) * 0.04,
            });
          }
          if (Math.random() < 0.4) {
            // Soft emerald/golden pollen specs
            engine.weatherParticles.push({
              type: 'pollen',
              x: Math.random() * VIRTUAL_WIDTH,
              y: Math.random() * GROUND_Y,
              vx: -0.8 - (engine.isPlaying ? engine.speed * 0.1 : 0),
              vy: 0.3 + Math.random() * 0.5,
              size: 1.5 + Math.random() * 2.0,
              color: Math.random() > 0.55 ? 'rgba(250, 204, 21, 0.55)' : 'rgba(52, 211, 153, 0.45)',
              alpha: 0.35 + Math.random() * 0.35,
              life: 0,
              maxLife: 100 + Math.floor(Math.random() * 80),
            });
          }
        }
      }
    }

    // 2. Physics & lifespans
    for (let i = engine.weatherParticles.length - 1; i >= 0; i--) {
      const p = engine.weatherParticles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.life !== undefined) {
        p.life++;
      }

      // Add unique structural forces for embers, petals & pollen
      if (p.type === 'ember') {
        p.x += Math.sin((p.life || 0) * 0.05) * 0.5;
        p.alpha = 1 - ((p.life || 0) / (p.maxLife || 100));
        if ((p.life || 0) >= (p.maxLife || 100)) {
          engine.weatherParticles.splice(i, 1);
          continue;
        }
      } else if (p.type === 'pollen') {
        p.x += Math.sin((p.life || 0) * 0.04) * 0.3;
        p.alpha = 0.3 + Math.sin((p.life || 0) * 0.02) * 0.25;
        if ((p.life || 0) >= (p.maxLife || 120)) {
          engine.weatherParticles.splice(i, 1);
          continue;
        }
      } else if (p.type === 'petal') {
        p.angle = (p.angle || 0) + (p.spin || 0.02);
        p.x += Math.sin(p.angle) * 0.6;
      } else if (p.type === 'splash') {
        p.life = (p.life || 0) + 1;
        p.alpha = 1 - ((p.life || 0) / (p.maxLife || 8));
        if ((p.life || 0) >= (p.maxLife || 8)) {
          engine.weatherParticles.splice(i, 1);
          continue;
        }
      }

      // Splattering triggers when hitting hard ground
      if (p.type === 'rain' && p.y >= GROUND_Y) {
        if (Math.random() < 0.25) {
          const count = 2 + Math.floor(Math.random() * 2);
          for (let s = 0; s < count; s++) {
            engine.weatherParticles.push({
              type: 'splash',
              x: p.x,
              y: GROUND_Y,
              vx: -1.5 + Math.random() * 3.0,
              vy: -1.2 - Math.random() * 1.5,
              size: 0.6 + Math.random() * 0.6,
              color: p.color,
              alpha: 0.7,
              life: 0,
              maxLife: 6 + Math.floor(Math.random() * 6),
            });
          }
        }
        engine.weatherParticles.splice(i, 1);
        continue;
      }

      // Cleanup when completely off limits
      const isOffScreen = p.y > 420 || p.x < -120 || p.x > 1120 || p.y < -60;
      if (isOffScreen) {
        engine.weatherParticles.splice(i, 1);
      }
    }
  };

  // Rect collision check with buffer margins for visual forgivability
  const checkCollision = (
    rx1: number, ry1: number, rw1: number, rh1: number,
    rx2: number, ry2: number, rw2: number, rh2: number
  ) => {
    // Highly interactive pixel margin reduction (5px inward on all borders)
    const padding = 6;
    return (
      rx1 + padding < rx2 + rw2 - padding &&
      rx1 + rw1 - padding > rx2 + padding &&
      ry1 + padding < ry2 + rh2 - padding &&
      ry1 + rh1 - padding > ry2 + padding
    );
  };

  // Smart Obstacle Spawn Generator
  const spawnObstacle = () => {
    const engine = engineRef.current;
    
    // Minimum gap ensures the user always has structural space to jump/avoid
    const gameComplexityOffset = Math.min(engine.speed * 28, 500); 
    engine.minDistanceBetweenObstacles = 230 + gameComplexityOffset;

    const types: GameObstacle['type'][] = ['rock_small', 'rock_large', 'stump', 'barrel', 'bird', 'robot_bird'];
    const weights = [30, 25, 20, 15, 10, 5]; // Rarity
    
    // Choose obstacles based on score/difficulty
    let selectionList = types.slice(0, 4); // basic ground items
    if (engine.score > 200) selectionList.push('bird');
    if (engine.score > 400) selectionList.push('robot_bird');

    const chosenType = selectionList[Math.floor(Math.random() * selectionList.length)];
    
    let width = 35;
    let height = 40;
    let y = GROUND_Y - height;
    let speedMultiplier = 1.0;

    switch (chosenType) {
      case 'rock_small':
        width = 30;
        height = 30;
        y = GROUND_Y - height;
        break;
      case 'rock_large':
        width = 65;
        height = 46;
        y = GROUND_Y - height;
        break;
      case 'stump':
        width = 32;
        height = 36;
        y = GROUND_Y - height;
        break;
      case 'barrel':
        width = 40;
        height = 42;
        y = GROUND_Y - height;
        break;
      case 'bird':
        width = 42;
        height = 30;
        // Fly height tracks: 
        // 270 = must jump, 215 = must duck, 140 = safe high flying (easy to run underneath)
        const heights = [270, 215, 140];
        y = heights[Math.floor(Math.random() * heights.length)];
        speedMultiplier = 1.15; // moves slightly faster than scene scroll
        break;
      case 'robot_bird':
        width = 46;
        height = 34;
        const roboHeights = [265, 205];
        y = roboHeights[Math.floor(Math.random() * roboHeights.length)];
        speedMultiplier = 1.25;
        break;
    }

    engine.obstacles.push({
      id: `${engine.time}-${Math.random()}`,
      type: chosenType,
      x: VIRTUAL_WIDTH + 50,
      y,
      width,
      height,
      cleared: false,
      wingPhase: 0,
      speedMultiplier,
    });

    // Smart distance pacing: speed dictates time to next spawn in frames
    engine.nextObstacleTimer = (engine.minDistanceBetweenObstacles + Math.random() * 200) / engine.speed;
    engine.lastObstacleType = chosenType;
  };

  // Coin Tracks Spawn System
  const spawnCoinTrack = () => {
    const engine = engineRef.current;
    
    // Choose a track layout pattern
    const patterns = ['single', 'double', 'triple', 'wave', 'arch'];
    const p = patterns[Math.floor(Math.random() * patterns.length)];
    
    const coinYHigh = GROUND_Y - 110;
    const coinYMed = GROUND_Y - 60;
    const coinYLow = GROUND_Y - 25;
    
    const count = p === 'single' ? 1 : p === 'double' ? 2 : p === 'wave' || p === 'arch' ? 4 : 3;

    // Check if space ahead overlaps immediately with obstacles
    let tooClose = false;
    engine.obstacles.forEach(obs => {
      if (obs.x > VIRTUAL_WIDTH - 20) tooClose = true;
    });

    if (tooClose) {
      // Delay coin track spawning briefly
      engine.nextCoinTimer = 60;
      return;
    }

    for (let i = 0; i < count; i++) {
      let x = VIRTUAL_WIDTH + 60 + (i * 45);
      let y = coinYMed;

      if (p === 'arch') {
        // upside-down parabola shape
        const offset = [0, 25, 25, 0];
        y = coinYMed - offset[i];
      } else if (p === 'wave') {
        const offset = [0, 25, 0, -25];
        y = coinYMed + offset[i];
      } else if (p === 'single') {
        y = Math.random() > 0.5 ? coinYHigh : coinYMed;
      }

      engine.coins.push({
        id: `${engine.time}-coin-${i}-${Math.random()}`,
        x,
        y,
        width: 22,
        height: 22,
        collected: false,
        rotationPhase: i * 0.45,
      });
    }

    // Set countdown for next cluster
    engine.nextCoinTimer = (450 + Math.random() * 400) / engine.speed;
  };

  // Power-Ups Spawn System
  const spawnPowerUp = () => {
    const engine = engineRef.current;

    // Choose random power-up: shield, magnet, or multiplier
    const types: ('shield' | 'magnet' | 'multiplier')[] = ['shield', 'magnet', 'multiplier'];
    const pType = types[Math.floor(Math.random() * types.length)];

    const py = GROUND_Y - 60 - Math.random() * 45; // float above ground level

    // Ensure we don't spawn powerups directly on top of an obstacle
    let tooClose = false;
    engine.obstacles.forEach(obs => {
      if (obs.x > VIRTUAL_WIDTH - 60) tooClose = true;
    });

    if (tooClose) {
      engine.nextPowerUpTimer = 30; // retry soon
      return;
    }

    engine.powerUps.push({
      id: `${engine.time}-power-${pType}-${Math.random()}`,
      type: pType,
      x: VIRTUAL_WIDTH + 50,
      y: py,
      width: 26,
      height: 26,
      collected: false,
      pulsePhase: Math.random() * Math.PI,
    });

    // Reset countdown for next power-up cluster
    engine.nextPowerUpTimer = 750 + Math.random() * 600;
  };

  const triggerGameOver = () => {
    const engine = engineRef.current;
    engine.isDead = true;
    engine.isPlaying = false;
    engine.screenShake = 24; // impact feedback shake
    engine.screenFlash = 1.0; // intense red screen flash overlay
    
    sound.stopMusic();
    sound.playHit();
    sound.playGameOver();
    
    spawnDeathExplosion();

    // Trigger game over callbacks
    onGameOver(engine.score, engine.coinsInRun);
  };

  // High Fidelity 2D Canvas Renderer
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = engineRef.current;
    const t = engine.selectedTheme;

    // Canvas scaling vectors
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const dpr = isMobile
      ? Math.min(1.2, window.devicePixelRatio || 1)
      : Math.min(2.0, window.devicePixelRatio || 1);
    const renderWidth = canvas.width;
    const renderHeight = canvas.height;

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Apply Screen Shake if active
    if (engine.screenShake > 0) {
      const dx = (Math.random() - 0.5) * engine.screenShake;
      const dy = (Math.random() - 0.5) * engine.screenShake;
      ctx.translate(dx, dy);
    }

    // Draw viewport mapping (Scale virtual coordinates 1000x400 to actual pixel size)
    const containerWidth = renderWidth / dpr;
    const containerHeight = renderHeight / dpr;
    const scaleX = containerWidth / VIRTUAL_WIDTH;
    const scaleY = containerHeight / VIRTUAL_HEIGHT;
    
    ctx.scale(scaleX, scaleY);

    // Dynamic Sky Color Interpolation (Day/Night)
    let skyBg = t.skyColor;
    let mountainsBg = t.mountainColor;
    let treeBg = t.treeColor;
    let groundBg = t.groundColor;

    // Day Cycle progression: Noon -> Sunset -> Night -> Sunrise -> Noon
    // Phase 0.0 - 0.45: Day
    // Phase 0.45 - 0.55: Sunset (transitional)
    // Phase 0.55 - 0.90: Night
    // Phase 0.90 - 1.0: Sunrise (transitional)
    const progress = engine.dayProgress;
    let skyNightAlpha = 0;

    if (progress > 0.45 && progress <= 0.55) {
      skyNightAlpha = (progress - 0.45) / 0.1; // Sunset factor
    } else if (progress > 0.55 && progress <= 0.90) {
      skyNightAlpha = 1.0; // Complete Dark Night
    } else if (progress > 0.90 && progress <= 1.0) {
      skyNightAlpha = 1.0 - ((progress - 0.90) / 0.1); // Sunrise factor
    }

    // Sky linear gradient blending (highly immersive vector colors)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 255, b: 255 };
    };

    const cDay = hexToRgb(t.skyColor);
    const cNight = hexToRgb(t.skyNightColor);

    const mixR = Math.round(cDay.r * (1 - skyNightAlpha) + cNight.r * skyNightAlpha);
    const mixG = Math.round(cDay.g * (1 - skyNightAlpha) + cNight.g * skyNightAlpha);
    const mixB = Math.round(cDay.b * (1 - skyNightAlpha) + cNight.b * skyNightAlpha);

    skyGrad.addColorStop(0, `rgb(${mixR}, ${mixG}, ${mixB})`);
    
    // Add glowing gradient depth towards the ground
    const cDepth = skyNightAlpha > 0.5 ? 'deepskyblue' : '#fef08a'; // orange dawn glow vs night horizon glow
    const depthBlend = skyNightAlpha > 0.4 && skyNightAlpha < 0.9 ? `rgba(244,63,94,${Math.sin(skyNightAlpha*Math.PI)*0.5})` : `rgba(${mixR + 20}, ${mixG + 20}, ${mixB + 20}, 1)`;
    skyGrad.addColorStop(1, depthBlend);

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 1. Draw Star Constellations ( twinkly dots during night phases )
    if (skyNightAlpha > 0.1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${skyNightAlpha * 0.95})`;
      const seedStars = [
        { x: 100, y: 50, s: 2 }, { x: 156, y: 120, s: 1.5 }, { x: 230, y: 40, s: 1 }, 
        { x: 380, y: 90, s: 2 }, { x: 450, y: 60, s: 1 }, { x: 580, y: 110, s: 1.5 },
        { x: 700, y: 40, s: 2.5 }, { x: 820, y: 80, s: 1 }, { x: 910, y: 55, s: 2 },
        { x: 960, y: 130, s: 1.5 }, { x: 60, y: 150, s: 1 }, { x: 310, y: 160, s: 2 }
      ];
      seedStars.forEach((star, index) => {
        const twinkle = Math.sin(engine.time * 0.04 + index) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${skyNightAlpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 2. Draw Sun or Moon based on Day Progress with Rich Glow and Rings
    const celestialRadius = 24;
    const celestialY = 70 + Math.sin(progress * Math.PI * 2 + Math.PI/2) * 50; 
    let celestialX = (progress * VIRTUAL_WIDTH * 1.5) % (VIRTUAL_WIDTH * 1.4) - 200;

    if (progress <= 0.5) {
      // Draw Sun with Radial Heat Halo
      ctx.save();
      if (!settings.reduceMotion && !isMobile) {
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#eab308';
      }
      
      const sunHalo = ctx.createRadialGradient(celestialX + 150, celestialY + 15, 5, celestialX + 150, celestialY + 15, 65);
      sunHalo.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
      sunHalo.addColorStop(0.35, 'rgba(234, 179, 8, 0.35)');
      sunHalo.addColorStop(1, 'rgba(234, 179, 8, 0)');
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(celestialX + 150, celestialY + 15, 65, 0, Math.PI * 2);
      ctx.fill();

      // Sun Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(celestialX + 150, celestialY + 15, celestialRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Draw Moon with Celestial Nebula Aura
      ctx.save();
      if (!settings.reduceMotion && !isMobile) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#38bdf8';
      }

      const moonHalo = ctx.createRadialGradient((celestialX - VIRTUAL_WIDTH * 0.7) + 200, celestialY + 25, 4, (celestialX - VIRTUAL_WIDTH * 0.7) + 200, celestialY + 25, 50);
      moonHalo.addColorStop(0, 'rgba(241, 245, 249, 1)');
      moonHalo.addColorStop(0.4, 'rgba(56, 189, 248, 0.25)');
      moonHalo.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 200, celestialY + 25, 50, 0, Math.PI * 2);
      ctx.fill();

      // Moon Primary Core
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 200, celestialY + 25, celestialRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Lunar crater details with shadows
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 194, celestialY + 20, 3.8, 0, Math.PI * 2);
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 206, celestialY + 30, 2.8, 0, Math.PI * 2);
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 202, celestialY + 18, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Double Parallax Mountains Layer (Breathtaking Scenic Depth)
    
    // --- LAYER A: Taller Far-Hills silhouette (Very slow scroll - scroll factor 0.045) ---
    const farMountScroll = (engine.scrollX * 0.045) % 600;
    ctx.fillStyle = skyNightAlpha > 0.5 ? 'rgba(30, 41, 59, 0.22)' : 'rgba(255, 255, 255, 0.16)';
    const drawFarMountains = (offsetX: number) => {
      ctx.beginPath();
      ctx.moveTo(-offsetX, GROUND_Y + 5);
      ctx.lineTo(120 - offsetX, 130);
      ctx.lineTo(250 - offsetX, 190);
      ctx.lineTo(390 - offsetX, 100);
      ctx.lineTo(540 - offsetX, 210);
      ctx.lineTo(710 - offsetX, 110);
      ctx.lineTo(870 - offsetX, 220);
      ctx.lineTo(1100 - offsetX, GROUND_Y + 5);
      ctx.closePath();
      ctx.fill();
    };
    drawFarMountains(farMountScroll);
    drawFarMountains(farMountScroll - 600);
    drawFarMountains(farMountScroll + 600);

    // --- LAYER B: Near Mountains with Theme-Specific Styles (Scroll Factor: 0.12) ---
    const nearMountScroll = (engine.scrollX * 0.12) % 600;
    ctx.fillStyle = mountainsBg;
    
    const drawNearMountains = (offsetX: number) => {
      // Main near mountain body
      ctx.beginPath();
      ctx.moveTo(-offsetX, GROUND_Y + 5);
      ctx.lineTo(150 - offsetX, 190);
      ctx.lineTo(280 - offsetX, 260);
      ctx.lineTo(420 - offsetX, 150);
      ctx.lineTo(580 - offsetX, 275);
      ctx.lineTo(750 - offsetX, 180);
      ctx.lineTo(920 - offsetX, 290);
      ctx.lineTo(1100 - offsetX, GROUND_Y + 5);
      ctx.closePath();
      ctx.fill();

      // Theme-specific premium decorative overlays!
      const activeThemeId = engine.selectedTheme?.id || 'theme_classic';
      if (activeThemeId === 'theme_cyber' || activeThemeId.includes('synth') || activeThemeId.includes('noir') || activeThemeId.includes('neon')) {
        // Futuristic Cyber Laser Slopes
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.38)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(150 - offsetX, 190); ctx.lineTo(150 - offsetX, GROUND_Y);
        ctx.moveTo(420 - offsetX, 150); ctx.lineTo(420 - offsetX, GROUND_Y);
        ctx.moveTo(750 - offsetX, 180); ctx.lineTo(750 - offsetX, GROUND_Y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
        ctx.beginPath();
        ctx.moveTo(100 - offsetX, 230); ctx.lineTo(190 - offsetX, 222);
        ctx.moveTo(380 - offsetX, 180); ctx.lineTo(460 - offsetX, 172);
        ctx.moveTo(710 - offsetX, 212); ctx.lineTo(790 - offsetX, 212);
        ctx.stroke();
      } else if (activeThemeId === 'theme_volcanic') {
        // Glowing Magma Fissures!
        ctx.save();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2.0;
        if (!settings.reduceMotion && !isMobile) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#f97316';
        }
        ctx.beginPath();
        ctx.moveTo(150 - offsetX, 190); ctx.lineTo(165 - offsetX, 215); ctx.lineTo(160 - offsetX, 240); ctx.lineTo(185 - offsetX, GROUND_Y);
        ctx.moveTo(420 - offsetX, 150); ctx.lineTo(412 - offsetX, 185); ctx.lineTo(432 - offsetX, 228); ctx.lineTo(418 - offsetX, GROUND_Y);
        ctx.stroke();
        ctx.restore();
      } else if (activeThemeId === 'theme_frozen') {
        // White Glacier Snow-Caps on mountain tops
        ctx.fillStyle = '#ffffff';
        // Glacier Cap 1
        ctx.beginPath();
        ctx.moveTo(150 - offsetX, 190);
        ctx.lineTo(112 - offsetX, 212);
        ctx.lineTo(188 - offsetX, 212);
        ctx.closePath();
        ctx.fill();

        // Glacier Cap 2
        ctx.beginPath();
        ctx.moveTo(420 - offsetX, 150);
        ctx.lineTo(385 - offsetX, 175);
        ctx.lineTo(455 - offsetX, 175);
        ctx.closePath();
        ctx.fill();

        // Glacier Cap 3
        ctx.beginPath();
        ctx.moveTo(750 - offsetX, 180);
        ctx.lineTo(715 - offsetX, 201);
        ctx.lineTo(785 - offsetX, 201);
        ctx.closePath();
        ctx.fill();
      } else if (activeThemeId === 'theme_golden') {
        // Majestic golden-halo outlines around mountain ranges
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.2;
        if (!settings.reduceMotion && !isMobile) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#fbbf24';
        }
        ctx.beginPath();
        ctx.moveTo(-offsetX, GROUND_Y);
        ctx.lineTo(150 - offsetX, 190);
        ctx.lineTo(280 - offsetX, 260);
        ctx.lineTo(420 - offsetX, 150);
        ctx.lineTo(580 - offsetX, 275);
        ctx.lineTo(750 - offsetX, 180);
        ctx.lineTo(920 - offsetX, 290);
        ctx.lineTo(1100 - offsetX, GROUND_Y);
        ctx.stroke();
        ctx.restore();
      } else if (activeThemeId === 'theme_valley') {
        // Bright emerald vegetation banks on peak flanks
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(150 - offsetX, 228, 22, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(420 - offsetX, 185, 28, 4.5, 0, 0, Math.PI * 2);
        ctx.ellipse(750 - offsetX, 218, 25, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawNearMountains(nearMountScroll);
    drawNearMountains(nearMountScroll - 600);
    drawNearMountains(nearMountScroll + 600);

    // 4. Clouds layer (Very slow floating drift with overlapping detail)
    ctx.fillStyle = skyNightAlpha > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.45)';
    const cloudScroll = (engine.scrollX * 0.15 + engine.time * 0.25) % (VIRTUAL_WIDTH + 300);
    const drawCloud = (cx: number, cy: number, w: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.4, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.3, cy - w * 0.1, w * 0.5, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.6, cy, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
    };

    drawCloud(VIRTUAL_WIDTH + 150 - cloudScroll, 80, 50);
    drawCloud(VIRTUAL_WIDTH + 600 - cloudScroll, 120, 65);
    drawCloud(VIRTUAL_WIDTH + 950 - cloudScroll, 70, 45);

    // 5. Pine Tree Silhouette Forest (Medium parallax scroll)
    ctx.fillStyle = treeBg;
    const treeScroll = (engine.scrollX * 0.38) % 360;
    const drawTree = (tx: number, h: number) => {
      ctx.beginPath();
      ctx.moveTo(tx, GROUND_Y);
      ctx.lineTo(tx + 12, GROUND_Y - h * 0.3);
      ctx.lineTo(tx + 4, GROUND_Y - h * 0.3);
      ctx.lineTo(tx + 16, GROUND_Y - h * 0.65);
      ctx.lineTo(tx + 8, GROUND_Y - h * 0.65);
      ctx.lineTo(tx + 20, GROUND_Y - h); // top
      ctx.lineTo(tx + 32, GROUND_Y - h * 0.65);
      ctx.lineTo(tx + 24, GROUND_Y - h * 0.65);
      ctx.lineTo(tx + 36, GROUND_Y - h * 0.3);
      ctx.lineTo(tx + 28, GROUND_Y - h * 0.3);
      ctx.lineTo(tx + 40, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    };

    for (let i = -1; i < 7; i++) {
      const xBase = i * 180 - treeScroll;
      drawTree(xBase + 10, 85);
      drawTree(xBase + 65, 110);
      drawTree(xBase + 115, 70);
    }

    // 6. Hard Ground Layer with Theme-Specific Premium Effects
    const activeThemeId = engine.selectedTheme?.id || 'theme_classic';
    let trackGlowColor = '#4b5563';
    if (activeThemeId === 'theme_cyber' || activeThemeId.includes('synth') || activeThemeId.includes('neon')) {
      trackGlowColor = '#00f2ff';
    } else if (activeThemeId === 'theme_volcanic') {
      trackGlowColor = '#f97316';
    } else if (activeThemeId === 'theme_frozen') {
      trackGlowColor = '#e0f2fe';
    } else if (activeThemeId === 'theme_golden') {
      trackGlowColor = '#fbbf24';
    } else if (activeThemeId === 'theme_valley') {
      trackGlowColor = '#22c55e';
    }

    if (settings.enable3D) {
      // 3D Receding Trapezoidal High-Fidelity Horizon Track
      ctx.fillStyle = groundBg;
      ctx.beginPath();
      ctx.moveTo(80, GROUND_Y);
      ctx.lineTo(VIRTUAL_WIDTH - 80, GROUND_Y);
      ctx.lineTo(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      ctx.lineTo(0, VIRTUAL_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Receding 3D Track outer glowing borders
      ctx.save();
      ctx.strokeStyle = trackGlowColor;
      ctx.lineWidth = 3.5;
      if (trackGlowColor !== '#4b5563' && !settings.reduceMotion && !isMobile) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = trackGlowColor;
      }
      // Left boundary line
      ctx.beginPath();
      ctx.moveTo(80, GROUND_Y);
      ctx.lineTo(0, VIRTUAL_HEIGHT);
      ctx.stroke();

      // Right boundary line
      ctx.beginPath();
      ctx.moveTo(VIRTUAL_WIDTH - 80, GROUND_Y);
      ctx.lineTo(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      ctx.stroke();
      ctx.restore();

      // Shaded road center lane dividers scrolling in 3D perspective
      const scrollSpeed = engine.scrollX * 0.8;
      ctx.strokeStyle = skyNightAlpha > 0.4 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
      if (activeThemeId === 'theme_cyber' || activeThemeId.includes('synth') || activeThemeId.includes('neon')) {
        ctx.strokeStyle = skyNightAlpha > 0.4 ? 'rgba(124, 58, 237, 0.35)' : 'rgba(124, 58, 237, 0.22)';
      }
      ctx.lineWidth = 1.5;

      // Render perspective horizontal grid lines that accelerate as they approach the screen
      for (let i = 0; i < 15; i++) {
        const lineZ = ((i * 0.07) + (scrollSpeed * 0.00065)) % 1.0;
        const ratio = Math.pow(lineZ, 2.2); // Exponential depth progression
        const lineY = GROUND_Y + ratio * (VIRTUAL_HEIGHT - GROUND_Y);
        // Map road width based on trapezoidal expansion
        const lineW = (VIRTUAL_WIDTH - 160) + ratio * 160;
        const lineXL = VIRTUAL_WIDTH/2 - lineW/2;
        const lineXR = VIRTUAL_WIDTH/2 + lineW/2;

        ctx.beginPath();
        ctx.moveTo(lineXL, lineY);
        ctx.lineTo(lineXR, lineY);
        ctx.stroke();
      }

      // Draw converging vertical perspective floor beams
      const linesCount = 8;
      for (let i = 0; i <= linesCount; i++) {
        const t = i / linesCount;
        const topX = 80 + t * (VIRTUAL_WIDTH - 160);
        const botX = t * VIRTUAL_WIDTH;

        ctx.beginPath();
        ctx.moveTo(topX, GROUND_Y);
        ctx.lineTo(botX, VIRTUAL_HEIGHT);
        ctx.stroke();
      }
    } else {
      // Classic 2D Ground Layer fallback
      ctx.fillStyle = groundBg;
      ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - GROUND_Y);

      ctx.save();
      ctx.fillStyle = trackGlowColor;
      if (trackGlowColor !== '#4b5563' && !settings.reduceMotion && !isMobile) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = trackGlowColor;
      }
      ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, 4);
      ctx.restore();

      const dirtScroll = (engine.scrollX) % 120;
      if (activeThemeId === 'theme_cyber' || activeThemeId.includes('synth') || activeThemeId.includes('neon')) {
        ctx.strokeStyle = skyNightAlpha > 0.4 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.12)';
        ctx.lineWidth = 1.0;
        for (let hY = GROUND_Y + 10; hY < VIRTUAL_HEIGHT; hY += 12) {
          ctx.beginPath();
          ctx.moveTo(0, hY);
          ctx.lineTo(VIRTUAL_WIDTH, hY);
          ctx.stroke();
        }
        for (let i = -4; i < 22; i++) {
          const startX = i * 55 - (dirtScroll * 0.8);
          ctx.beginPath();
          ctx.moveTo(startX, GROUND_Y);
          ctx.lineTo(startX * 1.35 - 80, VIRTUAL_HEIGHT);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = skyNightAlpha > 0.4 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
        for (let i = -1; i < 11; i++) {
          const dx = i * 120 - dirtScroll;
          if (activeThemeId === 'theme_frozen') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(dx + 20, GROUND_Y + 12);
            ctx.lineTo(dx + 35, GROUND_Y + 24);
            ctx.lineTo(dx + 15, GROUND_Y + 38);
            ctx.stroke();
          } else {
            ctx.fillRect(dx + 10, GROUND_Y + 15, 24, 4.5);
            ctx.fillRect(dx + 70, GROUND_Y + 45, 18, 3.5);
            ctx.fillRect(dx + 45, GROUND_Y + 30, 8, 8);
            ctx.fillRect(dx + 100, GROUND_Y + 25, 14, 4.5);
          }
        }
      }
    }

    // 7. Draw Active Coins (Glistening 3D Metallic Golden Pieces)
    engine.coins.forEach(coin => {
      if (coin.collected) return;
      
      const cx = coin.x + coin.width / 2;
      const cy = coin.y + coin.height / 2;
      const currentWidth = Math.abs(Math.sin(coin.rotationPhase)) * coin.width;
      
      if (settings.enable3D) {
        // Glistening 3D Extruded Cylinder Disk
        const extrusionDepth = 3.5;
        for (let d = extrusionDepth; d >= 0; d -= 0.7) {
          ctx.save();
          if (!settings.reduceMotion && !isMobile && d === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fbbf24';
          }
          // Shift each layer along a diagonal depth coordinate to create volumetric thickness!
          ctx.translate(cx - d * 0.7, cy + d * 0.4);

          // Deep golden bronze shadow layers for the backside, bright yellow on the final top cover
          if (d > 0) {
            ctx.fillStyle = '#92400e'; // Solid back edge shadow
            ctx.beginPath();
            ctx.ellipse(0, 0, (currentWidth/2) + 0.6, (coin.height/2) + 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Front cover
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.ellipse(0, 0, currentWidth/2, coin.height/2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Inner design cross
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(0, -coin.height / 3.5);
            ctx.lineTo(0, coin.height / 3.5);
            ctx.moveTo(-currentWidth / 3.5, 0);
            ctx.lineTo(currentWidth / 3.5, 0);
            ctx.stroke();

            // Specular reflections sweeps
            const glintOffset = (engine.time * 0.08) % 2 - 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(currentWidth * glintOffset, -coin.height / 2);
            ctx.lineTo(currentWidth * (glintOffset + 0.3), coin.height / 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        // Classic 2D coin fallback
        ctx.save();
        if (!settings.reduceMotion && !isMobile) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fbbf24';
        }
        ctx.translate(cx, cy);

        // Shining outer ring
        ctx.fillStyle = '#b45309'; // dark gold outer rim
        ctx.beginPath();
        ctx.ellipse(0, 0, (currentWidth/2) + 1.5, (coin.height/2) + 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shiny core
        ctx.fillStyle = '#fbbf24'; // bright yellow coin face
        ctx.beginPath();
        ctx.ellipse(0, 0, currentWidth/2, coin.height/2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner coin symbol star/cross
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -coin.height / 3.5);
        ctx.lineTo(0, coin.height / 3.5);
        ctx.moveTo(-currentWidth / 3.5, 0);
        ctx.lineTo(currentWidth / 3.5, 0);
        ctx.stroke();

        // ✨ Animated metal glint horizontal sweeping beam effect!
        const glintOffset = (engine.time * 0.08) % 2 - 1; // Sweeps from -1 to 1
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentWidth * glintOffset, -coin.height / 2);
        ctx.lineTo(currentWidth * (glintOffset + 0.35), coin.height / 2);
        ctx.stroke();

        ctx.restore();
      }
    });

    // 7.5. Draw Active Power-Ups (Magnets, Score Multipliers, Shields)
    engine.powerUps.forEach(pu => {
      ctx.save();
      
      const cx = pu.x + pu.width / 2;
      const cy = pu.y + pu.height / 2;
      const pulse = Math.sin(pu.pulsePhase) * 4;
      const sizeOffset = Math.sin(engine.time * 0.1) * 2;
      const radius = pu.width / 2 + sizeOffset;
      
      if (settings.enable3D) {
        // Render 3D layered capsule or pedestal base
        const extrusion = 4;
        for (let d = extrusion; d >= 0; d--) {
          ctx.save();
          ctx.translate(cx - d * 0.8, cy + d * 0.5 + pulse);
          
          let colorTheme = '#38bdf8'; // Shield (Blue)
          let darkTheme = '#0369a1';
          if (pu.type === 'magnet') {
            colorTheme = '#db2777'; // Magnet (Pink/Crimson)
            darkTheme = '#831843';
          } else if (pu.type === 'multiplier') {
            colorTheme = '#eab308'; // Multiplier (Gold)
            darkTheme = '#713f12';
          }

          if (d > 0) {
            ctx.fillStyle = darkTheme;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Front cover glass panel
            ctx.fillStyle = colorTheme;
            if (!settings.reduceMotion && !isMobileClient) {
              ctx.shadowBlur = 15;
              ctx.shadowColor = colorTheme;
            }
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner gloss ring
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(-2, -2, radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Draw icon inside depending on type
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.0;

            if (pu.type === 'shield') {
              // Draw a crisp little shield emblem
              ctx.beginPath();
              ctx.moveTo(-6, -8);
              ctx.lineTo(6, -8);
              ctx.lineTo(6, -2);
              ctx.quadraticCurveTo(6, 6, 0, 9);
              ctx.quadraticCurveTo(-6, 6, -6, -2);
              ctx.closePath();
              ctx.fill();
              
              // Inner glowing blue core details
              ctx.fillStyle = '#0284c7';
              ctx.beginPath();
              ctx.moveTo(-3, -6);
              ctx.lineTo(3, -6);
              ctx.lineTo(3, -1);
              ctx.quadraticCurveTo(3, 4, 0, 6);
              ctx.quadraticCurveTo(-3, 4, -3, -1);
              ctx.closePath();
              ctx.fill();
            } else if (pu.type === 'magnet') {
              // Draw a gorgeous U-shape Magnet
              ctx.save();
              ctx.rotate(Math.PI / 4 + engine.time * 0.04);
              ctx.lineWidth = 3.5;
              ctx.lineCap = 'round';
              
              // Draw U magnet curve
              ctx.beginPath();
              ctx.arc(0, 0, 5, 0, Math.PI, false);
              ctx.moveTo(-5, 0);
              ctx.lineTo(-5, -6);
              ctx.moveTo(5, 0);
              ctx.lineTo(5, -6);
              ctx.strokeStyle = '#f43f5e';
              ctx.stroke();

              // Draw white magnetic tips
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.moveTo(-5, -6); ctx.lineTo(-5, -8);
              ctx.moveTo(5, -6); ctx.lineTo(5, -8);
              ctx.stroke();
              ctx.restore();
            } else if (pu.type === 'multiplier') {
              // Draw a sweet "2x" star multiplier
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#ffffff';
              ctx.fillText('2X', 0, 0);
              
              // Sparklet dot
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(-8, -8, 2.5, 2.5);
              ctx.fillRect(7, 7, 2.5, 2.5);
            }
          }
          ctx.restore();
        }
      } else {
        // Classic 2D style fallback with high brightness glows
        ctx.translate(cx, cy + pulse);
        
        let colorTheme = '#38bdf8';
        if (pu.type === 'magnet') colorTheme = '#db2777';
        if (pu.type === 'multiplier') colorTheme = '#eab308';

        ctx.fillStyle = colorTheme;
        if (!settings.reduceMotion && !isMobileClient) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = colorTheme;
        }

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // White border core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        if (pu.type === 'shield') {
          ctx.beginPath();
          ctx.moveTo(-5, -7);
          ctx.lineTo(5, -7);
          ctx.lineTo(5, -2);
          ctx.quadraticCurveTo(5, 5, 0, 8);
          ctx.quadraticCurveTo(-5, 5, -5, -2);
          ctx.closePath();
          ctx.fill();
        } else if (pu.type === 'magnet') {
          ctx.save();
          ctx.rotate(engine.time * 0.05);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.0;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI, false);
          ctx.moveTo(-4, 0); ctx.lineTo(-4, -6);
          ctx.moveTo(4, 0); ctx.lineTo(4, -6);
          ctx.stroke();
          ctx.restore();
        } else if (pu.type === 'multiplier') {
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('2X', 0, 0);
        }
      }
      ctx.restore();
    });

    // 8. Draw Active Obstacles (High-Fidelity Facets & Lighting Models)
    engine.obstacles.forEach(o => {
      ctx.save();
      ctx.translate(o.x, o.y);

      // Render 3D dynamic drop shadow on the receding track floor for flying birds / drones
      if (settings.enable3D && (o.type === 'bird' || o.type === 'robot_bird')) {
        const pHeight = GROUND_Y - o.y;
        if (pHeight > 0) {
          ctx.save();
          const distanceFactor = Math.max(0.1, 1 - (pHeight / 300));
          const shadowW = o.width * 0.65 * distanceFactor;
          const shadowAlpha = 0.45 * distanceFactor;
          ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
          ctx.beginPath();
          // Render projected shadow on the horizontal road surface below the bird
          ctx.ellipse(o.width / 2, pHeight + 10, shadowW, shadowW * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (settings.enable3D) {
        if (o.type === 'rock_small') {
          // Volumetric Layer-Extruded 3D Boulder
          const layerDepth = 5;
          for (let d = layerDepth; d >= 0; d--) {
            ctx.save();
            ctx.translate(d * -0.8, d * 0.5);
            
            if (d > 0) {
              ctx.fillStyle = '#374151'; // Solid dark grey back extrusion
              ctx.beginPath();
              ctx.moveTo(0, o.height);
              ctx.lineTo(5, 10);
              ctx.lineTo(15, 0);
              ctx.lineTo(24, 7);
              ctx.lineTo(o.width, o.height);
              ctx.closePath();
              ctx.fill();
            } else {
              // Main foreground face
              ctx.fillStyle = '#6b7280';
              ctx.beginPath();
              ctx.moveTo(0, o.height);
              ctx.lineTo(5, 10);
              ctx.lineTo(15, 0);
              ctx.lineTo(24, 7);
              ctx.lineTo(o.width, o.height);
              ctx.closePath();
              ctx.fill();

              // Faceted lighting overlay
              ctx.fillStyle = '#9ca3af';
              ctx.beginPath();
              ctx.moveTo(5, 10);
              ctx.lineTo(15, 0);
              ctx.lineTo(13, o.height);
              ctx.closePath();
              ctx.fill();

              // High-contrast fissure crack
              ctx.strokeStyle = '#1f2937';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(15, 0);
              ctx.lineTo(13, o.height);
              ctx.stroke();
            }
            ctx.restore();
          }
        } 
        else if (o.type === 'rock_large') {
          // Heavy Volumetric 3D Rock
          const layerDepth = 8;
          for (let d = layerDepth; d >= 0; d--) {
            ctx.save();
            ctx.translate(d * -0.8, d * 0.5);
            
            if (d > 0) {
              ctx.fillStyle = '#1f2937'; // Solid back-extrusion shadow
              ctx.beginPath();
              ctx.moveTo(0, o.height);
              ctx.lineTo(10, 20);
              ctx.lineTo(26, 4);
              ctx.lineTo(44, 15);
              ctx.lineTo(52, 0);
              ctx.lineTo(o.width, o.height);
              ctx.closePath();
              ctx.fill();
            } else {
              // High fidelity face paint
              ctx.fillStyle = '#4b5563';
              ctx.beginPath();
              ctx.moveTo(0, o.height);
              ctx.lineTo(10, 20);
              ctx.lineTo(26, 4);
              ctx.lineTo(44, 15);
              ctx.lineTo(52, 0);
              ctx.lineTo(o.width, o.height);
              ctx.closePath();
              ctx.fill();

              // Lighting facets
              ctx.fillStyle = '#6b7280';
              ctx.beginPath();
              ctx.moveTo(10, 20);
              ctx.lineTo(26, 4);
              ctx.lineTo(26, o.height);
              ctx.closePath();
              ctx.fill();

              ctx.strokeStyle = '#111827';
              ctx.lineWidth = 2.0;
              ctx.beginPath();
              ctx.moveTo(26, 4);
              ctx.lineTo(26, o.height);
              ctx.moveTo(44, 15);
              ctx.lineTo(40, o.height);
              ctx.stroke();
            }
            ctx.restore();
          }
        } 
        else if (o.type === 'stump') {
          // Immersive 3D Cylinder Wood Stump
          const r = o.width / 2 - 3;
          const cyTop = 14;
          const cyBot = o.height - 3;

          // Bark cylinder trunk
          const barkGrad = ctx.createLinearGradient(3, 0, o.width - 3, 0);
          barkGrad.addColorStop(0, '#451a03'); // Left edge shadow
          barkGrad.addColorStop(0.3, '#78350f'); // Classic deep brown
          barkGrad.addColorStop(0.65, '#92400e'); // highlight
          barkGrad.addColorStop(1, '#451a03'); // Right shadow
          ctx.fillStyle = barkGrad;

          ctx.beginPath();
          ctx.ellipse(o.width / 2, cyTop, r, 4, 0, 0, Math.PI, true); // back top arc
          ctx.ellipse(o.width / 2, cyBot, r, 5, 0, Math.PI, false); // bottom curves
          ctx.closePath();
          ctx.fill();

          // Trunk rectangular filling block
          ctx.fillRect(o.width / 2 - r, cyTop, r * 2, cyBot - cyTop);

          // Wood roots base
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.moveTo(3, cyBot);
          ctx.lineTo(0, o.height);
          ctx.lineTo(9, o.height);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(o.width - 3, cyBot);
          ctx.lineTo(o.width, o.height);
          ctx.lineTo(o.width - 9, o.height);
          ctx.closePath();
          ctx.fill();

          // 3D Top Ring Face
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.ellipse(o.width / 2, cyTop, r, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Growth rings inside top face
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.ellipse(o.width / 2, cyTop, r * 0.6, 2.4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(o.width / 2, cyTop, r * 0.3, 1.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } 
        else if (o.type === 'barrel') {
          // Immersive 3D Bulging Wooden Barrel with gold metallic hoops
          const rTop = o.width / 2 - 4;
          const cyTop = 6;
          const cyBot = o.height - 4;

          const barrelGrad = ctx.createLinearGradient(0, 0, o.width, 0);
          barrelGrad.addColorStop(0, '#451a03'); // Dark left shadow
          barrelGrad.addColorStop(0.3, '#78350f'); // Warm barrel brown
          barrelGrad.addColorStop(0.65, '#b45309'); // Wood highlight
          barrelGrad.addColorStop(1, '#451a03'); // Right shadow
          ctx.fillStyle = barrelGrad;

          // Draw bulging 3D curves outline using Quadratic Bezier curves
          ctx.beginPath();
          ctx.moveTo(4, cyTop);
          ctx.quadraticCurveTo(-2, o.height/2, 4, cyBot);
          ctx.lineTo(o.width - 4, cyBot);
          ctx.quadraticCurveTo(o.width + 2, o.height/2, o.width - 4, cyTop);
          ctx.closePath();
          ctx.fill();

          // Planks separations
          ctx.strokeStyle = 'rgba(69, 26, 3, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(o.width * 0.33, cyTop);
          ctx.quadraticCurveTo(o.width * 0.25, o.height/2, o.width * 0.33, cyBot);
          ctx.moveTo(o.width * 0.67, cyTop);
          ctx.quadraticCurveTo(o.width * 0.75, o.height/2, o.width * 0.67, cyBot);
          ctx.stroke();

          // Metallic strap bands hugging the bulging body
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(1.5, o.height * 0.3);
          ctx.quadraticCurveTo(o.width / 2, o.height * 0.3 + 3, o.width - 1.5, o.height * 0.3);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(1.5, o.height * 0.7);
          ctx.quadraticCurveTo(o.width / 2, o.height * 0.7 + 3, o.width - 1.5, o.height * 0.7);
          ctx.stroke();

          // Rivet studs
          ctx.fillStyle = '#4b5563';
          const ry1 = o.height * 0.3 + 1.8;
          const ry2 = o.height * 0.7 + 1.8;
          ctx.beginPath();
          ctx.arc(o.width * 0.25, ry1, 1.0, 0, Math.PI * 2);
          ctx.arc(o.width * 0.5, ry1 + 1.2, 1.0, 0, Math.PI * 2);
          ctx.arc(o.width * 0.75, ry1, 1.0, 0, Math.PI * 2);
          ctx.arc(o.width * 0.25, ry2, 1.0, 0, Math.PI * 2);
          ctx.arc(o.width * 0.5, ry2 + 1.2, 1.0, 0, Math.PI * 2);
          ctx.arc(o.width * 0.75, ry2, 1.0, 0, Math.PI * 2);
          ctx.fill();

          // 3D Top face lid
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.ellipse(o.width / 2, cyTop, rTop, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#451a03'; // core hollow texture
          ctx.beginPath();
          ctx.ellipse(o.width / 2, cyTop, rTop * 0.75, 2.0, 0, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (o.type === 'bird') {
          // Flying Pterodactyl with dynamic wing 3D extrusion depth
          const layerDepth = 4;
          for (let d = layerDepth; d >= 0; d--) {
            ctx.save();
            ctx.translate(d * -0.7, d * 0.4);

            const wingsUp = Math.sin(o.wingPhase) > 0;
            const bodyColor = d > 0 ? '#7f1d1d' : '#b91c1c';
            const beakColor = d > 0 ? '#d97706' : '#fbbf24';

            ctx.fillStyle = bodyColor;
            // Amber Beak/Head in depth layers
            ctx.fillRect(o.width * 0.65, 6, 12, 5);
            ctx.fillStyle = beakColor;
            ctx.fillRect(o.width * 0.65 + 12, 8, 6, 3);

            ctx.fillStyle = bodyColor;
            // Primary Body
            ctx.fillRect(o.width * 0.15, 6, o.width * 0.55, 10);
            
            // Feather Tail
            ctx.beginPath();
            ctx.moveTo(0, 11);
            ctx.lineTo(o.width * 0.2, 5);
            ctx.lineTo(o.width * 0.2, 17);
            ctx.closePath();
            ctx.fill();

            // Slashed body wing flap
            if (wingsUp) {
              ctx.beginPath();
              ctx.moveTo(o.width * 0.4, 6);
              ctx.lineTo(o.width * 0.34, -13);
              ctx.lineTo(o.width * 0.51, 6);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.moveTo(o.width * 0.4, 14);
              ctx.lineTo(o.width * 0.29, 29);
              ctx.lineTo(o.width * 0.51, 14);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }
        } 
        else if (o.type === 'robot_bird') {
          // Cyber floating battle drone with extruded 3D hull
          const layerDepth = 4;
          for (let d = layerDepth; d >= 0; d--) {
            ctx.save();
            ctx.translate(d * -0.7, d * 0.4);

            const bodyColor = d > 0 ? '#1e293b' : '#475569';
            const decalColor = d > 0 ? '#0891b2' : '#06b6d4';
            const laserColor = d > 0 ? '#991b1b' : '#ef4444';

            ctx.fillStyle = bodyColor;
            ctx.fillRect(5, 5, o.width - 10, o.height - 10);

            // Tech indicators
            ctx.fillStyle = decalColor;
            ctx.fillRect(9, 8, 4, 2);
            ctx.fillRect(16, 14, 5, 2);

            //visor
            ctx.fillStyle = laserColor;
            ctx.fillRect(o.width - 15, 9, 10, 4.5);

            // Turbine offset
            const turbOffset = Math.sin(o.wingPhase * 1.5) * 6;
            ctx.fillStyle = d > 0 ? '#0284c7' : '#38bdf8';
            ctx.fillRect(0, 12 + turbOffset/2, 4, 8 - (turbOffset ? 2 : 0));

            // Thrust bloom (top overlay only)
            if (d === 0) {
              const thrustGrad = ctx.createLinearGradient(-15, 16, 0, 16);
              thrustGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
              thrustGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.7)');
              thrustGrad.addColorStop(1, '#22d3ee');
              ctx.fillStyle = thrustGrad;
              ctx.beginPath();
              ctx.ellipse(-7, 16, 8, 2.8, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
      } else {
        // Classic 2D Obstacle Renderer Fallback
        if (o.type === 'rock_small') {
          ctx.fillStyle = '#6b7280';
          ctx.beginPath();
          ctx.moveTo(0, o.height);
          ctx.lineTo(5, 10);
          ctx.lineTo(15, 0);
          ctx.lineTo(24, 7);
          ctx.lineTo(o.width, o.height);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.moveTo(5, 10);
          ctx.lineTo(15, 0);
          ctx.lineTo(13, o.height);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(15, 0);
          ctx.lineTo(13, o.height);
          ctx.stroke();
        } 
        else if (o.type === 'rock_large') {
          ctx.fillStyle = '#4b5563';
          ctx.beginPath();
          ctx.moveTo(0, o.height);
          ctx.lineTo(10, 20);
          ctx.lineTo(26, 4);
          ctx.lineTo(44, 15);
          ctx.lineTo(52, 0);
          ctx.lineTo(o.width, o.height);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#6b7280';
          ctx.beginPath();
          ctx.moveTo(10, 20);
          ctx.lineTo(26, 4);
          ctx.lineTo(26, o.height);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(26, 4);
          ctx.lineTo(26, o.height);
          ctx.moveTo(44, 15);
          ctx.lineTo(40, o.height);
          ctx.stroke();
        } 
        else if (o.type === 'stump') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(5, 10, o.width - 10, o.height - 10);
          
          ctx.beginPath();
          ctx.moveTo(0, o.height);
          ctx.lineTo(5, 10);
          ctx.lineTo(o.width - 5, 10);
          ctx.lineTo(o.width, o.height);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.ellipse(o.width / 2, 10, o.width / 2.5, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#d97706';
          ctx.beginPath();
          ctx.ellipse(o.width / 2, 10, o.width / 4, 1.8, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#451a03';
          ctx.fillRect(o.width * 0.3, 19, 4, 4);
          ctx.fillRect(o.width * 0.65, 27, 3, 3);
        } 
        else if (o.type === 'barrel') {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(2, 2, o.width - 4, o.height - 4);
          
          ctx.fillStyle = '#92400e';
          ctx.fillRect(0, 0, o.width, 3);
          ctx.fillRect(0, o.height - 3, o.width, 3);

          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(0, o.height * 0.3, o.width, 3.5);
          ctx.fillRect(0, o.height * 0.7, o.width, 3.5);

          ctx.fillStyle = '#4b5563';
          for (let rx = 3; rx < o.width; rx += 9) {
            ctx.beginPath();
            ctx.arc(rx, o.height * 0.3 + 1.8, 0.9, 0, Math.PI * 2);
            ctx.arc(rx, o.height * 0.7 + 1.8, 0.9, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = 'rgba(75, 42, 13, 0.45)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(o.width * 0.32, 3); ctx.lineTo(o.width * 0.32, o.height - 3);
          ctx.moveTo(o.width * 0.68, 3); ctx.lineTo(o.width * 0.68, o.height - 3);
          ctx.stroke();
        } 
        else if (o.type === 'bird') {
          ctx.fillStyle = '#b91c1c';
          const wingsUp = Math.sin(o.wingPhase) > 0;
          
          ctx.fillRect(o.width * 0.65, 6, 12, 5);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(o.width * 0.65 + 12, 8, 6, 3);

          ctx.fillStyle = '#b91c1c';
          ctx.fillRect(o.width * 0.15, 6, o.width * 0.55, 10);
          
          ctx.beginPath();
          ctx.moveTo(0, 11);
          ctx.lineTo(o.width * 0.2, 5);
          ctx.lineTo(o.width * 0.2, 17);
          ctx.closePath();
          ctx.fill();

          if (wingsUp) {
            ctx.beginPath();
            ctx.moveTo(o.width * 0.4, 6);
            ctx.lineTo(o.width * 0.34, -13);
            ctx.lineTo(o.width * 0.51, 6);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(o.width * 0.4, 14);
            ctx.lineTo(o.width * 0.29, 29);
            ctx.lineTo(o.width * 0.51, 14);
            ctx.closePath();
            ctx.fill();
          }
        } 
        else if (o.type === 'robot_bird') {
          ctx.fillStyle = '#475569';
          ctx.fillRect(5, 5, o.width - 10, o.height - 10);

          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(9, 8, 4, 2);
          ctx.fillRect(16, 14, 5, 2);

          ctx.fillStyle = '#ef4444';
          ctx.fillRect(o.width - 15, 9, 10, 4.5);

          const turbOffset = Math.sin(o.wingPhase * 1.5) * 6;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(0, 12 + turbOffset/2, 4, 8 - (turbOffset ? 2 : 0));

          const thrustGrad = ctx.createLinearGradient(-15, 16, 0, 16);
          thrustGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          thrustGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.7)');
          thrustGrad.addColorStop(1, '#22d3ee');
          ctx.fillStyle = thrustGrad;
          ctx.beginPath();
          ctx.ellipse(-7, 16, 8, 2.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });

    // 9. Draw Player character (High-Fidelity Procedural Pixel Renderer)
    const c = engine.selectedCharacter;
    
    // Apply squish factor from landing or ducking scale
    const drawHeight = engine.playerHeight - engine.landingSquish;
    const drawY = engine.playerY + engine.landingSquish;

    // Real-Time 3D projected drop shadow on the ground floor below character feet
    if (settings.enable3D) {
      ctx.save();
      const bounceDist = (GROUND_Y - drawY) - drawHeight;
      const shadowW = Math.max(10, (engine.playerWidth * 0.72) * (1 - bounceDist / 130));
      const shadowAlpha = Math.max(0.05, 0.45 * (1 - bounceDist / 110));
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      // Render soft shadow exactly at real-time ground level
      ctx.ellipse(engine.playerX + engine.playerWidth / 2 + 4, GROUND_Y + 6, shadowW, shadowW * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Set character extrusion depth to always display a beautiful 3D volume (7 layers for Ultra 3D, 2 layers for 2.5D fallback)
    const extrusionDepth = settings.enable3D ? 7 : 2;

    for (let d = extrusionDepth; d >= 0; d--) {
      ctx.save();

      // Swift hex darkening helper for rendering volumetric retro-voxel 3D sides
      const getExtrudedColor = (col: string, depth: number) => {
        const cleanHex = col.replace('#', '');
        if (cleanHex.length !== 6) return col;
        let r = parseInt(cleanHex.substring(0, 2), 16);
        let g = parseInt(cleanHex.substring(2, 4), 16);
        let b = parseInt(cleanHex.substring(4, 6), 16);
        const factor = Math.max(0.12, 0.55 - depth * 0.08);
        return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
      };

      const getTone = (col: string) => {
        if (!settings.enable3D || d === 0) return col;
        return getExtrudedColor(col, d);
      };

      // Set current volume shades
      const charColor = getTone(c.color);
      const charAccent = getTone(c.accentColor);

      // Skew and translation matrix shift for voxel-layered volume sides
      if (settings.enable3D && d > 0) {
        ctx.translate(d * -0.75, d * 0.5);
      }

      ctx.translate(engine.playerX, drawY);

      if (engine.isDead) {
        // Rotation spinning death
        ctx.translate(engine.playerWidth / 2, drawHeight / 2);
        ctx.rotate(engine.time * 0.15);
        ctx.translate(-engine.playerWidth / 2, -drawHeight / 2);
      }

      if (c.runnerType === 'dino') {
        // Draw Classic Dino stylized Rex with scale highlights and spikes
        ctx.fillStyle = charColor;
        
        // Main Body Torso
        ctx.fillRect(10, 12, 28, 22);

        // Spine Spikes (Very Dino!)
        ctx.fillStyle = charAccent; // spike colors
        ctx.beginPath();
        ctx.moveTo(10, 12); ctx.lineTo(13, 8); ctx.lineTo(16, 12);
        ctx.moveTo(18, 12); ctx.lineTo(21, 8); ctx.lineTo(24, 12);
        ctx.moveTo(6, 18);  ctx.lineTo(8, 14); ctx.lineTo(11, 18);
        ctx.fill();

        ctx.fillStyle = charColor;
        // Tail trailing
        ctx.fillRect(0, 18, 10, 12);
        ctx.fillRect(2, 30, 4, 4);

        // T-Rex snout head (with custom highlighted brow ridge)
        ctx.fillRect(22, 0, 24, 14);
        // Highlight on crown of head
        ctx.fillStyle = getTone('#86efac'); // soft bright green highlight
        ctx.fillRect(24, 0, 18, 3);

        ctx.fillStyle = charColor;
        // Cheek/neck hook
        ctx.fillRect(30, 14, 8, 6);

        // Green Dino eye/Snout
        ctx.fillStyle = getTone('#000000');
        if (engine.isDead) {
          // Draw cross lines for dead eye
          ctx.strokeStyle = getTone('#000000');
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(34, 4); ctx.lineTo(38, 8);
          ctx.moveTo(38, 4); ctx.lineTo(34, 8);
          ctx.stroke();
        } else {
          // Blinking eye calculation
          const isBlinking = Math.floor(engine.time) % 15 === 0 && (engine.time % 1) < 0.2;
          if (!isBlinking) {
            ctx.fillRect(36, 4, 3.5, 3.5); // Cute eye
            // White pupil dot
            ctx.fillStyle = getTone('#ffffff');
            ctx.fillRect(37, 4.5, 1.2, 1.2);
          }
        }

        // Small dinosaur hands
        ctx.fillStyle = charAccent;
        ctx.fillRect(36, 18, 6, 2.5);

        // Dino running legs
        ctx.fillStyle = charColor;
        const stepLeft = Math.sin(engine.legPhase) > 0;
        
        if (engine.isJumping || engine.isDead) {
          // Leg tucked together
          ctx.fillRect(14, 34, 6, 12);
          ctx.fillRect(26, 34, 6, 12);
        } else {
          // Walking cycle
          if (stepLeft) {
            ctx.fillRect(12, 34, 5, 14); // Left leg forward
            ctx.fillRect(28, 34, 5, 8);  // Right leg retracted
          } else {
            ctx.fillRect(12, 34, 5, 8);  // Left leg retracted
            ctx.fillRect(28, 34, 5, 14); // Right leg forward
          }
        }
      } 
      else if (c.runnerType === 'robot') {
        // Cyber cybernetic metal running droid with high tech visuals
        ctx.fillStyle = charColor;
        
        // Metal torso body with side exhaust port lines
        ctx.fillRect(8, 10, 32, 24);

        // Torso core plating grid lines
        ctx.fillStyle = getTone('#334155');
        ctx.fillRect(12, 14, 4, 16);
        ctx.fillRect(32, 14, 4, 16);
        
        // Arm/Joint
        ctx.fillStyle = charAccent;
        ctx.fillRect(18, 14, 8, 14);

        // Metallic Cyber Head
        ctx.fillStyle = charColor;
        ctx.fillRect(17, 0, 16, 10);
        
        // Glowing cycling visor with visual shine strip
        ctx.fillStyle = getTone('#22d3ee'); // bright cyan glow
        ctx.fillRect(25, 3, 8, 3);
        if (!settings.reduceMotion) {
          const sweep = Math.abs(Math.sin(engine.time * 0.1)) * 6;
          ctx.fillStyle = getTone('#ffffff');
          ctx.fillRect(25 + sweep, 3, 2, 3);
        }

        // Jetpack back nozzle
        ctx.fillStyle = getTone('#475569');
        ctx.fillRect(4, 18, 4, 10);
        
        // blue booster sparks when jumping
        if (engine.isJumping) {
          ctx.fillStyle = getTone('#06b6d4');
          ctx.fillRect(2, 28, 6, 12);
        }

        // Running metal legs
        ctx.fillStyle = charAccent;
        const stepLeft = Math.sin(engine.legPhase) > 0;
        if (engine.isJumping) {
          ctx.fillRect(12, 34, 6, 8);
          ctx.fillRect(22, 34, 6, 8);
        } else {
          if (stepLeft) {
            ctx.fillRect(10, 34, 5, 15);
            ctx.fillRect(25, 34, 5, 10);
          } else {
            ctx.fillRect(10, 34, 5, 10);
            ctx.fillRect(25, 34, 5, 15);
          }
        }
      } 
      else if (c.runnerType === 'fox') {
        // Little running crimson fox with bushy tail and soft updates
        const breath = Math.sin(engine.time * 0.18) * 1.5;
        ctx.fillStyle = charColor;

        // Torso body with breathing effect
        ctx.fillRect(8, 12, 30, 20 + breath * 0.35);

        // Big bushy tail
        ctx.fillStyle = charAccent; // tail tip usually white/amber
        ctx.fillRect(0, 16 + breath * 0.2, 8, 12);
        ctx.fillStyle = charColor;
        ctx.fillRect(2, 20 + breath * 0.2, 6, 10);

        // Fox triangular head
        ctx.fillRect(24, 2, 16, 12);
        // Erect triangle ears with obsidian tips
        ctx.beginPath();
        ctx.moveTo(26, 2); ctx.lineTo(26, -6); ctx.lineTo(31, 2);
        ctx.moveTo(34, 2); ctx.lineTo(38, -6); ctx.lineTo(39, 2);
        ctx.fill();

        // Ear tips in Dark Charcoal
        ctx.fillStyle = getTone('#1e293b');
        ctx.beginPath();
        ctx.moveTo(26, -2); ctx.lineTo(26, -6); ctx.lineTo(28, -2);
        ctx.moveTo(36, -2); ctx.lineTo(38, -6); ctx.lineTo(39, -2);
        ctx.fill();

        // White cheek patches
        ctx.fillStyle = getTone('#ffffff');
        ctx.fillRect(32, 8, 8, 4);

        // Cute intelligent fox eye
        ctx.fillStyle = getTone('#1e293b');
        ctx.fillRect(30, 5, 2.5, 2.5);

        // Four paws walking stride
        ctx.fillStyle = charColor;
        const phase = engine.legPhase;
        const legOffsetL = Math.sin(phase) * 10;
        const legOffsetR = Math.sin(phase + Math.PI) * 10;

        if (engine.isJumping) {
          ctx.fillRect(12, 32, 5, 8);
          ctx.fillRect(26, 32, 5, 8);
        } else {
          // Left legs
          ctx.fillRect(12 + Math.max(0, legOffsetL), 32, 5, 12);
          // Right legs
          ctx.fillRect(24 + Math.max(0, legOffsetR), 32, 5, 12);
        }
      } 
      else if (c.runnerType === 'sphere') {
        // Glowing High-tech energy orb (radial highlights render on top cover only to prevent dark layer blending)
        if (d === 0) {
          const rad = 23;
          const cx = engine.playerWidth / 2;
          const cy = drawHeight / 2;
          
          // Calculate stretch proportions based on velocity
          const squishRatio = engine.isJumping ? Math.max(0.7, 1 + engine.playerVY * 0.02) : engine.isDucking ? 0.6 : 1.0;
          const stretchW = rad * (2 - squishRatio);
          const stretchH = rad * squishRatio;

          ctx.save();
          if (!settings.reduceMotion && !isMobile) {
            ctx.shadowBlur = 24;
            ctx.shadowColor = c.color;
          }

          // Outer Glowing Orb Base Shell
          const orbGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, stretchW);
          orbGrad.addColorStop(0, '#ffffff');
          orbGrad.addColorStop(0.35, c.color);
          orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
          ctx.fillStyle = orbGrad;

          ctx.beginPath();
          ctx.ellipse(cx, cy, stretchW, stretchH, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Rotating inner technological core
          ctx.strokeStyle = c.accentColor;
          ctx.lineWidth = 2.5;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(engine.time * 0.08);

          // Orbit Ring 1
          ctx.beginPath();
          ctx.ellipse(0, 0, stretchW * 0.65, stretchH * 0.25, Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();

          // Orbit Ring 2
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.ellipse(0, 0, stretchW * 0.45, stretchH * 0.15, -Math.PI / 4, 0, Math.PI * 2);
          ctx.stroke();

          // Core white shining gem reactor
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        }
      }

      // Render wearable accessories only on the frontmost layer (d === 0) of the runner
      if (d === 0) {
        let headCX = 0;
        let headCY = 0;
        let eyeX = 0;
        let eyeY = 0;
        let shouldDraw = true;

        if (c.runnerType === 'dino') {
          headCX = 33;
          headCY = 0;
          eyeX = 36;
          eyeY = 4;
        } else if (c.runnerType === 'robot') {
          headCX = 25;
          headCY = 0;
          eyeX = 25;
          eyeY = 3;
        } else if (c.runnerType === 'fox') {
          headCX = 32;
          headCY = 2;
          eyeX = 30;
          eyeY = 5;
        } else if (c.runnerType === 'sphere') {
          headCX = engine.playerWidth / 2;
          headCY = drawHeight / 2 - 14;
          eyeX = engine.playerWidth / 2 - 4;
          eyeY = drawHeight / 2 - 3;
        } else {
          shouldDraw = false;
        }

        if (shouldDraw) {
          const activeHat = gameState.activeHatId;
          const activeGlasses = gameState.activeGlassesId;

          // Draw Equipped Hat
          if (activeHat && activeHat !== 'acc_none_hat') {
            ctx.save();
            if (activeHat === 'acc_cap') {
              ctx.fillStyle = '#dc2626';
              ctx.fillRect(headCX - 12, headCY - 4, 18, 5);
              ctx.fillRect(headCX - 2, headCY - 4, 15, 2);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(headCX - 7, headCY - 3, 3, 3);
            } else if (activeHat === 'acc_crown') {
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(headCX - 10, headCY - 2, 20, 2);
              ctx.fillRect(headCX - 10, headCY - 7, 3, 5);
              ctx.fillRect(headCX - 2, headCY - 9, 4, 7);
              ctx.fillRect(headCX + 7, headCY - 7, 3, 5);
              ctx.fillStyle = '#dc2626';
              ctx.fillRect(headCX - 1, headCY - 1, 2, 2);
              ctx.fillStyle = '#10b981';
              ctx.fillRect(headCX - 9, headCY - 8, 1, 1);
              ctx.fillRect(headCX - 1, headCY - 10, 2, 1);
              ctx.fillRect(headCX + 8, headCY - 8, 1, 1);
            } else if (activeHat === 'acc_cowboy') {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(headCX - 15, headCY - 2, 30, 2.5);
              ctx.fillRect(headCX - 8, headCY - 8, 16, 6);
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(headCX - 8, headCY - 3.5, 16, 1.5);
            } else if (activeHat === 'acc_pirate') {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(headCX - 14, headCY - 2, 28, 2.5);
              ctx.fillRect(headCX - 9, headCY - 6, 18, 4);
              ctx.fillRect(headCX - 14, headCY - 5, 4, 3);
              ctx.fillRect(headCX + 10, headCY - 5, 4, 3);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(headCX - 2, headCY - 4, 4, 1.5);
              ctx.fillRect(headCX - 1, headCY - 5, 2, 3.5);
            } else if (activeHat === 'acc_detective') {
              ctx.fillStyle = '#475569';
              ctx.fillRect(headCX - 11, headCY - 6, 22, 6);
              ctx.fillRect(headCX - 14, headCY - 2, 28, 2);
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(headCX - 2, headCY - 8, 4, 2);
            }
            ctx.restore();
          }

          // Draw Equipped Glasses
          if (activeGlasses && activeGlasses !== 'acc_none_glasses') {
            ctx.save();
            if (activeGlasses === 'acc_glasses_cyber') {
              ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
              ctx.fillRect(eyeX - 3, eyeY - 2, 13, 5);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(eyeX + 2, eyeY - 2, 2, 5);
            } else if (activeGlasses === 'acc_glasses_retro') {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(eyeX - 2, eyeY - 1, 12, 3.5);
              ctx.fillRect(eyeX - 2, eyeY - 1.5, 2, 1);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(eyeX + 1, eyeY - 1, 1, 1);
              ctx.fillRect(eyeX + 6, eyeY - 1, 1, 1);
            } else if (activeGlasses === 'acc_glasses_deal') {
              ctx.fillStyle = '#000000';
              ctx.fillRect(eyeX - 2, eyeY - 1, 4, 3);
              ctx.fillRect(eyeX + 2, eyeY, 1, 1);
              ctx.fillRect(eyeX + 5, eyeY - 1, 4, 3);
              ctx.fillRect(eyeX + 9, eyeY, 1, 1);
              ctx.fillRect(eyeX + 2, eyeY - 1, 3, 1.5);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(eyeX - 1, eyeY - 1, 1, 1);
              ctx.fillRect(eyeX + 6, eyeY - 1, 1, 1);
            }
            ctx.restore();
          }
        }
      }

      ctx.restore();
    }

    // Active power-up character overlay auras
    if (engine.shieldActiveTimer > 0) {
      ctx.save();
      const pcx = engine.playerX + engine.playerWidth / 2;
      const pcy = drawY + drawHeight / 2;
      const shieldRad = Math.max(engine.playerWidth, drawHeight) * 0.72;
      
      const pulse = Math.sin(engine.time * 0.12) * 4;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5 + Math.sin(engine.time * 0.2) * 1.0;
      if (!settings.reduceMotion && !isMobileClient) {
        ctx.shadowBlur = 15 + pulse;
        ctx.shadowColor = '#0ea5e9';
      }
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      
      ctx.beginPath();
      ctx.arc(pcx, pcy, shieldRad + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(pcx, pcy, shieldRad + pulse - 5, engine.time * 0.05, engine.time * 0.05 + 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pcx, pcy, shieldRad + pulse - 5, engine.time * 0.05 + Math.PI, engine.time * 0.05 + Math.PI + 1.2);
      ctx.stroke();

      ctx.restore();
    }

    if (engine.magnetActiveTimer > 0) {
      ctx.save();
      const pcx = engine.playerX + engine.playerWidth / 2;
      const pcy = drawY + drawHeight / 2;
      
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.0;
      ctx.globalAlpha = 0.75 + Math.sin(engine.time * 0.15) * 0.2;
      ctx.lineCap = 'round';
      
      const arcRad = 32 + Math.abs(Math.sin(engine.time * 0.1)) * 6;
      ctx.beginPath();
      ctx.arc(pcx, pcy - 12, arcRad, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pcx, pcy - 12, arcRad - 6, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();

      ctx.restore();
    }

    if (engine.multiplierActiveTimer > 0) {
      if (engine.time % 4 === 0 && !settings.reduceMotion) {
        engine.particles.push({
          x: engine.playerX + Math.random() * engine.playerWidth,
          y: drawY + drawHeight - Math.random() * 8,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - Math.random() * 2,
          size: 2 + Math.random() * 3,
          color: '#eab308',
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 15,
          shape: 'spark',
        });
      }
    }

    // 10. Draw custom background shadow particles (Silhouette style trails)
    engine.particles.forEach(p => {
      // Draw standard trail shapes
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      
      if (p.shape === 'spark') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x + p.size/2, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.lineTo(p.x - p.size/2, p.y);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      }
    });
    ctx.globalAlpha = 1.0; // reset

    // 10.5 Draw Dynamic Weather Visual Effects (Falling rain, snow, embers, or flower petals based on theme)
    if (!settings.reduceMotion) {
      engine.weatherParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        if (p.type === 'rain' || p.type === 'cyber') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * (p.length ? p.length / 12 : 1.5), p.y + p.vy * (p.length ? p.length / 12 : 1.5));
          ctx.stroke();
        } else if (p.type === 'ash' || p.type === 'splash') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ember') {
          ctx.save();
          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'petal') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle || 0);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.2, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'pollen') {
          ctx.save();
          ctx.shadowBlur = 3;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      ctx.globalAlpha = 1.0; // reset
    }

    // 11. Draw floating scoring points
    engine.floats.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = f.alpha;
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1.0; // reset

    // 12. Draw Screen Flash Overlay (Red damage flash on death/impact)
    if (engine.screenFlash > 0 && !settings.reduceMotion) {
      ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.5, engine.screenFlash * 0.45)})`;
      ctx.fillRect(0, 0, 1000, 400); // 1000x400 is the constant VIRTUAL_WIDTH x VIRTUAL_HEIGHT
    }
  };

  // 60FPS animation request hook loop
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const engine = engineRef.current;
      
      if (engine.isPlaying && !gameState.isPaused && !gameState.isGameOver && !gameState.isCountingDown) {
        updatePhysics();
      } else {
        // Continuous decay of render visual feedback during game over freeze
        if (engine.screenShake > 0) {
          engine.screenShake -= 0.6;
        }
        if (engine.screenFlash > 0) {
          engine.screenFlash -= 0.03; // slightly slower fade for drama!
        }
      }
      
      // Update weather particles independently so rain/snow flows even on menus or when paused!
      updateWeatherPhysics();
      
      renderGame();
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState.isPaused, gameState.isGameOver, gameState.isCountingDown]);

  // Touch Swipe Gesture Detection & Tap Control for Mobile/Tablet Devices
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Call preventDefault to ignore synthetic click emulation on tablets and mobiles
    e.preventDefault();

    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (gameState.isPaused || gameState.isGameOver || gameState.isCountingDown) {
      return;
    }

    // Swipe up to Jump (min 30px)
    if (deltaY < -30) {
      triggerJump();
    } 
    // Swipe down to Duck (min 30px)
    else if (deltaY > 30) {
      triggerDuck(true);
      setTimeout(() => {
        triggerDuck(false);
      }, 550);
    }
    // Simple Tap inside the canvas (less than 15px pointer movement)
    else if (distance < 15) {
      triggerJump();
    }
  };

  // Click-to-Jump for general desktop and pointing devices
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (gameState.isPaused || gameState.isGameOver || gameState.isCountingDown) {
      return;
    }

    triggerJump();
  };

  return (
    <div 
      id="canvas-gesture-container"
      ref={containerRef} 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleCanvasClick}
      className={`relative w-full touch-none ${isFullscreen ? 'h-full rounded-none' : 'h-[220px] min-[400px]:h-[260px] sm:h-[320px] md:h-[400px] rounded-2xl'} overflow-hidden bg-slate-900 shadow-inner select-none outline-none border ${isFullscreen ? 'border-none' : 'border-slate-800'} cursor-pointer`}
    >
      <canvas 
        ref={canvasRef} 
        id="runner-game-canvas"
        className="block"
      />

      {/* Dynamic Power-Up HUD indicators overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none select-none z-30">
        {gameState.shieldTimer && gameState.shieldTimer > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-sky-500/30 backdrop-blur-md shadow-lg animate-pulse-slow">
            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-wider uppercase text-sky-300 font-sans leading-none">Shield active</span>
              <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1 select-none">
                <div 
                  className="h-full bg-sky-400 rounded-full transition-all duration-100 ease-linear" 
                  style={{ width: `${Math.min(100, (gameState.shieldTimer / 600) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {gameState.magnetTimer && gameState.magnetTimer > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-pink-500/30 backdrop-blur-md shadow-lg animate-pulse-slow">
            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-pink-500/20 text-pink-400">
              <Magnet className="w-3.5 h-3.5 rotate-180" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-wider uppercase text-pink-300 font-sans leading-none">Coin Magnet</span>
              <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1 select-none">
                <div 
                  className="h-full bg-pink-400 rounded-full transition-all duration-100 ease-linear" 
                  style={{ width: `${Math.min(100, (gameState.magnetTimer / 480) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {gameState.powerMultiplierTimer && gameState.powerMultiplierTimer > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-amber-500/30 backdrop-blur-md shadow-lg animate-pulse-slow">
            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 font-sans leading-none">Double Points</span>
              <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1 select-none">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-100 ease-linear" 
                  style={{ width: `${Math.min(100, (gameState.powerMultiplierTimer / 360) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
