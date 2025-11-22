// Main Entry Point (Vanilla JS Orchestrator)
import BackroomsEngine from './lib/game/BackroomsEngine.js';
import { createHUD, updateHUD, addHint } from './components/GameHUD.js';
import { createMenu, showMenu } from './components/PauseMenu.js';
import { initBoot } from './components/BootSequence.js';
import { createStart, showStart } from './components/StartOverlay.js';
import { createDeath, showDeath } from './components/DeathScreen.js';
import { loadSettings, saveSettings, loadGame } from './settings.js';
import { resumeAudio } from './audio.js';
// Polyfill AudioContext
window.AudioContext = window.AudioContext || window.webkitAudioContext;
// State
let engine = null;
let isLocked = false;
let hasStarted = false;
let isDead = false;
let settings = loadSettings();
// UI Elements
createHUD();
createMenu({
  onResume: () => {
    engine.lock();
    showMenu(false);
  },
  onReset: () => {
    engine.reset();
    showMenu(false);
    engine.lock();
  },
  onVolume: (v) => {
    settings.volume = v;
    saveSettings({ volume: v });
    engine.callbacks.onVolumeChange(v / 100);
  },
  onSensitivity: (s) => {
    settings.sensitivity = s;
    saveSettings({ sensitivity: s });
    if (engine.controls) engine.controls.pointerSpeed = Number(s);
  },
  onLevel: (l) => {
    settings.level = l;
    saveSettings({ level: l });
    engine.setLevel(l);
  },
  onQuality: () => {
    const q = engine.quality === 'high' ? 'low' : 'high';
    engine.quality = q;
    engine.config.roomRadius = q === 'high' ? 2 : 1;
    engine.config.cellSize = q === 'high' ? 14 : 16.8;
    engine.renderer.setPixelRatio(q === 'high' ? 1.5 : 1.0);
    if (engine.currentLevel === 'backrooms') {
        engine.disposeWorld();
        engine.setupWorld();
        engine.updateRooms();
    }
    saveSettings({ quality: q });
    return q;
  },
  onContinue: (saved) => {
    engine.loadState(saved);
    engine.lock();
    showMenu(false);
    hasStarted = true;
    showStart(false);
  }
});
createStart(() => {
  engine.lock();
  hasStarted = true;
  showStart(false);
});
createDeath({
  onRetry: () => {
    engine.reset();
    showDeath(false);
    isDead = false;
    engine.lock();
  },
  onMenu: () => {
    isDead = false;
    hasStarted = false;
    showDeath(false);
    engine.unlock();
    showStart(true);
  }
});
// Engine Callbacks
const callbacks = {
  onLockChange: (locked) => {
    isLocked = locked;
    const hud = document.getElementById('hud');
    if (hud) hud.style.opacity = locked ? '1' : '0.4';
    if (!locked && hasStarted && !isDead) {
      showMenu(true);
    } else {
      showMenu(false);
    }
  },
  onSanityUpdate: (val) => updateHUD({ ...getHUDState(), sanity: val }),
  onStaminaUpdate: (val) => updateHUD({ ...getHUDState(), stamina: val }),
  onProximityUpdate: (val) => updateHUD({ ...getHUDState(), proximity: val }),
  onFPSUpdate: (val) => updateHUD({ ...getHUDState(), fps: val }),
  onLevelChange: (val) => updateHUD({ ...getHUDState(), level: val }),
  onVolumeChange: (val) => {}, // Handled in audio module
  onDeath: () => {
    isDead = true;
    engine.unlock();
    showDeath(true);
  },
  onInteract: (name) => {
    addHint(`Interacted with ${name} / تعامل با ${name}`);
  }
};
function getHUDState() {
  return {
    sanity: engine ? engine.sanity : 100,
    stamina: engine ? engine.stamina : 100,
    fps: 60, // Updated via callback
    quality: engine ? engine.quality : 'high',
    level: engine ? engine.currentLevel : 'backrooms',
    proximity: engine ? (1 - Math.min(engine.nearestDist, 20)/20) : 0
  };
}
// Init
const container = document.getElementById('game-container');
initBoot(() => {
  engine = new BackroomsEngine(container, callbacks);
  engine.init();
  // Apply Settings
  engine.quality = settings.quality;
  engine.currentLevel = settings.level;
  if (engine.controls) engine.controls.pointerSpeed = Number(settings.sensitivity);
  engine.setLevel(settings.level);
  showStart(true);
});
// Visibility & Cleanup
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (engine && !engine.isDead && hasStarted) engine.saveState();
  } else {
    resumeAudio();
  }
});
window.addEventListener('beforeunload', () => {
  if (engine) engine.dispose();
});