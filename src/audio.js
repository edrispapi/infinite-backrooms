// Audio Module
let ctx = null;
let masterGain = null;
let humOsc = null;
let humGain = null;
let footstepOsc = null;
let footstepGain = null;
let breathOsc = null;
let breathGain = null;
let enemyBus = null;
let deathOsc = null;
let deathGain = null;
const nodes = [];
export function initAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    ctx = new AudioContextClass();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    nodes.push(masterGain);
    // Hum
    humOsc = ctx.createOscillator();
    humOsc.type = 'sine';
    humGain = ctx.createGain();
    humOsc.connect(humGain);
    humGain.connect(masterGain);
    humOsc.start();
    nodes.push(humOsc, humGain);
    // Footsteps
    footstepOsc = ctx.createOscillator();
    footstepOsc.type = 'square';
    footstepGain = ctx.createGain();
    footstepGain.gain.value = 0;
    footstepOsc.connect(footstepGain);
    footstepGain.connect(masterGain);
    footstepOsc.start();
    nodes.push(footstepOsc, footstepGain);
    // Breath
    breathOsc = ctx.createOscillator();
    breathOsc.type = 'sawtooth';
    breathGain = ctx.createGain();
    breathGain.gain.value = 0;
    breathOsc.connect(breathGain);
    breathGain.connect(masterGain);
    breathOsc.start();
    nodes.push(breathOsc, breathGain);
    // Enemy
    enemyBus = ctx.createGain();
    enemyBus.gain.value = 0;
    enemyBus.connect(masterGain);
    nodes.push(enemyBus);
    // Death
    deathOsc = ctx.createOscillator();
    deathOsc.type = 'triangle';
    deathGain = ctx.createGain();
    deathGain.gain.value = 0;
    deathOsc.connect(deathGain);
    deathGain.connect(masterGain);
    deathOsc.start();
    nodes.push(deathOsc, deathGain);
  } catch (e) {
    console.warn('Audio init failed', e);
  }
}
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}
export function setVolume(vol) {
  if (masterGain) masterGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.1);
}
export function toggleMute() {
  if (!ctx) return;
  if (ctx.state === 'running') ctx.suspend();
  else ctx.resume();
}
export function setupLevelAudio(level) {
  if (!humOsc || !humGain) return;
  const isBackrooms = level === 'backrooms';
  humOsc.frequency.setTargetAtTime(isBackrooms ? 60 : 45, ctx.currentTime, 0.1);
  humGain.gain.setTargetAtTime(isBackrooms ? 0.08 : 0.05, ctx.currentTime, 0.1);
}
export function playFootstep(run) {
  if (!footstepOsc || !footstepGain) return;
  footstepOsc.frequency.setValueAtTime(110 + Math.random() * 40, ctx.currentTime);
  footstepGain.gain.cancelScheduledValues(ctx.currentTime);
  footstepGain.gain.setValueAtTime(0.15, ctx.currentTime);
  footstepGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
}
export function playBreath() {
  if (!breathOsc || !breathGain) return;
  breathOsc.frequency.setValueAtTime(30 + Math.random() * 20, ctx.currentTime);
  breathGain.gain.cancelScheduledValues(ctx.currentTime);
  breathGain.gain.setValueAtTime(0.1, ctx.currentTime);
  breathGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
}
export function updateEnemyNoise(dist) {
  if (!enemyBus) return;
  const gain = dist < 20 ? 0.35 * (1 - dist / 20) : 0;
  enemyBus.gain.setTargetAtTime(gain, ctx.currentTime, 0.5);
}
export function playDeath() {
  if (!deathOsc || !deathGain) return;
  deathOsc.frequency.setValueAtTime(80, ctx.currentTime);
  deathOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 2);
  deathGain.gain.cancelScheduledValues(ctx.currentTime);
  deathGain.gain.setValueAtTime(0.3, ctx.currentTime);
  deathGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3);
}