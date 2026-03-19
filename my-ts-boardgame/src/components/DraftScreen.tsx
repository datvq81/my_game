// src/components/DraftScreen.tsx
import React, { useState } from 'react';
import type { GameState, General } from '../game/Game';
import { GeneralCard } from './GeneralCard';

interface DraftScreenProps {
  G: GameState;
  ctx: any;
  moves: any;
  playerID: string | null;
  matchID: string;
}

const playerColors: Record<string, string> = { 
  '0': '#ff5252', // Đỏ
  '1': '#4caf50', // Xanh lá
  '2': '#2196f3', // Xanh dương
  '3': '#ffeb3b'  // Vàng
};

// Component con xử lý từng ô Tướng đã chọn trong Đội hình (Roster)
const RosterSlot = ({ g, pColor }: { g?: General, pColor: string }) => {
    // Nếu ô còn trống
    if (!g) {
        return (
            <div style={{ display: 'flex', gap: '10px', height: '45px' }}>
                <div style={{ width: '45px', background: 'rgba(0,0,0,0.2)', border: '1px dashed #555', borderRadius: '6px' }} />
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px dashed #555', borderRadius: '6px' }} />
            </div>
        );
    }
    
    // Nếu đã có tướng -> Load ảnh và tên
    const [imgSrc, setImgSrc] = useState(`/${g.id.replace('G', '')}.png`);
    return (
        <div style={{ display: 'flex', gap: '10px', height: '45px' }}>
            {/* Cột Trái: Ảnh Tướng */}
            <div style={{ 
                width: '45px', borderRadius: '6px', overflow: 'hidden', 
                border: `2px solid ${pColor}`, flexShrink: 0, background: '#000' 
            }}>
                <img 
                    src={imgSrc} 
                    onError={() => setImgSrc('/G_image.png')} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt={g.name} 
                />
            </div>
            {/* Cột Phải: Tên Tướng */}
            <div style={{ 
                flex: 1, 
                background: 'linear-gradient(180deg, #2a4365 0%, #1a365d 100%)', // Màu xanh lam
                color: '#fff', 
                borderRadius: '6px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${pColor}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                padding: '0 8px'
            }}>
                <span style={{ 
                    fontSize: '13px', fontWeight: 'bold', display: '-webkit-box', 
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', 
                    lineHeight: '1.2', textAlign: 'center' 
                }}>
                    {g.name}
                </span>
            </div>
        </div>
    );
};

