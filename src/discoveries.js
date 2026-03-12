/**
 * Discovery / gamification system for The Time Stack.
 * Tracks which artifacts the user has discovered,
 * XP earned, and achievements unlocked.
 */

const STORAGE_KEY = 'timestack_discoveries';
const TOTAL_ARTIFACTS = 15; // 5 layers × 3 objects
const XP_PER_DISCOVERY = 100;

const ACHIEVEMENTS = [
  { id: 'first', name: 'First Find', desc: 'Discover your first artifact', threshold: 1 },
  { id: 'curious', name: 'Curious Mind', desc: 'Discover 5 artifacts', threshold: 5 },
  { id: 'halfway', name: 'Halfway There', desc: 'Discover 8 artifacts', threshold: 8 },
  { id: 'archaeologist', name: 'Archaeologist', desc: 'Discover 12 artifacts', threshold: 12 },
  { id: 'completionist', name: 'Completionist', desc: 'Discover all 15 artifacts', threshold: 15 },
];

function loadDiscoveries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return { discovered: [], xp: 0, achievements: [] };
}

function saveDiscoveries(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

/**
 * Record a discovery. Returns:
 * { isNew, totalDiscovered, totalXP, newAchievement, progress }
 */
export function recordDiscovery(layerIndex, objectIndex) {
  const key = `${layerIndex}-${objectIndex}`;
  const data = loadDiscoveries();
  const isNew = !data.discovered.includes(key);

  if (isNew) {
    data.discovered.push(key);
    data.xp += XP_PER_DISCOVERY;

    // Check for new achievements
    let newAchievement = null;
    for (const ach of ACHIEVEMENTS) {
      if (data.discovered.length >= ach.threshold && !data.achievements.includes(ach.id)) {
        data.achievements.push(ach.id);
        newAchievement = ach;
        break; // Only show one at a time
      }
    }

    saveDiscoveries(data);

    return {
      isNew: true,
      totalDiscovered: data.discovered.length,
      totalXP: data.xp,
      newAchievement,
      progress: data.discovered.length / TOTAL_ARTIFACTS,
    };
  }

  return {
    isNew: false,
    totalDiscovered: data.discovered.length,
    totalXP: data.xp,
    newAchievement: null,
    progress: data.discovered.length / TOTAL_ARTIFACTS,
  };
}

/**
 * Get current discovery state without recording anything.
 */
export function getDiscoveryState() {
  const data = loadDiscoveries();
  return {
    totalDiscovered: data.discovered.length,
    totalXP: data.xp,
    progress: data.discovered.length / TOTAL_ARTIFACTS,
    achievements: data.achievements,
    discovered: data.discovered,
  };
}

/**
 * Check if a specific artifact has been discovered.
 */
export function isDiscovered(layerIndex, objectIndex) {
  const data = loadDiscoveries();
  return data.discovered.includes(`${layerIndex}-${objectIndex}`);
}

export { TOTAL_ARTIFACTS, XP_PER_DISCOVERY, ACHIEVEMENTS };
