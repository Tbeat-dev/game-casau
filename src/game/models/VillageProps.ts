import * as THREE from 'three';
import type { MaterialLibrary } from '../../assets/MaterialLibrary';

export function createWoodCanvasTexture(baseHex = '#6e4528', grainHex = '#4a2c17'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = grainHex;
  for (let i = 0; i < 42; i++) {
    ctx.lineWidth = 1 + (i % 3);
    const y = (i * 6.2) % 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + ((i % 2) * 4 - 2), 170, y - ((i % 2) * 4 - 2), 256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRoofTileTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9b3324';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 8;
  const rw = 256 / cols;
  const rh = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * rw + (r % 2) * (rw * 0.5);
      const y = r * rh;
      ctx.fillStyle = (r + col) % 2 === 0 ? '#a93a29' : '#8a2a1d';
      ctx.beginPath();
      ctx.arc(x % 256, y + rh * 0.5, rw * 0.48, 0, Math.PI, false);
      ctx.fill();
      ctx.strokeStyle = '#5e1a11';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * Composite 10-part Stylized Vietnamese Đình Làng (Village Communal House).
 */
export function buildDinhLang(matLib?: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'prop_temple_dinh';

  const stoneMat = matLib
    ? matLib.createMaterial('tex.rock.shore', { worldWidth: 10.5, worldHeight: 7.8, roughness: 0.9 })
    : new THREE.MeshStandardMaterial({ color: 0xa69d8e, roughness: 0.88, metalness: 0.04 });
  const brickMat = matLib
    ? matLib.createMaterial('tex.brick.red', { worldWidth: 10.5, worldHeight: 3.5, roughness: 0.82 })
    : new THREE.MeshStandardMaterial({ color: 0xa84432, roughness: 0.82 });
  const lacquerMat = new THREE.MeshStandardMaterial({ color: 0x9b221b, roughness: 0.35, metalness: 0.12 });
  const darkWoodMat = matLib
    ? matLib.createMaterial('tex.wood.plank_new', { worldWidth: 8.6, worldHeight: 3.4, roughness: 0.76 })
    : new THREE.MeshStandardMaterial({ color: 0xffffff, map: createWoodCanvasTexture('#5b3a24', '#382213'), roughness: 0.72, metalness: 0.05 });
  const roofMat = matLib
    ? matLib.createMaterial('tex.roof.tile', { repeatX: 4, repeatY: 3, roughness: 0.65 })
    : new THREE.MeshStandardMaterial({ color: 0xffffff, map: createRoofTileTexture(), roughness: 0.65, metalness: 0.06 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe0a526, roughness: 0.28, metalness: 0.75 });

  // 1. Terracotta brick + stone tiered plinth + front steps
  const base = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.7, 7.8), brickMat);
  base.position.y = 0.35;
  base.receiveShadow = true;
  base.castShadow = true;
  g.add(base);

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 1.2), stoneMat);
  step1.position.set(0, 0.175, 4.4);
  step1.receiveShadow = true;
  g.add(step1);

  // 2. Red lacquered pillars (6 pillars)
  const pillarGeo = new THREE.CylinderGeometry(0.24, 0.27, 3.6, 12);
  const pillarPositions: [number, number][] = [
    [-4.1, 3.1], [0, 3.1], [4.1, 3.1],
    [-4.1, -3.1], [0, -3.1], [4.1, -3.1],
  ];
  for (const [px, pz] of pillarPositions) {
    const p = new THREE.Mesh(pillarGeo, lacquerMat);
    p.position.set(px, 2.5, pz);
    p.castShadow = true;
    g.add(p);

    const stoneFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.25, 10), stoneMat);
    stoneFoot.position.set(px, 0.82, pz);
    g.add(stoneFoot);
  }

  // 3. Back wooden wall & beams
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.6, 3.4, 0.35), darkWoodMat);
  backWall.position.set(0, 2.4, -3.1);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  g.add(backWall);

  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.35, 6.8), darkWoodMat);
  crossBeam.position.set(0, 4.25, 0);
  g.add(crossBeam);

  // 4. Two-tier curved Vietnamese mái ngói roof
  const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.2, 4), roofMat);
  lowerRoof.rotation.y = Math.PI / 4;
  lowerRoof.scale.set(1.25, 1, 0.92);
  lowerRoof.position.set(0, 5.2, 0);
  lowerRoof.castShadow = true;
  g.add(lowerRoof);

  const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.8, 4), roofMat);
  upperRoof.rotation.y = Math.PI / 4;
  upperRoof.scale.set(1.25, 1, 0.9);
  upperRoof.position.set(0, 6.3, 0);
  upperRoof.castShadow = true;
  g.add(upperRoof);

  // 5. Curved eaves finials (Đầu đao mái đình) + Gold ridge ornament
  const finialGeo = new THREE.ConeGeometry(0.18, 0.9, 6);
  const corners: [number, number, number][] = [
    [-5.3, 4.65, 3.9], [5.3, 4.65, 3.9],
    [-5.3, 4.65, -3.9], [5.3, 4.65, -3.9],
  ];
  for (const [cx, cy, cz] of corners) {
    const f = new THREE.Mesh(finialGeo, goldMat);
    f.position.set(cx, cy, cz);
    f.rotation.z = cx > 0 ? -0.5 : 0.5;
    f.rotation.x = cz > 0 ? 0.45 : -0.45;
    g.add(f);
  }

  // 6. Golden Hoành Phi plaque over front beam
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 0.16), lacquerMat);
  plaque.position.set(0, 3.85, 3.25);
  g.add(plaque);
  const plaqueRim = new THREE.Mesh(new THREE.BoxGeometry(3.38, 0.86, 0.12), goldMat);
  plaqueRim.position.set(0, 3.85, 3.2);
  g.add(plaqueRim);

  // 7. Festival drum on stand inside Đình
  const drumStand = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.8), darkWoodMat);
  drumStand.position.set(-2.2, 1.02, 1.2);
  g.add(drumStand);
  const drumBody = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.85, 14), lacquerMat);
  drumBody.rotation.z = Math.PI / 2;
  drumBody.position.set(-2.2, 1.48, 1.2);
  g.add(drumBody);

  return g;
}

