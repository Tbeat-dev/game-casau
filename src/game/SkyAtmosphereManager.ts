import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import atmosphereConfig from '../config/atmosphere.json';
import type { PolyHavenManifest } from '../assets/MaterialLibrary';
import {
  computeEffectiveFogDensity,
  findBrightestEquirectangularDirection,
  interpolateAtmosphere,
  sunAnglesToDirection,
  type AtmosphereProfile,
} from './atmosphereMath';

const SKY_PARTICLE_COUNT = 36;

export class SkyAtmosphereManager {
  private profiles: AtmosphereProfile[] = atmosphereConfig.rounds as AtmosphereProfile[];
  private currentProfile: AtmosphereProfile = this.profiles[0];
  private fromProfile: AtmosphereProfile = this.profiles[0];
  private targetProfile: AtmosphereProfile = this.profiles[0];
  private blendProgress = 1.0;

  private skyDome!: THREE.Mesh;
  private skyUniforms!: {
    uTime: { value: number };
    uCloudRot: { value: number };
    uZenith: { value: THREE.Color };
    uMid: { value: THREE.Color };
    uHorizon: { value: THREE.Color };
    uCloudTint: { value: THREE.Color };
    uCloudOpacity: { value: number };
    uSunDir: { value: THREE.Vector3 };
    uSunColor: { value: THREE.Color };
    uStarOpacity: { value: number };
    uMoonOpacity: { value: number };
  };

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private lanternPointLights: THREE.PointLight[] = [];
  private lanternSilkMats: THREE.MeshStandardMaterial[] = [];

  private envCache = new Map<string, THREE.Texture>();
  private hdrSunOverrides = new Map<string, { x: number; y: number; z: number; colorHex: string }>();

  // Ambient birds / petals / fireflies
  private skyParticles!: THREE.InstancedMesh;
  private skyParticleMat!: THREE.MeshBasicMaterial;
  private particleSeeds: { angle: number; radius: number; height: number; speed: number; phase: number }[] = [];
  private dummy = new THREE.Object3D();

  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private visibleRange = 58;

  getProfiles(): AtmosphereProfile[] {
    return this.profiles;
  }

  getProfileForRound(roundNumber: number): AtmosphereProfile {
    return (
      this.profiles.find((p) => p.roundNumber === roundNumber) ??
      this.profiles[this.profiles.length - 1]
    );
  }

