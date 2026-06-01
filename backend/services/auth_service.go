package services

import (
	"errors"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/dto"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"

	"gorm.io/gorm"
)

type AuthService struct {
	db *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{db: db}
}

func (s *AuthService) RegisterHR(req dto.RegisterHRRequest) error {
	var count int64
	s.db.Model(&entity.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return errors.New("อีเมลนี้ถูกใช้งานแล้ว")
	}

	hashed, err := config.HashPassword(req.Password)
	if err != nil {
		return errors.New("สร้างรหัสผ่านไม่สำเร็จ")
	}

	// หา Role ID สำหรับ HRManager
	var role entity.Role
	if err := s.db.Where("name = ?", "HRManager").First(&role).Error; err != nil {
		return errors.New("ไม่พบสิทธิ์การใช้งาน HRManager")
	}

	user := entity.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  hashed,
		RoleID:    role.ID,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return errors.New("ลงทะเบียนไม่สำเร็จ")
	}
	return nil
}

func (s *AuthService) Login(req dto.LoginRequest) (dto.LoginResponse, error) {
	var user entity.User
	errMsg := "อีเมลหรือรหัสผ่านไม่ถูกต้อง"

	// Preload Role เพื่อให้รู้ว่าเป็นใคร
	if err := s.db.Preload("Role").Where("email = ?", req.Email).First(&user).Error; err != nil {
		return dto.LoginResponse{}, errors.New(errMsg)
	}

	if !config.CheckPasswordHash(req.Password, user.Password) {
		return dto.LoginResponse{}, errors.New(errMsg)
	}

	token, err := config.GenerateJWT(user.ID, user.Email, user.Role.Name)
	if err != nil {
		return dto.LoginResponse{}, errors.New("สร้าง token ไม่สำเร็จ")
	}

	return dto.LoginResponse{
		ID:        user.ID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		Role:      user.Role.Name,
		Token:     token,
	}, nil
}
