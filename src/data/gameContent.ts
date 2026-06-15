import { Character, Trail, GameTheme, Mission, Accessory } from '../types';

function toRoman(num: number): string {
  let result = '';
  let n = num;
  if (n >= 20) { result += 'XX'; n -= 20; }
  else if (n >= 10) { result += 'X'; n -= 10; }
  
  if (n === 9) { result += 'IX'; }
  else if (n >= 5) { result += 'V' + 'I'.repeat(n - 5); }
  else if (n === 4) { result += 'IV'; }
  else { result += 'I'.repeat(n); }
  return result;
}

// 12 Runners / Characters (10+ required)
export const INITIAL_CHARACTERS: Character[] = [
  { id: 'classic_dino', name: 'Rex (Default)', cost: 0, unlocked: true, description: 'Isometric 3D green voxel dinosaur. Grounded running (No Double Jumps Allowed!)', color: '#10b981', accentColor: '#34d399', runnerType: 'dino' },
  { id: 'robo_dino', name: '🤖 3D Robo-Rex', cost: 90, unlocked: false, description: 'Prehistoric cybernetic machine rex clad in titanium plating. Double Jump Enabled!', color: '#38bdf8', accentColor: '#0ea5e9', runnerType: 'dino' },
  { id: 'ninja_dino', name: '🥷 3D Shinobi Rex', cost: 140, unlocked: false, description: 'Ancient shadow ninja raptor clad in sleek dark garments. Double Jump Enabled!', color: '#1e293b', accentColor: '#64748b', runnerType: 'dino' },
  { id: 'cyber_dino', name: '⚡ 3D Cyberpunk Dino', cost: 220, unlocked: false, description: 'High-tech hacker dino emitting reactive neon impulses. Double Jump Enabled!', color: '#f43f5e', accentColor: '#ffe4e6', runnerType: 'dino' },
  { id: 'cyber_run', name: '🤖 3D Cyber Runner', cost: 50, unlocked: false, description: 'Volumetric 3D metal droid with jetpack boosters. Double Jump Enabled.', color: '#06b6d4', accentColor: '#22d3ee', runnerType: 'robot' },
  { id: 'pixie_fox', name: '🦊 3D Pixie Ninja', cost: 120, unlocked: false, description: 'Elegantly sculpted crimson 3D fox runner. Double Jump Enabled.', color: '#ef4444', accentColor: '#f97316', runnerType: 'fox' },
  { id: 'neon_sphere', name: '🔮 3D Neon Core', cost: 250, unlocked: false, description: 'Anti-gravity 3D energy orb with outer orbital tech rings. Double Jump Enabled.', color: '#a855f7', accentColor: '#f43f5e', runnerType: 'sphere' },
  { id: 'solar_phoenix', name: '🔥 3D Solar Phoenix', cost: 300, unlocked: false, description: 'Vibrant 3D crimson flame-wing bird forged in cosmic heat. Double Jump Enabled.', color: '#f97316', accentColor: '#ef4444', runnerType: 'fox' },
  { id: 'chrono_bot', name: '⏳ 3D Chrono-Keeper', cost: 350, unlocked: false, description: 'Chunky 3D alloy android with temporal speed plates. Double Jump Enabled.', color: '#94a3b8', accentColor: '#3b82f6', runnerType: 'robot' },
  { id: 'shadow_worg', name: '🐺 3D Shadow Worg', cost: 400, unlocked: false, description: 'Mystic 3D dark-matter predator shifting through dimensional walls. Double Jump.', color: '#312e81', accentColor: '#6366f1', runnerType: 'fox' },
  { id: 'lunar_rover', name: '🌙 3D Lunar Rover', cost: 450, unlocked: false, description: 'All-terrain 3D space crawler with titanium-reinforced tires. Double Jump.', color: '#0284c7', accentColor: '#38bdf8', runnerType: 'robot' },
  { id: 'magma_golem', name: '🌋 3D Obsidian Core', cost: 500, unlocked: false, description: '3D igneous core containing live-flowing molten magma. Double Jump Enabled.', color: '#7f1d1d', accentColor: '#f97316', runnerType: 'sphere' },
  { id: 'aero_glider', name: '🪁 3D Aero Strider', cost: 550, unlocked: false, description: 'Ultralight aerodynamic 3D glider sphere optimizing atmospheric wind. Double Jump.', color: '#10b981', accentColor: '#34d399', runnerType: 'sphere' },
  { id: 'plasma_rex', name: '⚡ 3D Plasma Raptor', cost: 600, unlocked: false, description: 'Fearsome prehistoric rex with 3D neon plasma sub-conductors. Double Jump.', color: '#d946ef', accentColor: '#a855f7', runnerType: 'dino' },
  { id: 'prism_drifter', name: '🌈 3D Prism Spirit', cost: 750, unlocked: false, description: 'Prismatic 3D light-sculpted runner mapping vibrant spectrum trails. Double Jump.', color: '#ec4899', accentColor: '#f43f5e', runnerType: 'fox' },
  { id: 'cosmic_striker', name: '🌌 3D Cosmic Striker', cost: 850, unlocked: false, description: 'Eons of starlight crystalized. Premium cosmic runner. SPECIAL ABILITY: Triple Jump Enabled!', color: '#6366f1', accentColor: '#a855f7', runnerType: 'sphere', hasTripleJump: true }
];

