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

type JobPositionRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
	Criteria    string `json:"criteria" binding:"required"`
}

// POST /api/job-positions
func (c *JobPositionController) Create(ctx *gin.Context) {
	var req JobPositionRequest
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

	job := entity.JobPosition{
		Title:       req.Title,
		Description: req.Description,
		Criteria:    req.Criteria,
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

	var req JobPositionRequest
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
	job.Description = req.Description
	job.Criteria = req.Criteria

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
