import * as THREE from 'three';
import { WORLD } from './config.js';
import {
  createRoadTexture,
  createIntersectionTexture,
  createSidewalkTexture,
  createBoardwalkTexture,
  createSandTexture,
  createOceanTexture,
  createArtDecoFacadeTexture,
  createSkyscraperTexture,
  createContainerTexture,
  createPlazaTileTexture,
  createNeonSignTexture,
} from './textures.js';

export function buildCity(scene) {
  const colliders = [];
  const minimapBuildings = [];
  const ramps = [];
  const animated = {
    oceanTex: null,
    surfMesh: null,
    yachts: [],
    fountainDrops: [],
    resprayRing: null,
    palms: [],
  };

  const addCollider = (x, z, w, d, color = '#2a3352') => {
    colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
    });
    minimapBuildings.push({ x: x - w * 0.5, z: z - d * 0.5, w, d, color });
  };

  // 1. Sunset Sky Dome (custom ShaderMaterial)
  const skyGeo = new THREE.SphereGeometry(540, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color('#191445') },
      uMidColor: { value: new THREE.Color('#8e326d') },
      uHorizonColor: { value: new THREE.Color('#ff8e53') },
      uGlowColor: { value: new THREE.Color('#ffe08c') },
      uSunDir: { value: new THREE.Vector3(-0.35, 0.24, -0.9).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGlowColor;
      uniform vec3 uSunDir;
      varying vec3 vWorldDir;
      void main() {
        vec3 d = normalize(vWorldDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.26, h));
        col = mix(col, uTopColor, smoothstep(0.22, 0.72, h));
        float sunAmt = max(dot(d, uSunDir), 0.0);
        col += uGlowColor * pow(sunAmt, 10.0) * 0.55;
        col += vec3(1.0, 0.96, 0.82) * smoothstep(0.992, 0.997, sunAmt);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // 2. Base ground / sidewalk slab
  const sidewalkTex = createSidewalkTexture();
  const baseGround = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 420),
    new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.92 })
  );
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.set(-28, 0, 0);
  baseGround.receiveShadow = true;
  scene.add(baseGround);

  // Boardwalk along Coral Strip
  const boardwalkTex = createBoardwalkTexture();
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.22, 390),
    new THREE.MeshStandardMaterial({ map: boardwalkTex, roughness: 0.85 })
  );
  boardwalk.position.set(WORLD.boardwalkX, 0.08, 0);
  boardwalk.receiveShadow = true;
  scene.add(boardwalk);

  // Sandy Beach
  const sandTex = createSandTexture();
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(52, 430),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(180, 0.02, 0);
  beach.receiveShadow = true;
  scene.add(beach);

  // Shimmering Ocean
  const oceanTex = createOceanTexture();
  animated.oceanTex = oceanTex;
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 620),
    new THREE.MeshStandardMaterial({
      map: oceanTex,
      color: 0x1aa4d9,
      roughness: 0.22,
      metalness: 0.35,
      emissive: 0x06253b,
      emissiveIntensity: 0.45,
    })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(360, -0.15, 0);
  scene.add(ocean);

  // Animated Surf Foam Strip
  const surfMat = new THREE.MeshBasicMaterial({
    color: 0xe6fbff,
    transparent: true,
    opacity: 0.72,
  });
  const surfMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 430), surfMat);
  surfMesh.rotation.x = -Math.PI / 2;
  surfMesh.position.set(203.5, 0.05, 0);
  scene.add(surfMesh);
  animated.surfMesh = surfMesh;

  // 3. 5x5 Road Grid + Crosswalk Intersections
  const roadTexNS = createRoadTexture();
  roadTexNS.repeat.set(1, 20);
  const roadTexEW = createRoadTexture();
  roadTexEW.repeat.set(1, 20);
  const interTex = createIntersectionTexture();

  const roadMatNS = new THREE.MeshStandardMaterial({ map: roadTexNS, roughness: 0.78 });
  const roadMatEW = new THREE.MeshStandardMaterial({ map: roadTexEW, roughness: 0.78 });
  const interMat = new THREE.MeshStandardMaterial({ map: interTex, roughness: 0.76 });

  for (const x of WORLD.roadCoords) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, 340), roadMatNS);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.04, 0);
    road.receiveShadow = true;
    scene.add(road);
  }
  for (const z of WORLD.roadCoords) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, 296), roadMatEW);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(0, 0.045, z);
    road.receiveShadow = true;
    scene.add(road);
  }
  for (const x of WORLD.roadCoords) {
    for (const z of WORLD.roadCoords) {
      const inter = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.roadWidth + 0.6, WORLD.roadWidth + 0.6),
        interMat
      );
      inter.rotation.x = -Math.PI / 2;
      inter.position.set(x, 0.055, z);
      inter.receiveShadow = true;
      scene.add(inter);
    }
  }

  // Helper: Neon Strip & Neon Sign Board
  const addNeonStrip = (x, y, z, w, h, d, color) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };

  const addSignBoard = (x, y, z, w, h, rotY, label, primaryHex, borderHex) => {
    const tex = createNeonSignTexture(label, primaryHex, borderHex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    return mesh;
  };

  // 4. Glowing "SOLMARA BAY" Neon Archway over Coral Strip (X=140, Z=-24)
  {
    const ax = WORLD.coralArchPos.x;
    const az = WORLD.coralArchPos.z;
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf7e6d4, roughness: 0.45, metalness: 0.15 });
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

    for (const side of [-1, 1]) {
      const px = ax + side * 9.6;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 13.5, 2.2), pillarMat);
      pillar.position.set(px, 6.75, az);
      pillar.castShadow = true;
      scene.add(pillar);
      addCollider(px, az, 2.1, 2.4, '#ff2e93');

      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 12.8, 2.45), trimMat);
      rib.position.set(px - side * 0.95, 6.5, az);
      scene.add(rib);
    }

    const header = new THREE.Mesh(
      new THREE.BoxGeometry(21.4, 3.8, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1d1138, roughness: 0.35, metalness: 0.4 })
    );
    header.position.set(ax, 12.6, az);
    header.castShadow = true;
    scene.add(header);

    addNeonStrip(ax, 14.6, az, 21.6, 0.32, 1.8, 0xff2e93);
    addNeonStrip(ax, 10.65, az, 21.6, 0.28, 1.8, 0x00f5ff);

    // Double-sided glowing SOLMARA BAY sign
    addSignBoard(ax, 12.6, az + 0.85, 19.6, 3.3, 0, 'SOLMARA BAY', '#ff5cc8', '#00f5ff');
    addSignBoard(ax, 12.6, az - 0.85, 19.6, 3.3, Math.PI, 'SOLMARA BAY', '#ff5cc8', '#00f5ff');

    const archGlow = new THREE.PointLight(0xff4fa3, 40, 32);
    archGlow.position.set(ax, 10.2, az);
    scene.add(archGlow);
  }

  // 5. Building Materials
  const decoTextures = [
    createArtDecoFacadeTexture('#ff9c8a', '#fff0d6', '#ffe6a3'),
    createArtDecoFacadeTexture('#5ce1d6', '#f7ede2', '#fff0a6'),
    createArtDecoFacadeTexture('#f8d59a', '#ff7096', '#ffea99'),
    createArtDecoFacadeTexture('#f4b6c2', '#47f3ff', '#ffe299'),
  ];
  const skyTextures = [
    createSkyscraperTexture('#2d4b73', '#f4c96b'),
    createSkyscraperTexture('#223c63', '#00e5ff'),
    createSkyscraperTexture('#3e2d5c', '#ff9b54'),
  ];
  const containerColors = ['#e63946', '#2a9d8f', '#e9c46a', '#3a86ff', '#f77f00'];
  const containerMats = containerColors.map(
    (c) => new THREE.MeshStandardMaterial({ map: createContainerTexture(c), roughness: 0.72, metalness: 0.25 })
  );

  // 6. Populate City Blocks (block centers at -105, -35, 35, 105 on both X and Z)
  const blockCenters = [-105, -35, 35, 105];
  const hotelNames = ['HOTEL SOLMARA', 'PALM ROYALE', 'CORAL CLUB', 'NEON PALMS'];
  let hotelIdx = 0;

  for (const bx of blockCenters) {
    for (const bz of blockCenters) {
      // Special Block 1: Downtown Neon Fountain Plaza at (35, 35)
      if (bx === 35 && bz === 35) {
        buildFountainPlaza(scene, bx, bz, animated, addCollider, addNeonStrip);
        continue;
      }

      // Special Block 2: Sunset Auto Respray Garage at (-35, 105)
      if (bx === -35 && bz === 105) {
        buildSunsetAutoBlock(scene, bx, bz, animated, addCollider, addNeonStrip, addSignBoard);
        continue;
      }

      // Special Block 3: Harbor Container Yard at (35, 105)
      if (bx === 35 && bz === 105) {
        buildContainerYard(scene, bx, bz, containerMats, addCollider);
        continue;
      }

      // Coral Strip Art-Deco Beachfront Hotels (bx === 105)
      if (bx === 105) {
        const tex = decoTextures[hotelIdx % decoTextures.length];
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.58 });
        const h = bz === 105 ? 18 : 22 + (hotelIdx % 2) * 8;
        const w = 32;
        const d = 34;

        const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        base.position.set(bx, h * 0.5, bz);
        base.castShadow = true;
        base.receiveShadow = true;
        scene.add(base);
        addCollider(bx, bz, w, d, '#ff7fa7');

        // Stepped Art-Deco crown
        const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 5.5, d * 0.58), mat);
        crown.position.set(bx, h + 2.75, bz);
        crown.castShadow = true;
        scene.add(crown);

        const neonColor = hotelIdx % 2 === 0 ? 0xff2e93 : 0x00f5ff;
        const neonColor2 = hotelIdx % 2 === 0 ? 0x00f5ff : 0xffd166;
        addNeonStrip(bx, h + 0.15, bz + d * 0.5 + 0.12, w + 0.4, 0.38, 0.24, neonColor);
        addNeonStrip(bx + w * 0.5 + 0.12, h + 0.15, bz, 0.24, 0.38, d + 0.4, neonColor);
        addNeonStrip(bx + w * 0.5 + 0.15, 6.2, bz, 0.25, 0.3, d + 0.4, neonColor2);

        const label = hotelNames[hotelIdx % hotelNames.length];
        // Facing Coral Strip (East)
        addSignBoard(
          bx + w * 0.5 + 0.35,
          h - 3.2,
          bz,
          16,
          3.4,
          Math.PI / 2,
          label,
          hotelIdx % 2 === 0 ? '#00f5ff' : '#ffd166',
          '#ff2e93'
        );
        hotelIdx++;
        continue;
      }

      // Solmara Downtown Skyscrapers (bx in [-35, 35], bz in [-35, 35] or [-105])
      if (bx >= -35 && bx <= 35 && bz <= 35) {
        const subOffsets = [
          [-10.5, -10.5, 19, 19, 36 + Math.abs(bx + bz) % 16],
          [11, 10, 18, 20, 48 + Math.abs(bx * 3 - bz) % 24],
          [-10, 11.5, 16, 15, 28 + Math.abs(bz) % 14],
        ];
        subOffsets.forEach(([ox, oz, w, d, h], idx) => {
          const tex = skyTextures[(idx + Math.abs(bx + bz)) % skyTextures.length];
          const mat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.32,
            metalness: 0.45,
          });
          const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          tower.position.set(bx + ox, h * 0.5, bz + oz);
          tower.castShadow = true;
          tower.receiveShadow = true;
          scene.add(tower);
          addCollider(bx + ox, bz + oz, w, d, '#4b6b9c');

          const crownCol = idx === 1 ? 0x00f0ff : idx === 0 ? 0xffd166 : 0xff2e93;
          addNeonStrip(bx + ox, h + 0.25, bz + oz, w + 0.3, 0.42, d + 0.3, crownCol);
        });
        continue;
      }

      // Harbor Industrial Warehouses (-105, 105)
      if (bx === -105 && bz === 105) {
        const wh = new THREE.Mesh(
          new THREE.BoxGeometry(34, 11, 24),
          new THREE.MeshStandardMaterial({ color: 0x3b485e, roughness: 0.8, metalness: 0.2 })
        );
        wh.position.set(bx, 5.5, bz - 4);
        wh.castShadow = true;
        wh.receiveShadow = true;
        scene.add(wh);
        addCollider(bx, bz - 4, 34, 24, '#506480');
        addNeonStrip(bx, 11.1, bz + 8.1, 34, 0.3, 0.3, 0x00f0ff);
        continue;
      }

      // Sunset Hills Pastel Villas (bx === -105 or bz === -105)
      const isCartelVilla = bx === -105 && bz === -105;
      const villaCol = isCartelVilla ? '#f5d0a9' : (bx + bz) % 2 === 0 ? '#f7d8ba' : '#a8e6cf';
      const villaMat = new THREE.MeshStandardMaterial({ color: villaCol, roughness: 0.65 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xc95f3c, roughness: 0.72 });

      // Terraced patio plinth
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(38, 1.4, 38),
        new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.85 })
      );
      plinth.position.set(bx, 0.7, bz);
      plinth.receiveShadow = true;
      scene.add(plinth);

      // Villa main wing
      const mainH = isCartelVilla ? 11 : 8.5;
      const vw = isCartelVilla ? 22 : 18;
      const vd = 15;
      const villa = new THREE.Mesh(new THREE.BoxGeometry(vw, mainH, vd), villaMat);
      villa.position.set(bx - 4, 1.4 + mainH * 0.5, bz - 8);
      villa.castShadow = true;
      villa.receiveShadow = true;
      scene.add(villa);
      addCollider(bx - 4, bz - 8, vw, vd, '#e2a36b');

      const roof = new THREE.Mesh(new THREE.BoxGeometry(vw + 1.4, 1.2, vd + 1.4), roofMat);
      roof.position.set(bx - 4, 1.4 + mainH + 0.6, bz - 8);
      scene.add(roof);

      // Turquoise infinity pool
      const pool = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.25, 10),
        new THREE.MeshStandardMaterial({
          color: 0x00e5ff,
          emissive: 0x006680,
          emissiveIntensity: 0.6,
          roughness: 0.15,
        })
      );
      pool.position.set(bx + 6, 1.45, bz + 9);
      scene.add(pool);
      if (isCartelVilla) {
        addNeonStrip(bx - 4, 1.4 + mainH + 0.1, bz - 0.3, vw, 0.3, 0.3, 0xff2e93);
      }
    }
  }

  // 7. Marina Piers, "SOLMARA MARINA" Neon Sign, and Bobbing Yachts
  buildMarinaAndBeachProps(scene, animated, addCollider, addNeonStrip, addSignBoard);

  // 8. Palm Trees & Glowing Streetlamps along avenues and Coral Strip
  buildPalmsAndLamps(scene, animated);

  // 9. Stunt Ramps for Arcade Jumps
  const rampSpecs = [
    { x: 140, z: -102, rotY: Math.PI, w: 6.5, l: 13, h: 2.8 },
    { x: 0, z: -36, rotY: 0, w: 6.5, l: 12, h: 2.6 },
    { x: 70, z: 105, rotY: Math.PI / 2, w: 6.5, l: 12, h: 2.5 },
    { x: -70, z: -35, rotY: 0, w: 6.5, l: 12, h: 2.7 },
  ];
  for (const r of rampSpecs) {
    const wedge = createRampMesh(r.w, r.h, r.l);
    wedge.position.set(r.x, 0, r.z);
    wedge.rotation.y = r.rotY;
    scene.add(wedge);
    ramps.push(r);
  }

  function resolveCircleCollision(x, z, radius) {
    let rx = x;
    let rz = z;
    let collided = false;
    let nx = 0;
    let nz = 0;

    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const cx = Math.max(b.minX, Math.min(rx, b.maxX));
      const cz = Math.max(b.minZ, Math.min(rz, b.maxZ));
      const dx = rx - cx;
      const dz = rz - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        collided = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          nx = dx / dist;
          nz = dz / dist;
          rx += nx * push;
          rz += nz * push;
        } else {
          // Inside AABB fallback: push to nearest edge
          const left = rx - b.minX;
          const right = b.maxX - rx;
          const top = rz - b.minZ;
          const bottom = b.maxZ - rz;
          const minEdge = Math.min(left, right, top, bottom);
          if (minEdge === left) { rx = b.minX - radius; nx = -1; }
          else if (minEdge === right) { rx = b.maxX + radius; nx = 1; }
          else if (minEdge === top) { rz = b.minZ - radius; nz = -1; }
          else { rz = b.maxZ + radius; nz = 1; }
        }
      }
    }

    // Clamp to playable world bounds
    if (rx < WORLD.bounds.minX + radius) { rx = WORLD.bounds.minX + radius; collided = true; nx = 1; }
    if (rx > WORLD.bounds.maxX - radius) { rx = WORLD.bounds.maxX - radius; collided = true; nx = -1; }
    if (rz < WORLD.bounds.minZ + radius) { rz = WORLD.bounds.minZ + radius; collided = true; nz = 1; }
    if (rz > WORLD.bounds.maxZ - radius) { rz = WORLD.bounds.maxZ - radius; collided = true; nz = -1; }

    return { x: rx, z: rz, collided, nx, nz };
  }

  function getRampHeight(x, z) {
    for (const r of ramps) {
      const dx = x - r.x;
      const dz = z - r.z;
      const cos = Math.cos(-r.rotY);
      const sin = Math.sin(-r.rotY);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= r.w * 0.52 && Math.abs(lz) <= r.l * 0.52) {
        const t = (lz + r.l * 0.5) / r.l;
        return Math.max(0, Math.min(r.h, t * r.h));
      }
    }
    return 0;
  }

  function update(dt, elapsed) {
    if (animated.oceanTex) {
      animated.oceanTex.offset.y = (elapsed * 0.06) % 1;
      animated.oceanTex.offset.x = Math.sin(elapsed * 0.35) * 0.04;
    }
    if (animated.surfMesh) {
      animated.surfMesh.position.x = 203.2 + Math.sin(elapsed * 2.1) * 1.1;
      animated.surfMesh.material.opacity = 0.55 + Math.sin(elapsed * 2.1) * 0.22;
    }
    for (const y of animated.yachts) {
      y.group.position.y = y.baseY + Math.sin(elapsed * 1.6 + y.phase) * 0.24;
      y.group.rotation.z = Math.sin(elapsed * 1.2 + y.phase) * 0.035;
      y.group.rotation.x = Math.cos(elapsed * 1.1 + y.phase) * 0.02;
    }
    for (const d of animated.fountainDrops) {
      const phase = (elapsed * 1.55 + d.offset) % 1;
      const r = phase * d.radius;
      const y = d.baseY + Math.sin(phase * Math.PI) * d.peak;
      d.mesh.position.set(d.cx + Math.cos(d.angle) * r, y, d.cz + Math.sin(d.angle) * r);
    }
    if (animated.resprayRing) {
      animated.resprayRing.rotation.z = elapsed * 0.9;
      animated.resprayRing.material.opacity = 0.55 + Math.sin(elapsed * 3.5) * 0.25;
    }
  }

  return {
    colliders,
    minimapBuildings,
    ramps,
    resolveCircleCollision,
    getRampHeight,
    update,
  };
}