// 12 Trails (10+ required)
export const INITIAL_TRAILS: Trail[] = [
  { id: 'trail_none', name: 'None', cost: 0, unlocked: true, type: 'none', color: '#ffffff' },
  { id: 'trail_fire', name: '🔥 Fire Blast', cost: 40, unlocked: false, type: 'fire', color: '#f97316' },
  { id: 'trail_rainbow', name: '🌈 Rainbow Pixels', cost: 80, unlocked: false, type: 'rainbow', color: '#f43f5e' },
  { id: 'trail_electric', name: '⚡ Electric Zap', cost: 150, unlocked: false, type: 'electric', color: '#22d3ee' },
  { id: 'trail_shadow', name: '👤 Shadow Eclipse', cost: 200, unlocked: false, type: 'shadow', color: 'rgba(0,0,0,0.15)' },
  { id: 'trail_toxic_slime', name: '🤢 Acid Stream', cost: 60, unlocked: false, type: 'fire', color: '#22c55e' },
  { id: 'trail_cosmic_stardust', name: '✨ Stardust Orbit', cost: 100, unlocked: false, type: 'rainbow', color: '#38bdf8' },
  { id: 'trail_neon_pulse', name: '🔮 Purple Impulse', cost: 110, unlocked: false, type: 'electric', color: '#a855f7' },
  { id: 'trail_solar_flare', name: '☀️ Solar Flare', cost: 130, unlocked: false, type: 'fire', color: '#eab308' },
  { id: 'trail_cyber_grid', name: '🌐 Grid Matrix', cost: 175, unlocked: false, type: 'electric', color: '#10b981' },
  { id: 'trail_void_vapor', name: '🌫️ Void Mist', cost: 220, unlocked: false, type: 'shadow', color: 'rgba(99, 102, 241, 0.3)' },
  { id: 'trail_ruby_spark', name: '💎 Ruby Shards', cost: 250, unlocked: false, type: 'rainbow', color: '#ec4899' }
];

