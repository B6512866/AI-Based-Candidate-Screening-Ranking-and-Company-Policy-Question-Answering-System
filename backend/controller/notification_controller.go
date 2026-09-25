package controller

import (
	"net/http"
	"strconv"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NotificationController struct {
	db *gorm.DB
}

func NewNotificationController(db *gorm.DB) *NotificationController {
	return &NotificationController{db: db}
}

type NotificationItemResponse struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Message       string    `json:"message"`
	Category      string    `json:"category"`
	CategoryLabel string    `json:"categoryLabel"`
	Timestamp     string    `json:"timestamp"`
	IsRead        bool      `json:"isRead"`
	IsPriority    bool      `json:"isPriority"`
	LinkPath      string    `json:"linkPath"`
	LinkText      string    `json:"linkText"`
	Role          string    `json:"role"`
	CreatedAt     time.Time `json:"createdAt"`
}

func toResponse(n entity.Notification) NotificationItemResponse {
	return NotificationItemResponse{
		ID:            strconv.Itoa(int(n.ID)),
		Title:         n.Title,
		Message:       n.Message,
		Category:      n.Category,
		CategoryLabel: n.CategoryLabel,
		Timestamp:     services.FormatThaiRelativeTime(n.CreatedAt),
		IsRead:        n.IsRead,
		IsPriority:    n.IsPriority,
		LinkPath:      n.LinkPath,
		LinkText:      n.LinkText,
		Role:          n.Role,
		CreatedAt:     n.CreatedAt,
	}
}

// GET /api/notifications?role=HR
func (c *NotificationController) GetAll(ctx *gin.Context) {
	role := ctx.DefaultQuery("role", "HR")

	var notifs []entity.Notification
	query := c.db.Model(&entity.Notification{})

	if role == "HR" {
		query = query.Where("role IN ?", []string{"HR", "ALL"})
	} else if role == "EMPLOYEE" {
		query = query.Where("role IN ?", []string{"EMPLOYEE", "ALL"})
	}

	if err := query.Order("created_at desc").Limit(50).Find(&notifs).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลการแจ้งเตือนได้: " + err.Error()})
		return
	}

	// ถ้าไม่มีแจ้งเตือนเลยในระบบ ให้ Seed ค่าเริ่มต้นอัตโนมัติ
	if len(notifs) == 0 {
		c.seedDefaultNotifications(role)
		query.Order("created_at desc").Limit(50).Find(&notifs)
	}

	resp := make([]NotificationItemResponse, len(notifs))
	for i, n := range notifs {
		resp[i] = toResponse(n)
	}

	ctx.JSON(http.StatusOK, gin.H{"data": resp})
}

