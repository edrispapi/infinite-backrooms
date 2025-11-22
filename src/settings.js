// Settings and Save System Module
const STORAGE_KEY_SETTINGS = 'liminal_settings_v3';
const STORAGE_KEY_SAVE = 'liminal_save_v1';
const DEFAULT_SETTINGS = {
  quality: 'high',
  sensitivity: 1.0,
  volume: 80,
  level: 'backrooms'
};
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.warn('Failed to load settings', e);
    return { ...DEFAULT_SETTINGS };
  }
}
export function saveSettings(updates) {
  try {
    const current = loadSettings();
    const newSettings = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    return newSettings;
  } catch (e) {
    console.warn('Failed to save settings', e);
    return DEFAULT_SETTINGS;
  }
}
export function loadGame() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SAVE);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('Failed to load game', e);
    return null;
  }
}
export function saveGame(state) {
  try {
    const data = {
      timestamp: Date.now(),
      ...state
    };
    localStorage.setItem(STORAGE_KEY_SAVE, JSON.stringify(data));
    console.log('Game saved');
  } catch (e) {
    console.warn('Failed to save game', e);
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(STORAGE_KEY_SAVE);
    console.log('Save cleared');
  } catch (e) {
    console.warn('Failed to clear save', e);
  }
}