package controller

import (
	"net/http"
	"strconv"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type JobPositionController struct {
	db *gorm.DB
}

func NewJobPositionController(db *gorm.DB) *JobPositionController {
	return &JobPositionController{db: db}
}

// GET /api/job-positions
func (c *JobPositionController) GetAll(ctx *gin.Context) {
	var jobs []entity.JobPosition
	if err := c.db.Order("updated_at desc").Find(&jobs).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลตำแหน่งงานได้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": jobs})
}

// GET /api/job-positions/:id
func (c *JobPositionController) GetByID(ctx *gin.Context) {
	id := ctx.Param("id")
	var job entity.JobPosition
	if err := c.db.First(&job, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบตำแหน่งงาน"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": job})
}



// POST /api/job-positions
func (c *JobPositionController) Create(ctx *gin.Context) {
	var req entity.JobPosition
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	// ดึง userID จาก AuthMiddleware
	var userID uint = 1 // default เป็น 1 เผื่อกรณีไม่มี auth
	if idVal, exists := ctx.Get("id"); exists {
		if idFloat, ok := idVal.(float64); ok {
			userID = uint(idFloat)
		} else if idUint, ok := idVal.(uint); ok {
			userID = idUint
		}
	}

	status := req.Status
	if status == "" {
		status = "เปิดรับสมัคร"
	}

	job := entity.JobPosition{
		Title:       req.Title,
		Department:  req.Department,
		Location:    req.Location,
		Salary:      req.Salary,
		Type:        req.Type,
		Benefits:    req.Benefits,
		ContactInfo: req.ContactInfo,
		Description: req.Description,
		Criteria:    req.Criteria,
		Status:      status,
		UserID:      userID,
	}

	if err := c.db.Create(&job).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างตำแหน่งงานไม่สำเร็จ"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "บันทึกตำแหน่งงานสำเร็จ", "data": job})
}

// PUT /api/job-positions/:id
func (c *JobPositionController) Update(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ไม่ถูกต้อง"})
		return
	}

	var req entity.JobPosition
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	var job entity.JobPosition
	if err := c.db.First(&job, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบตำแหน่งงาน"})
		return
	}

	job.Title = req.Title
	job.Department = req.Department
	job.Location = req.Location
	job.Salary = req.Salary
	job.Type = req.Type
	job.Benefits = req.Benefits
	job.ContactInfo = req.ContactInfo
	job.Description = req.Description
	job.Criteria = req.Criteria
	if req.Status != "" {
		job.Status = req.Status
	}

	if err := c.db.Save(&job).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "อัปเดตตำแหน่งงานไม่สำเร็จ"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "อัปเดตข้อมูลสำเร็จ", "data": job})
}

// DELETE /api/job-positions/:id
func (c *JobPositionController) Delete(ctx *gin.Context) {
	id := ctx.Param("id")
	var job entity.JobPosition
	if err := c.db.First(&job, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบตำแหน่งงาน"})
		return
	}

	if err := c.db.Delete(&job).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ลบตำแหน่งงานไม่สำเร็จ"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบตำแหน่งงานสำเร็จ"})
}

func (c *JobPositionController) Apply(ctx *gin.Context) {
	idStr := ctx.Param("id")
	jobID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ตำแหน่งงานไม่ถูกต้อง"})
		return
	}
	// 1. เช็คว่าตำแหน่งงานนี้มีอยู่จริงไหม
	var job entity.JobPosition
	if err := c.db.First(&job, jobID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบตำแหน่งงานนี้ในระบบ"})
		return
	}
	var req struct {
		entity.Candidate
		ResumeURL string `json:"resume_url"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกข้อมูลและอัปโหลด Resume ให้ครบถ้วน"})
		return
	}
	// 2. ค้นหา Candidate เดิม หรือถ้าไม่มีให้สร้างขึ้นใหม่ (Find or Create by Email)
	var candidate entity.Candidate
	err = c.db.Where("email = ?", req.Email).First(&candidate).Error
	if err != nil {
		// ถ้าไม่พบ ให้สร้าง Candidate ใหม่
		candidate = entity.Candidate{
			FirstName: req.FirstName,
			LastName:  req.LastName,
			Email:     req.Email,
			Phone:     req.Phone,
		}
		if err := c.db.Create(&candidate).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลผู้สมัครได้"})
			return
		}
	}
	// 3. สร้างข้อมูลใบสมัคร (Application) บันทึกคู่กับ JobPositionID
	app := entity.Application{
		Status:        "รอพิจารณา",
		Position:      job.Title,
		ResumeText:    req.ResumeText,
		ResumeURL:     req.ResumeURL,
		CandidateID:   candidate.ID,
		JobPositionID: job.ID,
	}
	if err := c.db.Create(&app).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ส่งใบสมัครไม่สำเร็จ"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "ส่งใบสมัครและอัปโหลด Resume สำเร็จ!"})
}

// ── สำหรับ HR ดึงรายชื่อผู้สมัครแยกตามตำแหน่งงาน

func (c *JobPositionController) GetApplications(ctx *gin.Context) {
	id := ctx.Param("id")
	var apps []entity.Application
	// ดึงรายการใบสมัครทั้งหมดของตำแหน่งงานนี้ พร้อมโหลดข้อมูล Candidate เชื่อมโยงมาด้วย
	err := c.db.Preload("Candidate").
		Where("job_position_id = ?", id).
		Order("created_at desc").
		Find(&apps).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลผู้สมัครได้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": apps})
}