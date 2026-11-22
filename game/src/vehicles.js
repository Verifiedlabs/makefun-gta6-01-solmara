import * as THREE from 'three';
import { VEHICLE_ARCHETYPES } from './config.js';

let nextVehicleId = 1;

export function createVehicle(scene, archetypeKey, x, z, heading = 0, colorOverride = null) {
  const spec = VEHICLE_ARCHETYPES[archetypeKey] || VEHICLE_ARCHETYPES.baha_coupe;
  const color = colorOverride ?? spec.colors[(nextVehicleId - 1) % spec.colors.length];

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = heading;

  const paintMat = new THREE.MeshStandardMaterial({
    color,
    roughness: spec.category === 'supercar' ? 0.18 : 0.34,
    metalness: spec.category === 'supercar' ? 0.65 : 0.35,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x161925, roughness: 0.65, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2c47,
    roughness: 0.12,
    metalness: 0.85,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f7fc, roughness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdbe5f4, roughness: 0.2, metalness: 0.85 });

  const w = spec.width;
  const l = spec.length;
  const bodyH = spec.category === 'truck' ? 1.05 : spec.category === 'supercar' ? 0.64 : 0.76;

  // Lower chassis body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, l), paintMat);
  chassis.position.y = 0.44 + bodyH * 0.5;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Police white doors + front push bumper
  if (spec.police) {
    const doorBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, bodyH * 0.86, l * 0.44), whiteMat);
    doorBand.position.set(0, 0.44 + bodyH * 0.5, -0.05);
    group.add(doorBand);

    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.42, 0.28), darkMat);
    pushBar.position.set(0, 0.65, l * 0.5 + 0.12);
    group.add(pushBar);
  }

  // Cabin / Top architecture per category
  if (spec.category === 'truck') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 1.15, l * 0.32), paintMat);
    cab.position.set(0, 1.55, l * 0.26);
    cab.castShadow = true;
    group.add(cab);

    const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.62, 0.12), glassMat);
    wind.position.set(0, 1.66, l * 0.42);
    group.add(wind);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 1.65, l * 0.62), whiteMat);
    cargo.position.set(0, 1.75, -l * 0.18);
    cargo.castShadow = true;
    group.add(cargo);
  } else if (spec.convertible) {
    // Open interior with leather seats + raked windshield
    const tub = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.22, l * 0.46), darkMat);
    tub.position.set(0, 1.12, -0.15);
    group.add(tub);

    const seatMat = new THREE.MeshStandardMaterial({ color: 0xf4e3cf, roughness: 0.75 });
    for (const sx of [-0.42, 0.42]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.45), seatMat);
      seat.position.set(sx, 1.32, -0.35);
      group.add(seat);
    }
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.55, 0.12), glassMat);
    windshield.position.set(0, 1.38, 0.65);
    windshield.rotation.x = -0.45;
    group.add(windshield);
  } else {
    const cabH = spec.category === 'supercar' ? 0.48 : 0.62;
    const cabL = spec.category === 'supercar' ? l * 0.46 : l * 0.52;
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.82, cabH, cabL),
      spec.police ? whiteMat : paintMat
    );
    cab.position.set(0, 0.44 + bodyH + cabH * 0.45, -0.2);
    cab.castShadow = true;
    group.add(cab);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, cabH * 0.72, cabL * 0.88), glassMat);
    glass.position.set(0, 0.44 + bodyH + cabH * 0.44, -0.2);
    group.add(glass);
  }

  // Rear Wing Spoiler for Supercar & Police Interceptor
  if (spec.spoiler) {
    const wingY = 0.44 + bodyH + 0.34;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.1, 0.42), darkMat);
    wing.position.set(0, wingY, -l * 0.43);
    group.add(wing);
    for (const sx of [-w * 0.32, w * 0.32]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.22), darkMat);
      strut.position.set(sx, wingY - 0.16, -l * 0.43);
      group.add(strut);
    }
  }

  // Headlights & Taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6cf });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2442 });
  for (const sx of [-w * 0.33, w * 0.33]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.1), headMat);
    hl.position.set(sx, 0.72, l * 0.5 + 0.02);
    group.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.1), tailMat);
    tl.position.set(sx, 0.76, -l * 0.5 - 0.02);
    group.add(tl);
  }

  // Supercar / Convertible Neon Underglow
  let underglowMesh = null;
  if (spec.underglow) {
    underglowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.1, l * 0.94),
      new THREE.MeshBasicMaterial({
        color: spec.underglow,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
      })
    );
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.y = 0.11;
    group.add(underglowMesh);
  }

  // Nitro Exhaust Flame Cone
  const nitroFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 1.5, 8),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 })
  );
  nitroFlame.rotation.x = -Math.PI / 2;
  nitroFlame.position.set(0, 0.52, -l * 0.5 - 0.72);
  nitroFlame.visible = false;
  group.add(nitroFlame);

  // Police Flashing Lightbar + Dynamic Siren PointLight
  let sirenRed = null;
  let sirenBlue = null;
  let sirenLight = null;
  if (spec.police) {
    const barY = 0.44 + bodyH + 0.68;
    const mount = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.38), darkMat);
    mount.position.set(0, barY, -0.15);
    group.add(mount);

    sirenRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.22, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xff2244 })
    );
    sirenRed.position.set(-0.36, barY + 0.13, -0.15);
    group.add(sirenRed);

    sirenBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.22, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x2299ff })
    );
    sirenBlue.position.set(0.36, barY + 0.13, -0.15);
    group.add(sirenBlue);

    sirenLight = new THREE.PointLight(0xff2244, 0, 22);
    sirenLight.position.set(0, barY + 0.7, -0.15);
    group.add(sirenLight);
  }

  // Four Wheels (front two inside steering pivots)
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.34, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.36, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x16181f, roughness: 0.9 });

  const frontPivots = [];
  const wheelMeshes = [];
  const wheelZ = l * 0.32;
  const wheelX = w * 0.5 + 0.04;
  for (const wz of [wheelZ, -wheelZ]) {
    for (const wx of [-wheelX, wheelX]) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, 0.4, wz);
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      wheel.add(rim);
      pivot.add(wheel);
      group.add(pivot);
      wheelMeshes.push(wheel);
      if (wz > 0) frontPivots.push(pivot);
    }
  }

  scene.add(group);

  return {
    id: nextVehicleId++,
    archetype: spec.id,
    spec,
    group,
    paintMat,
    frontPivots,
    wheelMeshes,
    nitroFlame,
    sirenRed,
    sirenBlue,
    sirenLight,
    sirensActive: false,
    x,
    y: 0,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    heading,
    steerAngle: 0,
    speed: 0,
    nitro: 100,
    nitroActive: false,
    drifting: false,
    airborneTime: 0,
    health: spec.maxHealth,
    maxHealth: spec.maxHealth,
    radius: Math.max(w, l) * 0.42,
    driver: null, // 'player' | 'traffic' | 'police' | null
    destroyed: false,
    aiLane: null,
    aiTargetSpeed: 16,
  };
}

