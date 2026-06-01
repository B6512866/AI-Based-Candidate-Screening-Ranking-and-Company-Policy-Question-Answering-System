package entity

import "gorm.io/gorm"

type Report struct {
	gorm.Model
	Type   string `json:"type"`
	UserID uint   `json:"user_id"`
	User   User   `gorm:"foreignKey:UserID"`
}
