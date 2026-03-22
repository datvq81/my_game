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
        // G4_4: Giảm 1 lính chết (Đúng ý user)
        if (attackerGen.id === 'G4_4') state.attackerDamageTakenMod -= gCfg.G4_4_damage_reduction; 
        if (attackerGen.id === 'G2_1') state.nullifyDefenderGenPower = true; 
        if (attackerGen.id === 'G2_2' && battle.attackingTroops.tau > 0) state.attackerTauPower = gCfg.G2_2_ship_power_override; 
        if (attackerGen.id === 'G2_3' && !targetRegion.hasCastle) state.attackerPhaoPower = gCfg.G2_3_cannon_field_power;
        if (attackerGen.id === 'G2_4') state.blockDefenderSupport = true; 
        if (attackerGen.id === 'G1_1') state.attackerForceSupport = true; 
    }

    // --- KỸ NĂNG PHE THỦ ---
    if (isDefActive) {
        // G4_4: Giảm 1 lính chết (Đúng ý user)
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
    logs?: string[]
) => {
    const targetRegion = G.regions[battle.targetId];
    
    const isAttActive = attackerGen && !attackerGen.isDead && attackerGen.cooldownRounds === 0 && !state?.attackerGenDisabled;
    const isDefActive = defenderGen && !defenderGen.isDead && defenderGen.cooldownRounds === 0 && !state?.defenderGenDisabled;
    
    const gCfg = MAP_CONFIG.balance.generals.skills;
    let triggerG42 = false;

    const killRandomEnemyGen = (enemyId: string, excludeGenId?: string) => {
        // Lọc ra các tướng địch chưa chết VÀ KHÁC với tướng đang tham chiến
        const enemyGens = G.playerGenerals[enemyId].filter(g => !g.isDead && g.id !== excludeGenId);
        
        if (enemyGens.length > 0) {
            const target = enemyGens[Math.floor(Math.random() * enemyGens.length)];
            target.isDead = true;
            logs?.push(`🗡 Ám sát thành công tướng địch: [${target.name}]!`);
        } else {
            logs?.push(`🗡 Kích hoạt ám sát nhưng địch không còn tướng nào khác ở hậu phương để giết.`);
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
            attackerGen.cooldownRounds = gCfg.base_cooldown; 
        } else {
            attackerGen.isDead = true; 
            logs?.push(`☠️ Tướng Công [${attackerGen.name}] đã tử trận nơi sa trường!`);
        }
    }
    if (defenderGen) {
        if (winner === 'DEFENDER') {
            defenderGen.cooldownRounds = gCfg.base_cooldown; 
        } else {
            defenderGen.isDead = true; 
            logs?.push(`☠️ Tướng Thủ [${defenderGen.name}] đã tử trận khi thành vỡ!`);
        }
    }

    // ================= XỬ LÝ KỸ NĂNG PHE CÔNG =================
    if (isAttActive) {
        if (winner === 'ATTACKER') {
            // G4_1: Chỉ 1 Tốt duy nhất được lên Mã
            if (attackerGen.id === 'G4_1' && targetRegion.troops.tot > 0) { 
                targetRegion.troops.tot--; 
                targetRegion.troops.ma++; 
                logs?.push(`🐎 1 Tốt phe Công đã được phong cấp thành Mã.`);
            } 
            
            // G4_2: Chỉ kích hoạt khi phe Công thắng
            if (attackerGen.id === 'G4_2') {
                triggerG42 = true;
                logs?.push(`⚡ Tướng Blitz Commander sẵn sàng phát động đợt tấn công tiếp theo (Miễn phí lệnh)!`);
            }

            // G4_3: Kiểm tra tàn quân chạy trốn CÓ TỐT HAY KHÔNG
            if (attackerGen.id === 'G4_3' && retreatRegionId && battle.retreatingTroops) { 
                if (battle.retreatingTroops.tot > 0) { 
                    battle.retreatingTroops.tot--; // Trừ trong data tàn quân
                    G.regions[retreatRegionId].troops.tot--; // Trừ thực tế trên bản đồ
                    logs?.push(`🏹 Quân đuổi theo bắn hạ 1 Tốt địch đang tháo chạy.`); 
                } else {
                    logs?.push(`🏹 Kẻ địch tháo chạy nhưng không có Tốt nào, kỹ năng Blood Reaper vô tác dụng.`);
                }
            }
            
            if (attackerGen.id === 'G1_2') killRandomEnemyGen(battle.defenderId, defenderGen?.id);
            if (attackerGen.id === 'G1_3' && defenderGen) stealEnemyGen(battle.attackerId, battle.defenderId, defenderGen);
            
        } else { // CÔNG THUA
            if (attackerGen.id === 'G1_2') {
            // Nếu có tướng thủ đối đầu, phạt cooldown nó
            if (defenderGen) {
                defenderGen.cooldownRounds += gCfg.G1_2_assassinate_cooldown;
                logs?.push(`☠️ Tướng thủ [${defenderGen.name}] bị Sát thủ tẩm độc: Cooldown +${gCfg.G1_2_assassinate_cooldown} lượt!`);
            }
                // Vừa tẩm độc kẻ thắng, vừa ám sát thêm 1 đứa khác ở hậu phương địch
                killRandomEnemyGen(battle.defenderId, defenderGen?.id);
            }
            if (attackerGen.id === 'G1_3' && defenderGen) { defenderGen.cooldownRounds = 0; logs?.push(`✨ Tướng thủ đánh lùi được pháp sư, nhuệ khí tăng cao lập tức hồi chiêu.`); }
            if (attackerGen.id === 'G1_4') handleG1_4_Revive(battle.attackerId, defenderGen?.id);
        }
    }

    // ================= XỬ LÝ KỸ NĂNG PHE THỦ =================
    if (isDefActive) {
        if (winner === 'DEFENDER') {
            // G4_1: Chỉ 1 Tốt duy nhất được lên Mã
            if (defenderGen.id === 'G4_1' && targetRegion.troops.tot > 0) { 
                targetRegion.troops.tot--; 
                targetRegion.troops.ma++; 
                logs?.push(`🐎 1 Tốt phe Thủ đã được phong cấp thành Mã.`); 
            }
            
            // Đã xóa G4_2 ở đây vì Defender không được phép dùng Blitz Commander
            
            // G4_3: Kiểm tra tàn quân phe Công (chạy trốn) CÓ TỐT HAY KHÔNG
            if (defenderGen.id === 'G4_3' && retreatRegionId && battle.retreatingTroops) { 
                if (battle.retreatingTroops.tot > 0) { 
                    battle.retreatingTroops.tot--; // Trừ trong data tàn quân
                    G.regions[retreatRegionId].troops.tot--; // Trừ thực tế trên bản đồ
                    logs?.push(`🏹 Bắn tên giết thêm 1 Tốt địch đang tháo chạy.`); 
                } else {
                    logs?.push(`🏹 Tàn quân địch không có Tốt nào, kỹ năng Blood Reaper vô tác dụng.`);
                }
            }

            if (defenderGen.id === 'G1_2') {
                // Nếu có tướng công đối đầu, phạt cooldown nó
                if (attackerGen) {
                    attackerGen.cooldownRounds += gCfg.G1_2_assassinate_cooldown;
                    logs?.push(`☠️ Tướng công [${attackerGen.name}] bị Sát thủ tẩm độc: Cooldown +${gCfg.G1_2_assassinate_cooldown} lượt!`);
                }
                // Vừa tẩm độc kẻ thắng, vừa ám sát thêm 1 đứa khác ở hậu phương địch
                killRandomEnemyGen(battle.attackerId, attackerGen?.id);
            }
            if (defenderGen.id === 'G1_3' && attackerGen) stealEnemyGen(battle.defenderId, battle.attackerId, attackerGen);
            
        } else { // THỦ THUA
            if (defenderGen.id === 'G1_2' && attackerGen) { attackerGen.cooldownRounds += gCfg.G1_2_assassinate_cooldown; logs?.push(`☠️ Tướng công bị ám sát hụt, phải nghỉ thêm 1 lượt.`); }
            if (defenderGen.id === 'G1_3' && attackerGen) { attackerGen.cooldownRounds = 0; logs?.push(`✨ Tướng công nhuệ khí dâng cao, lập tức hồi chiêu.`); }
            if (defenderGen.id === 'G1_4') handleG1_4_Revive(battle.defenderId, attackerGen?.id);
        }
    }

    return { triggerG42 };
};