  async init(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    isSoftwareGl: boolean,
    manifest: PolyHavenManifest | null
  ): Promise<void> {
    this.scene = scene;
    this.renderer = renderer;

    // 1. Setup Lights & Fog
    const p0 = this.profiles[0];
    scene.fog = new THREE.FogExp2(p0.fogColor, p0.baseFogDensity);

    this.hemiLight = new THREE.HemisphereLight(p0.hemiSkyColor, p0.hemiGroundColor, p0.hemiIntensity);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(p0.sunColor, p0.sunIntensity);
    this.sunLight.castShadow = !isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -42;
    this.sunLight.shadow.camera.right = 42;
    this.sunLight.shadow.camera.top = 42;
    this.sunLight.shadow.camera.bottom = -42;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // 2. Build Stylized Sky Dome (BackSide sphere + horizon Vietnamese village silhouettes)
    this.skyUniforms = {
      uTime: { value: 0 },
      uCloudRot: { value: 0 },
      uZenith: { value: new THREE.Color(p0.skyZenith) },
      uMid: { value: new THREE.Color(p0.skyMid) },
      uHorizon: { value: new THREE.Color(p0.skyHorizon) },
      uCloudTint: { value: new THREE.Color(p0.cloudTint) },
      uCloudOpacity: { value: p0.cloudOpacity },
      uSunDir: { value: new THREE.Vector3(0.5, 0.4, 0.5).normalize() },
      uSunColor: { value: new THREE.Color(p0.sunColor) },
      uStarOpacity: { value: p0.starOpacity },
      uMoonOpacity: { value: p0.moonOpacity },
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        uniform float uTime;
        uniform float uCloudRot;
        uniform vec3 uZenith;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uCloudTint;
        uniform float uCloudOpacity;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uStarOpacity;
        uniform float uMoonOpacity;

        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }

        float noise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbmCloud(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 3; i++) {
            v += a * noise2(p);
            p = p * 2.03 + vec2(17.1, 31.7);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, -0.2, 1.0);
          float up = clamp(dir.y, 0.0, 1.0);

          // 3-stop Vietnamese festival gradient
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.24, up));
          col = mix(col, uZenith, smoothstep(0.22, 0.85, up));

          // Sun / Moon directional glow
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float sunHalo = pow(sunDot, 10.0) * 0.42 + pow(sunDot, 64.0) * 0.55;
          float sunDisc = smoothstep(0.9965, 0.9988, sunDot);
          col += uSunColor * sunHalo * (1.0 - uMoonOpacity * 0.65);
          col = mix(col, uSunColor * 1.18, sunDisc * (1.0 - uMoonOpacity * 0.5));

          // Stylized Crescent / Harvest Moon in dusk & festival night
          if (uMoonOpacity > 0.01) {
            vec3 moonDir = normalize(vec3(-0.42, 0.38, -0.82));
            float mDot = dot(dir, moonDir);
            float moonDisc = smoothstep(0.9975, 0.999, mDot);
            float moonGlow = pow(max(mDot, 0.0), 18.0) * 0.35;
            col += vec3(0.95, 0.92, 0.78) * (moonGlow + moonDisc * 0.95) * uMoonOpacity;
          }

          // Twinkling stars in upper dome for R3/Final
          if (uStarOpacity > 0.01 && up > 0.08) {
            float az = atan(dir.z, dir.x);
            vec2 starUv = vec2(az * 16.0, up * 26.0);
            vec2 cell = floor(starUv);
            float rnd = hash21(cell);
            if (rnd > 0.93) {
              vec2 d = fract(starUv) - 0.5;
              float dist = length(d);
              float twinkle = 0.65 + 0.35 * sin(uTime * 2.5 + rnd * 40.0);
              float star = smoothstep(0.22, 0.04, dist) * twinkle * smoothstep(0.08, 0.28, up);
              col += vec3(1.0, 0.96, 0.84) * star * uStarOpacity;
            }
          }

          // Stylized posterized anime clouds drifting slowly
          if (up > 0.02) {
            float ca = atan(dir.z, dir.x) + uCloudRot;
            vec2 cuv = vec2(ca * 2.4, (1.0 - up) * 3.8);
            float cn = fbmCloud(cuv);
            float cloudBands = floor(clamp((cn - 0.42) * 2.5, 0.0, 1.0) * 4.0) / 4.0;
            float fade = smoothstep(0.02, 0.16, up) * (1.0 - smoothstep(0.75, 0.98, up));
            col = mix(col, uCloudTint, cloudBands * uCloudOpacity * fade);
          }

          // Distant stylized horizon hills / bamboo / village skyline silhouette (prevents hard horizon seam)
          float az = atan(dir.z, dir.x);
          float ridge = 0.028 + 0.016 * sin(az * 3.0 + 0.4) + 0.009 * cos(az * 7.0 - 1.1) + 0.005 * sin(az * 17.0);
          if (h < ridge) {
            float silFactor = smoothstep(-0.04, ridge, h);
            vec3 farSil = mix(uHorizon * 0.72, uHorizon, 0.45);
            col = mix(uHorizon, farSil, silFactor * smoothstep(-0.06, 0.01, h));
          }

          // Seamless lower hemisphere blend strictly into fog/horizon color
          col = mix(uHorizon, col, smoothstep(-0.02, 0.04, h));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(165, 32, 20), skyMat);
    this.skyDome.renderOrder = -10;
    scene.add(this.skyDome);

    // 3. Ambient Sky Life Particles (petals/birds by day, golden fireflies in dusk/night)
    const pGeo = new THREE.OctahedronGeometry(0.11, 0);
    this.skyParticleMat = new THREE.MeshBasicMaterial({
      color: 0xffd071,
      transparent: true,
      opacity: 0.75,
    });
    this.skyParticles = new THREE.InstancedMesh(pGeo, this.skyParticleMat, SKY_PARTICLE_COUNT);
    this.skyParticles.frustumCulled = false;
    for (let i = 0; i < SKY_PARTICLE_COUNT; i++) {
      this.particleSeeds.push({
        angle: (i / SKY_PARTICLE_COUNT) * Math.PI * 2,
        radius: 14 + (i % 7) * 4.5,
        height: 2.2 + (i % 6) * 1.4,
        speed: 0.08 + (i % 4) * 0.035,
        phase: i * 0.9,
      });
    }
    scene.add(this.skyParticles);

    // 4. Pre-build IBL PMREM textures once during init (and dispose equirectangular sources)
    await this.buildEnvironmentMaps(manifest);

    // 5. Snap initial profile to Round 1
    this.snapToRound(1);
  }

  /**
   * Generates or loads equirectangular environment textures ONCE at init,
   * converts each through PMREMGenerator for PBR IBL, aligns sun if HDRI exists,
   * and immediately disposes source textures to respect GPU memory budget.
   */
  private async buildEnvironmentMaps(manifest: PolyHavenManifest | null): Promise<void> {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const rgbeLoader = new RGBELoader();
    const texLoader = new THREE.TextureLoader();

    for (const profile of this.profiles) {
      const hdriInfo = manifest?.hdri?.[profile.skyId];
      let envTexture: THREE.Texture | null = null;

      if (hdriInfo?.hdr) {
        try {
          const hdrTex = await rgbeLoader.loadAsync(hdriInfo.hdr);
          hdrTex.mapping = THREE.EquirectangularReflectionMapping;
          const img = hdrTex.image as { data?: Float32Array; width?: number; height?: number } | undefined;
          if (img?.data && img.width && img.height) {
            const brightest = findBrightestEquirectangularDirection(img.data, img.width, img.height);
            this.hdrSunOverrides.set(profile.skyId, {
              x: brightest.x,
              y: brightest.y,
              z: brightest.z,
              colorHex: brightest.colorHex,
            });
          }
          envTexture = pmrem.fromEquirectangular(hdrTex).texture;
          hdrTex.dispose();
        } catch {
          envTexture = null;
        }
      } else if (hdriInfo?.ldr) {
        try {
          const ldrTex = await texLoader.loadAsync(hdriInfo.ldr);
          ldrTex.colorSpace = THREE.SRGBColorSpace;
          ldrTex.mapping = THREE.EquirectangularReflectionMapping;
          envTexture = pmrem.fromEquirectangular(ldrTex).texture;
          ldrTex.dispose();
        } catch {
          envTexture = null;
        }
      }

      if (!envTexture) {
        // Stylized procedural equirectangular reflection texture baked once via PMREM
        const w = 64;
        const h = 32;
        const data = new Uint8Array(w * h * 4);
        const cZen = new THREE.Color(profile.skyZenith);
        const cMid = new THREE.Color(profile.skyMid);
        const cHor = new THREE.Color(profile.skyHorizon);
        const cGround = new THREE.Color(profile.hemiGroundColor);
        const cSun = new THREE.Color(profile.sunColor);
        const sunDir = sunAnglesToDirection(profile.sunElevationDeg, profile.sunAzimuthDeg);
        const tmp = new THREE.Color();

        for (let py = 0; py < h; py++) {
          const v = (py + 0.5) / h;
          const phi = v * Math.PI;
          const dirY = Math.cos(phi);
          const sinPhi = Math.sin(phi);
          for (let px = 0; px < w; px++) {
            const u = (px + 0.5) / w;
            const theta = (u - 0.5) * Math.PI * 2;
            const dx = sinPhi * Math.sin(theta);
            const dz = sinPhi * Math.cos(theta);

            if (dirY >= 0) {
              tmp.copy(cHor).lerp(cMid, Math.min(1, dirY * 3.5)).lerp(cZen, Math.max(0, (dirY - 0.25) / 0.75));
              const sDot = Math.max(0, dx * sunDir.x + dirY * sunDir.y + dz * sunDir.z);
              if (sDot > 0.86) {
                tmp.lerp(cSun, Math.pow((sDot - 0.86) / 0.14, 2) * 0.85);
              }
            } else {
              tmp.copy(cHor).lerp(cGround, Math.min(1, -dirY * 2.2));
            }
            const idx = (py * w + px) * 4;
            data[idx] = Math.round(tmp.r * 255);
            data[idx + 1] = Math.round(tmp.g * 255);
            data[idx + 2] = Math.round(tmp.b * 255);
            data[idx + 3] = 255;
          }
        }
        const eqTex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
        eqTex.colorSpace = THREE.SRGBColorSpace;
        eqTex.mapping = THREE.EquirectangularReflectionMapping;
        eqTex.needsUpdate = true;
        envTexture = pmrem.fromEquirectangular(eqTex).texture;
        eqTex.dispose();
      }

      this.envCache.set(profile.skyId, envTexture);
    }

    pmrem.dispose();
  }

  registerLanterns(lanternGroups: THREE.Group[], scene: THREE.Scene): void {
    this.lanternSilkMats = [];
    for (const lg of lanternGroups) {
      lg.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          if (mesh.material.emissiveIntensity > 0.1) {
            this.lanternSilkMats.push(mesh.material);
          }
        }
      });
    }

    // Add 4 warm festival accent PointLights around key quarters (intensify in R3/Final)
    const anchors: [number, number][] = [
      [0, -29],
      [-23, 0],
      [23, 0],
      [0, 29],
    ];
    for (const [lx, lz] of anchors) {
      const pt = new THREE.PointLight(0xffb44c, 0, 22, 1.8);
      pt.position.set(lx, 3.6, lz);
      scene.add(pt);
      this.lanternPointLights.push(pt);
    }
  }

  snapToRound(roundNumber: number): void {
    const p = this.getProfileForRound(roundNumber);
    this.fromProfile = p;
    this.targetProfile = p;
    this.currentProfile = p;
    this.blendProgress = 1.0;
    this.applyProfileToScene(p);
  }

  setTargetRound(roundNumber: number): void {
    const next = this.getProfileForRound(roundNumber);
    if (next.skyId === this.targetProfile.skyId) return;
    this.fromProfile = { ...this.currentProfile };
    this.targetProfile = next;
    this.blendProgress = 0.0;
  }

  setBlindVisibleRange(visibleRange: number): void {
    this.visibleRange = visibleRange;
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = computeEffectiveFogDensity(
        this.currentProfile.baseFogDensity,
        this.visibleRange
      );
    }
  }

  private applyProfileToScene(p: AtmosphereProfile): void {
    const override = this.hdrSunOverrides.get(p.skyId);
    const sunDir = override
      ? { x: override.x, y: override.y, z: override.z }
      : sunAnglesToDirection(p.sunElevationDeg, p.sunAzimuthDeg);

    this.sunLight.position.set(sunDir.x * 52, sunDir.y * 52, sunDir.z * 52);
    this.sunLight.color.set(override ? override.colorHex : p.sunColor);
    this.sunLight.intensity = p.sunIntensity;

    this.hemiLight.color.set(p.hemiSkyColor);
    this.hemiLight.groundColor.set(p.hemiGroundColor);
    this.hemiLight.intensity = p.hemiIntensity;

    this.renderer.toneMappingExposure = p.exposure;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.set(p.fogColor);
      this.scene.fog.density = computeEffectiveFogDensity(p.baseFogDensity, this.visibleRange);
    }

    const envTex = this.envCache.get(p.skyId);
    if (envTex && this.scene.environment !== envTex) {
      this.scene.environment = envTex;
    }

    // Update sky dome shader uniforms
    this.skyUniforms.uZenith.value.set(p.skyZenith);
    this.skyUniforms.uMid.value.set(p.skyMid);
    this.skyUniforms.uHorizon.value.set(p.skyHorizon);
    this.skyUniforms.uCloudTint.value.set(p.cloudTint);
    this.skyUniforms.uCloudOpacity.value = p.cloudOpacity;
    this.skyUniforms.uSunDir.value.set(sunDir.x, sunDir.y, sunDir.z).normalize();
    this.skyUniforms.uSunColor.value.set(p.sunColor);
    this.skyUniforms.uStarOpacity.value = p.starOpacity;
    this.skyUniforms.uMoonOpacity.value = p.moonOpacity;

    // Lantern glow & ambient sky particles
    for (const mat of this.lanternSilkMats) {
      mat.emissiveIntensity = p.lanternGlow;
    }
    const ptIntensity = Math.max(0, (p.lanternGlow - 0.7) * 3.8);
    for (const pt of this.lanternPointLights) {
      pt.intensity = ptIntensity;
    }

    const isFireflies = p.ambientParticleMode === 'fireflies';
    this.skyParticleMat.color.setHex(isFireflies ? 0xffe066 : 0xffcbb0);
    this.skyParticleMat.opacity = isFireflies ? 0.85 : 0.65;
  }

  update(dt: number, elapsed: number, cameraPos: THREE.Vector3): void {
    if (this.blendProgress < 1.0) {
      this.blendProgress = Math.min(1.0, this.blendProgress + dt * 0.48); // ~2s smooth cross-fade
      this.currentProfile = interpolateAtmosphere(
        this.fromProfile,
        this.targetProfile,
        this.blendProgress
      );
      this.applyProfileToScene(this.currentProfile);
    }

    this.skyDome.position.set(cameraPos.x, 0, cameraPos.z);
    this.skyUniforms.uTime.value = elapsed;
    this.skyUniforms.uCloudRot.value += this.currentProfile.cloudRotSpeed * dt;

    // Subtle fireflies / drifting petals around lake
    const isFireflies = this.currentProfile.ambientParticleMode === 'fireflies';
    for (let i = 0; i < SKY_PARTICLE_COUNT; i++) {
      const seed = this.particleSeeds[i];
      const ang = seed.angle + elapsed * seed.speed;
      const px = Math.cos(ang) * seed.radius;
      const pz = Math.sin(ang) * seed.radius;
      const py =
        (isFireflies ? seed.height * 0.55 : seed.height + 2.5) +
        Math.sin(elapsed * 1.9 + seed.phase) * 0.55;
      const sc = isFireflies
        ? 0.55 + Math.sin(elapsed * 5.0 + seed.phase) * 0.35
        : 0.75;
      this.dummy.position.set(px, py, pz);
      this.dummy.rotation.set(elapsed + seed.phase, ang, 0);
      this.dummy.scale.setScalar(Math.max(0.15, sc));
      this.dummy.updateMatrix();
      this.skyParticles.setMatrixAt(i, this.dummy.matrix);
    }
    this.skyParticles.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.envCache.forEach((t) => t.dispose());
    this.envCache.clear();
    this.skyDome?.geometry.dispose();
    if (this.skyDome?.material instanceof THREE.Material) {
      this.skyDome.material.dispose();
    }
    this.skyParticles?.geometry.dispose();
    this.skyParticleMat?.dispose();
  }
}
