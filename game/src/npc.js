import * as THREE from 'three';
import { WORLD } from './config.js';
import { createVehicle, updateVehiclePhysics } from './vehicles.js';

function createHumanoidMesh(shirtHex, pantsHex, skinHex = 0xd89f78, hasGun = false) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.72 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.24), pantsMat);
  leftLeg.position.set(-0.16, 0.41, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.24), pantsMat);
  rightLeg.position.set(0.16, 0.41, 0);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.74, 0.32), shirtMat);
  torso.position.y = 1.19;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skinMat);
  head.position.y = 1.76;
  head.castShadow = true;

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), shirtMat);
  leftArm.position.set(-0.38, 1.24, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), shirtMat);
  rightArm.position.set(0.38, 1.24, 0);

  g.add(leftLeg, rightLeg, torso, head, leftArm, rightArm);

  if (hasGun) {
    rightArm.rotation.x = -Math.PI * 0.46;
    rightArm.position.set(0.38, 1.44, 0.22);
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x1c202c, metalness: 0.65, roughness: 0.3 })
    );
    gun.position.set(0.38, 1.42, 0.56);
    g.add(gun);
  }

  return { group: g, leftLeg, rightLeg };
}

export function createNPCManager(scene, vehicles) {
  const pedestrians = [];
  const enemies = [];
  const trafficVehicles = [];

  // Spawn coastal traffic across the 5x5 road grid
  const trafficSpecs = [
    ['vento_cabrio', 140, 12, Math.PI, 0x00e0ff],
    ['baha_coupe', 140, -76, 0, 0xff8c42],
    ['solmara_gt', 136, -12, Math.PI, 0xff247a],
    ['baha_coupe', 70, 20, Math.PI, 0xf2e9d8],
    ['harbor_hauler', 70, 118, Math.PI / 2, 0x2a9d8f],
    ['baha_coupe', 0, -48, 0, 0x4ea8de],
    ['vento_cabrio', -70, 28, Math.PI, 0xff7aa2],
    ['baha_coupe', -32, 0, Math.PI / 2, 0xffe066],
    ['harbor_hauler', -105, 70, Math.PI / 2, 0xe9c46a],
    ['solmara_gt', 32, -70, -Math.PI / 2, 0xffc83d],
    ['baha_coupe', -140, -24, 0, 0x9b5de5],
  ];

  for (const [arch, x, z, heading, col] of trafficSpecs) {
    const v = createVehicle(scene, arch, x, z, heading, col);
    v.driver = 'traffic';
    v.aiTargetSpeed = arch === 'harbor_hauler' ? 11.5 : 15.5;
    vehicles.push(v);
    trafficVehicles.push(v);
  }

  // Spawn boardwalk & sidewalk pedestrians
  const pedPalette = [0xff5e7e, 0x00e0ff, 0xffd166, 0x2ceaa3, 0xf7ede2, 0xb388ff];
  for (let i = 0; i < 22; i++) {
    const onBoardwalk = i < 12;
    const px = onBoardwalk ? 150.5 + (i % 3) * 1.4 : (i % 2 === 0 ? 59.5 : 129.5);
    const pz = -125 + i * 12;
    const h = createHumanoidMesh(pedPalette[i % pedPalette.length], 0x26314a);
    h.group.position.set(px, 0, pz);
    scene.add(h.group);
    pedestrians.push({
      ...h,
      x: px,
      y: 0,
      z: pz,
      heading: i % 2 === 0 ? 0 : Math.PI,
      speed: 2.3 + (i % 3) * 0.45,
      panicTimer: 0,
      panicDirX: 0,
      panicDirZ: 0,
      walkPhase: i * 0.9,
      dead: false,
    });
  }

  function alertPanic(originX, originZ, radius = 48) {
    for (const p of pedestrians) {
      if (p.dead) continue;
      const dx = p.x - originX;
      const dz = p.z - originZ;
      const dist = Math.hypot(dx, dz);
      if (dist < radius && dist > 0.01) {
        p.panicTimer = 6.5;
        p.panicDirX = dx / dist;
        p.panicDirZ = dz / dist;
      }
    }
  }

  function spawnCartelSquad(centerX, centerZ, count = 5) {
    clearCartelSquad();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.35;
      const rad = 11.5 + (i % 2) * 4.5;
      const ex = centerX + Math.cos(angle) * rad;
      const ez = centerZ + Math.sin(angle) * rad;
      const h = createHumanoidMesh(0xd62839, 0x16141f, 0xcf956c, true);
      // Gold syndicate headband accent
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.37, 0.09, 0.37),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      band.position.y = 1.9;
      h.group.add(band);
      h.group.position.set(ex, 0, ez);
      scene.add(h.group);
      enemies.push({
        ...h,
        x: ex,
        y: 0,
        z: ez,
        heading: angle + Math.PI,
        health: 75,
        maxHealth: 75,
        fireCooldown: 0.6 + Math.random() * 1.1,
        strafeSign: i % 2 === 0 ? 1 : -1,
        walkPhase: i,
        dead: false,
      });
    }
  }

  function clearCartelSquad() {
    for (const e of enemies) {
      scene.remove(e.group);
    }
    enemies.length = 0;
  }

  function update(dt, elapsed, city, player, combat, audio) {
    // 1. Update Traffic AI
    for (const v of trafficVehicles) {
      if (v.driver !== 'traffic' || v.destroyed) continue;

      // Look ahead for intersections or obstacles
      const fwdX = Math.sin(v.heading);
      const fwdZ = Math.cos(v.heading);

      // Slow down if player or another vehicle is directly ahead
      let blocked = false;
      for (const other of vehicles) {
        if (other === v) continue;
        const dx = other.x - v.x;
        const dz = other.z - v.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 13 && (dx * fwdX + dz * fwdZ) > 3.5) {
          blocked = true;
          break;
        }
      }
      if (!player.vehicle) {
        const pdx = player.x - v.x;
        const pdz = player.z - v.z;
        if (Math.hypot(pdx, pdz) < 9 && (pdx * fwdX + pdz * fwdZ) > 2) blocked = true;
      }

      // Keep traffic gently aligned to nearest road axis and turn around near world edges
      let steer = 0;
      if (v.x > 146 || v.x < -146 || v.z > 146 || v.z < -146) {
        const toCenter = Math.atan2(-v.x, -v.z);
        let diff = toCenter - v.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        steer = THREE.MathUtils.clamp(diff * 1.4, -1, 1);
      } else {
        // Snap lightly toward nearest grid lane
        if (Math.abs(fwdZ) > Math.abs(fwdX)) {
          let nearestX = WORLD.roadCoords[0];
          for (const rc of WORLD.roadCoords) {
            if (Math.abs(v.x - rc) < Math.abs(v.x - nearestX)) nearestX = rc;
          }
          const laneOffset = fwdZ > 0 ? -3.4 : 3.4;
          const err = (nearestX + laneOffset) - v.x;
          steer = THREE.MathUtils.clamp((fwdZ > 0 ? err : -err) * 0.14, -0.6, 0.6);
        } else {
          let nearestZ = WORLD.roadCoords[0];
          for (const rc of WORLD.roadCoords) {
            if (Math.abs(v.z - rc) < Math.abs(v.z - nearestZ)) nearestZ = rc;
          }
          const laneOffset = fwdX > 0 ? 3.4 : -3.4;
          const err = (nearestZ + laneOffset) - v.z;
          steer = THREE.MathUtils.clamp((fwdX > 0 ? -err : err) * 0.14, -0.6, 0.6);
        }
      }

      const throttle = blocked ? -0.5 : v.speed < v.aiTargetSpeed ? 0.55 : 0.05;
      updateVehiclePhysics(v, { throttle, steer, handbrake: false, nitro: false }, dt, city, elapsed);
    }

    // 2. Update Pedestrians
    for (const p of pedestrians) {
      if (p.dead) continue;
      let moveSpeed = p.speed;
      if (p.panicTimer > 0) {
        p.panicTimer -= dt;
        moveSpeed = 6.2;
        p.heading = Math.atan2(p.panicDirX, p.panicDirZ);
      } else {
        if (p.z > 145) p.heading = Math.PI;
        if (p.z < -145) p.heading = 0;
      }
      const nx = p.x + Math.sin(p.heading) * moveSpeed * dt;
      const nz = p.z + Math.cos(p.heading) * moveSpeed * dt;
      const res = city.resolveCircleCollision(nx, nz, 0.5);
      p.x = res.x;
      p.z = res.z;
      if (res.collided) p.heading += Math.PI * 0.75;

      p.walkPhase += dt * moveSpeed * 2.5;
      p.leftLeg.rotation.x = Math.sin(p.walkPhase) * 0.55;
      p.rightLeg.rotation.x = -Math.sin(p.walkPhase) * 0.55;
      p.group.position.set(p.x, 0, p.z);
      p.group.rotation.y = p.heading;
    }

    // 3. Update Marlin Cartel Armed Enemies
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 62) {
        e.heading = Math.atan2(dx, dz);
        e.group.rotation.y = e.heading;

        // Tactical strafe / close distance
        if (dist > 15) {
          const mx = (dx / dist) * 3.8 + (-dz / dist) * 1.4 * e.strafeSign;
          const mz = (dz / dist) * 3.8 + (dx / dist) * 1.4 * e.strafeSign;
          const res = city.resolveCircleCollision(e.x + mx * dt, e.z + mz * dt, 0.6);
          e.x = res.x;
          e.z = res.z;
          e.walkPhase += dt * 8;
          e.leftLeg.rotation.x = Math.sin(e.walkPhase) * 0.45;
          e.rightLeg.rotation.x = -Math.sin(e.walkPhase) * 0.45;
        }
        e.group.position.set(e.x, 0, e.z);

        // Shoot at player with luminous crimson tracers
        e.fireCooldown -= dt;
        if (e.fireCooldown <= 0 && !player.dead && dist < 52) {
          e.fireCooldown = 1.15 + Math.random() * 0.75;
          const origin = new THREE.Vector3(
            e.x + Math.sin(e.heading) * 0.65,
            1.45,
            e.z + Math.cos(e.heading) * 0.65
          );
          const spread = 1.45;
          const targetPt = new THREE.Vector3(
            player.x + (Math.random() - 0.5) * spread,
            (player.y || 0) + 1.25 + (Math.random() - 0.5) * 0.6,
            player.z + (Math.random() - 0.5) * spread
          );
          combat.spawnTracer(origin, targetPt, 0xffd6e0, 0xff2454, 0.24);
          combat.triggerMuzzleFlash(origin, 0xff3b5c);
          if (audio) audio.playGunshot('smg', 0.45);
          if (Math.random() < (player.vehicle ? 0.35 : 0.55)) {
            if (player.vehicle) {
              player.vehicle.health = Math.max(8, player.vehicle.health - 6);
            } else {
              player.takeDamage(7);
            }
          }
        }
      }
    }
  }

  return {
    pedestrians,
    enemies,
    trafficVehicles,
    alertPanic,
    spawnCartelSquad,
    clearCartelSquad,
    update,
  };
}
