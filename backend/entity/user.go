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
	ProfileImage     string    `json:"profile_image"`
	Phone            string    `json:"phone"`
	Address          string    `json:"address"`
	Position         string    `json:"position"`
	Bio              string    `json:"bio"`
	EmergencyContact string    `json:"emergency_contact"`
	EmergencyPhone   string    `json:"emergency_phone"`
	Department       string    `json:"department"`
	HireDate         time.Time `json:"hire_date"`
}