function buildFountainPlaza(scene, bx, bz, animated, addCollider, addNeonStrip) {
  const tileTex = createPlazaTileTexture();
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(50, 0.24, 50),
    new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.65 })
  );
  floor.position.set(bx, 0.08, bz);
  floor.receiveShadow = true;
  scene.add(floor);

  // Outer plaza glowing accent trim
  addNeonStrip(bx, 0.24, bz - 24.5, 49, 0.14, 0.25, 0x00f0ff);
  addNeonStrip(bx, 0.24, bz + 24.5, 49, 0.14, 0.25, 0x00f0ff);
  addNeonStrip(bx - 24.5, 0.24, bz, 0.25, 0.14, 49, 0xff2e93);
  addNeonStrip(bx + 24.5, 0.24, bz, 0.25, 0.14, 49, 0xff2e93);

  // Tiered Art-Deco Neon Fountain in center
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf4ede4, roughness: 0.4 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.6, 1.1, 24), stoneMat);
  basin.position.set(bx, 0.65, bz);
  basin.castShadow = true;
  basin.receiveShadow = true;
  scene.add(basin);
  addCollider(bx, bz, 11.5, 11.5, '#00f0ff');

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 6.5, 0.2, 24),
    new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00c8ff,
      emissiveIntensity: 0.9,
      roughness: 0.15,
    })
  );
  water.position.set(bx, 1.15, bz);
  scene.add(water);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.9, 4.4, 16), stoneMat);
  spire.position.set(bx, 2.8, bz);
  scene.add(spire);

  const upperBowl = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 1.6, 0.55, 20), stoneMat);
  upperBowl.position.set(bx, 3.6, bz);
  scene.add(upperBowl);

  const upperRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.05, 0.1, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff })
  );
  upperRing.rotation.x = Math.PI / 2;
  upperRing.position.set(bx, 3.88, bz);
  scene.add(upperRing);

  // Low perimeter stone benches framing the open courtyard without blocking sightlines
  const benchMat = new THREE.MeshStandardMaterial({ color: 0xe6dcd0, roughness: 0.55 });
  for (const [ox, oz, bw, bd] of [
    [-16, 0, 1.2, 8],
    [16, 0, 1.2, 8],
    [0, -16, 8, 1.2],
    [0, 16, 8, 1.2],
  ]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.72, bd), benchMat);
    bench.position.set(bx + ox, 0.56, bz + oz);
    bench.castShadow = true;
    scene.add(bench);
  }

  const neonRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.85, 0.14, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0xff2e93 })
  );
  neonRing.rotation.x = Math.PI / 2;
  neonRing.position.set(bx, 1.25, bz);
  scene.add(neonRing);

  const fLight = new THREE.PointLight(0x00f0ff, 26, 26);
  fLight.position.set(bx, 4.2, bz);
  scene.add(fLight);

  // Animated arcing water droplets
  const dropGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const dropMat = new THREE.MeshBasicMaterial({ color: 0x9ef9ff });
  for (let arm = 0; arm < 12; arm++) {
    const angle = (arm / 12) * Math.PI * 2;
    for (let j = 0; j < 4; j++) {
      const mesh = new THREE.Mesh(dropGeo, dropMat);
      scene.add(mesh);
      animated.fountainDrops.push({
        mesh,
        cx: bx,
        cz: bz,
        angle,
        offset: j / 4,
        radius: 5.2,
        baseY: 1.4,
        peak: 4.5,
      });
    }
  }
}