/**
 * Composite 6-part Vietnamese Wooden Bridge across water.
 * Uses weathered planks (`tex.wood.plank_old`) and damp mossy planks (`tex.wood.plank_mossy`) near center/waterline.
 */
export function buildWoodenBridge(length: number, width: number, matLib?: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'prop_wooden_bridge';
  const plankMat = matLib
    ? matLib.createMaterial('tex.wood.plank_old', { worldWidth: width, worldHeight: 0.6, roughness: 0.84 })
    : new THREE.MeshStandardMaterial({ color: 0xffffff, map: createWoodCanvasTexture('#784c2b', '#4d2e17'), roughness: 0.78 });
  const mossyPlankMat = matLib
    ? matLib.createMaterial('tex.wood.plank_mossy', { worldWidth: width, worldHeight: 0.6, roughness: 0.34 })
    : new THREE.MeshStandardMaterial({ color: 0x455c32, roughness: 0.35 });
  const postMat = matLib
    ? matLib.createMaterial('tex.wood.plank_old', { repeatX: 0.5, repeatY: 2, roughness: 0.86 })
    : new THREE.MeshStandardMaterial({ color: 0x4b2f1b, roughness: 0.82 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.9 });

  // Stringers
  const beamGeo = new THREE.BoxGeometry(0.18, 0.22, length);
  for (const sx of [-width * 0.42, width * 0.42]) {
    const beam = new THREE.Mesh(beamGeo, postMat);
    beam.position.set(sx, -0.08, 0);
    beam.castShadow = true;
    g.add(beam);
  }

  // Planks (center water-spray planks are visibly damp & mossy)
  const plankCount = Math.max(4, Math.floor(length / 0.55));
  const plankGeo = new THREE.BoxGeometry(width, 0.1, 0.42);
  for (let i = 0; i < plankCount; i++) {
    const z = -length / 2 + (i + 0.5) * (length / plankCount);
    const nearMid = Math.abs(z) < length * 0.22 && i % 2 === 0;
    const p = new THREE.Mesh(plankGeo, nearMid ? mossyPlankMat : plankMat);
    p.position.set(0, 0.05, z);
    p.receiveShadow = true;
    p.castShadow = true;
    g.add(p);
  }

  // Bamboo posts & side rope rails
  const postCount = Math.max(3, Math.floor(length / 2.2));
  const postGeo = new THREE.CylinderGeometry(0.07, 0.08, 1.15, 8);
  for (let i = 0; i < postCount; i++) {
    const z = -length / 2 + 0.3 + i * ((length - 0.6) / Math.max(1, postCount - 1));
    for (const sx of [-width * 0.48, width * 0.48]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(sx, 0.42, z);
      post.castShadow = true;
      g.add(post);
    }
  }

  const railGeo = new THREE.CylinderGeometry(0.032, 0.032, length, 6);
  railGeo.rotateX(Math.PI / 2);
  for (const sx of [-width * 0.48, width * 0.48]) {
    const rail = new THREE.Mesh(railGeo, ropeMat);
    rail.position.set(sx, 0.88, 0);
    g.add(rail);
  }

  return g;
}

