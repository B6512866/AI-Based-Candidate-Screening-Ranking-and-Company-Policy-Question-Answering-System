package services

import (
	"fmt"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"gorm.io/gorm"
)

// CreateNotification สร้างแจ้งเตือนใหม่ลงในฐานข้อมูล
func CreateNotification(db *gorm.DB, title, message, category, categoryLabel, linkPath, linkText, role string, isPriority bool) (*entity.Notification, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}
	if role == "" {
		role = "HR"
	}
	if category == "" {
		category = "system"
	}
	if categoryLabel == "" {
		categoryLabel = "การแจ้งเตือน"
	}

	notif := entity.Notification{
		Title:         title,
		Message:       message,
		Category:      category,
		CategoryLabel: categoryLabel,
		IsRead:        false,
		IsPriority:    isPriority,
		LinkPath:      linkPath,
		LinkText:      linkText,
		Role:          role,
	}

	if err := db.Create(&notif).Error; err != nil {
		fmt.Printf("⚠️ [Notification Error] บันทึกการแจ้งเตือนไม่สำเร็จ: %v\n", err)
		return nil, err
	}

	fmt.Printf("🔔 [Notification Created] [%s] %s: %s\n", role, title, message)
	return &notif, nil
}

// FormatThaiRelativeTime แปลงเวลาเป็นภาษาไทย เช่น "เมื่อสักครู่", "5 นาทีที่แล้ว"
func FormatThaiRelativeTime(t time.Time) string {
	diff := time.Since(t)
	if diff < time.Minute {
		return "เมื่อสักครู่"
	} else if diff < time.Hour {
		return fmt.Sprintf("%d นาทีที่แล้ว", int(diff.Minutes()))
	} else if diff < 24*time.Hour {
		return fmt.Sprintf("%d ชั่วโมงที่แล้ว", int(diff.Hours()))
	} else if diff < 48*time.Hour {
		return "เมื่อวานนี้"
	} else if diff < 7*24*time.Hour {
		return fmt.Sprintf("%d วันที่แล้ว", int(diff.Hours()/24))
	}

	loc, _ := time.LoadLocation("Asia/Bangkok")
	if loc == nil {
		loc = time.FixedZone("Asia/Bangkok", 7*3600)
	}
	thaiMonths := []string{"", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."}
	inLoc := t.In(loc)
	return fmt.Sprintf("%d %s %d", inLoc.Day(), thaiMonths[inLoc.Month()], inLoc.Year()+543)
}