// POST /api/notifications
func (c *NotificationController) Create(ctx *gin.Context) {
	var req struct {
		Title         string `json:"title" binding:"required"`
		Message       string `json:"message" binding:"required"`
		Category      string `json:"category"`
		CategoryLabel string `json:"categoryLabel"`
		IsPriority    bool   `json:"isPriority"`
		LinkPath      string `json:"linkPath"`
		LinkText      string `json:"linkText"`
		Role          string `json:"role"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ครบถ้วน: " + err.Error()})
		return
	}

	notif, err := services.CreateNotification(
		c.db,
		req.Title,
		req.Message,
		req.Category,
		req.CategoryLabel,
		req.LinkPath,
		req.LinkText,
		req.Role,
		req.IsPriority,
	)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างการแจ้งเตือนล้มเหลว"})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "สร้างการแจ้งเตือนสำเร็จ",
		"data":    toResponse(*notif),
	})
}

// PUT /api/notifications/:id/read
func (c *NotificationController) MarkAsRead(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID การแจ้งเตือนไม่ถูกต้อง"})
		return
	}

	if err := c.db.Model(&entity.Notification{}).Where("id = ?", id).Update("is_read", true).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตสถานะอ่านแล้วได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "อ่านแล้ว"})
}

// PUT /api/notifications/read-all?role=HR
func (c *NotificationController) MarkAllAsRead(ctx *gin.Context) {
	role := ctx.DefaultQuery("role", "HR")

	query := c.db.Model(&entity.Notification{})
	if role == "HR" {
		query = query.Where("role IN ?", []string{"HR", "ALL"})
	} else if role == "EMPLOYEE" {
		query = query.Where("role IN ?", []string{"EMPLOYEE", "ALL"})
	}

	if err := query.Where("is_read = ?", false).Update("is_read", true).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอ่านทั้งหมดได้"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ทำเครื่องหมายอ่านทั้งหมดเรียบร้อยแล้ว"})
}

// DELETE /api/notifications/:id
func (c *NotificationController) Delete(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID การแจ้งเตือนไม่ถูกต้อง"})
		return
	}

	if err := c.db.Delete(&entity.Notification{}, id).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ลบการแจ้งเตือนไม่สำเร็จ"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ลบการแจ้งเตือนสำเร็จ"})
}

// seedDefaultNotifications สร้างแจ้งเตือนตัวอย่างเริ่มต้นหากฐานข้อมูลยังว่างเปล่า
func (c *NotificationController) seedDefaultNotifications(role string) {
	if role == "HR" {
		defaults := []entity.Notification{
			{
				Title:         "ผู้สมัครใหม่รอนัดสัมภาษณ์",
				Message:       "มีผู้สมัครตำแหน่ง Senior Backend Developer ผ่านการคัดกรองด้วยคะแนน PTS 92/100 รอนัดหมายสัมภาษณ์",
				Category:      "interview",
				CategoryLabel: "นัดสัมภาษณ์",
				IsRead:        false,
				IsPriority:    true,
				LinkPath:      "/hr/interviews",
				LinkText:      "ไประบุวันเวลาสัมภาษณ์",
				Role:          "HR",
			},
			{
				Title:         "ระบบ Typhoon AI คัดกรอง Resume สำเร็จ",
				Message:       "ระบบทำการวิเคราะห์ประวัติและจัดลำดับผู้สมัครในตำแหน่ง Frontend Engineer สำเร็จแล้ว",
				Category:      "candidate",
				CategoryLabel: "คัดกรอง AI",
				IsRead:        false,
				IsPriority:    false,
				LinkPath:      "/hr/candidates",
				LinkText:      "ดูผลจัดลำดับผู้สมัคร",
				Role:          "HR",
			},
			{
				Title:         "อัปเดตนโยบายการลาป่วยและวันหยุดประจำปี 2026",
				Message:       "เพิ่มข้อมูลเอกสารนโยบายสวัสดิการในระบบคลังความรู้ AI Policy Advisor เรียบร้อยแล้ว",
				Category:      "hr",
				CategoryLabel: "คลังความรู้",
				IsRead:        true,
				IsPriority:    false,
				LinkPath:      "/hr/knowledge",
				LinkText:      "ดูคลังความรู้",
				Role:          "HR",
			},
		}
		for _, n := range defaults {
			c.db.Create(&n)
		}
	} else {
		defaults := []entity.Notification{
			{
				Title:         "ประกาศ: ปรับปรุงสวัสดิการค่าทำฟันและประกันสุขภาพประจำปี 2026",
				Message:       "บริษัทได้ทำการเพิ่มวงเงินค่าบริการทันตกรรมและตรวจสุขภาพประจำปีเป็น 5,000 บาท/ปี",
				Category:      "benefit",
				CategoryLabel: "สวัสดิการ & วันหยุด",
				IsRead:        false,
				IsPriority:    true,
				LinkPath:      "/employee/documents",
				LinkText:      "ดูเอกสารสวัสดิการ",
				Role:          "EMPLOYEE",
			},
			{
				Title:         "กำหนดการวันหยุดประจำปี 2569 และวันหยุดชดเชยเทศกาลสงกรานต์",
				Message:       "แจ้งวันหยุดบริษัทล่วงหน้าช่วงเทศกาลสงกรานต์ ระหว่างวันที่ 13 - 16 เมษายน 2569",
				Category:      "announcement",
				CategoryLabel: "ประกาศบริษัท",
				IsRead:        false,
				LinkPath:      "/employee/chat",
				LinkText:      "ถาม AI เกี่ยวกับวันหยุด",
				Role:          "EMPLOYEE",
			},
		}
		for _, n := range defaults {
			c.db.Create(&n)
		}
	}
}
