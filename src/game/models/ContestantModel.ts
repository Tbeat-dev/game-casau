import * as THREE from 'three';

export interface ContestantVariant {
  name: string;
  shirtColor: number;
  pantsColor: number;
  skinColor: number;
  hatType: 'non_la' | 'khan_ran' | 'festival_band' | 'none';
  accentColor: number;
  heightScale: number;
}

export const CONTESTANT_VARIANTS: ContestantVariant[] = [
  { name: 'An', shirtColor: 0xb3261e, pantsColor: 0x26211d, skinColor: 0xf1c29b, hatType: 'non_la', accentColor: 0xe0a526, heightScale: 1.0 },
  { name: 'Bình', shirtColor: 0x2b3a67, pantsColor: 0x1e1a16, skinColor: 0xe7b48a, hatType: 'khan_ran', accentColor: 0xf3e8cf, heightScale: 1.04 },
  { name: 'Chi', shirtColor: 0xe0a526, pantsColor: 0x3b281c, skinColor: 0xf5cbb0, hatType: 'non_la', accentColor: 0xb3261e, heightScale: 0.94 },
  { name: 'Dũng', shirtColor: 0x4f6f3a, pantsColor: 0x2a241e, skinColor: 0xdeaa80, hatType: 'festival_band', accentColor: 0xe0a526, heightScale: 1.06 },
  { name: 'Hà', shirtColor: 0xc85a32, pantsColor: 0x211d1a, skinColor: 0xf3c6a5, hatType: 'non_la', accentColor: 0xf3e8cf, heightScale: 0.96 },
  { name: 'Hải', shirtColor: 0x3a6478, pantsColor: 0x1e1a16, skinColor: 0xe2af88, hatType: 'khan_ran', accentColor: 0xb3261e, heightScale: 1.02 },
  { name: 'Lan', shirtColor: 0x8f3448, pantsColor: 0x29211b, skinColor: 0xf6ceb2, hatType: 'festival_band', accentColor: 0xe0a526, heightScale: 0.95 },
  { name: 'Minh', shirtColor: 0x5b3a24, pantsColor: 0x1e1a16, skinColor: 0xe8b992, hatType: 'khan_ran', accentColor: 0x4f6f3a, heightScale: 1.01 },
  { name: 'Ngọc', shirtColor: 0x3f7a68, pantsColor: 0x26201a, skinColor: 0xf4c8a8, hatType: 'non_la', accentColor: 0xe0a526, heightScale: 0.97 },
  { name: 'Phúc', shirtColor: 0xd17c2a, pantsColor: 0x241f1a, skinColor: 0xe0ab81, hatType: 'festival_band', accentColor: 0xb3261e, heightScale: 1.05 },
  { name: 'Thảo', shirtColor: 0x6b4875, pantsColor: 0x231e1b, skinColor: 0xf5ccb0, hatType: 'non_la', accentColor: 0xf3e8cf, heightScale: 0.93 },
  { name: 'Tú', shirtColor: 0x2f5e42, pantsColor: 0x1e1a16, skinColor: 0xe6b48c, hatType: 'khan_ran', accentColor: 0xe0a526, heightScale: 1.0 },
];

export const STANDARD_55_BONE_NAMES = [
  'root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
  'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l',
  'index_01_l', 'index_02_l', 'index_03_l', 'index_04_leaf_l',
  'middle_01_l', 'middle_02_l', 'middle_03_l', 'middle_04_leaf_l',
  'ring_01_l', 'ring_02_l', 'ring_03_l', 'ring_04_leaf_l',
  'thumb_01_l', 'thumb_02_l', 'thumb_03_l', 'thumb_04_leaf_l',
  'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r',
  'index_01_r', 'index_02_r', 'index_03_r', 'index_04_leaf_r',
  'middle_01_r', 'middle_02_r', 'middle_03_r', 'middle_04_leaf_r',
  'ring_01_r', 'ring_02_r', 'ring_03_r', 'ring_04_leaf_r',
  'thumb_01_r', 'thumb_02_r', 'thumb_03_r', 'thumb_04_leaf_r',
  'thigh_l', 'calf_l', 'foot_l', 'ball_l',
  'thigh_r', 'calf_r', 'foot_r', 'ball_r',
] as const;