function buildSunsetAutoBlock(scene, bx, bz, animated, addCollider, addNeonStrip, addSignBoard) {
  // Garage building in southern half of block
  const garage = new THREE.Mesh(
    new THREE.BoxGeometry(28, 9, 16),
    new THREE.MeshStandardMaterial({ color: 0x26293d, roughness: 0.65 })
  );
  garage.position.set(bx, 4.5, bz + 8);
  garage.castShadow = true;
  garage.receiveShadow = true;
  scene.add(garage);
  addCollider(bx, bz + 8, 28, 16, '#2ceaa3');

  addNeonStrip(bx, 9.15, bz, 28.4, 0.35, 0.35, 0x2ceaa3);
  addSignBoard(bx, 7.1, bz - 0.15, 16, 3.1, Math.PI, 'SUNSET AUTO', '#2ceaa3', '#ffd166');

  // Drive-in Respray Pad at (-35, 96)
  const pad = WORLD.resprayPad;
  const padDisc = new THREE.Mesh(
    new THREE.CircleGeometry(pad.radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x16d99a, transparent: true, opacity: 0.25 })
  );
  padDisc.rotation.x = -Math.PI / 2;
  padDisc.position.set(pad.x, 0.08, pad.z);
  scene.add(padDisc);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(pad.radius - 0.55, pad.radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x2ceaa3, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pad.x, 0.1, pad.z);
  scene.add(ring);
  animated.resprayRing = ring;
}

