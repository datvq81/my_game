import React, { useState, useEffect } from 'react';
import '../App.css'; 

export const Lobby: React.FC<{ onStartGame: (mapData: any) => void; onEnterEditor: () => void; }> = ({ onStartGame, onEnterEditor }) => {
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('');

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
    if(mapToPlay) onStartGame(mapToPlay);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', color: '#ffb300', marginBottom: '10px' }}>🌍 HEX CONQUEST</h1>
        <p style={{ color: '#aaa', fontSize: '1.2rem' }}>Tranh Đoạt Lục Giác</p>
      </div>

      <div className="glass-panel" style={{ padding: '30px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ textAlign: 'center', fontSize: '1.5rem' }}>Chọn Bản Đồ</h3>
        
        {maps.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', fontStyle: 'italic' }}>Chưa có bản đồ nào được tạo. Hãy vào Editor tạo map nhé!</p>
        ) : (
          <select 
            className="game-select"
            value={selectedMapId} 
            onChange={(e) => setSelectedMapId(e.target.value)}
          >
            {maps.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
          </select>
        )}

        <button 
          className="game-btn btn-primary" 
          disabled={maps.length === 0} 
          onClick={handleStart} 
          style={{ width: '100%', padding: '15px' }}
        >
          🚀 Bắt Đầu Game
        </button>
      </div>

      <div style={{ marginTop: '30px' }}>
        <button className="game-btn btn-warning" onClick={onEnterEditor}>
          🛠 Mở Map Editor (Tạo Map Mới)
        </button>
      </div>

    </div>
  );
};