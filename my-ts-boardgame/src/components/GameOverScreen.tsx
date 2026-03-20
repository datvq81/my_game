// src/components/GameOverScreen.tsx
import React, { useState, useEffect } from 'react';
import { MAP_CONFIG } from '../config';

interface GameOverScreenProps {
  ctx: any;
  G: any;
  allPlayerStats: Record<string, any>;
  playerColors: Record<string, string>;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ ctx, G, allPlayerStats, playerColors }) => {
    // 1. GỌI TẤT CẢ HOOKS Ở TRÊN CÙNG (Quy tắc bắt buộc của React)
    const [warningTurnTrig, setWarningTurnTrig] = useState<number>(-1);
    const [warningPlayerTrig, setWarningPlayerTrig] = useState<string>("");

    const winThreshold = MAP_CONFIG.balance.structures.win_condition_castles;
    let highestCastles = 0;
    let leadingPlayer = '';
    
    // Tính toán chỉ số (Cần cho useEffect bên dưới)
    Object.keys(allPlayerStats).forEach(pId => {
        if (allPlayerStats[pId].castles > highestCastles) {
            highestCastles = allPlayerStats[pId].castles;
            leadingPlayer = pId;
        }
    });

    // 2. USE_EFFECT NẰM TRÊN CÁC LỆNH EARLY RETURN
    useEffect(() => {
        if (G.isEditor || ctx.gameover || ctx.phase !== 'MAIN_PLAY') return;

        const isWarningConditionMet = highestCastles >= winThreshold - 2;

        if (isWarningConditionMet) {
            if (warningTurnTrig !== ctx.turn || warningPlayerTrig !== leadingPlayer) {
                setWarningTurnTrig(ctx.turn);
                setWarningPlayerTrig(leadingPlayer);
            }
        }
    }, [highestCastles, leadingPlayer, ctx.turn, ctx.gameover, ctx.phase, G.isEditor, warningTurnTrig, warningPlayerTrig, winThreshold]);


    // 3. BÂY GIỜ MỚI ĐƯỢC PHÉP CHẶN HIỂN THỊ BẰNG EARLY RETURN
    if (G.isEditor) return null;
    if (!ctx.gameover && ctx.phase !== 'MAIN_PLAY') return null;


    // 4. HIỂN THỊ MÀN HÌNH GAME OVER (NẾU ĐÃ KẾT THÚC)
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

    // 5. HIỂN THỊ CẢNH BÁO WIN BÊN PHẢI (CHỈ HIỆN ĐÚNG LƯỢT ĐÓ)
    const showWarningOnThatTurnOnly = highestCastles >= winThreshold - 2 && 
                                      warningTurnTrig === ctx.turn && 
                                      warningPlayerTrig === leadingPlayer;

    if (!showWarningOnThatTurnOnly) return null; 

    if (highestCastles === winThreshold - 1) {
        return (
            <div style={{ position: 'fixed', top: 120, right: 20, width: '250px', background: 'rgba(211,47,47,0.95)', padding: '15px 20px', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 'bold', zIndex: 9000, boxShadow: '0 0 30px red', border: '2px solid #ffeb3b', pointerEvents: 'none', textAlign: 'center' }}>
                <span style={{ fontSize: '30px', display: 'block', marginBottom: '8px' }}>🚨</span>
                🚨 BÁO ĐỘNG 🚨<br/>Player {parseInt(leadingPlayer)+1} sắp chiến thắng ({highestCastles}/{winThreshold} Thành)!
            </div>
        );
    }
    
    if (highestCastles === winThreshold - 2) {
        return (
            <div style={{ position: 'fixed', top: 120, right: 20, width: '250px', background: 'rgba(255,152,0,0.85)', padding: '10px 15px', borderRadius: '10px', color: '#fff', fontWeight: 'bold', zIndex: 9000, pointerEvents: 'none', textAlign: 'center', fontSize: '14px' }}>
                <span style={{ fontSize: '20px', display: 'block', marginBottom: '5px' }}>⚠️</span>
                ⚠️ Lưu ý ⚠️<br/>Player {parseInt(leadingPlayer)+1} đang vươn lên dẫn đầu ({highestCastles}/{winThreshold} Thành).
            </div>
        );
    }

    return null;
};