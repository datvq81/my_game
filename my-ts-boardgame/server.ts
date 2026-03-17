import { Server, Origins } from 'boardgame.io/server';
import { createHexConquestGame } from './src/game/Game'; 

console.log("⏳ Đang khởi động Server...");

try {
  const server = Server({
    games: [createHexConquestGame()],
    origins: [Origins.LOCALHOST],
  });

  const PORT = 8000;
  server.run(PORT, () => {
    console.log(`🚀 Game Server đã chạy thành công tại: http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("❌ LỖI KHỞI ĐỘNG SERVER:", error);
}