// 11 Themes (10+ required)
export const INITIAL_THEMES: GameTheme[] = [
  { id: 'theme_classic', name: '🌅 Classic Horizon', cost: 0, unlocked: true, skyColor: '#bae6fd', skyNightColor: '#020617', groundColor: '#4b5563', mountainColor: '#334155', treeColor: '#1e293b' },
  { id: 'theme_cyber', name: '🎆 Cyber Sunset', cost: 100, unlocked: false, skyColor: '#4c1d95', skyNightColor: '#120526', groundColor: '#1e1b4b', mountainColor: '#581c87', treeColor: '#3b0764' },
  { id: 'theme_volcanic', name: '🌋 Ash Rift', cost: 150, unlocked: false, skyColor: '#7c2d12', skyNightColor: '#110402', groundColor: '#1c1917', mountainColor: '#451a03', treeColor: '#292524' },
  { id: 'theme_valley', name: '🌲 Emerald Valley', cost: 180, unlocked: false, skyColor: '#fef08a', skyNightColor: '#022c22', groundColor: '#14532d', mountainColor: '#15803d', treeColor: '#166534' },
  { id: 'theme_neon_noir', name: '🌃 Neon Noir', cost: 60, unlocked: false, skyColor: '#1e1e2e', skyNightColor: '#000000', groundColor: '#11111b', mountainColor: '#313244', treeColor: '#45475a' },
  { id: 'theme_frozen', name: '❄️ Glacial Drift', cost: 80, unlocked: false, skyColor: '#e0f2fe', skyNightColor: '#0c4a6e', groundColor: '#7dd3fc', mountainColor: '#38bdf8', treeColor: '#0284c7' },
  { id: 'theme_desert', name: '🏜️ Dune Outpost', cost: 110, unlocked: false, skyColor: '#fee2e2', skyNightColor: '#450a0a', groundColor: '#b45309', mountainColor: '#78350f', treeColor: '#92400e' },
  { id: 'theme_synthwave', name: '🌅 Synth Shore', cost: 130, unlocked: false, skyColor: '#f43f5e', skyNightColor: '#1e1b4b', groundColor: '#311042', mountainColor: '#500747', treeColor: '#701a75' },
  { id: 'theme_deepsea', name: '🌊 Abyssal Trench', cost: 155, unlocked: false, skyColor: '#035a70', skyNightColor: '#02141a', groundColor: '#000a12', mountainColor: '#083344', treeColor: '#115e59' },
  { id: 'theme_golden', name: '👑 El Dorado', cost: 200, unlocked: false, skyColor: '#fde047', skyNightColor: '#451a03', groundColor: '#854d0e', mountainColor: '#a16207', treeColor: '#ca8a04' },
  { id: 'theme_cherry_forest', name: '🌸 Sakura Gardens', cost: 220, unlocked: false, skyColor: '#ffe4e6', skyNightColor: '#4c0519', groundColor: '#881337', mountainColor: '#9f1239', treeColor: '#fda4af' }
];

