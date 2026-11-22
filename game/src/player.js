import * as THREE from 'three';
import { WEAPONS } from './config.js';

export function createPlayer(scene) {
  const group = new THREE.Group();

  // Articulated sunset-cyber runner character
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a07c, roughness: 0.7 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x00d9e8, roughness: 0.42, metalness: 0.15 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xff2e93, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1b2036, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c141d, roughness: 0.85 });
  const shadesMat = new THREE.MeshBasicMaterial({ color: 0x0e0f1c });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x262c3a, metalness: 0.7, roughness: 0.35 });

  // Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.18, 0.86, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.86, 0.26), pantsMat);
  leftLeg.position.y = -0.43;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.18, 0.86, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.86, 0.26), pantsMat);
  rightLeg.position.y = -0.43;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);

  // Torso (open teal bomber jacket over neon magenta tee)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), jacketMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  const shirtStripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.36), shirtMat);
  shirtStripe.position.y = 1.25;

  // Head + Shades
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.36), skinMat);
  head.position.y = 1.85;
  head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.14, 0.4), hairMat);
  hair.position.set(0, 2.02, -0.02);
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.08), shadesMat);
  shades.position.set(0, 1.87, 0.18);

  // Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.42, 1.56, 0);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2), jacketMat);
  leftArm.position.y = -0.3;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.42, 1.56, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2), jacketMat);
  rightArm.position.y = -0.3;
  rightArmPivot.add(rightArm);

  // Held weapon mesh attached to right hand
  const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.56), gunMat);
  weaponMesh.position.set(0, -0.58, 0.32);
  rightArmPivot.add(weaponMesh);

  group.add(leftLegPivot, rightLegPivot, torso, shirtStripe, head, hair, shades, leftArmPivot, rightArmPivot);
  scene.add(group);

  const ammoState = WEAPONS.map((w) => ({
    mag: w.magSize,
    reserve: w.maxReserve,
  }));

  const player = {
    group,
    parts: { leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot, weaponMesh },
    x: 140,
    y: 0,
    z: 42,
    vy: 0,
    heading: Math.PI,
    radius: 0.65,
    health: 100,
    maxHealth: 100,
    armor: 50,
    maxArmor: 100,
    cash: 1200,
    rep: 0,
    vehicle: null,
    weaponIndex: 1, // 9mm Sidearm default
    ammoState,
    fireCooldown: 0,
    reloadTimer: 0,
    aiming: false,
    walkPhase: 0,
    damageFlash: 0,
    dead: false,
    respawnTimer: 0,

    getCurrentWeapon() {
      return WEAPONS[this.weaponIndex];
    },
    getCurrentAmmo() {
      return this.ammoState[this.weaponIndex];
    },
    selectWeapon(idx) {
      if (idx < 0 || idx >= WEAPONS.length) return;
      this.weaponIndex = idx;
      this.reloadTimer = 0;
      const w = WEAPONS[idx];
      weaponMesh.visible = !w.melee;
      if (w.id === 'shotgun') weaponMesh.scale.set(1.2, 1.15, 1.55);
      else if (w.id === 'smg') weaponMesh.scale.set(1.05, 1.1, 1.15);
      else weaponMesh.scale.set(0.85, 0.9, 0.72);
    },
    reload() {
      const w = this.getCurrentWeapon();
      const a = this.getCurrentAmmo();
      if (w.melee || this.reloadTimer > 0 || a.mag >= w.magSize || a.reserve <= 0) return false;
      this.reloadTimer = 1.05;
      return true;
    },
    refillGear() {
      this.armor = this.maxArmor;
      this.health = this.maxHealth;
      WEAPONS.forEach((w, i) => {
        this.ammoState[i].mag = w.magSize;
        this.ammoState[i].reserve = w.maxReserve;
      });
    },
    takeDamage(amount) {
      if (this.dead) return;
      this.damageFlash = 1.0;
      let rem = amount;
      if (this.armor > 0) {
        const absorbed = Math.min(this.armor, rem * 0.72);
        this.armor -= absorbed;
        rem -= absorbed;
      }
      this.health = Math.max(0, this.health - rem);
      if (this.health <= 0) {
        this.dead = true;
        this.respawnTimer = 2.6;
      }
    },
    enterVehicle(v) {
      if (!v || v.destroyed) return;
      if (v.driver && v.driver !== 'player') {
        v.driver = null;
      }
      this.vehicle = v;
      v.driver = 'player';
      this.group.visible = false;
    },
    exitVehicle(city) {
      if (!this.vehicle) return null;
      const v = this.vehicle;
      const sideX = v.x - Math.cos(v.heading) * (v.spec.width * 0.5 + 1.15);
      const sideZ = v.z + Math.sin(v.heading) * (v.spec.width * 0.5 + 1.15);
      const res = city.resolveCircleCollision(sideX, sideZ, this.radius);
      this.x = res.x;
      this.z = res.z;
      this.y = 0;
      this.vy = 0;
      this.heading = v.heading;
      v.driver = null;
      this.vehicle = null;
      this.group.visible = true;
      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.y = this.heading;
      return v;
    },
    updateOnFoot(dt, input, cameraYaw, city) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      this.damageFlash = Math.max(0, this.damageFlash - dt * 2.8);

      if (this.reloadTimer > 0) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
          const w = this.getCurrentWeapon();
          const a = this.getCurrentAmmo();
          const need = w.magSize - a.mag;
          const take = Math.min(need, a.reserve);
          a.mag += take;
          a.reserve -= take;
        }
      }

      if (this.vehicle) {
        this.x = this.vehicle.x;
        this.y = this.vehicle.y;
        this.z = this.vehicle.z;
        this.heading = this.vehicle.heading;
        return;
      }

      // Compute camera-relative movement vector
      let moveX = 0;
      let moveZ = 0;
      const fwdX = -Math.sin(cameraYaw);
      const fwdZ = -Math.cos(cameraYaw);
      const rightX = Math.cos(cameraYaw);
      const rightZ = -Math.sin(cameraYaw);

      if (input.forward) { moveX += fwdX; moveZ += fwdZ; }
      if (input.backward) { moveX -= fwdX; moveZ -= fwdZ; }
      if (input.right) { moveX += rightX; moveZ += rightZ; }
      if (input.left) { moveX -= rightX; moveZ -= rightZ; }

      const len = Math.hypot(moveX, moveZ);
      const speed = input.sprint ? 11.2 : 6.6;
      if (len > 0.01) {
        moveX /= len;
        moveZ /= len;
        this.x += moveX * speed * dt;
        this.z += moveZ * speed * dt;
        this.walkPhase += dt * (input.sprint ? 13.5 : 9.0);
        if (!this.aiming) {
          const targetH = Math.atan2(moveX, moveZ);
          let diff = targetH - this.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.heading += diff * Math.min(1, dt * 12);
        }
      } else {
        this.walkPhase = 0;
      }

      if (this.aiming) {
        this.heading = Math.atan2(fwdX, fwdZ);
      }

      // Jump & gravity
      const groundH = city.getRampHeight(this.x, this.z);
      if (input.jump && this.y <= groundH + 0.05) {
        this.vy = 8.4;
      }
      this.vy -= 22 * dt;
      this.y += this.vy * dt;
      if (this.y < groundH) {
        this.y = groundH;
        this.vy = 0;
      }

      const res = city.resolveCircleCollision(this.x, this.z, this.radius);
      this.x = res.x;
      this.z = res.z;

      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.y = this.heading;

      // Animate limbs
      const swing = len > 0.01 ? Math.sin(this.walkPhase) * 0.65 : 0;
      leftLegPivot.rotation.x = swing;
      rightLegPivot.rotation.x = -swing;
      leftArmPivot.rotation.x = -swing * 0.7;

      const w = this.getCurrentWeapon();
      if (!w.melee && (this.aiming || this.fireCooldown > 0)) {
        rightArmPivot.rotation.x = -Math.PI * 0.48;
      } else {
        rightArmPivot.rotation.x = swing * 0.7;
      }
    },
  };

  player.selectWeapon(1);
  return player;
}
