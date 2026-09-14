package controller

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
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

	if err := c.db.Delete(&interview).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ลบนัดสัมภาษณ์ไม่สำเร็จ"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบนัดสัมภาษณ์สำเร็จ"})
}

// GET /api/interviews/candidates
func (c *InterviewController) GetCandidatesForInterview(ctx *gin.Context) {
	var applications []entity.Application
	if err := c.db.
		Preload("Candidate").
		Preload("JobPosition").
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

	backendBaseURL := config.Env.BackendURL
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
		ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(renderConfirmationPromptPage(interview.ID, action, token, candName, appCode, jobTitle, dateStr, formatLabel, interview.FormatDescription)))
		return
	}

	// ── STEP 2: ผู้สมัครกดยืนยันแล้ว -> บันทึกลงฐานข้อมูล ──
	var newStatus, title, message string
	switch action {
	case "confirm":
		newStatus = "confirmed"
		title = "ยืนยันการสัมภาษณ์เรียบร้อย ✅"
		message = "ระบบได้บันทึกการยืนยันเข้าร่วมสัมภาษณ์ของคุณแล้ว ขอให้เตรียมตัวให้พร้อมสำหรับการสัมภาษณ์งาน"
	case "reschedule":
		newStatus = "rescheduled"
		title = "แจ้งขอเลื่อนนัดสัมภาษณ์เรียบร้อย 📅"
		message = "ระบบได้บันทึกคำขอเลื่อนนัดสัมภาษณ์ของคุณแล้ว ฝ่ายทรัพยากรบุคคลจะติดต่อกลับเพื่อประสานวันและเวลาใหม่"
	case "reject":
		newStatus = "cancelled"
		title = "แจ้งปฏิเสธการสัมภาษณ์เรียบร้อย 🙏"
		message = "ระบบได้บันทึกการปฏิเสธการสัมภาษณ์ของคุณแล้ว ขอบคุณที่แจ้งให้ทราบและขอให้โชคดีในการก้าวหน้าทางอาชีพ"
	default:
		ctx.Data(http.StatusBadRequest, "text/html; charset=utf-8", []byte(renderResponsePage("error", "Action ไม่ถูกต้อง", "กรุณาตรวจสอบลิงก์อีกครั้ง")))
		return
	}

	if err := c.db.Model(&entity.Interview{}).Where("id = ?", interview.ID).Update("interview_status", newStatus).Error; err != nil {
		fmt.Printf("❌ [Interview Respond Error] Failed to update status: %v\n", err)
		ctx.Data(http.StatusInternalServerError, "text/html; charset=utf-8", []byte(renderResponsePage("error", "เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง")))
		return
	}
	fmt.Printf("✅ [Interview Respond Success] Interview ID %d status changed to %s by candidate\n", interview.ID, newStatus)

	ctx.Data(http.StatusOK, "text/html; charset=utf-8", []byte(renderSuccessResponsePage("success", title, message, appCode, candName)))
}

