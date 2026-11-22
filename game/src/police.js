import * as THREE from 'three';
import { WORLD } from './config.js';
import { createVehicle, updateVehiclePhysics } from './vehicles.js';

function createOfficerMesh() {
  const g = new THREE.Group();
  const uniMat = new THREE.MeshStandardMaterial({ color: 0x182b52, roughness: 0.65 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd69f7e, roughness: 0.7 });
  const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.24), uniMat);
  leftLeg.position.set(-0.16, 0.41, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.24), uniMat);
  rightLeg.position.set(0.16, 0.41, 0);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.76, 0.34), uniMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.36), badgeMat);
  badge.position.set(0.14, 1.32, 0.01);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skinMat);
  head.position.y = 1.78;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.42), uniMat);
  cap.position.set(0, 1.97, 0.04);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.18), uniMat);
  arm.position.set(0.38, 1.44, 0.24);
  arm.rotation.x = -Math.PI * 0.46;
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.12, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x161924, metalness: 0.7 })
  );
  gun.position.set(0.38, 1.42, 0.52);

  g.add(leftLeg, rightLeg, torso, badge, head, cap, arm, gun);
  return { group: g, leftLeg, rightLeg };
}

export function createPoliceSystem(scene, vehicles) {
  const cruisers = [];
  const officers = [];

  // Pre-spawn 3 patrolling SBPD interceptors around the city
  const initCruisers = [
    [140, -90, 0],
    [0, 70, Math.PI / 2],
    [70, -70, Math.PI],
  ];
  for (const [x, z, heading] of initCruisers) {
    const v = createVehicle(scene, 'sbpd_interceptor', x, z, heading);
    v.driver = 'police';
    vehicles.push(v);
    cruisers.push(v);
  }

  const state = {
    wantedLevel: 0,
    heatPoints: 0,
    evadeTimer: 0,
    evading: false,
    bustTimer: 0,
    cruisers,
    officers,

    addHeat(points) {
      this.heatPoints = Math.min(500, this.heatPoints + points);
      const nextStars = Math.min(5, Math.ceil(this.heatPoints / 85));
      if (nextStars > this.wantedLevel) {
        this.wantedLevel = nextStars;
      }
      this.evadeTimer = 0;
      this.evading = false;
    },

    setWantedLevel(stars) {
      this.wantedLevel = Math.max(0, Math.min(5, Math.floor(stars)));
      this.heatPoints = this.wantedLevel * 90;
      this.evadeTimer = 0;
      this.evading = false;
      if (this.wantedLevel === 0) this.clearOfficers();
    },

    clearWanted() {
      this.wantedLevel = 0;
      this.heatPoints = 0;
      this.evadeTimer = 0;
      this.evading = false;
      this.bustTimer = 0;
      for (const c of cruisers) c.sirensActive = false;
      this.clearOfficers();
    },

    clearOfficers() {
      for (const o of officers) scene.remove(o.group);
      officers.length = 0;
    },

    ensurePursuitUnits(player) {
      const desiredCruisers = Math.min(4, Math.max(2, this.wantedLevel));
      while (cruisers.length < desiredCruisers) {
        const angle = Math.random() * Math.PI * 2;
        const sx = THREE.MathUtils.clamp(player.x + Math.cos(angle) * 65, -150, 145);
        const sz = THREE.MathUtils.clamp(player.z + Math.sin(angle) * 65, -150, 145);
        const c = createVehicle(scene, 'sbpd_interceptor', sx, sz, Math.atan2(player.x - sx, player.z - sz));
        c.driver = 'police';
        vehicles.push(c);
        cruisers.push(c);
      }

      if (!player.vehicle && this.wantedLevel >= 1) {
        const desiredOfficers = Math.min(4, this.wantedLevel);
        while (officers.length < desiredOfficers) {
          const a = (officers.length / Math.max(1, desiredOfficers)) * Math.PI * 2;
          const ox = THREE.MathUtils.clamp(player.x + Math.cos(a) * 26, -155, 148);
          const oz = THREE.MathUtils.clamp(player.z + Math.sin(a) * 26, -155, 148);
          const m = createOfficerMesh();
          m.group.position.set(ox, 0, oz);
          scene.add(m.group);
          officers.push({
            ...m,
            x: ox,
            y: 0,
            z: oz,
            heading: Math.atan2(player.x - ox, player.z - oz),
            health: 65,
            fireCooldown: 0.9 + Math.random() * 0.8,
            walkPhase: 0,
            dead: false,
          });
        }
      }
    },

    update(dt, elapsed, city, player, combat, audio, onResprayPad) {
      // Check Sunset Auto Respray Pad trigger
      const pad = WORLD.resprayPad;
      const distPad = Math.hypot(player.x - pad.x, player.z - pad.z);
      if (distPad < pad.radius && player.vehicle && (this.wantedLevel > 0 || player.vehicle.health < player.vehicle.maxHealth)) {
        if (onResprayPad) onResprayPad();
      }

      const activeHeat = this.wantedLevel > 0;
      if (activeHeat) this.ensurePursuitUnits(player);

      let nearestPoliceDist = 999;

      // Update SBPD Cruisers (predictive pursuit when wanted, calm patrol otherwise)
      for (let i = 0; i < cruisers.length; i++) {
        const c = cruisers[i];
        if (c.driver !== 'police' || c.destroyed) continue;
        c.sirensActive = activeHeat;

        const dist = Math.hypot(player.x - c.x, player.z - c.z);
        if (activeHeat) nearestPoliceDist = Math.min(nearestPoliceDist, dist);

        let throttle = 0.45;
        let steer = 0;
        let nitro = false;

        if (activeHeat) {
          // Predictive lead point ahead of moving player
          const pvx = player.vehicle ? player.vehicle.vx : 0;
          const pvz = player.vehicle ? player.vehicle.vz : 0;
          const lead = Math.min(1.1, dist / 40);
          const tx = player.x + pvx * lead + (i % 2 === 0 ? 3.5 : -3.5);
          const tz = player.z + pvz * lead;

          const desiredHeading = Math.atan2(tx - c.x, tz - c.z);
          let diff = desiredHeading - c.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          steer = THREE.MathUtils.clamp(diff * 1.9, -1, 1);
          throttle = Math.abs(diff) > 1.7 ? -0.55 : dist > 11 ? 0.95 : 0.45;
          nitro = dist > 38 && Math.abs(diff) < 0.35 && this.wantedLevel >= 3;

          // Reposition cruiser closer if player outran it by huge distance
          if (dist > 155) {
            c.x = THREE.MathUtils.clamp(player.x - Math.sin(player.heading) * 62 + (i - 1) * 14, -150, 146);
            c.z = THREE.MathUtils.clamp(player.z - Math.cos(player.heading) * 62, -150, 146);
            c.heading = Math.atan2(player.x - c.x, player.z - c.z);
          }
        } else {
          // Calm boulevard patrol
          if (c.x > 144 || c.x < -144 || c.z > 144 || c.z < -144) {
            const toC = Math.atan2(-c.x, -c.z);
            let diff = toC - c.heading;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            steer = THREE.MathUtils.clamp(diff * 1.2, -0.8, 0.8);
          }
          throttle = c.speed < 14 ? 0.45 : 0.05;
        }

        updateVehiclePhysics(c, { throttle, steer, handbrake: false, nitro }, dt, city, elapsed);
      }

      // Update Foot Officers
      for (let i = officers.length - 1; i >= 0; i--) {
        const o = officers[i];
        if (o.dead) continue;
        const dx = player.x - o.x;
        const dz = player.z - o.z;
        const dist = Math.hypot(dx, dz);
        nearestPoliceDist = Math.min(nearestPoliceDist, dist);

        o.heading = Math.atan2(dx, dz);
        o.group.rotation.y = o.heading;

        if (dist > 13 && dist < 80) {
          const res = city.resolveCircleCollision(
            o.x + (dx / dist) * 4.5 * dt,
            o.z + (dz / dist) * 4.5 * dt,
            0.55
          );
          o.x = res.x;
          o.z = res.z;
          o.walkPhase += dt * 9;
          o.leftLeg.rotation.x = Math.sin(o.walkPhase) * 0.5;
          o.rightLeg.rotation.x = -Math.sin(o.walkPhase) * 0.5;
        }
        o.group.position.set(o.x, 0, o.z);

        o.fireCooldown -= dt;
        if (activeHeat && !player.dead && dist < 44 && o.fireCooldown <= 0) {
          o.fireCooldown = 1.25 + Math.random() * 0.7;
          const origin = new THREE.Vector3(o.x + Math.sin(o.heading) * 0.6, 1.45, o.z + Math.cos(o.heading) * 0.6);
          const targetPt = new THREE.Vector3(
            player.x + (Math.random() - 0.5) * 1.6,
            (player.y || 0) + 1.2,
            player.z + (Math.random() - 0.5) * 1.6
          );
          combat.spawnTracer(origin, targetPt, 0xd4f4ff, 0x26b6ff, 0.2);
          combat.triggerMuzzleFlash(origin, 0x62d6ff);
          if (audio) audio.playGunshot('sidearm', 0.35);
          if (Math.random() < 0.42 && !player.vehicle) {
            player.takeDamage(6);
          }
        }
      }

      // Evasion countdown when player shakes line of sight
      if (activeHeat) {
        if (nearestPoliceDist > 58) {
          this.evading = true;
          this.evadeTimer += dt;
          const needed = 8 + this.wantedLevel * 2.5;
          if (this.evadeTimer >= needed) {
            this.clearWanted();
          }
        } else {
          this.evading = false;
          this.evadeTimer = Math.max(0, this.evadeTimer - dt * 1.5);
        }
      }
    },
  };

  return state;
}
