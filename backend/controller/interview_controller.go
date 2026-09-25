package controller

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
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

	// ดึงเฉพาะ interview ล่าสุดของแต่ละ application_id
	subQuery := c.db.Model(&entity.Interview{}).
		Select("MAX(id)").
		Group("application_id")

	if err := c.db.
		Preload("Application.Candidate").
		Preload("Application.JobPosition").
		Preload("Application.AIScreening").
		Preload("CreatedBy").
		Where("id IN (?)", subQuery).
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
		Preload("Application.AIScreening").
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
		ApplicationID     uint   `json:"application_id" binding:"required"`
		InterviewDate     string `json:"interview_date" binding:"required"`
		InterviewTime     string `json:"interview_time" binding:"required"`
		Format            string `json:"format" binding:"required"`
		FormatDescription string `json:"format_description"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}

	var app entity.Application
	if err := c.db.Preload("Candidate").First(&app, req.ApplicationID).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบสมัครนี้"})
		return
	}

	// Parse วัน + เวลารวมกันใน Timezone Asia/Bangkok (UTC+7)
	loc, locErr := time.LoadLocation("Asia/Bangkok")
	if locErr != nil {
		loc = time.FixedZone("Asia/Bangkok", 7*3600)
	}
	datetimeStr := fmt.Sprintf("%s %s", req.InterviewDate, req.InterviewTime)
	interviewDatetime, err := time.ParseInLocation("2006-01-02 15:04", datetimeStr, loc)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "รูปแบบวันที่/เวลาไม่ถูกต้อง"})
		return
	}

	userID, exists := ctx.Get("userID")
	var createdByID uint
	if exists {
		createdByID = userID.(uint)
	}

	// สร้าง response token สำหรับปุ่มตอบกลับในอีเมล
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	responseToken := hex.EncodeToString(tokenBytes)

	// หากมี interview เดิมของ application นี้อยู่แล้ว ให้อัปเดตข้อมูลเดิม แทนที่จะสร้างแถวใหม่ซ้ำซ้อน
	var existingInterview entity.Interview
	if err := c.db.Where("application_id = ?", req.ApplicationID).First(&existingInterview).Error; err == nil {
		existingInterview.InterviewDatetime = interviewDatetime
		existingInterview.DurationMinutes = 60
		existingInterview.Format = req.Format
		existingInterview.FormatDescription = req.FormatDescription
		existingInterview.Interview_Status = "pending"
		existingInterview.ResponseToken = responseToken
		existingInterview.CreatedByID = createdByID
		if err := c.db.Save(&existingInterview).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "อัปเดตนัดสัมภาษณ์ไม่สำเร็จ"})
			return
		}
		c.db.Model(&app).Update("status", "interview")
		c.db.Preload("Application.Candidate").Preload("Application.JobPosition").Preload("CreatedBy").First(&existingInterview, existingInterview.ID)
		
		candName := fmt.Sprintf("%s %s", app.Candidate.FirstName, app.Candidate.LastName)
		go services.CreateNotification(
			c.db,
			"อัปเดตวันเวลานัดสัมภาษณ์",
			fmt.Sprintf("นัดสัมภาษณ์คุณ %s ตำแหน่ง %s กำหนดเวลาใหม่เป็น %s", candName, app.Position, datetimeStr),
			"interview",
			"นัดสัมภาษณ์",
			"/hr/interviews",
			"ดูตารางสัมภาษณ์",
			"HR",
			false,
		)

		ctx.JSON(http.StatusOK, gin.H{
			"message": "อัปเดตนัดสัมภาษณ์สำเร็จ",
			"data":    existingInterview,
		})
		return
	}

	interview := entity.Interview{
		ApplicationID:     req.ApplicationID,
		InterviewDatetime: interviewDatetime,
		DurationMinutes:   60,
		Format:            req.Format,
		FormatDescription: req.FormatDescription,
		Interview_Status:  "pending",
		ResponseToken:     responseToken,
		CreatedByID:       createdByID,
	}

	if err := c.db.Create(&interview).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างนัดสัมภาษณ์ไม่สำเร็จ"})
		return
	}

	c.db.Model(&app).Update("status", "interview")
	c.db.Preload("Application.Candidate").Preload("Application.JobPosition").Preload("CreatedBy").First(&interview, interview.ID)

	candName := fmt.Sprintf("%s %s", app.Candidate.FirstName, app.Candidate.LastName)
	go services.CreateNotification(
		c.db,
		"สร้างนัดหมายสัมภาษณ์ใหม่",
		fmt.Sprintf("นัดสัมภาษณ์คุณ %s ตำแหน่ง %s ในวันที่ %s", candName, app.Position, datetimeStr),
		"interview",
		"นัดสัมภาษณ์",
		"/hr/interviews",
		"ดูตารางสัมภาษณ์",
		"HR",
		false,
	)

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "สร้างนัดสัมภาษณ์สำเร็จ",
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

	if req.InterviewDate != "" && req.InterviewTime != "" {
		loc, locErr := time.LoadLocation("Asia/Bangkok")
		if locErr != nil {
			loc = time.FixedZone("Asia/Bangkok", 7*3600)
		}
		datetimeStr := fmt.Sprintf("%s %s", req.InterviewDate, req.InterviewTime)
		interviewDatetime, err := time.ParseInLocation("2006-01-02 15:04", datetimeStr, loc)
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

	// ลบ interview ทั้งหมดของ application นี้ เพื่อป้องกัน duplicate rows ค้างในระบบ
	if err := c.db.Where("application_id = ?", interview.ApplicationID).Delete(&entity.Interview{}).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ลบนัดสัมภาษณ์ไม่สำเร็จ"})
		return
	}

	// อัปเดตสถานะของ Application กลับเป็น รอนัดสัมภาษณ์
	c.db.Model(&entity.Application{}).Where("id = ?", interview.ApplicationID).Update("status", "รอนัดสัมภาษณ์")

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบนัดสัมภาษณ์สำเร็จ"})
}

// GET /api/interviews/candidates
func (c *InterviewController) GetCandidatesForInterview(ctx *gin.Context) {
	var applications []entity.Application
	if err := c.db.
		Preload("Candidate").
		Preload("JobPosition.Criteria.SubCriteria").
		Preload("AIScreening").
		Preload("Documents").
		Order("created_at desc").
		Find(&applications).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลผู้สมัครได้"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"data": applications})
}

// POST /api/interviews/:id/send-email
func (c *InterviewController) SendEmail(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	var interview entity.Interview
	if err := c.db.
		Preload("Application.Candidate").
		Preload("Application.JobPosition").
		First(&interview, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบนัดสัมภาษณ์นี้"})
		return
	}

	var req struct {
		EmailContent string `json:"email_content"`
	}
	ctx.ShouldBindJSON(&req)

	candidateEmail := interview.Application.Candidate.Email
	if candidateEmail == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ผู้สมัครไม่มีอีเมล"})
		return
	}

	jobTitle := interview.Application.JobPosition.Title
	if jobTitle == "" {
		jobTitle = interview.Application.Position
	}

	backendBaseURL := strings.TrimRight(config.Env.BackendURL, "/")
	if backendBaseURL == "" {
		backendBaseURL = fmt.Sprintf("http://localhost:%s", config.Env.BackendPort)
	}

	// สร้าง ResponseToken ถ้ายังไม่มี
	if interview.ResponseToken == "" {
		tokenBytes := make([]byte, 32)
		rand.Read(tokenBytes)
		interview.ResponseToken = hex.EncodeToString(tokenBytes)
		c.db.Model(&interview).Update("response_token", interview.ResponseToken)
	}

	var err error
	if req.EmailContent != "" {
		err = services.SendCustomInterviewEmailWithButtons(candidateEmail, jobTitle, req.EmailContent, interview.ResponseToken, backendBaseURL, interview.ID)
	} else {
		candName := fmt.Sprintf("%s %s", interview.Application.Candidate.FirstName, interview.Application.Candidate.LastName)
		loc, _ := time.LoadLocation("Asia/Bangkok")
		if loc == nil {
			loc = time.FixedZone("Asia/Bangkok", 7*3600)
		}
		dateStr := interview.InterviewDatetime.In(loc).Format("02/01/2006 เวลา 15:04 น.")
		locStr := interview.Format
		if interview.FormatDescription != "" {
			locStr += " (" + interview.FormatDescription + ")"
		}
		appCode := fmt.Sprintf("APP-%d", 10000+interview.ApplicationID)
		err = services.SendInterviewEmailWithButtons(candidateEmail, candName, appCode, jobTitle, dateStr, locStr, interview.FormatDescription, interview.ResponseToken, backendBaseURL, interview.ID)
	}

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ส่งอีเมลไม่สำเร็จ: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ส่งอีเมลเชิญสัมภาษณ์สำเร็จ"})
}

// GET /api/interviews/respond?id=xxx&action=confirm|reschedule|reject&token=xxx&confirmed=true
func (c *InterviewController) Respond(ctx *gin.Context) {
	interviewID, _ := strconv.Atoi(ctx.Query("id"))
	action := ctx.Query("action")
	token := ctx.Query("token")
	confirmed := ctx.Query("confirmed") == "true"

	if interviewID == 0 || action == "" || token == "" {
		ctx.Data(http.StatusBadRequest, "text/html; charset=utf-8", []byte(renderResponsePage("error", "ลิงก์ไม่ถูกต้อง", "กรุณาตรวจสอบลิงก์อีกครั้ง")))
		return
	}

	var interview entity.Interview
	if err := c.db.
		Preload("Application.Candidate").
		Preload("Application.JobPosition").
		First(&interview, interviewID).Error; err != nil {
		ctx.Data(http.StatusNotFound, "text/html; charset=utf-8", []byte(renderResponsePage("error", "ไม่พบนัดสัมภาษณ์", "ไม่พบข้อมูลนัดสัมภาษณ์ที่ระบุ")))
		return
	}

	if interview.ResponseToken != token {
		ctx.Data(http.StatusForbidden, "text/html; charset=utf-8", []byte(renderResponsePage("error", "Token ไม่ถูกต้อง", "ลิงก์นี้ไม่ถูกต้องหรือหมดอายุ")))
		return
	}

	candName := fmt.Sprintf("%s %s", interview.Application.Candidate.FirstName, interview.Application.Candidate.LastName)
	appCode := fmt.Sprintf("APP-%d", 10000+interview.ApplicationID)
	jobTitle := interview.Application.JobPosition.Title
	if jobTitle == "" {
		jobTitle = interview.Application.Position
	}

	loc, _ := time.LoadLocation("Asia/Bangkok")
	if loc == nil {
		loc = time.FixedZone("Asia/Bangkok", 7*3600)
	}
	t := interview.InterviewDatetime.In(loc)
	thaiMonths := []string{"", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."}
	thaiYear := t.Year() + 543
	dateStr := fmt.Sprintf("%d %s %d เวลา %02d:%02d น.", t.Day(), thaiMonths[t.Month()], thaiYear, t.Hour(), t.Minute())

	formatLabel := interview.Format
	switch interview.Format {
	case "online":
		formatLabel = "Video Call (Google Meet)"
	case "onsite":
		formatLabel = "On-site (สัมภาษณ์ที่บริษัท)"
	case "phone":
		formatLabel = "Phone Interview (โทรศัพท์)"
	}

	// ── STEP 1: ถ้ายังไม่ได้กด confirm ให้ขึ้นหน้ายืนยันความชัวร์ (สะอาดตา) ──
	if !confirmed {
		ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(renderConfirmationPromptPage(interview.ID, action, token, candName, appCode, jobTitle, dateStr, formatLabel, interview.FormatDescription, interview.Interview_Status)))
		return
	}

	// ── STEP 2: ผู้สมัครกดยืนยันแล้ว -> บันทึกลงฐานข้อมูล ──
	var newStatus, title, message string
	switch action {
	case "confirm":
		newStatus = "confirmed"
		title = "ยืนยันการสัมภาษณ์เรียบร้อย"
		message = "ระบบได้บันทึกการยืนยันเข้าร่วมสัมภาษณ์ของคุณแล้ว ขอให้เตรียมตัวให้พร้อมสำหรับการสัมภาษณ์งาน"
	case "reschedule":
		newStatus = "rescheduled"
		title = "แจ้งขอเลื่อนนัดสัมภาษณ์เรียบร้อย"
		message = "ระบบได้บันทึกคำขอเลื่อนนัดสัมภาษณ์ของคุณแล้ว ฝ่ายทรัพยากรบุคคลจะติดต่อกลับเพื่อประสานวันและเวลาใหม่"
	case "reject":
		newStatus = "cancelled"
		title = "แจ้งปฏิเสธการสัมภาษณ์เรียบร้อย"
		message = "ระบบได้บันทึกการปฏิเสธการสัมภาษณ์ของคุณแล้ว ขอบคุณที่แจ้งให้ทราบและขอให้โชคดีในการก้าวหน้าทางอาชีพ"
	default:
		ctx.Data(http.StatusBadRequest, "text/html; charset=utf-8", []byte(renderResponsePage("error", "Action ไม่ถูกต้อง", "กรุณาตรวจสอบลิงก์อีกครั้ง")))
		return
	}

	if err := c.db.Model(&entity.Interview{}).Where("id = ?", interview.ID).Update("interview_status", newStatus).Error; err != nil {
		fmt.Printf("[Interview Respond Error] Failed to update status: %v\n", err)
		ctx.Data(http.StatusInternalServerError, "text/html; charset=utf-8", []byte(renderResponsePage("error", "เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง")))
		return
	}
	fmt.Printf("[Interview Respond Success] Interview ID %d status changed to %s by candidate\n", interview.ID, newStatus)

	// 🔔 แจ้งเตือน HR เมื่อผู้สมัครตอบกลับการสัมภาษณ์
	var notifTitle, notifMsg, notifCatLabel string
	var isPrio bool
	switch action {
	case "confirm":
		notifTitle = "ผู้สมัครยืนยันการสัมภาษณ์แล้ว 🎉"
		notifMsg = fmt.Sprintf("คุณ %s ยืนยันเข้าร่วมสัมภาษณ์ตำแหน่ง %s วันที่ %s (%s)", candName, jobTitle, dateStr, formatLabel)
		notifCatLabel = "ยืนยันสัมภาษณ์"
		isPrio = true
	case "reschedule":
		notifTitle = "ผู้สมัครขอเลื่อนเวลานัดสัมภาษณ์ ⚠️"
		notifMsg = fmt.Sprintf("คุณ %s แจ้งขอเลื่อนนัดสัมภาษณ์ตำแหน่ง %s (นัดเดิม: %s) โปรดประสานวันเวลาใหม่", candName, jobTitle, dateStr)
		notifCatLabel = "ขอเลื่อนนัด"
		isPrio = true
	case "reject":
		notifTitle = "ผู้สมัครปฏิเสธการสัมภาษณ์"
		notifMsg = fmt.Sprintf("คุณ %s แจ้งปฏิเสธการเข้าร่วมสัมภาษณ์ตำแหน่ง %s", candName, jobTitle)
		notifCatLabel = "ยกเลิกสัมภาษณ์"
		isPrio = false
	}
	go services.CreateNotification(
		c.db,
		notifTitle,
		notifMsg,
		"interview",
		notifCatLabel,
		"/hr/interviews",
		"ดูตารางสัมภาษณ์",
		"HR",
		isPrio,
	)

	ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(renderSuccessResponsePage("success", title, message, appCode, candName)))
}

// renderConfirmationPromptPage หน้าสำหรับให้ผู้สมัครกด Confirm อีกรอบเพื่อความชัวร์ (ดีไซน์สะอาดตา สบายตา)
func renderConfirmationPromptPage(interviewID uint, action, token, candName, appCode, jobTitle, dateStr, formatLabel, formatDesc, currentStatus string) string {
	var badgeClass, badgeText, title, actionDesc, btnClass, btnText string
	switch action {
	case "confirm":
		badgeClass = "badge-confirm"
		badgeText = "ยืนยันเข้าร่วมสัมภาษณ์"
		title = "ยืนยันการเข้าร่วมสัมภาษณ์"
		actionDesc = "คุณกำลังจะกดยืนยันเข้ารับการสัมภาษณ์งานตามวัน เวลา และรูปแบบที่ระบุไว้"
		btnClass = "btn-confirm"
		btnText = "กดยืนยันการเข้าร่วมสัมภาษณ์"
	case "reschedule":
		badgeClass = "badge-reschedule"
		badgeText = "ขอเลื่อนนัดสัมภาษณ์"
		title = "แจ้งขอเลื่อนนัดสัมภาษณ์"
		actionDesc = "คุณต้องการแจ้งขอเลื่อนวันเวลานัดสัมภาษณ์ ฝ่าย HR จะติดต่อกลับเพื่อประสานงานใหม่"
		btnClass = "btn-reschedule"
		btnText = "กดยืนยันขอเลื่อนนัด"
	case "reject":
		badgeClass = "badge-reject"
		badgeText = "ปฏิเสธการสัมภาษณ์"
		title = "แจ้งปฏิเสธการสัมภาษณ์"
		actionDesc = "คุณต้องการแจ้งปฏิเสธการเข้าร่วมสัมภาษณ์งานสำหรับตำแหน่งนี้"
		btnClass = "btn-reject"
		btnText = "กดยืนยันปฏิเสธการสัมภาษณ์"
	default:
		badgeClass = "badge-default"
		badgeText = "ตรวจสอบข้อมูล"
		title = "ยืนยันคำตอบนัดสัมภาษณ์"
		actionDesc = "กรุณาตรวจสอบข้อมูลและกดยืนยันการทำรายการ"
		btnClass = "btn-default"
		btnText = "กดยืนยันข้อมูล"
	}

	backendBaseURL := strings.TrimRight(config.Env.BackendURL, "/")
	if backendBaseURL == "" {
		backendBaseURL = fmt.Sprintf("http://localhost:%s", config.Env.BackendPort)
	}
	confirmURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=%s&token=%s&confirmed=true", backendBaseURL, interviewID, action, token)

	statusNoticeHtml := ""
	if currentStatus == "confirmed" {
		statusNoticeHtml = `<div style="background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:10px 14px; border-radius:12px; margin-bottom:16px; font-size:12px; font-weight:600; text-align:center;">นัดสัมภาษณ์นี้ได้รับการยืนยันไว้แล้วเรียบร้อย</div>`
	} else if currentStatus == "rescheduled" {
		statusNoticeHtml = `<div style="background:#fffbeb; border:1px solid #fde68a; color:#92400e; padding:10px 14px; border-radius:12px; margin-bottom:16px; font-size:12px; font-weight:600; text-align:center;">นัดสัมภาษณ์นี้ได้เคยแจ้งขอเลื่อนนัดไว้แล้ว</div>`
	} else if currentStatus == "cancelled" {
		statusNoticeHtml = `<div style="background:#fff1f2; border:1px solid #fecdd3; color:#9f1239; padding:10px 14px; border-radius:12px; margin-bottom:16px; font-size:12px; font-weight:600; text-align:center;">นัดสัมภาษณ์นี้ได้เคยแจ้งปฏิเสธไว้แล้ว</div>`
	}

	formatDetailHtml := ""
	if formatDesc != "" {
		displayDesc := formatDesc
		var jsonMap map[string]string
		trimmed := strings.TrimSpace(formatDesc)
		if strings.HasPrefix(trimmed, "{") && json.Unmarshal([]byte(trimmed), &jsonMap) == nil {
			var parts []string
			if link, ok := jsonMap["link"]; ok && link != "" {
				parts = append(parts, fmt.Sprintf("<a href='%s' target='_blank' style='color:#4169E1; word-break:break-all;'>%s</a>", link, link))
			}
			if venue, ok := jsonMap["venue"]; ok && venue != "" {
				parts = append(parts, venue)
			}
			if addr, ok := jsonMap["address"]; ok && addr != "" {
				parts = append(parts, fmt.Sprintf("ที่อยู่: %s", addr))
			}
			if mId, ok := jsonMap["meetingId"]; ok && mId != "" {
				parts = append(parts, fmt.Sprintf("Meeting ID: %s", mId))
			}
			if pass, ok := jsonMap["passcode"]; ok && pass != "" {
				parts = append(parts, fmt.Sprintf("Passcode: %s", pass))
			}
			if len(parts) > 0 {
				displayDesc = strings.Join(parts, "<br/>")
			}
		}
		formatDetailHtml = fmt.Sprintf(`<div class="info-row"><span class="info-label">ข้อมูลติดต่อกลับ/สถานที่</span><span class="info-val">%s</span></div>`, displayDesc)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireAI - ยืนยันคำตอบนัดสัมภาษณ์</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html {
            min-height: 100%%;
            -webkit-text-size-adjust: 100%%;
            scroll-behavior: smooth;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            padding: 20px 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            color: #1e293b;
        }
        .card {
            background: #ffffff;
            border-radius: clamp(14px, 2.5vw, 20px);
            box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04);
            max-width: 520px;
            width: 100%%;
            border: 1px solid #e2e8f0;
            margin: auto 0;
            flex-shrink: 0;
            overflow: hidden;
            box-sizing: border-box;
            animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header {
            padding: clamp(18px, 4vw, 28px) clamp(16px, 4vw, 28px) clamp(12px, 3vw, 18px) clamp(16px, 4vw, 28px);
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
        }
        .brand {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin-bottom: 10px;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .badge-confirm { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .badge-reschedule { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .badge-reject { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
        .badge-default { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .header h1 {
            font-size: clamp(16px, 3.5vw, 19px);
            font-weight: 800;
            color: #0f172a;
            line-height: 1.4;
        }
        .content {
            padding: clamp(16px, 4vw, 24px) clamp(14px, 4vw, 28px) clamp(18px, 4vw, 24px) clamp(14px, 4vw, 28px);
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: clamp(12px, 3vw, 16px);
            margin-bottom: 14px;
            display: flex;
            flex-direction: column;
            gap: 9px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 13px;
            gap: 12px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #e2e8f0;
        }
        .info-row:last-child {
            padding-bottom: 0;
            border-bottom: none;
        }
        .info-label {
            color: #64748b;
            font-weight: 500;
            flex-shrink: 0;
            font-size: 12px;
            margin-top: 1px;
        }
        .info-val {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
            flex: 1;
        }
        .code-tag {
            background: #eff6ff;
            color: #2563eb;
            padding: 2px 7px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            font-weight: 700;
            border: 1px solid #dbeafe;
        }
        .prompt-text {
            font-size: 12.5px;
            color: #475569;
            line-height: 1.55;
            margin-bottom: 16px;
            text-align: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 14px;
            border-radius: 12px;
        }
        .btn-action {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%%;
            padding: 13px 20px;
            border-radius: 12px;
            font-size: clamp(13.5px, 2.8vw, 15px);
            font-weight: 700;
            text-align: center;
            text-decoration: none;
            color: #ffffff !important;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .btn-action:hover { opacity: 0.92; transform: translateY(-1px); }
        .btn-confirm { background: #059669; }
        .btn-reschedule { background: #d97706; }
        .btn-reject { background: #e11d48; }
        .btn-default { background: #2563eb; }
        .cancel-hint {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            text-align: center;
            font-size: 11.5px;
            color: #94a3b8;
            margin-top: 12px;
            line-height: 1.5;
        }
        .cancel-hint svg {
            flex-shrink: 0;
            color: #94a3b8;
        }
        .footer {
            padding: 12px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            background: #fafafa;
        }
        @media (max-width: 480px) {
            body { padding: 12px 10px; }
            .content { padding: 12px 10px; }
            .header { padding: 14px 10px 10px 10px; }
            .brand { margin-bottom: 6px; font-size: 10.5px; }
            .badge { padding: 4px 12px; margin-bottom: 8px; font-size: 11.5px; }
            .header h1 { font-size: 16px; }
            .info-box { padding: 8px 10px; gap: 6px; margin-bottom: 10px; border-radius: 10px; }
            .info-row { font-size: 12px; gap: 6px; padding-bottom: 6px; }
            .prompt-text { font-size: 11.5px; padding: 7px 10px; margin-bottom: 10px; border-radius: 10px; }
            .btn-action { padding: 11px 14px; font-size: 13.5px; border-radius: 10px; }
            .cancel-hint { font-size: 11px; gap: 5px; margin-top: 8px; }
            .footer { padding: 10px; font-size: 10.5px; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="brand">HireAI Recruitment Platform</div>
            <div class="badge %s">%s</div>
            <h1>%s</h1>
        </div>
        <div class="content">
            %s
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">รหัสใบสมัคร</span>
                    <span class="info-val"><span class="code-tag">%s</span></span>
                </div>
                <div class="info-row">
                    <span class="info-label">ผู้สมัคร</span>
                    <span class="info-val">%s</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ตำแหน่ง</span>
                    <span class="info-val">%s</span>
                </div>
                <div class="info-row">
                    <span class="info-label">วันและเวลา</span>
                    <span class="info-val" style="color: #059669; font-weight: 700;">%s</span>
                </div>
                <div class="info-row">
                    <span class="info-label">รูปแบบสัมภาษณ์</span>
                    <span class="info-val">%s</span>
                </div>
                %s
            </div>

            <div class="prompt-text">
                %s<br/>
            </div>

            <a href="%s" class="btn-action %s">%s</a>

            <p class="cancel-hint">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>หากเปิดหน้านี้โดยไม่ตั้งใจ สามารถปิดหน้าต่างนี้ได้ทันที</span>
            </p>
        </div>
        <div class="footer">
            HireAI Recruitment Platform &copy; All Rights Reserved
        </div>
    </div>
</body>
</html>`,
		badgeClass,
		badgeText,
		title,
		statusNoticeHtml,
		appCode,
		candName,
		jobTitle,
		dateStr,
		formatLabel,
		formatDetailHtml,
		actionDesc,
		confirmURL,
		btnClass,
		btnText,
	)
}

