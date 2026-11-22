import * as THREE from 'three';
import { AssetRegistry } from '../assets/AssetRegistry';
import type { MaterialLibrary } from '../assets/MaterialLibrary';
import {
  buildBambooGroveInstanced,
  buildDinhLang,
  buildFestivalLantern,
  buildGrandstand,
} from './models/VillageProps';
import { SafeZoneManager } from './SafeZoneManager';
import type { SkyAtmosphereManager } from './SkyAtmosphereManager';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 180;

export class ArenaManager {
  private waterUniforms = { uTime: { value: 0 } };
  private arenaRingMesh!: THREE.Mesh;
  private lanternGroups: THREE.Group[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private dummy = new THREE.Object3D();
  private drumRingMesh!: THREE.Mesh;
  private drumRingTimer = 0;
  private hazardRingMesh!: THREE.Mesh;
  private hazardTelegraphTimer = 0;
  private mudZones: { x: number; z: number; radius: number }[] = [
    { x: -4.1, z: 24.8, radius: 1.55 },
    { x: 4.1, z: 24.8, radius: 1.55 },
    { x: -14.8, z: 0.4, radius: 1.6 },
    { x: 14.8, z: -0.4, radius: 1.6 },
  ];

  constructor(
    private registry: AssetRegistry,
    private safeZones: SafeZoneManager,
    private matLib: MaterialLibrary,
    private skyAtmosphere: SkyAtmosphereManager
  ) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0.1,
        color: new THREE.Color(0xffffff),
      });
    }
  }

  async buildArena(scene: THREE.Scene, _isSoftwareGl: boolean): Promise<void> {
    // 1. Extended Village Terrain with 4-layer splat shader (Grass / Dirt / Mud / Shore Rock + Wet Rim)
    const outerTerrainGeo = new THREE.RingGeometry(30.4, 140, 64, 10);
    outerTerrainGeo.rotateX(-Math.PI / 2);
    const outerTerrain = new THREE.Mesh(
      outerTerrainGeo,
      this.matLib.createTerrainSplatMaterial(this.mudZones)
    );
    outerTerrain.position.y = 0.45;
    outerTerrain.receiveShadow = true;
    scene.add(outerTerrain);

    // Lake bed
    const lakeBed = new THREE.Mesh(
      new THREE.CircleGeometry(33, 36),
      new THREE.MeshStandardMaterial({ color: 0x1b3334, roughness: 0.95 })
    );
    lakeBed.rotation.x = -Math.PI / 2;
    lakeBed.position.y = -0.8;
    scene.add(lakeBed);

    // Animated Lake Water Surface
    const waterTex = this.matLib.getTextureSet('tex.water.pond').map.clone();
    waterTex.colorSpace = THREE.SRGBColorSpace;
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.repeat.set(12, 12);
    waterTex.needsUpdate = true;

    const waterGeo = new THREE.CircleGeometry(32, 36);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: waterTex,
      roughness: 0.16,
      metalness: 0.14,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 0.9,
    });
    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.waterUniforms.uTime;
      shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.y += sin(position.x * 0.45 + uTime * 2.0) * 0.035 + cos(position.z * 0.5 + uTime * 1.6) * 0.03;`
      );
    };
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.04;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    // Shrinking arena boundary ring
    this.arenaRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(34.5, 35.1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xb3261e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    this.arenaRingMesh.rotation.x = -Math.PI / 2;
    this.arenaRingMesh.position.y = 0.5;
    scene.add(this.arenaRingMesh);

    // 3. Build Safe Zones, Islands, Bridges, Platforms
    this.safeZones.buildZones(scene, this.matLib);

    // 4. Vietnamese Landmarks: Đình Làng (North), Grandstands (East/West), Lanterns, Bamboo Groves
    const dinh = buildDinhLang(this.matLib);
    dinh.position.set(0, 0.45, -34.8);
    scene.add(dinh);

    const standW = buildGrandstand(this.matLib);
    standW.position.set(-34.5, 0.45, 0);
    standW.rotation.y = Math.PI / 2;
    scene.add(standW);

    const standE = buildGrandstand(this.matLib);
    standE.position.set(34.5, 0.45, 0);
    standE.rotation.y = -Math.PI / 2;
    scene.add(standE);

    // Festival Lantern Posts around the lake shore
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8);
    const postMat = this.matLib.createMaterial('tex.wood.plank_old', { repeatX: 0.5, repeatY: 2, roughness: 0.82 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.35;
      const px = Math.cos(angle) * 32.5;
      const pz = Math.sin(angle) * 32.5;
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 2.2, pz);
      post.castShadow = true;
      scene.add(post);

      const lantern = buildFestivalLantern(i % 2 === 0 ? 0xb3261e : 0xe0a526);
      lantern.position.set(px, 3.65, pz);
      scene.add(lantern);
      this.lanternGroups.push(lantern);
    }
    this.skyAtmosphere.registerLanterns(this.lanternGroups, scene);

    // Bamboo Groves along perimeter
    const bambooPositions: { x: number; y: number; z: number; scale: number }[] = [];
    for (let i = 0; i < 42; i++) {
      const ang = (i / 42) * Math.PI * 2;
      // Leave gap in front of Đình Làng and Start Deck
      if (Math.abs(Math.sin(ang)) > 0.92) continue;
      const rad = 36 + (i % 4) * 2.4;
      bambooPositions.push({
        x: Math.cos(ang) * rad,
        y: 0.45,
        z: Math.sin(ang) * rad,
        scale: 0.88 + (i % 5) * 0.08,
      });
    }
    scene.add(buildBambooGroveInstanced(bambooPositions, this.matLib));

    // 5. Real Repo .glb Nature Assets (Quaternius CC0 via AssetRegistry)
    await this.populateRepoNatureAssets(scene);

    // 6. Pooled Particle InstancedMesh + Drum shockwave ring
    const pGeo = new THREE.OctahedronGeometry(0.16, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    scene.add(this.particleMesh);

    this.drumRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.15, 28),
      new THREE.MeshBasicMaterial({
        color: 0xe0a526,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    this.drumRingMesh.rotation.x = -Math.PI / 2;
    this.drumRingMesh.position.y = 0.12;
    scene.add(this.drumRingMesh);

    // 7. Mud hazard patches on shoreline/islands (distinct dark wet mud for Giảm Tốc readability) + telegraph ring
    const mudMat = this.matLib.createMaterial('tex.ground.mud', {
      worldWidth: 3.2,
      worldHeight: 3.2,
      roughness: 0.34,
      polygonOffset: true,
    });
    const mudRimMat = new THREE.MeshBasicMaterial({
      color: 0x26170b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    for (const mz of this.mudZones) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(mz.radius, 20), mudMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(mz.x, 0.505, mz.z);
      patch.receiveShadow = true;
      scene.add(patch);

      const rim = new THREE.Mesh(new THREE.RingGeometry(mz.radius - 0.16, mz.radius + 0.08, 22), mudRimMat);
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(mz.x, 0.515, mz.z);
      scene.add(rim);
    }

    this.hazardRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1.0, 28),
      new THREE.MeshBasicMaterial({
        color: 0xb3261e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    this.hazardRingMesh.rotation.x = -Math.PI / 2;
    this.hazardRingMesh.position.y = 0.54;
    scene.add(this.hazardRingMesh);
  }

  private async populateRepoNatureAssets(scene: THREE.Scene): Promise<void> {
    const treeIds = [
      'env.tree.common_1',
      'env.tree.common_2',
      'env.tree.common_3',
      'env.tree.twisted_1',
      'env.tree.twisted_2',
    ];
    const rockIds = ['env.rock.1', 'env.rock.2', 'env.rock.3'];
    const reedIds = ['env.reed.tall', 'env.reed.plant'];
    const bushIds = ['env.bush.common', 'env.bush.flowers'];

    const loadedTrees = await Promise.all(treeIds.map((id) => this.registry.loadModel(id)));
    const loadedRocks = await Promise.all(rockIds.map((id) => this.registry.loadModel(id)));
    const loadedReeds = await Promise.all(reedIds.map((id) => this.registry.loadModel(id)));
    const loadedBushes = await Promise.all(bushIds.map((id) => this.registry.loadModel(id)));

    // Place stylized trees framing the village perimeter
    for (let i = 0; i < 14; i++) {
      const model = loadedTrees[i % loadedTrees.length];
      if (!model) continue;
      const clone = model.clone(true);
      const angle = (i / 14) * Math.PI * 2 + 0.18;
      if (Math.abs(Math.cos(angle)) < 0.25 && Math.sin(angle) < -0.7) continue; // Keep Đình clear
      const r = 38 + (i % 3) * 4.5;
      clone.position.set(Math.cos(angle) * r, 0.35, Math.sin(angle) * r);
      clone.rotation.y = i * 1.4;
      clone.scale.setScalar(0.95 + (i % 3) * 0.2);
      scene.add(clone);
    }

    // Place rocks bordering the lake & islands
    for (let i = 0; i < 16; i++) {
      const model = loadedRocks[i % loadedRocks.length];
      if (!model) continue;
      const clone = model.clone(true);
      const angle = (i / 16) * Math.PI * 2;
      const r = 30.8 + (i % 2) * 1.2;
      clone.position.set(Math.cos(angle) * r, 0.15, Math.sin(angle) * r);
      clone.rotation.y = i * 0.9;
      clone.scale.setScalar(0.8 + (i % 3) * 0.25);
      scene.add(clone);
    }

    // Place reeds (Grass_Wispy_Tall / Plant_7) & bushes along water edge
    for (let i = 0; i < 18; i++) {
      const reed = loadedReeds[i % loadedReeds.length];
      if (reed) {
        const clone = reed.clone(true);
        const angle = (i / 18) * Math.PI * 2 + 0.1;
        const r = 29.8 + (i % 2) * 0.9;
        clone.position.set(Math.cos(angle) * r, -0.05, Math.sin(angle) * r);
        clone.scale.set(1.2, 1.7, 1.2);
        clone.rotation.y = i * 0.7;
        scene.add(clone);
      }

      if (i % 2 === 0) {
        const bush = loadedBushes[(i / 2) % loadedBushes.length];
        if (bush) {
          const bClone = bush.clone(true);
          const angle = (i / 18) * Math.PI * 2 + 0.22;
          bClone.position.set(Math.cos(angle) * 33.4, 0.42, Math.sin(angle) * 33.4);
          bClone.scale.setScalar(1.0 + (i % 3) * 0.15);
          scene.add(bClone);
        }
      }
    }
  }

  spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed = 4.5,
    scale = 0.22
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.7);
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = Math.cos(ang) * spd;
      slot.vy = 1.8 + Math.random() * 3.4;
      slot.vz = Math.sin(ang) * spd;
      slot.life = 0;
      slot.maxLife = 0.45 + Math.random() * 0.35;
      slot.scale = scale * (0.7 + Math.random() * 0.6);
      slot.color.setHex(colorHex);
    }
  }

  triggerDrumPulse(x: number, z: number): void {
    this.drumRingMesh.position.set(x, 0.16, z);
    this.drumRingMesh.scale.setScalar(1);
    this.drumRingTimer = 0.9;
  }

  triggerHazardTelegraph(x: number, z: number, radius = 3.2): void {
    this.hazardRingMesh.position.set(x, 0.56, z);
    this.hazardRingMesh.scale.setScalar(radius);
    this.hazardTelegraphTimer = 2.5;
  }

  isInMudZone(x: number, z: number): boolean {
    for (const mz of this.mudZones) {
      if (Math.hypot(x - mz.x, z - mz.z) <= mz.radius) {
        return true;
      }
    }
    return false;
  }

  updateFogVisibility(_scene: THREE.Scene, visibleRange: number): void {
    this.skyAtmosphere.setBlindVisibleRange(visibleRange);
  }

  update(dt: number, elapsed: number, arenaRadius: number): void {
    this.waterUniforms.uTime.value = elapsed;

    // Gentle lantern sway
    this.lanternGroups.forEach((l, i) => {
      l.rotation.z = Math.sin(elapsed * 1.7 + i) * 0.06;
    });

    // Arena shrink ring
    const ringScale = arenaRadius / 35;
    this.arenaRingMesh.scale.set(ringScale, ringScale, 1);

    // Drum lure shockwave
    if (this.drumRingTimer > 0) {
      this.drumRingTimer = Math.max(0, this.drumRingTimer - dt);
      const t = 1 - this.drumRingTimer / 0.9;
      this.drumRingMesh.scale.setScalar(1 + t * 9);
      (this.drumRingMesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.75;
    } else {
      (this.drumRingMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // 2.5s environmental debuff telegraph ring
    if (this.hazardTelegraphTimer > 0) {
      this.hazardTelegraphTimer = Math.max(0, this.hazardTelegraphTimer - dt);
      const pulse = 0.45 + Math.abs(Math.sin(elapsed * 9)) * 0.45;
      (this.hazardRingMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    } else {
      (this.hazardRingMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // Update pooled particles in-place (zero GC)
    let anyColorChanged = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vy -= 9.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const frac = 1 - p.life / p.maxLife;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(p.scale * frac);
      this.dummy.rotation.set(p.life * 4, p.life * 3, 0);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
      anyColorChanged = true;
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (anyColorChanged && this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }
}
