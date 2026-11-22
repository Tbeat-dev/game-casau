import * as THREE from 'three';
import type { MaterialLibrary } from '../assets/MaterialLibrary';
import { buildFloatingPlatform, buildWoodenBridge } from './models/VillageProps';
import { canEnterSafeZone } from './rules';
import type { RoundConfig, SafeZoneInfo, SafeZoneType } from './types';

export interface SurfaceQuery {
  height: number;
  surfaceType: 'land' | 'bridge' | 'platform' | 'water';
  zoneId: string | null;
  inActiveSafeZone: boolean;
  isMovingPlatform: boolean;
  platformVelX: number;
  platformVelZ: number;
}

interface PlatformMotion {
  zone: SafeZoneInfo;
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  velX: number;
  velZ: number;
}

interface BridgeRect {
  x: number;
  z: number;
  halfW: number;
  halfL: number;
  yaw: number;
  y: number;
}

export class SafeZoneManager {
  private zones: SafeZoneInfo[] = [];
  private zoneVisuals = new Map<string, { group: THREE.Group; ring: THREE.Mesh; beacon: THREE.Mesh }>();
  private platforms: PlatformMotion[] = [];
  private bridges: BridgeRect[] = [];
  private startDeck = { x: 0, z: 27, radius: 7.2, y: 0.48 };
  private templeDeck = { x: 0, z: -27, radius: 7.4, y: 0.55 };
  private arenaRadius = 35;
  private elapsed = 0;

  buildZones(scene: THREE.Scene, matLib?: MaterialLibrary): void {
    // 1. Start shore deck (South +Z)
    this.createZoneVisual(scene, {
      id: 'zone_start',
      name: 'Bến Xuất Phát',
      type: 'island',
      x: this.startDeck.x,
      y: this.startDeck.y,
      z: this.startDeck.z,
      radius: this.startDeck.radius,
      capacity: 12,
      occupants: [],
      reservedBy: [],
      active: false,
    }, false, 0, 0, matLib);

    // 2. Temple courtyard (North -Z)
    this.createZoneVisual(scene, {
      id: 'zone_temple',
      name: 'Sân Đình Làng',
      type: 'temple',
      x: this.templeDeck.x,
      y: this.templeDeck.y,
      z: this.templeDeck.z,
      radius: this.templeDeck.radius,
      capacity: 12,
      occupants: [],
      reservedBy: [],
      active: true,
    }, false, 0, 0, matLib);

    // 3. West & East Stone Islands
    this.createZoneVisual(scene, {
      id: 'zone_island_west',
      name: 'Đảo Đá Tây',
      type: 'island',
      x: -16.5,
      y: 0.48,
      z: 2.0,
      radius: 5.4,
      capacity: 6,
      occupants: [],
      reservedBy: [],
      active: true,
    }, false, 0, 0, matLib);

    this.createZoneVisual(scene, {
      id: 'zone_island_east',
      name: 'Đảo Đá Đông',
      type: 'island',
      x: 16.5,
      y: 0.48,
      z: -2.0,
      radius: 5.4,
      capacity: 6,
      occupants: [],
      reservedBy: [],
      active: true,
    }, false, 0, 0, matLib);

    // 4. Three Floating Moving Bamboo Platforms in the lake (clear of bridges)
    const platConfigs = [
      { id: 'zone_plat_1', name: 'Bục Tre Giữa Hồ', x: 0, z: 0, radius: 4.3, phase: 0, orbitR: 2.8 },
      { id: 'zone_plat_2', name: 'Bục Tre Tây Bắc', x: -11.5, z: -12.5, radius: 4.1, phase: 2.1, orbitR: 2.4 },
      { id: 'zone_plat_3', name: 'Bục Tre Đông Bắc', x: 11.5, z: -12.5, radius: 4.1, phase: 4.2, orbitR: 2.4 },
    ];
    for (const pc of platConfigs) {
      this.createZoneVisual(scene, {
        id: pc.id,
        name: pc.name,
        type: 'platform',
        x: pc.x,
        y: 0.36,
        z: pc.z,
        radius: pc.radius,
        capacity: 4,
        occupants: [],
        reservedBy: [],
        active: false,
      }, true, pc.orbitR, pc.phase, matLib);
    }

    // 5. Two Wooden Bridges connecting start shore to islands
    const bridgeLeft = buildWoodenBridge(13.5, 2.6, matLib);
    bridgeLeft.position.set(-10.5, 0.34, 15.0);
    bridgeLeft.rotation.y = -0.68;
    scene.add(bridgeLeft);
    this.bridges.push({ x: -10.5, z: 15.0, halfW: 1.45, halfL: 6.9, yaw: -0.68, y: 0.42 });

    const bridgeRight = buildWoodenBridge(13.5, 2.6, matLib);
    bridgeRight.position.set(10.5, 0.34, 14.2);
    bridgeRight.rotation.y = 0.68;
    scene.add(bridgeRight);
    this.bridges.push({ x: 10.5, z: 14.2, halfW: 1.45, halfL: 6.9, yaw: 0.68, y: 0.42 });
  }

