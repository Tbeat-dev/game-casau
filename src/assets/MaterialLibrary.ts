import * as THREE from 'three';
import { computeTexelRepeat } from '../game/atmosphereMath';

export type LogicalTextureId =
  | 'tex.wood.plank_new'
  | 'tex.wood.plank_old'
  | 'tex.wood.plank_mossy'
  | 'tex.ground.mud'
  | 'tex.ground.dirt'
  | 'tex.ground.grass'
  | 'tex.rock.shore'
  | 'tex.brick.red'
  | 'tex.roof.tile'
  | 'tex.bamboo.stalk'
  | 'tex.water.pond';

export interface PolyHavenManifest {
  version: number;
  generatedAt: string | null;
  stylizeLevel: 'light' | 'medium' | 'strong';
  textures: Record<
    string,
    {
      assetId: string;
      diffuse?: string;
      normalGl?: string;
      arm?: string;
      bytes?: number;
      author?: string;
    }
  >;
  hdri: Record<
    string,
    {
      assetId: string;
      hdr?: string;
      ldr?: string;
      bytes?: number;
      author?: string;
    }
  >;
}

export interface PbrTextureSet {
  id: LogicalTextureId;
  sourceKind: 'polyhaven' | 'procedural';
  map: THREE.Texture;
  normalMap: THREE.Texture;
  armMap: THREE.Texture;
}

export interface MaterialOptions {
  worldWidth?: number;
  worldHeight?: number;
  tileMeters?: number;
  repeatX?: number;
  repeatY?: number;
  roughness?: number;
  metalness?: number;
  normalScale?: number;
  aoMapIntensity?: number;
  envMapIntensity?: number;
  colorTint?: number;
  transparent?: boolean;
  opacity?: number;
  polygonOffset?: boolean;
}

const TEX_SIZE = 256;

