package entity

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	JobStatusOpen   = "เปิดรับสมัคร"
	JobStatusClosed = "ปิดรับสมัครแล้ว"
)

func IsValidJobStatus(status string) bool {
	return status == JobStatusOpen || status == JobStatusClosed
}

type JobPosition struct {
	gorm.Model
	Title                string          `json:"title" gorm:"not null"`
	Department           string          `json:"department"`
	Location             string          `json:"location"`
	Salary               string          `json:"salary"`
	Type                 string          `json:"type"`         // e.g. งานเต็มเวลา, สัญญาจ้าง, ฝึกงาน
	Benefits             string          `json:"benefits"`     // สวัสดิการ
	ContactInfo          string          `json:"contact_info"` // ข้อมูลติดต่อ/วิธีการสมัคร
	Description          string          `json:"description" gorm:"type:text"`
	Criteria             []MainCriterion `json:"criteria" gorm:"foreignKey:JobPositionID;constraint:OnDelete:CASCADE;"`
	ImageURL             string          `json:"image_url"`
	ImageURLs            datatypes.JSON  `json:"image_urls" gorm:"type:jsonb"`
	Status               string          `json:"status" gorm:"not null;default:'เปิดรับสมัคร'"` // เปิดรับสมัคร / ปิดรับสมัครแล้ว
	ApplicationStartDate *time.Time      `json:"application_start_date" gorm:"type:date"`
	ApplicationEndDate   *time.Time      `json:"application_end_date" gorm:"type:date"`
	UserID               uint            `json:"user_id"`
	User                 User            `gorm:"foreignKey:UserID"`
}

type MainCriterion struct {
	gorm.Model
	JobPositionID uint           `json:"job_position_id"`
	CriterionID   string         `json:"id"` // e.g. "c1"
	Title         string         `json:"title"`
	Weight        float64        `json:"weight"`
	SubCriteria   []SubCriterion `json:"sub_criteria" gorm:"foreignKey:MainCriterionID;constraint:OnDelete:CASCADE;"`
}

type SubCriterion struct {
	gorm.Model
	MainCriterionID uint    `json:"main_criterion_id"`
	SubCriterionID  string  `json:"id"` // e.g. "s1_1"
	Title           string  `json:"title"`
	Description     string  `json:"description" gorm:"type:text"`
	Weight          float64 `json:"weight"`
}
