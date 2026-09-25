package entity

import (
	"gorm.io/gorm"
)

type Notification struct {
	gorm.Model
	Title         string `json:"title" gorm:"type:varchar(255);not null"`
	Message       string `json:"message" gorm:"type:text;not null"`
	Category      string `json:"category" gorm:"type:varchar(50);default:'system'"`
	CategoryLabel string `json:"categoryLabel" gorm:"type:varchar(100);default:'ระบบ'"`
	IsRead        bool   `json:"isRead" gorm:"default:false"`
	IsPriority    bool   `json:"isPriority" gorm:"default:false"`
	LinkPath      string `json:"linkPath" gorm:"type:varchar(255)"`
	LinkText      string `json:"linkText" gorm:"type:varchar(100)"`
	Role          string `json:"role" gorm:"type:varchar(20);default:'HR'"` // "HR", "EMPLOYEE", "ALL"
}
