// Vanilla JS HUD Component
export function createHUD() {
  const hud = document.createElement('div');
  hud.className = 'absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4 sm:p-8 font-mono text-[#F7F3D8] select-none transition-opacity duration-500';
  hud.id = 'hud';
  hud.innerHTML = `
    <!-- Top Bar -->
    <div class="flex justify-between items-start">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-red-600 animate-blink shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
          <span class="text-xl tracking-widest font-bold drop-shadow-md">REC</span>
          <div class="flex items-center gap-2 text-sm font-bold tracking-widest opacity-80 ml-4 border-l border-white/20 pl-4">
             <span id="level-label" class="text-yellow-400">LEVEL:</span>
             <span id="level-name">BACKROOMS</span>
          </div>
        </div>
        <div class="text-sm opacity-70 tracking-wider">TAPE_004 // [LIVE_FEED]</div>
      </div>
      <div class="text-right flex flex-col items-end gap-2">
         <div class="flex items-center gap-2 text-xl font-bold drop-shadow-md">
           <span>84%</span>
         </div>
         <div id="quality-label" class="text-sm font-bold tracking-widest text-green-500">QUALITY: HIGH</div>
         <!-- Sanity -->
         <div class="flex flex-col items-end gap-1 w-48 mt-2">
           <div class="flex items-center gap-2 text-sm font-bold tracking-widest">
              <span id="sanity-text">SANITY: 100%</span>
           </div>
           <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
             <div id="sanity-bar" class="h-full bg-white transition-all duration-300" style="width: 100%"></div>
           </div>
         </div>
         <!-- Stamina -->
         <div class="flex flex-col items-end gap-1 w-48 mt-2">
           <div class="flex items-center gap-2 text-sm font-bold tracking-widest">
              <span id="stamina-text">STAMINA: 100%</span>
           </div>
           <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
             <div id="stamina-bar" class="h-full bg-green-500 transition-all duration-300" style="width: 100%"></div>
           </div>
         </div>
      </div>
    </div>
    <!-- Center Hint -->
    <div id="hud-hint" class="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded opacity-0 transition-opacity duration-300 text-center"></div>
    <!-- Vignette -->
    <div id="vignette" class="absolute inset-0 pointer-events-none z-30 mix-blend-multiply transition-opacity duration-200" style="background: radial-gradient(circle, rgba(139,0,0,0.4) 0%, rgba(50,0,0,0) 80%); opacity: 0;"></div>
    <!-- Bottom Bar -->
    <div class="flex justify-between items-end">
      <div class="flex flex-col">
        <div id="time-display" class="text-xl font-bold drop-shadow-md">00:00:00 PM</div>
        <div class="flex gap-4 mt-1">
          <div class="text-xs opacity-60 font-light">JUN 12 1998</div>
          <div id="fps-display" class="text-xs opacity-60">FPS: 60</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(hud);
  // Time Loop
  setInterval(() => {
    const now = new Date();
    document.getElementById('time-display').textContent = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, 1000);
  return hud;
}
export function updateHUD(state) {
  const sanityBar = document.getElementById('sanity-bar');
  const staminaBar = document.getElementById('stamina-bar');
  const sanityText = document.getElementById('sanity-text');
  const staminaText = document.getElementById('stamina-text');
  const fpsDisplay = document.getElementById('fps-display');
  const qualityLabel = document.getElementById('quality-label');
  const levelName = document.getElementById('level-name');
  const levelLabel = document.getElementById('level-label');
  const vignette = document.getElementById('vignette');
  if (sanityBar) sanityBar.style.width = `${state.sanity}%`;
  if (sanityText) sanityText.textContent = `SANITY: ${Math.floor(state.sanity)}%`;
  if (staminaBar) {
    staminaBar.style.width = `${state.stamina}%`;
    staminaBar.className = `h-full transition-all duration-300 ${state.stamina > 50 ? 'bg-green-500' : state.stamina > 20 ? 'bg-yellow-500' : 'bg-red-600'}`;
  }
  if (staminaText) staminaText.textContent = `STAMINA: ${Math.floor(state.stamina)}%`;
  if (fpsDisplay) fpsDisplay.textContent = `FPS: ${state.fps}`;
  if (qualityLabel) {
    qualityLabel.textContent = `QUALITY: ${state.quality.toUpperCase()}`;
    qualityLabel.className = `text-sm font-bold tracking-widest ${state.quality === 'low' ? 'text-yellow-400' : 'text-green-500'}`;
  }
  if (levelName) {
    levelName.textContent = state.level === 'backrooms' ? 'BACKROOMS' : 'Level Field – خانه روی تپه';
    levelLabel.className = state.level === 'backrooms' ? 'text-yellow-400' : 'text-blue-400';
  }
  if (vignette) {
    vignette.style.opacity = state.sanity < 30 ? state.proximity * 0.5 : 0;
  }
  if (state.sanity < 30 && Math.random() < 0.01) {
    addHint('Sanity Low - Find safety! / عقلت کمه - پناه پیدا کن!', 'low');
  }
}
export function addHint(text, type = 'info') {
  const hint = document.getElementById('hud-hint');
  if (!hint) return;
  hint.textContent = text;
  hint.className = `absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded transition-opacity duration-300 text-center opacity-100 ${type === 'low' ? 'bg-red-900/80 text-red-100' : 'bg-black/80 text-white'}`;
  setTimeout(() => {
    hint.classList.remove('opacity-100');
    hint.classList.add('opacity-0');
  }, 3000);
}