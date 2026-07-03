package entity

import (
	"time"

	"gorm.io/gorm"
)

type Candidate struct {
	ID        uint           `gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"`

	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email" gorm:"unique"`
	Phone     string `json:"phone"`
	Skills    string `json:"skills"`
	ResumeText string `json:"resume_text"`
	// One Candidate can have many Applications
	Applications []Application `gorm:"foreignKey:CandidateID"`
}
