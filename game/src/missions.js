import * as THREE from 'three';
import { MISSIONS } from './config.js';

export function createMissionManager(scene, npcManager, callbacks) {
  // 3D spinning gold/cyan mission waypoint beacon
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.9, 28, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = 14;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.22, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.15),
    new THREE.MeshBasicMaterial({ color: 0xffd166, wireframe: false })
  );
  diamond.position.y = 4.2;
  beacon.add(beam, ring, diamond);
  scene.add(beacon);

  const state = {
    missionIndex: 0,
    checkpointIndex: 0,
    completedCount: 0,
    allComplete: false,
    enemiesInitial: 0,
    targetPos: null,
    beacon,

    startMission(idx, silent = false) {
      if (idx >= MISSIONS.length) {
        this.allComplete = true;
        this.missionIndex = MISSIONS.length;
        this.targetPos = null;
        beacon.visible = false;
        npcManager.clearCartelSquad();
        return;
      }
      this.allComplete = false;
      this.missionIndex = idx;
      this.checkpointIndex = 0;
      const m = MISSIONS[idx];

      if (m.type === 'drive_checkpoints') {
        npcManager.clearCartelSquad();
        const cp = m.checkpoints[0];
        this.targetPos = { x: cp.x, z: cp.z };
        beacon.visible = true;
        beacon.position.set(cp.x, 0, cp.z);
      } else if (m.type === 'eliminate') {
        this.targetPos = { x: m.targetPos.x, z: m.targetPos.z };
        this.enemiesInitial = m.enemyCount;
        npcManager.spawnCartelSquad(m.targetPos.x, m.targetPos.z, m.enemyCount);
        beacon.visible = true;
        beacon.position.set(m.targetPos.x, 0, m.targetPos.z);
      }

      if (!silent && callbacks.onComms) {
        callbacks.onComms('CAMILA VEGA // SYNDICATE FIXER', m.introComms, 7.5);
      }
    },

    getCurrentMission() {
      if (this.allComplete) return null;
      return MISSIONS[this.missionIndex] || null;
    },

    getHudInfo() {
      if (this.allComplete) {
        return {
          badge: 'SYNDICATE KINGPIN',
          title: 'SOLMARA BAY CONQUERED',
          objective: 'Free roam open — pull stunts, hijack rides, or test 5-star SBPD heat',
          reward: '5/5 DONE',
          progress: 1,
        };
      }
      const m = MISSIONS[this.missionIndex];
      if (m.type === 'drive_checkpoints') {
        const cp = m.checkpoints[this.checkpointIndex];
        return {
          badge: `SYNDICATE CONTRACT ${this.missionIndex + 1}/${MISSIONS.length}`,
          title: m.title,
          objective: cp ? cp.label : m.title,
          reward: `+$${m.rewardCash.toLocaleString()}`,
          progress: (this.checkpointIndex + 0.15) / m.checkpoints.length,
        };
      }
      const alive = npcManager.enemies.filter((e) => !e.dead).length;
      const total = Math.max(1, this.enemiesInitial);
      return {
        badge: `SYNDICATE CONTRACT ${this.missionIndex + 1}/${MISSIONS.length}`,
        title: m.title,
        objective: `${m.objective} (${total - alive}/${total} cleared)`,
        reward: `+$${m.rewardCash.toLocaleString()}`,
        progress: (total - alive) / total,
      };
    },

    completeCurrent(player) {
      const m = MISSIONS[this.missionIndex];
      this.completedCount = Math.max(this.completedCount, this.missionIndex + 1);
      player.cash += m.rewardCash;
      player.rep += m.rewardRep;
      if (callbacks.onMissionComplete) {
        callbacks.onMissionComplete(m);
      }
      if (callbacks.onComms) {
        callbacks.onComms('CAMILA VEGA // SYNDICATE FIXER', m.completeComms, 6.5);
      }
      const next = this.missionIndex + 1;
      setTimeout(() => {
        if (this.missionIndex === next - 1) {
          this.startMission(next);
        }
      }, 3200);
    },

    update(dt, elapsed, player) {
      if (beacon.visible) {
        diamond.rotation.y = elapsed * 2.4;
        diamond.position.y = 4.2 + Math.sin(elapsed * 3.5) * 0.65;
        ring.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.08);
      }

      if (this.allComplete) return;
      const m = MISSIONS[this.missionIndex];
      if (!m) return;

      if (m.type === 'drive_checkpoints') {
        const cp = m.checkpoints[this.checkpointIndex];
        if (!cp) return;
        const dist = Math.hypot(player.x - cp.x, player.z - cp.z);
        if (dist < 11.5) {
          this.checkpointIndex++;
          if (this.checkpointIndex < m.checkpoints.length) {
            const nextCp = m.checkpoints[this.checkpointIndex];
            this.targetPos = { x: nextCp.x, z: nextCp.z };
            beacon.position.set(nextCp.x, 0, nextCp.z);
            if (callbacks.onCheckpoint) callbacks.onCheckpoint(nextCp);
          } else {
            beacon.visible = false;
            this.completeCurrent(player);
          }
        }
      } else if (m.type === 'eliminate') {
        const alive = npcManager.enemies.filter((e) => !e.dead);
        if (alive.length === 0 && this.enemiesInitial > 0) {
          beacon.visible = false;
          this.enemiesInitial = 0;
          this.completeCurrent(player);
        } else if (alive.length > 0) {
          this.targetPos = { x: alive[0].x, z: alive[0].z };
          beacon.position.set(alive[0].x, 0, alive[0].z);
        }
      }
    },
  };

  return state;
}
