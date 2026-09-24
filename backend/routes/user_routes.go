package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func UserRoutes(api *gin.RouterGroup, db *gorm.DB) {
	userController := controller.NewUserController(db)

	u := api.Group("/users")
	u.Use(middleware.AuthMiddleware())
	{
		u.GET("/me", userController.GetProfile)
		u.PUT("/me", userController.UpdateProfile)
		u.PUT("/change-password", userController.ChangePassword)
		u.GET("", userController.GetAllUsers)
		u.PUT("/:id", userController.UpdateUserByID)
	}
}
