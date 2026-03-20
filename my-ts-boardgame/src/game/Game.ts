import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { generateSandboxMap } from './MapGenerator';
import { applyPreCombatSkills, applyPostCombatSkills } from './GeneralSkills';
import { MAP_CONFIG } from '../config';

export interface TroopCounts { tot: number; ma: number; phao: number; tau: number; }

export interface MapGeometry {
  id: string; type: string; neighbors: string[]; svgPath: string; center: { x: number, y: number };
}

export interface RegionData {
  owner: string | null;
  troops: TroopCounts;
  hasCastle: boolean;
  hasGranary: boolean;
  command: 'none' | 'acted' | 'supporting';
  starvingRound: number; 
}

export interface General {
  id: string; power: number; name: string; isDead: boolean; cooldownRounds: number;
}

export type RoundStep = 'ECONOMY' | 'SUPPORT' | 'ACTION';
// export type BattleStage = 'PREVIEW' | 'SUPPORT_CALL' | 'GENERAL_SELECT' | 'RESOLUTION' | 'RETREAT_SELECT';
export type BattleStage = 'PREVIEW' | 'SUPPORT_CALL' | 'GENERAL_SELECT' | 'RETREAT_SELECT' | 'RESULT';
export interface GameState {
  isEditor: boolean;
  mapGeometry: Record<string, MapGeometry>;
  regions: Record<string, RegionData>;
  reserves: Record<string, number>;
  actionsLeft: Record<string, number>;
  roundStep: RoundStep;
  playersDoneThisStep: string[];
  availableGenerals: General[];
  playerGenerals: Record<string, General[]>;
  activeBattle: {
    stage: BattleStage;
    sourceId: string;
    targetId: string;
    attackerId: string;
    defenderId: string;
    attackingTroops: TroopCounts;
    eligibleSupporters?: string[];                                 
    supportVotes?: Record<string, 'ATTACKER' | 'DEFENDER' | 'NONE'>;
    attackerGeneral?: string | null; 
    defenderGeneral?: string | null;
    retreatingPlayerId?: string;
    retreatingTroops?: TroopCounts;
    winner?: 'ATTACKER' | 'DEFENDER';
    skillState?: any;

    attackerFinalPower?: number;
    defenderFinalPower?: number;
    validRetreats?: string[];
    combatStats?: {
      attBase: number; defBase: number;
      attSupport: number; defSupport: number;
      attGen: number; defGen: number;
      attTotal: number; defTotal: number;
      logs: string[];
    };
  } | null;
  pendingG42?: { regionId: string, playerId: string } | null;
  setupDataTracker: Record<string, any>;

  lastBattleResult?: any;
}

const getEmptyRegion = (): RegionData => ({
  owner: null, troops: { tot: 0, ma: 0, phao: 0, tau: 0 },
  hasCastle: false, hasGranary: false, command: 'none', starvingRound: 0
});

const checkNeutralRegions = (G: GameState) => {
  if (!G.regions) return;
  for (const regionId in G.regions) {
    const r = G.regions[regionId];
    if (r.owner !== null) {
      const totalTroops = r.troops.tot + r.troops.ma + r.troops.phao + r.troops.tau;
      // Nếu hết lính và không có thành -> Thành đất hoang và MỞ KHÓA
      if (totalTroops === 0 && !r.hasCastle) {
          r.owner = null;
          r.command = 'none'; // Sửa lỗi đất hoang bị khóa ở đây
      }
    }
  }
};

const finalizeBattle = (G: GameState, battle: any, winner: 'ATTACKER' | 'DEFENDER', attackerGen: any, defenderGen: any, state: any, retreatRegionId?: string) => {
  const postResult = applyPostCombatSkills(G, battle, winner, attackerGen, defenderGen, state, retreatRegionId, battle.combatStats!.logs);
  
  if (postResult?.triggerG42) {
      G.pendingG42 = { regionId: battle.targetId, playerId: winner === 'ATTACKER' ? battle.attackerId : battle.defenderId };
  }
  checkNeutralRegions(G);
  battle.stage = 'RESULT';
  G.lastBattleResult = { 
      ...battle, 
      winner: winner, // Đã sửa lỗi thiếu winner cho UI ở lần hỗ trợ trước
      timestamp: Date.now() // Tem thời gian để React biết có trận mới
  };
};

export const getValidRetreatRegions = (G: GameState, battle: any, playerId: string): string[] => {
    const validRegions = new Set<string>();
    const startId = battle.targetId;
    const troops = battle.retreatingTroops as TroopCounts;
    const totalTroops = troops.tot + troops.ma + troops.phao + troops.tau;
    const hasBoats = troops.tau > 0;

    if (totalTroops === 0) return [];

    const queue = [startId];
    const visited = new Set<string>();
    visited.add(startId);

    while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = G.mapGeometry[curr].neighbors;

        for (const nId of neighbors) {
            if (visited.has(nId)) continue;
            visited.add(nId);

            const nGeo = G.mapGeometry[nId];
            const nData = G.regions[nId];

            let canTraverse = false;
            let canSettle = false;

            if (nGeo.type === 'Land') {
                canSettle = true; // Lên bờ thì được ở lại, nhưng không được đi xuyên qua đất nữa
            } else if (nGeo.type === 'Water') {
                // Xuống nước thì phải có thuyền (của tàn quân mang theo, hoặc của phe mình đang đỗ sẵn)
                if (hasBoats || (nData.owner === playerId && nData.troops.tau > 0)) {
                    canTraverse = true;
                    canSettle = true;
                }
            }

            if (canSettle && (nData.owner === null || nData.owner === playerId)) {
                // KIỂM TRA LUẬT KHO LƯƠNG TẠI Ô NÀY
                let armyGroups = 0;
                let granaries = 0;
                for (const id in G.regions) {
                    if (G.regions[id].owner === playerId) {
                        if (G.regions[id].hasGranary) granaries++;
                        let futureTotal = G.regions[id].troops.tot + G.regions[id].troops.ma + G.regions[id].troops.phao + G.regions[id].troops.tau;
                        if (id === nId) futureTotal += totalTroops; // Giả sử tàn quân nhập vào đây
                        if (futureTotal >= 2) armyGroups++;
                    }
                }
                if (nData.owner === null && totalTroops >= 2) armyGroups++; // Nếu chiếm ô trống thành đạo quân mới

                if (armyGroups <= granaries * MAP_CONFIG.balance.structures.granary_army_limit) {
                    validRegions.add(nId);
                }
            }

            if (canTraverse) queue.push(nId);
        }
    }

    return Array.from(validRegions);
};

