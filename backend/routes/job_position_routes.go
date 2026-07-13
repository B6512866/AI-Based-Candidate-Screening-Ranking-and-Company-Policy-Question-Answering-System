package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func JobPositionRoutes(api *gin.RouterGroup, db *gorm.DB) {
	jobPositionController := controller.NewJobPositionController(db)

	j := api.Group("/job-positions")
	{
		j.POST("/:id/apply",jobPositionController.Apply)
		j.GET("", jobPositionController.GetAll)
		j.GET("/:id", jobPositionController.GetByID)
		j.POST("", middleware.AuthMiddleware(), jobPositionController.Create)
		j.PUT("/:id", middleware.AuthMiddleware(), jobPositionController.Update)
		j.DELETE("/:id", middleware.AuthMiddleware(), jobPositionController.Delete)
		j.GET("/:id/applications",middleware.AuthMiddleware(),jobPositionController.GetApplications)
	}

	// บันทึกการคัดกรองผู้สมัครรายบุคคล
	api.PUT("/applications/:appId/screening", middleware.AuthMiddleware(), jobPositionController.UpdateApplicationScreening)
}
