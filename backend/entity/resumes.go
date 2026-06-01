package entity

import "gorm.io/gorm"

type Resumes struct {
	gorm.Model
	SenderEmail string `json:"sender_email"`
	FileUrl     string `json:"file_url"`
	RawText     string `json:"raw_text"`

	// Link to Candidate who owns this resume
	CandidateID uint      `json:"candidate_id"`
	Candidate   Candidate `gorm:"foreignKey:CandidateID"`

	// Link to the AI Screening result
	ScreeningID uint        `json:"screening_id"`
	AIScreening AIScreening `gorm:"foreignKey:ScreeningID"`
}