export const DraftScreen: React.FC<DraftScreenProps> = ({ G, ctx, moves, playerID, matchID }) => {
  const numPlayers = ctx.numPlayers;
  
  // Tính toán vòng (Round) hiện tại
  let totalDrafted = 0;
  for (let i = 0; i < numPlayers; i++) {
    totalDrafted += G.playerGenerals[i.toString()]?.length || 0;
  }
  const currentRound = Math.floor(totalDrafted / numPlayers) + 1;
  const targetPower = Math.max(1, 5 - currentRound); // Round 1 -> 4đ, Round 2 -> 3đ...

  const isMyTurn = ctx.currentPlayer === playerID;
  const currentPlayerColor = playerColors[ctx.currentPlayer];

  const handlePick = (generalId: string) => {
    if (isMyTurn) {
      moves.pickGeneral(generalId);
    }
  };

  const leftPlayers = [0, 2].filter(i => i < numPlayers).map(i => i.toString());
  const rightPlayers = [1, 3].filter(i => i < numPlayers).map(i => i.toString());

  const PlayerRoster = ({ pId }: { pId: string }) => {
    const pGenerals = G.playerGenerals[pId] || [];
    const pColor = playerColors[pId];
    const isDraftingNow = ctx.currentPlayer === pId;
    const isMe = pId === playerID;
    const slots = [0, 1, 2, 3];

    return (
        <div style={{ marginBottom: '25px' }}>
            <div style={{ 
                background: '#1a1a1a', padding: '12px 15px', 
                borderTop: `4px solid ${pColor}`,
                boxShadow: isDraftingNow ? `0 0 15px ${pColor}80` : '0 4px 6px rgba(0,0,0,0.5)',
                borderBottom: '1px solid #333'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: pColor, fontSize: '16px' }}>
                        {isMe ? "BẠN (P" : "P"}{parseInt(pId) + 1}{isMe ? ")" : ""}
                    </h4>
                    <span style={{ fontSize: '13px', color: '#aaa' }}>{pGenerals.length}/4 Tướng</span>
                </div>
            </div>

            {/* Lưới dọc (Dạng danh sách) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {slots.map(index => (
                    <RosterSlot key={index} g={pGenerals[index]} pColor={pColor} />
                ))}
            </div>
        </div>
    );
  };

  // Chỉ lấy đúng những thẻ bài của vòng hiện tại
  const generalsAtPower = G.availableGenerals.filter(g => g.power === targetPower);

  return (
    <div style={{
      width: '100vw', height: '100vh', 
      backgroundColor: '#111', color: '#fff',
      display: 'flex', flexDirection: 'column',
      backgroundImage: 'radial-gradient(circle at center, #1e1e1e 0%, #000 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* HEADER BANNER */}
      <div style={{
        textAlign: 'center', padding: '15px', 
        borderBottom: `3px solid ${currentPlayerColor}`,
        background: 'rgba(0,0,0,0.8)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', zIndex: 10
      }}>
        <h1 style={{ margin: '0 0 5px 0', color: '#ffd700', fontSize: '28px', textShadow: '0 2px 4px #000' }}>
          ⚔️ ĐẠI HỘI QUẦN HÙNG - VÒNG {currentRound} ⚔️
        </h1>
        {isMyTurn ? (
          <h2 style={{ margin: 0, color: currentPlayerColor, animation: 'pulse 1.5s infinite', fontSize: '18px' }}>
            👑 LƯỢT CỦA BẠN - HÃY CHỌN 1 TƯỚNG SỨC MẠNH {targetPower} ĐIỂM
          </h2>
        ) : (
          <h2 style={{ margin: 0, color: '#aaa', fontSize: '18px' }}>
            Đang chờ <span style={{ color: currentPlayerColor }}>Người chơi {parseInt(ctx.currentPlayer) + 1}</span> chọn Tướng...
          </h2>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, padding: '20px', gap: '30px', overflow: 'hidden', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        
        {/* CỘT TRÁI: ROSTERS P1, P3 */}
        <div style={{ width: '280px', paddingRight: '10px' }}>
            {leftPlayers.map(pId => <PlayerRoster key={pId} pId={pId} />)}
        </div>

        {/* CỘT GIỮA: BỂ TƯỚNG (CHỈ HIỂN THỊ VÒNG HIỆN TẠI, KHÔNG CẦN CUỘN) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ 
                margin: '0 0 30px 0', color: '#ffeb3b', 
                borderBottom: `2px solid #ffeb3b`, paddingBottom: '10px',
                textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center'
            }}>
                ⭐ Tướng {targetPower} Điểm 
            </h3>
            
            {/* LƯỚI 2x2 CỐ ĐỊNH (GRID) - TRÁNH LỖI 3-1 */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', // Ép cứng 2 cột
                gap: '25px', 
                justifyItems: 'center'
            }}>
              {generalsAtPower.map((g: General) => (
                <div key={g.id} style={{ transform: 'scale(0.95)' }}>
                    <GeneralCard 
                        gen={g} 
                        isSelected={false} 
                        disabledMsg={isMyTurn ? '' : 'Chờ đối thủ'} 
                        onClick={() => isMyTurn && handlePick(g.id)} 
                    />
                </div>
              ))}
            </div>
        </div>

        {/* CỘT PHẢI: ROSTERS P2, P4 */}
        <div style={{ width: '280px', paddingLeft: '10px' }}>
            {rightPlayers.map(pId => <PlayerRoster key={pId} pId={pId} />)}
        </div>

      </div>
    </div>
  );
};