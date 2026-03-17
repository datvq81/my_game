export const generateSandboxMap = (
  cols = 100, rows = 100, countLand = 35, countWater = 10, waterCoverage = 0.35
) => {
  const hexSize = 40;
  const hexToPixel = (q: number, r: number) => ({
    x: hexSize * Math.sqrt(3) * (q + r / 2),
    y: hexSize * (3 / 2) * r
  });

  let regionCounter = 0;
  const terrainDict: Record<string, string> = {};

  const waterRegions = Array.from({length: countWater}, () => {
    const id = `W_${regionCounter++}`;
    terrainDict[id] = 'Water';
    return id;
  });

  const landRegions = Array.from({length: countLand}, () => {
    const id = `L_${regionCounter++}`;
    terrainDict[id] = 'Land'; 
    return id;
  });

  const allCells = new Map<string, {q: number, r: number, key: string}>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const q = c - Math.floor(r / 2);
      allCells.set(`${q},${r}`, { q, r, key: `${q},${r}` });
    }
  }

  const getNeighbors = (q: number, r: number) => {
    return [{ q: q + 1, r: r }, { q: q + 1, r: r - 1 }, { q: q, r: r - 1 },
            { q: q - 1, r: r }, { q: q - 1, r: r + 1 }, { q: q, r: r + 1 }]
      .map(n => `${n.q},${n.r}`).filter(k => allCells.has(k));
  };

  const cellAssignments = new Map<string, string>(); 
  const unassigned = new Set(allCells.keys());

  const growRegions = (chars: string[], frontiers: string[][], targetFillCount: number) => {
    const sizes = new Array(frontiers.length).fill(1); 

    while (unassigned.size > 0 && cellAssignments.size < targetFillCount) {
      let minSize = Infinity;
      let targetIdx = -1;
      
      for (let i = 0; i < frontiers.length; i++) {
        if (frontiers[i].length > 0 && sizes[i] < minSize) {
          minSize = sizes[i];
          targetIdx = i;
        }
      }

      if (targetIdx === -1) break; 

      const randIdx = Math.floor(Math.random() * frontiers[targetIdx].length);
      const currentKey = frontiers[targetIdx].splice(randIdx, 1)[0];
      const [q, r] = currentKey.split(',').map(Number);

      getNeighbors(q, r).forEach(nKey => {
        if (unassigned.has(nKey)) {
          unassigned.delete(nKey);
          cellAssignments.set(nKey, chars[targetIdx]);
          frontiers[targetIdx].push(nKey); 
          sizes[targetIdx]++;              
        }
      });
    }
  };

  const EDGE_THICKNESS = 2; 
  const waterFrontiers: string[][] = Array.from({ length: countWater }, () => []);
  const centerX = cols / 2, centerY = rows / 2;

  // Xếp nước quanh viền
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < EDGE_THICKNESS || c >= cols - EDGE_THICKNESS || r < EDGE_THICKNESS || r >= rows - EDGE_THICKNESS) {
        const q = c - Math.floor(r / 2);
        const key = `${q},${r}`;
        let angle = Math.atan2(r - centerY, c - centerX);
        if (angle < 0) angle += 2 * Math.PI;
        const wIdx = Math.floor((angle / (2 * Math.PI)) * countWater) % countWater;
        
        cellAssignments.set(key, waterRegions[wIdx]);
        unassigned.delete(key);
        waterFrontiers[wIdx].push(key);
      }
    }
  }
  growRegions(waterRegions, waterFrontiers, Math.floor(cols * rows * waterCoverage));

  // =======================================================
  // THUẬT TOÁN ĐẶT FAT SEEDS
  // =======================================================
  const CORE_RADIUS = 4; 
  
  const getCellsInRadius = (centerQ: number, centerR: number, radius: number) => {
    const cells: string[] = [];
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
        cells.push(`${centerQ + dq},${centerR + dr}`);
      }
    }
    return cells;
  };

  const availableLand = Array.from(unassigned);
  const landFrontiers: string[][] = Array.from({ length: countLand }, () => []);
  const landSeeds: {q: number, r: number}[] = [];
  const debugCorePixels: {x: number, y: number}[] = [];
  
  // SỔ TAY 1: Lưu chính xác Pixel của hạt giống lõi
  const originalSeedPixels = new Map<string, {x: number, y: number}>();

  for (let i = 0; i < countLand; i++) {
    if (availableLand.length === 0) break;
    
    let bestKey: string | null = null;
    let maxDist = -1;

    for (let k = 0; k < 35; k++) {
      const testIdx = Math.floor(Math.random() * availableLand.length);
      const testKey = availableLand[testIdx];
      const [tq, tr] = testKey.split(',').map(Number);

      const testCoreCells = getCellsInRadius(tq, tr, CORE_RADIUS);
      const isCoreIntact = testCoreCells.every(key => unassigned.has(key));
      
      if (!isCoreIntact) continue; 

      if (landSeeds.length === 0) {
        bestKey = testKey;
        break;
      }

      let minDistToSeed = Infinity;
      for (const seed of landSeeds) {
        const dist = Math.max(Math.abs(tq - seed.q), Math.abs(tq + tr - seed.q - seed.r), Math.abs(tr - seed.r));
        if (dist < minDistToSeed) minDistToSeed = dist;
      }

      if (minDistToSeed > maxDist) {
        maxDist = minDistToSeed;
        bestKey = testKey;
      }
    }

    if (!bestKey || (landSeeds.length > 0 && maxDist < CORE_RADIUS * 2 + 1)) break;

    const [bq, br] = bestKey.split(',').map(Number);
    landSeeds.push({ q: bq, r: br });
    
    // Ghi chép tọa độ gốc không bao giờ sai lệch
    originalSeedPixels.set(landRegions[i], hexToPixel(bq, br));
    
    const coreCells = getCellsInRadius(bq, br, CORE_RADIUS);
    
    coreCells.forEach(key => {
      if (unassigned.has(key)) {
        const [cq, cr] = key.split(',').map(Number);
        debugCorePixels.push(hexToPixel(cq, cr));

        unassigned.delete(key);
        cellAssignments.set(key, landRegions[i]);
        landFrontiers[i].push(key); 
        
        const idx = availableLand.indexOf(key);
        if (idx > -1) availableLand.splice(idx, 1);
      }
    });
  }

  growRegions(landRegions, landFrontiers, Infinity);

  if (unassigned.size > 0) unassigned.forEach(k => cellAssignments.set(k, waterRegions[0]));

  const finalAssignments = new Map<string, string>();
  const finalDict: Record<string, string> = {};
  
  // SỔ TAY 2: Chuyển giao tọa độ sang ID Mới
  const finalSeedPixels = new Map<string, {x: number, y: number}>();
  let finalCounter = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const q = c - Math.floor(r / 2);
      const key = `${q},${r}`;

      if (!finalAssignments.has(key)) {
        const originalId = cellAssignments.get(key);
        if (!originalId) continue; 
        const terrainType = terrainDict[originalId] || 'Land';
        
        const newId = `${terrainType === 'Water' ? 'W' : 'L'}_FINAL_${finalCounter++}`;
        finalDict[newId] = terrainType;

        // Truyền tọa độ Lõi sang ID mới
        if (originalSeedPixels.has(originalId)) {
          finalSeedPixels.set(newId, originalSeedPixels.get(originalId)!);
        }

        const queue = [key];
        finalAssignments.set(key, newId);

        let head = 0;
        while (head < queue.length) {
          const currKey = queue[head++];
          const [currQ, currR] = currKey.split(',').map(Number);

          getNeighbors(currQ, currR).forEach(nKey => {
            if (!finalAssignments.has(nKey) && cellAssignments.get(nKey) === originalId) {
              finalAssignments.set(nKey, newId);
              queue.push(nKey);
            }
          });
        }
      }
    }
  }

  const MIN_REGION_SIZE = 8; 
  const regionCellCounts = new Map<string, number>();
  
  finalAssignments.forEach((id) => {
    regionCellCounts.set(id, (regionCellCounts.get(id) || 0) + 1);
  });

  let isAbsorbing = true;
  let safetyLoop = 0; 
  
  while (isAbsorbing && safetyLoop < 20) {
    safetyLoop++;
    isAbsorbing = false;
    
    for (const [key, id] of finalAssignments.entries()) {
      if (regionCellCounts.get(id)! < MIN_REGION_SIZE) {
        const [q, r] = key.split(',').map(Number);
        const neighbors = getNeighbors(q, r);
        
        let bestNeighborId = null;
        let maxNeighborSize = -1;

        neighbors.forEach(nKey => {
          const nId = finalAssignments.get(nKey);
          if (nId && nId !== id) {
            const nSize = regionCellCounts.get(nId)!;
            if (nSize > maxNeighborSize) {
              maxNeighborSize = nSize;
              bestNeighborId = nId;
            }
          }
        });

        if (bestNeighborId) {
          finalAssignments.set(key, bestNeighborId);
          regionCellCounts.set(id, regionCellCounts.get(id)! - 1);
          regionCellCounts.set(bestNeighborId, regionCellCounts.get(bestNeighborId)! + 1);
          isAbsorbing = true; 
        }
      }
    }
  }

  const fmt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

  const mapGraph: Record<string, any> = {};
  for (const id in finalDict) {
    if (Array.from(finalAssignments.values()).includes(id)) {
      mapGraph[id] = { id, type: finalDict[id], neighbors: new Set(), cells: [], edges: [] };
    }
  }

  const neighborDirections = [
    { dq: 1, dr: 0 }, { dq: 0, dr: 1 }, { dq: -1, dr: 1 },
    { dq: -1, dr: 0 }, { dq: 0, dr: -1 }, { dq: 1, dr: -1 }
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const q = c - Math.floor(r / 2);
      const key = `${q},${r}`;
      const regionId = finalAssignments.get(key);
      if (!regionId) continue;

      const center = hexToPixel(q, r);
      mapGraph[regionId].cells.push(center);

      const corners = [];
      for (let i = 0; i < 6; i++) {
        const angle_rad = Math.PI / 180 * (60 * i - 30);
        corners.push({ x: center.x + hexSize * Math.cos(angle_rad), y: center.y + hexSize * Math.sin(angle_rad) });
      }

      for (let i = 0; i < 6; i++) {
        const nd = neighborDirections[i];
        const nKey = `${q + nd.dq},${r + nd.dr}`;
        const nRegionId = finalAssignments.get(nKey);

        if (nRegionId && nRegionId !== regionId) {
          mapGraph[regionId].neighbors.add(nRegionId);
          mapGraph[nRegionId].neighbors.add(regionId);
        }

        if (nRegionId !== regionId) {
          const p1 = fmt(corners[i].x, corners[i].y);
          const p2 = fmt(corners[(i + 1) % 6].x, corners[(i + 1) % 6].y);
          mapGraph[regionId].edges.push({ p1, p2 });
        }
      }
    }
  }

  const compiledGeometry: Record<string, any> = {};

  for (const id in mapGraph) {
    const region = mapGraph[id];
    if (region.cells.length === 0) continue;

    // 1. TÌM TÂM TRUNG BÌNH (Chỉ dùng làm dự phòng cho vùng Nước viền ngoài cùng)
    const avgX = region.cells.reduce((sum: number, p: any) => sum + p.x, 0) / region.cells.length;
    const avgY = region.cells.reduce((sum: number, p: any) => sum + p.y, 0) / region.cells.length;
    let fallbackCenter = region.cells[0];
    let minDist = Infinity;
    for(const cell of region.cells) {
       const dist = Math.pow(cell.x - avgX, 2) + Math.pow(cell.y - avgY, 2);
       if(dist < minDist) { minDist = dist; fallbackCenter = cell; }
    }

    // 2. LẤY TÂM LÕI CHÍNH XÁC (Tuyệt đối không cần phải đoán nữa!)
    const exactCenter = finalSeedPixels.has(id) ? finalSeedPixels.get(id)! : fallbackCenter;

    let edges = [...region.edges];
    let svgPath = "";

    while (edges.length > 0) {
      const startEdge = edges.shift()!;
      svgPath += ` M ${startEdge.p1} L ${startEdge.p2}`;
      let currentPoint = startEdge.p2;

      let loopClosed = false;
      let safetyLimit = 0;
      while (!loopClosed && edges.length > 0 && safetyLimit < 5000) {
        safetyLimit++;
        const nextIndex = edges.findIndex(e => e.p1 === currentPoint);
        if (nextIndex !== -1) {
          const nextEdge = edges.splice(nextIndex, 1)[0];
          svgPath += ` L ${nextEdge.p2}`;
          currentPoint = nextEdge.p2;
          if (currentPoint === startEdge.p1) {
            loopClosed = true;
            svgPath += " Z"; 
          }
        } else {
          break; 
        }
      }
    }

    compiledGeometry[id] = {
      id: id,
      type: region.type,
      neighbors: Array.from(region.neighbors),
      svgPath: svgPath,
      // Gán tâm tĩnh, bất kể sau này bạn có đổi Đất thành Nước thì cái tâm này vẫn đứng im!
      center: { x: exactCenter.x, y: exactCenter.y },
      area: region.cells.length 
    };
  }

  compiledGeometry['DEBUG_CORES'] = {
    id: 'DEBUG_CORES',
    type: 'DebugCores',
    neighbors: [],
    svgPath: '',
    center: { x: 0, y: 0 },
    area: 0,
    corePixels: debugCorePixels
  };

  return compiledGeometry;
};