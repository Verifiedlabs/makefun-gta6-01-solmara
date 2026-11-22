import * as THREE from 'three';

export function createCombatSystem(scene) {
  const tracers = [];
  const particles = [];
  const explosions = [];

  const muzzleLight = new THREE.PointLight(0xffd27d, 0, 14);
  scene.add(muzzleLight);
  const muzzleBurst = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  muzzleBurst.visible = false;
  scene.add(muzzleBurst);
  let muzzleTimer = 0;

  const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const smokeGeo = new THREE.SphereGeometry(0.36, 7, 7);
  const impactRingGeo = new THREE.RingGeometry(0.18, 0.42, 14);

  function spawnTracer(start, end, coreColor = 0xffe680, haloColor = 0xff9f1c, duration = 0.2) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    if (len < 0.05) return;

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const group = new THREE.Group();
    group.position.copy(mid);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    group.quaternion.copy(quat);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, len, 6),
      new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0.98 })
    );
    const halo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, len, 8),
      new THREE.MeshBasicMaterial({
        color: haloColor,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(core, halo);
    scene.add(group);
    tracers.push({ group, core, halo, life: duration, maxLife: duration });
  }

  function triggerMuzzleFlash(pos, color = 0xffcf6e) {
    muzzleLight.position.copy(pos);
    muzzleLight.color.setHex(color);
    muzzleLight.intensity = 28;
    muzzleBurst.position.copy(pos);
    muzzleBurst.material.color.setHex(color);
    muzzleBurst.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    muzzleBurst.visible = true;
    muzzleTimer = 0.09;
    spawnSparks(pos, 6, color);
  }

  function spawnSparks(pos, count = 8, color = 0xffd166) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, mat.clone());
      mesh.position.copy(pos);
      const speed = 3 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 2 + Math.random() * 5;
      scene.add(mesh);
      particles.push({ mesh, vx, vy, vz, gravity: 18, life: 0.35 + Math.random() * 0.25, maxLife: 0.6, grow: 0 });
    }
    const ring = new THREE.Mesh(
      impactRingGeo,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.position.copy(pos);
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    scene.add(ring);
    particles.push({ mesh: ring, vx: 0, vy: 0, vz: 0, gravity: 0, life: 0.28, maxLife: 0.28, grow: 2.4 });
  }

  function spawnTireSmoke(x, y, z, color = 0xdbe2f0) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false });
    const mesh = new THREE.Mesh(smokeGeo, mat);
    mesh.position.set(x, y + 0.28, z);
    scene.add(mesh);
    particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 1.2 + Math.random() * 1.0,
      vz: (Math.random() - 0.5) * 1.4,
      gravity: -0.6,
      life: 0.55,
      maxLife: 0.55,
      grow: 2.2,
    });
  }

  function spawnExplosion(x, y, z) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.95 })
    );
    core.position.set(x, y + 1.0, z);
    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0xff2e63,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    outer.position.set(x, y + 1.0, z);
    const light = new THREE.PointLight(0xff7a2f, 55, 36);
    light.position.set(x, y + 2.2, z);
    scene.add(core, outer, light);
    explosions.push({ core, outer, light, life: 0.72, maxLife: 0.72 });
    spawnSparks(new THREE.Vector3(x, y + 1.2, z), 22, 0xffae34);
  }

  function firePlayerWeapon(player, aimOrigin, aimDir, targets, callbacks) {
    const weapon = player.getCurrentWeapon();
    const ammo = player.getCurrentAmmo();
    if (player.fireCooldown > 0 || player.reloadTimer > 0) return false;

    if (!weapon.melee) {
      if (ammo.mag <= 0) {
        player.reload();
        return false;
      }
      ammo.mag--;
    }
    player.fireCooldown = weapon.fireRate;

    const muzzlePos = new THREE.Vector3(
      player.x + Math.sin(player.heading) * 0.72 + Math.cos(player.heading) * 0.24,
      player.y + 1.48,
      player.z + Math.cos(player.heading) * 0.72 - Math.sin(player.heading) * 0.24
    );

    if (!weapon.melee) {
      triggerMuzzleFlash(muzzlePos, weapon.tracerColor);
    }

    for (let p = 0; p < weapon.pellets; p++) {
      const dir = aimDir.clone();
      if (weapon.spread > 0) {
        dir.x += (Math.random() - 0.5) * weapon.spread;
        dir.y += (Math.random() - 0.5) * weapon.spread * 0.6;
        dir.z += (Math.random() - 0.5) * weapon.spread;
        dir.normalize();
      }

      let bestDist = weapon.range;
      let hitTarget = null;
      let hitType = null;

      // Test against enemies, police officers, pedestrians, and vehicles
      const checkList = (list, type, hitRadius, yCenter) => {
        for (const t of list) {
          if (t.dead || t.destroyed) continue;
          if (type === 'vehicle' && t === player.vehicle) continue;
          const toX = t.x - muzzlePos.x;
          const toY = (t.y || 0) + yCenter - muzzlePos.y;
          const toZ = t.z - muzzlePos.z;
          const proj = toX * dir.x + toY * dir.y + toZ * dir.z;
          if (proj < 0 || proj > bestDist) continue;
          const perpSq = toX * toX + toY * toY + toZ * toZ - proj * proj;
          if (perpSq <= hitRadius * hitRadius) {
            bestDist = proj;
            hitTarget = t;
            hitType = type;
          }
        }
      };

      checkList(targets.enemies || [], 'enemy', 1.05, 1.2);
      checkList(targets.officers || [], 'officer', 1.05, 1.2);
      checkList(targets.pedestrians || [], 'ped', 0.85, 1.1);
      checkList(targets.vehicles || [], 'vehicle', 2.25, 1.0);

      const endPoint = muzzlePos.clone().addScaledVector(dir, bestDist);
      if (!weapon.melee) {
        spawnTracer(muzzlePos, endPoint, 0xfff5c0, weapon.tracerColor, 0.22);
      }

      if (hitTarget) {
        spawnSparks(endPoint, hitType === 'vehicle' ? 10 : 6, hitType === 'vehicle' ? 0x00f0ff : 0xff4d6d);
        if (callbacks && callbacks.onHit) {
          callbacks.onHit(hitType, hitTarget, weapon.damage, endPoint);
        }
      }
    }

    if (callbacks && callbacks.onShotFired) {
      callbacks.onShotFired(weapon);
    }
    return true;
  }

  function update(dt) {
    if (muzzleTimer > 0) {
      muzzleTimer -= dt;
      if (muzzleTimer <= 0) {
        muzzleLight.intensity = 0;
        muzzleBurst.visible = false;
      }
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        scene.remove(t.group);
        tracers.splice(i, 1);
      } else {
        const a = t.life / t.maxLife;
        t.core.material.opacity = a;
        t.halo.material.opacity = a * 0.45;
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        particles.splice(i, 1);
      } else {
        p.vy -= p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
        p.mesh.position.z += p.vz * dt;
        if (p.grow > 0) {
          const s = 1 + (1 - p.life / p.maxLife) * p.grow;
          p.mesh.scale.setScalar(s);
        }
        p.mesh.material.opacity = (p.life / p.maxLife) * 0.85;
      }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.life -= dt;
      if (e.life <= 0) {
        scene.remove(e.core, e.outer, e.light);
        explosions.splice(i, 1);
      } else {
        const t = 1 - e.life / e.maxLife;
        const scale = 1 + t * 5.2;
        e.core.scale.setScalar(scale * 0.8);
        e.outer.scale.setScalar(scale * 1.15);
        e.core.material.opacity = (1 - t) * 0.9;
        e.outer.material.opacity = (1 - t) * 0.55;
        e.light.intensity = (1 - t) * 55;
      }
    }
  }

  return {
    spawnTracer,
    triggerMuzzleFlash,
    spawnSparks,
    spawnTireSmoke,
    spawnExplosion,
    firePlayerWeapon,
    update,
  };
}
