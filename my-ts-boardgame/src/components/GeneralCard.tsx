// src/components/GeneralCard.tsx
import React, { useState } from 'react';

interface GeneralCardProps {
    gen: any;
    isSelected?: boolean;
    disabledMsg?: string;
    onClick?: () => void;
}

// Component phụ hiển thị từng ô kỹ năng
const SkillBox: React.FC<{ label: string; text?: string; color: string; labelColor: string }> = ({ label, text, color, labelColor }) => {
    if (!text) return null; // Không có text thì ẩn luôn để các ô khác giãn ra
    return (
        <div style={{ 
            background: 'rgba(0,0,0,0.4)', 
            border: `1px solid ${color}`,
            borderRadius: '6px',
            display: 'flex',
            flex: 1, // KÍCH HOẠT TÍNH NĂNG TỰ ĐỘNG CO GIÃN THEO CHIỀU DỌC
            overflow: 'hidden',
            minHeight: '40px' // Đảm bảo không bị ép quá dẹt
        }}>
            <div style={{ 
                background: color,
                color: labelColor,
                width: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                flexShrink: 0
            }}>
                {label}
            </div>
            <div style={{ 
                flex: 1,
                padding: '6px 8px',
                fontSize: '13px', 
                lineHeight: '1.4',
                color: '#eee',
                overflowY: 'auto', // Có thanh cuộn nếu text vượt quá kích thước ô
            }} className="custom-scrollbar">
                {text}
            </div>
        </div>
    );
};

export const GeneralCard: React.FC<GeneralCardProps> = ({ 
    gen, 
    isSelected = false, 
    disabledMsg = '', 
    onClick = () => {} 
}) => {
    // Lấy ID ảnh (VD: 'G4_2' -> '4_2.png')
    const imageId = gen.id ? gen.id.replace('G', '') : 'image';
    
    // State quản lý lỗi ảnh để chuyển về ảnh mặc định
    const [imgSrc, setImgSrc] = useState(`/${imageId}.png`);

    const handleImgError = () => {
        setImgSrc('/G_image.png');
    };

    const colors = {
        cardBg: '#1c1c1c', 
        border: '#444', 
        borderSelected: '#ffd700', 
        headerBg: '#2a2a2a', 
        powerBg: '#b71c1c', // Đỏ mạnh mẽ cho điểm số
        nameColor: '#ffffff',
        skillA: '#e67e22', // Cam
        skillW: '#27ae60', // Xanh lục
        skillL: '#c0392b', // Đỏ
        textOnLight: '#fff'
    };

    return (
        <div 
            onClick={disabledMsg ? undefined : onClick}
            style={{ 
                width: '250px', 
                height: '400px',    
                margin: '0', 
                padding: '0',
                background: colors.cardBg,
                border: `3px solid ${isSelected ? colors.borderSelected : colors.border}`,
                borderRadius: '12px', 
                cursor: disabledMsg ? 'not-allowed' : 'pointer',
                boxShadow: isSelected 
                    ? `0 0 20px ${colors.borderSelected}` 
                    : '0 8px 16px rgba(0,0,0,0.6)',
                transform: isSelected ? 'translateY(-10px) scale(1.03)' : 'none',
                transition: 'all 0.2s ease-out',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0       
            }}
        >
            {/* Lớp phủ đen khi tướng không khả dụng (Tử trận/Đang nghỉ) */}
            {disabledMsg && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 20, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                }}>
                    <div style={{
                        color: '#ff5252', fontSize: '22px', fontWeight: 'bold', 
                        textTransform: 'uppercase', letterSpacing: '2px',
                        border: `3px solid #ff5252`, padding: '10px 20px',
                        transform: 'rotate(-15deg)', background: 'rgba(0,0,0,0.8)'
                    }}>
                        {disabledMsg}
                    </div>
                </div>
            )}

            {/* 1. HEADER: ĐIỂM CÔNG & TÊN TƯỚNG */}
            <div style={{ 
                display: 'flex', 
                height: '55px', 
                background: colors.headerBg, 
                borderBottom: `2px solid ${colors.border}`,
                flexShrink: 0
            }}>
                {/* Điểm công */}
                <div style={{ 
                    background: colors.powerBg, 
                    color: '#fff', 
                    width: '55px', 
                    display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', 
                    fontSize: '32px', 
                    fontWeight: 'bold',
                    borderRight: `2px solid ${colors.border}`,
                    flexShrink: 0
                }}>
                    {gen.power}
                </div>
                
                {/* Tên tướng - Hiển thị tối đa 2 dòng nếu tên quá dài */}
                <div style={{ 
                    flex: 1,
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        color: colors.nameColor,
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2, // Cho phép tên rớt xuống 2 dòng
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {gen.name}
                    </div>
                </div>
            </div>

            {/* 2. ẢNH ĐẠI DIỆN TƯỚNG */}
            <div style={{ 
                background: '#000', 
                height: '140px', // Cố định chiều cao ảnh
                borderBottom: `2px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
            }}>
                <img 
                    src={imgSrc} 
                    onError={handleImgError}
                    alt={gen.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
            </div>

            {/* 3. KHỐI KỸ NĂNG (TỰ ĐỘNG CHIA ĐỀU CHIỀU CAO) */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px', 
                padding: '8px', 
                flex: 1, // Chiếm toàn bộ phần khoảng trống còn lại
            }}>
                {/* Các ô sẽ tự động co giãn bằng nhau. Nếu không có text, hàm SkillBox sẽ ẩn nó đi */}
                <SkillBox label="A" text={gen.skillA || gen.desc} color={colors.skillA} labelColor={colors.textOnLight} />
                <SkillBox label="W" text={gen.skillW} color={colors.skillW} labelColor={colors.textOnLight} />
                <SkillBox label="L" text={gen.skillL} color={colors.skillL} labelColor={colors.textOnLight} />
                
                {!gen.skillA && !gen.desc && !gen.skillW && !gen.skillL && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'italic', color: '#666', fontSize: '13px' }}>
                        Tướng không có kỹ năng đặc biệt.
                    </div>
                )}
            </div>

            {/* Chỉnh sửa style thanh cuộn */}
            <style>{`
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #666 transparent;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #666;
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #888;
                }
            `}</style>
        </div>
    );
};