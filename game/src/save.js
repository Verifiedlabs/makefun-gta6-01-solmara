const SAVE_KEY = 'solmara_bay_career_v1';

export function loadCareerSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeCareerSave(payload) {
  try {
    const data = {
      cash: Math.round(payload.cash || 0),
      rep: Math.round(payload.rep || 0),
      missionIndex: payload.missionIndex || 0,
      completedCount: payload.completedCount || 0,
      district: payload.district || 'CORAL STRIP',
      health: Math.round(payload.health ?? 100),
      armor: Math.round(payload.armor ?? 50),
      x: Number((payload.x ?? 140).toFixed(1)),
      z: Number((payload.z ?? 42).toFixed(1)),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

export function formatSaveSummary(save) {
  if (!save) return '';
  const done = Math.min(5, save.completedCount ?? save.missionIndex ?? 0);
  return `$${save.cash.toLocaleString()} • ${save.rep} REP • ${done}/5 CONTRACTS • ${save.district}`;
}
