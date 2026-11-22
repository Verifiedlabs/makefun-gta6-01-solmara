import * as THREE from 'three';
import { getDistrictAt } from './config.js';
import { buildCity } from './city.js';
import { createVehicle, updateVehiclePhysics, resolveVehicleToVehicleCollisions } from './vehicles.js';
import { createPlayer } from './player.js';
import { createCombatSystem } from './combat.js';
import { createNPCManager } from './npc.js';
import { createPoliceSystem } from './police.js';
import { createMissionManager } from './missions.js';
import { createAudioEngine } from './audio.js';
import { createHudController } from './hud.js';
import { loadCareerSave, writeCareerSave, formatSaveSummary } from './save.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x46244f, 0.0022);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.25, 900);

// Golden-Hour Coastal Lighting
const hemiLight = new THREE.HemisphereLight(0xffbe8f, 0x262952, 1.05);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffb470, 2.35);
sunLight.position.set(-95, 78, -140);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 420;
sunLight.shadow.camera.left = -140;
sunLight.shadow.camera.right = 140;
sunLight.shadow.camera.top = 140;
sunLight.shadow.camera.bottom = -140;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(0x4be3ff, 0.55);
rimLight.position.set(160, 40, 80);
scene.add(rimLight);

// Build World & Subsystems
const city = buildCity(scene);
const vehicles = [];

// Hero parked supercar & coastal convertible ready for the player
const heroGT = createVehicle(scene, 'solmara_gt', 140, 34, Math.PI, 0xff247a);
const heroCabrio = createVehicle(scene, 'vento_cabrio', 140, 86, Math.PI, 0x00e0ff);
const plazaCar = createVehicle(scene, 'baha_coupe', 64, 35, 0, 0xffc83d);
vehicles.push(heroGT, heroCabrio, plazaCar);

const player = createPlayer(scene);
const combat = createCombatSystem(scene);
const npcManager = createNPCManager(scene, vehicles);
const police = createPoliceSystem(scene, vehicles);
const audio = createAudioEngine();
const hud = createHudController();

const missions = createMissionManager(scene, npcManager, {
  onComms(sender, text, dur) {
    hud.showComms(sender, text, dur);
  },
  onCheckpoint(cp) {
    audio.playChime(620, 840);
    hud.showToast(`CHECKPOINT REACHED — ${cp.label.toUpperCase()}`, 3.2);
  },
  onMissionComplete(m) {
    audio.playChime(523.25, 1046.5);
    hud.showToast(`CONTRACT COMPLETE: ${m.title} (+$${m.rewardCash.toLocaleString()})`, 4.2);
    autoSaveCareer();
  },
});

// Game State
let mode = 'title'; // 'title' | 'playing' | 'paused' | 'wasted'
let elapsed = 0;
let clockMinutes = 18 * 60 + 38; // Golden sunset 18:38
let cameraYaw = Math.PI;
let cameraPitch = 0.22;
let customCameraOverride = null;
let resprayCooldown = 0;

// UI Elements
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const statusOverlay = document.getElementById('status-overlay');
const btnNewCareer = document.getElementById('btn-new-career');
const btnContinueSave = document.getElementById('btn-continue-save');
const saveSummaryText = document.getElementById('save-summary-text');
const pauseStats = document.getElementById('pause-stats');
const btnResume = document.getElementById('btn-resume');
const btnSaveGame = document.getElementById('btn-save-game');
const btnRespray = document.getElementById('btn-respray');
const btnRefill = document.getElementById('btn-refill');
const btnAudioToggle = document.getElementById('btn-audio-toggle');
const btnReturnTitle = document.getElementById('btn-return-title');

function refreshSaveMenu() {
  const save = loadCareerSave();
  if (save) {
    btnContinueSave.classList.remove('hidden');
    saveSummaryText.textContent = formatSaveSummary(save);
  } else {
    btnContinueSave.classList.add('hidden');
  }
}
refreshSaveMenu();

