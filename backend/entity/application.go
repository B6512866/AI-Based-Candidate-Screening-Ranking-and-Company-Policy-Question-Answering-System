package entity

import "gorm.io/gorm"

type Application struct {
	gorm.Model
	Status    string  `json:"status"` // pending, approved, interview, rejected
	AIScore   float64 `json:"ai_score"`
	Position  string  `json:"position"`
	ResumeURL string  `json:"resume_url"`
	ResumeText  string  `json:"resume_text" gorm:"type:text"` // <-- เพิ่มตัวนี้เพื่อเก็บเนื้อหา Resume
	TranscriptURL string  `json:"transcript_url"`
	TranscriptText string  `json:"transcript_text" gorm:"type:text"`

	// Link to Candidate instead of User
	CandidateID uint      `json:"candidate_id"`
	Candidate   Candidate `gorm:"foreignKey:CandidateID"`

	// Link to the HR who is responsible (Optional)
	UserID *uint `json:"user_id"`
	User   User  `gorm:"foreignKey:UserID"`

	ScreeningID *uint       `json:"screening_id"`
	AIScreening AIScreening `gorm:"foreignKey:ScreeningID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	JobPositionID uint        `json:"job_position_id"`
	JobPosition   JobPosition `gorm:"foreignKey:JobPositionID"` // <-- เพิ่มตัวนี้เพื่อแยกตำแหน่งงาน
}