const executeBattleResolution = (G: GameState, events?: any) => {
  const battle = G.activeBattle!;
  const targetRegion = G.regions[battle.targetId];
  const sourceRegion = G.regions[battle.sourceId];
  const troops = battle.attackingTroops;
  const pcfg = MAP_CONFIG.balance.power;

  let attackerGen: General | undefined;
  let defenderGen: General | undefined;
  if (battle.attackerGeneral && battle.attackerGeneral !== 'NONE') attackerGen = G.playerGenerals[battle.attackerId].find(g => g.id === battle.attackerGeneral);
  if (battle.defenderGeneral && battle.defenderGeneral !== 'NONE') defenderGen = G.playerGenerals[battle.defenderId].find(g => g.id === battle.defenderGeneral);

  const state = applyPreCombatSkills(G, battle, attackerGen, defenderGen);

  let attPhao = state.attackerPhaoPower ?? (targetRegion.hasCastle ? pcfg.phao_castle : pcfg.phao_base);
  let attackerPower = troops.tot * pcfg.tot + troops.ma * pcfg.ma + troops.tau * state.attackerTauPower + troops.phao * attPhao;
  attackerPower += state.attackerBonusFlat;
  if (attackerGen && !state.nullifyAttackerGenPower && !attackerGen.isDead && attackerGen.cooldownRounds === 0 && !state.attackerGenDisabled) {
    attackerPower += attackerGen.power;
  }

  let defPhao = state.defenderPhaoPower ?? (targetRegion.hasCastle ? pcfg.phao_castle : pcfg.phao_base);
  let defenderPower = targetRegion.troops.tot * pcfg.tot + targetRegion.troops.ma * pcfg.ma + targetRegion.troops.tau * state.defenderTauPower + targetRegion.troops.phao * defPhao;
  if (targetRegion.hasCastle) defenderPower += MAP_CONFIG.balance.structures.castle_defense_bonus;
  defenderPower += state.defenderBonusFlat;
  if (defenderGen && !state.nullifyDefenderGenPower && !defenderGen.isDead && defenderGen.cooldownRounds === 0 && !state.defenderGenDisabled) {
    defenderPower += defenderGen.power;
  }

  const targetGeo = G.mapGeometry[battle.targetId];
  let rawAttSupport = 0;
  let rawDefSupport = 0;

  const targetNeighbors = G.mapGeometry[battle.targetId].neighbors;
  targetNeighbors.forEach(nId => {
    const r = G.regions[nId];
    const nGeo = G.mapGeometry[nId];

    // Đất không thể hỗ trợ cho trận đánh dưới Nước
    if (targetGeo.type === 'Water' && nGeo.type === 'Land') return;

    if (r.command === 'supporting' && r.owner !== null) {
      const phaoPower = r.hasCastle ? pcfg.phao_castle : pcfg.phao_base;
      let tauPower = pcfg.tau;
      if (r.owner === battle.attackerId && state.attackerTauPower > pcfg.tau) tauPower = state.attackerTauPower;
      if (r.owner === battle.defenderId && state.defenderTauPower > pcfg.tau) tauPower = state.defenderTauPower;
      
      let spPower = r.troops.tot * pcfg.tot + r.troops.ma * pcfg.ma + r.troops.tau * tauPower + r.troops.phao * phaoPower;

      if (state.attackerForceSupport && attackerGen?.id === 'G1_1') rawAttSupport += spPower;
      else if (state.defenderForceSupport && defenderGen?.id === 'G1_1') rawDefSupport += spPower;
      else {
        if (!state.blockDefenderSupport && (r.owner === battle.attackerId || battle.supportVotes?.[r.owner] === 'ATTACKER')) rawAttSupport += spPower;
        else if (!state.blockAttackerSupport && (r.owner === battle.defenderId || battle.supportVotes?.[r.owner] === 'DEFENDER')) rawDefSupport += spPower;
      }
    }
  });

  const finalAttSupport = Math.floor(rawAttSupport * MAP_CONFIG.balance.combat.support_multiplier);
  const finalDefSupport = Math.floor(rawDefSupport * MAP_CONFIG.balance.combat.support_multiplier);

  // LƯU CÁC CHỈ SỐ ĐỂ ĐƯA LÊN BẢNG THỐNG KÊ CHI TIẾT
  battle.combatStats = {
    attBase: attackerPower,
    defBase: defenderPower,
    attSupport: finalAttSupport,
    defSupport: finalDefSupport,
    attGen: (attackerGen && !state.nullifyAttackerGenPower && !attackerGen.isDead && attackerGen.cooldownRounds === 0 && !state.attackerGenDisabled ? attackerGen.power : 0),
    defGen: (defenderGen && !state.nullifyDefenderGenPower && !defenderGen.isDead && defenderGen.cooldownRounds === 0 && !state.defenderGenDisabled ? defenderGen.power : 0),
    attTotal: attackerPower + finalAttSupport,
    defTotal: defenderPower + finalDefSupport,
    logs: []
  };

  attackerPower = battle.combatStats.attTotal;
  defenderPower = battle.combatStats.defTotal;

  battle.attackerFinalPower = attackerPower;
  battle.defenderFinalPower = defenderPower;

  const winner = attackerPower > defenderPower ? 'ATTACKER' : 'DEFENDER';
  
  let retreatingTroops: TroopCounts = { tot: 0, ma: 0, phao: 0, tau: 0 };
  let retreatingPlayerId = '';
  let autoRetreatRegionId: string | null = null;
  let hasG3_3 = false;

  const originalDefenderTroops = { ...targetRegion.troops };

  if (winner === 'ATTACKER') {
    targetRegion.owner = battle.attackerId;
    targetRegion.command = 'acted';

    let damageToTake = Math.max(0, MAP_CONFIG.balance.combat.winner_troop_loss + state.attackerDamageTakenMod);
    let surviving = { ...troops };
    battle.combatStats!.logs.push(`🩸 Phe Thủ tử trận toàn bộ.`);
    if (damageToTake > 0) battle.combatStats!.logs.push(`🩸 Phe Công hi sinh ${damageToTake} quân mở đường.`);
    while (damageToTake > 0 && (surviving.tot > 0 || surviving.ma > 0 || surviving.phao > 0 || surviving.tau > 0)) {
      if (surviving.tot > 0) { surviving.tot--; damageToTake -= 1; }
      else if (surviving.tau > 0) { surviving.tau--; damageToTake -= 1; }
      else if (surviving.ma > 0) { surviving.ma--; damageToTake -= 2; }
      else if (surviving.phao > 0) { surviving.phao--; damageToTake -= 2; }
    }
    targetRegion.troops = surviving;

    retreatingPlayerId = battle.defenderId;
    hasG3_3 = (defenderGen?.id === 'G3_3' && !state.defenderGenDisabled);
    
    let defSurviving = { ...originalDefenderTroops };
    
    // ✅ KIỂM TRA: PHE THỦ CHỈ CÓ ĐÚNG 1 TỐT
    const isOnlyOneTotDefending = originalDefenderTroops.tot === 1 && originalDefenderTroops.ma === 0 && originalDefenderTroops.phao === 0 && originalDefenderTroops.tau === 0;

    if (isOnlyOneTotDefending) {
        // Nếu chỉ có 1 Tốt thủ thành mà thua -> Chết luôn
        defSurviving.tot = 0;
        battle.combatStats!.logs.push(`☠️ Phe Thủ chỉ có 1 Tốt lẻ loi phòng vệ, thảm bại và tử trận hoàn toàn!`);
    } else {
        const keepPhao = (defenderGen?.id === 'G3_2' && !state.defenderGenDisabled);
        if (!keepPhao) defSurviving.phao = 0;
        
        // Mã ngã ngựa biến thành Tốt
        defSurviving.tot += defSurviving.ma;
        defSurviving.ma = 0;
        
        // Chia một nửa số Tốt rút lui (làm tròn lên)
        const originalTotCount = defSurviving.tot;
        defSurviving.tot = Math.ceil(defSurviving.tot / 2);
        
        if (originalTotCount > 0) {
            battle.combatStats!.logs.push(`☠️ Tàn quân phe Thủ bị truy sát, chỉ còn ${defSurviving.tot} Tốt sống sót tháo chạy.`);
        }
    }
    
    retreatingTroops = defSurviving;

    if (!hasG3_3) {
        const validNeighbors = G.mapGeometry[battle.targetId].neighbors.filter(nId => {
            const r = G.regions[nId];
            return r.owner === null || r.owner === retreatingPlayerId;
        });
        autoRetreatRegionId = validNeighbors.length > 0 ? validNeighbors[0] : 'DESTROYED';
    }
  } else {
    let damageToTake = Math.max(0, MAP_CONFIG.balance.combat.winner_troop_loss + state.defenderDamageTakenMod);
    if (state.defenderNoLossOnWin) damageToTake = 0;
    if (damageToTake > 0) battle.combatStats!.logs.push(`🩸 Phe Thủ hi sinh ${damageToTake} quân chống địch.`);

    while (damageToTake > 0 && (targetRegion.troops.tot > 0 || targetRegion.troops.ma > 0 || targetRegion.troops.phao > 0 || targetRegion.troops.tau > 0)) {
        if (targetRegion.troops.tot > 0) { targetRegion.troops.tot--; damageToTake -= 1; }
        else if (targetRegion.troops.tau > 0) { targetRegion.troops.tau--; damageToTake -= 1; }
        else if (targetRegion.troops.ma > 0) { targetRegion.troops.ma--; damageToTake -= 2; }
        else if (targetRegion.troops.phao > 0) { targetRegion.troops.phao--; damageToTake -= 2; }
    }

    retreatingPlayerId = battle.attackerId;
    hasG3_3 = (attackerGen?.id === 'G3_3' && !state.attackerGenDisabled);
    
    let attSurviving = { ...troops };
    
    // ✅ KIỂM TRA: PHE CÔNG CHỈ CÓ ĐÚNG 1 TỐT
    const isOnlyOneTotAttacking = troops.tot === 1 && troops.ma === 0 && troops.phao === 0 && troops.tau === 0;

    if (isOnlyOneTotAttacking) {
        // Nếu chỉ có 1 Tốt đi đánh mà thua -> Chết luôn
        attSurviving.tot = 0;
        battle.combatStats!.logs.push(`☠️ Phe Công mang 1 Tốt lẻ loi đi đánh, thảm bại và bị tiêu diệt hoàn toàn tại trận!`);
    } else {
        const keepPhao = (attackerGen?.id === 'G3_2' && !state.attackerGenDisabled);
        if (!keepPhao) attSurviving.phao = 0;
        
        // Mã ngã ngựa biến thành Tốt
        attSurviving.tot += attSurviving.ma;
        attSurviving.ma = 0;
        
        // Chia một nửa số Tốt rút lui (làm tròn lên)
        const originalAttTotCount = attSurviving.tot;
        attSurviving.tot = Math.ceil(attSurviving.tot / 2);

        if (originalAttTotCount > 0) {
            battle.combatStats!.logs.push(`☠️ Đội hình phe Công vỡ trận, chỉ còn ${attSurviving.tot} Tốt dạt về tuyến sau.`);
        }
    }

    retreatingTroops = attSurviving;

    if (!hasG3_3) autoRetreatRegionId = battle.sourceId;
  }

  const totalRetreating = retreatingTroops.tot + retreatingTroops.ma + retreatingTroops.phao + retreatingTroops.tau;

  if (totalRetreating > 0) {
    battle.retreatingTroops = retreatingTroops;

    // Gọi hàm tính đường lui hợp lệ
    const validRetreats = getValidRetreatRegions(G, battle, retreatingPlayerId);
    battle.validRetreats = validRetreats;

    if (hasG3_3) {
        if (validRetreats.length > 0) {
            battle.stage = 'RETREAT_SELECT';
            battle.retreatingPlayerId = retreatingPlayerId;
            battle.retreatingTroops = retreatingTroops;
            battle.winner = winner;
            battle.skillState = state;
            if (events && events.setActivePlayers) {
                events.setActivePlayers({ value: { [retreatingPlayerId]: 'RETREAT' } });
            }
            return;
        } else {
            battle.combatStats!.logs.push(`☠️ Không còn đường lui (Hoặc hết sức chứa Kho lương), đạo quân rút lui toàn diệt!`);
            finalizeBattle(G, battle, winner, attackerGen, defenderGen, state, undefined);
        }
    } else {
        if (validRetreats.length > 0) {
            // Ưu tiên lui về ô xuất phát, nếu ô đó bị lỗi thì lấy ô hợp lệ đầu tiên
            const autoId = validRetreats.includes(battle.sourceId) ? battle.sourceId : validRetreats[0];
            const tr = G.regions[autoId];
            tr.owner = retreatingPlayerId;
            tr.troops.tot += retreatingTroops.tot;
            tr.troops.ma += retreatingTroops.ma;
            tr.troops.phao += retreatingTroops.phao;
            tr.troops.tau += retreatingTroops.tau;
            battle.combatStats!.logs.push(`🏃 Đạo quân thua trận dạt về vùng an toàn.`);
            finalizeBattle(G, battle, winner, attackerGen, defenderGen, state, autoId);
        } else {
            battle.combatStats!.logs.push(`☠️ Không còn đường lui (Hoặc hết sức chứa Kho lương), tàn quân bị dồn vào chân tường, toàn diệt!`);
            finalizeBattle(G, battle, winner, attackerGen, defenderGen, state, undefined);
        }
    }
  } else {
      finalizeBattle(G, battle, winner, attackerGen, defenderGen, state, undefined);
  }
};

