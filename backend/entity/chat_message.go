package entity

import "gorm.io/gorm"

type ChatMessage struct {
	gorm.Model
	Question  string `json:"question"`
	Answer    string `json:"answer"`
	SourceDoc string `json:"source_doc"`
	UserID    uint   `json:"user_id"`
	User      User   `gorm:"foreignKey:UserID"`

	SessionID    string `json:"session_id" gorm:"type:varchar(100);index"`
	SessionTitle string `json:"session_title" gorm:"type:varchar(255)"`
}