export type ContestantAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'panic' | 'eliminated' | 'dash';

export interface ContestantRig {
  root: THREE.Group;
  bones: Record<string, THREE.Object3D>;
  boneCount: number;
  shadowDisc: THREE.Mesh;
  hatMesh?: THREE.Object3D;
  dispose: () => void;
}

export function createContestantRig(variant: ContestantVariant): ContestantRig {
  const bones: Record<string, THREE.Object3D> = {};
  const registerBone = (name: string, parent?: THREE.Object3D): THREE.Group => {
    const g = new THREE.Group();
    g.name = name;
    bones[name] = g;
    if (parent) parent.add(g);
    return g;
  };

  // Exact 55-bone hierarchy with watertight anatomical joint spacing
  const root = registerBone('root');
  root.scale.setScalar(variant.heightScale);

  const pelvis = registerBone('pelvis', root);
  pelvis.position.set(0, 0.82, 0);

  const spine01 = registerBone('spine_01', pelvis);
  spine01.position.set(0, 0.08, 0);
  const spine02 = registerBone('spine_02', spine01);
  spine02.position.set(0, 0.16, 0);
  const spine03 = registerBone('spine_03', spine02);
  spine03.position.set(0, 0.18, 0);
  const neck01 = registerBone('neck_01', spine03);
  neck01.position.set(0, 0.12, 0);
  const head = registerBone('Head', neck01);
  head.position.set(0, 0.14, 0);

  const buildArmBones = (side: 'l' | 'r', sign: number) => {
    const clav = registerBone(`clavicle_${side}`, spine03);
    clav.position.set(sign * 0.14, 0.06, 0);
    const upper = registerBone(`upperarm_${side}`, clav);
    upper.position.set(sign * 0.13, -0.02, 0);
    const lower = registerBone(`lowerarm_${side}`, upper);
    lower.position.set(0, -0.24, 0);
    const hand = registerBone(`hand_${side}`, lower);
    hand.position.set(0, -0.22, 0);

    for (const finger of ['index', 'middle', 'ring', 'thumb']) {
      const f1 = registerBone(`${finger}_01_${side}`, hand);
      const f2 = registerBone(`${finger}_02_${side}`, f1);
      const f3 = registerBone(`${finger}_03_${side}`, f2);
      registerBone(`${finger}_04_leaf_${side}`, f3);
    }
    return { upper, lower, hand };
  };

  const armL = buildArmBones('l', -1);
  const armR = buildArmBones('r', 1);

  const buildLegBones = (side: 'l' | 'r', sign: number) => {
    const thigh = registerBone(`thigh_${side}`, pelvis);
    thigh.position.set(sign * 0.12, -0.04, 0);
    const calf = registerBone(`calf_${side}`, thigh);
    calf.position.set(0, -0.37, 0);
    const foot = registerBone(`foot_${side}`, calf);
    foot.position.set(0, -0.35, 0);
    registerBone(`ball_${side}`, foot);
    return { thigh, calf, foot };
  };

  const legL = buildLegBones('l', -1);
  const legR = buildLegBones('r', 1);

  const shirtMat = new THREE.MeshStandardMaterial({ color: variant.shirtColor, roughness: 0.78, metalness: 0.02 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: variant.pantsColor, roughness: 0.85, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: variant.skinColor, roughness: 0.58, metalness: 0.02 });
  const accentMat = new THREE.MeshStandardMaterial({ color: variant.accentColor, roughness: 0.48, metalness: 0.15 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.72, metalness: 0.05 });

  // Pelvis / Hips block (eliminates thigh-to-torso gap)
  const hipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.21, 0.22, 10), pantsMat);
  hipMesh.position.set(0, -0.01, 0);
  hipMesh.castShadow = true;
  pelvis.add(hipMesh);

  // Torso (Áo bà ba / áo hội) bridging pelvis -> neck cleanly
  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.52, 12), shirtMat);
  torsoMesh.position.set(0, 0.22, 0);
  torsoMesh.castShadow = true;
  spine01.add(torsoMesh);

  // Waist sash (Đai lưng lễ hội)
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.11, 12), accentMat);
  sash.position.set(0, 0.01, 0);
  spine01.add(sash);

  // Shoulders rounded cap
  const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.36, 4, 8), shirtMat);
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.set(0, 0.06, 0);
  spine03.add(shoulders);

  // Neck cylinder (connects torso top to head)
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.18, 10), skinMat);
  neckMesh.position.set(0, 0.05, 0);
  neck01.add(neckMesh);

  // Head & Stylized face
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 12), skinMat);
  headMesh.position.set(0, 0.11, 0);
  headMesh.castShadow = true;
  head.add(headMesh);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairCap.position.set(0, 0.13, -0.02);
  hairCap.rotation.x = -0.2;
  head.add(hairCap);

  const eyeGeo = new THREE.SphereGeometry(0.026, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1e1a16, roughness: 0.2 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.072, 0.11, 0.175);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.072, 0.11, 0.175);
  head.add(eyeL, eyeR);

  // Traditional Vietnamese headwear
  let hatMesh: THREE.Object3D | undefined;
  if (variant.hatType === 'non_la') {
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xe6cf93, roughness: 0.85 });
    const nonLa = new THREE.Mesh(new THREE.ConeGeometry(0.39, 0.22, 16, 1, true), strawMat);
    nonLa.material.side = THREE.DoubleSide;
    nonLa.position.set(0, 0.32, -0.01);
    nonLa.rotation.x = -0.06;
    nonLa.castShadow = true;
    head.add(nonLa);
    hatMesh = nonLa;
  } else if (variant.hatType === 'khan_ran') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.045, 8, 16), accentMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.01, 0);
    neck01.add(scarf);
    hatMesh = scarf;
  } else if (variant.hatType === 'festival_band') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.055, 14, 1, true), accentMat);
    band.position.set(0, 0.17, 0);
    head.add(band);
    hatMesh = band;
  }

  // Arms with shoulder joint spheres
  const buildLimb = (upperPivot: THREE.Object3D, lowerPivot: THREE.Object3D, handPivot: THREE.Object3D) => {
    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 8), shirtMat);
    upperPivot.add(shoulderBall);

    const u = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.056, 0.25, 8), shirtMat);
    u.position.set(0, -0.125, 0);
    u.castShadow = true;
    upperPivot.add(u);

    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.23, 8), skinMat);
    l.position.set(0, -0.115, 0);
    l.castShadow = true;
    lowerPivot.add(l);

    const h = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), skinMat);
    handPivot.add(h);
  };
  buildLimb(armL.upper, armL.lower, armL.hand);
  buildLimb(armR.upper, armR.lower, armR.hand);

  // Legs with hip joint spheres
  const buildLeg = (thighPivot: THREE.Object3D, calfPivot: THREE.Object3D, footPivot: THREE.Object3D) => {
    const hipBall = new THREE.Mesh(new THREE.SphereGeometry(0.088, 8, 8), pantsMat);
    thighPivot.add(hipBall);

    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.074, 0.38, 8), pantsMat);
    t.position.set(0, -0.185, 0);
    t.castShadow = true;
    thighPivot.add(t);

    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.058, 0.36, 8), pantsMat);
    c.position.set(0, -0.175, 0);
    c.castShadow = true;
    calfPivot.add(c);

    const f = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.07, 0.21), hairMat);
    f.position.set(0, -0.025, 0.045);
    f.castShadow = true;
    footPivot.add(f);
  };
  buildLeg(legL.thigh, legL.calf, legL.foot);
  buildLeg(legR.thigh, legR.calf, legR.foot);

  // Soft contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 16),
    new THREE.MeshBasicMaterial({
      color: 0x101410,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const dispose = () => {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
        else m.material.dispose();
      }
    });
  };

  return {
    root,
    bones,
    boneCount: Object.keys(bones).length,
    shadowDisc,
    hatMesh,
    dispose,
  };
}

