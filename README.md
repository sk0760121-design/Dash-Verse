# HORIZON RUNNER

A complete, production-quality retro HTML5 endless runner game with double-jumping, slide-ducking, animated daily achievements, shop items unlocking (characters, traits, themes), daily missions, and a high-fidelityDay/Night cycle.

Synthesized completely using the **HTML5 Web Audio API** and rendered on a high-performance **60 FPS Canvas** matching a Virtual Coordinate Layout! Works completely offline with zero raw file loading lag or 404 assets errors.

---

## 🎮 CONTROLS

### 💻 Desktop Keyboard
*   **Space / Arrow Up / W** — Jump (Press twice for a double-flip jump!)
*   **Arrow Down / S** — Slide / Duck (Shrinks hitbox to slip underneath birds!)
*   **P / Escape** — Pause & Resume Game
*   **R** — Quick Restart after Game Over

### 📱 Tablet & Mobile Touch
*   **Tap Left/Right HUD Buttons** — Quick tap "JUMP" (far left) or hold "DUCK" (far right)
*   **Gestures Swipes** — Swipe **UP** to Jump & Swipe **DOWN** to slide duck

---

## 📂 PROJECT STRUCTURE

The codebase is organized into highly modular React + TypeScript components styled using Tailwind CSS v4:

```text
/
├── index.html                 # HTML5 Entry file
├── metadata.json              # App Name metadata catalog
├── package.json               # NPM dependency manifestations
├── README.md                  # This handbook!
├── src/
│   ├── main.tsx               # Primary bootstrap layer
│   ├── App.tsx                # Central coordinator and persistent storage manager
│   ├── types.ts               # Shared models (Missions, Settings, Achievements)
│   ├── index.css              # Custom Font configs & Tailwind v4 theme configurations
│   ├── utils/
│   │   └── sound.ts           # 8-bit procedural sound Synthesizer (Web Audio API)
│   └── components/
│       ├── GameCanvas.tsx     # 60FPS Canvas physics & Parallax renderer engine
│       ├── HUD.tsx            # Floating indicators overlays & Game Over portals
│       ├── MainMenu.tsx       # Start screen lobby with play trigger and sub-panels
│       ├── Shop.tsx           # Cosmetics unlocking catalog (Characters, Trails, Themes)
│       ├── AchievementsList.tsx# Showcase unlocked milestones
│       ├── MissionsPanel.tsx  # Interactive progression bars tracking rewards claiming
│       └── SettingsPanel.tsx  # Audio levels calibrator, difficulty toggle, and resets
```

---

## 🛠️ CUSTOMIZATION GUIDE

### 1. How to Add New Characters
Open `/src/App.tsx` and find the static `INITIAL_CHARACTERS` array. Inject a new item with your desired hex color parameters:

```typescript
{
  id: 'aqua_ninja',
  name: '🐱 Aqua Ninja',
  cost: 75,
  unlocked: false,
  description: 'Sleek cyan kitten designed for quick reflexes.',
  color: '#22d3ee',        // Main skin color
  accentColor: '#0891b2',  // Accent shadow/paws highlights
  runnerType: 'fox'        // Core animator preset ('dino' | 'robot' | 'fox' | 'sphere')
}
```

### 2. How to Add New Background Themes
Open `/src/App.tsx` and find the static `INITIAL_THEMES` array. Create a cohesive parralax color palette matching your theme idea:

```typescript
{
  id: 'theme_nebula',
  name: '🌌 Neon Nebula',
  cost: 160,
  unlocked: false,
  skyColor: '#0f172a',       // Day sky (Deep blue)
  skyNightColor: '#020617',  // Night sky (Black void)
  groundColor: '#1e293b',    // Running turf floor
  mountainColor: '#3b0764',  // Parallax mountains peak outline
  treeColor: '#581c87'       // Parallax trees outline
}
```

### 3. How to Add New Obstacles
To spawn a new type of obstacle, navigate to `/src/components/GameCanvas.tsx`:
1.  Add a new obstacle union keyword to `GameObstacle['type']` in types list.
2.  Define its matching visual parameters (Width, Height, Starting Y coordinates) inside the `spawnObstacle` function switch statement:
    ```typescript
    case 'laser_fence':
      width = 15;
      height = 70;
      y = GROUND_Y - height; // sits on ground
      break;
    ```
3.  Add custom vector canvas drawing steps inside the `renderGame` iterator under drawing branch:
    ```typescript
    if (o.type === 'laser_fence') {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, o.width, o.height); // glowing beam!
    }
    ```

### 4. How to Adjust Difficulty
To configure difficulty pacing, tweak physical speed properties located in `/src/components/GameCanvas.tsx`:
*   `BASE_SPEED`: Starting scroll rate (Default: `6.5`).
*   `MAX_SPEED`: Maximum cap speed (Default: `14.0`).
*   `GRAVITY`: Jumping drop pull (Default: `0.5`).
*   `JUMP_FORCE`: Jump velocity push height (Default: `-11.5`).

---

## 🎯 KEY ARCHITECTURAL PATTERNS

### High-Fidelity Vector Synthesis
Avoids loaded `.png` / `.mp3` loading delays. Jumps, chimes, explosions, and backbeat synths are procedurally cooked on-the-fly inside the client's `sound.ts` audio channel, utilizing `OscillatorNode` oscillators, bandpass filters, and exponential gain sweeps.

### Non-leaking Particle Arrays
Exhaust trails, dust particles, and explosion pieces are modeled as self-cleanups. Old active particles are automatically pruned from memory lists once they exceed their `maxLife` intervals, guaranteeing comfortable operations across hours of endless sessions.
