package controller

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"net/http"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ChatController struct {
	db *gorm.DB
}

func NewChatController(db *gorm.DB) *ChatController {
	return &ChatController{db: db}
}

// 1. ดึงรายการห้องสนทนาทั้งหมดของผู้ใช้ปัจจุบัน (เพื่อนำมาแสดงใน Sidebar)
func (cc *ChatController) GetChatSessions(ctx *gin.Context) {
	var userID uint = 1
	if idVal, exists := ctx.Get("id"); exists {
		if idFloat, ok := idVal.(float64); ok {
			userID = uint(idFloat)
		} else if idUint, ok := idVal.(uint); ok {
			userID = idUint
		}
	}

	type SessionResult struct {
		SessionID    string `json:"session_id"`
		SessionTitle string `json:"session_title"`
		CreatedAt    string `json:"created_at"`
	}

	var sessions []SessionResult
	// ใช้คำสั่งหาข้อมูล SessionID และ SessionTitle ล่าสุดของผู้ใช้
	query := `
		SELECT DISTINCT ON (session_id) session_id, session_title, created_at
		FROM chat_messages
		WHERE user_id = ? AND deleted_at IS NULL
		ORDER BY session_id, created_at DESC
	`
	if err := cc.db.Raw(query, userID).Scan(&sessions).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงรายการเธรดแชตได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"data": sessions})
}

// 2. ดึงประวัติแชตทั้งหมดเฉพาะห้องที่เลือก (session_id)
func (cc *ChatController) GetChatHistory(ctx *gin.Context) {
	var userID uint = 1
	if idVal, exists := ctx.Get("id"); exists {
		if idFloat, ok := idVal.(float64); ok {
			userID = uint(idFloat)
		} else if idUint, ok := idVal.(uint); ok {
			userID = idUint
		}
	}

	sessionID := ctx.Query("session_id")
	if sessionID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุ session_id"})
		return
	}

	var messages []entity.ChatMessage
	if err := cc.db.Where("user_id = ? AND session_id = ?", userID, sessionID).Order("id asc").Find(&messages).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงประวัติแชตห้องนี้ได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"data": messages})
}

// 3. บันทึกข้อความแชตใหม่
func (cc *ChatController) SaveChatMessage(ctx *gin.Context) {
	var userID uint = 1
	if idVal, exists := ctx.Get("id"); exists {
		if idFloat, ok := idVal.(float64); ok {
			userID = uint(idFloat)
		} else if idUint, ok := idVal.(uint); ok {
			userID = idUint
		}
	}

	type SaveReq struct {
		Question     string `json:"question" binding:"required"`
		Answer       string `json:"answer" binding:"required"`
		SourceDoc    string `json:"source_doc"`
		SessionID    string `json:"session_id" binding:"required"`
		SessionTitle string `json:"session_title" binding:"required"`
	}

	var req SaveReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ครบถ้วน"})
		return
	}

	msg := entity.ChatMessage{
		Question:     req.Question,
		Answer:       req.Answer,
		SourceDoc:    req.SourceDoc,
		UserID:       userID,
		SessionID:    req.SessionID,
		SessionTitle: req.SessionTitle,
	}

	if err := cc.db.Create(&msg).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อความแชตได้"})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{"message": "บันทึกข้อมูลเรียบร้อยแล้ว", "data": msg})
}
