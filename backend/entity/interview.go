package entity

import (
	"time"
	"gorm.io/gorm"
)

type Interview struct {
	gorm.Model

	InterviewDatetime time.Time `json:"interview_datetime"`
	DurationMinutes    uint      `json:"duration_minutes" gorm:"default:60"`

	// online, onsite หรือ phone
	Format string `json:"format"`

	// online = URL, onsite = ห้อง/สถานที่, phone = เบอร์โทร
	FormatDescription string `json:"format_description" gorm:"type:text"`

	// pending, confirmed, completed, cancelled
	Interview_Status string `json:"interview_status" gorm:"default:'pending'"`

	ApplicationID uint        `json:"application_id" gorm:"index"`
	Application   Application `json:"application" gorm:"foreignKey:ApplicationID"`

	CreatedByID uint `json:"created_by_id"`
	CreatedBy   User `json:"created_by" gorm:"foreignKey:CreatedByID"`
}