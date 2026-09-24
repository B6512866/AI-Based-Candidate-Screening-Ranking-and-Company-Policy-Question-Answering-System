package entity

import "gorm.io/gorm"

type ApplicationDocument struct {
	gorm.Model
	JobPositionID uint        `json:"job_position_id"`
	JobPosition   JobPosition `gorm:"foreignKey:JobPositionID" json:"job_position"`

	ApplicationID *uint       `json:"application_id,omitempty"`
	Application   Application `gorm:"foreignKey:ApplicationID" json:"application,omitempty"`

	CandidateID *uint     `json:"candidate_id,omitempty"`
	Candidate   Candidate `gorm:"foreignKey:CandidateID" json:"candidate,omitempty"`

	UploadedByUserID *uint `json:"uploaded_by_user_id,omitempty"`
	UploadedByUser   User  `gorm:"foreignKey:UploadedByUserID" json:"uploaded_by_user,omitempty"`

	DocumentType string `json:"document_type"`
	Title        string `json:"title"`
	FileName     string `json:"file_name"`
	FileURL      string `json:"file_url"`
	Description  string `json:"description" gorm:"type:text"`
}
