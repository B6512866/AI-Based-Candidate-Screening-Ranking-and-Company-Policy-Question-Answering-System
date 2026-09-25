package controller

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/services"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func generateRandomAppCode(db *gorm.DB) string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := 0; i < 20; i++ {
		code := fmt.Sprintf("APP-%05d", r.Intn(90000)+10000)
		var count int64
		db.Model(&entity.Application{}).Where("application_code = ?", code).Count(&count)
		if count == 0 {
			return code
		}
	}
	return fmt.Sprintf("APP-%05d", time.Now().UnixNano()%90000+10000)
}

type JobPositionController struct {
	db *gorm.DB
}

// CleanCandidateName cleans prefixes, nicknames in brackets, job titles, and extra description words from raw candidate names
func CleanCandidateName(rawName string) (firstName, lastName string) {
	if rawName == "" {
		return "", ""
	}

	clean := rawName

	// 1. Cut off at line breaks
	if idx := strings.IndexAny(clean, "\n\r"); idx != -1 {
		clean = clean[:idx]
	}

	// 2. Cut off at colon (e.g. "ชื่อ: สมชาย ใจดี")
	if idx := strings.Index(clean, ":"); idx != -1 {
		clean = clean[idx+1:]
	}

	// 3. Cut off at delimiters followed by titles/extra details (e.g. "สมชาย ใจดี | Developer")
	delims := []string{"|", "/", "—", "–", " - ", "ตำแหน่ง", "เป็น", "โดย", "อายุ", " (", " ["}
	for _, delim := range delims {
		if idx := strings.Index(clean, delim); idx != -1 {
			clean = clean[:idx]
		}
	}

	// 4. Remove brackets and contents (e.g. (ต้อม), [Tom])
	reBracket := regexp.MustCompile(`[\(\[\{].*?[\)\]\}]`)
	clean = reBracket.ReplaceAllString(clean, "")

	// 5. Remove common prefixes
	prefixes := []string{
		"คุณ", "นาย", "นางสาว", "นาง", "ดร.", "ศ.", "ผศ.", "รศ.",
		"Mr.", "Mr ", "Mrs.", "Mrs ", "Ms.", "Ms ", "Dr.", "Dr ",
		"ผู้สมัครชื่อ", "ผู้สมัคร", "ชื่อ-นามสกุล", "ชื่อนามสกุล", "ชื่อ", "Name", "Candidate",
	}

	clean = strings.TrimSpace(clean)
	for _, p := range prefixes {
		if strings.HasPrefix(strings.ToLower(clean), strings.ToLower(p)) {
			clean = strings.TrimSpace(clean[len(p):])
		}
	}

	// 6. Clean up symbols
	clean = strings.Trim(clean, " \t\n\r-*•:;,.|/\\_")

	// 7. Split into FirstName and LastName
	parts := strings.Fields(clean)
	if len(parts) == 0 {
		return "", ""
	}
	firstName = parts[0]
	if len(parts) > 1 {
		lastName = strings.Join(parts[1:], " ")
	}
	return firstName, lastName
}

func mustMarshalJSON(values []string) datatypes.JSON {
	if values == nil {
		return datatypes.JSON([]byte("[]"))
	}

	encoded, err := json.Marshal(values)
	if err != nil {
		return datatypes.JSON([]byte("[]"))
	}

	return datatypes.JSON(encoded)
}

func parseApplicationDates(startValue, endValue string) (*time.Time, *time.Time, error) {
	var startDate *time.Time
	var endDate *time.Time

	if startValue != "" {
		parsed, err := time.Parse("2006-01-02", startValue)
		if err != nil {
			return nil, nil, fmt.Errorf("วันที่เริ่มรับสมัครไม่ถูกต้อง")
		}
		startDate = &parsed
	}

	if endValue != "" {
		parsed, err := time.Parse("2006-01-02", endValue)
		if err != nil {
			return nil, nil, fmt.Errorf("วันที่สิ้นสุดรับสมัครไม่ถูกต้อง")
		}
		endDate = &parsed
	}

	if startDate != nil && endDate != nil && endDate.Before(*startDate) {
		return nil, nil, fmt.Errorf("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มรับสมัคร")
	}

	return startDate, endDate, nil
}

func NewJobPositionController(db *gorm.DB) *JobPositionController {
	return &JobPositionController{db: db}
}

// GET /api/job-positions
func (c *JobPositionController) GetAll(ctx *gin.Context) {
	var jobs []entity.JobPosition
	// เพิ่ม Preload เพื่อดึงข้อมูล Criteria และ SubCriteria พ่วงมาด้วย
	if err := c.db.Preload("Criteria.SubCriteria").Order("updated_at desc").Find(&jobs).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลตำแหน่งงานได้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": jobs})
}

