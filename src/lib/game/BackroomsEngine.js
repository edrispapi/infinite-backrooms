// Core Engine Module (Vanilla JS)
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { initAudio, resumeAudio, setVolume, toggleMute, setupLevelAudio, playFootstep, playBreath, updateEnemyNoise, playDeath, disposeAudio } from '../../audio.js';
import { createBackroomsManager } from '../../worlds/backrooms.js';
import { createHillWorld } from '../../worlds/hill.js';
import { saveGame } from '../../settings.js';
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
export default class BackroomsEngine {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();
    this.config = {
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
    this.keyState = { forward: false, back: false, left: false, right: false, run: false };
    // Managers & Entities
    this.backroomsManager = null;
    this.hillManager = null;
    this.activeRooms = new Map(); // Legacy ref
    this.wallBoxes = [];
    this.staticColliders = [];
    this.enemies = [];
    /** @type {Array} */
    this.entities = []; // Interactive entities (pickups, doors)
    this.fpsSamples = [];
    // Game State
    this.sanity = 100;
    this.stamina = 100;
    this.isDead = false;
    this.currentLevel = 'backrooms';
    this.quality = 'high';
    this.disposed = false;
    // Audio State
    this.lastFootstep = 0;
    this.stepInterval = 0.48;
    this.lastBreath = 0;
    this.breathInterval = 3;
    this.nearestDist = Infinity;

    // Internal flags to avoid duplicate listeners/loops on re-init
    this._inputAttached = false;
    this._controlsEventsAttached = false;
    this._animating = false;

    // Attach input listeners once (bind once so they can be managed if needed)
    if (!this._inputAttached) {
      this._boundKeyDown = this.onKeyDown.bind(this);
      this._boundKeyUp = this.onKeyUp.bind(this);
      this._boundResize = this.onWindowResize.bind(this);
      document.addEventListener('keydown', this._boundKeyDown);
      document.addEventListener('keyup', this._boundKeyUp);
      window.addEventListener('resize', this._boundResize);
      this._inputAttached = true;
    }
  }
  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.fogColor);
    this.scene.fog = new THREE.FogExp2(this.config.fogColor, 0.035);
    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
    this.camera.position.set(0, this.config.playerHeight, 0);
    // Controls
    this.controls = new PointerLockControls(this.camera, document.body);
    /** @type {THREE.Object3D} */
    const controlObj = this.controls.getObject();
    this.scene.add(controlObj);
    if (!this._controlsEventsAttached) {
      this.controls.addEventListener('lock', () => {
        this.callbacks.onLockChange(true);
        if (typeof resumeAudio === 'function') {
          try { resumeAudio(); } catch (err) { console.warn('resumeAudio failed', err); }
        }
      });
      this.controls.addEventListener('unlock', () => {
        this.callbacks.onLockChange(false);
        if (!this.isDead) this.saveState();
      });
      this._controlsEventsAttached = true;
    }
    // Post Processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const rgbPass = new ShaderPass(RGBShiftShader);
    rgbPass.uniforms.amount.value = 0.0015;
    this.composer.addPass(rgbPass);
    this.vhsPass = rgbPass;
    const noisePass = new ShaderPass(NoiseShader);
    noisePass.uniforms.amount.value = 0.03;
    this.composer.addPass(noisePass);
    this.noisePass = noisePass;
    // Materials
    this.floorMat = new THREE.MeshStandardMaterial({ color: this.config.floorColor, roughness: 0.9 });
    this.wallMat = new THREE.MeshStandardMaterial({ color: this.config.wallColor, roughness: 0.95 });
    // Flashlight
    this.flashlight = new THREE.SpotLight(0xffffff, 2, 30, 0.5, 0.5, 1);
    this.flashlight.position.set(0, 0, 0);
    this.flashlight.target.position.set(0, 0, -1);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);
    this.flashlight.visible = false;
    // Interact Raycaster
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 10;
    // Audio
    initAudio();
    // Start Loop
      if (!this._animating) {
        this._animating = true;
        this.animate();
      }
  }
  lock() {
    if (this.controls && !this.controls.isLocked) {
      this.controls.lock();
    }
  }
  unlock() {
    if (this.controls && this.controls.isLocked) {
      this.controls.unlock();
    }
  }
  setLevel(level) {
    if (this.currentLevel === level && this.worldGroup) return;
    this.currentLevel = level;
    this.callbacks.onLevelChange(level);
    // Reset Player
    /** @type {THREE.Object3D} */
    const obj = this.controls.getObject();
    obj.position.set(0, this.config.playerHeight, 0);
    obj.rotation.set(0, 0, 0);
    this.disposeWorld();
    this.setupWorld();
    this.setupLights();
    this.setupEnemies();
    setupLevelAudio(level);
    // Auto-save on level switch
    this.saveState();
  }
  setupWorld() {
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.staticColliders = [];
    this.entities = []; // Clear entities on world setup
    if (this.currentLevel === 'backrooms') {
      // Initialize Backrooms Manager
      this.backroomsManager = createBackroomsManager(
        this.scene,
        this.wallBoxes,
        this.config,
        this.quality,
        (entity) => {
          this.entities.push(entity);
        }
      );
    } else if (this.currentLevel === 'hill') {
      // Clear backrooms manager if exists
      if (this.backroomsManager) {
        this.backroomsManager.dispose();
        this.backroomsManager = null;
      }
      this.hillManager = createHillWorld(
        this.scene,
        this.wallBoxes,
        this.config,
        (entity) => {
          /** @type {Object} */
          this.entities.push(entity);
        }
      );
    }
  }
  disposeWorld() {
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse(o => {
        /** @type {THREE.Mesh} */
        const mesh = o;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
          else mesh.material.dispose();
        }
      });
      this.worldGroup = null;
    }
    if (this.backroomsManager) {
      this.backroomsManager.dispose();
      this.backroomsManager = null;
    }
    if (this.hillManager) {
      this.hillManager.dispose();
      this.hillManager = null;
    }
    // Clear entities and filter out level-specific ones
    this.entities.forEach(e => {
      if (e.mesh) {
        this.scene.remove(e.mesh);
        if (e.mesh.geometry) e.mesh.geometry.dispose();
        if (e.mesh.material) {
          if (Array.isArray(e.mesh.material)) e.mesh.material.forEach(m => m.dispose());
          else e.mesh.material.dispose();
        }
      }
    });
    // Clear entities and colliders to avoid leaving references which may leak
    this.entities.length = 0;
    this.staticColliders = [];
    this.wallBoxes.length = 0;
  }
  dispose() {
    this.disposed = true;
    this.disposeWorld();
    disposeAudio();
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    this.callbacks.onFPSUpdate(0);
  }
  setupLights() {
    this.scene.children.filter(c => c.isLight && c !== this.flashlight).forEach(l => this.scene.remove(l));
    if (this.currentLevel === 'backrooms') {
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
      hemi.position.set(0, 20, 0);
      this.scene.add(hemi);
      this.scene.add(new THREE.AmbientLight(0xffffdd, 0.6));
      const dir = new THREE.DirectionalLight(0xfff9e5, 0.4);
      dir.position.set(10, 20, 5);
      this.scene.add(dir);
      this.scene.fog = new THREE.FogExp2(0xd6c97b, 0.035);
      this.scene.background = new THREE.Color(0xd6c97b);
    } else {
      const hemi = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.6);
      hemi.position.set(0, 20, 0);
      this.scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xFFD700, 0.8);
      sun.position.set(50, 50, 50);
      sun.castShadow = true;
      this.scene.add(sun);
      this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);
      this.scene.background = new THREE.Color(0x87CEEB);
    }
  }
  setupEnemies() {
    this.enemies.forEach(e => {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
    });
    this.enemies = [];
    const createEnemy = (color, pos, type, stats) => {
      const geo = new THREE.CapsuleGeometry(0.5, 2, 4, 8);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: 0x440000, roughness: 0.4 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.add(new THREE.PointLight(color, 0.5, 10));
      this.scene.add(mesh);
      this.enemies.push({ mesh, type, ...stats, velocity: new THREE.Vector3(), wanderTimer: 0, wanderDir: new THREE.Vector3() });
    };
    if (this.currentLevel === 'backrooms') {
      createEnemy(0xff0000, new THREE.Vector3(8, 1.75, -10), 'stalker', { detect: 18, chase: 5, walk: 3, damageRadius: 3 });
      createEnemy(0xff3300, new THREE.Vector3(-12, 1.75, 6), 'sprinter', { detect: 14, chase: 7.2, walk: 2.4, damageRadius: 3.2 });
      createEnemy(0x880000, new THREE.Vector3(16, 1.75, 16), 'lurker', { detect: 16, chase: 4.5, walk: 2, damageRadius: 3.4 });
    } else {
      createEnemy(0xff0000, new THREE.Vector3(20, 1.75, 10), 'stalker', { detect: 18, chase: 5, walk: 3, damageRadius: 3 });
    }
  }
  updateEnemies(dt) {
    /** @type {THREE.Object3D} */
    const obj = this.controls.getObject();
    const playerPos = obj.position;
    let nearest = Infinity;
    this.enemies.forEach(e => {
      const dist = e.mesh.position.distanceTo(playerPos);
      if (dist < nearest) nearest = dist;
      if (dist < e.detect) {
        const dir = playerPos.clone().sub(e.mesh.position).normalize();
        const speed = dist < 10 ? e.chase : e.walk;
        e.velocity.lerp(dir.multiplyScalar(speed), 0.1);
        e.mesh.lookAt(playerPos.x, e.mesh.position.y, playerPos.z);
      } else {
        if (e.wanderTimer <= 0) {
          e.wanderDir.random().subScalar(0.5).normalize().multiplyScalar(e.walk);
          e.wanderDir.y = 0;
          e.wanderTimer = 2 + Math.random() * 3;
        }
        e.velocity.lerp(e.wanderDir, 0.05);
        e.wanderTimer -= dt;
      }
      e.mesh.position.add(e.velocity.clone().multiplyScalar(dt));
      e.mesh.position.y = 1.75;
      if (dist < e.damageRadius) this.triggerDeath();
    });
    this.nearestDist = nearest;
    updateEnemyNoise(nearest);
    this.callbacks.onProximityUpdate(Math.max(0, 1 - nearest / 20));
  }
  updateStats(dt) {
    // Sanity
    const nd = Number.isFinite(this.nearestDist) ? this.nearestDist : 1000;
    const proximity = Math.max(0, 1 - nd / 20);
    let drain = 0.1;
    if (proximity > 0.5) drain += 50;
    const isIdle = !this.keyState.forward && !this.keyState.back && !this.keyState.left && !this.keyState.right;
    if (isIdle && !this.keyState.run) {
        this.sanity = Math.min(100, this.sanity + 5 * dt);
    } else {
        this.sanity = Math.max(0, this.sanity - drain * dt);
    }
    if (this.sanity <= 0) this.triggerDeath();
    this.callbacks.onSanityUpdate(this.sanity);
    if (this.sanity <= 30) console.warn('Sanity low:', this.sanity);
    // Stamina
    if (this.keyState.run && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - 22 * dt);
    } else {
      this.stamina = Math.min(100, this.stamina + 14 * dt);
    }
    this.callbacks.onStaminaUpdate(this.stamina);
    if (this.stamina <= 30) console.warn('Stamina low:', this.stamina);
  }
  updatePlayer(dt) {
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
      const speed = (this.keyState.run && this.stamina > 0) ? this.config.runSpeed : this.config.walkSpeed;
      const delta = moveDir.multiplyScalar(speed * dt);
      /** @type {THREE.Object3D} */
      const obj = this.controls.getObject();
      const pos = obj.position;
      const nextPos = pos.clone().add(delta);
      // Collision
      const radius = this.config.playerRadius;
      const box = new THREE.Box3();
      const checkCol = (p) => {
        for (const b of this.wallBoxes) {
          box.copy(b).expandByScalar(radius);
          if (box.containsPoint(p)) return true;
        }
        return false;
      };
      if (checkCol(new THREE.Vector3(nextPos.x, pos.y, pos.z))) nextPos.x = pos.x;
      if (checkCol(new THREE.Vector3(nextPos.x, pos.y, nextPos.z))) nextPos.z = pos.z;
      obj.position.copy(nextPos);
      // Footsteps
      if (performance.now() - this.lastFootstep > this.stepInterval * 1000) {
        playFootstep();
        this.lastFootstep = performance.now();
        this.stepInterval = this.keyState.run ? 0.32 : 0.48;
      }
    }
    // Breath
    if ((this.stamina < 30 || this.nearestDist < 10) && performance.now() - this.lastBreath > this.breathInterval * 1000) {
      playBreath();
      this.lastBreath = performance.now();
      this.breathInterval = 2.5 + Math.random() * 1.2;
    }
  }
  triggerDeath() {
    if (this.isDead) return;
    this.isDead = true;
    playDeath();
    this.callbacks.onDeath();
  }
  onKeyDown(e) {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': this.keyState.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keyState.back = true; break;
      case 'KeyA': case 'ArrowLeft': this.keyState.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keyState.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keyState.run = true; break;
      case 'KeyF': if (this.flashlight) this.flashlight.visible = !this.flashlight.visible; break;
      case 'KeyE': if (this.raycaster && this.camera) this.interact(); break;
    }
  }
  onKeyUp(e) {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp': this.keyState.forward = false; break;
      case 'KeyS': case 'ArrowDown': this.keyState.back = false; break;
      case 'KeyA': case 'ArrowLeft': this.keyState.left = false; break;
      case 'KeyD': case 'ArrowRight': this.keyState.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keyState.run = false; break;
    }
  }
  interact() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const object = hit.object;
      const dist = hit.distance;
      // Check Entities (Pickups & Doors)
      const entity = this.entities.find(e => e.mesh === object);
      if (entity && dist < entity.radius) {
        if (entity.type === 'door' && entity.kind === 'toBackrooms') {
          this.setLevel('backrooms');
          this.callbacks.onInteract('سوئیچ به Backrooms!');
          return;
        }
        if (entity.type === 'pickup') {
          if (entity.kind === 'battery') {
            this.flashlight.distance = Math.min(50, (this.flashlight.distance || 30) + 5);
            this.flashlight.intensity = Math.min(3, (this.flashlight.intensity || 2) + 0.5);
          } else if (entity.kind === 'medkit') {
            this.sanity = Math.min(100, this.sanity + 20);
            this.stamina = Math.min(100, this.stamina + 20);
            this.callbacks.onSanityUpdate(this.sanity);
            this.callbacks.onStaminaUpdate(this.stamina);
          }
          this.scene.remove(entity.mesh);
          if (entity.mesh.geometry) entity.mesh.geometry.dispose();
          if (entity.mesh.material) {
            if (Array.isArray(entity.mesh.material)) entity.mesh.material.forEach(m => m.dispose());
            else entity.mesh.material.dispose();
          }
          const idx = this.entities.indexOf(entity);
          if (idx > -1) this.entities.splice(idx, 1);
          this.callbacks.onInteract(entity.prompt);
          return;
        }
      }
      // Check Doors (Legacy Fallback)
      if (object.name === 'door' && dist < 3) {
        this.callbacks.onInteract('Door');
        object.rotation.y += Math.PI / 2;
      }
    }
  }
  onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }
  animate() {
    if (this.disposed) { this._animating = false; return; }
    requestAnimationFrame(this._boundAnimate || (this._boundAnimate = this.animate.bind(this)));
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.noisePass) this.noisePass.uniforms.time.value += dt;
    if (this.controls.isLocked && !this.isDead) {
      this.updatePlayer(dt);
      // Update Backrooms Manager
      if (this.backroomsManager) {
        /** @type {THREE.Object3D} */
        const obj = this.controls.getObject();
        this.backroomsManager.update(dt, obj.position);
      }
      this.updateEnemies(dt);
      this.updateStats(dt);
    }
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    // FPS
    this.fpsSamples.push(1/dt);
    if (this.fpsSamples.length > 20) {
        const updateFPS = () => {
            const avg = this.fpsSamples.reduce((a,b)=>a+b,0) / this.fpsSamples.length;
            this.callbacks.onFPSUpdate(Math.floor(avg));
            this.fpsSamples.shift();
        };
        if (window.requestIdleCallback) {
            requestIdleCallback(updateFPS);
        } else {
            updateFPS();
        }
    }
  }
  saveState() {
    /** @type {THREE.Object3D} */
    const obj = this.controls.getObject();
    const pos = obj.position;
    const rot = obj.rotation;
    saveGame({
      pos: { x: pos.x, y: pos.y, z: pos.z },
      rot: { x: rot.x, y: rot.y, z: rot.z },
      sanity: this.sanity,
      stamina: this.stamina,
      level: this.currentLevel
    });
  }
  loadState(state) {
    /** @type {THREE.Object3D} */
    const obj = this.controls.getObject();
    if (state.pos) obj.position.set(state.pos.x, state.pos.y, state.pos.z);
    if (state.rot) obj.rotation.set(state.rot.x, state.rot.y, state.rot.z);
    if (state.sanity) this.sanity = state.sanity;
    if (state.stamina) this.stamina = state.stamina;
    if (state.level) this.setLevel(state.level);
  }
  reset() {
    this.isDead = false;
    this.sanity = 100;
    this.stamina = 100;
    this.nearestDist = Infinity;
    this.setLevel(this.currentLevel);
    if (typeof resumeAudio === 'function') {
      try { resumeAudio(); } catch (err) { console.warn('resumeAudio failed', err); }
    }
  }
}