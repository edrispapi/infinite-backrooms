import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
// --- TYPES ---
type EngineParams = {
  onLockChange: (isLocked: boolean) => void;
  onSanityUpdate?: (sanity: number) => void;
  onStaminaUpdate?: (stamina: number) => void;
  onProximityUpdate?: (proximity: number) => void;
  onFPSUpdate?: (fps: number) => void;
  onQualityChange?: (quality: 'high' | 'low') => void;
  onVolumeChange?: (volume: number) => void;
  onMute?: () => void;
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
  private activeRooms = new Map<string, { group: THREE.Group; colliders: THREE.Box3[] }>();
  private wallBoxes: THREE.Box3[] = [];
  // Materials (Cached for performance)
  private floorMat!: THREE.MeshStandardMaterial;
  private wallMat!: THREE.MeshStandardMaterial;
  // Audio
  private audioContext: AudioContext | null = null;
  private humOscillator: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private baseVolume = 0.05;
  // Gameplay Stats
  private sanity = { current: 100, max: 100 };
  private lastEmittedSanity = 100;
  private stamina = { current: 100, max: 100 };
  private lastEmittedStamina = 100;
  private quality: 'high' | 'low' = 'high';
  private fpsSamples: number[] = [];
  private lastFPSUpdate = 0;
  // Enemy
  private enemy?: THREE.Mesh;
  private enemyVelocity = new THREE.Vector3();
  private wanderTimer = 0;
  private wanderDir = new THREE.Vector3();
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    // Color space fix for modern three.js
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
    // 5. Controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.controls.getObject());
    // Event Listeners
    this.controls.addEventListener('lock', () => {
      this.params.onLockChange(true);
      this.resumeAudio();
    });
    this.controls.addEventListener('unlock', () => this.params.onLockChange(false));
    // 6. Lights
    this.setupLights();
    // 7. Materials
    this.setupMaterials();
    // 8. Input & Resize
    this.setupInput();
    window.addEventListener('resize', this.onWindowResize);
    // 9. Audio
    this.initAudio();
    // 10. Enemy
    this.setupEnemy();
    // 11. Initial Generation
    this.updateRooms();
    // 12. Start Loop
    this.start();
  }
  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    // Render Pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    // RGB Shift (Chromatic Aberration)
    const rgbPass = new ShaderPass(RGBShiftShader);
    rgbPass.uniforms.amount.value = 0.0015;
    this.composer.addPass(rgbPass);
    this.vhsPasses.push(rgbPass);
    // Noise Pass
    const noisePass = new ShaderPass(NoiseShader);
    noisePass.uniforms.amount.value = 0.03;
    this.composer.addPass(noisePass);
    this.vhsPasses.push(noisePass);
  }
  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    hemi.position.set(0, 20, 0);
    this.scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffdd, 0.6);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xfff9e5, 0.4);
    dir.position.set(10, 20, 5);
    this.scene.add(dir);
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
  private setupEnemy() {
    const geometry = new THREE.CapsuleGeometry(0.5, 2, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x440000,
      roughness: 0.4
    });
    this.enemy = new THREE.Mesh(geometry, material);
    this.enemy.position.set(6, 1.75, -6);
    // Enemy Glow
    const light = new THREE.PointLight(0xff0000, 0.5, 10);
    light.position.set(0, 0, 0);
    this.enemy.add(light);
    this.scene.add(this.enemy);
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
      // Create oscillator for the hum
      this.humOscillator = this.audioContext.createOscillator();
      this.humOscillator.type = 'sine';
      this.humOscillator.frequency.setValueAtTime(60, this.audioContext.currentTime); // 60Hz hum
      // Gain node for volume control
      this.humGain = this.audioContext.createGain();
      this.humGain.gain.setValueAtTime(this.baseVolume, this.audioContext.currentTime);
      // Connect
      this.humOscillator.connect(this.humGain);
      this.humGain.connect(this.audioContext.destination);
      // Start
      this.humOscillator.start();
      // Suspend initially until user interaction
      if (this.audioContext.state === 'running') {
        this.audioContext.suspend();
      }
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }
  private resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  public setVolume(volume: number) {
    if (this.humGain && this.audioContext) {
      // volume is 0-1
      this.humGain.gain.setValueAtTime(this.baseVolume * volume, this.audioContext.currentTime);
    }
    if (this.params.onVolumeChange) {
      this.params.onVolumeChange(volume);
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
    // Update config
    this.config.roomRadius = this.quality === 'high' ? 2 : 1;
    this.config.cellSize = this.quality === 'high' ? 14 : 16.8;
    this.renderer.setPixelRatio(this.quality === 'high' ? 1.5 : 1.0);
    // Dispose and regenerate
    this.disposeRooms();
    this.updateRooms();
    if (this.params.onQualityChange) {
      this.params.onQualityChange(this.quality);
    }
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
      // Remove colliders
      for (const box of colliders) {
        const idx = this.wallBoxes.indexOf(box);
        if (idx > -1) this.wallBoxes.splice(idx, 1);
      }
      // Dispose meshes
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
        }
      });
      this.scene.remove(group);
    });
    this.activeRooms.clear();
    this.wallBoxes = [];
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
    // Clean up enemy
    if (this.enemy) {
      this.scene.remove(this.enemy);
      this.enemy.geometry.dispose();
      this.enemy.material.dispose();
      this.enemy = undefined;
    }
    this.disposeRooms();
    if (this.floorMat) this.floorMat.dispose();
    if (this.wallMat) this.wallMat.dispose();
    // Clean up audio
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
  private start() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const dt = Math.min(this.clock.getDelta(), 0.1);
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
    // Update Shader Time
    this.vhsPasses.forEach(pass => {
        if (pass.uniforms.time) {
            pass.uniforms.time.value += dt;
        }
    });
    if (this.controls.isLocked) {
      this.updatePlayer(dt);
      this.updateRooms();
      this.updateStats(dt);
      this.updateEnemy(dt);
    }
  }
  private updateStats(dt: number) {
    // Sanity (Natural Drain)
    this.sanity.current = Math.max(0, this.sanity.current - (0.1 * dt));
    // Stamina
    this.updateStamina(dt);
    // FPS
    this.updateFPS(dt);
    // Emit Sanity if changed significantly
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
  private updateEnemy(dt: number) {
    if (!this.enemy || !this.controls.isLocked) return;
    const playerPos = this.controls.getObject().position;
    const dist = this.enemy.position.distanceTo(playerPos);
    // Proximity / Danger
    let proximity = 0;
    if (dist < 4) {
      proximity = 1 - (dist / 4); // 1 at dist=0, 0 at dist=4
    }
    if (this.params.onProximityUpdate) {
      this.params.onProximityUpdate(proximity);
    }
    // Sanity Drain from Proximity
    if (proximity > 0.5) {
        this.sanity.current = Math.max(0, this.sanity.current - (50 * dt));
    }
    // AI Logic
    const chaseSpeed = dist < 18 ? 5 : 0;
    if (chaseSpeed > 0) {
      // Chase
      const direction = playerPos.clone().sub(this.enemy.position).normalize();
      const targetVelocity = direction.multiplyScalar(chaseSpeed);
      this.enemyVelocity.lerp(targetVelocity, 0.1);
      this.enemy.lookAt(playerPos.x, this.enemy.position.y, playerPos.z);
      // Animate Scale (Breathing/Pulsing effect when chasing)
      this.enemy.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.05);
    } else {
      // Wander
      if (this.wanderTimer <= 0) {
        this.wanderDir.random().subScalar(0.5).normalize().multiplyScalar(3);
        this.wanderDir.y = 0; // Keep on ground plane
        this.wanderTimer = 2 + Math.random() * 3;
      }
      this.enemyVelocity.lerp(this.wanderDir, 0.05);
      this.wanderTimer -= dt;
      // Reset Scale
      this.enemy.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.05);
    }
    // Apply movement
    const move = this.enemyVelocity.clone().multiplyScalar(dt);
    this.enemy.position.add(move);
    // Keep enemy on floor (simple)
    this.enemy.position.y = 1.75;
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
    // Disable run if stamina depleted
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
    // Load nearby
    for (let dz = -this.config.roomRadius; dz <= this.config.roomRadius; dz++) {
      for (let dx = -this.config.roomRadius; dx <= this.config.roomRadius; dx++) {
        const key = this.getRoomKey(cx + dx, cz + dz);
        needed.add(key);
        if (!this.activeRooms.has(key)) {
          this.createRoom(cx + dx, cz + dz);
        }
      }
    }
    // Unload far
    for (const [key, value] of this.activeRooms) {
      if (!needed.has(key)) {
        const { group, colliders } = value;
        // Remove colliders from master list
        for (const box of colliders) {
          const idx = this.wallBoxes.indexOf(box);
          if (idx !== -1) this.wallBoxes.splice(idx, 1);
        }
        // Clean up ThreeJS objects
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
    // Compute Colliders
    group.updateMatrixWorld(true);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== floor && obj !== ceil) {
        const box = new THREE.Box3().setFromObject(obj);
        this.wallBoxes.push(box);
        roomColliders.push(box);
      }
    });
    activeRooms.set(key, { group, colliders: roomColliders });
  }
}