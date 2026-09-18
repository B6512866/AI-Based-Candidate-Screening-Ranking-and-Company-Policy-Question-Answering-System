package entity

import "gorm.io/gorm"

type Application struct {
	gorm.Model
	ApplicationCode string  `json:"application_code" gorm:"type:varchar(50);uniqueIndex"`
	Status          string  `json:"status"` // pending, approved, interview, rejected
	AIScore        float64 `json:"ai_score"`
	Position       string  `json:"position"`
	ResumeURL      string  `json:"resume_url"`
	ResumeText          string `json:"resume_text" gorm:"type:text"` // <-- เพิ่มตัวนี้เพื่อเก็บเนื้อหา Resume
	ResumeExtractedJSON string `json:"resume_extracted_json" gorm:"type:text"` // 👈 บันทึกข้อมูลที่สกัดจาก OCR สแกน Resume เป็น JSON เพื่อต่อยอด UI
	TranscriptURL       string `json:"transcript_url"`
	TranscriptText string  `json:"transcript_text" gorm:"type:text"`

	// Link to Candidate instead of User
	CandidateID uint      `json:"candidate_id"`
	Candidate   Candidate `gorm:"foreignKey:CandidateID"`

	// Link to the HR who is responsible (Optional)
	UserID *uint `json:"user_id"`
	User   User  `gorm:"foreignKey:UserID"`

	ScreeningID *uint       `json:"screening_id"`
	AIScreening AIScreening `gorm:"foreignKey:ScreeningID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	JobPositionID uint                  `json:"job_position_id"`
	JobPosition   JobPosition           `gorm:"foreignKey:JobPositionID"` // <-- เพิ่มตัวนี้เพื่อแยกตำแหน่งงาน
	Documents     []ApplicationDocument `json:"documents" gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE;"`
}