// Helper program to output 216 distinct curated missions (8 categories x 27 tiers)
const generateMissions = (): Mission[] => {
  const missionsList: Mission[] = [];

  const JUMP_TITLES = [
    "Aether Hopper", "Skybound Initiate", "Gravity Defier", "Nimbus Bound", "Cloud Strider",
    "Zenith Leap", "Stratosphere Sprinter", "Horizon Bound", "Altitude Seeker", "Orbital Jumper",
    "Nebula Dancer", "Cosmic Voyager", "Supernova Vault", "Apex Skyliner", "Light Year Leap",
    "Galaxy Hopper", "Pulsar Bounce", "Void Jumper", "Chronos Strider", "Starlight Elevate"
  ];
  
  const COIN_TITLES = [
    "Penny Picker", "Gold Miner", "Treasury Hunter", "Pocket Change", "Coin Magnet",
    "Loot Gatherer", "Shining Spark", "Vault Seeker", "Fortune Binder", "Capital Accumulator",
    "Bullion Collector", "Midas Apprentice", "Gold Rush", "Stellar Bank", "Glitch Hoarder",
    "Cosmic Vault", "Aureum Rich", "Hyper Wealth", "Quantum Treasury", "Omni Bank"
  ];
  
  const LIFETIME_COIN_TITLES = [
    "Savings Account", "Piggy Banker", "Coin Hoarder", "Mint Master", "Treasure Collector",
    "Wealth Multiplier", "Loot Legend", "Glittering Hoard", "Vectored Wealth", "Sky Investor",
    "Sovereign Reserve", "Stellar Treasury", "Interstellar Mint", "Infinite Gold", "Cosmic Midas"
  ];
  
  const SCORE_TITLES = [
    "Stride Beginner", "Speedy Runner", "Sky Marathoner", "Milestone Breaker", "Velocity Seeker",
    "Horizon Veteran", "Hyper-drive Active", "Warp Speed", "Time Slicer", "Sonic Boom",
    "Tachyon Runner", "Dimension Strider", "Speed of Light", "Infinite Horizon", "Cosmic Speedster"
  ];
  
  const OBSTACLE_TITLES = [
    "Agile Dodge", "Quick Step", "Reflex Core", "Nimble Stride", "Dodge Enthusiast",
    "Phantom Step", "Ghost Runner", "Laser Dodger", "Voxel Evader", "Matrix Slider",
    "Chrono-Dodge", "Temporal Slider", "Zero Contact", "Untouchable", "Quantum Slipstream"
  ];
  
  const PLAYS_TITLES = [
    "Day One", "Re-Runner", "Addicted Strider", "Skyline Veteran", "Loop Specialist",
    "Chronicle Keeper", "Sky Patrol", "Persistent Runner", "Tireless Sprint", "Infinite Loops"
  ];
  
  const DISTANCE_TITLES = [
    "Meter Milestone", "Asphalt Voyager", "Kilometer Club", "Scenic Route", "Marathoner",
    "Cross-Sky Journey", "Tour de Horizon", "Atmosphere Trek", "Light-Hour Runner", "Hyper-Plains"
  ];
  
  const DUCK_TITLES = [
    "Low Slider", "Limbo Initiate", "Ceiling Clipper", "Duck Master", "Sub-Level Glide",
    "Trench Runner", "Shadow Duck", "Crevice Slider", "Subterranean Drift", "Apex Slider"
  ];

  const JUMP_TARGETS = [15, 30, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1800, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 10000];
  const COIN_TARGETS = [20, 40, 60, 80, 100, 150, 200, 250, 300, 400, 500, 600, 750, 900, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 8000, 10000];
  const LIFETIME_COIN_TARGETS = [30, 60, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1800, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 12000, 15000];
  const SCORE_TARGETS = [100, 200, 300, 400, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000, 12500, 15000, 17500, 20000, 25000, 30000, 35000, 40000, 45000, 50000];
  const OBSTACLE_TARGETS = [10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 10000];
  const PLAYS_TARGETS = [2, 4, 6, 8, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 500];
  const DISTANCE_TARGETS = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000, 12500, 15000, 17500, 20000, 22500, 25000, 30000, 35000, 40000, 45000, 50000, 60000, 70000, 80000, 90000, 100000];
  const DUCK_TARGETS = [5, 10, 15, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000, 2500];

  for (let i = 0; i < 27; i++) {
    // 1. Jumps
    const targetJ = JUMP_TARGETS[i];
    missionsList.push({
      id: `mission-jumps-${i + 1}`,
      title: `${JUMP_TITLES[i % JUMP_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Perform ${targetJ.toLocaleString()} jumps across runs`,
      target: targetJ,
      current: 0,
      reward: Math.floor(targetJ * 0.4) + 15,
      completed: false,
      claimed: false
    });

    // 2. Bank Coins
    const targetC = COIN_TARGETS[i];
    missionsList.push({
      id: `mission-coin-bank-${i + 1}`,
      title: `${COIN_TITLES[i % COIN_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Amass ${targetC.toLocaleString()} golden coins in bank savings`,
      target: targetC,
      current: 0,
      reward: Math.floor(targetC * 0.35) + 20,
      completed: false,
      claimed: false
    });

    // 3. Lifetime Coins
    const targetLC = LIFETIME_COIN_TARGETS[i];
    missionsList.push({
      id: `mission-lifetime-coins-${i + 1}`,
      title: `${LIFETIME_COIN_TITLES[i % LIFETIME_COIN_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Acquire ${targetLC.toLocaleString()} golden coins in total lifetime earnings`,
      target: targetLC,
      current: 0,
      reward: Math.floor(targetLC * 0.45) + 25,
      completed: false,
      claimed: false
    });

    // 4. Score
    const targetS = SCORE_TARGETS[i];
    missionsList.push({
      id: `mission-score-${i + 1}`,
      title: `${SCORE_TITLES[i % SCORE_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Exceed ${targetS.toLocaleString()} high score in a single run`,
      target: targetS,
      current: 0,
      reward: Math.floor(targetS * 0.05) + 30,
      completed: false,
      claimed: false
    });

    // 5. Obstacles
    const targetO = OBSTACLE_TARGETS[i];
    missionsList.push({
      id: `mission-obstacles-${i + 1}`,
      title: `${OBSTACLE_TITLES[i % OBSTACLE_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Safely dodge ${targetO.toLocaleString()} obstacles total`,
      target: targetO,
      current: 0,
      reward: Math.floor(targetO * 0.4) + 40,
      completed: false,
      claimed: false
    });

    // 6. Plays
    const targetP = PLAYS_TARGETS[i];
    missionsList.push({
      id: `mission-plays-${i + 1}`,
      title: `${PLAYS_TITLES[i % PLAYS_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Complete ${targetP.toLocaleString()} total runs into digital skylines`,
      target: targetP,
      current: 0,
      reward: targetP * 10 + 10,
      completed: false,
      claimed: false
    });

    // 7. Distance
    const targetD = DISTANCE_TARGETS[i];
    missionsList.push({
      id: `mission-distance-${i + 1}`,
      title: `${DISTANCE_TITLES[i % DISTANCE_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Sprint a combined total of ${targetD.toLocaleString()} meters`,
      target: targetD,
      current: 0,
      reward: Math.floor(targetD * 0.015) + 20,
      completed: false,
      claimed: false
    });

    // 8. Ducks
    const targetDu = DUCK_TARGETS[i];
    missionsList.push({
      id: `mission-ducks-${i + 1}`,
      title: `${DUCK_TITLES[i % DUCK_TITLES.length]} ${toRoman(i + 1)}`,
      description: `Slide under obstructions ${targetDu.toLocaleString()} times total`,
      target: targetDu,
      current: 0,
      reward: Math.floor(targetDu * 0.5) + 15,
      completed: false,
      claimed: false
    });
  }

  return missionsList;
};