// GET /api/job-positions/:id
func (c *JobPositionController) GetByID(ctx *gin.Context) {
	id := ctx.Param("id")
	var job entity.JobPosition
	// เพิ่ม Preload ที่นี่ด้วยเช่นกัน
	if err := c.db.Preload("Criteria.SubCriteria").First(&job, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบตำแหน่งงาน"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": job})
}

// POST /api/job-positions
func (c *JobPositionController) Create(ctx *gin.Context) {
	// ใช้ Struct ชั่วคราวเพื่อให้ Criteria รองรับทั้งแบบ String และแบบ Array ได้
	var req struct {
		Title                string      `json:"title"`
		Department           string      `json:"department"`
		Location             string      `json:"location"`
		Salary               string      `json:"salary"`
		Type                 string      `json:"type"`
		Benefits             string      `json:"benefits"`
		ContactInfo          string      `json:"contact_info"`
		Description          string      `json:"description"`
		Criteria             interface{} `json:"criteria"` // รับได้ทั้ง string หรือ array เพื่อป้องกัน error unmarshal
		ImageURL             string      `json:"image_url"`
		ImageURLs            []string    `json:"image_urls"`
		Status               string      `json:"status"`
		ApplicationStartDate string      `json:"application_start_date"`
		ApplicationEndDate   string      `json:"application_end_date"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("ข้อมูลไม่ถูกต้อง: %v", err)})
		return
	}

	// ดึง userID จาก AuthMiddleware
	var userID uint = 1 // default เป็น 1 เผื่อกรณีไม่มี auth
	if idVal, exists := ctx.Get("userID"); exists {
		switch v := idVal.(type) {
		case float64:
			userID = uint(v)
		case uint:
			userID = v
		case int:
			userID = uint(v)
		}
	} else if idVal, exists := ctx.Get("id"); exists {
		switch v := idVal.(type) {
		case float64:
			userID = uint(v)
		case uint:
			userID = v
		case int:
			userID = uint(v)
		}
	}

	status := req.Status
	if status == "" {
		status = entity.JobStatusOpen
	}
	if !entity.IsValidJobStatus(status) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "สถานะประกาศงานไม่ถูกต้อง"})
		return
	}

	applicationStartDate, applicationEndDate, err := parseApplicationDates(req.ApplicationStartDate, req.ApplicationEndDate)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// แปลง Criteria กลับเป็น []entity.MainCriterion ถ้าส่งมาเป็น struct ปกติ
	var criteriaList []entity.MainCriterion
	if req.Criteria != nil {
		// หากส่งมาเป็นอาเรย์ของ object สามารถแปลงผ่าน JSON roundtrip ได้อย่างปลอดภัย
		if jsonBytes, err := json.Marshal(req.Criteria); err == nil {
			json.Unmarshal(jsonBytes, &criteriaList)
		}
	}

	job := entity.JobPosition{
		Title:                req.Title,
		Department:           req.Department,
		Location:             req.Location,
		Salary:               req.Salary,
		Type:                 req.Type,
		Benefits:             req.Benefits,
		ContactInfo:          req.ContactInfo,
		Description:          req.Description,
		Criteria:             criteriaList,
		ImageURL:             req.ImageURL,
		ImageURLs:            mustMarshalJSON(req.ImageURLs),
		Status:               status,
		ApplicationStartDate: applicationStartDate,
		ApplicationEndDate:   applicationEndDate,
		UserID:               userID,
	}

	if err := c.db.Create(&job).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("สร้างตำแหน่งงานไม่สำเร็จ: %v", err)})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "บันทึกตำแหน่งงานสำเร็จ", "data": job})
}

// PUT /api/job-positions/:id
func (c *JobPositionController) Update(ctx *gin.Context) {
	idStr := ctx.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error": "ID ไม่ถูกต้อง",
		})
		return
	}

	// ============================================================
	// Request Structure
	// รองรับ JSON โครงสร้างเดียวกับที่ GET /job-positions ส่งกลับ
	// ============================================================

	type SubCriterionRequest struct {
		ID              uint    `json:"ID"`
		CreatedAt       string  `json:"CreatedAt"`
		UpdatedAt       string  `json:"UpdatedAt"`
		DeletedAt       any     `json:"DeletedAt"`
		MainCriterionID uint    `json:"main_criterion_id"`
		Id              string  `json:"id"`
		Title           string  `json:"title"`
		Description     string  `json:"description"`
		Weight          float64 `json:"weight"`
	}

	type CriterionRequest struct {
		ID            uint                  `json:"ID"`
		CreatedAt     string                `json:"CreatedAt"`
		UpdatedAt     string                `json:"UpdatedAt"`
		DeletedAt     any                   `json:"DeletedAt"`
		JobPositionID uint                  `json:"job_position_id"`
		Id            string                `json:"id"`
		Title         string                `json:"title"`
		Weight        float64               `json:"weight"`
		SubCriteria   []SubCriterionRequest `json:"sub_criteria"`
	}

	// ใช้ interface{} กับ Benefits เพื่อรองรับทั้ง
	// "string"
	// และ
	// ["item1", "item2"]
	type UpdateJobRequest struct {
		Title       string `json:"title"`
		Department  string `json:"department"`
		Location    string `json:"location"`
		Salary      string `json:"salary"`
		Type        string `json:"type"`
		ContactInfo string `json:"contact_info"`

		Description string `json:"description"`

		// รองรับทั้ง String และ Array
		Benefits interface{} `json:"benefits"`

		Criteria []CriterionRequest `json:"criteria"`

		ImageURL             string   `json:"image_url"`
		ImageURLs            []string `json:"image_urls"`
		Status               string   `json:"status"`
		ApplicationStartDate string   `json:"application_start_date"`
		ApplicationEndDate   string   `json:"application_end_date"`
	}

	var req UpdateJobRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error":   "ข้อมูลไม่ถูกต้อง",
			"details": err.Error(),
		})
		return
	}

	applicationStartDate, applicationEndDate, dateErr := parseApplicationDates(req.ApplicationStartDate, req.ApplicationEndDate)
	if dateErr != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": dateErr.Error()})
		return
	}

	// ============================================================
	// แปลง Benefits
	// ============================================================

	var benefits string

	switch value := req.Benefits.(type) {

	case string:
		// ถ้า frontend ส่งมาเป็น string
		benefits = value

	case []interface{}:
		// ถ้า frontend ส่งมาเป็น array
		var benefitList []string

		for _, item := range value {
			if text, ok := item.(string); ok {
				benefitList = append(benefitList, text)
			}
		}

		// เก็บใน DB เป็น string แบบเดิม
		benefits = strings.Join(benefitList, "\n")

	case nil:
		benefits = ""

	default:
		// fallback กรณีข้อมูลรูปแบบอื่น
		jsonBytes, marshalErr := json.Marshal(value)

		if marshalErr == nil {
			benefits = string(jsonBytes)
		}
	}

	// ============================================================
	// Transaction
	// ============================================================

	tx := c.db.Begin()

	if tx.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "ไม่สามารถเริ่ม Transaction ได้",
		})
		return
	}

	// ============================================================
	// 1. ค้นหา JobPosition
	// ============================================================

	var job entity.JobPosition

	if err := tx.First(&job, uint(id)).Error; err != nil {

		tx.Rollback()

		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{
				"error": "ไม่พบตำแหน่งงาน",
			})
			return
		}

		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "ไม่สามารถค้นหาตำแหน่งงานได้",
		})
		return
	}

	// ============================================================
	// 2. Update ข้อมูล JobPosition
	// ============================================================

	job.Title = req.Title
	job.Department = req.Department
	job.Location = req.Location
	job.Salary = req.Salary
	job.Type = req.Type
	job.Benefits = benefits
	job.ContactInfo = req.ContactInfo
	job.Description = req.Description
	job.ImageURL = req.ImageURL
	job.ImageURLs = mustMarshalJSON(req.ImageURLs)
	job.ApplicationStartDate = applicationStartDate
	job.ApplicationEndDate = applicationEndDate

	if req.Status != "" {
		if !entity.IsValidJobStatus(req.Status) {
			tx.Rollback()
			ctx.JSON(http.StatusBadRequest, gin.H{
				"error": "สถานะประกาศงานไม่ถูกต้อง",
			})
			return
		}
		job.Status = req.Status
	}

	if err := tx.Save(&job).Error; err != nil {

		tx.Rollback()

		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "ไม่สามารถอัปเดตข้อมูลตำแหน่งงานได้",
		})
		return
	}

	// ============================================================
	// 3. ลบ SubCriteria เดิม
	// ============================================================

	var oldCriteria []entity.MainCriterion

	if err := tx.
		Where("job_position_id = ?", job.ID).
		Find(&oldCriteria).Error; err != nil {

		tx.Rollback()

		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "ไม่สามารถค้นหา Criteria เดิมได้",
		})
		return
	}

	// ลบ SubCriteria ที่อยู่ภายใต้ Criteria เดิม
	for _, criterion := range oldCriteria {

		if err := tx.
			Where("main_criterion_id = ?", criterion.ID).
			Delete(&entity.SubCriterion{}).Error; err != nil {

			tx.Rollback()

			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error": "ไม่สามารถลบ SubCriteria เดิมได้",
			})
			return
		}
	}

	// ============================================================
	// 4. ลบ Main Criteria เดิม
	// ============================================================

	if err := tx.
		Where("job_position_id = ?", job.ID).
		Delete(&entity.MainCriterion{}).Error; err != nil {

		tx.Rollback()

		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "ไม่สามารถลบ Criteria เดิมได้",
		})
		return
	}

	// ============================================================
	// 5. สร้าง Criteria ใหม่
	// ============================================================

	for _, criterionReq := range req.Criteria {

		criterion := entity.MainCriterion{
			JobPositionID: job.ID,
			CriterionID:   criterionReq.Id,
			Title:         criterionReq.Title,
			Weight:        criterionReq.Weight,
		}

		if err := tx.Create(&criterion).Error; err != nil {

			tx.Rollback()

			ctx.JSON(http.StatusInternalServerError, gin.H{
				"error":   "ไม่สามารถบันทึก Criteria ได้",
				"details": err.Error(),
			})
			return
		}

		// ========================================================
		// 6. สร้าง SubCriteria
		// ========================================================

		for _, subReq := range criterionReq.SubCriteria {

			subCriterion := entity.SubCriterion{
				MainCriterionID: criterion.ID,
				SubCriterionID:  subReq.Id,
				Title:           subReq.Title,
				Description:     subReq.Description,
				Weight:          subReq.Weight,
			}

			if err := tx.Create(&subCriterion).Error; err != nil {

				tx.Rollback()

				ctx.JSON(http.StatusInternalServerError, gin.H{
					"error":   "ไม่สามารถบันทึก SubCriteria ได้",
					"details": err.Error(),
				})
				return
			}
		}
	}

	// ============================================================
	// 7. Commit
	// ============================================================

	if err := tx.Commit().Error; err != nil {

		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "ไม่สามารถบันทึกข้อมูลได้",
		})
		return
	}

	// ============================================================
	// 8. โหลดข้อมูลใหม่พร้อม Criteria + SubCriteria
	// ============================================================

	var updatedJob entity.JobPosition

	if err := c.db.
		Preload("Criteria.SubCriteria").
		First(&updatedJob, job.ID).Error; err != nil {

		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "บันทึกสำเร็จแต่ไม่สามารถโหลดข้อมูลล่าสุดได้",
		})
		return
	}

	// ============================================================
	// Response
	// ============================================================

	ctx.JSON(http.StatusOK, gin.H{
		"message": "อัปเดตข้อมูลตำแหน่งงานสำเร็จ",
		"data":    updatedJob,
	})
}

// PATCH /api/job-positions/:id/status
func (c *JobPositionController) UpdateStatus(ctx *gin.Context) {
	id := ctx.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil || !entity.IsValidJobStatus(req.Status) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "สถานะประกาศงานไม่ถูกต้อง"})
		return
	}

	var job entity.JobPosition
	if err := c.db.First(&job, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบตำแหน่งงาน"})
			return
		}

		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถค้นหาตำแหน่งงานได้"})
		return
	}

	if err := c.db.Model(&job).Update("status", req.Status).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตสถานะประกาศงานได้"})
		return
	}

	job.Status = req.Status
	ctx.JSON(http.StatusOK, gin.H{
		"message": "อัปเดตสถานะประกาศงานสำเร็จ",
		"data":    job,
	})
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
	if job.Status == entity.JobStatusClosed {
		ctx.JSON(http.StatusConflict, gin.H{"error": "ตำแหน่งงานนี้ปิดรับสมัครแล้ว"})
		return
	}
	var req struct {
		entity.Candidate
		ResumeURL      string `json:"resume_url"`
		TranscriptURL  string `json:"transcript_url"`
		TranscriptText string `json:"transcript_text"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกข้อมูลและอัปโหลดเอกสารให้ครบถ้วน"})
		return
	}
	// 2. สร้าง Candidate ใหม่สำหรับทุกใบสมัคร (เพื่อให้ข้อมูลชื่อ-นามสกุล และเบอร์โทร อิสระจากกันไม่เขียนทับใบสมัครเดิม)
	candidate := entity.Candidate{
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Email:      req.Email,
		Phone:      req.Phone,
		ResumeText: req.ResumeText,
	}
	if err := c.db.Create(&candidate).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลผู้สมัครได้"})
		return
	}
	// 3. สร้างข้อมูลใบสมัคร (Application) บันทึกคู่กับ JobPositionID
	appCode := generateRandomAppCode(c.db)
	app := entity.Application{
		ApplicationCode: appCode,
		Status:          "รอพิจารณา",
		Position:        job.Title,
		ResumeText:      req.ResumeText,
		ResumeURL:       req.ResumeURL,
		TranscriptURL:   req.TranscriptURL,
		TranscriptText: req.TranscriptText,
		CandidateID:    candidate.ID,
		JobPositionID:  job.ID,
	}
	if err := c.db.Create(&app).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ส่งใบสมัครไม่สำเร็จ"})
		return
	}

	candidateFullName := candidate.FirstName + " " + candidate.LastName

	// 📧 ส่งอีเมลจริงไปยัง Gmail ของผู้สมัครผ่าน Background Goroutine
	go services.SendApplicationEmail(candidate.Email, candidateFullName, job.Title, app.ApplicationCode)

	// 🔔 แจ้งเตือน HR: มีผู้สมัครใหม่ในระบบ
	go services.CreateNotification(
		c.db,
		"มีผู้สมัครใหม่ในระบบ",
		fmt.Sprintf("คุณ %s ได้สมัครตำแหน่ง %s (รหัสใบสมัคร %s)", candidateFullName, job.Title, app.ApplicationCode),
		"candidate",
		"ผู้สมัครใหม่",
		"/hr/candidates",
		"ดูรายชื่อผู้สมัคร",
		"HR",
		true,
	)

	ctx.JSON(http.StatusOK, gin.H{
		"message":          "ส่งใบสมัครสำเร็จ!",
		"application_id":   app.ID,
		"application_code": app.ApplicationCode,
	})
}

