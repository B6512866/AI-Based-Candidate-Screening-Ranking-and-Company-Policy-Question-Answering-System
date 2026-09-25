package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Routes เดิมของระบบคัดกรองงาน (ของเพื่อน)
func JobPositionRoutes(api *gin.RouterGroup, db *gorm.DB) {
	jobPositionController := controller.NewJobPositionController(db)

	j := api.Group("/job-positions")
	{
		j.POST("/:id/apply", jobPositionController.Apply)
		j.GET("", jobPositionController.GetAll)
		j.GET("/:id", jobPositionController.GetByID)
		j.POST("", middleware.AuthMiddleware(), jobPositionController.Create)
		j.PUT("/:id", middleware.AuthMiddleware(), jobPositionController.Update)
		j.PATCH("/:id/status", middleware.AuthMiddleware(), jobPositionController.UpdateStatus)
		j.DELETE("/:id", middleware.AuthMiddleware(), jobPositionController.Delete)
		j.GET("/:id/applications", jobPositionController.GetApplications)
		j.GET("/:id/documents", jobPositionController.GetJobPositionDocuments)
		j.POST("/documents/upload", middleware.AuthMiddleware(), jobPositionController.UploadDocument)
		j.DELETE("/documents/:id", middleware.AuthMiddleware(), jobPositionController.DeleteDocument)
	}

	// บันทึกการคัดกรองผู้สมัครรายบุคคล
	api.PUT("/applications/:appId/screening", jobPositionController.UpdateApplicationScreening)
	api.PATCH("/applications/:appId/status", jobPositionController.UpdateApplicationStatus)
	api.DELETE("/applications/:appId", jobPositionController.DeleteApplication)
	api.PUT("/applications/:appId/candidate-info", jobPositionController.UpdateCandidateApplicationInfo)
	api.GET("/applications/status/:appCode", jobPositionController.GetApplicationStatus)
}
