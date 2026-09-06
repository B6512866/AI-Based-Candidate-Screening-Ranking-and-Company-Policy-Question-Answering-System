package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InterviewRoutes(api *gin.RouterGroup, db *gorm.DB) {
	interviewController := controller.NewInterviewController(db)

	i := api.Group("/interviews")
	i.Use(middleware.AuthMiddleware())
	{
		i.GET("", interviewController.GetAll)
		i.GET("/candidates", interviewController.GetCandidatesForInterview)
		i.GET("/:id", interviewController.GetByID)
		i.POST("", interviewController.Create)
		i.PUT("/:id", interviewController.Update)
		i.DELETE("/:id", interviewController.Delete)
		i.POST("/:id/send-email", interviewController.SendEmail)
	}
}