// ── สำหรับ HR ดึงรายชื่อผู้สมัครแยกตามตำแหน่งงาน

func (c *JobPositionController) GetApplications(ctx *gin.Context) {
	id := ctx.Param("id")
	var apps []entity.Application
	// ดึงรายการใบสมัครทั้งหมดของตำแหน่งงานนี้ พร้อมโหลดข้อมูล Candidate และ AIScreening เชื่อมโยงมาด้วย
	err := c.db.Preload("Candidate").Preload("AIScreening").
		Where("job_position_id = ?", id).
		Order("created_at desc").
		Find(&apps).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลผู้สมัครได้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": apps})
}

func (c *JobPositionController) GetJobPositionDocuments(ctx *gin.Context) {
	idStr := ctx.Param("id")
	jobID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ตำแหน่งงานไม่ถูกต้อง"})
		return
	}

	var docs []entity.ApplicationDocument
	if err := c.db.Where("job_position_id = ?", uint(jobID)).Order("created_at desc").Find(&docs).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงเอกสารได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"data": docs})
}

func (c *JobPositionController) UploadDocument(ctx *gin.Context) {
	jobPositionIDStr := ctx.PostForm("job_position_id")
	if jobPositionIDStr == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาเลือกตำแหน่งงานก่อนอัปโหลดเอกสาร"})
		return
	}

	jobPositionID, err := strconv.ParseUint(jobPositionIDStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ตำแหน่งงานไม่ถูกต้อง"})
		return
	}

	if err := os.MkdirAll("./upload/documents", os.ModePerm); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถสร้างโฟลเดอร์สำหรับเอกสารได้"})
		return
	}

	var uploaded []entity.ApplicationDocument
	form, err := ctx.MultipartForm()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		files = form.File["file"]
	}

	if len(files) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด"})
		return
	}

	documentType := strings.TrimSpace(ctx.PostForm("document_type"))
	if documentType == "" {
		documentType = "other"
	}
	description := strings.TrimSpace(ctx.PostForm("description"))

	var userID *uint
	if val, exists := ctx.Get("userID"); exists {
		if uid, ok := val.(uint); ok {
			userID = &uid
		}
	}

	for _, fileHeader := range files {
		f, err := fileHeader.Open()
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเปิดไฟล์ได้"})
			return
		}
		fileBytes, err := io.ReadAll(f)
		f.Close()
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอ่านไฟล์ได้"})
			return
		}

		contentType := fileHeader.Header.Get("Content-Type")
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		switch ext {
		case ".pdf":
			contentType = "application/pdf"
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".png":
			contentType = "image/png"
		case ".webp":
			contentType = "image/webp"
		case ".txt":
			contentType = "text/plain"
		default:
			if contentType == "" || contentType == "application/octet-stream" {
				contentType = http.DetectContentType(fileBytes)
			}
		}

		encoded := base64.StdEncoding.EncodeToString(fileBytes)
		fileURL := fmt.Sprintf("data:%s;base64,%s", contentType, encoded)

		title := strings.TrimSpace(ctx.PostForm("title"))
		if title == "" {
			title = fileHeader.Filename
		}

		doc := entity.ApplicationDocument{
			JobPositionID:    uint(jobPositionID),
			DocumentType:     documentType,
			Title:            title,
			FileName:         fileHeader.Filename,
			FileURL:          fileURL,
			Description:      description,
			UploadedByUserID: userID,
		}
		if err := c.db.Create(&doc).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลเอกสารได้"})
			return
		}
		uploaded = append(uploaded, doc)
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "อัปโหลดเอกสารสำเร็จ",
		"data":    uploaded,
	})
}

