import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type AssetSourceType = 'repo_glb' | 'procedural' | 'polyhaven_or_procedural';

export interface AssetEntry {
  id: string;
  label: string;
  source: AssetSourceType;
  url?: string;
  category: 'nature' | 'character' | 'creature' | 'prop' | 'vfx' | 'audio' | 'texture' | 'sky';
  license: string;
  notes?: string;
}

const MODEL_BASE = '/assets/models/nature';

export const ASSET_CATALOG: Record<string, AssetEntry> = {
  // Trees (Quaternius CC0 via codejeam)
  'env.tree.common_1': { id: 'env.tree.common_1', label: 'CommonTree 1', source: 'repo_glb', url: `${MODEL_BASE}/common_tree_1.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.common_2': { id: 'env.tree.common_2', label: 'CommonTree 2', source: 'repo_glb', url: `${MODEL_BASE}/common_tree_2.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.common_3': { id: 'env.tree.common_3', label: 'CommonTree 3', source: 'repo_glb', url: `${MODEL_BASE}/common_tree_3.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.common_4': { id: 'env.tree.common_4', label: 'CommonTree 4', source: 'repo_glb', url: `${MODEL_BASE}/common_tree_4.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.common_5': { id: 'env.tree.common_5', label: 'CommonTree 5', source: 'repo_glb', url: `${MODEL_BASE}/common_tree_5.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.twisted_1': { id: 'env.tree.twisted_1', label: 'TwistedTree 1', source: 'repo_glb', url: `${MODEL_BASE}/twisted_tree_1.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.twisted_2': { id: 'env.tree.twisted_2', label: 'TwistedTree 2', source: 'repo_glb', url: `${MODEL_BASE}/twisted_tree_2.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.twisted_3': { id: 'env.tree.twisted_3', label: 'TwistedTree 3', source: 'repo_glb', url: `${MODEL_BASE}/twisted_tree_3.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.twisted_4': { id: 'env.tree.twisted_4', label: 'TwistedTree 4', source: 'repo_glb', url: `${MODEL_BASE}/twisted_tree_4.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.twisted_5': { id: 'env.tree.twisted_5', label: 'TwistedTree 5', source: 'repo_glb', url: `${MODEL_BASE}/twisted_tree_5.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.dead_1': { id: 'env.tree.dead_1', label: 'DeadTree 1', source: 'repo_glb', url: `${MODEL_BASE}/dead_tree_1.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.dead_2': { id: 'env.tree.dead_2', label: 'DeadTree 2', source: 'repo_glb', url: `${MODEL_BASE}/dead_tree_2.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.dead_3': { id: 'env.tree.dead_3', label: 'DeadTree 3', source: 'repo_glb', url: `${MODEL_BASE}/dead_tree_3.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.dead_4': { id: 'env.tree.dead_4', label: 'DeadTree 4', source: 'repo_glb', url: `${MODEL_BASE}/dead_tree_4.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.dead_5': { id: 'env.tree.dead_5', label: 'DeadTree 5', source: 'repo_glb', url: `${MODEL_BASE}/dead_tree_5.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.tree.pine_1': { id: 'env.tree.pine_1', label: 'Pine 1 (Nền xa)', source: 'repo_glb', url: `${MODEL_BASE}/pine_1.glb`, category: 'nature', license: 'CC0 1.0' },

  // Bushes, grass, reeds, flowers
  'env.bush.common': { id: 'env.bush.common', label: 'Bush Common', source: 'repo_glb', url: `${MODEL_BASE}/bush_common.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.bush.flowers': { id: 'env.bush.flowers', label: 'Bush Flowers', source: 'repo_glb', url: `${MODEL_BASE}/bush_common_flowers.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.grass.short': { id: 'env.grass.short', label: 'Grass Common Short', source: 'repo_glb', url: `${MODEL_BASE}/grass_common_short.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.grass.tall': { id: 'env.grass.tall', label: 'Grass Common Tall', source: 'repo_glb', url: `${MODEL_BASE}/grass_common_tall.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.reed.tall': { id: 'env.reed.tall', label: 'Grass Wispy Tall (Lau sậy)', source: 'repo_glb', url: `${MODEL_BASE}/grass_wispy_tall.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.reed.plant': { id: 'env.reed.plant', label: 'Plant 7 Big (Lau sậy)', source: 'repo_glb', url: `${MODEL_BASE}/plant_7_big.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.fern.1': { id: 'env.fern.1', label: 'Fern 1', source: 'repo_glb', url: `${MODEL_BASE}/fern_1.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.plant.1': { id: 'env.plant.1', label: 'Plant 1 Big', source: 'repo_glb', url: `${MODEL_BASE}/plant_1_big.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.clover.1': { id: 'env.clover.1', label: 'Clover 1', source: 'repo_glb', url: `${MODEL_BASE}/clover_1.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.flower.3': { id: 'env.flower.3', label: 'Flower 3 Group', source: 'repo_glb', url: `${MODEL_BASE}/flower_3_group.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.flower.4': { id: 'env.flower.4', label: 'Flower 4 Group', source: 'repo_glb', url: `${MODEL_BASE}/flower_4_group.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.mushroom.1': { id: 'env.mushroom.1', label: 'Mushroom Common', source: 'repo_glb', url: `${MODEL_BASE}/mushroom_common.glb`, category: 'nature', license: 'CC0 1.0' },
  'vfx.petal.1': { id: 'vfx.petal.1', label: 'Petal 1', source: 'repo_glb', url: `${MODEL_BASE}/petal_1.glb`, category: 'vfx', license: 'CC0 1.0' },

  // Rocks & Paths
  'env.rock.1': { id: 'env.rock.1', label: 'Rock Medium 1', source: 'repo_glb', url: `${MODEL_BASE}/rock_medium_1.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.rock.2': { id: 'env.rock.2', label: 'Rock Medium 2', source: 'repo_glb', url: `${MODEL_BASE}/rock_medium_2.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.rock.3': { id: 'env.rock.3', label: 'Rock Medium 3', source: 'repo_glb', url: `${MODEL_BASE}/rock_medium_3.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.pebble.1': { id: 'env.pebble.1', label: 'Pebble Round 1', source: 'repo_glb', url: `${MODEL_BASE}/pebble_round_1.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.rock_path.wide': { id: 'env.rock_path.wide', label: 'RockPath Round Wide', source: 'repo_glb', url: `${MODEL_BASE}/rock_path_round_wide.glb`, category: 'nature', license: 'CC0 1.0' },
  'env.rock_path.thin': { id: 'env.rock_path.thin', label: 'RockPath Square Thin', source: 'repo_glb', url: `${MODEL_BASE}/rock_path_square_thin.glb`, category: 'nature', license: 'CC0 1.0' },

  // Stylized PBR Material & Texture Slots (Poly Haven CC0 when supplied, Procedural Stylized PBR fallback)
  'tex.wood.plank_new': { id: 'tex.wood.plank_new', label: 'Ván Gỗ Mới (Bục / Sân Đình)', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Candidate: wood_planks' },
  'tex.wood.plank_old': { id: 'tex.wood.plank_old', label: 'Ván Gỗ Cũ (Cầu Gỗ)', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Candidate: weathered_brown_planks' },
  'tex.wood.plank_mossy': { id: 'tex.wood.plank_mossy', label: 'Ván Ẩm Rêu Trơn (Bẫy Trơn)', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Wet mossy variant for Rêu Trơn telegraph' },
  'tex.ground.mud': { id: 'tex.ground.mud', label: 'Bùn Lầy Bờ Ao (Vùng Giảm Tốc)', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Candidate: brown_mud_leaves_01' },
  'tex.ground.dirt': { id: 'tex.ground.dirt', label: 'Đất Nện Ấm Làng Quê', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Candidate: dirt_floor' },
  'tex.ground.grass': { id: 'tex.ground.grass', label: 'Thảm Cỏ Tre Xanh', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Candidate: forest_ground_04' },
  'tex.rock.shore': { id: 'tex.rock.shore', label: 'Đá Bờ Ao & Đảo Nhỏ', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Candidate: rocks_ground_02' },
  'tex.brick.red': { id: 'tex.brick.red', label: 'Gạch Đỏ Sân Đình & Bậc Thềm', source: 'polyhaven_or_procedural', category: 'texture', license: 'CC0 / Procedural Stylized', notes: 'Candidate: red_bricks_04' },
  'tex.roof.tile': { id: 'tex.roof.tile', label: 'Mái Ngói Đất Nung Đình Làng', source: 'procedural', category: 'texture', license: 'Project Code (Procedural)' },
  'tex.bamboo.stalk': { id: 'tex.bamboo.stalk', label: 'Vỏ Tre Làng & Bục Nổi', source: 'procedural', category: 'texture', license: 'Project Code (Procedural)' },
  'tex.water.pond': { id: 'tex.water.pond', label: 'Mặt Nước Ao Làng', source: 'procedural', category: 'texture', license: 'Project Code (Procedural)' },

  // 4-Round Sky & IBL Atmosphere Profiles
  'sky.round1': { id: 'sky.round1', label: 'Vòm Trời Vòng 1 (Chiều Muộn)', source: 'polyhaven_or_procedural', category: 'sky', license: 'CC0 / Procedural Stylized', notes: 'Candidate: evening_field' },
  'sky.round2': { id: 'sky.round2', label: 'Vòm Trời Vòng 2 (Hoàng Hôn)', source: 'polyhaven_or_procedural', category: 'sky', license: 'CC0 / Procedural Stylized', notes: 'Candidate: kloofendal_48d_partly_cloudy' },
  'sky.round3': { id: 'sky.round3', label: 'Vòm Trời Vòng 3 (Sương Mờ)', source: 'polyhaven_or_procedural', category: 'sky', license: 'CC0 / Procedural Stylized', notes: 'Candidate: overcast_soil' },
  'sky.final': { id: 'sky.final', label: 'Vòm Trời Chung Kết (Đêm Lễ Hội)', source: 'procedural', category: 'sky', license: 'Project Code (Procedural)' },

  // Procedural Code-Authored Models & Audio
  'croc.main': { id: 'croc.main', label: 'Cá Sấu Đa Khớp (Procedural)', source: 'procedural', category: 'creature', license: 'Project Code (Procedural)' },
  'npc.base': { id: 'npc.base', label: 'Thí Sinh Stylized 55 Xương (Procedural)', source: 'procedural', category: 'character', license: 'Project Code (Procedural)' },
  'prop.bamboo': { id: 'prop.bamboo', label: 'Lũy Tre Làng (Procedural)', source: 'procedural', category: 'prop', license: 'Project Code (Procedural)' },
  'prop.temple': { id: 'prop.temple', label: 'Đình Làng Việt Nam (Procedural)', source: 'procedural', category: 'prop', license: 'Project Code (Procedural)' },
  'prop.bridge': { id: 'prop.bridge', label: 'Cầu Gỗ Ao Làng (Procedural)', source: 'procedural', category: 'prop', license: 'Project Code (Procedural)' },
  'prop.platform': { id: 'prop.platform', label: 'Bục Tre Nổi (Procedural)', source: 'procedural', category: 'prop', license: 'Project Code (Procedural)' },
  'prop.lantern': { id: 'prop.lantern', label: 'Đèn Lồng Lễ Hội (Procedural)', source: 'procedural', category: 'prop', license: 'Project Code (Procedural)' },
  'prop.stands': { id: 'prop.stands', label: 'Khán Đài Hội Làng (Procedural)', source: 'procedural', category: 'prop', license: 'Project Code (Procedural)' },
  'arena.water': { id: 'arena.water', label: 'Mặt Nước Ao Làng (Procedural)', source: 'procedural', category: 'prop', license: 'Project Code (Procedural)' },
  'audio.synth': { id: 'audio.synth', label: 'WebAudio Folk Synthesizer', source: 'procedural', category: 'audio', license: 'Project Code (Procedural)' },
};

export class AssetRegistry {
  private gltfLoader = new GLTFLoader();
  private glbCache = new Map<string, THREE.Group>();
  private inFlight = new Map<string, Promise<THREE.Group | null>>();

  getEntry(id: string): AssetEntry | undefined {
    return ASSET_CATALOG[id];
  }

  listByCategory(category?: AssetEntry['category']): AssetEntry[] {
    const entries = Object.values(ASSET_CATALOG);
    return category ? entries.filter((e) => e.category === category) : entries;
  }

  async loadModel(id: string): Promise<THREE.Group | null> {
    const entry = ASSET_CATALOG[id];
    if (!entry || entry.source !== 'repo_glb' || !entry.url) {
      return null;
    }

    const cached = this.glbCache.get(id);
    if (cached) {
      return cached.clone(true);
    }

    let pending = this.inFlight.get(id);
    if (!pending) {
      pending = new Promise<THREE.Group | null>((resolve) => {
        this.gltfLoader.load(
          entry.url!,
          (gltf) => {
            const root = gltf.scene;
            root.traverse((obj) => {
              if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                const mat = mesh.material;
                if (Array.isArray(mat)) {
                  mat.forEach((m) => this.tuneMaterial(m));
                } else if (mat) {
                  this.tuneMaterial(mat);
                }
              }
            });
            this.glbCache.set(id, root);
            resolve(root);
          },
          undefined,
          (err) => {
            console.warn(`[AssetRegistry] Failed loading ${id} (${entry.url}), using procedural fallback.`, err);
            resolve(null);
          }
        );
      });
      this.inFlight.set(id, pending);
    }

    const base = await pending;
    return base ? base.clone(true) : null;
  }

  async preloadEssential(
    ids: string[],
    onProgress?: (loaded: number, total: number, currentLabel: string) => void
  ): Promise<void> {
    const total = ids.length;
    let loaded = 0;
    await Promise.all(
      ids.map(async (id) => {
        await this.loadModel(id);
        loaded++;
        const entry = ASSET_CATALOG[id];
        onProgress?.(loaded, total, entry?.label ?? id);
      })
    );
  }

  private tuneMaterial(mat: THREE.Material): void {
    const std = mat as THREE.MeshStandardMaterial;
    if (std.isMeshStandardMaterial) {
      if (std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
      }
      if (std.roughness === undefined || std.roughness < 0.2) {
        std.roughness = 0.72;
      }
      std.metalness = 0.0;
      std.envMapIntensity = 0.65;
      std.needsUpdate = true;
    }
  }

  dispose(): void {
    this.glbCache.forEach((group) => {
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    });
    this.glbCache.clear();
    this.inFlight.clear();
  }
}
