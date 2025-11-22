// Backrooms Procedural Manager Module
import * as THREE from 'three';
/**
 * Deterministic RNG
 * @param {number} a 
 */
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
/**
 * Creates the Backrooms Level Manager
 * @param {THREE.Scene} scene 
 * @param {THREE.Box3[]} wallBoxes 
 * @param {Object} params 
 * @param {string} quality 
 * @param {Function} registerEntity 
 */
export function createBackroomsManager(scene, wallBoxes, params, quality, registerEntity) {
  const activeRooms = new Map();
  const cellSize = quality === 'high' ? 14 : 16.8;
  const roomRadius = quality === 'high' ? 2 : 1;
  // Materials
  const floorMat = new THREE.MeshStandardMaterial({ color: params.floorColor, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: params.wallColor, roughness: 0.95 });
  // Emissive pit material (black hole)
  const holeMat = new THREE.MeshStandardMaterial({ 
    color: 0x000000, 
    roughness: 1.0,
    emissive: 0x000000,
    emissiveIntensity: 0.1 
  });
  /**
   * Spawns interactive notes in the starting area
   */
  function spawnNotes() {
    const count = 3 + Math.floor(Math.random() * 3); // 3 to 5 notes
    for (let i = 0; i < count; i++) {
      // Random position within the initial loaded area
      const ix = Math.floor((Math.random() - 0.5) * roomRadius * 2);
      const iz = Math.floor((Math.random() - 0.5) * roomRadius * 2);
      const offsetRange = cellSize * 0.4;
      const x = (ix * cellSize) + (Math.random() - 0.5) * offsetRange * 2;
      const z = (iz * cellSize) + (Math.random() - 0.5) * offsetRange * 2;
      const geo = new THREE.PlaneGeometry(0.6, 0.8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1.5, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.x = (Math.random() - 0.5) * 0.5; // Random tilt
      scene.add(mesh);
      registerEntity({
        type: 'pickup',
        kind: 'note',
        mesh: mesh,
        prompt: `یادداشت ${i + 1}`,
        radius: 2.5 // Interaction radius
      });
    }
  }
  /**
   * Creates a single room chunk
   * @param {number} ix 
   * @param {number} iz 
   */
  function createRoom(ix, iz) {
    const key = `${ix},${iz}`;
    if (activeRooms.has(key)) return;
    const group = new THREE.Group();
    group.position.set(ix * cellSize, 0, iz * cellSize);
    scene.add(group);
    const roomColliders = [];
    const wallHeight = params.playerHeight * 3.0;
    // Floor
    const floorGeo = new THREE.PlaneGeometry(cellSize, cellSize);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);
    // Ceiling
    const ceil = new THREE.Mesh(floorGeo, wallMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = wallHeight;
    group.add(ceil);
    // Outer Walls (Visual + Collider)
    const wallThickness = 0.4;
    const wallGeoX = new THREE.BoxGeometry(cellSize, wallHeight, wallThickness);
    const wallGeoZ = new THREE.BoxGeometry(wallThickness, wallHeight, cellSize);
    const wallPositions = [
      { x: 0, y: wallHeight / 2, z: -cellSize / 2, geo: wallGeoX }, // Front
      { x: 0, y: wallHeight / 2, z: cellSize / 2, geo: wallGeoX },  // Back
      { x: -cellSize / 2, y: wallHeight / 2, z: 0, geo: wallGeoZ }, // Left
      { x: cellSize / 2, y: wallHeight / 2, z: 0, geo: wallGeoZ }   // Right
    ];
    wallPositions.forEach(pos => {
      const wall = new THREE.Mesh(pos.geo, wallMat);
      wall.position.set(pos.x, pos.y, pos.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    });
    // Inner Walls (Procedural)
    const rng = mulberry32(ix * 928371 + iz * 1237);
    const isHall = rng() > 0.8;
    const innerWallCount = isHall ? 1 : Math.floor(3 + rng() * 5);
    for (let i = 0; i < innerWallCount; i++) {
      const length = 3.0 + rng() * (cellSize * 0.5);
      const horizontal = rng() > 0.5;
      const geo = horizontal
        ? new THREE.BoxGeometry(length, wallHeight, wallThickness)
        : new THREE.BoxGeometry(wallThickness, wallHeight, length);
      const wall = new THREE.Mesh(geo, wallMat);
      const margin = cellSize * 0.4;
      const x = (rng() - 0.5) * (cellSize - margin);
      const z = (rng() - 0.5) * (cellSize - margin);
      wall.position.set(x, wallHeight / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      // Chance for a "door" (just a named wall for interaction)
      if (rng() < 0.3) {
        wall.name = 'door';
      }
      group.add(wall);
    }
    // Holes (Pits)
    const holeCount = Math.floor(rng() * 2); // 0 or 1
    for (let h = 0; h < holeCount; h++) {
      const hx = (rng() - 0.5) * cellSize * 0.6;
      const hz = (rng() - 0.5) * cellSize * 0.6;
      // Visual Pit
      const holeGeo = new THREE.BoxGeometry(1.5, 2.5, 1.5);
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(hx, -1.25, hz);
      hole.name = 'hole';
      group.add(hole);
      // Invisible Colliders around hole to prevent falling (gameplay simplification)
      const holeSize = 1.5;
      const halfSize = holeSize / 2;
      const invGeo = new THREE.BoxGeometry(holeSize, wallHeight, 0.1);
      const invMat = new THREE.MeshBasicMaterial({ visible: false });
      // 4 walls around the pit
      const w1 = new THREE.Mesh(invGeo, invMat); w1.position.set(hx, wallHeight/2, hz - halfSize); group.add(w1);
      const w2 = new THREE.Mesh(invGeo, invMat); w2.position.set(hx, wallHeight/2, hz + halfSize); group.add(w2);
      const invGeoZ = new THREE.BoxGeometry(0.1, wallHeight, holeSize);
      const w3 = new THREE.Mesh(invGeoZ, invMat); w3.position.set(hx + halfSize, wallHeight/2, hz); group.add(w3);
      const w4 = new THREE.Mesh(invGeoZ, invMat); w4.position.set(hx - halfSize, wallHeight/2, hz); group.add(w4);
    }
    // Compute Colliders
    group.updateMatrixWorld(true);
    group.traverse(obj => {
      if (obj.isMesh && obj !== floor && obj !== ceil && obj.name !== 'hole') {
        // Only add colliders for walls/obstacles above ground
        if (obj.position.y > -1) {
          const box = new THREE.Box3().setFromObject(obj);
          roomColliders.push(box);
          wallBoxes.push(box);
        }
      }
    });
    activeRooms.set(key, { group, colliders: roomColliders });
  }
  // Initialize
  spawnNotes();
  return {
    /**
     * Updates room loading based on player position
     * @param {number} dt 
     * @param {THREE.Vector3} playerPos 
     */
    update(dt, playerPos) {
      const cx = Math.floor(playerPos.x / cellSize);
      const cz = Math.floor(playerPos.z / cellSize);
      const needed = new Set();
      // Load needed rooms
      for (let dz = -roomRadius; dz <= roomRadius; dz++) {
        for (let dx = -roomRadius; dx <= roomRadius; dx++) {
          const key = `${cx + dx},${cz + dz}`;
          needed.add(key);
          createRoom(cx + dx, cz + dz);
        }
      }
      // Unload distant rooms
      for (const [key, room] of activeRooms) {
        if (!needed.has(key)) {
          scene.remove(room.group);
          // Dispose geometries
          room.group.traverse(o => {
            if (o.isMesh) {
              if (o.geometry) o.geometry.dispose();
              if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
                else o.material.dispose();
              }
            }
          });
          // Remove colliders
          room.colliders.forEach(c => {
            const idx = wallBoxes.indexOf(c);
            if (idx > -1) wallBoxes.splice(idx, 1);
          });
          activeRooms.delete(key);
        }
      }
    },
    /**
     * Cleans up all resources
     */
    dispose() {
      for (const room of activeRooms.values()) {
        scene.remove(room.group);
        room.group.traverse(o => {
          if (o.isMesh) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
              if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
              else o.material.dispose();
            }
          }
        });
      }
      activeRooms.clear();
    }
  };
}