function buildContainerYard(scene, bx, bz, containerMats, addCollider) {
  const layout = [
    [-12, -10, 12, 4.5, 4.2, 0],
    [-12, -10, 12, 4.5, 4.2, 4.3],
    [10, -12, 12, 4.5, 4.2, 0],
    [12, 10, 4.5, 12, 4.2, 0],
    [-12, 12, 12, 4.5, 4.2, 0],
  ];
  layout.forEach(([ox, oz, w, d, h, yBase], idx) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), containerMats[idx % containerMats.length]);
    mesh.position.set(bx + ox, yBase + h * 0.5, bz + oz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (yBase === 0) addCollider(bx + ox, bz + oz, w, d, '#e9c46a');
  });

  // Harbor Gantry Crane arch
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xffa62b, roughness: 0.5, metalness: 0.35 });
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 17, 1.5), craneMat);
  leg1.position.set(bx - 18, 8.5, bz);
  const leg2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 17, 1.5), craneMat);
  leg2.position.set(bx + 18, 8.5, bz);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(40, 1.8, 2.2), craneMat);
  beam.position.set(bx, 17, bz);
  scene.add(leg1, leg2, beam);
}

function buildMarinaAndBeachProps(scene, animated, addCollider, addNeonStrip, addSignBoard) {
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8d5e3c, roughness: 0.85 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x4f3522, roughness: 0.9 });

  // Main Marina Pier (Z = 108) & Coral Pier (Z = -56)
  for (const pierZ of [WORLD.marinaPierZ, -56]) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(68, 0.55, 8.5), deckMat);
    deck.position.set(224, 0.72, pierZ);
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    for (let x = 195; x <= 255; x += 12) {
      for (const s of [-3.6, 3.6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 2.8, 8), postMat);
        post.position.set(x, -0.3, pierZ + s);
        scene.add(post);
      }
    }
    addNeonStrip(224, 1.05, pierZ - 4.1, 66, 0.14, 0.14, 0x00f0ff);
    addNeonStrip(224, 1.05, pierZ + 4.1, 66, 0.14, 0.14, 0xff2e93);
  }

  // "SOLMARA MARINA" glowing portal at beach entrance of Marina Pier (X=162, Z=108)
  const mpX = 160;
  const mpZ = WORLD.marinaPierZ;
  const mpMat = new THREE.MeshStandardMaterial({ color: 0xf4ece1, roughness: 0.45 });
  for (const dz of [-4.6, 4.6]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.8, 1.2), mpMat);
    col.position.set(mpX, 4.4, mpZ + dz);
    scene.add(col);
    addCollider(mpX, mpZ + dz, 1.4, 1.4, '#00f0ff');
  }
  const mpHeader = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 2.8, 11.4),
    new THREE.MeshStandardMaterial({ color: 0x13112b, roughness: 0.4 })
  );
  mpHeader.position.set(mpX, 8.4, mpZ);
  scene.add(mpHeader);
  addSignBoard(mpX - 0.72, 8.4, mpZ, 10.6, 2.4, -Math.PI / 2, 'SOLMARA MARINA', '#00f5ff', '#ff5cc8');
  addSignBoard(mpX + 0.72, 8.4, mpZ, 10.6, 2.4, Math.PI / 2, 'SOLMARA MARINA', '#00f5ff', '#ff5cc8');

  // Bobbing Luxury Yachts docked along the Marina & coastline
  const yachtSpecs = [
    { x: 222, z: 95, rotY: 0.12, accent: 0x00e5ff },
    { x: 236, z: 121, rotY: -0.18, accent: 0xff2e93 },
    { x: 228, z: -43, rotY: 0.25, accent: 0xffd166 },
    { x: 248, z: 32, rotY: 1.45, accent: 0x2ceaa3 },
  ];
  for (let i = 0; i < yachtSpecs.length; i++) {
    const ys = yachtSpecs[i];
    const g = createYachtMesh(ys.accent);
    g.position.set(ys.x, 0.3, ys.z);
    g.rotation.y = ys.rotY;
    scene.add(g);
    animated.yachts.push({ group: g, baseY: 0.3, phase: i * 1.4 });
  }

  // Beach Umbrellas & Lifeguard Towers
  const umbColors = [0xff2e93, 0x00e5ff, 0xffd166, 0xff7a45, 0x2ceaa3];
  for (let z = -125; z <= 135; z += 18) {
    if (Math.abs(z - WORLD.marinaPierZ) < 12 || Math.abs(z + 56) < 12) continue;
    const ux = 172 + ((Math.abs(z) * 7) % 14);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.1, 6),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee })
    );
    pole.position.set(ux, 1.55, z);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.3, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: umbColors[Math.abs(z) % umbColors.length], roughness: 0.65 })
    );
    canopy.position.set(ux, 3.1, z);
    canopy.castShadow = true;
    scene.add(pole, canopy);
  }

  for (const lz of [-92, 16, 78]) {
    const lg = new THREE.Group();
    const legMat = new THREE.MeshStandardMaterial({ color: 0xf7f1e3 });
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xff476f, roughness: 0.55 });
    for (const dx of [-1.2, 1.2]) {
      for (const dz of [-1.2, 1.2]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), legMat);
        leg.position.set(dx, 1.7, dz);
        lg.add(leg);
      }
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), legMat);
    deck.position.y = 3.4;
    const hut = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 2.5), cabMat);
    hut.position.y = 4.6;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.1, 4), legMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 6.2;
    lg.add(deck, hut, roof);
    lg.position.set(184, 0, lz);
    scene.add(lg);
  }
}

