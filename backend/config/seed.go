package config

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
)

func SeedAllData() {
	SeedRoles()
	SeedUsers()
	SeedCandidate()
	SeedApplication()
	SeedAIScreening()
	SeedResumes()
	SeedKnowledgeBase()
	SeedChatMessage()
}

func SeedRoles() {
	roles := []entity.Role{
		{Name: "HRManager"},
		{Name: "Employee"},
	}

	for _, role := range roles {
		var count int64
		DB.Model(&entity.Role{}).Where("name = ?", role.Name).Count(&count)
		if count == 0 {
			DB.Create(&role)
		}
	}
}

func SeedUsers() {
	var hrRole, empRole entity.Role
	DB.Where("name = ?", "HRManager").First(&hrRole)
	DB.Where("name = ?", "Employee").First(&empRole)

	// ทำการ Hash Password ก่อนบันทึก
	hashedPassword, _ := HashPassword("password123")

	users := []entity.User{
		{
			FirstName: "Admin",
			LastName:  "HR",
			Email:     "hr@gmail.com",
			Password:  hashedPassword,
			RoleID:    hrRole.ID,
		},
		{
			FirstName:  "John",
			LastName:   "Employee",
			Email:      "test@gmail.com",
			Password:   hashedPassword,
			RoleID:     empRole.ID,
			Department: "IT",
		},
	}

	for _, user := range users {
		var count int64
		DB.Model(&entity.User{}).Where("email = ?", user.Email).Count(&count)
		if count == 0 {
			DB.Create(&user)
		}
	}
}

func SeedCandidate()     {}
func SeedApplication()   {}
func SeedAIScreening()   {}
func SeedResumes()       {}
func SeedKnowledgeBase() {}
func SeedChatMessage()   {}