export function updateVehiclePhysics(v, input, dt, city, elapsed, onStuntBonus) {
  if (v.destroyed) {
    v.vx *= Math.pow(0.05, dt);
    v.vz *= Math.pow(0.05, dt);
    v.nitroFlame.visible = false;
    return;
  }

  const spec = v.spec;
  const fwdX = Math.sin(v.heading);
  const fwdZ = Math.cos(v.heading);
  const rightX = Math.cos(v.heading);
  const rightZ = -Math.sin(v.heading);

  let forwardVel = v.vx * fwdX + v.vz * fwdZ;
  let lateralVel = v.vx * rightX + v.vz * rightZ;

  // Nitro boost
  const wantsNitro = Boolean(input.nitro && input.throttle > 0 && v.nitro > 4);
  v.nitroActive = wantsNitro;
  if (wantsNitro) {
    v.nitro = Math.max(0, v.nitro - 28 * dt);
  } else {
    v.nitro = Math.min(100, v.nitro + 11 * dt);
  }
  v.nitroFlame.visible = wantsNitro;
  if (wantsNitro) {
    const pulse = 0.85 + Math.sin(elapsed * 40) * 0.25;
    v.nitroFlame.scale.set(1, pulse, 1);
  }

  const maxSpd = spec.maxSpeed * (wantsNitro ? 1.32 : 1.0);
  const accel = spec.accel * (wantsNitro ? 1.55 : 1.0);

  if (input.throttle > 0) {
    forwardVel += accel * input.throttle * dt;
  } else if (input.throttle < 0) {
    if (forwardVel > 1.2) {
      forwardVel -= spec.brake * Math.abs(input.throttle) * dt;
    } else {
      forwardVel += accel * 0.55 * input.throttle * dt;
    }
  } else {
    // Natural rolling drag
    forwardVel *= Math.pow(0.45, dt);
    if (Math.abs(forwardVel) < 0.08) forwardVel = 0;
  }

  const handbrake = Boolean(input.handbrake);
  v.drifting = handbrake && Math.abs(forwardVel) > 10 && Math.abs(input.steer) > 0.1;
  if (handbrake) {
    forwardVel *= Math.pow(0.68, dt);
  }

  forwardVel = Math.max(-spec.maxSpeed * 0.36, Math.min(maxSpd, forwardVel));

  // Steering scales cleanly with speed
  const speedFactor = Math.min(1, Math.abs(forwardVel) / 7.5);
  const reverseSign = forwardVel >= -0.2 ? 1 : -1;
  const steerAmount = input.steer * spec.turnRate * speedFactor * reverseSign * (v.drifting ? 1.28 : 1.0);
  v.heading += steerAmount * dt;
  v.steerAngle = THREE.MathUtils.lerp(v.steerAngle, input.steer * 0.48, Math.min(1, dt * 10));

  // Lateral grip vs drift slip
  const grip = v.drifting ? spec.driftGrip : spec.grip;
  lateralVel *= Math.exp(-grip * dt);

  const nFwdX = Math.sin(v.heading);
  const nFwdZ = Math.cos(v.heading);
  const nRightX = Math.cos(v.heading);
  const nRightZ = -Math.sin(v.heading);

  v.vx = nFwdX * forwardVel + nRightX * lateralVel;
  v.vz = nFwdZ * forwardVel + nRightZ * lateralVel;
  v.speed = Math.hypot(v.vx, v.vz);

  // Move horizontally
  let nextX = v.x + v.vx * dt;
  let nextZ = v.z + v.vz * dt;

  // World & building collision
  const res = city.resolveCircleCollision(nextX, nextZ, v.radius);
  v.x = res.x;
  v.z = res.z;
  if (res.collided) {
    const vn = v.vx * res.nx + v.vz * res.nz;
    if (vn < 0) {
      v.vx -= 1.45 * vn * res.nx;
      v.vz -= 1.45 * vn * res.nz;
      v.vx *= 0.65;
      v.vz *= 0.65;
      if (Math.abs(vn) > 14 && v.driver === 'player') {
        v.health = Math.max(12, v.health - Math.abs(vn) * 0.65);
      }
    }
  }

  // Ramp height & vertical jump physics
  const groundH = city.getRampHeight(v.x, v.z);
  if (v.y <= groundH + 0.08 && v.vy <= 0.5) {
    if (v.airborneTime > 0.72 && v.driver === 'player' && onStuntBonus) {
      onStuntBonus(Math.round(v.airborneTime * 220), v.airborneTime);
    }
    v.airborneTime = 0;
    const prevGround = v.y;
    v.y = groundH;
    // Launch off ramp crest if moving fast
    if (groundH > 0.3 && groundH > prevGround + 0.01 && v.speed > 16) {
      v.vy = Math.min(13.5, v.speed * 0.28);
    } else {
      v.vy = 0;
    }
  } else {
    v.vy -= 26 * dt;
    v.y += v.vy * dt;
    v.airborneTime += dt;
    if (v.y < groundH) {
      v.y = groundH;
      v.vy = 0;
    }
  }

  // Sync visual transform
  v.group.position.set(v.x, v.y, v.z);
  v.group.rotation.y = v.heading;
  // Subtle pitch and roll feel
  const targetPitch = v.y > groundH + 0.2 ? -v.vy * 0.025 : 0;
  const targetRoll = THREE.MathUtils.clamp(-lateralVel * 0.018, -0.14, 0.14);
  v.group.rotation.x = THREE.MathUtils.lerp(v.group.rotation.x, targetPitch, Math.min(1, dt * 8));
  v.group.rotation.z = THREE.MathUtils.lerp(v.group.rotation.z, targetRoll, Math.min(1, dt * 8));

  // Spin & steer wheels
  for (const p of v.frontPivots) p.rotation.y = v.steerAngle;
  const spinDelta = (forwardVel / 0.4) * dt;
  for (const w of v.wheelMeshes) w.rotation.x += spinDelta;

  // Police flashing siren animation
  if (v.spec.police && v.sirenRed && v.sirenBlue && v.sirenLight) {
    if (v.sirensActive) {
      const flash = Math.floor(elapsed * 8) % 2 === 0;
      v.sirenRed.material.color.setHex(flash ? 0xff1e42 : 0x3b0914);
      v.sirenBlue.material.color.setHex(flash ? 0x0b1c3d : 0x1ea7ff);
      v.sirenLight.color.setHex(flash ? 0xff2244 : 0x1ea7ff);
      v.sirenLight.intensity = 28;
    } else {
      v.sirenRed.material.color.setHex(0x661522);
      v.sirenBlue.material.color.setHex(0x163866);
      v.sirenLight.intensity = 0;
    }
  }
}

