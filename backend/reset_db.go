//go:build ignore

package main

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load(".env")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=require TimeZone=Asia/Bangkok",
		host, user, pass, dbname, port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Printf("❌ เชื่อมต่อ Supabase ไม่สำเร็จ: %v\n", err)
		return
	}

	sql := `TRUNCATE TABLE applications, candidates, interviews, ai_screenings, chat_messages, reports RESTART IDENTITY CASCADE;`
	if err := db.Exec(sql).Error; err != nil {
		fmt.Printf("❌ ล้างข้อมูลไม่สำเร็จ: %v\n", err)
		return
	}

	fmt.Println("==================================================")
	fmt.Println("✨ ล้างข้อมูลที่เพิ่มทีหลังเรียบร้อยแล้ว!")
	fmt.Println("   - ตารางผู้สมัคร (Candidates/Applications): ล้างเกลี้ยง (เริ่ม ID 1)")
	fmt.Println("   - ตารางการสัมภาษณ์ & ผล AI: ล้างเกลี้ยง")
	fmt.Println("   - ข้อมูล Seed (ตำแหน่งงาน/เกณฑ์/ผู้ใช้): คงเดิมครบ 100%")
	fmt.Println("==================================================")
}
