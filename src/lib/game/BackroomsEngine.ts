import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
// --- TYPES ---
type EngineParams = {
  onLockChange: (isLocked: boolean) => void;
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
  roomRadius: 3
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
  constructor(container: HTMLElement, params: EngineParams) {
    this.container = container;
    this.params = params;
    this.config = { ...DEFAULT_CONFIG };
    this.clock = new THREE.Clock();
  }
  public init() {
    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
    // 4. Controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.controls.getObject());
    // Event Listeners
    this.controls.addEventListener('lock', () => this.params.onLockChange(true));
    this.controls.addEventListener('unlock', () => this.params.onLockChange(false));
    // 5. Lights
    this.setupLights();
    // 6. Materials
    this.setupMaterials();
    // 7. Input & Resize
    this.setupInput();
    window.addEventListener('resize', this.onWindowResize);
    // 8. Initial Generation
    this.updateRooms();
    // 9. Start Loop
    this.start();
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
  private setupInput() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }
  private onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp': this.keyState.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keyState.back = true; break;
      case 'KeyA': case 'ArrowLeft': this.keyState.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keyState.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keyState.run = true; break;
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
  private onWindowResize = () => {
    if (!this.camera || !this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
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
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    // Clean up scenes
    this.activeRooms.forEach(({ group }) => {
      this.scene.remove(group);
      // Traverse and dispose geometries/materials
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    });
    this.activeRooms.clear();
    this.wallBoxes = [];
    if (this.floorMat) this.floorMat.dispose();
    if (this.wallMat) this.wallMat.dispose();
  }
  private start() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
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
    if (this.controls.isLocked) {
      this.updatePlayer(dt);
      this.updateRooms();
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
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const speed = this.keyState.run ? this.config.runSpeed : this.config.walkSpeed;
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
    // Check X Movement
    const testX = new THREE.Vector3(result.x, currentPos.y, currentPos.z);
    if (this.isColliding(testX)) {
      testX.x = currentPos.x; // Revert X if colliding
    }
    // Check Z Movement (using the safe X)
    const testXZ = new THREE.Vector3(testX.x, currentPos.y, result.z);
    if (this.isColliding(testXZ)) {
      testXZ.z = currentPos.z; // Revert Z if colliding
    }
    result.copy(testXZ);
    return result;
  }
  private isColliding(pos: THREE.Vector3): boolean {
    const radius = this.config.playerRadius;
    const tmpBox = new THREE.Box3();
    // Optimization: Only check nearby walls?
    // For now, brute force against all active wallBoxes is fine for low room count (9 rooms)
    // With 9 rooms * ~10 walls = 90 checks per frame. Negligible.
    for (let i = 0; i < this.wallBoxes.length; i++) {
      const box = this.wallBoxes[i];
      tmpBox.copy(box);
      // Expand wall box by player radius for simple circle-AABB check
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
                obj.geometry.dispose();
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
    const wallHeight = this.config.playerHeight * 3.0; // Higher ceilings for Backrooms feel
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
    // Outer Walls (Always generated to ensure no void peeking, though neighbors hide them)
    // Optimization: Could skip walls shared with existing neighbors, but complexity increases.
    const wallThickness = 0.4;
    const wallGeoX = new THREE.BoxGeometry(cs, wallHeight, wallThickness);
    const wallGeoZ = new THREE.BoxGeometry(wallThickness, wallHeight, cs);
    // Procedural Inner Walls
    const rng = mulberry32(ix * 928371 + iz * 1237);
    // Sometimes rooms are just open halls (low chance)
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
    this.activeRooms.set(key, { group, colliders: roomColliders });
  }
}