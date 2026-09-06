package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type InterviewController struct {
	db *gorm.DB
}

func NewInterviewController(db *gorm.DB) *InterviewController {
	return &InterviewController{db: db}
}

// GET /api/interviews
func (c *InterviewController) GetAll(ctx *gin.Context) {
	var interviews []entity.Interview
	if err := c.db.
		Preload("Application.Candidate").
		Preload("Application.JobPosition").
		Preload("CreatedBy").
		Order("interview_datetime asc").
		Find(&interviews).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลนัดสัมภาษณ์ได้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": interviews})
}

// GET /api/interviews/:id
func (c *InterviewController) GetByID(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))
	var interview entity.Interview
	if err := c.db.
		Preload("Application.Candidate").
		Preload("Application.JobPosition").
		Preload("CreatedBy").
		First(&interview, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบนัดสัมภาษณ์นี้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": interview})
}

// POST /api/interviews
func (c *InterviewController) Create(ctx *gin.Context) {
	var req struct {
		ApplicationID    uint   `json:"application_id" binding:"required"`
		InterviewDate    string `json:"interview_date" binding:"required"`
		InterviewTime    string `json:"interview_time" binding:"required"`
		Format           string `json:"format" binding:"required"`
		FormatDescription string `json:"format_description"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}

	// ตรวจสอบว่ามี Application นี้จริง
	var app entity.Application
	if err := c.db.Preload("Candidate").First(&app, req.ApplicationID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบสมัครนี้"})
		return
	}

	// Parse วัน + เวลารวมกัน
	datetimeStr := fmt.Sprintf("%s %s", req.InterviewDate, req.InterviewTime)
	interviewDatetime, err := time.Parse("2006-01-02 15:04", datetimeStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "รูปแบบวันที่/เวลาไม่ถูกต้อง"})
		return
	}

	// ดึง user id จาก JWT (HR ที่สร้าง)
	userID, exists := ctx.Get("userID")
	var createdByID uint
	if exists {
		createdByID = userID.(uint)
	}

	interview := entity.Interview{
		ApplicationID:     req.ApplicationID,
		InterviewDatetime: interviewDatetime,
		DurationMinutes:   60,
		Format:            req.Format,
		FormatDescription: req.FormatDescription,
		Interview_Status:  "pending",
		CreatedByID:       createdByID,
	}

	if err := c.db.Create(&interview).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างนัดสัมภาษณ์ไม่สำเร็จ"})
		return
	}

	// อัปเดตสถานะใบสมัครเป็น interview
	c.db.Model(&app).Update("status", "interview")

	// โหลดข้อมูลที่สัมพันธ์กลับมาเพื่อส่งกลับ
	c.db.Preload("Application.Candidate").Preload("Application.JobPosition").Preload("CreatedBy").First(&interview, interview.ID)

	// ส่งอีเมลแจ้งเตือนนัดสัมภาษณ์ไปยัง Gmail ของผู้สมัคร
	if interview.Application.Candidate.Email != "" {
		candName := fmt.Sprintf("%s %s", interview.Application.Candidate.FirstName, interview.Application.Candidate.LastName)
		jobTitle := interview.Application.JobPosition.Title
		dateStr := interview.InterviewDatetime.Format("02/01/2006 เวลา 15:04 น.")
		locStr := interview.Format
		if interview.FormatDescription != "" {
			locStr += " (" + interview.FormatDescription + ")"
		}
		go services.SendInterviewEmail(interview.Application.Candidate.Email, candName, jobTitle, dateStr, locStr, interview.FormatDescription)
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "สร้างนัดสัมภาษณ์สำเร็จและส่งอีเมลแจ้งเตือนแล้ว",
		"data":    interview,
	})
}

// PUT /api/interviews/:id
func (c *InterviewController) Update(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	var interview entity.Interview
	if err := c.db.First(&interview, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบนัดสัมภาษณ์นี้"})
		return
	}

	var req struct {
		InterviewDate     string `json:"interview_date"`
		InterviewTime     string `json:"interview_time"`
		Format            string `json:"format"`
		FormatDescription string `json:"format_description"`
		InterviewStatus   string `json:"interview_status"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	// อัปเดตวันเวลาถ้ามี
	if req.InterviewDate != "" && req.InterviewTime != "" {
		datetimeStr := fmt.Sprintf("%s %s", req.InterviewDate, req.InterviewTime)
		interviewDatetime, err := time.Parse("2006-01-02 15:04", datetimeStr)
		if err == nil {
			interview.InterviewDatetime = interviewDatetime
		}
	}

	if req.Format != "" {
		interview.Format = req.Format
	}
	if req.FormatDescription != "" {
		interview.FormatDescription = req.FormatDescription
	}
	if req.InterviewStatus != "" {
		interview.Interview_Status = req.InterviewStatus
	}

	if err := c.db.Save(&interview).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "อัปเดตนัดสัมภาษณ์ไม่สำเร็จ"})
		return
	}

	c.db.Preload("Application.Candidate").Preload("Application.JobPosition").Preload("CreatedBy").First(&interview, interview.ID)

	ctx.JSON(http.StatusOK, gin.H{
		"message": "อัปเดตนัดสัมภาษณ์สำเร็จ",
		"data":    interview,
	})
}

// DELETE /api/interviews/:id
func (c *InterviewController) Delete(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	var interview entity.Interview
	if err := c.db.First(&interview, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบนัดสัมภาษณ์นี้"})
		return
	}

	if err := c.db.Delete(&interview).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ลบนัดสัมภาษณ์ไม่สำเร็จ"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบนัดสัมภาษณ์สำเร็จ"})
}

// GET /api/interviews/candidates – ดึง candidate ที่ผ่านการคัดกรองแล้ว (มี application อยู่)
func (c *InterviewController) GetCandidatesForInterview(ctx *gin.Context) {
	var applications []entity.Application
	if err := c.db.
		Preload("Candidate").
		Preload("JobPosition.Criteria.SubCriteria").
		Preload("AIScreening").
		Order("created_at desc").
		Find(&applications).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลผู้สมัครได้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": applications})
}
