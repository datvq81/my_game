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
      win_condition_castles: 2
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
        base_cooldown: 2,              // Số lượt phải nghỉ sau khi xuất trận
        G4_4_damage_reduction: 1,      // G4_4: Số điểm lính được miễn tử
        G3_1_castle_defense_bonus: 2,  // G3_1: Điểm buff thêm khi thủ thành
        G2_2_ship_power_override: 2,   // G2_2: Sức mạnh thuyền được nâng lên
        G2_3_cannon_field_power: 3,    // G2_3: Sức mạnh pháo khi đánh ngoài đồng
        G1_2_assassinate_cooldown: 1   // G1_2: Hình phạt (số lượt nghỉ) ép lên tướng địch nếu ám sát hụt (thua)
      },
      pool: [
        {
    id: 'G4_1',
    power: 4,
    name: 'Cavalier Ascendant',
    skillW: 'Sau combat: Tốt được phong cấp thành Mã.'
  },
  {
    id: 'G4_2',
    power: 4,
    name: 'Blitz Commander',
    skillW: 'Sau combat: Được thực hiện thêm 1 lượt tấn công ngay lập tức.'
  },
  {
    id: 'G4_3',
    power: 4,
    name: 'Blood Reaper',
    skillW: 'Sau combat: Tiêu diệt thêm 1 Tốt của đối phương.'
  },
  {
    id: 'G4_4',
    power: 4,
    name: 'Doom Contract',
    skillA: 'Sau combat: Mất 1 điểm sức mạnh (bất kể kết quả).'
  },

  // ===== POWER 3 =====
  {
    id: 'G3_1',
    power: 3,
    name: 'Fortress Tactician',
    skillA: 'Trong combat phòng thủ thành: +2 sức mạnh thủ thành.'
  },
  {
    id: 'G3_2',
    power: 3,
    name: 'Iron Battery',
    skillL: 'Sau combat: Thua nhưng vẫn giữ được Pháo.'
  },
  {
    id: 'G3_3',
    power: 3,
    name: '退却将軍 (Taikyaku Shōgun)',
    skillL: 'Sau combat: Rút lui chủ động, tránh tổn thất thêm.'
  },
  {
    id: 'G3_4',
    power: 3,
    name: 'Mur de Fer',
    skillW: 'Sau combat phòng thủ: Thắng và không mất bất kỳ đơn vị nào.'
  },

  // ===== POWER 2 =====
  {
    id: 'G2_1',
    power: 2,
    name: 'Execution Order',
    skillA: 'Trong combat: Xóa năng lực công của tướng địch.'
  },
  {
    id: 'G2_2',
    power: 2,
    name: 'Admiral of Tides',
    skillA: 'Trong combat (có thuyền): Nhân đôi sức mạnh toàn bộ thuyền tham chiến.'
  },
  {
    id: 'G2_3',
    power: 2,
    name: 'Siege Artillery',
    skillA: 'Trong combat ngoài thành: Pháo được +3 sức mạnh.'
  },
  {
    id: 'G2_4',
    power: 2,
    name: 'Interdiction',
    skillA: 'Trong combat: Chặn toàn bộ viện trợ của đối phương.'
  },

  // ===== POWER 1 =====
  {
    id: 'G1_1',
    power: 1,
    name: 'Grand Conductor',
    skillA: 'Trong combat: Nhận toàn bộ viện trợ từ các ô lân cận có lệnh.'
  },
  {
    id: 'G1_2',
    power: 1,
    name: 'Assassin Primus',
    skillA: 'Sau combat: Giết 1 tướng địch đang trên tay đối phương.',
    skillL: 'Nếu thua: Tướng địch tham chiến bị +1 thời gian nghỉ.'
  },
  {
    id: 'G1_3',
    power: 1,
    name: 'Pháp Sư Hắc Ấn',
    skillA: 'Trước & sau combat: Xóa khả năng đặc biệt của tướng địch.',
    skillW: 'Nếu thắng: Cướp tướng vừa dùng.',
    skillL: 'Nếu thua: Tướng địch được dùng lại ngay lập tức.'
  },
  {
    id: 'G1_4',
    power: 1,
    name: 'Requiem of Kings',
    skillL: 'Sau combat nếu thua: Hồi sinh toàn bộ tướng đã thua của mình (trừ bản thân).'
  }
      ]
    }
  }
};