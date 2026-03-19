import { Server, Origins } from 'boardgame.io/server';
import { createHexConquestGame } from './src/game/Game'; 

console.log("⏳ Đang khởi động Server...");

try {
  const server = Server({
    games: [createHexConquestGame()],
    // Sử dụng '*' để cho phép mọi kết nối từ bên ngoài vào (khi bạn bè dùng link)
    origins: [Origins.LOCALHOST, '*'], 
  });

  // Ép kiểu chuỗi sang Số (parseInt). Nếu ở máy bạn không có env.PORT thì mặc định là 8000
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
  
  server.run(PORT, () => {
    console.log(`🚀 Game Server đã chạy thành công tại port: ${PORT}`);
  });
} catch (error) {
  console.error("❌ LỖI KHỞI ĐỘNG SERVER:", error);
}