package entity

import "gorm.io/gorm"

type ChatMessage struct {
	gorm.Model
	Question  string `json:"question"`
	Answer    string `json:"answer"`
	SourceDoc string `json:"source_doc"`
	UserID    uint   `json:"user_id"`
	User      User   `gorm:"foreignKey:UserID"`
}
