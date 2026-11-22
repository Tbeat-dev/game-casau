import * as THREE from 'three';

export interface CrocodileRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  jawPivot: THREE.Group;
  tailSegments: THREE.Group[];
  legs: {
    fl: THREE.Group;
    fr: THREE.Group;
    bl: THREE.Group;
    br: THREE.Group;
  };
  eyes: THREE.Mesh[];
  warningRing: THREE.Mesh;
  visionCone: THREE.Mesh;
  dispose: () => void;
}

function createCrocScaleTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#2d4b2b';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#606060';
  bCtx.fillRect(0, 0, size, size);

  const rows = 12;
  const cols = 12;
  const cw = size / cols;
  const ch = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + (r % 2 === 0 ? 0 : cw * 0.35);
      const y = r * ch;
      const shade = ((r * 7 + c * 13) % 5) * 6;
      ctx.fillStyle = `rgb(${38 + shade}, ${72 + shade}, ${38 + Math.floor(shade / 2)})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, cw - 4, ch - 4, 4);
      ctx.fill();

      ctx.strokeStyle = '#1b2e19';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      bCtx.fillStyle = `rgb(${150 + shade * 4}, ${150 + shade * 4}, ${150 + shade * 4})`;
      bCtx.beginPath();
      bCtx.roundRect(x + 3, y + 3, cw - 6, ch - 6, 3);
      bCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

export function createCrocodileRig(): CrocodileRig {
  const root = new THREE.Group();
  root.name = 'croc_main';

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const { map, bumpMap } = createCrocScaleTexture();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map,
    bumpMap,
    bumpScale: 0.08,
    roughness: 0.65,
    metalness: 0.08,
  });

  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xc2b27c,
    roughness: 0.78,
    metalness: 0.04,
  });

  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x1e351c,
    roughness: 0.45,
    metalness: 0.12,
  });

  const teethMat = new THREE.MeshStandardMaterial({
    color: 0xf6eedc,
    roughness: 0.25,
    metalness: 0.05,
  });

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffb300,
    emissive: 0xff6a00,
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.1,
  });

  // 1. Primary Torso (sculpted tapered ellipsoid + shoulder/neck collar + belly)
  const torsoGeo = new THREE.SphereGeometry(0.74, 16, 12);
  torsoGeo.scale(1.06, 0.56, 1.85);
  const torso = new THREE.Mesh(torsoGeo, skinMat);
  torso.position.set(0, 0.42, 0.02);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  const neckGeo = new THREE.CylinderGeometry(0.42, 0.56, 0.58, 12);
  neckGeo.rotateX(Math.PI / 2);
  neckGeo.scale(1.08, 0.64, 1);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, 0.44, 1.08);
  neck.castShadow = true;
  bodyPivot.add(neck);

  const bellyGeo = new THREE.SphereGeometry(0.64, 14, 10);
  bellyGeo.scale(0.98, 0.36, 1.75);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0, 0.23, 0.05);
  bodyPivot.add(belly);

  // Dorsal osteoderm scute ridges along back
  const scuteGeo = new THREE.ConeGeometry(0.105, 0.24, 5);
  for (let i = 0; i < 6; i++) {
    const zPos = 0.86 - i * 0.34;
    const archY = 0.72 + Math.cos(((i - 2.5) / 3) * 1.1) * 0.08;
    const leftScute = new THREE.Mesh(scuteGeo, ridgeMat);
    leftScute.position.set(-0.22, archY, zPos);
    leftScute.rotation.z = 0.16;
    leftScute.castShadow = true;
    bodyPivot.add(leftScute);

    const rightScute = new THREE.Mesh(scuteGeo, ridgeMat);
    rightScute.position.set(0.22, archY, zPos);
    rightScute.rotation.z = -0.16;
    rightScute.castShadow = true;
    bodyPivot.add(rightScute);
  }

  // 2. Head & Articulated Snout/Jaw (+Z is forward)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.46, 1.24);
  bodyPivot.add(headGroup);

  // Sculpted dome cranium (no boxy cube)
  const craniumGeo = new THREE.SphereGeometry(0.5, 14, 10);
  craniumGeo.scale(0.95, 0.44, 0.88);
  const cranium = new THREE.Mesh(craniumGeo, skinMat);
  cranium.position.set(0, 0.08, 0.28);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Cheek plates tapering forward
  const cheekGeo = new THREE.SphereGeometry(0.42, 12, 10);
  cheekGeo.scale(1.06, 0.36, 0.78);
  const cheek = new THREE.Mesh(cheekGeo, skinMat);
  cheek.position.set(0, 0.02, 0.44);
  headGroup.add(cheek);

  // Tapered upper snout + rounded snout tip + nostrils
  const upperSnoutGeo = new THREE.CylinderGeometry(0.22, 0.39, 1.08, 12);
  upperSnoutGeo.rotateX(Math.PI / 2);
  upperSnoutGeo.scale(1.14, 0.46, 1);
  const upperSnout = new THREE.Mesh(upperSnoutGeo, skinMat);
  upperSnout.position.set(0, 0.03, 1.02);
  upperSnout.castShadow = true;
  headGroup.add(upperSnout);

  const snoutTipGeo = new THREE.SphereGeometry(0.24, 12, 10);
  snoutTipGeo.scale(1.12, 0.52, 0.95);
  const snoutTip = new THREE.Mesh(snoutTipGeo, skinMat);
  snoutTip.position.set(0, 0.02, 1.54);
  snoutTip.castShadow = true;
  headGroup.add(snoutTip);

  const nostrilGeo = new THREE.SphereGeometry(0.055, 8, 8);
  nostrilGeo.scale(1.1, 0.65, 1.2);
  const nostrilL = new THREE.Mesh(nostrilGeo, ridgeMat);
  nostrilL.position.set(-0.1, 0.13, 1.52);
  const nostrilR = new THREE.Mesh(nostrilGeo, ridgeMat);
  nostrilR.position.set(0.1, 0.13, 1.52);
  headGroup.add(nostrilL, nostrilR);

  // Brow ridges, glowing amber eyes & dark reptile slit pupils
  const browGeo = new THREE.SphereGeometry(0.14, 10, 8);
  browGeo.scale(0.78, 0.54, 1.18);
  const browL = new THREE.Mesh(browGeo, ridgeMat);
  browL.position.set(-0.22, 0.28, 0.35);
  const browR = new THREE.Mesh(browGeo, ridgeMat);
  browR.position.set(0.22, 0.28, 0.35);
  headGroup.add(browL, browR);

  const eyeGeo = new THREE.SphereGeometry(0.105, 12, 10);
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x10110e, roughness: 0.2 });
  const pupilGeo = new THREE.SphereGeometry(0.068, 8, 8);
  pupilGeo.scale(0.32, 0.96, 0.65);

  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.31, 0.24, 0.39);
  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(-0.045, 0, 0.075);
  eyeL.add(pupilL);

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.31, 0.24, 0.39);
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
  pupilR.position.set(0.045, 0, 0.075);
  eyeR.add(pupilR);

  headGroup.add(eyeL, eyeR);

  // Upper teeth row
  const toothGeo = new THREE.ConeGeometry(0.034, 0.11, 5);
  toothGeo.rotateX(Math.PI);
  for (let i = 0; i < 5; i++) {
    const zT = 0.66 + i * 0.21;
    const xT = 0.30 - i * 0.025;
    const tL = new THREE.Mesh(toothGeo, teethMat);
    tL.position.set(-xT, -0.07, zT);
    const tR = new THREE.Mesh(toothGeo, teethMat);
    tR.position.set(xT, -0.07, zT);
    headGroup.add(tL, tR);
  }

  // Hinged Lower Jaw (green outer shell + pale underside + lower teeth)
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.04, 0.24);
  headGroup.add(jawPivot);

  const lowerJawGeo = new THREE.CylinderGeometry(0.21, 0.37, 1.24, 12);
  lowerJawGeo.rotateX(Math.PI / 2);
  lowerJawGeo.scale(1.08, 0.34, 1);
  const lowerJaw = new THREE.Mesh(lowerJawGeo, skinMat);
  lowerJaw.position.set(0, -0.04, 0.72);
  lowerJaw.castShadow = true;
  jawPivot.add(lowerJaw);

  const lowerTipGeo = new THREE.SphereGeometry(0.21, 10, 8);
  lowerTipGeo.scale(1.06, 0.4, 0.9);
  const lowerTip = new THREE.Mesh(lowerTipGeo, skinMat);
  lowerTip.position.set(0, -0.04, 1.32);
  jawPivot.add(lowerTip);

  const lowerUnderside = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    bellyMat
  );
  lowerUnderside.scale.set(0.9, 0.28, 1.85);
  lowerUnderside.position.set(0, -0.09, 0.76);
  jawPivot.add(lowerUnderside);

  const lowerToothGeo = new THREE.ConeGeometry(0.028, 0.09, 5);
  for (let i = 0; i < 4; i++) {
    const zT = 0.56 + i * 0.21;
    const xT = 0.24 - i * 0.022;
    const ltL = new THREE.Mesh(lowerToothGeo, teethMat);
    ltL.position.set(-xT, 0.03, zT);
    const ltR = new THREE.Mesh(lowerToothGeo, teethMat);
    ltR.position.set(xT, 0.03, zT);
    jawPivot.add(ltL, ltR);
  }

  // 3. Articulated 4-Segment Tail (-Z direction)
  const tailSegments: THREE.Group[] = [];
  let parentTail: THREE.Object3D = bodyPivot;
  const prevZ = -1.08;
  const tailWidths = [0.46, 0.35, 0.24, 0.14];
  const tailLengths = [0.85, 0.78, 0.72, 0.65];

  for (let i = 0; i < 4; i++) {
    const segGroup = new THREE.Group();
    segGroup.position.set(0, i === 0 ? 0.38 : 0, i === 0 ? prevZ : -tailLengths[i - 1] * 0.85);
    parentTail.add(segGroup);

    const wTop = tailWidths[i] * 0.74;
    const wBot = tailWidths[i];
    const segGeo = new THREE.CylinderGeometry(wTop, wBot, tailLengths[i], 10);
    segGeo.rotateX(-Math.PI / 2);
    segGeo.scale(1.06, 0.68, 1);
    const segMesh = new THREE.Mesh(segGeo, skinMat);
    segMesh.position.set(0, 0, -tailLengths[i] * 0.45);
    segMesh.castShadow = true;
    segGroup.add(segMesh);

    const jointSphere = new THREE.Mesh(new THREE.SphereGeometry(wBot * 0.92, 8, 8), skinMat);
    jointSphere.scale.set(1.04, 0.68, 0.9);
    segGroup.add(jointSphere);

    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 5), ridgeMat);
    fin.position.set(0, tailWidths[i] * 0.54, -tailLengths[i] * 0.45);
    segGroup.add(fin);

    tailSegments.push(segGroup);
    parentTail = segGroup;
  }

  // 4. Four Articulated Legs with Shoulders & Splayed Clawed Feet
  const toeGeo = new THREE.ConeGeometry(0.045, 0.22, 5);
  toeGeo.rotateX(Math.PI / 2);
  const makeLeg = (side: number, zPos: number): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.58, 0.32, zPos);
    bodyPivot.add(legPivot);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), skinMat);
    legPivot.add(shoulder);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.46, 8), skinMat);
    upper.rotation.z = side * 0.72;
    upper.position.set(side * 0.17, -0.08, 0);
    upper.castShadow = true;
    legPivot.add(upper);

    const footPad = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), ridgeMat);
    footPad.scale.set(1.0, 0.42, 1.35);
    footPad.position.set(side * 0.32, -0.25, 0.06);
    footPad.castShadow = true;
    legPivot.add(footPad);

    for (let t = -1; t <= 1; t++) {
      const toe = new THREE.Mesh(toeGeo, ridgeMat);
      toe.position.set(side * 0.32 + t * 0.085, -0.27, 0.2);
      toe.rotation.y = t * 0.28 + side * 0.12;
      legPivot.add(toe);
    }

    return legPivot;
  };

  const legs = {
    fl: makeLeg(-1, 0.78),
    fr: makeLeg(1, 0.78),
    bl: makeLeg(-1, -0.74),
    br: makeLeg(1, -0.74),
  };

  // Telegraph ring (for windup/attack)
  const warningRing = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 1.82, 28),
    new THREE.MeshBasicMaterial({
      color: 0xb3261e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  warningRing.rotation.x = -Math.PI / 2;
  warningRing.position.y = 0.15;
  root.add(warningRing);

  // Vision cone (revealed by Mắt Cú skill) — aligned forward along +Z!
  const coneGeo = new THREE.CircleGeometry(1, 28, -Math.PI / 4, Math.PI / 2);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.rotateY(-Math.PI / 2); // +X -> +Z (matches snout heading)
  const visionCone = new THREE.Mesh(
    coneGeo,
    new THREE.MeshBasicMaterial({
      color: 0xe0a526,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  visionCone.position.y = 0.16;
  visionCone.visible = false;
  root.add(visionCone);

  const dispose = () => {
    map.dispose();
    bumpMap.dispose();
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
    bodyPivot,
    headGroup,
    jawPivot,
    tailSegments,
    legs,
    eyes: [eyeL, eyeR],
    warningRing,
    visionCone,
    dispose,
  };
}

export function animateCrocodileRig(
  rig: CrocodileRig,
  time: number,
  speed: number,
  state: string,
  attackProgress: number
): void {
  const swimFreq = 3.2 + speed * 0.55;
  const tailAmp = state === 'CHASE' || state === 'ATTACK' ? 0.34 : 0.22;

  // Undulating S-wave tail
  rig.tailSegments.forEach((seg, idx) => {
    seg.rotation.y = Math.sin(time * swimFreq - idx * 0.75) * (tailAmp + idx * 0.06);
  });

  // Body sway & attack pitch
  rig.bodyPivot.rotation.y = Math.sin(time * swimFreq + 0.8) * 0.06;
  rig.bodyPivot.position.y = state === 'STUNNED' ? 0.15 : Math.sin(time * 2.4) * 0.04;
  rig.bodyPivot.rotation.z = state === 'STUNNED' ? Math.sin(time * 18) * 0.18 : 0;
  rig.bodyPivot.rotation.x =
    state === 'ATTACK'
      ? attackProgress < 0.45
        ? -0.14 * (attackProgress / 0.45)
        : 0.12 * Math.sin(((attackProgress - 0.45) / 0.55) * Math.PI)
      : 0;

  // Leg paddle / crawl cycle
  const legSwing = Math.min(0.65, speed * 0.09);
  const phase = time * (2.6 + speed * 0.7);
  rig.legs.fl.rotation.y = Math.sin(phase) * legSwing;
  rig.legs.br.rotation.y = Math.sin(phase) * legSwing;
  rig.legs.fr.rotation.y = -Math.sin(phase) * legSwing;
  rig.legs.bl.rotation.y = -Math.sin(phase) * legSwing;

  // Jaw open on DETECT / CHASE / ATTACK
  let targetJaw = 0.08 + Math.sin(time * 2) * 0.04;
  if (state === 'DETECT') targetJaw = 0.36;
  else if (state === 'CHASE') targetJaw = 0.3 + Math.sin(time * 8) * 0.12;
  else if (state === 'ATTACK') {
    // Windup wide open then snap shut
    targetJaw = attackProgress < 0.52 ? 0.76 : 0.03;
  } else if (state === 'STUNNED') {
    targetJaw = 0.22;
  }
  rig.jawPivot.rotation.x = targetJaw;

  // Eye intensity & warning ring
  const eyeMat = rig.eyes[0].material as THREE.MeshStandardMaterial;
  const ringMat = rig.warningRing.material as THREE.MeshBasicMaterial;
  if (state === 'ATTACK' || state === 'CHASE') {
    eyeMat.emissive.setHex(0xff1e00);
    eyeMat.emissiveIntensity = 1.6;
    ringMat.opacity = state === 'ATTACK' ? 0.78 : 0.35;
    rig.warningRing.scale.setScalar(1 + Math.sin(time * 12) * 0.08);
  } else if (state === 'DETECT' || state === 'LURED') {
    eyeMat.emissive.setHex(0xe0a526);
    eyeMat.emissiveIntensity = 1.2;
    ringMat.opacity = 0.25;
  } else {
    eyeMat.emissive.setHex(0xff8c00);
    eyeMat.emissiveIntensity = 0.7;
    ringMat.opacity = 0;
  }
}
