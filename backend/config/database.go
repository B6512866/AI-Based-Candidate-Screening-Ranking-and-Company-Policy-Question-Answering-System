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

	//  ResetByDropSchema(db) //Drop ตารางทั้งหมดเลย
	//  ResetDatabase(db) //ลบข้อมูลในตารางทั้งหมดแล้วค่อย seed

	err = db.AutoMigrate(
		&entity.Role{},
		&entity.AIScreening{},
		&entity.Candidate{},
		&entity.User{},
		&entity.Application{},
		&entity.ApplicationDocument{},
		&entity.Resumes{},
		&entity.KnowledgeBase{},
		&entity.Interview{},
		&entity.ChatMessage{},
		&entity.Report{},
		&entity.JobPosition{},
		&entity.MainCriterion{}, // 👈 เพิ่มตารางนี้
		&entity.SubCriterion{},  // 👈 เพิ่มตารางนี้
	)
	if err != nil {
		panic("AutoMigrate failed: " + err.Error())
	}

	if err := db.Model(&entity.JobPosition{}).
		Where("status IS NULL OR status = ''").
		Update("status", entity.JobStatusOpen).Error; err != nil {
		panic("Job position status migration failed: " + err.Error())
	}

	fmt.Println("Database connected!")
	DB = db
}
