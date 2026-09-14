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

	// pending, confirmed, completed, cancelled, rescheduled
	Interview_Status string `json:"interview_status" gorm:"default:'pending'"`

	// Token สำหรับตอบกลับจากอีเมล (ยืนยัน/เลื่อน/ปฏิเสธ)
	ResponseToken string `json:"response_token" gorm:"size:64;index"`

	// ── ผลสัมภาษณ์ (Interview Result) ──
	// passed, failed หรือ "" (ยังไม่ประเมิน)
	InterviewResult    string     `json:"interview_result" gorm:"size:20;default:''"`
	InterviewerScore   *float64   `json:"interviewer_score" gorm:"default:null"`
	ResultNotes        string     `json:"result_notes" gorm:"type:text"`
	ResultNotifiedAt   *time.Time `json:"result_notified_at"`
	ResultAcknowledged bool       `json:"result_acknowledged" gorm:"default:false"`
	ResultToken        string     `json:"result_token" gorm:"size:64;index"`

	ApplicationID uint        `json:"application_id" gorm:"index"`
	Application   Application `json:"application" gorm:"foreignKey:ApplicationID"`

	CreatedByID uint `json:"created_by_id"`
	CreatedBy   User `json:"created_by" gorm:"foreignKey:CreatedByID"`
}