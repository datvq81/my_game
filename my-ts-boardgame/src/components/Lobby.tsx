import React, { useState, useEffect } from 'react';
import '../App.css'; 

export const Lobby: React.FC<{ onStartGame: (setupData: any) => void; onEnterEditor: () => void; }> = ({ onStartGame, onEnterEditor }) => {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  
  // Các state cấu hình phòng chơi
  const [numPlayers, setNumPlayers] = useState<number>(4);
  const [maxCastles, setMaxCastles] = useState<number>(3);
  const [winCastles, setWinCastles] = useState<number>(6);

  useEffect(() => {
    const saved = localStorage.getItem('hex_conquest_maps');
    if (saved) {
      const parsedMaps = JSON.parse(saved);
      setMaps(parsedMaps);
      if (parsedMaps.length > 0) setSelectedMapId(parsedMaps[0].id);
    }
  }, []);

  const handleStart = () => {
    const mapToPlay = maps.find(m => m.id === selectedMapId);
    if(mapToPlay) {
      // Gộp chung map data và cấu hình phòng vào setupData
      onStartGame({
        ...mapToPlay,
        numPlayers,
        maxCastles,
        winCastles
      });
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '3rem', color: '#ffb300', marginBottom: '10px' }}>🌍 HEX CONQUEST</h1>
        <p style={{ color: '#aaa', fontSize: '1.2rem' }}>Tranh Đoạt Lục Giác</p>
      </div>

      <div className="glass-panel" style={{ padding: '30px', width: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ textAlign: 'center', fontSize: '1.5rem', margin: 0 }}>TẠO PHÒNG CHƠI</h3>
        
        {maps.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', fontStyle: 'italic' }}>Chưa có bản đồ nào được tạo. Hãy vào Editor tạo map nhé!</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#ccc', fontSize: '14px' }}>🗺️ Chọn Bản Đồ:</label>
                <select className="game-select" value={selectedMapId} onChange={(e) => setSelectedMapId(e.target.value)}>
                    {maps.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
                </select>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#ccc', fontSize: '14px' }}>👥 Số người chơi:</label>
                    <select className="game-select" value={numPlayers} onChange={(e) => setNumPlayers(Number(e.target.value))}>
                        <option value={2}>2 Người (Duel)</option>
                        <option value={3}>3 Người (Tam Quốc)</option>
                        <option value={4}>4 Người (Đại Chiến)</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#ccc', fontSize: '14px' }}>🏰 Số Thành tối đa tự xây:</label>
                    <input type="number" className="game-select" min={1} max={10} value={maxCastles} onChange={(e) => setMaxCastles(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>👑 Số Thành để Win:</label>
                    <input type="number" className="game-select" min={1} max={20} value={winCastles} onChange={(e) => setWinCastles(Number(e.target.value))} />
                </div>
            </div>
            
            <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: 0 }}>
                *Lưu ý: Số Thành để Win (C) nên lớn hơn số Thành tối đa tự xây (B) để ép người chơi phải đi xâm lược.
            </p>
          </>
        )}

        <button 
          className="game-btn btn-primary" 
          disabled={maps.length === 0} 
          onClick={handleStart} 
          style={{ width: '100%', padding: '15px', fontSize: '18px', marginTop: '10px' }}
        >
          🚀 BẮT ĐẦU GAME
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button className="game-btn btn-warning" onClick={onEnterEditor}>
          🛠 Mở Map Editor (Tạo Map Mới)
        </button>
      </div>
    </div>
  );
};