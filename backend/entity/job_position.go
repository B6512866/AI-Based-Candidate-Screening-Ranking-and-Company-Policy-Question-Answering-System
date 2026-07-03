package entity

import "gorm.io/gorm"

type JobPosition struct {
	gorm.Model
	Title       string `json:"title" gorm:"not null"`
	Department  string `json:"department"`
	Location    string `json:"location"`
	Salary      string `json:"salary"`
	Type        string `json:"type"`          // e.g. งานเต็มเวลา, สัญญาจ้าง, ฝึกงาน
	Benefits    string `json:"benefits"`      // สวัสดิการ
	ContactInfo string `json:"contact_info"`  // ข้อมูลติดต่อ/วิธีการสมัคร
	Description string `json:"description" gorm:"type:text"`
	Criteria    string `json:"criteria" gorm:"type:text"`
	Status      string `json:"status" gorm:"default:'เปิดรับสมัคร'"` // เปิดรับสมัคร / ปิดรับสมัครแล้ว
	UserID      uint   `json:"user_id"`
	User        User   `gorm:"foreignKey:UserID"`
}