export function animateContestantRig(
  rig: ContestantRig,
  state: ContestantAnimState,
  phaseTime: number,
  gaitDistance: number
): void {
  const { bones } = rig;
  const pelvis = bones['pelvis'];
  const spine01 = bones['spine_01'];
  const head = bones['Head'];
  const upperL = bones['upperarm_l'];
  const upperR = bones['upperarm_r'];
  const lowerL = bones['lowerarm_l'];
  const lowerR = bones['lowerarm_r'];
  const thighL = bones['thigh_l'];
  const thighR = bones['thigh_r'];
  const calfL = bones['calf_l'];
  const calfR = bones['calf_r'];

  pelvis.position.y = 0.82;
  pelvis.rotation.set(0, 0, 0);
  spine01.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  upperL.rotation.set(0, 0, 0.12);
  upperR.rotation.set(0, 0, -0.12);
  lowerL.rotation.set(0, 0, 0);
  lowerR.rotation.set(0, 0, 0);
  thighL.rotation.set(0, 0, 0);
  thighR.rotation.set(0, 0, 0);
  calfL.rotation.set(0, 0, 0);
  calfR.rotation.set(0, 0, 0);

  if (state === 'idle') {
    const breath = Math.sin(phaseTime * 2.2);
    pelvis.position.y = 0.82 + breath * 0.015;
    upperL.rotation.x = breath * 0.04;
    upperR.rotation.x = -breath * 0.04;
    head.rotation.y = Math.sin(phaseTime * 0.9) * 0.14;
    return;
  }

  if (state === 'walk' || state === 'run' || state === 'dash') {
    const cycle = gaitDistance * (state === 'walk' ? 2.8 : 3.2);
    const amp = state === 'walk' ? 0.55 : state === 'dash' ? 1.05 : 0.88;
    const s = Math.sin(cycle);
    const c = Math.cos(cycle);

    pelvis.position.y = 0.82 + Math.abs(c) * (state === 'walk' ? 0.04 : 0.08);
    spine01.rotation.x = state === 'walk' ? 0.08 : state === 'dash' ? 0.34 : 0.2;

    thighL.rotation.x = s * amp;
    thighR.rotation.x = -s * amp;
    calfL.rotation.x = Math.max(0, -s * amp * 0.85);
    calfR.rotation.x = Math.max(0, s * amp * 0.85);

    upperL.rotation.x = -s * amp * 0.85;
    upperR.rotation.x = s * amp * 0.85;
    lowerL.rotation.x = -0.45;
    lowerR.rotation.x = -0.45;
    return;
  }

  if (state === 'jump') {
    pelvis.position.y = 0.88;
    spine01.rotation.x = -0.1;
    thighL.rotation.x = -0.55;
    calfL.rotation.x = 0.85;
    thighR.rotation.x = 0.35;
    upperL.rotation.z = 0.65;
    upperR.rotation.z = -0.65;
    upperL.rotation.x = -0.4;
    upperR.rotation.x = -0.4;
    return;
  }

  if (state === 'panic') {
    const wave = Math.sin(phaseTime * 12);
    const cycle = gaitDistance * 3.8;
    pelvis.position.y = 0.82 + Math.abs(Math.sin(cycle)) * 0.09;
    spine01.rotation.z = wave * 0.12;
    upperL.rotation.z = 2.1 + wave * 0.35;
    upperR.rotation.z = -2.1 - wave * 0.35;
    thighL.rotation.x = Math.sin(cycle) * 0.95;
    thighR.rotation.x = -Math.sin(cycle) * 0.95;
    head.rotation.y = wave * 0.28;
    return;
  }

  if (state === 'eliminated') {
    pelvis.position.y = 0.42;
    pelvis.rotation.x = -1.35;
    upperL.rotation.z = 0.9;
    upperR.rotation.z = -0.9;
  }
}
