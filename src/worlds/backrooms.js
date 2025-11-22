// Backrooms Procedural Generation Module
import * as THREE from 'three';
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
export function createRoom(ix, iz, cellSize, playerHeight, wallMat, floorMat) {
  const group = new THREE.Group();
  group.position.set(ix * cellSize, 0, iz * cellSize);
  const roomColliders = [];
  const wallHeight = playerHeight * 3.0;
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
  // Outer Walls
  const wallThickness = 0.4;
  const wallGeoX = new THREE.BoxGeometry(cellSize, wallHeight, wallThickness);
  const wallGeoZ = new THREE.BoxGeometry(wallThickness, wallHeight, cellSize);
  const wallPositions = [
    { x: 0, y: wallHeight / 2, z: -cellSize / 2, geo: wallGeoX },
    { x: 0, y: wallHeight / 2, z: cellSize / 2, geo: wallGeoX },
    { x: -cellSize / 2, y: wallHeight / 2, z: 0, geo: wallGeoZ },
    { x: cellSize / 2, y: wallHeight / 2, z: 0, geo: wallGeoZ }
  ];
  wallPositions.forEach(pos => {
    const wall = new THREE.Mesh(pos.geo, wallMat);
    wall.position.set(pos.x, pos.y, pos.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  });
  // Inner Walls
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
    // Mock Door
    if (rng() < 0.3) {
        wall.name = 'door';
    }
    group.add(wall);
  }
  // Holes
  const holeCount = Math.floor(rng() * 2); // 0 or 1 hole mostly
  for (let h = 0; h < holeCount; h++) {
    const hx = (rng() - 0.5) * cellSize * 0.6;
    const hz = (rng() - 0.5) * cellSize * 0.6;
    const holeGeo = new THREE.BoxGeometry(1.5, 2.5, 1.5);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(hx, -1.25, hz);
    hole.name = 'hole';
    group.add(hole);
    // Invisible colliders around hole
    const holeSize = 1.5;
    const halfSize = holeSize / 2;
    const invGeo = new THREE.BoxGeometry(holeSize, wallHeight, 0.1);
    const invMat = new THREE.MeshBasicMaterial({ visible: false });
    const w1 = new THREE.Mesh(invGeo, invMat); w1.position.set(hx, wallHeight/2, hz - halfSize); group.add(w1);
    const w2 = new THREE.Mesh(invGeo, invMat); w2.position.set(hx, wallHeight/2, hz + halfSize); group.add(w2);
    const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallHeight, holeSize), invMat); w3.position.set(hx + halfSize, wallHeight/2, hz); group.add(w3);
    const w4 = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallHeight, holeSize), invMat); w4.position.set(hx - halfSize, wallHeight/2, hz); group.add(w4);
  }
  group.updateMatrixWorld(true);
  group.traverse(obj => {
    if (obj.isMesh && obj !== floor && obj !== ceil && obj.name !== 'hole') {
      if (obj.position.y > -1) {
        roomColliders.push(new THREE.Box3().setFromObject(obj));
      }
    }
  });
  return { group, colliders: roomColliders };
}