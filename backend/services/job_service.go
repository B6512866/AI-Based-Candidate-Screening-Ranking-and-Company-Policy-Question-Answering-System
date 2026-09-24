package services

import (
	"context"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"

	"gorm.io/gorm"
)

type JobService struct {
	db *gorm.DB
}

func NewJobService(db *gorm.DB) *JobService {
	return &JobService{db: db}
}

func (s *JobService) CreateJob(ctx context.Context, req *entity.JobPosition) (*entity.JobPosition, error) {
	// 1. แมปข้อมูล Nested Criteria & SubCriteria
	var mainCriteria []entity.MainCriterion
	for _, mc := range req.Criteria {
		var subCriteria []entity.SubCriterion
		for _, sc := range mc.SubCriteria {
			subCriteria = append(subCriteria, entity.SubCriterion{
				SubCriterionID: sc.SubCriterionID,
				Title:          sc.Title,
				Description:    sc.Description,
				Weight:         sc.Weight,
			})
		}

		mainCriteria = append(mainCriteria, entity.MainCriterion{
			CriterionID: mc.CriterionID,
			Title:       mc.Title,
			Weight:      mc.Weight,
			SubCriteria: subCriteria,
		})
	}

	// 2. ขึ้นโครง JobPosition
	job := entity.JobPosition{
		Title:       req.Title,
		Department:  req.Department,
		Location:    req.Location,
		Salary:      req.Salary,
		Type:        req.Type,
		Benefits:    req.Benefits,
		ContactInfo: req.ContactInfo,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		Status:      req.Status,
		UserID:      req.UserID,
		Criteria:    mainCriteria,
	}

	// ค่า Default ของ Status ถ้าส่งมาเป็นค่าว่าง
	if job.Status == "" {
		job.Status = "เปิดรับสมัคร"
	}

	// 3. บันทึกลง Database (GORM จะทำ Transaction และสร้าง Nested Records ให้ครบทั้งหมด)
	if err := s.db.WithContext(ctx).Create(&job).Error; err != nil {
		return nil, err
	}

	return &job, nil
}
