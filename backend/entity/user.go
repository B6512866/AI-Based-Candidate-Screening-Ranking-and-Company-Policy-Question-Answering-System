package entity

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email" gorm:"unique"`
	Password  string `json:"-"`

	// Role relationship
	RoleID uint `json:"role_id"`
	Role   Role `gorm:"foreignKey:RoleID"`

	// Profile fields
	Department string    `json:"department"`
	HireDate   time.Time `json:"hire_date"`
}
