import React, { useEffect, useRef, useState } from 'react';
import { Character, Trail, GameTheme, GameSettings, GameStats, GameState } from '../types';
import { sound } from '../utils/sound';

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
    particles: [] as VisualParticle[],
    floats: [] as TextFloat[],
    weatherParticles: [] as WeatherParticle[],
    
    // Spawning controls
    minDistanceBetweenObstacles: 280,
    nextObstacleTimer: 100,
    nextCoinTimer: 40,
    lastObstacleType: '',
    
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
    engine.particles = [];
    engine.floats = [];
    engine.weatherParticles = [];
    engine.nextObstacleTimer = 60;
    engine.nextCoinTimer = 100;
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

    // Accurate fractional score accumulator based on active multiplier
    const scoreToAdd = deltaDistance * 10 * engine.multiplier;
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
        triggerGameOver();
        return;
      }

      // Cleanup off-screen
      if (obs.x < -150) {
        engine.obstacles.splice(i, 1);
      }
    }

    // Physics update: Coins
    for (let i = engine.coins.length - 1; i >= 0; i--) {
      const coin = engine.coins[i];
      coin.x -= engine.speed;
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
    const maxParticles = activeThemeId === 'theme_classic' ? 120 
                        : activeThemeId === 'theme_cyber' ? 80 
                        : activeThemeId === 'theme_volcanic' ? 110 
                        : 80;

    // 1. Spawning controls
    if (engine.weatherParticles.length < maxParticles) {
      const spawnChance = 0.65;
      if (Math.random() < spawnChance) {
        if (activeThemeId === 'theme_classic') {
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
        } else if (activeThemeId === 'theme_cyber') {
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
        } else if (activeThemeId === 'theme_volcanic') {
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
        } else if (activeThemeId === 'theme_valley') {
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

    // 2. Draw Sun or Moon based on Day Progress
    const celestialRadius = 24;
    const celestialY = 70 + Math.sin(progress * Math.PI * 2 + Math.PI/2) * 50; 
    let celestialX = (progress * VIRTUAL_WIDTH * 1.5) % (VIRTUAL_WIDTH * 1.4) - 200;

    if (progress <= 0.5) {
      // Draw Sun
      ctx.shadowBlur = (settings.reduceMotion || isMobile) ? 0 : 20;
      ctx.shadowColor = '#fef08a';
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(celestialX + 150, celestialY + 15, celestialRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    } else {
      // Draw Glowing Moon
      ctx.shadowBlur = (settings.reduceMotion || isMobile) ? 0 : 15;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 200, celestialY + 25, celestialRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Crater details
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 194, celestialY + 20, 4, 0, Math.PI * 2);
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 206, celestialY + 30, 3, 0, Math.PI * 2);
      ctx.arc((celestialX - VIRTUAL_WIDTH * 0.7) + 202, celestialY + 18, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Mountains layer (Slow scroll parallax)
    ctx.fillStyle = mountainsBg;
    const mountScroll = (engine.scrollX * 0.1) % 600;
    
    // Custom flat geometric parallax mountain outlines
    const drawMountains = (offsetX: number) => {
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
    };

    drawMountains(mountScroll);
    drawMountains(mountScroll - 600);
    drawMountains(mountScroll + 600);

    // 4. Clouds layer (Very slow floating drift)
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

    // 6. Hard Ground Layer (Full scroll pixel pattern)
    ctx.fillStyle = groundBg;
    ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - GROUND_Y);

    // Ground outline track
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, 4);

    // Scrolling checkered path or dirt spots
    ctx.fillStyle = skyNightAlpha > 0.4 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const dirtScroll = (engine.scrollX) % 120;
    for (let i = -1; i < 11; i++) {
      const dx = i * 120 - dirtScroll;
      ctx.fillRect(dx + 10, GROUND_Y + 15, 20, 5);
      ctx.fillRect(dx + 70, GROUND_Y + 45, 15, 4);
      ctx.fillRect(dx + 45, GROUND_Y + 30, 8, 8);
      ctx.fillRect(dx + 100, GROUND_Y + 25, 12, 5);
    }

    // 7. Draw Active Coins
    engine.coins.forEach(coin => {
      if (coin.collected) return;
      
      const cx = coin.x + coin.width / 2;
      const cy = coin.y + coin.height / 2;
      const currentWidth = Math.abs(Math.sin(coin.rotationPhase)) * coin.width;
      
      ctx.save();
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

      ctx.restore();
    });

    // 8. Draw Active Obstacles
    engine.obstacles.forEach(o => {
      ctx.save();
      ctx.translate(o.x, o.y);

      if (o.type === 'rock_small') {
        // Procedural small rock styling
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.moveTo(0, o.height);
        ctx.lineTo(5, 10);
        ctx.lineTo(15, 0);
        ctx.lineTo(24, 7);
        ctx.lineTo(o.width, o.height);
        ctx.closePath();
        ctx.fill();

        // Shading lines
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(18, o.height);
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

        // Shading / texture detail
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(26, 4);
        ctx.lineTo(28, o.height);
        ctx.moveTo(44, 15);
        ctx.lineTo(40, o.height);
        ctx.stroke();
      } 
      else if (o.type === 'stump') {
        // Reddish brown wood log
        ctx.fillStyle = '#78350f';
        ctx.fillRect(5, 10, o.width - 10, o.height - 10);
        
        // Root base stretching sideways
        ctx.beginPath();
        ctx.moveTo(0, o.height);
        ctx.lineTo(5, 10);
        ctx.lineTo(o.width - 5, 10);
        ctx.lineTo(o.width, o.height);
        ctx.closePath();
        ctx.fill();

        // Target rings
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(o.width / 2, 10, o.width / 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(o.width / 2, 10, o.width / 4, 1.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      } 
      else if (o.type === 'barrel') {
        // Classic metal banded wood barrel
        ctx.fillStyle = '#b45309';
        ctx.fillRect(2, 2, o.width - 4, o.height - 4);
        
        ctx.fillStyle = '#92400e';
        // Barrel rounded rims top/bottom
        ctx.fillRect(0, 0, o.width, 3);
        ctx.fillRect(0, o.height - 3, o.width, 3);

        // Metallic strap bands
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(0, o.height * 0.3, o.width, 3.5);
        ctx.fillRect(0, o.height * 0.7, o.width, 3.5);
      } 
      else if (o.type === 'bird') {
        // Pterodactyl style bird
        ctx.fillStyle = '#b91c1c';
        
        // Wing Flapping calculations
        const wingsUp = Math.sin(o.wingPhase) > 0;
        
        // Head / Beak
        ctx.fillRect(o.width * 0.65, 6, 12, 5);
        ctx.fillStyle = '#fbbf24'; // orange beak tip
        ctx.fillRect(o.width * 0.65 + 12, 8, 6, 3);

        ctx.fillStyle = '#b91c1c';
        // Body log
        ctx.fillRect(o.width * 0.15, 6, o.width * 0.55, 10);
        
        // Tail feathers
        ctx.beginPath();
        ctx.moveTo(0, 11);
        ctx.lineTo(o.width * 0.2, 5);
        ctx.lineTo(o.width * 0.2, 17);
        ctx.closePath();
        ctx.fill();

        // Dynamic wings
        if (wingsUp) {
          ctx.beginPath();
          ctx.moveTo(o.width * 0.4, 6);
          ctx.lineTo(o.width * 0.35, -12); // wing up
          ctx.lineTo(o.width * 0.5, 6);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(o.width * 0.4, 14);
          ctx.lineTo(o.width * 0.3, 28); // wing down
          ctx.lineTo(o.width * 0.5, 14);
          ctx.closePath();
          ctx.fill();
        }
      } 
      else if (o.type === 'robot_bird') {
        // Glowing futuristic hunter drone
        ctx.fillStyle = '#475569';
        ctx.fillRect(5, 5, o.width - 10, o.height - 10);

        // Glowing red visor
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(o.width - 15, 10, 10, 4);

        // Rotating rear turbine
        const turbOffset = Math.sin(o.wingPhase * 1.5) * 6;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, 12 + turbOffset/2, 4, 8 - (turbOffset ? 2 : 0));

        // Jet blast thruster circle particles or tail glow
        ctx.fillStyle = `rgba(56, 189, 248, ${Math.random() * 0.5 + 0.55})`;
        ctx.beginPath();
        ctx.arc(-2, 16, 2.5 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // 9. Draw Player character (High-Fidelity Procedural Pixel Renderer)
    const c = engine.selectedCharacter;
    ctx.save();
    
    // Apply squish factor from landing or ducking scale
    const drawHeight = engine.playerHeight - engine.landingSquish;
    const drawY = engine.playerY + engine.landingSquish;

    ctx.translate(engine.playerX, drawY);

    if (engine.isDead) {
      // Rotation spinning death
      ctx.translate(engine.playerWidth / 2, drawHeight / 2);
      ctx.rotate(engine.time * 0.15);
      ctx.translate(-engine.playerWidth / 2, -drawHeight / 2);
    }

    if (c.runnerType === 'dino') {
      // Draw Classic Dino stylized Rex
      ctx.fillStyle = c.color;
      
      // Main Body torso
      ctx.fillRect(10, 12, 28, 22);

      // Tail trailing
      ctx.fillRect(0, 18, 10, 12);
      ctx.fillRect(2, 30, 4, 4);

      // T-Rex snout head
      ctx.fillRect(22, 0, 24, 14);
      // Cheek/neck hook
      ctx.fillRect(30, 14, 8, 6);

      // Green Dino eye/Snout
      ctx.fillStyle = '#000000';
      if (engine.isDead) {
        // Draw cross lines for dead eye
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(34, 4); ctx.lineTo(38, 8);
        ctx.moveTo(38, 4); ctx.lineTo(34, 8);
        ctx.stroke();
      } else {
        ctx.fillRect(36, 4, 3.5, 3.5); // Cute eye
      }

      // Small dinosaur hands
      ctx.fillStyle = c.accentColor;
      ctx.fillRect(36, 18, 6, 2.5);

      // Dino running legs
      ctx.fillStyle = c.color;
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
      // Cyber cybernetic metal running droid
      ctx.fillStyle = c.color;
      
      // Metal torso body
      ctx.fillRect(8, 10, 32, 24);
      
      // Arm/Joint
      ctx.fillStyle = c.accentColor;
      ctx.fillRect(18, 14, 8, 14);

      // Metallic Cyber Head
      ctx.fillStyle = c.color;
      ctx.fillRect(17, 0, 16, 10);
      
      // Glowing cycling visor
      ctx.fillStyle = '#22d3ee'; // bright cyan glow
      ctx.fillRect(25, 3, 8, 3);

      // Jetpack back nozzle
      ctx.fillStyle = '#475569';
      ctx.fillRect(4, 18, 4, 10);
      
      // blue booster sparks when jumping
      if (engine.isJumping) {
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(2, 28, 6, 12);
      }

      // Running metal legs
      ctx.fillStyle = c.accentColor;
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
      // Little running crimson fox with bushy orange tail
      ctx.fillStyle = c.color;

      // Torso body
      ctx.fillRect(8, 12, 30, 20);

      // Big bushy tail
      ctx.fillStyle = c.accentColor; // tail tip usually white or amber
      ctx.fillRect(0, 16, 8, 12);
      ctx.fillStyle = c.color;
      ctx.fillRect(2, 20, 6, 10);

      // Fox triangular head
      ctx.fillRect(24, 2, 16, 12);
      // Ears
      ctx.beginPath();
      ctx.moveTo(26, 2); ctx.lineTo(26, -5); ctx.lineTo(31, 2);
      ctx.moveTo(34, 2); ctx.lineTo(38, -5); ctx.lineTo(39, 2);
      ctx.fill();

      // White cheek patches
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(32, 8, 8, 4);

      // Little eye
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(30, 5, 2.5, 2.5);

      // Four paws walking stride
      ctx.fillStyle = c.color;
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
      // Glowing High-tech energy orb (squashes and stretches dynamically)
      const rad = 23;
      const cx = engine.playerWidth / 2;
      const cy = drawHeight / 2;
      
      // Calculate stretch proportions based on velocity
      const squishRatio = engine.isJumping ? Math.max(0.7, 1 + engine.playerVY * 0.02) : engine.isDucking ? 0.6 : 1.0;
      const stretchW = rad * (2 - squishRatio);
      const stretchH = rad * squishRatio;

      ctx.shadowBlur = (settings.reduceMotion || isMobile) ? 0 : 15;
      ctx.shadowColor = c.color;

      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.ellipse(cx, cy, stretchW, stretchH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Rotating inner technological core
      ctx.strokeStyle = c.accentColor;
      ctx.lineWidth = 2.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(engine.time * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, stretchW * 0.6, 0, Math.PI, false); // top crescent ring
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -3, 6, 6); // white core center
      ctx.restore();
    }

    ctx.restore();

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
      className={`relative w-full ${isFullscreen ? 'h-full rounded-none' : 'h-[320px] md:h-[400px] rounded-2xl'} overflow-hidden bg-slate-900 shadow-inner select-none outline-none border ${isFullscreen ? 'border-none' : 'border-slate-800'} cursor-pointer`}
    >
      <canvas 
        ref={canvasRef} 
        id="runner-game-canvas"
        className="block"
      />
    </div>
  );
};
