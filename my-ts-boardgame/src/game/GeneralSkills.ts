import { GameState, General, TroopCounts } from './Game';
import { MAP_CONFIG } from '../config';

export interface CombatState {
    attackerGenDisabled: boolean;
    defenderGenDisabled: boolean;
    nullifyAttackerGenPower: boolean;
    nullifyDefenderGenPower: boolean;
    blockDefenderSupport: boolean;
    blockAttackerSupport: boolean;
    attackerForceSupport: boolean;
    defenderForceSupport: boolean;
    attackerBonusFlat: number;
    defenderBonusFlat: number;
    attackerTauPower: number;
    defenderTauPower: number;
    attackerPhaoPower?: number;
    defenderPhaoPower?: number;
    attackerDamageTakenMod: number;
    defenderDamageTakenMod: number;
    defenderNoLossOnWin: boolean;
}

// 1. ÁP DỤNG KỸ NĂNG TRƯỚC KHI TÍNH ĐIỂM (PRE-COMBAT)
export const applyPreCombatSkills = (G: GameState, battle: any, attackerGen?: General, defenderGen?: General): CombatState => {
    const state: CombatState = {
        attackerGenDisabled: false, defenderGenDisabled: false,
        nullifyAttackerGenPower: false, nullifyDefenderGenPower: false,
        blockDefenderSupport: false, blockAttackerSupport: false,
        attackerForceSupport: false, defenderForceSupport: false,
        attackerBonusFlat: 0, defenderBonusFlat: 0,
        attackerTauPower: MAP_CONFIG.balance.power.tau, defenderTauPower: MAP_CONFIG.balance.power.tau,
        attackerDamageTakenMod: 0, defenderDamageTakenMod: 0,
        defenderNoLossOnWin: false,
    };

    const targetRegion = G.regions[battle.targetId];

    if (attackerGen?.id === 'G1_3') state.defenderGenDisabled = true;
    if (defenderGen?.id === 'G1_3') state.attackerGenDisabled = true;

    const isAttActive = attackerGen && !attackerGen.isDead && attackerGen.cooldownRounds === 0 && !state.attackerGenDisabled;
    const isDefActive = defenderGen && !defenderGen.isDead && defenderGen.cooldownRounds === 0 && !state.defenderGenDisabled;

    const gCfg = MAP_CONFIG.balance.generals.skills;

    // --- KỸ NĂNG PHE CÔNG ---
    if (isAttActive) {
        if (attackerGen.id === 'G4_4') state.attackerDamageTakenMod -= gCfg.G4_4_damage_reduction; 
        if (attackerGen.id === 'G2_1') state.nullifyDefenderGenPower = true; 
        if (attackerGen.id === 'G2_2' && battle.attackingTroops.tau > 0) state.attackerTauPower = gCfg.G2_2_ship_power_override; 
        if (attackerGen.id === 'G2_3' && !targetRegion.hasCastle) state.attackerPhaoPower = gCfg.G2_3_cannon_field_power;
        if (attackerGen.id === 'G2_4') state.blockDefenderSupport = true; 
        if (attackerGen.id === 'G1_1') state.attackerForceSupport = true; 
    }

    // --- KỸ NĂNG PHE THỦ ---
    if (isDefActive) {
        if (defenderGen.id === 'G4_4') state.defenderDamageTakenMod -= gCfg.G4_4_damage_reduction; 
        if (defenderGen.id === 'G3_1' && targetRegion.hasCastle) state.defenderBonusFlat += gCfg.G3_1_castle_defense_bonus;
        if (defenderGen.id === 'G3_4') state.defenderNoLossOnWin = true; 
        if (defenderGen.id === 'G2_1') state.nullifyAttackerGenPower = true; 
        if (defenderGen.id === 'G2_2' && targetRegion.troops.tau > 0) state.defenderTauPower = gCfg.G2_2_ship_power_override;
        if (defenderGen.id === 'G2_3' && !targetRegion.hasCastle) state.defenderPhaoPower = gCfg.G2_3_cannon_field_power;
        if (defenderGen.id === 'G2_4') state.blockAttackerSupport = true;
        if (defenderGen.id === 'G1_1') state.defenderForceSupport = true;
    }

    return state;
};

