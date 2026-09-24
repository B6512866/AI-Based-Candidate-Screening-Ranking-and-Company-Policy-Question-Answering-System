package entity

import (
	"time"

	"gorm.io/gorm"
)

type AIScreening struct {
	ID        uint           `gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"`

	SkillScore   float64 `json:"skill_score"`
	Strengths    string  `json:"strengths" gorm:"type:text"`
	AnalysisData string  `json:"analysis_data" gorm:"type:text"` // 👈 สกัดและเก็บข้อมูลวิเคราะห์เป็น JSON เพื่อต่อยอด UI
	ModelUsed    string  `json:"model_used"`
}