func (c *JobPositionController) DeleteDocument(ctx *gin.Context) {
	docID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID เอกสารไม่ถูกต้อง"})
		return
	}

	var doc entity.ApplicationDocument
	if err := c.db.First(&doc, uint(docID)).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบเอกสารนี้"})
		return
	}

	if err := c.db.Delete(&doc).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถลบเอกสารได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบเอกสารสำเร็จ"})
}

// ── บันทึก/อัปเดตผลคัดกรอง AI สำหรับใบสมัครรายคน
func (c *JobPositionController) UpdateApplicationScreening(ctx *gin.Context) {
	idStr := ctx.Param("appId")
	appID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ใบสมัครไม่ถูกต้อง"})
		return
	}

	var req struct {
		Status              string  `json:"status"`
		Score               float64 `json:"score"`
		Strengths           string  `json:"strengths"`
		AnalysisData        string  `json:"analysis_data"`
		ModelUsed           string  `json:"model_used"`
		ResumeText          string  `json:"resume_text"`
		ResumeExtractedJSON string  `json:"resume_extracted_json"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	var app entity.Application
	if err := c.db.First(&app, appID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบสมัครนี้"})
		return
	}

	if req.Status != "" {
		app.Status = req.Status
	}

	if req.ResumeText != "" {
		app.ResumeText = req.ResumeText
	}
	if req.ResumeExtractedJSON != "" {
		app.ResumeExtractedJSON = req.ResumeExtractedJSON
	}

	// 🛠️ อัปเดตข้อมูล Candidate จากข้อมูลพื้นฐานใน AnalysisData หากมี
	if req.AnalysisData != "" && app.CandidateID != 0 {
		var candData struct {
			CandidateBasicInfo struct {
				Name  string `json:"name"`
				Email string `json:"email"`
				Phone string `json:"phone"`
			} `json:"candidate_basic_info"`
		}
		if err := json.Unmarshal([]byte(req.AnalysisData), &candData); err == nil {
			var candidate entity.Candidate
			if err := c.db.First(&candidate, app.CandidateID).Error; err == nil {
				updated := false
				if (candidate.FirstName == "" || candidate.FirstName == "0" || candidate.FirstName == "test" || candidate.FirstName == "test5" || strings.HasPrefix(candidate.FirstName, "ผู้สมัครชื่อ")) && candData.CandidateBasicInfo.Name != "" {
					cleanName := candData.CandidateBasicInfo.Name
					cleanName = strings.TrimPrefix(cleanName, "คุณ ")
					cleanName = strings.TrimPrefix(cleanName, "ผู้สมัครชื่อ ")
					cleanName = strings.TrimPrefix(cleanName, "ชื่อ ")
					if idx := strings.Index(cleanName, " เป็น"); idx != -1 {
						cleanName = cleanName[:idx]
					}
					if idx := strings.Index(cleanName, " โดย"); idx != -1 {
						cleanName = cleanName[:idx]
					}
					cleanName = strings.TrimSpace(cleanName)
					parts := strings.Fields(cleanName)
					if len(parts) > 0 {
						candidate.FirstName = parts[0]
					}
					if len(parts) > 1 {
						candidate.LastName = strings.Join(parts[1:], " ")
					}
					updated = true
				}
				if (candidate.Phone == "" || candidate.Phone == "0" || candidate.Phone == "test") && candData.CandidateBasicInfo.Phone != "" {
					candidate.Phone = candData.CandidateBasicInfo.Phone
					updated = true
				}
				if updated {
					c.db.Save(&candidate)
				}
			}
		}
	}

	// ถ้าเป็นการบันทึกเฉพาะข้อความ OCR (ยังไม่ได้วิเคราะห์ AI) ให้บันทึกเฉพาะ ResumeText และออกได้เลย
	if strings.TrimSpace(req.Strengths) == "" && strings.TrimSpace(req.AnalysisData) == "" && req.Score == 0 {
		c.db.Save(&app)
		ctx.JSON(http.StatusOK, gin.H{"message": "บันทึกข้อความ OCR สำเร็จ", "data": nil})
		return
	}

	// 1. ถ้ามีประวัติการประเมินอยู่แล้ว ให้อัปเดตของเดิม
	if app.ScreeningID != nil {
		var scr entity.AIScreening
		if err := c.db.First(&scr, *app.ScreeningID).Error; err == nil {
			scr.SkillScore = req.Score
			scr.Strengths = req.Strengths
			if req.AnalysisData != "" {
				scr.AnalysisData = req.AnalysisData
			}
			scr.ModelUsed = req.ModelUsed
			if err := c.db.Save(&scr).Error; err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตข้อมูลประเมิน AI ได้"})
				return
			}

			app.AIScore = req.Score
			if app.Status == "รอพิจารณา" || app.Status == "pending" || app.Status == "" {
				app.Status = "รอนัดสัมภาษณ์"
			}
			c.db.Save(&app)
			ctx.JSON(http.StatusOK, gin.H{"message": "อัปเดตการประเมิน AI สำเร็จ", "data": scr})
			return
		}
	}

	// 2. ถ้ายังไม่มี ให้สร้าง AIScreening ใหม่และบันทึกเชื่อมโยง
	scr := entity.AIScreening{
		SkillScore:   req.Score,
		Strengths:    req.Strengths,
		AnalysisData: req.AnalysisData,
		ModelUsed:    req.ModelUsed,
	}
	if err := c.db.Create(&scr).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลการประเมิน AI ได้"})
		return
	}

	app.ScreeningID = &scr.ID
	app.AIScore = req.Score
	if app.Status == "รอพิจารณา" || app.Status == "pending" || app.Status == "" {
		app.Status = "รอนัดสัมภาษณ์"
	}
	if err := c.db.Save(&app).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเชื่อมโยงผลประเมิน AI กับใบสมัครได้"})
		return
	}

	// 🔔 แจ้งเตือน HR: AI คัดกรองและประเมินผลสำเร็จ
	var candidateName string
	var cand entity.Candidate
	if err := c.db.First(&cand, app.CandidateID).Error; err == nil {
		candidateName = cand.FirstName + " " + cand.LastName
	}
	go services.CreateNotification(
		c.db,
		"ระบบ Typhoon AI คัดกรอง Resume สำเร็จ",
		fmt.Sprintf("ผู้สมัครคุณ %s ตำแหน่ง %s ได้คะแนน PTS %.1f/100 (รอนัดสัมภาษณ์)", candidateName, app.Position, req.Score),
		"candidate",
		"คัดกรอง AI",
		"/hr/candidates",
		"ดูผลจัดลำดับผู้สมัคร",
		"HR",
		false,
	)

	ctx.JSON(http.StatusOK, gin.H{"message": "วิเคราะห์ผู้สมัครและบันทึกคะแนน AI สำเร็จ", "data": scr})
}

// PATCH /api/applications/:appId/status
func (c *JobPositionController) UpdateApplicationStatus(ctx *gin.Context) {
	idStr := ctx.Param("appId")
	appID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ใบสมัครไม่ถูกต้อง"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาระบุสถานะที่ต้องการเปลี่ยน"})
		return
	}

	var app entity.Application
	if err := c.db.First(&app, appID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบสมัครนี้"})
		return
	}

	app.Status = req.Status
	if err := c.db.Save(&app).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตสถานะใบสมัครได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "อัปเดตสถานะผู้สมัครสำเร็จ", "status": app.Status, "data": app})
}

// DELETE /api/applications/:appId
func (c *JobPositionController) DeleteApplication(ctx *gin.Context) {
	idStr := ctx.Param("appId")
	appID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ใบสมัครไม่ถูกต้อง"})
		return
	}

	var app entity.Application
	if err := c.db.First(&app, appID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบสมัครนี้"})
		return
	}

	if err := c.db.Delete(&app).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ลบใบสมัครไม่สำเร็จ"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบผู้สมัครเรียบร้อยแล้ว"})
}

// GET /api/applications/status/:appCode
func (c *JobPositionController) GetApplicationStatus(ctx *gin.Context) {
	rawAppCode := strings.TrimSpace(ctx.Param("appCode"))
	if len(rawAppCode) < 3 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "รหัสใบสมัครสั้นเกินไป"})
		return
	}

	searchCode := rawAppCode
	if !strings.HasPrefix(strings.ToUpper(searchCode), "APP-") {
		searchCode = "APP-" + searchCode
	}

	var app entity.Application
	// 1. ลองค้นหาตรงๆ จาก application_code (ทั้งแบบมี APP- และไม่มี)
	err := c.db.Preload("Candidate").Preload("JobPosition").
		Where("application_code = ? OR application_code = ?", rawAppCode, searchCode).
		First(&app).Error

	// 2. ถ้าไม่พบ ให้ลอง fallback กับ id ย้อนหลัง
	if err != nil {
		parsedStr := rawAppCode
		if len(rawAppCode) >= 4 && (strings.ToUpper(rawAppCode[:4]) == "APP-") {
			parsedStr = rawAppCode[4:]
		}

		if val, parseErr := strconv.ParseUint(parsedStr, 10, 32); parseErr == nil {
			appID := uint(val)
			if appID > 10000 {
				appID -= 10000
			}
			err = c.db.Preload("Candidate").Preload("JobPosition").First(&app, appID).Error
		}
	}

	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลใบสมัครงานสำหรับรหัสนี้"})
		return
	}

	displayCode := app.ApplicationCode
	if displayCode == "" {
		displayCode = fmt.Sprintf("APP-%d", app.ID+10000)
	}

	maskedLastName := ""
	if len(app.Candidate.LastName) > 0 {
		maskedLastName = string([]rune(app.Candidate.LastName)[0]) + "..."
	}

	dept := ""
	if app.JobPosition.ID != 0 {
		dept = app.JobPosition.Department
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":             app.ID,
			"code":           displayCode,
			"first_name":     app.Candidate.FirstName,
			"last_name":      app.Candidate.LastName,
			"masked_last_name": maskedLastName,
			"phone":          app.Candidate.Phone,
			"email":          app.Candidate.Email,
			"position_title": app.Position,
			"department":     dept,
			"status":         app.Status,
			"created_at":     app.CreatedAt,
			"resume_url":     app.ResumeURL,
			"transcript_url": app.TranscriptURL,
		},
	})
}

// PUT /api/applications/:appId/candidate-info
func (c *JobPositionController) UpdateCandidateApplicationInfo(ctx *gin.Context) {
	idStr := ctx.Param("appId")
	appID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID ใบสมัครไม่ถูกต้อง"})
		return
	}

	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Phone     string `json:"phone"`
		Email     string `json:"email"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	var app entity.Application
	if err := c.db.Preload("Candidate").Preload("JobPosition").First(&app, appID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบสมัครนี้"})
		return
	}

	candUpdates := map[string]interface{}{}
	if strings.TrimSpace(req.FirstName) != "" {
		candUpdates["first_name"] = strings.TrimSpace(req.FirstName)
	}
	if strings.TrimSpace(req.LastName) != "" {
		candUpdates["last_name"] = strings.TrimSpace(req.LastName)
	}
	if strings.TrimSpace(req.Phone) != "" {
		candUpdates["phone"] = strings.TrimSpace(req.Phone)
	}
	if strings.TrimSpace(req.Email) != "" {
		candUpdates["email"] = strings.TrimSpace(req.Email)
	}

	if len(candUpdates) > 0 {
		if err := c.db.Model(&entity.Candidate{}).Where("id = ?", app.CandidateID).Updates(candUpdates).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตข้อมูลผู้สมัครได้"})
			return
		}
	}

	c.db.Preload("Candidate").Preload("JobPosition").First(&app, appID)

	displayCode := app.ApplicationCode
	if displayCode == "" {
		displayCode = fmt.Sprintf("APP-%d", app.ID+10000)
	}

	dept := ""
	if app.JobPosition.ID != 0 {
		dept = app.JobPosition.Department
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "อัปเดตข้อมูลผู้สมัครสำเร็จ",
		"data": gin.H{
			"id":             app.ID,
			"code":           displayCode,
			"first_name":     app.Candidate.FirstName,
			"last_name":      app.Candidate.LastName,
			"phone":          app.Candidate.Phone,
			"email":          app.Candidate.Email,
			"position_title": app.Position,
			"department":     dept,
			"status":         app.Status,
			"created_at":     app.CreatedAt,
			"resume_url":     app.ResumeURL,
			"transcript_url": app.TranscriptURL,
		},
	})
}