function autoSaveCareer() {
  const dist = getDistrictAt(player.x, player.z);
  writeCareerSave({
    cash: player.cash,
    rep: player.rep,
    missionIndex: missions.missionIndex,
    completedCount: missions.completedCount,
    district: dist.name,
    health: player.health,
    armor: player.armor,
    x: player.x,
    z: player.z,
  });
  refreshSaveMenu();
}

function startNewCareer() {
  audio.unlock();
  customCameraOverride = null;
  player.dead = false;
  player.health = 100;
  player.armor = 50;
  player.cash = 1200;
  player.rep = 0;
  player.refillGear();
  player.armor = 50;
  player.x = 140;
  player.y = 0;
  player.z = 42;
  player.heading = Math.PI;
  if (player.vehicle) player.exitVehicle(city);

  heroGT.x = 140;
  heroGT.z = 34;
  heroGT.y = 0;
  heroGT.vx = 0;
  heroGT.vz = 0;
  heroGT.heading = Math.PI;
  heroGT.health = heroGT.maxHealth;
  heroGT.destroyed = false;

  police.clearWanted();
  missions.completedCount = 0;
  missions.startMission(0);

  mode = 'playing';
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  statusOverlay.classList.add('hidden');
  hud.setVisible(true);
  hud.showToast('WELCOME TO SOLMARA BAY — HIJACK [E] & RULE THE COAST', 3.5);
}

function continueSavedCareer() {
  const save = loadCareerSave();
  if (!save) {
    startNewCareer();
    return;
  }
  audio.unlock();
  customCameraOverride = null;
  player.dead = false;
  player.cash = save.cash;
  player.rep = save.rep;
  player.health = Math.max(40, save.health || 100);
  player.armor = save.armor ?? 50;
  player.x = save.x ?? 140;
  player.z = save.z ?? 42;
  player.y = 0;
  if (player.vehicle) player.exitVehicle(city);
  police.clearWanted();
  missions.completedCount = save.completedCount || save.missionIndex || 0;
  missions.startMission(save.missionIndex || 0);

  mode = 'playing';
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  statusOverlay.classList.add('hidden');
  hud.setVisible(true);
  hud.showToast('CAREER LOADED — BACK ON THE STREETS', 3.0);
}

function setPaused(paused) {
  if (mode !== 'playing' && mode !== 'paused') return;
  mode = paused ? 'paused' : 'playing';
  pauseScreen.classList.toggle('hidden', !paused);
  if (paused) {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    pauseStats.textContent = `CASH: $${Math.round(player.cash).toLocaleString()} • REP: ${Math.round(player.rep)} • HEAT: ${police.wantedLevel}★`;
    btnAudioToggle.textContent = `AUDIO: ${audio.isMuted() ? 'OFF' : 'ON'}`;
  }
}

function performRespray(cost = 200) {
  if (player.cash < cost) {
    hud.showToast(`NEED $${cost} FOR SUNSET AUTO RESPRAY`, 2.5);
    return false;
  }
  player.cash -= cost;
  police.clearWanted();
  if (player.vehicle) {
    player.vehicle.health = player.vehicle.maxHealth;
    player.vehicle.nitro = 100;
    const palette = [0x00f0ff, 0xff2e93, 0xffd166, 0x2ceaa3, 0xff6b35];
    player.vehicle.paintMat.color.setHex(palette[Math.floor(Math.random() * palette.length)]);
  }
  audio.playChime(660, 990);
  hud.showToast('SUNSET AUTO RESPRAY COMPLETE — SBPD HEAT CLEARED!', 3.2);
  return true;
}

