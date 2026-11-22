import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ASSET_CATALOG, AssetRegistry } from '../assets/AssetRegistry';
import { animateCrocodileRig, createCrocodileRig, type CrocodileRig } from '../game/models/CrocodileModel';
import {
  animateContestantRig,
  CONTESTANT_VARIANTS,
  createContestantRig,
  type ContestantAnimState,
  type ContestantRig,
} from '../game/models/ContestantModel';
import {
  buildBambooGroveInstanced,
  buildDinhLang,
  buildFestivalLantern,
  buildFloatingPlatform,
  buildGrandstand,
  buildWoodenBridge,
} from '../game/models/VillageProps';

const container = document.getElementById('viewport')!;
const selectEl = document.getElementById('asset-select') as HTMLSelectElement;
const animEl = document.getElementById('anim-select') as HTMLSelectElement;
const statsEl = document.getElementById('stats-box')!;
const rotateBtn = document.getElementById('btn-rotate')!;
const resetBtn = document.getElementById('btn-reset')!;

const isSoftwareGl = (() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x23201b);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);
camera.position.set(4.5, 3.2, 6.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !isSoftwareGl;
controls.autoRotate = !isSoftwareGl;
controls.autoRotateSpeed = 1.4;

const key = new THREE.DirectionalLight(0xfff1d6, 2.2);
key.position.set(8, 12, 6);
scene.add(key);
scene.add(new THREE.HemisphereLight(0xaad0ff, 0x5c4732, 1.0));
scene.add(new THREE.GridHelper(14, 14, 0xe0a526, 0x443a2e));

const registry = new AssetRegistry();
let currentObj: THREE.Object3D | null = null;
let crocRig: CrocodileRig | null = null;
let npcRig: ContestantRig | null = null;

// Populate select dropdown
for (const entry of Object.values(ASSET_CATALOG)) {
  const opt = document.createElement('option');
  opt.value = entry.id;
  opt.textContent = `[${entry.source === 'repo_glb' ? 'GLB' : 'PROC'}] ${entry.label}`;
  selectEl.appendChild(opt);
}
selectEl.value = 'croc.main';

function inspectObject(obj: THREE.Object3D, id: string) {
  let triangles = 0;
  let meshes = 0;
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes++;
      const geo = (child as THREE.Mesh).geometry;
      if (geo.index) triangles += geo.index.count / 3;
      else if (geo.attributes.position) triangles += geo.attributes.position.count / 3;
    }
  });
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const entry = registry.getEntry(id);
  statsEl.innerHTML = `
    <strong>ID:</strong> ${id}<br/>
    <strong>Nguồn:</strong> ${entry?.source ?? 'procedural'} (${entry?.license ?? '-'})<br/>
    <strong>Meshes:</strong> ${meshes} · <strong>Tam giác:</strong> ~${Math.round(triangles)}<br/>
    <strong>Kích thước (m):</strong> ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}<br/>
    <strong>Xương (Rig):</strong> ${npcRig ? npcRig.boneCount + ' bones (55 chuẩn)' : crocRig ? 'Đa khớp cá sấu (hàm + 4 đốt đuôi + 4 chân)' : 'Static prop'}
  `;
}

async function loadSelection(id: string) {
  if (currentObj) {
    scene.remove(currentObj);
    currentObj = null;
  }
  crocRig?.dispose();
  crocRig = null;
  npcRig?.dispose();
  npcRig = null;

  const entry = registry.getEntry(id);
  if (entry?.source === 'repo_glb') {
    const loaded = await registry.loadModel(id);
    if (loaded) {
      currentObj = loaded;
    }
  } else if (id === 'croc.main') {
    crocRig = createCrocodileRig();
    currentObj = crocRig.root;
  } else if (id === 'npc.base') {
    npcRig = createContestantRig(CONTESTANT_VARIANTS[0]);
    currentObj = npcRig.root;
  } else if (id === 'prop.temple') {
    currentObj = buildDinhLang();
  } else if (id === 'prop.bridge') {
    currentObj = buildWoodenBridge(6, 2.2);
  } else if (id === 'prop.platform') {
    currentObj = buildFloatingPlatform(2.4);
  } else if (id === 'prop.lantern') {
    currentObj = buildFestivalLantern();
  } else if (id === 'prop.stands') {
    currentObj = buildGrandstand();
  } else if (id === 'prop.bamboo') {
    currentObj = buildBambooGroveInstanced([
      { x: -1, y: 0, z: 0, scale: 1 },
      { x: 0.4, y: 0, z: 0.5, scale: 0.92 },
      { x: 1.1, y: 0, z: -0.4, scale: 1.08 },
    ]);
  }

  if (currentObj) {
    scene.add(currentObj);
    const box = new THREE.Box3().setFromObject(currentObj);
    const center = box.getCenter(new THREE.Vector3());
    controls.target.set(center.x, Math.max(0.5, center.y), center.z);
    inspectObject(currentObj, id);
  }
}

selectEl.addEventListener('change', () => loadSelection(selectEl.value));
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.textContent = controls.autoRotate ? 'Tạm dừng xoay' : 'Tiếp tục xoay';
});
resetBtn.addEventListener('click', () => {
  camera.position.set(4.5, 3.2, 6.2);
  controls.update();
});

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

const clock = new THREE.Clock();
let gait = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();
  const anim = animEl.value;

  if (crocRig) {
    const spd = anim === 'run' ? 9 : anim === 'walk' ? 4 : 1;
    const state = anim === 'attack' ? 'ATTACK' : anim === 'run' ? 'CHASE' : anim === 'eliminated' ? 'STUNNED' : 'PATROL';
    animateCrocodileRig(crocRig, t, spd, state, (t % 1.2) / 1.2);
  }
  if (npcRig) {
    const spd = anim === 'run' ? 7 : anim === 'walk' ? 3.5 : anim === 'panic' ? 6 : 0;
    gait += dt * spd;
    animateContestantRig(npcRig, (anim === 'attack' ? 'dash' : anim) as ContestantAnimState, t, gait);
  }

  controls.update();
  renderer.render(scene, camera);

  if (isSoftwareGl) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const s = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (s === gl.UNSIGNALED) window.setTimeout(poll, 5);
      else {
        gl.deleteSync(sync);
        window.setTimeout(() => requestAnimationFrame(tick), 80);
      }
    };
    window.setTimeout(poll, 5);
  } else {
    requestAnimationFrame(tick);
  }
}

loadSelection('croc.main');
tick();