export const INITIAL_MISSIONS: Mission[] = generateMissions();

export const INITIAL_ACCESSORIES: Accessory[] = [
  // Hats list
  { id: 'acc_none_hat', name: 'No Hat', type: 'hat', cost: 0, unlocked: true, description: 'Let your head breathe free.', color: '#2563eb', emoji: '❌' },
  { id: 'acc_cap', name: '🧢 Red Sports Cap', type: 'hat', cost: 30, unlocked: false, description: 'Bright casual cap that matches any dino stride.', color: '#ef4444', emoji: '🧢' },
  { id: 'acc_crown', name: '👑 Royal Gold Crown', type: 'hat', cost: 200, unlocked: false, description: 'Glistening 3D majestic crown encrusted with small rubies.', color: '#fbbf24', emoji: '👑' },
  { id: 'acc_cowboy', name: '🤠 Wild West Hat', type: 'hat', cost: 85, unlocked: false, description: 'Leather stetson with a rounded brim for maximum cowboy style.', color: '#78350f', emoji: '🤠' },
  { id: 'acc_pirate', name: '🏴‍☠️ Pirate Captain Hat', type: 'hat', cost: 110, unlocked: false, description: 'Double folded dread pirate hat featuring an anchor emblem.', color: '#1e293b', emoji: '🏴‍☠️' },
  { id: 'acc_detective', name: '🕵️ detective Deerslayer', type: 'hat', cost: 60, unlocked: false, description: 'Classic houndstooth hat for sleuthing out coin trails.', color: '#475569', emoji: '🕵️' },
  
  // Glasses list
  { id: 'acc_none_glasses', name: 'No Glasses', type: 'glasses', cost: 0, unlocked: true, description: 'Keep your eyes unobstructed.', color: '#312e81', emoji: '❌' },
  { id: 'acc_glasses_cyber', name: '🕶️ Holographic Visor', type: 'glasses', cost: 50, unlocked: false, description: 'Futuristic visor projecting horizontal stream coordinate codes.', color: '#22d3ee', emoji: '🕶️' },
  { id: 'acc_glasses_retro', name: '😎 Retro Shades', type: 'glasses', cost: 40, unlocked: false, description: 'Polarized dark cool glasses keeping the glare totally chill.', color: '#111827', emoji: '😎' },
  { id: 'acc_glasses_deal', name: '👾 Pixel Deal-With-It', type: 'glasses', cost: 160, unlocked: false, description: 'Thug-life retro meme pixel glasses for ultimate gaming swag.', color: '#000000', emoji: '👾' }
];