// Periodic wrap-safe pseudo-random & FBM helpers (zero tiling seams)
function hash2(ix: number, iy: number, period: number, seed: number): number {
  const px = ((ix % period) + period) % period;
  const py = ((iy % period) + period) % period;
  let n = (px * 374761393 + py * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function periodicNoise(u: number, v: number, freq: number, seed: number): number {
  const x = u * freq;
  const y = v * freq;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const a = hash2(x0, y0, freq, seed);
  const b = hash2(x0 + 1, y0, freq, seed);
  const c = hash2(x0, y0 + 1, freq, seed);
  const d = hash2(x0 + 1, y0 + 1, freq, seed);

  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

function fbmTile(u: number, v: number, baseFreq: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.55;
  let norm = 0;
  let f = baseFreq;
  for (let i = 0; i < octaves; i++) {
    sum += amp * periodicNoise(u, v, f, seed + i * 31);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

function posterize01(val: number, steps = 6): number {
  return Math.round(val * steps) / steps;
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hexRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export class MaterialLibrary {
  private manifest: PolyHavenManifest | null = null;
  private textureSets = new Map<LogicalTextureId, PbrTextureSet>();
  private clonedTextures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];
  private maxAnisotropy = 4;
  private texLoader = new THREE.TextureLoader();

  setMaxAnisotropy(maxAniso: number): void {
    this.maxAnisotropy = Math.max(1, Math.min(8, maxAniso || 4));
  }

  async init(): Promise<PolyHavenManifest | null> {
    try {
      const res = await fetch('/assets/textures/polyhaven/manifest.json', { cache: 'no-cache' });
      if (res.ok) {
        this.manifest = (await res.json()) as PolyHavenManifest;
      }
    } catch {
      this.manifest = null;
    }

    const ids: LogicalTextureId[] = [
      'tex.wood.plank_new',
      'tex.wood.plank_old',
      'tex.wood.plank_mossy',
      'tex.ground.mud',
      'tex.ground.dirt',
      'tex.ground.grass',
      'tex.rock.shore',
      'tex.brick.red',
      'tex.roof.tile',
      'tex.bamboo.stalk',
      'tex.water.pond',
    ];

    await Promise.all(ids.map((id) => this.prepareTextureSet(id)));
    return this.manifest;
  }

  getManifest(): PolyHavenManifest | null {
    return this.manifest;
  }

  private configureTexture(tex: THREE.Texture, isColor: boolean): void {
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this.maxAnisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
  }

  private loadExternalTexture(url: string, isColor: boolean): Promise<THREE.Texture | null> {
    return new Promise((resolve) => {
      this.texLoader.load(
        url,
        (tex) => {
          this.configureTexture(tex, isColor);
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  private async prepareTextureSet(id: LogicalTextureId): Promise<PbrTextureSet> {
    const existing = this.textureSets.get(id);
    if (existing) return existing;

    const entry = this.manifest?.textures?.[id];
    if (entry?.diffuse) {
      const [diff, norm, arm] = await Promise.all([
        this.loadExternalTexture(entry.diffuse, true),
        entry.normalGl ? this.loadExternalTexture(entry.normalGl, false) : Promise.resolve(null),
        entry.arm ? this.loadExternalTexture(entry.arm, false) : Promise.resolve(null),
      ]);
      if (diff) {
        const proc = this.generateProceduralSet(id);
        const set: PbrTextureSet = {
          id,
          sourceKind: 'polyhaven',
          map: diff,
          normalMap: norm ?? proc.normalMap,
          armMap: arm ?? proc.armMap,
        };
        if (norm) proc.normalMap.dispose();
        if (arm) proc.armMap.dispose();
        proc.map.dispose();
        this.textureSets.set(id, set);
        return set;
      }
    }

    const set = this.generateProceduralSet(id);
    this.textureSets.set(id, set);
    return set;
  }

  getTextureSet(id: LogicalTextureId): PbrTextureSet {
    const found = this.textureSets.get(id);
    if (found) return found;
    const created = this.generateProceduralSet(id);
    this.textureSets.set(id, created);
    return created;
  }

  /**
   * Generates seamless tileable Stylized PBR Diffuse (sRGB), OpenGL Normal (linear nor_gl),
   * and combined ARM (R=AO, G=Roughness, B=Metalness, linear) DataTextures.
   */
  private generateProceduralSet(id: LogicalTextureId): PbrTextureSet {
    const n = TEX_SIZE;
    const diffData = new Uint8Array(n * n * 4);
    const heightField = new Float32Array(n * n);
    const armData = new Uint8Array(n * n * 4);

    for (let py = 0; py < n; py++) {
      const v = py / n;
      for (let px = 0; px < n; px++) {
        const u = px / n;
        const idx = py * n + px;

        let rgb: [number, number, number] = [140, 120, 90];
        let h = 0.5;
        let ao = 0.92;
        let rough = 0.8;
        const metal = 0.0;

        if (id === 'tex.wood.plank_new' || id === 'tex.wood.plank_old' || id === 'tex.wood.plank_mossy') {
          const plankCount = 4;
          const plankV = (v * plankCount) % 1;
          const plankIdx = Math.floor(v * plankCount);
          const seamDist = Math.min(plankV, 1 - plankV);
          const seam = seamDist < 0.055 ? seamDist / 0.055 : 1.0;

          const grain = fbmTile(u * 1.0 + plankIdx * 0.27, v * 5.5, 6, 10 + plankIdx * 7, 3);
          const stylizedGrain = posterize01(grain, 6);

          const baseA = hexRgb(
            id === 'tex.wood.plank_new' ? 0x74492b : id === 'tex.wood.plank_old' ? 0x5c3c26 : 0x3b4d2a
          );
          const baseB = hexRgb(
            id === 'tex.wood.plank_new' ? 0x52311b : id === 'tex.wood.plank_old' ? 0x3d2616 : 0x28381d
          );
          rgb = mixRgb(baseB, baseA, stylizedGrain * 0.85 + 0.15);

          if (id === 'tex.wood.plank_mossy') {
            const mossMask = fbmTile(u, v, 5, 88, 3);
            if (mossMask > 0.48) {
              rgb = mixRgb(rgb, hexRgb(0x4b7034), (mossMask - 0.48) * 1.6);
            }
            rough = mossMask > 0.48 ? 0.28 : 0.42;
          } else {
            rough = id === 'tex.wood.plank_new' ? 0.72 - stylizedGrain * 0.1 : 0.84 - stylizedGrain * 0.08;
          }

          rgb = mixRgb(hexRgb(0x28170d), rgb, 0.35 + seam * 0.65);
          h = (0.35 + stylizedGrain * 0.45) * seam;
          ao = 0.55 + seam * 0.45;
        } else if (id === 'tex.ground.mud') {
          const f1 = fbmTile(u, v, 5, 101, 3);
          const f2 = fbmTile(u, v, 10, 202, 2);
          const puddle = Math.max(0, Math.min(1, (f1 - 0.44) * 3.0));
          const sty = posterize01(f1 * 0.7 + f2 * 0.3, 6);
          rgb = mixRgb(hexRgb(0x2a1c12), hexRgb(0x4a3320), sty);
          rgb = mixRgb(rgb, hexRgb(0x1e150e), puddle * 0.55);
          h = 0.45 + f2 * 0.35 - puddle * 0.3;
          ao = 0.78 + (1 - puddle) * 0.18;
          rough = 0.75 - puddle * 0.55; // Wet glossy puddle patches!
        } else if (id === 'tex.ground.dirt') {
          const f1 = posterize01(fbmTile(u, v, 5, 305, 3), 6);
          const pebble = periodicNoise(u, v, 14, 309);
          rgb = mixRgb(hexRgb(0x705136), hexRgb(0x9a754f), f1);
          if (pebble > 0.76) {
            rgb = mixRgb(rgb, hexRgb(0xb09776), 0.45);
          }
          h = 0.45 + f1 * 0.3 + (pebble > 0.76 ? 0.2 : 0);
          ao = 0.85 + f1 * 0.12;
          rough = 0.86;
        } else if (id === 'tex.ground.grass') {
          const blade = fbmTile(u, v, 8, 401, 3);
          const patch = posterize01(fbmTile(u, v, 4, 419, 2), 5);
          rgb = mixRgb(hexRgb(0x3f5e2c), hexRgb(0x638742), patch);
          rgb = mixRgb(rgb, hexRgb(0x73994d), Math.max(0, blade - 0.55) * 1.4);
          h = 0.4 + blade * 0.45;
          ao = 0.78 + patch * 0.2;
          rough = 0.88;
        } else if (id === 'tex.rock.shore') {
          const cell = fbmTile(u, v, 6, 501, 3);
          const crack = Math.abs(periodicNoise(u, v, 8, 511) - 0.5) * 2.0;
          const edge = crack < 0.16 ? crack / 0.16 : 1.0;
          const sty = posterize01(cell, 5);
          rgb = mixRgb(hexRgb(0x5e584e), hexRgb(0x92897a), sty);
          rgb = mixRgb(hexRgb(0x3b362f), rgb, 0.45 + edge * 0.55);
          h = (0.3 + sty * 0.55) * (0.4 + edge * 0.6);
          ao = 0.62 + edge * 0.36;
          rough = 0.85;
        } else if (id === 'tex.brick.red') {
          const rows = 4;
          const cols = 2;
          const rowIdx = Math.floor(v * rows);
          const rv = (v * rows) % 1;
          const ru = ((u * cols) + (rowIdx % 2) * 0.5) % 1;
          const mortar = rv < 0.09 || rv > 0.91 || ru < 0.06 || ru > 0.94;
          const grain = posterize01(fbmTile(u, v, 6, 607, 2), 5);
          const brickShade = hash2(Math.floor(u * cols + rowIdx), rowIdx, 8, 613);
          const baseBrick = mixRgb(hexRgb(0x8e3325), hexRgb(0xb84c38), grain * 0.6 + brickShade * 0.4);
          rgb = mortar ? hexRgb(0xcabaa0) : baseBrick;
          h = mortar ? 0.25 : 0.7 + grain * 0.22;
          ao = mortar ? 0.68 : 0.94;
          rough = mortar ? 0.92 : 0.78;
        } else if (id === 'tex.roof.tile') {
          const rows = 6;
          const cols = 6;
          const rv = (v * rows) % 1;
          const ru = (u * cols) % 1;
          const arch = Math.sin(ru * Math.PI);
          const lip = rv < 0.14 ? rv / 0.14 : 1.0;
          const shade = posterize01(arch * 0.65 + (1 - rv) * 0.35, 5);
          rgb = mixRgb(hexRgb(0x722116), hexRgb(0xb23e2c), shade);
          rgb = mixRgb(hexRgb(0x47140d), rgb, 0.45 + lip * 0.55);
          h = arch * 0.65 * lip + 0.2;
          ao = 0.65 + lip * 0.35;
          rough = 0.68;
        } else if (id === 'tex.bamboo.stalk') {
          const ring = (v * 3) % 1;
          const isNode = ring < 0.08 || ring > 0.92;
          const stripe = Math.sin(u * Math.PI * 16) * 0.5 + 0.5;
          rgb = mixRgb(hexRgb(0x567732), hexRgb(0x84a852), stripe * 0.55 + 0.25);
          if (isNode) rgb = mixRgb(rgb, hexRgb(0x3f5422), 0.55);
          h = isNode ? 0.85 : 0.45 + stripe * 0.2;
          ao = isNode ? 0.75 : 0.94;
          rough = 0.52;
        } else if (id === 'tex.water.pond') {
          const wave = Math.sin(u * Math.PI * 6 + Math.cos(v * Math.PI * 4) * 1.4) * 0.5 + 0.5;
          const f = fbmTile(u, v, 6, 909, 2);
          rgb = mixRgb(hexRgb(0x184f57), hexRgb(0x2d7e85), wave * 0.45 + f * 0.45);
          h = 0.45 + wave * 0.35;
          ao = 0.95;
          rough = 0.16;
        }

        heightField[idx] = h;
        diffData[idx * 4] = clamp255(rgb[0]);
        diffData[idx * 4 + 1] = clamp255(rgb[1]);
        diffData[idx * 4 + 2] = clamp255(rgb[2]);
        diffData[idx * 4 + 3] = 255;

        armData[idx * 4] = clamp255(ao * 255); // R = AO
        armData[idx * 4 + 1] = clamp255(rough * 255); // G = Roughness
        armData[idx * 4 + 2] = clamp255(metal * 255); // B = Metalness
        armData[idx * 4 + 3] = 255;
      }
    }

    // Compute stylized OpenGL Normal Map (nor_gl: +X right, +Y up, +Z out)
    const normalData = new Uint8Array(n * n * 4);
    const strength = 2.1; // Softened stylized bump relief
    for (let py = 0; py < n; py++) {
      const ym = (py - 1 + n) % n;
      const yp = (py + 1) % n;
      for (let px = 0; px < n; px++) {
        const xm = (px - 1 + n) % n;
        const xp = (px + 1) % n;
        const dx = (heightField[py * n + xp] - heightField[py * n + xm]) * strength;
        const dy = (heightField[yp * n + px] - heightField[ym * n + px]) * strength;
        // OpenGL tangent normal: (-dx, +dy, 1)
        const nx = -dx;
        const ny = dy;
        const nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1;
        const idx = (py * n + px) * 4;
        normalData[idx] = clamp255(((nx / len) * 0.5 + 0.5) * 255);
        normalData[idx + 1] = clamp255(((ny / len) * 0.5 + 0.5) * 255);
        normalData[idx + 2] = clamp255(((nz / len) * 0.5 + 0.5) * 255);
        normalData[idx + 3] = 255;
      }
    }

    const map = new THREE.DataTexture(diffData, n, n, THREE.RGBAFormat);
    this.configureTexture(map, true);

    const normalMap = new THREE.DataTexture(normalData, n, n, THREE.RGBAFormat);
    this.configureTexture(normalMap, false);

    const armMap = new THREE.DataTexture(armData, n, n, THREE.RGBAFormat);
    this.configureTexture(armMap, false);

    return { id, sourceKind: 'procedural', map, normalMap, armMap };
  }

  private cloneWithRepeat(src: THREE.Texture, rx: number, ry: number, isColor: boolean): THREE.Texture {
    if (Math.abs(rx - 1) < 0.01 && Math.abs(ry - 1) < 0.01) {
      return src;
    }
    const c = src.clone();
    c.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    c.wrapS = THREE.RepeatWrapping;
    c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(rx, ry);
    c.anisotropy = this.maxAnisotropy;
    c.needsUpdate = true;
    this.clonedTextures.push(c);
    return c;
  }

  /**
   * Build a Three.js PBR material wired to a logical texture ID with consistent color spaces
   * and world-space texel density.
   */
  createMaterial(id: LogicalTextureId, opts: MaterialOptions = {}): THREE.MeshStandardMaterial {
    const set = this.getTextureSet(id);
    const [rx, ry] =
      opts.repeatX !== undefined && opts.repeatY !== undefined
        ? [opts.repeatX, opts.repeatY]
        : opts.worldWidth !== undefined && opts.worldHeight !== undefined
        ? computeTexelRepeat(opts.worldWidth, opts.worldHeight, opts.tileMeters ?? 2.0)
        : [1, 1];

    const map = this.cloneWithRepeat(set.map, rx, ry, true);
    const normalMap = this.cloneWithRepeat(set.normalMap, rx, ry, false);
    const armMap = this.cloneWithRepeat(set.armMap, rx, ry, false);
    const normScale = opts.normalScale ?? 0.42;

    const mat = new THREE.MeshStandardMaterial({
      color: opts.colorTint ?? 0xffffff,
      map,
      normalMap,
      normalScale: new THREE.Vector2(normScale, normScale),
      aoMap: armMap,
      aoMapIntensity: opts.aoMapIntensity ?? 0.45,
      roughnessMap: armMap,
      roughness: opts.roughness ?? 1.0,
      metalnessMap: armMap,
      metalness: opts.metalness ?? 0.05,
      envMapIntensity: opts.envMapIntensity ?? 0.65,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1.0,
      polygonOffset: opts.polygonOffset ?? false,
      polygonOffsetFactor: opts.polygonOffset ? -1 : 0,
      polygonOffsetUnits: opts.polygonOffset ? -1 : 0,
    });
    this.materials.push(mat);
    return mat;
  }

  /**
   * 4-Layer Terrain Splat Shader (Grass + Warm Dirt + Wet Mud + Shore Rock + Wet Shoreline Rim)
   * with world-space anti-tiling macro variation. Extends MeshStandardMaterial for full shadows & fog.
   */
  createTerrainSplatMaterial(
    mudZones: { x: number; z: number; radius: number }[]
  ): THREE.MeshStandardMaterial {
    const grass = this.getTextureSet('tex.ground.grass');
    const dirt = this.getTextureSet('tex.ground.dirt');
    const mud = this.getTextureSet('tex.ground.mud');
    const rock = this.getTextureSet('tex.rock.shore');

    const mudArray = mudZones.slice(0, 4).map((m) => new THREE.Vector3(m.x, m.z, m.radius));
    while (mudArray.length < 4) mudArray.push(new THREE.Vector3(9999, 9999, 0.1));

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grass.map,
      normalMap: grass.normalMap,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.58,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGrassTex = { value: grass.map };
      shader.uniforms.uDirtTex = { value: dirt.map };
      shader.uniforms.uMudTex = { value: mud.map };
      shader.uniforms.uRockTex = { value: rock.map };
      shader.uniforms.uMudZones = { value: mudArray };

      shader.vertexShader =
        `varying vec3 vWorldPos;\n` +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
           vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

      shader.fragmentShader =
        `
        varying vec3 vWorldPos;
        uniform sampler2D uGrassTex;
        uniform sampler2D uDirtTex;
        uniform sampler2D uMudTex;
        uniform sampler2D uRockTex;
        uniform vec3 uMudZones[4];

        float splatHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float splatNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(splatHash(i), splatHash(i + vec2(1.0, 0.0)), u.x),
            mix(splatHash(i + vec2(0.0, 1.0)), splatHash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        vec4 sampleAntiTile(sampler2D tex, vec2 worldXZ, float tileMeters) {
          vec2 uv1 = worldXZ / tileMeters;
          // Rotated offset secondary tap breaks large-surface grid repetition
          mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
          vec2 uv2 = (rot * worldXZ) / (tileMeters * 1.43) + vec2(0.37, 0.71);
          float macro = splatNoise(worldXZ * 0.08);
          return mix(texture2D(tex, uv1), texture2D(tex, uv2), smoothstep(0.25, 0.75, macro));
        }
        ` +
        shader.fragmentShader.replace(
          '#include <map_fragment>',
          `
          vec2 wXZ = vWorldPos.xz;
          float radial = length(wXZ);
          float macroA = splatNoise(wXZ * 0.11);
          float macroB = splatNoise(wXZ * 0.24 + vec2(9.2, 4.7));

          vec3 colGrass = sampleAntiTile(uGrassTex, wXZ, 2.4).rgb;
          vec3 colDirt  = sampleAntiTile(uDirtTex,  wXZ, 2.2).rgb;
          vec3 colMud   = sampleAntiTile(uMudTex,   wXZ, 2.0).rgb;
          vec3 colRock  = sampleAntiTile(uRockTex,  wXZ, 2.5).rgb;

          // Subtle macro hue/value variation to eliminate repetitive turf bands
          colGrass *= mix(0.88, 1.12, macroA);

          // Shoreline rock + warm dirt transition near water edge (r = 30.4 .. 34.5)
          float shoreBand = 1.0 - smoothstep(30.6, 34.2, radial);
          float rockWeight = shoreBand * smoothstep(0.35, 0.75, macroB);
          float dirtWeight = smoothstep(0.55, 0.82, macroA * 0.65 + shoreBand * 0.45);

          // Dark wet mud around Mud Hazard zones
          float mudWeight = 0.0;
          for (int i = 0; i < 4; i++) {
            float d = length(wXZ - uMudZones[i].xy);
            mudWeight = max(mudWeight, 1.0 - smoothstep(uMudZones[i].z * 0.7, uMudZones[i].z * 1.25, d));
          }

          vec3 terrainCol = mix(colGrass, colDirt, dirtWeight * 0.62);
          terrainCol = mix(terrainCol, colRock, rockWeight * 0.68);
          terrainCol = mix(terrainCol, colMud, clamp(mudWeight, 0.0, 1.0));

          // Wet dark damp rim right along the water border
          float wetEdge = 1.0 - smoothstep(30.4, 32.0, radial);
          terrainCol *= mix(1.0, 0.64, wetEdge);

          diffuseColor.rgb *= terrainCol;
          `
        );
    };

    this.materials.push(mat);
    return mat;
  }

  dispose(): void {
    this.materials.forEach((m) => m.dispose());
    this.materials = [];
    this.clonedTextures.forEach((t) => t.dispose());
    this.clonedTextures = [];
    this.textureSets.forEach((set) => {
      set.map.dispose();
      set.normalMap.dispose();
      set.armMap.dispose();
    });
    this.textureSets.clear();
  }
}
