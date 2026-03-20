// src/game/utils.ts
import type { GameState } from './Game';

export const checkReachabilityModes = (sourceId: string, targetId: string, G: GameState, playerId: string) => {
  const geo = G.mapGeometry;
  const regions = G.regions;
  
  let canTotMa = false;
  let canPhao = false;
  let canTau = false;

  if (!geo[sourceId] || !geo[targetId]) return { canTotMa, canPhao, canTau };

  const sourceGeo = geo[sourceId];
  const targetGeo = geo[targetId];

  if (sourceGeo.neighbors.includes(targetId)) {
    if (targetGeo.type === 'Land' && sourceGeo.type === 'Land') {
      canTotMa = true;
      canPhao = true;
    } else if (targetGeo.type === 'Water' && sourceGeo.type === 'Water') {
      canTau = true;
    }
    return { canTotMa, canPhao, canTau };
  }

  if (targetGeo.type === 'Water') return { canTotMa, canPhao, canTau };

  if (sourceGeo.type === 'Land') {
    for (const nId of sourceGeo.neighbors) {
      const nGeo = geo[nId];
      const nData = regions[nId];
      if (nGeo.type === 'Water' && nData && nData.owner === playerId && nData.troops.tau > 0) {
        if (nGeo.neighbors.includes(targetId)) {
          canPhao = true;
          break;
        }
      }
    }

    const visited = new Set<string>();
    const queue = [sourceId];
    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const nId of geo[current].neighbors) {
        if (nId === targetId) {
          canTotMa = true;
          return { canTotMa, canPhao, canTau }; 
        }
        if (!visited.has(nId)) {
          const nGeo = geo[nId];
          const nData = regions[nId];
          if (nGeo && nGeo.type === 'Water' && nData && nData.owner === playerId && nData.troops.tau > 0) {
            visited.add(nId);
            queue.push(nId);
          }
        }
      }
    }
  }

  return { canTotMa, canPhao, canTau };
};