/**
 * Composite 5-part Floating Bamboo Platform (Bục nổi) with fresh planks (`tex.wood.plank_new`) & bamboo logs (`tex.bamboo.stalk`).
 */
export function buildFloatingPlatform(radius: number, matLib?: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'prop_floating_platform';

  const bambooMat = matLib
    ? matLib.createMaterial('tex.bamboo.stalk', { repeatX: 1, repeatY: 3, roughness: 0.56 })
    : new THREE.MeshStandardMaterial({ color: 0x8ea352, roughness: 0.62 });
  const darkWoodMat = matLib
    ? matLib.createMaterial('tex.wood.plank_new', { worldWidth: radius * 2, worldHeight: radius * 2, roughness: 0.74 })
    : new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.78 });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xe0a526,
    emissive: 0xe0a526,
    emissiveIntensity: 0.42,
    roughness: 0.35,
  });

  // Base buoyant logs
  const logCount = 7;
  const logGeo = new THREE.CylinderGeometry(0.24, 0.24, radius * 1.85, 8);
  logGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < logCount; i++) {
    const z = -radius * 0.78 + (i / (logCount - 1)) * radius * 1.56;
    const log = new THREE.Mesh(logGeo, bambooMat);
    log.position.set(0, -0.08, z);
    log.castShadow = true;
    log.receiveShadow = true;
    g.add(log);
  }

  // Top octagonal wooden deck
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.96, radius, 0.22, 8),
    darkWoodMat
  );
  deck.position.y = 0.14;
  deck.receiveShadow = true;
  deck.castShadow = true;
  g.add(deck);

  // Glowing golden perimeter ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.93, 0.06, 8, 24), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.26;
  g.add(ring);

  // Corner stakes
  const stakeGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.05, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const stake = new THREE.Mesh(stakeGeo, bambooMat);
    stake.position.set(Math.cos(a) * radius * 0.86, 0.52, Math.sin(a) * radius * 0.86);
    g.add(stake);
  }

  return g;
}

/**
 * Composite 4-part Vietnamese Festival Lantern (Đèn lồng).
 */
export function buildFestivalLantern(colorHex = 0xc92a22): THREE.Group {
  const g = new THREE.Group();
  g.name = 'prop_lantern';

  const silkMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.75,
    roughness: 0.45,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe0a526, roughness: 0.3, metalness: 0.65 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), silkMat);
  body.scale.set(1, 1.25, 1);
  g.add(body);

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 10), goldMat);
  capTop.position.y = 0.4;
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.08, 10), goldMat);
  capBot.position.y = -0.4;
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), silkMat);
  tassel.position.y = -0.58;
  tassel.rotation.x = Math.PI;
  g.add(capTop, capBot, tassel);

  return g;
}