btnNewCareer.addEventListener('click', startNewCareer);
btnContinueSave.addEventListener('click', continueSavedCareer);
btnResume.addEventListener('click', () => setPaused(false));
btnSaveGame.addEventListener('click', () => {
  autoSaveCareer();
  audio.playChime(540, 780);
  hud.showToast('CAREER SAVED TO LOCAL STORAGE', 2.6);
});
btnRespray.addEventListener('click', () => {
  if (performRespray(200)) {
    pauseStats.textContent = `CASH: $${Math.round(player.cash).toLocaleString()} • REP: ${Math.round(player.rep)} • HEAT: ${police.wantedLevel}★`;
  }
});
btnRefill.addEventListener('click', () => {
  if (player.cash < 150) {
    hud.showToast('NEED $150 FOR SYNDICATE GEAR REFILL', 2.5);
    return;
  }
  player.cash -= 150;
  player.refillGear();
  audio.playChime(600, 920);
  hud.showToast('ARMOR & AMMO FULLY RESTOCKED', 2.8);
  pauseStats.textContent = `CASH: $${Math.round(player.cash).toLocaleString()} • REP: ${Math.round(player.rep)} • HEAT: ${police.wantedLevel}★`;
});
btnAudioToggle.addEventListener('click', () => {
  const m = audio.toggleMute();
  btnAudioToggle.textContent = `AUDIO: ${m ? 'OFF' : 'ON'}`;
});
btnReturnTitle.addEventListener('click', () => {
  autoSaveCareer();
  mode = 'title';
  pauseScreen.classList.add('hidden');
  hud.setVisible(false);
  startScreen.classList.remove('hidden');
});

