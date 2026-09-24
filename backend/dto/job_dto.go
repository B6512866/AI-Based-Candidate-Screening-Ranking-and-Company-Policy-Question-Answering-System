package dto

type SubCriterion struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
}

type MainCriterion struct {
	ID          string         `json:"id"`
	Title       string         `json:"title"`
	Weight      float64        `json:"weight"`
	SubCriteria []SubCriterion `json:"sub_criteria"`
}

type JobExtractionResponse struct {
	Title            string          `json:"title"`
	Department       string          `json:"department"`
	JobDescription   string          `json:"job_description"`
	Qualifications   []string        `json:"qualifications"`
	Responsibilities []string        `json:"responsibilities"`
	Criteria         []MainCriterion `json:"criteria"`
}

type GenerateCriteriaRequest struct {
	JobTitle       string `json:"job_title" binding:"required"`
	JobDescription string `json:"job_description" binding:"required"`
}

type CreateOrUpdateJobRequest struct {
	Title            string          `json:"title" binding:"required"`
	Department       string          `json:"department"`
	JobDescription   string          `json:"job_description"`
	Qualifications   []string        `json:"qualifications"`
	Responsibilities []string        `json:"responsibilities"`
	ImageURL         string          `json:"image_url"` // 👈 รับพาธไฟล์มาจาก Frontend
	Criteria         []MainCriterion `json:"criteria"`
}

// SubCriterionDTO: เกณฑ์ย่อย
type SubCriterionDTO struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
}

// MainCriterionDTO: เกณฑ์หลัก
type MainCriterionDTO struct {
	ID          string            `json:"id"`
	Title       string            `json:"title"`
	Weight      float64           `json:"weight"`
	SubCriteria []SubCriterionDTO `json:"sub_criteria"`
}

// ExtractedJobResponse: Response DTO สำหรับผลลัพธ์สกัดข้อมูลจากรูปภาพ
type ExtractedJobResponse struct {
	Title             string             `json:"title"`
	Department        string             `json:"department"`
	Location          string             `json:"location"`
	Salary            string             `json:"salary"`
	Type              string             `json:"type"`
	Description       string             `json:"description"`
	JobDescription    string             `json:"job_description"`
	Qualifications    []string           `json:"qualifications"`
	Responsibilities  []string           `json:"responsibilities"`
	Benefits          []string           `json:"benefits"`
	ContactInfo       string             `json:"contact_info"`
	SuggestedCriteria []MainCriterionDTO `json:"suggested_criteria"`
}
