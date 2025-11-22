// Vanilla JS Pause Menu
import { loadGame } from '../settings.js';
export function createMenu(callbacks) {
  const menu = document.createElement('div');
  menu.id = 'pause-menu';
  menu.className = 'absolute inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-md';
  menu.innerHTML = `
    <div class="w-full max-w-md bg-black/80 border border-white/10 p-8 rounded-lg shadow-2xl text-[#F7F3D8] font-mono">
      <div class="text-center mb-8">
        <div class="mx-auto w-16 h-1 bg-yellow-600/50 rounded-full mb-4"></div>
        <h2 class="text-4xl tracking-[0.2em] uppercase text-yellow-100 drop-shadow-glow">PAUSED</h2>
      </div>
      <div class="flex flex-col gap-4">
        <button id="btn-continue" class="hidden w-full h-14 border border-white/20 bg-white/5 hover:bg-yellow-900/20 text-lg uppercase tracking-widest transition-all">
          Continue / ادامه
        </button>
        <button id="btn-resume" class="w-full h-14 border border-white/20 bg-white/5 hover:bg-yellow-900/20 text-lg uppercase tracking-widest transition-all">
          Resume / از سرگیری
        </button>
        <div class="space-y-4 p-4 border border-white/10 rounded bg-white/5">
          <div class="flex justify-between items-center text-sm">
            <span>Volume / بلندی ��دا</span>
            <input type="range" id="vol-slider" min="0" max="100" value="80" class="w-32">
          </div>
          <div class="flex justify-between items-center text-sm">
            <span>Sensitivity / حساسیت</span>
            <input type="range" id="sens-slider" min="0.4" max="1.6" step="0.05" value="1.0" class="w-32">
          </div>
          <div class="flex justify-between items-center text-sm">
            <span>Level / سطح</span>
            <select id="level-select" class="bg-black border border-white/20 text-xs p-1">
              <option value="backrooms">Level 0 – Backrooms</option>
              <option value="hill">Level Field – Hill</option>
            </select>
          </div>
          <button id="btn-quality" class="w-full text-xs border border-white/10 py-2 hover:bg-white/10">
            Quality: HIGH
          </button>
        </div>
        <button id="btn-reset" class="w-full h-12 bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-200 uppercase tracking-widest text-sm">
          Reset / بازنشانی
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(menu);
  // Event Listeners
  document.getElementById('btn-resume').onclick = callbacks.onResume;
  document.getElementById('btn-reset').onclick = callbacks.onReset;
  document.getElementById('vol-slider').oninput = (e) => callbacks.onVolume(e.target.value);
  document.getElementById('sens-slider').oninput = (e) => callbacks.onSensitivity(e.target.value);
  document.getElementById('level-select').onchange = (e) => callbacks.onLevel(e.target.value);
  document.getElementById('btn-quality').onclick = () => {
    const q = callbacks.onQuality();
    document.getElementById('btn-quality').textContent = `Quality: ${q.toUpperCase()}`;
  };
  // Continue Logic
  const saved = loadGame();
  const contBtn = document.getElementById('btn-continue');
  if (saved) {
    contBtn.style.display = 'block';
    contBtn.onclick = () => callbacks.onContinue(saved);
  }
  return menu;
}
export function showMenu(show) {
  const menu = document.getElementById('pause-menu');
  if (menu) menu.style.display = show ? 'flex' : 'none';
  // Update continue button visibility on show
  if (show) {
    const saved = loadGame();
    const contBtn = document.getElementById('btn-continue');
    if (contBtn) {
        contBtn.style.display = saved ? 'block' : 'none';
    }
  }
}