// renderConfirmationPromptPage หน้าสำหรับให้ผู้สมัครกด Confirm อีกรอบเพื่อความชัวร์ (ดีไซน์สะอาดตา สบายตา)
func renderConfirmationPromptPage(interviewID uint, action, token, candName, appCode, jobTitle, dateStr, formatLabel, formatDesc string) string {
	var badgeClass, badgeText, title, actionDesc, btnClass, btnText string
	switch action {
	case "confirm":
		badgeClass = "badge-confirm"
		badgeText = "✅ ยืนยันเข้าร่วมสัมภาษณ์"
		title = "ยืนยันการเข้าร่วมสัมภาษณ์"
		actionDesc = "คุณกำลังจะกดยืนยันเข้ารับการสัมภาษณ์งานตามวัน เวลา และรูปแบบที่ระบุไว้"
		btnClass = "btn-confirm"
		btnText = "กดยืนยันการเข้าร่วมสัมภาษณ์"
	case "reschedule":
		badgeClass = "badge-reschedule"
		badgeText = "📅 ขอเลื่อนนัดสัมภาษณ์"
		title = "แจ้งขอเลื่อนนัดสัมภาษณ์"
		actionDesc = "คุณต้องการแจ้งขอเลื่อนวันเวลานัดสัมภาษณ์ ฝ่าย HR จะติดต่อกลับเพื่อประสานงานใหม่"
		btnClass = "btn-reschedule"
		btnText = "กดยืนยันขอเลื่อนนัด"
	case "reject":
		badgeClass = "badge-reject"
		badgeText = "❌ ปฏิเสธการสัมภาษณ์"
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

	confirmURL := fmt.Sprintf("?id=%d&action=%s&token=%s&confirmed=true", interviewID, action, token)

	formatDetailHtml := ""
	if formatDesc != "" {
		formatDetailHtml = fmt.Sprintf(`<div class="info-row"><span class="info-label">ข้อมูลติดต่อ/สถานที่</span><span class="info-val">%s</span></div>`, formatDesc)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireAI - ยืนยันคำตอบนัดสัมภาษณ์</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            color: #1e293b;
        }
        .card {
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04);
            max-width: 480px;
            width: 100%%;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header {
            padding: 32px 28px 20px 28px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
        }
        .brand {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin-bottom: 12px;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        .badge-confirm { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .badge-reschedule { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .badge-reject { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
        .badge-default { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .header h1 {
            font-size: 19px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.4;
        }
        .content {
            padding: 24px 28px 28px 28px;
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 18px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
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
        }
        .info-val {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
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
            font-size: 13px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 20px;
            text-align: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px 14px;
            border-radius: 12px;
        }
        .btn-action {
            display: block;
            width: 100%%;
            padding: 13px 20px;
            border-radius: 12px;
            font-size: 14px;
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
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            margin-top: 14px;
            line-height: 1.5;
        }
        .footer {
            padding: 12px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            background: #fafafa;
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
                <b>กรุณากดปุ่มด้านล่างเพื่อบันทึกคำตอบ</b>
            </div>

            <a href="%s" class="btn-action %s">%s</a>

            <p class="cancel-hint">
                หากเปิดหน้านี้โดยไม่ตั้งใจ สามารถปิดหน้าต่างนี้ได้ทันทีโดยที่สถานะจะไม่เปลี่ยนแปลง
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
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            color: #1e293b;
        }
        .card {
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04);
            max-width: 440px;
            width: 100%%;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            animation: fadeIn 0.25s ease;
            text-align: center;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .content {
            padding: 36px 28px 28px 28px;
        }
        .icon-circle {
            width: 54px;
            height: 54px;
            background: #ecfdf5;
            color: #059669;
            border: 1px solid #a7f3d0;
            border-radius: 50%%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0 auto 16px auto;
        }
        h1 {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 8px;
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
            margin-bottom: 24px;
        }
        .pill b {
            color: #0f172a;
        }
        .btn-close {
            display: inline-block;
            width: 100%%;
            padding: 12px 20px;
            border-radius: 12px;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 700;
            border: 1px solid #e2e8f0;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-close:hover {
            background: #e2e8f0;
            color: #0f172a;
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
    </style>
</head>
<body>
    <div class="card">
        <div class="content">
            <div class="icon-circle">✓</div>
            <h1>%s</h1>
            <p class="message">%s</p>
            <div class="pill">
                ผู้สมัคร: <b>%s</b> &bull; รหัส: <b style="font-family: monospace; color: #2563eb;">%s</b>
            </div>
            <button class="btn-close" onclick="window.close()">ปิดหน้าต่างนี้</button>
            <p class="stay-hint">ระบบได้บันทึกคำตอบของคุณเข้าสู่ระบบเรียบร้อยแล้ว</p>
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
	icon := "❌"
	if status == "info" {
		bgColor = "#3b82f6"
		icon = "ℹ️"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HireAI - แจ้งเตือน</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            max-width: 420px;
            width: 100%%;
            overflow: hidden;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .header {
            background: %s;
            color: white;
            padding: 24px 20px;
        }
        .icon { font-size: 32px; margin-bottom: 8px; }
        .header h1 { font-size: 17px; font-weight: 700; }
        .content { padding: 24px 20px; color: #475569; font-size: 13px; line-height: 1.6; }
        .footer { padding: 12px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="icon">%s</div>
            <h1>%s</h1>
        </div>
        <div class="content">
            <p>%s</p>
        </div>
        <div class="footer">HireAI Recruitment Platform</div>
    </div>
</body>
</html>`, bgColor, icon, title, message)
}
