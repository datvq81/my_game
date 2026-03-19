import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { GameState, TroopCounts, MapGeometry, General } from '../game/Game';
import '../App.css'; 
import { MAP_CONFIG } from '../config'; 
import { DraftScreen } from './DraftScreen';
import { GeneralCard } from './GeneralCard';

interface CustomBoardProps extends BoardProps<GameState> {
  setupData?: any;
}

const checkReachabilityModes = (sourceId: string, targetId: string, G: GameState, playerId: string) => {
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

export const Board = (props: CustomBoardProps) => { 
  const { G, ctx, moves, events, setupData, playerID, matchID } = props;

  const hasSynced = useRef(false);
  const [showResultModal, setShowResultModal] = useState(false);
  useEffect(() => {
      if (G.lastBattleResult && G.lastBattleResult.timestamp) {
          setShowResultModal(true);
      }
  }, [G.lastBattleResult?.timestamp]);

  useEffect(() => {
      if ((G.activeBattle && G.activeBattle.stage === 'PREVIEW')) {
          setShowResultModal(false);
      }
  }, [G.activeBattle]);


  useEffect(() => {
    if (setupData && Object.keys(G.mapGeometry).length === 0 && playerID === '0' && !hasSynced.current) {
      hasSynced.current = true;
      if (moves.syncMapData) {
        moves.syncMapData(setupData);
      }
    }
  }, [G.mapGeometry, setupData, moves, playerID]);

  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<'main' | 'recruit' | 'build' | 'move_target' | 'move_select' | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moveSelection, setMoveSelection] = useState<TroopCounts>({ tot: 0, ma: 0, phao: 0, tau: 0 });
  const [recruitSelection, setRecruitSelection] = useState<TroopCounts>({ tot: 0, ma: 0, phao: 0, tau: 0 });
  const [battleSelection, setBattleSelection] = useState<TroopCounts>({ tot: 0, ma: 0, phao: 0, tau: 0 });
  const [selectedGeneralForCombat, setSelectedGeneralForCombat] = useState<string | null>(null);

  useEffect(() => {
    if (!G.activeBattle) {
      setSelectedGeneralForCombat(null);
    }
  }, [G.activeBattle]);

  const [showStats, setShowStats] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') { e.preventDefault(); setShowStats(true); }
      if (e.code === 'Space') { e.preventDefault(); setIsSpacePressed(true); }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') { e.preventDefault(); setShowStats(false); }
      if (e.code === 'Space') { e.preventDefault(); setIsSpacePressed(false); }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const playerColors: Record<string, string> = { 
    '0': '#ee0a0a', '1': '#22ec0f', '2': '#0f5e9c', '3': '#e6b800'
  };

  const allPlayerStats = useMemo(() => {
    const stats: Record<string, any> = {};
    for (let i = 0; i < ctx.numPlayers; i++) {
      const p = i.toString();
      let castles = 0;
      let granaries = 0;
      let armyGroups = 0;
      let totalTroops = 0;
      let totalRegions = 0;

      Object.values(G.regions).forEach(r => {
        if (r.owner === p) {
          totalRegions++;
          if (r.hasCastle) castles++;
          if (r.hasGranary) granaries++;
          const troopsCount = r.troops.tot + r.troops.ma + r.troops.phao + r.troops.tau;
          totalTroops += troopsCount;
          if (troopsCount >= 2) armyGroups++;
        }
      });

      const income = MAP_CONFIG.balance.economy.base_income + castles * MAP_CONFIG.balance.economy.castle_income + granaries * MAP_CONFIG.balance.economy.granary_income;
      const gold = G.reserves?.[p] || 0;
      const generals = G.playerGenerals?.[p] || [];

      stats[p] = { castles, granaries, armyGroups, totalTroops, income, gold, generals, totalRegions }; // Truyền biến ra
    }
    return stats;
  }, [G.regions, G.reserves, G.playerGenerals, ctx.numPlayers]);

  const currentPlayerStats = allPlayerStats[ctx.currentPlayer] || { limit: 0, armyGroups: 0 };
  currentPlayerStats.limit = currentPlayerStats.granaries * MAP_CONFIG.balance.structures.granary_army_limit;
  const mustDisband = currentPlayerStats.armyGroups > currentPlayerStats.limit;
  
  const totalSelectedTroops = moveSelection.tot + moveSelection.ma + moveSelection.phao + moveSelection.tau;
  const isNeutralActive = activeRegion ? G.regions[activeRegion].owner === null : false;

  const handleRegionClick = (regionId: string) => {
    if (G.isEditor) return;
    if (ctx.currentPlayer !== playerID) return;

    if (G.activeBattle && G.activeBattle.stage === 'RETREAT_SELECT') {
      const battle = G.activeBattle;
      if (battle.retreatingPlayerId !== playerID) return;

      if (!battle.validRetreats?.includes(regionId)) { 
          alert("❌ Vùng này không thể rút lui (Quá xa, không có thuyền, hoặc làm vượt quá sức chứa Kho lương)!"); 
          return; 
      }

      moves.confirmRetreat(regionId);
      return;
    }
    if (ctx.phase === 'SETUP_TERRITORY') {
      const p = ctx.currentPlayer;
      const tracker = G.setupDataTracker[p];
      if (tracker.selectedRegions.length < 3) {
          if (G.regions[regionId].owner !== null) { alert("❌ Vùng này đã có chủ, hãy chọn vùng khác!"); return; }
          if (tracker.selectedRegions.length === 0 && G.mapGeometry[regionId].type !== 'Land') { alert("❌ Vùng khởi đầu tiên BẮT BUỘC phải là Đất liền!"); return; }
          if (tracker.selectedRegions.length > 0) {
              const neighbors = G.mapGeometry[regionId].neighbors;
              if (!neighbors.some(n => tracker.selectedRegions.includes(n))) { alert("❌ Vùng thứ 2 và 3 phải NẰM SÁT (liền kề) với lãnh thổ bạn đang có!"); return; }
          }
          moves.claimInitialRegion(regionId);
      } 
      else if (!tracker.freeCastlePlaced) {
          if (G.mapGeometry[regionId].type !== 'Land') { alert("❌ Thành trì phải được đặt trên Đất liền!"); return; }
          if (G.regions[regionId].owner !== p) { alert("❌ Bạn chỉ được xây Thành trên lãnh thổ của mình!"); return; }
          moves.placeFreeCastle(regionId);
      }
      else if (!tracker.freeGranaryPlaced) {
          if (G.mapGeometry[regionId].type !== 'Land') { alert("❌ Kho lương phải được đặt trên Đất liền!"); return; }
          if (G.regions[regionId].owner !== p) { alert("❌ Bạn chỉ được xây Kho trên lãnh thổ của mình!"); return; }
          
          const neighbors = G.mapGeometry[regionId].neighbors;
          const isOnOrAdjCastle = G.regions[regionId].hasCastle || neighbors.some(n => G.regions[n].owner === p && G.regions[n].hasCastle);
          if (!isOnOrAdjCastle) { alert("❌ Kho lương BẮT BUỘC phải đặt cùng ô hoặc nằm liền kề với Thành trì của bạn!"); return; }
          moves.placeFreeGranary(regionId);
      }
      return;
    }

    if (ctx.phase === 'MAIN_PLAY') {
      const currentPlayerId = ctx.currentPlayer;

      if (actionMenu === 'move_target') {
        if (regionId === activeRegion) {
          setActionMenu('main'); setMoveTarget(null); return;
        }

        const reach = checkReachabilityModes(activeRegion!, regionId, G, currentPlayerId);
        if (!reach.canTotMa && !reach.canPhao && !reach.canTau) {
          alert("❌ Ngoài tầm di chuyển!"); return;
        }

        const isEnemy = G.regions[regionId].owner !== null && G.regions[regionId].owner !== currentPlayerId;
        if (isEnemy) {
          moves.declareAttack(activeRegion, regionId);
          setActiveRegion(null); setActionMenu(null); setMoveTarget(null);
          setBattleSelection({ tot: 0, ma: 0, phao: 0, tau: 0 }); 
        } else {
          setMoveTarget(regionId); setActionMenu('move_select'); setMoveSelection({ tot: 0, ma: 0, phao: 0, tau: 0 });
        }
        return;
      }

      const isNeutralWaterAdjToCastle = G.regions[regionId].owner === null && G.mapGeometry[regionId].type === 'Water' && G.mapGeometry[regionId].neighbors.some(nId => G.regions[nId].owner === currentPlayerId && G.regions[nId].hasCastle);
      if (G.regions[regionId].owner === currentPlayerId || isNeutralWaterAdjToCastle) {
        setActiveRegion(regionId); setActionMenu('main'); setMoveTarget(null);
      } else {
        setActiveRegion(null); setActionMenu(null); setMoveTarget(null);
      }
    }
  };

  const adjustMoveSelection = (type: keyof TroopCounts, delta: number) => {
    if (!activeRegion) return;
    const max = G.regions[activeRegion].troops[type];
    setMoveSelection(prev => ({ ...prev, [type]: Math.max(0, Math.min(max, prev[type] + delta)) }));
  };

  const adjustRecruitSelection = (type: keyof TroopCounts, delta: number) => {
    setRecruitSelection(prev => ({ ...prev, [type]: Math.max(0, prev[type] + delta) }));
  };

  const confirmMove = () => {
    moves.moveTroops(activeRegion, moveTarget, moveSelection);
    setActiveRegion(null); setActionMenu(null); setMoveTarget(null);
  };

  const confirmRecruit = () => { 
    moves.recruitTroopsBulk(activeRegion, recruitSelection); 
    setActiveRegion(null); setActionMenu(null); 
  };

  const handleContextMenu = (e: React.MouseEvent, regionId: string) => {
    e.preventDefault();
    if (G.isEditor) { setMenuPos({ x: e.clientX, y: e.clientY }); setSelectedRegion(regionId); }
  };

  const handleSelectTerrain = (terrainType: string) => {
    if (selectedRegion) moves.changeRegionTerrain(selectedRegion, terrainType);
    setMenuPos(null);
  };

  const handleSaveMap = () => {
    const mapName = prompt("Nhập tên cho bản đồ này:", "Bản đồ Graph Mới");
    if (!mapName) return;
    const newMapData = { id: new Date().getTime().toString(), name: mapName, geometry: G.mapGeometry };
    try {
      const existingMapsJson = localStorage.getItem('hex_conquest_maps');
      const existingMaps = existingMapsJson ? JSON.parse(existingMapsJson) : [];
      existingMaps.push(newMapData);
      localStorage.setItem('hex_conquest_maps', JSON.stringify(existingMaps));
      alert(`Đã lưu bản đồ "${mapName}" thành công!`);
    } catch (error) { alert("Lỗi khi lưu!"); }
  };

  const viewBox = useMemo(() => {
    const regions = Object.values(G.mapGeometry);
    if (regions.length === 0) return "0 0 1000 1000";
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    regions.forEach(geo => {
      minX = Math.min(minX, geo.center.x - 100); maxX = Math.max(maxX, geo.center.x + 100);
      minY = Math.min(minY, geo.center.y - 100); maxY = Math.max(maxY, geo.center.y + 100);
    });
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [G.mapGeometry]);

  const getCurrentInstruction = () => {
    if (G.isEditor) return "Editor: Click phải để đổi địa hình.";
    if (ctx.phase === 'GENERAL_DRAFT') return "Đang trong giai đoạn chiêu mộ Tướng...";
    if (ctx.phase === 'SETUP_TERRITORY') {
      const tracker = G.setupDataTracker[ctx.currentPlayer];
      if (!tracker) return "Đang chờ dữ liệu...";
      if (tracker.selectedRegions.length < 3) return `Hãy chọn ${3 - tracker.selectedRegions.length} vùng lân cận.`;
      if (!tracker.freeCastlePlaced) return "Click vùng của bạn để Đặt Thành.";
      if (!tracker.freeGranaryPlaced) return "Click vùng Thành/Kề Thành để Đặt Kho.";
      return "Đang chờ đổi lượt...";
    }
    
    if (ctx.phase === 'MAIN_PLAY') {
      if (ctx.currentPlayer !== playerID) return `Đang chờ Player ${parseInt(ctx.currentPlayer) + 1} hành động...`;
      if (actionMenu === 'move_target') return "Bấm vào vùng Đích hợp lệ (Sáng màu) để di chuyển/tấn công.";
      if (actionMenu === 'move_select') return "Chọn số lượng quân xuất trận.";
      if (G.roundStep === 'ECONOMY') return "BƯỚC 1: Tuyển quân và xây dựng.";
      if (G.roundStep === 'SUPPORT') return "BƯỚC 2: Bố trí lệnh Hỗ trợ phòng thủ.";
      if (G.roundStep === 'ACTION') return "BƯỚC 3: Di chuyển quân và khai chiến.";
      return "Click vào vùng của bạn để mở Menu.";
    }
    return "Đang chờ...";
  };

  const { mapPaths, mapIcons } = useMemo(() => {
    const paths: React.ReactNode[] = [];
    const icons: React.ReactNode[] = [];
    const ICON_SCALE = 0.8; 
    const STICKER_FILTER = 'drop-shadow(0px 0px 4px #ffffff) drop-shadow(0px 0px 4px #000000) drop-shadow(0px 8px 10px rgba(0,0,0,0.8))';

    Object.values(G.mapGeometry).forEach((geo: MapGeometry) => {
      if (geo.id === 'DEBUG_CORES') return;
      
      const regionData = G.regions[geo.id];
      const isOwned = regionData && regionData.owner !== null;
      const fillUrl = geo.type === 'Land' ? 'url(#land-grad)' : 'url(#water-grad)';
      const fillIconColor = isOwned ? playerColors[regionData.owner!] : '#ffffff';

      const isActive = geo.id === activeRegion;
      const isTarget = geo.id === moveTarget;
      let isRetreatTarget = false;
      let isDimmed = false;

      if (G.activeBattle && G.activeBattle.stage === 'RETREAT_SELECT') {
        const battle = G.activeBattle;
        const isMyRetreat = battle.retreatingPlayerId === ctx.currentPlayer;
        
        if (isMyRetreat && battle.validRetreats?.includes(geo.id)) {
            isRetreatTarget = true;
        } else {
            isDimmed = true;
        }
      } else if (actionMenu === 'move_target' && activeRegion) {
        if (geo.id !== activeRegion) {
          const reach = checkReachabilityModes(activeRegion, geo.id, G, ctx.currentPlayer);
          if (!reach.canTotMa && !reach.canPhao && !reach.canTau) isDimmed = true;
        }
        if (G.activeBattle && isSpacePressed) {
          const battle = G.activeBattle;
          const isSource = geo.id === battle.sourceId;
          const isTarget = geo.id === battle.targetId;
          const targetNeighbors = G.mapGeometry[battle.targetId].neighbors;
          const isSupporter = targetNeighbors.includes(geo.id) && G.regions[geo.id].command === 'supporting' && G.regions[geo.id].owner !== null;
          if (!isSource && !isTarget && !isSupporter) isDimmed = true; 
        }
      }

      paths.push(
        <g 
          key={`path-${geo.id}`} 
          onPointerDown={(e) => { e.stopPropagation(); handleRegionClick(geo.id); }} 
          onContextMenu={(e) => handleContextMenu(e, geo.id)} 
          style={{ cursor: isDimmed ? 'not-allowed' : 'pointer', opacity: isDimmed ? 0.3 : 1, transition: 'opacity 0.3s ease-in-out' }}
        >
          <path d={geo.svgPath} fill={fillUrl} stroke={isOwned ? playerColors[regionData.owner!] : (geo.type === 'Land' ? '#7a4b24' : '#0f5e9c')} strokeWidth={isOwned ? 3 : 1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {isOwned && <path d={geo.svgPath} fill={playerColors[regionData.owner!]} opacity="0.25" pointerEvents="none" />}
          {isActive && <path d={geo.svgPath} className="blinking-active" pointerEvents="none" />}
          {isTarget && <path d={geo.svgPath} className="blinking-target" pointerEvents="none" />}
          {isRetreatTarget && <path d={geo.svgPath} className="blinking-target" pointerEvents="none" />}
        </g>
      );

      const renderTroops = (type: 'tot' | 'ma' | 'phao' | 'tau', count: number, x: number, y: number) => {
        if (count <= 0) return null;
        const imgSrc = { 'tot': '/bo_binh.png', 'ma': '/ky_binh.png', 'phao': '/phao_binh.png', 'tau': '/tau_thuyen.png' }[type];
        const conf = MAP_CONFIG.icons.troop;
        const s = conf.width / 240; 
        const BADGE_SCALE = 3.0; 
        
        return (
          <g key={`${type}-group`} transform={`translate(${x}, ${y}) scale(${ICON_SCALE})`} pointerEvents="none">
            <g className="troop-icon">
              <g style={{ filter: STICKER_FILTER }}>
                <mask id={`mask-${geo.id}-${type}`}>
                  <image href={imgSrc} x={-conf.width / 2} y={conf.offsetY} width={conf.width} height={conf.height} preserveAspectRatio="xMidYMid meet" />
                </mask>
                <rect x={-conf.width / 2} y={conf.offsetY} width={conf.width} height={conf.height} fill={fillIconColor} mask={`url(#mask-${geo.id}-${type})`} />
              </g>
              {count >= 1 && (
                <g transform={`translate(${conf.width / 2}, ${conf.offsetY + conf.height - (40 * s)})`}>
                  <circle cx="0" cy="0" r={24 * s * BADGE_SCALE} fill="#1a1a1a" stroke={fillIconColor} strokeWidth={4 * s * (BADGE_SCALE/2)} />
                  <text x="0" y={8 * s * BADGE_SCALE} fill="#ffffff" fontSize={24 * s * BADGE_SCALE} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">{count}</text>
                </g>
              )}
            </g>
          </g>
        );
      };

      icons.push(
        <g key={`icon-${geo.id}`} style={{ opacity: isDimmed ? 0.3 : 1, transition: 'opacity 0.3s ease-in-out' }} pointerEvents="none">
          <text 
            x={geo.center.x} y={geo.center.y} 
            fontSize="90" 
            fill="#ffffff" opacity="0.4" 
            textAnchor="middle" alignmentBaseline="middle" 
            fontWeight="bold" pointerEvents="none"
          >
            {geo.id.replace('L_FINAL_', '').replace('W_FINAL_', '')}
          </text>
          {regionData && regionData.command === 'supporting' && (
             <text x={geo.center.x} y={geo.center.y} fontSize="175" textAnchor="middle" alignmentBaseline="middle" filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.8))" pointerEvents="none" opacity="0.85">🛡️</text>
          )}
          {regionData && regionData.command === 'acted' && (
             <text x={geo.center.x} y={geo.center.y} fontSize="125" textAnchor="middle" alignmentBaseline="middle" filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.8))" pointerEvents="none" opacity="0.85">🔒</text>
          )}

          {regionData && !G.isEditor && (() => {
            const R = MAP_CONFIG.icons.troop.width * 1.1 * ICON_SCALE; 
            const cos30 = 0.866; const sin30 = 0.5;
            return (
              <g transform={`translate(${geo.center.x}, ${geo.center.y})`}>
                {regionData.hasCastle && (
                  <g transform={`translate(0, 0) scale(${ICON_SCALE})`} pointerEvents="none">
                    <g style={{ filter: STICKER_FILTER }}>
                      <mask id={`mask-${geo.id}-castle`}>
                        <image href="/thanh_tri.png" x={-MAP_CONFIG.icons.castle.width / 2} y={MAP_CONFIG.icons.castle.offsetY} width={MAP_CONFIG.icons.castle.width} height={MAP_CONFIG.icons.castle.height} preserveAspectRatio="xMidYMid meet" />
                      </mask>
                      <rect x={-MAP_CONFIG.icons.castle.width / 2} y={MAP_CONFIG.icons.castle.offsetY} width={MAP_CONFIG.icons.castle.width} height={MAP_CONFIG.icons.castle.height} fill={fillIconColor} mask={`url(#mask-${geo.id}-castle)`} />
                    </g>
                  </g>
                )}
                {regionData.troops.phao > 0 && renderTroops('phao', regionData.troops.phao, R * cos30, R * sin30)}
                {regionData.troops.ma > 0 && renderTroops('ma', regionData.troops.ma, 0, R)}
                {regionData.troops.tot > 0 && renderTroops('tot', regionData.troops.tot, -R * cos30, R * sin30)}
                {regionData.hasGranary && (
                  <g transform={`translate(${-R * cos30}, ${-R * sin30}) scale(${ICON_SCALE})`} pointerEvents="none">
                    <g style={{ filter: STICKER_FILTER }}>
                      <mask id={`mask-${geo.id}-granary`}>
                        <image href="/kho_luong.png" x={-MAP_CONFIG.icons.granary.width / 2} y={MAP_CONFIG.icons.granary.offsetY} width={MAP_CONFIG.icons.granary.width} height={MAP_CONFIG.icons.granary.height} preserveAspectRatio="xMidYMid meet" />
                      </mask>
                      <rect x={-MAP_CONFIG.icons.granary.width / 2} y={MAP_CONFIG.icons.granary.offsetY} width={MAP_CONFIG.icons.granary.width} height={MAP_CONFIG.icons.granary.height} fill={fillIconColor} mask={`url(#mask-${geo.id}-granary)`} />
                    </g>
                  </g>
                )}
                {regionData.troops.tau > 0 && renderTroops('tau', regionData.troops.tau, 0, 0)}
              </g>
            );
          })()}
        </g>
      );
    });

    return { mapPaths: paths, mapIcons: icons };
  }, [G.mapGeometry, G.regions, ctx.phase, ctx.currentPlayer, activeRegion, moveTarget, actionMenu]);

  if (ctx.phase === 'GENERAL_DRAFT' && !G.isEditor) return <DraftScreen G={G} ctx={ctx} moves={moves} playerID={playerID || null} matchID={matchID} />;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse-active { 0% { fill: #ffffff; opacity: 0.1; stroke-width: 0; } 50% { fill: #ffffff; opacity: 0.5; stroke: #ffffff; stroke-width: 6px; } 100% { fill: #ffffff; opacity: 0.1; stroke-width: 0; } }
        .blinking-active { animation: pulse-active 1.5s infinite ease-in-out; }
        @keyframes pulse-target { 0% { fill: #ff1744; opacity: 0.2; stroke-width: 0; } 50% { fill: #ff1744; opacity: 0.7; stroke: #ff1744; stroke-width: 8px; } 100% { fill: #ff1744; opacity: 0.2; stroke-width: 0; } }
        .blinking-target { animation: pulse-target 1s infinite ease-in-out; }
      `}</style>

      {/* BẢNG THỐNG KÊ (SCOREBOARD) */}
      {showStats && !G.isEditor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <h1 style={{ color: '#ffd700', textShadow: '0 2px 5px #000', marginBottom: '5px' }}>📊 BẢNG THỐNG KÊ TRẬN ĐẤU</h1>
          <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '20px' }}>
            Mã phòng: <span style={{ color: '#4CAF50', userSelect: 'all' }}>{matchID || 'Local'}</span>
          </h3>

          <div style={{ display: 'flex', gap: '20px' }}>
            {Object.keys(allPlayerStats).map(pId => {
              const stats = allPlayerStats[pId];
              const isMe = pId === playerID;
              
              return (
                <div key={pId} style={{ background: 'rgba(20,20,20,0.9)', borderTop: `5px solid ${playerColors[pId]}`, borderRadius: '10px', padding: '20px', width: '280px', boxShadow: isMe ? `0 0 20px ${playerColors[pId]}60` : '0 5px 15px rgba(0,0,0,0.5)' }}>
                  <h2 style={{ color: playerColors[pId], marginTop: 0, textAlign: 'center' }}>
                    {isMe ? "BẠN (P" + (parseInt(pId)+1) + ")" : "P" + (parseInt(pId)+1)}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ background: '#333', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>🏰</div><div style={{ color: '#aaa', fontSize: '12px' }}>Thành / Cần Win</div>
                      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{stats.castles} <span style={{fontSize:'14px', color:'#888'}}>/ {MAP_CONFIG.balance.structures.win_condition_castles}</span></div>
                    </div>
                    <div style={{ background: '#333', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>🌾</div><div style={{ color: '#aaa', fontSize: '12px' }}>Kho lương</div>
                      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{stats.granaries}</div>
                    </div>
                    <div style={{ background: '#333', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>💂</div><div style={{ color: '#aaa', fontSize: '12px' }}>Đạo quân / Max Đạo</div>
                      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{stats.armyGroups} <span style={{fontSize:'14px', color:'#888'}}>/ {stats.granaries * MAP_CONFIG.balance.structures.granary_army_limit}</span></div>
                    </div>
                    <div style={{ background: '#333', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>🗺️</div><div style={{ color: '#aaa', fontSize: '12px' }}>Vùng đất sở hữu</div>
                      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{stats.totalRegions}</div>
                    </div>
                  </div>
                  <div style={{ background: '#222', padding: '10px', borderRadius: '5px' }}>
                    <div style={{ color: '#ffd700', fontSize: '14px', marginBottom: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                        Thu nhập hiện tại: +{stats.income} Vàng / lượt
                    </div>
                  </div>
                  <div style={{ background: '#222', padding: '10px', borderRadius: '5px' }}>
                    <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>Đạo quân (≥2 lính): <strong style={{ color: stats.armyGroups > (stats.granaries * MAP_CONFIG.balance.structures.granary_army_limit) ? '#ff5252' : '#4CAF50' }}>{stats.armyGroups}</strong></div>
                    <hr style={{ borderColor: '#444', margin: '5px 0 10px' }} />
                    <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '5px' }}>Trạng thái Tướng:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {stats.generals.length === 0 ? <div style={{ color: '#666', fontStyle: 'italic', fontSize: '12px', textAlign: 'center' }}>Chưa có tướng</div> : (
                        stats.generals.map((g: any) => (
                          <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#111', padding: '5px', borderRadius: '3px' }}>
                            <span style={{ color: g.isDead ? '#666' : '#fff', fontSize: '12px', textDecoration: g.isDead ? 'line-through' : 'none' }}>
                              <span style={{ color: '#ffeb3b', marginRight: '5px' }}>{g.power}đ</span>{g.name}
                            </span>
                            {g.isDead ? <span style={{ color: '#ff5252', fontSize: '12px' }}>Tử trận</span> : g.cooldownRounds > 0 ? <span style={{ color: '#ff9800', fontSize: '12px' }}>Nghỉ ({g.cooldownRounds})</span> : <span style={{ color: '#4CAF50', fontSize: '12px' }}>Sẵn sàng</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '30px', color: '#888', fontStyle: 'italic' }}>Thả phím Tab để đóng bảng</div>
        </div>
      )}
      {/* ========================================================= */}
      {/* HỆ THỐNG CẢNH BÁO WIN VÀ GAME OVER */}
      {/* ========================================================= */}
      {(() => {
        if (G.isEditor || ctx.phase !== 'MAIN_PLAY') return null;
        
        const winThreshold = MAP_CONFIG.balance.structures.win_condition_castles;
        let highestCastles = 0;
        let leadingPlayer = '';
        
        Object.keys(allPlayerStats).forEach(pId => {
            if (allPlayerStats[pId].castles > highestCastles) {
                highestCastles = allPlayerStats[pId].castles;
                leadingPlayer = pId;
            }
        });

        // NẾU GAME ĐÃ KẾT THÚC
        if (ctx.gameover) {
            return (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 11000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h1 style={{ fontSize: '60px', color: '#ffd700', margin: '0 0 10px 0', textShadow: '0 0 20px #ffd700' }}>🏆 TRẬN CHIẾN KẾT THÚC 🏆</h1>
                    <h2 style={{ color: '#fff', fontSize: '30px', marginBottom: '40px' }}>Chúa tể thống nhất lục địa: <span style={{ color: playerColors[ctx.gameover.winner] }}>PLAYER {parseInt(ctx.gameover.winner)+1}</span></h2>
                    
                    <div style={{ background: '#222', padding: '30px', borderRadius: '15px', border: '2px solid #555', width: '400px' }}>
                        <h3 style={{ color: '#aaa', margin: '0 0 20px 0', textAlign: 'center' }}>BẢNG XẾP HẠNG (SỐ THÀNH)</h3>
                        {ctx.gameover.ranking.map((rank: any, index: number) => (
                            <div key={rank.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: index === 0 ? 'rgba(255, 215, 0, 0.2)' : '#111', borderLeft: `5px solid ${playerColors[rank.id]}`, marginBottom: '10px', borderRadius: '5px' }}>
                                <strong style={{ color: playerColors[rank.id], fontSize: '20px' }}>#{index + 1} - Player {parseInt(rank.id)+1}</strong>
                                <strong style={{ color: '#fff', fontSize: '20px' }}>{rank.castles} 🏰</strong>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // NẾU CÒN 1 THÀNH (X-1)
        if (highestCastles === winThreshold - 1) {
            return (
                <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(211,47,47,0.95)', padding: '15px 30px', borderRadius: '30px', color: '#fff', fontSize: '20px', fontWeight: 'bold', zIndex: 9000, boxShadow: '0 0 30px red', border: '2px solid #ffeb3b', animation: 'pulse-target 1s infinite', pointerEvents: 'none' }}>
                    🚨 BÁO ĐỘNG: Player {parseInt(leadingPlayer)+1} sắp chiến thắng ({highestCastles}/{winThreshold} Thành)! 🚨
                </div>
            );
        }
        
        // NẾU CÒN 2 THÀNH (X-2)
        if (highestCastles === winThreshold - 2) {
            return (
                <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,152,0,0.85)', padding: '10px 20px', borderRadius: '20px', color: '#fff', fontWeight: 'bold', zIndex: 9000, pointerEvents: 'none' }}>
                    ⚠️ Lưu ý: Player {parseInt(leadingPlayer)+1} đang vươn lên dẫn đầu ({highestCastles}/{winThreshold} Thành).
                </div>
            );
        }

        return null;
      })()}
      
      {/* ========================================================= */}
      {/* GIAO DIỆN CHIẾN TRANH HỢP NHẤT (UNIFIED BATTLE OVERLAY) */}
      {/* ========================================================= */}
      {G.activeBattle && (() => {
        const battle = G.activeBattle;
        const sourceRegion = G.regions[battle.sourceId];
        const targetRegion = G.regions[battle.targetId];
        const isMyTurn = ctx.currentPlayer === playerID;
        const pcfg = MAP_CONFIG.balance.power;

        // Xử lý Lính xuất trận (Nếu là Preview và là người khác nhìn vào thì trống)
        const currentAttackingTroops = (battle.stage === 'PREVIEW') ? battleSelection : battle.attackingTroops;

        let attackerBasePower = currentAttackingTroops.tot * pcfg.tot + currentAttackingTroops.ma * pcfg.ma + currentAttackingTroops.tau * pcfg.tau;
        attackerBasePower += targetRegion.hasCastle ? (currentAttackingTroops.phao * pcfg.phao_castle) : (currentAttackingTroops.phao * pcfg.phao_base);

        let defenderBasePower = targetRegion.troops.tot * pcfg.tot + targetRegion.troops.ma * pcfg.ma + targetRegion.troops.tau * pcfg.tau;
        defenderBasePower += targetRegion.hasCastle ? (targetRegion.troops.phao * pcfg.phao_castle) : (targetRegion.troops.phao * pcfg.phao_base);
        if (targetRegion.hasCastle) defenderBasePower += MAP_CONFIG.balance.structures.castle_defense_bonus;

// Tính Toán Lực Lượng Viện Trợ
        const targetGeo = G.mapGeometry[battle.targetId];
        let rawAttSupport = 0;
        let rawDefSupport = 0;
        let attSpTroops = { tot: 0, ma: 0, phao: 0, tau: 0 };
        let defSpTroops = { tot: 0, ma: 0, phao: 0, tau: 0 };
        const attackerSupporters: {id: string, power: number}[] = [];
        const defenderSupporters: {id: string, power: number}[] = [];

        G.mapGeometry[battle.targetId].neighbors.forEach(nId => {
            const r = G.regions[nId];
            const nGeo = G.mapGeometry[nId];
            
            // UI CẬP NHẬT ĐÚNG LUẬT: Nước không nhận sp từ Cạn
            if (targetGeo.type === 'Water' && nGeo.type === 'Land') return;

            if (r.command === 'supporting' && r.owner !== null) {
                const phaoPower = r.hasCastle ? pcfg.phao_castle : pcfg.phao_base;
                let rawPower = r.troops.tot * pcfg.tot + r.troops.ma * pcfg.ma + r.troops.tau * pcfg.tau + r.troops.phao * phaoPower;
                
                if (r.owner === battle.attackerId || battle.supportVotes?.[r.owner] === 'ATTACKER') {
                    rawAttSupport += rawPower;
                    attackerSupporters.push({ id: r.owner, power: Math.floor(rawPower * MAP_CONFIG.balance.combat.support_multiplier) });
                    attSpTroops.tot += r.troops.tot; attSpTroops.ma += r.troops.ma; attSpTroops.phao += r.troops.phao; attSpTroops.tau += r.troops.tau;
                } else if (r.owner === battle.defenderId || battle.supportVotes?.[r.owner] === 'DEFENDER') {
                    rawDefSupport += rawPower;
                    defenderSupporters.push({ id: r.owner, power: Math.floor(rawPower * MAP_CONFIG.balance.combat.support_multiplier) });
                    defSpTroops.tot += r.troops.tot; defSpTroops.ma += r.troops.ma; defSpTroops.phao += r.troops.phao; defSpTroops.tau += r.troops.tau;
                }
            }
        });

        const attackerSupportPower = Math.floor(rawAttSupport * MAP_CONFIG.balance.combat.support_multiplier);
        const defenderSupportPower = Math.floor(rawDefSupport * MAP_CONFIG.balance.combat.support_multiplier);

        // Xử lý điểm hiển thị
        const totalSelected = battleSelection.tot + battleSelection.ma + battleSelection.phao + battleSelection.tau;
        let displayAttPower: any = 0;
        let displayDefPower: any = 0;

        if (battle.stage === 'RESULT' || battle.stage === 'RETREAT_SELECT') {
            displayAttPower = battle.attackerFinalPower;
            displayDefPower = battle.defenderFinalPower;
        } else {
            displayDefPower = defenderBasePower + defenderSupportPower;
            if (battle.stage === 'PREVIEW' && !isMyTurn) displayAttPower = null;
            else displayAttPower = attackerBasePower + attackerSupportPower;
        }

        const adjustBattleSelection = (type: keyof TroopCounts, delta: number) => {
          const max = sourceRegion.troops[type];
          setBattleSelection(prev => ({ ...prev, [type]: Math.max(0, Math.min(max, prev[type] + delta)) }));
        };

        return (
          <div style={{ 
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, 
              display: 'flex', flexDirection: 'column', alignItems: 'center', 
              paddingTop: battle.stage === 'PREVIEW' ? '12vh' : '2vh', 
              backdropFilter: 'blur(5px)', 
              transition: 'padding 0.4s ease',
              opacity: isSpacePressed ? 0 : 1,
              pointerEvents: isSpacePressed ? 'none' : 'auto'
          }}>
            
            {/* KHỐI 1: BẢNG THÔNG TIN CHIẾN SỰ */}
            <div className="glass-panel" style={{ width: '850px', padding: '20px', textAlign: 'center', border: '2px solid transparent', boxShadow: '0 0 30px rgba(0, 0, 0, 0.4)', transition: 'all 0.4s ease', transform: battle.stage !== 'PREVIEW' ? 'scale(0.92)' : 'scale(1)', marginBottom: '15px' }}>
              
              {battle.stage === 'PREVIEW' && <h2 style={{ color: '#ff5252', fontSize: '28px', margin: '0 0 15px 0' }}>⚔️ CHIẾN TRƯỜNG ⚔️</h2>}
              
              <div style={{ display: 'flex', gap: '20px' }}>
                {/* THÔNG TIN PHE CÔNG */}
                <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '10px', padding: '15px', border: `2px solid ${playerColors[battle.attackerId]}` }}>
                  <h3 style={{ color: playerColors[battle.attackerId], marginTop: 0 }}>Phe Công (P{parseInt(battle.attackerId) + 1})</h3>
                  
                  <div style={{ fontSize: '16px', background: '#2a2a2a', padding: '10px', borderRadius: '5px', color: '#fff', minHeight: '90px' }}>
                    {battle.stage === 'PREVIEW' && isMyTurn ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(['tot', 'ma', 'phao', 'tau'] as Array<keyof TroopCounts>).map(type => {
                          const max = sourceRegion.troops[type];
                          if (max === 0) return null;
                          const label = {'tot': 'Bộ binh (1đ)', 'ma': 'Kỵ binh (2đ)', 'phao': targetRegion.hasCastle ? `Pháo binh (${pcfg.phao_castle}đ)` : `Pháo binh (${pcfg.phao_base}đ)`, 'tau': 'Thuyền (1đ)'}[type];
                          return (
                            <div key={type} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background: '#1a1a1a', padding: '5px 10px', borderRadius: '5px'}}>
                              <span style={{ fontSize: '13px' }}>{label}</span>
                              <div style={{display:'flex', alignItems:'center'}}>
                                  <button className="game-btn btn-danger" style={{ padding: '2px 8px', minWidth: '30px' }} onClick={() => adjustBattleSelection(type, -1)}>-</button>
                                  <span style={{margin:'0 10px', width:'25px', textAlign:'center', fontWeight: 'bold'}}>{battleSelection[type]}/{max}</span>
                                  <button className="game-btn btn-primary" style={{ padding: '2px 8px', minWidth: '30px' }} onClick={() => adjustBattleSelection(type, 1)}>+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left', paddingTop: '10px' }}>
                        <p style={{ margin: 0 }}>💂 Bộ: <strong>{currentAttackingTroops.tot}</strong></p>
                        <p style={{ margin: 0 }}>🐎 Kỵ: <strong>{currentAttackingTroops.ma}</strong></p>
                        <p style={{ margin: 0 }}>🎯 Pháo: <strong>{currentAttackingTroops.phao}</strong></p>
                        <p style={{ margin: 0 }}>⛵ Thuyền: <strong>{currentAttackingTroops.tau}</strong></p>
                      </div>
                    )}
                  </div>

                  {attackerSupporters.length > 0 && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#1a1a1a', borderRadius: '5px', color: '#fff', fontSize: '13px', border: '1px dashed #4CAF50' }}>
                        <div style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>🤝 Viện trợ (+{attackerSupportPower}đ)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', textAlign: 'left' }}>
                            <p style={{ margin: 0 }}>💂 Bộ: <strong>{attSpTroops.tot}</strong></p>
                            <p style={{ margin: 0 }}>🐎 Kỵ: <strong>{attSpTroops.ma}</strong></p>
                            <p style={{ margin: 0 }}>🎯 Pháo: <strong>{attSpTroops.phao}</strong></p>
                            <p style={{ margin: 0 }}>⛵ Thuyền: <strong>{attSpTroops.tau}</strong></p>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                            {attackerSupporters.map(sup => (
                                <span key={sup.id} style={{ borderBottom: `3px solid ${playerColors[sup.id]}`, padding: '2px 5px', background: '#222', borderRadius: '3px' }}>P{parseInt(sup.id)+1} (+{sup.power})</span>
                            ))}
                        </div>
                    </div>
                  )}

                  {/* THẺ TƯỚNG CÔNG */}
                  {(battle.stage === 'RESULT' || battle.stage === 'RETREAT_SELECT') && battle.attackerGeneral && battle.attackerGeneral !== 'NONE' && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                        <GeneralCard gen={{ ...MAP_CONFIG.balance.generals.pool.find(g => g.id === battle.attackerGeneral)!, isDead: false, cooldownRounds: 0 }} />                      </div>
                  )}

                  <div style={{ marginTop: '15px', padding: '10px', background: '#111', borderRadius: '5px' }}>
                    <span style={{ color: '#aaa' }}>Tổng Sức mạnh: </span>
                    <strong style={{ color: displayAttPower === null ? '#777' : playerColors[battle.attackerId], fontSize: displayAttPower === null ? '18px' : '26px' }}>
                      {displayAttPower === null ? 'Đang chọn quân...' : displayAttPower}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <h2 style={{ color: '#fff', fontSize: '36px', margin: 0, textShadow: '0 0 10px #ff5252' }}>VS</h2>
                </div>

                {/* THÔNG TIN PHE THỦ */}
                <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '10px', padding: '15px', border: `2px solid ${playerColors[battle.defenderId]}` }}>
                  <h3 style={{ color: playerColors[battle.defenderId], marginTop: 0 }}>Phe Thủ (P{parseInt(battle.defenderId) + 1})</h3>
                  
                  <div style={{ fontSize: '16px', background: '#2a2a2a', padding: '10px', borderRadius: '5px', color: '#fff', minHeight: '90px', textAlign: 'left' }}>
                    {targetRegion.hasCastle && <p style={{ margin: '0 0 10px 0', color: '#ffeb3b', fontWeight: 'bold', background: 'rgba(255, 235, 59, 0.2)', padding: '5px', borderRadius: '3px', textAlign: 'center' }}>🏰 Thành Trì (+{MAP_CONFIG.balance.structures.castle_defense_bonus} Thủ)</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: targetRegion.hasCastle ? '0' : '10px' }}>
                      <p style={{ margin: 0 }}>💂 Bộ: <strong>{targetRegion.troops.tot}</strong></p>
                      <p style={{ margin: 0 }}>🐎 Kỵ: <strong>{targetRegion.troops.ma}</strong></p>
                      <p style={{ margin: 0 }}>🎯 Pháo: <strong>{targetRegion.troops.phao}</strong></p>
                      <p style={{ margin: 0 }}>⛵ Thuyền: <strong>{targetRegion.troops.tau}</strong></p>
                    </div>
                  </div>

                  {defenderSupporters.length > 0 && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#1a1a1a', borderRadius: '5px', color: '#fff', fontSize: '13px', border: '1px dashed #4CAF50' }}>
                        <div style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>🤝 Viện trợ (+{defenderSupportPower}đ)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', textAlign: 'left' }}>
                            <p style={{ margin: 0 }}>💂 Bộ: <strong>{defSpTroops.tot}</strong></p>
                            <p style={{ margin: 0 }}>🐎 Kỵ: <strong>{defSpTroops.ma}</strong></p>
                            <p style={{ margin: 0 }}>🎯 Pháo: <strong>{defSpTroops.phao}</strong></p>
                            <p style={{ margin: 0 }}>⛵ Thuyền: <strong>{defSpTroops.tau}</strong></p>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                            {defenderSupporters.map(sup => (
                                <span key={sup.id} style={{ borderBottom: `3px solid ${playerColors[sup.id]}`, padding: '2px 5px', background: '#222', borderRadius: '3px' }}>P{parseInt(sup.id)+1} (+{sup.power})</span>
                            ))}
                        </div>
                    </div>
                  )}

                  {/* THẺ TƯỚNG THỦ */}
                  {(battle.stage === 'RESULT' || battle.stage === 'RETREAT_SELECT') && battle.defenderGeneral && battle.defenderGeneral !== 'NONE' && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                          <GeneralCard gen={{ ...MAP_CONFIG.balance.generals.pool.find(g => g.id === battle.defenderGeneral)!, isDead: false, cooldownRounds: 0 }} />
                      </div>
                  )}

                  <div style={{ marginTop: '15px', padding: '10px', background: '#111', borderRadius: '5px' }}>
                    <span style={{ color: '#aaa' }}>Tổng Sức mạnh: </span>
                    <strong style={{ color: playerColors[battle.defenderId], fontSize: '26px' }}>{displayDefPower}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* KHỐI 2: MENU HÀNH ĐỘNG */}
            <div style={{ width: battle.stage === 'GENERAL_SELECT' ? '1350px' : '850px', transition: 'width 0.3s ease' }}>
              
              {battle.stage === 'PREVIEW' && (
                <div className="glass-panel" style={{ padding: '15px 20px', background: '#222', borderRadius: '10px', border: '1px solid #555' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'left', color: '#aaa', fontSize: '13px' }}>
                      <span style={{ color: '#fff' }}>Dự đoán:</span><br/>
                      ✅ <strong>THẮNG:</strong> Được đất, mất {MAP_CONFIG.balance.combat.winner_troop_loss} quân.<br/>
                      ❌ <strong>THUA:</strong> Mã thành Tốt, mất Pháo, quân bỏ chạy.
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="game-btn btn-primary" style={{ padding: '15px 30px', background: '#555' }} disabled={!isMyTurn} onClick={() => moves.cancelAttack()}>Quay Lại</button>
                      <button className="game-btn btn-danger" style={{ padding: '15px 40px', fontSize: '20px', fontWeight: 'bold', background: (isMyTurn && totalSelected > 0) ? '#d32f2f' : '#555' }} disabled={!isMyTurn || totalSelected === 0} onClick={() => moves.confirmAttack(battleSelection)}>{isMyTurn ? '🔥 PHÁT ĐỘNG 🔥' : 'Đang chờ đối thủ...'}</button>
                    </div>
                  </div>
                </div>
              )}

              {battle.stage === 'SUPPORT_CALL' && (() => {
                const isEligible = battle.eligibleSupporters?.includes(playerID!);
                const hasVoted = battle.supportVotes && battle.supportVotes[playerID!] !== undefined;
                return (
                  <div className="glass-panel" style={{ padding: '20px', background: '#222', border: '2px solid #e040fb', textAlign: 'center' }}>
                    <h2 style={{ color: '#e040fb', margin: '0 0 10px 0', fontSize: '24px' }}>🎺 KÊU GỌI CHƯ HẦU 🎺</h2>
                    {isEligible && !hasVoted ? (
                      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button className="game-btn btn-danger" style={{ padding: '15px', fontSize: '16px' }} onClick={() => moves.castSupportVote('ATTACKER')}>⚔️ Giúp Phe Công</button>
                        <button className="game-btn btn-primary" style={{ padding: '15px', fontSize: '16px', background: '#4CAF50' }} onClick={() => moves.castSupportVote('DEFENDER')}>🏰 Giúp Phe Thủ</button>
                        <button className="game-btn btn-warning" style={{ padding: '15px', fontSize: '16px', background: '#555' }} onClick={() => moves.castSupportVote('NONE')}>☕ Không giúp ai</button>
                      </div>
                    ) : (
                      <div style={{ color: '#aaa', fontStyle: 'italic' }}>Đang chờ các Lãnh chúa chư hầu bỏ phiếu viện trợ...</div>
                    )}
                  </div>
                );
              })()}

              {battle.stage === 'GENERAL_SELECT' && (() => {
                const isAttacker = playerID === battle.attackerId;
                const isDefender = playerID === battle.defenderId;
                const haveISelected = (isAttacker && battle.attackerGeneral !== undefined) || (isDefender && battle.defenderGeneral !== undefined);
                const myGenerals = playerID ? (G.playerGenerals[playerID] || []) : [];

                return (
                  <div className="glass-panel" style={{ padding: '20px', background: '#111', border: '2px solid #ffeb3b', textAlign: 'center' }}>
                    <h2 style={{ color: '#ffeb3b', margin: '0 0 15px 0', fontSize: '24px' }}>🎴 CHỌN TƯỚNG XUẤT TRẬN 🎴</h2>
                    {(isAttacker || isDefender) ? (
                      haveISelected ? (
                        <h3 style={{ color: '#4CAF50' }}>✅ Bạn đã cất quân bài! Đang chờ đối phương...</h3>
                      ) : (
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          <div style={{ flex: 1, display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
                            {myGenerals.length === 0 ? (
                                <div style={{ color: '#ff5252', padding: '10px' }}>Không có tướng!</div>
                            ) : (
                                myGenerals.map(g => {
                                    const isNotAvailable = g.isDead || g.cooldownRounds > 0;
                                    let disabledMsg = '';
                                    if (g.isDead) disabledMsg = '☠️ Tử trận';
                                    else if (g.cooldownRounds > 0) disabledMsg = `⏳ Nghỉ: ${g.cooldownRounds}`;

                                    return (
                                        <GeneralCard 
                                            key={g.id} gen={g} 
                                            isSelected={selectedGeneralForCombat === g.id} 
                                            disabledMsg={disabledMsg}
                                            onClick={() => !isNotAvailable && setSelectedGeneralForCombat(g.id)} 
                                        />
                                    )
                                })
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '120px' }}>
                            <button 
                                className="game-btn btn-primary" 
                                style={{ padding: '12px 10px', fontSize: '16px', fontWeight: 'bold', background: selectedGeneralForCombat ? '#d32f2f' : '#555', cursor: selectedGeneralForCombat ? 'pointer' : 'not-allowed' }} 
                                disabled={!selectedGeneralForCombat} 
                                onClick={() => selectedGeneralForCombat && moves.selectCombatGeneral(selectedGeneralForCombat)}>
                                🔥 CHỐT
                            </button>
                            <button 
                                className="game-btn btn-warning" 
                                style={{ padding: '12px 10px', fontSize: '14px', background: '#444', transition: 'all 0.2s ease' }} 
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.5)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                                onClick={() => moves.selectCombatGeneral('NONE')}>
                                ❌ BỎ QUA
                            </button>
                          </div>
                        </div>
                      )
                    ) : <h3 style={{ color: '#aaa' }}>⏳ Đang chờ 2 bên Công - Thủ điều tướng...</h3>}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}
      {showResultModal && G.lastBattleResult && G.lastBattleResult.combatStats && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 10000,
                    display: 'flex',       // Dùng flex để căn giữa
                    overflowY: 'auto',     // Mở khóa cuộn chuột dọc
                    padding: '40px 0'      // Tạo khoảng trống cách mép trên dưới màn hình
                }}>
                    <div className="glass-panel" style={{ 
                        margin: 'auto',    // Tự căn giữa, nếu to quá thì đẩy scroll lên
                        backgroundColor: '#111', 
                        border: `3px solid ${G.lastBattleResult.winner === 'ATTACKER' ? '#ff5252' : '#4CAF50'}`,
                        borderRadius: '10px',
                        width: '90%',
                        maxWidth: '800px',
                        padding: '30px',
                        textAlign: 'center' 
                    }}>
                        <h1 style={{ color: G.lastBattleResult.winner === 'ATTACKER' ? '#ff5252' : '#4CAF50', fontSize: '32px', margin: '0 0 25px 0' }}>
                            {G.lastBattleResult.winner === 'ATTACKER' ? '⚔️ PHE CÔNG THẮNG TRẬN!' : '🛡️ PHE THỦ BẢO VỆ THÀNH CÔNG!'}
                        </h1>
                        
                        {/* BẢNG ĐIỂM CHI TIẾT */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexDirection: 'row', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', background: '#222', padding: '15px', borderRadius: '8px', borderTop: `4px solid ${playerColors[G.lastBattleResult.attackerId]}` }}>
                                <h3 style={{ color: playerColors[G.lastBattleResult.attackerId], margin: '0 0 15px 0' }}>Phe Công</h3>
                                <div style={{ color: '#ccc', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Quân trực tiếp:</span> <strong>{G.lastBattleResult.combatStats.attBase}đ</strong></div>
                                <div style={{ color: '#ccc', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Quân hỗ trợ:</span> <strong>+{G.lastBattleResult.combatStats.attSupport}đ</strong></div>
                                <div style={{ color: '#ffeb3b', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '10px' }}><span>Tướng ({G.lastBattleResult.attackerGeneral && G.lastBattleResult.attackerGeneral !== 'NONE' ? MAP_CONFIG.balance.generals.pool.find(g=>g.id===G.lastBattleResult.attackerGeneral)?.name : 'Không'}):</span> <strong>+{G.lastBattleResult.combatStats.attGen}đ</strong></div>
                                <div style={{ color: '#ff5252', display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold' }}><span>TỔNG:</span> <span>{G.lastBattleResult.combatStats.attTotal}đ</span></div>
                            </div>

                            <div style={{ flex: '1 1 300px', background: '#222', padding: '15px', borderRadius: '8px', borderTop: `4px solid ${playerColors[G.lastBattleResult.defenderId]}` }}>
                                <h3 style={{ color: playerColors[G.lastBattleResult.defenderId], margin: '0 0 15px 0' }}>Phe Thủ</h3>
                                <div style={{ color: '#ccc', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Quân trực tiếp (gồm Thành):</span> <strong>{G.lastBattleResult.combatStats.defBase}đ</strong></div>
                                <div style={{ color: '#ccc', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Quân hỗ trợ:</span> <strong>+{G.lastBattleResult.combatStats.defSupport}đ</strong></div>
                                <div style={{ color: '#ffeb3b', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '10px' }}><span>Tướng ({G.lastBattleResult.defenderGeneral && G.lastBattleResult.defenderGeneral !== 'NONE' ? MAP_CONFIG.balance.generals.pool.find(g=>g.id===G.lastBattleResult.defenderGeneral)?.name : 'Không'}):</span> <strong>+{G.lastBattleResult.combatStats.defGen}đ</strong></div>
                                <div style={{ color: '#4CAF50', display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold' }}><span>TỔNG:</span> <span>{G.lastBattleResult.combatStats.defTotal}đ</span></div>
                            </div>
                        </div>

                        {/* HẬU QUẢ VÀ LOGS */}
                        <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '8px', textAlign: 'left', minHeight: '80px', maxHeight: '200px', overflowY: 'auto', marginBottom: '25px', border: '1px solid #444' }}>
                            <h4 style={{ color: '#fff', margin: '0 0 10px 0' }}>📜 Nhật ký chiến trường:</h4>
                            <ul style={{ color: '#aaa', margin: 0, paddingLeft: '20px', fontSize: '15px', lineHeight: '1.6' }}>
                                {G.lastBattleResult.combatStats.logs.map((log: string, idx: number) => <li key={idx}>{log}</li>)}
                                {G.lastBattleResult.combatStats.logs.length === 0 && <li>Không có sự kiện đặc biệt nào xảy ra.</li>}
                            </ul>
                        </div>

                        {/* NÚT XÁC NHẬN (ĐÓNG CỤC BỘ) */}
                        <div style={{ textAlign: 'center' }}>
                            <button 
                                className="game-btn btn-primary" 
                                onClick={() => {
                                    setShowResultModal(false); // 1. Tắt popup trên màn hình này
                                    // 2. Nếu game đang chờ xác nhận kết quả, gửi lệnh cho Server đi tiếp (kích hoạt Rút lui)
                                    if (G.activeBattle && G.activeBattle.stage === 'RESULT' && 
                                      (G.activeBattle.attackerId === playerID || G.activeBattle.defenderId === playerID)) {
                                        moves.closeBattleResult();
                                    }
                                }} 
                                style={{ /*... giữ nguyên style cũ ...*/ }}
                            >
                                XÁC NHẬN ĐÓNG
                            </button>
                            <p style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>
                                (Đóng bảng này không ảnh hưởng đến người chơi khác)
                            </p>
                        </div>
                    </div>
                </div>
              )}

      {/* POPUP CHỌN VÙNG RÚT LUI NẰM DƯỚI ĐÁY BẢN ĐỒ */}
      {G.activeBattle && G.activeBattle.stage === 'RETREAT_SELECT' && (() => {
        const battle = G.activeBattle;
        const isMyRetreat = battle.retreatingPlayerId === playerID;
        return (
            <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '10px', border: '2px solid #ff9800', textAlign: 'center', boxShadow: '0 5px 15px rgba(255,152,0,0.4)', opacity: isSpacePressed ? 0 : 1, transition: 'opacity 0.2s', pointerEvents: isSpacePressed ? 'none' : 'auto' }}>
                <h2 style={{ color: '#ff9800', margin: '0 0 10px 0' }}>🏃 CHỌN ĐƯỜNG LUI 🏃</h2>
                {isMyRetreat ? (
                    <>
                      <p style={{ color: '#fff', margin: '0 0 15px 0' }}>Lãnh chúa, hãy click vào một vùng lân cận trên bản đồ (của bạn hoặc vô chủ) để rút tàn quân!</p>
                      <button className="game-btn btn-danger" style={{ pointerEvents: 'auto', padding: '10px 20px', width: '100%' }} onClick={() => moves.disbandRetreat()}>☠️ Không còn đường lui (Tiêu hủy quân)</button>
                    </>
                ) : <p style={{ color: '#aaa', margin: 0 }}>Đang chờ đối thủ chạy trốn...</p>}
            </div>
        )
      })()}

      {/* POPUP HỎI TẤN CÔNG TIẾP G4_2 */}
      {G.pendingG42 && G.pendingG42.playerId === playerID && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)', opacity: isSpacePressed ? 0 : 1, pointerEvents: isSpacePressed ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
          <div className="glass-panel" style={{ width: '500px', padding: '30px', textAlign: 'center', border: '2px solid #ff9800', boxShadow: '0 0 30px rgba(255, 152, 0, 0.4)' }}>
            <h2 style={{ color: '#ff9800', fontSize: '32px', margin: '0 0 10px 0' }}>🐎 TẤN CÔNG TIẾP 🐎</h2>
            <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '16px' }}>
              Tướng của bạn vừa kích hoạt thành công! Bạn có muốn dùng 1 Lệnh để lập tức dùng đạo quân tại vùng đất vừa chiếm được để <strong>đánh tiếp</strong> không?
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="game-btn btn-danger" style={{ flex: 1, padding: '15px', fontSize: '18px', background: '#555' }} onClick={() => moves.declineG42()}>❌ Dừng Lại (Khóa vùng)</button>
              <button className="game-btn btn-primary" style={{ flex: 1, padding: '15px', fontSize: '18px', background: '#d32f2f' }} 
                onClick={() => {
                  const regionId = G.pendingG42!.regionId;
                  moves.acceptG42(regionId);
                  setActiveRegion(regionId);
                  setActionMenu('move_target');
                }}
              >⚔️ Đánh Tiếp (+1 Lệnh)</button>
            </div>
          </div>
        </div>
      )}


      {/* SIDEBAR BÊN TRÁI HOẶC MENU EDITOR */}
      {!G.isEditor ? (
        ctx.currentPlayer === playerID && (
        <div 
          className="glass-panel" 
          style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, padding: '20px', borderTop: `4px solid ${playerColors[ctx.currentPlayer]}`, width: '320px', maxHeight: '90vh', overflowY: 'auto' }}
          onPointerDown={(e) => e.stopPropagation()} 
        >
          <h3 style={{ margin: '0 0 10px 0', color: playerColors[ctx.currentPlayer], fontSize: '18px' }}>LƯỢT NGƯỜI CHƠI {parseInt(ctx.currentPlayer) + 1}</h3>
          
          <div style={{ background: '#333', padding: '10px 15px', borderRadius: '5px', marginBottom: '15px', borderLeft: '4px solid #ffd700' }}>
            <span style={{ color: '#ccc', fontSize: '14px' }}>💰 Điểm dự trữ (Vàng): </span>
            <strong style={{ color: '#ffd700', fontSize: '20px' }}>{G.reserves?.[ctx.currentPlayer] ?? 0}</strong>
          </div>
          
          {ctx.phase === 'MAIN_PLAY' && (
            <div style={{
              background: '#222', padding: '15px', borderRadius: '8px', 
              border: '1px solid #555', marginBottom: '20px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#ffd700', textAlign: 'center', fontSize: '15px' }}>
                {G.roundStep === 'ECONOMY' ? '🛠️ BƯỚC 1: XÂY DỰNG & MUA QUÂN' : 
                 G.roundStep === 'SUPPORT' ? '🛡️ BƯỚC 2: BỐ TRÍ HỖ TRỢ' : 
                 '⚔️ BƯỚC 3: DI CHUYỂN & ĐÁNH'}
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ color: '#aaa', fontSize: '13px' }}>
                  Số lệnh: <strong style={{ color: 'white', fontSize: '16px' }}>{G.actionsLeft?.[ctx.currentPlayer] ?? 0} / 6</strong>
                </span>
                <span style={{ color: '#aaa', fontSize: '13px' }}>
                  Đã xong: {G.playersDoneThisStep?.length ?? 0}/{ctx.numPlayers}
                </span>
              </div>
            </div>
          )}

          <p style={{ margin: '0 0 15px 0', color: '#ddd', fontSize: '14px', lineHeight: '1.5' }}>
            {mustDisband ? "⚠️ Vượt quá sức chứa Kho lương! Yêu cầu giải tán quân." : getCurrentInstruction()}
          </p>

          {activeRegion && ctx.phase === 'MAIN_PLAY' && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px dashed #555' }}>
              
              {mustDisband ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#ff5252' }}>⚠️ THIẾU LƯƠNG THỰC!</h4>
                  <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 10px 0' }}>
                    Hãy chọn một đạo quân của bạn và bấm giải tán để đưa tỷ lệ về dưới mức an toàn ({currentPlayerStats.limit}).
                  </p>
                  
                  {isNeutralActive ? (
                    <p style={{ color: '#ffeb3b', fontSize: '13px' }}>Vùng biển trống không có lính để giải tán.</p>
                  ) : G.mapGeometry[activeRegion].type === 'Land' ? (
                    <>
                      <button className="game-btn btn-danger" style={{ width: '100%', opacity: G.regions[activeRegion].troops.tot > 0 ? 1 : 0.4 }} onClick={() => G.regions[activeRegion].troops.tot > 0 && moves.disbandTroop(activeRegion, 'tot')}>- Giải tán Bộ binh</button>
                      <button className="game-btn btn-danger" style={{ width: '100%', opacity: G.regions[activeRegion].troops.ma > 0 ? 1 : 0.4 }} onClick={() => G.regions[activeRegion].troops.ma > 0 && moves.disbandTroop(activeRegion, 'ma')}>- Giải tán Kỵ binh</button>
                      <button className="game-btn btn-danger" style={{ width: '100%', opacity: G.regions[activeRegion].troops.phao > 0 ? 1 : 0.4 }} onClick={() => G.regions[activeRegion].troops.phao > 0 && moves.disbandTroop(activeRegion, 'phao')}>- Giải tán Pháo binh</button>
                    </>
                  ) : (
                    <button className="game-btn btn-danger" style={{ width: '100%', opacity: G.regions[activeRegion].troops.tau > 0 ? 1 : 0.4 }} onClick={() => G.regions[activeRegion].troops.tau > 0 && moves.disbandTroop(activeRegion, 'tau')}>- Giải tán Thuyền</button>
                  )}
                  
                  <button className="game-btn btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={() => { setActiveRegion(null); setActionMenu('main'); }}>✖ Chọn vùng khác</button>
                </div>
              ) : (
                <>
                  {actionMenu === 'main' && (() => {
                    const isActed = G.regions[activeRegion].command !== 'none';
                    const outOfActions = G.actionsLeft[ctx.currentPlayer] <= 0;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Hành động cho Vùng chọn:</h4>

                        {isActed ? (
                          <p style={{ color: '#ffeb3b', fontSize: '13px', fontStyle: 'italic', background: 'rgba(255,235,59,0.1)', padding: '10px', borderRadius: '5px' }}>
                            🔒 Vùng đất này đã thao tác, không thể dùng thêm lệnh ở vòng này.
                          </p>
                        ) : outOfActions ? (
                          <p style={{ color: '#ff5252', fontSize: '13px', fontStyle: 'italic', background: 'rgba(255,82,82,0.1)', padding: '10px', borderRadius: '5px' }}>
                            ⚠️ Bạn đã hết lệnh (0/6)! Hãy chuyển qua bước tiếp theo.
                          </p>
                        ) : (
                          <>
                            {G.roundStep === 'ECONOMY' && (
                              <>
                                <button className="game-btn btn-primary" style={{ width: '100%' }} onClick={() => { setActionMenu('recruit'); setRecruitSelection({tot:0, ma:0, phao:0, tau:0}); }}>⚔️ Mua Quân Tập Thể</button>
                                {!isNeutralActive && <button className="game-btn btn-warning" style={{ width: '100%' }} onClick={() => setActionMenu('build')}>🔨 Xây Dựng</button>}
                              </>
                            )}

                            {G.roundStep === 'SUPPORT' && !isNeutralActive && (
                              <button 
                                className="game-btn btn-primary" 
                                style={{ width: '100%', background: '#9c27b0', boxShadow: '0 4px #6a1b9a' }} 
                                onClick={() => {
                                  moves.setSupportCommand(activeRegion);
                                  setActionMenu(null);
                                  setActiveRegion(null);
                                }}
                              >
                                🛡️ Đặt lệnh Hỗ trợ
                              </button>
                            )}

                            {G.roundStep === 'ACTION' && !isNeutralActive && (
                              <button className="game-btn btn-primary" style={{ width: '100%', background: '#4CAF50', boxShadow: '0 4px #2e7d32' }} onClick={() => setActionMenu('move_target')}>🗺️ Di Chuyển / Đánh</button>
                            )}
                          </>
                        )}

                        <button className="game-btn btn-danger" style={{ width: '100%', marginTop: '10px' }} onClick={() => { setActionMenu(null); setActiveRegion(null); setMoveTarget(null); }}>✖ Hủy chọn vùng</button>
                      </div>
                    );
                  })()}

                  {actionMenu === 'recruit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Mua Quân (1 Lệnh duy nhất):</h4>
                      
                      {(['tot', 'ma', 'phao', 'tau'] as Array<keyof TroopCounts>).map(type => {
                          const isLand = G.mapGeometry[activeRegion].type === 'Land';
                          if (isLand && type === 'tau') return null;
                          if (!isLand && type !== 'tau') return null;
                          
                          const ccfg = MAP_CONFIG.balance.cost;
                          const label = {'tot': `Bộ binh (${ccfg.tot}đ)`, 'ma': `Kỵ binh (${ccfg.ma}đ)`, 'phao': `Pháo binh (${ccfg.phao}đ)`, 'tau': `Thuyền (${ccfg.tau}đ)`}[type];
                          
                          return (
                              <div key={type} style={{display:'flex', justifyContent:'space-between', alignItems:'center', color:'white', backgroundColor: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: '5px'}}>
                                  <span style={{ fontSize: '14px' }}>{label}</span>
                                  <div style={{display:'flex', alignItems:'center'}}>
                                      <button className="game-btn btn-danger" style={{ padding: '2px 10px', minWidth: '35px' }} onClick={() => adjustRecruitSelection(type, -1)}>-</button>
                                      <span style={{margin:'0 10px', width:'25px', textAlign:'center', fontWeight: 'bold'}}>{recruitSelection[type]}</span>
                                      <button className="game-btn btn-primary" style={{ padding: '2px 10px', minWidth: '35px' }} onClick={() => adjustRecruitSelection(type, 1)}>+</button>
                                  </div>
                              </div>
                          )
                      })}
                      
                      {(() => {
                        const ccfg = MAP_CONFIG.balance.cost;
                        const totalCost = recruitSelection.tot * ccfg.tot + recruitSelection.ma * ccfg.ma + recruitSelection.phao * ccfg.phao + recruitSelection.tau * ccfg.tau;                        const canAfford = totalCost <= G.reserves[ctx.currentPlayer];
                        
                        const currentRegionTroops = G.regions[activeRegion].troops.tot + G.regions[activeRegion].troops.ma + G.regions[activeRegion].troops.phao + G.regions[activeRegion].troops.tau;
                        const addingTotal = recruitSelection.tot + recruitSelection.ma + recruitSelection.phao + recruitSelection.tau;
                        const willExceedLimit = currentRegionTroops < 2 && (currentRegionTroops + addingTotal) >= 2 && currentPlayerStats.armyGroups >= currentPlayerStats.limit;

                        return (
                          <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'10px'}}>
                              <div style={{ textAlign: 'center', color: canAfford ? '#ffd700' : '#ff5252', fontSize: '15px', fontWeight: 'bold' }}>
                                Tổng phí: {totalCost} Vàng
                              </div>
                              
                              {willExceedLimit && (
                                <div style={{ color: '#ffeb3b', fontSize: '12px', fontStyle: 'italic', background: 'rgba(255,235,59,0.1)', padding: '8px', borderRadius: '5px', textAlign: 'center' }}>
                                  ⚠️ Lượng lính này sẽ tạo thành Đạo quân mới, vượt giới hạn Kho lương!
                                </div>
                              )}

                              <button 
                                className="game-btn btn-primary" 
                                style={{ padding: '10px 0', background: totalCost > 0 && canAfford && !willExceedLimit ? '#e53935' : '#555', cursor: totalCost > 0 && canAfford && !willExceedLimit ? 'pointer' : 'not-allowed' }} 
                                disabled={willExceedLimit}
                                onClick={() => { if (totalCost > 0 && canAfford && !willExceedLimit) confirmRecruit(); }}
                              >
                                Xác nhận Tuyển Quân
                              </button>
                          </div>
                        );
                      })()}

                      <button className="game-btn btn-danger" style={{ width: '100%', marginTop: '5px' }} onClick={() => setActionMenu('main')}>⬅ Quay lại</button>
                    </div>
                  )}

                  {actionMenu === 'build' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Chọn công trình:</h4>
                      {G.mapGeometry[activeRegion].type === 'Land' ? (
                        <>
                          {(() => {
                            const canBuildCastle = G.reserves[ctx.currentPlayer] >= MAP_CONFIG.balance.cost.castle && G.regions[activeRegion].troops.tot >= MAP_CONFIG.balance.structures.castle_cost_troop;
                            const tracker = G.setupDataTracker[ctx.currentPlayer];
                            const castlesBuilt = tracker?.castlesBuilt || 0;
                            const isAdjToOwnCastle = G.mapGeometry[activeRegion].neighbors.some(n => G.regions[n].owner === ctx.currentPlayer && G.regions[n].hasCastle);
                            const isRestricted = castlesBuilt >= 2 && isAdjToOwnCastle;

                            return (
                              <button 
                                className="game-btn btn-warning" 
                                style={{ width: '100%', opacity: (canBuildCastle && !isRestricted) ? 1 : 0.4 }} 
                                onClick={() => {
                                  if (isRestricted) {
                                    alert("❌ Thành tự xây lần thứ 3 trở đi BẮT BUỘC phải cách Thành cũ của bạn ít nhất 1 ô!");
                                    return;
                                  }
                                  if (canBuildCastle) moves.buildStructure(activeRegion, 'castle');
                                }}
                              >
                                🏰 Thành trì ({MAP_CONFIG.balance.cost.castle}đ + {MAP_CONFIG.balance.structures.castle_cost_troop} Bộ binh)
                              </button>
                            );
                          })()}

                          <button 
                            className="game-btn btn-warning" 
                            style={{ width: '100%', opacity: G.reserves[ctx.currentPlayer] >= MAP_CONFIG.balance.cost.granary ? 1 : 0.4 }} 
                            onClick={() => G.reserves[ctx.currentPlayer] >= MAP_CONFIG.balance.cost.granary && moves.buildStructure(activeRegion, 'granary')}
                          >
                            🌾 Kho lương ({MAP_CONFIG.balance.cost.granary}đ)
                          </button>
                        </>
                      ) : <span style={{color:'#ff9800', textAlign:'center', display: 'block'}}>Chỉ được xây trên Đất</span>}
                      <button className="game-btn btn-danger" style={{ width: '100%', marginTop: '10px' }} onClick={() => setActionMenu('main')}>⬅ Quay lại</button>
                    </div>
                  )}

                  {actionMenu === 'move_target' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <p style={{ color: '#ffeb3b', margin: '0 0 10px 0', fontWeight: 'bold' }}>📍 Vui lòng click vào vùng đích hợp lệ (Sáng màu) trên bản đồ...</p>
                      <button className="game-btn btn-danger" style={{ width: '100%' }} onClick={() => { setActionMenu('main'); setMoveTarget(null); }}>✖ Hủy di chuyển</button>
                    </div>
                  )}

                  {actionMenu === 'move_select' && moveTarget && (() => {
                    const reach = checkReachabilityModes(activeRegion, moveTarget, G, ctx.currentPlayer);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Quân xuất trận:</h4>

                        {(['tot', 'ma', 'phao', 'tau'] as Array<keyof TroopCounts>).map(type => {
                            if ((type === 'tot' || type === 'ma') && !reach.canTotMa) return null;
                            if (type === 'phao' && !reach.canPhao) return null;
                            if (type === 'tau' && !reach.canTau) return null;

                            const max = G.regions[activeRegion].troops[type];
                            if (max === 0) return null;
                            
                            const label = {'tot': 'Bộ binh', 'ma': 'Kỵ binh', 'phao': 'Pháo binh', 'tau': 'Thuyền'}[type];
                            
                            return (
                                <div key={type} style={{display:'flex', justifyContent:'space-between', alignItems:'center', color:'white', backgroundColor: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: '5px'}}>
                                    <span style={{ fontSize: '14px' }}>{label} ({max})</span>
                                    <div style={{display:'flex', alignItems:'center'}}>
                                        <button className="game-btn btn-danger" style={{ padding: '2px 10px', minWidth: '35px' }} onClick={() => adjustMoveSelection(type, -1)}>-</button>
                                        <span style={{margin:'0 10px', width:'25px', textAlign:'center', fontWeight: 'bold'}}>{moveSelection[type]}</span>
                                        <button className="game-btn btn-primary" style={{ padding: '2px 10px', minWidth: '35px' }} onClick={() => adjustMoveSelection(type, 1)}>+</button>
                                    </div>
                                </div>
                            )
                        })}
                        
                        {(() => {
                          const sourceCurrent = G.regions[activeRegion].troops.tot + G.regions[activeRegion].troops.ma + G.regions[activeRegion].troops.phao + G.regions[activeRegion].troops.tau;
                          const targetCurrent = G.regions[moveTarget].troops.tot + G.regions[moveTarget].troops.ma + G.regions[moveTarget].troops.phao + G.regions[moveTarget].troops.tau;
                          const sourceAfter = sourceCurrent - totalSelectedTroops;
                          const targetAfter = targetCurrent + totalSelectedTroops;
                          
                          let groupDelta = 0;
                          if (sourceCurrent >= 2 && sourceAfter < 2) groupDelta -= 1;
                          if (targetCurrent < 2 && targetAfter >= 2) groupDelta += 1;
                          const willExceedLimit = currentPlayerStats.armyGroups + groupDelta > currentPlayerStats.limit;

                          return (
                            <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'10px'}}>
                                {willExceedLimit && (
                                  <div style={{ color: '#ffeb3b', fontSize: '12px', fontStyle: 'italic', background: 'rgba(255,235,59,0.1)', padding: '8px', borderRadius: '5px', textAlign: 'center' }}>
                                    ⚠️ Di chuyển sẽ tạo Đạo quân mới, vượt giới hạn Kho lương!
                                  </div>
                                )}
                                <button 
                                  className="game-btn btn-primary" 
                                  style={{ padding: '10px 0', background: totalSelectedTroops > 0 && !willExceedLimit ? '#e53935' : '#555', cursor: totalSelectedTroops > 0 && !willExceedLimit ? 'pointer' : 'not-allowed' }} 
                                  disabled={willExceedLimit}
                                  onClick={() => { if (totalSelectedTroops > 0 && !willExceedLimit) confirmMove(); }}
                                >
                                  ⚔️ XUẤT QUÂN
                                </button>
                            </div>
                          );
                        })()}
                        <button className="game-btn btn-danger" style={{ width: '100%' }} onClick={() => { setActionMenu('main'); setMoveTarget(null); }}>Hủy</button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
        )
      ) : (
        <button className="game-btn btn-warning" onClick={handleSaveMap} style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
          💾 LƯU GRAPH MAP
        </button>
      )}

      {/* NÚT KẾT THÚC BƯỚC CHUYỂN XUỐNG GÓC DƯỚI BÊN PHẢI */}
      {!G.activeBattle && !G.isEditor && ctx.phase === 'MAIN_PLAY' && ctx.currentPlayer === playerID && (
        <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000 }}>
          <button 
            className="game-btn btn-warning" 
            style={{ 
              padding: '15px 18px', 
              fontSize: '18px', 
              fontWeight: 'bold',
              boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
              border: '2px solid #fff',
              borderRadius: '8px',
              cursor: (ctx.currentPlayer !== playerID || mustDisband) ? 'not-allowed' : 'pointer'
            }}
            onClick={() => {
              setActiveRegion(null); setActionMenu(null); setMoveTarget(null); setRecruitSelection({tot:0, ma:0, phao:0, tau:0});
              moves.endCurrentStep();
            }}
            disabled={ctx.currentPlayer !== playerID || mustDisband} 
          >
            {G.roundStep === 'ECONOMY' ? 'Xong Xây dựng ➡️' : 
             G.roundStep === 'SUPPORT' ? 'Xong Hỗ trợ ➡️' : 
             'Kết thúc tấn công 🛑'}
          </button>
        </div>
      )}

      {/* EDITOR OVERLAYS */}
      {menuPos && G.isEditor && (
        <>
          <div onPointerDown={() => setMenuPos(null)} onContextMenu={(e) => { e.preventDefault(); setMenuPos(null); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
          <div className="glass-panel" style={{ position: 'absolute', top: menuPos.y, left: menuPos.x, zIndex: 1000, padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedRegion && G.mapGeometry[selectedRegion].type === 'Land' ? (
              <button className="game-btn btn-primary" style={{ background: '#1e88e5' }} onPointerDown={(e) => { e.stopPropagation(); handleSelectTerrain('Water'); }}>💧 Chuyển thành Nước</button>
            ) : (
              <button className="game-btn btn-primary" style={{ background: '#b6783d' }} onPointerDown={(e) => { e.stopPropagation(); handleSelectTerrain('Land'); }}>🟤 Chuyển thành Đất</button>
            )}
          </div>
        </>
      )}

      {/* SVG BẢN ĐỒ CHÍNH */}
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" onPointerDown={() => { if(actionMenu !== 'move_target') { setActiveRegion(null); setActionMenu(null); setMoveTarget(null); setRecruitSelection({tot:0, ma:0, phao:0, tau:0}); } }}>
        <defs>
          <linearGradient id="land-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c26910" />
          </linearGradient>
          <linearGradient id="water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e88e5" />
          </linearGradient>
        </defs>
        
        <g id="layer-paths">
          {mapPaths}
        </g>
        
        <g id="layer-icons">
          {mapIcons}
        </g>
      </svg>
    </div>
  );
};