  private createZoneVisual(
    scene: THREE.Scene,
    info: SafeZoneInfo,
    isPlatform: boolean,
    orbitRadius = 0,
    phase = 0,
    matLib?: MaterialLibrary
  ): void {
    const group = new THREE.Group();
    group.position.set(info.x, info.y, info.z);

    if (isPlatform) {
      const platMesh = buildFloatingPlatform(info.radius, matLib);
      platMesh.position.y = -0.22;
      group.add(platMesh);
    } else {
      // Gameplay-distinct Safe Zone surface: terracotta brick for Sân Đình, lighter rammed earth for islands
      const surfaceId = info.type === 'temple' ? 'tex.brick.red' : 'tex.ground.dirt';
      const moundMat = matLib
        ? matLib.createMaterial(surfaceId, {
            worldWidth: info.radius * 2,
            worldHeight: info.radius * 2,
            roughness: 0.84,
            colorTint: info.type === 'temple' ? 0xf6ddd0 : 0xf2e4cc,
          })
        : new THREE.MeshStandardMaterial({ color: 0x9b7a54, roughness: 0.88 });

      const rimMat = matLib
        ? matLib.createMaterial('tex.rock.shore', {
            worldWidth: info.radius * 2.2,
            worldHeight: 1.2,
            roughness: 0.9,
          })
        : new THREE.MeshStandardMaterial({ color: 0x8b7e6b, roughness: 0.92 });

      const mound = new THREE.Mesh(
        new THREE.CylinderGeometry(info.radius, info.radius + 1.1, 0.9, 16),
        moundMat
      );
      mound.position.y = -0.45;
      mound.receiveShadow = true;
      group.add(mound);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(info.radius + 0.35, info.radius + 1.2, 0.45, 16),
        rimMat
      );
      rim.position.y = -0.62;
      group.add(rim);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(info.radius - 0.35, info.radius, 32),
      new THREE.MeshBasicMaterial({
        color: 0xe0a526,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    group.add(ring);

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.25, 4.5, 8),
      new THREE.MeshBasicMaterial({
        color: 0xe0a526,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    beacon.position.y = 2.25;
    group.add(beacon);

    scene.add(group);
    this.zones.push(info);
    this.zoneVisuals.set(info.id, { group, ring, beacon });

    if (isPlatform) {
      this.platforms.push({
        zone: info,
        group,
        ringMesh: ring,
        baseX: info.x,
        baseZ: info.z,
        orbitRadius,
        orbitSpeed: 0.65,
        phase,
        velX: 0,
        velZ: 0,
      });
    }
  }

  configureForRound(round: RoundConfig, preferredTargetType?: SafeZoneType): void {
    this.arenaRadius = 35 * round.shrinkArenaFactor;
    for (const z of this.zones) {
      z.occupants = [];
      z.reservedBy = [];
      z.active = false;
    }

    let candidates = this.zones.filter((z) => z.id !== 'zone_start');
    if (preferredTargetType === 'platform') {
      const plats = candidates.filter((z) => z.type === 'platform');
      if (plats.length > 0) candidates = plats;
    } else if (preferredTargetType === 'temple') {
      const temples = candidates.filter((z) => z.type === 'temple' || z.type === 'island');
      if (temples.length > 0) candidates = temples;
    } else if (round.roundNumber === 1) {
      candidates = candidates.filter((z) => z.type !== 'platform');
    } else if (round.roundNumber === 2) {
      candidates = candidates.filter((z) => z.type === 'platform');
    }

    // Activate up to safeZoneCount zones
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, Math.min(round.safeZoneCount, shuffled.length));
    for (const z of chosen) {
      z.active = true;
      z.capacity = round.safeZoneCapacity;
    }

    // Sync platform move speeds
    for (const pm of this.platforms) {
      pm.orbitSpeed = round.platformMoveSpeed * 0.25;
    }
  }

  shiftActiveZones(round: RoundConfig): void {
    this.configureForRound(round);
  }

  update(dt: number, matCuActive: boolean): void {
    this.elapsed += dt;

    for (const pm of this.platforms) {
      if (pm.orbitSpeed > 0.01) {
        const prevX = pm.zone.x;
        const prevZ = pm.zone.z;
        const angle = this.elapsed * pm.orbitSpeed + pm.phase;
        pm.zone.x = pm.baseX + Math.cos(angle) * pm.orbitRadius;
        pm.zone.z = pm.baseZ + Math.sin(angle * 0.85) * pm.orbitRadius;
        pm.velX = (pm.zone.x - prevX) / Math.max(dt, 0.001);
        pm.velZ = (pm.zone.z - prevZ) / Math.max(dt, 0.001);
        pm.group.position.set(pm.zone.x, pm.zone.y + Math.sin(this.elapsed * 2 + pm.phase) * 0.04, pm.zone.z);
      } else {
        pm.velX = 0;
        pm.velZ = 0;
        pm.group.position.y = pm.zone.y + Math.sin(this.elapsed * 1.8 + pm.phase) * 0.03;
      }
    }

    // Update zone ring visuals
    for (const z of this.zones) {
      const vis = this.zoneVisuals.get(z.id);
      if (!vis) continue;
      const ringMat = vis.ring.material as THREE.MeshBasicMaterial;
      const beaconMat = vis.beacon.material as THREE.MeshBasicMaterial;

      if (z.active) {
        const full = z.occupants.length >= z.capacity;
        ringMat.color.setHex(full ? 0xb3261e : matCuActive ? 0x45e08a : 0xe0a526);
        ringMat.opacity = 0.75 + Math.sin(this.elapsed * 4) * 0.15;
        beaconMat.color.setHex(full ? 0xb3261e : 0xe0a526);
        beaconMat.opacity = matCuActive ? 0.42 : 0.18;
        vis.beacon.visible = true;
      } else {
        ringMat.color.setHex(0x6d6456);
        ringMat.opacity = 0.16;
        vis.beacon.visible = false;
      }
    }
  }

  getActiveZones(): SafeZoneInfo[] {
    return this.zones.filter((z) => z.active);
  }

  getAllZones(): SafeZoneInfo[] {
    return this.zones;
  }

  getArenaRadius(): number {
    return this.arenaRadius;
  }

  clearOccupants(): void {
    for (const z of this.zones) {
      z.occupants = [];
    }
  }

  registerOccupant(zoneId: string, actorId: string): boolean {
    const z = this.zones.find((item) => item.id === zoneId);
    if (!z || !z.active) return false;
    if (z.occupants.includes(actorId)) return true;
    if (!canEnterSafeZone(z, actorId)) return false;
    z.occupants.push(actorId);
    return true;
  }

  reserveSpot(zoneId: string, actorId: string): boolean {
    const z = this.zones.find((item) => item.id === zoneId);
    if (!z || !z.active) return false;
    if (z.reservedBy.includes(actorId)) return true;
    if (z.occupants.length + z.reservedBy.length >= z.capacity) return false;
    z.reservedBy.push(actorId);
    return true;
  }

  clearReservation(actorId: string): void {
    for (const z of this.zones) {
      z.reservedBy = z.reservedBy.filter((id) => id !== actorId);
    }
  }

  findNearestActiveZone(x: number, z: number): SafeZoneInfo | null {
    let best: SafeZoneInfo | null = null;
    let bestDist = Infinity;
    for (const zone of this.zones) {
      if (!zone.active) continue;
      const d = Math.hypot(zone.x - x, zone.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = zone;
      }
    }
    return best;
  }

  getSurfaceAt(x: number, z: number): SurfaceQuery {
    // 1. Check islands / platforms / temple / start deck
    for (const zone of this.zones) {
      const dist = Math.hypot(x - zone.x, z - zone.z);
      if (dist <= zone.radius) {
        const pm = this.platforms.find((p) => p.zone.id === zone.id);
        return {
          height: zone.y,
          surfaceType: zone.type === 'platform' ? 'platform' : 'land',
          zoneId: zone.id,
          inActiveSafeZone: zone.active,
          isMovingPlatform: zone.type === 'platform',
          platformVelX: pm?.velX ?? 0,
          platformVelZ: pm?.velZ ?? 0,
        };
      }
    }

    // 2. Check wooden bridges
    for (const b of this.bridges) {
      const dx = x - b.x;
      const dz = z - b.z;
      const cos = Math.cos(-b.yaw);
      const sin = Math.sin(-b.yaw);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= b.halfW && Math.abs(lz) <= b.halfL) {
        return {
          height: b.y,
          surfaceType: 'bridge',
          zoneId: null,
          inActiveSafeZone: false,
          isMovingPlatform: false,
          platformVelX: 0,
          platformVelZ: 0,
        };
      }
    }

    // 3. Outer village ring shore (beyond lake radius ~31m, up to arena perimeter)
    const radial = Math.hypot(x, z);
    if (radial >= 30.5) {
      return {
        height: 0.45,
        surfaceType: 'land',
        zoneId: null,
        inActiveSafeZone: false,
        isMovingPlatform: false,
        platformVelX: 0,
        platformVelZ: 0,
      };
    }

    // 4. Lake water
    return {
      height: -0.18,
      surfaceType: 'water',
      zoneId: null,
      inActiveSafeZone: false,
      isMovingPlatform: false,
      platformVelX: 0,
      platformVelZ: 0,
    };
  }
}
