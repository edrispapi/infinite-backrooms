// Vanilla JS Boot Sequence
export function initBoot(onComplete) {
  const boot = document.createElement('div');
  boot.id = 'boot-sequence';
  boot.className = 'absolute inset-0 z-[100] bg-black text-green-500 font-mono p-8 sm:p-12 flex flex-col justify-between pointer-events-none';
  boot.innerHTML = `
    <div class="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
    <div id="boot-lines" class="flex flex-col gap-2 z-20 text-sm sm:text-base tracking-wider shadow-green-500/50 drop-shadow-sm"></div>
    <div class="w-full max-w-2xl mb-12 z-20">
      <div class="flex justify-between text-xs mb-2 uppercase tracking-widest opacity-80">
          <span>Loading Resources</span>
          <span id="boot-percent">0%</span>
      </div>
      <div class="h-4 w-full border border-green-800 p-0.5">
          <div id="boot-bar" class="h-full bg-green-600 shadow-[0_0_10px_rgba(22,163,74,0.5)] transition-all duration-75 ease-linear" style="width: 0%"></div>
      </div>
    </div>
  `;
  document.body.appendChild(boot);
  const lines = [
    "BIOS DATE 06/12/98 14:22:05 VER 1.02",
    "CPU: QUANTUM NEURAL NET PROCESSOR",
    "CHECKING MEMORY... 640K OK",
    "LOADING REALITY ENGINE... OK",
    "INITIALIZING PROCEDURAL GENERATION...",
    "LOADING ASSETS: TEXTURES... OK",
    "LOADING ASSETS: AUDIO... OK",
    "ENGAGING POINTER LOCK PROTOCOLS...",
    "ESTABLISHING NEURAL LINK...",
    "SYSTEM READY."
  ];
  const container = document.getElementById('boot-lines');
  let i = 0;
  const lineInt = setInterval(() => {
    if (i < lines.length) {
      const div = document.createElement('div');
      div.textContent = lines[i];
      div.className = 'animate-in fade-in slide-in-from-left-2 duration-200';
      container.appendChild(div);
      i++;
    } else {
      clearInterval(lineInt);
      let p = 0;
      const bar = document.getElementById('boot-bar');
      const txt = document.getElementById('boot-percent');
      const progInt = setInterval(() => {
        p += 2;
        if (bar) bar.style.width = `${p}%`;
        if (txt) txt.textContent = `${p}%`;
        if (p >= 100) {
          clearInterval(progInt);
          setTimeout(() => {
            boot.style.display = 'none';
            onComplete();
          }, 500);
        }
      }, 30);
    }
  }, 400);
}