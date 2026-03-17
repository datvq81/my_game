// src/components/DraftScreen.tsx
import React from 'react';
import type { GameState, General } from '../game/Game';

interface DraftScreenProps {
  G: GameState;
  ctx: any;
  moves: any;
  playerID: string | null;
  matchID: string;
}

const playerColors: Record<string, string> = { 
  '0': '#ee0a0a', 
  '1': '#22ec0f', 
  '2': '#0f5e9c',
  '3': '#e6b800'
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

  return (
    <div style={{
      width: '100vw', height: '100vh', 
      backgroundColor: '#111', color: '#fff',
      display: 'flex', flexDirection: 'column',
      backgroundImage: 'radial-gradient(circle at center, #2a2a2a 0%, #000 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', padding: '10px 20px', 
        borderRadius: '8px', border: '1px solid #555',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
      }}>
        <span style={{ color: '#aaa', fontSize: '14px' }}>Mã phòng: </span>
        <span style={{ color: '#ffd700', fontSize: '18px', fontWeight: 'bold', userSelect: 'all' }}>
          {matchID || 'Local'}
        </span>
      </div>
      {/* HEADER BANNER */}
      <div style={{
        textAlign: 'center', padding: '20px', 
        borderBottom: `4px solid ${currentPlayerColor}`,
        background: 'rgba(0,0,0,0.5)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#ffd700', fontSize: '36px', textShadow: '0 2px 4px #000' }}>
          ⚔️ ĐẠI HỘI QUẦN HÙNG - VÒNG {currentRound} ⚔️
        </h1>
        {isMyTurn ? (
          <h2 style={{ margin: 0, color: currentPlayerColor, animation: 'pulse 1.5s infinite' }}>
            👑 LƯỢT CỦA BẠN - HÃY CHỌN 1 TƯỚNG SỨC MẠNH {targetPower} ĐIỂM
          </h2>
        ) : (
          <h2 style={{ margin: 0, color: '#aaa' }}>
            Đang chờ <span style={{ color: currentPlayerColor }}>Người chơi {parseInt(ctx.currentPlayer) + 1}</span> chọn Tướng (Yêu cầu Tướng {targetPower}đ)...
          </h2>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, padding: '20px', gap: '20px', overflow: 'hidden' }}>
        
        {/* CỘT TRÁI: BỂ TƯỚNG (POOL) */}
        <div className="glass-panel" style={{ flex: 2, padding: '20px', overflowY: 'auto', border: '1px solid #444' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#fff', borderBottom: '1px solid #555', paddingBottom: '10px' }}>
            📜 DANH SÁCH TƯỚNG TRÊN BÀN (Còn lại: {G.availableGenerals.length})
          </h3>
          
          {[4, 3, 2, 1].map(powerLvl => {
            const generalsAtPower = G.availableGenerals.filter(g => g.power === powerLvl);
            const isTargetPower = powerLvl === targetPower;
            
            if (generalsAtPower.length === 0) return null;

            return (
              <div key={`power-${powerLvl}`} style={{ marginBottom: '30px', opacity: isTargetPower ? 1 : 0.4 }}>
                <h4 style={{ margin: '0 0 15px 0', color: isTargetPower ? '#ffeb3b' : '#888' }}>
                  ⭐ Tướng {powerLvl} Điểm {isTargetPower && "(Đang được chọn)"}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  {generalsAtPower.map((g: General) => (
                    <div 
                      key={g.id}
                      onClick={() => isTargetPower && handlePick(g.id)}
                      style={{
                        width: '180px', height: '120px',
                        background: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)',
                        border: `2px solid ${isTargetPower && isMyTurn ? '#ffeb3b' : '#333'}`,
                        borderRadius: '10px', padding: '15px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        cursor: isTargetPower && isMyTurn ? 'pointer' : 'not-allowed',
                        boxShadow: isTargetPower && isMyTurn ? '0 0 15px rgba(255, 235, 59, 0.3)' : 'none',
                        transition: 'transform 0.2s',
                        transform: isTargetPower && isMyTurn ? 'scale(1)' : 'scale(0.95)'
                      }}
                      onMouseEnter={(e) => { if(isTargetPower && isMyTurn) e.currentTarget.style.transform = 'scale(1.05)' }}
                      onMouseLeave={(e) => { if(isTargetPower && isMyTurn) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffeb3b', marginBottom: '10px' }}>
                        ⭐ {g.power}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '14px', color: '#fff', lineHeight: '1.4' }}>
                        {g.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CỘT PHẢI: ĐỘI HÌNH NGƯỜI CHƠI (ROSTERS) */}
        <div className="glass-panel" style={{ flex: 1, padding: '20px', overflowY: 'auto', border: '1px solid #444', minWidth: '300px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#fff', borderBottom: '1px solid #555', paddingBottom: '10px' }}>
            🛡️ ĐỘI HÌNH CÁC LÃNH CHÚA
          </h3>
          
          {Array.from({ length: numPlayers }).map((_, idx) => {
            const pId = idx.toString();
            const pGenerals = G.playerGenerals[pId] || [];
            const pColor = playerColors[pId];
            const isDraftingNow = ctx.currentPlayer === pId;

            return (
              <div key={pId} style={{ 
                marginBottom: '20px', padding: '15px', 
                backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '8px',
                borderLeft: `5px solid ${pColor}`,
                boxShadow: isDraftingNow ? `0 0 15px ${pColor}80` : 'none'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: pColor, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{pId === playerID ? "Bạn (P" : "P"}{idx + 1}{pId === playerID ? ")" : ""}</span>
                  <span style={{ fontSize: '14px', color: '#aaa' }}>{pGenerals.length}/4 Tướng</span>
                </h4>
                
                {pGenerals.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic', fontSize: '13px' }}>Chưa chiêu mộ tướng nào...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pGenerals.map(g => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', background: '#222', padding: '6px 10px', borderRadius: '4px' }}>
                        <span style={{ color: '#ffeb3b', fontWeight: 'bold', width: '30px' }}>{g.power}đ</span>
                        <span style={{ color: '#ddd', fontSize: '13px' }}>{g.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};