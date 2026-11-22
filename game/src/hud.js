import { WORLD, getDistrictAt } from './config.js';

export function createHudController() {
  const el = {
    hud: document.getElementById('hud'),
    crosshair: document.getElementById('crosshair'),
    damageVignette: document.getElementById('damage-vignette'),
    district: document.getElementById('hud-district'),
    clock: document.getElementById('hud-clock'),
    radio: document.getElementById('hud-radio'),
    missionBadge: document.getElementById('mission-badge'),
    missionReward: document.getElementById('mission-reward'),
    missionTitle: document.getElementById('mission-title'),
    missionObj: document.getElementById('mission-obj'),
    missionProgressBar: document.getElementById('mission-progress-bar'),
    wantedRow: document.getElementById('wanted-row'),
    stars: [...document.querySelectorAll('#wanted-stars .star')],
    cash: document.getElementById('hud-cash'),
    rep: document.getElementById('hud-rep'),
    hpBar: document.getElementById('hud-hp-bar'),
    hpNum: document.getElementById('hud-hp-num'),
    armorBar: document.getElementById('hud-armor-bar'),
    armorNum: document.getElementById('hud-armor-num'),
    weaponSlot: document.getElementById('hud-weapon-slot'),
    weaponName: document.getElementById('hud-weapon-name'),
    weaponAmmo: document.getElementById('hud-weapon-ammo'),
    toast: document.getElementById('toast-banner'),
    commsBanner: document.getElementById('comms-banner'),
    commsSender: document.getElementById('comms-sender'),
    commsText: document.getElementById('comms-text'),
    interactPill: document.getElementById('interact-pill'),
    speedoCard: document.getElementById('speedo-card'),
    vehicleName: document.getElementById('hud-vehicle-name'),
    vehicleGear: document.getElementById('hud-vehicle-gear'),
    speedNum: document.getElementById('hud-speed'),
    nitroBar: document.getElementById('hud-nitro-bar'),
    vhpBar: document.getElementById('hud-vhp-bar'),
    minimapCanvas: document.getElementById('minimap-canvas'),
    minimapGpsDist: document.getElementById('minimap-gps-dist'),
    minimapEvade: document.getElementById('minimap-evade'),
  };

  const mctx = el.minimapCanvas.getContext('2d');
  let toastTimer = 0;
  let commsTimer = 0;

  function showToast(message, duration = 3.2) {
    el.toast.textContent = message;
    el.toast.classList.remove('hidden');
    toastTimer = duration;
  }

  function clearToast() {
    el.toast.classList.add('hidden');
    toastTimer = 0;
  }

  function showComms(sender, text, duration = 6.5) {
    el.commsSender.textContent = sender;
    el.commsText.textContent = text;
    el.commsBanner.classList.remove('hidden');
    commsTimer = duration;
  }

  function setVisible(visible) {
    el.hud.classList.toggle('hidden', !visible);
  }

  function update(dt, elapsed, state) {
    const { player, police, missions, npcManager, city, vehicles, radioName, nearbyVehicle, clockMinutes } = state;

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) el.toast.classList.add('hidden');
    }
    if (commsTimer > 0) {
      commsTimer -= dt;
      if (commsTimer <= 0) el.commsBanner.classList.add('hidden');
    }

    // Damage vignette + crosshair
    el.damageVignette.style.opacity = String(Math.min(0.85, player.damageFlash * 0.8));
    el.crosshair.classList.toggle('hidden', Boolean(player.vehicle) || state.mode !== 'playing');

    // District, Clock, Radio
    const distInfo = getDistrictAt(player.x, player.z);
    el.district.textContent = distInfo.name;
    const hrs = Math.floor((clockMinutes / 60) % 24);
    const mins = Math.floor(clockMinutes % 60);
    el.clock.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    el.radio.textContent = radioName;

    // Mission contract card
    const mInfo = missions.getHudInfo();
    el.missionBadge.textContent = mInfo.badge;
    el.missionReward.textContent = mInfo.reward;
    el.missionTitle.textContent = mInfo.title;
    el.missionObj.textContent = mInfo.objective;
    el.missionProgressBar.style.width = `${Math.max(8, Math.min(100, mInfo.progress * 100))}%`;

    // 5-star flashing wanted indicator
    el.wantedRow.classList.toggle('active-heat', police.wantedLevel > 0);
    const flashBlue = Math.floor(elapsed * 6) % 2 === 0;
    el.stars.forEach((starEl, i) => {
      const lit = i < police.wantedLevel;
      starEl.classList.toggle('lit', lit);
      starEl.classList.toggle('flash-red', lit && !flashBlue);
      starEl.classList.toggle('flash-blue', lit && flashBlue);
    });

    // Cash, Rep, Vitals
    el.cash.textContent = `$${Math.round(player.cash).toLocaleString()}`;
    el.rep.textContent = String(Math.round(player.rep));
    el.hpBar.style.width = `${Math.max(0, (player.health / player.maxHealth) * 100)}%`;
    el.hpNum.textContent = String(Math.ceil(player.health));
    el.armorBar.style.width = `${Math.max(0, (player.armor / player.maxArmor) * 100)}%`;
    el.armorNum.textContent = String(Math.ceil(player.armor));

    // Weapon / Ammo Card
    const w = player.getCurrentWeapon();
    const a = player.getCurrentAmmo();
    el.weaponSlot.textContent = `[${w.slot}]`;
    el.weaponName.textContent = w.name;
    if (w.melee) {
      el.weaponAmmo.textContent = 'MELEE';
    } else if (player.reloadTimer > 0) {
      el.weaponAmmo.textContent = 'RELOADING...';
    } else {
      el.weaponAmmo.textContent = `${a.mag} / ${a.reserve}`;
    }

    // Vehicle Speedometer or Interact Prompt
    if (player.vehicle) {
      el.speedoCard.classList.remove('hidden');
      el.interactPill.classList.add('hidden');
      const v = player.vehicle;
      const mph = Math.round(v.speed * 2.55);
      el.vehicleName.textContent = v.spec.name;
      el.speedNum.textContent = String(mph);
      const gear = mph < 3 ? 'N' : mph < 28 ? 'D1' : mph < 58 ? 'D2' : mph < 90 ? 'D3' : mph < 118 ? 'D4' : 'D5';
      el.vehicleGear.textContent = v.nitroActive ? 'N2O' : gear;
      el.nitroBar.style.width = `${Math.max(0, Math.min(100, v.nitro))}%`;
      el.vhpBar.style.width = `${Math.max(0, Math.min(100, (v.health / v.maxHealth) * 100))}%`;
    } else {
      el.speedoCard.classList.add('hidden');
      if (nearbyVehicle) {
        el.interactPill.textContent = `PRESS [E] TO ${nearbyVehicle.driver ? 'HIJACK' : 'ENTER'} ${nearbyVehicle.spec.name}`;
        el.interactPill.classList.remove('hidden');
      } else {
        el.interactPill.classList.add('hidden');
      }
    }

    // Minimap GPS footer & evade status
    if (missions.targetPos) {
      const d = Math.round(Math.hypot(missions.targetPos.x - player.x, missions.targetPos.z - player.z));
      el.minimapGpsDist.textContent = `TARGET ${d}M`;
    } else {
      el.minimapGpsDist.textContent = 'FREE ROAM';
    }
    el.minimapEvade.classList.toggle('hidden', !police.evading);

    renderMinimap(mctx, el.minimapCanvas.width, el.minimapCanvas.height, elapsed, {
      player,
      city,
      vehicles,
      police,
      npcManager,
      targetPos: missions.targetPos,
    });
  }

  return {
    showToast,
    clearToast,
    showComms,
    setVisible,
    update,
  };
}

