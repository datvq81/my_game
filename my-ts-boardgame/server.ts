import { Server, Origins } from 'boardgame.io/server';
import { createHexConquestGame } from './src/game/Game'; 

console.log("⏳ Đang khởi động Server...");

try {
  const server = Server({
    games: [createHexConquestGame()],
    // Origins.LOCALHOST_IN_DEVELOPMENT mở sẵn cho các port 3000, 5173... của máy bạn
    // '*' tạm thời cho phép mọi trang web gọi vào (giúp Vercel kết nối dễ dàng lúc test)
    origins: [Origins.LOCALHOST_IN_DEVELOPMENT, '*'], 
  });

  // Ép kiểu chuỗi sang Số (parseInt). Nếu ở máy bạn không có env.PORT thì mặc định là 8000
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
  
  server.run(PORT, () => {
    console.log(`🚀 Game Server đã chạy thành công tại port: ${PORT}`);
    console.log(`👉 Hãy điền link DevTunnels vào biến VITE_SERVER_URL trên Vercel nhé!`);
  });
} catch (error) {
  console.error("❌ LỖI KHỞI ĐỘNG SERVER:", error);
}