package entity

import (
	"gorm.io/gorm"
)

type Role struct {
	gorm.Model
	Name   string `gorm:"unique" json:"name"`
	Users  []User `gorm:"foreignKey:RoleID"`
}