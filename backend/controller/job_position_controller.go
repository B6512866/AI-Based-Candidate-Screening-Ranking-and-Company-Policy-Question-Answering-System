package controller

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/services"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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
		Title       string      `json:"title"`
		Department  string      `json:"department"`
		Location    string      `json:"location"`
		Salary      string      `json:"salary"`
		Type        string      `json:"type"`
		Benefits    string      `json:"benefits"`
		ContactInfo string      `json:"contact_info"`
		Description string      `json:"description"`
		Criteria    interface{} `json:"criteria"` // รับได้ทั้ง string หรือ array เพื่อป้องกัน error unmarshal
		ImageURL    string      `json:"image_url"`
		Status      string      `json:"status"`
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
		status = "เปิดรับสมัคร"
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
		Title:       req.Title,
		Department:  req.Department,
		Location:    req.Location,
		Salary:      req.Salary,
		Type:        req.Type,
		Benefits:    req.Benefits,
		ContactInfo: req.ContactInfo,
		Description: req.Description,
		Criteria:    criteriaList,
		ImageURL:    req.ImageURL,
		Status:      status,
		UserID:      userID,
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

		ImageURL string `json:"image_url"`
		Status   string `json:"status"`
	}

	var req UpdateJobRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error":   "ข้อมูลไม่ถูกต้อง",
			"details": err.Error(),
		})
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

	if req.Status != "" {
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
		ResumeURL      string `json:"resume_url"`
		TranscriptURL  string `json:"transcript_url"`
		TranscriptText string `json:"transcript_text"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณากรอกข้อมูลและอัปโหลดเอกสารให้ครบถ้วน"})
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
	} else {
		// ถ้าพบ Candidate เดิม ให้อัปเดตชื่อ นามสกุล และ เบอร์โทร หากค่าเดิมเป็น "0" หรือว่างเปล่า หรือมีข้อมูลใหม่มา
		updated := false
		if req.FirstName != "" && req.FirstName != "0" {
			candidate.FirstName = req.FirstName
			updated = true
		}
		if req.LastName != "" && req.LastName != "0" {
			candidate.LastName = req.LastName
			updated = true
		}
		if req.Phone != "" && req.Phone != "0" {
			candidate.Phone = req.Phone
			updated = true
		}
		if updated {
			c.db.Save(&candidate)
		}
	}
	// 3. สร้างข้อมูลใบสมัคร (Application) บันทึกคู่กับ JobPositionID
	app := entity.Application{
		Status:         "รอพิจารณา",
		Position:       job.Title,
		ResumeText:     req.ResumeText,
		ResumeURL:      req.ResumeURL,
		TranscriptURL:  req.TranscriptURL,
		TranscriptText: req.TranscriptText,
		CandidateID:    candidate.ID,
		JobPositionID:  job.ID,
	}
	if err := c.db.Create(&app).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ส่งใบสมัครไม่สำเร็จ"})
		return
	}

	// สร้างรหัสประจำตัวใบสมัคร
	applicationCode := "APP-" + strconv.FormatUint(uint64(app.ID+10000), 10)
	candidateFullName := candidate.FirstName + " " + candidate.LastName

	// 📧 ส่งอีเมลจริงไปยัง Gmail ของผู้สมัครผ่าน Background Goroutine
	go services.SendApplicationEmail(candidate.Email, candidateFullName, job.Title, applicationCode)

	ctx.JSON(http.StatusOK, gin.H{
		"message":          "ส่งใบสมัครสำเร็จ!",
		"application_id":   app.ID,
		"application_code": applicationCode,
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
		filePath := filepath.Join("./upload/documents", fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(fileHeader.Filename)))
		if err := ctx.SaveUploadedFile(fileHeader, filePath); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกไฟล์ได้"})
			return
		}

		title := strings.TrimSpace(ctx.PostForm("title"))
		if title == "" {
			title = fileHeader.Filename
		}

		doc := entity.ApplicationDocument{
			JobPositionID:    uint(jobPositionID),
			DocumentType:     documentType,
			Title:            title,
			FileName:         fileHeader.Filename,
			FileURL:          fmt.Sprintf("/api/upload/documents/%s", filepath.Base(filePath)),
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

	if doc.FileURL != "" {
		fileName := strings.TrimPrefix(doc.FileURL, "/api/upload/documents/")
		if fileName != "" {
			_ = os.Remove(filepath.Join("./upload/documents", fileName))
		}
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
	if err := c.db.Save(&app).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเชื่อมโยงผลประเมิน AI กับใบสมัครได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "วิเคราะห์ผู้สมัครและบันทึกคะแนน AI สำเร็จ", "data": scr})
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
	appCode := ctx.Param("appCode")
	if len(appCode) < 5 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "รหัสใบสมัครสั้นเกินไป"})
		return
	}

	// ลบ prefix APP- (ถ้ามี)
	parsedStr := appCode
	if (len(appCode) >= 4) && (appCode[:4] == "APP-" || appCode[:4] == "app-") {
		parsedStr = appCode[4:]
	}

	val, err := strconv.ParseUint(parsedStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "รหัสใบสมัครไม่ถูกต้อง"})
		return
	}

	var appID uint = uint(val)
	if appID > 10000 {
		appID -= 10000
	}

	var app entity.Application
	// โหลดความสัมพันธ์ของ Candidate และ JobPosition
	err = c.db.Preload("Candidate").Preload("JobPosition").First(&app, appID).Error
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลใบสมัครงานสำหรับรหัสนี้"})
		return
	}

	// ปิดบังนามสกุลบางส่วนเพื่อความเป็นส่วนตัวในการค้นหาแบบสาธารณะ
	maskedLastName := ""
	if len(app.Candidate.LastName) > 0 {
		maskedLastName = string([]rune(app.Candidate.LastName)[0]) + "..."
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":             app.ID,
			"code":           "APP-" + strconv.FormatUint(uint64(app.ID+10000), 10),
			"first_name":     app.Candidate.FirstName,
			"last_name":      maskedLastName,
			"position_title": app.Position,
			"status":         app.Status,
			"created_at":     app.CreatedAt,
		},
	})
}
