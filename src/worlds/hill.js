// Hill World Module
import * as THREE from 'three';
/**
 * Creates the Hill World
 * @param {THREE.Scene} scene
 * @param {THREE.Box3[]} wallBoxes
 * @param {Object} params
 * @param {function(Object): void} registerEntity
 */
export function createHillWorld(scene, wallBoxes, params, registerEntity) {
  const group = new THREE.Group();
  scene.add(group);
  let hillColliders = [];
  // Materials
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2fae4f, roughness: 0.8 });
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xf6f1d2, roughness: 0.9 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.7 });
  const houseWallMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const houseRoofMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const batteryMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x004400 });
  const medkitMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  // Helper to add mesh and collider
  const addMesh = (mesh) => {
    group.add(mesh);
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    hillColliders.push(box);
    wallBoxes.push(box);
  };
  // Grass (400x400)
  const grassGeo = new THREE.PlaneGeometry(400, 400);
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  addMesh(grass);
  // Path (4x200 at z=40)
  const pathGeo = new THREE.PlaneGeometry(4, 200);
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 40);
  path.receiveShadow = true;
  addMesh(path);
  // Fences
  const railGeo = new THREE.BoxGeometry(200, 0.12, 0.15);
  [-3, 3].forEach(x => {
    const rail = new THREE.Mesh(railGeo, fenceMat);
    rail.position.set(x, 0.8, 40);
    rail.rotation.y = Math.PI / 2;
    rail.castShadow = true;
    addMesh(rail);
  });
  // Posts (40 posts along path)
  const postGeo = new THREE.BoxGeometry(0.15, 1.4, 0.15);
  for (let i = 0; i < 40; i++) {
    const z = -60 + (i * 5) + 2.5;
    [-3, 3].forEach(sideX => {
        const post = new THREE.Mesh(postGeo, fenceMat);
        const wobble = Math.cos(i * 0.5) * 0.1;
        post.position.set(sideX + wobble, 0.7, z);
        post.castShadow = true;
        addMesh(post);
    });
  }
  // House Group
  const houseGroup = new THREE.Group();
  houseGroup.position.set(0, 0, 145);
  group.add(houseGroup);
  // House Base
  const baseGeo = new THREE.BoxGeometry(10, 5, 8);
  const base = new THREE.Mesh(baseGeo, houseWallMat);
  base.position.set(0, 2.5, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  houseGroup.add(base);
  // Roof
  const roofGeo = new THREE.ConeGeometry(6.5, 4, 4);
  const roof = new THREE.Mesh(roofGeo, houseRoofMat);
  roof.position.set(0, 6.5, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);
  // Porch
  const porchGeo = new THREE.BoxGeometry(4, 1, 3);
  const porch = new THREE.Mesh(porchGeo, houseWallMat);
  porch.position.set(0, 0.5, -5.5);
  porch.castShadow = true;
  porch.receiveShadow = true;
  houseGroup.add(porch);
  // House Colliders
  houseGroup.updateMatrixWorld(true);
  [base, roof, porch].forEach(mesh => {
      const box = new THREE.Box3().setFromObject(mesh);
      hillColliders.push(box);
      wallBoxes.push(box);
  });
  // Door
  const doorGeo = new THREE.BoxGeometry(2, 3.2, 0.1);
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 1.6, 140.9);
  door.name = 'toBackrooms';
  addMesh(door);
  registerEntity({
      type: 'door',
      kind: 'toBackrooms',
      mesh: door,
      prompt: 'ورود به Level 0 (E)',
      radius: 2.5
  });
  // Pickups
  // Battery
  const batGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16);
  const bat = new THREE.Mesh(batGeo, batteryMat);
  bat.position.set(1, 0.6, -10);
  bat.name = 'battery';
  group.add(bat);
  bat.updateMatrixWorld();
  registerEntity({
      type: 'pickup',
      kind: 'battery',
      mesh: bat,
      prompt: 'باتری چراغ‌قوه',
      radius: 2.5
  });
  // Medkit
  const medGeo = new THREE.BoxGeometry(0.8, 0.3, 0.6);
  const med = new THREE.Mesh(medGeo, medkitMat);
  med.position.set(-1, 0.4, 20);
  med.name = 'medkit';
  group.add(med);
  med.updateMatrixWorld();
  registerEntity({
      type: 'pickup',
      kind: 'medkit',
      mesh: med,
      prompt: 'کیت کمک‌های اولیه',
      radius: 2.5
  });
  return {
    group,
    dispose() {
      scene.remove(group);
      // Dispose geometries and materials
      group.traverse(o => {
        if (o.isMesh) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
            else o.material.dispose();
          }
        }
      });
      // Remove colliders from wallBoxes
      hillColliders.forEach(box => {
        const idx = wallBoxes.indexOf(box);
        if (idx > -1) wallBoxes.splice(idx, 1);
      });
      hillColliders = [];
    }
  };
}