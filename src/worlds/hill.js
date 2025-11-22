// Hill World Module
import * as THREE from 'three';
export function setupHill(group) {
  const colliders = [];
  // Grass
  const grassGeo = new THREE.PlaneGeometry(400, 400);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2fae4f, roughness: 0.8 });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  group.add(grass);
  colliders.push(new THREE.Box3().setFromObject(grass));
  // Path
  const pathGeo = new THREE.PlaneGeometry(4, 200);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xf6f1d2, roughness: 0.9 });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 100);
  path.receiveShadow = true;
  group.add(path);
  colliders.push(new THREE.Box3().setFromObject(path));
  // Fences
  const postCount = 40;
  const postSpacing = 200 / postCount;
  const postGeo = new THREE.BoxGeometry(0.2, 1.4, 0.2);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.7 });
  const railGeo = new THREE.BoxGeometry(200, 0.12, 0.1);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.7 });
  for (let side = -1; side <= 1; side += 2) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(side * 3, 0.8, 100);
    rail.rotation.y = Math.PI / 2;
    rail.castShadow = true;
    group.add(rail);
    colliders.push(new THREE.Box3().setFromObject(rail));
    for (let i = 0; i < postCount; i++) {
      const post = new THREE.Mesh(postGeo, postMat);
      const z = (i * postSpacing) + (postSpacing / 2);
      const xOffset = Math.cos(i * 0.1) * 0.1;
      post.position.set(side * 3 + xOffset, 0.7, z);
      post.castShadow = true;
      group.add(post);
      colliders.push(new THREE.Box3().setFromObject(post));
    }
  }
  // House
  const houseGroup = new THREE.Group();
  houseGroup.position.set(0, 0, 145);
  const wallGeo = new THREE.BoxGeometry(8, 3, 8);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const houseBase = new THREE.Mesh(wallGeo, wallMat);
  houseBase.position.set(0, 1.5, 0);
  houseBase.castShadow = true;
  houseBase.receiveShadow = true;
  houseGroup.add(houseBase);
  colliders.push(new THREE.Box3().setFromObject(houseBase));
  const roofGeo = new THREE.ConeGeometry(6, 2, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 4.0, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);
  // Porch
  const porchGeo = new THREE.BoxGeometry(4, 1, 3);
  const porchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const porch = new THREE.Mesh(porchGeo, porchMat);
  porch.position.set(0, 0.5, -5.5);
  porch.castShadow = true;
  porch.receiveShadow = true;
  houseGroup.add(porch);
  // Need to update world matrix for porch collider since it's nested
  houseGroup.add(porch);
  group.add(houseGroup);
  group.updateMatrixWorld(true);
  colliders.push(new THREE.Box3().setFromObject(porch));
  return colliders;
}