// 2. ÁP DỤNG KỸ NĂNG SAU KHI BIẾT KẾT QUẢ THẮNG THUA (POST-COMBAT)
export const applyPostCombatSkills = (
    G: GameState, battle: any, winner: 'ATTACKER' | 'DEFENDER',
    attackerGen?: General, defenderGen?: General, state?: CombatState,
    retreatRegionId?: string,
    logs?: string[] // BỔ SUNG MẢNG LOGS
) => {
    const targetRegion = G.regions[battle.targetId];
    
    const isAttActive = attackerGen && !attackerGen.isDead && attackerGen.cooldownRounds === 0 && !state?.attackerGenDisabled;
    const isDefActive = defenderGen && !defenderGen.isDead && defenderGen.cooldownRounds === 0 && !state?.defenderGenDisabled;
    
    const gCfg = MAP_CONFIG.balance.generals.skills;
    let triggerG42 = false;

    const killRandomEnemyGen = (enemyId: string) => {
        const enemyGens = G.playerGenerals[enemyId].filter(g => !g.isDead);
        if (enemyGens.length > 0) {
            const target = enemyGens[Math.floor(Math.random() * enemyGens.length)];
            target.isDead = true;
            logs?.push(`🗡 Ám sát thành công tướng địch: [${target.name}]!`);
        } else {
            logs?.push(`🗡 Kích hoạt ám sát nhưng địch không có tướng nào để giết.`);
        }
    };
    
    const stealEnemyGen = (winnerId: string, loserId: string, loserGen: General) => {
        loserGen.isDead = false; loserGen.cooldownRounds = gCfg.base_cooldown; 
        G.playerGenerals[loserId] = G.playerGenerals[loserId].filter(g => g.id !== loserGen.id);
        G.playerGenerals[winnerId].push(loserGen);
        logs?.push(`🪢 Bắt sống tướng địch: [${loserGen.name}] về làm thuộc hạ!`);
    };

    const handleG1_4_Revive = (myId: string, enemyGenId?: string) => {
        let deadGens = G.playerGenerals[myId].filter(g => g.isDead && g.id !== 'G1_4');
        if (enemyGenId === 'G1_2' && deadGens.length > 0) {
            const skipIdx = Math.floor(Math.random() * deadGens.length);
            deadGens.splice(skipIdx, 1); 
            logs?.push(`⚕️ Kẻ địch có sát thủ (G1_2) nên 1 tướng của ta bị mất lượt hồi sinh!`);
        }
        if (deadGens.length > 0) {
            deadGens.forEach(g => { g.isDead = false; g.cooldownRounds = gCfg.base_cooldown; });
            logs?.push(`⚕️ Gọi hồn thành công ${deadGens.length} tướng đã tử trận!`);
        } else {
            logs?.push(`⚕️ Không có tướng nào trong Mộ để gọi hồn.`);
        }
    };

    if (attackerGen) {
        if (winner === 'ATTACKER') {
            attackerGen.cooldownRounds = gCfg.base_cooldown; // Thắng -> Vào trạng thái nghỉ
        } else {
            attackerGen.isDead = true; // Thua -> Chết hẳn
            logs?.push(`☠️ Tướng Công [${attackerGen.name}] đã tử trận nơi sa trường!`);
        }
    }
    if (defenderGen) {
        if (winner === 'DEFENDER') {
            defenderGen.cooldownRounds = gCfg.base_cooldown; // Thắng -> Vào trạng thái nghỉ
        } else {
            defenderGen.isDead = true; // Thua -> Chết hẳn
            logs?.push(`☠️ Tướng Thủ [${defenderGen.name}] đã tử trận khi thành vỡ!`);
        }
    }

    // ================= XỬ LÝ KỸ NĂNG PHE CÔNG =================
    if (isAttActive) {
        if (winner === 'ATTACKER') {
            if (attackerGen.id === 'G4_1' && targetRegion.troops.tot > 0) { targetRegion.troops.tot--; targetRegion.troops.ma++; logs?.push(`🐎 1 Tốt phe Công đã tiến hóa thành Mã.`);} 
            if (attackerGen.id === 'G4_2') triggerG42 = true;
            if (attackerGen.id === 'G4_3' && retreatRegionId) { 
                if (G.regions[retreatRegionId].troops.tot > 0) { G.regions[retreatRegionId].troops.tot--; logs?.push(`🏹 Quân đuổi theo giết thêm 1 Tốt địch đang tháo chạy.`); }
            }
            if (attackerGen.id === 'G1_2') killRandomEnemyGen(battle.defenderId);
            if (attackerGen.id === 'G1_3' && defenderGen) stealEnemyGen(battle.attackerId, battle.defenderId, defenderGen);
            
        } else { // CÔNG THUA
            if (attackerGen.id === 'G1_2' && defenderGen) { defenderGen.cooldownRounds += gCfg.G1_2_assassinate_cooldown; logs?.push(`☠️ Tướng thủ bị ám sát hụt, hoảng sợ phải nghỉ thêm 1 lượt.`); }
            if (attackerGen.id === 'G1_3' && defenderGen) { defenderGen.cooldownRounds = 0; logs?.push(`✨ Tướng thủ đánh lùi được pháp sư, nhuệ khí tăng cao lập tức hồi chiêu.`); }
            if (attackerGen.id === 'G1_4') handleG1_4_Revive(battle.attackerId, defenderGen?.id);
        }
    }

    // ================= XỬ LÝ KỸ NĂNG PHE THỦ =================
    if (isDefActive) {
        if (winner === 'DEFENDER') {
            if (defenderGen.id === 'G4_1' && targetRegion.troops.tot > 0) { targetRegion.troops.tot--; targetRegion.troops.ma++; logs?.push(`🐎 1 Tốt phe Thủ đã tiến hóa thành Mã.`); }
            if (defenderGen.id === 'G4_2') triggerG42 = true;
            if (defenderGen.id === 'G4_3' && retreatRegionId) { 
                if (G.regions[retreatRegionId].troops.tot > 0) { G.regions[retreatRegionId].troops.tot--; logs?.push(`🏹 Bắn tên giết thêm 1 Tốt địch đang tháo chạy.`); }
            }
            if (defenderGen.id === 'G1_2') killRandomEnemyGen(battle.attackerId);
            if (defenderGen.id === 'G1_3' && attackerGen) stealEnemyGen(battle.defenderId, battle.attackerId, attackerGen);
            
        } else { // THỦ THUA
            if (defenderGen.id === 'G1_2' && attackerGen) { attackerGen.cooldownRounds += gCfg.G1_2_assassinate_cooldown; logs?.push(`☠️ Tướng công bị ám sát hụt, phải nghỉ thêm 1 lượt.`); }
            if (defenderGen.id === 'G1_3' && attackerGen) { attackerGen.cooldownRounds = 0; logs?.push(`✨ Tướng công nhuệ khí dâng cao, lập tức hồi chiêu.`); }
            if (defenderGen.id === 'G1_4') handleG1_4_Revive(battle.defenderId, attackerGen?.id);
        }
    }

    return { triggerG42 };
};