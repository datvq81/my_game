import { useState, useMemo, useEffect } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO, Local } from 'boardgame.io/multiplayer'; 
import { createHexConquestGame } from './game/Game'; 
import { Board } from './components/Board';
import { Lobby } from './components/Lobby';
import './App.css'; 

function App() {
  const [appState, setAppState] = useState<'lobby' | 'playing' | 'editor'>('lobby');
  
  // Dữ liệu dùng để tạo phòng
  const [setupData, setSetupData] = useState<any>(null);
  const [numPlayers, setNumPlayers] = useState<number>(4); // Default 4
  const [playerID, setPlayerID] = useState<string>('0'); 
  
  // Quản lý ID Phòng (Room ID)
  const [matchID, setMatchID] = useState<string>('');
  
  // Chế độ ở Sảnh: Tạo phòng (Host) hay Vào phòng (Join)
  const [lobbyMode, setLobbyMode] = useState<'host' | 'join'>('host');
  const [joinRoomInput, setJoinRoomInput] = useState<string>('');

  // VÁ LỖI NHẬN NHẦM NGƯỜI CHƠI KHI CHUYỂN TAB
  useEffect(() => {
    if (lobbyMode === 'host') setPlayerID('0');
    if (lobbyMode === 'join') setPlayerID('1'); 
  }, [lobbyMode]);

  // Hàm tạo Game Client động dựa trên cấu hình
  const DynamicGameClient = useMemo(() => {
    if (appState === 'lobby') return null;
    
    const customGame = createHexConquestGame(setupData);

    const WrappedBoard = (props: any) => {
      return <Board {...props} setupData={setupData} />;
    };

    const GameClient = Client({
      game: customGame,
      board: WrappedBoard, 
      numPlayers: appState === 'editor' ? 1 : numPlayers,
      // multiplayer: appState === 'editor' ? Local() : SocketIO({ server: 'http://localhost:8000' }),
      multiplayer: appState === 'editor' ? Local() : SocketIO({ server: 'https://my-game-raxg.onrender.com' }),
      debug: false,
    }); 

    return GameClient;
  }, [appState, setupData, numPlayers]);

  const generateRandomRoomID = () => {
    return 'phong-' + Math.random().toString(36).substring(2, 7);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: '#1a1a1a' }}>
      
      {appState !== 'lobby' && (
        <button 
          className="game-btn btn-danger"
          onClick={() => {
            setAppState('lobby');
            setSetupData(null); 
          }}
          style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, padding: '8px 16px', fontSize: '14px' }}
        >
          ✖ Thoát về Sảnh
        </button>
      )}

      {appState === 'lobby' && (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          
          <div style={{ 
            width: '350px', background: 'rgba(0,0,0,0.85)', padding: '30px', 
            color: 'white', borderRight: '2px solid #444', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '5px 0 15px rgba(0,0,0,0.5)', zIndex: 10
          }}>
            <h2 style={{ color: '#ffd700', margin: '0 0 10px 0', textAlign: 'center', fontSize: '28px' }}>⚔️ HEX CONQUEST</h2>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`game-btn ${lobbyMode === 'host' ? 'btn-warning' : 'btn-primary'}`} 
                style={{ flex: 1, filter: lobbyMode === 'host' ? 'none' : 'grayscale(0.8)' }}
                onClick={() => setLobbyMode('host')}
              >
                👑 Tạo Phòng
              </button>
              <button 
                className={`game-btn ${lobbyMode === 'join' ? 'btn-warning' : 'btn-primary'}`} 
                style={{ flex: 1, filter: lobbyMode === 'join' ? 'none' : 'grayscale(0.8)' }}
                onClick={() => setLobbyMode('join')}
              >
                🚪 Vào Phòng
              </button>
            </div>

            <hr style={{ borderColor: '#555', margin: '10px 0' }}/>

            {lobbyMode === 'host' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
                  Bạn là <strong>Chủ phòng (Player 1)</strong>. Hãy cài đặt thông số và chọn Bản đồ ở màn hình bên phải để bắt đầu.
                </p>
                {/* Đã xóa Dropdown chọn số người chơi ở đây vì Lobby.tsx đã quản lý việc này */}
              </div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
                  Nhập mã phòng từ Chủ phòng cung cấp để tham gia.
                </p>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontWeight: 'bold' }}>🔑 Mã phòng (Room ID):</span>
                  <input 
                    type="text" 
                    value={joinRoomInput} 
                    onChange={(e) => setJoinRoomInput(e.target.value)} 
                    placeholder="VD: phong-a1b2c"
                    style={{ padding: '10px', background: '#222', color: '#fff', border: '1px solid #777', borderRadius: '4px', outline: 'none' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontWeight: 'bold' }}>👤 Bạn là Player:</span>
                  <select value={playerID} onChange={(e) => setPlayerID(e.target.value)} style={{ padding: '8px', background: '#333', color: 'white', border: '1px solid #777', borderRadius: '4px' }}>
                    <option value="0">P1 (Đỏ) - Chủ phòng</option>
                    <option value="1">P2 (Xanh lá)</option>
                    <option value="2">P3 (Xanh dương)</option>
                    <option value="3">P4 (Vàng)</option>
                  </select>
                </label>

                <button 
                  className="game-btn btn-danger" 
                  style={{ marginTop: '10px', padding: '12px' }}
                  onClick={() => {
                    if (!joinRoomInput.trim()) { alert("Vui lòng nhập mã phòng!"); return; }
                    setMatchID(joinRoomInput.trim());
                    setSetupData(null); 
                    setAppState('playing');
                  }}
                >
                  🚀 THAM GIA NGAY
                </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {lobbyMode === 'host' ? (
              <Lobby 
                onStartGame={(configData) => { 
                  setMatchID(generateRandomRoomID());
                  setPlayerID('0'); 
                  // Nhận số người chơi từ cấu hình Lobby truyền sang
                  setNumPlayers(configData.numPlayers || 4); 
                  setSetupData(configData); 
                  setAppState('playing'); 
                }} 
                onEnterEditor={() => { 
                  setSetupData({ isEditor: true }); 
                  setMatchID('local-editor'); 
                  setPlayerID('0');
                  setAppState('editor'); 
                }} 
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '20px' }}>
                Đang chờ vào phòng...
              </div>
            )}
          </div>
        </div>
      )}

      {DynamicGameClient && (() => {
        const GameClient = DynamicGameClient as any;
        return (
          <GameClient 
            matchID={matchID}     
            playerID={playerID}   
          />
        );
      })()}
    </div>
  );
}

export default App;