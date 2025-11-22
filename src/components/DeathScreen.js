// Vanilla JS Death Screen
export function createDeath(callbacks) {
  const death = document.createElement('div');
  death.id = 'death-screen';
  death.className = 'absolute inset-0 z-50 hidden items-center justify-center bg-red-950/80 backdrop-blur-md animate-in fade-in duration-1000';
  death.innerHTML = `
    <div class="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
    <div class="w-full max-w-md relative z-10 bg-black/90 border border-red-500/30 p-8 rounded-lg text-red-100 shadow-[0_0_50px_rgba(220,38,38,0.3)] text-center">
      <div class="mx-auto bg-red-900/20 p-4 rounded-full border border-red-500/30 w-20 h-20 flex items-center justify-center mb-6 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/></svg>
      </div>
      <h2 class="text-5xl font-mono tracking-[0.2em] uppercase text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] mb-2">YOU DIED</h2>
      <p class="font-mono text-red-400/70 text-lg mb-8" dir="rtl">چیزی ��یدات کرد...</p>
      <div class="flex flex-col gap-4">
        <button id="btn-retry" class="h-14 bg-red-600 hover:bg-red-500 text-white font-mono uppercase tracking-widest text-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all">
          Retry / تلاش مجدد
        </button>
        <button id="btn-menu-return" class="h-12 border border-red-900/50 text-red-400 hover:bg-red-950/50 font-mono uppercase tracking-widest text-sm">
          Return to Menu / بازگشت
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(death);
  document.getElementById('btn-retry').onclick = callbacks.onRetry;
  document.getElementById('btn-menu-return').onclick = callbacks.onMenu;
  return death;
}
export function showDeath(show) {
  const el = document.getElementById('death-screen');
  if (el) el.style.display = show ? 'flex' : 'none';
}