// Vanilla JS Start Overlay
export function createStart(onStart) {
  const start = document.createElement('div');
  start.id = 'start-overlay';
  start.className = 'absolute inset-0 z-50 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,220,0.15),rgba(0,0,0,0.95))] text-[#F7F3D8] p-6 text-center animate-in fade-in duration-700';
  start.innerHTML = `
    <h1 class="text-4xl sm:text-6xl font-bold tracking-[0.2em] mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] uppercase">
      BACKROOMS WEB
    </h1>
    <div class="max-w-lg space-y-6 bg-black/40 backdrop-blur-sm p-8 rounded-lg border border-white/10 shadow-2xl" dir="rtl">
      <p class="text-lg leading-relaxed opacity-90">
        برای ��روع روی دکمه زیر کلیک کن، ماوس قفل می‌شه و می‌تونی با
        <strong class="mx-1 text-yellow-200 font-mono">W A S D</strong>
        حرک�� کنی و با ماوس نگاه کنی.
      </p>
      <p class="text-base opacity-80">
        برای دویدن کلید <strong class="mx-1 text-yellow-200 font-mono">Shift</strong> رو نگه دا��.
        چراغ قوه <strong class="mx-1 text-yellow-200 font-mono">F</strong>.
        تعامل <strong class="mx-1 text-yellow-200 font-mono">E</strong>.
      </p>
      <p class="text-base opacity-80 border-t border-white/10 pt-4 mt-4">
        می‌تونی سطح رو از منو تغییر بدی: <strong class="mx-1 text-yellow-200 font-mono">Backrooms (دفتر زرد)</strong> یا <strong class="mx-1 text-yellow-200 font-mono">Hill (خانه روی تپه)</strong>.
      </p>
    </div>
    <button id="btn-start-game" class="mt-12 px-12 py-6 text-lg bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all duration-300 rounded-full uppercase tracking-widest">
      Start Game / ��روع بازی
    </button>
  `;
  document.body.appendChild(start);
  document.getElementById('btn-start-game').onclick = onStart;
  return start;
}
export function showStart(show) {
  const el = document.getElementById('start-overlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}