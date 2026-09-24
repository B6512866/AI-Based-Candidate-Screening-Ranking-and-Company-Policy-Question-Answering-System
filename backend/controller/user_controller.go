package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserController struct {
	db *gorm.DB
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{db: db}
}

// getUserIDFromContext Extracts user ID from JWT claims context safely
func getUserIDFromContext(c *gin.Context) (uint, bool) {
	val, exists := c.Get("id")
	if !exists {
		return 0, false
	}
	switch v := val.(type) {
	case float64:
		return uint(v), true
	case int:
		return uint(v), true
	case uint:
		return v, true
	case string:
		id, err := strconv.ParseUint(v, 10, 32)
		if err != nil {
			return 0, false
		}
		return uint(id), true
	default:
		return 0, false
	}
}

// GetProfile GET /api/users/me
func (uc *UserController) GetProfile(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ผู้ใช้ยังไม่ได้เข้าสู่ระบบ"})
		return
	}

	var user entity.User
	if err := uc.db.Preload("Role").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลโปรไฟล์ผู้ใช้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// UpdateProfileRequest Struct for updating current user profile
type UpdateProfileRequest struct {
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	Phone            string `json:"phone"`
	Address          string `json:"address"`
	ProfileImage     string `json:"profile_image"`
	Position         string `json:"position"`
	Department       string `json:"department"`
	Bio              string `json:"bio"`
	EmergencyContact string `json:"emergency_contact"`
	EmergencyPhone   string `json:"emergency_phone"`
}

// UpdateProfile PUT /api/users/me
func (uc *UserController) UpdateProfile(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ผู้ใช้ยังไม่ได้เข้าสู่ระบบ"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รูปแบบข้อมูลไม่ถูกต้อง"})
		return
	}

	var user entity.User
	if err := uc.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลผู้ใช้"})
		return
	}

	// Update fields if provided
	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	user.Phone = req.Phone
	user.Address = req.Address
	if req.ProfileImage != "" {
		user.ProfileImage = req.ProfileImage
	}
	if req.Position != "" {
		user.Position = req.Position
	}
	if req.Department != "" {
		user.Department = req.Department
	}
	user.Bio = req.Bio
	user.EmergencyContact = req.EmergencyContact
	user.EmergencyPhone = req.EmergencyPhone

	if err := uc.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้"})
		return
	}

	uc.db.Preload("Role").First(&user, user.ID)
	c.JSON(http.StatusOK, gin.H{
		"message": "อัปเดตข้อมูลโปรไฟล์สำเร็จ",
		"data":    user,
	})
}

// ChangePasswordRequest Struct for password updates
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangePassword PUT /api/users/change-password
func (uc *UserController) ChangePassword(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ผู้ใช้ยังไม่ได้เข้าสู่ระบบ"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รูปแบบข้อมูลไม่ถูกต้อง"})
		return
	}

	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"})
		return
	}

	var user entity.User
	if err := uc.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลผู้ใช้"})
		return
	}

	if !config.CheckPasswordHash(req.CurrentPassword, user.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสผ่านปัจจุบันไม่ถูกต้อง"})
		return
	}

	hashedPassword, err := config.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเข้ารหัสผ่านใหม่ได้"})
		return
	}

	user.Password = hashedPassword
	if err := uc.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเปลี่ยนรหัสผ่านได้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "เปลี่ยนรหัสผ่านสำเร็จ"})
}

// GetAllUsers GET /api/users
func (uc *UserController) GetAllUsers(c *gin.Context) {
	var users []entity.User
	if err := uc.db.Preload("Role").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถดึงข้อมูลผู้ใช้ได้"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": users,
	})
}

// UpdateUserByID PUT /api/users/:id (for HR Manager)
func (uc *UserController) UpdateUserByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID ผู้ใช้ไม่ถูกต้อง"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รูปแบบข้อมูลไม่ถูกต้อง"})
		return
	}

	var user entity.User
	if err := uc.db.First(&user, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลผู้ใช้"})
		return
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	user.Phone = req.Phone
	user.Address = req.Address
	if req.ProfileImage != "" {
		user.ProfileImage = req.ProfileImage
	}
	user.Position = req.Position
	user.Department = req.Department
	user.Bio = req.Bio
	user.EmergencyContact = req.EmergencyContact
	user.EmergencyPhone = req.EmergencyPhone

	if err := uc.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("ไม่สามารถบันทึกข้อมูลได้: %v", err)})
		return
	}

	uc.db.Preload("Role").First(&user, user.ID)
	c.JSON(http.StatusOK, gin.H{
		"message": "อัปเดตข้อมูลผู้ใช้สำเร็จ",
		"data":    user,
	})
}
