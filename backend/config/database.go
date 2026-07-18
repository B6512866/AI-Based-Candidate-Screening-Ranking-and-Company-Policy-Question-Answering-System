package config

import (
	"fmt"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	fmt.Println("Connecting to:", Env.DBHost, Env.DBPort, Env.DBUser, Env.DBName)

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Bangkok",
		Env.DBHost, Env.DBUser, Env.DBPass, Env.DBName, Env.DBPort,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		panic("Failed to connect database: " + err.Error())
	}

	err = db.AutoMigrate(
		&entity.Role{},
		&entity.AIScreening{},
		&entity.Candidate{},
		&entity.User{},
		&entity.Application{},
		&entity.Resumes{},
		&entity.KnowledgeBase{},
		&entity.Interview{},
		&entity.ChatMessage{},
		&entity.Report{},
		&entity.JobPosition{},
	)
	if err != nil {
		panic("AutoMigrate failed: " + err.Error())
	}

	fmt.Println("Database connected!")
	DB = db
}