// renderSuccessResponsePage แสดงผลลัพธ์หลังกดยืนยันแล้ว (ดีไซน์สะอาดตา สบายตา)
func renderSuccessResponsePage(status, title, message, appCode, candName string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireAI - บันทึกข้อมูลสำเร็จ</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html {
            min-height: 100%%;
            -webkit-text-size-adjust: 100%%;
            scroll-behavior: smooth;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            color: #1e293b;
        }
        .card {
            background: #ffffff;
            border-radius: clamp(14px, 2.5vw, 20px);
            box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04);
            max-width: 480px;
            width: 100%%;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            margin: auto 0;
            flex-shrink: 0;
            box-sizing: border-box;
            animation: fadeIn 0.25s ease;
            text-align: center;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .content {
            padding: clamp(28px, 5vw, 40px) clamp(16px, 4vw, 28px) clamp(24px, 4vw, 32px) clamp(16px, 4vw, 28px);
        }
        h1 {
            font-size: clamp(17px, 3.8vw, 20px);
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 10px;
        }
        .message {
            font-size: 13px;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .pill {
            display: inline-block;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 12px;
            color: #475569;
            margin-bottom: 20px;
            max-width: 100%%;
            word-break: break-word;
        }
        .pill b {
            color: #0f172a;
        }
        .btn-close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%%;
            padding: 13px 20px;
            border-radius: 12px;
            background: #0f172a;
            color: #ffffff !important;
            font-size: 14px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
        }
        .btn-close:hover {
            background: #1e293b;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
        }
        .stay-hint {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 12px;
        }
        .footer {
            padding: 12px;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            background: #fafafa;
        }
        @media (max-width: 480px) {
            body { padding: 14px 10px; }
            .card { border-radius: 16px; }
            .content { padding: 22px 16px 18px 16px; }
            .message { font-size: 12.5px; margin-bottom: 14px; }
            .pill { padding: 7px 12px; font-size: 11.5px; margin-bottom: 16px; }
            .btn-close { padding: 12px 16px; font-size: 13.5px; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="content">
            <h1>%s</h1>
            <p class="message">%s</p>
            <div class="pill">
                ผู้สมัคร: <b>%s</b> &bull; รหัส: <b style="font-family: monospace; color: #2563eb;">%s</b>
            </div>
            <button class="btn-close" onclick="window.close()">ปิดหน้าต่างนี้</button>
        </div>
        <div class="footer">
            HireAI Recruitment Platform &copy; All Rights Reserved
        </div>
    </div>
</body>
</html>`, title, message, candName, appCode)
}

// renderResponsePage สำหรับแสดงหน้าข้อผิดพลาด
func renderResponsePage(status, title, message string) string {
	bgColor := "#ef4444"
	if status == "info" {
		bgColor = "#3b82f6"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireAI - แจ้งเตือน</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html {
            min-height: 100%%;
            -webkit-text-size-adjust: 100%%;
            scroll-behavior: smooth;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            color: #1e293b;
        }
        .card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            max-width: 440px;
            width: 100%%;
            overflow: hidden;
            text-align: center;
            border: 1px solid #e2e8f0;
            margin: auto 0;
            flex-shrink: 0;
            box-sizing: border-box;
        }
        .header {
            background: %s;
            color: white;
            padding: 24px 20px;
        }
        .header h1 { font-size: 17px; font-weight: 700; }
        .content { padding: 24px 20px; color: #475569; font-size: 13px; line-height: 1.6; }
        .footer { padding: 12px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>%s</h1>
        </div>
        <div class="content">
            <p>%s</p>
        </div>
        <div class="footer">HireAI Recruitment Platform</div>
    </div>
</body>
</html>`, bgColor, title, message)
}

// ══════════════════════════════════════════════════════════════════
// ██  ระบบแจ้งผลสัมภาษณ์ (Interview Result Notification)
// ══════════════════════════════════════════════════════════════════

// POST /api/interviews/:id/notify-result
func (c *InterviewController) NotifyResult(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	var interview entity.Interview
	if err := c.db.
		Preload("Application.Candidate").
		Preload("Application.JobPosition").
		First(&interview, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบนัดสัมภาษณ์นี้"})
		return
	}

	// ตรวจสอบว่าสถานะสัมภาษณ์อยู่ในสถานะที่พร้อมแจ้งผลได้
	allowedStatuses := map[string]bool{"confirmed": true, "completed": true}
	if !allowedStatuses[interview.Interview_Status] {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "สถานะสัมภาษณ์ยังไม่พร้อมสำหรับการแจ้งผล (ต้องเป็น confirmed หรือ completed)"})
		return
	}

	var req struct {
		Result           string   `json:"result" binding:"required"`
		InterviewerScore *float64 `json:"interviewer_score"`
		ResultNotes      string   `json:"result_notes"`
		EmailContent     string   `json:"email_content"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}

	if req.Result != "passed" && req.Result != "failed" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ผลสัมภาษณ์ต้องเป็น 'passed' หรือ 'failed' เท่านั้น"})
		return
	}

	candidateEmail := interview.Application.Candidate.Email
	if candidateEmail == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ผู้สมัครไม่มีอีเมล"})
		return
	}

	// สร้าง ResultToken
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	resultToken := hex.EncodeToString(tokenBytes)

	// บันทึกผลสัมภาษณ์ลง DB
	now := time.Now()
	updates := map[string]interface{}{
		"interview_result":    req.Result,
		"result_notes":        req.ResultNotes,
		"result_notified_at":  &now,
		"result_acknowledged": false,
		"result_token":        resultToken,
		"interview_status":    "completed",
	}
	if req.InterviewerScore != nil {
		updates["interviewer_score"] = *req.InterviewerScore
	}
	c.db.Model(&entity.Interview{}).Where("id = ?", interview.ID).Updates(updates)

	// อัปเดต application.status ตามผล
	var newAppStatus string
	if req.Result == "passed" {
		newAppStatus = "accepted"
	} else {
		newAppStatus = "rejected"
	}
	c.db.Model(&entity.Application{}).Where("id = ?", interview.ApplicationID).Update("status", newAppStatus)

	// ส่งอีเมลแจ้งผล
	candName := fmt.Sprintf("%s %s", interview.Application.Candidate.FirstName, interview.Application.Candidate.LastName)
	appCode := fmt.Sprintf("APP-%d", 10000+interview.ApplicationID)
	jobTitle := interview.Application.JobPosition.Title
	if jobTitle == "" {
		jobTitle = interview.Application.Position
	}

	backendBaseURL := strings.TrimRight(config.Env.BackendURL, "/")
	if backendBaseURL == "" {
		backendBaseURL = fmt.Sprintf("http://localhost:%s", config.Env.BackendPort)
	}

	err := services.SendInterviewResultEmail(
		candidateEmail, candName, appCode, jobTitle,
		req.Result, req.ResultNotes, req.EmailContent,
		resultToken, backendBaseURL, interview.ID,
	)

	if err != nil {
		fmt.Printf("[Notify Result Error] Failed to send result email: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ส่งอีเมลแจ้งผลไม่สำเร็จ: " + err.Error()})
		return
	}

	fmt.Printf("[Notify Result Success] Interview ID %d result '%s' sent to %s\n", interview.ID, req.Result, candidateEmail)

	resultLabel := "ผ่านการคัดเลือก"
	if req.Result == "failed" {
		resultLabel = "ไม่ผ่านการคัดเลือก"
	}
	go services.CreateNotification(
		c.db,
		"ส่งอีเมลแจ้งผลการสัมภาษณ์แล้ว",
		fmt.Sprintf("แจ้งผลสัมภาษณ์คุณ %s ตำแหน่ง %s (ผล: %s) ทางอีเมลสำเร็จ", candName, jobTitle, resultLabel),
		"interview",
		"แจ้งผลสัมภาษณ์",
		"/hr/interview-results",
		"ดูผลการสัมภาษณ์",
		"HR",
		false,
	)

	ctx.JSON(http.StatusOK, gin.H{
		"message": "ส่งอีเมลแจ้งผลสัมภาษณ์สำเร็จ",
		"result":  req.Result,
	})
}

// PUT /api/interviews/:id/score
func (c *InterviewController) UpdateScore(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	var interview entity.Interview
	if err := c.db.First(&interview, id).Error; err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบนัดสัมภาษณ์นี้"})
		return
	}

	var req struct {
		InterviewerScore *float64 `json:"interviewer_score"`
		ResultNotes      *string  `json:"result_notes"`
		InterviewResult  *string  `json:"interview_result"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.InterviewerScore != nil {
		updates["interviewer_score"] = *req.InterviewerScore
	}
	if req.ResultNotes != nil {
		updates["result_notes"] = *req.ResultNotes
	}
	if req.InterviewResult != nil && (*req.InterviewResult == "passed" || *req.InterviewResult == "failed" || *req.InterviewResult == "") {
		updates["interview_result"] = *req.InterviewResult
	}

	if len(updates) > 0 {
		if err := c.db.Model(&entity.Interview{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกคะแนนได้"})
			return
		}
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "บันทึกคะแนนเรียบร้อย"})
}