export function resolveVehicleToVehicleCollisions(vehicles) {
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const minDist = a.radius + b.radius;
      const distSq = dx * dx + dz * dz;
      if (distSq > 0.0001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;
        const totalMass = a.spec.mass + b.spec.mass;
        const ratioA = b.spec.mass / totalMass;
        const ratioB = a.spec.mass / totalMass;

        a.x -= nx * overlap * ratioA;
        a.z -= nz * overlap * ratioA;
        b.x += nx * overlap * ratioB;
        b.z += nz * overlap * ratioB;

        const rvx = b.vx - a.vx;
        const rvz = b.vz - a.vz;
        const sepVel = rvx * nx + rvz * nz;
        if (sepVel < 0) {
          const impulse = -(1.38 * sepVel) / (1 / a.spec.mass + 1 / b.spec.mass);
          a.vx -= (impulse / a.spec.mass) * nx;
          a.vz -= (impulse / a.spec.mass) * nz;
          b.vx += (impulse / b.spec.mass) * nx;
          b.vz += (impulse / b.spec.mass) * nz;

          const impact = Math.abs(sepVel);
          if (impact > 11) {
            a.health = Math.max(0, a.health - impact * 0.7);
            b.health = Math.max(0, b.health - impact * 0.7);
          }
        }
      }
    }
  }
}