function renderMinimap(ctx, w, h, elapsed, data) {
  const { player, city, vehicles, police, npcManager, targetPos } = data;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const scale = 0.68; // pixels per world unit

  const toMapX = (wx) => cx + (wx - player.x) * scale;
  const toMapY = (wz) => cy + (wz - player.z) * scale;

  // Deep coastal night-map background
  ctx.fillStyle = '#0e182e';
  ctx.fillRect(0, 0, w, h);

  // Ocean east of X = 202
  const oceanX = toMapX(WORLD.oceanStartX);
  if (oceanX < w) {
    ctx.fillStyle = '#084c75';
    ctx.fillRect(Math.max(0, oceanX), 0, w - Math.max(0, oceanX), h);
  }

  // Beach strip (X = 155..204)
  const beachL = toMapX(WORLD.beachStartX);
  const beachW = (WORLD.beachEndX - WORLD.beachStartX) * scale;
  ctx.fillStyle = '#d6b376';
  ctx.fillRect(beachL, 0, beachW, h);

  // Marina & Coral Piers
  ctx.fillStyle = '#9c6e46';
  for (const pierZ of [WORLD.marinaPierZ, -56]) {
    ctx.fillRect(toMapX(190), toMapY(pierZ - 4.2), 68 * scale, 8.5 * scale);
  }

  // City Road Grid
  ctx.fillStyle = '#2d3752';
  const rw = WORLD.roadWidth * scale;
  for (const rx of WORLD.roadCoords) {
    ctx.fillRect(toMapX(rx) - rw * 0.5, toMapY(-170), rw, 340 * scale);
  }
  for (const rz of WORLD.roadCoords) {
    ctx.fillRect(toMapX(-170), toMapY(rz) - rw * 0.5, 340 * scale, rw);
  }

  // Road center lane highlights
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)';
  ctx.lineWidth = 1;
  for (const rx of WORLD.roadCoords) {
    ctx.beginPath();
    ctx.moveTo(toMapX(rx), toMapY(-170));
    ctx.lineTo(toMapX(rx), toMapY(170));
    ctx.stroke();
  }
  for (const rz of WORLD.roadCoords) {
    ctx.beginPath();
    ctx.moveTo(toMapX(-170), toMapY(rz));
    ctx.lineTo(toMapX(170), toMapY(rz));
    ctx.stroke();
  }

  // Building footprints
  for (const b of city.minimapBuildings) {
    const bx = toMapX(b.x);
    const by = toMapY(b.z);
    const bw = b.w * scale;
    const bh = b.d * scale;
    if (bx + bw < -10 || bx > w + 10 || by + bh < -10 || by > h + 10) continue;
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(bx, by, bw, bh);
  }
  ctx.globalAlpha = 1;

  // Sunset Auto Respray marker (emerald diamond)
  const padX = toMapX(WORLD.resprayPad.x);
  const padY = toMapY(WORLD.resprayPad.z);
  ctx.fillStyle = '#2ceaa3';
  ctx.beginPath();
  ctx.arc(padX, padY, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // GPS Route Line & Pulsing Gold Mission Target
  if (targetPos) {
    const tx = toMapX(targetPos.x);
    const ty = toMapY(targetPos.z);

    // L-shaped street-aligned GPS route preview
    const midX = toMapX(player.x);
    const midY = ty;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(midX, midY);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // Clamp beacon to minimap edge if target is off-radar
    const clampedX = Math.max(10, Math.min(w - 10, tx));
    const clampedY = Math.max(10, Math.min(h - 10, ty));
    const pulse = 5.5 + Math.sin(elapsed * 6) * 2.2;
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Traffic vehicles
  for (const v of vehicles) {
    if (v === player.vehicle || v.spec.police || v.destroyed) continue;
    const vx = toMapX(v.x);
    const vy = toMapY(v.z);
    if (vx < 0 || vx > w || vy < 0 || vy > h) continue;
    ctx.fillStyle = '#9db4d4';
    ctx.fillRect(vx - 2, vy - 2, 4, 4);
  }

  // Flashing Police Cruisers
  const copFlash = Math.floor(elapsed * 8) % 2 === 0;
  for (const c of police.cruisers) {
    if (c.destroyed) continue;
    const vx = toMapX(c.x);
    const vy = toMapY(c.z);
    if (vx < -6 || vx > w + 6 || vy < -6 || vy > h + 6) continue;
    ctx.fillStyle = c.sirensActive ? (copFlash ? '#ff2a55' : '#29b6ff') : '#5aa7ff';
    ctx.beginPath();
    ctx.arc(vx, vy, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Marlin Cartel Enemies (crimson blips)
  for (const e of npcManager.enemies) {
    if (e.dead) continue;
    const ex = toMapX(e.x);
    const ey = toMapY(e.z);
    if (ex < -6 || ex > w + 6 || ey < -6 || ey > h + 6) continue;
    ctx.fillStyle = '#ff2e63';
    ctx.beginPath();
    ctx.arc(ex, ey, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player Directional Arrow (center of minimap)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI - player.heading);
  ctx.fillStyle = '#00f5ff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5.5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5.5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
