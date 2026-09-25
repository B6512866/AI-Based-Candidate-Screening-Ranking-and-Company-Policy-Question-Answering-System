package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func InterviewRoutes(api *gin.RouterGroup, db *gorm.DB) {
	interviewController := controller.NewInterviewController(db)

	// Route สำหรับผู้สมัครกดจากอีเมล — ไม่ต้อง login (รองรับทั้ง GET จากลิงก์อีเมล และ POST จากฟอร์มบนเว็บ)
	api.GET("/interviews/respond", interviewController.Respond)
	api.POST("/interviews/respond", interviewController.Respond)
	api.GET("/interviews/acknowledge-result", interviewController.AcknowledgeResult)
	api.POST("/interviews/acknowledge-result", interviewController.AcknowledgeResult)

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
		i.POST("/:id/notify-result", interviewController.NotifyResult)
		i.PUT("/:id/score", interviewController.UpdateScore)
	}
}
