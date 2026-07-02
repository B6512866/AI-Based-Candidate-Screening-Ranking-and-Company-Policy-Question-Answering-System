package entity

import "gorm.io/gorm"

type JobPosition struct {
	gorm.Model
	Title       string `json:"title" gorm:"not null"`       // ชื่อตำแหน่งงาน
	Description string `json:"description" gorm:"type:text"` // ลักษณะงานที่ทำ (Job Description)
	Criteria    string `json:"criteria" gorm:"type:text"`    // เกณฑ์ในการคัดเลือกเข้ารับตำแหน่ง
	UserID      uint   `json:"user_id"`
	User        User   `gorm:"foreignKey:UserID"`
}