/**
 * Composite 4-part Bamboo Grove InstancedMesh builder (Lũy tre làng).
 */
export function buildBambooGroveInstanced(
  positions: { x: number; y: number; z: number; scale: number }[],
  matLib?: MaterialLibrary
): THREE.Group {
  const g = new THREE.Group();
  g.name = 'prop_bamboo_grove';

  const stalkGeo = new THREE.CylinderGeometry(0.065, 0.095, 6.4, 7);
  stalkGeo.translate(0, 3.2, 0);
  const stalkMat = matLib
    ? matLib.createMaterial('tex.bamboo.stalk', { repeatX: 1, repeatY: 3, roughness: 0.55 })
    : new THREE.MeshStandardMaterial({ color: 0x6b8f42, roughness: 0.55 });

  // Drooping organic foliage spray (flat stretched ellipsoids rather than pointy cones)
  const canopyGeo = new THREE.DodecahedronGeometry(0.85, 0);
  canopyGeo.scale(1.35, 0.52, 1.35);
  canopyGeo.translate(0.15, 5.9, 0);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4b7532, roughness: 0.78 });

  const subCanopyGeo = new THREE.DodecahedronGeometry(0.62, 0);
  subCanopyGeo.scale(1.25, 0.48, 1.25);
  subCanopyGeo.translate(-0.35, 4.9, 0.25);

  const count = positions.length;
  const stalks = new THREE.InstancedMesh(stalkGeo, stalkMat, count);
  const leaves = new THREE.InstancedMesh(canopyGeo, leafMat, count);
  const subLeaves = new THREE.InstancedMesh(subCanopyGeo, leafMat, count);
  stalks.castShadow = true;
  leaves.castShadow = true;
  subLeaves.castShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  positions.forEach((p, idx) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set((idx % 3 - 1) * 0.07, idx * 1.35, ((idx + 1) % 3 - 1) * 0.06);
    dummy.scale.set(p.scale, p.scale * (0.88 + (idx % 4) * 0.11), p.scale);
    dummy.updateMatrix();
    stalks.setMatrixAt(idx, dummy.matrix);
    leaves.setMatrixAt(idx, dummy.matrix);
    subLeaves.setMatrixAt(idx, dummy.matrix);

    color.setHSL(0.24 + (idx % 5) * 0.012, 0.42, 0.36 + (idx % 3) * 0.05);
    stalks.setColorAt(idx, color);
    leaves.setColorAt(idx, color);
    subLeaves.setColorAt(idx, color);
  });

  stalks.computeBoundingSphere();
  leaves.computeBoundingSphere();
  subLeaves.computeBoundingSphere();
  g.add(stalks, leaves, subLeaves);
  return g;
}

/**
 * Composite 5-part Wooden Festival Grandstand (Khán đài) along outer village edge.
 */
export function buildGrandstand(matLib?: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'prop_stands';

  const woodMat = matLib
    ? matLib.createMaterial('tex.wood.plank_new', { worldWidth: 11, worldHeight: 2, roughness: 0.78 })
    : new THREE.MeshStandardMaterial({ color: 0x613e25, roughness: 0.8 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe0a526, roughness: 0.4, metalness: 0.45 });

  for (let tier = 0; tier < 3; tier++) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(11, 0.55, 1.4), woodMat);
    bench.position.set(0, 0.35 + tier * 0.75, -tier * 1.45);
    bench.castShadow = true;
    bench.receiveShadow = true;
    g.add(bench);
  }

  // Side posts + festival canopy
  for (const sx of [-5.1, 5.1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.6, 8), redMat);
    post.position.set(sx, 2.3, -2.9);
    post.castShadow = true;
    g.add(post);
  }
  const awning = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.25, 4.2), redMat);
  awning.position.set(0, 4.5, -1.5);
  awning.rotation.x = 0.18;
  awning.castShadow = true;
  g.add(awning);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.16, 0.2), goldMat);
  trim.position.set(0, 4.15, 0.55);
  g.add(trim);

  return g;
}