export const createHexConquestGame = (setupData?: any): Game<GameState> => ({
  name: 'hex-conquest',

  setup: (ctx) => {
    let isEditor = false;
    let mapGeometry: Record<string, MapGeometry> = {};
    let regions: Record<string, RegionData> = {};

    if (setupData && setupData.isEditor) {
      isEditor = true;
      mapGeometry = generateSandboxMap();
      for (const id in mapGeometry) regions[id] = getEmptyRegion();
    } else if (setupData && setupData.geometry) {
      mapGeometry = setupData.geometry;
      for (const id in mapGeometry) regions[id] = getEmptyRegion();
    }

    return { 
      isEditor, mapGeometry, regions,
      reserves: { '0': 0, '1': 0, '2': 0, '3': 0 },
      actionsLeft: { '0': 6, '1': 6, '2': 6, '3': 6 },
      roundStep: 'ECONOMY',
      playersDoneThisStep: [],
      availableGenerals: MAP_CONFIG.balance.generals.pool.map(g => ({ ...g, isDead: false, cooldownRounds: 0 })),
      playerGenerals: { '0': [], '1': [], '2': [], '3': [] },
      activeBattle: null,
      pendingG42: null,
      setupDataTracker: {
        '0': { selectedRegions: [], freeCastlePlaced: false, freeGranaryPlaced: false, castlesBuilt: 0 },
        '1': { selectedRegions: [], freeCastlePlaced: false, freeGranaryPlaced: false, castlesBuilt: 0 },
        '2': { selectedRegions: [], freeCastlePlaced: false, freeGranaryPlaced: false, castlesBuilt: 0 },
        '3': { selectedRegions: [], freeCastlePlaced: false, freeGranaryPlaced: false, castlesBuilt: 0 }
      }
    };
  },

  phases: {
    GENERAL_DRAFT: {
      start: true,
      moves: {
        syncMapData: ({ G }, mapData: any) => {
          if (Object.keys(G.mapGeometry).length === 0 && mapData && mapData.geometry) {
            G.mapGeometry = mapData.geometry;
            for (const id in G.mapGeometry) G.regions[id] = getEmptyRegion();
          }
        },
        pickGeneral: ({ G, ctx, events }, generalId: string) => {
          const p = ctx.currentPlayer;
          const totalDrafted = Object.values(G.playerGenerals).reduce((sum, list) => sum + list.length, 0);
          const currentRound = Math.floor(totalDrafted / ctx.numPlayers) + 1;
          const targetPower = 5 - currentRound;
          const genIndex = G.availableGenerals.findIndex(g => g.id === generalId);
          if (genIndex === -1) return INVALID_MOVE;
          const selectedGeneral = G.availableGenerals[genIndex];
          if (selectedGeneral.power !== targetPower) return INVALID_MOVE;

          G.availableGenerals.splice(genIndex, 1);
          G.playerGenerals[p].push(selectedGeneral);
          
          const totalDraftedAfter = totalDrafted + 1;
          if (totalDraftedAfter >= ctx.numPlayers * 4) return;

          const r = Math.floor(totalDraftedAfter / ctx.numPlayers); 
          const i = totalDraftedAfter % ctx.numPlayers; 
          const nextPlayer = (r + i) % ctx.numPlayers;

          if (nextPlayer.toString() !== p) {
            if (events && events.endTurn) events.endTurn({ next: nextPlayer.toString() });
          }
        },
        changeRegionTerrain: ({ G }, regionId: string, newTerrainType: string) => {
          if (G.isEditor && G.mapGeometry[regionId]) G.mapGeometry[regionId].type = newTerrainType;
        }
      },
      endIf: ({ G, ctx }) => {
        if (!G.playerGenerals || !ctx.numPlayers || ctx.numPlayers === 0) return false;
        let allDone = true;
        for (let i = 0; i < ctx.numPlayers; i++) {
          const pId = i.toString();
          if (!G.playerGenerals[pId] || G.playerGenerals[pId].length < 4) {
            allDone = false; break;
          }
        }
        return allDone;
      },
      next: 'SETUP_TERRITORY'
    },
    
    SETUP_TERRITORY: {
      start: false,  
      moves: {
        syncMapData: ({ G }, mapData: any) => {
          if (Object.keys(G.mapGeometry).length === 0 && mapData && mapData.geometry) {
            G.mapGeometry = mapData.geometry;
            for (const id in G.mapGeometry) G.regions[id] = getEmptyRegion();
          }
        },
        claimInitialRegion: ({ G, ctx }, regionId: string) => {
          const p = ctx.currentPlayer; 
          const tracker = G.setupDataTracker[p];
          if (tracker.selectedRegions.length >= 3) return INVALID_MOVE;
          if (G.regions[regionId].owner !== null) return INVALID_MOVE;
          if (tracker.selectedRegions.length === 0 && G.mapGeometry[regionId].type !== 'Land') return INVALID_MOVE;
          if (tracker.selectedRegions.length > 0) {
            const neighbors = G.mapGeometry[regionId].neighbors;
            if (!neighbors.some(n => tracker.selectedRegions.includes(n))) return INVALID_MOVE;
          }
          G.regions[regionId].owner = p;
          if (G.mapGeometry[regionId].type === 'Water') G.regions[regionId].troops.tau = 1;
          else G.regions[regionId].troops.tot = 1;
          tracker.selectedRegions.push(regionId);
        },
        placeFreeCastle: ({ G, ctx }, regionId: string) => {
          const p = ctx.currentPlayer;
          const tracker = G.setupDataTracker[p];
          if (G.mapGeometry[regionId].type !== 'Land') return INVALID_MOVE;
          if (tracker.selectedRegions.length < 3 || tracker.freeCastlePlaced) return INVALID_MOVE;
          if (G.regions[regionId].owner !== p) return INVALID_MOVE;
          G.regions[regionId].hasCastle = true;
          tracker.freeCastlePlaced = true;
          tracker.castlesBuilt = 1; 
        },
        placeFreeGranary: ({ G, ctx, events }, regionId: string) => {
          const p = ctx.currentPlayer;
          const tracker = G.setupDataTracker[p];
          if (G.mapGeometry[regionId].type !== 'Land') return INVALID_MOVE;
          if (!tracker.freeCastlePlaced || tracker.freeGranaryPlaced) return INVALID_MOVE;
          if (G.regions[regionId].owner !== p) return INVALID_MOVE;
          const neighbors = G.mapGeometry[regionId].neighbors;
          const isOnOrAdjCastle = G.regions[regionId].hasCastle || neighbors.some(n => G.regions[n].owner === p && G.regions[n].hasCastle);
          if (!isOnOrAdjCastle) return INVALID_MOVE;
          G.regions[regionId].hasGranary = true;
          tracker.freeGranaryPlaced = true;
          if (events && events.endTurn) events.endTurn();
        },
        changeRegionTerrain: ({ G }, regionId: string, newTerrainType: string) => {
          if (G.isEditor && G.mapGeometry[regionId]) G.mapGeometry[regionId].type = newTerrainType;
        }
      },
      endIf: ({ G, ctx }) => {
        if (!G.setupDataTracker || !ctx.numPlayers) return false;
        let allDone = true;
        for (let i = 0; i < ctx.numPlayers; i++) {
          if (!G.setupDataTracker[i.toString()]?.freeGranaryPlaced) allDone = false;
        }
        return allDone;
      },
      next: 'MAIN_PLAY'
    },

    MAIN_PLAY: {
      turn: {
        onBegin: ({ G, ctx }) => {
          const p = ctx.currentPlayer;
          if (G.roundStep === 'ECONOMY') {
            G.actionsLeft[p] = 6;
            let income = MAP_CONFIG.balance.economy.base_income; 
            Object.values(G.regions).forEach(r => {
              if (r.owner === p) {
                income += MAP_CONFIG.balance.economy.castle_income; 
                if (r.hasGranary) income += MAP_CONFIG.balance.economy.granary_income; 
                // XÓA ĐOẠN RESET LỆNH Ở ĐÂY RỒI ĐỂ TRÁNH RESET LẺ TẺ
              }
            });
            G.reserves[p] += income;
          }
        }
      },
      moves: {
        recruitTroopsBulk: ({ G, ctx }, regionId: string, troopsToAdd: TroopCounts) => {
          if (G.roundStep !== 'ECONOMY') return INVALID_MOVE;
          const p = ctx.currentPlayer;
          const r = G.regions[regionId];

          if (G.actionsLeft[p] <= 0) return INVALID_MOVE;
          if (r.command !== 'none') return INVALID_MOVE;

          const ccfg = MAP_CONFIG.balance.cost;
          const totalCost = (troopsToAdd.tot || 0) * ccfg.tot + (troopsToAdd.ma || 0) * ccfg.ma + (troopsToAdd.phao || 0) * ccfg.phao + (troopsToAdd.tau || 0) * ccfg.tau;
          if (totalCost === 0) return INVALID_MOVE;
          if (G.reserves[p] < totalCost) return INVALID_MOVE;

          if (G.mapGeometry[regionId].type === 'Land' && troopsToAdd.tau > 0) return INVALID_MOVE;
          if (G.mapGeometry[regionId].type === 'Water' && (troopsToAdd.tot > 0 || troopsToAdd.ma > 0 || troopsToAdd.phao > 0)) return INVALID_MOVE;

          let canRecruit = false;
          if (r.owner === p) {
            canRecruit = true;
          } else if (r.owner === null && G.mapGeometry[regionId].type === 'Water' && troopsToAdd.tau > 0) {
            const isAdjToCastle = G.mapGeometry[regionId].neighbors.some(nId => G.regions[nId].owner === p && G.regions[nId].hasCastle);
            if (isAdjToCastle) canRecruit = true;
          }
          if (!canRecruit) return INVALID_MOVE;

          const currentTotal = r.troops.tot + r.troops.ma + r.troops.phao + r.troops.tau;
          const addingTotal = troopsToAdd.tot + troopsToAdd.ma + troopsToAdd.phao + troopsToAdd.tau;
          if (currentTotal < 2 && (currentTotal + addingTotal) >= 2) { 
            let armyGroups = 0;
            let granaries = 0;
            for (const id in G.regions) {
              if (G.regions[id].owner === p) {
                if (G.regions[id].hasGranary) granaries++;
                const tot = G.regions[id].troops.tot + G.regions[id].troops.ma + G.regions[id].troops.phao + G.regions[id].troops.tau;
                if (tot >= 2) armyGroups++;
              }
            }
            if (armyGroups >= granaries * MAP_CONFIG.balance.structures.granary_army_limit) return INVALID_MOVE; 
          }

          G.reserves[p] -= totalCost;
          r.troops.tot += troopsToAdd.tot || 0;
          r.troops.ma += troopsToAdd.ma || 0;
          r.troops.phao += troopsToAdd.phao || 0;
          r.troops.tau += troopsToAdd.tau || 0;
          if (r.owner === null) r.owner = p;
          
          r.command = 'acted';
          G.actionsLeft[p] -= 1;
        },

        buildStructure: ({ G, ctx }, regionId: string, structType: 'castle' | 'granary') => {
          if (G.roundStep !== 'ECONOMY') return INVALID_MOVE;
          const p = ctx.currentPlayer;
          const r = G.regions[regionId];
          
          if (G.actionsLeft[p] <= 0) return INVALID_MOVE;
          if (r.command !== 'none') return INVALID_MOVE;
          if (r.owner !== p || G.mapGeometry[regionId].type !== 'Land') return INVALID_MOVE;
          
          const costs = { castle: MAP_CONFIG.balance.cost.castle, granary: MAP_CONFIG.balance.cost.granary };
          if (G.reserves[p] < costs[structType]) return INVALID_MOVE;

          if (structType === 'castle') {
            if (r.hasCastle || r.troops.tot < MAP_CONFIG.balance.structures.castle_cost_troop) return INVALID_MOVE; 
            
            const tracker = G.setupDataTracker[p];
            const castlesBuilt = tracker.castlesBuilt || 0;
            if (castlesBuilt >= 2) {
              const isAdjToOwnCastle = G.mapGeometry[regionId].neighbors.some(n => G.regions[n].owner === p && G.regions[n].hasCastle);
              if (isAdjToOwnCastle) return INVALID_MOVE;
            }

            G.reserves[p] -= costs.castle;
            r.troops.tot -= MAP_CONFIG.balance.structures.castle_cost_troop; 
            r.hasCastle = true;
            tracker.castlesBuilt = castlesBuilt + 1; 
          } else {
            if (r.hasGranary) return INVALID_MOVE;
            // ÉP LUẬT: Phải ở trong ô có Thành hoặc kề Thành của mình
            const isAdjToOwnCastle = r.hasCastle || G.mapGeometry[regionId].neighbors.some(n => G.regions[n].owner === p && G.regions[n].hasCastle);
            if (!isAdjToOwnCastle) return INVALID_MOVE;

            G.reserves[p] -= costs.granary;
            r.hasGranary = true;
          }
          
          r.command = 'acted';
          G.actionsLeft[p] -= 1;
        },

        disbandTroop: ({ G, ctx }, regionId: string, troopType: keyof TroopCounts) => {
          const p = ctx.currentPlayer;
          if (G.regions[regionId].owner !== p) return INVALID_MOVE;
          if (G.regions[regionId].troops[troopType] <= 0) return INVALID_MOVE;
          G.regions[regionId].troops[troopType] -= 1; 
          checkNeutralRegions(G); 
        },

        setSupportCommand: ({ G, ctx }, regionId: string) => {
          if (G.roundStep !== 'SUPPORT') return INVALID_MOVE;
          const p = ctx.currentPlayer;
          const r = G.regions[regionId];

          if (G.actionsLeft[p] <= 0) return INVALID_MOVE;
          if (r.owner !== p) return INVALID_MOVE;
          if (r.command !== 'none') return INVALID_MOVE;
          
          const totalTroops = r.troops.tot + r.troops.ma + r.troops.phao + r.troops.tau;
          if (totalTroops === 0) return INVALID_MOVE;

          r.command = 'supporting';
          G.actionsLeft[p] -= 1;
        },

        moveTroops: ({ G, ctx }, fromId: string, toId: string, troops: TroopCounts) => {
          if (G.roundStep !== 'ACTION') return INVALID_MOVE;
          const p = ctx.currentPlayer; const r = G.regions[fromId];
          if (G.actionsLeft[p] <= 0 || r.owner !== p || r.command !== 'none') return INVALID_MOVE;

          const totalMoving = (troops.tot || 0) + (troops.ma || 0) + (troops.phao || 0) + (troops.tau || 0);
          if (totalMoving === 0) return INVALID_MOVE;

          const targetRegion = G.regions[toId];
          if (targetRegion.owner !== null && targetRegion.owner !== p) return INVALID_MOVE;

          const sourceTotal = r.troops.tot + r.troops.ma + r.troops.phao + r.troops.tau;
          const sourceAfter = sourceTotal - totalMoving;
          const targetTotal = targetRegion.troops.tot + targetRegion.troops.ma + targetRegion.troops.phao + targetRegion.troops.tau;
          const targetAfter = targetTotal + totalMoving;

          let groupDelta = 0;
          if (sourceTotal >= 2 && sourceAfter < 2) groupDelta -= 1; 
          if (targetTotal < 2 && targetAfter >= 2) groupDelta += 1; 

          if (groupDelta > 0) {
            let armyGroups = 0; let granaries = 0;
            for (const id in G.regions) {
              if (G.regions[id].owner === p) {
                if (G.regions[id].hasGranary) granaries++;
                const tot = G.regions[id].troops.tot + G.regions[id].troops.ma + G.regions[id].troops.phao + G.regions[id].troops.tau;
                if (tot >= 2) armyGroups++;
              }
            }
            if (armyGroups + groupDelta > granaries * MAP_CONFIG.balance.structures.granary_army_limit) return INVALID_MOVE; 
          }

          const wasOwnedByMe = targetRegion.owner === p;

          r.command = 'acted'; G.actionsLeft[p] -= 1;
          r.troops.tot -= troops.tot; r.troops.ma -= troops.ma; r.troops.phao -= troops.phao; r.troops.tau -= troops.tau;
          
          targetRegion.owner = p; 
          targetRegion.troops.tot += troops.tot; targetRegion.troops.ma += troops.ma; 
          targetRegion.troops.phao += troops.phao; targetRegion.troops.tau += troops.tau;
          
          if (!wasOwnedByMe) targetRegion.command = 'acted';
          
          checkNeutralRegions(G);
        },
        
        endCurrentStep: ({ G, ctx, events }) => {
          G.playersDoneThisStep.push(ctx.currentPlayer);
          if (G.playersDoneThisStep.length >= ctx.numPlayers) {
            G.playersDoneThisStep = [];
            if (G.roundStep === 'ECONOMY') G.roundStep = 'SUPPORT';
            else if (G.roundStep === 'SUPPORT') G.roundStep = 'ACTION';
            else if (G.roundStep === 'ACTION') {
              G.roundStep = 'ECONOMY';
              
              // 1. XÓA SẠCH trạng thái Khóa và Hỗ trợ trên CẢ BẢN ĐỒ
              for (const regionId in G.regions) {
                G.regions[regionId].command = 'none';
              }
              
              // 2. ✅ GIẢM THỜI GIAN NGHỈ CỦA TẤT CẢ TƯỚNG (MỌI NGƯỜI CHƠI) -1 LƯỢT
              for (const pId in G.playerGenerals) {
                  G.playerGenerals[pId].forEach(g => {
                      if (g.cooldownRounds > 0 && !g.isDead) {
                          g.cooldownRounds -= 1;
                      }
                  });
              }
            }
          }
          if (events && events.endTurn) events.endTurn();
        },
        
        declareAttack: ({ G, ctx }, sourceId: string, targetId: string) => {
          if (G.roundStep !== 'ACTION') return INVALID_MOVE;
          if (G.activeBattle) return INVALID_MOVE; 
          
          const p = ctx.currentPlayer; 
          const r = G.regions[sourceId];
          if (G.actionsLeft[p] <= 0 || r.owner !== p || r.command !== 'none') return INVALID_MOVE;

          G.activeBattle = {
            stage: 'PREVIEW',
            sourceId: sourceId,
            targetId: targetId,
            attackerId: p,
            defenderId: G.regions[targetId].owner!,
            attackingTroops: { tot: 0, ma: 0, phao: 0, tau: 0 } 
          };
        },
        
        cancelAttack: ({ G }) => {
          if (!G.activeBattle || G.activeBattle.stage !== 'PREVIEW') return INVALID_MOVE;
          G.activeBattle = null;
        },
        
        confirmAttack: ({ G, events }, troops: TroopCounts) => {
          const battle = G.activeBattle;
          if (!battle || battle.stage !== 'PREVIEW') return INVALID_MOVE;

          const sourceRegion = G.regions[battle.sourceId];
          const totalMoving = troops.tot + troops.ma + troops.phao + troops.tau;
          if (totalMoving <= 0) return INVALID_MOVE;

          const sourceTotal = sourceRegion.troops.tot + sourceRegion.troops.ma + sourceRegion.troops.phao + sourceRegion.troops.tau;
          const sourceAfter = sourceTotal - totalMoving;
          let groupDelta = 0;
          if (sourceTotal >= 2 && sourceAfter < 2) groupDelta -= 1;
          if (totalMoving >= 2) groupDelta += 1; 

          if (groupDelta > 0) {
            let armyGroups = 0; let granaries = 0;
            for (const id in G.regions) {
              if (G.regions[id].owner === battle.attackerId) {
                if (G.regions[id].hasGranary) granaries++;
                const tot = G.regions[id].troops.tot + G.regions[id].troops.ma + G.regions[id].troops.phao + G.regions[id].troops.tau;
                if (tot >= 2) armyGroups++;
              }
            }
            if (armyGroups + groupDelta > granaries * MAP_CONFIG.balance.structures.granary_army_limit) return INVALID_MOVE;
          }
          
          sourceRegion.troops.tot -= troops.tot; sourceRegion.troops.ma -= troops.ma;
          sourceRegion.troops.phao -= troops.phao; sourceRegion.troops.tau -= troops.tau;
          sourceRegion.command = 'acted'; G.actionsLeft[battle.attackerId] -= 1;
          battle.attackingTroops = { ...troops };

          const eligibleSet = new Set<string>();
          const targetNeighbors = G.mapGeometry[battle.targetId].neighbors;
          targetNeighbors.forEach(nId => {
            const r = G.regions[nId];
            if (r.command === 'supporting' && r.owner !== null) {
              if (r.owner !== battle.attackerId && r.owner !== battle.defenderId) {
                eligibleSet.add(r.owner);
              }
            }
          });

          if (eligibleSet.size > 0) {
            battle.stage = 'SUPPORT_CALL';
            battle.eligibleSupporters = Array.from(eligibleSet);
            battle.supportVotes = {};
            
            if (events && events.setActivePlayers) {
              const activeObj: any = { currentPlayer: 'WAITING' };
              eligibleSet.forEach(id => { activeObj[id] = 'VOTING'; });
              events.setActivePlayers({ value: activeObj });
            }
          } else {
            battle.stage = 'GENERAL_SELECT';
            if (events && events.setActivePlayers) {
              events.setActivePlayers({ value: { [battle.attackerId]: 'SELECT_GEN', [battle.defenderId]: 'SELECT_GEN' } });
            }
          }
        },

        castSupportVote: ({ G, ctx, events, playerID }, vote: 'ATTACKER' | 'DEFENDER' | 'NONE') => {
          const battle = G.activeBattle;
          if (!battle || battle.stage !== 'SUPPORT_CALL') return INVALID_MOVE;
          
          const p = playerID || ctx.currentPlayer; 
          if (!battle.eligibleSupporters?.includes(p)) return INVALID_MOVE; 
          
          if (!battle.supportVotes) battle.supportVotes = {};
          battle.supportVotes[p] = vote;

          if (Object.keys(battle.supportVotes).length >= battle.eligibleSupporters.length) {
            battle.stage = 'GENERAL_SELECT';
            if (events && events.setActivePlayers) {
              events.setActivePlayers({ value: { [battle.attackerId]: 'SELECT_GEN', [battle.defenderId]: 'SELECT_GEN' } });
            }
          }
        },

        selectCombatGeneral: ({ G, ctx, events, playerID }, generalId: string) => {
          const battle = G.activeBattle;
          if (!battle || battle.stage !== 'GENERAL_SELECT') return INVALID_MOVE;
          
          const p = playerID || ctx.currentPlayer; 
          
          if (p === battle.attackerId) battle.attackerGeneral = generalId;
          else if (p === battle.defenderId) battle.defenderGeneral = generalId;
          else return INVALID_MOVE;

          if (battle.attackerGeneral !== undefined && battle.defenderGeneral !== undefined) {
            executeBattleResolution(G, events);
            if (events && events.setActivePlayers && G.activeBattle === null) events.setActivePlayers({ currentPlayer: 'IDLE' }); 
          }
        },

        confirmRetreat: ({ G, ctx, events }, regionId: string) => {
          const battle = G.activeBattle;
          if (!battle || battle.stage !== 'RETREAT_SELECT') return INVALID_MOVE;
          const p = ctx.currentPlayer;
          if (battle.retreatingPlayerId !== p) return INVALID_MOVE;

          // THAY THẾ CÁC LỆNH CHECK CŨ BẰNG MẢNG VALID RETREATS
          if (!battle.validRetreats || !battle.validRetreats.includes(regionId)) {
              return INVALID_MOVE;
          }

          const r = G.regions[regionId];
          r.owner = p;
          r.troops.tot += battle.retreatingTroops!.tot;
          r.troops.ma += battle.retreatingTroops!.ma;
          r.troops.phao += battle.retreatingTroops!.phao;
          r.troops.tau += battle.retreatingTroops!.tau;

          let attackerGen, defenderGen;
          if (battle.attackerGeneral && battle.attackerGeneral !== 'NONE') attackerGen = G.playerGenerals[battle.attackerId].find(g => g.id === battle.attackerGeneral);
          if (battle.defenderGeneral && battle.defenderGeneral !== 'NONE') defenderGen = G.playerGenerals[battle.defenderId].find(g => g.id === battle.defenderGeneral);

          finalizeBattle(G, battle, battle.winner!, attackerGen, defenderGen, battle.skillState, regionId);
          if (events && events.setActivePlayers) events.setActivePlayers({ currentPlayer: 'IDLE' });
        },

        disbandRetreat: ({ G, ctx, events }) => {
          const battle = G.activeBattle;
          if (!battle || battle.stage !== 'RETREAT_SELECT') return INVALID_MOVE;
          const p = ctx.currentPlayer;
          if (battle.retreatingPlayerId !== p) return INVALID_MOVE;

          let attackerGen, defenderGen;
          if (battle.attackerGeneral && battle.attackerGeneral !== 'NONE') attackerGen = G.playerGenerals[battle.attackerId].find(g => g.id === battle.attackerGeneral);
          if (battle.defenderGeneral && battle.defenderGeneral !== 'NONE') defenderGen = G.playerGenerals[battle.defenderId].find(g => g.id === battle.defenderGeneral);

          finalizeBattle(G, battle, battle.winner!, attackerGen, defenderGen, battle.skillState, undefined);
          if (events && events.setActivePlayers) events.setActivePlayers({ currentPlayer: 'IDLE' });
        },

        acceptG42: ({ G, ctx }, regionId: string) => {
          if (!G.pendingG42) return INVALID_MOVE;
          const p = ctx.currentPlayer;
          if (G.pendingG42.playerId !== p) return INVALID_MOVE;
          
          G.actionsLeft[p] += 1;
          G.regions[regionId].command = 'none';
          G.pendingG42 = null;
        },

        declineG42: ({ G, ctx }) => {
          if (!G.pendingG42) return INVALID_MOVE;
          const p = ctx.currentPlayer;
          if (G.pendingG42.playerId !== p) return INVALID_MOVE;
          
          G.pendingG42 = null; 
        },
        closeBattleResult: ({ G, events }) => {
          G.activeBattle = null;
          if (events && events.setActivePlayers) events.setActivePlayers({ currentPlayer: 'IDLE' });
        },
      },
    },
  },
  endIf: ({ G, ctx }) => {
    const winCastles = MAP_CONFIG.balance.structures.win_condition_castles;
    const playerCastles: Record<string, number> = {};
    for (let i = 0; i < ctx.numPlayers; i++) playerCastles[i.toString()] = 0;

    for (const id in G.regions) {
      const r = G.regions[id];
      if (r.owner !== null && r.hasCastle) playerCastles[r.owner]++;
    }

    let winner = null;
    for (const pId in playerCastles) {
      if (playerCastles[pId] >= winCastles) winner = pId;
    }

    if (winner !== null) {
       const ranking = Object.entries(playerCastles).sort((a,b) => b[1] - a[1]).map(e => ({ id: e[0], castles: e[1] }));
       return { winner, ranking };
    }
  }
});