// Input Handling
const keys = {};
let mouseDown = false;
let mouseRightDown = false;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Escape') {
    if (mode === 'playing') setPaused(true);
    else if (mode === 'paused') setPaused(false);
    return;
  }
  if (mode !== 'playing') return;

  if (e.code === 'KeyE') {
    handleVehicleToggle();
  } else if (e.code === 'Digit1') {
    player.selectWeapon(0);
  } else if (e.code === 'Digit2') {
    player.selectWeapon(1);
  } else if (e.code === 'Digit3') {
    player.selectWeapon(2);
  } else if (e.code === 'Digit4') {
    player.selectWeapon(3);
  } else if (e.code === 'KeyR') {
    if (player.reload()) hud.showToast('RELOADING...', 1.1);
  } else if (e.code === 'KeyQ') {
    const st = audio.cycleRadio();
    hud.showToast(`RADIO: ${st.name}`, 2.0);
  } else if (e.code === 'KeyM') {
    const m = audio.toggleMute();
    hud.showToast(m ? 'AUDIO MUTED' : 'AUDIO ENABLED', 1.8);
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('mousedown', (e) => {
  if (mode !== 'playing') return;
  audio.unlock();
  if (e.button === 0) {
    mouseDown = true;
    attemptPlayerFire();
  } else if (e.button === 2) {
    mouseRightDown = true;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) mouseRightDown = false;
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  if (mode !== 'playing') return;
  if (document.pointerLockElement === canvas || mouseRightDown || mouseDown) {
    cameraYaw -= e.movementX * 0.0038;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + e.movementY * 0.0028, -0.15, 0.65);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function findNearestVehicle(maxDist = 6.2) {
  let best = null;
  let bestD = maxDist;
  for (const v of vehicles) {
    if (v.destroyed) continue;
    const d = Math.hypot(v.x - player.x, v.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

function handleVehicleToggle() {
  if (player.vehicle) {
    player.exitVehicle(city);
    return;
  }
  const near = findNearestVehicle(6.5);
  if (!near) return;
  const wasOccupied = near.driver === 'traffic' || near.driver === 'police';
  const wasPolice = near.spec.police;
  player.enterVehicle(near);
  audio.playChime(440, 620);
  if (wasOccupied || wasPolice) {
    police.addHeat(wasPolice ? 130 : 75);
    npcManager.alertPanic(near.x, near.z, 36);
    hud.showToast(wasPolice ? 'SBPD CRUISER HIJACKED — HEAT RISING!' : `HIJACKED ${near.spec.name}`, 2.6);
  }
}

function attemptPlayerFire() {
  if (mode !== 'playing' || player.vehicle || player.dead) return;
  const aimDir = new THREE.Vector3();
  camera.getWorldDirection(aimDir);
  aimDir.y = THREE.MathUtils.clamp(aimDir.y, -0.35, 0.35);
  aimDir.normalize();
  player.heading = Math.atan2(aimDir.x, aimDir.z);

  combat.firePlayerWeapon(
    player,
    camera.position,
    aimDir,
    {
      enemies: npcManager.enemies,
      officers: police.officers,
      pedestrians: npcManager.pedestrians,
      vehicles,
    },
    {
      onShotFired(weapon) {
        audio.playGunshot(weapon.id, 0.85);
        if (!weapon.melee) npcManager.alertPanic(player.x, player.z, 52);
      },
      onHit(type, target, damage) {
        if (type === 'enemy') {
          target.health -= damage;
          if (target.health <= 0 && !target.dead) {
            target.dead = true;
            scene.remove(target.group);
            player.cash += 175;
            player.rep += 35;
            hud.showToast('MARLIN CARTEL DOWN (+$175)', 1.8);
          }
        } else if (type === 'officer') {
          target.health -= damage;
          police.addHeat(55);
          if (target.health <= 0 && !target.dead) {
            target.dead = true;
            scene.remove(target.group);
            player.rep += 50;
            police.addHeat(90);
          }
        } else if (type === 'ped') {
          target.dead = true;
          scene.remove(target.group);
          police.addHeat(85);
        } else if (type === 'vehicle') {
          target.health -= damage * 0.9;
          if (target.spec.police) police.addHeat(45);
          if (target.health <= 0 && !target.destroyed) {
            target.destroyed = true;
            target.paintMat.color.setHex(0x1f1f24);
            combat.spawnExplosion(target.x, target.y, target.z);
            audio.playExplosion();
            police.addHeat(110);
            player.rep += 75;
            hud.showToast(`${target.spec.name} WRECKED!`, 2.4);
          }
        }
      },
    }
  );
}

// Camera Controller
const camTargetPos = new THREE.Vector3();
const camLookAt = new THREE.Vector3();

function updateCamera(dt) {
  if (customCameraOverride) {
    camera.position.copy(customCameraOverride.pos);
    camera.lookAt(customCameraOverride.look);
    return;
  }

  if (mode === 'title') {
    // Sweeping golden-sunset aerial orbit across Coral Strip, archway, and bay
    const angle = elapsed * 0.14;
    const cx = 135 + Math.cos(angle) * 58;
    const cz = -18 + Math.sin(angle) * 62;
    camera.position.set(cx, 24 + Math.sin(elapsed * 0.4) * 3, cz);
    camera.lookAt(92, 9, -22);
    return;
  }

  if (player.vehicle) {
    const v = player.vehicle;
    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);
    const speedExtra = Math.min(3.5, v.speed * 0.08);
    const dist = 10.6 + speedExtra;
    const height = 4.3 + (v.nitroActive ? 0.4 : 0);

    camTargetPos.set(v.x - fwdX * dist, v.y + height, v.z - fwdZ * dist);
    camera.position.lerp(camTargetPos, Math.min(1, dt * 6.5));
    camLookAt.set(v.x + fwdX * 8, v.y + 1.6, v.z + fwdZ * 8);
    camera.lookAt(camLookAt);
    cameraYaw = Math.atan2(-fwdX, -fwdZ);
  } else {
    // Smooth third-person over-the-shoulder action camera
    const dist = player.aiming ? 4.4 : 6.4;
    const height = player.aiming ? 2.25 : 2.95;
    const shoulder = player.aiming ? 0.85 : 0.4;
    const sinY = Math.sin(cameraYaw);
    const cosY = Math.cos(cameraYaw);

    camTargetPos.set(
      player.x + sinY * dist + cosY * shoulder,
      player.y + height + Math.sin(cameraPitch) * 2.2,
      player.z + cosY * dist - sinY * shoulder
    );
    camera.position.lerp(camTargetPos, Math.min(1, dt * 11));
    camLookAt.set(
      player.x - sinY * 10 + cosY * shoulder * 0.4,
      player.y + 1.55 - Math.sin(cameraPitch) * 3.0,
      player.z - cosY * 10 - sinY * shoulder * 0.4
    );
    camera.lookAt(camLookAt);
  }
}

// Main Game Loop
let lastTime = performance.now();

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  elapsed += dt;

  city.update(dt, elapsed);

  if (mode === 'playing') {
    clockMinutes += dt * 0.85;
    resprayCooldown = Math.max(0, resprayCooldown - dt);

    // Keyboard camera turn support when on foot
    if (!player.vehicle) {
      if (keys.ArrowLeft) cameraYaw += 2.1 * dt;
      if (keys.ArrowRight) cameraYaw -= 2.1 * dt;
    }

    if (player.dead) {
      player.respawnTimer -= dt;
      statusOverlay.classList.remove('hidden');
      if (player.respawnTimer <= 0) {
        player.dead = false;
        player.health = 100;
        player.armor = 50;
        player.cash = Math.max(0, player.cash - 250);
        if (player.vehicle) player.exitVehicle(city);
        player.x = 140;
        player.z = 42;
        player.y = 0;
        police.clearWanted();
        statusOverlay.classList.add('hidden');
        hud.showToast('RELEASED FROM SOLMARA GENERAL (-$250)', 3.0);
      }
    } else if (player.vehicle) {
      const throttle = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const steer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
      const handbrake = Boolean(keys.Space);
      const nitro = Boolean(keys.ShiftLeft || keys.ShiftRight);

      updateVehiclePhysics(
        player.vehicle,
        { throttle, steer, handbrake, nitro },
        dt,
        city,
        elapsed,
        (bonus, airTime) => {
          player.cash += bonus;
          player.rep += Math.round(bonus * 0.25);
          audio.playChime(700, 1050);
          hud.showToast(`INSANE COASTAL STUNT ${airTime.toFixed(1)}S (+$${bonus})`, 2.8);
        }
      );

      if (player.vehicle.drifting && Math.random() < 0.65) {
        combat.spawnTireSmoke(player.vehicle.x, player.vehicle.y, player.vehicle.z);
      }

      if (player.vehicle.health <= 0 && !player.vehicle.destroyed) {
        const wrecked = player.vehicle;
        wrecked.destroyed = true;
        wrecked.paintMat.color.setHex(0x1f1f24);
        combat.spawnExplosion(wrecked.x, wrecked.y, wrecked.z);
        audio.playExplosion();
        player.exitVehicle(city);
        player.takeDamage(45);
      }
      player.updateOnFoot(dt, {}, cameraYaw, city);
    } else {
      player.aiming = mouseRightDown || mouseDown;
      player.updateOnFoot(
        dt,
        {
          forward: keys.KeyW || keys.ArrowUp,
          backward: keys.KeyS || keys.ArrowDown,
          left: keys.KeyA,
          right: keys.KeyD,
          sprint: keys.ShiftLeft || keys.ShiftRight,
          jump: keys.Space,
        },
        cameraYaw,
        city
      );
      if (mouseDown && player.getCurrentWeapon().automatic) {
        attemptPlayerFire();
      }
    }

    npcManager.update(dt, elapsed, city, player, combat, audio);
    police.update(dt, elapsed, city, player, combat, audio, () => {
      if (resprayCooldown <= 0) {
        resprayCooldown = 5;
        performRespray(0);
      }
    });
    resolveVehicleToVehicleCollisions(vehicles);
    missions.update(dt, elapsed, player);
    combat.update(dt);

    hud.update(dt, elapsed, {
      mode,
      player,
      police,
      missions,
      npcManager,
      city,
      vehicles,
      radioName: audio.getStation().name,
      nearbyVehicle: player.vehicle ? null : findNearestVehicle(6.5),
      clockMinutes,
    });
  } else {
    combat.update(dt);
  }

  audio.update(dt, elapsed, player, police, mode === 'playing');
  updateCamera(dt);
  renderer.render(scene, camera);
}

requestAnimationFrame(tick);

// Staging & Verification Helper API for deterministic visual inspection & screenshots
window.solmaraGame = {
  getState() {
    return {
      mode,
      player: { x: player.x, z: player.z, health: player.health, cash: player.cash, inVehicle: Boolean(player.vehicle) },
      wantedLevel: police.wantedLevel,
      missionIndex: missions.missionIndex,
      vehiclesCount: vehicles.length,
    };
  },
  stageScene(preset) {
    if (preset === 'coral-strip-chase') {
      startNewCareer();
      hud.clearToast();
      missions.startMission(0, true);
      player.cash = 4850;
      player.rep = 420;
      player.armor = 85;
      player.enterVehicle(heroGT);
      heroGT.x = 139.0;
      heroGT.y = 0;
      heroGT.z = 16;
      heroGT.heading = Math.PI;
      heroGT.vx = 0;
      heroGT.vz = -36;
      heroGT.speed = 36;
      heroGT.nitro = 82;
      heroGT.nitroActive = true;
      heroGT.nitroFlame.visible = true;
      heroGT.group.position.set(heroGT.x, 0, heroGT.z);
      heroGT.group.rotation.set(0, heroGT.heading, 0);

      police.setWantedLevel(3);
      const [c1, c2] = police.cruisers;
      c1.x = 144.4; c1.z = 5.5; c1.heading = Math.PI + 0.14; c1.sirensActive = true;
      c1.vx = -2; c1.vz = -30; c1.speed = 30;
      c1.group.position.set(c1.x, 0, c1.z); c1.group.rotation.set(0, c1.heading, 0);
      c2.x = 133.8; c2.z = 22.8; c2.heading = Math.PI - 0.1; c2.sirensActive = true;
      c2.vx = 2; c2.vz = -33; c2.speed = 33;
      c2.group.position.set(c2.x, 0, c2.z); c2.group.rotation.set(0, c2.heading, 0);

      for (let i = 0; i < 6; i++) {
        combat.spawnTireSmoke(heroGT.x + (i % 2 ? -0.9 : 0.9), 0, heroGT.z + 2.6 + i * 0.65);
      }

      customCameraOverride = {
        pos: new THREE.Vector3(141.2, 4.8, 30.8),
        look: new THREE.Vector3(139.5, 4.4, -24),
      };
      hud.showComms('CAMILA VEGA // SYNDICATE FIXER', 'Two SBPD Interceptors on your tail down Coral Strip — hit nitro under the Solmara Bay arch!', 15);
    } else if (preset === 'downtown-firefight') {
      startNewCareer();
      hud.clearToast();
      missions.startMission(1, true);
      player.cash = 6400;
      player.rep = 680;
      player.health = 92;
      player.armor = 70;
      if (player.vehicle) player.exitVehicle(city);
      player.selectWeapon(2); // Compact SMG
      player.x = 24;
      player.y = 0;
      player.z = 51;
      player.heading = Math.atan2(38 - 24, 24 - 51);
      player.aiming = true;
      player.group.position.set(player.x, 0, player.z);
      player.group.rotation.y = player.heading;
      player.parts.rightArmPivot.rotation.x = -Math.PI * 0.48;

      // Arrange Marlin Cartel enemies cleanly across Downtown Neon Fountain Plaza
      const enemyCoords = [
        [33, 21],
        [45, 25],
        [49, 38],
        [22, 26],
        [42, 46],
      ];
      npcManager.enemies.forEach((e, idx) => {
        if (enemyCoords[idx]) {
          e.x = enemyCoords[idx][0];
          e.z = enemyCoords[idx][1];
          e.heading = Math.atan2(player.x - e.x, player.z - e.z);
          e.group.position.set(e.x, 0, e.z);
          e.group.rotation.y = e.heading;
        }
      });

      // Position parked getaway car & SBPD cruiser cleanly at plaza edge
      plazaCar.x = 16.5; plazaCar.z = 38; plazaCar.heading = 0.28;
      plazaCar.group.position.set(plazaCar.x, 0, plazaCar.z);
      plazaCar.group.rotation.set(0, plazaCar.heading, 0);

      police.setWantedLevel(2);
      const cop = police.cruisers[0];
      cop.x = 52; cop.z = 22; cop.heading = -0.95; cop.sirensActive = true;
      cop.group.position.set(cop.x, 0, cop.z);
      cop.group.rotation.set(0, cop.heading, 0);

      // Luminous golden player tracers + crimson cartel tracers + sparks
      const pMuzzle = new THREE.Vector3(player.x + 0.5, 1.5, player.z - 0.6);
      combat.spawnTracer(pMuzzle, new THREE.Vector3(45, 1.45, 25), 0xfff6c4, 0xffc83d, 2.5);
      combat.spawnTracer(pMuzzle, new THREE.Vector3(33, 1.5, 21), 0xfff6c4, 0xffaa22, 2.5);
      combat.triggerMuzzleFlash(pMuzzle, 0xffd166);
      combat.spawnSparks(new THREE.Vector3(45, 1.5, 25), 14, 0xffd166);
      combat.spawnTracer(new THREE.Vector3(49, 1.5, 38), new THREE.Vector3(26, 1.6, 49), 0xffdbe5, 0xff2255, 2.5);
      combat.spawnTracer(new THREE.Vector3(22, 1.5, 26), new THREE.Vector3(25, 1.5, 48), 0xffdbe5, 0xff2255, 2.5);

      customCameraOverride = {
        pos: new THREE.Vector3(17.5, 4.6, 58.2),
        look: new THREE.Vector3(38, 4.2, 26),
      };
      hud.showComms('CAMILA VEGA // SYNDICATE FIXER', 'Marlin Cartel lieutenants locked down Fountain Plaza — clear the courtyard!', 15);
    } else if (preset === 'marina-coastline') {
      startNewCareer();
      hud.clearToast();
      missions.startMission(2, true);
      player.cash = 9150;
      player.rep = 920;
      player.armor = 90;
      player.enterVehicle(heroCabrio);
      heroCabrio.x = 141.5;
      heroCabrio.y = 0;
      heroCabrio.z = 92;
      heroCabrio.heading = 0.14;
      heroCabrio.vx = 4;
      heroCabrio.vz = 26;
      heroCabrio.speed = 26.5;
      heroCabrio.nitro = 92;
      heroCabrio.group.position.set(heroCabrio.x, 0, heroCabrio.z);
      heroCabrio.group.rotation.set(0, heroCabrio.heading, 0);

      police.setWantedLevel(1);
      const cop = police.cruisers[0];
      cop.x = 136.0; cop.z = 84; cop.heading = 0.12; cop.sirensActive = true;
      cop.group.position.set(cop.x, 0, cop.z);
      cop.group.rotation.set(0, cop.heading, 0);

      customCameraOverride = {
        pos: new THREE.Vector3(130.5, 5.8, 76.5),
        look: new THREE.Vector3(172, 4.0, 108),
      };
      hud.showComms('CAMILA VEGA // SYNDICATE FIXER', 'Cut down to Solmara Marina pier — our yacht is staged past the boardwalk.', 15);
    } else if (preset === 'title-menu') {
      writeCareerSave({
        cash: 12450,
        rep: 1180,
        missionIndex: 3,
        completedCount: 3,
        district: 'CORAL STRIP',
        health: 100,
        armor: 85,
        x: 140,
        z: 34,
      });
      refreshSaveMenu();
      mode = 'title';
      hud.setVisible(false);
      pauseScreen.classList.add('hidden');
      startScreen.classList.remove('hidden');
      customCameraOverride = {
        pos: new THREE.Vector3(156, 17, 36),
        look: new THREE.Vector3(122, 11, -24),
      };
    }

    // Immediate HUD + render sync
    hud.update(0.016, elapsed, {
      mode,
      player,
      police,
      missions,
      npcManager,
      city,
      vehicles,
      radioName: audio.getStation().name,
      nearbyVehicle: null,
      clockMinutes,
    });
    updateCamera(0.016);
    renderer.render(scene, camera);
  },
};