// GET /api/interviews/acknowledge-result?id=xxx&token=xxx&confirmed=true
func (c *InterviewController) AcknowledgeResult(ctx *gin.Context) {
	interviewID, _ := strconv.Atoi(ctx.Query("id"))
	token := ctx.Query("token")
	confirmed := ctx.Query("confirmed") == "true"

	if interviewID == 0 || token == "" {
		ctx.Data(http.StatusBadRequest, "text/html; charset=utf-8", []byte(renderResponsePage("error", "ลิงก์ไม่ถูกต้อง", "กรุณาตรวจสอบลิงก์อีกครั้ง")))
		return
	}

	var interview entity.Interview
	if err := c.db.
		Preload("Application.Candidate").
		Preload("Application.JobPosition").
		First(&interview, interviewID).Error; err != nil {
		ctx.Data(http.StatusNotFound, "text/html; charset=utf-8", []byte(renderResponsePage("error", "ไม่พบนัดสัมภาษณ์", "ไม่พบข้อมูลนัดสัมภาษณ์ที่ระบุ")))
		return
	}

	if interview.ResultToken != token {
		ctx.Data(http.StatusForbidden, "text/html; charset=utf-8", []byte(renderResponsePage("error", "Token ไม่ถูกต้อง", "ลิงก์นี้ไม่ถูกต้องหรือหมดอายุ")))
		return
	}

	candName := fmt.Sprintf("%s %s", interview.Application.Candidate.FirstName, interview.Application.Candidate.LastName)
	appCode := fmt.Sprintf("APP-%d", 10000+interview.ApplicationID)
	jobTitle := interview.Application.JobPosition.Title
	if jobTitle == "" {
		jobTitle = interview.Application.Position
	}

	// ── STEP 1: แสดงหน้าผลสัมภาษณ์ + ปุ่มยืนยันรับทราบ ──
	if !confirmed {
		ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(
			renderAcknowledgePromptPage(interview.ID, token, candName, appCode, jobTitle, interview.InterviewResult, interview.ResultNotes, interview.ResultAcknowledged),
		))
		return
	}

	// ── STEP 2: บันทึกการรับทราบผลลง DB ──
	if err := c.db.Model(&entity.Interview{}).Where("id = ?", interview.ID).Update("result_acknowledged", true).Error; err != nil {
		fmt.Printf("[Acknowledge Error] Failed to update acknowledged: %v\n", err)
		ctx.Data(http.StatusInternalServerError, "text/html; charset=utf-8", []byte(renderResponsePage("error", "เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการรับทราบผลได้ กรุณาลองใหม่อีกครั้ง")))
		return
	}

	fmt.Printf("[Acknowledge Success] Interview ID %d acknowledged by candidate %s\n", interview.ID, candName)

	resText := "ผ่านการสัมภาษณ์"
	if interview.InterviewResult == "failed" {
		resText = "ไม่ผ่านการสัมภาษณ์"
	}
	go services.CreateNotification(
		c.db,
		"ผู้สมัครรับทราบผลการสัมภาษณ์แล้ว",
		fmt.Sprintf("คุณ %s ได้กดยืนยันรับทราบผลการสัมภาษณ์ตำแหน่ง %s (ผล: %s)", candName, jobTitle, resText),
		"interview",
		"รับทราบผล",
		"/hr/interview-results",
		"ดูผลการสัมภาษณ์",
		"HR",
		false,
	)

	var title, message string
	if interview.InterviewResult == "passed" {
		title = "ยืนยันรับทราบผลสัมภาษณ์เรียบร้อย"
		message = "ระบบได้บันทึกว่าคุณรับทราบผลว่า \"ผ่านการสัมภาษณ์\" แล้ว ฝ่ายทรัพยากรบุคคลจะติดต่อกลับเพื่อแจ้งรายละเอียดขั้นตอนถัดไป"
	} else {
		title = "ยืนยันรับทราบผลสัมภาษณ์เรียบร้อย"
		message = "ระบบได้บันทึกว่าคุณรับทราบผลการสัมภาษณ์แล้ว ขอบคุณที่ให้ความสนใจและขอให้โชคดีในเส้นทางอาชีพ"
	}

	ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(renderAcknowledgeSuccessPage(title, message, appCode, candName)))
}

