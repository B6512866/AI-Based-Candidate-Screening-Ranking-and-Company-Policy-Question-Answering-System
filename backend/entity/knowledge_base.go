package entity

import "gorm.io/gorm"

type KnowledgeBase struct {
	gorm.Model
	Filename string `json:"filename"`
	Content  string `json:"content"`
	VectorID string `json:"vector_id"`
	UserID   uint   `json:"user_id"`
	User     User   `gorm:"foreignKey:UserID"`
}
