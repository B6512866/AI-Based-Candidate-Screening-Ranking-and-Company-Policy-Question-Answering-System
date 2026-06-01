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

	SkillScore float64 `json:"skill_score"`
	Strengths  string  `json:"strengths"`
	ModelUsed  string  `json:"model_used"`
}