// renderAcknowledgePromptPage หน้าแสดงผลสัมภาษณ์ + ปุ่มรับทราบ (Step 1)
func renderAcknowledgePromptPage(interviewID uint, token, candName, appCode, jobTitle, result, resultNotes string, alreadyAcknowledged bool) string {
	backendBaseURL := strings.TrimRight(config.Env.BackendURL, "/")
	if backendBaseURL == "" {
		backendBaseURL = fmt.Sprintf("http://localhost:%s", config.Env.BackendPort)
	}
	confirmURL := fmt.Sprintf("%s/api/interviews/acknowledge-result?id=%d&token=%s&confirmed=true", backendBaseURL, interviewID, token)

	var headerGradient, badgeBg, badgeColor, resultText string
	if result == "passed" {
		headerGradient = "linear-gradient(135deg, #059669, #10b981)"
		badgeBg = "#d1fae5"
		badgeColor = "#065f46"
		resultText = "ผ่านการสัมภาษณ์"
	} else {
		headerGradient = "linear-gradient(135deg, #991b1b, #b91c1c)"
		badgeBg = "#fee2e2"
		badgeColor = "#991b1b"
		resultText = "ไม่ผ่านการสัมภาษณ์"
	}

	// รูปแบบการแสดงชื่อตำแหน่ง
	jobTitleHtml := jobTitle
	if idx := strings.Index(jobTitle, "("); idx > 0 && strings.HasSuffix(jobTitle, ")") {
		thaiPart := strings.TrimSpace(jobTitle[:idx])
		engPart := strings.TrimSpace(jobTitle[idx:])
		jobTitleHtml = fmt.Sprintf(`<div>%s</div><div style="font-size: 12px; font-weight: 500; color: #64748b; margin-top: 2px;">%s</div>`, thaiPart, engPart)
	}

	acknowledgedNotice := ""
	if alreadyAcknowledged {
		acknowledgedNotice = `<div style="background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:10px 14px; border-radius:12px; margin-bottom:16px; font-size:12px; font-weight:600; text-align:center;">คุณได้ยืนยันรับทราบผลนี้แล้วเรียบร้อย</div>`
	}

	notesHtml := ""
	if resultNotes != "" {
		notesHtml = fmt.Sprintf(`<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; margin-top:16px; font-size:13px; color:#475569; line-height:1.6;">
            <b style="color:#334155;">ความเห็นจาก HR:</b><br/>%s
        </div>`, resultNotes)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireAI - ผลการสัมภาษณ์</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html {
            min-height: 100%%;
            -webkit-text-size-adjust: 100%%;
            scroll-behavior: smooth;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            color: #1e293b;
        }
        .card {
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.06);
            max-width: 480px;
            width: 100%%;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            margin: auto 0;
            flex-shrink: 0;
            box-sizing: border-box;
        }
        .header {
            background: %s;
            color: white;
            padding: 28px 24px;
            text-align: center;
        }
        .header h1 { font-size: 18px; font-weight: 800; }
        .header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
        .content { padding: 24px; }
        .result-badge {
            display: inline-block;
            background: %s;
            color: %s;
            padding: 8px 22px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 800;
            margin: 12px 0;
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 14px 18px;
            margin: 16px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            padding: 9px 0;
            font-size: 13.5px;
            border-bottom: 1px solid #f1f5f9;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label {
            color: #64748b;
            font-weight: 600;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .info-val {
            color: #0f172a;
            font-weight: 700;
            text-align: right;
            word-break: break-word;
            line-height: 1.4;
        }
        .btn-acknowledge {
            display: block;
            box-sizing: border-box;
            width: 100%%;
            max-width: 100%%;
            text-align: center;
            padding: 14px 20px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 800;
            text-decoration: none;
            color: #ffffff !important;
            background: %s;
            margin-top: 20px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.12);
            transition: all 0.2s;
        }
        .btn-acknowledge:hover { opacity: 0.9; transform: translateY(-1px); }
        .prompt-text {
            text-align: center;
            font-size: 13px;
            color: #64748b;
            margin-top: 16px;
            line-height: 1.5;
        }
        .footer { padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        @media (max-width: 480px) {
            body { padding: 12px 10px; }
            .header { padding: 20px 16px; }
            .content { padding: 16px 14px; }
            .info-box { padding: 10px 12px; margin: 12px 0; }
            .btn-acknowledge { padding: 12px 16px; font-size: 13.5px; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>ผลการสัมภาษณ์</h1>
            <p>HireAI Recruitment System</p>
        </div>
        <div class="content">
            %s
            <div style="text-align: center;">
                <span class="result-badge">%s</span>
            </div>
            <div class="info-box">
                <div class="info-row"><span class="info-label">รหัสใบสมัคร</span><span class="info-val" style="font-family: monospace; color: #4169E1;">%s</span></div>
                <div class="info-row"><span class="info-label">ผู้สมัคร</span><span class="info-val">%s</span></div>
                <div class="info-row"><span class="info-label">ตำแหน่งงาน</span><span class="info-val">%s</span></div>
                <div class="info-row"><span class="info-label">ผลสัมภาษณ์</span><span class="info-val">%s</span></div>
            </div>
            %s
            <div class="prompt-text">
                กรุณากดปุ่มด้านล่างเพื่อยืนยันว่าคุณได้รับทราบผลการสัมภาษณ์แล้ว<br/>
            </div>
            <a href="%s" class="btn-acknowledge">ยืนยันรับทราบผลการสัมภาษณ์</a>
        </div>
        <div class="footer">HireAI Recruitment Platform</div>
    </div>
</body>
</html>`,
		headerGradient,
		badgeBg, badgeColor,
		badgeColor,
		acknowledgedNotice,
		resultText,
		appCode, candName, jobTitleHtml, resultText,
		notesHtml,
		confirmURL,
	)
}

// renderAcknowledgeSuccessPage หน้าสำเร็จหลังกดรับทราบผล (Step 2)
func renderAcknowledgeSuccessPage(title, message, appCode, candName string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireAI - รับทราบผลสัมภาษณ์</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html {
            min-height: 100%%;
            -webkit-text-size-adjust: 100%%;
            scroll-behavior: smooth;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
            background-color: #f0fdf4;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            color: #1e293b;
        }
        .card {
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.06);
            max-width: 480px;
            width: 100%%;
            overflow: hidden;
            border: 1px solid #bbf7d0;
            text-align: center;
            margin: auto 0;
            flex-shrink: 0;
            box-sizing: border-box;
        }
        .header {
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 28px 24px;
        }
        .header h1 { font-size: 18px; font-weight: 800; }
        .content { padding: 24px; }
        .message { font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px; }
        .pill {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 16px;
            border-radius: 10px;
            font-size: 12px;
            color: #475569;
            margin-bottom: 20px;
        }
        .pill b { color: #0f172a; }
        .btn-close {
            display: inline-flex;
            box-sizing: border-box;
            align-items: center;
            justify-content: center;
            width: 100%%;
            max-width: 100%%;
            padding: 13px 20px;
            border-radius: 12px;
            background: #059669;
            color: #ffffff !important;
            font-size: 14px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
        }
        .btn-close:hover {
            background: #047857;
            transform: translateY(-1px);
        }
        .footer { padding: 14px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        @media (max-width: 480px) {
            body { padding: 14px 10px; }
            .content { padding: 20px 16px; }
            .header { padding: 22px 18px; }
            .btn-close { padding: 12px 16px; font-size: 13.5px; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>%s</h1>
        </div>
        <div class="content">
            <p class="message">%s</p>
            <div class="pill">
                ผู้สมัคร: <b>%s</b> &bull; รหัส: <b style="font-family: monospace; color: #2563eb;">%s</b>
            </div>
            <button class="btn-close" onclick="window.close()">ปิดหน้าต่างนี้</button>
        </div>
        <div class="footer">HireAI Recruitment Platform &copy; All Rights Reserved</div>
    </div>
</body>
</html>`, title, message, candName, appCode)
}
