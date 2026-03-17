export const MAP_CONFIG = {
  // Cấu hình Kích thước Icon (PNG) cho Lõi Bán kính 4
  icons: {
    troop: { width: 240, height: 240, offsetY: -180, spacing: 160, pedestalRx: 90, pedestalRy: 30, pedestalCy: 50 },
    castle: { width: 300, height: 300, offsetY: -220, pedestalRx: 120, pedestalRy: 40, pedestalCy: 70 },
    granary: { width: 300, height: 300, offsetY: -230, pedestalRx: 110, pedestalRy: 35, pedestalCy: 60 }
  },

  // CẤU HÌNH CÂN BẰNG GAME
  balance: {
    // 1. Sức mạnh quân đội (Combat Power)
    power: {
      tot: 1,         // Sức mạnh Bộ binh
      ma: 2,          // Sức mạnh Kỵ binh
      tau: 1,         // Sức mạnh Thuyền
      phao_base: 0,   // Sức mạnh Pháo khi đánh đất trống
      phao_castle: 4, // Sức mạnh Pháo khi Công/Thủ thành
      phao_support: 2 // Sức mạnh Pháo khi đi Viện trợ (có thể không dùng nếu tính theo ô đang đứng)
    },
    
    // 2. Giá mua quân và xây dựng (Gold Cost)
    cost: {
      tot: 1,
      ma: 2,
      phao: 2,
      tau: 1,
      castle: 4,
      granary: 2
    },

    // 3. Chỉ số Công trình & Giới hạn
    structures: {
      castle_defense_bonus: 2, // Điểm cộng thêm cho phe thủ khi có Thành
      castle_cost_troop: 2,    // Số lính Tốt bị hi sinh làm lính canh khi xây Thành
      granary_army_limit: 2,   // Số đạo quân tối đa mỗi Kho Lương nuôi được
      win_condition_castles: 7
    },

    // 4. Kinh tế (Thu nhập đầu hiệp)
    economy: {
      base_income: 0,          // Thu nhập cơ bản mỗi lượt
      castle_income: 1,        // Thêm vàng mỗi Thành
      granary_income: 2        // Thêm vàng mỗi Kho
    },

    // 5. Luật Viện trợ & Thiệt hại
    combat: {
      support_multiplier: 2 / 3,  // Viện trợ bằng 2/3 sức mạnh tổng (chuẩn xác hơn 0.66)
      winner_troop_loss: 2        // Số lính phe Thắng bị chết mặc định
    },

    // 6. Cấu hình Tướng
    generals: {
      skills: {
        base_cooldown: 1,              // Số lượt phải nghỉ sau khi xuất trận
        G4_4_damage_reduction: 1,      // G4_4: Số điểm lính được miễn tử
        G3_1_castle_defense_bonus: 2,  // G3_1: Điểm buff thêm khi thủ thành
        G2_2_ship_power_override: 2,   // G2_2: Sức mạnh thuyền được nâng lên
        G2_3_cannon_field_power: 3,    // G2_3: Sức mạnh pháo khi đánh ngoài đồng
        G1_2_assassinate_cooldown: 1   // G1_2: Hình phạt (số lượt nghỉ) ép lên tướng địch nếu ám sát hụt (thua)
      },
      pool: [
        { id: 'G4_1', power: 4, name: 'Tốt thành Mã' },
        { id: 'G4_2', power: 4, name: 'Tấn công tiếp' },
        { id: 'G4_3', power: 4, name: 'Giết thêm 1 Tốt' },
        { id: 'G4_4', power: 4, name: 'Mất bớt 1 điểm' },
        { id: 'G3_1', power: 3, name: '+2 Thủ Thành' },
        { id: 'G3_2', power: 3, name: 'Thua giữ Pháo' },
        { id: 'G3_3', power: 3, name: 'Rút lui chủ động' },
        { id: 'G3_4', power: 3, name: 'Thủ thắng ko mất gì' },
        { id: 'G2_1', power: 2, name: 'Xóa công tướng địch' },
        { id: 'G2_2', power: 2, name: 'x2 Sức mạnh Thuyền' },
        { id: 'G2_3', power: 2, name: 'Pháo ngoài thành +3' },
        { id: 'G2_4', power: 2, name: 'Chặn viện trợ' },
        { id: 'G1_1', power: 1, name: 'Nhận mọi viện trợ lân cận' },
        { id: 'G1_2', power: 1, name: 'Ám sát Tướng địch' },
        { id: 'G1_3', power: 1, name: 'Xóa buff & Cướp tướng' },
        { id: 'G1_4', power: 1, name: 'Hồi sinh Tướng phe mình' }
      ]
    }
  }
};