function createYachtMesh(accentColor) {
  const g = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x16243b, roughness: 0.12, metalness: 0.7 });
  const accentMat = new THREE.MeshBasicMaterial({ color: accentColor });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(15.5, 1.9, 4.6), whiteMat);
  hull.position.y = 0.6;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4.2, 4), whiteMat);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(9.6, 0.65, 0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.7, 3.4), whiteMat);
  cabin.position.set(-0.5, 2.35, 0);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.1, 2.7), glassMat);
  bridge.position.set(0.6, 3.55, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.22, 4.72), accentMat);
  stripe.position.y = 1.25;
  g.add(hull, bow, cabin, bridge, stripe);
  return g;
}

function buildPalmsAndLamps(scene, animated) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7d5738, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2ea062, roughness: 0.7, side: THREE.DoubleSide });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x262d42, metalness: 0.5, roughness: 0.4 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd89c });

  const addPalm = (x, z, scale = 1) => {
    const g = new THREE.Group();
    const h = 8.2 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.42 * scale, h, 7), trunkMat);
    trunk.position.y = h * 0.5;
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    g.add(trunk);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.95 * scale, 4.2 * scale, 4), frondMat);
      frond.position.set(Math.cos(a) * 1.45 * scale + 0.35, h - 0.1, Math.sin(a) * 1.45 * scale);
      frond.rotation.z = Math.PI / 2 - 0.42;
      frond.rotation.y = -a;
      g.add(frond);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    animated.palms.push(g);
  };

  // Coral Strip palm promenade & glowing boardwalk bollards
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x1d2336, metalness: 0.45, roughness: 0.4 });
  const bollardGlowCyan = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  const bollardGlowPink = new THREE.MeshBasicMaterial({ color: 0xff2e93 });
  for (let z = -150; z <= 150; z += 22) {
    if (Math.abs(z - WORLD.coralArchPos.z) < 10) continue;
    if (Math.abs(z - WORLD.marinaPierZ) < 18) continue;
    addPalm(152.5, z, 1.08);
    if (z % 44 === 0) addPalm(129.5, z + 6, 0.96);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.15, 8), bollardMat);
    post.position.set(148.5, 0.62, z + 11);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.24, 8),
      (Math.abs(z) / 22) % 2 === 0 ? bollardGlowCyan : bollardGlowPink
    );
    cap.position.set(148.5, 1.16, z + 11);
    scene.add(post, cap);
  }

  // Golden sunset shimmer glints floating gently across the ocean horizon
  const glintMat = new THREE.MeshBasicMaterial({
    color: 0xffc67a,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < 14; i++) {
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(16 + (i % 4) * 8, 2.6), glintMat);
    glint.rotation.x = -Math.PI / 2;
    glint.position.set(225 + (i % 5) * 24, 0.02, -135 + i * 21);
    scene.add(glint);
  }

  // Downtown Fountain Plaza corner palms
  for (const [px, pz] of [[15, 15], [55, 15], [15, 55], [55, 55]]) {
    addPalm(px, pz, 0.95);
  }

  // Streetlamps along main avenues
  for (const roadX of [-70, 0, 70, 140]) {
    for (let z = -120; z <= 120; z += 40) {
      if (Math.abs(z % 70) < 12) continue;
      const lx = roadX === 140 ? 149.2 : roadX + 9.4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 7.2, 6), poleMat);
      pole.position.set(lx, 3.6, z);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.14), poleMat);
      arm.position.set(lx - 0.8, 7.1, z);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), bulbMat);
      bulb.position.set(lx - 1.55, 6.95, z);
      scene.add(pole, arm, bulb);
    }
  }
}

function createRampMesh(w, h, l) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(l, 0);
  shape.lineTo(l, h);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(w * 0.5, 0, -l * 0.5);

  const group = new THREE.Group();
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x3b3556, roughness: 0.65 })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.1, 0.18, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff })
  );
  edge.position.set(0, h, l * 0.48);
  group.add(edge);
  return group;
}
