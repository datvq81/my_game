// src/components/StatsBoard.tsx
import React from 'react';
import { MAP_CONFIG } from '../config';

interface StatsBoardProps {
  matchID: string;
  allPlayerStats: Record<string, any>;
  playerID: string | null;
  playerColors: Record<string, string>;
  onClose?: () => void;
}

export const StatsBoard: React.FC<StatsBoardProps> = ({ matchID, allPlayerStats, playerID, playerColors }) => {
  return (
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
  );
};