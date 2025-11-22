import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
// --- TYPES ---
export enum WorldType {
  BACKROOMS = 'backrooms',
  HILL = 'hill'
}
type EngineParams = {
  onLockChange: (isLocked: boolean) => void;
  onSanityUpdate?: (sanity: number) => void;
  onStaminaUpdate?: (stamina: number) => void;
  onProximityUpdate?: (proximity: number) => void;
  onFPSUpdate?: (fps: number) => void;
  onQualityChange?: (quality: 'high' | 'low') => void;
  onVolumeChange?: (volume: number) => void;
  onMute?: () => void;
  onDeath?: () => void;
  onSensitivityChange?: (sens: number) => void;
  onLevelChange?: (level: WorldType) => void;
};
type GameConfig = {
  walkSpeed: number;
  runSpeed: number;
  playerHeight: number;
  playerRadius: number;
  fogColor: number;
  floorColor: number;
  wallColor: number;
  cellSize: number;
  roomRadius: number;
};
type EnemyType = 'stalker' | 'sprinter' | 'lurker';
interface Enemy {
  mesh: THREE.Mesh;
  type: EnemyType;
  detect: number;
  chase: number;
  walk: number;
  damageRadius: number;
  velocity: THREE.Vector3;
  wanderTimer: number;
  wanderDir: THREE.Vector3;
  burstActive: boolean;
}
const DEFAULT_CONFIG: GameConfig = {
  walkSpeed: 4.0,
  runSpeed: 7.0,
  playerHeight: 1.75,
  playerRadius: 0.6,
  fogColor: 0xd6c97b,
  floorColor: 0xd9cf7a,
  wallColor: 0xe1d890,
  cellSize: 14,
  roomRadius: 2
};
// Deterministic RNG (Mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Custom Noise Shader for VHS Static
const NoiseShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.02 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    varying vec2 vUv;
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float n = noise(vUv * 100.0 + time);
      color.rgb += (n - 0.5) * amount;
      gl_FragColor = color;
    }
  `
};
export class BackroomsEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: PointerLockControls;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private params: EngineParams;
  private config: GameConfig;
  // Post-Processing
  private composer?: EffectComposer;
  private vhsPasses: ShaderPass[] = [];
  // State
  private keyState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false
  };
  // World State
  private currentLevel: WorldType = WorldType.BACKROOMS;
  private worldGroup: THREE.Group | null = null;
  private activeRooms = new Map<string, { group: THREE.Group; colliders: THREE.Box3[] }>();
  private wallBoxes: THREE.Box3[] = [];
  private staticColliders: THREE.Box3[] = [];
  private hillLights: THREE.Light[] = [];
  private backroomsLights: THREE.Light[] = [];
  // Materials (Cached for performance)
  private floorMat!: THREE.MeshStandardMaterial;
  private wallMat!: THREE.MeshStandardMaterial;
  // Audio
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private humOscillator: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private footstepOsc: OscillatorNode | null = null;
  private footstepGain: GainNode | null = null;
  private breathingOsc: OscillatorNode | null = null;
  private breathingGain: GainNode | null = null;
  private enemyBus: GainNode | null = null;
  private deathOsc: OscillatorNode | null = null;
  private deathGain: GainNode | null = null;
  private audioNodes: { node: AudioNode, dispose?: () => void }[] = [];
  private baseVolume = 0.8;
  private lastFootstep = 0;
  private stepInterval = 0.48;
  private lastBreath = 0;
  private breathInterval = 3;
  // Gameplay Stats
  private sanity = { current: 100, max: 100 };
  private lastEmittedSanity = 100;
  private stamina = { current: 100, max: 100 };
  private lastEmittedStamina = 100;
  private quality: 'high' | 'low' = 'high';
  private fpsSamples: number[] = [];
  private lastFPSUpdate = 0;
  private isDead = false;
  private nearestDist = Infinity;
  // Enemies
  private enemies: Enemy[] = [];
  constructor(container: HTMLElement, params: EngineParams) {
    this.container = container;
    this.params = params;
    this.config = { ...DEFAULT_CONFIG };
    this.clock = new THREE.Clock();
  }
  public init() {
    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Mobile Optimization Check
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
      this.config.roomRadius = 1;
      this.renderer.setPixelRatio(1.0);
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
    if ('outputColorSpace' in this.renderer) {
      (this.renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    } else {
      (this.renderer as any).outputEncoding = THREE.sRGBEncoding;
    }
    this.container.appendChild(this.renderer.domElement);
    // 2. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.fogColor);
    this.scene.fog = new THREE.FogExp2(this.config.fogColor, 0.035);
    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
    this.camera.position.set(0, this.config.playerHeight, 0);
    // 4. Post-Processing
    this.setupPostProcessing();
    // 5. Controls with Cross-Browser Fallback
    this.controls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.controls.getObject());
    // Override lock to handle Safari/Mobile errors gracefully
    const origLock = this.controls.lock.bind(this.controls);
    this.controls.lock = () => {
      try {
        origLock();
      } catch (e) {
        console.warn('Pointer lock failed, retrying...', e);
        setTimeout(() => {
            try { origLock(); } catch (err) { console.error('Pointer lock retry failed', err); }
        }, 100);
      }
    };
    this.controls.addEventListener('lock', () => {
      this.params.onLockChange(true);
      this.resumeAudio();
    });
    this.controls.addEventListener('unlock', () => this.params.onLockChange(false));
    // 6. Materials
    this.setupMaterials();
    // 7. Input & Resize
    this.setupInput();
    window.addEventListener('resize', this.onWindowResize);
    // 8. Audio
    this.initAudio();
    // 9. Initial Level Setup (Defaults to Backrooms)
    this.setLevel(this.currentLevel);
    // 10. Start Loop
    this.start();
  }
  public setLevel(level: WorldType) {
    if (this.currentLevel === level && this.worldGroup) return; // Avoid redundant rebuilds if already set (unless forced reset)
    this.currentLevel = level;
    if (this.params.onLevelChange) this.params.onLevelChange(level);
    // Reset Player
    this.controls.getObject().position.set(0, this.config.playerHeight, 0);
    this.controls.getObject().rotation.set(0, 0, 0);
    // Dispose Old World
    this.disposeWorld();
    // Setup New World
    this.setupWorld();
    this.setupLights();
    this.setupAudioForLevel();
    this.setupEnemies();
    // Initial Update
    if (this.currentLevel === WorldType.BACKROOMS) {
      this.updateRooms();
    } else {
      this.wallBoxes = [...this.staticColliders];
    }
  }
  private setupWorld() {
    if (this.worldGroup) this.scene.remove(this.worldGroup);
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.staticColliders = [];
    if (this.currentLevel === WorldType.BACKROOMS) {
      // Backrooms uses procedural generation in updateRooms()
      // We just clear active rooms here
      this.activeRooms.clear();
    } else {
      // HILL Level Setup
      // 1. Grass
      const grassGeo = new THREE.PlaneGeometry(200, 200);
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 });
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.receiveShadow = true;
      this.worldGroup.add(grass);
      // 2. Dirt Path
      const pathPoints = [
        new THREE.Vector3(-50, 0, -50),
        new THREE.Vector3(-30, 0, -30),
        new THREE.Vector3(-10, 0, -10),
        new THREE.Vector3(10, 0, 10),
        new THREE.Vector3(30, 0, 30),
        new THREE.Vector3(50, 0, 50)
      ];
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const start = pathPoints[i];
        const end = pathPoints[i + 1];
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const length = start.distanceTo(end);
        const pathGeo = new THREE.BoxGeometry(3, 0.2, length);
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 1.0 });
        const pathBox = new THREE.Mesh(pathGeo, pathMat);
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        pathBox.position.copy(center);
        pathBox.lookAt(center.clone().add(dir));
        this.worldGroup.add(pathBox);
        // Add to colliders (low obstacle/ground)
        const box = new THREE.Box3().setFromObject(pathBox);
        this.staticColliders.push(box);
      }
      // 3. House
      const houseGroup = new THREE.Group();
      houseGroup.position.set(0, 0, 0);
      // Walls
      const wallGeo = new THREE.BoxGeometry(8, 3, 8);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
      const houseBase = new THREE.Mesh(wallGeo, wallMat);
      houseBase.position.set(0, 1.5, 0);
      houseBase.castShadow = true;
      houseBase.receiveShadow = true;
      houseGroup.add(houseBase);
      // Roof
      const roofGeo = new THREE.ConeGeometry(6, 2, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, 4.0, 0);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      houseGroup.add(roof);
      this.worldGroup.add(houseGroup);
      // House Collider
      const houseBox = new THREE.Box3().setFromObject(houseBase);
      this.staticColliders.push(houseBox);
      // 4. Fences
      const fenceGeo = new THREE.BoxGeometry(0.1, 2, 3);
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const dist = 15 + Math.random() * 20;
        const fx = Math.cos(angle) * dist;
        const fz = Math.sin(angle) * dist;
        const fence = new THREE.Mesh(fenceGeo, fenceMat);
        fence.position.set(fx, 1, fz);
        fence.rotation.y = Math.random() * Math.PI;
        fence.castShadow = true;
        this.worldGroup.add(fence);
        const box = new THREE.Box3().setFromObject(fence);
        this.staticColliders.push(box);
      }
    }
  }
  private disposeWorld() {
    // Dispose procedural rooms
    this.disposeRooms();
    // Dispose static world
    if (this.worldGroup) {
      this.worldGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      this.scene.remove(this.worldGroup);
      this.worldGroup = null;
    }
    this.staticColliders = [];
    this.wallBoxes = [];
  }
  private setupLights() {
    // Clear existing lights
    this.backroomsLights.forEach(l => this.scene.remove(l));
    this.hillLights.forEach(l => this.scene.remove(l));
    this.backroomsLights = [];
    this.hillLights = [];
    if (this.currentLevel === WorldType.BACKROOMS) {
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
      hemi.position.set(0, 20, 0);
      this.scene.add(hemi);
      this.backroomsLights.push(hemi);
      const amb = new THREE.AmbientLight(0xffffdd, 0.6);
      this.scene.add(amb);
      this.backroomsLights.push(amb);
      const dir = new THREE.DirectionalLight(0xfff9e5, 0.4);
      dir.position.set(10, 20, 5);
      this.scene.add(dir);
      this.backroomsLights.push(dir);
      this.scene.fog = new THREE.FogExp2(0xd6c97b, 0.035);
      this.scene.background = new THREE.Color(0xd6c97b);
    } else {
      const hemi = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.6);
      hemi.position.set(0, 20, 0);
      this.scene.add(hemi);
      this.hillLights.push(hemi);
      const sun = new THREE.DirectionalLight(0xFFD700, 0.8);
      sun.position.set(50, 50, 50);
      sun.castShadow = true;
      this.scene.add(sun);
      this.hillLights.push(sun);
      this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);
      this.scene.background = new THREE.Color(0x87CEEB);
    }
  }
  private setupAudioForLevel() {
    if (this.humOscillator && this.audioContext) {
      const freq = this.currentLevel === WorldType.BACKROOMS ? 60 : 45;
      this.humOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      const gain = this.currentLevel === WorldType.BACKROOMS ? 0.08 : 0.05;
      if (this.humGain) {
        this.humGain.gain.setValueAtTime(gain, this.audioContext.currentTime);
      }
    }
  }
  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    const rgbPass = new ShaderPass(RGBShiftShader);
    rgbPass.uniforms.amount.value = 0.0015;
    this.composer.addPass(rgbPass);
    this.vhsPasses.push(rgbPass);
    const noisePass = new ShaderPass(NoiseShader);
    noisePass.uniforms.amount.value = 0.03;
    this.composer.addPass(noisePass);
    this.vhsPasses.push(noisePass);
  }
  private setupMaterials() {
    this.floorMat = new THREE.MeshStandardMaterial({
      color: this.config.floorColor,
      roughness: 0.9,
      metalness: 0.0
    });
    this.wallMat = new THREE.MeshStandardMaterial({
      color: this.config.wallColor,
      roughness: 0.95,
      metalness: 0.0
    });
  }
  private setupEnemies() {
    // Clear existing if any
    this.enemies.forEach(e => {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      (e.mesh.material as THREE.Material).dispose();
    });
    this.enemies = [];
    const createEnemyMesh = (color: number) => {
      const geometry = new THREE.CapsuleGeometry(0.5, 2, 4, 8);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: 0x440000,
        roughness: 0.4
      });
      const mesh = new THREE.Mesh(geometry, material);
      const light = new THREE.PointLight(color, 0.5, 10);
      mesh.add(light);
      return mesh;
    };
    // Define positions based on level
    let stalkerPos, sprinterPos, lurkerPos;
    if (this.currentLevel === WorldType.BACKROOMS) {
      stalkerPos = new THREE.Vector3(8, 1.75, -10);
      sprinterPos = new THREE.Vector3(-12, 1.75, 6);
      lurkerPos = new THREE.Vector3(16, 1.75, 16);
    } else {
      // Hill positions (around house)
      stalkerPos = new THREE.Vector3(20, 1.75, 10);
      sprinterPos = new THREE.Vector3(-15, 1.75, -5);
      lurkerPos = new THREE.Vector3(0, 1.75, 25);
    }
    // 1. Stalker
    const stalker = createEnemyMesh(0xff0000);
    stalker.position.copy(stalkerPos);
    this.scene.add(stalker);
    this.enemies.push({
      mesh: stalker,
      type: 'stalker',
      detect: 18,
      chase: 5,
      walk: 3,
      damageRadius: 3,
      velocity: new THREE.Vector3(),
      wanderTimer: 0,
      wanderDir: new THREE.Vector3(),
      burstActive: false
    });
    // 2. Sprinter
    const sprinter = createEnemyMesh(0xff3300);
    sprinter.position.copy(sprinterPos);
    this.scene.add(sprinter);
    this.enemies.push({
      mesh: sprinter,
      type: 'sprinter',
      detect: 14,
      chase: 7.2,
      walk: 2.4,
      damageRadius: 3.2,
      velocity: new THREE.Vector3(),
      wanderTimer: 0,
      wanderDir: new THREE.Vector3(),
      burstActive: false
    });
    // 3. Lurker
    const lurker = createEnemyMesh(0x880000);
    lurker.position.copy(lurkerPos);
    this.scene.add(lurker);
    this.enemies.push({
      mesh: lurker,
      type: 'lurker',
      detect: 16,
      chase: 4.5,
      walk: 2,
      damageRadius: 3.4,
      velocity: new THREE.Vector3(),
      wanderTimer: 0,
      wanderDir: new THREE.Vector3(),
      burstActive: false
    });
  }
  private setupInput() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }
  private initAudio() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioContext = new AudioContextClass();
      // Master Gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(this.baseVolume, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
      this.audioNodes.push({ node: this.masterGain });
      // 1. Hum (Background)
      this.humOscillator = this.audioContext.createOscillator();
      this.humOscillator.type = 'sine';
      this.humGain = this.audioContext.createGain();
      this.humOscillator.connect(this.humGain);
      this.humGain.connect(this.masterGain);
      this.humOscillator.start();
      this.audioNodes.push({ node: this.humOscillator, dispose: () => this.humOscillator?.stop() });
      this.audioNodes.push({ node: this.humGain });
      // 2. Footsteps
      this.footstepOsc = this.audioContext.createOscillator();
      this.footstepOsc.type = 'square';
      this.footstepOsc.frequency.setValueAtTime(130, this.audioContext.currentTime);
      this.footstepGain = this.audioContext.createGain();
      this.footstepGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.footstepOsc.connect(this.footstepGain);
      this.footstepGain.connect(this.masterGain);
      this.footstepOsc.start();
      this.audioNodes.push({ node: this.footstepOsc, dispose: () => this.footstepOsc?.stop() });
      this.audioNodes.push({ node: this.footstepGain });
      // 3. Breathing
      this.breathingOsc = this.audioContext.createOscillator();
      this.breathingOsc.type = 'sawtooth';
      this.breathingOsc.frequency.setValueAtTime(40, this.audioContext.currentTime);
      this.breathingGain = this.audioContext.createGain();
      this.breathingGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.breathingOsc.connect(this.breathingGain);
      this.breathingGain.connect(this.masterGain);
      this.breathingOsc.start();
      this.audioNodes.push({ node: this.breathingOsc, dispose: () => this.breathingOsc?.stop() });
      this.audioNodes.push({ node: this.breathingGain });
      // 4. Enemy Bus
      this.enemyBus = this.audioContext.createGain();
      this.enemyBus.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.enemyBus.connect(this.masterGain);
      this.audioNodes.push({ node: this.enemyBus });
      // 5. Death Blast
      this.deathOsc = this.audioContext.createOscillator();
      this.deathOsc.type = 'triangle';
      this.deathOsc.frequency.setValueAtTime(50, this.audioContext.currentTime);
      this.deathGain = this.audioContext.createGain();
      this.deathGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.deathOsc.connect(this.deathGain);
      this.deathGain.connect(this.masterGain);
      this.deathOsc.start();
      this.audioNodes.push({ node: this.deathOsc, dispose: () => this.deathOsc?.stop() });
      this.audioNodes.push({ node: this.deathGain });
      if (this.audioContext.state === 'running') {
        this.audioContext.suspend();
      }
      // Setup initial audio params
      this.setupAudioForLevel();
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }
  public resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  public setVolume(volume: number) {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
    if (this.params.onVolumeChange) {
      this.params.onVolumeChange(volume);
    }
  }
  public setSensitivity(sens: number) {
    if (this.controls) {
      this.controls.pointerSpeed = sens;
    }
    if (this.params.onSensitivityChange) {
      this.params.onSensitivityChange(sens);
    }
  }
  public toggleMute() {
    if (this.audioContext) {
      if (this.audioContext.state === 'running') {
        this.audioContext.suspend();
      } else {
        this.audioContext.resume();
      }
      if (this.params.onMute) {
        this.params.onMute();
      }
    }
  }
  public toggleQuality() {
    this.quality = this.quality === 'high' ? 'low' : 'high';
    this.config.roomRadius = this.quality === 'high' ? 2 : 1;
    this.config.cellSize = this.quality === 'high' ? 14 : 16.8;
    // Mobile check again to ensure we don't override mobile constraints
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
        this.renderer.setPixelRatio(1.0);
    } else {
        this.renderer.setPixelRatio(this.quality === 'high' ? 1.5 : 1.0);
    }
    if (this.currentLevel === WorldType.BACKROOMS) {
      this.disposeRooms();
      this.updateRooms();
    }
    if (this.params.onQualityChange) {
      this.params.onQualityChange(this.quality);
    }
  }
  public reset() {
    this.isDead = false;
    this.sanity.current = 100;
    this.stamina.current = 100;
    this.nearestDist = Infinity;
    // Reset Level (rebuilds everything)
    this.setLevel(this.currentLevel);
    // Reset Audio
    this.resumeAudio();
    if (this.deathGain && this.audioContext) {
      this.deathGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    }
    // Emit updates
    if (this.params.onSanityUpdate) this.params.onSanityUpdate(100);
    if (this.params.onStaminaUpdate) this.params.onStaminaUpdate(100);
    if (this.params.onProximityUpdate) this.params.onProximityUpdate(0);
  }
  private onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp': this.keyState.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keyState.back = true; break;
      case 'KeyA': case 'ArrowLeft': this.keyState.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keyState.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keyState.run = true; break;
      case 'KeyQ': this.toggleQuality(); break;
    }
  };
  private onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp': this.keyState.forward = false; break;
      case 'KeyS': case 'ArrowDown': this.keyState.back = false; break;
      case 'KeyA': case 'ArrowLeft': this.keyState.left = false; break;
      case 'KeyD': case 'ArrowRight': this.keyState.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keyState.run = false; break;
    }
  };
  private disposeRooms() {
    this.activeRooms.forEach(({ group, colliders }) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
        }
      });
      this.scene.remove(group);
    });
    this.activeRooms.clear();
    // Only clear wallBoxes if we are in backrooms mode, otherwise we might clear static colliders
    if (this.currentLevel === WorldType.BACKROOMS) {
      this.wallBoxes = [];
    }
  }
  private onWindowResize = () => {
    if (!this.camera || !this.renderer || !this.composer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };
  public lock() {
    this.controls.lock();
  }
  public unlock() {
    this.controls.unlock();
  }
  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    if (this.composer) {
        this.vhsPasses.forEach(pass => pass.dispose());
        this.composer.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    this.enemies.forEach(e => {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      (e.mesh.material as THREE.Material).dispose();
    });
    this.disposeWorld();
    if (this.floorMat) this.floorMat.dispose();
    if (this.wallMat) this.wallMat.dispose();
    // Exhaustive Scene Cleanup
    this.scene.traverse((obj) => {
        if (obj instanceof THREE.Object3D && !obj.parent) {
            obj.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry && !child.geometry.disposed) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            obj.removeFromParent();
        }
    });
    // Clean up audio
    this.audioNodes.forEach(n => {
      if (n.dispose) n.dispose();
      try { n.node.disconnect(); } catch(e) { /* ignore */ }
    });
    this.audioNodes = [];
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
  private start() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      let dt = Math.min(this.clock.getDelta(), 0.1);
      // FPS Throttling for low-end devices
      if (this.fpsSamples.length > 5) {
          const avgFPS = this.fpsSamples.reduce((a,b) => a+b, 0) / this.fpsSamples.length;
          if (avgFPS < 30) {
              dt = Math.min(dt, 1/30);
          }
      }
      this.update(dt);
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }
  private stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  private update(dt: number) {
    this.vhsPasses.forEach(pass => {
        if (pass.uniforms.time) {
            pass.uniforms.time.value += dt;
        }
    });
    if (this.controls.isLocked && !this.isDead) {
      this.updatePlayer(dt);
      if (this.currentLevel === WorldType.BACKROOMS) {
        this.updateRooms();
      }
      this.updateEnemies(dt);
      this.updateStats(dt);
      this.updateAudio(dt);
    }
  }
  private updateEnemies(dt: number) {
    const playerPos = this.controls.getObject().position;
    let nearest = Infinity;
    this.enemies.forEach(enemy => {
      const dist = enemy.mesh.position.distanceTo(playerPos);
      if (dist < nearest) nearest = dist;
      // AI Logic
      if (dist < enemy.detect) {
        // Chase
        const direction = playerPos.clone().sub(enemy.mesh.position).normalize();
        // Sprinter Burst Logic
        if (enemy.type === 'sprinter' && dist < 0.4 * enemy.detect && !enemy.burstActive) {
          enemy.burstActive = true;
          enemy.chase *= 1.3;
          setTimeout(() => {
            enemy.burstActive = false;
            enemy.chase /= 1.3;
          }, 2000);
        }
        const speed = dist < 10 ? enemy.chase : enemy.walk;
        const targetVelocity = direction.multiplyScalar(speed);
        enemy.velocity.lerp(targetVelocity, 0.1);
        // Lurker Teleport Logic
        if (enemy.type === 'lurker' && Math.random() < 0.005 && enemy.wanderTimer <= 0) {
          // Teleport behind player
          const behind = playerPos.clone().add(direction.multiplyScalar(-8));
          enemy.mesh.position.copy(behind);
          enemy.wanderTimer = Math.random() * 2 + 1;
        }
        enemy.mesh.lookAt(playerPos.x, enemy.mesh.position.y, playerPos.z);
        enemy.mesh.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.05);
      } else {
        // Wander
        if (enemy.wanderTimer <= 0) {
          enemy.wanderDir.random().subScalar(0.5).normalize().multiplyScalar(enemy.walk);
          enemy.wanderDir.y = 0;
          enemy.wanderTimer = 2 + Math.random() * 3;
        }
        enemy.velocity.lerp(enemy.wanderDir, 0.05);
        enemy.wanderTimer -= dt;
        enemy.mesh.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.05);
      }
      // Apply movement
      const move = enemy.velocity.clone().multiplyScalar(dt);
      enemy.mesh.position.add(move);
      enemy.mesh.position.y = 1.75;
      // Death Check
      if (dist < enemy.damageRadius) {
        this.triggerDeath();
        return;
      }
    });
    this.nearestDist = nearest;
    // Global Proximity Update
    const proximity = Math.max(0, 1 - (nearest / 20));
    if (this.params.onProximityUpdate) {
      this.params.onProximityUpdate(proximity);
    }
  }
  private updateAudio(dt: number) {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    // 1. Footsteps
    const isMoving = this.keyState.forward || this.keyState.back || this.keyState.left || this.keyState.right;
    if (isMoving && this.footstepOsc && this.footstepGain) {
      if (performance.now() - this.lastFootstep > this.stepInterval * 1000) {
        this.footstepOsc.frequency.value = 110 + Math.random() * 40;
        this.footstepGain.gain.setValueAtTime(0.15, ctx.currentTime);
        this.footstepGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        this.lastFootstep = performance.now();
        this.stepInterval = this.keyState.run ? 0.32 : 0.48;
      }
    }
    // 2. Breathing
    const proximity = Math.max(0, 1 - (this.nearestDist / 20));
    if ((this.stamina.current < 30 || proximity > 0.5) && this.breathingOsc && this.breathingGain) {
      if (performance.now() - this.lastBreath > this.breathInterval * 1000) {
        this.breathingOsc.frequency.value = 30 + Math.random() * 20;
        this.breathingGain.gain.setValueAtTime(0.1, ctx.currentTime);
        this.breathingGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
        this.lastBreath = performance.now();
        this.breathInterval = 2.5 + Math.random() * 1.2;
      }
    }
    // 3. Enemy Noise
    if (this.enemyBus) {
      if (this.nearestDist < 20) {
        this.enemyBus.gain.linearRampToValueAtTime(0.35 * (1 - this.nearestDist / 20), ctx.currentTime + 0.5);
      } else {
        this.enemyBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      }
    }
  }
  private triggerDeath() {
    if (this.isDead) return;
    this.isDead = true;
    // Death Sound
    if (this.deathOsc && this.deathGain && this.audioContext) {
      const ctx = this.audioContext;
      this.deathOsc.frequency.setValueAtTime(80, ctx.currentTime);
      this.deathOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 2);
      this.deathGain.gain.setValueAtTime(0.3, ctx.currentTime);
      this.deathGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3);
    }
    if (this.params.onDeath) {
      this.params.onDeath();
    }
  }
  private updateStats(dt: number) {
    // Sanity (Natural Drain + Proximity)
    const proximity = Math.max(0, 1 - (this.nearestDist / 20));
    let drain = 0.1;
    if (proximity > 0.5) {
      drain += 50;
    }
    this.sanity.current = Math.max(0, this.sanity.current - (drain * dt));
    // Stamina
    this.updateStamina(dt);
    // FPS
    this.updateFPS(dt);
    // Emit Sanity
    if (Math.abs(this.sanity.current - this.lastEmittedSanity) > 0.5) {
        this.lastEmittedSanity = this.sanity.current;
        if (this.params.onSanityUpdate) {
          this.params.onSanityUpdate(Math.floor(this.sanity.current));
        }
    }
  }
  private updateStamina(dt: number) {
    const isRunning = this.keyState.run && this.stamina.current > 0;
    if (isRunning) {
      this.stamina.current = Math.max(0, this.stamina.current - (22 * dt));
    } else {
      this.stamina.current = Math.min(this.stamina.max, this.stamina.current + (14 * dt));
    }
    if (Math.abs(this.stamina.current - this.lastEmittedStamina) > 0.5) {
      this.lastEmittedStamina = this.stamina.current;
      if (this.params.onStaminaUpdate) {
        this.params.onStaminaUpdate(Math.floor(this.stamina.current));
      }
    }
  }
  private updateFPS(dt: number) {
    this.fpsSamples.push(1 / dt);
    if (this.fpsSamples.length > 10) this.fpsSamples.shift();
    const now = performance.now();
    if (now - this.lastFPSUpdate > 500) {
      const avgFPS = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      if (this.params.onFPSUpdate) {
        this.params.onFPSUpdate(Math.floor(avgFPS));
      }
      this.lastFPSUpdate = now;
    }
  }
  // --- GAMEPLAY LOGIC ---
  private updatePlayer(dt: number) {
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    if (this.keyState.forward) moveDir.add(forward);
    if (this.keyState.back) moveDir.sub(forward);
    if (this.keyState.left) moveDir.sub(right);
    if (this.keyState.right) moveDir.add(right);
    const canRun = this.keyState.run && this.stamina.current > 0;
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const speed = canRun ? this.config.runSpeed : this.config.walkSpeed;
      const deltaMove = moveDir.multiplyScalar(speed * dt);
      const playerPos = this.controls.getObject().position;
      const desiredPos = new THREE.Vector3(
        playerPos.x + deltaMove.x,
        this.config.playerHeight,
        playerPos.z + deltaMove.z
      );
      const resolved = this.resolveCollisions(playerPos, desiredPos);
      this.controls.getObject().position.copy(resolved);
    }
  }
  private resolveCollisions(currentPos: THREE.Vector3, desiredPos: THREE.Vector3): THREE.Vector3 {
    const result = desiredPos.clone();
    // X axis
    const testX = new THREE.Vector3(result.x, currentPos.y, currentPos.z);
    if (this.isColliding(testX)) {
      testX.x = currentPos.x;
    }
    // Z axis
    const testXZ = new THREE.Vector3(testX.x, currentPos.y, result.z);
    if (this.isColliding(testXZ)) {
      testXZ.z = currentPos.z;
    }
    result.copy(testXZ);
    return result;
  }
  private isColliding(pos: THREE.Vector3): boolean {
    const radius = this.config.playerRadius;
    const tmpBox = new THREE.Box3();
    for (let i = 0; i < this.wallBoxes.length; i++) {
      const box = this.wallBoxes[i];
      tmpBox.copy(box);
      tmpBox.min.addScalar(-radius);
      tmpBox.max.addScalar(radius);
      if (tmpBox.containsPoint(pos)) {
        return true;
      }
    }
    return false;
  }
  // --- ROOM GENERATION ---
  private worldToCell(coord: number): number {
    return Math.floor(coord / this.config.cellSize);
  }
  private getRoomKey(ix: number, iz: number): string {
    return `${ix},${iz}`;
  }
  private updateRooms() {
    const playerPos = this.controls.getObject().position;
    const cx = this.worldToCell(playerPos.x);
    const cz = this.worldToCell(playerPos.z);
    const needed = new Set<string>();
    for (let dz = -this.config.roomRadius; dz <= this.config.roomRadius; dz++) {
      for (let dx = -this.config.roomRadius; dx <= this.config.roomRadius; dx++) {
        const key = this.getRoomKey(cx + dx, cz + dz);
        needed.add(key);
        if (!this.activeRooms.has(key)) {
          this.createRoom(cx + dx, cz + dz);
        }
      }
    }
    for (const [key, value] of this.activeRooms) {
      if (!needed.has(key)) {
        const { group, colliders } = value;
        for (const box of colliders) {
          const idx = this.wallBoxes.indexOf(box);
          if (idx !== -1) this.wallBoxes.splice(idx, 1);
        }
        group.traverse((obj) => {
            if(obj instanceof THREE.Mesh) {
                if (obj.geometry) obj.geometry.dispose();
            }
        });
        this.scene.remove(group);
        this.activeRooms.delete(key);
      }
    }
  }
  private createRoom(ix: number, iz: number) {
    const key = this.getRoomKey(ix, iz);
    const group = new THREE.Group();
    group.position.set(ix * this.config.cellSize, 0, iz * this.config.cellSize);
    this.scene.add(group);
    const roomColliders: THREE.Box3[] = [];
    const cs = this.config.cellSize;
    const wallHeight = this.config.playerHeight * 3.0;
    // Floor
    const floorGeo = new THREE.PlaneGeometry(cs, cs);
    const floor = new THREE.Mesh(floorGeo, this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);
    // Ceiling
    const ceil = new THREE.Mesh(floorGeo, this.wallMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = wallHeight;
    group.add(ceil);
    // Outer Walls
    const wallThickness = 0.4;
    const wallGeoX = new THREE.BoxGeometry(cs, wallHeight, wallThickness);
    const wallGeoZ = new THREE.BoxGeometry(wallThickness, wallHeight, cs);
    const wallPositions = [
      { x: 0, y: wallHeight / 2, z: -cs / 2 }, // front
      { x: 0, y: wallHeight / 2, z: cs / 2 },  // back
      { x: -cs / 2, y: wallHeight / 2, z: 0 }, // left
      { x: cs / 2, y: wallHeight / 2, z: 0 }   // right
    ];
    for (let i = 0; i < wallPositions.length; i++) {
      const pos = wallPositions[i];
      const geo = (i < 2) ? wallGeoX : wallGeoZ;
      const wall = new THREE.Mesh(geo, this.wallMat);
      wall.position.set(pos.x, pos.y, pos.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
    // Procedural Inner Walls
    const rng = mulberry32(ix * 928371 + iz * 1237);
    const isHall = rng() > 0.8;
    const innerWallCount = isHall ? 1 : Math.floor(3 + rng() * 5);
    for (let i = 0; i < innerWallCount; i++) {
      const length = 3.0 + rng() * (cs * 0.5);
      const horizontal = rng() > 0.5;
      const geo = horizontal
        ? new THREE.BoxGeometry(length, wallHeight, wallThickness)
        : new THREE.BoxGeometry(wallThickness, wallHeight, length);
      const wall = new THREE.Mesh(geo, this.wallMat);
      const margin = cs * 0.4;
      const x = (rng() - 0.5) * (cs - margin);
      const z = (rng() - 0.5) * (cs - margin);
      wall.position.set(x, wallHeight/2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
    // Pillars
    const pillarCount = Math.floor(rng() * 4);
    const pillarGeo = new THREE.BoxGeometry(1, wallHeight, 1);
    for (let i = 0; i < pillarCount; i++) {
         const pillar = new THREE.Mesh(pillarGeo, this.wallMat);
         const x = (rng() - 0.5) * (cs * 0.8);
         const z = (rng() - 0.5) * (cs * 0.8);
         pillar.position.set(x, wallHeight/2, z);
         wall.castShadow = true;
         wall.receiveShadow = true;
         group.add(pillar);
    }
    // Floor Holes (Visual + Collision)
    const holeCount = 3 + Math.floor(rng() * 2);
    for (let h = 0; h < holeCount; h++) {
      const hx = (rng() - 0.5) * cs * 0.6;
      const hz = (rng() - 0.5) * cs * 0.6;
      const holeGeo = new THREE.BoxGeometry(1.5, 2.5, 1.5);
      const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(hx, -1.25, hz);
      group.add(hole);
      // Add invisible walls around the hole to prevent walking into it
      const holeSize = 1.5;
      const halfSize = holeSize / 2;
      const invisibleWallGeo = new THREE.BoxGeometry(holeSize, wallHeight, 0.1);
      const invisibleWallMat = new THREE.MeshBasicMaterial({ visible: false });
      // North
      const w1 = new THREE.Mesh(invisibleWallGeo, invisibleWallMat);
      w1.position.set(hx, wallHeight/2, hz - halfSize);
      group.add(w1);
      // South
      const w2 = new THREE.Mesh(invisibleWallGeo, invisibleWallMat);
      w2.position.set(hx, wallHeight/2, hz + halfSize);
      group.add(w2);
      // East
      const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallHeight, holeSize), invisibleWallMat);
      w3.position.set(hx + halfSize, wallHeight/2, hz);
      group.add(w3);
      // West
      const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallHeight, holeSize), invisibleWallMat);
      w4.position.set(hx - halfSize, wallHeight/2, hz);
      group.add(w4);
    }
    // Compute Colliders
    group.updateMatrixWorld(true);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== floor && obj !== ceil) {
        if (obj.position.y > -1) {
            const box = new THREE.Box3().setFromObject(obj);
            this.wallBoxes.push(box);
            roomColliders.push(box);
        }
      }
    });
    this.activeRooms.set(key, { group, colliders: roomColliders });
  }
}